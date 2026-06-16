import 'server-only';
// Server-only provisioning status used by the /setup page (to redirect away once
// complete) and by the wizard's server actions (to refuse re-running setup).
import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { isSupabaseConfigured } from './env-status';

export interface ProvisioningStatus {
  /** Supabase connection vars are present. */
  configured: boolean;
  /** Core tables exist (migrations applied). */
  schemaReady: boolean;
  /** The first admin has been created (site_settings.is_admin_created === true). */
  hasAdmin: boolean;
}

export async function getProvisioningStatus(): Promise<ProvisioningStatus> {
  if (!isSupabaseConfigured()) {
    return { configured: false, schemaReady: false, hasAdmin: false };
  }

  // Prefer the service-role client so the read is authoritative regardless of caller
  // role/session; fall back to the request client if the service key isn't set yet.
  let supabase: ReturnType<typeof getServiceRoleSupabaseClient>;
  try {
    supabase = getServiceRoleSupabaseClient();
  } catch {
    supabase = createClient() as unknown as ReturnType<typeof getServiceRoleSupabaseClient>;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'is_admin_created')
      .maybeSingle();

    if (error) {
      // A missing table (PostgREST PGRST205, or a "relation does not exist" message)
      // means the schema hasn't been applied yet.
      const missing =
        (error as { code?: string }).code === 'PGRST205' ||
        /relation|does not exist|schema cache/i.test(error.message ?? '');
      return { configured: true, schemaReady: !missing, hasAdmin: false };
    }

    const hasAdmin = data?.value === true || data?.value === 'true';
    return { configured: true, schemaReady: true, hasAdmin };
  } catch {
    return { configured: true, schemaReady: false, hasAdmin: false };
  }
}

/** Throws if setup has already completed. Guards every mutating wizard action. */
export async function assertNotProvisioned(): Promise<void> {
  const { hasAdmin } = await getProvisioningStatus();
  if (hasAdmin) {
    throw new Error('Setup has already been completed.');
  }
}
