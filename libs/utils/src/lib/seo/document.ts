import type { SeoDocument, SeoHeading, SeoHeadingLevel, SeoImage, SeoLink } from './types';

/**
 * Normalises any of the three shapes NextBlock actually stores content in into
 * one flat `SeoDocument` the audit can reason about.
 *
 * This file exists because a `text` block's `html_content` column is not
 * reliably HTML. The editor writes a JSON-stringified Tiptap document for
 * anything authored in the Notion-style editor and a raw HTML string for
 * legacy or imported content, and the renderers all disambiguate the two with
 * the same crude test — does the trimmed value start with a brace or a bracket.
 * We reproduce that test here rather than inventing a new one, because an SEO
 * audit that disagreed with the renderer about what a block contains would be
 * scoring a page nobody can actually see.
 *
 * Everything here is regex- and string-based on purpose. `libs/utils` is a
 * published package that has to run in the browser, in a Node script and inside
 * the Next.js proxy, so there is no DOM to parse with and no HTML parser to
 * depend on. The precedent is `stripHtmlToText()` in the app's `lib/seo.ts`,
 * which decodes entities with a hand-rolled table for exactly the same reason.
 */

/** Tags whose removal must leave a word boundary behind. */
const HTML_BLOCK_TAGS = new Set([
  'address', 'article', 'aside', 'blockquote', 'br', 'canvas', 'dd', 'details',
  'dialog', 'div', 'dl', 'dt', 'fieldset', 'figcaption', 'figure', 'footer',
  'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hgroup', 'hr', 'li',
  'main', 'nav', 'noscript', 'ol', 'p', 'pre', 'section', 'summary', 'table',
  'tbody', 'td', 'tfoot', 'th', 'thead', 'tr', 'ul', 'video',
]);

/**
 * The attribute run inside a start tag, written once here and shared by every
 * scanner below so the four of them cannot drift apart.
 *
 * The obvious `[^>]*` is wrong, and was wrong here: it truncates a tag at the
 * first '>' that appears *inside* an attribute value, so
 * `<img alt="a > b" src="x.png">` was cut after `a `. The alt text then read as
 * empty, which the audit reported as a missing-alt failure that the author
 * could see was not true, and the rest of the tag survived the strip as literal
 * text, polluting the word count and the keyword density. Consuming a quoted
 * run whole fixes both. The three alternatives are mutually exclusive — a
 * position is either a quote that opens a quoted run or a character that is
 * neither a quote nor '>' — so the group is unambiguous and cannot backtrack
 * exponentially over a long attribute list.
 */
const TAG_ATTRIBUTES_SOURCE = '(?:"[^"]*"|\'[^\']*\'|[^>"\'])*';

/** Any start or end tag, with its attribute values understood. */
const HTML_TAG_PATTERN = new RegExp(
  `<\\/?([a-zA-Z][a-zA-Z0-9-]*)\\b${TAG_ATTRIBUTES_SOURCE}>`,
  'g'
);

/**
 * The pre-fix matcher, kept as a second sweep rather than deleted.
 *
 * A quote that is never closed makes the quote-aware pattern fail to find the
 * tag at all, which would leave raw markup in the word stream — a worse outcome
 * than the truncation it replaced. Running the lenient matcher afterwards means
 * malformed markup is still removed, exactly as before, while well-formed
 * markup has already been consumed by the pass above and never reaches it.
 */
const LEGACY_HTML_TAG_PATTERN = /<\/?([a-zA-Z][a-zA-Z0-9-]*)\b[^>]*>/g;

const HTML_HEADING_PATTERN = new RegExp(
  `<h([1-6])\\b${TAG_ATTRIBUTES_SOURCE}>([\\s\\S]*?)<\\/h\\1\\s*>`,
  'gi'
);

const HTML_IMAGE_PATTERN = new RegExp(`<img\\b${TAG_ATTRIBUTES_SOURCE}>`, 'gi');

const HTML_ANCHOR_PATTERN = new RegExp(
  `<a\\b(${TAG_ATTRIBUTES_SOURCE})>([\\s\\S]*?)<\\/a\\s*>`,
  'gi'
);

/**
 * Marks a block boundary inside the intermediate text both builders produce.
 *
 * NUL is used because it carries no meaning in prose, is not a `\s` character
 * (so whitespace normalisation cannot eat it), and is not a letter, number or
 * apostrophe (so `tokenizeWords` already treats it as a separator). Any NUL
 * that arrives in the input is removed before the marking pass so that content
 * can never forge a boundary.
 */
const BLOCK_BOUNDARY_SENTINEL = '\u0000';

/**
 * Named entities we decode by hand. The list is deliberately short: these are
 * the ones the editor and typical pasted content actually emit, and the numeric
 * escape hatch below covers everything else, so there is no reason to ship a
 * multi-kilobyte entity table in a package this small.
 */
const HTML_NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  apos: "'",
  gt: '>',
  lt: '<',
  nbsp: ' ',
  quot: '"',
};

/**
 * A link is "external" purely from the href's shape. We cannot compare against
 * the configured site origin because this library has no access to
 * configuration, and an audit that produced different answers in the CMS and in
 * a build script would be worse than useless.
 */
const EXTERNAL_HREF_PATTERN = /^(?:https?:\/\/|\/\/)/i;

/**
 * Word boundaries. Letters and numbers are matched by Unicode property so that
 * accented and non-Latin content tokenises correctly; both apostrophe forms are
 * kept inside words so that "don't" and the curly-quoted spelling both survive
 * as one token instead of splitting into "don" + "t" and skewing every count.
 */
const WORD_SEPARATOR_PATTERN = /[^\p{L}\p{N}'’]+/u;

export function isExternalHref(value: string): boolean {
  return EXTERNAL_HREF_PATTERN.test(value.trim());
}

function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z]+);/g, (match: string, entity: string) => {
    if (entity[0] === '#') {
      const isHex = entity[1]?.toLowerCase() === 'x';
      const codePoint = Number.parseInt(entity.slice(isHex ? 2 : 1), isHex ? 16 : 10);
      // An out-of-range code point would make String.fromCodePoint throw, and a
      // throwing SEO audit would take down whichever page is being edited, so
      // an undecodable escape is left as literal text instead.
      return Number.isFinite(codePoint) && codePoint >= 0 && codePoint <= 0x10ffff
        ? String.fromCodePoint(codePoint)
        : match;
    }

    return HTML_NAMED_ENTITIES[entity.toLowerCase()] ?? match;
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function readString(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function toHeadingLevel(value: unknown): SeoHeadingLevel {
  const level =
    typeof value === 'number' ? Math.trunc(value) : Number.parseInt(readString(value), 10);

  if (!Number.isFinite(level) || level < 1 || level > 6) {
    // Tiptap's heading extension defaults to level 1 when the attribute is
    // missing, and a corrupt level is better reported as an H1 (which the audit
    // will then flag as a duplicate) than silently dropped from the outline.
    return 1;
  }

  return level as SeoHeadingLevel;
}

/** Splits text into the lowercased tokens every word-based metric counts. */
export function tokenizeWords(value: string): string[] {
  if (typeof value !== 'string' || value === '') {
    return [];
  }

  return (
    value
      .toLowerCase()
      .split(WORD_SEPARATOR_PATTERN)
      // Curly apostrophes are folded to straight ones so a keyphrase typed with
      // one form still matches content authored with the other, and edge
      // apostrophes are trimmed so a quoted word tokenises like a bare one.
      // Internal apostrophes are untouched, because "don't" is one word.
      .map((token) => token.replace(/’/g, "'").replace(/^'+|'+$/g, ''))
      .filter((token) => token.length > 0)
  );
}

/** A document with nothing in it. A fresh object each call, never a shared const. */
export function emptySeoDocument(): SeoDocument {
  return { headings: [], images: [], links: [], text: '', words: [] };
}

/** Returned for any document whose block structure we do not know. */
const NO_BLOCK_BOUNDARIES: ReadonlySet<number> = new Set<number>();

/**
 * Word indices at which one block ends and the next begins, per document.
 *
 * Of the two ways to give the token stream boundaries, this is the one that
 * could be made correct: a sentinel token inside `document.words` would have
 * changed the word count, the density denominator and the first-100-words
 * window at once, because `audit.ts` reads `document.words.length` directly as
 * the page's word count. So `words` stays exactly what it has always been —
 * every token is a real word — and the block structure lives beside it in this
 * side table, which is the "separate boundary-aware structure" option.
 *
 * A `WeakMap` rather than a field on `SeoDocument` because `SeoDocument` is the
 * published data contract in `types.ts` and this is an implementation detail of
 * the two builders in this file. A document that was hand-built, cloned or
 * round-tripped through JSON is simply absent from the map and falls back to
 * "no boundaries", which is the behaviour that shipped, so nothing that works
 * today can start failing because the structure went missing.
 */
const PHRASE_BLOCK_BOUNDARIES = new WeakMap<SeoDocument, ReadonlySet<number>>();

/**
 * The positions in `document.words` that a multi-word phrase may not straddle.
 *
 * An index is in the set when the word at that index opens a new block, so a
 * phrase match starting at `i` and spanning `n` tokens crosses a boundary when
 * any of `i+1 … i+n-1` is present. Without this, a document that ends one
 * paragraph with "…our coffee" and opens the next with "beans are…" counted an
 * occurrence of "coffee beans" that no reader would ever see.
 */
export function getPhraseBlockBoundaries(document: SeoDocument): ReadonlySet<number> {
  return PHRASE_BLOCK_BOUNDARIES.get(document) ?? NO_BLOCK_BOUNDARIES;
}

/** Drops the boundary markers, leaving the plain text a caller expects. */
function toPlainText(marked: string): string {
  return normalizeWhitespace(marked.split(BLOCK_BOUNDARY_SENTINEL).join(' '));
}

/**
 * Reads sentinel-marked text into the three things a `SeoDocument` needs from
 * it: the plain text, the token stream, and where the blocks divide it.
 *
 * Tokenising each block separately and concatenating produces exactly the array
 * `tokenizeWords(text)` would have produced, because the sentinel is a token
 * separator either way — which is what keeps the word count, the density
 * denominator and the early-placement window at the numbers they were before.
 */
function readMarkedText(marked: string): {
  boundaries: ReadonlySet<number>;
  text: string;
  words: string[];
} {
  const boundaries = new Set<number>();
  const words: string[] = [];

  for (const segment of marked.split(BLOCK_BOUNDARY_SENTINEL)) {
    const segmentWords = tokenizeWords(segment);
    if (segmentWords.length === 0) {
      continue;
    }

    // Only a gap with words on both sides is a boundary a phrase could cross.
    // Recording index 0, or recording one index twice for the run of sentinels
    // that nested containers emit, would describe nothing.
    if (words.length > 0) {
      boundaries.add(words.length);
    }

    for (const word of segmentWords) {
      words.push(word);
    }
  }

  return { boundaries, text: toPlainText(marked), words };
}

/** Assembles a document and registers its block structure in the side table. */
function toSeoDocument(parts: {
  boundaries: ReadonlySet<number>;
  headings: SeoHeading[];
  images: SeoImage[];
  links: SeoLink[];
  text: string;
  words: string[];
}): SeoDocument {
  const document: SeoDocument = {
    headings: parts.headings,
    images: parts.images,
    links: parts.links,
    text: parts.text,
    words: parts.words,
  };

  PHRASE_BLOCK_BOUNDARIES.set(document, parts.boundaries);

  return document;
}

interface ExtractionState {
  headings: SeoHeading[];
  images: SeoImage[];
  links: SeoLink[];
  /**
   * Text fragments in document order, joined with the empty string at the end.
   * Tiptap splits a styled run into several adjacent text nodes, so joining
   * with a space would turn a bolded "cat" followed by "s" into "cat s"; block
   * boundaries push an explicit `BLOCK_BOUNDARY_SENTINEL` of their own instead,
   * which both separates the words and records where the block divided them.
   */
  parts: string[];
  /**
   * The href of the link run currently being accumulated, so a link whose label
   * is split across several text nodes by inline marks is reported as one link
   * rather than as one link per fragment.
   */
  pendingLinkHref: string | null;
  pendingLinkIndex: number;
}

function createExtractionState(): ExtractionState {
  return {
    headings: [],
    images: [],
    links: [],
    parts: [],
    pendingLinkHref: null,
    pendingLinkIndex: -1,
  };
}

function finishDocument(state: ExtractionState): SeoDocument {
  const { boundaries, text, words } = readMarkedText(state.parts.join(''));

  return toSeoDocument({
    boundaries,
    headings: state.headings,
    images: state.images,
    links: state.links,
    text,
    words,
  });
}

function readTiptapLinkHref(marks: unknown): string | null {
  if (!Array.isArray(marks)) {
    return null;
  }

  for (const mark of marks) {
    if (!isRecord(mark) || mark['type'] !== 'link') {
      continue;
    }

    const attrs = isRecord(mark['attrs']) ? mark['attrs'] : {};
    const href = readString(attrs['href']).trim();
    if (href !== '') {
      return href;
    }
  }

  return null;
}

function walkTiptapNodes(content: unknown, state: ExtractionState): void {
  if (!Array.isArray(content)) {
    return;
  }

  for (const child of content) {
    walkTiptapNode(child, state);
  }
}

function walkTiptapNode(node: unknown, state: ExtractionState): void {
  if (!isRecord(node)) {
    return;
  }

  const type = readString(node['type']);

  if (type === 'text') {
    const text = readString(node['text']);
    const href = readTiptapLinkHref(node['marks']);

    if (href === null) {
      state.pendingLinkHref = null;
    } else if (state.pendingLinkHref === href && state.pendingLinkIndex >= 0) {
      state.links[state.pendingLinkIndex].text += text;
    } else {
      state.pendingLinkIndex = state.links.length;
      state.pendingLinkHref = href;
      state.links.push({ external: isExternalHref(href), href, text });
    }

    if (text !== '') {
      state.parts.push(text);
    }

    return;
  }

  // Any node that is not a text node terminates the current link run: two link
  // fragments separated by an image or a paragraph break are two links.
  state.pendingLinkHref = null;

  if (type === 'image') {
    const attrs = isRecord(node['attrs']) ? node['attrs'] : {};
    state.images.push({ alt: readString(attrs['alt']), src: readString(attrs['src']) });
    return;
  }

  if (type === 'heading') {
    const attrs = isRecord(node['attrs']) ? node['attrs'] : {};
    const level = toHeadingLevel(attrs['level']);
    // Remember where this heading's text starts so it can be sliced back out
    // once the children have been walked. Walking normally, rather than
    // collecting the text with a second recursive pass, means a link or an
    // image nested inside a heading is still extracted exactly once.
    const start = state.parts.length;
    walkTiptapNodes(node['content'], state);
    // A container nested inside a heading will have pushed a sentinel of its
    // own, and a heading's reported text is plain text, so they are dropped.
    const text = toPlainText(state.parts.slice(start).join(''));
    state.headings.push({ level, order: state.headings.length, text });
    state.parts.push(BLOCK_BOUNDARY_SENTINEL);
    return;
  }

  walkTiptapNodes(node['content'], state);
  // Every container node gets a trailing boundary. Over-separating costs
  // nothing, because consecutive sentinels collapse to one boundary and the
  // final join is whitespace-normalised, whereas under-separating silently
  // glues the last word of one paragraph to the first of the next.
  state.parts.push(BLOCK_BOUNDARY_SENTINEL);
}

function buildFromTiptap(root: unknown): SeoDocument {
  const state = createExtractionState();

  if (Array.isArray(root)) {
    walkTiptapNodes(root, state);
  } else {
    walkTiptapNode(root, state);
  }

  return finishDocument(state);
}

/**
 * Reads one attribute out of a raw tag string.
 *
 * The leading alternation on start-of-string or whitespace is load-bearing: a
 * plain word boundary would make a lookup for `src` also match `data-src`,
 * because a hyphen is a non-word character. Values may be double-quoted,
 * single-quoted or bare, and may appear in any order within the tag.
 */
function readHtmlAttribute(tag: string, name: string): string {
  const pattern = new RegExp(
    `(?:^|\\s)${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'=<>]+))`,
    'i'
  );
  const match = pattern.exec(tag);
  if (match === null) {
    return '';
  }

  return decodeHtmlEntities(match[1] ?? match[2] ?? match[3] ?? '');
}

/**
 * Flattens HTML to plain text.
 *
 * Block-level tags are replaced with a space and inline tags with nothing. That
 * asymmetry is the whole point of the function: replacing every tag with a
 * space would turn a bolded "cat" followed by "s" into "cat s", while replacing
 * every tag with nothing would turn a paragraph boundary into a word-gluing
 * join — "the end.The next" — which corrupts the word count, the keyword match
 * and the sentence split all at once.
 */
function stripHtml(html: string, blockReplacement: string): string {
  const withoutInvisible = html
    // A sentinel that arrived in the content would forge a block boundary, so
    // it is removed before any boundary of ours is written.
    .split(BLOCK_BOUNDARY_SENTINEL)
    .join(' ')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<![^>]*>/g, ' ');

  const replaceTag = (_match: string, rawName: string): string =>
    HTML_BLOCK_TAGS.has(rawName.toLowerCase()) ? blockReplacement : '';

  const withoutTags = withoutInvisible
    .replace(HTML_TAG_PATTERN, replaceTag)
    .replace(LEGACY_HTML_TAG_PATTERN, replaceTag);

  return decodeHtmlEntities(withoutTags);
}

export function stripHtmlToSeoText(html: string): string {
  return normalizeWhitespace(stripHtml(html, ' '));
}

function buildFromHtml(html: string): SeoDocument {
  const headings: SeoHeading[] = [];
  const images: SeoImage[] = [];
  const links: SeoLink[] = [];

  for (const match of html.matchAll(HTML_HEADING_PATTERN)) {
    headings.push({
      level: toHeadingLevel(match[1]),
      order: headings.length,
      // An empty heading is a genuine defect, so a whitespace-only <h2></h2>
      // must survive extraction with text '' rather than being filtered away.
      text: stripHtmlToSeoText(match[2] ?? ''),
    });
  }

  for (const match of html.matchAll(HTML_IMAGE_PATTERN)) {
    const tag = match[0];
    images.push({ alt: readHtmlAttribute(tag, 'alt'), src: readHtmlAttribute(tag, 'src') });
  }

  for (const match of html.matchAll(HTML_ANCHOR_PATTERN)) {
    const href = readHtmlAttribute(match[1] ?? '', 'href').trim();
    // A bare <a name="..."> anchor has nothing for the audit to say about it.
    if (href === '') {
      continue;
    }

    links.push({ external: isExternalHref(href), href, text: stripHtmlToSeoText(match[2] ?? '') });
  }

  // The same tags that already force a word break are the ones that divide the
  // token stream into blocks, so the two notions cannot drift apart.
  const { boundaries, text, words } = readMarkedText(stripHtml(html, BLOCK_BOUNDARY_SENTINEL));

  return toSeoDocument({ boundaries, headings, images, links, text, words });
}

function tryParseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return undefined;
  }
}

/**
 * Builds a `SeoDocument` from an HTML string, a JSON-stringified Tiptap
 * document, or an already-parsed Tiptap node tree. Anything else — a number,
 * `null`, a Date — yields an empty document rather than throwing, because this
 * runs while the author is typing and must never be able to break the editor.
 */
export function buildSeoDocument(input: unknown): SeoDocument {
  if (typeof input === 'string') {
    const trimmed = input.trim();
    if (trimmed === '') {
      return emptySeoDocument();
    }

    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      const parsed = tryParseJson(trimmed);
      if (parsed !== undefined) {
        return buildFromTiptap(parsed);
      }
      // A string that merely starts with a brace but does not parse is far more
      // likely to be malformed HTML than malformed Tiptap, so fall through to
      // the HTML reader rather than throwing away the content entirely.
    }

    return buildFromHtml(input);
  }

  if (Array.isArray(input) || isRecord(input)) {
    return buildFromTiptap(input);
  }

  return emptySeoDocument();
}
