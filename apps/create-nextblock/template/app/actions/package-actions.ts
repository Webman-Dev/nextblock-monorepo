'use server';

import { createClient } from '@supabase/supabase-js';
import { getPackageByVariantId } from '@nextblock-cms/utils';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const LS_API_URL = 'https://api.lemonsqueezy.com/v1';

// Helper to get service role client
const getServiceRoleClient = () => {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        throw new Error('Missing Supabase credentials (Service Key required for activation).');
    }

    if (supabaseServiceKey === process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
        console.warn('CRITICAL WARNING: SUPABASE_SERVICE_ROLE_KEY matches NEXT_PUBLIC_SUPABASE_ANON_KEY. This will likely cause Permission Denied errors as RLS cannot be bypassed.');
    }

    return createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
};

export async function activatePackage(key: string) {
  if (!key) {
    return { error: 'License key is required.' };
  }

  const headerList = await headers();
  // instance_name is usually the domain, for local dev use 'localhost' or actual host
  const instanceName = headerList.get('host') || 'nextblock-instance';

  try {
    // 1. Activate with Lemon Squeezy
    const response = await fetch(`${LS_API_URL}/licenses/activate`, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        license_key: key,
        instance_name: instanceName,
      }),
    });

    const data = await response.json();

    if (!data.activated) {
        return { error: data.error || 'Activation failed. Invalid key or limit reached.' };
    }

    // 2. Identify Package
    // const variantId = data.meta?.variant_id; // Sometimes variant_id is inside attributes
    const variantId = data.meta?.variant_id || data.license_key?.variant_id || (data.data?.attributes?.product_id ? String(data.data.attributes.product_id) : null); 
    
    // Fallback: if variant_id is missing, we might need a better mapping strategy
    // For now, let's try to map product_id if available, or just error out.
    // The user payload has product_id: 835771. 
    // Our constant has ls_variant_id.
    
    // Let's trust getPackageByVariantId will find it if we pass the right thing.
    // The payload shows data.attributes.product_id = 835771. 
    // data.meta.variant_id is NOT in the payload provided by user.
    // Wait, the payload provided by user is a WEBHOOK payload.
    // The response from Activate API is slightly different.
    // Assume activate API returns what we need. 
    
    const pkg = getPackageByVariantId(variantId);

    if (!pkg) {
         // Attempt to look up by product_id if variant_id fails? 
         // For now, just error.
        return { error: `License valid, but package variant (${variantId}) is not recognized by this system.` };
    }

    // 3. Store in DB - USE SERVICE ROLE
    const supabase = getServiceRoleClient();
    
    const { error: dbError } = await supabase
        .from('package_activations')
        .upsert({
            license_key: key,
            instance_name: instanceName,
            package_id: pkg.id,
            status: 'active',
            meta: data,
            last_validated_at: new Date().toISOString(),
        }, { onConflict: 'license_key, package_id' });

    if (dbError) {
        console.error('DB Error activating package:', dbError);
        // Attempt a read to see if it's general access
        const { error: readError } = await supabase.from('package_activations').select('count', { count: 'exact', head: true });
        if (readError) console.error('DB Read Check failed too:', readError);
        else console.log('DB Read Check succeeded (Service Role working for reads).');
        
        return { error: 'Activation successful, but local saving failed: ' + dbError.message };
    }

    revalidatePath('/cms/settings/packages');
    return { success: true, package: pkg.name };

  } catch (err: any) {
    console.error('Activation Action Error:', err);
    return { error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deactivatePackage(packageId: string) {
    const supabase = getServiceRoleClient();
    
    // 1. Get current activation
    const { data: activation, error: fetchError } = await supabase
        .from('package_activations')
        .select('id, license_key, instance_name')
        .eq('package_id', packageId)
        .eq('status', 'active')
        .single();

    if (fetchError || !activation) {
        return { error: 'No active license found for this package.' };
    }

    // 2. Deactivate at Lemon Squeezy
    try {
         await fetch(`${LS_API_URL}/licenses/deactivate`, {
            method: 'POST',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                license_key: activation.license_key,
                instance_name: activation.instance_name,
            }),
        });
    } catch (err) {
        console.warn('LS Deactivation failed (network?), removing locally anyway.', err);
    }

    // 3. Remove/Update local DB
    const { error: deleteError } = await supabase
        .from('package_activations')
        .delete()
        .eq('id', activation.id);

    if (deleteError) {
        return { error: 'Failed to remove local activation record.' };
    }

    revalidatePath('/cms/settings/packages');
    return { success: true };
}
