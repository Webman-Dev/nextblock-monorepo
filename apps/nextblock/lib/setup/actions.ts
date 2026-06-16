'use server';
// Server actions backing the browser /setup wizard. Every mutating action is guarded
// by assertNotProvisioned() so setup can only run once (until a first admin exists).

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { isLocalWritableEnv } from './env-status';
import { writeEnvLocal } from './env-write';
import {
  assertNotProvisioned,
  getProvisioningStatus,
  type ProvisioningStatus,
} from './provisioning';
import { applyMigrations, resetDatabase } from './schema-apply';
import { setSystemConfigurationServiceRole } from './system-config';

export interface ActionResult {
  ok: boolean;
  error?: string;
  message?: string;
  restartRecommended?: boolean;
  schemaReady?: boolean;
}

export interface ConnectionInput {
  supabaseUrl: string;
  anonKey: string;
  serviceRoleKey: string;
  postgresUrl?: string;
  siteUrl?: string;
  /** Supabase personal access token — needed by `npm run db:migrate` to link + push. */
  accessToken?: string;
}

/**
 * Step (Profile B / local only): validate the Supabase credentials, then persist them
 * to `.env.local` and the live process. Probes with the service-role key so we can
 * also report whether the schema has been applied yet.
 */
export async function saveSupabaseConnection(input: ConnectionInput): Promise<ActionResult> {
  await assertNotProvisioned();

  const supabaseUrl = input.supabaseUrl?.trim();
  const anonKey = input.anonKey?.trim();
  const serviceRoleKey = input.serviceRoleKey?.trim();

  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    return {
      ok: false,
      error: 'Supabase URL, anon key, and service-role key are all required.',
    };
  }
  try {
    new URL(supabaseUrl);
  } catch {
    return { ok: false, error: 'The Supabase URL is not a valid URL.' };
  }

  if (!isLocalWritableEnv()) {
    return {
      ok: false,
      error:
        'This environment is read-only. Set the Supabase variables on your hosting platform instead of here.',
    };
  }

  // Validate the credentials with a service-role probe before writing anything.
  const probe = createSupabaseJsClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  let schemaReady = false;
  try {
    const { error } = await probe.from('site_settings').select('key').limit(1);
    if (error) {
      const missing = /relation|does not exist|schema cache/i.test(error.message);
      if (!missing) {
        return {
          ok: false,
          error: `Could not reach Supabase with those credentials: ${error.message}`,
        };
      }
      schemaReady = false; // reachable, but the schema isn't applied yet
    } else {
      schemaReady = true;
    }
  } catch (caught) {
    return {
      ok: false,
      error: `Could not connect to Supabase: ${
        caught instanceof Error ? caught.message : 'unknown error'
      }`,
    };
  }

  const values: Record<string, string> = {
    NEXT_PUBLIC_SUPABASE_URL: supabaseUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: anonKey,
    SUPABASE_SERVICE_ROLE_KEY: serviceRoleKey,
  };
  if (input.siteUrl?.trim()) values.NEXT_PUBLIC_URL = input.siteUrl.trim();
  if (input.postgresUrl?.trim()) values.POSTGRES_URL = input.postgresUrl.trim();
  if (input.accessToken?.trim()) values.SUPABASE_ACCESS_TOKEN = input.accessToken.trim();

  // Derive the project ref from the URL (https://<ref>.supabase.co) so the CLI schema
  // step (`npm run db:migrate`) links + pushes to THIS project, not a stale one.
  try {
    const host = new URL(supabaseUrl).hostname;
    if (host.endsWith('.supabase.co') || host.endsWith('.supabase.in')) {
      values.SUPABASE_PROJECT_ID = host.split('.')[0];
    }
  } catch {
    // already validated above; ignore
  }

  try {
    await writeEnvLocal(values);
  } catch (caught) {
    return {
      ok: false,
      error: `Could not write .env.local: ${
        caught instanceof Error ? caught.message : 'unknown error'
      }`,
    };
  }

  return {
    ok: true,
    schemaReady,
    restartRecommended: true,
    message: schemaReady
      ? 'Connection saved and verified.'
      : 'Connection saved. The database schema is not applied yet — run "npm run db:migrate", then re-check below.',
  };
}

/** Poll provisioning status (used by the wizard to advance past connection/schema). */
export async function recheckStatus(): Promise<ProvisioningStatus & { writable: boolean }> {
  const status = await getProvisioningStatus();
  return { ...status, writable: isLocalWritableEnv() };
}

export interface CompleteSetupInput {
  admin: { email: string; password: string; fullName: string };
  autoAcceptSignups: boolean;
  /** Local-only extra env (storage / SMTP) collected by the wizard. */
  envValues?: Record<string, string>;
  /** Bot protection — stored in the DB so it works on read-only channels too. */
  turnstile?: { provider: 'none' | 'turnstile'; siteKey: string; secretKey: string };
  /** "Start from a clean database" — wipe before installing (local dev only, server-gated). */
  resetFirst?: boolean;
}

/**
 * After a fresh migration, PostgREST may briefly not see the new tables (its schema
 * cache). applyMigrations issues a reload, but it's async — poll until a known new
 * table reads cleanly so the REST reads/writes below don't hit a false "table not
 * found". Best-effort: gives up after ~6s and lets the caller proceed.
 */
async function waitForSchemaCache(
  supabase: ReturnType<typeof getServiceRoleSupabaseClient>,
): Promise<void> {
  for (let attempt = 0; attempt < 12; attempt++) {
    const { error } = await supabase.from('system_configuration').select('id').limit(1);
    if (!error) return;
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
}

/**
 * Final step: persist remaining settings and create the first admin. The
 * handle_new_user trigger assigns the ADMIN role and flips is_admin_created, so we
 * never set the role ourselves. `email_confirm: true` means no SMTP round-trip is
 * required, which keeps every channel (including cloud-without-SMTP) unblocked.
 */
export async function completeSetup(input: CompleteSetupInput): Promise<ActionResult> {
  // "Start from a clean database" (local dev only) deliberately re-installs over an
  // existing DB — it wipes everything first — so the one-shot guard is skipped in that
  // case. Otherwise enforce it: a provisioned instance can't be re-setup or wiped, and
  // we return a clean message rather than throwing an unhandled error.
  const willReset = input.resetFirst === true && isLocalWritableEnv();
  if (!willReset) {
    try {
      await assertNotProvisioned();
    } catch {
      return {
        ok: false,
        error:
          'Setup has already been completed. Enable "Start from a clean database" to reinstall, or sign in instead.',
      };
    }
  }

  const email = input.admin?.email?.trim().toLowerCase();
  const password = input.admin?.password ?? '';
  const fullName = input.admin?.fullName?.trim() ?? '';

  if (!email || !password) {
    return { ok: false, error: 'Administrator email and password are required.' };
  }
  if (password.length < 8) {
    return { ok: false, error: 'Use an administrator password of at least 8 characters.' };
  }
  if (input.turnstile?.provider === 'turnstile' && !input.turnstile.secretKey?.trim()) {
    return { ok: false, error: 'Enter a Turnstile secret key, or disable bot protection.' };
  }

  // 1) Persist any local env extras (storage / SMTP) for Profile B.
  if (
    input.envValues &&
    Object.keys(input.envValues).length > 0 &&
    isLocalWritableEnv()
  ) {
    try {
      await writeEnvLocal(input.envValues);
    } catch (caught) {
      return {
        ok: false,
        error: `Could not write .env.local: ${
          caught instanceof Error ? caught.message : 'unknown error'
        }`,
      };
    }
  }

  // 2) Service-role access is required from here on.
  let admin: ReturnType<typeof getServiceRoleSupabaseClient>;
  try {
    admin = getServiceRoleSupabaseClient();
  } catch {
    return {
      ok: false,
      error:
        'The service-role key is not loaded yet. Restart the dev server after saving the connection, then retry.',
    };
  }

  // 2.5) "Start from a clean database" (the fresh-install checkbox): wipe the DB (public
  //      schema + migration history + auth users) before installing, so each fresh setup
  //      starts clean. Two reliable guards: assertNotProvisioned() above means this only
  //      runs when no admin exists (a live site is immune), and isLocalWritableEnv()
  //      restricts it to local dev (a deployed app can never be tricked into wiping
  //      itself, even by a crafted request).
  if (willReset) {
    const reset = await resetDatabase();
    if (!reset.ok) {
      return { ok: false, error: `Could not reset the database: ${reset.error}` };
    }
    // Clear auth users via the admin API (reliable — SQL on the auth schema can be
    // permission-restricted), so the admin email is free to reuse on this fresh install.
    try {
      const { data: list } = await admin.auth.admin.listUsers();
      for (const existing of list?.users ?? []) {
        await admin.auth.admin.deleteUser(existing.id);
      }
    } catch {
      // Non-fatal — the createUser "already exists" fallback below also handles leftovers.
    }
  }

  // 3) Apply the database schema if it isn't there yet (e.g. a fresh Supabase project).
  //    Direct Postgres connection — no CLI, no config.toml. Idempotent (tracks applied
  //    migrations), so it's a no-op when the schema already exists (Docker, or a re-run).
  //    Then wait for PostgREST to pick up the new tables before we touch them via REST.
  const schemaStatus = await getProvisioningStatus();
  if (!schemaStatus.schemaReady) {
    // applyMigrations prefers the Supabase Management API (HTTPS, needs only the access
    // token + project ref) and falls back to a direct Postgres connection. It returns a
    // clear error if neither is available.
    const schema = await applyMigrations();
    if (!schema.ok) {
      return { ok: false, error: `Could not apply the database schema: ${schema.error}` };
    }
  }

  // Ensure PostgREST has the schema cached before ANY REST read/write below — covers a
  // fresh apply AND a cold cache over a pre-existing schema (Docker boot race / re-run).
  await waitForSchemaCache(admin);

  // 4) Persist DB-backed settings (service role bypasses RLS — no admin exists yet).
  try {
    if (input.turnstile && input.turnstile.provider !== 'none') {
      await admin.from('site_settings').upsert({
        key: 'bot_protection_public',
        value: { provider: input.turnstile.provider, siteKey: input.turnstile.siteKey },
      });
      await admin.from('site_settings').upsert({
        key: 'bot_protection_secret',
        value: { secretKey: input.turnstile.secretKey },
      });
    }
    await setSystemConfigurationServiceRole({
      auto_accept_signups: Boolean(input.autoAcceptSignups),
    });
  } catch (caught) {
    return {
      ok: false,
      error: `Failed to save settings: ${
        caught instanceof Error ? caught.message : 'unknown error'
      }`,
    };
  }

  // 4) Create the first admin account (already confirmed). The handle_new_user trigger
  //    assigns ADMIN to the very first user and flips is_admin_created atomically.
  const createPayload = {
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: fullName },
  };
  let { data: created, error: createError } = await admin.auth.admin.createUser(createPayload);

  // If a clean-install reset left a stale auth user (admin-API cleanup above hit an edge
  // case), remove it and retry once so the operator can reuse their email.
  if (
    createError &&
    input.resetFirst === true &&
    /already|registered|exists/i.test(createError.message)
  ) {
    try {
      const { data: list } = await admin.auth.admin.listUsers();
      const stale = list?.users?.find((u) => u.email?.toLowerCase() === email);
      if (stale) {
        await admin.auth.admin.deleteUser(stale.id);
        ({ data: created, error: createError } = await admin.auth.admin.createUser(createPayload));
      }
    } catch {
      // fall through to the error handling below
    }
  }

  if (createError || !created?.user) {
    if (createError && /already|registered|exists/i.test(createError.message)) {
      return {
        ok: false,
        error:
          'An account with this email already exists. Enable "Start from a clean database", or use a different email.',
      };
    }
    return {
      ok: false,
      error: `Could not create the administrator account: ${
        createError?.message ?? 'unknown error'
      }`,
    };
  }

  // Guard against a concurrent-setup race: assertNotProvisioned() is a check-then-act,
  // so two simultaneous submissions could both pass it. The trigger still grants ADMIN
  // to only the first user — so if this account came back as anything other than ADMIN,
  // another session won the race. Undo this spurious account and report it, rather than
  // signing the operator in as a non-admin.
  const { data: createdProfile } = await admin
    .from('profiles')
    .select('role')
    .eq('id', created.user.id)
    .maybeSingle();
  if (createdProfile?.role !== 'ADMIN') {
    await admin.auth.admin.deleteUser(created.user.id).catch(() => {});
    return {
      ok: false,
      error: 'Setup was just completed by another session. Please sign in instead.',
    };
  }

  // The wizard establishes the session afterwards via the canonical signInAction (a more
  // reliable cookie path than signing in here), so we just report success.
  return { ok: true, message: 'Setup complete.' };
}
