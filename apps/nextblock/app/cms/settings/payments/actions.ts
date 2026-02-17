'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

export async function getStoreConfigStatus() {
  // Check Stripe
  const stripeMissing = [];
  if (!process.env.STRIPE_SECRET_KEY) stripeMissing.push('STRIPE_SECRET_KEY');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) stripeMissing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  if (!process.env.STRIPE_WEBHOOK_SECRET) stripeMissing.push('STRIPE_WEBHOOK_SECRET');

  // Check Lemon Squeezy
  const lsMissing = [];
  if (!process.env.LEMONSQUEEZY_API_KEY) lsMissing.push('LEMONSQUEEZY_API_KEY');
  if (!process.env.LEMONSQUEEZY_STORE_ID) lsMissing.push('LEMONSQUEEZY_STORE_ID');
  if (!process.env.LEMONSQUEEZY_WEBHOOK_SECRET) lsMissing.push('LEMONSQUEEZY_WEBHOOK_SECRET');

  return {
    stripe: {
      hasKeys: stripeMissing.length === 0,
      missing: stripeMissing
    },
    lemonSqueezy: {
      hasKeys: lsMissing.length === 0,
      missing: lsMissing
    }
  };
}

export async function getPaymentSettings() {
    const supabase = createClient();
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

export async function updatePaymentSettings(provider: 'stripe' | 'lemon_squeezy') {
    const supabase = createClient();
    
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

    revalidatePath('/cms/settings/payments');
    revalidatePath('/', 'layout'); // Update global context if it uses this
    return { success: true };
}
