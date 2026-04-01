import 'server-only';
import { createClient } from './supabase/server'; 

/**
 * Verifies if a package is active and valid.
 * 
 * @param packageId - The ID of the package to verify (e.g., 'ecommerce')
 * @returns boolean - true if active, false otherwise
 */
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';

export async function verifyPackageOnline(packageId: string, customClient?: any): Promise<boolean> {
    let supabase = customClient;
    
    // If no custom client provided, try to use service role to bypass RLS restrictions on public pages
    if (!supabase) {
      const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
      const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'];
      
      if (url && serviceKey) {
        supabase = createSupabaseJsClient(url, serviceKey);
      } else {
        supabase = await createClient(); // Fallback to session client if service key missing
      }
    }

    try {
        const { data, error } = await supabase
            .from('package_activations')
            .select('status')
            .eq('package_id', packageId)
            .single();

        if (error || !data) {
            return false;
        }

        return data.status === 'active';
    } catch (err) {
        console.error(`Error verifying package ${packageId}:`, err);
        return false;
    }
}
