import 'server-only';
// utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';
import { Database } from './types'; // Import custom types

type Profile = Database['public']['Tables']['profiles']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];

// This is the standard server client creation function from the Vercel example
export const createClient = () => {
  const cookieStorePromise = (cookies() as unknown as UnsafeUnwrappedCookies);

  const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
  const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
  
  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing Supabase environment variables');
  }
  
  return createServerClient(
    supabaseUrl,
    supabaseAnonKey,
    {
      cookies: {
        async get(name: string) {
          const cookieStore = await cookieStorePromise;
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            (async () => {
              const cookieStore = await cookieStorePromise;
              cookieStore.set({ name, value, ...options });
            })();
          } catch {
            // The `set` method was called from a Server Component.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            (async () => {
              const cookieStore = await cookieStorePromise;
              cookieStore.set({ name, value: '', ...options });
            })();
          } catch {
            // The `delete` method was called from a Server Component.
          }
        },
      },
    }
  );
};

// Helper function to get profile with role (server-side)
export async function getProfileWithRoleServerSide(userId: string): Promise<Profile | null> {
  const supabase = createClient(); // Uses the server client defined above
  const { data: profileData, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, avatar_url, role, updated_at, username, website')
    .eq('id', userId)
    .single();

  if (profileError || !profileData) {
    // Avoid logging full error in production if it contains sensitive info,
    // but log message for debugging.
    console.error('Error fetching profile (server-side):', profileError?.message);
    return null;
  }
  return profileData as Profile;
}

export async function getActiveLanguagesServerSide(): Promise<Language[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('languages')
    .select('id, code, name, is_default, is_active, created_at, updated_at')
    .order('name', { ascending: true });

  if (error) {
    console.error('Error fetching languages (server-side):', error.message);
    return [];
  }
  return data || [];
}