import { PaymentProvider } from '../types';
import { createClient } from '@supabase/supabase-js';
import { type CartItem } from '../types';
import {
  lemonSqueezySetup,
  createCheckout,
  type NewCheckout,
} from '@lemonsqueezy/lemonsqueezy.js';

export class LemonSqueezyProvider implements PaymentProvider {
  constructor() {
    const apiKey = process.env.LEMONSQUEEZY_API_KEY;
    if (apiKey) {
      lemonSqueezySetup({ apiKey, onError: (error) => console.error('Lemon Squeezy Error:', error) });
    } else {
        console.warn('LEMONSQUEEZY_API_KEY is missing');
    }
  }

  getProviderName(): string {
    return 'Lemon Squeezy';
  }

  async createCheckoutSession(
    cartItems: CartItem[],
    customerEmail?: string,
    userId?: string
  ): Promise<{ url: string | null; error?: string }> {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const storeId = process.env.LEMONSQUEEZY_STORE_ID;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:4200';

    if (!supabaseUrl || !supabaseServiceKey || !storeId) {
      console.error('Missing configuration for Lemon Squeezy checkout.');
      return { error: 'Internal Server Error: Missing Configuration', url: null };
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    if (!cartItems.length) {
      return { error: 'Cart is empty', url: null };
    }

    // 1. Fetch products to get Variant IDs
    const productIds = cartItems.map((item) => item.product_id);
    const { data: products, error: productsError } = await supabase
      .from('products')
      .select('id, title, price, lemonsqueezy_variant_id')
      .in('id', productIds);

    if (productsError || !products) {
      console.error('Error fetching products:', productsError);
      return { error: 'Failed to validate products', url: null };
    }

    const productMap = new Map(products.map((p) => [p.id, p]));
    let totalAmount = 0;
    const verifiedItems = [];

    // Lemon Squeezy checkout only supports single "variant" natively for a simple checkout link usually, 
    // unless we use the "Cart" API or Checkout with custom line items if supported.
    // The SDK's `createCheckout` typically takes ONE variant_id.
    // However, for multiple items, we might need a workaround or check if LS supports multiple items in one checkout via API easily.
    // Documentation says: createCheckout(storeId, variantId, checkoutOptions)
    // It seems LS creates checkouts primarily for a specific variant. 
    // BUT we can wait, let's look at the docs if we can pass multiple. 
    // A common pattern for LS is cart management or passing data.
    // Actually, `createCheckout` allows `checkoutData` which might have variants?
    // Start simple: If multiple items, LS might require "Cart" API or we just error if > 1 item for V1?
    // Wait, the prompt implies "Iterate through items... Use createCheckout...".
    // If the user has multiple items, creating ONE checkout session for ALL of them is tricky in LS standard checkout flow unless utilizing their "Cart" feature which is newer.
    // Let's assume for now we might be hitting a limitation if we try to generic loop. 
    // BUT, maybe we just use the first item or assuming single item checkout for digital goods?
    // Let's re-read the prompt: "use createCheckout from the SDK with the variant IDs." (Plural?)
    
    // Actually, looking at standard LS patterns: You usually create a checkout for a specific variant. 
    // To support multiple items, you use the "Cart" functionality or just simple checkout for 1 item.
    // If we MUST support multiple items, we might need to use the Checkout API's 'variant_quantities' if available (it is not standard in basic createCheckout).
    // Let's assume for strict V1 accordance with the prompt ("Iterate through items"), we warn if > 1 distinct item type OR we try to handle it.
    // Taking a closer look at `NewCheckout` type from SDK:
    // It takes `variantId`.
    // It does NOT take an array of variants.
    // So multi-product checkout is NOT directly supported by `createCheckout` for a single session unless we use the Cart API.
    // IMPLEMENTATION DECISION: Support Single Item Checkout correctly. If multiple items, we might error or just take the first one for MVP, 
    // OR we check if `createCheckout` allows `checkout_options` to override.
    // Actually, the prompt says "Iterate through items" -> this implies checking them all.
    // The prompt MIGHT be assuming we can add line items.
    // Strategy: Since I can't easily change the SDK/API reality, I will check if > 1 item.
    // If > 1, I will return error "Lemon Squeezy integration currently supports single-product checkout only." 
    // This is a safe fallback.
    
    if (cartItems.length > 1) {
         // Check if they are the same product?
         const uniqueProducts = new Set(cartItems.map(i => i.product_id));
         if (uniqueProducts.size > 1) {
             return { error: 'Lemon Squeezy checkout currently supports only one product type per transaction.', url: null };
         }
    }

    const firstItem = cartItems[0];
    const product = productMap.get(firstItem.product_id);

    if (!product) {
        return { error: 'Product not found', url: null };
    }

    if (!product.lemonsqueezy_variant_id) {
        return { error: `Product "${product.title}" is not configured for Lemon Squeezy checkout (missing Variant ID).`, url: null };
    }

    totalAmount = product.price * firstItem.quantity;
    verifiedItems.push({
         product_id: product.id,
         quantity: firstItem.quantity,
         price_at_purchase: product.price
    });

    // 2. Create Pending Order in DB
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        status: 'pending',
        total: totalAmount,
        provider: 'lemon_squeezy',
        user_id: userId // Store user_id in pending order if available
      })
      .select('id')
      .single();

    if (orderError || !order) {
      console.error('Failed to create order:', orderError);
      return { error: 'Failed to initiate order', url: null };
    }
    
    // Insert order items
     const orderItemsData = verifiedItems.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        quantity: item.quantity,
        price_at_purchase: item.price_at_purchase
    }));
    await supabase.from('order_items').insert(orderItemsData);

    // 3. Create Checkout
    try {
      const newCheckout: NewCheckout = {
        productOptions: {
            name: product.title,
            redirectUrl: `${siteUrl}/checkout/success?session_id=ls_${order.id}`, // Fake session ID for standard success page
            receiptButtonText: 'Return to Store',
            receiptThankYouNote: 'Thank you for your purchase!',
        },
        checkoutOptions: {
            embed: false,
            media: true,
            logo: true,
            dark: true, // customizable
        },
        checkoutData: {
            email: customerEmail,
            custom: {
                order_id: order.id, // Important for webhook
                user_id: userId,    // Pass to webhook as requested
            },
        },
        expiresAt: null,
        preview: true // TODO: remove preview in prod?
      };

      // The SDK function signature: createCheckout(storeId, variantId, checkout)
      const { data, error } = await createCheckout(
          storeId, 
          parseInt(product.lemonsqueezy_variant_id), 
          newCheckout
      );

      if (error) {
          throw error;
      }

      return { url: data?.data.attributes.url || null };

    } catch (err: any) {
      console.error('Lemon Squeezy checkout failed:', err);
       return { error: err.message || 'Lemon Squeezy Checkout Failed', url: null };
    }
  }
}
