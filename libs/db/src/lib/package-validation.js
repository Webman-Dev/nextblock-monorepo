import 'server-only';
import { createClient } from './supabase/server';
import { unstable_cache } from 'next/cache';
/**
 * Verifies if a package is active and valid.
 *
 * @param packageId - The ID of the package to verify (e.g., 'ecommerce')
 * @returns boolean - true if active, false otherwise
 */
import { createClient as createSupabaseJsClient } from '@supabase/supabase-js';
async function queryPackageActivation(packageId, supabase) {
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
    }
    catch (err) {
        console.error(`Error verifying package ${packageId}:`, err);
        return false;
    }
}
const verifyPackageOnlineCached = unstable_cache(async (packageId) => {
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    if (!url || !serviceKey) {
        return false;
    }
    const supabase = createSupabaseJsClient(url, serviceKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false,
        },
    });
    return queryPackageActivation(packageId, supabase);
}, ['package-activation'], { revalidate: 60 });
export async function verifyPackageOnline(packageId, customClient) {
    if (customClient) {
        return queryPackageActivation(packageId, customClient);
    }
    const url = process.env['NEXT_PUBLIC_SUPABASE_URL'];
    const serviceKey = process.env['SUPABASE_SERVICE_ROLE_KEY'] || process.env['NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    if (url && serviceKey) {
        return verifyPackageOnlineCached(packageId);
    }
    const supabase = await createClient();
    return queryPackageActivation(packageId, supabase);
}
//# sourceMappingURL=package-validation.js.map