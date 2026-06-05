'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@nextblock-cms/db/server';
import {
  createEmailChallenge,
  issueTwoFactorVerifiedCookie,
  verifyEmailChallenge,
} from '../../../lib/auth/twoFactor';
import { issueTrustedDevice } from '../../../lib/auth/trustedDevices';
import {
  REMEMBER_INTENT_COOKIE,
  clearCookie,
  getCookieValue,
} from '../../../lib/auth/cookies';
import { sendTwoFactorCodeEmail } from '../../actions/twoFactorEmail';

function safeRedirect(path?: string): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/cms/dashboard';
}

/** If the user opted into "remember this device" at login, mint the trust now. */
async function maybeIssueTrustedDevice(userId: string): Promise<void> {
  const intent = await getCookieValue(REMEMBER_INTENT_COOKIE);
  if (intent !== '1') return;
  const userAgent = (await headers()).get('user-agent');
  await issueTrustedDevice(userId, userAgent);
  await clearCookie(REMEMBER_INTENT_COOKIE);
}

export async function verifyTotpChallenge(formData: FormData) {
  const code = (formData.get('code')?.toString() ?? '').trim();
  const redirectTo = safeRedirect(formData.get('redirect_to')?.toString());
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session expired. Please sign in again.' };
  if (!/^\d{6}$/.test(code)) return { error: 'Enter the 6-digit code from your app.' };

  const { data: factors } = await supabase.auth.mfa.listFactors();
  const factor = factors?.totp?.find((f) => f.status === 'verified');
  if (!factor) return { error: 'No authenticator is set up for this account.' };

  const { data: challenge, error: challengeError } = await supabase.auth.mfa.challenge({
    factorId: factor.id,
  });
  if (challengeError || !challenge) return { error: 'Could not start verification.' };

  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId: factor.id,
    challengeId: challenge.id,
    code,
  });
  if (verifyError) return { error: 'That code was not valid. Please try again.' };

  await maybeIssueTrustedDevice(user.id);
  redirect(redirectTo);
}

export async function verifyEmailCode(formData: FormData) {
  const code = (formData.get('code')?.toString() ?? '').trim();
  const redirectTo = safeRedirect(formData.get('redirect_to')?.toString());
  const supabase = createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return { error: 'Your session expired. Please sign in again.' };

  const ok = await verifyEmailChallenge(user.id, code);
  if (!ok) return { error: 'That code was incorrect or expired. Request a new one.' };

  await issueTwoFactorVerifiedCookie(user.id);
  await maybeIssueTrustedDevice(user.id);
  redirect(redirectTo);
}

export async function resendEmailCode() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { error: 'No email address is associated with your account.' };

  const code = await createEmailChallenge(user.id);
  await sendTwoFactorCodeEmail(user.email, code);
  return { success: true, message: `A new code is on its way to ${user.email}.` };
}
