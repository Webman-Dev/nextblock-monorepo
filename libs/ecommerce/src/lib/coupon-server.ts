import type { SupabaseClient } from '@supabase/supabase-js';

import {
  type CouponDiscountType,
  type CouponProviderScope,
  type CouponQuote,
  type CouponQuoteResult,
  emptyProviderDiscounts,
  getCartLineCouponKey,
  normalizeCouponCode,
} from './coupons';
import type { CartItem, EcommercePaymentProvider } from './types';
import {
  type CurrencyRecord,
  getDefaultCurrency,
  normalizeCurrencyRecord,
  normalizePriceMap,
  normalizeSalePriceMap,
  resolveEffectivePriceForCurrency,
} from './currency';

type SupabaseLikeClient = SupabaseClient<any>;

type CouponRow = {
  id: string;
  code: string;
  name: string;
  provider_scope: CouponProviderScope;
  discount_type: CouponDiscountType;
  discount_amount: number;
  is_active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  redemption_limit: number | null;
  redemptions_count: number | null;
};

type TrustedCartLine = {
  key: string;
  product_id: string;
  variant_id?: string | null;
  title: string;
  quantity: number;
  provider: EcommercePaymentProvider;
  subtotal: number;
  freemius_product_id?: string | null;
  freemius_plan_id?: string | null;
};

type TrustedScheduleColumns = {
  sale_start_at?: string | null;
  sale_end_at?: string | null;
  scheduled_price?: number | null;
  scheduled_prices?: Record<string, unknown> | null;
  scheduled_price_at?: string | null;
};

type TrustedProductRow = {
  id: string;
  title: string;
  price: number | null;
  prices?: Record<string, unknown> | null;
  sale_price?: number | null;
  sale_prices?: Record<string, unknown> | null;
  product_type?: string | null;
  payment_provider?: string | null;
  freemius_product_id?: string | null;
  freemius_plan_id?: string | null;
} & TrustedScheduleColumns;

type TrustedVariantRow = {
  id: string;
  product_id: string;
  price: number | null;
  prices?: Record<string, unknown> | null;
  sale_price?: number | null;
  sale_prices?: Record<string, unknown> | null;
} & TrustedScheduleColumns;

function toDate(value?: string | null) {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function isProviderEligible(scope: CouponProviderScope, provider: EcommercePaymentProvider) {
  return scope === 'all' || scope === provider;
}

function toProvider(value: unknown): EcommercePaymentProvider | null {
  return value === 'stripe' || value === 'freemius' ? value : null;
}

async function getActiveCurrencies(client: SupabaseLikeClient): Promise<CurrencyRecord[]> {
  const { data, error } = await (client as any)
    .from('currencies')
    .select(
      'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
    )
    .eq('is_active', true)
    .order('code', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((currency: any) => normalizeCurrencyRecord(currency));
}

async function buildTrustedCartLines(input: {
  client: SupabaseLikeClient;
  items: CartItem[];
  currencyCode?: string | null;
}) {
  const { client, items } = input;
  const currencies = await getActiveCurrencies(client);

  if (currencies.length === 0) {
    throw new Error('No active currencies are configured.');
  }

  const selectedCurrency =
    currencies.find((currency) => currency.code === (input.currencyCode || '').toUpperCase()) ??
    getDefaultCurrency(currencies);
  const productIds = [...new Set(items.map((item) => item.product_id).filter(Boolean))];
  const variantIds = [
    ...new Set(
      items
        .map((item) => item.variant_id)
        .filter((variantId): variantId is string => Boolean(variantId))
    ),
  ];

  if (productIds.length === 0) {
    return {
      lines: [] as TrustedCartLine[],
      currencies,
      selectedCurrency,
    };
  }

  const [{ data: products, error: productsError }, variantsResponse] = await Promise.all([
    (client as any)
      .from('products')
      .select(
        'id, title, price, prices, sale_price, sale_prices, sale_start_at, sale_end_at, scheduled_price, scheduled_prices, scheduled_price_at, product_type, payment_provider, freemius_product_id, freemius_plan_id'
      )
      .in('id', productIds),
    variantIds.length
      ? (client as any)
          .from('product_variants')
          .select('id, product_id, price, prices, sale_price, sale_prices, sale_start_at, sale_end_at, scheduled_price, scheduled_prices, scheduled_price_at')
          .in('id', variantIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (productsError) {
    throw new Error(productsError.message);
  }

  if (variantsResponse.error) {
    throw new Error(variantsResponse.error.message);
  }

  const productRows = (products || []) as TrustedProductRow[];
  const variantRows = (variantsResponse.data || []) as TrustedVariantRow[];
  const productMap = new Map<string, TrustedProductRow>(
    productRows.map((product) => [product.id, product])
  );
  const variantMap = new Map<string, TrustedVariantRow>(
    variantRows.map((variant) => [variant.id, variant])
  );
  const lines: TrustedCartLine[] = [];

  for (const item of items) {
    const product = productMap.get(item.product_id);

    if (!product) {
      continue;
    }

    const provider =
      toProvider(product.payment_provider) ??
      (product.product_type === 'digital' ? 'freemius' : 'stripe');
    const variant = item.variant_id ? variantMap.get(item.variant_id) : null;
    const priceSource = variant && variant.product_id === product.id ? variant : product;
    const resolvedPrice = resolveEffectivePriceForCurrency({
      prices: normalizePriceMap(priceSource.prices),
      salePrices: normalizeSalePriceMap(priceSource.sale_prices),
      fallbackPrice: priceSource.price,
      fallbackSalePrice: priceSource.sale_price,
      saleStartAt: priceSource.sale_start_at,
      saleEndAt: priceSource.sale_end_at,
      scheduledPrice: priceSource.scheduled_price,
      scheduledPrices: normalizePriceMap(priceSource.scheduled_prices),
      scheduledPriceAt: priceSource.scheduled_price_at,
      currencyCode: selectedCurrency.code,
      currencies,
    });
    const quantity = provider === 'freemius' ? 1 : Math.max(1, Number(item.quantity) || 1);
    const unitAmount = Math.max(0, resolvedPrice.sale_price ?? resolvedPrice.price);

    lines.push({
      key: getCartLineCouponKey(item),
      product_id: product.id,
      variant_id: variant?.id ?? null,
      title: product.title,
      quantity,
      provider,
      subtotal: unitAmount * quantity,
      freemius_product_id: product.freemius_product_id ?? null,
      freemius_plan_id: product.freemius_plan_id ?? null,
    });
  }

  return {
    lines,
    currencies,
    selectedCurrency,
  };
}

async function getCouponProductScope(client: SupabaseLikeClient, couponId: string) {
  const { data, error } = await (client as any)
    .from('coupon_products')
    .select('product_id')
    .eq('coupon_id', couponId);

  if (error) {
    throw new Error(error.message);
  }

  return new Set((data || []).map((row: { product_id: string }) => row.product_id));
}

function allocateFixedDiscount(lines: TrustedCartLine[], amount: number) {
  const eligibleSubtotal = lines.reduce((sum, line) => sum + line.subtotal, 0);
  const cappedAmount = Math.min(amount, eligibleSubtotal);

  if (eligibleSubtotal <= 0 || cappedAmount <= 0) {
    return new Map<string, number>();
  }

  const allocations = new Map<string, number>();
  let allocated = 0;

  lines.forEach((line, index) => {
    const isLast = index === lines.length - 1;
    const discount = isLast
      ? cappedAmount - allocated
      : Math.min(
          line.subtotal,
          Math.floor((cappedAmount * line.subtotal) / eligibleSubtotal)
        );
    allocated += discount;
    allocations.set(line.key, discount);
  });

  return allocations;
}

export async function getCouponQuote(input: {
  client: SupabaseLikeClient;
  code?: string | null;
  items: CartItem[];
  currencyCode?: string | null;
}): Promise<CouponQuoteResult> {
  const code = normalizeCouponCode(input.code);

  if (!code) {
    return {
      success: false,
      error: 'Enter a coupon code.',
      errorKey: 'ecommerce.coupon_code_required',
    };
  }

  if (!input.items.length) {
    return {
      success: false,
      error: 'Add an item to your cart before applying a coupon.',
      errorKey: 'ecommerce.coupon_cart_empty',
    };
  }

  const { data: coupon, error: couponError } = await (input.client as any)
    .from('coupons')
    .select(
      'id, code, name, provider_scope, discount_type, discount_amount, is_active, starts_at, ends_at, redemption_limit, redemptions_count'
    )
    .ilike('code', code)
    .maybeSingle();

  if (couponError) {
    throw new Error(couponError.message);
  }

  if (!coupon) {
    return {
      success: false,
      error: 'Coupon code not found.',
      errorKey: 'ecommerce.coupon_not_found',
    };
  }

  const couponRow = coupon as CouponRow;
  const now = new Date();
  const startsAt = toDate(couponRow.starts_at);
  const endsAt = toDate(couponRow.ends_at);

  if (!couponRow.is_active) {
    return {
      success: false,
      error: 'This coupon is not active.',
      errorKey: 'ecommerce.coupon_inactive',
    };
  }

  if (startsAt && startsAt > now) {
    return {
      success: false,
      error: 'This coupon is not active yet.',
      errorKey: 'ecommerce.coupon_not_started',
    };
  }

  if (endsAt && endsAt <= now) {
    return {
      success: false,
      error: 'This coupon has expired.',
      errorKey: 'ecommerce.coupon_expired',
    };
  }

  if (
    couponRow.redemption_limit !== null &&
    (couponRow.redemptions_count ?? 0) >= couponRow.redemption_limit
  ) {
    return {
      success: false,
      error: 'This coupon has reached its redemption limit.',
      errorKey: 'ecommerce.coupon_limit_reached',
    };
  }

  const [{ lines }, productScope] = await Promise.all([
    buildTrustedCartLines({
      client: input.client,
      items: input.items,
      currencyCode: input.currencyCode,
    }),
    getCouponProductScope(input.client, couponRow.id),
  ]);
  const hasProductScope = productScope.size > 0;
  const eligibleLines = lines.filter(
    (line) =>
      line.subtotal > 0 &&
      isProviderEligible(couponRow.provider_scope, line.provider) &&
      (!hasProductScope || productScope.has(line.product_id))
  );

  if (eligibleLines.length === 0) {
    return {
      success: false,
      error: 'This coupon does not apply to the items in your cart.',
      errorKey: 'ecommerce.coupon_not_applicable',
    };
  }

  const fixedAllocations =
    couponRow.discount_type === 'fixed'
      ? allocateFixedDiscount(eligibleLines, couponRow.discount_amount)
      : null;
  const providerDiscounts = emptyProviderDiscounts();
  const lineDiscounts = eligibleLines.map((line) => {
    const discount =
      couponRow.discount_type === 'percent'
        ? Math.min(line.subtotal, Math.round((line.subtotal * couponRow.discount_amount) / 100))
        : fixedAllocations?.get(line.key) ?? 0;

    providerDiscounts[line.provider] += discount;

    return {
      key: line.key,
      product_id: line.product_id,
      variant_id: line.variant_id,
      provider: line.provider,
      title: line.title,
      quantity: line.quantity,
      subtotal: line.subtotal,
      discount,
    };
  });
  const quote: CouponQuote = {
    couponId: couponRow.id,
    code: couponRow.code,
    name: couponRow.name,
    discountType: couponRow.discount_type,
    discountAmount: couponRow.discount_amount,
    providerScope: couponRow.provider_scope,
    eligibleSubtotal: eligibleLines.reduce((sum, line) => sum + line.subtotal, 0),
    discountTotal: providerDiscounts.stripe + providerDiscounts.freemius,
    providerDiscounts,
    lineDiscounts,
  };

  return {
    success: true,
    quote,
  };
}

export function getQuoteLineDiscountMap(quote?: CouponQuote | null) {
  const discounts = new Map<string, number>();

  for (const line of quote?.lineDiscounts ?? []) {
    discounts.set(line.key, line.discount);
  }

  return discounts;
}

export async function recordCouponRedemption(input: {
  client: SupabaseLikeClient;
  quote: CouponQuote;
  orderId: string;
  provider: EcommercePaymentProvider;
  discountTotal: number;
  userId?: string | null;
  customerEmail?: string | null;
  metadata?: Record<string, unknown>;
}) {
  const { error: redemptionError } = await (input.client as any)
    .from('coupon_redemptions')
    .insert({
      coupon_id: input.quote.couponId,
      order_id: input.orderId,
      coupon_code: input.quote.code,
      provider: input.provider,
      discount_total: Math.max(0, input.discountTotal),
      user_id: input.userId || null,
      customer_email: input.customerEmail || null,
      metadata: input.metadata || {},
    });

  if (redemptionError) {
    console.error('Failed to record coupon redemption:', redemptionError);
    return;
  }

  const { data: coupon } = await (input.client as any)
    .from('coupons')
    .select('redemptions_count')
    .eq('id', input.quote.couponId)
    .single();

  await (input.client as any)
    .from('coupons')
    .update({
      redemptions_count: (coupon?.redemptions_count ?? 0) + 1,
      updated_at: new Date().toISOString(),
    })
    .eq('id', input.quote.couponId);
}
