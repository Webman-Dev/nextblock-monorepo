import { extractIntroExcerptFromBlocks, stripHtmlToText } from '../../app/lib/seo';

/**
 * Flatten a page's or post's block rows into plain prose for the metadata generator.
 *
 * `POST /api/ai/seo/metadata` wants the *body copy* — it has to read the page to write a
 * title and description about it. What the CMS holds instead is a tree of block rows
 * whose text is scattered across differently-named fields and nested one or two levels
 * deep inside layout containers. This walks that tree once and returns the readable text.
 *
 * It deliberately reuses `stripHtmlToText` from `app/lib/seo.ts` rather than growing a
 * fourth HTML stripper in this repo. That module was checked before importing it here:
 * its only import is `import type { Metadata } from 'next'`, a type-only import that is
 * erased at compile time, so nothing server-only is pulled into the client bundle even
 * though `app/lib/site-settings.ts` — a different module — imports it under 'server-only'.
 *
 * The walk covers the containers that actually nest content today:
 *  - `section` blocks hold their children in `content.column_blocks`,
 *  - `hero` blocks hold theirs in `content.slides`,
 * matching how `collectIntroTextCandidates` in `app/lib/seo.ts` traverses the same shapes.
 * Anything unrecognized is skipped rather than guessed at, because feeding the model
 * stray JSON keys produces worse metadata than feeding it less prose.
 */
function collectBlockText(value: unknown, collected: string[]): void {
  if (!value) {
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectBlockText(item, collected));
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
    collectBlockText(block.content?.column_blocks, collected);
    collectBlockText(block.content?.slides, collected);
    return;
  }

  if (block.block_type === 'heading') {
    const headingText = block.content?.text_content;
    if (typeof headingText === 'string' && headingText.trim()) {
      collected.push(stripHtmlToText(headingText));
    }
    return;
  }

  if (block.block_type === 'text') {
    const htmlContent = block.content?.html_content;
    const textContent = block.content?.text_content;
    const candidate =
      typeof htmlContent === 'string'
        ? stripHtmlToText(htmlContent)
        : typeof textContent === 'string'
          ? stripHtmlToText(textContent)
          : '';

    if (candidate) {
      collected.push(candidate);
    }
  }
}

/**
 * Maximum prose we send to the metadata route.
 *
 * A meta title and description summarize the *top* of a page; the model does not need
 * the whole of a 5,000-word article to write 160 characters, and shipping the whole of
 * it costs tokens and latency on every click of the button. Cutting at a sentence-ish
 * boundary keeps the tail from ending mid-word, which reads to the model as a typo.
 */
const MAX_CONTENT_CHARACTERS = 6000;

export function extractPlainTextFromBlocks(blocks: unknown): string {
  const collected: string[] = [];
  collectBlockText(blocks, collected);

  const joined = collected.join('\n\n').trim();
  if (joined.length <= MAX_CONTENT_CHARACTERS) {
    return joined;
  }

  const truncated = joined.slice(0, MAX_CONTENT_CHARACTERS);
  const lastBoundary = Math.max(truncated.lastIndexOf('. '), truncated.lastIndexOf('\n'));
  return (lastBoundary > MAX_CONTENT_CHARACTERS / 2
    ? truncated.slice(0, lastBoundary + 1)
    : truncated
  ).trim();
}

/**
 * Best available prose for the metadata call, in descending order of usefulness.
 *
 * A brand-new page has no blocks yet, and an operator clicking "Generate" on an empty
 * page should still get something better than a disabled button — the title plus any
 * editorial summary they have typed is a thin but genuine brief. `fallbacks` is where
 * the caller passes those: a post's excerpt and subtitle, or a page's title.
 */
export function buildSeoContentForGeneration(
  blocks: unknown,
  ...fallbacks: Array<string | null | undefined>
): string {
  const fromBlocks = extractPlainTextFromBlocks(blocks);
  if (fromBlocks) {
    return fromBlocks;
  }

  const intro = extractIntroExcerptFromBlocks(blocks);
  const parts = [intro, ...fallbacks]
    .map((part) => (typeof part === 'string' ? stripHtmlToText(part) : ''))
    .filter(Boolean);

  return parts.join('\n\n').trim();
}
