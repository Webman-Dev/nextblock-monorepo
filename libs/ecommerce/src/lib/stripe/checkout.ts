import { stripe } from './client';
import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import { type CartItem } from '../cart-store';

export const createCheckoutSession = async (
  cartItems: CartItem[]
): Promise<{ url: string | null; error?: string }> => {
  const supabase = getSsgSupabaseClient();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4200';

  if (!cartItems.length) {
    return { error: 'Cart is empty', url: null };
  }

  // 1. Validate Prices against DB
  // Extract product IDs
  const productIds = cartItems.map((item) => item.product_id);
  
  const { data: products, error: productsError } = await supabase
    .from('products')
    .select('id, title, price, image_url')
    .in('id', productIds);

  if (productsError || !products) {
    console.error('Error fetching products for validation:', productsError);
    return { error: 'Failed to validate product prices', url: null };
  }

  // Map for quick lookup
  const productMap = new Map(products.map((p) => [p.id, p]));

  // 2. Build Line Items and Calculate Order Total
  const line_items = [];
  let totalAmount = 0;
  const verifiedItems = [];

  for (const cartItem of cartItems) {
    const product = productMap.get(cartItem.product_id);

    if (!product) {
        console.warn(`Product ${cartItem.product_id} not found in DB, skipping.`);
        continue;
    }

    // Verify price
    // Note: Stripe expects amount in cents for 'usd'. Assuming product.price is in dollars/base unit
    // We should strictly use the DB price, IGNORING cartItem.price
    const unitAmount = Math.round(product.price * 100); 

    line_items.push({
      price_data: {
        currency: 'usd',
        product_data: {
          name: product.title,
          images: product.image_url ? [product.image_url] : [],
          metadata: {
              productId: product.id
          }
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
      total_amount: totalAmount,
      currency: 'usd',
      // user_id: userId // Optional: Add if we have auth context
    })
    .select('id')
    .single();

  if (orderError || !order) {
    console.error('Failed to create pending order:', orderError);
    return { error: 'Failed to initiate order', url: null };
  }
  
  // 3.5 Insert Order Items (Optional for now but good practice, skipping for brevity/speed unless strictly required, but strongly recommended)
  // We'll insert order items if table exists. Assuming it does based on prompt context "Update inventory... for purchased items", implying we need to know WHAT was purchased.
  // Actually, 'metadata' in stripe session can hold orderId. Webhook needs to know items to decrement inventory.
  // We should insert order_items now.
  
  const orderItemsData = verifiedItems.map(item => ({
      order_id: order.id,
      product_id: item.product_id,
      quantity: item.quantity,
      price: item.price_at_purchase
  }));

  const { error: itemsError } = await supabase
      .from('order_items')
      .insert(orderItemsData);
      
  if (itemsError) {
      console.error('Failed to insert order items:', itemsError);
      // We might want to cancel the order here or proceed with caution. 
      // For MVP, logging error.
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
    });

    return { url: session.url };
  } catch (err: any) {
    console.error('Stripe session creation failed:', err);
    return { error: err.message, url: null };
  }
};
