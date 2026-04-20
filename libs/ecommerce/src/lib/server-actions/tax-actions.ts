'use server';

import { createClient } from '@nextblock-cms/db/server';

import type { CartItem, TaxCalculationResult } from '../types';
import {
  buildCheckoutTaxableItemsFromCart,
  calculateCheckoutTaxes,
  type TaxDestinationInput,
} from '../tax-calculation';

export async function getTaxEstimate(
  cartItems: CartItem[],
  destination?: TaxDestinationInput | null,
  currencyCode = 'USD'
): Promise<{ success: boolean; tax?: TaxCalculationResult; error?: string }> {
  try {
    const supabase = createClient();
    const { data: currenciesResult } = await supabase
      .from('currencies')
      .select(
        'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
      )
      .eq('is_active', true)
      .order('code', { ascending: true });
    const currencies = currenciesResult ?? [];
    const items = await buildCheckoutTaxableItemsFromCart(
      supabase as any,
      cartItems,
      currencyCode,
      currencies
    );
    const tax = await calculateCheckoutTaxes(supabase as any, {
      items,
      destination,
    });

    return { success: true, tax };
  } catch (error: any) {
    console.error('Failed to estimate taxes:', error);
    return {
      success: false,
      error: error.message || 'Failed to calculate taxes',
    };
  }
}
