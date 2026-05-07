'use server';

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

import type { CartItem } from '../types';
import { getCouponQuote } from '../coupon-server';

export async function getCouponQuoteAction(input: {
  code?: string | null;
  items: CartItem[];
  currencyCode?: string | null;
}) {
  try {
    const supabase = getServiceRoleSupabaseClient();
    return await getCouponQuote({
      client: supabase as any,
      code: input.code,
      items: Array.isArray(input.items) ? input.items : [],
      currencyCode: input.currencyCode,
    });
  } catch (error: any) {
    console.error('Failed to validate coupon:', error);
    return {
      success: false as const,
      error: error.message || 'Failed to validate coupon.',
      errorKey: 'ecommerce.coupon_validation_failed',
    };
  }
}
