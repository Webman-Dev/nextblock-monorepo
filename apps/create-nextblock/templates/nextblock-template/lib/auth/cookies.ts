// Server-only cookie helpers for the 2FA / trusted-device flow.
// All three cookies are HttpOnly so they are never readable from JS.
import { cookies } from 'next/headers';

/** Long-lived "remember this device" token (raw token; its SHA-256 is in the DB). */
export const TRUSTED_DEVICE_COOKIE = 'nb_trusted_device';
/** Signed marker proving the email second factor was satisfied this session. */
export const TWO_FACTOR_COOKIE = 'nb_2fa_verified';
/** Short-lived flag carrying the "remember me" checkbox from login to post-2FA. */
export const REMEMBER_INTENT_COOKIE = 'nb_remember_intent';

const isProd = process.env.NODE_ENV === 'production';

export async function setSecureCookie(
  name: string,
  value: string,
  maxAgeSeconds: number,
): Promise<void> {
  const store = await cookies();
  store.set({
    name,
    value,
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export async function getCookieValue(name: string): Promise<string | null> {
  const store = await cookies();
  return store.get(name)?.value ?? null;
}

export async function clearCookie(name: string): Promise<void> {
  const store = await cookies();
  store.set({
    name,
    value: '',
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}
