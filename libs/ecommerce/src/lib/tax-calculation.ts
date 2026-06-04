import type { SupabaseClient } from '@supabase/supabase-js';

import { normalizeCountryCode } from './countries';
import type { CurrencyRecord } from './currency';
import { resolveEffectivePriceForCurrency } from './currency';
import { getEcommerceInventorySettings } from './inventory-settings';
import { normalizeSubdivisionCode } from './states';
import type { CartItem, TaxCalculationResult, TaxRate } from './types';
import { getCartLineCouponKey } from './coupons';

export interface CheckoutTaxableItem {
  product_id: string;
  quantity: number;
  unit_amount: number;
  discount_amount?: number;
  is_taxable: boolean;
}

export interface TaxDestinationInput {
  country_code?: string | null;
  state?: string | null;
}

export const STRIPE_TAX_CODE_TAXABLE_GOODS = 'txcd_99999999';
export const STRIPE_TAX_CODE_NONTAXABLE = 'txcd_00000000';
export const STRIPE_TAX_CODE_SHIPPING = 'txcd_92010001';

export function getStripeTaxCodeForProduct(isTaxable: boolean) {
  return isTaxable ? STRIPE_TAX_CODE_TAXABLE_GOODS : STRIPE_TAX_CODE_NONTAXABLE;
}

export async function buildCheckoutTaxableItemsFromCart(
  supabase: SupabaseClient<any>,
  cartItems: CartItem[],
  currencyCode: string,
  currencies: CurrencyRecord[],
  lineDiscounts?: Map<string, number>
): Promise<CheckoutTaxableItem[]> {
  if (!cartItems.length) {
    return [];
  }

  const productIds = [...new Set(cartItems.map((item) => item.product_id))];
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, is_taxable')
    .in('id', productIds);

  if (productsError) {
    throw new Error(productsError.message);
  }

  const productMap = new Map(
    (products || []).map((product) => [product.id, product])
  );

  return cartItems.reduce<CheckoutTaxableItem[]>((accumulator, cartItem) => {
    const product = productMap.get(cartItem.product_id);

    if (!product) {
      return accumulator;
    }

    const resolvedPrice = resolveEffectivePriceForCurrency({
      prices: cartItem.prices,
      salePrices: cartItem.sale_prices,
      fallbackPrice: cartItem.price,
      fallbackSalePrice: cartItem.sale_price,
      saleStartAt: cartItem.sale_start_at,
      saleEndAt: cartItem.sale_end_at,
      scheduledPrice: cartItem.scheduled_price,
      scheduledPrices: cartItem.scheduled_prices,
      scheduledPriceAt: cartItem.scheduled_price_at,
      currencyCode,
      currencies,
    });

    accumulator.push({
      product_id: product.id,
      quantity: cartItem.quantity,
      unit_amount: resolvedPrice.sale_price ?? resolvedPrice.price,
      discount_amount: lineDiscounts?.get(getCartLineCouponKey(cartItem)) ?? 0,
      is_taxable: product.is_taxable ?? true,
    });

    return accumulator;
  }, []);
}

export async function calculateCheckoutTaxes(
  supabase: SupabaseClient<any>,
  input: {
    items: CheckoutTaxableItem[];
    destination?: TaxDestinationInput | null;
  }
): Promise<TaxCalculationResult> {
  const settings = await getEcommerceInventorySettings(supabase);
  const taxableSubtotal = input.items.reduce((sum, item) => {
    if (!item.is_taxable) {
      return sum;
    }

    return sum + Math.max(0, item.unit_amount * item.quantity - (item.discount_amount ?? 0));
  }, 0);

  if (!settings.enableTaxes || taxableSubtotal <= 0) {
    return {
      enabled: false,
      mode: settings.taxCalculationMode,
      amount: 0,
      taxableSubtotal,
      lines: [],
    };
  }

  if (settings.taxCalculationMode === 'automatic') {
    return {
      enabled: true,
      mode: 'automatic',
      amount: 0,
      taxableSubtotal,
      lines: [],
      isPendingExternalCalculation: true,
    };
  }

  const countryCode = normalizeCountryCode(input.destination?.country_code);
  const stateCode = normalizeSubdivisionCode(countryCode, input.destination?.state) || null;

  if (!countryCode) {
    return {
      enabled: true,
      mode: 'manual',
      amount: 0,
      taxableSubtotal,
      lines: [],
    };
  }

  let query = supabase
    .from('tax_rates')
    .select('id, country_code, state_code, tax_name, tax_rate, created_at, updated_at')
    .eq('country_code', countryCode);

  query = stateCode
    ? query.or(`state_code.is.null,state_code.eq.${stateCode}`)
    : query.is('state_code', null);

  const { data: rates, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedRates = (rates || []) as TaxRate[];
  const lines = normalizedRates.map((rate) => ({
    id: rate.id,
    name: rate.tax_name,
    rate: Number(rate.tax_rate),
    amount: Math.round((taxableSubtotal * Number(rate.tax_rate)) / 100),
    country_code: rate.country_code,
    state_code: rate.state_code ?? null,
  }));

  return {
    enabled: true,
    mode: 'manual',
    amount: lines.reduce((sum, line) => sum + line.amount, 0),
    taxableSubtotal,
    lines,
  };
}
