// Client-side consent cookie helpers. Safe to import from client components only.
// The cookie is intentionally NOT HttpOnly so the analytics guard can read it
// before any third-party request is made.
import {
  CONSENT_COOKIE_MAX_AGE,
  CONSENT_COOKIE_NAME,
  type ConsentPreference,
} from './types';

/** Window event dispatched when the visitor changes their consent choice. */
export const CONSENT_CHANGE_EVENT = 'nb:consent-change';

export function readConsent(): ConsentPreference | null {
  if (typeof document === 'undefined') return null;
  const entry = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${CONSENT_COOKIE_NAME}=`));
  if (!entry) return null;
  try {
    const raw = decodeURIComponent(entry.slice(CONSENT_COOKIE_NAME.length + 1));
    const parsed = JSON.parse(raw) as Partial<ConsentPreference>;
    if (!parsed || typeof parsed !== 'object') return null;
    return {
      necessary: true,
      analytics: Boolean(parsed.analytics),
      marketing: Boolean(parsed.marketing),
      token: typeof parsed.token === 'string' ? parsed.token : '',
      ts: typeof parsed.ts === 'number' ? parsed.ts : 0,
    };
  } catch {
    return null;
  }
}

function randomToken(): string {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID();
  }
  return `${Math.random().toString(36).slice(2)}${Date.now().toString(36)}`;
}

/** Persist a consent decision, broadcast the change, and return the record. */
export function writeConsent(choice: { analytics: boolean; marketing: boolean }): ConsentPreference {
  const value: ConsentPreference = {
    necessary: true,
    analytics: choice.analytics,
    marketing: choice.marketing,
    token: randomToken(),
    ts: Date.now(),
  };
  const secure = typeof location !== 'undefined' && location.protocol === 'https:' ? '; Secure' : '';
  document.cookie =
    `${CONSENT_COOKIE_NAME}=${encodeURIComponent(JSON.stringify(value))}` +
    `; Max-Age=${CONSENT_COOKIE_MAX_AGE}; Path=/; SameSite=Lax${secure}`;
  window.dispatchEvent(new CustomEvent<ConsentPreference>(CONSENT_CHANGE_EVENT, { detail: value }));
  return value;
}
