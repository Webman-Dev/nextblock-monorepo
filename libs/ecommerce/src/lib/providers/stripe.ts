import { PaymentProvider } from '../types';
import { stripe } from '../stripe/client';
import { createClient } from '@supabase/supabase-js';
import { type CartItem } from '../types';

export class StripeProvider implements PaymentProvider {
  getProviderName(): string {
    return 'Stripe';
  }

  async createCheckoutSession(
    cartItems: CartItem[],
    customerEmail?: string // Stripe handles this in checkout or auto-email, but we can prefill
  ): Promise<{ url: string | null; error?: string }> {
    // Implement Stripe Logic matching existing checkout.ts
    // Use Service Role Key to bypass RLS
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
      console.error('Missing Supabase credentials for checkout (Service Key required).');
      return { error: 'Internal Server Error', url: null };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4200';

    if (!cartItems.length) {
      return { error: 'Cart is empty', url: null };
    }

    // 1. Validate Prices against DB
    const productIds = cartItems.map((item) => item.product_id);

    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products for validation:', productsError);
      return { error: 'Failed to validate product prices', url: null };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));

    // 2. Build Line Items
    const line_items = [];
    let totalAmount = 0;
    const verifiedItems = [];

    for (const cartItem of cartItems) {
      const product = productMap.get(cartItem.product_id);

      if (!product) {
        console.warn(`Product ${cartItem.product_id} not found in DB, skipping.`);
        continue;
      }

      const unitAmount = product.price;

      line_items.push({
        price_data: {
          currency: 'usd',
          product_data: {
            name: product.title,
            metadata: {
              productId: product.id,
            },
          },
          unit_amount: unitAmount,
        },
        quantity: cartItem.quantity,
      });

      totalAmount += product.price * cartItem.quantity;
      
      verifiedItems.push({
          product_id: product.id,
          quantity: cartItem.quantity,
          price_at_purchase: product.price
      });
    }

    if (line_items.length === 0) {
      return { error: 'No valid items in cart', url: null };
    }

    // 3. Create Pending Order in DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        status: 'pending',
        total: totalAmount,
        provider: 'stripe',
        // user_id: userId // Optional
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create pending order:', orderError);
      return { error: `Failed to initiate order`, url: null };
    }
    
    // 3.5 Insert Order Items
    const orderItemsData = verifiedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase
    }));

    const { error: itemsError } = await supabase
        .from('order_items')
        .insert(orderItemsData);
        
    if (itemsError) {
        console.error('Failed to insert order items:', itemsError);
    }

    // 4. Create Stripe Session
    try {
      const session = await stripe.checkout.sessions.create({
        mode: 'payment',
        success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
        cancel_url: `${siteUrl}/`,
        line_items,
        metadata: {
          orderId: order.id,
        },
        customer_email: customerEmail,
      });

      return { url: session.url };
    } catch (err: any) {
      console.error('Stripe session creation failed:', err);
      return { error: err.message, url: null };
    }
  }
}
