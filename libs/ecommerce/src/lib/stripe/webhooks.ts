import { stripe } from './client';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import Stripe from 'stripe';

export const handleStripeWebhook = async (
  signature: string,
  body: string | Buffer
): Promise<{ received: boolean; error?: string }> => {
  const supabase = getSsgSupabaseClient();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;

  if (!webhookSecret) {
    console.error('Missing STRIPE_WEBHOOK_SECRET');
    return { received: false, error: 'Server configuration error' };
  }

  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err: any) {
    console.error(`Webhook signature verification failed: ${err.message}`);
    return { received: false, error: `Webhook Error: ${err.message}` };
  }

  // Handle the event
  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session;
      const orderId = session.metadata?.orderId;

      if (!orderId) {
        console.error('[Stripe Webhook Error] Webhook missing metadata.orderId');
        break;
      }
      
      console.log(`[Stripe Webhook] Processing Order ${orderId} fulfillment...`);

      // 1. Map Stripe details to our Order structure
      const sessionAny = session as any;
      const customerDetails = {
          email: session.customer_details?.email,
          name: session.customer_details?.name,
          phone: session.customer_details?.phone,
          address: session.customer_details?.address,
          shipping: sessionAny.shipping_details ? {
              name: sessionAny.shipping_details.name,
              address: sessionAny.shipping_details.address
          } : null
      };

      const updateData: any = {
        status: 'paid',
        stripe_session_id: session.id,
        payment_intent_id: typeof session.payment_intent === 'string' ? session.payment_intent : undefined,
        provider: 'stripe',
        customer_details: customerDetails
      };

      // If Stripe has a customer email, and the order is currently "guest", we might want to link it if possible.
      // However, per prompt requirements, we primarily ensure customer_details JSONB is populated.

      const { error: updateError } = await supabase
        .from('orders')
        .update(updateData)
        .eq('id', orderId);

      if (updateError) {
        console.error(`[Stripe Webhook Error] Failed to update order status for ${orderId}:`, updateError);
        return { received: false, error: `Database update failed: ${updateError.message}` };
      }
      
      console.log(`[Stripe Webhook] Successfully finalized Order ${orderId} as PAID`);

      // 2. Decrement Inventory (Safely)
      try {
        const { data: orderItems, error: itemsError } = await supabase
          .from('order_items')
          .select('product_id, quantity')
          .eq('order_id', orderId);

        if (itemsError || !orderItems) {
           console.error('[Stripe Webhook Error] Failed to fetch order items for inventory update:', itemsError);
        } else {
           for (const item of orderItems) {
              const { data: product } = await supabase.from('products').select('stock').eq('id', item.product_id).single();
              if (product && typeof product.stock === 'number') {
                 const newStock = Math.max(0, product.stock - item.quantity);
                 await supabase.from('products').update({ stock: newStock }).eq('id', item.product_id);
              }
           }
        }
      } catch (invErr) {
        console.error('[Stripe Webhook Error] Exception during inventory decrement:', invErr);
        // We don't return error here to avoid blocking fulfillment if inventory update fails
      }

      // 3. Save Shipping details to user_addresses table (if user exists)
      const email = session.customer_details?.email;
      const stripeSessionAny = session as any;
      const shippingAddress = stripeSessionAny.shipping_details?.address;

      if (email && shippingAddress) {
        try {
          const { data: userRecord, error: userError } = await supabase
            .from('profiles')
            .select('id')
            .eq('email', email)
            .single();

          if (!userError && userRecord) {
             const userAddressData = {
                user_id: userRecord.id,
                address_type: 'shipping',
                line1: shippingAddress.line1 || null,
                line2: shippingAddress.line2 || null,
                city: shippingAddress.city || null,
                state: shippingAddress.state || null,
                postal_code: shippingAddress.postal_code || null,
                country_code: shippingAddress.country || null,
             };

             const { error: addressError } = await supabase
               .from('user_addresses')
               .insert(userAddressData);

             if (addressError) {
                console.error('[Stripe Webhook Error] Failed to insert user shipping address:', addressError);
             } else {
                console.log(`[Stripe Webhook] Saved shipping address for user ${userRecord.id}`);
             }
          }
        } catch (dbErr) {
           console.error('[Stripe Webhook Error] Exception while saving shipping address:', dbErr);
        }
      }

      break;
    }
    default:
      console.log(`Unhandled event type ${event.type}`);
  }

  return { received: true };
};
