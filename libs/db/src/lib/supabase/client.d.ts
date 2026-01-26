import { SupabaseClient } from '@supabase/supabase-js';
import { Database } from './types';
type Profile = Database['public']['Tables']['profiles']['Row'];
type Language = Database['public']['Tables']['languages']['Row'];
export declare const createClient: () => SupabaseClient<any, "public", "public", any, any>;
export declare function getProfileWithRoleClientSide(supabase: SupabaseClient, // Accept the client instance
userId: string): Promise<Profile | null>;
export declare function getActiveLanguagesClientSide(): Promise<Language[]>;
export {};
