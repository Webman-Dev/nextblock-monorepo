import 'server-only';

import { getSsgSupabaseClient, verifyPackageOnline } from '@nextblock-cms/db/server';
import { resolveMediaUrl } from '../media/resolveMediaUrl';
import type {
  GlobalSearchFilter,
  GlobalSearchResponse,
  GlobalSearchResult,
  GlobalSearchResultType,
} from './types';

const CANDIDATE_LIMIT = 180;
const DEFAULT_RESULT_LIMIT = 12;
const MAX_RESULT_LIMIT = 50;
const MAX_QUERY_LENGTH = 96;

const HUMAN_TEXT_KEYS = new Set([
  'alt_text',
  'author_name',
  'author_title',
  'caption',
  'html_content',
  'label',
  'placeholder',
  'quote',
  'submit_button_text',
  'success_message',
  'text',
  'text_content',
  'title',
]);

const HUMAN_CONTAINER_KEYS = new Set([
  'blocks',
  'children',
  'column_blocks',
  'content',
  'fields',
  'items',
  'options',
]);

const PRESENTATION_KEYS = new Set([
  'attrs',
  'background',
  'block_type',
  'blur_data_url',
  'categoryId',
  'class',
  'className',
  'color',
  'column_gap',
  'container_type',
  'desktop',
  'direction',
  'file_path',
  'gradient',
  'height',
  'href',
  'icon',
  'id',
  'image',
  'imagePosition',
  'image_url',
  'limit',
  'media',
  'media_id',
  'metadata',
  'mobile',
  'object_key',
  'overlay',
  'padding',
  'position',
  'productId',
  'quality',
  'responsive_columns',
  'showBackground',
  'showPagination',
  'size',
  'solid_color',
  'src',
  'style',
  'tablet',
  'theme',
  'type',
  'url',
  'value',
  'variant',
  'vertical_alignment',
  'width',
]);

type SearchCandidate = Omit<GlobalSearchResult, 'score' | 'snippet'> & {
  bodyText: string;
  searchableText: string;
  sortDate: string | null;
};

type PreparedQuery = {
  display: string;
  normalized: string;
  tokens: string[];
};

function sanitizeSearchQuery(value: string | null | undefined) {
  return (value || '').replace(/\s+/g, ' ').trim().slice(0, MAX_QUERY_LENGTH);
}

function normalizeForSearch(value: string | null | undefined) {
  return (value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function prepareQuery(rawQuery: string): PreparedQuery | null {
  const display = sanitizeSearchQuery(rawQuery);

  if (display.length < 2) {
    return null;
  }

  const normalized = normalizeForSearch(display);
  const tokens = Array.from(
    new Set(normalized.split(/[^a-z0-9]+/).filter((token) => token.length >= 2))
  ).slice(0, 8);

  if (tokens.length === 0) {
    return null;
  }

  return { display, normalized, tokens };
}

function stripMarkup(value: string) {
  return value
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function compactText(parts: Array<string | null | undefined>) {
  return parts
    .map((part) => stripMarkup(part || ''))
    .filter(Boolean)
    .join(' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function collectHumanText(value: unknown, depth = 0, parentKey?: string): string[] {
  if (depth > 6 || value == null) {
    return [];
  }

  if (typeof value === 'string') {
    return parentKey && HUMAN_TEXT_KEYS.has(parentKey) ? [stripMarkup(value)] : [];
  }

  if (typeof value === 'number' || typeof value === 'boolean') {
    return [];
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => collectHumanText(item, depth + 1, parentKey));
  }

  if (typeof value === 'object') {
    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
      if (PRESENTATION_KEYS.has(key)) {
        return [];
      }

      if (HUMAN_TEXT_KEYS.has(key) || HUMAN_CONTAINER_KEYS.has(key)) {
        return collectHumanText(nestedValue, depth + 1, key);
      }

      return [];
    });
  }

  return [];
}

function getFirstRelation<T>(value: T | T[] | null | undefined): T | null {
  if (Array.isArray(value)) {
    return value[0] ?? null;
  }

  return value ?? null;
}

function getLanguageCode(row: { languages?: unknown }) {
  const language = getFirstRelation(row.languages as { code?: string } | { code?: string }[] | null);
  return language?.code ?? null;
}

function buildBodyFromBlocks(blocks: unknown) {
  if (!Array.isArray(blocks)) {
    return '';
  }

  return compactText(
    blocks.flatMap((block) => {
      const content = (block as { content?: unknown }).content;
      return collectHumanText(content);
    })
  ).slice(0, 5000);
}

function getProductImageUrl(productMedia: unknown) {
  if (!Array.isArray(productMedia)) {
    return null;
  }

  const sorted = [...productMedia].sort((a, b) => {
    const left = (a as { sort_order?: number | null }).sort_order ?? 0;
    const right = (b as { sort_order?: number | null }).sort_order ?? 0;
    return left - right;
  });
  const first = sorted[0] as { media?: { object_key?: string | null; file_path?: string | null } | null } | undefined;
  const media = getFirstRelation(first?.media ?? null);

  return resolveMediaUrl(media?.object_key || media?.file_path || null);
}

function candidateBaseScore(candidate: SearchCandidate, prepared: PreparedQuery) {
  const title = normalizeForSearch(candidate.title);
  const description = normalizeForSearch(candidate.description);
  const body = normalizeForSearch(candidate.bodyText);
  const href = normalizeForSearch(candidate.href);
  const label = normalizeForSearch(candidate.meta.label);
  const sku = normalizeForSearch(candidate.meta.sku);
  const all = normalizeForSearch(candidate.searchableText);

  if (!prepared.tokens.some((token) => all.includes(token))) {
    return 0;
  }

  let score = 0;

  if (title === prepared.normalized) score += 120;
  if (title.startsWith(prepared.normalized)) score += 70;
  if (title.includes(prepared.normalized)) score += 55;
  if (href.includes(prepared.normalized)) score += 30;
  if (description.includes(prepared.normalized)) score += 24;
  if (body.includes(prepared.normalized)) score += 14;
  if (sku && sku.includes(prepared.normalized)) score += 80;

  for (const token of prepared.tokens) {
    if (title.includes(token)) score += 28;
    if (href.includes(token)) score += 18;
    if (description.includes(token)) score += 14;
    if (label.includes(token)) score += 12;
    if (sku.includes(token)) score += 36;
    if (body.includes(token)) score += 6;
  }

  if (candidate.type === 'page') score += 4;
  if (candidate.type === 'product' && candidate.meta.sku) score += 4;

  return score;
}

function buildSnippet(candidate: SearchCandidate, prepared: PreparedQuery) {
  const source = compactText([candidate.description, candidate.bodyText]);

  if (!source) {
    return candidate.description || null;
  }

  const normalizedSource = normalizeForSearch(source);
  let index = normalizedSource.indexOf(prepared.normalized);

  if (index < 0) {
    const matchedToken = prepared.tokens.find((token) => normalizedSource.includes(token));
    index = matchedToken ? normalizedSource.indexOf(matchedToken) : 0;
  }

  const radius = 92;
  const start = Math.max(0, index - radius);
  const end = Math.min(source.length, index + radius);
  const snippet = source.slice(start, end).replace(/\s+/g, ' ').trim();

  return `${start > 0 ? '... ' : ''}${snippet}${end < source.length ? ' ...' : ''}`;
}

function scoreCandidates(candidates: SearchCandidate[], prepared: PreparedQuery) {
  return candidates
    .map((candidate) => ({
      ...candidate,
      score: candidateBaseScore(candidate, prepared),
      snippet: buildSnippet(candidate, prepared),
    }))
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) {
        return right.score - left.score;
      }

      return new Date(right.sortDate || 0).getTime() - new Date(left.sortDate || 0).getTime();
    });
}

async function getLanguageId(locale: string | null) {
  const normalizedLocale = sanitizeSearchQuery(locale).toLowerCase();

  if (!normalizedLocale) {
    return null;
  }

  const supabase = getSsgSupabaseClient();
  const { data } = await supabase
    .from('languages')
    .select('id')
    .eq('code', normalizedLocale)
    .maybeSingle();

  return typeof data?.id === 'number' ? data.id : null;
}

async function fetchPages(languageId: number | null): Promise<SearchCandidate[]> {
  const supabase = getSsgSupabaseClient();
  let query = supabase
    .from('pages')
    .select(
      `
      id,
      title,
      slug,
      meta_title,
      meta_description,
      updated_at,
      language_id,
      languages!inner(code),
      media:feature_image_id(object_key, blur_data_url, width, height),
      blocks(content, block_type, order)
    `
    )
    .eq('status', 'published')
    .order('updated_at', { ascending: false })
    .limit(CANDIDATE_LIMIT);

  if (languageId) {
    query = query.eq('language_id', languageId);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) console.error('Global search page query failed:', error.message);
    return [];
  }

  return data.map((page: any) => {
    const bodyText = buildBodyFromBlocks(page.blocks);
    const description = page.meta_description || null;
    const href = page.slug === 'home' || page.slug === 'accueil' ? '/' : `/${page.slug}`;
    const media = getFirstRelation(page.media as { object_key?: string | null } | { object_key?: string | null }[] | null);

    return {
      id: String(page.id),
      type: 'page' as const,
      title: page.meta_title || page.title,
      description,
      href,
      locale: getLanguageCode(page),
      imageUrl: resolveMediaUrl(media?.object_key || null),
      bodyText,
      searchableText: compactText([page.title, page.meta_title, description, page.slug, bodyText]),
      sortDate: page.updated_at ?? null,
      meta: {
        updatedAt: page.updated_at ?? null,
      },
    };
  });
}

async function fetchPosts(languageId: number | null): Promise<SearchCandidate[]> {
  const supabase = getSsgSupabaseClient();
  const now = new Date().toISOString();
  let query = supabase
    .from('posts')
    .select(
      `
      id,
      title,
      slug,
      label,
      excerpt,
      subtitle,
      meta_title,
      meta_description,
      published_at,
      updated_at,
      language_id,
      languages!inner(code),
      media:feature_image_id(object_key, blur_data_url, width, height),
      blocks(content, block_type, order)
    `
    )
    .eq('status', 'published')
    .or(`published_at.is.null,published_at.lte.${now}`)
    .order('published_at', { ascending: false, nullsFirst: false })
    .limit(CANDIDATE_LIMIT);

  if (languageId) {
    query = query.eq('language_id', languageId);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) console.error('Global search post query failed:', error.message);
    return [];
  }

  return data.map((post: any) => {
    const bodyText = buildBodyFromBlocks(post.blocks);
    const description = post.meta_description || post.excerpt || post.subtitle || null;
    const media = getFirstRelation(post.media as { object_key?: string | null } | { object_key?: string | null }[] | null);

    return {
      id: String(post.id),
      type: 'post' as const,
      title: post.meta_title || post.title,
      description,
      href: `/article/${post.slug}`,
      locale: getLanguageCode(post),
      imageUrl: resolveMediaUrl(media?.object_key || null),
      bodyText,
      searchableText: compactText([
        post.title,
        post.meta_title,
        description,
        post.label,
        post.slug,
        bodyText,
      ]),
      sortDate: post.published_at || post.updated_at || null,
      meta: {
        label: post.label ?? null,
        publishedAt: post.published_at ?? null,
        updatedAt: post.updated_at ?? null,
      },
    };
  });
}

async function fetchProducts(languageId: number | null): Promise<SearchCandidate[]> {
  const supabase = getSsgSupabaseClient();
  let query = supabase
    .from('products')
    .select(
      `
      id,
      title,
      slug,
      sku,
      short_description,
      meta_title,
      meta_description,
      updated_at,
      created_at,
      language_id,
      languages!inner(code),
      product_media(sort_order, media(object_key, file_path, blur_data_url, width, height)),
      blocks(content, block_type, order)
    `
    )
    .eq('status', 'active')
    .order('updated_at', { ascending: false })
    .limit(CANDIDATE_LIMIT);

  if (languageId) {
    query = query.eq('language_id', languageId);
  }

  const { data, error } = await query;

  if (error || !data) {
    if (error) console.error('Global search product query failed:', error.message);
    return [];
  }

  return data.map((product: any) => {
    const bodyText = buildBodyFromBlocks(product.blocks);
    const description = product.meta_description || product.short_description || null;

    return {
      id: String(product.id),
      type: 'product' as const,
      title: product.meta_title || product.title,
      description,
      href: `/product/${product.slug}`,
      locale: getLanguageCode(product),
      imageUrl: getProductImageUrl(product.product_media),
      bodyText,
      searchableText: compactText([
        product.title,
        product.meta_title,
        description,
        product.sku,
        product.slug,
        bodyText,
      ]),
      sortDate: product.updated_at || product.created_at || null,
      meta: {
        sku: product.sku ?? null,
        updatedAt: product.updated_at ?? null,
      },
    };
  });
}

function shouldSearchType(filter: GlobalSearchFilter, type: GlobalSearchResultType) {
  return filter === 'all' || filter === type;
}

export async function searchPublicContent({
  query,
  locale,
  filter = 'all',
  limit = DEFAULT_RESULT_LIMIT,
}: {
  query: string;
  locale?: string | null;
  filter?: GlobalSearchFilter;
  limit?: number;
}): Promise<GlobalSearchResponse> {
  const prepared = prepareQuery(query);

  if (!prepared) {
    return {
      query: sanitizeSearchQuery(query),
      results: [],
      counts: { all: 0, page: 0, post: 0, product: 0 },
    };
  }

  const resultLimit = Math.min(Math.max(limit || DEFAULT_RESULT_LIMIT, 1), MAX_RESULT_LIMIT);
  const languageId = await getLanguageId(locale ?? null);
  const ecommerceActive = shouldSearchType(filter, 'product')
    ? await verifyPackageOnline('ecommerce').catch(() => false)
    : false;

  const [pages, posts, products] = await Promise.all([
    shouldSearchType(filter, 'page') ? fetchPages(languageId) : Promise.resolve([]),
    shouldSearchType(filter, 'post') ? fetchPosts(languageId) : Promise.resolve([]),
    shouldSearchType(filter, 'product') && ecommerceActive
      ? fetchProducts(languageId)
      : Promise.resolve([]),
  ]);

  const scoredResults = scoreCandidates([...pages, ...posts, ...products], prepared);
  const counts = scoredResults.reduce<Record<GlobalSearchResultType | 'all', number>>(
    (accumulator, result) => {
      accumulator[result.type] += 1;
      accumulator.all += 1;
      return accumulator;
    },
    { all: 0, page: 0, post: 0, product: 0 }
  );

  return {
    query: prepared.display,
    results: scoredResults
      .slice(0, resultLimit)
      .map(({ bodyText, searchableText, sortDate, ...result }) => {
        void bodyText;
        void searchableText;
        void sortDate;
        return result;
      }),
    counts,
  };
}
