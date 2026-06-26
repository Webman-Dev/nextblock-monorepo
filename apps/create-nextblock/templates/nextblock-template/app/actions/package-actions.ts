'use server';

import { createClient } from '@supabase/supabase-js';
import { NEXTBLOCK_PACKAGES } from '@nextblock-cms/utils';
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  resolveSupabaseAnonKey,
  resolveSupabaseServiceKey,
  resolveSupabaseUrl,
} from '../../lib/setup/env-status';

// Freemius handles both Sandbox and Production keys on the same API domain.
// The key itself determines the environment.
const FM_API_URL = 'https://api.freemius.com/v1';

// Helper to get service role client
const getServiceRoleClient = () => {
    const supabaseUrl = resolveSupabaseUrl();
    const supabaseServiceKey = resolveSupabaseServiceKey();

    if (!supabaseUrl || !supabaseServiceKey) {
        console.error('Missing Supabase credentials');
        throw new Error('Missing Supabase credentials (Service Key required for activation).');
    }

    if (supabaseServiceKey === resolveSupabaseAnonKey()) {
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
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    return { error: 'License activation is disabled in Sandbox mode. To purchase a real license, visit nextblock.ca' };
  }

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
    let hasLicenseError = false;
    let specificErrorMsg: string | null = null;

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
      
      // Freemius returns the license object directly if successful, or an error/api_response
      if (response.ok && responseData.install_id) {
          data = responseData;
          pkg = p;
          fmProductId = p.fm_product_id;
          break;
      }
      
      const errorCode = responseData?.error?.code;
      if (errorCode === 'not_found' || errorCode === 'invalid_license_key') {
          hasLicenseError = true;
      } else if (responseData?.error?.message) {
          specificErrorMsg = responseData.error.message;
      }
    }

    if (!data || !pkg) {
        if (hasLicenseError && process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true' && !specificErrorMsg) {
            return { error: 'Sorry, this is a sandbox key. Please purchase the real key at nextblock.ca' };
        }
        return { error: specificErrorMsg || 'Activation failed. Invalid key, wrong product, or limit reached.' };
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
    if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
        return { error: 'License deactivation is disabled in Sandbox mode.' };
    }

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
