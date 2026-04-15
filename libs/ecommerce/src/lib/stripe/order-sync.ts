import Stripe from 'stripe';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';
import {
  CustomerAddressInput,
  normalizeCustomerAddress,
  normalizeOrderCustomerDetails,
  type OrderCustomerDetails,
} from '../customer';
import { upsertDefaultUserAddresses } from '../customer-addresses';
import { applyOrderInventoryDeduction } from '../order-inventory';

function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role environment variables');
  }

  return createSupabaseClient<Database>(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function fromStripeAddress(
  address?: Stripe.Address | Stripe.AddressParam | null,
  recipientName?: string | null
): CustomerAddressInput | null {
  if (!address) {
    return null;
  }

  return normalizeCustomerAddress({
    recipient_name: recipientName,
    line1: address.line1 ?? null,
    line2: address.line2 ?? null,
    city: address.city ?? null,
    state: address.state ?? null,
    postal_code: address.postal_code ?? null,
    country_code: address.country ?? null,
  });
}

function parseStoredCustomerDetails(value: unknown): OrderCustomerDetails {
  const details = (value ?? {}) as Partial<OrderCustomerDetails>;

  return normalizeOrderCustomerDetails({
    email: typeof details.email === 'string' ? details.email : null,
    name: typeof details.name === 'string' ? details.name : null,
    phone: typeof details.phone === 'string' ? details.phone : null,
    billing: details.billing ?? null,
    shipping: details.shipping ?? null,
  });
}

export async function syncStripeOrderFromSession(session: Stripe.Checkout.Session) {
  const supabase = getServiceRoleSupabaseClient();
  const orderId = session.metadata?.orderId;

  let orderQuery = supabase
    .from('orders')
    .select('id, user_id, status, total, customer_details')
    .eq('stripe_session_id', session.id)
    .maybeSingle();

  if (orderId) {
    orderQuery = supabase
      .from('orders')
      .select('id, user_id, status, total, customer_details')
      .eq('id', orderId)
      .maybeSingle();
  }

  const { data: orderRecord, error: orderFetchError } = await orderQuery;

  if (orderFetchError || !orderRecord) {
    throw new Error(orderFetchError?.message || 'Order lookup failed');
  }

  const existingDetails = parseStoredCustomerDetails(orderRecord.customer_details);
  const stripeBilling = fromStripeAddress(
    session.customer_details?.address,
    session.customer_details?.name ?? existingDetails.name
  );
  const sessionAny = session as any;
  const stripeShipping = fromStripeAddress(
    sessionAny.shipping_details?.address,
    sessionAny.shipping_details?.name ?? existingDetails.name
  );

  const mergedCustomerDetails = normalizeOrderCustomerDetails({
    email: session.customer_details?.email ?? existingDetails.email,
    name: session.customer_details?.name ?? existingDetails.name,
    phone: session.customer_details?.phone ?? existingDetails.phone,
    billing: existingDetails.billing ?? stripeBilling,
    shipping: existingDetails.shipping ?? stripeShipping,
  });

  const wasAlreadyPaid = orderRecord.status === 'paid';

  const updateData = {
    status: 'paid',
    stripe_session_id: session.id,
    payment_intent_id:
      typeof session.payment_intent === 'string' ? session.payment_intent : null,
    provider: 'stripe',
    customer_details: mergedCustomerDetails as any,
    total: typeof session.amount_total === 'number' ? session.amount_total : orderRecord.total,
  };

  const { error: updateError } = await supabase
    .from('orders')
    .update(updateData)
    .eq('id', orderRecord.id);

  if (updateError) {
    throw new Error(updateError.message);
  }

  if (orderRecord.user_id) {
    try {
      await upsertDefaultUserAddresses({
        userId: orderRecord.user_id,
        billingAddress: mergedCustomerDetails.billing,
        shippingAddress: mergedCustomerDetails.shipping,
        client: supabase,
      });
    } catch (addressError) {
      console.error('[Stripe Sync] Failed to refresh saved customer addresses:', addressError);
    }
  }

  await applyOrderInventoryDeduction(supabase, orderRecord.id);

  return {
    orderId: orderRecord.id,
    alreadyPaid: wasAlreadyPaid,
    customerDetails: mergedCustomerDetails,
  };
}
