// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
import { SupabaseClient } from '@supabase/supabase-js'; // Correct import for the type
import { Database } from './types'; // Import custom types

type Profile = Database['public']['Tables']['profiles']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];

// This is the standard client creation function from the Vercel example.
//
// Prefer the build-time-inlined NEXT_PUBLIC_* (always correct in production), and fall
// back to runtime values injected by the root layout into window.__NEXTBLOCK_PUBLIC_ENV__.
// The fallback only matters in local dev right after the /setup wizard writes the env at
// runtime: the already-loaded browser bundle holds stale empties until a restart, so this
// lets the client work immediately without one. (url + anon key are public values.)
export const createClient = () => {
  const runtime =
    typeof window !== 'undefined'
      ? (window as { __NEXTBLOCK_PUBLIC_ENV__?: { url?: string; anonKey?: string } })
          .__NEXTBLOCK_PUBLIC_ENV__
      : undefined;

  // Accept every alias the Vercel Supabase integration may inject (non-prefixed names and
  // the new publishable key). Keep this order in sync with apps/.../lib/setup/env-status.ts.
  const supabaseUrl =
    process.env['NEXT_PUBLIC_SUPABASE_URL'] ||
    process.env['SUPABASE_URL'] ||
    runtime?.url;
  const supabaseAnonKey =
    process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'] ||
    process.env['SUPABASE_ANON_KEY'] ||
    process.env['NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] ||
    process.env['SUPABASE_PUBLISHABLE_KEY'] ||
    runtime?.anonKey;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'CRITICAL: Supabase URL or Anon Key is missing. ' +
      'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your production environment. ' +
      `URL_IS_SET: ${!!supabaseUrl}, ANON_KEY_IS_SET: ${!!supabaseAnonKey}`
    );
  }

  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};

// Helper function to get profile with role (client-side)
// MODIFIED: Now accepts a SupabaseClient instance as an argument
export async function getProfileWithRoleClientSide(
  supabase: SupabaseClient, // Accept the client instance
  userId: string
): Promise<Profile | null> {
  // It no longer creates its own client. It uses the one passed to it.
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, updated_at, website')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    // console.error('Error fetching profile (client-side):', profileError?.message); // Silenced for production
    return null;
  }
  return profileData as Profile;
}

export async function getActiveLanguagesClientSide(): Promise<Language[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('languages')
    .select('id, code, name, is_default, is_active, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    // console.error('Error fetching languages (client-side):', error.message); // Silenced for production
    return [];
  }
  return data || [];
}