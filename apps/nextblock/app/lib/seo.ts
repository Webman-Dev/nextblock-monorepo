export const DEFAULT_SITE_DESCRIPTION =
  'Nextblock CMS pairs a visual block editor with a blazing-fast Next.js + Supabase architecture.';

const DEFAULT_META_DESCRIPTION_LENGTH = 160;

function normalizeWhitespace(value: string) {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string) {
  const entities: Record<string, string> = {
    amp: '&',
    apos: "'",
    gt: '>',
    lt: '<',
    nbsp: ' ',
    quot: '"',
  };

  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match, entity) => {
    const key = String(entity);
    if (key[0] === '#') {
      const isHex = key[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(key.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match;
    }

    return entities[key] ?? match;
  });
}

export function stripHtmlToText(value: string) {
  return normalizeWhitespace(
    decodeHtmlEntities(
      value
        .replace(/<script[\s\S]*?<\/script>/gi, ' ')
        .replace(/<style[\s\S]*?<\/style>/gi, ' ')
        .replace(/<[^>]+>/g, ' ')
    )
  );
}

function extractParagraphTextFromHtml(value: string) {
  const paragraphs = Array.from(value.matchAll(/<p\b[^>]*>([\s\S]*?)<\/p>/gi))
    .map((match) => stripHtmlToText(match[1] ?? ''))
    .filter(Boolean);

  if (paragraphs.length > 0) {
    return paragraphs[0];
  }

  return stripHtmlToText(value.replace(/<h[1-6]\b[\s\S]*?<\/h[1-6]>/gi, ' '));
}

function truncateMetaDescription(value: string, maxLength = DEFAULT_META_DESCRIPTION_LENGTH) {
  const normalized = normalizeWhitespace(value);
  if (normalized.length <= maxLength) {
    return normalized;
  }

  const truncated = normalized.slice(0, maxLength + 1);
  const lastSpace = truncated.lastIndexOf(' ');
  const candidate = lastSpace > 80 ? truncated.slice(0, lastSpace) : normalized.slice(0, maxLength);

  return candidate.replace(/[.,;:!?-]+$/, '').trim();
}

function normalizeMetaCandidate(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = stripHtmlToText(value);
  return normalized || null;
}

function collectIntroTextCandidates(value: unknown, candidates: string[]) {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectIntroTextCandidates(item, candidates));
    return;
  }

  if (typeof value !== 'object') {
    return;
  }

  const block = value as {
    block_type?: string;
    content?: Record<string, unknown>;
  };

  if (block.block_type === 'section' || block.block_type === 'hero') {
    collectIntroTextCandidates(block.content?.column_blocks, candidates);
    collectIntroTextCandidates(block.content?.slides, candidates);
    return;
  }

  if (block.block_type === 'text') {
    const htmlContent = block.content?.html_content;
    const textContent = block.content?.text_content;
    const candidate =
      typeof htmlContent === 'string'
        ? extractParagraphTextFromHtml(htmlContent)
        : typeof textContent === 'string'
          ? normalizeWhitespace(textContent)
          : '';

    if (candidate) {
      candidates.push(candidate);
    }
  }
}

export function extractIntroExcerptFromBlocks(blocks: unknown) {
  const candidates: string[] = [];
  collectIntroTextCandidates(blocks, candidates);

  return (
    candidates.find((candidate) => candidate.length >= 80) ??
    candidates[0] ??
    null
  );
}

export function resolveMetaTitle(
  manualTitle: string | null | undefined,
  fallbackTitle: string | null | undefined
) {
  return normalizeMetaCandidate(manualTitle) ?? normalizeMetaCandidate(fallbackTitle) ?? 'Nextblock CMS';
}

export function resolveMetaDescription(...candidates: Array<string | null | undefined>) {
  for (const candidate of candidates) {
    const description = normalizeMetaCandidate(candidate);
    if (description) {
      return truncateMetaDescription(description);
    }
  }

  return DEFAULT_SITE_DESCRIPTION;
}

export function resolvePageMetaDescription(
  manualDescription: string | null | undefined,
  blocks: unknown
) {
  return resolveMetaDescription(manualDescription, extractIntroExcerptFromBlocks(blocks));
}

export function resolvePostMetaDescription(
  manualDescription: string | null | undefined,
  subtitle: string | null | undefined
) {
  return resolveMetaDescription(manualDescription, subtitle);
}

export function resolveProductMetaDescription(
  manualDescription: string | null | undefined,
  shortDescription: string | null | undefined
) {
  return resolveMetaDescription(manualDescription, shortDescription);
}

export function stringifyJsonLd(value: unknown) {
  return JSON.stringify(value).replace(/</g, '\\u003c');
}
