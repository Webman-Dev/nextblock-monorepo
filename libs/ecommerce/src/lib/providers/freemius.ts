import { PaymentProvider } from '../types';
import { createClient } from '@supabase/supabase-js';
import crypto from 'crypto';
import { Freemius } from '@freemius/sdk';
import { CheckoutSessionInput, normalizeOrderCustomerDetails } from '../customer';
import {
  fillMissingUserProfileCheckoutDetails,
  upsertDefaultUserAddresses,
} from '../customer-addresses';
import {
  getDefaultCurrency,
  resolvePriceForCurrency,
} from '../currency';

type FreemiusCheckoutCredentialEntry = {
    publicKey?: string;
    secretKey?: string;
    apiKey?: string;
};

function readFreemiusEnvValue(name: keyof NodeJS.ProcessEnv) {
    const raw = process.env[name];

    if (!raw) {
        return null;
    }

    const trimmed = raw.trim();

    if (
        (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
        (trimmed.startsWith("'") && trimmed.endsWith("'"))
    ) {
        return trimmed.slice(1, -1).trim();
    }

    return trimmed;
}

function splitFreemiusCustomerName(name?: string | null) {
    const trimmed = name?.trim();

    if (!trimmed) {
        return {
            firstName: null,
            lastName: null,
        };
    }

    const [firstName, ...rest] = trimmed.split(/\s+/);

    return {
        firstName: firstName || null,
        lastName: rest.length > 0 ? rest.join(' ') : null,
    };
}

function parseFreemiusCheckoutCredentialsMap():
    | Record<string, FreemiusCheckoutCredentialEntry>
    | null {
    const raw = readFreemiusEnvValue('FREEMIUS_CHECKOUT_PRODUCTS_JSON');

    if (!raw) {
        return null;
    }

    try {
        const parsed = JSON.parse(raw) as Record<string, FreemiusCheckoutCredentialEntry>;
        return parsed && typeof parsed === 'object' ? parsed : null;
    } catch (error) {
        console.error(
            '[Freemius Checkout] Failed to parse FREEMIUS_CHECKOUT_PRODUCTS_JSON:',
            error
        );
        return null;
    }
}

function resolveFreemiusCheckoutCredentials(productId: string | number) {
    const credentialsMap = parseFreemiusCheckoutCredentialsMap();
    const productKey = String(productId);
    const productScopedCredentials = credentialsMap?.[productKey];
    const singleProductId = readFreemiusEnvValue('FREEMIUS_PRODUCT_ID');
    const sandboxOverridePublicKey = readFreemiusEnvValue(
        'FREEMIUS_ECOMMERCE_SANDBOX_PUBLIC_KEY'
    );
    const sandboxOverrideSecretKey = readFreemiusEnvValue(
        'FREEMIUS_ECOMMERCE_SANDBOX_SECRET_KEY'
    );

    if (productScopedCredentials?.publicKey) {
        return {
            publicKey: productScopedCredentials.publicKey,
            secretKey: productScopedCredentials.secretKey ?? null,
            apiKey: productScopedCredentials.apiKey ?? null,
            source: 'product-map' as const,
        };
    }

    if (
        process.env.FREEMIUS_SANDBOX_ENABLED === 'true' &&
        singleProductId &&
        singleProductId === productKey &&
        sandboxOverridePublicKey
    ) {
        return {
            publicKey: sandboxOverridePublicKey,
            secretKey: sandboxOverrideSecretKey,
            apiKey: readFreemiusEnvValue('FREEMIUS_API_KEY'),
            source: 'single-product-sandbox-env' as const,
        };
    }

    if (singleProductId && singleProductId === productKey && readFreemiusEnvValue('FREEMIUS_PUBLIC_KEY')) {
        return {
            publicKey: readFreemiusEnvValue('FREEMIUS_PUBLIC_KEY'),
            secretKey: readFreemiusEnvValue('FREEMIUS_SECRET_KEY'),
            apiKey: readFreemiusEnvValue('FREEMIUS_API_KEY'),
            source: 'single-product-env' as const,
        };
    }

    return {
        publicKey: readFreemiusEnvValue('FREEMIUS_PUBLIC_KEY'),
        secretKey: readFreemiusEnvValue('FREEMIUS_SECRET_KEY'),
        apiKey: readFreemiusEnvValue('FREEMIUS_API_KEY'),
        source: 'legacy-env' as const,
    };
}

async function getFreemiusSandboxParamsViaSdk(input: {
    productId: string | number;
    publicKey: string;
    secretKey: string;
    apiKey?: string | null;
}) {
    if (!input.apiKey) {
        throw new Error('Missing Freemius API key for SDK sandbox generation.');
    }

    const freemius = new Freemius({
        productId: Number(input.productId),
        apiKey: input.apiKey,
        secretKey: input.secretKey,
        publicKey: input.publicKey,
    });

    return freemius.checkout.getSandboxParams();
}

export class FreemiusProvider implements PaymentProvider {
    getProviderName(): string {
        return 'Freemius';
    }

    async createCheckoutSession({
      items: cartItems,
      customerEmail,
      customerPhone,
      userId,
      billingAddress,
      shippingAddress,
      currencyCode,
    }: CheckoutSessionInput): Promise<{
      url: string | null;
      error?: string;
      errorKey?: string;
      errorParams?: Record<string, string | number>;
      errorStatus?: number;
      customProps?: any;
    }> {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  
      if (!supabaseUrl || !supabaseServiceKey) {
        return { error: 'Missing Supabase credentials for checkout (Service Key required).', url: null };
      }
  
      const supabase = createClient(supabaseUrl, supabaseServiceKey);
      
      if (!cartItems || cartItems.length === 0) {
          return { error: 'Cart is empty', url: null };
      }

      if (cartItems.length !== 1) {
          return { error: 'Freemius items must be checked out one at a time.', url: null };
      }

      const { data: currenciesResult, error: currenciesError } = await supabase
        .from('currencies')
        .select(
          'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
        )
        .eq('is_active', true)
        .order('code', { ascending: true });
      const currencies = currenciesResult ?? [];

      if (currenciesError || currencies.length === 0) {
        return { error: 'Failed to resolve store currencies', url: null };
      }

      const defaultCurrency = getDefaultCurrency(currencies);
      const selectedCurrency =
        currencies.find((currency) => currency.code === (currencyCode || '').toUpperCase()) ??
        defaultCurrency;
      
      const item = cartItems[0];
      const { data: product, error: productError } = await supabase
        .from('products')
        .select('id, title, price, prices, sale_price, sale_prices, freemius_plan_id, freemius_product_id')
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
      
      const resolvedPrice = resolvePriceForCurrency({
        prices: product.prices || {},
        salePrices: product.sale_prices || {},
        fallbackPrice: product.price,
        fallbackSalePrice: product.sale_price,
        currencyCode: selectedCurrency.code,
        currencies,
      });
      const unitAmount = resolvedPrice.sale_price ?? resolvedPrice.price;
      const totalAmount = unitAmount * item.quantity;
      const freemiusCustomerName = splitFreemiusCustomerName(
        billingAddress?.recipient_name ?? null
      );
      
      // 3. Create Pending Order in DB
      const { data: order, error: orderError } = await supabase
        .from('orders')
        .insert({
          status: 'pending',
          total: totalAmount,
          currency: selectedCurrency.code,
          exchange_rate_at_purchase: selectedCurrency.exchange_rate,
          provider: 'freemius',
          user_id: userId || null,
          customer_details: normalizeOrderCustomerDetails({
            email: customerEmail,
            phone: customerPhone,
            name: billingAddress?.recipient_name,
            billing: billingAddress,
            shipping: shippingAddress,
          }),
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
            price_at_purchase: unitAmount
        }]);
          
      if (itemsError) {
          console.error('Failed to insert order items:', itemsError);
      }

      if (userId) {
          try {
              await upsertDefaultUserAddresses({
                  userId,
                  billingAddress,
                  shippingAddress,
                  client: supabase as any,
              });
              await fillMissingUserProfileCheckoutDetails({
                  userId,
                  fullName:
                      billingAddress?.recipient_name ?? shippingAddress?.recipient_name ?? null,
                  phone: customerPhone,
                  client: supabase as any,
              });
          } catch (profileSyncError) {
              console.error(
                  'Failed to sync checkout profile defaults before checkout:',
                  profileSyncError
              );
          }
      }
            
      // Freemius checkout sandbox is independent from the app-wide demo sandbox.
      const isFreemiusSandboxEnabled = process.env.FREEMIUS_SANDBOX_ENABLED === 'true';
      const checkoutCredentials = resolveFreemiusCheckoutCredentials(freemiusProductId);
      const publicKey = checkoutCredentials.publicKey;
      const secretKey = checkoutCredentials.secretKey;
      const apiKey = checkoutCredentials.apiKey;

      if (!publicKey || (isFreemiusSandboxEnabled && !secretKey)) {
          return { error: 'Missing FREEMIUS credentials (PUBLIC_KEY or SECRET_KEY) in environment variables.', url: null };
      }

      if (isFreemiusSandboxEnabled && checkoutCredentials.source === 'legacy-env') {
          const configuredProductId = readFreemiusEnvValue('FREEMIUS_PRODUCT_ID');
          const hasSandboxOverridePublicKey = Boolean(
              readFreemiusEnvValue('FREEMIUS_ECOMMERCE_SANDBOX_PUBLIC_KEY')
          );
          const hasSandboxOverrideSecretKey = Boolean(
              readFreemiusEnvValue('FREEMIUS_ECOMMERCE_SANDBOX_SECRET_KEY')
          );
          console.warn(
              `[Freemius Checkout] Sandbox is enabled for product ${freemiusProductId}, but no product-scoped checkout credentials were selected. Falling back to legacy FREEMIUS_PUBLIC_KEY/FREEMIUS_SECRET_KEY may open live checkout instead of sandbox.`,
              {
                  configuredProductId,
                  productIdsMatch: configuredProductId === String(freemiusProductId),
                  hasSandboxOverridePublicKey,
                  hasSandboxOverrideSecretKey,
                  hasCheckoutProductsJson: Boolean(
                      readFreemiusEnvValue('FREEMIUS_CHECKOUT_PRODUCTS_JSON')
                  ),
              }
          );
      }
      
      let sandboxPayload: any = false;
      
      // Prefer the official Freemius SDK sandbox API. Fall back to the documented
      // MD5 token flow if the SDK path is unavailable or fails.
      if (isFreemiusSandboxEnabled && secretKey && publicKey) {
          try {
              sandboxPayload = await getFreemiusSandboxParamsViaSdk({
                  productId: freemiusProductId,
                  publicKey,
                  secretKey,
                  apiKey,
              });
          } catch (sdkSandboxError) {
              console.warn(
                  'Freemius Checkout - SDK sandbox generation failed. Falling back to manual token generation.',
                  sdkSandboxError,
                  {
                      credentialSource: checkoutCredentials.source,
                      hasApiKey: !!apiKey,
                  }
              );

              const timestamp = Math.floor(Date.now() / 1000).toString();
              
              // MD5 String format: timestamp + plugin_id + secret_key + public_key + 'checkout'
              const hashString = `${timestamp}${freemiusProductId}${secretKey}${publicKey}checkout`;
              const hash = crypto.createHash('md5').update(hashString).digest('hex');
              
              sandboxPayload = {
                  ctx: timestamp,
                  token: hash
              };
          }
      }
      
      const url = new URL(`https://checkout.freemius.com/app/${freemiusProductId}/plan/${freemiusPlanId}/`);
      if (isFreemiusSandboxEnabled && secretKey && publicKey) {
          // Use correct secure parameters for Sandbox Direct Linking
          url.searchParams.append('sandbox', sandboxPayload.token);
          url.searchParams.append('s_ctx_ts', sandboxPayload.ctx);
      } else if (isFreemiusSandboxEnabled) {
          url.searchParams.append('sandbox', 'true');
      }
      
      if (customerEmail) url.searchParams.append('user_email', customerEmail);
      if (freemiusCustomerName.firstName) {
          url.searchParams.append('user_firstname', freemiusCustomerName.firstName);
      }
      if (freemiusCustomerName.lastName) {
          url.searchParams.append('user_lastname', freemiusCustomerName.lastName);
      }
      url.searchParams.append('currency', selectedCurrency.code.toLowerCase());
      
      return { 
          url: url.toString(),
          customProps: {
              provider: 'freemius',
              plugin_id: freemiusProductId,
              plan_id: freemiusPlanId,
              public_key: publicKey,
              user_email: customerEmail,
              user_firstname: freemiusCustomerName.firstName,
              user_lastname: freemiusCustomerName.lastName,
              credential_source: checkoutCredentials.source,
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
    const devId = readFreemiusEnvValue('FREEMIUS_DEVELOPER_ID');
    const publicKey = readFreemiusEnvValue('FREEMIUS_PUBLIC_KEY');
    const secretKey = readFreemiusEnvValue('FREEMIUS_SECRET_KEY');
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

        // Get English language ID for default product language
        const { data: enLang } = await supabase.from('languages').select('id').eq('code', 'en').single();
        const enLangId = enLang?.id;
        if (!enLangId) {
            throw new Error('English language not found in database. Cannot sync products.');
        }

        for (const plugin of plugins) {
            const count = await syncSingleFreemiusProductInternal(supabase, devId, plugin.id.toString(), plugin.title, fetcher, enLangId);
            totalSyncCount += count;
        }

        return { success: true, count: totalSyncCount };
    } catch (err: any) {
        console.error('[Freemius Sync] Global Error:', err);
        throw err;
    }
}

export async function syncSingleFreemiusProduct(productId: string) {
    const devId = readFreemiusEnvValue('FREEMIUS_DEVELOPER_ID');
    const publicKey = readFreemiusEnvValue('FREEMIUS_PUBLIC_KEY');
    const secretKey = readFreemiusEnvValue('FREEMIUS_SECRET_KEY');
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!devId || !publicKey || !secretKey || !supabaseUrl || !supabaseServiceKey) {
        throw new Error('Missing environment variables for Freemius Sync.');
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    const fetcher = (path: string) => fetchFreemiusHelper(path, devId, publicKey, secretKey);

    // Get English language ID for default product language
    const { data: enLang } = await supabase.from('languages').select('id').eq('code', 'en').single();
    const enLangId = enLang?.id;
    if (!enLangId) {
        throw new Error('English language not found in database. Cannot sync products.');
    }

    // First fetch the plugin details to get the title
    const plugin = await fetcher(`/v1/developers/${devId}/plugins/${productId}.json`);
    
    const count = await syncSingleFreemiusProductInternal(supabase, devId, productId, plugin.title, fetcher, enLangId);
    return { success: true, count };
}

async function syncSingleFreemiusProductInternal(
    supabase: any, 
    devId: string, 
    productId: string, 
    pluginTitle: string,
    fetchFreemius: (path: string) => Promise<any>,
    languageId: number
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
            
            // 1. Fetch pricing for this specific plan
            let price = 0;
            let fullPricing: any[] = [];
            try {
                const pricingPath = `/v1/developers/${devId}/plugins/${productId}/plans/${planIdStr}/pricing.json`;
                const pricingData = await fetchFreemius(pricingPath);
                fullPricing = pricingData.pricing || [];
                if (fullPricing.length > 0) {
                    // Base price calculation for the main products table fallback
                    const rawPrice = fullPricing[0].annual_price || fullPricing[0].monthly_price || 0;
                    
                    // Defensive check: If rawPrice > 5000, it's probably already in cents (or it's a very expensive plugin).
                    // Most plugins are not $5,000/year. Freemius sometimes returns cents in certain API versions or configs.
                    if (rawPrice > 5000) {
                        console.warn(`[Freemius Sync] Suspiciously high price detected: ${rawPrice}. Assuming it is already in cents.`);
                        price = Math.round(rawPrice);
                    } else {
                        price = Math.round(rawPrice * 100);
                    }
                }
                console.log(`[Freemius Sync] Plan: ${plan.title || plan.name} -> Resolved Price (cents): ${price}`);
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
                product_type: 'digital',
                payment_provider: 'freemius',
                freemius_plan_id: planIdStr,
                freemius_product_id: productId,
                status: 'active',
                stock: 999, 
                sku: `FM-${productId}-${planIdStr}`,
                language_id: languageId,
            };

            // 2. Upsert Core Product
            const { data: upsertData, error: upsertError } = await supabase
                .from('products')
                .upsert(productPayload, { onConflict: 'language_id, sku' })
                .select();

            if (upsertError || !upsertData || upsertData.length === 0) {
                console.error(`[Freemius Sync] Error upserting product ${productPayload.sku}:`, upsertError);
                continue; // Cannot proceed without parent product
            }

            const localProductId = upsertData[0].id;

            // 3. Sync Freemius Plan
            const { data: existingPlan } = await supabase
                .from('freemius_plans')
                .select('id')
                .eq('product_id', localProductId)
                .eq('name', plan.name)
                .single();

            let localPlanIdStr = '';

            if (existingPlan) {
                localPlanIdStr = existingPlan.id;
                await supabase
                    .from('freemius_plans')
                    .update({ title: plan.title || plan.name, updated_at: new Date().toISOString() })
                    .eq('id', localPlanIdStr);
            } else {
                const { data: newPlan } = await supabase
                    .from('freemius_plans')
                    .insert({
                        product_id: localProductId,
                        name: plan.name,
                        title: plan.title || plan.name
                    })
                    .select('id')
                    .single();
                if (newPlan) localPlanIdStr = newPlan.id;
            }

            // 4. Sync Pricing Configurations Safely (Preserving Overrides)
            if (localPlanIdStr && fullPricing.length > 0) {
                for (const pr of fullPricing) {
                    const lQuota = pr.licenses || 1;
                    
                    const { data: existingPricing } = await supabase
                        .from('freemius_pricing')
                        .select('id')
                        .eq('plan_id', localPlanIdStr)
                        .eq('license_quota', lQuota)
                        .single();

                    const pPayload = {
                        api_monthly_price: pr.monthly_price ? Number(pr.monthly_price) : null,
                        api_annual_price: pr.annual_price ? Number(pr.annual_price) : null,
                        api_lifetime_price: pr.lifetime_price ? Number(pr.lifetime_price) : null,
                        updated_at: new Date().toISOString()
                    };

                    if (existingPricing) {
                        await supabase
                            .from('freemius_pricing')
                            .update(pPayload)
                            .eq('id', existingPricing.id);
                    } else {
                        await supabase
                            .from('freemius_pricing')
                            .insert({
                                plan_id: localPlanIdStr,
                                license_quota: lQuota,
                                ...pPayload
                            });
                    }
                }
            }
            
            console.log(`[Freemius Sync] Successfully fully synced product ${productPayload.sku}.`);
            syncCount++;
        }
    } catch (err: any) {
        console.error(`[Freemius Sync] Failed sync for plugin ${productId}:`, err.message);
    }
    return syncCount;
}
