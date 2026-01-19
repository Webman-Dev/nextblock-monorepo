// utils/supabase/client.ts
import { createBrowserClient } from '@supabase/ssr';
// This is the standard client creation function from the Vercel example
export const createClient = () => {
  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      'CRITICAL: Supabase URL or Anon Key is missing. ' +
        'Please ensure NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY are set in your production environment. ' +
        `URL_IS_SET: ${!!supabaseUrl}, ANON_KEY_IS_SET: ${!!supabaseAnonKey}`,
    );
  }
  return createBrowserClient(supabaseUrl, supabaseAnonKey);
};
// Helper function to get profile with role (client-side)
// MODIFIED: Now accepts a SupabaseClient instance as an argument
export async function getProfileWithRoleClientSide(
  supabase, // Accept the client instance
  userId,
) {
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
  return profileData;
}
export async function getActiveLanguagesClientSide() {
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
//# sourceMappingURL=client.js.map
