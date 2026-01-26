
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

import { S3Client, PutObjectCommand, HeadObjectCommand } from "@aws-sdk/client-s3";

// Load env vars from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('.env.local not found at', envPath);
}

// Helpers for R2
function getS3Client() {
  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint = process.env.R2_S3_ENDPOINT || (accountId ? `https://${accountId}.r2.cloudflarestorage.com` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    console.warn("Missing R2 Utils credentials. Skipping R2 checks.");
    return null;
  }

  return new S3Client({
    region: "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
  });
}

async function uploadToR2(s3: S3Client, bucket: string, key: string, filePath: string, contentType: string) {
  try {
    // Check if exists
    try {
      await s3.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
      console.log(`R2: Object "${key}" already exists.`);
      return;
    } catch (err: any) {
      if (err.name !== 'NotFound' && err.$metadata?.httpStatusCode !== 404) {
         throw err; 
      }
      // Not found, proceed to upload
    }

    if (!fs.existsSync(filePath)) {
        console.warn(`Local file not found for upload: ${filePath}`);
        return;
    }

    const fileBuffer = fs.readFileSync(filePath);
    await s3.send(new PutObjectCommand({
      Bucket: bucket,
      Key: key.startsWith('/') ? key.substring(1) : key, // R2 keys usually don't start with /
      Body: fileBuffer,
      ContentType: contentType,
    }));
    console.log(`R2: Uploaded "${key}" successfully.`);

  } catch (err: any) {
    console.error(`R2 Upload Error for ${key}:`, err.message);
  }
}

async function activateStore() {
  console.log('Activating store...');

  // 1. Check libs/ecommerce
  const ecommercePath = path.resolve(__dirname, '../../libs/ecommerce');
  if (!fs.existsSync(ecommercePath)) {
    console.error('libs/ecommerce not found! Please make sure the ecommerce library is present.');
    process.exit(1);
  }
  console.log('libs/ecommerce found.');

  // 2. Setup Supabase & R2
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const r2Bucket = process.env.R2_BUCKET_NAME || 'nextblock'; // Default or from env

  if (!supabaseUrl || !supabaseServiceKey) {
     console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) in .env.local');
     process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);
  const s3 = getS3Client();

  // 3. Get Default Language
  const { data: defaultLangData, error: langError } = await supabase
    .from('languages')
    .select('id, code')
    .eq('is_default', true)
    .single();

  let languages = defaultLangData;

  if (langError || !languages) {
    console.log('Could not find default language, trying "en"...');
    const { data: fallbackLang } = await supabase.from('languages').select('id, code').eq('code', 'en').single();
    if (!fallbackLang) {
       console.error('No default language or English language found. Cannot seed pages.');
       process.exit(1);
    }
    languages = fallbackLang;
  }
  
  const languageId = languages.id;
  console.log(`Using Language ID: ${languageId} (${languages.code})`);

  // 4. Definition of pages & required blocks
  const pages = [
    {
      title: 'Shop',
      slug: 'shop',
      status: 'published',
      requiredBlocks: [
        {
          block_type: 'product_grid',
          content: { type: 'latest' },
          order: 0,
          legacyType: 'product-grid' // Handle potential legacy typo in DB
        }
      ]
    },
    {
      title: 'Cart',
      slug: 'cart',
      status: 'published',
      requiredBlocks: [
        {
          block_type: 'cart',
          content: {},
          order: 0
        }
      ]
    },
    {
      title: 'Checkout',
      slug: 'checkout',
      status: 'published',
      requiredBlocks: [
        {
          block_type: 'checkout',
          content: {},
          order: 0
        }
      ]
    },
    {
      title: 'Default Product Layout',
      slug: 'product-template',
      status: 'published',
      requiredBlocks: [
        {
          block_type: 'product_details',
          content: {},
          order: 0
        },
        {
           block_type: 'heading',
           content: { level: 2, text_content: 'You might also like', textAlign: 'center' },
           order: 1
        },
        {
          block_type: 'product_grid',
          content: { type: 'latest', limit: 4 },
          order: 2
        }
      ]
    }
  ];

  // 5. Process pages
  for (const pageDef of pages) {
    // Check if page exists
    const { data: existingPage } = await supabase
      .from('pages')
      .select('id')
      .eq('slug', pageDef.slug)
      .eq('language_id', languageId)
      .single();

    let pageId;

    if (existingPage) {
      console.log(`Page "${pageDef.slug}" exists (ID: ${existingPage.id}). Checking blocks...`);
      pageId = existingPage.id;
    } else {
      // Create Page
      const newPage = {
          title: pageDef.title,
          slug: pageDef.slug,
          status: pageDef.status,
          language_id: languageId,
          translation_group_id: uuidv4(),
          meta_title: pageDef.title,
          meta_description: `${pageDef.title} page for Nextblock Store`
      };

      const { data: created, error } = await supabase
          .from('pages')
          .insert(newPage)
          .select('id')
          .single();

      if (error) {
        console.error(`Error creating "${pageDef.slug}":`, error.message);
        continue;
      } else {
        console.log(`Created "${pageDef.slug}" page (ID: ${created.id}).`);
        pageId = created.id;
      }
    }

    // Process Blocks
    if (pageId && pageDef.requiredBlocks.length > 0) {
        for (const blockDef of pageDef.requiredBlocks) {
            // Check for correct block
            const { data: existingBlocks } = await supabase
                .from('blocks')
                .select('*')
                .eq('page_id', pageId)
                .eq('block_type', blockDef.block_type);

            // Check for legacy block if defined
            if ('legacyType' in blockDef && blockDef.legacyType) {
                 const { data: legacyBlocks } = await supabase
                    .from('blocks')
                    .select('*')
                    .eq('page_id', pageId)
                    .eq('block_type', blockDef.legacyType);
                
                 if (legacyBlocks && legacyBlocks.length > 0) {
                     console.log(`Found legacy block "${blockDef.legacyType}" on ${pageDef.slug}. Fixing...`);
                     const { error: fixError } = await supabase
                        .from('blocks')
                        .update({ block_type: blockDef.block_type })
                        .eq('page_id', pageId)
                        .eq('block_type', blockDef.legacyType);
                    
                     if (fixError) console.error('Error fixing legacy block:', fixError.message);
                     else console.log('Legacy block fixed.');
                     
                     continue; // Block exists now (was fixed)
                 }
            }

            if (existingBlocks && existingBlocks.length > 0) {
                // Block exists
                console.log(`Block "${blockDef.block_type}" already exists on ${pageDef.slug}.`);
            } else {
                // Insert Block
                console.log(`Adding missing block "${blockDef.block_type}" to ${pageDef.slug}...`);
                const newBlock = {
                    page_id: pageId,
                    language_id: languageId,
                    block_type: blockDef.block_type,
                    content: blockDef.content,
                    order: blockDef.order
                };
                
                const { error: insertError } = await supabase.from('blocks').insert(newBlock);
                if (insertError) {
                    console.error(`Failed to insert block:`, insertError.message);
                } else {
                    console.log(`Inserted block.`);
                }
            }
        }
    }
  }

  // 6. Navigation: Add Shop link to HEADER if missing
  console.log('Checking navigation...');
  const shopPage = pages.find(p => p.slug === 'shop');
  if (shopPage) {
     // Retrieve the Shop Page ID again (in case it was just created)
     const { data: shopPageData } = await supabase
       .from('pages')
       .select('id')
       .eq('slug', 'shop')
       .eq('language_id', languageId)
       .single();

     if (shopPageData) {
        const { data: existingNav } = await supabase
           .from('navigation_items')
           .select('id')
           .eq('language_id', languageId)
           .eq('menu_key', 'HEADER')
           .eq('url', '/shop')
           .single();
        
        if (!existingNav) {
           console.log('Adding "Shop" link to navigation...');
           // Get max order to append
           const { data: maxOrderData } = await supabase
             .from('navigation_items')
             .select('order')
             .eq('language_id', languageId)
             .eq('menu_key', 'HEADER')
             .order('order', { ascending: false })
             .limit(1)
             .single();
             
           const nextOrder = (maxOrderData?.order ?? 0) + 1;

           const { error: navError } = await supabase
             .from('navigation_items')
             .insert({
                language_id: languageId,
                menu_key: 'HEADER',
                label: 'Shop',
                url: '/shop',
                order: nextOrder,
                page_id: shopPageData.id
             });
             
           if (navError) console.error('Error adding nav item:', navError.message);
           else console.log('Shop navigation link added.');
        } else {
           console.log('"Shop" navigation link already exists.');
        }
     }
  }

  // 7. French Support (Boutique)
  console.log('Checking French store setup...');
  const { data: frLang } = await supabase
    .from('languages')
    .select('id')
    .eq('code', 'fr')
    .single();

  if (frLang) {
      const frLangId = frLang.id;
      
      // Check/Create Boutique Page
      let boutiquePageId;
      const { data: existingBoutique } = await supabase
          .from('pages')
          .select('id')
          .eq('slug', 'boutique')
          .eq('language_id', frLangId)
          .single();

      if (existingBoutique) {
          boutiquePageId = existingBoutique.id;
          console.log('Page "boutique" exists.');
      } else {
          // Create Boutique Page
           const newPage = {
              title: 'Boutique',
              slug: 'boutique',
              status: 'published',
              language_id: frLangId,
              translation_group_id: uuidv4(),
              meta_title: 'Boutique',
              meta_description: 'Page boutique pour Nextblock'
          };
          const { data: created, error: createError } = await supabase
              .from('pages')
              .insert(newPage)
              .select('id')
              .single();
              
           if (createError) {
               console.error('Error creating boutique page:', createError.message);
           } else if (created) {
               boutiquePageId = created.id;
               console.log('Created "boutique" page.');
               
                // Add Product Grid Block
                await supabase.from('blocks').insert({
                    page_id: boutiquePageId,
                    language_id: frLangId,
                    block_type: 'product_grid',
                    content: { type: 'latest' },
                    order: 0
                });
           }
      }

      // Check Navigation
      if (boutiquePageId) {
           const { data: existingNav } = await supabase
           .from('navigation_items')
           .select('id')
           .eq('language_id', frLangId)
           .eq('menu_key', 'HEADER')
           .eq('url', '/boutique')
           .single();

           if (!existingNav) {
               console.log('Adding "Boutique" link to navigation...');
               // Get max order
               const { data: maxOrderData } = await supabase
                 .from('navigation_items')
                 .select('order')
                 .eq('language_id', frLangId)
                 .eq('menu_key', 'HEADER')
                 .order('order', { ascending: false })
                 .limit(1)
                 .single();
                 
               const nextOrder = (maxOrderData?.order ?? 0) + 1;

               const { error: navError } = await supabase
                 .from('navigation_items')
                 .insert({
                    language_id: frLangId,
                    menu_key: 'HEADER',
                    label: 'Boutique',
                    url: '/boutique',
                    order: nextOrder,
                    page_id: boutiquePageId
                 });
                 
               if (navError) console.error('Error adding FR nav item:', navError.message);
               else console.log('Boutique navigation link added.');
           } else {
               console.log('"Boutique" navigation link already exists.');
           }
      }
  }


  // 8. Seed Product: NextBlock CMS E-commerce Premium
  console.log('Seeding Product: NextBlock CMS E-commerce Premium...');
  const productSlug = 'nextblock-cms-ecommerce-premium';
  
  // A. Find an uploader (Admin)
  const { data: adminUser } = await supabase
      .from('profiles')
      .select('id')
      .eq('role', 'ADMIN')
      .limit(1)
      .single();
      
  const uploaderId = adminUser?.id; // Fallback to null (if allowed) or handle error
  
  if (uploaderId) {
      // B. Ensure Media Exists
      // Use clean key without leading slash for consistency
      const mediaKeyClean = 'images/NBcover.webp';
      const mediaKeyLegacy = '/images/NBcover.webp';
      let mediaId;
      
      // Check for existing media (try both keys)
      const { data: existingMedia } = await supabase
          .from('media')
          .select('id, file_path, object_key')
          .or(`object_key.eq.${mediaKeyClean},object_key.eq.${mediaKeyLegacy}`)
          .limit(1)
          .single();
          
      if (existingMedia) {
          mediaId = existingMedia.id;
          console.log(`Found existing media (ID: ${mediaId}).`);
          
          // Fix Missing file_path or wrong object_key if needed
          if (!existingMedia.file_path || existingMedia.object_key !== mediaKeyClean) {
              console.log('Updating media record with correct file_path and key...');
              await supabase
                  .from('media')
                  .update({ 
                      file_path: mediaKeyClean,
                      object_key: mediaKeyClean 
                  })
                  .eq('id', mediaId);
          }
      } else {
          // Create Media
          console.log('Creating media for product...');
          const newMediaId = uuidv4();
          const { error: mediaError } = await supabase.from('media').insert({
              id: newMediaId,
              uploader_id: uploaderId,
              file_name: 'NBcover.webp',
              object_key: mediaKeyClean,
              file_path: mediaKeyClean, // Critical for frontend URL resolution
              file_type: 'image/webp',
              size_bytes: 150000, 
              description: 'NextBlock Cover Image',
              folder: 'images'
          });
          
          if (mediaError) {
              console.error('Error creating media:', mediaError.message);
          } else {
              mediaId = newMediaId;
          }
      }

      // Sync to R2 (if S3 client available)
      if (s3) {
          console.log('Checking R2 for cover image...');
          const localPath = path.resolve(__dirname, '../../apps/nextblock/public/images/NBcover.webp');
          await uploadToR2(s3, r2Bucket, mediaKeyClean, localPath, 'image/webp');
      }

      // Sync to Supabase Storage (Critical for Frontend)
      console.log('Checking Supabase Storage for cover image...');
      const localPath = path.resolve(__dirname, '../../apps/nextblock/public/images/NBcover.webp');
      if (fs.existsSync(localPath)) {
          const fileBuffer = fs.readFileSync(localPath);
          const bucketName = 'media'; // Matches the bucket in URL construction
          
          // Ensure bucket exists
          const { data: buckets } = await supabase.storage.listBuckets();
          if (!buckets?.find(b => b.name === bucketName)) {
               console.log(`Creating public bucket "${bucketName}"...`);
               await supabase.storage.createBucket(bucketName, { public: true });
          }
          
          // Upload file
          // mediaKeyClean is 'images/NBcover.webp'
          const { error: uploadError } = await supabase.storage
              .from(bucketName)
              .upload(mediaKeyClean, fileBuffer, {
                  contentType: 'image/webp',
                  upsert: true
              });
              
          if (uploadError) {
              console.error('Supabase Storage Upload Error:', uploadError.message);
          } else {
              console.log(`Supabase Storage: Uploaded "${mediaKeyClean}" successfully.`);
          }
      } else {
          console.warn(`Local file not found: ${localPath}`);
      }
      
      // C. Ensure Product Exists
      if (mediaId) {
          const { data: existingProduct } = await supabase
              .from('products')
              .select('id')
              .eq('slug', productSlug)
              .single();
              
          if (!existingProduct) {
              console.log('Creating product...');
              const descriptionText = "NextBlock CMS E-commerce Premium. E-commerce is just the beginning and more projects are coming. This 1-year license (invitation through GitHub) grants you access to the premium repository features for $150/year. Support the development of the ultimate Next.js CMS.";
              
              const { data: newProduct, error: productError } = await supabase
                  .from('products')
                  .insert({
                      sku: 'NB-PREMIUM-001',
                      title: 'NextBlock CMS E-commerce Premium',
                      slug: productSlug,
                      price: 15000, // $150.00
                      status: 'active',
                      short_description: '1-Year License for NextBlock Premium features (GitHub Invitation).',
                      description_json: {
                          type: 'doc',
                          content: [
                              {
                                  type: 'paragraph',
                                  content: [{ type: 'text', text: descriptionText }]
                              }
                          ]
                      },
                      stock: 1000
                  })
                  .select('id')
                  .single();
                  
              if (productError) {
                  console.error('Error creating product:', productError.message);
              } else if (newProduct) {
                  console.log('Product created.');
                  
                  // D. Link Media 1 (Use original media)
                  const { error: linkError } = await supabase
                      .from('product_media')
                      .insert({
                          product_id: newProduct.id,
                          media_id: mediaId,
                          sort_order: 0
                      });
                      
                  if (linkError) console.error('Error linking media 1:', linkError.message);
                  else console.log('Product media 1 linked.');

                  // E. Create and Link Media 2 (Reuse same file, new media record for demo)
                   const mediaId2 = uuidv4();
                   const { error: mediaError2 } = await supabase.from('media').insert({
                        id: mediaId2,
                        uploader_id: uploaderId,
                        file_name: 'NBcover-alt.webp',
                        object_key: mediaKeyClean, // Point to same file
                        file_path: mediaKeyClean, 
                        file_type: 'image/webp',
                        size_bytes: 150000, 
                        description: 'NextBlock Cover Image Alt',
                        folder: 'images'
                   });

                   if (!mediaError2) {
                        const { error: linkError2 } = await supabase
                            .from('product_media')
                            .insert({
                                product_id: newProduct.id,
                                media_id: mediaId2,
                                sort_order: 1
                            });
                         if (linkError2) console.error('Error linking media 2:', linkError2.message);
                         else console.log('Product media 2 linked (Gallery).');
                   }
              }
          } else {
              console.log('Product already exists.');
          }
      }
  } else {
      console.warn('No Admin user found. Skipping product seeding (need uploader_id for media).');
  }

  console.log('Store activation complete.');
}

activateStore();
