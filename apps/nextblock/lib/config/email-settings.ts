import 'server-only';
// DB-backed SMTP configuration. Non-secret fields (host, port, from, secure) live in the
// public `email_public` row; the SMTP username and password live encrypted in the
// ADMIN-only `email_secret` row. Resolution is DB-first with an env fallback
// (SMTP_HOST / SMTP_PORT / SMTP_USER / SMTP_PASS / SMTP_FROM_EMAIL / SMTP_FROM_NAME) so
// existing deployments keep working until the values are moved into the CMS.
import {
  createClient,
  getServiceRoleSupabaseClient,
  encryptWithEnvKey,
  getSecretEnvelopeStatus,
  isSandboxEnvironment,
  resolveConfigValue,
  tryDecryptWithEnvKey,
} from '@nextblock-cms/db/server';

const EMAIL_PUBLIC_KEY = 'email_public';
const EMAIL_SECRET_KEY = 'email_secret';

export type EmailPublicSettings = {
  host: string;
  port: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
};

export const DEFAULT_EMAIL_PUBLIC_SETTINGS: EmailPublicSettings = {
  host: '',
  port: '',
  fromEmail: '',
  fromName: '',
  secure: true,
};

/** What the CMS form needs: public fields + whether each secret is already stored. */
export type EmailSettingsView = EmailPublicSettings & {
  hasUser: boolean;
  hasPass: boolean;
  userLast4: string | null;
  envFallbackActive: boolean;
};

/** Fully-resolved transport config consumed by nodemailer. */
export type ResolvedEmailConfig = {
  host: string;
  port: number;
  secure: boolean;
  auth: { user: string; pass: string };
  from: string;
};

function asString(value: unknown, fallback = ''): string {
  return typeof value === 'string' ? value : fallback;
}

function asBool(value: unknown, fallback: boolean): boolean {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return value === 'true' || value === 'on';
  return fallback;
}

function normalizePublic(value: unknown): EmailPublicSettings {
  const raw = (value && typeof value === 'object' ? value : {}) as Record<string, unknown>;
  return {
    host: asString(raw['host']),
    port: asString(raw['port']),
    fromEmail: asString(raw['fromEmail']),
    fromName: asString(raw['fromName']),
    secure: asBool(raw['secure'], true),
  };
}

export async function getEmailPublicSettings(): Promise<EmailPublicSettings> {
  const supabase = createClient();
  const { data } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', EMAIL_PUBLIC_KEY)
    .maybeSingle();
  return normalizePublic(data?.value);
}

/**
 * Read the public settings plus stored-secret status for the CMS form. Uses the
 * request-scoped client; RLS restricts the secret row to ADMIN, which is who reaches
 * this page.
 */
export async function getEmailSettingsView(): Promise<EmailSettingsView> {
  const supabase = createClient();
  const [{ data: publicData }, { data: secretData }] = await Promise.all([
    supabase.from('site_settings').select('value').eq('key', EMAIL_PUBLIC_KEY).maybeSingle(),
    supabase.from('site_settings').select('value').eq('key', EMAIL_SECRET_KEY).maybeSingle(),
  ]);

  const pub = normalizePublic(publicData?.value);
  const secret = (secretData?.value ?? {}) as Record<string, unknown>;
  const userStatus = getSecretEnvelopeStatus(secret['user']);
  const passStatus = getSecretEnvelopeStatus(secret['pass']);

  return {
    ...pub,
    hasUser: userStatus.hasStoredValue,
    hasPass: passStatus.hasStoredValue,
    userLast4: userStatus.last4,
    // Show a hint in the UI when SMTP still comes from env vars rather than the CMS.
    envFallbackActive: !pub.host && Boolean(process.env['SMTP_HOST']),
  };
}

export type SaveEmailSettingsInput = {
  host: string;
  port: string;
  fromEmail: string;
  fromName: string;
  secure: boolean;
  /** Only persisted when non-empty — a blank field keeps the existing stored secret. */
  user?: string;
  pass?: string;
};

/**
 * Persist email settings. Public fields always overwrite; secret fields are encrypted
 * and only written when a new value is supplied. Refuses to store real secrets in the
 * sandbox (its DB resets daily). Caller must enforce ADMIN; RLS double-enforces.
 */
export async function saveEmailSettings(input: SaveEmailSettingsInput): Promise<void> {
  const supabase = createClient();

  const publicValue: EmailPublicSettings = {
    host: input.host.trim(),
    port: input.port.trim(),
    fromEmail: input.fromEmail.trim(),
    fromName: input.fromName.trim(),
    secure: input.secure,
  };

  const { error: publicError } = await supabase
    .from('site_settings')
    .upsert({ key: EMAIL_PUBLIC_KEY, value: publicValue });
  if (publicError) {
    console.error('Error saving email_public settings:', publicError.message);
    throw new Error('Failed to save email settings.');
  }

  const newUser = input.user?.trim();
  const newPass = input.pass?.trim();
  if (newUser || newPass) {
    if (isSandboxEnvironment()) {
      throw new Error('The sandbox cannot store live SMTP credentials.');
    }

    // Read-merge so updating only one of user/pass keeps the other.
    const { data: existing } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', EMAIL_SECRET_KEY)
      .maybeSingle();
    const current = (existing?.value ?? {}) as Record<string, unknown>;

    const nextValue: Record<string, unknown> = { ...current };
    if (newUser) nextValue['user'] = encryptWithEnvKey(newUser);
    if (newPass) nextValue['pass'] = encryptWithEnvKey(newPass);

    const { error: secretError } = await supabase
      .from('site_settings')
      .upsert({ key: EMAIL_SECRET_KEY, value: nextValue });
    if (secretError) {
      console.error('Error saving email_secret settings:', secretError.message);
      throw new Error('Failed to save email credentials.');
    }
  }
}

/**
 * Resolve the full SMTP transport config, DB-first with an env fallback. Uses the
 * service-role client so it works from any context (the secret row is ADMIN-only under
 * RLS). Returns null when host/user/pass/from cannot be resolved from either source.
 */
export async function resolveEmailServerConfig(): Promise<ResolvedEmailConfig | null> {
  let pub: EmailPublicSettings = DEFAULT_EMAIL_PUBLIC_SETTINGS;
  let secret: Record<string, unknown> = {};

  try {
    const supabase = getServiceRoleSupabaseClient();
    const [{ data: publicData }, { data: secretData }] = await Promise.all([
      supabase.from('site_settings').select('value').eq('key', EMAIL_PUBLIC_KEY).maybeSingle(),
      supabase.from('site_settings').select('value').eq('key', EMAIL_SECRET_KEY).maybeSingle(),
    ]);
    pub = normalizePublic(publicData?.value);
    secret = (secretData?.value ?? {}) as Record<string, unknown>;
  } catch {
    // No service-role key (unconfigured instance) — fall through to env-only resolution.
  }

  const host = resolveConfigValue(pub.host, 'SMTP_HOST');
  const port = resolveConfigValue(pub.port, 'SMTP_PORT');
  const fromEmail = resolveConfigValue(pub.fromEmail, 'SMTP_FROM_EMAIL');
  const fromName = resolveConfigValue(pub.fromName, 'SMTP_FROM_NAME');
  const user = resolveConfigValue(tryDecryptWithEnvKey(secret['user']), 'SMTP_USER');
  const pass = resolveConfigValue(tryDecryptWithEnvKey(secret['pass']), 'SMTP_PASS');

  if (!host || !port || !user || !pass || !fromEmail) {
    console.warn('Email is not configured (CMS or SMTP_* env). Outbound email will not be sent.');
    return null;
  }

  const portNumber = Number(port);
  return {
    host,
    port: portNumber,
    // Honor the CMS toggle; fall back to the SMTPS convention (465 ⇒ implicit TLS).
    secure: pub.host ? pub.secure : portNumber === 465,
    auth: { user, pass },
    from: fromName ? `"${fromName}" <${fromEmail}>` : fromEmail,
  };
}
