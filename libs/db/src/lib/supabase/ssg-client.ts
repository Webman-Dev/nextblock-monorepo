// utils/supabase/ssg-client.ts
import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';

export const getSsgSupabaseClient = (): SupabaseClient => {
  // Accept every alias the Vercel Supabase integration may inject (non-prefixed names
  // and the new publishable key). Keep this order in sync with env-status.ts.
  const resolvedUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] || process.env['SUPABASE_URL'];
  const resolvedKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    process.env['SUPABASE_ANON_KEY'] ||
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['SUPABASE_PUBLISHABLE_KEY'];

  const url = resolvedUrl || 'https://dummy.supabase.co';
  const key = resolvedKey || 'dummy-key';

  if (!resolvedUrl || !resolvedKey) {
    console.warn('Supabase URL or Anon Key is missing for SSG client. Returning dummy client to prevent build crash.');
  }

  return createSupabaseJsClient(url, key);
};