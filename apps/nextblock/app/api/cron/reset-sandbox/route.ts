import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';
import {
  DeleteObjectsCommand,
  ListObjectsV2Command,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { createClient } from '@supabase/supabase-js';
import {
  syncFreemiusProductsToSupabase,
  syncSingleFreemiusProduct,
} from '@nextblock-cms/ecommerce/server';
import postgres from 'postgres';

import { CORTEX_AI_PACKAGE_ID } from '../../../../lib/ai-config';
import { SANDBOX_RESET_SQL } from './sandboxResetSql';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

type SqlClient = postgres.Sql<Record<string, unknown>>;
type LanguageId = number | string;
type SizeSlug = 'small' | 'medium' | 'large';

type SeedAsset = {
  source: string;
  dest: string;
  fileName: string;
  contentType: string;
  description?: string;
};

type UploadedSeedAsset = SeedAsset & {
  sizeBytes: number;
};

type MediaStorageRow = {
  id: string;
  object_key: string;
  file_path: string | null;
};

type DescriptionContent = {
  headline: string;
  lead: string;
  whyHeading: string;
  whyParagraph: string;
  bullets: string[];
};

type SeededLocale = {
  title: string;
  slug: string;
  shortDescription: string;
  description: DescriptionContent;
};

type ApparelProductSeed = {
  imageKey: string;
  baseSku: string;
  price: number;
  variantStocks: Record<SizeSlug, number>;
  en: SeededLocale;
  fr: SeededLocale;
};

const SANDBOX_COMMERCE_PRODUCT_ID = '24851';
const SANDBOX_CORTEX_AI_PRODUCT_ID = '28609';

const SEEDED_ASSETS: SeedAsset[] = [
  {
    source: 'images/nextblock-logo-small.webp',
    dest: 'images/nextblock-logo-small.webp',
    fileName: 'nextblock-logo-small.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ logo.',
  },
  {
    source: 'images/goals.webp',
    dest: 'images/goals.webp',
    fileName: 'goals.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: goals illustration.',
  },
  {
    source: 'images/NBcover.webp',
    dest: 'images/NBcover.webp',
    fileName: 'NBcover.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ architecture cover image.',
  },
  {
    source: 'images/extensibility.webp',
    dest: 'images/extensibility.webp',
    fileName: 'extensibility.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ extensibility editorial artwork.',
  },
  {
    source: 'images/included.webp',
    dest: 'images/included.webp',
    fileName: 'included.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ getting-started platform artwork.',
  },
  {
    source: 'images/programmer-upscaled.webp',
    dest: 'images/programmer-upscaled.webp',
    fileName: 'programmer-upscaled.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: programmer hero image.',
  },
  {
    source: 'images/commerce-plan.webp',
    dest: 'images/commerce-plan.webp',
    fileName: 'commerce-plan.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ commerce roadmap artwork.',
  },
  {
    source: 'images/commerce-square.webp',
    dest: 'images/commerce-square.webp',
    fileName: 'commerce-square.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: Commerce Pro cover image.',
  },
  {
    source: 'images/commerce-wide.webp',
    dest: 'images/commerce-wide.webp',
    fileName: 'commerce-wide.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ Commerce editorial feature image.',
  },
  {
    source: 'images/t-shirt.webp',
    dest: 'images/t-shirt.webp',
    fileName: 't-shirt.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ Studio Tee.',
  },
  {
    source: 'images/cap.webp',
    dest: 'images/cap.webp',
    fileName: 'cap.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ Signal Cap.',
  },
  {
    source: 'images/pants.webp',
    dest: 'images/pants.webp',
    fileName: 'pants.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: NextBlock™ Utility Pants.',
  },
  {
    source: 'images/cortex-ai-square.webp',
    dest: 'images/cortex-ai-square.webp',
    fileName: 'cortex-ai-square.webp',
    contentType: 'image/webp',
    description: 'Sandbox seed asset: Cortex AI cover image.',
  },
];

const SIZE_TERM_DEFINITIONS: Array<{
  slug: SizeSlug;
  value: string;
  sortOrder: number;
  frValue: string;
}> = [
  { slug: 'small', value: 'Small', sortOrder: 0, frValue: 'Petit' },
  { slug: 'medium', value: 'Medium', sortOrder: 1, frValue: 'Moyen' },
  { slug: 'large', value: 'Large', sortOrder: 2, frValue: 'Grand' },
];

const CORE_MEDIA_RECORDS: Array<{
  assetKey: string;
  description?: string | null;
}> = [
  {
    assetKey: 'images/nextblock-logo-small.webp',
    description: 'NextBlock™ Site Logo',
  },
  {
    assetKey: 'images/NBcover.webp',
    description: 'NextBlock™ architecture overview cover image',
  },
  {
    assetKey: 'images/extensibility.webp',
    description: 'NextBlock™ extensibility editorial artwork',
  },
  {
    assetKey: 'images/included.webp',
    description: 'NextBlock™ getting-started platform artwork',
  },
  {
    assetKey: 'images/programmer-upscaled.webp',
    description: undefined,
  },
  {
    assetKey: 'images/commerce-plan.webp',
    description: 'NextBlock™ commerce roadmap artwork',
  },
  {
    assetKey: 'images/commerce-wide.webp',
    description: 'NextBlock™ Commerce editorial feature image',
  },
  {
    assetKey: 'images/cortex-ai-square.webp',
    description: 'NextBlock™ Cortex AI cover image',
  },
];

function getFolderFromObjectKey(objectKey: string) {
  return objectKey.includes('/') ? objectKey.slice(0, objectKey.lastIndexOf('/')) : null;
}

function buildStructuredDescription(content: DescriptionContent) {
  return {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: content.headline }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: content.lead }],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: content.whyHeading }],
      },
      {
        type: 'paragraph',
        content: [{ type: 'text', text: content.whyParagraph }],
      },
      {
        type: 'bulletList',
        content: content.bullets.map((bullet) => ({
          type: 'listItem',
          content: [
            {
              type: 'paragraph',
              content: [{ type: 'text', text: bullet }],
            },
          ],
        })),
      },
    ],
  };
}

const APPAREL_PRODUCT_SEEDS: ApparelProductSeed[] = [
  {
    imageKey: 'images/t-shirt.webp',
    baseSku: 'NB-STUDIO-TEE',
    price: 3200,
    variantStocks: { small: 8, medium: 12, large: 6 },
    en: {
      title: 'NextBlock™ Studio Tee',
      slug: 'nextblock-studio-tee',
      shortDescription:
        'A heavyweight studio tee built for long build sessions, late launches, and every quiet hour between.',
      description: {
        headline: 'Studio uniform for shipping days',
        lead:
          'The NextBlock™ Studio Tee is cut from premium heavyweight cotton with a clean silhouette that feels equally at home in a workshop, a coworking space, or a midnight deployment window.',
        whyHeading: 'Why it works',
        whyParagraph:
          'Soft structure, durable fabric, and a relaxed drape make it the kind of shirt you reach for when the work matters and comfort has to keep up.',
        bullets: [
          'Heavyweight cotton feel with an easy everyday fit.',
          'Clean visual profile that pairs well with any setup.',
          'Built to stay comfortable through long build-and-debug sessions.',
        ],
      },
    },
    fr: {
      title: 'T-shirt Studio NextBlock™',
      slug: 'nextblock-studio-tee-fr',
      shortDescription:
        'Un t-shirt lourd et confortable pense pour les longues sessions de build, les lancements tardifs et les jours ou il faut rester dans le flow.',
      description: {
        headline: 'L uniforme du studio pour les jours de livraison',
        lead:
          'Le T-shirt Studio NextBlock™ mise sur un coton epais, une ligne propre et une allure simple qui fonctionne autant au bureau qu en session de production tardive.',
        whyHeading: 'Pourquoi ca marche',
        whyParagraph:
          'Sa matiere robuste et sa coupe detendue offrent un bon equilibre entre maintien, confort et style discret pour les longues journees de travail.',
        bullets: [
          'Toucher coton epais avec une coupe facile a porter.',
          'Silhouette nette qui reste propre dans tous les contextes.',
          'Concu pour garder le confort pendant les longues sessions de build.',
        ],
      },
    },
  },
  {
    imageKey: 'images/cap.webp',
    baseSku: 'NB-SIGNAL-CAP',
    price: 2600,
    variantStocks: { small: 6, medium: 10, large: 6 },
    en: {
      title: 'NextBlock™ Signal Cap',
      slug: 'nextblock-signal-cap',
      shortDescription:
        'A clean everyday cap with subtle techwear energy and just enough structure to finish a sharp off-duty kit.',
      description: {
        headline: 'Low-key signal, strong presence',
        lead:
          'The NextBlock™ Signal Cap brings a crisp shape and understated studio aesthetic to the kind of everyday accessory that quietly pulls an outfit together.',
        whyHeading: 'Why it works',
        whyParagraph:
          'It keeps the look restrained, modern, and wearable while still feeling intentional enough to stand out in the details.',
        bullets: [
          'Structured profile with an easy all-day feel.',
          'Minimal visual language inspired by modern dev studios.',
          'Simple finishing piece for travel, work, or weekend runs.',
        ],
      },
    },
    fr: {
      title: 'Casquette Signal NextBlock™',
      slug: 'nextblock-signal-cap-fr',
      shortDescription:
        'Une casquette nette et facile a porter, avec une presence sobre et un esprit techwear leger pour tous les jours.',
      description: {
        headline: 'Un signal discret, une vraie allure',
        lead:
          'La Casquette Signal NextBlock™ apporte une forme propre et une estetique studio minimaliste a un accessoire du quotidien qui complete la tenue sans effort.',
        whyHeading: 'Pourquoi ca marche',
        whyParagraph:
          'Elle garde un style moderne, simple et portable tout en donnant assez de caractere pour finir une tenue avec intention.',
        bullets: [
          'Profil structure avec un confort facile toute la journee.',
          'Langage visuel minimal inspire des studios de dev modernes.',
          'Piece simple pour le travail, les deplacements ou le week-end.',
        ],
      },
    },
  },
  {
    imageKey: 'images/pants.webp',
    baseSku: 'NB-UTILITY-PANTS',
    price: 6800,
    variantStocks: { small: 5, medium: 8, large: 5 },
    en: {
      title: 'NextBlock™ Utility Pants',
      slug: 'nextblock-utility-pants',
      shortDescription:
        'Tapered utility pants designed for commute-to-keyboard days, with an easy fit that still feels sharp.',
      description: {
        headline: 'Utility comfort with a refined line',
        lead:
          'The NextBlock™ Utility Pants balance movement, structure, and a clean tapered cut so you can move from city errands to keyboard time without changing the tone.',
        whyHeading: 'Why it works',
        whyParagraph:
          'They are practical enough for all-day wear but polished enough to feel intentional, making them an easy anchor piece for a modern work uniform.',
        bullets: [
          'Tapered silhouette that stays neat without feeling tight.',
          'Comfort-first construction for long seated sessions.',
          'Versatile styling that fits both commute and studio rhythms.',
        ],
      },
    },
    fr: {
      title: 'Pantalon utilitaire NextBlock™',
      slug: 'nextblock-utility-pants-fr',
      shortDescription:
        'Un pantalon utilitaire a la coupe fuselee pense pour les trajets, les longues heures au clavier et les journees ou il faut rester mobile.',
      description: {
        headline: 'Le confort utilitaire avec une ligne soignee',
        lead:
          'Le Pantalon utilitaire NextBlock™ equilibre mobilite, maintien et coupe fuselee pour suivre le rythme entre les deplacements, le studio et les longues sessions de travail.',
        whyHeading: 'Pourquoi ca marche',
        whyParagraph:
          'Il reste assez pratique pour etre porte toute la journee tout en gardant une allure propre, ce qui en fait une base facile pour une garde-robe de travail moderne.',
        bullets: [
          'Silhouette fuselee nette sans sensation trop serree.',
          'Construction orientee confort pour les longues sessions assises.',
          'Style polyvalent pour le trajet, le studio et le quotidien.',
        ],
      },
    },
  },
];

async function uploadSeedAssets(params: {
  s3: S3Client;
  bucketName: string;
  siteUrl: string;
}) {
  const uploadedAssets = new Map<string, UploadedSeedAsset>();

  for (const asset of SEEDED_ASSETS) {
    let buffer: Buffer | undefined;
    const fetchUrl = `${params.siteUrl}/${asset.source}`;

    // Optimization: If fetching from localhost, try to read from disk first to avoid ECONNRESET
    if (fetchUrl.includes('localhost') || fetchUrl.includes('127.0.0.1')) {
      try {
        const localPath = path.join(process.cwd(), 'apps/nextblock/public', asset.source);
        if (fs.existsSync(localPath)) {
          console.log(`[Sandbox Reset] Loading local asset: ${localPath}`);
          buffer = fs.readFileSync(localPath);
        }
      } catch (err) {
        console.warn(`[Sandbox Reset] Failed to read local asset: ${asset.source}`, err);
      }
    }

    if (!buffer) {
      console.log(`[Sandbox Reset] Fetching ${fetchUrl}...`);
      
      let lastErr: any;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const res = await fetch(fetchUrl);
          if (!res.ok) {
            throw new Error(`Failed to fetch asset: ${fetchUrl} (${res.status})`);
          }
          buffer = Buffer.from(await res.arrayBuffer());
          break;
        } catch (err) {
          lastErr = err;
          if (attempt === 3) break;
          console.warn(`[Sandbox Reset] Fetch failed (attempt ${attempt}): ${fetchUrl}. Retrying in 1s...`);
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
      }
      
      if (!buffer) {
        throw new Error(`Failed to fetch asset after 3 attempts: ${fetchUrl}. Last error: ${lastErr?.message}`);
      }
    }

    await params.s3.send(
      new PutObjectCommand({
        Bucket: params.bucketName,
        Key: asset.dest,
        Body: buffer,
        ContentType: asset.contentType,
      })
    );

    uploadedAssets.set(asset.dest, {
      ...asset,
      sizeBytes: buffer.byteLength,
    });

    console.log(`[Sandbox Reset] Uploaded ${asset.dest}`);
  }

  return uploadedAssets;
}

async function upsertMediaRecord(
  sql: SqlClient,
  asset: UploadedSeedAsset,
  description?: string | null
) {
  const folder = getFolderFromObjectKey(asset.dest);
  const recordDescription = description === undefined ? asset.description ?? null : description;
  const [mediaRecord] = await sql`
    INSERT INTO public.media (
      file_name,
      object_key,
      file_path,
      file_type,
      size_bytes,
      folder,
      description
    )
    VALUES (
      ${asset.fileName},
      ${asset.dest},
      ${asset.dest},
      ${asset.contentType},
      ${asset.sizeBytes},
      ${folder},
      ${recordDescription}
    )
    ON CONFLICT (object_key) DO UPDATE
    SET
      file_name = EXCLUDED.file_name,
      file_path = EXCLUDED.file_path,
      file_type = EXCLUDED.file_type,
      size_bytes = EXCLUDED.size_bytes,
      folder = EXCLUDED.folder,
      description = EXCLUDED.description,
      updated_at = now()
    RETURNING id
  `;

  if (!mediaRecord?.id) {
    throw new Error(`Failed to upsert media record for ${asset.dest}`);
  }

  return mediaRecord.id as string;
}

async function normalizeMediaStorageKeys(sql: SqlClient) {
  const rows = (await sql`
    SELECT id, object_key, file_path
    FROM public.media
    WHERE object_key LIKE '/%' OR file_path LIKE '/%'
  `) as MediaStorageRow[];

  for (const row of rows) {
    const normalizedObjectKey = row.object_key.replace(/^\/+/, '');
    const normalizedFilePath = (row.file_path || row.object_key).replace(/^\/+/, '');
    const folder = getFolderFromObjectKey(normalizedFilePath);

    await sql`
      UPDATE public.media
      SET
        object_key = ${normalizedObjectKey},
        file_path = ${normalizedFilePath},
        folder = ${folder},
        updated_at = now()
      WHERE id = ${row.id}
    `;
  }

  return rows.length;
}

async function ensureCoreMediaRecords(params: {
  sql: SqlClient;
  uploadedAssets: Map<string, UploadedSeedAsset>;
}) {
  for (const record of CORE_MEDIA_RECORDS) {
    const asset = params.uploadedAssets.get(record.assetKey);
    if (!asset) {
      throw new Error(`Missing uploaded asset for ${record.assetKey}.`);
    }

    await upsertMediaRecord(params.sql, asset, record.description);
  }
}

async function attachProductMedia(sql: SqlClient, productId: string, mediaId: string) {
  await sql`DELETE FROM public.product_media WHERE product_id = ${productId}`;
  await sql`
    INSERT INTO public.product_media (product_id, media_id, sort_order)
    VALUES (${productId}, ${mediaId}, 0)
  `;
}

async function upsertInventoryItems(
  sql: SqlClient,
  inventoryRows: Array<{ sku: string; quantity: number }>
) {
  for (const row of inventoryRows) {
    await sql`
      INSERT INTO public.inventory_items (sku, quantity)
      VALUES (${row.sku}, ${row.quantity})
      ON CONFLICT (sku) DO UPDATE
      SET
        quantity = EXCLUDED.quantity,
        updated_at = now()
    `;
  }
}

async function getLanguageIds(sql: SqlClient) {
  const [enLangRaw] = await sql`SELECT id FROM public.languages WHERE code = 'en' LIMIT 1`;
  const [frLangRaw] = await sql`SELECT id FROM public.languages WHERE code = 'fr' LIMIT 1`;

  if (!enLangRaw?.id || !frLangRaw?.id) {
    throw new Error('Required languages (en, fr) not found during sandbox enrichment.');
  }

  return {
    enLangId: enLangRaw.id as LanguageId,
    frLangId: frLangRaw.id as LanguageId,
  };
}

async function ensureSizeAttribute(sql: SqlClient) {
  const [attribute] = await sql`
    INSERT INTO public.product_attributes (name, slug, name_translations)
    VALUES ('Size', 'size', ${sql.json({ fr: 'Taille' })})
    ON CONFLICT (slug) DO UPDATE
    SET
      name = EXCLUDED.name,
      name_translations = EXCLUDED.name_translations,
      updated_at = now()
    RETURNING id
  `;

  if (!attribute?.id) {
    throw new Error('Failed to seed the Size product attribute.');
  }

  const termIds = {} as Record<SizeSlug, string>;

  for (const termDefinition of SIZE_TERM_DEFINITIONS) {
    const [term] = await sql`
      INSERT INTO public.product_attribute_terms (
        attribute_id,
        value,
        slug,
        sort_order,
        value_translations
      )
      VALUES (
        ${attribute.id},
        ${termDefinition.value},
        ${termDefinition.slug},
        ${termDefinition.sortOrder},
        ${sql.json({ fr: termDefinition.frValue })}
      )
      ON CONFLICT ON CONSTRAINT product_attribute_terms_attribute_id_slug_key DO UPDATE
      SET
        value = EXCLUDED.value,
        sort_order = EXCLUDED.sort_order,
        value_translations = EXCLUDED.value_translations,
        updated_at = now()
      RETURNING id
    `;

    if (!term?.id) {
      throw new Error(`Failed to seed the ${termDefinition.slug} product attribute term.`);
    }

    termIds[termDefinition.slug] = term.id as string;
  }

  return termIds;
}

async function enrichCommerceProducts(params: {
  sql: SqlClient;
  commerceAsset: UploadedSeedAsset;
  enLangId: LanguageId;
  frLangId: LanguageId;
}) {
  console.log('[Sandbox Reset] Enriching NextBlock™ Commerce Pro...');

  const commerceMediaId = await upsertMediaRecord(
    params.sql,
    params.commerceAsset,
    'Sandbox seed asset: NextBlock™ Commerce Pro.'
  );

  const [product] = await params.sql`
    SELECT *
    FROM public.products
    WHERE freemius_product_id = ${SANDBOX_COMMERCE_PRODUCT_ID} AND language_id = ${params.enLangId}
    LIMIT 1
  `;

  if (!product) {
    throw new Error(
      `Commerce Pro product ${SANDBOX_COMMERCE_PRODUCT_ID} was not found after Freemius sync.`
    );
  }

  const shortDescEn =
    'NextBlock™ Ecommerce is an AI-native, block-based storefront engine for Next.js with a premium developer-first aesthetic and high-performance edge rendering.';

  const htmlDescriptionEn = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'The Future of Digital Commerce' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'NextBlock™ Ecommerce bridges high-performance headless architecture and intuitive visual editing. Built on the NextBlock™ Performance Stack, it combines Next.js, Supabase, and Tailwind CSS for fast storefront delivery and a smooth AI-assisted workflow.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Notion-style product authoring' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'The Tiptap-powered editor gives teams a familiar block-based surface for shaping storefront content without fighting a bulky backend.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Secure by design' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Freemius licensing, recurring billing support, and a dual-provider payment strategy keep the commercial side reliable while the storefront stays flexible.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Key technical specs' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Edge-friendly rendering for fast global storefront responses.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Nx monorepo architecture for scalable package boundaries and clean code sharing.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Modern image optimization and typed extension points for AI-driven customization.' }],
              },
            ],
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Built for the vibe-coding era' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'NextBlock™ is structured so typed block APIs, schema validation, and agent-friendly workflows stay aligned as the store grows.',
          },
        ],
      },
    ],
  };

  await params.sql`
    UPDATE public.products
    SET
      short_description = ${shortDescEn},
      description_json = ${params.sql.json(htmlDescriptionEn)},
      product_type = 'digital',
      payment_provider = 'freemius'
    WHERE id = ${product.id}
  `;

  await attachProductMedia(params.sql, product.id as string, commerceMediaId);

  const shortDescFr =
    "NextBlock™ Ecommerce est un moteur de boutique base sur des blocs et natif de l IA pour Next.js, avec une esthetique premium et un rendu edge haute performance.";

  const htmlDescriptionFr = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'Le futur du commerce numerique' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'NextBlock™ Ecommerce relie une architecture headless tres rapide a une edition visuelle intuitive. Construit sur la NextBlock™ Performance Stack, il combine Next.js, Supabase et Tailwind CSS pour offrir une boutique fluide et moderne.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Edition produit style Notion' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'L editeur base sur Tiptap donne une experience en blocs familiere pour construire les pages produits sans se battre avec un back office lourd.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Securise par conception' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Licences Freemius, support de la facturation recurrente et strategie de paiement multi-fournisseur gardent la partie commerciale solide sans sacrifier la souplesse.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Points techniques cles' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Rendu optimise pour une boutique rapide a l echelle globale.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Architecture monorepo Nx pour separer proprement les domaines et partager le code.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Optimisation media moderne et points d extension types pour les workflows IA.' }],
              },
            ],
          },
        ],
      },
    ],
  };

  const [frProduct] = await params.sql`
    INSERT INTO public.products (
      sku,
      title,
      slug,
      price,
      sale_price,
      stock,
      status,
      short_description,
      description_json,
      product_type,
      payment_provider,
      language_id,
      translation_group_id,
      freemius_product_id,
      freemius_plan_id,
      trial_period_days,
      trial_requires_payment_method
    )
    VALUES (
      ${product.sku},
      'NextBlock™ Commerce Pro - Licence Commerce',
      ${String(product.slug) + '-fr'},
      ${product.price},
      ${product.sale_price},
      ${product.stock || 99},
      ${product.status},
      ${shortDescFr},
      ${params.sql.json(htmlDescriptionFr)},
      'digital',
      'freemius',
      ${params.frLangId},
      ${product.translation_group_id},
      ${product.freemius_product_id},
      ${product.freemius_plan_id},
      ${product.trial_period_days ?? 0},
      ${product.trial_requires_payment_method ?? false}
    )
    ON CONFLICT ON CONSTRAINT products_language_id_slug_key DO UPDATE
    SET
      title = EXCLUDED.title,
      short_description = EXCLUDED.short_description,
        description_json = EXCLUDED.description_json,
        price = EXCLUDED.price,
        sale_price = EXCLUDED.sale_price,
        stock = EXCLUDED.stock,
        status = EXCLUDED.status,
        product_type = EXCLUDED.product_type,
        payment_provider = EXCLUDED.payment_provider,
        trial_period_days = EXCLUDED.trial_period_days,
        trial_requires_payment_method = EXCLUDED.trial_requires_payment_method
    RETURNING id
  `;

  if (frProduct?.id) {
    await attachProductMedia(params.sql, frProduct.id as string, commerceMediaId);
  }

  console.log('[Sandbox Reset] Successfully enriched commerce products (EN & FR).');
}

async function enrichCortexAiProducts(params: {
  sql: SqlClient;
  cortexAsset: UploadedSeedAsset;
  enLangId: LanguageId;
  frLangId: LanguageId;
}) {
  console.log('[Sandbox Reset] Enriching NextBlock™ Cortex AI...');

  const cortexMediaId = await upsertMediaRecord(
    params.sql,
    params.cortexAsset,
    'Sandbox seed asset: NextBlock™ Cortex AI.'
  );

  const [product] = await params.sql`
    SELECT *
    FROM public.products
    WHERE freemius_product_id = ${SANDBOX_CORTEX_AI_PRODUCT_ID} AND language_id = ${params.enLangId}
    LIMIT 1
  `;

  if (!product) {
    throw new Error(
      `Cortex AI product ${SANDBOX_CORTEX_AI_PRODUCT_ID} was not found after Freemius sync.`
    );
  }

  const shortDescEn =
    'NextBlock Cortex AI brings native block-level intelligence to your Next.js application, enabling automated content generation and intelligent structural refactoring.';

  const htmlDescriptionEn = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'The Intelligence Layer for Modern Content' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'NextBlock Cortex AI integrates directly into your block editor, allowing teams to generate high-fidelity content, refactor existing structures, and build AI-assisted workflows without leaving the CMS.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Native block refactoring' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Unlike generic AI wrappers, Cortex AI understands your block schemas. It doesn\'t just generate text; it generates structured JSONB data that maps perfectly to your NextBlock™ components.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Key technical specs' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Native OpenRouter integration for access to the world\'s best models.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Context-aware block generation that respects your design system.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Streamlined BYOK (Bring Your Own Key) workflow for complete cost control.' }],
              },
            ],
          },
        ],
      },
    ],
  };

  await params.sql`
    UPDATE public.products
    SET
      short_description = ${shortDescEn},
      description_json = ${params.sql.json(htmlDescriptionEn)},
      product_type = 'digital',
      payment_provider = 'freemius'
    WHERE id = ${product.id}
  `;

  await attachProductMedia(params.sql, product.id as string, cortexMediaId);

  const shortDescFr =
    'NextBlock Cortex AI apporte une intelligence native au niveau des blocs à votre application Next.js, permettant la génération automatique de contenu.';

  const htmlDescriptionFr = {
    type: 'doc',
    content: [
      {
        type: 'heading',
        attrs: { level: 2 },
        content: [{ type: 'text', text: 'La couche d’intelligence pour le contenu moderne' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'NextBlock Cortex AI s’intègre directement dans votre éditeur de blocs, permettant aux équipes de générer du contenu de haute fidélité et de construire des workflows assistés par l’IA.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Refactorisation native de blocs' }],
      },
      {
        type: 'paragraph',
        content: [
          {
            type: 'text',
            text: 'Cortex AI comprend vos schémas de blocs. Il ne se contente pas de générer du texte ; il génère des données JSONB structurées qui correspondent parfaitement à vos composants NextBlock™.',
          },
        ],
      },
      {
        type: 'heading',
        attrs: { level: 3 },
        content: [{ type: 'text', text: 'Points techniques clés' }],
      },
      {
        type: 'bulletList',
        content: [
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Intégration native OpenRouter pour un accès aux meilleurs modèles mondiaux.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Génération de blocs consciente du contexte respectant votre design system.' }],
              },
            ],
          },
          {
            type: 'listItem',
            content: [
              {
                type: 'paragraph',
                content: [{ type: 'text', text: 'Workflow BYOK pour un contrôle total des coûts.' }],
              },
            ],
          },
        ],
      },
    ],
  };

  const [frProduct] = await params.sql`
    INSERT INTO public.products (
      sku, title, slug, price, sale_price, stock, status,
      short_description, description_json,
      product_type, payment_provider,
      language_id, translation_group_id,
      freemius_product_id, freemius_plan_id,
      trial_period_days, trial_requires_payment_method
    )
    VALUES (
      ${product.sku}, 'NextBlock Cortex AI - Licence AI', ${String(product.slug) + '-fr'},
      ${product.price}, ${product.sale_price}, ${product.stock || 99}, ${product.status},
      ${shortDescFr}, ${params.sql.json(htmlDescriptionFr)},
      'digital', 'freemius',
      ${params.frLangId}, ${product.translation_group_id},
      ${product.freemius_product_id}, ${product.freemius_plan_id},
      ${product.trial_period_days ?? 0}, ${product.trial_requires_payment_method ?? false}
    )
    ON CONFLICT ON CONSTRAINT products_language_id_slug_key DO UPDATE
    SET
      title = EXCLUDED.title,
      short_description = EXCLUDED.short_description,
      description_json = EXCLUDED.description_json,
      product_type = EXCLUDED.product_type,
      payment_provider = EXCLUDED.payment_provider,
      trial_period_days = EXCLUDED.trial_period_days,
      trial_requires_payment_method = EXCLUDED.trial_requires_payment_method
    RETURNING id
  `;

  if (frProduct?.id) {
    await attachProductMedia(params.sql, frProduct.id as string, cortexMediaId);
  }

  console.log('[Sandbox Reset] Successfully enriched Cortex AI products (EN & FR).');
}

async function ensureSandboxCommerceProductSynced(params: {
  sql: SqlClient;
  enLangId: LanguageId;
}) {
  const [existingProduct] = await params.sql`
    SELECT id
    FROM public.products
    WHERE freemius_product_id = ${SANDBOX_COMMERCE_PRODUCT_ID}
      AND language_id = ${params.enLangId}
    LIMIT 1
  `;

  if (existingProduct?.id) {
    return existingProduct.id as string;
  }

  console.warn(
    `[Sandbox Reset] Commerce Pro product ${SANDBOX_COMMERCE_PRODUCT_ID} was missing after the full Freemius sync. Retrying targeted sync.`
  );

  const fallbackResult = await syncSingleFreemiusProduct(SANDBOX_COMMERCE_PRODUCT_ID);
  console.log(
    `[Sandbox Reset] Targeted Commerce Pro sync completed with ${fallbackResult?.count || 0} product(s).`
  );

  const [syncedProduct] = await params.sql`
    SELECT id
    FROM public.products
    WHERE freemius_product_id = ${SANDBOX_COMMERCE_PRODUCT_ID}
      AND language_id = ${params.enLangId}
    LIMIT 1
  `;

  if (!syncedProduct?.id) {
    throw new Error(
      `Targeted Commerce Pro sync did not create product ${SANDBOX_COMMERCE_PRODUCT_ID}.`
    );
  }

  return syncedProduct.id as string;
}

async function upsertSeededCatalogProduct(params: {
  sql: SqlClient;
  productId?: string;
  translationGroupId: string;
  languageId: LanguageId;
  locale: SeededLocale;
  baseSku: string;
  price: number;
  mediaId: string;
  variantStocks: Record<SizeSlug, number>;
  sizeTermIds: Record<SizeSlug, string>;
}) {
  const variantDefinitions = [
    { slug: 'small', skuSuffix: 'S' },
    { slug: 'medium', skuSuffix: 'M' },
    { slug: 'large', skuSuffix: 'L' },
  ] as const;

  const totalStock = variantDefinitions.reduce(
    (sum, variant) => sum + params.variantStocks[variant.slug],
    0
  );

  const metadata = {
    seed_source: 'sandbox-reset',
    seed_type: 'physical-apparel',
  };
  const descriptionJson = buildStructuredDescription(params.locale.description);

  let seededProductId = params.productId;

  if (seededProductId) {
    const [updatedProduct] = await params.sql`
      UPDATE public.products
      SET
        language_id = ${params.languageId},
        translation_group_id = ${params.translationGroupId},
        sku = ${params.baseSku},
        title = ${params.locale.title},
        slug = ${params.locale.slug},
        price = ${params.price},
        sale_price = NULL,
        stock = ${totalStock},
        status = 'active',
        short_description = ${params.locale.shortDescription},
        description_json = ${params.sql.json(descriptionJson)},
        metadata = ${params.sql.json(metadata)},
        is_taxable = true,
        product_type = 'physical',
        payment_provider = 'stripe',
        trial_period_days = 0,
        trial_requires_payment_method = false,
        updated_at = now()
      WHERE id = ${seededProductId}
      RETURNING id
    `;

    seededProductId = updatedProduct?.id as string | undefined;
  }

  if (!seededProductId) {
    const [upsertedProduct] = await params.sql`
      INSERT INTO public.products (
        language_id,
        translation_group_id,
        sku,
        title,
        slug,
        price,
        sale_price,
        stock,
        status,
        short_description,
        description_json,
        metadata,
        is_taxable,
        product_type,
        payment_provider,
        trial_period_days,
        trial_requires_payment_method
      )
      VALUES (
        ${params.languageId},
        ${params.translationGroupId},
        ${params.baseSku},
        ${params.locale.title},
        ${params.locale.slug},
        ${params.price},
        NULL,
        ${totalStock},
        'active',
        ${params.locale.shortDescription},
        ${params.sql.json(descriptionJson)},
        ${params.sql.json(metadata)},
        true,
        'physical',
        'stripe',
        0,
        false
      )
      ON CONFLICT ON CONSTRAINT products_language_id_slug_key DO UPDATE
      SET
        translation_group_id = EXCLUDED.translation_group_id,
        sku = EXCLUDED.sku,
        title = EXCLUDED.title,
        price = EXCLUDED.price,
        sale_price = EXCLUDED.sale_price,
        stock = EXCLUDED.stock,
        status = EXCLUDED.status,
        short_description = EXCLUDED.short_description,
        description_json = EXCLUDED.description_json,
        metadata = EXCLUDED.metadata,
        is_taxable = EXCLUDED.is_taxable,
        product_type = EXCLUDED.product_type,
        payment_provider = EXCLUDED.payment_provider,
        trial_period_days = EXCLUDED.trial_period_days,
        trial_requires_payment_method = EXCLUDED.trial_requires_payment_method,
        updated_at = now()
      RETURNING id
    `;

    seededProductId = upsertedProduct?.id as string | undefined;
  }

  if (!seededProductId) {
    throw new Error(`Failed to upsert seeded product ${params.locale.slug}.`);
  }

  await attachProductMedia(params.sql, seededProductId, params.mediaId);

  await params.sql`
    DELETE FROM public.variant_attribute_mapping
    WHERE variant_id IN (
      SELECT id
      FROM public.product_variants
      WHERE product_id = ${seededProductId}
    )
  `;

  await params.sql`
    DELETE FROM public.product_variants
    WHERE product_id = ${seededProductId}
  `;

  for (const variant of variantDefinitions) {
    const [insertedVariant] = await params.sql`
      INSERT INTO public.product_variants (
        product_id,
        sku,
        price,
        sale_price,
        stock_quantity,
        main_media_id
      )
      VALUES (
        ${seededProductId},
        ${`${params.baseSku}-${variant.skuSuffix}`},
        ${params.price},
        NULL,
        ${params.variantStocks[variant.slug]},
        ${params.mediaId}
      )
      RETURNING id
    `;

    if (!insertedVariant?.id) {
      throw new Error(`Failed to create variant ${params.baseSku}-${variant.skuSuffix}.`);
    }

    await params.sql`
      INSERT INTO public.variant_attribute_mapping (variant_id, attribute_term_id)
      VALUES (${insertedVariant.id}, ${params.sizeTermIds[variant.slug]})
    `;
  }

  await params.sql`
    UPDATE public.product_variants
    SET
      main_media_id = ${params.mediaId},
      updated_at = now()
    WHERE product_id = ${seededProductId}
  `;

  await upsertInventoryItems(
    params.sql,
    variantDefinitions.map((variant) => ({
      sku: `${params.baseSku}-${variant.skuSuffix}`,
      quantity: params.variantStocks[variant.slug],
    }))
  );

  return seededProductId;
}

async function seedApparelCatalog(params: {
  sql: SqlClient;
  enLangId: LanguageId;
  frLangId: LanguageId;
  uploadedAssets: Map<string, UploadedSeedAsset>;
}) {
  console.log('[Sandbox Reset] Seeding apparel catalog...');

  const sizeTermIds = await ensureSizeAttribute(params.sql);

  for (const productSeed of APPAREL_PRODUCT_SEEDS) {
    const uploadedAsset = params.uploadedAssets.get(productSeed.imageKey);
    if (!uploadedAsset) {
      throw new Error(`Missing uploaded asset for ${productSeed.imageKey}.`);
    }

    const mediaId = await upsertMediaRecord(params.sql, uploadedAsset, uploadedAsset.description);

    const [existingEnProduct] = await params.sql`
      SELECT id, translation_group_id
      FROM public.products
      WHERE language_id = ${params.enLangId} AND slug = ${productSeed.en.slug}
      LIMIT 1
    `;

    const [existingFrProduct] = await params.sql`
      SELECT id, translation_group_id
      FROM public.products
      WHERE language_id = ${params.frLangId} AND slug = ${productSeed.fr.slug}
      LIMIT 1
    `;

    const translationGroupId =
      (existingEnProduct?.translation_group_id as string | undefined) ||
      (existingFrProduct?.translation_group_id as string | undefined) ||
      crypto.randomUUID();

    await upsertSeededCatalogProduct({
      sql: params.sql,
      productId: existingEnProduct?.id as string | undefined,
      translationGroupId,
      languageId: params.enLangId,
      locale: productSeed.en,
      baseSku: productSeed.baseSku,
      price: productSeed.price,
      mediaId,
      variantStocks: productSeed.variantStocks,
      sizeTermIds,
    });

    await upsertSeededCatalogProduct({
      sql: params.sql,
      productId: existingFrProduct?.id as string | undefined,
      translationGroupId,
      languageId: params.frLangId,
      locale: productSeed.fr,
      baseSku: productSeed.baseSku,
      price: productSeed.price,
      mediaId,
      variantStocks: productSeed.variantStocks,
      sizeTermIds,
    });
  }

  console.log('[Sandbox Reset] Successfully seeded apparel catalog.');
}

async function ensureShopPagesAndNavigation(params: {
  sql: SqlClient;
  enLangId: LanguageId;
  frLangId: LanguageId;
}) {
  console.log('[Sandbox Reset] Adding Shop Pages and navigation items...');
  let globalShopGroupId: string | undefined;

  {
    const langId = params.enLangId;
    const [existingPage] = await params.sql`
      SELECT id, translation_group_id
      FROM public.pages
      WHERE language_id = ${langId} AND slug = 'shop'
    `;
    let pageId = existingPage?.id as number | undefined;
    globalShopGroupId = existingPage?.translation_group_id as string | undefined;

    if (!pageId) {
      const [newPage] = await params.sql`
        INSERT INTO public.pages (language_id, title, slug, status, meta_title, meta_description)
        VALUES (
          ${langId},
          'Shop Our Products',
          'shop',
          'published',
          'NextBlock™ Store',
          'Browse our premium products'
        )
        RETURNING id, translation_group_id
      `;
      pageId = newPage.id as number;
      globalShopGroupId = newPage?.translation_group_id as string | undefined;

      const heroContent = {
        container_type: 'full-width',
        background: {
          type: 'theme',
          theme: 'primary',
        },
        responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
        column_gap: 'lg',
        padding: { top: 'xl', bottom: 'xl' },
        vertical_alignment: 'center',
        column_blocks: [
          [
            {
              block_type: 'heading',
              content: {
                level: 1,
                text_content: 'NextBlock™ Store',
                textAlign: 'center',
                textColor: 'background',
              },
            },
            {
              block_type: 'text',
              content: {
                html_content:
                  '<p style="text-align: center; color: var(--background); opacity: 0.9">Discover our premium selection of developer tools and digital commerce solutions.</p>',
              },
            },
          ],
        ],
      };

      const sectionContent = {
        container_type: 'container',
        background: { type: 'none' },
        responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
        column_gap: 'none',
        padding: { top: 'xl', bottom: 'xl' },
        column_blocks: [
          [
            {
              block_type: 'heading',
              content: {
                level: 2,
                text_content: 'Featured Products',
                textAlign: 'center',
              },
            },
            {
              block_type: 'product_grid',
              content: {
                type: 'latest',
                limit: 6,
              },
            },
          ],
        ],
      };

      await params.sql`
        INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
        VALUES
          (${pageId}, ${langId}, 'hero', ${params.sql.json(heroContent as any)}, 0),
          (${pageId}, ${langId}, 'section', ${params.sql.json(sectionContent as any)}, 1)
      `;
    }

    const [exists] = await params.sql`
      SELECT id
      FROM public.navigation_items
      WHERE language_id = ${langId} AND url = '/shop'
    `;
    if (!exists) {
      await params.sql`
        INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order")
        VALUES (${langId}, 'HEADER', 'Shop', '/shop', 2)
      `;
    }
  }

  {
    const langId = params.frLangId;
    const [existingPage] = await params.sql`
      SELECT id
      FROM public.pages
      WHERE language_id = ${langId} AND slug = 'boutique'
    `;
    let pageId = existingPage?.id as number | undefined;

    if (!pageId) {
      const [newPage] = await params.sql`
        INSERT INTO public.pages (
          language_id,
          title,
          slug,
          status,
          meta_title,
          meta_description,
          translation_group_id
        )
        VALUES (
          ${langId},
          'Boutique en Ligne',
          'boutique',
          'published',
          'Boutique NextBlock™',
          'Decouvrez nos produits premium',
          ${globalShopGroupId ?? null}
        )
        RETURNING id
      `;
      pageId = newPage.id as number;

      const heroContent = {
        container_type: 'full-width',
        background: {
          type: 'theme',
          theme: 'primary',
        },
        responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
        column_gap: 'lg',
        padding: { top: 'xl', bottom: 'xl' },
        vertical_alignment: 'center',
        column_blocks: [
          [
            {
              block_type: 'heading',
              content: {
                level: 1,
                text_content: 'Boutique NextBlock™',
                textAlign: 'center',
                textColor: 'background',
              },
            },
            {
              block_type: 'text',
              content: {
                html_content:
                  '<p style="text-align: center; color: var(--background); opacity: 0.9">Decouvrez notre selection premium d outils de developpement.</p>',
              },
            },
          ],
        ],
      };

      const sectionContent = {
        container_type: 'container',
        background: { type: 'none' },
        responsive_columns: { mobile: 1, tablet: 1, desktop: 1 },
        column_gap: 'none',
        padding: { top: 'xl', bottom: 'xl' },
        column_blocks: [
          [
            {
              block_type: 'heading',
              content: {
                level: 2,
                text_content: 'Produits Vedettes',
                textAlign: 'center',
              },
            },
            {
              block_type: 'product_grid',
              content: {
                type: 'latest',
                limit: 6,
              },
            },
          ],
        ],
      };

      await params.sql`
        INSERT INTO public.blocks (page_id, language_id, block_type, content, "order")
        VALUES
          (${pageId}, ${langId}, 'hero', ${params.sql.json(heroContent as any)}, 0),
          (${pageId}, ${langId}, 'section', ${params.sql.json(sectionContent as any)}, 1)
      `;
    }

    const [exists] = await params.sql`
      SELECT id
      FROM public.navigation_items
      WHERE language_id = ${langId} AND url = '/boutique'
    `;
    if (!exists) {
      await params.sql`
        INSERT INTO public.navigation_items (language_id, menu_key, label, url, "order")
        VALUES (${langId}, 'HEADER', 'Boutique', '/boutique', 2)
      `;
    }
  }

  console.log('[Sandbox Reset] Successfully created Shop pages and navigation.');
}

async function seedFakeStoreData(sql: SqlClient, supabaseAdmin: any) {
  console.log('[Sandbox Reset] Starting fake store data seeding...');
  
  // 1. Ensure Demo User
  const email = 'demo@nextblock.ca';
  console.log(`[Sandbox Reset] Checking for demo user: ${email}`);
  const { data: userData, error: userError } = await supabaseAdmin.auth.admin.listUsers();
  if (userError) {
    console.error('[Sandbox Reset] Auth listUsers error:', userError);
    throw userError;
  }

  let demoUser = userData.users.find((u: any) => u.email === email);
  if (!demoUser) {
    console.log('[Sandbox Reset] Demo user missing in Auth, creating...');
    const { data: newUser, error: createError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: 'password',
      email_confirm: true,
      user_metadata: { full_name: 'Nextblock CMS' }
    });
    if (createError) {
      console.error('[Sandbox Reset] Auth createUser error:', createError);
      throw createError;
    }
    demoUser = newUser.user;
    console.log(`[Sandbox Reset] Created new demo user with ID: ${demoUser.id}`);
  } else {
    console.log(`[Sandbox Reset] Found existing demo user with ID: ${demoUser.id}`);
  }

  const userId = demoUser.id;

  // 2. Seed Invoice Branding
  console.log('[Sandbox Reset] Seeding invoice branding...');
  const branding = {
    business_name: 'NextBlock CMS',
    email: 'billing@nextblock.ca',
    phone: '5143188025',
    address: {
      line1: '',
      line2: '',
      city: 'Salaberry-de-Valleyfield',
      state: 'Quebec',
      postal_code: 'J6S 5B6',
      country_code: 'CA',
    },
    tax_registrations: [],
  };

  await sql`
    INSERT INTO public.site_settings (key, value)
    VALUES ('invoice_settings', ${sql.json(branding)})
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  // 3. Seed Profile
  console.log('[Sandbox Reset] Seeding demo account profile (ADMIN)...');
  await sql`
    INSERT INTO public.profiles (id, full_name, website, role, updated_at)
    VALUES (${userId}, 'Nextblock CMS', 'https://nextblock.dev', 'ADMIN', now())
    ON CONFLICT (id) DO UPDATE SET
      full_name = EXCLUDED.full_name,
      website = EXCLUDED.website,
      role = 'ADMIN',
      updated_at = now()
  `;

  // 4. Seed Orders
  console.log('[Sandbox Reset] Querying products for order seeding...');
  const products = await sql`
    SELECT id, price, title 
    FROM public.products 
    WHERE status IN ('active', 'published')
    LIMIT 10
  `;
  
  console.log(`[Sandbox Reset] Found ${products.length} products for orders.`);
  
  if (products.length > 0) {
    console.log(`[Sandbox Reset] Cleaning up existing orders for user ${userId}...`);
    await sql`DELETE FROM public.orders WHERE user_id = ${userId}`;
    
    console.log('[Sandbox Reset] Inserting 5 fake orders...');
    for (let i = 0; i < 5; i++) {
      try {
        const product = products[i % products.length];
        const quantity = Math.floor(Math.random() * 2) + 1;
        const total = (product.price || 0) * quantity;
        const orderId = crypto.randomUUID();
        const invoiceNumber = `INV-2024-${1000 + i}`;
        const hoursAgo = `${i * 2} hours`;

        console.log(`[Sandbox Reset] Creating order ${i+1}/5: ${invoiceNumber} for product ${product.title}`);

        await sql`
          INSERT INTO public.orders (
            id, user_id, status, total, subtotal, tax_total, currency,
            invoice_number, paid_at, created_at, customer_details, provider
          ) VALUES (
            ${orderId}, ${userId}, 'paid', ${total}, ${total}, 0, 'USD',
            ${invoiceNumber}, now() - ${hoursAgo}::interval, now() - ${hoursAgo}::interval,
            ${sql.json({ email, name: 'Nextblock CMS' })}, 'stripe'
          )
        `;

        await sql`
          INSERT INTO public.order_items (order_id, product_id, quantity, price_at_purchase)
          VALUES (${orderId}, ${product.id}, ${quantity}, ${product.price})
        `;
      } catch (orderErr: any) {
        console.error(`[Sandbox Reset] Failed to insert order ${i}:`, orderErr.message || orderErr);
      }
    }
    console.log('[Sandbox Reset] Finished order seeding loop.');
  } else {
    console.warn('[Sandbox Reset] Skipping order seeding: No products found.');
  }
}

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

  const r2AccountId = process.env.R2_ACCOUNT_ID;
  const r2AccessKeyId = process.env.R2_ACCESS_KEY_ID;
  const r2SecretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const r2BucketName = process.env.R2_BUCKET_NAME;
  let siteUrl = process.env.NEXT_PUBLIC_URL || request.nextUrl.origin;

  if (siteUrl && siteUrl.includes('localhost:') && request.nextUrl.origin.includes('localhost:')) {
    siteUrl = request.nextUrl.origin;
  }
  if (siteUrl && !siteUrl.startsWith('http')) {
    siteUrl = `https://${siteUrl}`;
  }
  if (siteUrl && siteUrl.endsWith('/')) {
    siteUrl = siteUrl.slice(0, -1);
  }

  if (
    !supabaseUrl ||
    !supabaseServiceKey ||
    !r2AccountId ||
    !r2AccessKeyId ||
    !r2SecretAccessKey ||
    !r2BucketName ||
    !siteUrl
  ) {
    return NextResponse.json({ error: 'Missing environment variables' }, { status: 500 });
  }

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
        await s3.send(
          new DeleteObjectsCommand({
            Bucket: r2BucketName,
            Delete: { Objects: objectsToDelete },
          })
        );
        console.log(`[Sandbox Reset] Deleted ${objectsToDelete.length} objects.`);
      }

      continuationToken = listRes.NextContinuationToken;
    } while (continuationToken);

    console.log('[Sandbox Reset] Fetching and re-seeding assets...');
    const uploadedAssets = await uploadSeedAssets({
      s3,
      bucketName: r2BucketName,
      siteUrl,
    });

    console.log('[Sandbox Reset] Resetting Database...');
    const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
    if (!dbUrl) {
      throw new Error('Missing POSTGRES_URL environment variable');
    }

    const db = postgres(dbUrl, { ssl: 'require', onnotice: () => undefined });
    try {
      try {
        await db.unsafe(SANDBOX_RESET_SQL);
        console.log('[Sandbox Reset] Database re-seeded successfully.');
      } catch (dbError: any) {
        console.error('[Sandbox Reset] DB Error:', dbError);
        throw dbError;
      }

      const normalizedMediaCount = await normalizeMediaStorageKeys(db);
      if (normalizedMediaCount > 0) {
        console.log(
          `[Sandbox Reset] Normalized ${normalizedMediaCount} media storage key(s) after SQL reset.`
        );
      }

      await ensureCoreMediaRecords({
        sql: db,
        uploadedAssets,
      });

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
          throw activationError;
        } else {
          console.log('[Sandbox Reset] Successfully activated ecommerce package.');
          
          // Dynamically populate the store with Freemius products
          try {
            console.log('[Sandbox Reset] Syncing products from Freemius...');
            const syncRes = await syncFreemiusProductsToSupabase();
            console.log(`[Sandbox Reset] Synced ${syncRes?.count || 0} products.`);
            await db`
              INSERT INTO public.site_settings (key, value)
              VALUES (
                'enabled_payment_providers',
                '{"stripe": true, "freemius": true}'::jsonb
              )
              ON CONFLICT (key) DO UPDATE
              SET value = EXCLUDED.value
            `;

            try {
              const { enLangId, frLangId } = await getLanguageIds(db);
              await ensureSandboxCommerceProductSynced({
                sql: db,
                enLangId,
              });
              const commerceAsset = uploadedAssets.get('images/commerce-square.webp');

              if (!commerceAsset) {
                throw new Error('Missing uploaded Commerce Pro asset after R2 seed step.');
              }

              await enrichCommerceProducts({
                sql: db,
                commerceAsset,
                enLangId,
                frLangId,
              });

              const cortexAsset = uploadedAssets.get('images/cortex-ai-square.webp');
              if (!cortexAsset) {
                throw new Error('Missing uploaded Cortex AI asset after R2 seed step.');
              }

              await enrichCortexAiProducts({
                sql: db,
                cortexAsset,
                enLangId,
                frLangId,
              });

              await db.begin(async (sql: any) => {
                const tx = sql as SqlClient;

                await seedApparelCatalog({
                  sql: tx,
                  enLangId,
                  frLangId,
                  uploadedAssets,
                });
              });

              await ensureShopPagesAndNavigation({
                sql: db,
                enLangId,
                frLangId,
              });
            } catch (enrichErr: any) {
              console.error('[Sandbox Reset] Product enrichment failed:', enrichErr.message || enrichErr);
              throw enrichErr;
            }

          /*
          // Post-sync enrichment: Add image and rich description to the Commerce Pro product
          try {
            console.log('[Sandbox Reset] Enriching NextBlock™ Commerce Pro...');
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

            // 2. Find the synced product (NextBlock™ Commerce Pro)
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
              const shortDescEn = "NextBlock™ Ecommerce is an AI-native, block-based storefront engine for Next.js. Featuring a premium, developer-first aesthetic and high-performance edge rendering.";
              
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
                        text: "NextBlock™ Ecommerce bridges the gap between high-performance headless architecture and intuitive visual editing. Built on the NextBlock™ Performance Stack (NPS), it leverages Next.js 16, Supabase, and Tailwind CSS to deliver sub-millisecond latency and a seamless \"Vibe Coding\" experience."
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
                        text: "Integrated with Freemius for cryptographic licensing and recurring billing. Features dual-layer payment strategy with Freemius MoR and native Stripe support."
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
                        text: "NextBlock™ is built from the ground up to be extendable by AI Agents. Whether you're using Claude, v0, or custom GPTs, our highly typed Block SDK and Zod schema validations ensure every extension stays robust and secure."
                      }
                    ]
                  }
                ]
              };

              await db`
                UPDATE public.products 
                SET short_description = ${shortDescEn}, 
                    description_json = ${db.json(htmlDescriptionEn)},
                    product_type = 'digital',
                    payment_provider = 'freemius'
                WHERE id = ${product.id}
              `;

              // 5. Create French Version
              if (frLangId) {
                console.log('[Sandbox Reset] Creating French version of NextBlock™ Commerce Pro...');
                
                const shortDescFr = "NextBlock™ Ecommerce est un moteur de boutique basé sur des blocs et natif de l'IA pour Next.js. Doté d'une esthétique premium et d'un rendu edge haute performance.";
                
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
                          text: "NextBlock™ Ecommerce comble le fossé entre l'architecture headless haute performance et l'édition visuelle intuitive. Construit sur la NextBlock™ Performance Stack (NPS), il exploite Next.js 16, Supabase et Tailwind CSS pour offrir une latence de moins d'une milliseconde."
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
                          text: "Intégré avec Freemius pour les licences cryptographiques et la facturation récurrente. Stratégie de paiement à double couche avec Freemius MoR et support natif Stripe."
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
                    product_type, payment_provider,
                    language_id, translation_group_id,
                    freemius_product_id, freemius_plan_id,
                    trial_period_days, trial_requires_payment_method
                  )
                  VALUES (
                    ${product.sku}, 'NextBlock™ Commerce Pro - Licence Commerce', ${product.slug + '-fr'}, 
                    ${product.price}, ${product.sale_price}, ${product.stock || 99}, ${product.status},
                    ${shortDescFr}, ${db.json(htmlDescriptionFr)},
                    'digital', 'freemius',
                    ${frLangId}, ${product.translation_group_id},
                    ${product.freemius_product_id}, ${product.freemius_plan_id},
                    ${product.trial_period_days ?? 0}, ${product.trial_requires_payment_method ?? false}
                  )
                  ON CONFLICT ON CONSTRAINT products_language_id_slug_key DO UPDATE
                  SET
                    title = EXCLUDED.title,
                    short_description = EXCLUDED.short_description,
                    description_json = EXCLUDED.description_json,
                    product_type = EXCLUDED.product_type,
                    payment_provider = EXCLUDED.payment_provider,
                    trial_period_days = EXCLUDED.trial_period_days,
                    trial_requires_payment_method = EXCLUDED.trial_requires_payment_method
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
                  VALUES (${langId}, 'Shop Our Products', 'shop', 'published', 'NextBlock™ Store', 'Browse our premium products')
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
                          text_content: "NextBlock™ Store",
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
                  VALUES (${langId}, 'Boutique en Ligne', 'boutique', 'published', 'Boutique NextBlock™', 'Découvrez nos produits premium', ${globalShopGroupId ?? null})
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
                          text_content: "Boutique NextBlock™",
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
          */
          } catch (syncErr: any) {
            console.error('[Sandbox Reset] Failed to sync Freemius products:', syncErr.message || syncErr);
            throw syncErr;
          }
        }
      }

      if (process.env.FREEMIUS_AI_SANDBOX_KEY) {
        const { error: cortexActivationError } = await supabaseAdmin
          .from('package_activations')
          .upsert(
            {
              package_id: CORTEX_AI_PACKAGE_ID,
              license_key: process.env.FREEMIUS_AI_SANDBOX_KEY,
              status: 'active',
              instance_name: siteUrl,
              last_validated_at: new Date().toISOString(),
            },
            { onConflict: 'license_key, package_id' }
          );

        if (cortexActivationError) {
          console.error(
            '[Sandbox Reset] Failed to activate Cortex AI package:',
            cortexActivationError.message
          );
          throw cortexActivationError;
        } else {
          console.log('[Sandbox Reset] Successfully activated Cortex AI package.');
        }
      }

      // Seed additional store data: Branding, Demo Account, and Fake Orders
      try {
        await seedFakeStoreData(db, supabaseAdmin);
        console.log('[Sandbox Reset] Successfully seeded fake store data.');
      } catch (storeSeedErr: any) {
        console.error('[Sandbox Reset] Failed to seed store data:', storeSeedErr.message || storeSeedErr);
      }
    } finally {
      await db.end();
    }

    console.log('[Sandbox Reset] Complete.');
    return NextResponse.json({ success: true, message: 'Sandbox hard reset completed successfully' });
  } catch (err: any) {
    console.error('[Sandbox Reset] Unexpected error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error', stack: err.stack }, { status: 500 });
  }
}
