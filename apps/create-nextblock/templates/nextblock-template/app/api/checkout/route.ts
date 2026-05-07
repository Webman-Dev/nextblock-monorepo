import { NextResponse } from 'next/server';
import { getPaymentProvider } from '@nextblock-cms/ecommerce/server';
import { createClient, verifyPackageOnline } from '@nextblock-cms/db/server';
import { normalizeCustomerAddress } from '@nextblock-cms/ecommerce';

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
      return NextResponse.json({ error: 'Ecommerce module license is inactive' }, { status: 403 });
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
    } = await req.json();

    if (!items || !Array.isArray(items)) {
      return NextResponse.json({ error: 'Invalid items data' }, { status: 400 });
    }

    const providerNames = Array.from(
      new Set(items.map((item) => resolveProviderFromItem(item)).filter(Boolean))
    ) as Array<'stripe' | 'freemius'>;

    if (providerNames.length === 0) {
      return NextResponse.json(
        { error: 'Each checkout request must include provider-aware cart items.' },
        { status: 400 }
      );
    }

    if (providerNames.length > 1) {
      return NextResponse.json(
        { error: 'Mixed-provider carts must be checked out in separate steps.' },
        { status: 400 }
      );
    }

    const providerName = providerNames[0];

    if (providerName === 'freemius' && items.length !== 1) {
      return NextResponse.json(
        { error: 'Freemius items must be checked out one at a time.' },
        { status: 400 }
      );
    }

    if (!billingAddress) {
      return NextResponse.json({ error: 'Billing address is required' }, { status: 400 });
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
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
