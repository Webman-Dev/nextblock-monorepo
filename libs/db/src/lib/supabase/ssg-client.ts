// utils/supabase/ssg-client.ts
import { createClient as createSupabaseJsClient, SupabaseClient } from '@supabase/supabase-js';


export const getSsgSupabaseClient = (): SupabaseClient => {
  if (!process.env['NEXT_PUBLIC_SUPABASE_URL'] || !process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']) {
    console.warn('Supabase URL or Anon Key is missing for SSG client. Check .env.local');
    return {} as SupabaseClient;
  }
  // Create a singleton instance for SSG builds if desired, or just create a new one each time.
  // For simplicity, creating a new one each time is fine here as these functions run at build time.
  return createSupabaseJsClient(
    process.env['NEXT_PUBLIC_SUPABASE_URL'],
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY']
  );
};