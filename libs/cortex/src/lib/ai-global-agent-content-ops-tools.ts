import { tool } from 'ai';

import { z } from './zod-config';

/**
 * The pieces a site needs before content can be built on top of it: media,
 * locales, and product categories.
 *
 * Each of these existed in the CMS but had no tool, which made them hard floors on
 * what could be produced in one pass — an agent could not reuse an image it had
 * already imported, could not add a second language, and could not create the
 * category a product grid filters by.
 */

type ContentOpsToolContext = {
  actorFromOrphanedToken?: boolean;
  actorUserId?: string | null;
  importExternalImage?: (input: {
    altText?: string;
    url: string;
  }) => Promise<{ id: string } | { error: string }>;
  latestUserMessage?: string | null;
  revalidatePath?: (path: string, type?: 'layout' | 'page') => void;
  skipConfirmation?: boolean;
  supabase?: { from: (table: string) => any };
};

const MEDIA_SELECT = 'id, file_name, object_key, file_type, width, height, description, folder, created_at';

function requireSupabase(context?: ContentOpsToolContext) {
  if (!context?.supabase) {
    throw new Error('No database connection is available for this tool.');
  }

  return context.supabase;
}

function serializeError(error: unknown): string {
  if (!error) return 'unknown error';
  if (error instanceof Error) return error.message;
  if (typeof error === 'object' && 'message' in (error as Record<string, unknown>)) {
    return String((error as Record<string, unknown>)['message']);
  }
  return String(error);
}

/** Fold accents to their base letter so non-English names produce usable slugs. */
function slugify(value: string): string {
  return value
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

/* -------------------------------------------------------------------------- */
/* Media                                                                       */
/* -------------------------------------------------------------------------- */

export const listMediaInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(100).default(30),
  query: z
    .string()
    .trim()
    .max(120)
    .optional()
    .describe('Filter on file name or alt text, e.g. "wormwood" or "laboratory".'),
});

export const uploadMediaInputSchema = z.strictObject({
  altText: z
    .string()
    .trim()
    .max(300)
    .optional()
    .describe('Alt text describing the image. Write real alt text — it is what screen readers announce and what search engines index.'),
  url: z
    .string()
    .trim()
    .min(1)
    .max(2048)
    .describe('Public https URL of the image to bring into the media library.'),
});

export async function executeListMedia(
  input: z.infer<typeof listMediaInputSchema>,
  context?: ContentOpsToolContext
) {
  const parsed = listMediaInputSchema.parse(input);
  const supabase = requireSupabase(context);

  let query = supabase
    .from('media')
    .select(MEDIA_SELECT)
    .order('created_at', { ascending: false })
    .limit(parsed.limit);

  if (parsed.query) {
    const term = `%${parsed.query}%`;
    query = query.or(`file_name.ilike.${term},description.ilike.${term}`);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(`Could not read the media library: ${serializeError(error)}`);
  }

  return { count: (data ?? []).length, media: data ?? [], success: true };
}

export async function executeUploadMedia(
  input: z.infer<typeof uploadMediaInputSchema>,
  context?: ContentOpsToolContext
) {
  const parsed = uploadMediaInputSchema.parse(input);
  const importImage = context?.importExternalImage;

  if (!importImage) {
    throw new Error('Media import is not available on this connection.');
  }

  const result = await importImage({
    ...(parsed.altText ? { altText: parsed.altText } : {}),
    url: parsed.url,
  });

  if ('error' in result) {
    throw new Error(`Could not import that image: ${result.error}`);
  }

  return { mediaId: result.id, mutationExecuted: true, success: true };
}

/* -------------------------------------------------------------------------- */
/* Languages                                                                   */
/* -------------------------------------------------------------------------- */

export const manageLanguageInputSchema = z.strictObject({
  code: z
    .string()
    .trim()
    .min(2)
    .max(10)
    .describe('Locale code, e.g. "fr", "es", "de". Re-using an existing code updates that language.'),
  is_active: z.boolean().default(true).describe('Inactive languages are hidden from the public switcher.'),
  is_default: z
    .boolean()
    .default(false)
    .describe('Make this the site default. Only one language can be default; setting it clears the others.'),
  name: z.string().trim().min(1).max(80).describe('Display name, e.g. "Français".'),
});

export async function executeManageLanguage(
  input: z.infer<typeof manageLanguageInputSchema>,
  context?: ContentOpsToolContext
) {
  const parsed = manageLanguageInputSchema.parse(input);
  const supabase = requireSupabase(context);
  const code = parsed.code.toLowerCase();

  const { data: existing } = await supabase
    .from('languages')
    .select('id, code')
    .eq('code', code)
    .maybeSingle();

  const payload = {
    code,
    is_active: parsed.is_active,
    name: parsed.name,
  };

  let languageId = existing?.id as number | undefined;

  if (languageId) {
    const { error } = await supabase.from('languages').update(payload).eq('id', languageId);

    if (error) {
      throw new Error(`Could not update the "${code}" language: ${serializeError(error)}`);
    }
  } else {
    const { data: created, error } = await supabase
      .from('languages')
      .insert(payload)
      .select('id')
      .single();

    if (error || !created?.id) {
      throw new Error(`Could not create the "${code}" language: ${serializeError(error)}`);
    }

    languageId = created.id as number;
  }

  // Single-winner flag: demote the others first so two rows never both claim it.
  if (parsed.is_default) {
    const { error: demoteError } = await supabase
      .from('languages')
      .update({ is_default: false })
      .neq('id', languageId);

    if (demoteError) {
      throw new Error(`Could not clear the previous default language: ${serializeError(demoteError)}`);
    }

    const { error: promoteError } = await supabase
      .from('languages')
      .update({ is_default: true })
      .eq('id', languageId);

    if (promoteError) {
      throw new Error(`Could not set the default language: ${serializeError(promoteError)}`);
    }
  }

  try {
    context?.revalidatePath?.('/', 'layout');
  } catch {
    // Revalidation is best-effort; the language row is already written.
  }

  return {
    code,
    created: !existing,
    languageId,
    mutationExecuted: true,
    success: true,
  };
}

/* -------------------------------------------------------------------------- */
/* Product categories                                                          */
/* -------------------------------------------------------------------------- */

export const manageProductCategoryInputSchema = z.strictObject({
  action: z.enum(['upsert', 'delete']).default('upsert'),
  description: z.string().max(1000).nullable().optional(),
  name: z.string().trim().min(1).max(120).describe('Category name, e.g. "Digestive Health".'),
  name_translations: z
    .record(z.string(), z.string())
    .optional()
    .describe('Translated names keyed by locale code, e.g. { "fr": "Santé digestive" }.'),
  productSlugs: z
    .array(z.string().trim().min(1).max(300))
    .max(100)
    .optional()
    .describe('Product slugs to place in this category. Replaces the category\'s current membership.'),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(120)
    .optional()
    .describe('URL slug. Derived from the name when omitted. Re-using a slug updates that category.'),
});

export async function executeManageProductCategory(
  input: z.infer<typeof manageProductCategoryInputSchema>,
  context?: ContentOpsToolContext
) {
  const parsed = manageProductCategoryInputSchema.parse(input);
  const supabase = requireSupabase(context);
  const slug = parsed.slug ? slugify(parsed.slug) : slugify(parsed.name);

  const { data: existing } = await supabase
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle();

  if (parsed.action === 'delete') {
    if (!existing?.id) {
      return {
        message: `No category with slug "${slug}".`,
        mutationExecuted: false,
        success: false,
      };
    }

    const { error } = await supabase.from('categories').delete().eq('id', existing.id);

    if (error) {
      throw new Error(`Could not delete the category: ${serializeError(error)}`);
    }

    return { action: 'delete', mutationExecuted: true, slug, success: true };
  }

  const payload: Record<string, unknown> = {
    name: parsed.name,
    slug,
    ...(parsed.description !== undefined ? { description: parsed.description } : {}),
    ...(parsed.name_translations ? { name_translations: parsed.name_translations } : {}),
  };

  let categoryId = existing?.id as string | undefined;

  if (categoryId) {
    const { error } = await supabase.from('categories').update(payload).eq('id', categoryId);

    if (error) {
      throw new Error(`Could not update the category: ${serializeError(error)}`);
    }
  } else {
    const { data: created, error } = await supabase
      .from('categories')
      .insert(payload)
      .select('id')
      .single();

    if (error || !created?.id) {
      throw new Error(`Could not create the category: ${serializeError(error)}`);
    }

    categoryId = created.id as string;
  }

  let linkedProducts = 0;

  if (parsed.productSlugs) {
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, slug')
      .in('slug', parsed.productSlugs);

    if (productError) {
      throw new Error(`Could not resolve those products: ${serializeError(productError)}`);
    }

    const found = products ?? [];
    const missing = parsed.productSlugs.filter(
      (wanted) => !found.some((row: any) => row.slug === wanted)
    );

    if (missing.length > 0) {
      throw new Error(`No product found for slug(s): ${missing.join(', ')}.`);
    }

    // Membership is replaced, not merged, so the supplied list is the whole truth.
    const { error: clearError } = await supabase
      .from('product_categories')
      .delete()
      .eq('category_id', categoryId);

    if (clearError) {
      throw new Error(`Could not clear the category's products: ${serializeError(clearError)}`);
    }

    if (found.length > 0) {
      const { error: linkError } = await supabase
        .from('product_categories')
        .insert(found.map((row: any) => ({ category_id: categoryId, product_id: row.id })));

      if (linkError) {
        throw new Error(`Could not add products to the category: ${serializeError(linkError)}`);
      }

      linkedProducts = found.length;
    }
  }

  return {
    categoryId,
    created: !existing,
    linkedProducts,
    mutationExecuted: true,
    slug,
    success: true,
  };
}

export const listProductCategoriesInputSchema = z.strictObject({});

export async function executeListProductCategories(
  _input: unknown,
  context?: ContentOpsToolContext
) {
  const supabase = requireSupabase(context);
  const { data, error } = await supabase
    .from('categories')
    .select('id, name, slug, description, name_translations')
    .order('name');

  if (error) {
    throw new Error(`Could not read the categories: ${serializeError(error)}`);
  }

  return { categories: data ?? [], count: (data ?? []).length, success: true };
}

export function createCortexContentOpsTools(context?: ContentOpsToolContext) {
  return {
    list_media: tool({
      description:
        'Browse the media library: file names, alt text, dimensions, and media ids. Read-only. Call this BEFORE importing an image so you reuse what is already stored instead of creating a duplicate — the returned `id` can be passed anywhere a media id or image reference is accepted (feature_image_id, product images, an image block).',
      execute: (input) => executeListMedia(input, context),
      inputSchema: listMediaInputSchema,
      strict: true,
    }),
    list_product_categories: tool({
      description:
        'List the product categories, with their slugs and translated names. Read-only. Use before creating one so an existing category is reused, and to get ids for a product_grid block filtered by category.',
      execute: (input) => executeListProductCategories(input, context),
      inputSchema: listProductCategoriesInputSchema,
      strict: true,
    }),
    manage_language: tool({
      description:
        'Add or update a site language, so the CMS can hold content in that locale. Creating the language is the FIRST step of making a site multilingual — translate_page cannot target a locale that does not exist yet. Re-using a code updates that language; set is_default to change the site default.',
      execute: (input) => executeManageLanguage(input, context),
      inputSchema: manageLanguageInputSchema,
      strict: true,
    }),
    manage_product_category: tool({
      description:
        'Create, update, or delete a product category, and optionally set exactly which products belong to it by slug. Categories are what a product_grid block filters on, so create these before building a shop page that shows one section of the catalogue. Passing productSlugs REPLACES the category\'s membership.',
      execute: (input) => executeManageProductCategory(input, context),
      inputSchema: manageProductCategoryInputSchema,
      strict: true,
    }),
    upload_media: tool({
      description:
        'Import an image from a public https URL into the media library and return its media id, without attaching it to anything. Useful when you want one asset reused across several places — otherwise passing the URL straight to create_cms_product `images` or a page/post `feature_image_id` imports it in the same call. Check list_media first to avoid duplicates.',
      execute: (input) => executeUploadMedia(input, context),
      inputSchema: uploadMediaInputSchema,
      strict: true,
    }),
  };
}
