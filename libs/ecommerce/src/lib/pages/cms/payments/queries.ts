import { createClient } from '@nextblock-cms/db/server';

export async function getStoreConfigStatus() {
  const stripeMissing: string[] = [];
  if (!process.env.STRIPE_SECRET_KEY) stripeMissing.push('STRIPE_SECRET_KEY');
  if (!process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY) {
    stripeMissing.push('NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY');
  }
  if (!process.env.STRIPE_WEBHOOK_SECRET) stripeMissing.push('STRIPE_WEBHOOK_SECRET');

  const freemiusMissing: string[] = [];
  if (!process.env.FREEMIUS_PUBLIC_KEY) freemiusMissing.push('FREEMIUS_PUBLIC_KEY');
  if (!process.env.FREEMIUS_SECRET_KEY) freemiusMissing.push('FREEMIUS_SECRET_KEY');

  return {
    stripe: {
      hasKeys: stripeMissing.length === 0,
      missing: stripeMissing,
    },
    freemius: {
      hasKeys: freemiusMissing.length === 0,
      missing: freemiusMissing,
    },
  };
}

export async function getPaymentSettings(): Promise<'stripe' | 'freemius'> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'payment_provider')
    .single();

  if (error || !data) {
    return 'stripe';
  }

  let current = data.value;
  if (typeof current === 'string' && current.startsWith('"') && current.endsWith('"')) {
    try {
      current = JSON.parse(current);
    } catch {
      return 'stripe';
    }
  }

  return current === 'freemius' ? 'freemius' : 'stripe';
}
