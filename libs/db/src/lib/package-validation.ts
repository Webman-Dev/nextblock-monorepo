import 'server-only';
import { createClient } from './supabase/server'; 

/**
 * Verifies if a package is active and valid.
 * 
 * @param packageId - The ID of the package to verify (e.g., 'ecommerce')
 * @returns boolean - true if active, false otherwise
 */
export async function verifyPackageOnline(packageId: string): Promise<boolean> {
    const supabase = await createClient();

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
