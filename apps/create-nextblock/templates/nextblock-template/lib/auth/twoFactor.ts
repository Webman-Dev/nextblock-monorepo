// Server-only two-factor orchestration: email-code challenges, the signed
// "email second factor satisfied" session cookie, and the gate that decides
// whether a signed-in user still owes a second factor before reaching the CMS.
import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { generateNumericCode, hmacSign, safeEqual, sha256Hex } from './crypto';
import {
  TWO_FACTOR_COOKIE,
  clearCookie,
  getCookieValue,
  setSecureCookie,
} from './cookies';
import { hasValidTrustedDevice } from './trustedDevices';
import { getSecuritySettings } from '../privacy/settings';

const EMAIL_CODE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const TWO_FACTOR_SESSION_TTL_SECONDS = 12 * 60 * 60; // 12 hours

/**
 * Create and persist a hashed 6-digit email code and return the RAW code so the
 * caller can email it. Prior unconsumed codes for the user are invalidated.
 */
export async function createEmailChallenge(userId: string): Promise<string> {
  const code = generateNumericCode(6);
  const svc = getServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();

  // Invalidate any earlier pending codes so only the newest one works.
  await svc
    .from('email_2fa_challenges')
    .update({ consumed_at: nowIso })
    .eq('user_id', userId)
    .is('consumed_at', null);

  await svc.from('email_2fa_challenges').insert({
    user_id: userId,
    token_hash: sha256Hex(code),
    expires_at: new Date(Date.now() + EMAIL_CODE_TTL_MS).toISOString(),
  });

  return code;
}

/** True when the user has an unconsumed, unexpired email code awaiting entry. */
export async function hasPendingEmailChallenge(userId: string): Promise<boolean> {
  const svc = getServiceRoleSupabaseClient();
  const { data } = await svc
    .from('email_2fa_challenges')
    .select('id')
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', new Date().toISOString())
    .limit(1);
  return Boolean(data && data.length > 0);
}

/** Verify a submitted email code against the newest live challenge. */
export async function verifyEmailChallenge(userId: string, code: string): Promise<boolean> {
  const trimmed = (code || '').trim();
  if (!/^\d{6}$/.test(trimmed)) return false;

  const svc = getServiceRoleSupabaseClient();
  const nowIso = new Date().toISOString();
  const { data } = await svc
    .from('email_2fa_challenges')
    .select('id, token_hash, expires_at')
    .eq('user_id', userId)
    .is('consumed_at', null)
    .gt('expires_at', nowIso)
    .order('created_at', { ascending: false })
    .limit(5);

  if (!data || data.length === 0) return false;
  const candidateHash = sha256Hex(trimmed);
  const match = data.find((row) => safeEqual(row.token_hash, candidateHash));
  if (!match) return false;

  await svc.from('email_2fa_challenges').update({ consumed_at: nowIso }).eq('id', match.id);
  return true;
}

/** Issue the signed cookie that marks the email second factor satisfied. */
export async function issueTwoFactorVerifiedCookie(userId: string): Promise<void> {
  const exp = Date.now() + TWO_FACTOR_SESSION_TTL_SECONDS * 1000;
  const payload = `${userId}.${exp}`;
  await setSecureCookie(
    TWO_FACTOR_COOKIE,
    `${payload}.${hmacSign(payload)}`,
    TWO_FACTOR_SESSION_TTL_SECONDS,
  );
}

export async function clearTwoFactorVerifiedCookie(): Promise<void> {
  await clearCookie(TWO_FACTOR_COOKIE);
}

/** Validate the signed email-2FA cookie for a specific user. */
export async function hasValidTwoFactorCookie(userId: string): Promise<boolean> {
  const raw = await getCookieValue(TWO_FACTOR_COOKIE);
  if (!raw) return false;
  const parts = raw.split('.');
  if (parts.length !== 3) return false;
  const [uid, expStr, sig] = parts;
  if (uid !== userId) return false;
  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;
  return safeEqual(hmacSign(`${uid}.${expStr}`), sig);
}

export type TwoFactorStatus =
  | 'not_required'
  | 'satisfied'
  | 'totp_required'
  | 'email_required';

export interface TwoFactorEvaluation {
  status: TwoFactorStatus;
  userId: string | null;
  mfaType: 'totp' | 'email' | null;
}

/**
 * Whether to surface the "set up two-factor authentication" reminder banner to the
 * currently signed-in staff user. True only when: not in sandbox, the user is an
 * ADMIN/WRITER, the global "encourage staff to enable 2FA" policy is on, and the user
 * has not enrolled a second factor. Best-effort — any failure resolves to no banner.
 */
export async function getStaffTwoFactorReminder(): Promise<boolean> {
  // Sandbox runs on a shared demo account; never nag it (the page is disabled there too).
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') return false;

  try {
    const supabase = createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return false;

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    const role = profile?.role;
    if (role !== 'ADMIN' && role !== 'WRITER') return false;

    const { enforce_staff_2fa } = await getSecuritySettings();
    if (!enforce_staff_2fa) return false;

    const { data: settings } = await supabase
      .from('user_security_settings')
      .select('mfa_enabled, mfa_type')
      .eq('user_id', user.id)
      .maybeSingle();

    return !(settings?.mfa_enabled && settings?.mfa_type);
  } catch {
    return false;
  }
}

/**
 * Decide whether the currently signed-in user still owes a second factor.
 * Used both to route sign-in and to guard /cms server-side.
 */
export async function evaluateTwoFactor(): Promise<TwoFactorEvaluation> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { status: 'not_required', userId: null, mfaType: null };

  // Sandbox/demo mode runs on a single shared public account. Never enforce a
  // second factor there — otherwise anyone enrolling the demo account in 2FA
  // would lock out every other visitor until the next sandbox reset.
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    return { status: 'satisfied', userId: user.id, mfaType: null };
  }

  const { data: settings } = await supabase
    .from('user_security_settings')
    .select('mfa_enabled, mfa_type')
    .eq('user_id', user.id)
    .maybeSingle();

  const mfaType = (settings?.mfa_type as 'totp' | 'email' | null) ?? null;
  if (!settings || !settings.mfa_enabled || !mfaType) {
    return { status: 'satisfied', userId: user.id, mfaType: null };
  }

  // A live trusted device bypasses the second factor entirely.
  if (await hasValidTrustedDevice(user.id)) {
    return { status: 'satisfied', userId: user.id, mfaType };
  }

  if (mfaType === 'totp') {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === 'aal2') {
      return { status: 'satisfied', userId: user.id, mfaType };
    }
    return { status: 'totp_required', userId: user.id, mfaType };
  }

  // Email path.
  if (await hasValidTwoFactorCookie(user.id)) {
    return { status: 'satisfied', userId: user.id, mfaType };
  }
  return { status: 'email_required', userId: user.id, mfaType };
}
