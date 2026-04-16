import type { SupabaseClient } from '@supabase/supabase-js';
import type { EcommerceSettings, TaxCalculationMode } from './types';

export const ECOMMERCE_INVENTORY_SETTINGS_KEY = 'ecommerce_inventory_settings';

export type EcommerceInventorySettings = EcommerceSettings;

export interface CheckoutErrorPayload {
  error: string;
  errorKey?: string;
  errorParams?: Record<string, string | number>;
  errorStatus?: number;
}

export const DEFAULT_ECOMMERCE_INVENTORY_SETTINGS: EcommerceInventorySettings = {
  trackQuantities: true,
  enableTaxes: false,
  taxCalculationMode: 'manual',
};

function toBoolean(value: unknown, fallback = true) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (['true', '1', 'yes', 'on'].includes(normalized)) {
      return true;
    }
    if (['false', '0', 'no', 'off'].includes(normalized)) {
      return false;
    }
  }

  return fallback;
}

function toTaxCalculationMode(
  value: unknown,
  fallback: TaxCalculationMode = DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.taxCalculationMode
): TaxCalculationMode {
  if (value === 'automatic') {
    return 'automatic';
  }

  if (value === 'manual') {
    return 'manual';
  }

  return fallback;
}

export function normalizeEcommerceInventorySettings(
  value: unknown
): EcommerceInventorySettings {
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const parsed = value as Record<string, unknown>;
    return {
      trackQuantities: toBoolean(
        parsed.trackQuantities ?? parsed.track_quantities,
        DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.trackQuantities
      ),
      enableTaxes: toBoolean(
        parsed.enableTaxes ?? parsed.enable_taxes,
        DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.enableTaxes
      ),
      taxCalculationMode: toTaxCalculationMode(
        parsed.taxCalculationMode ?? parsed.tax_calculation_mode,
        DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.taxCalculationMode
      ),
    };
  }

  return {
    trackQuantities: toBoolean(
      value,
      DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.trackQuantities
    ),
    enableTaxes: DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.enableTaxes,
    taxCalculationMode: DEFAULT_ECOMMERCE_INVENTORY_SETTINGS.taxCalculationMode,
  };
}

export async function getEcommerceInventorySettings(
  supabase: SupabaseClient<any>
): Promise<EcommerceInventorySettings> {
  const { data, error } = await supabase
    .from('site_settings')
    .select('value')
    .eq('key', ECOMMERCE_INVENTORY_SETTINGS_KEY)
    .maybeSingle();

  if (error || !data) {
    return DEFAULT_ECOMMERCE_INVENTORY_SETTINGS;
  }

  return normalizeEcommerceInventorySettings(data.value);
}

export async function upsertEcommerceInventorySettings(
  supabase: SupabaseClient<any>,
  settings: EcommerceInventorySettings
) {
  return supabase.from('site_settings').upsert({
    key: ECOMMERCE_INVENTORY_SETTINGS_KEY,
    value: {
      track_quantities: settings.trackQuantities,
      enable_taxes: settings.enableTaxes,
      tax_calculation_mode: settings.taxCalculationMode,
    },
  });
}

export function createInventoryUnavailableError(item: string): CheckoutErrorPayload {
  return {
    error: `${item} is no longer available.`,
    errorKey: 'ecommerce.inventory_item_unavailable',
    errorParams: { item },
    errorStatus: 409,
  };
}

export function createInventoryInsufficientError(
  item: string,
  count: number
): CheckoutErrorPayload {
  return {
    error: `Only ${count} units remain for ${item}.`,
    errorKey: 'ecommerce.inventory_insufficient',
    errorParams: { item, count },
    errorStatus: 409,
  };
}
