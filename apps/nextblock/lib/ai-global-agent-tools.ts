import { tool } from 'ai';
import { z } from 'zod';

type SupabaseLike = {
  from: (table: string) => any;
};

type RevalidateFn = (path: string, type?: 'layout' | 'page') => void;
type MenuKey = 'HEADER' | 'FOOTER';

type ToolExecutionContext = {
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

export const updateNavigationBarInputSchema = z.strictObject({
  items: z.array(navigationItemInputSchema).min(1).max(30),
  languageCode: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .default('en')
    .describe('Locale code or language name, for example "en", "fr", "English", or "French".'),
  mode: z.enum(['append', 'replace']).default('replace'),
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

export type NavigationItemInput = z.infer<typeof navigationItemInputSchema>;
export type UpdateNavigationBarInput = z.infer<typeof updateNavigationBarInputSchema>;
export type UpdateFooterInput = z.infer<typeof updateFooterInputSchema>;
export type SearchDocumentationInput = z.infer<typeof searchDocumentationInputSchema>;

type DocumentationSnippet = {
  excerpt: string;
  source: 'page' | 'post';
  title: string;
  url: string;
};

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

function normalizeNavigationUrl(value: unknown) {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
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
  };
}

export async function executeUpdateNavigationBar(
  input: UpdateNavigationBarInput,
  context?: ToolExecutionContext
) {
  const parsed = updateNavigationBarInputSchema.parse(input);
  const supabase = getSupabase(context);
  const result =
    parsed.mode === 'append'
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

export function createCortexGlobalAgentTools(context?: ToolExecutionContext) {
  return {
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
    update_navigation_bar: tool({
      description:
        'Update the public header navigation bar for a locale. Use mode "append" when the user asks to add links while preserving existing navigation. Use mode "replace" only when the user asks to rebuild or replace the complete header.',
      execute: (input) => executeUpdateNavigationBar(input, context),
      inputSchema: updateNavigationBarInputSchema,
      strict: true,
    }),
  };
}
