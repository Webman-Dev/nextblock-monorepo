import { createClient } from '@nextblock-cms/db/server';

import {
  DEFAULT_ENABLED_PAYMENT_PROVIDERS,
  type EnabledPaymentProviders,
  normalizeEnabledPaymentProviders,
} from '../../../types';

export interface PaymentProviderConfigStatus {
  hasKeys: boolean;
  missing: string[];
}

export interface StorePaymentConfigStatus {
  stripe: PaymentProviderConfigStatus;
  freemius: PaymentProviderConfigStatus;
}

export async function getStoreConfigStatus(): Promise<StorePaymentConfigStatus> {
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

export async function getEnabledPaymentProviders(): Promise<EnabledPaymentProviders> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', 'enabled_payment_providers')
    .maybeSingle();

  if (error || !data) {
    return { ...DEFAULT_ENABLED_PAYMENT_PROVIDERS };
  }

  return normalizeEnabledPaymentProviders(data.value);
}

export async function getPaymentSettings(): Promise<'stripe' | 'freemius'> {
  const enabledProviders = await getEnabledPaymentProviders();

  if (enabledProviders.stripe) {
    return 'stripe';
  }

  if (enabledProviders.freemius) {
    return 'freemius';
  }

  return 'stripe';
}
