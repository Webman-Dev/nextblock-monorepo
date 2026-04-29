import { tool } from 'ai';
import { z } from 'zod';

export const availableCortexAiBlockTypes = [
  'text',
  'heading',
  'image',
  'button',
  'posts_grid',
  'video_embed',
  'section',
  'hero',
  'form',
  'testimonial',
  'product_grid',
  'featured_product',
  'cart',
  'checkout',
  'product_details',
] as const;
type BlockType = (typeof availableCortexAiBlockTypes)[number];
type SectionBlockContent = Record<string, any> & {
  column_blocks: Array<Array<{ block_type: BlockType; content: Record<string, unknown>; temp_id?: string }>>;
};

type SupabaseLike = {
  from: (table: string) => any;
};

type RevalidateFn = (path: string, type?: 'layout' | 'page') => void;
type MenuKey = 'HEADER' | 'FOOTER';

type ToolExecutionContext = {
  pageContext?: CortexAiPageContext | null;
  revalidatePath?: RevalidateFn;
  supabase?: SupabaseLike;
};

const LANGUAGE_NAME_ALIASES: Record<string, string> = {
  arabic: 'ar',
  chinese: 'zh',
  dutch: 'nl',
  english: 'en',
  french: 'fr',
  francaise: 'fr',
  francais: 'fr',
  german: 'de',
  italian: 'it',
  japanese: 'ja',
  korean: 'ko',
  portuguese: 'pt',
  russian: 'ru',
  spanish: 'es',
};

const urlSchema = z
  .string()
  .trim()
  .min(1)
  .max(2048)
  .refine(
    (value) =>
      value.startsWith('/') ||
      value.startsWith('#') ||
      value.startsWith('http://') ||
      value.startsWith('https://') ||
      value.startsWith('mailto:') ||
      value.startsWith('tel:'),
    'URL must be a relative path, hash link, http(s) URL, mailto URL, or tel URL.'
  );

const navigationChildItemSchema = z.strictObject({
  label: z.string().trim().min(1).max(120),
  target: z.enum(['_self', '_blank']).optional(),
  url: urlSchema,
});

export const navigationItemInputSchema = navigationChildItemSchema.extend({
  children: z.array(navigationChildItemSchema).max(20).optional(),
});

const navigationItemMatchSchema = z
  .strictObject({
    label: z.string().trim().min(1).max(120).optional(),
    url: urlSchema.optional(),
  })
  .refine((value) => Boolean(value.label || value.url), {
    message: 'Navigation item match requires label or url.',
  });

export const updateNavigationBarInputSchema = z.strictObject({
  items: z.array(navigationItemInputSchema).min(1).max(30),
  languageCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .default('en')
    .describe('Locale code or language name, for example "en", "fr", "English", or "French".'),
  match: navigationItemMatchSchema
    .optional()
    .describe('For mode "update", identifies the existing navigation item to update.'),
  mode: z.enum(['append', 'replace', 'update']).default('append'),
});

export const updateFooterInputSchema = z.strictObject({
  copyright: z.record(z.string().trim().min(2).max(12), z.string().trim().min(1).max(500)).optional(),
  languageCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .default('en')
    .describe('Locale code or language name, for example "en", "fr", "English", or "French".'),
  links: z.array(navigationItemInputSchema).min(1).max(30).optional(),
});

export const searchDocumentationInputSchema = z.strictObject({
  limit: z.number().int().min(1).max(8).default(4),
  query: z.string().trim().min(2).max(300),
});

export const cortexAiPageContextSchema = z.strictObject({
  contentType: z.enum(['page', 'post', 'product']),
  currentEditor: z
    .strictObject({
      blockId: z.union([z.number().int().positive(), z.string().trim().min(1).max(120)]).nullable().optional(),
      blockType: z.string().trim().min(1).max(80).nullable().optional(),
      field: z.string().trim().min(1).max(120).nullable().optional(),
    })
    .optional(),
  entityId: z.union([z.number().int().positive(), z.string().trim().min(1).max(120)]),
  languageId: z.number().int().positive().nullable().optional(),
  slug: z.string().trim().min(1).max(300).nullable().optional(),
  title: z.string().trim().min(1).max(300).nullable().optional(),
});

export const readCurrentCmsItemInputSchema = z.strictObject({
  includeBlockContent: z.boolean().default(false),
  includeBlocks: z.boolean().default(true),
});

export const updateCurrentCmsFieldsInputSchema = z.strictObject({
  fields: z
    .strictObject({
      description_json: z.unknown().optional(),
      excerpt: z.string().max(2000).nullable().optional(),
      feature_image_id: z.string().trim().min(1).max(120).nullable().optional(),
      label: z.string().max(120).nullable().optional(),
      meta_description: z.string().max(500).nullable().optional(),
      meta_title: z.string().max(160).nullable().optional(),
      published_at: z.string().max(80).nullable().optional(),
      short_description: z.string().max(2000).nullable().optional(),
      slug: z.string().trim().min(1).max(300).optional(),
      status: z.enum(['draft', 'published', 'active', 'archived']).optional(),
      subtitle: z.string().max(300).nullable().optional(),
      title: z.string().trim().min(1).max(300).optional(),
    })
    .partial(),
});

export const updateContentBlockInputSchema = z.strictObject({
  blockId: z.number().int().positive(),
  blockType: z.enum(availableCortexAiBlockTypes).optional(),
  content: z.record(z.string(), z.unknown()),
});

export const updateSectionColumnBlockInputSchema = z.strictObject({
  blockIndex: z.number().int().min(0),
  blockType: z.enum(availableCortexAiBlockTypes).optional(),
  columnIndex: z.number().int().min(0),
  content: z.record(z.string(), z.unknown()),
  parentBlockId: z.number().int().positive(),
});

export type NavigationItemInput = z.infer<typeof navigationItemInputSchema>;
export type UpdateNavigationBarInput = z.infer<typeof updateNavigationBarInputSchema>;
export type UpdateFooterInput = z.infer<typeof updateFooterInputSchema>;
export type SearchDocumentationInput = z.infer<typeof searchDocumentationInputSchema>;
export type CortexAiPageContext = z.infer<typeof cortexAiPageContextSchema>;
export type ReadCurrentCmsItemInput = z.infer<typeof readCurrentCmsItemInputSchema>;
export type UpdateCurrentCmsFieldsInput = z.infer<typeof updateCurrentCmsFieldsInputSchema>;
export type UpdateContentBlockInput = z.infer<typeof updateContentBlockInputSchema>;
export type UpdateSectionColumnBlockInput = z.infer<typeof updateSectionColumnBlockInputSchema>;

type DocumentationSnippet = {
  excerpt: string;
  source: 'page' | 'post';
  title: string;
  url: string;
};

type BlockValidationResult = {
  errors: string[];
  isValid: boolean;
  warnings: string[];
};

const cortexAiBlockTypeSchema = z.enum(availableCortexAiBlockTypes);
const gradientSchema = z.object({
  direction: z.string().optional(),
  stops: z.array(z.object({ color: z.string(), position: z.number() })),
  type: z.enum(['linear', 'radial']),
});
const backgroundSchema = z.object({
  gradient: gradientSchema.optional(),
  image: z
    .object({
      alt_text: z.string().optional(),
      blur_data_url: z.string().optional(),
      height: z.number().optional(),
      media_id: z.string(),
      object_key: z.string(),
      overlay: z
        .object({
          gradient: gradientSchema,
          type: z.literal('gradient'),
        })
        .optional(),
      position: z.enum(['center', 'top', 'bottom', 'left', 'right']),
      quality: z.number().nullable().optional(),
      size: z.enum(['cover', 'contain']),
      width: z.number().optional(),
    })
    .optional(),
  min_height: z.string().optional(),
  solid_color: z.string().optional(),
  theme: z.enum(['primary', 'secondary', 'muted', 'accent', 'destructive']).optional(),
  type: z.enum(['none', 'theme', 'solid', 'gradient', 'image']),
});
const blockInColumnSchema = z.object({
  block_type: cortexAiBlockTypeSchema,
  content: z.record(z.string(), z.any()),
  temp_id: z.string().optional(),
});
const sectionBlockFallbackSchema = z.object({
  background: backgroundSchema,
  column_blocks: z.array(z.array(blockInColumnSchema)),
  column_gap: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  container_type: z.enum(['full-width', 'container', 'container-sm', 'container-lg', 'container-xl']),
  padding: z.object({
    bottom: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
    top: z.enum(['none', 'sm', 'md', 'lg', 'xl']),
  }),
  responsive_columns: z.object({
    desktop: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
    mobile: z.union([z.literal(1), z.literal(2)]),
    tablet: z.union([z.literal(1), z.literal(2), z.literal(3)]),
  }),
  vertical_alignment: z.enum(['start', 'center', 'end', 'stretch']).optional(),
});
const fallbackBlockSchemas: Record<BlockType, z.ZodTypeAny> = {
  button: z.object({
    position: z.enum(['left', 'center', 'right']).optional(),
    size: z.enum(['default', 'sm', 'lg', 'full']).optional(),
    text: z.string(),
    url: z.string(),
    variant: z.enum(['default', 'outline', 'secondary', 'ghost', 'link']).optional(),
  }),
  cart: z.object({}),
  checkout: z.object({}),
  featured_product: z.object({
    imagePosition: z.enum(['left', 'right']).default('left'),
    productId: z.string().min(1),
    showBackground: z.boolean().default(false),
  }),
  form: z.object({
    fields: z.array(
      z.object({
        field_type: z.enum(['text', 'email', 'textarea', 'select', 'radio', 'checkbox']),
        is_required: z.boolean(),
        label: z.string(),
        options: z.array(z.object({ label: z.string(), value: z.string() })).optional(),
        placeholder: z.string().optional(),
        temp_id: z.string(),
      })
    ),
    recipient_email: z.string().email(),
    submit_button_text: z.string(),
    success_message: z.string(),
  }),
  heading: z.object({
    level: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4), z.literal(5), z.literal(6)]),
    textAlign: z.enum(['left', 'center', 'right', 'justify']).optional(),
    textColor: z.enum(['primary', 'secondary', 'accent', 'muted', 'destructive', 'background']).optional(),
    text_content: z.string(),
  }),
  hero: sectionBlockFallbackSchema,
  image: z.object({
    alt_text: z.string().optional(),
    caption: z.string().optional(),
    height: z.number().nullable().optional(),
    media_id: z.string().nullable(),
    object_key: z.string().nullable().optional(),
    width: z.number().nullable().optional(),
  }),
  posts_grid: z.object({
    columns: z.number().min(1).max(6),
    postsPerPage: z.number().min(1).max(50),
    showPagination: z.boolean(),
    title: z.string().optional(),
  }),
  product_details: z.object({}),
  product_grid: z.object({
    categoryId: z.string().optional(),
    limit: z.number().min(1).max(20).default(6),
    title: z.string().optional(),
    type: z.enum(['latest', 'category']).default('latest'),
  }),
  section: sectionBlockFallbackSchema,
  testimonial: z.object({
    author_name: z.string().min(1),
    author_title: z.string().optional(),
    image_url: z.string().url().optional().or(z.literal('')),
    quote: z.string().min(1),
  }),
  text: z.object({
    html_content: z.string(),
  }),
  video_embed: z.object({
    autoplay: z.boolean().optional(),
    controls: z.boolean().optional(),
    title: z.string().optional(),
    url: z.string(),
  }),
};
let runtimeBlockContentValidator:
  | false
  | ((blockType: BlockType, content: Record<string, any>) => BlockValidationResult)
  | null = null;

function isValidBlockType(blockType: string): blockType is BlockType {
  return (availableCortexAiBlockTypes as readonly string[]).includes(blockType);
}

function getRuntimeBlockContentValidator() {
  if (runtimeBlockContentValidator !== null) {
    return runtimeBlockContentValidator || null;
  }

  try {
    const registry = require('./blocks/blockRegistry') as {
      validateBlockContent?: (
        blockType: BlockType,
        content: Record<string, any>
      ) => BlockValidationResult;
    };

    runtimeBlockContentValidator =
      typeof registry.validateBlockContent === 'function'
        ? registry.validateBlockContent
        : false;
  } catch {
    runtimeBlockContentValidator = false;
  }

  return runtimeBlockContentValidator || null;
}

function validateCortexBlockContent(blockType: BlockType, content: Record<string, unknown>) {
  const runtimeValidator = getRuntimeBlockContentValidator();

  if (runtimeValidator) {
    return runtimeValidator(blockType, content);
  }

  const result = fallbackBlockSchemas[blockType].safeParse(content);

  if (result.success) {
    return { errors: [], isValid: true, warnings: [] };
  }

  return {
    errors: result.error.issues.map((issue) => {
      const path = issue.path.join('.');
      return path ? `${path}: ${issue.message}` : issue.message;
    }),
    isValid: false,
    warnings: [],
  };
}

function getEditorBlockDocumentSchema() {
  const { editorBlockDocumentSchema } = require('../../../schemas/editor-blocks') as typeof import('../../../schemas/editor-blocks');
  return editorBlockDocumentSchema;
}

function getDefaultRevalidatePath(): RevalidateFn | null {
  try {
    const { revalidatePath } = require('next/cache') as typeof import('next/cache');
    return revalidatePath;
  } catch {
    return null;
  }
}

function getSupabase(context?: ToolExecutionContext) {
  if (!context?.supabase) {
    throw new Error('A Supabase service client is required to execute Cortex AI global tools.');
  }

  return context.supabase;
}

function getCurrentCmsContext(context?: ToolExecutionContext) {
  const parsed = cortexAiPageContextSchema.safeParse(context?.pageContext);

  if (!parsed.success) {
    throw new Error(
      'No current CMS page context is available. Open a page, post, or product edit screen before using this editing tool.'
    );
  }

  return parsed.data;
}

function getNumericEntityId(pageContext: CortexAiPageContext) {
  const id =
    typeof pageContext.entityId === 'number'
      ? pageContext.entityId
      : Number.parseInt(pageContext.entityId, 10);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error(`Current ${pageContext.contentType} id must be a positive integer.`);
  }

  return id;
}

function getStringEntityId(pageContext: CortexAiPageContext) {
  const id = String(pageContext.entityId || '').trim();

  if (!id) {
    throw new Error(`Current ${pageContext.contentType} id is missing.`);
  }

  return id;
}

function getCmsEntityId(pageContext: CortexAiPageContext) {
  return pageContext.contentType === 'product'
    ? getStringEntityId(pageContext)
    : getNumericEntityId(pageContext);
}

function normalizePublicSlug(slug: unknown) {
  return typeof slug === 'string' ? slug.trim().replace(/^\/+|\/+$/g, '') : '';
}

function getPublicCmsPath(pageContext: CortexAiPageContext, slugOverride?: unknown) {
  const slug = normalizePublicSlug(slugOverride ?? pageContext.slug);

  if (!slug) {
    return null;
  }

  if (pageContext.contentType === 'page') {
    return slug === 'home' ? '/' : `/${slug}`;
  }

  if (pageContext.contentType === 'post') {
    return `/article/${slug}`;
  }

  return `/product/${slug}`;
}

function getCmsEditPath(pageContext: CortexAiPageContext) {
  const entityId = String(pageContext.entityId);

  if (pageContext.contentType === 'page') {
    return `/cms/pages/${entityId}/edit`;
  }

  if (pageContext.contentType === 'post') {
    return `/cms/posts/${entityId}/edit`;
  }

  return `/cms/products/${entityId}/edit`;
}

function revalidateCurrentCmsSurfaces(
  context: ToolExecutionContext | undefined,
  pageContext: CortexAiPageContext,
  slugOverride?: unknown
) {
  const revalidatePath = context?.revalidatePath ?? getDefaultRevalidatePath();

  if (!revalidatePath) {
    return;
  }

  revalidatePath(getCmsEditPath(pageContext));

  const publicPath = getPublicCmsPath(pageContext, slugOverride);

  if (publicPath) {
    revalidatePath(publicPath);
  }

  if (pageContext.contentType === 'product') {
    revalidatePath('/cms/products');
  }
}

function revalidateGlobalCmsSurfaces(context?: ToolExecutionContext) {
  const revalidatePath = context?.revalidatePath ?? getDefaultRevalidatePath();

  if (!revalidatePath) {
    return;
  }

  revalidatePath('/', 'layout');
  revalidatePath('/cms/navigation');
}

function serializeError(error: unknown) {
  if (!error) {
    return 'Unknown database error.';
  }

  if (typeof error === 'object' && 'message' in error) {
    return String((error as { message?: unknown }).message || 'Unknown database error.');
  }

  return String(error);
}

function cloneJsonRecord(value: unknown, label: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${label} content must be a JSON object.`);
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, any>;
}

function assertBlockBelongsToCurrentContext(block: any, pageContext: CortexAiPageContext) {
  if (pageContext.contentType === 'product') {
    throw new Error('Products do not have page/post content blocks in this editor context.');
  }

  const parentId = getNumericEntityId(pageContext);
  const actualParentId =
    pageContext.contentType === 'page' ? Number(block.page_id) : Number(block.post_id);

  if (actualParentId !== parentId) {
    throw new Error(
      `Block ${block.id} does not belong to the current ${pageContext.contentType} being edited.`
    );
  }
}

function resolveExistingBlockType(blockType: unknown, label: string): BlockType {
  const normalizedBlockType = typeof blockType === 'string' ? blockType : '';

  if (!isValidBlockType(normalizedBlockType)) {
    throw new Error(`${label} has unsupported block type "${normalizedBlockType || 'unknown'}".`);
  }

  return normalizedBlockType;
}

function assertRequestedBlockTypeMatches(
  requestedBlockType: BlockType | undefined,
  existingBlockType: BlockType,
  label: string
) {
  if (requestedBlockType && requestedBlockType !== existingBlockType) {
    throw new Error(
      `${label} is a "${existingBlockType}" block. Refusing to update it as "${requestedBlockType}".`
    );
  }
}

function assertValidBlockContent(blockType: BlockType, content: Record<string, unknown>, label: string) {
  const validation = validateCortexBlockContent(blockType, content);

  if (!validation.isValid) {
    throw new Error(
      `${label} content is invalid for block type "${blockType}": ${validation.errors.join('; ')}`
    );
  }
}

function summarizeBlockRow(block: any, includeContent: boolean) {
  return {
    blockType: block.block_type,
    content: includeContent ? block.content : undefined,
    id: block.id,
    languageId: block.language_id,
    order: block.order,
    pageId: block.page_id,
    postId: block.post_id,
  };
}

function normalizeNavigationUrl(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function normalizeNavigationLabel(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

function countNavigationInputItems(items: NavigationItemInput[]) {
  return items.reduce((count, item) => count + 1 + (item.children?.length || 0), 0);
}

function normalizeLanguageLookup(value: unknown) {
  return typeof value === 'string'
    ? value
        .trim()
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
    : '';
}

async function getLanguageRecord(supabase: SupabaseLike, languageCode: string) {
  const requestedLanguage = languageCode.trim();
  const normalizedRequestedLanguage = normalizeLanguageLookup(requestedLanguage);
  const aliasCode = LANGUAGE_NAME_ALIASES[normalizedRequestedLanguage];
  const { data, error } = await supabase
    .from('languages')
    .select('id, code, name, is_active');

  if (error) {
    throw new Error(`Failed to load language "${languageCode}": ${serializeError(error)}`);
  }

  const languages = Array.isArray(data) ? data : [];
  const activeLanguages = languages.filter((language: any) => language.is_active !== false);
  const matchedLanguage = activeLanguages.find((language: any) => {
    const normalizedCode = normalizeLanguageLookup(language.code);
    const normalizedName = normalizeLanguageLookup(language.name);

    return (
      normalizedCode === normalizedRequestedLanguage ||
      normalizedCode === aliasCode ||
      normalizedName === normalizedRequestedLanguage
    );
  });

  if (!matchedLanguage?.id || !matchedLanguage?.code) {
    const availableLanguages = activeLanguages
      .map((language: any) => language.code)
      .filter(Boolean)
      .join(', ');

    throw new Error(
      `Language "${languageCode}" was not found.${availableLanguages ? ` Available languages: ${availableLanguages}.` : ''}`
    );
  }

  return {
    code: String(matchedLanguage.code),
    id: Number(matchedLanguage.id),
  };
}

async function insertNavigationItem(params: {
  item: NavigationItemInput;
  languageId: number;
  menuKey: MenuKey;
  order: number;
  parentId?: number | null;
  supabase: SupabaseLike;
}) {
  const { data, error } = await params.supabase
    .from('navigation_items')
    .insert({
      label: params.item.label,
      language_id: params.languageId,
      menu_key: params.menuKey,
      order: params.order,
      parent_id: params.parentId ?? null,
      page_id: null,
      url: params.item.url,
    })
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert ${params.menuKey} navigation item: ${serializeError(error)}`);
  }

  return Number(data.id);
}

async function replaceNavigationMenu<TMenuKey extends MenuKey>(params: {
  items: NavigationItemInput[];
  languageCode: string;
  menuKey: TMenuKey;
  supabase: SupabaseLike;
}) {
  const language = await getLanguageRecord(params.supabase, params.languageCode);
  const { data: existingItems, error: existingItemsError } = await params.supabase
    .from('navigation_items')
    .select('id, parent_id')
    .eq('menu_key', params.menuKey)
    .eq('language_id', language.id);

  if (existingItemsError) {
    throw new Error(
      `Failed to inspect existing ${params.menuKey} navigation items: ${serializeError(existingItemsError)}`
    );
  }

  const existingRows = Array.isArray(existingItems) ? existingItems : [];
  const existingTopLevelCount = existingRows.filter((item: any) => item.parent_id == null).length;
  const replacementItemCount = countNavigationInputItems(params.items);

  if (existingRows.length > 0 && replacementItemCount < existingRows.length) {
    throw new Error(
      `Refusing destructive ${params.menuKey} navigation replacement for ${language.code}: existing menu has ${existingRows.length} items (${existingTopLevelCount} top-level), but the replacement only contains ${replacementItemCount}. Use mode "update" for renaming or changing a single link, or provide the full menu.`
    );
  }

  const { error: deleteError } = await params.supabase
    .from('navigation_items')
    .delete()
    .eq('menu_key', params.menuKey)
    .eq('language_id', language.id);

  if (deleteError) {
    throw new Error(`Failed to clear ${params.menuKey} navigation items: ${serializeError(deleteError)}`);
  }

  let insertedCount = 0;

  for (const [index, item] of params.items.entries()) {
    const parentId = await insertNavigationItem({
      item,
      languageId: language.id,
      menuKey: params.menuKey,
      order: index,
      supabase: params.supabase,
    });
    insertedCount++;

    for (const [childIndex, child] of (item.children ?? []).entries()) {
      await insertNavigationItem({
        item: child,
        languageId: language.id,
        menuKey: params.menuKey,
        order: childIndex,
        parentId,
        supabase: params.supabase,
      });
      insertedCount++;
    }
  }

  return {
    insertedCount,
    languageCode: language.code,
    menuKey: params.menuKey,
    skippedCount: 0,
    updatedCount: 0,
  };
}

async function updateNavigationMenuItem(params: {
  items: NavigationItemInput[];
  languageCode: string;
  match?: z.infer<typeof navigationItemMatchSchema>;
  menuKey: MenuKey;
  supabase: SupabaseLike;
}) {
  if (params.items.length !== 1) {
    throw new Error('mode "update" requires exactly one navigation item.');
  }

  const language = await getLanguageRecord(params.supabase, params.languageCode);
  const item = params.items[0];
  const matchUrl = normalizeNavigationUrl(params.match?.url) || normalizeNavigationUrl(item.url);
  const matchLabel = normalizeNavigationLabel(params.match?.label);
  const { data: existingItems, error: existingItemsError } = await params.supabase
    .from('navigation_items')
    .select('id, label, url, parent_id, order')
    .eq('menu_key', params.menuKey)
    .eq('language_id', language.id);

  if (existingItemsError) {
    throw new Error(
      `Failed to load existing ${params.menuKey} navigation items: ${serializeError(existingItemsError)}`
    );
  }

  const existingRows = Array.isArray(existingItems) ? existingItems : [];
  const matchedItem = existingRows.find((row: any) => {
    const rowUrl = normalizeNavigationUrl(row.url);
    const rowLabel = normalizeNavigationLabel(row.label);

    return Boolean(
      (matchUrl && rowUrl === matchUrl) ||
        (matchLabel && rowLabel === matchLabel)
    );
  });

  if (!matchedItem?.id) {
    throw new Error(
      `Could not find a ${params.menuKey} navigation item to update in ${language.code}. Use a matching label or url.`
    );
  }

  const { error: updateError } = await params.supabase
    .from('navigation_items')
    .update({
      label: item.label,
      url: item.url,
    })
    .eq('id', matchedItem.id);

  if (updateError) {
    throw new Error(`Failed to update ${params.menuKey} navigation item: ${serializeError(updateError)}`);
  }

  return {
    insertedCount: 0,
    languageCode: language.code,
    menuKey: params.menuKey,
    skippedCount: 0,
    updatedCount: 1,
  };
}

async function appendNavigationMenuItems(params: {
  items: NavigationItemInput[];
  languageCode: string;
  menuKey: MenuKey;
  supabase: SupabaseLike;
}) {
  const language = await getLanguageRecord(params.supabase, params.languageCode);
  const { data: existingItems, error: existingItemsError } = await params.supabase
    .from('navigation_items')
    .select('id, url, parent_id, order')
    .eq('menu_key', params.menuKey)
    .eq('language_id', language.id);

  if (existingItemsError) {
    throw new Error(
      `Failed to load existing ${params.menuKey} navigation items: ${serializeError(existingItemsError)}`
    );
  }

  let insertedCount = 0;
  let skippedCount = 0;
  const existingRows = Array.isArray(existingItems) ? existingItems : [];
  const existingUrls = new Set(
    existingRows.map((item: any) => normalizeNavigationUrl(item.url)).filter(Boolean)
  );
  const topLevelOrders = existingRows
    .filter((item: any) => item.parent_id == null)
    .map((item: any) => Number(item.order))
    .filter(Number.isFinite);
  let nextOrder = topLevelOrders.length > 0 ? Math.max(...topLevelOrders) + 1 : existingRows.length;

  for (const item of params.items) {
    const itemUrl = normalizeNavigationUrl(item.url);

    if (itemUrl && existingUrls.has(itemUrl)) {
      skippedCount++;
      continue;
    }

    const parentId = await insertNavigationItem({
      item,
      languageId: language.id,
      menuKey: params.menuKey,
      order: nextOrder,
      supabase: params.supabase,
    });
    insertedCount++;
    nextOrder++;

    if (itemUrl) {
      existingUrls.add(itemUrl);
    }

    let nextChildOrder = 0;

    for (const child of item.children ?? []) {
      const childUrl = normalizeNavigationUrl(child.url);

      if (childUrl && existingUrls.has(childUrl)) {
        skippedCount++;
        continue;
      }

      await insertNavigationItem({
        item: child,
        languageId: language.id,
        menuKey: params.menuKey,
        order: nextChildOrder,
        parentId,
        supabase: params.supabase,
      });
      insertedCount++;
      nextChildOrder++;

      if (childUrl) {
        existingUrls.add(childUrl);
      }
    }
  }

  return {
    insertedCount,
    languageCode: language.code,
    menuKey: params.menuKey,
    skippedCount,
    updatedCount: 0,
  };
}

export async function executeUpdateNavigationBar(
  input: UpdateNavigationBarInput,
  context?: ToolExecutionContext
) {
  const parsed = updateNavigationBarInputSchema.parse(input);
  const supabase = getSupabase(context);
  const result =
    parsed.mode === 'update'
      ? await updateNavigationMenuItem({
          items: parsed.items,
          languageCode: parsed.languageCode,
          match: parsed.match,
          menuKey: 'HEADER',
          supabase,
        })
      : parsed.mode === 'append'
        ? await appendNavigationMenuItems({
            items: parsed.items,
            languageCode: parsed.languageCode,
            menuKey: 'HEADER',
            supabase,
          })
        : await replaceNavigationMenu({
            items: parsed.items,
            languageCode: parsed.languageCode,
            menuKey: 'HEADER',
            supabase,
          });

  revalidateGlobalCmsSurfaces(context);

  return {
    ...result,
    mode: parsed.mode,
    success: true,
  };
}

export async function executeUpdateFooter(input: UpdateFooterInput, context?: ToolExecutionContext) {
  const parsed = updateFooterInputSchema.parse(input);

  if (!parsed.links?.length && !parsed.copyright) {
    throw new Error('update_footer requires links or copyright.');
  }

  const supabase = getSupabase(context);
  let footerNavigation:
    | {
        insertedCount: number;
        languageCode: string;
        menuKey: 'FOOTER';
        skippedCount: number;
        updatedCount: number;
      }
    | null = null;

  if (parsed.links?.length) {
    footerNavigation = await replaceNavigationMenu({
      items: parsed.links,
      languageCode: parsed.languageCode,
      menuKey: 'FOOTER',
      supabase,
    });
  }

  if (parsed.copyright) {
    const { error } = await supabase.from('site_settings').upsert({
      key: 'footer_copyright',
      value: parsed.copyright,
    });

    if (error) {
      throw new Error(`Failed to update footer copyright: ${serializeError(error)}`);
    }
  }

  revalidateGlobalCmsSurfaces(context);

  return {
    copyrightUpdated: Boolean(parsed.copyright),
    footerNavigation,
    success: true,
  };
}

function normalizeSearchText(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function scoreDocument(queryTerms: string[], values: string[]) {
  const haystack = values.map(normalizeSearchText).join(' ');

  return queryTerms.reduce((score, term) => score + (haystack.includes(term) ? 1 : 0), 0);
}

function pickSnippet(values: string[], queryTerms: string[]) {
  return (
    values.find((value) =>
      queryTerms.some((term) => normalizeSearchText(value).includes(term))
    ) ||
    values.find((value) => value.trim().length > 0) ||
    'No excerpt available.'
  ).slice(0, 500);
}

export async function executeSearchDocumentation(
  input: SearchDocumentationInput,
  context?: ToolExecutionContext
) {
  const parsed = searchDocumentationInputSchema.parse(input);
  const supabase = getSupabase(context);
  const queryTerms = parsed.query
    .toLowerCase()
    .split(/\s+/)
    .map((term) => term.trim())
    .filter(Boolean);

  const [postsResult, pagesResult] = await Promise.all([
    supabase
      .from('posts')
      .select('id, title, slug, excerpt, subtitle, meta_description, status, updated_at')
      .eq('status', 'published')
      .limit(100),
    supabase
      .from('pages')
      .select('id, title, slug, meta_description, status, updated_at')
      .eq('status', 'published')
      .limit(100),
  ]);

  if (postsResult.error) {
    throw new Error(`Failed to search documentation posts: ${serializeError(postsResult.error)}`);
  }

  if (pagesResult.error) {
    throw new Error(`Failed to search documentation pages: ${serializeError(pagesResult.error)}`);
  }

  const postSnippets: DocumentationSnippet[] = (postsResult.data ?? []).map((post: any) => ({
    excerpt: pickSnippet(
      [post.excerpt, post.subtitle, post.meta_description, post.slug].filter(Boolean),
      queryTerms
    ),
    source: 'post',
    title: post.title,
    url: `/article/${post.slug}`,
  }));

  const pageSnippets: DocumentationSnippet[] = (pagesResult.data ?? []).map((page: any) => ({
    excerpt: pickSnippet([page.meta_description, page.slug].filter(Boolean), queryTerms),
    source: 'page',
    title: page.title,
    url: page.slug === 'home' ? '/' : `/${page.slug}`,
  }));

  const results = [...postSnippets, ...pageSnippets]
    .map((snippet) => ({
      ...snippet,
      score: scoreDocument(queryTerms, [snippet.title, snippet.excerpt, snippet.url]),
    }))
    .filter((snippet) => snippet.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, parsed.limit)
    .map(({ score: _score, ...snippet }) => snippet);

  return {
    query: parsed.query,
    results,
    success: true,
  };
}

export async function executeReadCurrentCmsItem(
  input: ReadCurrentCmsItemInput,
  context?: ToolExecutionContext
) {
  const parsed = readCurrentCmsItemInputSchema.parse(input);
  const supabase = getSupabase(context);
  const pageContext = getCurrentCmsContext(context);
  const entityId = getCmsEntityId(pageContext);
  const table =
    pageContext.contentType === 'page'
      ? 'pages'
      : pageContext.contentType === 'post'
        ? 'posts'
        : 'products';
  const { data: item, error: itemError } = await supabase
    .from(table)
    .select('*')
    .eq('id', entityId)
    .single();

  if (itemError || !item) {
    throw new Error(
      `Failed to read current ${pageContext.contentType}: ${serializeError(itemError)}`
    );
  }

  let blocks: ReturnType<typeof summarizeBlockRow>[] = [];

  if (parsed.includeBlocks && pageContext.contentType !== 'product') {
    const blockParentColumn = pageContext.contentType === 'page' ? 'page_id' : 'post_id';
    const { data: blockRows, error: blocksError } = await supabase
      .from('blocks')
      .select('id, page_id, post_id, language_id, block_type, content, order')
      .eq(blockParentColumn, entityId);

    if (blocksError) {
      throw new Error(`Failed to read current ${pageContext.contentType} blocks: ${serializeError(blocksError)}`);
    }

    blocks = (Array.isArray(blockRows) ? blockRows : [])
      .slice()
      .sort((a: any, b: any) => Number(a.order) - Number(b.order))
      .map((block: any) => summarizeBlockRow(block, parsed.includeBlockContent));
  }

  return {
    blocks,
    context: pageContext,
    item,
    success: true,
  };
}

const PAGE_FIELD_NAMES = new Set(['meta_description', 'meta_title', 'slug', 'status', 'title']);
const POST_FIELD_NAMES = new Set([
  'excerpt',
  'feature_image_id',
  'label',
  'meta_description',
  'meta_title',
  'published_at',
  'slug',
  'status',
  'subtitle',
  'title',
]);
const PRODUCT_FIELD_NAMES = new Set([
  'description_json',
  'meta_description',
  'meta_title',
  'short_description',
  'slug',
  'status',
  'title',
]);
const NULLABLE_TEXT_FIELD_NAMES = new Set([
  'excerpt',
  'feature_image_id',
  'label',
  'meta_description',
  'meta_title',
  'published_at',
  'short_description',
  'subtitle',
]);

function getAllowedFieldNames(contentType: CortexAiPageContext['contentType']) {
  if (contentType === 'page') {
    return PAGE_FIELD_NAMES;
  }

  if (contentType === 'post') {
    return POST_FIELD_NAMES;
  }

  return PRODUCT_FIELD_NAMES;
}

function normalizeCmsFieldValue(fieldName: string, value: unknown) {
  if (NULLABLE_TEXT_FIELD_NAMES.has(fieldName) && value === '') {
    return null;
  }

  return value;
}

function assertValidStatusForContentType(
  contentType: CortexAiPageContext['contentType'],
  status: unknown
) {
  if (typeof status !== 'string') {
    return;
  }

  const allowedStatuses =
    contentType === 'product'
      ? ['active', 'archived', 'draft']
      : ['archived', 'draft', 'published'];

  if (!allowedStatuses.includes(status)) {
    throw new Error(
      `Status "${status}" is not valid for ${contentType}. Allowed statuses: ${allowedStatuses.join(', ')}.`
    );
  }
}

function buildCurrentCmsFieldUpdate(
  fields: UpdateCurrentCmsFieldsInput['fields'],
  pageContext: CortexAiPageContext
) {
  const allowedFieldNames = getAllowedFieldNames(pageContext.contentType);
  const updatePayload: Record<string, unknown> = {};

  for (const [fieldName, rawValue] of Object.entries(fields)) {
    if (rawValue === undefined) {
      continue;
    }

    if (!allowedFieldNames.has(fieldName)) {
      throw new Error(
        `Field "${fieldName}" cannot be updated for ${pageContext.contentType} content.`
      );
    }

    if (fieldName === 'status') {
      assertValidStatusForContentType(pageContext.contentType, rawValue);
    }

    if (fieldName === 'description_json') {
      if (pageContext.contentType !== 'product') {
        throw new Error('description_json can only be updated for products.');
      }

      const descriptionValidation = getEditorBlockDocumentSchema().safeParse(rawValue);

      if (!descriptionValidation.success) {
        throw new Error(
          `Product description_json failed editor document validation: ${descriptionValidation.error.issues
            .map((issue) => issue.message)
            .join('; ')}`
        );
      }

      updatePayload.description_json = descriptionValidation.data;
      continue;
    }

    updatePayload[fieldName] = normalizeCmsFieldValue(fieldName, rawValue);
  }

  return updatePayload;
}

export async function executeUpdateCurrentCmsFields(
  input: UpdateCurrentCmsFieldsInput,
  context?: ToolExecutionContext
) {
  const parsed = updateCurrentCmsFieldsInputSchema.parse(input);
  const supabase = getSupabase(context);
  const pageContext = getCurrentCmsContext(context);
  const entityId = getCmsEntityId(pageContext);
  const updatePayload = buildCurrentCmsFieldUpdate(parsed.fields, pageContext);
  const updatedFields = Object.keys(updatePayload);

  if (updatedFields.length === 0) {
    throw new Error('update_current_cms_fields requires at least one supported field.');
  }

  const table =
    pageContext.contentType === 'page'
      ? 'pages'
      : pageContext.contentType === 'post'
        ? 'posts'
        : 'products';
  const { data: item, error } = await supabase
    .from(table)
    .update({
      ...updatePayload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', entityId)
    .select('id, language_id, slug, status, title')
    .single();

  if (error || !item) {
    throw new Error(
      `Failed to update current ${pageContext.contentType}: ${serializeError(error)}`
    );
  }

  revalidateCurrentCmsSurfaces(context, pageContext, item.slug);

  return {
    contentType: pageContext.contentType,
    entityId,
    slug: item.slug,
    success: true,
    updatedFields,
  };
}

export async function executeUpdateContentBlock(
  input: UpdateContentBlockInput,
  context?: ToolExecutionContext
) {
  const parsed = updateContentBlockInputSchema.parse(input);
  const supabase = getSupabase(context);
  const pageContext = getCurrentCmsContext(context);
  const { data: block, error: blockError } = await supabase
    .from('blocks')
    .select('id, page_id, post_id, language_id, block_type, content, order')
    .eq('id', parsed.blockId)
    .single();

  if (blockError || !block) {
    throw new Error(`Failed to read block ${parsed.blockId}: ${serializeError(blockError)}`);
  }

  assertBlockBelongsToCurrentContext(block, pageContext);

  const existingBlockType = resolveExistingBlockType(block.block_type, `Block ${parsed.blockId}`);
  assertRequestedBlockTypeMatches(parsed.blockType, existingBlockType, `Block ${parsed.blockId}`);
  assertValidBlockContent(existingBlockType, parsed.content, `Block ${parsed.blockId}`);

  const { data: updatedBlock, error: updateError } = await supabase
    .from('blocks')
    .update({
      content: parsed.content,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.blockId)
    .select('id, block_type, order')
    .single();

  if (updateError || !updatedBlock) {
    throw new Error(`Failed to update block ${parsed.blockId}: ${serializeError(updateError)}`);
  }

  revalidateCurrentCmsSurfaces(context, pageContext);

  return {
    blockId: updatedBlock.id,
    blockType: updatedBlock.block_type,
    contentUpdated: true,
    success: true,
  };
}

export async function executeUpdateSectionColumnBlock(
  input: UpdateSectionColumnBlockInput,
  context?: ToolExecutionContext
) {
  const parsed = updateSectionColumnBlockInputSchema.parse(input);
  const supabase = getSupabase(context);
  const pageContext = getCurrentCmsContext(context);
  const { data: parentBlock, error: blockError } = await supabase
    .from('blocks')
    .select('id, page_id, post_id, language_id, block_type, content, order')
    .eq('id', parsed.parentBlockId)
    .single();

  if (blockError || !parentBlock) {
    throw new Error(
      `Failed to read parent block ${parsed.parentBlockId}: ${serializeError(blockError)}`
    );
  }

  assertBlockBelongsToCurrentContext(parentBlock, pageContext);

  const parentBlockType = resolveExistingBlockType(
    parentBlock.block_type,
    `Parent block ${parsed.parentBlockId}`
  );

  if (parentBlockType !== 'section' && parentBlockType !== 'hero') {
    throw new Error(
      `Parent block ${parsed.parentBlockId} must be a section or hero block, not "${parentBlockType}".`
    );
  }

  const parentContent = cloneJsonRecord(
    parentBlock.content,
    `Parent block ${parsed.parentBlockId}`
  ) as SectionBlockContent;
  assertValidBlockContent(parentBlockType, parentContent, `Parent block ${parsed.parentBlockId}`);

  const targetColumn = parentContent.column_blocks?.[parsed.columnIndex];
  const targetNestedBlock = targetColumn?.[parsed.blockIndex];

  if (!targetNestedBlock) {
    throw new Error(
      `Nested block was not found at column ${parsed.columnIndex}, index ${parsed.blockIndex}.`
    );
  }

  const nestedBlockType = resolveExistingBlockType(
    targetNestedBlock.block_type,
    `Nested block ${parsed.columnIndex}:${parsed.blockIndex}`
  );
  assertRequestedBlockTypeMatches(
    parsed.blockType,
    nestedBlockType,
    `Nested block ${parsed.columnIndex}:${parsed.blockIndex}`
  );
  assertValidBlockContent(
    nestedBlockType,
    parsed.content,
    `Nested block ${parsed.columnIndex}:${parsed.blockIndex}`
  );

  const nextColumnBlocks = parentContent.column_blocks.map((column, columnIndex) =>
    columnIndex === parsed.columnIndex
      ? column.map((nestedBlock, blockIndex) =>
          blockIndex === parsed.blockIndex
            ? {
                ...nestedBlock,
                content: parsed.content,
              }
            : nestedBlock
        )
      : column
  );
  const nextParentContent: SectionBlockContent = {
    ...parentContent,
    column_blocks: nextColumnBlocks,
  };
  assertValidBlockContent(
    parentBlockType,
    nextParentContent,
    `Updated parent block ${parsed.parentBlockId}`
  );

  const { data: updatedParentBlock, error: updateError } = await supabase
    .from('blocks')
    .update({
      content: nextParentContent,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parsed.parentBlockId)
    .select('id, block_type')
    .single();

  if (updateError || !updatedParentBlock) {
    throw new Error(
      `Failed to update parent block ${parsed.parentBlockId}: ${serializeError(updateError)}`
    );
  }

  revalidateCurrentCmsSurfaces(context, pageContext);

  return {
    blockIndex: parsed.blockIndex,
    columnIndex: parsed.columnIndex,
    nestedBlockType,
    parentBlockId: updatedParentBlock.id,
    parentBlockType: updatedParentBlock.block_type,
    success: true,
  };
}

export function createCortexGlobalAgentTools(context?: ToolExecutionContext) {
  return {
    read_current_cms_item: tool({
      description:
        'Read the CMS item currently being edited. Requires pageContext and returns page/post/product metadata plus page/post block summaries or content.',
      execute: (input) => executeReadCurrentCmsItem(input, context),
      inputSchema: readCurrentCmsItemInputSchema,
      strict: true,
    }),
    search_documentation: tool({
      description:
        'Search the NextBlock documentation database and return concise source snippets for factual CMS guidance.',
      execute: (input) => executeSearchDocumentation(input, context),
      inputSchema: searchDocumentationInputSchema,
      strict: true,
    }),
    update_footer: tool({
      description:
        'Replace the public footer links and/or footer copyright settings for a locale. Use links for footer navigation and copyright for locale text templates.',
      execute: (input) => executeUpdateFooter(input, context),
      inputSchema: updateFooterInputSchema,
      strict: true,
    }),
    update_content_block: tool({
      description:
        'Update the JSON content of an existing top-level page/post block that belongs to the current CMS edit context. The content must match the existing block type schema.',
      execute: (input) => executeUpdateContentBlock(input, context),
      inputSchema: updateContentBlockInputSchema,
      strict: true,
    }),
    update_current_cms_fields: tool({
      description:
        'Update validated metadata fields on the current page, post, or product. For products, description_json must be a valid NextBlock editor document JSON object.',
      execute: (input) => executeUpdateCurrentCmsFields(input, context),
      inputSchema: updateCurrentCmsFieldsInputSchema,
      strict: true,
    }),
    update_navigation_bar: tool({
      description:
        'Update the public header navigation bar for a locale. Use mode "append" when adding links while preserving existing navigation. Use mode "update" when renaming or changing an existing single link. Use mode "replace" only when the user asks to rebuild the complete header and you provide the full menu; destructive partial replacements are refused.',
      execute: (input) => executeUpdateNavigationBar(input, context),
      inputSchema: updateNavigationBarInputSchema,
      strict: true,
    }),
    update_section_column_block: tool({
      description:
        'Update one nested block inside a section or hero block that belongs to the current CMS edit context. Validates both nested content and the final section/hero content.',
      execute: (input) => executeUpdateSectionColumnBlock(input, context),
      inputSchema: updateSectionColumnBlockInputSchema,
      strict: true,
    }),
  };
}
