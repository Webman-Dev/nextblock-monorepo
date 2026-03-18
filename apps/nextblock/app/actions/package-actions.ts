'use server';

import { createClient } from '@supabase/supabase-js';
import { NEXTBLOCK_PACKAGES } from '@nextblock-cms/utils';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';

const FM_API_URL = 'https://api.freemius.com/v1';

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
  
  // Freemius requires a 32-char unique identifier for the install.
  // We hash the instance (domain) to ensure reactivations on the same domain use the same UID.
  const crypto = require('crypto');
  const uid = crypto.createHash('md5').update(instanceName).digest('hex');

  try {
    let data = null;
    let pkg = null;
    let fmProductId = null;

    // We don't know the exact package just from the license key, so we try activating
    // against our known Freemius Product IDs from the NEXTBLOCK_PACKAGES registry.
    const packages = Object.values(NEXTBLOCK_PACKAGES);
    
    for (const p of packages) {
      if (!p.fm_product_id) continue;
      
      const siteUrl = encodeURIComponent(`http://${instanceName}`);
      const response = await fetch(`${FM_API_URL}/products/${p.fm_product_id}/licenses/activate.json?uid=${uid}&license_key=${encodeURIComponent(key)}&url=${siteUrl}`, {
        method: 'POST',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json',
        }
      });

      const responseData = await response.json();
      console.log('Freemius Activation Attempt for Product', p.fm_product_id, 'Response:', response.status, responseData);
      
      // Freemius returns the license object directly if successful, or an error/api_response
      if (response.ok && responseData.install_id) {
          data = responseData;
          pkg = p;
          fmProductId = p.fm_product_id;
          break;
      }
    }

    if (!data || !pkg) {
        return { error: 'Activation failed. Invalid key, wrong product, or limit reached.' };
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
            meta: {
              ...data,
              fm_product_id: fmProductId,
              fm_install_id: data.install_id,
              fm_uid: uid
            },
            last_validated_at: new Date().toISOString(),
        }, { onConflict: 'license_key, package_id' });

    if (dbError) {
        console.error('DB Error activating package:', dbError);
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
        .select('id, license_key, instance_name, meta')
        .eq('package_id', packageId)
        .eq('status', 'active')
        .single();

    if (fetchError || !activation) {
        return { error: 'No active license found for this package.' };
    }

    // 2. Deactivate at Freemius
    try {
        const fmProductId = activation.meta?.fm_product_id;
        const uid = activation.meta?.fm_uid;
        const installId = activation.meta?.fm_install_id;
        
        if (fmProductId && uid && installId) {
          await fetch(`${FM_API_URL}/products/${fmProductId}/licenses/deactivate.json?uid=${uid}&install_id=${installId}&license_key=${encodeURIComponent(activation.license_key)}`, {
              method: 'POST',
              headers: {
                  'Accept': 'application/json',
              }
          });
        }
    } catch (err) {
        console.warn('Freemius Deactivation failed (network?), removing locally anyway.', err);
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
