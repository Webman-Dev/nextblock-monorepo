'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { sendTwoFactorCodeEmail } from '../../../actions/twoFactorEmail';
import {
  getSecuritySettings as readSecuritySettings,
  saveSecuritySettings,
} from '../../../../lib/privacy/settings';
import {
  MAX_TRUSTED_DEVICE_DAYS,
  MIN_TRUSTED_DEVICE_DAYS,
  type SecuritySettings,
} from '../../../../lib/privacy/types';
import {
  createEmailChallenge,
  issueTwoFactorVerifiedCookie,
  clearTwoFactorVerifiedCookie,
  verifyEmailChallenge,
} from '../../../../lib/auth/twoFactor';
import {
  listTrustedDevices,
  revokeAllTrustedDevices,
  revokeTrustedDevice,
  type TrustedDeviceRow,
} from '../../../../lib/auth/trustedDevices';
import {
  getSystemConfiguration,
  updateSystemConfiguration,
} from '../../../../lib/setup/system-config';

export interface SecurityPanelData {
  email: string;
  mfaEnabled: boolean;
  mfaType: 'totp' | 'email' | null;
  hasVerifiedTotp: boolean;
  isAdmin: boolean;
  globalSettings: SecuritySettings;
  trustedDevices: TrustedDeviceRow[];
  autoAcceptSignups: boolean;
}

async function requireUser() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be signed in.');
  }
  return { supabase, user };
}

export async function getSecurityPanelData(): Promise<SecurityPanelData> {
  const { supabase, user } = await requireUser();

  const [{ data: settings }, { data: profile }, { data: factors }] = await Promise.all([
    supabase
      .from('user_security_settings')
      .select('mfa_enabled, mfa_type')
      .eq('user_id', user.id)
      .maybeSingle(),
    supabase.from('profiles').select('role').eq('id', user.id).single(),
    supabase.auth.mfa.listFactors(),
  ]);

  // listFactors().totp only contains verified TOTP factors.
  const hasVerifiedTotp = Boolean(factors?.totp && factors.totp.length > 0);

  return {
    email: user.email ?? '',
    mfaEnabled: Boolean(settings?.mfa_enabled),
    mfaType: (settings?.mfa_type as 'totp' | 'email' | null) ?? null,
    hasVerifiedTotp,
    isAdmin: profile?.role === 'ADMIN',
    globalSettings: await readSecuritySettings(),
    trustedDevices: await listTrustedDevices(user.id),
    autoAcceptSignups: (await getSystemConfiguration()).auto_accept_signups,
  };
}

// --- Sign-up policy (admin only) ------------------------------------------------

export async function updateAutoAcceptSignups(formData: FormData) {
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'ADMIN') {
    throw new Error('Only administrators can change the sign-up policy.');
  }

  const enabled = formData.get('auto_accept_signups') === 'true';
  await updateSystemConfiguration({ auto_accept_signups: enabled });
  revalidatePath('/cms/settings/security');
  return {
    success: true,
    message: enabled
      ? 'New sign-ups will be auto-approved without email verification.'
      : 'New sign-ups now require email verification.',
  };
}

// --- Global policy (admin only) -------------------------------------------------

export async function updateGlobalSecuritySettings(formData: FormData) {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    throw new Error('Security settings are disabled in the sandbox environment.');
  }
  const { supabase, user } = await requireUser();
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (profile?.role !== 'ADMIN') {
    throw new Error('Only administrators can change the global security policy.');
  }

  const days = Number.parseInt(formData.get('trusted_device_days')?.toString() ?? '', 10);
  const settings: SecuritySettings = {
    trusted_device_days: Number.isFinite(days)
      ? Math.min(MAX_TRUSTED_DEVICE_DAYS, Math.max(MIN_TRUSTED_DEVICE_DAYS, days))
      : 30,
    enforce_staff_2fa: formData.get('enforce_staff_2fa') === 'true',
  };

  await saveSecuritySettings(settings);
  revalidatePath('/cms/settings/security');
  return { success: true, message: 'Security policy saved.' };
}

// --- TOTP enrollment ------------------------------------------------------------

export type EnrollTotpResult =
  | { ok: true; factorId: string; qrCode: string; secret: string }
  | { ok: false; error: string };

export async function startTotpEnrollment(): Promise<EnrollTotpResult> {
  const { supabase } = await requireUser();

  // Clear any half-finished factors so re-enrolling never hits a name clash.
  // `listFactors().totp` only returns verified factors, so check `all`.
  const { data: existing } = await supabase.auth.mfa.listFactors();
  for (const factor of existing?.all ?? []) {
    if (factor.factor_type === 'totp' && factor.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: factor.id });
    }
  }

  const { data, error } = await supabase.auth.mfa.enroll({
    factorType: 'totp',
    friendlyName: `nextblock-totp-${Date.now()}`,
  });

  if (error || !data) {
    return {
      ok: false,
      error:
        error?.message ??
        'Could not start authenticator setup. Ensure TOTP MFA is enabled for this Supabase project.',
    };
  }

  return {
    ok: true,
    factorId: data.id,
    qrCode: data.totp.qr_code,
    secret: data.totp.secret,
  };
}

export async function verifyTotpEnrollment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const factorId = formData.get('factorId')?.toString() ?? '';
  const code = (formData.get('code')?.toString() ?? '').trim();

  if (!factorId || !/^\d{6}$/.test(code)) {
    throw new Error('Enter the 6-digit code from your authenticator app.');
  }

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId,
  });
  if (challengeError || !challenge) {
    throw new Error(challengeError?.message ?? 'Could not start verification.');
  }

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) {
    throw new Error('That code was not valid. Please try again.');
  }

  const { error: upsertError } = await supabase.from('user_security_settings').upsert({
    user_id: user.id,
    mfa_enabled: true,
    mfa_type: 'totp',
    updated_at: new Date().toISOString(),
  });
  if (upsertError) {
    throw new Error('Verified, but failed to save your preference. Please retry.');
  }

  revalidatePath('/cms/settings/security');
  return { success: true, message: 'Authenticator app enabled.' };
}

// --- Email-code enrollment ------------------------------------------------------

export async function sendEmailEnrollmentCode() {
  const { user } = await requireUser();
  if (!user.email) {
    throw new Error('Your account has no email address on file.');
  }
  const code = await createEmailChallenge(user.id);
  await sendTwoFactorCodeEmail(user.email, code, 'enable email two-factor authentication');
  return { success: true, message: `We sent a 6-digit code to ${user.email}.` };
}

export async function verifyEmailEnrollment(formData: FormData) {
  const { supabase, user } = await requireUser();
  const code = (formData.get('code')?.toString() ?? '').trim();

  const ok = await verifyEmailChallenge(user.id, code);
  if (!ok) {
    throw new Error('That code was incorrect or expired. Request a new one.');
  }

  const { error } = await supabase.from('user_security_settings').upsert({
    user_id: user.id,
    mfa_enabled: true,
    mfa_type: 'email',
    updated_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error('Verified, but failed to save your preference. Please retry.');
  }

  // The user just proved control of their inbox, so this session is satisfied.
  await issueTwoFactorVerifiedCookie(user.id);
  revalidatePath('/cms/settings/security');
  return { success: true, message: 'Email verification enabled.' };
}

// --- Disable / device management ------------------------------------------------

export async function disableMfa() {
  const { supabase, user } = await requireUser();

  const { data: factors } = await supabase.auth.mfa.listFactors();
  for (const factor of factors?.all ?? []) {
    await supabase.auth.mfa.unenroll({ factorId: factor.id });
  }

  await supabase.from('user_security_settings').upsert({
    user_id: user.id,
    mfa_enabled: false,
    mfa_type: null,
    updated_at: new Date().toISOString(),
  });

  await revokeAllTrustedDevices(user.id);
  await clearTwoFactorVerifiedCookie();

  revalidatePath('/cms/settings/security');
  return { success: true, message: 'Two-factor authentication disabled.' };
}

export async function revokeTrustedDeviceAction(formData: FormData) {
  const { user } = await requireUser();
  const id = formData.get('id')?.toString() ?? '';
  if (!id) {
    throw new Error('Missing device id.');
  }
  await revokeTrustedDevice(user.id, id);
  revalidatePath('/cms/settings/security');
  return { success: true, message: 'Device revoked.' };
}
