import { NextRequest, NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, DeleteObjectsCommand, PutObjectCommand } from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import { syncFreemiusProductsToSupabase } from '@nextblock-cms/ecommerce/server';
import postgres from 'postgres';
import { SANDBOX_RESET_SQL } from './sandboxResetSql';

export const dynamic = 'force-dynamic';
// Increase max duration for Vercel/Next.js (optional, but good for heavy ops)
export const maxDuration = 60; 

export async function GET(request: NextRequest) {
  // 1. Guard: Only run in Sandbox Mode
  if (process.env.NEXT_PUBLIC_IS_SANDBOX !== 'true') {
    return NextResponse.json({ message: 'Sandbox reset skipped: Not in Sandbox Mode' });
  }

  // 2. Guard: Verify Cron Secret
  const authHeader = request.headers.get('authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', {
      status: 401,
    });
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  // R2 Config
  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;
  // Prioritize canonical URL for Vercel production to bypass internal deployment protections
  let siteUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin;
  
  // If local development, defer to the actual request host origin to prevent 3000/4200 port mismatches
  if (siteUrl && siteUrl.includes('localhost:') && request.nextUrl.origin.includes('localhost:')) {
    siteUrl = request.nextUrl.origin;
  }
  if (siteUrl && !siteUrl.startsWith('http')) {
    siteUrl = `https://${siteUrl}`;
  }
  if (siteUrl && siteUrl.endsWith('/')) {
    siteUrl = siteUrl.slice(0, -1);
  }

  if (!supabaseUrl || !supabaseServiceKey || !r2AccountId || !r2AccessKeyId || !r2SecretAccessKey || !r2BucketName || !siteUrl) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

  // Initialize Clients
  const s3 = new S3Client({
    region: 'auto',
    endpoint: `https://${r2AccountId}.r2.cloudflarestorage.com`,
    credentials: {
      accessKeyId: r2AccessKeyId,
      secretAccessKey: r2SecretAccessKey,
    },
  });

  try {
    console.log('[Sandbox Reset] Starting Hard Reset...');

    // 3. Wipe R2 Storage
    console.log('[Sandbox Reset] Wiping R2 Bucket...');
    let continuationToken: string | undefined;
    do {
      const listCmd = new ListObjectsV2Command({
        Bucket: r2BucketName,
        ContinuationToken: continuationToken,
      });
      const listRes = await s3.send(listCmd);
      
      if (listRes.Contents && listRes.Contents.length > 0) {
        const objectsToDelete = listRes.Contents.map((obj) => ({ Key: obj.Key }));
        await s3.send(new DeleteObjectsCommand({
          Bucket: r2BucketName,
          Delete: { Objects: objectsToDelete }
        }));
        console.log(`[Sandbox Reset] Deleted ${objectsToDelete.length} objects.`);
      }
      
      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    // 4. Fetch & Upload Assets (Deterministic Naming)
    console.log('[Sandbox Reset] Fetching and re-seeding assets...');
    const assetsToSeed = [
      { source: 'images/nextblock-logo-small.webp', dest: 'images/nextblock-logo-small.webp' },
      { source: 'images/goals.webp', dest: 'images/goals.webp' },
      { source: 'images/programmer-upscaled.webp', dest: 'images/programmer-upscaled.webp' },
      { source: 'images/commerce-square.webp', dest: 'images/commerce-square.webp' },
    ];

    for (const asset of assetsToSeed) {
      const fetchUrl = `${siteUrl}/${asset.source}`;
      console.log(`[Sandbox Reset] Fetching ${fetchUrl}...`);
      
      const res = await fetch(fetchUrl);
      if (!res.ok) {
        throw new Error(`Failed to fetch asset: ${fetchUrl} (${res.status})`);
      }
      
      const buffer = Buffer.from(await res.arrayBuffer());
      
      await s3.send(new PutObjectCommand({
        Bucket: r2BucketName,
        Key: asset.dest,
        Body: buffer,
        ContentType: 'image/webp',
      }));
      console.log(`[Sandbox Reset] Uploaded ${asset.dest}`);
    }

    // 5. Reset Database
    console.log('[Sandbox Reset] Resetting Database...');
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!dbUrl) throw new Error('Missing POSTGRES_URL environment variable');
    
    // Connect directly via standard Postgres driver to bypass Supabase schema restrictions
    const db = postgres(dbUrl, { ssl: 'require' });
    try {
      await db.unsafe(SANDBOX_RESET_SQL);
      console.log('[Sandbox Reset] Database re-seeded successfully.');
    } catch (dbError: any) {
      console.error('[Sandbox Reset] DB Error:', dbError);
      return NextResponse.json({ error: dbError.message || String(dbError) }, { status: 200 });
    } finally {
      // We'll keep the connection open for post-sync enrichment
      // await db.end();
    }

    // 6. Pre-activate Premium Packages
    console.log('[Sandbox Reset] Pre-activating premium packages...');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    if (process.env.FREEMIUS_ECOMMERCE_SANDBOX_KEY) {
      const { error: activationError } = await supabaseAdmin.from('package_activations').insert({
        package_id: 'ecommerce',
        license_key: process.env.FREEMIUS_ECOMMERCE_SANDBOX_KEY,
        status: 'active',
        instance_name: siteUrl,
      });
      
      if (activationError) {
        console.error('[Sandbox Reset] Failed to activate ecommerce package:', activationError.message);
      } else {
        console.log('[Sandbox Reset] Successfully activated ecommerce package.');
        
        // Dynamically populate the store with Freemius products
        try {
          console.log('[Sandbox Reset] Syncing products from Freemius...');
          const syncRes = await syncFreemiusProductsToSupabase();
          console.log(`[Sandbox Reset] Synced ${syncRes?.count || 0} products.`);

          // Post-sync enrichment: Add image and rich description to the Commerce Pro product
          try {
            console.log('[Sandbox Reset] Enriching NextBlock Commerce Pro...');
            const commerceLogoKey = 'images/commerce-square.webp';
            
            // 0. Get language IDs
            const [enLangRaw] = await db`SELECT id FROM public.languages WHERE code = 'en' LIMIT 1`;
            const [frLangRaw] = await db`SELECT id FROM public.languages WHERE code = 'fr' LIMIT 1`;
            const enLangId = enLangRaw?.id;
            const frLangId = frLangRaw?.id;

            // 1. Ensure media record exists for the seeded asset
            const [mediaRecord] = await db`
              INSERT INTO public.media (file_name, object_key, file_path, file_type, size_bytes)
              VALUES ('commerce-square.webp', ${commerceLogoKey}, ${commerceLogoKey}, 'image/webp', 1651652)
              ON CONFLICT (object_key) DO UPDATE SET file_path = EXCLUDED.file_path
              RETURNING id
            `;

            // 2. Find the synced product (NextBlock Commerce Pro)
            const [product] = await db`
              SELECT * FROM public.products 
              WHERE freemius_product_id = '24851' AND language_id = ${enLangId}
              LIMIT 1
            `;

            if (product && mediaRecord) {
              // 3. Link media to English product
              await db`
                INSERT INTO public.product_media (product_id, media_id, sort_order)
                VALUES (${product.id}, ${mediaRecord.id}, 0)
                ON CONFLICT (product_id, media_id) DO NOTHING
              `;

              // 4. Update English descriptions
              const shortDescEn = "NextBlock Ecommerce is an AI-native, block-based storefront engine for Next.js. Featuring a premium, developer-first aesthetic and high-performance edge rendering.";
              
              const htmlDescriptionEn = {
                type: "doc",
                content: [
                  {
                    type: "heading",
                    attrs: { level: 2 },
                    content: [{ type: "text", text: "🚀 The Future of Digital Commerce" }]
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "NextBlock Ecommerce bridges the gap between high-performance headless architecture and intuitive visual editing. Built on the NextBlock Performance Stack (NPS), it leverages Next.js 15/16, Supabase, and Tailwind CSS to deliver sub-millisecond latency and a seamless \"Vibe Coding\" experience."
                      }
                    ]
                  },
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "🎨 Notion-Style Editor" }]
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Stop fighting with complex backends. Our Tiptap-powered editor provides a familiar, block-based interface that allows you to build stunning product pages as easily as writing a document."
                      }
                    ]
                  },
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "🛡️ Secure by Design" }]
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "Integrated with Freemius for cryptographic licensing and recurring billing. Features dual-layer payment strategy with Lemon Squeezy MoR and native Stripe support."
                      }
                    ]
                  },
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "Key Technical Specs" }]
                  },
                  {
                    type: "bulletList",
                    content: [
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [{ type: "text", text: "⚡ ISR & Edge Caching: Sub-millisecond Time to First Byte (TTFB) globally." }]
                          }
                        ]
                      },
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [{ type: "text", text: "📦 Nx Monorepo: Strictly decoupled architecture for ultimate scalability and code-splitting." }]
                          }
                        ]
                      },
                      {
                        type: "listItem",
                        content: [
                          {
                            type: "paragraph",
                            content: [{ type: "text", text: "🖼️ AVIF Optimization: 20% smaller media payloads with native Next.js Image component integration." }]
                          }
                        ]
                      }
                    ]
                  },
                  {
                    type: "heading",
                    attrs: { level: 3 },
                    content: [{ type: "text", text: "Ready for the \"Vibe Coding\" Era" }]
                  },
                  {
                    type: "paragraph",
                    content: [
                      {
                        type: "text",
                        text: "NextBlock is built from the ground up to be extendable by AI Agents. Whether you're using Claude, v0, or custom GPTs, our highly typed Block SDK and Zod schema validations ensure every extension stays robust and secure."
                      }
                    ]
                  }
                ]
              };

              await db`
                UPDATE public.products 
                SET short_description = ${shortDescEn}, 
                    description_json = ${db.json(htmlDescriptionEn)}
                WHERE id = ${product.id}
              `;

              // 5. Create French Version
              if (frLangId) {
                console.log('[Sandbox Reset] Creating French version of NextBlock Commerce Pro...');
                
                const shortDescFr = "NextBlock Ecommerce est un moteur de boutique basé sur des blocs et natif de l'IA pour Next.js. Doté d'une esthétique premium et d'un rendu edge haute performance.";
                
                const htmlDescriptionFr = {
                  type: "doc",
                  content: [
                    {
                      type: "heading",
                      attrs: { level: 2 },
                      content: [{ type: "text", text: "🚀 Le futur du commerce numérique" }]
                    },
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "NextBlock Ecommerce comble le fossé entre l'architecture headless haute performance et l'édition visuelle intuitive. Construit sur la NextBlock Performance Stack (NPS), il exploite Next.js 15/16, Supabase et Tailwind CSS pour offrir une latence de moins d'une milliseconde."
                        }
                      ]
                    },
                    {
                      type: "heading",
                      attrs: { level: 3 },
                      content: [{ type: "text", text: "🎨 Éditeur style Notion" }]
                    },
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Arrêtez de vous battre avec des backends complexes. Notre éditeur propulsé par Tiptap offre une interface familière basée sur des blocs qui vous permet de créer de superbes pages produits aussi facilement qu'un document."
                        }
                      ]
                    },
                    {
                      type: "heading",
                      attrs: { level: 3 },
                      content: [{ type: "text", text: "🛡️ Sécurisé par conception" }]
                    },
                    {
                      type: "paragraph",
                      content: [
                        {
                          type: "text",
                          text: "Intégré avec Freemius pour les licences cryptographiques et la facturation récurrente. Stratégie de paiement à double couche avec Lemon Squeezy MoR et support natif Stripe."
                        }
                      ]
                    },
                    {
                      type: "heading",
                      attrs: { level: 3 },
                      content: [{ type: "text", text: "Spécifications techniques clés" }]
                    },
                    {
                      type: "bulletList",
                      content: [
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [{ type: "text", text: "⚡ ISR & Mise en cache Edge : Temps de premier octet (TTFB) inférieur à la milliseconde." }]
                            }
                          ]
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [{ type: "text", text: "📦 Monorepo Nx : Architecture strictement découplée pour une évolutivité ultime." }]
                            }
                          ]
                        },
                        {
                          type: "listItem",
                          content: [
                            {
                              type: "paragraph",
                              content: [{ type: "text", text: "🖼️ Optimisation AVIF : Payloads média 20 % plus petits avec Next.js Image." }]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                };

                const [frProduct] = await db`
                  INSERT INTO public.products (
                    sku, title, slug, price, sale_price, stock, status, 
                    short_description, description_json, 
                    language_id, translation_group_id,
                    freemius_product_id, freemius_plan_id
                  )
                  VALUES (
                    ${product.sku + '-fr'}, 'NextBlock Commerce Pro', ${product.slug + '-fr'}, 
                    ${product.price}, ${product.sale_price}, ${product.stock}, ${product.status},
                    ${shortDescFr}, ${db.json(htmlDescriptionFr)},
                    ${frLangId}, ${product.translation_group_id},
                    ${product.freemius_product_id}, ${product.freemius_plan_id}
                  )
                  ON CONFLICT ON CONSTRAINT products_language_id_slug_key DO UPDATE SET title = EXCLUDED.title
                  RETURNING id
                `;

                if (frProduct) {
                   await db`
                    INSERT INTO public.product_media (product_id, media_id, sort_order)
                    VALUES (${frProduct.id}, ${mediaRecord.id}, 0)
                    ON CONFLICT (product_id, media_id) DO NOTHING
                  `;
                }
              }
              console.log('[Sandbox Reset] Successfully enriched commerce products (EN & FR).');
            }


            // 6. Add Shop Pages & Navigation Items
            console.log('[Sandbox Reset] Adding Shop Pages and navigation items...');
            let globalShopGroupId: string | undefined;
            
            if (enLangId) {
              const langId = enLangId;
              
              // Insert Page
              const [existingPage] = await db`SELECT id, translation_group_id FROM public.pages WHERE language_id = ${langId} AND slug = 'shop'`;
              let pageId = existingPage?.id;
              globalShopGroupId = existingPage?.translation_group_id;
              
              if (!pageId) {
                const [newPage] = await db`
                  INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description)
                  VALUES (${langId}, 'Shop Our Products', 'shop', 'published', 'NextBlock Store', 'Browse our premium products')
                  RETURNING id, translation_group_id
                `;
                pageId = newPage.id;
                globalShopGroupId = newPage?.translation_group_id;

                const heroContent = {
                  container_type: "full-width",
                  background: {
                    type: "theme",
                    theme: "primary"
                  },
                  responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
                  column_gap: "lg",
                  padding: { top: "xl", bottom: "xl" },
                  vertical_alignment: "center",
                  column_blocks: [
                    [
                      {
                        block_type: "heading",
                        content: {
                          level: 1,
                          text_content: "NextBlock Store",
                          textAlign: "center",
                          textColor: "background"
                        }
                      },
                      {
                        block_type: "text",
                        content: {
                          html_content: "<p style=\"text-align: center; color: var(--background); opacity: 0.9\">Discover our premium selection of developer tools and digital commerce solutions.</p>"
                        }
                      }
                    ]
                  ]
                };

                const sectionContent = {
                  container_type: "container",
                  background: { type: "none" },
                  responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
                  column_gap: "none",
                  padding: { top: "xl", bottom: "xl" },
                  column_blocks: [
                    [
                      {
                        block_type: "heading",
                        content: {
                          level: 2,
                          text_content: "Featured Products",
                          textAlign: "center"
                        }
                      },
                      {
                        block_type: "product_grid",
                        content: {
                          type: "latest",
                          limit: 6
                        }
                      }
                    ]
                  ]
                };

                await db`
                  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
                  VALUES 
                  (${pageId}, ${langId}, 'hero', ${db.json(heroContent as any)}, 0),
                  (${pageId}, ${langId}, 'section', ${db.json(sectionContent as any)}, 1)
                `;
              }

              const [exists] = await db`SELECT id FROM public.navigation_items WHERE language_id = ${langId} AND url = '/shop'`;
              if (!exists) {
                await db`
                  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order")
                  VALUES (${langId}, 'HEADER', 'Shop', '/shop', 2)
                `;
              }
            }

            if (frLangId) {
              const langId = frLangId;

              // Insert French Page (keep slug 'boutique' matching original nav link)
              const [existingPage] = await db`SELECT id FROM public.pages WHERE language_id = ${langId} AND slug = 'boutique'`;
              let pageId = existingPage?.id;
              
              if (!pageId) {
                const [newPage] = await db`
                  INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description, translation_group_id)
                  VALUES (${langId}, 'Boutique en Ligne', 'boutique', 'published', 'Boutique NextBlock', 'Découvrez nos produits premium', ${globalShopGroupId ?? null})
                  RETURNING id
                `;
                pageId = newPage.id;

                const heroContent = {
                  container_type: "full-width",
                  background: {
                    type: "theme",
                    theme: "primary"
                  },
                  responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
                  column_gap: "lg",
                  padding: { top: "xl", bottom: "xl" },
                  vertical_alignment: "center",
                  column_blocks: [
                    [
                      {
                        block_type: "heading",
                        content: {
                          level: 1,
                          text_content: "Boutique NextBlock",
                          textAlign: "center",
                          textColor: "background"
                        }
                      },
                      {
                        block_type: "text",
                        content: {
                          html_content: "<p style=\"text-align: center; color: var(--background); opacity: 0.9\">Découvrez notre sélection premium d'outils de développement.</p>"
                        }
                      }
                    ]
                  ]
                };

                const sectionContent = {
                  container_type: "container",
                  background: { type: "none" },
                  responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
                  column_gap: "none",
                  padding: { top: "xl", bottom: "xl" },
                  column_blocks: [
                    [
                      {
                        block_type: "heading",
                        content: {
                          level: 2,
                          text_content: "Produits Vedettes",
                          textAlign: "center"
                        }
                      },
                      {
                        block_type: "product_grid",
                        content: {
                          type: "latest",
                          limit: 6
                        }
                      }
                    ]
                  ]
                };

                await db`
                  INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
                  VALUES 
                  (${pageId}, ${langId}, 'hero', ${db.json(heroContent as any)}, 0),
                  (${pageId}, ${langId}, 'section', ${db.json(sectionContent as any)}, 1)
                `;
              }

              const [exists] = await db`SELECT id FROM public.navigation_items WHERE language_id = ${langId} AND url = '/boutique'`;
              if (!exists) {
                await db`
                  INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order")
                  VALUES (${langId}, 'HEADER', 'Boutique', '/boutique', 2)
                `;
              }
            }
            console.log('[Sandbox Reset] Successfully created Shop pages and navigation.');
          } catch (enrichErr: any) {
            console.error('[Sandbox Reset] Product enrichment failed:', enrichErr.message || enrichErr);
          }
        } catch (syncErr: any) {
          console.error('[Sandbox Reset] Failed to sync Freemius products:', syncErr.message || syncErr);
        }
      }
    }
    
    // Cleanup DB connection
    await db.end();

    // Extensibility: AI Agents package (uncomment and update when released)
    // if (process.env.FREEMIUS_AI_SANDBOX_KEY) {
    //   const { error: aiActivationError } = await supabaseAdmin.from('package_activations').insert({
    //     package_id: 'ai-agents',
    //     license_key: process.env.FREEMIUS_AI_SANDBOX_KEY,
    //     status: 'active',
    //     instance_name: siteUrl,
    //   });
    //   
    //   if (aiActivationError) {
    //     console.error('[Sandbox Reset] Failed to activate ai-agents package:', aiActivationError.message);
    //   } else {
    //     console.log('[Sandbox Reset] Successfully activated ai-agents package.');
    //   }
    // }

    console.log('[Sandbox Reset] Complete.');
    return NextResponse.json({ success: true, message: 'Sandbox hard reset completed successfully' });
  } catch (err: any) {
    console.error('[Sandbox Reset] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error', stack: err.stack }, { status: 200 });
  }
}
