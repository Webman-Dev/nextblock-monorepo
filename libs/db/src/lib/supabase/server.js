import { createServerClient } from '@supabase/ssr';
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
import { cookies } from 'next/headers';
const SERVER_ONLY_ERROR_MESSAGE = 'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';
if (typeof window !== 'undefined') {
    throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}
// This is the standard server client creation function from the Vercel example
export const createClient = () => {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseAnonKey = process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    if (!supabaseUrl || !supabaseAnonKey) {
        throw new Error('Missing Supabase environment variables');
    }
    return createServerClient(supabaseUrl, supabaseAnonKey, {
        cookies: {
            getAll: async () => {
                try {
                    const cookieStore = await cookies();
                    return cookieStore.getAll();
                }
                catch {
                    return [];
                }
            },
            setAll: async (cookieList) => {
                try {
                    const cookieStore = await cookies();
                    for (const { name, value, options } of cookieList) {
                        if (value && value.length > 0) {
                            cookieStore.set({ name, value, ...options });
                        }
                        else if (options && Object.keys(options).length > 0) {
                            cookieStore.delete({ name, ...options });
                        }
                        else {
                            cookieStore.delete(name);
                        }
                    }
                }
                catch {
                    // Setting cookies is only allowed in Server Actions and Route Handlers.
                }
            },
        },
    });
};
// Helper function to get profile with role (server-side)
export async function getProfileWithRoleServerSide(userId) {
    const supabase = createClient(); // Uses the server client defined above
    const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, role, updated_at, website')
        .eq('id', userId)
        .single();
    if (profileError || !profileData) {
        // Avoid logging full error in production if it contains sensitive info,
        // but log message for debugging.
        console.error('Error fetching profile (server-side):', profileError?.message);
        return null;
    }
    return profileData;
}
export async function getActiveLanguagesServerSide() {
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
/**
 * Creates a Supabase client with the Service Role key.
 * ⚠️ WARNING: This bypasses ALL Row Level Security (RLS).
 * MUST ONLY be used in secure server-side contexts (Server Actions/Route Handlers).
 */
export const getServiceRoleSupabaseClient = () => {
    const supabaseUrl = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const supabaseServiceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing Supabase Service Role environment variables');
    }
    return createSupabaseJsClient(supabaseUrl, supabaseServiceKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
};
//# sourceMappingURL=server.js.map