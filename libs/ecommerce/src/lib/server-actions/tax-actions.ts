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
  destination?: TaxDestinationInput | null
): Promise<{ success: boolean; tax?: TaxCalculationResult; error?: string }> {
  try {
    const supabase = createClient();
    const items = await buildCheckoutTaxableItemsFromCart(supabase as any, cartItems);
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
