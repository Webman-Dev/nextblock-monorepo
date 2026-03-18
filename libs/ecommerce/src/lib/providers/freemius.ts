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
