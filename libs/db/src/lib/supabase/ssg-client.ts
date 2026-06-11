// utils/supabase/ssg-client.ts
import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';

export const getSsgSupabaseClient = (): SupabaseClient => {
  // Server-side reads prefer the internal container URL (self-hosted Docker); falls back to
  // the public URL, then a dummy so the build never crashes when nothing is configured.
  const url =
    process.env['SUPABASE_INTERNAL_URL'] ||
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
    'https://dummy.supabase.co';
  const key = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] || 'dummy-key';
  
  if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    console.warn('Supabase URL or Anon Key is missing for SSG client. Returning dummy client to prevent build crash.');
  }
  
  return createSupabaseJsClient(url, key);
};