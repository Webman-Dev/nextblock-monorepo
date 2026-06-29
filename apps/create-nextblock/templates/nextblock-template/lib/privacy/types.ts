// Pure, client-safe privacy/security types and constants.
// Importable from both client and server modules (no server-only dependencies).

/** Cookie that stores the visitor's consent decision. Readable client-side so the
 *  analytics guard can gate third-party scripts before any network request. */
export const CONSENT_COOKIE_NAME = 'nb_consent_preference';

/** How long a stored consent decision is honoured before we re-ask (seconds). */
export const CONSENT_COOKIE_MAX_AGE = 365 * 24 * 60 * 60;

export interface ConsentCategories {
  /** Strictly necessary cookies are always on and cannot be declined. */
  necessary: true;
  analytics: boolean;
  marketing: boolean;
}

export interface ConsentPreference extends ConsentCategories {
  /** Opaque token also written to privacy_consent_logs for auditability. */
  token: string;
  /** Epoch milliseconds the decision was recorded. */
  ts: number;
}

export interface CorporateIdentity {
  legal_name: string;
  address: string;
  support_email: string;
}

export interface PrivacySettings {
  /** Master switch for the Law 25 consent banner. */
  banner_enabled: boolean;
  /** Google Tag Manager container id (GTM-XXXX). Loaded only after consent. */
  gtm_id: string;
  /** Optional GA4 measurement id, surfaced for reference / future use. */
  ga_measurement_id: string;
  /** Arbitrary extra <script> markup, injected only after analytics consent. */
  custom_scripts: string;
  corporate: CorporateIdentity;
}

export interface SecuritySettings {
  /** Default lifetime of a "remember this device" trust, in days. */
  trusted_device_days: number;
  /** When true, staff (ADMIN/WRITER) are expected to configure 2FA. Advisory. */
  enforce_staff_2fa: boolean;
}

export const DEFAULT_PRIVACY_SETTINGS: PrivacySettings = {
  banner_enabled: true,
  gtm_id: '',
  ga_measurement_id: '',
  custom_scripts: '',
  corporate: { legal_name: '', address: '', support_email: '' },
};

export const MIN_TRUSTED_DEVICE_DAYS = 1;
export const MAX_TRUSTED_DEVICE_DAYS = 3650; // 10 years
export const DEFAULT_TRUSTED_DEVICE_DAYS = 30;

export const DEFAULT_SECURITY_SETTINGS: SecuritySettings = {
  trusted_device_days: DEFAULT_TRUSTED_DEVICE_DAYS,
  // On by default: staff are encouraged to enable 2FA (a CMS reminder banner is shown to
  // ADMIN/WRITER accounts without a second factor). Never enforced in the sandbox.
  enforce_staff_2fa: true,
};

export type MfaType = 'totp' | 'email';
