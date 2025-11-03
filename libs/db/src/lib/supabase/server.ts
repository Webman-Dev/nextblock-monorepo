// utils/supabase/server.ts
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { Database } from './types';

const SERVER_ONLY_ERROR_MESSAGE =
  'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}

type Profile = Database['public']['Tables']['profiles']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];

type ServerCookies = Awaited<ReturnType<typeof cookies>>;
type SupabaseCookiePayload = {
  name: string;
  value: string;
  options: CookieOptions;
};

// This is the standard server client creation function from the Vercel example
export const createClient = () => {
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
        getAll: async () => {
          try {
            const cookieStore: ServerCookies = await cookies();
            return cookieStore.getAll();
          } catch {
            return [];
          }
        },
        setAll: async (cookieList: SupabaseCookiePayload[]) => {
          try {
            const cookieStore: ServerCookies = await cookies();
            for (const { name, value, options } of cookieList) {
              if (value && value.length > 0) {
                cookieStore.set({ name, value, ...options });
              } else if (options && Object.keys(options).length > 0) {
                cookieStore.delete({ name, ...options });
              } else {
                cookieStore.delete(name);
              }
            }
          } catch {
            // Setting cookies is only allowed in Server Actions and Route Handlers.
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
