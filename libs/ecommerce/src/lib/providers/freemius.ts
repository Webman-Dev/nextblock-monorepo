import { PaymentProvider, CartItem } from '../types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';

export class FreemiusProvider implements PaymentProvider {
    getProviderName(): string {
        return 'Freemius';
    }

    async createCheckoutSession(
      cartItems: CartItem[],
      customerEmail?: string,
      userId?: string
    ): Promise<{ url: string | null; error?: string; customProps?: any }> {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
      if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Missing Supabase credentials for checkout (Service Key required).', url: null };
      }
  
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      if (!cartItems || cartItems.length === 0) {
          return { error: 'Cart is empty', url: null };
      }
      
      // Freemius checkout is typically one product/plan at a time.
      // We will check out the first item in the cart.
      const item = cartItems[0];
      console.log('Freemius Checkout - Fetching product ID:', item.product_id);
      
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, title, price, freemius_plan_id, freemius_product_id')
        .eq('id', item.product_id)
        .single();
        
      if (productError || !product) {
          return { error: 'Product not found', url: null };
      }
      
      const freemiusPlanId = product.freemius_plan_id;
      const freemiusProductId = product.freemius_product_id;
      
      if (!freemiusPlanId || !freemiusProductId) {
          return { error: 'Product is not configured for Freemius checkout (missing Plan ID or Product ID)', url: null };
      }
      
      const totalAmount = product.price * item.quantity;
      
      // 3. Create Pending Order in DB
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          total: totalAmount,
          provider: 'freemius',
          user_id: userId || null,
          customer_details: customerEmail ? { email: customerEmail } : null
        })
        .select('id')
        .single();
  
      if (orderError || !order) {
        console.error('Failed to create pending order:', orderError);
        return { error: `Failed to initiate order`, url: null };
      }
      
      // Insert Order Items
      const { error: itemsError } = await supabase
        .from('order_items')
        .insert([{
            order_id: order.id,
            product_id: product.id,
            quantity: item.quantity,
            price_at_purchase: product.price
        }]);
          
      if (itemsError) {
          console.error('Failed to insert order items:', itemsError);
      }
            
      // Freemius checkout integration logic
      const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true'; 
      const publicKey = process.env.FREEMIUS_PUBLIC_KEY;
      const secretKey = process.env.FREEMIUS_SECRET_KEY;

      if (!publicKey || (isSandbox && !secretKey)) {
          return { error: 'Missing FREEMIUS credentials (PUBLIC_KEY or SECRET_KEY) in environment variables.', url: null };
      }
      
      let sandboxPayload: any = isSandbox;
      
      // Generate Secure Token using Context7 exact MD5 specification
      if (isSandbox && secretKey && publicKey) {
          const timestamp = Math.floor(Date.now() / 1000).toString();
          
          // MD5 String format: timestamp + plugin_id + secret_key + public_key + 'checkout'
          const hashString = `${timestamp}${freemiusProductId}${secretKey}${publicKey}checkout`;
          const hash = crypto.createHash('md5').update(hashString).digest('hex');
          
          sandboxPayload = {
              ctx: timestamp,
              token: hash
          };
          console.log('Freemius Checkout - Generated Sandbox Token using local time:', sandboxPayload);
      } else {
          console.log('Freemius Checkout - NOT using Sandbox. isSandbox:', isSandbox, 'hasSecret:', !!secretKey, 'hasPublic:', !!publicKey);
      }
      
      const url = new URL(`https://checkout.freemius.com/app/${freemiusProductId}/plan/${freemiusPlanId}/`);
      if (isSandbox && secretKey && publicKey) {
          // Use correct secure parameters for Sandbox Direct Linking
          url.searchParams.append('sandbox', sandboxPayload.token);
          url.searchParams.append('s_ctx_ts', sandboxPayload.ctx);
      } else if (isSandbox) {
          url.searchParams.append('sandbox', 'true');
      }
      
      if (customerEmail) url.searchParams.append('user_email', customerEmail);
      
      return { 
          url: url.toString(),
          customProps: {
              provider: 'freemius',
              plugin_id: freemiusProductId,
              plan_id: freemiusPlanId,
              public_key: publicKey,
              user_email: customerEmail,
              sandbox: sandboxPayload,
              order_id: order.id
          }
      };
    }
}

/**
 * Internal helper for Freemius API calls with correct signature
 */
async function fetchFreemiusHelper(path: string, devId: string, publicKey: string, secretKey: string) {
    const method = 'GET';
    const date = new Date().toUTCString().replace('GMT', '+0000');
    
    // HMAC-SHA256 signature format: METHOD \n CONTENT_MD5 \n CONTENT_TYPE \n DATE \n URL
    const stringToSign = `${method}\n\n\n${date}\n${path}`;
    
    const hexHash = crypto.createHmac('sha256', secretKey).update(stringToSign).digest('hex');
    const signature = Buffer.from(hexHash)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    const authHeader = `FS ${devId}:${publicKey}:${signature}`;

    const response = await fetch(`https://api.freemius.com${path}`, {
        headers: {
            'Authorization': authHeader,
            'Date': date,
            'Accept': 'application/json'
        }
    });

    if (!response.ok) {
        const errText = await response.text();
        console.error(`[Freemius API] [ERROR] ${path} returned ${response.status}: ${errText}`);
        throw new Error(`Freemius API failed on ${path}: ${response.status} - ${errText}`);
    }

    return response.json();
}

export async function syncFreemiusProductsToSupabase() {
    const devId = process.env.FREEMIUS_DEVELOPER_ID;
    const publicKey = process.env.FREEMIUS_PUBLIC_KEY;
    const secretKey = process.env.FREEMIUS_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!devId || !publicKey || !secretKey || !supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing necessary environment variables for Freemius Sync.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
        auth: { autoRefreshToken: false, persistSession: false }
    });

    const fetcher = (path: string) => fetchFreemiusHelper(path, devId, publicKey, secretKey);

    try {
        console.log(`[Freemius Sync] Fetching all plugins for developer ${devId}...`);
        const pluginsData = await fetcher(`/v1/developers/${devId}/plugins.json`);
        const plugins = pluginsData.plugins || [];
        
        console.log(`[Freemius Sync] Found ${plugins.length} plugins. Syncing plans...`);

        let totalSyncCount = 0;
        for (const plugin of plugins) {
            const count = await syncSingleFreemiusProductInternal(supabase, devId, plugin.id.toString(), plugin.title, fetcher);
            totalSyncCount += count;
        }

        return { success: true, count: totalSyncCount };
    } catch (err: any) {
        console.error('[Freemius Sync] Global Error:', err);
        throw err;
    }
}

export async function syncSingleFreemiusProduct(productId: string) {
    const devId = process.env.FREEMIUS_DEVELOPER_ID;
    const publicKey = process.env.FREEMIUS_PUBLIC_KEY;
    const secretKey = process.env.FREEMIUS_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!devId || !publicKey || !secretKey || !supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing environment variables for Freemius Sync.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fetcher = (path: string) => fetchFreemiusHelper(path, devId, publicKey, secretKey);

    // First fetch the plugin details to get the title
    const plugin = await fetcher(`/v1/developers/${devId}/plugins/${productId}.json`);
    
    const count = await syncSingleFreemiusProductInternal(supabase, devId, productId, plugin.title, fetcher);
    return { success: true, count };
}

async function syncSingleFreemiusProductInternal(
    supabase: any, 
    devId: string, 
    productId: string, 
    pluginTitle: string,
    fetchFreemius: (path: string) => Promise<any>
) {
    console.log(`[Freemius Sync] Fetching plans for plugin: ${pluginTitle} (${productId})...`);
    let syncCount = 0;

    try {
        const plansPath = `/v1/developers/${devId}/plugins/${productId}/plans.json`;
        const plansData = await fetchFreemius(plansPath);
        const plans = plansData.plans || [];
        console.log(`[Freemius Sync] Received ${plans.length} plans for plugin ${productId}.`);

        for (const plan of plans) {
            const planIdStr = plan.id.toString();
            console.log(`[Freemius Sync] Processing plan: ${plan.title || plan.name} (${planIdStr})...`);
            
            // Fetch pricing for this specific plan
            let price = 0;
            try {
                const pricingPath = `/v1/developers/${devId}/plugins/${productId}/plans/${planIdStr}/pricing.json`;
                const pricingData = await fetchFreemius(pricingPath);
                const pricing = pricingData.pricing || [];
                if (pricing.length > 0) {
                    // annual_price or monthly_price (stored in cents)
                    price = Math.round((pricing[0].annual_price || pricing[0].monthly_price || 0) * 100);
                }
                console.log(`[Freemius Sync] Found pricing for plan ${planIdStr}: ${price}`);
            } catch (pricingErr) {
                console.warn(`[Freemius Sync] Could not fetch pricing for plan ${planIdStr}:`, pricingErr instanceof Error ? pricingErr.message : pricingErr);
            }

            const productSlug = `${pluginTitle}-${plan.title || plan.name}`
                .toLowerCase()
                .replace(/[^\w\s-]/g, '')
                .replace(/[\s_]+/g, '-')
                .replace(/^-+|-+$/g, '');

            const productPayload = {
                title: `${pluginTitle} - ${plan.title || plan.name}`,
                slug: productSlug,
                short_description: plan.description || '',
                price: price,
                freemius_plan_id: planIdStr,
                freemius_product_id: productId,
                status: 'active',
                stock: 999, 
                sku: `FM-${productId}-${planIdStr}`,
            };

            console.log(`[Freemius Sync] Upserting product: ${productPayload.sku}`);

            const { data: upsertData, error: upsertError } = await supabase
                .from('products')
                .upsert(productPayload, { onConflict: 'sku' })
                .select();

            if (upsertError) {
                console.error(`[Freemius Sync] Error upserting product ${productPayload.sku}:`, upsertError);
            } else {
                console.log(`[Freemius Sync] Successfully synced product ${productPayload.sku} (ID: ${upsertData?.[0]?.id}).`);
                syncCount++;
            }
        }
    } catch (err: any) {
        console.error(`[Freemius Sync] Failed sync for plugin ${productId}:`, err.message);
    }
    return syncCount;
}
