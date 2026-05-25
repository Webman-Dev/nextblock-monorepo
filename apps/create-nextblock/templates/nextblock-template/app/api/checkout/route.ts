import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@nextblock-cms/ecommerce/server';
import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';
import { normalizeCustomerAddress } from '@nextblock-cms/ecommerce';

function jsonError(errorKey: string, error: string, status: number) {
  return NextResponse.json({ error, errorKey }, { status });
}

function resolveProviderFromItem(item: any): 'stripe' | 'freemius' | null {
  if (item?.provider === 'stripe' || item?.provider === 'freemius') {
    return item.provider;
  }

  if (item?.payment_provider === 'stripe' || item?.payment_provider === 'freemius') {
    return item.payment_provider;
  }

  if (item?.product_type === 'digital') {
    return 'freemius';
  }

  if (item?.product_type === 'physical') {
    return 'stripe';
  }

  if (item?.freemius_product_id) {
    return 'freemius';
  }

  return null;
}

export async function POST(req: Request) {
  try {
    const isOnline = await verifyPackageOnline('ecommerce');
    if (!isOnline) {
      return jsonError(
        'ecommerce.checkout_license_inactive',
        'Ecommerce module license is inactive',
        403
      );
    }

    const {
      items,
      customerEmail,
      customerPhone,
      billingAddress,
      shippingAddress,
      shippingMethodId,
      currencyCode,
      locale,
      couponCode,
      couponContextItems,
    } = await req.json();
    
    if (!items || !Array.isArray(items)) {
      return jsonError(
        'ecommerce.checkout_invalid_items',
        'Invalid items data',
        400
      );
    }

    const providerNames = Array.from(
      new Set(items.map((item) => resolveProviderFromItem(item)).filter(Boolean))
    ) as Array<'stripe' | 'freemius'>;

    if (providerNames.length === 0) {
      return jsonError(
        'ecommerce.checkout_provider_items_required',
        'Each checkout request must include provider-aware cart items.',
        400
      );
    }

    if (providerNames.length > 1) {
      return jsonError(
        'ecommerce.checkout_mixed_provider_steps',
        'Mixed-provider carts must be checked out in separate steps.',
        400
      );
    }

    const providerName = providerNames[0];

    if (providerName === 'freemius' && items.length !== 1) {
      return jsonError(
        'ecommerce.checkout_freemius_single_item',
        'Freemius items must be checked out one at a time.',
        400
      );
    }

    if (!billingAddress) {
      return jsonError(
        'ecommerce.checkout_billing_address_required',
        'Billing address is required',
        400
      );
    }

    const supabase = createClient();
    const provider = getPaymentProvider(providerName);

    const { data: { user } } = await supabase.auth.getUser();
    const userId = user?.id;
    const resolvedCustomerEmail = user?.email || customerEmail || null;

    const { url, error, errorKey, errorParams, errorStatus, customProps } =
      await provider.createCheckoutSession({
      items,
      customerEmail: resolvedCustomerEmail,
      customerPhone,
      userId,
      billingAddress: normalizeCustomerAddress(billingAddress) ?? billingAddress,
      shippingAddress:
        providerName === 'stripe'
          ? normalizeCustomerAddress(shippingAddress)
          : null,
      shippingMethodId: providerName === 'stripe' ? shippingMethodId : null,
      currencyCode: typeof currencyCode === 'string' ? currencyCode : null,
      locale: typeof locale === 'string' ? locale : null,
      couponCode: typeof couponCode === 'string' ? couponCode : null,
      couponContextItems: Array.isArray(couponContextItems) ? couponContextItems : items,
    });

    if (error) {
      console.error('Checkout Error:', error);
      return NextResponse.json(
        { error, errorKey, errorParams },
        { status: errorStatus ?? 500 }
      );
    }

    return NextResponse.json({ url, customProps });
  } catch (err: any) {
    console.error('Checkout API Error:', err);
    return jsonError(
      'ecommerce.checkout_internal_server_error',
      'Internal Server Error',
      500
    );
  }
}
