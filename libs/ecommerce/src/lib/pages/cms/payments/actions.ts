'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

export async function getStoreConfigStatus() {
  // Check Stripe
  const stripeMissing = [];
  if (!process.env.STRIPE_SECRET_KEY) stripeMissing.push('STRIPE_SECRET_KEY');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) stripeMissing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) stripeMissing.push('STRIPE_WEBHOOK_SECRET');

  // Check Freemius
  const fmMissing = [];
  if (!process.env.FREEMIUS_STORE_ID) fmMissing.push('FREEMIUS_STORE_ID');
  if (!process.env.FREEMIUS_PUBLIC_KEY) fmMissing.push('FREEMIUS_PUBLIC_KEY');
  if (!process.env.FREEMIUS_SECRET_KEY) fmMissing.push('FREEMIUS_SECRET_KEY');

  return {
    stripe: {
      hasKeys: stripeMissing.length === 0,
      missing: stripeMissing
    },
    freemius: {
      hasKeys: fmMissing.length === 0,
      missing: fmMissing
    }
  };
}

export async function getPaymentSettings() {
    const supabase = await createClient();
    const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'payment_provider')
        .single();
    
    if (error || !data) {
        return 'stripe'; // Default
    }
    
    // value is jsonb, typically stored as "stripe" string
    return data.value; 
}

export async function updatePaymentSettings(provider: 'stripe' | 'freemius') {
    const supabase = await createClient();
    
    // Admin check
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Unauthorized');

    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (!profile || profile.role !== 'ADMIN') throw new Error('Forbidden');



    // Let's try passing the value directly, supabase-js is smart. 
    // BUT to be safe given prompt "site_settings value is JSONB", 
    // let's assume we store it as a simple JSON string.
    // Actually, earlier update code used: newSettings (object).
    // Here we just want a string.
    // Let's wrap it? No, keeping it simple: just the string value.
    // If it fails we fix it. 'stripe' is valid json.
    
    const { error: upsertError } = await supabase
        .from('site_settings')
        .upsert({ 
            key: 'payment_provider', 
            value: JSON.stringify(provider) // Ensure it is stored as "stripe"
        });

    if (upsertError) {
        console.error('Error updating payment provider:', upsertError);
        throw new Error('Failed to update settings');
    }

    revalidatePath('/cms/payments');
    revalidatePath('/', 'layout'); // Update global context if it uses this
    return { success: true };
}
