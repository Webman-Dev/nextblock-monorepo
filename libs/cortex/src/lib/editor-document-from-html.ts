/**
 * Convert an HTML fragment (or plain text) into a Tiptap/editor document.
 *
 * Cortex asks models for HTML rather than nested editor JSON — the same choice
 * `ai-block-generation.ts` already makes for the inline assistant — because even
 * small models emit correct HTML reliably while deeply nested node JSON is a
 * common failure mode. Products store their body as `description_json`, so that
 * HTML has to become editor JSON on the server, with no DOM available.
 *
 * Deliberately dependency-free: `@tiptap/html`'s `generateJSON` needs both a DOM
 * shim and the full client-side extension list, and `libs/editor` is a client
 * bundle that cannot be imported from a server tool.
 */

type EditorMark = { attrs?: Record<string, unknown>; type: string };

type EditorInlineNode =
  | { marks?: EditorMark[]; text: string; type: 'text' }
  | { type: 'hardBreak' };

type EditorBlockNode = {
  attrs?: Record<string, unknown>;
  content?: unknown[];
  type: string;
};

export type EditorDocument = {
  content: EditorBlockNode[];
  type: 'doc';
};

const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source',
  'track', 'wbr',
]);

// Inline tag -> editor mark. Tags absent here are unwrapped (their text is kept,
// the tag itself is dropped) rather than discarded.
//
// Restricted to the marks editorBlockDocumentSchema actually accepts: bold,
// italic, strike, code, link, highlight, textStyle, subscript, superscript.
// There is deliberately NO underline mapping — the editor schema has no
// `underline` mark, so <u>/<ins> are unwrapped to plain text. Emitting one
// would be silently dropped when a human opens the product in the CMS editor.
const INLINE_MARK_TAGS: Record<string, string> = {
  b: 'bold',
  code: 'code',
  del: 'strike',
  em: 'italic',
  i: 'italic',
  mark: 'highlight',
  s: 'strike',
  strike: 'strike',
  strong: 'bold',
  sub: 'subscript',
  sup: 'superscript',
};

// Containers whose children are block-level and should be flattened upward.
const TRANSPARENT_BLOCK_TAGS = new Set([
  'article', 'aside', 'body', 'div', 'footer', 'header', 'html', 'main', 'nav', 'section',
]);

const IGNORED_TAGS = new Set(['script', 'style', 'noscript', 'svg', 'template', 'iframe', 'form']);

const MAX_DEPTH = 12;

function decodeHtmlEntities(value: string) {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#0?39;/g, "'")
    .replace(/&apos;/gi, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    // Ampersand last so "&amp;lt;" does not become "<".
    .replace(/&amp;/gi, '&');
}

function readAttribute(rawTag: string, attribute: string) {
  const match = rawTag.match(
    new RegExp(`\\b${attribute}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, 'i')
  );

  if (!match) {
    return null;
  }

  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '');
}

/**
 * Read an element's inner HTML starting just past its opening tag, honouring
 * nesting of the same tag (`<div><div></div></div>`).
 */
function readElementBody(html: string, start: number, tag: string) {
  const openPattern = new RegExp(`<${tag}\\b`, 'gi');
  const closePattern = new RegExp(`</${tag}\\s*>`, 'gi');
  let depth = 1;
  let position = start;

  while (depth > 0) {
    closePattern.lastIndex = position;
    const close = closePattern.exec(html);

    if (!close) {
      // Unclosed tag: treat the remainder as its body rather than losing it.
      return { end: html.length, inner: html.slice(start) };
    }

    openPattern.lastIndex = position;
    const open = openPattern.exec(html);

    if (open && open.index < close.index) {
      depth += 1;
      position = open.index + open[0].length;
      continue;
    }

    depth -= 1;
    position = close.index + close[0].length;

    if (depth === 0) {
      return { end: position, inner: html.slice(start, close.index) };
    }
  }

  return { end: position, inner: html.slice(start) };
}

type HtmlToken =
  | { attrs: string; inner: string; tag: string; type: 'element' }
  | { text: string; type: 'text' };

function tokenizeHtml(html: string): HtmlToken[] {
  const tokens: HtmlToken[] = [];
  let index = 0;

  while (index < html.length) {
    const openIndex = html.indexOf('<', index);

    if (openIndex === -1) {
      tokens.push({ text: html.slice(index), type: 'text' });
      break;
    }

    if (openIndex > index) {
      tokens.push({ text: html.slice(index, openIndex), type: 'text' });
    }

    const closeIndex = html.indexOf('>', openIndex);

    if (closeIndex === -1) {
      tokens.push({ text: html.slice(openIndex), type: 'text' });
      break;
    }

    const rawTag = html.slice(openIndex + 1, closeIndex);

    // Comments, doctypes, and stray closing tags carry no content.
    if (rawTag.startsWith('!') || rawTag.startsWith('/') || rawTag.startsWith('?')) {
      index = closeIndex + 1;
      continue;
    }

    const nameMatch = rawTag.match(/^([a-zA-Z][a-zA-Z0-9-]*)/);

    if (!nameMatch) {
      index = closeIndex + 1;
      continue;
    }

    const tag = nameMatch[1].toLowerCase();

    if (VOID_TAGS.has(tag) || rawTag.trimEnd().endsWith('/')) {
      tokens.push({ attrs: rawTag, inner: '', tag, type: 'element' });
      index = closeIndex + 1;
      continue;
    }

    const body = readElementBody(html, closeIndex + 1, tag);

    tokens.push({ attrs: rawTag, inner: body.inner, tag, type: 'element' });
    index = body.end;
  }

  return tokens;
}

function pushText(target: EditorInlineNode[], text: string, marks: EditorMark[]) {
  if (!text) {
    return;
  }

  const previous = target[target.length - 1];

  // Merge adjacent runs that carry identical marks so the editor does not end up
  // with a long chain of single-character text nodes.
  if (
    previous &&
    previous.type === 'text' &&
    JSON.stringify(previous.marks ?? []) === JSON.stringify(marks)
  ) {
    previous.text += text;
    return;
  }

  target.push(marks.length > 0 ? { marks, text, type: 'text' } : { text, type: 'text' });
}

function parseInline(html: string, marks: EditorMark[], depth: number): EditorInlineNode[] {
  const nodes: EditorInlineNode[] = [];

  if (depth > MAX_DEPTH) {
    pushText(nodes, decodeHtmlEntities(html.replace(/<[^>]*>/g, '')).replace(/\s+/g, ' '), marks);
    return nodes;
  }

  for (const token of tokenizeHtml(html)) {
    if (token.type === 'text') {
      pushText(nodes, decodeHtmlEntities(token.text).replace(/\s+/g, ' '), marks);
      continue;
    }

    if (IGNORED_TAGS.has(token.tag)) {
      continue;
    }

    if (token.tag === 'br') {
      nodes.push({ type: 'hardBreak' });
      continue;
    }

    if (token.tag === 'a') {
      const href = readAttribute(token.attrs, 'href');
      const linkMarks: EditorMark[] = href
        ? [...marks, { attrs: { href, target: '_blank' }, type: 'link' }]
        : marks;

      nodes.push(...parseInline(token.inner, linkMarks, depth + 1));
      continue;
    }

    const markType = INLINE_MARK_TAGS[token.tag];

    if (markType) {
      const nextMarks = marks.some((mark) => mark.type === markType)
        ? marks
        : [...marks, { type: markType }];

      nodes.push(...parseInline(token.inner, nextMarks, depth + 1));
      continue;
    }

    // Unknown inline wrapper (span, small, abbr…): keep the text, drop the tag.
    nodes.push(...parseInline(token.inner, marks, depth + 1));
  }

  return nodes;
}

function trimInlineNodes(nodes: EditorInlineNode[]) {
  const trimmed = [...nodes];

  while (trimmed.length > 0) {
    const first = trimmed[0];

    if (first.type === 'hardBreak') {
      trimmed.shift();
      continue;
    }

    const next = first.text.replace(/^\s+/, '');

    if (!next) {
      trimmed.shift();
      continue;
    }

    trimmed[0] = { ...first, text: next };
    break;
  }

  while (trimmed.length > 0) {
    const last = trimmed[trimmed.length - 1];

    if (last.type === 'hardBreak') {
      trimmed.pop();
      continue;
    }

    const next = last.text.replace(/\s+$/, '');

    if (!next) {
      trimmed.pop();
      continue;
    }

    trimmed[trimmed.length - 1] = { ...last, text: next };
    break;
  }

  return trimmed;
}

function makeParagraph(content: EditorInlineNode[]): EditorBlockNode | null {
  const trimmed = trimInlineNodes(content);

  return trimmed.length > 0 ? { content: trimmed, type: 'paragraph' } : null;
}

function parseListItems(html: string, depth: number): EditorBlockNode[] {
  const items: EditorBlockNode[] = [];

  for (const token of tokenizeHtml(html)) {
    if (token.type !== 'element' || token.tag !== 'li') {
      continue;
    }

    const content = parseBlocks(token.inner, depth + 1);

    // listItem requires at least one block child.
    items.push({
      content: content.length > 0 ? content : [{ type: 'paragraph' }],
      type: 'listItem',
    });
  }

  return items;
}

function parseBlocks(html: string, depth: number): EditorBlockNode[] {
  const blocks: EditorBlockNode[] = [];

  if (depth > MAX_DEPTH) {
    return blocks;
  }

  // Text and inline markup that appear directly between block elements are
  // collected here and flushed as a paragraph.
  let pendingInline: EditorInlineNode[] = [];

  const flushInline = () => {
    const paragraph = makeParagraph(pendingInline);

    if (paragraph) {
      blocks.push(paragraph);
    }

    pendingInline = [];
  };

  for (const token of tokenizeHtml(html)) {
    if (token.type === 'text') {
      pushText(pendingInline, decodeHtmlEntities(token.text).replace(/\s+/g, ' '), []);
      continue;
    }

    const { attrs, inner, tag } = token;

    if (IGNORED_TAGS.has(tag)) {
      continue;
    }

    const headingMatch = tag.match(/^h([1-6])$/);

    if (headingMatch) {
      flushInline();

      const content = trimInlineNodes(parseInline(inner, [], depth + 1));

      if (content.length > 0) {
        blocks.push({
          attrs: { level: Number(headingMatch[1]) },
          content,
          type: 'heading',
        });
      }

      continue;
    }

    if (tag === 'p') {
      flushInline();

      const paragraph = makeParagraph(parseInline(inner, [], depth + 1));

      if (paragraph) {
        blocks.push(paragraph);
      }

      continue;
    }

    if (tag === 'ul' || tag === 'ol') {
      flushInline();

      const items = parseListItems(inner, depth);

      if (items.length > 0) {
        blocks.push({
          content: items,
          type: tag === 'ul' ? 'bulletList' : 'orderedList',
        });
      }

      continue;
    }

    if (tag === 'blockquote') {
      flushInline();

      const content = parseBlocks(inner, depth + 1);

      if (content.length > 0) {
        blocks.push({ content, type: 'blockquote' });
      }

      continue;
    }

    if (tag === 'pre') {
      flushInline();

      const text = decodeHtmlEntities(inner.replace(/<[^>]*>/g, '')).replace(/^\n+|\n+$/g, '');

      if (text) {
        blocks.push({ content: [{ text, type: 'text' }], type: 'codeBlock' });
      }

      continue;
    }

    if (tag === 'hr') {
      flushInline();
      blocks.push({ type: 'horizontalRule' });
      continue;
    }

    if (tag === 'br') {
      pendingInline.push({ type: 'hardBreak' });
      continue;
    }

    if (TRANSPARENT_BLOCK_TAGS.has(tag) || tag === 'li' || tag === 'table') {
      flushInline();

      // Tables are flattened to their text content: the product renderer
      // supports table nodes, but reconstructing a valid table from arbitrary
      // scraped markup is far more failure-prone than keeping the copy.
      blocks.push(...parseBlocks(inner, depth + 1));
      continue;
    }

    // Anything else is inline-ish (span, a, strong, …): accumulate it.
    pendingInline.push(...parseInline(`<${attrs}>${inner}</${tag}>`, [], depth + 1));
  }

  flushInline();

  return blocks;
}

function plainTextToBlocks(value: string): EditorBlockNode[] {
  return value
    .split(/\n\s*\n/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean)
    .map((paragraph) => ({
      content: [{ text: paragraph.replace(/\s*\n\s*/g, ' '), type: 'text' as const }],
      type: 'paragraph',
    }));
}

/**
 * Build an editor document from an HTML fragment or plain text. Returns null
 * when there is no usable content, so callers can omit the field entirely
 * rather than storing an empty body.
 */
export function editorDocumentFromHtml(value: string): EditorDocument | null {
  const raw = (typeof value === 'string' ? value : '')
    .trim()
    // Models frequently wrap generated markup in a markdown fence despite being
    // told not to; unwrap it rather than rendering the backticks as copy.
    .replace(/^```(?:html|xml)?\s*\n?/i, '')
    .replace(/\n?```$/, '')
    .trim();

  if (!raw) {
    return null;
  }

  // Remove ignored elements AND their bodies up front, so the tag-stripping
  // fallback below can never surface script/style source as body copy.
  const trimmed = [...IGNORED_TAGS]
    .reduce(
      (html, tag) => html.replace(new RegExp(`<${tag}\\b[\\s\\S]*?</${tag}\\s*>`, 'gi'), ' '),
      raw
    )
    .trim();

  if (!trimmed) {
    return null;
  }

  const looksLikeHtml = /<[a-zA-Z!/]/.test(trimmed);
  const content = looksLikeHtml ? parseBlocks(trimmed, 0) : plainTextToBlocks(trimmed);

  if (content.length === 0) {
    // Markup we could not map (e.g. a bare <img>): fall back to its text so the
    // user still gets the copy.
    const fallback = plainTextToBlocks(
      decodeHtmlEntities(trimmed.replace(/<[^>]*>/g, ' ')).replace(/[ \t]+/g, ' ')
    );

    return fallback.length > 0 ? { content: fallback, type: 'doc' } : null;
  }

  return { content, type: 'doc' };
}
