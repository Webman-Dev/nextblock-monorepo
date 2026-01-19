
import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import * as dotenv from 'dotenv';

// Load env vars from .env.local
const envPath = path.resolve(__dirname, '../../.env.local');
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  console.warn('.env.local not found at', envPath);
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

  // 2. Setup Supabase
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseServiceKey) {
     console.error('Missing Supabase credentials (NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY) in .env.local');
     process.exit(1);
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey);

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

  console.log('Store activation complete.');
}

activateStore();
