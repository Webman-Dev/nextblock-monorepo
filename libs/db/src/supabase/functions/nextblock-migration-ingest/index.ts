/// <reference types="deno" />
import { createClient } from "@supabase/supabase-js";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Upload S3 / R2 Proxy Handler
async function processMediaUpload(url: string, r2Config: any): Promise<string | null> {
   if (!r2Config || !r2Config.account_id) return null;

   try {
       const fileResponse = await fetch(url);
       if (!fileResponse.ok) return null;
       const arrayBuffer = await fileResponse.arrayBuffer();
       
       const s3Client = new S3Client({
           region: "auto",
           endpoint: `https://${r2Config.account_id}.r2.cloudflarestorage.com`,
           credentials: {
               accessKeyId: r2Config.access_key,
               secretAccessKey: r2Config.secret_key,
           },
       });

       const filename = url.split('/').pop() || crypto.randomUUID();
       const extension = filename.split('.').pop() || 'jpg';
       const objectKey = `migrated/${crypto.randomUUID()}.${extension}`; 

       await s3Client.send(new PutObjectCommand({
           Bucket: r2Config.bucket,
           Key: objectKey,
           Body: new Uint8Array(arrayBuffer),
           ContentType: fileResponse.headers.get('content-type') || 'application/octet-stream',
       }));

       return `${r2Config.public_domain.replace(/\/$/, '')}/${objectKey}`;
   } catch(e) {
       console.error(`R2 Upload Failed for ${url}:`, e);
       return null;
   }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    const body = await req.json();
    const { entity_type, r2_config, data } = body;

    if (!data || !Array.isArray(data)) {
      return new Response(JSON.stringify({ error: 'Payload data must be a structured array' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const { data: languages, error: langError } = await supabaseClient.from('languages').select('id, code');
    if (langError) throw langError;
    const langMap = new Map();
    if (languages) {
        languages.forEach((l: any) => langMap.set(l.code, l.id));
    }

    const { data: allUsers } = await supabaseClient.auth.admin.listUsers();
    const userEmailMap = new Map();
    if (allUsers?.users) {
        allUsers.users.forEach((u: any) => userEmailMap.set(u.email, u.id));
    }

    const processedEntities: any[] = [];
    let result: any = { error: null };

    // GLOBAL CUSTOMIZER CSS
    if (data.length > 0 && data[0].global_customizer_css) {
       await supabaseClient.from('site_settings').upsert({
           key: 'global_css',
           value: data[0].global_customizer_css
       }, { onConflict: 'key' });
    }

    // USER MIGRATION LOOP
    if (entity_type === 'user') {
      for (const item of data) {
         const randomPassword = crypto.randomUUID() + '!X9M';
         const { data: userData, error: authError } = await supabaseClient.auth.admin.createUser({
            email: item.email,
            password: randomPassword,
            email_confirm: true,
            user_metadata: {
               full_name: item.full_name || item.login,
               stripe_customer_id: item.stripe_customer_id, // Preserving vault tokens
               migrated_from_wp: true
            }
         });
         
         if (authError || !userData?.user) {
             console.error('Failed migrating user:', item.email, authError?.message);
             continue; 
         }
         
         if (item.addresses && item.addresses.length > 0) {
            const mappedAddresses = item.addresses.map((addr: any) => ({
                user_id: userData.user.id,
                ...addr
            }));
            await supabaseClient.from('user_addresses').insert(mappedAddresses);
         }
         processedEntities.push({ user_id: userData.user.id });
      }

    // ORDER LEDGER MIGRATION LOOP
    } else if (entity_type === 'shop_order') {
       // Pre-fetch all SKUs needed for this chunk to eliminate sequential DB latency
       const allSkusToFetch = new Set();
       for (const item of data) {
           if (item.order_items) {
               for (const oi of item.order_items) {
                   if (oi.sku) allSkusToFetch.add(oi.sku);
               }
           }
       }
       
       const skuToProductId = new Map();
       if (allSkusToFetch.size > 0) {
           const { data: matchedProducts } = await supabaseClient
               .from('products')
               .select('id, sku')
               .in('sku', Array.from(allSkusToFetch));
               
           if (matchedProducts) {
               for (const p of matchedProducts) {
                   skuToProductId.set(p.sku, p.id);
               }
           }
       }

       for (const item of data) {
          const userId = item.user_email ? userEmailMap.get(item.user_email) || null : null;
          
          const orderData = {
              user_id: userId,
              status: item.status,
              total: item.total,
              stripe_session_id: item.stripe_session_id,
              payment_intent_id: item.payment_intent_id,
              provider: item.provider,
              created_at: item.created_at
          };
          
          // Deduplication mechanism for rerun idempotency
          let insertedOrder = null;
          let query = supabaseClient
              .from('orders')
              .select('id')
              .eq('created_at', item.created_at)
              .eq('total', item.total);

          if (userId) {
              query = query.eq('user_id', userId);
          } else {
              query = query.is('user_id', null);
          }

          const { data: existingMatch } = await query.maybeSingle();

          if (existingMatch) {
              insertedOrder = existingMatch;
          } else {
              const { data: newOrder, error: orderErr } = await supabaseClient.from('orders').insert(orderData).select().single();
              if (orderErr || !newOrder) {
                 console.error("Failed to map order", orderErr);
                 continue;
              }
              insertedOrder = newOrder;
          }

          if (item.order_items && item.order_items.length > 0 && !existingMatch) {
              const mappedOrderItems = [];
              for (const oi of item.order_items) {
                  // Resolve Product UUID instantly from pre-fetched hash map!
                  const pId = skuToProductId.get(oi.sku);
                  if (pId) {
                      mappedOrderItems.push({
                          order_id: insertedOrder.id,
                          product_id: pId,
                          quantity: oi.quantity,
                          price_at_purchase: oi.price_at_purchase
                      });
                  }
              }
              if (mappedOrderItems.length > 0) {
                  await supabaseClient.from('order_items').insert(mappedOrderItems);
              }
          }
          processedEntities.push({ order_id: insertedOrder.id });
       }

    // NAVIGATION MENU LOOP
    } else if (entity_type === 'nav_menu') {
       for (const item of data) {
          const language_id = langMap.get('en') || 1;
          
          const insertMenuNode = async (node: any, parent_id: number | null, orderIdx: number) => {
              const { data: inserted, error } = await supabaseClient.from('navigation_items').insert({
                  language_id,
                  menu_key: item.slug,
                  label: node.title,
                  url: node.url,
                  parent_id: parent_id,
                  order: orderIdx
              }).select('id').single();

              if (!error && inserted && node.children) {
                  let childOrder = 0;
                  for (const child of node.children) {
                      await insertMenuNode(child, inserted.id, childOrder++);
                  }
              }
          };
          
          // Clear previous menus to avoid duplication
          await supabaseClient.from('navigation_items').delete().eq('menu_key', item.slug);
          
          let rootOrder = 0;
          for (const rootNode of item.tree) {
              await insertMenuNode(rootNode, null, rootOrder++);
          }
          
          processedEntities.push({ menu: item.slug });
       }
       
    // STANDARD POST/PRODUCT CONTENT STREAM
    } else {
       for (const item of data) {
          const language_id = langMap.get(item.translation?.iso_code) || langMap.get('en');

          // R2 Inline HTML Image Swap Engine
          let content_html = item.content_html || null;
          if (content_html && r2_config?.bucket) {
              const imgMatches = content_html.match(/src="([^"]+wp-content\/uploads[^"]+)"/g);
              if (imgMatches) {
                  for (const match of imgMatches) {
                      const url = match.replace('src="', '').replace('"', '');
                      const newUri = await processMediaUpload(url, r2_config);
                      if (newUri) {
                          content_html = content_html.split(url).join(newUri);
                      }
                  }
              }
          }

          // Featured Image Extraction & public.media mapping
          let feature_image_id = null;
          if (item.featured_image && r2_config?.bucket) {
             const new_featured_image_url = await processMediaUpload(item.featured_image, r2_config);
             if (new_featured_image_url) {
                 const { data: mediaRec } = await supabaseClient.from('media').insert({
                     file_name: new_featured_image_url.split('/').pop(),
                     file_path: new_featured_image_url,
                     mime_type: 'image/jpeg'
                 }).select('id').single();
                 if (mediaRec) feature_image_id = mediaRec.id;
             }
          }

          const author_id = item.author_email ? userEmailMap.get(item.author_email) || null : null;

          if (entity_type === 'post' || entity_type === 'page') {
            const baseData: any = {
              language_id: language_id,
              translation_group_id: item.translation?.translation_group_id,
              title: item.title,
              slug: item.slug,
              status: item.status,
              author_id: author_id,
              meta_title: item.seo?.meta_title || null,
              meta_description: item.seo?.meta_description || null,
              created_at: item.created_at,
              updated_at: item.updated_at,
            };

            // Posts specific fields
            if (entity_type === 'post') {
                baseData.excerpt = item.excerpt;
                baseData.published_at = item.published_at;
                baseData.feature_image_id = feature_image_id;
            }

            processedEntities.push(baseData);

          } else if (entity_type === 'product' || entity_type === 'product_variation') {
            const ecom = item.ecommerce;
            processedEntities.push({
              language_id: language_id,
              translation_group_id: item.translation?.translation_group_id,
              title: item.title,
              slug: item.slug,
              sku: ecom?.sku || `wp-sku-${item.id}`,
              price: ecom?.price ? Math.round(parseFloat(ecom.price) * 100) : 0,
              sale_price: ecom?.sale_price ? Math.round(parseFloat(ecom.sale_price) * 100) : null,
              stock: ecom?.stock_qty || 0,
              status: ecom?.stock_status === 'instock' ? 'active' : 'draft', 
              short_description: item.excerpt,
              description_json: { html: content_html }, 
              metadata: item.custom_meta,
              freemius_plan_id: ecom?.freemius_plan_id || null,
              freemius_product_id: ecom?.freemius_product_id || null,
              created_at: item.created_at,
              updated_at: item.updated_at,
            });
            // Note: If you want to support feature_image for product media, additional insert to product_media would go here.
          }
       }

       if (entity_type === 'post' || entity_type === 'page') {
          const tableName = entity_type === 'post' ? 'posts' : 'pages';
          
          // Deduplicate by language_id + slug to prevent ON CONFLICT DO UPDATE error
          const uniqueEntitiesMap = new Map();
          for (const entity of processedEntities) {
              // If a slug is empty, fallback to the post ID as slug to avoid empty slug collisions
              if (!entity.slug) {
                  entity.slug = `untitled-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              }
              const uniqueKey = `${entity.language_id}_${entity.slug}`;
              uniqueEntitiesMap.set(uniqueKey, entity);
          }
          const finalEntitiesToUpsert = Array.from(uniqueEntitiesMap.values());

          const { data: upsertedData, error: upsertErr } = await supabaseClient
             .from(tableName)
             .upsert(finalEntitiesToUpsert, { onConflict: 'language_id, slug' })
             .select('id, slug, language_id');
          
          if (upsertErr) {
             console.error(`Migration Failed for ${tableName}:`, upsertErr);
             throw upsertErr;
          }

          if (upsertedData) {
              const blocksToInsert = [];
              const upsertedIds = upsertedData.map((u: any) => u.id);
              if (upsertedIds.length > 0) {
                 await supabaseClient.from('blocks').delete().in(entity_type === 'post' ? 'post_id' : 'page_id', upsertedIds);
              }

              for (const item of data) {
                  const langId = langMap.get(item.translation?.iso_code) || langMap.get('en');
                  const dbRec = upsertedData.find((u: any) => u.slug === item.slug && u.language_id === langId);
                  
                  if (dbRec && item.content_html) {
                      blocksToInsert.push({
                          [entity_type === 'post' ? 'post_id' : 'page_id']: dbRec.id,
                          language_id: langId,
                          block_type: 'tiptap',
                          content: { html: item.content_html },
                          order: 0
                      });
                  }
              }

              if (blocksToInsert.length > 0) {
                  await supabaseClient.from('blocks').insert(blocksToInsert);
              }
          }
       } else if (entity_type === 'product' || entity_type === 'product_variation') {
          // Deduplicate by language_id + slug to prevent ON CONFLICT DO UPDATE error
          const uniqueEntitiesMap = new Map();
          for (const entity of processedEntities) {
              if (!entity.slug) {
                  entity.slug = `untitled-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
              }
              const uniqueKey = `${entity.language_id}_${entity.slug}`;
              uniqueEntitiesMap.set(uniqueKey, entity);
          }
          const finalEntitiesToUpsert = Array.from(uniqueEntitiesMap.values());

          result = await supabaseClient.from('products').upsert(finalEntitiesToUpsert, { onConflict: 'language_id, slug' });
       }
    }

    if (result && result.error) throw result.error;

    return new Response(JSON.stringify({ success: true, processed_count: processedEntities.length }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
