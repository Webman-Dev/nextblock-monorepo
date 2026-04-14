import { PaymentProvider } from '../types';
import { stripe } from '../stripe/client';
import { createClient } from '@supabase/supabase-js';
import { CheckoutSessionInput, normalizeOrderCustomerDetails } from '../customer';
import { upsertDefaultUserAddresses } from '../customer-addresses';

export class StripeProvider implements PaymentProvider {
  getProviderName(): string {
    return 'Stripe';
  }

  async createCheckoutSession({
    items: cartItems,
    customerEmail,
    customerPhone,
    userId,
    billingAddress,
    shippingAddress,
    shippingMethodId,
  }: CheckoutSessionInput): Promise<{ url: string | null; error?: string }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for checkout (Service Key required).');
      return { error: 'Internal Server Error', url: null };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const siteUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:4200';

    if (!cartItems.length) {
      return { error: 'Cart is empty', url: null };
    }

    const productIds = cartItems.map((item) => item.product_id);
    const variantIds = cartItems
      .map((item) => item.variant_id)
      .filter((variantId): variantId is string => Boolean(variantId));
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price, sale_price, stock')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products for validation:', productsError);
      return { error: 'Failed to validate product prices', url: null };
    }

    const { data: variants, error: variantsError } = variantIds.length
      ? await supabase
          .from('product_variants')
          .select('id, product_id, sku, price, sale_price, stock_quantity')
          .in('id', variantIds)
      : { data: [], error: null };

    if (variantsError) {
      console.error('Error fetching variants for validation:', variantsError);
      return { error: 'Failed to validate product variants', url: null };
    }

    const productMap = new Map(products.map((product) => [product.id, product]));
    const variantMap = new Map((variants || []).map((variant) => [variant.id, variant]));
    const lineItems: any[] = [];
    const verifiedItems: Array<{
      product_id: string;
      quantity: number;
      price_at_purchase: number;
      variant_id?: string | null;
    }> = [];
    let totalAmount = 0;

    for (const cartItem of cartItems) {
      const product = productMap.get(cartItem.product_id);

      if (!product) {
        console.warn(`Product ${cartItem.product_id} not found in DB, skipping.`);
        continue;
      }

      let unitAmount =
        typeof product.sale_price === 'number' ? product.sale_price : product.price;
      let lineItemName = product.title;
      let resolvedVariantId: string | null = null;

      if (cartItem.variant_id) {
        const variant = variantMap.get(cartItem.variant_id);

        if (!variant || variant.product_id !== cartItem.product_id) {
          return { error: 'Selected product variation is no longer available.', url: null };
        }

        if (cartItem.quantity > variant.stock_quantity) {
          return {
            error: `Only ${variant.stock_quantity} units remain for ${cartItem.title}.`,
            url: null,
          };
        }

        unitAmount =
          typeof variant.sale_price === 'number' ? variant.sale_price : variant.price;
        resolvedVariantId = variant.id;
        lineItemName = cartItem.variant_label
          ? `${product.title} - ${cartItem.variant_label}`
          : `${product.title} - ${variant.sku}`;
      } else if (typeof product.stock === 'number' && cartItem.quantity > product.stock) {
        return {
          error: `Only ${product.stock} units remain for ${cartItem.title}.`,
          url: null,
        };
      }

      if (unitAmount < 0) {
        return { error: 'A product variation produced an invalid price.', url: null };
      }

      lineItems.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: lineItemName,
            metadata: {
              productId: product.id,
              variantId: resolvedVariantId || '',
            },
          },
          unit_amount: unitAmount,
        },
        quantity: cartItem.quantity,
      });

      totalAmount += unitAmount * cartItem.quantity;
      verifiedItems.push({
        product_id: product.id,
        quantity: cartItem.quantity,
        price_at_purchase: unitAmount,
        variant_id: resolvedVariantId,
      });
    }

    if (lineItems.length === 0) {
      return { error: 'No valid items in cart', url: null };
    }

    let shippingAmount = 0;
    if (shippingMethodId) {
      const { data: method, error: methodError } = await supabase
        .from('shipping_zone_methods')
        .select('id, name, cost_amount, cost_currency')
        .eq('id', shippingMethodId)
        .single();

      if (methodError) {
        console.error('Failed to load shipping method:', methodError);
        return { error: 'Failed to load shipping method', url: null };
      }

      shippingAmount = method.cost_amount ?? 0;

      if (shippingAmount > 0) {
        lineItems.push({
          price_data: {
            currency: (method.cost_currency || 'USD').toLowerCase(),
            product_data: {
              name: `Shipping - ${method.name}`,
            },
            unit_amount: shippingAmount,
          },
          quantity: 1,
        });
      }
    }

    const initialCustomerDetails = normalizeOrderCustomerDetails({
      email: customerEmail,
      phone: customerPhone,
      name: billingAddress?.recipient_name,
      billing: billingAddress,
      shipping: shippingAddress,
    });

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        status: 'pending',
        total: totalAmount + shippingAmount,
        provider: 'stripe',
        user_id: userId,
        customer_details: initialCustomerDetails,
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create pending order:', orderError);
      return { error: 'Failed to initiate order', url: null };
    }

    const orderId = order.id;

    const { error: itemsError } = await supabase.from('order_items').insert(
      verifiedItems.map((item) => ({
        order_id: orderId,
        product_id: item.product_id,
        variant_id: item.variant_id ?? null,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase,
      }))
    );

    if (itemsError) {
      console.error('Failed to insert order items:', itemsError);
      await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
      return { error: 'Failed to record order items', url: null };
    }

    if (userId) {
      try {
        await upsertDefaultUserAddresses({
          userId,
          billingAddress,
          shippingAddress,
          client: supabase as any,
        });
      } catch (addressError) {
        console.error('Failed to sync default customer addresses before checkout:', addressError);
      }
    }

    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/checkout`,
        line_items: lineItems,
        billing_address_collection: 'auto',
        customer_email: customerEmail || undefined,
        customer_creation: 'if_required',
        metadata: {
          orderId,
        },
      });

      const { error: updateOrderError } = await supabase
        .from('orders')
        .update({ stripe_session_id: session.id })
        .eq('id', orderId);

      if (updateOrderError) {
        console.error('Failed to save Stripe session ID on order:', updateOrderError);
      }

      return { url: session.url };
    } catch (error: any) {
      console.error('Stripe session creation failed:', error);
      await supabase.from('orders').update({ status: 'failed' }).eq('id', orderId);
      return { error: error.message, url: null };
    }
  }
}
