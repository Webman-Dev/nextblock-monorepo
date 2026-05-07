import type { CartItem, EcommercePaymentProvider } from './types';

export type CouponProviderScope = 'all' | EcommercePaymentProvider;
export type CouponDiscountType = 'percent' | 'fixed';
export type CouponSyncStatus =
  | 'not_synced'
  | 'pending'
  | 'synced'
  | 'failed'
  | 'deleted'
  | 'not_required';

export interface AppliedCouponState {
  code: string;
  couponId?: string | null;
}

export interface CouponLineQuote {
  key: string;
  product_id: string;
  variant_id?: string | null;
  provider: EcommercePaymentProvider;
  title: string;
  quantity: number;
  subtotal: number;
  discount: number;
}

export interface CouponQuote {
  couponId: string;
  code: string;
  name: string;
  discountType: CouponDiscountType;
  discountAmount: number;
  providerScope: CouponProviderScope;
  eligibleSubtotal: number;
  discountTotal: number;
  providerDiscounts: Record<EcommercePaymentProvider, number>;
  lineDiscounts: CouponLineQuote[];
}

export type CouponQuoteResult =
  | {
      success: true;
      quote: CouponQuote;
    }
  | {
      success: false;
      error: string;
      errorKey?: string;
    };

export function normalizeCouponCode(code?: string | null) {
  return (code || '').trim().replace(/\s+/g, '').toUpperCase();
}

export function getCartLineCouponKey(item: Pick<CartItem, 'product_id' | 'variant_id'>) {
  return `${item.product_id}:${item.variant_id || 'base'}`;
}

export function emptyProviderDiscounts(): Record<EcommercePaymentProvider, number> {
  return {
    stripe: 0,
    freemius: 0,
  };
}
