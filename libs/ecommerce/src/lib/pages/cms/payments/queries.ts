import { createClient } from '@nextblock-cms/db/server';

import {
  DEFAULT_ENABLED_PAYMENT_PROVIDERS,
  type EnabledPaymentProviders,
  normalizeEnabledPaymentProviders,
} from '../../../types';
import { getPaymentConfigStatus } from '../../../payment-config';

export interface PaymentProviderConfigStatus {
  hasKeys: boolean;
  missing: string[];
}

export interface StorePaymentConfigStatus {
  stripe: PaymentProviderConfigStatus;
  freemius: PaymentProviderConfigStatus;
}

// "Configured" now reads DB-first (CMS) with an env fallback, so providers can be enabled
// once keys are entered in the CMS — without requiring environment variables.
export async function getStoreConfigStatus(): Promise<StorePaymentConfigStatus> {
  return getPaymentConfigStatus();
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
