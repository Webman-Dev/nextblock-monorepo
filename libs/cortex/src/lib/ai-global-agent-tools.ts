import { tool } from 'ai';
import { createCortexDatabaseAgentTools } from './ai-global-agent-db-tools';
import { createCortexCustomBlockTools } from './ai-global-agent-custom-block-tools';
import { z } from './zod-config';

export const availableCortexAiBlockTypes = [
  'text',
  'heading',
  'image',
  'button',
  'posts_grid',
  'video_embed',
  'section',
  'form',
  'testimonial',
  'product_grid',
  'featured_product',
  'cart',
  'checkout',
  'product_details',
] as const;
type BlockType = (typeof availableCortexAiBlockTypes)[number];
type ColumnBlock = { block_type: BlockType; content: Record<string, unknown>; temp_id?: string };
type SectionBlockContent = Record<string, any> & {
  column_blocks: Array<Array<ColumnBlock>>;
};

type SupabaseLike = {
  from: (table: string) => any;
};

type RevalidateFn = (path: string, type?: 'layout' | 'page') => void;
type BlockContentValidator = (
  blockType: BlockType,
  content: Record<string, any>
) => BlockValidationResult;
type MenuKey = 'HEADER' | 'FOOTER';
type CmsContentType = 'page' | 'post' | 'product';

type ToolExecutionContext = {
  actorUserId?: string | null;
  cortexAiApiKey?: string | null;
  cortexAiModelSelection?: unknown;
  latestUserMessage?: string | null;
  pageContext?: CortexAiPageContext | null;
  revalidatePath?: RevalidateFn;
  skipConfirmation?: boolean;
  supabase?: SupabaseLike;
  validateBlockContent?: BlockContentValidator;
};

const SEARCH_DOCUMENTATION_TIMEOUT_MS = 10000;

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

export const fetchEcommerceStatsInputSchema = z.object({
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .optional()
    .describe(
      'Optional currency code for currency-specific monetary reports (e.g., USD, CAD). Do not set this for plain order-status counts unless the user asks for a currency.'
    ),
  query: z.string().describe('The analytical question about orders, products, or revenue.'),
  reportType: z
    .enum(['revenue', 'orders', 'products', 'general'])
    .optional()
    .default('general')
    .describe('The focus area of the statistical report.'),
  timeRange: z
    .enum(['today', 'this_month', 'last_7_days', 'last_30_days', 'last_month', 'last_90_days', 'all_time'])
    .optional()
    .default('all_time')
    .describe('The time period for the report. Use all_time for current order-status counts unless the user names a specific period.'),
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
  translationGroupId: z.string().trim().min(1).max(120).nullable().optional(),
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

const cmsContentTypeSchema = z.enum(['page', 'post', 'product']);
const cmsTargetInputSchema = z.strictObject({
  contentType: cmsContentTypeSchema.optional(),
  entityId: z.union([z.number().int().positive(), z.string().trim().min(1).max(120)]).optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  title: z.string().trim().min(1).max(300).optional(),
});
const createCmsBlockInputSchema = z.strictObject({
  blockType: z.enum(availableCortexAiBlockTypes),
  content: z.record(z.string(), z.unknown()),
  order: z.number().int().min(0).optional(),
});

export const insertContentBlockInputSchema = cmsTargetInputSchema.extend({
  anchorBlockId: z.number().int().positive().optional(),
  anchorBlockType: z.enum(availableCortexAiBlockTypes).optional(),
  block: createCmsBlockInputSchema,
  position: z.enum(['before', 'after', 'start', 'end']).default('end'),
});

export const createCmsPageInputSchema = z.strictObject({
  blocks: z.array(createCmsBlockInputSchema).max(20).optional(),
  contactEmail: z.string().email().optional(),
  feature_image_id: z.string().trim().min(1).max(120).nullable().optional(),
  languageCode: z.string().trim().min(2).max(80).optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_title: z.string().max(160).nullable().optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  title: z.string().trim().min(1).max(300),
  translationGroupId: z.string().trim().min(1).max(120).optional(),
});

export const createCmsPostInputSchema = z.strictObject({
  blocks: z.array(createCmsBlockInputSchema).max(20).optional(),
  excerpt: z.string().max(2000).nullable().optional(),
  feature_image_id: z.string().trim().min(1).max(120).nullable().optional(),
  label: z.string().max(120).nullable().optional(),
  languageCode: z.string().trim().min(2).max(80).optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_title: z.string().max(160).nullable().optional(),
  published_at: z.string().max(80).nullable().optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  status: z.enum(['draft', 'published', 'archived']).default('draft'),
  subtitle: z.string().max(300).nullable().optional(),
  title: z.string().trim().min(1).max(300),
  translationGroupId: z.string().trim().min(1).max(120).optional(),
});

export const createCmsProductInputSchema = z.strictObject({
  description_json: z.unknown().optional(),
  freemius_plan_id: z.string().optional(),
  freemius_product_id: z.string().optional(),
  is_taxable: z.boolean().default(true),
  languageCode: z.string().trim().min(2).max(80).optional(),
  meta_description: z.string().max(500).nullable().optional(),
  meta_title: z.string().max(160).nullable().optional(),
  payment_provider: z.enum(['stripe', 'freemius']).default('stripe'),
  price: z.number().min(0).default(0),
  prices: z.record(z.string(), z.number().min(0)).optional(),
  product_type: z.enum(['physical', 'digital']).default('physical'),
  sale_price: z.number().min(0).nullable().optional(),
  sale_prices: z.record(z.string(), z.number().min(0).nullable()).optional(),
  short_description: z.string().max(2000).nullable().optional(),
  sku: z.string().trim().min(1).max(120).optional(),
  slug: z.string().trim().min(1).max(300).optional(),
  status: z.enum(['draft', 'active', 'archived']).default('draft'),
  stock: z.number().int().min(0).default(0),
  title: z.string().trim().min(1).max(300),
  trial_period_days: z.number().int().min(0).default(0),
  trial_requires_payment_method: z.boolean().default(false),
  translationGroupId: z.string().trim().min(1).max(120).optional(),
  upc: z.string().max(120).nullable().optional(),
});

export const updateCmsItemFieldInputSchema = cmsTargetInputSchema.extend({
  currencyCode: z.string().trim().min(3).max(3).optional(),
  endsAt: z.string().max(80).nullable().optional(),
  field: z.string().trim().min(1).max(120),
  startsAt: z.string().max(80).nullable().optional(),
  value: z.unknown(),
});

export const prepareDeleteCmsItemInputSchema = cmsTargetInputSchema;
export const deleteCmsItemInputSchema = cmsTargetInputSchema;

const wrappedCmsActionPlanActionSchema = z.discriminatedUnion('tool', [
  z.strictObject({ input: createCmsPageInputSchema, tool: z.literal('create_cms_page') }),
  z.strictObject({ input: createCmsPostInputSchema, tool: z.literal('create_cms_post') }),
  z.strictObject({ input: createCmsProductInputSchema, tool: z.literal('create_cms_product') }),
  z.strictObject({ input: deleteCmsItemInputSchema, tool: z.literal('delete_cms_item') }),
  z.strictObject({ input: updateCmsItemFieldInputSchema, tool: z.literal('update_cms_item_field') }),
  z.strictObject({ input: updateContentBlockInputSchema, tool: z.literal('update_content_block') }),
  z.strictObject({ input: insertContentBlockInputSchema, tool: z.literal('insert_content_block') }),
  z.strictObject({ input: updateCurrentCmsFieldsInputSchema, tool: z.literal('update_current_cms_fields') }),
  z.strictObject({ input: updateFooterInputSchema, tool: z.literal('update_footer') }),
  z.strictObject({ input: updateNavigationBarInputSchema, tool: z.literal('update_navigation_bar') }),
  z.strictObject({ input: updateSectionColumnBlockInputSchema, tool: z.literal('update_section_column_block') }),
]);

const flatCmsActionPlanActionSchema = z.union([
  createCmsPageInputSchema
    .extend({ tool: z.literal('create_cms_page') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  createCmsPostInputSchema
    .extend({ tool: z.literal('create_cms_post') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  createCmsProductInputSchema
    .extend({ tool: z.literal('create_cms_product') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  deleteCmsItemInputSchema
    .extend({ tool: z.literal('delete_cms_item') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateCmsItemFieldInputSchema
    .extend({ tool: z.literal('update_cms_item_field') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateContentBlockInputSchema
    .extend({ tool: z.literal('update_content_block') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  insertContentBlockInputSchema
    .extend({ tool: z.literal('insert_content_block') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateCurrentCmsFieldsInputSchema
    .extend({ tool: z.literal('update_current_cms_fields') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateFooterInputSchema
    .extend({ tool: z.literal('update_footer') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateNavigationBarInputSchema
    .extend({ tool: z.literal('update_navigation_bar') })
    .transform(({ tool, ...input }) => ({ input, tool })),
  updateSectionColumnBlockInputSchema
    .extend({ tool: z.literal('update_section_column_block') })
    .transform(({ tool, ...input }) => ({ input, tool })),
]);

const commandStringCmsActionPlanActionSchema = z.string().transform((value, context) => {
  const parsed = parseCmsActionPlanCommandString(value);

  if (!parsed.success) {
    context.addIssue({
      code: 'custom',
      message: parsed.message,
    });

    return z.NEVER;
  }

  return parsed.action;
});

const cmsActionPlanActionSchema = z.union([
  wrappedCmsActionPlanActionSchema,
  flatCmsActionPlanActionSchema,
  commandStringCmsActionPlanActionSchema,
]);

export const executeCmsActionPlanInputSchema = z.strictObject({
  actions: z.array(cmsActionPlanActionSchema).min(1).max(8),
  summary: z.string().trim().min(1).max(500).optional(),
});

function splitTopLevelValues(value: string) {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let quote: '"' | "'" | null = null;
  let escaping = false;

  for (const char of value) {
    if (quote) {
      current += char;

      if (escaping) {
        escaping = false;
      } else if (char === '\\') {
        escaping = true;
      } else if (char === quote) {
        quote = null;
      }

      continue;
    }

    if (char === '"' || char === "'") {
      quote = char;
      current += char;
      continue;
    }

    if (char === '[' || char === '{' || char === '(') {
      depth++;
      current += char;
      continue;
    }

    if (char === ']' || char === '}' || char === ')') {
      depth = Math.max(0, depth - 1);
      current += char;
      continue;
    }

    if (char === ',' && depth === 0) {
      if (current.trim()) {
        parts.push(current.trim());
      }

      current = '';
      continue;
    }

    current += char;
  }

  if (current.trim()) {
    parts.push(current.trim());
  }

  return parts;
}

function convertSingleQuotedJsonLikeToJson(value: string) {
  let output = '';

  for (let index = 0; index < value.length; index++) {
    const char = value[index];

    if (char !== "'") {
      output += char;
      continue;
    }

    let content = '';
    let escaping = false;
    index++;

    for (; index < value.length; index++) {
      const innerChar = value[index];

      if (escaping) {
        content += innerChar;
        escaping = false;
        continue;
      }

      if (innerChar === '\\') {
        escaping = true;
        continue;
      }

      if (innerChar === "'") {
        break;
      }

      content += innerChar;
    }

    output += JSON.stringify(content);
  }

  return output
    .replace(/\bTrue\b/g, 'true')
    .replace(/\bFalse\b/g, 'false')
    .replace(/\bNone\b/g, 'null');
}

function parseCmsActionPlanCommandValue(value: string) {
  const trimmed = value.trim();

  if (
    (trimmed.startsWith("'") && trimmed.endsWith("'")) ||
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
  ) {
    return JSON.parse(convertSingleQuotedJsonLikeToJson(trimmed));
  }

  if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
    return JSON.parse(convertSingleQuotedJsonLikeToJson(trimmed));
  }

  if (/^-?\d+(?:\.\d+)?$/.test(trimmed)) {
    return Number(trimmed);
  }

  if (trimmed === 'true' || trimmed === 'True') {
    return true;
  }

  if (trimmed === 'false' || trimmed === 'False') {
    return false;
  }

  if (trimmed === 'null' || trimmed === 'None') {
    return null;
  }

  return trimmed;
}

function parseCmsActionPlanCommandArguments(value: string) {
  const input: Record<string, unknown> = {};

  for (const part of splitTopLevelValues(value)) {
    const separatorIndex = part.indexOf('=');

    if (separatorIndex <= 0) {
      throw new Error(`Expected key=value argument, received "${part}".`);
    }

    const key = part.slice(0, separatorIndex).trim();

    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) {
      throw new Error(`Invalid argument name "${key}".`);
    }

    input[key] = parseCmsActionPlanCommandValue(part.slice(separatorIndex + 1));
  }

  return input;
}

function parseCmsActionPlanCommandString(value: string):
  | { action: z.infer<typeof wrappedCmsActionPlanActionSchema>; success: true }
  | { message: string; success: false } {
  const trimmed = value.trim();
  const match = trimmed.match(/^([a-z_]+)\(([\s\S]*)\)$/);

  if (!match) {
    return {
      message:
        'Action plan actions must be JSON objects like { "tool": "create_cms_page", "input": { ... } }, not freeform text.',
      success: false,
    };
  }

  const toolName = match[1];
  let input: Record<string, unknown>;

  try {
    input = parseCmsActionPlanCommandArguments(match[2]);
  } catch (error) {
    return {
      message: error instanceof Error ? error.message : 'Could not parse action-plan command arguments.',
      success: false,
    };
  }

  const action = { input, tool: toolName };
  const parsedAction = wrappedCmsActionPlanActionSchema.safeParse(action);

  if (!parsedAction.success) {
    return {
      message: `Invalid action-plan command "${toolName}": ${parsedAction.error.issues
        .map((issue) => issue.message)
        .join('; ')}`,
      success: false,
    };
  }

  return {
    action: parsedAction.data,
    success: true,
  };
}

export type NavigationItemInput = z.infer<typeof navigationItemInputSchema>;
export type UpdateNavigationBarInput = z.infer<typeof updateNavigationBarInputSchema>;
export type UpdateFooterInput = z.infer<typeof updateFooterInputSchema>;
export type SearchDocumentationInput = z.infer<typeof searchDocumentationInputSchema>;
export type FetchEcommerceStatsInput = z.input<typeof fetchEcommerceStatsInputSchema>;
export type CortexAiPageContext = z.infer<typeof cortexAiPageContextSchema>;
export type ReadCurrentCmsItemInput = z.infer<typeof readCurrentCmsItemInputSchema>;
export type UpdateCurrentCmsFieldsInput = z.infer<typeof updateCurrentCmsFieldsInputSchema>;
export type UpdateContentBlockInput = z.infer<typeof updateContentBlockInputSchema>;
export type InsertContentBlockInput = z.infer<typeof insertContentBlockInputSchema>;
export type UpdateSectionColumnBlockInput = z.infer<typeof updateSectionColumnBlockInputSchema>;
export type CreateCmsPageInput = z.infer<typeof createCmsPageInputSchema>;
export type CreateCmsPostInput = z.infer<typeof createCmsPostInputSchema>;
export type CreateCmsProductInput = z.infer<typeof createCmsProductInputSchema>;
export type UpdateCmsItemFieldInput = z.infer<typeof updateCmsItemFieldInputSchema>;
export type PrepareDeleteCmsItemInput = z.infer<typeof prepareDeleteCmsItemInputSchema>;
export type DeleteCmsItemInput = z.infer<typeof deleteCmsItemInputSchema>;
export type ExecuteCmsActionPlanInput = z.infer<typeof executeCmsActionPlanInputSchema>;

function normalizePlannerText(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();
}

function mentionsAny(value: string, terms: string[]) {
  return terms.some((term) => value.includes(term));
}

export function buildVisibleContactIntroActionPlan(message: string): ExecuteCmsActionPlanInput | null {
  const normalized = normalizePlannerText(message);
  const asksToAdd = mentionsAny(normalized, ['add ', 'insert ', 'put ', 'create ']);
  const asksVisibleCopy = mentionsAny(normalized, [
    'title',
    'heading',
    'description',
    'intro',
    'copy',
    'paragraph',
  ]);
  const asksAboveForm =
    normalized.includes('form') && mentionsAny(normalized, ['above', 'before']);
  const asksContactPages =
    normalized.includes('contact page') ||
    normalized.includes('contact pages') ||
    normalized.includes('contact us') ||
    normalized.includes('contactez-nous');
  const asksEnglishAndFrench =
    normalized.includes('english') &&
    mentionsAny(normalized, ['french', 'francais', 'francaise']);

  if (!asksToAdd || !asksVisibleCopy || !asksAboveForm || !asksContactPages || !asksEnglishAndFrench) {
    return null;
  }

  return {
    actions: [
      {
        input: {
          anchorBlockType: 'form',
          block: {
            blockType: 'text',
            content: {
              html_content:
                '<h2>Let us help you move faster</h2><p>Have a question, project idea, or need help choosing the right next step? Send us a message and the NextBlock team will get back to you soon.</p>',
            },
          },
          contentType: 'page',
          position: 'before',
          slug: 'contact-us',
        },
        tool: 'insert_content_block',
      },
      {
        input: {
          anchorBlockType: 'form',
          block: {
            blockType: 'text',
            content: {
              html_content:
                "<h2>Parlons de votre projet</h2><p>Vous avez une question, une idee de projet ou besoin d'aide pour avancer? Envoyez-nous un message et l'equipe NextBlock vous repondra rapidement.</p>",
            },
          },
          contentType: 'page',
          position: 'before',
          slug: 'contactez-nous',
        },
        tool: 'insert_content_block',
      },
    ],
    summary:
      'Add visible title and description copy above the forms on the English and French Contact pages.',
  };
}

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
function isValidBlockType(blockType: string): blockType is BlockType {
  return (availableCortexAiBlockTypes as readonly string[]).includes(blockType);
}

function getRuntimeBlockContentValidator(context?: ToolExecutionContext) {
  return typeof context?.validateBlockContent === 'function'
    ? context.validateBlockContent
    : null;
}

function validateCortexBlockContent(
  blockType: BlockType,
  content: Record<string, unknown>,
  context?: ToolExecutionContext
) {
  const runtimeValidator = getRuntimeBlockContentValidator(context);

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
  return z.object({
    content: z.array(z.any()).optional(),
    type: z.literal('doc'),
  });
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

function withTimeoutFallback<T>(
  promise: Promise<T>,
  timeoutMs: number,
  createFallback: () => T
) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;
  const timeoutPromise = new Promise<T>((resolve) => {
    timeoutId = setTimeout(() => resolve(createFallback()), timeoutMs);
  });

  return Promise.race([
    promise.finally(() => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    }),
    timeoutPromise,
  ]);
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

async function getEcommerceProductModule() {
  return import('./ai-global-agent-ecommerce');
}

function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }

  if (Array.isArray(value)) {
    return `[${value.map((item) => stableStringify(item)).join(',')}]`;
  }

  return `{${Object.keys(value as Record<string, unknown>)
    .filter((key) => key !== 'temp_id')
    .sort()
    .map((key) => `${JSON.stringify(key)}:${stableStringify((value as Record<string, unknown>)[key])}`)
    .join(',')}}`;
}

function hashConfirmationPayload(value: unknown) {
  let hash = 0x811c9dc5;
  const serialized = stableStringify(value);

  for (let index = 0; index < serialized.length; index++) {
    hash ^= serialized.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }

  return (hash >>> 0).toString(16).padStart(8, '0');
}

function normalizeConfirmationToken(value: string) {
  return value.replace(/\s+/g, ' ').trim().toUpperCase();
}

function buildConfirmationPhrase(action: string, subject: string, payload: unknown) {
  return `${normalizeConfirmationToken(`CONFIRM ${action} ${subject}`)} #${hashConfirmationPayload(payload)}`;
}

function buildConfirmationPreview(params: {
  action: string;
  payload: unknown;
  preview: Record<string, unknown>;
  subject: string;
}) {
  const confirmationPhrase = buildConfirmationPhrase(
    params.action,
    params.subject,
    params.payload
  );

  return {
    confirmationPhrase,
    mutationExecuted: false,
    preview: params.preview,
    requiresConfirmation: true,
    success: true,
  };
}

function readPreviewString(preview: Record<string, unknown>, key: string) {
  const value = preview[key];

  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readPreviewNumber(preview: Record<string, unknown>, key: string) {
  const value = Number(preview[key]);

  return Number.isFinite(value) ? value : null;
}

function pluralize(count: number, singular: string, plural = `${singular}s`) {
  return `${count} ${count === 1 ? singular : plural}`;
}

function summarizeCmsMutationPreview(toolName: string, preview: Record<string, unknown>) {
  const explicitSummary = readPreviewString(preview, 'summary');

  if (explicitSummary) {
    return explicitSummary;
  }

  const title = readPreviewString(preview, 'title');
  const slug = readPreviewString(preview, 'slug');
  const status = readPreviewString(preview, 'status');
  const contentType = readPreviewString(preview, 'contentType');
  const field = readPreviewString(preview, 'field');
  const mode = readPreviewString(preview, 'mode');
  const languageCode = readPreviewString(preview, 'languageCode');
  const blockCount = readPreviewNumber(preview, 'blockCount');
  const itemCount = readPreviewNumber(preview, 'itemCount');
  const affectedCount = readPreviewNumber(preview, 'affectedCount');

  if (toolName === 'create_cms_page' || toolName === 'create_cms_post') {
    return `Create ${status || 'draft'} ${toolName === 'create_cms_page' ? 'page' : 'post'} "${title || slug || 'Untitled'}"${slug ? ` at slug "${slug}"` : ''}${blockCount !== null ? ` with ${pluralize(blockCount, 'content block')}` : ''}.`;
  }

  if (toolName === 'create_cms_product') {
    return `Create ${status || 'draft'} product "${title || slug || 'Untitled'}"${slug ? ` at slug "${slug}"` : ''}.`;
  }

  if (toolName === 'update_cms_item_field') {
    return `Update ${field || 'one field'} on the ${contentType || 'CMS item'} "${title || slug || 'selected item'}".`;
  }

  if (toolName === 'update_navigation_bar') {
    return `${mode === 'append' ? 'Add' : mode === 'update' ? 'Update' : 'Replace'} ${itemCount !== null ? pluralize(itemCount, 'navigation item') : 'navigation items'} in the ${languageCode || 'selected'} header navigation.`;
  }

  if (toolName === 'update_footer') {
    const linkCount = readPreviewNumber(preview, 'linkCount');
    return `Update the ${languageCode || 'selected'} footer${linkCount !== null ? ` with ${pluralize(linkCount, 'link')}` : ''}.`;
  }

  if (toolName === 'update_content_block') {
    return `Update the selected ${readPreviewString(preview, 'blockType') || 'content'} block.`;
  }

  if (toolName === 'insert_content_block') {
    return `Insert ${readPreviewString(preview, 'blockType') || 'content'} block on the ${contentType || 'CMS item'} "${title || slug || 'selected item'}".`;
  }

  if (toolName === 'update_section_column_block') {
    return `Update the selected nested ${readPreviewString(preview, 'nestedBlockType') || 'section'} block.`;
  }

  if (toolName === 'delete_cms_item' || toolName === 'prepare_delete_cms_item') {
    return `Delete ${affectedCount !== null ? pluralize(affectedCount, contentType || 'CMS item') : `the selected ${contentType || 'CMS item'}`}${title || slug ? ` for "${title || slug}"` : ''}.`;
  }

  return 'Complete the requested CMS change.';
}

function getConfirmationPreview(params: {
  action: string;
  context?: ToolExecutionContext;
  payload: unknown;
  preview: Record<string, unknown>;
  subject: string;
}) {
  if (params.context?.skipConfirmation) {
    return null;
  }

  const preview = buildConfirmationPreview(params);
  const latestUserMessage = normalizeConfirmationToken(params.context?.latestUserMessage || '');
  const expectedPhrase = normalizeConfirmationToken(preview.confirmationPhrase);

  return latestUserMessage.includes(expectedPhrase) ? null : preview;
}

function getActorUserId(context?: ToolExecutionContext) {
  const actorUserId = context?.actorUserId;

  if (!actorUserId) {
    throw new Error('A confirmed CMS mutation requires an authenticated admin actor.');
  }

  return actorUserId;
}

function createId() {
  return globalThis.crypto?.randomUUID?.() || `id-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 300);
}

function normalizeCurrencyCode(value: string | undefined) {
  return (value || 'USD').trim().toUpperCase();
}

function minorUnitAmountToMajor(value: number, currencyCode: string) {
  const zeroDecimalCurrencies = new Set(['BIF', 'CLP', 'DJF', 'GNF', 'JPY', 'KMF', 'KRW', 'MGA', 'PYG', 'RWF', 'UGX', 'VND', 'VUV', 'XAF', 'XOF', 'XPF']);
  const precision = zeroDecimalCurrencies.has(normalizeCurrencyCode(currencyCode)) ? 0 : 2;

  return value / 10 ** precision;
}

function maybeCentsToMajor(value: unknown, currencyCode: string) {
  return typeof value === 'number' && Number.isFinite(value)
    ? minorUnitAmountToMajor(value, currencyCode)
    : 0;
}

function mapMinorPriceMapToMajor(value: unknown, fallbackCurrencyCode: string) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.entries(value as Record<string, unknown>).reduce<Record<string, number>>(
    (prices, [currencyCode, amount]) => {
      if (typeof amount === 'number' && Number.isFinite(amount)) {
        prices[normalizeCurrencyCode(currencyCode || fallbackCurrencyCode)] = minorUnitAmountToMajor(
          amount,
          currencyCode || fallbackCurrencyCode
        );
      }

      return prices;
    },
    {}
  );
}

function cloneJsonRecord(value: unknown, label: string) {
  if (!isPlainJsonRecord(value)) {
    throw new Error(`${label} content must be a JSON object.`);
  }

  return JSON.parse(JSON.stringify(value)) as Record<string, any>;
}

function cloneJsonValue<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function isPlainJsonRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function mergeJsonRecords(
  base: Record<string, unknown>,
  patch: Record<string, unknown>
): Record<string, unknown> {
  const merged = cloneJsonValue(base);

  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) {
      continue;
    }

    if (isPlainJsonRecord(value) && isPlainJsonRecord(merged[key])) {
      merged[key] = mergeJsonRecords(merged[key], value);
      continue;
    }

    merged[key] = cloneJsonValue(value);
  }

  return merged;
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

function assertValidBlockContent(
  blockType: BlockType,
  content: Record<string, unknown>,
  label: string,
  context?: ToolExecutionContext
) {
  const validation = validateCortexBlockContent(blockType, content, context);

  if (!validation.isValid) {
    throw new Error(
      `${label} content is invalid for block type "${blockType}": ${validation.errors.join('; ')}`
    );
  }
}

function isSectionLikeBlock(blockType: BlockType) {
  return blockType === 'section';
}

function inferNestedBlockTypeFromContent(content: Record<string, unknown>): BlockType | null {
  if (typeof content.html_content === 'string') {
    return 'text';
  }

  if (typeof content.text === 'string' && typeof content.url === 'string') {
    return 'button';
  }

  if (typeof content.text_content === 'string') {
    return 'heading';
  }

  if ('media_id' in content || 'object_key' in content) {
    return 'image';
  }

  if (typeof content.quote === 'string' && typeof content.author_name === 'string') {
    return 'testimonial';
  }

  if (typeof content.url === 'string' && ('controls' in content || 'autoplay' in content || 'title' in content)) {
    return 'video_embed';
  }

  if (Array.isArray(content.fields) || typeof content.recipient_email === 'string') {
    return 'form';
  }

  if ('postsPerPage' in content || 'showPagination' in content) {
    return 'posts_grid';
  }

  if (typeof content.productId === 'string') {
    return 'featured_product';
  }

  if ('limit' in content && 'type' in content) {
    return 'product_grid';
  }

  return null;
}

function createNestedTempId(blockType: BlockType) {
  return `ai-${blockType}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function normalizeNestedColumnBlock(
  value: unknown,
  label: string,
  context?: ToolExecutionContext
): ColumnBlock {
  if (!isPlainJsonRecord(value)) {
    throw new Error(`${label} must be a JSON object.`);
  }

  const rawBlockType = value.block_type ?? value.blockType;
  const blockType = resolveExistingBlockType(rawBlockType, label);

  if (isSectionLikeBlock(blockType)) {
    throw new Error(`${label} cannot be a nested ${blockType} block.`);
  }

  const content = normalizeBlockContentForType(
    blockType,
    cloneJsonRecord(value.content, label),
    label,
    context
  );

  const rawTempId = value.temp_id ?? value.tempId;
  const tempId = typeof rawTempId === 'string' && rawTempId.trim() ? rawTempId : createNestedTempId(blockType);

  return {
    block_type: blockType,
    content,
    temp_id: tempId,
  };
}

function normalizeNestedBlocksToAppend(
  contentPatch: Record<string, unknown>,
  context?: ToolExecutionContext
): ColumnBlock[] {
  const blocks: ColumnBlock[] = [];

  if ('append_block' in contentPatch) {
    blocks.push(normalizeNestedColumnBlock(contentPatch.append_block, 'Nested block to append', context));
  }

  if ('append_blocks' in contentPatch) {
    const appendBlocks = contentPatch.append_blocks;

    if (!Array.isArray(appendBlocks)) {
      throw new Error('append_blocks must be an array of nested block objects.');
    }

    appendBlocks.forEach((block, index) => {
      blocks.push(normalizeNestedColumnBlock(block, `Nested block to append ${index}`, context));
    });
  }

  return blocks;
}

function maybeInferSingleNestedBlockToAppend(
  contentPatch: Record<string, unknown>,
  context?: ToolExecutionContext
): ColumnBlock | null {
  if (
    'append_block' in contentPatch ||
    'append_blocks' in contentPatch ||
    'background' in contentPatch ||
    'column_blocks' in contentPatch ||
    'column_gap' in contentPatch ||
    'container_type' in contentPatch ||
    'padding' in contentPatch ||
    'responsive_columns' in contentPatch ||
    'vertical_alignment' in contentPatch
  ) {
    return null;
  }

  const blockType = inferNestedBlockTypeFromContent(contentPatch);

  if (!blockType) {
    return null;
  }

  const content = cloneJsonRecord(contentPatch, `Nested ${blockType} block`);
  assertValidBlockContent(blockType, content, `Nested ${blockType} block`, context);

  return {
    block_type: blockType,
    content,
    temp_id: createNestedTempId(blockType),
  };
}

function getAppendColumnIndex(contentPatch: Record<string, unknown>, existingColumnCount: number) {
  const rawColumnIndex = contentPatch.append_column_index ?? contentPatch.column_index;

  if (rawColumnIndex === undefined) {
    return 0;
  }

  if (typeof rawColumnIndex !== 'number' || !Number.isInteger(rawColumnIndex) || rawColumnIndex < 0) {
    throw new Error('append_column_index must be a non-negative integer.');
  }

  if (existingColumnCount > 0 && rawColumnIndex >= existingColumnCount) {
    throw new Error(
      `append_column_index ${rawColumnIndex} is outside the existing ${existingColumnCount} column(s).`
    );
  }

  return rawColumnIndex;
}

function buildNextTopLevelBlockContent(
  blockType: BlockType,
  existingContent: Record<string, unknown>,
  contentPatch: Record<string, unknown>,
  context?: ToolExecutionContext
) {
  if (!isSectionLikeBlock(blockType)) {
    return mergeJsonRecords(existingContent, contentPatch);
  }

  const nextContentPatch = { ...contentPatch };
  const blocksToAppend = normalizeNestedBlocksToAppend(nextContentPatch, context);
  const inferredBlock = maybeInferSingleNestedBlockToAppend(nextContentPatch, context);

  if (inferredBlock) {
    blocksToAppend.push(inferredBlock);
  }

  delete nextContentPatch.append_block;
  delete nextContentPatch.append_blocks;
  delete nextContentPatch.append_column_index;
  delete nextContentPatch.column_index;

  const nextContent = mergeJsonRecords(existingContent, nextContentPatch) as SectionBlockContent;

  if (blocksToAppend.length > 0) {
    const existingColumns = Array.isArray(existingContent.column_blocks)
      ? cloneJsonValue(existingContent.column_blocks)
      : [];
    const targetColumnIndex = getAppendColumnIndex(contentPatch, existingColumns.length);
    const nextColumnBlocks = existingColumns.length > 0 ? existingColumns : [[]];

    while (nextColumnBlocks.length <= targetColumnIndex) {
      nextColumnBlocks.push([]);
    }

    nextColumnBlocks[targetColumnIndex] = [
      ...(nextColumnBlocks[targetColumnIndex] || []),
      ...blocksToAppend,
    ];
    nextContent.column_blocks = nextColumnBlocks;
  }

  return nextContent;
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

async function getDefaultLanguageRecord(supabase: SupabaseLike, languageCode?: string) {
  if (languageCode) {
    return getLanguageRecord(supabase, languageCode);
  }

  const { data, error } = await supabase
    .from('languages')
    .select('id, code, name, is_active, is_default');

  if (error) {
    throw new Error(`Failed to load active languages: ${serializeError(error)}`);
  }

  const activeLanguages = (Array.isArray(data) ? data : []).filter(
    (language: any) => language.is_active !== false
  );
  const language =
    activeLanguages.find((item: any) => item.is_default) ||
    activeLanguages.find((item: any) => normalizeLanguageLookup(item.code) === 'en') ||
    activeLanguages[0];

  if (!language?.id || !language?.code) {
    throw new Error('No active CMS language is available for Cortex AI content creation.');
  }

  return {
    code: String(language.code),
    id: Number(language.id),
  };
}

async function getDefaultCurrencyCode(supabase: SupabaseLike) {
  try {
    const { data, error } = await supabase
      .from('currencies')
      .select('code, is_default, is_active')
      .eq('is_active', true);

    if (error) {
      return 'USD';
    }

    const currencies = Array.isArray(data) ? data : [];
    const currency = currencies.find((item: any) => item.is_default) || currencies[0];

    return normalizeCurrencyCode(currency?.code || 'USD');
  } catch {
    return 'USD';
  }
}

async function findSingleCmsItem(params: {
  contentType: CmsContentType;
  entityId?: string | number;
  slug?: string;
  supabase: SupabaseLike;
  title?: string;
}) {
  const table =
    params.contentType === 'page'
      ? 'pages'
      : params.contentType === 'post'
        ? 'posts'
        : 'products';
  let column = 'id';
  let value: unknown = params.entityId;

  if (value === undefined && params.slug) {
    column = 'slug';
    value = params.slug;
  }

  if (value === undefined && params.title) {
    column = 'title';
    value = params.title;
  }

  if (value === undefined) {
    throw new Error(`A ${params.contentType} target requires an id, slug, title, or current edit context.`);
  }

  const { data, error } = await params.supabase.from(table).select('*').eq(column, value);

  if (error) {
    throw new Error(`Failed to resolve ${params.contentType}: ${serializeError(error)}`);
  }

  const rows = Array.isArray(data) ? data : data ? [data] : [];

  if (rows.length !== 1) {
    throw new Error(
      rows.length === 0
        ? `No ${params.contentType} matched ${column} "${String(value)}".`
        : `Multiple ${params.contentType}s matched ${column} "${String(value)}"; use an exact id.`
    );
  }

  return rows[0];
}

async function resolveCmsTarget(
  input: z.infer<typeof cmsTargetInputSchema>,
  context?: ToolExecutionContext
) {
  const pageContext = cortexAiPageContextSchema.safeParse(context?.pageContext).success
    ? (context?.pageContext as CortexAiPageContext)
    : null;
  const contentType = input.contentType || pageContext?.contentType;

  if (!contentType) {
    throw new Error('Target contentType is required when no current CMS edit context exists.');
  }

  const hasExplicitTarget =
    input.entityId !== undefined || Boolean(input.slug) || Boolean(input.title);
  const entityId = input.entityId ?? (hasExplicitTarget ? undefined : pageContext?.entityId);
  const slug = input.slug ?? (hasExplicitTarget ? undefined : pageContext?.slug ?? undefined);
  const title = input.title ?? (hasExplicitTarget ? undefined : pageContext?.title ?? undefined);
  const item = await findSingleCmsItem({
    contentType,
    entityId,
    slug: entityId === undefined ? slug || undefined : undefined,
    supabase: getSupabase(context),
    title: entityId === undefined && !slug ? title || undefined : undefined,
  });

  return {
    contentType,
    item,
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
  const linkedPage = await resolveLinkedPageForNavigationItem({
    item: params.item,
    languageId: params.languageId,
    menuKey: params.menuKey,
    supabase: params.supabase,
  });
  const insertPayload = {
    label: params.item.label,
    language_id: params.languageId,
    menu_key: params.menuKey,
    order: params.order,
    page_id: linkedPage?.pageId ?? null,
    parent_id: params.parentId ?? null,
    ...(linkedPage?.navigationTranslationGroupId
      ? { translation_group_id: linkedPage.navigationTranslationGroupId }
      : {}),
    url: params.item.url,
  };
  const { data, error } = await params.supabase
    .from('navigation_items')
    .insert(insertPayload)
    .select('id')
    .single();

  if (error) {
    throw new Error(`Failed to insert ${params.menuKey} navigation item: ${serializeError(error)}`);
  }

  return Number(data.id);
}

function getNavigationPageSlug(url: string) {
  const trimmedUrl = url.trim();

  if (!trimmedUrl.startsWith('/') || trimmedUrl.startsWith('//')) {
    return null;
  }

  const path = trimmedUrl.split('?')[0]?.split('#')[0] || '';
  const slug = path === '/' ? 'home' : path.replace(/^\/+|\/+$/g, '');

  return slug && !slug.includes('/') ? slug : null;
}

async function resolveLinkedPageForNavigationItem(params: {
  item: NavigationItemInput;
  languageId: number;
  menuKey: MenuKey;
  supabase: SupabaseLike;
}) {
  const slug = getNavigationPageSlug(params.item.url);

  if (!slug) {
    return null;
  }

  const { data: pageData, error: pageError } = await params.supabase
    .from('pages')
    .select('id, slug, translation_group_id, language_id')
    .eq('slug', slug)
    .eq('language_id', params.languageId);

  if (pageError) {
    throw new Error(`Failed to resolve linked page for navigation item: ${serializeError(pageError)}`);
  }

  const page = Array.isArray(pageData) ? pageData[0] : pageData;

  if (!page?.id) {
    return null;
  }

  let navigationTranslationGroupId = createId();

  if (page.translation_group_id) {
    const { data: relatedPages, error: relatedPagesError } = await params.supabase
      .from('pages')
      .select('id')
      .eq('translation_group_id', page.translation_group_id);

    if (relatedPagesError) {
      throw new Error(
        `Failed to inspect linked page translations for navigation item: ${serializeError(relatedPagesError)}`
      );
    }

    const relatedPageIds = new Set(
      (Array.isArray(relatedPages) ? relatedPages : [])
        .map((relatedPage: any) => String(relatedPage.id))
        .filter(Boolean)
    );

    const { data: relatedNavigationItems, error: relatedNavigationItemsError } = await params.supabase
      .from('navigation_items')
      .select('id, page_id, translation_group_id, menu_key')
      .eq('menu_key', params.menuKey);

    if (relatedNavigationItemsError) {
      throw new Error(
        `Failed to inspect related navigation translations: ${serializeError(relatedNavigationItemsError)}`
      );
    }

    const relatedNavigationItem = (Array.isArray(relatedNavigationItems)
      ? relatedNavigationItems
      : []
    ).find((item: any) => item.translation_group_id && relatedPageIds.has(String(item.page_id)));

    if (relatedNavigationItem?.translation_group_id) {
      navigationTranslationGroupId = relatedNavigationItem.translation_group_id;
    }
  }

  return {
    navigationTranslationGroupId,
    pageId: Number(page.id),
  };
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

  assertNavigationReplacementIsSafe({
    existingItemCount: existingRows.length,
    existingTopLevelCount,
    languageCode: language.code,
    menuKey: params.menuKey,
    replacementItemCount,
  });

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

function assertNavigationReplacementIsSafe(params: {
  existingItemCount: number;
  existingTopLevelCount: number;
  languageCode: string;
  menuKey: MenuKey;
  replacementItemCount: number;
}) {
  if (params.existingItemCount === 0 || params.replacementItemCount >= params.existingItemCount) {
    return;
  }

  throw new Error(
    `Refusing destructive ${params.menuKey} navigation replacement for ${params.languageCode}: existing menu has ${params.existingItemCount} items (${params.existingTopLevelCount} top-level), but the replacement only contains ${params.replacementItemCount}. Use mode "update" for renaming or changing a single link, or provide the full menu.`
  );
}

async function assertNavigationReplacementInputIsSafe(params: {
  items: NavigationItemInput[];
  languageCode: string;
  menuKey: MenuKey;
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

  assertNavigationReplacementIsSafe({
    existingItemCount: existingRows.length,
    existingTopLevelCount: existingRows.filter((item: any) => item.parent_id == null).length,
    languageCode: language.code,
    menuKey: params.menuKey,
    replacementItemCount: countNavigationInputItems(params.items),
  });
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

function stringifyContentValue(value: unknown) {
  return typeof value === 'string' && value.trim() ? value.trim() : '';
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function normalizeFormFieldType(field: Record<string, unknown>) {
  const rawType = stringifyContentValue(field.field_type ?? field.fieldType ?? field.type ?? field.input_type)
    .toLowerCase()
    .replace(/\s+/g, '_');
  const label = stringifyContentValue(field.label ?? field.name ?? field.placeholder).toLowerCase();

  if (['email', 'textarea', 'select', 'radio', 'checkbox', 'text'].includes(rawType)) {
    return rawType;
  }

  if (label.includes('email')) {
    return 'email';
  }

  if (label.includes('message') || label.includes('comment') || label.includes('details')) {
    return 'textarea';
  }

  return 'text';
}

function normalizeFormFields(fields: unknown) {
  const sourceFields =
    Array.isArray(fields) && fields.length > 0
      ? fields
      : [
          { field_type: 'text', is_required: true, label: 'Name', placeholder: 'Your name' },
          { field_type: 'email', is_required: true, label: 'Email', placeholder: 'you@example.com' },
          { field_type: 'textarea', is_required: true, label: 'Message', placeholder: 'How can we help?' },
        ];

  return sourceFields.map((field, index) => {
    const fieldRecord = isPlainJsonRecord(field) ? field : {};
    const label =
      stringifyContentValue(fieldRecord.label ?? fieldRecord.name) ||
      (index === 0 ? 'Name' : index === 1 ? 'Email' : 'Message');
    const fieldType = normalizeFormFieldType({ ...fieldRecord, label });
    const rawRequired = fieldRecord.is_required ?? fieldRecord.isRequired ?? fieldRecord.required;

    return {
      field_type: fieldType,
      is_required: typeof rawRequired === 'boolean' ? rawRequired : true,
      label,
      options: Array.isArray(fieldRecord.options) ? fieldRecord.options : undefined,
      placeholder: stringifyContentValue(fieldRecord.placeholder) || undefined,
      temp_id:
        stringifyContentValue(fieldRecord.temp_id ?? fieldRecord.tempId ?? fieldRecord.id) ||
        `field-${index + 1}`,
    };
  });
}

function normalizeBlockContentForType(
  blockType: BlockType,
  rawContent: Record<string, unknown>,
  label: string,
  context?: ToolExecutionContext
) {
  const content = cloneJsonValue(rawContent);

  if (blockType === 'heading') {
    content.text_content =
      stringifyContentValue(content.text_content) ||
      stringifyContentValue(content.text) ||
      stringifyContentValue(content.title) ||
      stringifyContentValue(content.heading) ||
      'Untitled';
    content.level = typeof content.level === 'number' ? content.level : 1;
  }

  if (blockType === 'text') {
    const htmlContent =
      stringifyContentValue(content.html_content) ||
      stringifyContentValue(content.html) ||
      stringifyContentValue(content.content) ||
      stringifyContentValue(content.text);

    if (htmlContent) {
      content.html_content = /<\/?[a-z][\s\S]*>/i.test(htmlContent)
        ? htmlContent
        : `<p>${escapeHtml(htmlContent)}</p>`;
    }
  }

  if (blockType === 'button') {
    content.text =
      stringifyContentValue(content.text) ||
      stringifyContentValue(content.label) ||
      stringifyContentValue(content.title) ||
      'Learn More';
    content.url =
      stringifyContentValue(content.url) ||
      stringifyContentValue(content.href) ||
      stringifyContentValue(content.link) ||
      '#';
  }

  if (blockType === 'form') {
    content.fields = normalizeFormFields(content.fields);
    content.submit_button_text =
      stringifyContentValue(content.submit_button_text ?? content.submitButtonText ?? content.button_text) ||
      'Send Message';
    content.success_message =
      stringifyContentValue(content.success_message ?? content.successMessage) ||
      'Thanks for reaching out. We will reply as soon as possible.';
  }

  assertValidBlockContent(blockType, content, label, context);

  return content;
}

function normalizeCreateBlock(
  input: z.infer<typeof createCmsBlockInputSchema>,
  index: number,
  context?: ToolExecutionContext
) {
  const content = normalizeBlockContentForType(
    input.blockType,
    cloneJsonRecord(input.content, `Block ${index}`),
    `Block ${index}`,
    context
  );

  return {
    block_type: input.blockType,
    content,
    order: input.order ?? index,
  };
}

function buildContactPageBlocks(
  contactEmail: string,
  title = 'Contact Us',
  context?: ToolExecutionContext
) {
  return [
    normalizeCreateBlock(
      {
        blockType: 'section',
        content: {
          is_hero: true,
          background: { type: 'none' },
          column_blocks: [
            [
              {
                block_type: 'heading',
                content: {
                  level: 1,
                  textAlign: 'center',
                  text_content: title,
                },
                temp_id: createNestedTempId('heading'),
              },
              {
                block_type: 'text',
                content: {
                  html_content:
                    '<p>Have a question, project, or support request? Send us a note and we will get back to you soon.</p>',
                },
                temp_id: createNestedTempId('text'),
              },
            ],
          ],
          column_gap: 'lg',
          container_type: 'container',
          padding: { bottom: 'xl', top: 'xl' },
          responsive_columns: { desktop: 1, mobile: 1, tablet: 1 },
          vertical_alignment: 'center',
        },
      },
      0,
      context
    ),
    normalizeCreateBlock(
      {
        blockType: 'form',
        content: {
          fields: [
            {
              field_type: 'text',
              is_required: true,
              label: 'Name',
              placeholder: 'Your name',
              temp_id: 'field-name',
            },
            {
              field_type: 'email',
              is_required: true,
              label: 'Email',
              placeholder: 'you@example.com',
              temp_id: 'field-email',
            },
            {
              field_type: 'textarea',
              is_required: true,
              label: 'Message',
              placeholder: 'How can we help?',
              temp_id: 'field-message',
            },
          ],
          recipient_email: contactEmail,
          submit_button_text: 'Send Message',
          success_message: 'Thanks for reaching out. We will reply as soon as possible.',
        },
      },
      1,
      context
    ),
  ];
}

function normalizeCreateBlocks(
  blocks: Array<z.infer<typeof createCmsBlockInputSchema>> | undefined,
  fallbackContactEmail?: string,
  title?: string,
  context?: ToolExecutionContext
) {
  if ((!blocks || blocks.length === 0) && fallbackContactEmail) {
    return buildContactPageBlocks(fallbackContactEmail, title, context);
  }

  return (blocks || []).map((block, index) => normalizeCreateBlock(block, index, context));
}

async function assertUniqueSlug(params: {
  contentType: CmsContentType;
  languageId: number;
  slug: string;
  supabase: SupabaseLike;
}) {
  const table =
    params.contentType === 'page'
      ? 'pages'
      : params.contentType === 'post'
        ? 'posts'
        : 'products';
  const { data, error } = await params.supabase
    .from(table)
    .select('id, title, slug, language_id')
    .eq('slug', params.slug)
    .eq('language_id', params.languageId);

  if (error) {
    throw new Error(`Failed to check ${params.contentType} slug uniqueness: ${serializeError(error)}`);
  }

  const existingItems = Array.isArray(data) ? data : [];

  if (existingItems.length > 0) {
    return {
      duplicate: true,
      existingItem: existingItems[0],
      mutationExecuted: false,
      success: false,
      message: `A ${params.contentType} with slug "${params.slug}" already exists for this language.`,
    };
  }

  return null;
}

async function resolveCreateTranslationGroup(params: {
  contentType: CmsContentType;
  languageCode: string;
  languageId: number;
  suppliedTranslationGroupId?: string;
  supabase: SupabaseLike;
}) {
  if (!params.suppliedTranslationGroupId) {
    return {
      translationGroupId: undefined,
    };
  }

  const table =
    params.contentType === 'page'
      ? 'pages'
      : params.contentType === 'post'
        ? 'posts'
        : 'products';
  const { data, error } = await params.supabase
    .from(table)
    .select('id, title, slug, language_id, translation_group_id')
    .eq('translation_group_id', params.suppliedTranslationGroupId);

  if (error) {
    throw new Error(
      `Failed to inspect ${params.contentType} translation group: ${serializeError(error)}`
    );
  }

  const rows = Array.isArray(data) ? data : [];

  if (rows.length === 0) {
    return {
      result: {
        message: `The ${params.contentType} translation group "${params.suppliedTranslationGroupId}" was not found.`,
        mutationExecuted: false,
        success: false,
      },
      translationGroupId: params.suppliedTranslationGroupId,
    };
  }

  const existingTranslation = rows.find(
    (row: any) => Number(row.language_id) === params.languageId
  );

  if (existingTranslation) {
    return {
      result: {
        duplicateTranslation: true,
        existingItem: existingTranslation,
        message: `A ${params.contentType} translation already exists for ${params.languageCode} in this translation group.`,
        mutationExecuted: false,
        success: false,
      },
      translationGroupId: params.suppliedTranslationGroupId,
    };
  }

  return {
    translationGroupId: params.suppliedTranslationGroupId,
  };
}

async function insertContentBlocks(params: {
  blocks: Array<{ block_type: BlockType; content: Record<string, unknown>; order: number }>;
  contentType: 'page' | 'post';
  itemId: number;
  languageId: number;
  supabase: SupabaseLike;
}) {
  if (params.blocks.length === 0) {
    return [];
  }

  const blockRows = params.blocks.map((block, index) => ({
    block_type: block.block_type,
    content: block.content,
    language_id: params.languageId,
    order: block.order ?? index,
    page_id: params.contentType === 'page' ? params.itemId : null,
    post_id: params.contentType === 'post' ? params.itemId : null,
  }));
  const { data, error } = await params.supabase.from('blocks').insert(blockRows).select('*');

  if (error) {
    throw new Error(`Failed to insert ${params.contentType} blocks: ${serializeError(error)}`);
  }

  return Array.isArray(data) ? data : [];
}

async function rollbackCreatedCmsItem(params: {
  contentType: 'page' | 'post';
  itemId: number;
  supabase: SupabaseLike;
}) {
  const table = params.contentType === 'page' ? 'pages' : 'posts';

  await params.supabase.from(table).delete().eq('id', params.itemId);
}

function getCreateEditPath(contentType: CmsContentType, entityId: string | number) {
  if (contentType === 'page') {
    return `/cms/pages/${entityId}/edit`;
  }

  if (contentType === 'post') {
    return `/cms/posts/${entityId}/edit`;
  }

  return `/cms/products/${entityId}/edit`;
}

function getCollectionPath(contentType: CmsContentType) {
  if (contentType === 'page') {
    return '/cms/pages';
  }

  if (contentType === 'post') {
    return '/cms/posts';
  }

  return '/cms/products';
}

export async function executeUpdateNavigationBar(
  input: UpdateNavigationBarInput,
  context?: ToolExecutionContext
) {
  const parsed = updateNavigationBarInputSchema.parse(input);
  const supabase = getSupabase(context);

  if (parsed.mode === 'replace') {
    await assertNavigationReplacementInputIsSafe({
      items: parsed.items,
      languageCode: parsed.languageCode,
      menuKey: 'HEADER',
      supabase,
    });
  }

  const confirmation = getConfirmationPreview({
    action: 'UPDATE NAVIGATION',
    context,
    payload: { input: parsed, tool: 'update_navigation_bar' },
    preview: {
      itemCount: parsed.items.length,
      languageCode: parsed.languageCode,
      mode: parsed.mode,
      target: 'header navigation',
    },
    subject: `${parsed.mode} header`,
  });

  if (confirmation) {
    return confirmation;
  }

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
    mutationExecuted: true,
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
  const confirmation = getConfirmationPreview({
    action: 'UPDATE FOOTER',
    context,
    payload: { input: parsed, tool: 'update_footer' },
    preview: {
      copyrightUpdated: Boolean(parsed.copyright),
      linkCount: parsed.links?.length || 0,
      languageCode: parsed.languageCode,
      target: 'footer',
    },
    subject: parsed.languageCode,
  });

  if (confirmation) {
    return confirmation;
  }

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
    mutationExecuted: true,
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
    .map((snippet) => ({
      excerpt: snippet.excerpt,
      source: snippet.source,
      title: snippet.title,
      url: snippet.url,
    }));

  return {
    query: parsed.query,
    results,
    success: true,
  };
}

export async function executeSearchDocumentationWithTimeout(
  input: SearchDocumentationInput,
  context?: ToolExecutionContext,
  timeoutMs = SEARCH_DOCUMENTATION_TIMEOUT_MS
) {
  const parsed = searchDocumentationInputSchema.safeParse(input);
  const query = parsed.success ? parsed.data.query : '';

  return withTimeoutFallback(
    executeSearchDocumentation(input, context),
    timeoutMs,
    () => ({
      message:
        'Documentation search took too long to respond. Please try again or ask a more specific question.',
      query,
      results: [],
      success: false,
      timedOut: true,
    })
  );
}

const knownOrderStatuses = [
  'pending',
  'trial',
  'paid',
  'shipped',
  'cancelled',
  'refunded',
  'failed',
] as const;

type KnownOrderStatus = (typeof knownOrderStatuses)[number];

const orderStatusAliases: Record<string, KnownOrderStatus> = {
  awaiting: 'pending',
  canceled: 'cancelled',
  cancelled: 'cancelled',
  complete: 'paid',
  completed: 'paid',
  failed: 'failed',
  paid: 'paid',
  payment_pending: 'pending',
  pending: 'pending',
  refund: 'refunded',
  refunded: 'refunded',
  refunds: 'refunded',
  shipped: 'shipped',
  trial: 'trial',
  trials: 'trial',
};

function normalizeOrderStatus(value: unknown) {
  const normalized = String(value ?? 'unknown').trim().toLowerCase();
  return normalized || 'unknown';
}

function buildOrderStatusCounts(rows: any[]) {
  const counts: Record<string, number> = Object.fromEntries(
    knownOrderStatuses.map((status) => [status, 0])
  );

  for (const row of rows) {
    const status = normalizeOrderStatus(row.status);
    counts[status] = (counts[status] ?? 0) + 1;
  }

  return counts;
}

function inferRequestedOrderStatus(query: string) {
  const normalizedQuery = query.toLowerCase().replace(/[^a-z0-9_]+/g, ' ');
  const terms = normalizedQuery.split(/\s+/).filter(Boolean);

  for (const term of terms) {
    const status = orderStatusAliases[term];

    if (status) {
      return status;
    }
  }

  return null;
}

function toFiniteNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function executeFetchEcommerceStats(
  input: FetchEcommerceStatsInput,
  context?: ToolExecutionContext
) {
  const parsed = fetchEcommerceStatsInputSchema.parse(input);
  const supabase = getSupabase(context);

  const now = new Date();
  let startDate: Date | null = null;
  let endDate: Date | null = null;

  switch (parsed.timeRange) {
    case 'today':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case 'this_month':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      break;
    case 'last_7_days':
      startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case 'last_30_days':
      startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case 'last_month':
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'last_90_days':
      startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
      break;
    case 'all_time':
      startDate = null;
      break;
  }

  const currency = parsed.currency?.toUpperCase();
  const requestedStatus = inferRequestedOrderStatus(parsed.query);
  const orderQueryBuilder = supabase
    .from('orders')
    .select('id, status, total, currency, created_at, paid_at');

  if (currency) {
    orderQueryBuilder.eq('currency', currency);
  }
  if (startDate) {
    orderQueryBuilder.gte('created_at', startDate.toISOString());
  }
  if (endDate) {
    orderQueryBuilder.lte('created_at', endDate.toISOString());
  }

  const shouldFetchLineItems =
    parsed.reportType === 'products' ||
    parsed.reportType === 'revenue' ||
    parsed.reportType === 'general';
  const lineItemsQueryBuilder = shouldFetchLineItems
    ? supabase
        .from('order_items')
        .select(`
          quantity,
          price_at_purchase,
          products!inner (
            id,
            title,
            product_type
          ),
          orders!inner (
            id,
            status,
            paid_at,
            currency
          )
        `)
        .eq('orders.status', 'paid')
    : null;

  if (lineItemsQueryBuilder) {
    if (currency) {
      lineItemsQueryBuilder.eq('orders.currency', currency);
    }
    if (startDate) {
      lineItemsQueryBuilder.gte('orders.paid_at', startDate.toISOString());
    }
    if (endDate) {
      lineItemsQueryBuilder.lte('orders.paid_at', endDate.toISOString());
    }
  }

  const shouldFetchAllTimeOrderStatuses =
    parsed.timeRange !== 'all_time' && (parsed.reportType === 'orders' || requestedStatus);
  const allTimeOrderQueryBuilder = shouldFetchAllTimeOrderStatuses
    ? supabase.from('orders').select('id, status, currency')
    : null;

  if (allTimeOrderQueryBuilder && currency) {
    allTimeOrderQueryBuilder.eq('currency', currency);
  }

  const [
    { data: orderData, error: orderError },
    { data: lineItemData, error: lineItemError },
    allTimeOrderResult,
  ] = await Promise.all([
    orderQueryBuilder,
    lineItemsQueryBuilder ?? Promise.resolve({ data: [], error: null }),
    allTimeOrderQueryBuilder ?? Promise.resolve({ data: null, error: null }),
  ]);

  if (orderError) {
    throw new Error(`Failed to fetch ecommerce stats: ${serializeError(orderError)}`);
  }

  if (lineItemError) {
    throw new Error(`Failed to fetch ecommerce stats: ${serializeError(lineItemError)}`);
  }

  if (allTimeOrderResult.error) {
    throw new Error(`Failed to fetch ecommerce stats: ${serializeError(allTimeOrderResult.error)}`);
  }

  const orderRows = Array.isArray(orderData) ? orderData : [];
  const rows = Array.isArray(lineItemData) ? lineItemData : [];
  const orderStatusCounts = buildOrderStatusCounts(orderRows);
  const allTimeOrderRows = Array.isArray(allTimeOrderResult.data) ? allTimeOrderResult.data : null;
  const allTimeOrderStatusCounts = allTimeOrderRows ? buildOrderStatusCounts(allTimeOrderRows) : null;
  const revenueByCurrency: Record<string, number> = {};

  for (const row of rows) {
    const order = Array.isArray(row.orders) ? row.orders[0] : row.orders;
    const orderCurrency = String(order?.currency || currency || 'unknown').toUpperCase();
    revenueByCurrency[orderCurrency] =
      (revenueByCurrency[orderCurrency] ?? 0) +
      (toFiniteNumber(row.quantity) * toFiniteNumber(row.price_at_purchase)) / 100;
  }

  const report: Record<string, any> = {
    currency: currency ?? null,
    currencyFiltered: Boolean(currency),
    orderStatusCounts,
    paidOrderCount: orderStatusCounts.paid ?? 0,
    query: parsed.query,
    reportType: parsed.reportType,
    revenueByCurrency,
    timeRange: parsed.timeRange,
    totalOrders: orderRows.length,
    totalRevenue: Object.values(revenueByCurrency).reduce(
      (sum: number, revenue: number) => sum + revenue,
      0
    ),
  };

  if (allTimeOrderStatusCounts) {
    report.allTimeOrderStatusCounts = allTimeOrderStatusCounts;
  }

  if (requestedStatus) {
    report.matchingOrderStatus = {
      allTimeCount: allTimeOrderStatusCounts?.[requestedStatus] ?? orderStatusCounts[requestedStatus] ?? 0,
      count: orderStatusCounts[requestedStatus] ?? 0,
      status: requestedStatus,
      timeRange: parsed.timeRange,
    };
  }

  if (parsed.reportType === 'products' || parsed.reportType === 'revenue' || parsed.reportType === 'general') {
    const productStats: Record<string, { id: string; revenue: number; quantity: number; title: string; type: string }> = {};

    for (const row of rows) {
      const product = Array.isArray(row.products) ? row.products[0] : row.products;

      if (!product?.id) {
        continue;
      }

      const productId = product.id;
      if (!productStats[productId]) {
        productStats[productId] = {
          id: productId,
          quantity: 0,
          revenue: 0,
          title: product.title,
          type: product.product_type,
        };
      }
      productStats[productId].quantity += toFiniteNumber(row.quantity);
      productStats[productId].revenue +=
        (toFiniteNumber(row.quantity) * toFiniteNumber(row.price_at_purchase)) / 100;
    }

    report.topProducts = Object.values(productStats)
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 10);
  }

  return {
    report,
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

const PAGE_FIELD_NAMES = new Set([
  'feature_image_id',
  'language_id',
  'meta_description',
  'meta_title',
  'slug',
  'status',
  'title',
]);
const POST_FIELD_NAMES = new Set([
  'excerpt',
  'feature_image_id',
  'label',
  'language_id',
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
  'language_id',
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

  const confirmation = getConfirmationPreview({
    action: 'UPDATE CMS FIELDS',
    context,
    payload: {
      contentType: pageContext.contentType,
      entityId,
      fields: updatePayload,
      tool: 'update_current_cms_fields',
    },
    preview: {
      contentType: pageContext.contentType,
      entityId,
      fields: updatedFields,
      slug: pageContext.slug,
      title: pageContext.title,
    },
    subject: `${pageContext.contentType} ${String(entityId)}`,
  });

  if (confirmation) {
    return confirmation;
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
    mutationExecuted: true,
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
  const existingContent = cloneJsonRecord(block.content, `Block ${parsed.blockId}`);
  const nextContent = buildNextTopLevelBlockContent(
    existingBlockType,
    existingContent,
    parsed.content,
    context
  );
  assertValidBlockContent(existingBlockType, nextContent, `Block ${parsed.blockId}`, context);

  const confirmation = getConfirmationPreview({
    action: 'UPDATE CONTENT BLOCK',
    context,
    payload: {
      blockId: parsed.blockId,
      blockType: existingBlockType,
      content: nextContent,
      tool: 'update_content_block',
    },
    preview: {
      blockId: parsed.blockId,
      blockType: existingBlockType,
      contentType: pageContext.contentType,
      entityId: getCmsEntityId(pageContext),
    },
    subject: `${existingBlockType} block ${parsed.blockId}`,
  });

  if (confirmation) {
    return confirmation;
  }

  const { data: updatedBlock, error: updateError } = await supabase
    .from('blocks')
    .update({
      content: nextContent,
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
    mutationExecuted: true,
    success: true,
  };
}

export async function executeInsertContentBlock(
  input: InsertContentBlockInput,
  context?: ToolExecutionContext
) {
  const parsed = insertContentBlockInputSchema.parse(input);
  const supabase = getSupabase(context);
  const target = await resolveCmsTarget(parsed, context);

  if (target.contentType === 'product') {
    throw new Error('Products do not have page/post content blocks in this editor context.');
  }

  const itemId = Number(target.item.id);
  const parentColumn = target.contentType === 'page' ? 'page_id' : 'post_id';
  const loadBlocks = async () => {
    const { data, error } = await supabase
      .from('blocks')
      .select('id, page_id, post_id, language_id, block_type, content, order')
      .eq(parentColumn, itemId);

    if (error) {
      throw new Error(`Failed to read ${target.contentType} blocks: ${serializeError(error)}`);
    }

    return (Array.isArray(data) ? data : []).sort(
      (a: any, b: any) => Number(a.order) - Number(b.order)
    );
  };
  const resolveOrder = (blocks: any[]) => {
    if (parsed.position === 'start') {
      return 0;
    }

    if (parsed.position === 'end') {
      const orders = blocks.map((block: any) => Number(block.order)).filter(Number.isFinite);
      return orders.length > 0 ? Math.max(...orders) + 1 : 0;
    }

    const anchorBlock = parsed.anchorBlockId
      ? blocks.find((block: any) => Number(block.id) === parsed.anchorBlockId)
      : parsed.anchorBlockType
        ? blocks.find((block: any) => block.block_type === parsed.anchorBlockType)
        : null;

    if (!anchorBlock) {
      throw new Error(
        parsed.anchorBlockType
          ? `Could not find a ${parsed.anchorBlockType} block to insert ${parsed.position}.`
          : `Could not find block ${parsed.anchorBlockId} to insert ${parsed.position}.`
      );
    }

    const anchorOrder = Number(anchorBlock.order);

    return parsed.position === 'before' ? anchorOrder : anchorOrder + 1;
  };
  const normalizedBlock = normalizeCreateBlock(parsed.block, 0, context);
  const blocks = await loadBlocks();
  const newOrder = resolveOrder(blocks);
  const targetContext: CortexAiPageContext = {
    contentType: target.contentType,
    entityId: target.item.id,
    languageId: target.item.language_id,
    slug: target.item.slug,
    title: target.item.title,
    translationGroupId: target.item.translation_group_id,
  };
  const confirmation = getConfirmationPreview({
    action: 'INSERT CONTENT BLOCK',
    context,
    payload: {
      block: normalizedBlock,
      order: newOrder,
      target: {
        contentType: target.contentType,
        id: target.item.id,
        slug: target.item.slug,
      },
      tool: 'insert_content_block',
    },
    preview: {
      anchorBlockId: parsed.anchorBlockId,
      anchorBlockType: parsed.anchorBlockType,
      blockType: normalizedBlock.block_type,
      contentType: target.contentType,
      entityId: target.item.id,
      position: parsed.position,
      slug: target.item.slug,
      summary: `Insert ${normalizedBlock.block_type} block ${parsed.position} ${parsed.anchorBlockType ? `the first ${parsed.anchorBlockType} block` : parsed.anchorBlockId ? `block ${parsed.anchorBlockId}` : 'the content'} on ${target.contentType} "${target.item.title || target.item.slug}".`,
      title: target.item.title,
    },
    subject: `${normalizedBlock.block_type} block on ${target.contentType} ${target.item.id}`,
  });

  if (confirmation) {
    return confirmation;
  }

  const latestBlocks = await loadBlocks();
  const latestOrder = resolveOrder(latestBlocks);
  const blocksToShift = latestBlocks
    .filter((block: any) => Number(block.order) >= latestOrder)
    .sort((a: any, b: any) => Number(b.order) - Number(a.order));

  for (const block of blocksToShift) {
    const { error } = await supabase
      .from('blocks')
      .update({
        order: Number(block.order) + 1,
        updated_at: new Date().toISOString(),
      })
      .eq('id', block.id);

    if (error) {
      throw new Error(`Failed to shift block ${block.id}: ${serializeError(error)}`);
    }
  }

  const { data: insertedBlock, error: insertError } = await supabase
    .from('blocks')
    .insert({
      block_type: normalizedBlock.block_type,
      content: normalizedBlock.content,
      language_id: target.item.language_id,
      order: latestOrder,
      page_id: target.contentType === 'page' ? itemId : null,
      post_id: target.contentType === 'post' ? itemId : null,
    })
    .select('id, block_type, order')
    .single();

  if (insertError || !insertedBlock) {
    throw new Error(`Failed to insert content block: ${serializeError(insertError)}`);
  }

  revalidateCurrentCmsSurfaces(context, targetContext);

  return {
    blockId: insertedBlock.id,
    blockType: insertedBlock.block_type,
    contentType: target.contentType,
    entityId: target.item.id,
    mutationExecuted: true,
    order: insertedBlock.order,
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

  if (parentBlockType !== 'section') {
    throw new Error(
      `Parent block ${parsed.parentBlockId} must be a section block, not "${parentBlockType}".`
    );
  }

  const parentContent = cloneJsonRecord(
    parentBlock.content,
    `Parent block ${parsed.parentBlockId}`
  ) as SectionBlockContent;
  assertValidBlockContent(
    parentBlockType,
    parentContent,
    `Parent block ${parsed.parentBlockId}`,
    context
  );

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
    `Nested block ${parsed.columnIndex}:${parsed.blockIndex}`,
    context
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
    `Updated parent block ${parsed.parentBlockId}`,
    context
  );

  const confirmation = getConfirmationPreview({
    action: 'UPDATE NESTED BLOCK',
    context,
    payload: {
      blockIndex: parsed.blockIndex,
      columnIndex: parsed.columnIndex,
      content: parsed.content,
      nestedBlockType,
      parentBlockId: parsed.parentBlockId,
      tool: 'update_section_column_block',
    },
    preview: {
      blockIndex: parsed.blockIndex,
      columnIndex: parsed.columnIndex,
      nestedBlockType,
      parentBlockId: parsed.parentBlockId,
      parentBlockType,
    },
    subject: `${nestedBlockType} nested block ${parsed.columnIndex}:${parsed.blockIndex}`,
  });

  if (confirmation) {
    return confirmation;
  }

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
    mutationExecuted: true,
    nestedBlockType,
    parentBlockId: updatedParentBlock.id,
    parentBlockType: updatedParentBlock.block_type,
    success: true,
  };
}

export async function executeCreateCmsPage(input: CreateCmsPageInput, context?: ToolExecutionContext) {
  const parsed = createCmsPageInputSchema.parse(input);
  const supabase = getSupabase(context);
  const actorUserId = getActorUserId(context);
  const language = await getDefaultLanguageRecord(supabase, parsed.languageCode);
  const slug = slugify(parsed.slug || parsed.title);
  const blocks = normalizeCreateBlocks(parsed.blocks, parsed.contactEmail, parsed.title, context);
  const duplicate = await assertUniqueSlug({
    contentType: 'page',
    languageId: language.id,
    slug,
    supabase,
  });

  if (duplicate) {
    return duplicate;
  }

  const translationGroup = await resolveCreateTranslationGroup({
    contentType: 'page',
    languageCode: language.code,
    languageId: language.id,
    suppliedTranslationGroupId: parsed.translationGroupId,
    supabase,
  });

  if (translationGroup.result) {
    return translationGroup.result;
  }

  const payload = {
    blocks,
    item: {
      feature_image_id: parsed.feature_image_id ?? null,
      language_id: language.id,
      meta_description: parsed.meta_description ?? null,
      meta_title: parsed.meta_title ?? null,
      slug,
      status: parsed.status,
      title: parsed.title,
      translation_group_id: translationGroup.translationGroupId,
    },
    tool: 'create_cms_page',
  };
  const confirmation = getConfirmationPreview({
    action: 'CREATE PAGE',
    context,
    payload,
    preview: {
      blockCount: blocks.length,
      languageCode: language.code,
      slug,
      status: parsed.status,
      title: parsed.title,
      translationGroupId: translationGroup.translationGroupId,
    },
    subject: slug,
  });

  if (confirmation) {
    return confirmation;
  }

  const translationGroupId = translationGroup.translationGroupId || createId();
  const { data: page, error } = await supabase
    .from('pages')
    .insert({
      ...payload.item,
      author_id: actorUserId,
      translation_group_id: translationGroupId,
    })
    .select('id, language_id, slug, status, title, translation_group_id')
    .single();

  if (error || !page?.id) {
    throw new Error(`Failed to create page: ${serializeError(error)}`);
  }

  try {
    await insertContentBlocks({
      blocks,
      contentType: 'page',
      itemId: Number(page.id),
      languageId: language.id,
      supabase,
    });
  } catch (error) {
    await rollbackCreatedCmsItem({ contentType: 'page', itemId: Number(page.id), supabase });
    throw error;
  }

  revalidateCurrentCmsSurfaces(
    context,
    { contentType: 'page', entityId: Number(page.id), languageId: language.id, slug, title: parsed.title },
    slug
  );
  context?.revalidatePath?.('/cms/pages');

  return {
    blockCount: blocks.length,
    contentType: 'page',
    editPath: getCreateEditPath('page', page.id),
    entityId: page.id,
    mutationExecuted: true,
    slug,
    success: true,
    title: parsed.title,
    translationGroupId: page.translation_group_id,
  };
}

export async function executeCreateCmsPost(input: CreateCmsPostInput, context?: ToolExecutionContext) {
  const parsed = createCmsPostInputSchema.parse(input);
  const supabase = getSupabase(context);
  const actorUserId = getActorUserId(context);
  const language = await getDefaultLanguageRecord(supabase, parsed.languageCode);
  const slug = slugify(parsed.slug || parsed.title);
  const blocks = normalizeCreateBlocks(parsed.blocks, undefined, undefined, context);
  const duplicate = await assertUniqueSlug({
    contentType: 'post',
    languageId: language.id,
    slug,
    supabase,
  });

  if (duplicate) {
    return duplicate;
  }

  const translationGroup = await resolveCreateTranslationGroup({
    contentType: 'post',
    languageCode: language.code,
    languageId: language.id,
    suppliedTranslationGroupId: parsed.translationGroupId,
    supabase,
  });

  if (translationGroup.result) {
    return translationGroup.result;
  }

  const publishedAt =
    parsed.published_at && !Number.isNaN(new Date(parsed.published_at).getTime())
      ? new Date(parsed.published_at).toISOString()
      : parsed.published_at ?? null;
  const payload = {
    blocks,
    item: {
      excerpt: parsed.excerpt ?? null,
      feature_image_id: parsed.feature_image_id ?? null,
      label: parsed.label ?? null,
      language_id: language.id,
      meta_description: parsed.meta_description ?? null,
      meta_title: parsed.meta_title ?? null,
      published_at: publishedAt,
      slug,
      status: parsed.status,
      subtitle: parsed.subtitle ?? null,
      title: parsed.title,
      translation_group_id: translationGroup.translationGroupId,
    },
    tool: 'create_cms_post',
  };
  const confirmation = getConfirmationPreview({
    action: 'CREATE POST',
    context,
    payload,
    preview: {
      blockCount: blocks.length,
      languageCode: language.code,
      slug,
      status: parsed.status,
      title: parsed.title,
      translationGroupId: translationGroup.translationGroupId,
    },
    subject: slug,
  });

  if (confirmation) {
    return confirmation;
  }

  const translationGroupId = translationGroup.translationGroupId || createId();
  const { data: post, error } = await supabase
    .from('posts')
    .insert({
      ...payload.item,
      author_id: actorUserId,
      translation_group_id: translationGroupId,
    })
    .select('id, language_id, slug, status, title, translation_group_id')
    .single();

  if (error || !post?.id) {
    throw new Error(`Failed to create post: ${serializeError(error)}`);
  }

  try {
    await insertContentBlocks({
      blocks,
      contentType: 'post',
      itemId: Number(post.id),
      languageId: language.id,
      supabase,
    });
  } catch (error) {
    await rollbackCreatedCmsItem({ contentType: 'post', itemId: Number(post.id), supabase });
    throw error;
  }

  revalidateCurrentCmsSurfaces(
    context,
    { contentType: 'post', entityId: Number(post.id), languageId: language.id, slug, title: parsed.title },
    slug
  );
  context?.revalidatePath?.('/cms/posts');
  context?.revalidatePath?.('/articles');

  return {
    blockCount: blocks.length,
    contentType: 'post',
    editPath: getCreateEditPath('post', post.id),
    entityId: post.id,
    mutationExecuted: true,
    slug,
    success: true,
    title: parsed.title,
    translationGroupId: post.translation_group_id,
  };
}

function buildGeneratedSku(title: string, slug: string) {
  return (slug || slugify(title) || 'product')
    .replace(/-/g, '')
    .slice(0, 24)
    .toUpperCase();
}

function validateProductDescriptionJson(value: unknown) {
  if (value === undefined) {
    return undefined;
  }

  const validation = getEditorBlockDocumentSchema().safeParse(value);

  if (!validation.success) {
    throw new Error(
      `Product description_json failed editor document validation: ${validation.error.issues
        .map((issue) => issue.message)
        .join('; ')}`
    );
  }

  return validation.data;
}

export async function executeCreateCmsProduct(input: CreateCmsProductInput, context?: ToolExecutionContext) {
  const parsed = createCmsProductInputSchema.parse(input);
  const supabase = getSupabase(context);
  const language = await getDefaultLanguageRecord(supabase, parsed.languageCode);
  const slug = slugify(parsed.slug || parsed.title);
  const duplicate = await assertUniqueSlug({
    contentType: 'product',
    languageId: language.id,
    slug,
    supabase,
  });

  if (duplicate) {
    return duplicate;
  }

  const translationGroup = await resolveCreateTranslationGroup({
    contentType: 'product',
    languageCode: language.code,
    languageId: language.id,
    suppliedTranslationGroupId: parsed.translationGroupId,
    supabase,
  });

  if (translationGroup.result) {
    return translationGroup.result;
  }

  const { createProduct: createEcommerceProduct, productSchema } = await getEcommerceProductModule();
  const isFreemiusProduct =
    parsed.product_type === 'digital' && parsed.payment_provider === 'freemius';
  const trialPeriodDays = isFreemiusProduct ? parsed.trial_period_days : 0;
  const productPayload = productSchema.parse({
    description_json: validateProductDescriptionJson(parsed.description_json),
    freemius_plan_id: parsed.freemius_plan_id || '',
    freemius_product_id: parsed.freemius_product_id || '',
    is_taxable: parsed.is_taxable,
    language_id: language.id,
    meta_description: parsed.meta_description ?? '',
    meta_title: parsed.meta_title ?? '',
    payment_provider: parsed.payment_provider,
    price: parsed.price,
    prices: parsed.prices || {},
    product_media: [],
    product_type: parsed.product_type,
    sale_price: parsed.sale_price ?? null,
    sale_prices: parsed.sale_prices || {},
    short_description: parsed.short_description ?? '',
    sku: parsed.sku || buildGeneratedSku(parsed.title, slug),
    slug,
    status: parsed.status,
    stock: parsed.stock,
    title: parsed.title,
    trial_period_days: trialPeriodDays,
    trial_requires_payment_method:
      trialPeriodDays > 0 ? parsed.trial_requires_payment_method : false,
    translation_group_id: translationGroup.translationGroupId,
    upc: parsed.upc ?? '',
    variation_attributes: [],
    variants: [],
  });
  const confirmation = getConfirmationPreview({
    action: 'CREATE PRODUCT',
    context,
    payload: { item: productPayload, tool: 'create_cms_product' },
    preview: {
      languageCode: language.code,
      price: productPayload.price,
      sku: productPayload.sku,
      slug,
      status: productPayload.status,
      stock: productPayload.stock,
      title: productPayload.title,
      translationGroupId: translationGroup.translationGroupId,
    },
    subject: slug,
  });

  if (confirmation) {
    return confirmation;
  }

  const product = await createEcommerceProduct(supabase as any, productPayload);

  if (!product?.id) {
    throw new Error('Failed to create product.');
  }

  revalidateCurrentCmsSurfaces(
    context,
    { contentType: 'product', entityId: product.id, languageId: language.id, slug, title: parsed.title },
    slug
  );
  context?.revalidatePath?.('/cms/products');

  return {
    contentType: 'product',
    editPath: getCreateEditPath('product', product.id),
    entityId: product.id,
    mutationExecuted: true,
    slug,
    success: true,
    title: parsed.title,
    translationGroupId: product.translation_group_id,
  };
}

function normalizeFieldName(value: string) {
  return value.trim().replace(/[\s-]+/g, '_').toLowerCase();
}

function normalizeStatusValue(contentType: CmsContentType, value: unknown) {
  const normalized = typeof value === 'string' ? normalizeFieldName(value) : value;

  if (contentType === 'product') {
    if (normalized === 'public' || normalized === 'publish' || normalized === 'published') {
      return 'active';
    }

    return normalized;
  }

  if (normalized === 'public' || normalized === 'active' || normalized === 'publish') {
    return 'published';
  }

  return normalized;
}

function isUnsupportedDatedSpecial(input: UpdateCmsItemFieldInput) {
  const field = normalizeFieldName(input.field);

  return Boolean(
    input.startsAt ||
      input.endsAt ||
      field.includes('start') ||
      field.includes('end') ||
      field.includes('schedule') ||
      field.includes('special_date')
  );
}

async function buildProductFormValuesFromRow(
  product: any,
  supabase: SupabaseLike,
  overrides: Record<string, unknown>
) {
  const defaultCurrencyCode = await getDefaultCurrencyCode(supabase);
  const { productSchema } = await getEcommerceProductModule();

  return productSchema.parse({
    description_json:
      overrides.description_json !== undefined
        ? validateProductDescriptionJson(overrides.description_json)
        : product.description_json || undefined,
    freemius_plan_id: product.freemius_plan_id || '',
    freemius_product_id: product.freemius_product_id || '',
    is_taxable: overrides.is_taxable ?? product.is_taxable ?? true,
    language_id: overrides.language_id ?? product.language_id,
    meta_description: overrides.meta_description ?? product.meta_description ?? '',
    meta_title: overrides.meta_title ?? product.meta_title ?? '',
    payment_provider: overrides.payment_provider ?? product.payment_provider ?? 'stripe',
    price:
      overrides.price !== undefined
        ? overrides.price
        : maybeCentsToMajor(product.price, defaultCurrencyCode),
    prices: overrides.prices ?? mapMinorPriceMapToMajor(product.prices, defaultCurrencyCode),
    product_media: undefined,
    product_type: overrides.product_type ?? product.product_type ?? 'physical',
    sale_price:
      overrides.sale_price !== undefined
        ? overrides.sale_price
        : product.sale_price === null || product.sale_price === undefined
          ? null
          : minorUnitAmountToMajor(Number(product.sale_price), defaultCurrencyCode),
    sale_prices: overrides.sale_prices ?? mapMinorPriceMapToMajor(product.sale_prices, defaultCurrencyCode),
    short_description: overrides.short_description ?? product.short_description ?? '',
    sku: overrides.sku ?? product.sku,
    slug: overrides.slug ?? product.slug,
    status: overrides.status ?? product.status ?? 'draft',
    stock: overrides.stock ?? product.stock ?? 0,
    title: overrides.title ?? product.title,
    trial_period_days: overrides.trial_period_days ?? product.trial_period_days ?? 0,
    trial_requires_payment_method:
      overrides.trial_requires_payment_method ??
      product.trial_requires_payment_method ??
      false,
    upc: overrides.upc ?? product.upc ?? '',
    variation_attributes: [],
    variants: [],
  });
}

function buildSingleFieldUpdatePayload(
  input: UpdateCmsItemFieldInput,
  target: { contentType: CmsContentType; item: any }
) {
  const field = normalizeFieldName(input.field);
  const value = field === 'status' ? normalizeStatusValue(target.contentType, input.value) : input.value;
  const aliases: Record<string, string> = {
    description: 'description_json',
    feature_image: 'feature_image_id',
    feature_image_id: 'feature_image_id',
    language: 'language_id',
    meta_description: 'meta_description',
    meta_title: 'meta_title',
    payment: 'payment_provider',
    provider: 'payment_provider',
    regular_price: 'price',
    sale: 'sale_price',
    sale_price: 'sale_price',
    short_description: 'short_description',
    taxable: 'is_taxable',
    trial: 'trial_period_days',
    trial_days: 'trial_period_days',
    trial_payment_method_required: 'trial_requires_payment_method',
    type: 'product_type',
  };
  const normalizedField = aliases[field] || field;

  if (target.contentType !== 'product') {
    const pagePostFields = target.contentType === 'page' ? PAGE_FIELD_NAMES : POST_FIELD_NAMES;

    if (!pagePostFields.has(normalizedField)) {
      throw new Error(`Field "${input.field}" cannot be updated for ${target.contentType}.`);
    }

    if (normalizedField === 'status') {
      assertValidStatusForContentType(target.contentType, value);
    }

    return {
      field: normalizedField,
      payload: {
        [normalizedField]: normalizeCmsFieldValue(normalizedField, value),
      },
    };
  }

  const productFieldNames = new Set([
    'description_json',
    'freemius_plan_id',
    'freemius_product_id',
    'is_taxable',
    'language_id',
    'meta_description',
    'meta_title',
    'payment_provider',
    'price',
    'prices',
    'product_type',
    'sale_price',
    'sale_prices',
    'short_description',
    'sku',
    'slug',
    'status',
    'stock',
    'title',
    'trial_period_days',
    'trial_requires_payment_method',
    'upc',
  ]);

  if (!productFieldNames.has(normalizedField)) {
    throw new Error(`Field "${input.field}" cannot be updated for product.`);
  }

  if (normalizedField === 'status') {
    assertValidStatusForContentType('product', value);
  }

  if (normalizedField === 'price' || normalizedField === 'sale_price') {
    if (value !== null && (typeof value !== 'number' || value < 0)) {
      throw new Error(`${normalizedField} must be a non-negative number or null.`);
    }
  }

  if (normalizedField === 'stock' && (!Number.isInteger(value) || Number(value) < 0)) {
    throw new Error('stock must be a non-negative integer.');
  }

  if (normalizedField === 'trial_period_days' && (!Number.isInteger(value) || Number(value) < 0)) {
    throw new Error('trial_period_days must be a non-negative integer.');
  }

  if (normalizedField === 'trial_requires_payment_method' && typeof value !== 'boolean') {
    throw new Error('trial_requires_payment_method must be a boolean.');
  }

  return {
    field: normalizedField,
    payload: {
      [normalizedField]: value,
    },
  };
}

export async function executeUpdateCmsItemField(
  input: UpdateCmsItemFieldInput,
  context?: ToolExecutionContext
) {
  const parsed = updateCmsItemFieldInputSchema.parse(input);

  if (isUnsupportedDatedSpecial(parsed)) {
    return {
      message:
        'Scheduled product specials are not supported by the current product schema yet. I can set or clear sale_price now, but not start/end dates.',
      mutationExecuted: false,
      success: false,
      unsupported: true,
    };
  }

  const target = await resolveCmsTarget(parsed, context);
  const fieldUpdate = buildSingleFieldUpdatePayload(parsed, target);
  const field = fieldUpdate.field;
  let payload = fieldUpdate.payload;

  if (field === 'language_id' && typeof payload.language_id === 'string') {
    const language = await getLanguageRecord(getSupabase(context), payload.language_id);
    payload = {
      ...payload,
      language_id: language.id,
    };
  }

  const confirmation = getConfirmationPreview({
    action: 'UPDATE FIELD',
    context,
    payload: {
      contentType: target.contentType,
      entityId: target.item.id,
      field,
      payload,
      tool: 'update_cms_item_field',
    },
    preview: {
      contentType: target.contentType,
      field,
      from: target.item[field],
      slug: target.item.slug,
      title: target.item.title,
      to: payload[field],
    },
    subject: `${target.contentType} ${target.item.slug || target.item.id} ${field}`,
  });

  if (confirmation) {
    return confirmation;
  }

  if (target.contentType === 'product') {
    const { updateProduct: updateEcommerceProduct } = await getEcommerceProductModule();
    const productPayload = await buildProductFormValuesFromRow(target.item, getSupabase(context), payload);
    const product = await updateEcommerceProduct(getSupabase(context) as any, String(target.item.id), productPayload);

    revalidateCurrentCmsSurfaces(
      context,
      {
        contentType: 'product',
        entityId: String(target.item.id),
        languageId: product?.language_id ?? target.item.language_id,
        slug: product?.slug ?? target.item.slug,
        title: product?.title ?? target.item.title,
      },
      product?.slug ?? target.item.slug
    );

    return {
      contentType: 'product',
      entityId: target.item.id,
      field,
      mutationExecuted: true,
      slug: product?.slug ?? target.item.slug,
      success: true,
      updatedFields: [field],
    };
  }

  const table = target.contentType === 'page' ? 'pages' : 'posts';
  const { data: item, error } = await getSupabase(context)
    .from(table)
    .update({
      ...payload,
      updated_at: new Date().toISOString(),
    })
    .eq('id', target.item.id)
    .select('id, language_id, slug, status, title')
    .single();

  if (error || !item) {
    throw new Error(`Failed to update ${target.contentType}: ${serializeError(error)}`);
  }

  revalidateCurrentCmsSurfaces(
    context,
    {
      contentType: target.contentType,
      entityId: Number(item.id),
      languageId: item.language_id,
      slug: item.slug,
      title: item.title,
    },
    item.slug
  );

  return {
    contentType: target.contentType,
    entityId: item.id,
    field,
    mutationExecuted: true,
    slug: item.slug,
    success: true,
    updatedFields: [field],
  };
}

async function buildDeletePreview(
  input: PrepareDeleteCmsItemInput | DeleteCmsItemInput,
  context?: ToolExecutionContext
) {
  const parsed = prepareDeleteCmsItemInputSchema.parse(input);
  const target = await resolveCmsTarget(parsed, context);

  if (target.contentType === 'product') {
    return {
      affectedCount: 1,
      collectionPath: getCollectionPath('product'),
      contentType: 'product' as const,
      item: target.item,
      navigationLinkCount: 0,
      publicPaths: target.item.slug ? [`/product/${target.item.slug}`] : [],
      targetIds: [target.item.id],
    };
  }

  const table = target.contentType === 'page' ? 'pages' : 'posts';
  const { data, error } = await getSupabase(context)
    .from(table)
    .select('id, slug, title, translation_group_id')
    .eq('translation_group_id', target.item.translation_group_id);

  if (error) {
    throw new Error(`Failed to inspect related ${target.contentType}s: ${serializeError(error)}`);
  }

  const rows = Array.isArray(data) ? data : [];
  const publicPaths = rows
    .map((row: any) =>
      target.contentType === 'page'
        ? row.slug === 'home'
          ? '/'
          : `/${row.slug}`
        : `/article/${row.slug}`
    )
    .filter(Boolean);
  const publicPathSet = new Set(publicPaths);
  const { data: navigationItems, error: navigationItemsError } = await getSupabase(context)
    .from('navigation_items')
    .select('id, url');

  if (navigationItemsError) {
    throw new Error(`Failed to inspect related navigation links: ${serializeError(navigationItemsError)}`);
  }

  const navigationLinkCount = (Array.isArray(navigationItems) ? navigationItems : []).filter(
    (item: any) => publicPathSet.has(item.url)
  ).length;

  return {
    affectedCount: rows.length,
    collectionPath: getCollectionPath(target.contentType),
    contentType: target.contentType,
    item: target.item,
    navigationLinkCount,
    publicPaths,
    targetIds: rows.map((row: any) => row.id),
  };
}

function summarizeDeletePreview(preview: Awaited<ReturnType<typeof buildDeletePreview>>) {
  const title = preview.item.title || preview.item.slug || 'selected item';
  const slug = preview.item.slug ? ` (${preview.item.slug})` : '';

  if (preview.contentType === 'product') {
    return `Delete product "${title}"${slug}.`;
  }

  const details = [
    `${pluralize(preview.affectedCount, 'language version')}`,
    preview.navigationLinkCount > 0
      ? `${pluralize(preview.navigationLinkCount, 'navigation link')}`
      : null,
  ].filter(Boolean);

  return `Delete ${preview.contentType} "${title}"${slug}, including ${details.join(' and ')}.`;
}

export async function executePrepareDeleteCmsItem(
  input: PrepareDeleteCmsItemInput,
  context?: ToolExecutionContext
) {
  const preview = await buildDeletePreview(input, context);
  const confirmation = buildConfirmationPreview({
    action: `DELETE ${preview.contentType}`,
    payload: {
      affectedCount: preview.affectedCount,
      contentType: preview.contentType,
      targetIds: preview.targetIds,
      tool: 'delete_cms_item',
    },
    preview: {
      affectedCount: preview.affectedCount,
      collectionPath: preview.collectionPath,
      contentType: preview.contentType,
      navigationLinkCount: preview.navigationLinkCount,
      publicPaths: preview.publicPaths,
      slug: preview.item.slug,
      summary: summarizeDeletePreview(preview),
      title: preview.item.title,
    },
    subject: `${preview.item.id} ${preview.item.slug || ''}`,
  });

  return {
    ...confirmation,
    preparedDelete: true,
  };
}

export async function executeDeleteCmsItem(input: DeleteCmsItemInput, context?: ToolExecutionContext) {
  const parsed = deleteCmsItemInputSchema.parse(input);
  const preview = await buildDeletePreview(parsed, context);
  const confirmation = getConfirmationPreview({
    action: `DELETE ${preview.contentType}`,
    context,
    payload: {
      affectedCount: preview.affectedCount,
      contentType: preview.contentType,
      targetIds: preview.targetIds,
      tool: 'delete_cms_item',
    },
    preview: {
      affectedCount: preview.affectedCount,
      collectionPath: preview.collectionPath,
      contentType: preview.contentType,
      navigationLinkCount: preview.navigationLinkCount,
      publicPaths: preview.publicPaths,
      slug: preview.item.slug,
      summary: summarizeDeletePreview(preview),
      title: preview.item.title,
    },
    subject: `${preview.item.id} ${preview.item.slug || ''}`,
  });

  if (confirmation) {
    return confirmation;
  }

  const supabase = getSupabase(context);

  if (preview.contentType === 'product') {
    const { error } = await supabase.from('products').delete().eq('id', preview.item.id);

    if (error) {
      throw new Error(`Failed to delete product: ${serializeError(error)}`);
    }
  } else {
    for (const publicPath of preview.publicPaths) {
      await supabase.from('navigation_items').delete().eq('url', publicPath);
    }

    const table = preview.contentType === 'page' ? 'pages' : 'posts';
    const { error } = await supabase
      .from(table)
      .delete()
      .eq('translation_group_id', preview.item.translation_group_id);

    if (error) {
      throw new Error(`Failed to delete ${preview.contentType}: ${serializeError(error)}`);
    }
  }

  const revalidatePath = context?.revalidatePath ?? getDefaultRevalidatePath();

  if (revalidatePath) {
    revalidatePath(preview.collectionPath);
    revalidatePath('/cms/navigation');
    preview.publicPaths.forEach((path) => revalidatePath(path));
  }

  return {
    affectedCount: preview.affectedCount,
    collectionPath: preview.collectionPath,
    contentType: preview.contentType,
    mutationExecuted: true,
    redirectPath: preview.collectionPath,
    success: true,
  };
}

async function executeActionPlanChild(
  action: z.infer<typeof cmsActionPlanActionSchema>,
  context?: ToolExecutionContext
) {
  switch (action.tool) {
    case 'create_cms_page':
      return executeCreateCmsPage(action.input, context);
    case 'create_cms_post':
      return executeCreateCmsPost(action.input, context);
    case 'create_cms_product':
      return executeCreateCmsProduct(action.input, context);
    case 'delete_cms_item':
      return executeDeleteCmsItem(action.input, context);
    case 'update_cms_item_field':
      return executeUpdateCmsItemField(action.input, context);
    case 'update_content_block':
      return executeUpdateContentBlock(action.input, context);
    case 'insert_content_block':
      return executeInsertContentBlock(action.input, context);
    case 'update_current_cms_fields':
      return executeUpdateCurrentCmsFields(action.input, context);
    case 'update_footer':
      return executeUpdateFooter(action.input, context);
    case 'update_navigation_bar':
      return executeUpdateNavigationBar(action.input, context);
    case 'update_section_column_block':
      return executeUpdateSectionColumnBlock(action.input, context);
  }
}

function withActionPlanTranslationGroup(
  action: z.infer<typeof cmsActionPlanActionSchema>,
  translationGroupsByCreateTool: Partial<Record<'create_cms_page' | 'create_cms_post' | 'create_cms_product', string>>
) {
  if (
    action.tool !== 'create_cms_page' &&
    action.tool !== 'create_cms_post' &&
    action.tool !== 'create_cms_product'
  ) {
    return action;
  }

  if (action.input.translationGroupId || !action.input.languageCode) {
    return action;
  }

  const translationGroupId = translationGroupsByCreateTool[action.tool];

  if (!translationGroupId) {
    return action;
  }

  return {
    ...action,
    input: {
      ...action.input,
      translationGroupId,
    },
  } as z.infer<typeof cmsActionPlanActionSchema>;
}

export async function executeCmsActionPlan(
  input: ExecuteCmsActionPlanInput,
  context?: ToolExecutionContext
) {
  const parsed = executeCmsActionPlanInputSchema.parse(input);

  if (!context?.skipConfirmation) {
    const actionSummaries: string[] = [];

    for (const action of parsed.actions) {
      const result = await executeActionPlanChild(action, {
        ...context,
        latestUserMessage: null,
      });

      if (!result || typeof result !== 'object') {
        return {
          message: `Could not prepare action ${actionSummaries.length + 1}.`,
          mutationExecuted: false,
          success: false,
        };
      }

      if ((result as any).success === false || (result as any).unsupported === true) {
        return result;
      }

      if ((result as any).requiresConfirmation === true && (result as any).preview) {
        actionSummaries.push(
          summarizeCmsMutationPreview(action.tool, (result as any).preview)
        );
      } else {
        actionSummaries.push(`Run ${action.tool.replace(/_/g, ' ')}.`);
      }
    }

    const summary =
      parsed.summary ||
      `Complete ${pluralize(parsed.actions.length, 'CMS action')}.`;
    const confirmation = getConfirmationPreview({
      action: 'EXECUTE CMS ACTION PLAN',
      context,
      payload: { actions: parsed.actions, tool: 'execute_cms_action_plan' },
      preview: {
        actionCount: parsed.actions.length,
        actionSummaries,
        summary,
      },
      subject: `${parsed.actions.length} actions`,
    });

    if (confirmation) {
      return confirmation;
    }
  }

  const childContext = {
    ...context,
    skipConfirmation: true,
  };
  const results: Array<{ output: unknown; tool: string }> = [];
  let mutationExecuted = false;
  let editPath: string | null = null;
  let redirectPath: string | null = null;
  const translationGroupsByCreateTool: Partial<Record<'create_cms_page' | 'create_cms_post' | 'create_cms_product', string>> = {};

  for (const [index, action] of parsed.actions.entries()) {
    const actionToExecute = withActionPlanTranslationGroup(action, translationGroupsByCreateTool);
    const output = await executeActionPlanChild(actionToExecute, childContext);

    results.push({ output, tool: actionToExecute.tool });

    if (output && typeof output === 'object') {
      const record = output as Record<string, unknown>;

      if (record.mutationExecuted === true) {
        mutationExecuted = true;
      }

      if (!editPath && typeof record.editPath === 'string') {
        editPath = record.editPath;
      }

      if (typeof record.redirectPath === 'string') {
        redirectPath = record.redirectPath;
      }

      if (
        (actionToExecute.tool === 'create_cms_page' ||
          actionToExecute.tool === 'create_cms_post' ||
          actionToExecute.tool === 'create_cms_product') &&
        typeof record.translationGroupId === 'string'
      ) {
        translationGroupsByCreateTool[actionToExecute.tool] = record.translationGroupId;
      }

      if (record.success === false || record.unsupported === true) {
        return {
          actionCount: parsed.actions.length,
          failedActionIndex: index,
          failedTool: actionToExecute.tool,
          message:
            typeof record.message === 'string'
              ? record.message
              : `Action ${index + 1} failed.`,
          mutationExecuted,
          results,
          success: false,
          ...(editPath ? { editPath } : {}),
          ...(redirectPath ? { redirectPath } : {}),
        };
      }
    }
  }

  return {
    actionCount: parsed.actions.length,
    editPath: redirectPath ? undefined : editPath ?? undefined,
    mutationExecuted,
    redirectPath: redirectPath ?? undefined,
    results,
    success: true,
    summary: parsed.summary ?? null,
  };
}

export function createCortexGlobalAgentTools(context?: ToolExecutionContext) {
  return {
    ...createCortexDatabaseAgentTools(context),
    ...createCortexCustomBlockTools(context),
    fetch_ecommerce_stats: tool({
      description:
        'Fetch quantitative ecommerce statistics and reports from the database. Use this to answer questions about revenue, order counts, order status counts such as pending or trial, and top-selling products over a time range. This tool is read-only and does not require confirmation.',
      execute: (input) => executeFetchEcommerceStats(input, context),
      inputSchema: fetchEcommerceStatsInputSchema,
      strict: true,
    }),
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
      execute: (input) => executeSearchDocumentationWithTimeout(input, context),
      inputSchema: searchDocumentationInputSchema,
      strict: true,
    }),
    create_cms_page: tool({
      description:
        'Create a new CMS page with metadata and optional validated page blocks. Mutating: first returns a confirmation phrase; only executes after the user replies with the exact phrase. For translations, pass translationGroupId from the source page/post/product context so the new language is linked to the same backend translation group. For contact pages, provide contactEmail or a form block with recipient_email and fields.',
      execute: (input) => executeCreateCmsPage(input, context),
      inputSchema: createCmsPageInputSchema,
      strict: true,
    }),
    create_cms_post: tool({
      description:
        'Create a new CMS post with metadata and optional validated post blocks. Mutating: first returns a confirmation phrase; only executes after the user replies with the exact phrase. For translations, pass translationGroupId from the source post context so the new language is linked to the same backend translation group.',
      execute: (input) => executeCreateCmsPost(input, context),
      inputSchema: createCmsPostInputSchema,
      strict: true,
    }),
    create_cms_product: tool({
      description:
        'Create a new draft-capable product. Defaults missing product fields safely: physical Stripe product, generated SKU, price 0, stock 0, taxable, draft. For translations, pass translationGroupId from the source product context. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeCreateCmsProduct(input, context),
      inputSchema: createCmsProductInputSchema,
      strict: true,
    }),
    delete_cms_item: tool({
      description:
        'Delete a resolved page, post, or product after exact confirmation. Pages/posts delete all translations in the translation group and related navigation links. Mutating: refuses unless the latest user message includes the exact confirmation phrase.',
      execute: (input) => executeDeleteCmsItem(input, context),
      inputSchema: deleteCmsItemInputSchema,
      strict: true,
    }),
    prepare_delete_cms_item: tool({
      description:
        'Inspect the page, post, or product that would be deleted and return the exact confirmation phrase. This tool does not mutate data.',
      execute: (input) => executePrepareDeleteCmsItem(input, context),
      inputSchema: prepareDeleteCmsItemInputSchema,
      strict: true,
    }),
    update_footer: tool({
      description:
        'Replace the public footer links and/or footer copyright settings for a locale. Use links for footer navigation and copyright for locale text templates. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateFooter(input, context),
      inputSchema: updateFooterInputSchema,
      strict: true,
    }),
    update_content_block: tool({
      description:
        'Update the JSON content of an existing top-level page/post block that belongs to the current CMS edit context. Content is merged with the existing block before validation. For section blocks, add nested blocks with content.append_block or content.append_blocks using objects like { block_type: "button", content: { text: "Contact Us", url: "/contact" } }; existing column_blocks and layout fields are preserved. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateContentBlock(input, context),
      inputSchema: updateContentBlockInputSchema,
      strict: true,
    }),
    insert_content_block: tool({
      description:
        'Insert a new validated top-level page/post block before or after an existing block, or at the start/end. Use this for visible content additions like adding a rich text title and paragraph above a form. For "above the form", use position "before" with anchorBlockType "form" and blockType "text" containing html_content. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeInsertContentBlock(input, context),
      inputSchema: insertContentBlockInputSchema,
      strict: true,
    }),
    update_current_cms_fields: tool({
      description:
        'Update validated metadata fields on the current page, post, or product. For products, description_json must be a valid NextBlock editor document JSON object. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateCurrentCmsFields(input, context),
      inputSchema: updateCurrentCmsFieldsInputSchema,
      strict: true,
    }),
    update_cms_item_field: tool({
      description:
        'Update one field on a page, post, or product, resolving by current edit context, id, slug, or exact title. Use this for requests like changing price, stock, title, slug, status, sale_price, or meta fields. Interpret public as published for pages/posts and active for products. Scheduled sale date ranges are not supported and will be refused without mutation. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateCmsItemField(input, context),
      inputSchema: updateCmsItemFieldInputSchema,
      strict: true,
    }),
    update_navigation_bar: tool({
      description:
        'Update the public header navigation bar for a locale. Use mode "append" when adding links while preserving existing navigation. Use mode "update" when renaming or changing an existing single link. Use mode "replace" only when the user asks to rebuild the complete header and you provide the full menu; destructive partial replacements are refused. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateNavigationBar(input, context),
      inputSchema: updateNavigationBarInputSchema,
      strict: true,
    }),
    update_section_column_block: tool({
      description:
        'Update the content of one existing nested block inside a section block that belongs to the current CMS edit context. This tool must not change the nested block type. To add a new nested block, update the parent section with update_content_block and preserve existing column_blocks. Mutating: first returns a confirmation phrase; only executes after exact confirmation.',
      execute: (input) => executeUpdateSectionColumnBlock(input, context),
      inputSchema: updateSectionColumnBlockInputSchema,
      strict: true,
    }),
    execute_cms_action_plan: tool({
      description:
        'Execute multiple CMS mutations as one confirmed plan. Use this whenever the user asks for more than one change in the same prompt, such as creating a page and adding a navigation link. First returns one combined confirmation preview and Confirm button; after confirmation, runs each action in order and stops on the first failure.',
      execute: (input) => executeCmsActionPlan(input, context),
      inputSchema: executeCmsActionPlanInputSchema,
      strict: true,
    }),
  };
}
