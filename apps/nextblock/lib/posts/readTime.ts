import type { Database } from '@nextblock-cms/db';

type BlockRow = Database['public']['Tables']['blocks']['Row'];

const WORDS_PER_MINUTE = 200;

function extractPlainTextFromHtml(html: string) {
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
}

function countWords(text: string) {
  if (!text) {
    return 0;
  }

  return text.split(' ').length;
}

export function estimateReadTimeMinutesFromHtmlFragments(htmlFragments: string[]) {
  const words = htmlFragments.reduce((total, html) => {
    const plainText = extractPlainTextFromHtml(html);
    return total + countWords(plainText);
  }, 0);

  return Math.max(1, Math.round(words / WORDS_PER_MINUTE));
}

export function estimateReadTimeMinutesFromBlocks(
  blocks: Array<Pick<BlockRow, 'block_type' | 'content'>> | undefined
) {
  if (!blocks || blocks.length === 0) {
    return 1;
  }

  const htmlFragments = blocks.reduce<string[]>((fragments, block) => {
    if (block.block_type !== 'text') {
      return fragments;
    }

    const html =
      typeof block.content === 'object' && block.content && 'html_content' in block.content
        ? String((block.content as { html_content?: string }).html_content ?? '')
        : '';

    if (html) {
      fragments.push(html);
    }

    return fragments;
  }, []);

  return estimateReadTimeMinutesFromHtmlFragments(htmlFragments);
}
