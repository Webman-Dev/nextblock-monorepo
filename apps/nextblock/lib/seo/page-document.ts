import {
  buildSeoDocument,
  emptySeoDocument,
  isExternalHref,
  tokenizeWords,
  type SeoDocument,
  type SeoHeading,
  type SeoHeadingLevel,
  type SeoImage,
  type SeoLink,
} from '@nextblock-cms/utils/seo';

/**
 * Flattens a page's blocks into the single `SeoDocument` the audit grades.
 *
 * The SEO engine in `@nextblock-cms/utils/seo` was written against one document
 * that represents one page, but the CMS does not store a page as one document:
 * it stores a list of block rows, each holding its own slice of content in its
 * own differently-named field, with most of a real page's copy nested two
 * levels down inside a `section` block's columns. Auditing those rows one at a
 * time is what produced the finding this module exists to retire — "this page
 * has no H1 heading" reported against a single paragraph, when the H1 was sitting
 * in a `heading` block two rows above and the auditor was never shown it.
 *
 * So this walks the whole list in document order and merges everything into one
 * document, which lets `auditSeo` answer the questions it was designed to
 * answer — is there exactly one H1, is there enough copy, where does the
 * keyphrase fall — about the page a visitor actually reads.
 *
 * Two properties are load-bearing and every change here has to preserve them:
 *
 *  - **Nothing throws.** `content` is `Json` straight out of Postgres, and the
 *    editor hands us half-typed state on every keystroke, so a field can be
 *    null, a number, an array where an object was expected, or absent. Every
 *    read below tolerates that and skips rather than reporting. An unrecognised
 *    block — a custom block, whose content shape is whatever its author defined
 *    — is skipped for the same reason: guessing at arbitrary keys would put the
 *    author's internal configuration strings into the page's word count.
 *  - **It stays linear and allocation-light.** This runs behind the analysis
 *    panel's debounce, so it is re-run every time the author pauses typing. It
 *    makes one pass over the tree, reuses the image and link objects the HTML
 *    reader already built instead of copying them, and joins the text exactly
 *    once at the end.
 *
 * One known and accepted limitation: `buildSeoDocument` records where blocks
 * divide the token stream so a multi-word keyphrase cannot be counted across a
 * gap the reader can see, and that side table is keyed on the document object
 * it built, so the merged document here does not carry one. The consequence is
 * narrow — a phrase whose words happen to straddle the join between two blocks
 * can be counted once too often — and it is the same fallback any hand-built
 * document has always had. Correcting it needs a way to register boundaries for
 * an assembled document, which is a change to the engine, not to this walker.
 */

/**
 * How deep the walk will follow nested containers before giving up.
 *
 * Sections can hold sections, so the structure is genuinely recursive and has
 * no schema-enforced ceiling. Eight levels is far past anything a human builds
 * and cheap to enforce, and it means a corrupt row that somehow refers back
 * into itself costs a bounded walk instead of a blown stack in the editor.
 */
const MAX_BLOCK_NESTING_DEPTH = 8;

/**
 * The heading level used when a `heading` block's level is missing or corrupt.
 *
 * This mirrors `HeadingBlockRenderer`, which falls back to an H2 for anything
 * outside 1-6. The audit has to grade the outline the visitor is served, and
 * defaulting to 1 instead would invent an H1 that is nowhere on the page — and
 * then report a second, entirely fictional H1 as a duplicate.
 */
const FALLBACK_HEADING_LEVEL: SeoHeadingLevel = 2;

/** The accumulating page document, before its parts are joined. */
interface PageDocumentDraft {
  headings: SeoHeading[];
  images: SeoImage[];
  links: SeoLink[];
  /**
   * Each block's text, kept apart until the end and then joined with a single
   * space. Concatenating without a separator would glue the last word of one
   * block onto the first word of the next ("…our coffee" + "beans are…" reading
   * as the single token "coffeebeans"), which corrupts the word count, the
   * keyphrase density and the readability sample all at once.
   */
  textParts: string[];
  words: string[];
}

function createDraft(): PageDocumentDraft {
  return { headings: [], images: [], links: [], textParts: [], words: [] };
}

/** Narrows to a plain object, which is the only shape a block or content has. */
function readRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

/**
 * Reads a field that is supposed to hold display text.
 *
 * Whitespace is collapsed to single spaces to match `SeoDocument.text`, which
 * the readability pass tokenises on the assumption that it already has been.
 * Anything that is not a string reads as empty rather than being coerced,
 * because `String(someObject)` would put "[object Object]" on the page.
 */
function readText(value: unknown): string {
  return typeof value === 'string' ? value.replace(/\s+/g, ' ').trim() : '';
}

/** Clamps a stored heading level onto the six levels HTML actually has. */
function readHeadingLevel(value: unknown): SeoHeadingLevel {
  const level = typeof value === 'number' ? Math.trunc(value) : Number.NaN;

  return Number.isFinite(level) && level >= 1 && level <= 6
    ? (level as SeoHeadingLevel)
    : FALLBACK_HEADING_LEVEL;
}

/** Adds a run of plain text, keeping the token stream in step with the text. */
function appendText(draft: PageDocumentDraft, text: string): void {
  if (text === '') {
    return;
  }

  draft.textParts.push(text);
  for (const word of tokenizeWords(text)) {
    draft.words.push(word);
  }
}

/**
 * Folds a document the engine already built — one rich-text block's HTML or
 * Tiptap JSON — into the page draft.
 *
 * Headings are renumbered as they land so `order` counts positions on the page
 * rather than positions within whichever block happened to contain them; the
 * audit uses that number to say where the H1 sits, and a per-block number would
 * point the author at the wrong heading.
 */
function appendDocument(draft: PageDocumentDraft, document: SeoDocument): void {
  for (const heading of document.headings) {
    draft.headings.push({ level: heading.level, order: draft.headings.length, text: heading.text });
  }

  for (const image of document.images) {
    draft.images.push(image);
  }

  for (const link of document.links) {
    draft.links.push(link);
  }

  if (document.text !== '') {
    draft.textParts.push(document.text);
  }

  // `words` is taken from the sub-document rather than re-tokenised from its
  // text: the engine guarantees the two agree, and re-tokenising would double
  // the work on the largest blocks on the page for an identical answer.
  for (const word of document.words) {
    draft.words.push(word);
  }
}

/** Adds one heading block, which is a standalone row rather than inline markup. */
function collectHeadingBlock(content: Record<string, unknown>, draft: PageDocumentDraft): void {
  // Not run through an HTML stripper, unlike a rich-text block: the renderer
  // prints `text_content` as a React child, so any markup in it is escaped and
  // the visitor sees the angle brackets. Stripping here would analyse text the
  // page never shows.
  const text = readText(content['text_content']);

  draft.headings.push({
    level: readHeadingLevel(content['level']),
    order: draft.headings.length,
    text,
  });

  // A heading is also words on the page. Leaving it out of the text would make
  // headings free of charge in the word count and invisible to the keyphrase
  // density, even though they are the most heavily weighted copy on the page.
  appendText(draft, text);
}

/**
 * Adds one image block.
 *
 * The source is resolved the way `ImageBlockRenderer` resolves it — an external
 * URL wins, otherwise the R2 object key — and a block with neither is not
 * recorded as an image at all, because that block renders a "media not
 * selected" placeholder. Reporting it would raise "an image is missing alt
 * text" about something the visitor never sees as an image, which is precisely
 * the class of false finding this module was written to remove.
 */
function collectImageBlock(content: Record<string, unknown>, draft: PageDocumentDraft): void {
  const externalUrl = readText(content['external_url']);
  const objectKey = readText(content['object_key']);
  const source = externalUrl !== '' ? externalUrl : objectKey;

  if (source === '') {
    return;
  }

  draft.images.push({ alt: readText(content['alt_text']), src: source });

  // The caption is rendered in a <figcaption> under the image, so it is prose a
  // reader and a crawler both see, and it belongs in the page's text.
  appendText(draft, readText(content['caption']));
}

/** Adds one button block: a link the visitor can follow, with a visible label. */
function collectButtonBlock(content: Record<string, unknown>, draft: PageDocumentDraft): void {
  const text = readText(content['text']);
  const href = readText(content['url']);

  if (href !== '') {
    draft.links.push({ external: isExternalHref(href), href, text });
  }

  appendText(draft, text);
}

/** Adds a testimonial's visible quote and attribution. */
function collectTestimonialBlock(
  content: Record<string, unknown>,
  draft: PageDocumentDraft
): void {
  appendText(draft, readText(content['quote']));
  appendText(draft, readText(content['author_name']));
  appendText(draft, readText(content['author_title']));
}

/**
 * Walks `column_blocks`, an array of columns each holding an array of blocks.
 *
 * Column order then block order is the order the page reads in on a phone,
 * where the columns stack, and it is the only total order that exists for this
 * shape. Getting it wrong would not lose any content, but it would misreport
 * which heading comes first and where in the copy the keyphrase falls.
 */
function collectColumnBlocks(value: unknown, draft: PageDocumentDraft, depth: number): void {
  if (!Array.isArray(value)) {
    return;
  }

  for (const column of value) {
    if (!Array.isArray(column)) {
      continue;
    }

    for (const block of column) {
      collectBlock(block, draft, depth + 1);
    }
  }
}

/**
 * Walks a section, which is where most of a real page's content lives.
 *
 * Its children are not rows in the blocks array — they are plain
 * `{ block_type, content }` objects buried in `content.column_blocks` — so a
 * walker that only looked at the top-level list would under-report almost every
 * page ever built in this CMS.
 *
 * A section in slider mode renders its slides *instead of* its columns, and
 * this mirrors that: walking both would count copy from a stale column set the
 * visitor cannot reach, and inflate the word count with it.
 */
function collectSectionBlock(
  content: Record<string, unknown>,
  draft: PageDocumentDraft,
  depth: number
): void {
  const slides = content['slides'];

  if (content['slider'] === true && Array.isArray(slides) && slides.length > 0) {
    for (const slide of slides) {
      const record = readRecord(slide);
      if (record !== null) {
        collectColumnBlocks(record['column_blocks'], draft, depth);
      }
    }

    return;
  }

  collectColumnBlocks(content['column_blocks'], draft, depth);
}

/** Dispatches one block row onto the reader that knows where its text lives. */
function collectBlock(value: unknown, draft: PageDocumentDraft, depth: number): void {
  if (depth > MAX_BLOCK_NESTING_DEPTH) {
    return;
  }

  const block = readRecord(value);
  if (block === null) {
    return;
  }

  const blockType = typeof block['block_type'] === 'string' ? block['block_type'] : '';
  const content = readRecord(block['content']);
  if (content === null) {
    return;
  }

  switch (blockType) {
    case 'text': {
      // `html_content` holds either an HTML string or a JSON-stringified Tiptap
      // document depending on when and where the block was authored.
      // `buildSeoDocument` already distinguishes the two and reads both, so
      // this delegates rather than growing a second parser that could disagree
      // with the one the block-level panel uses. `text_content` is the shape
      // some older rows still carry.
      const source = content['html_content'] ?? content['text_content'];
      appendDocument(draft, buildSeoDocument(source));

      return;
    }

    case 'heading':
      collectHeadingBlock(content, draft);

      return;

    case 'image':
      collectImageBlock(content, draft);

      return;

    case 'button':
      collectButtonBlock(content, draft);

      return;

    case 'testimonial':
      collectTestimonialBlock(content, draft);

      return;

    // The registry calls this `video_embed`; `video` is accepted alongside it
    // because that is the name the block is known by in the UI and in prompts,
    // and both carry the same optional `title`.
    case 'video':
    case 'video_embed':
      appendText(draft, readText(content['title']));

      return;

    case 'section':
      collectSectionBlock(content, draft, depth);

      return;

    // `hero` is not in the current registry, but rows created before sections
    // absorbed it still exist in live databases and still render, so their copy
    // still counts. They keep both shapes: slides and a plain column set.
    case 'hero': {
      const slides = content['slides'];
      if (Array.isArray(slides)) {
        for (const slide of slides) {
          const record = readRecord(slide);
          if (record !== null) {
            collectColumnBlocks(record['column_blocks'], draft, depth);
          }
        }
      }

      collectColumnBlocks(content['column_blocks'], draft, depth);

      return;
    }

    default:
      // Every other block type — posts grids, forms, the commerce blocks, and
      // any custom block whose content is defined by whoever built it — renders
      // from data this walker cannot read, so it contributes nothing rather
      // than contributing a guess.
      return;
  }
}

export interface BuildPageSeoDocumentOptions {
  /**
   * An explicit document title to treat as the page's top-level H1.
   *
   * Posts in NextBlock render their title in an editorial H1 wrapper on the public
   * page (`PostClientContent.tsx`) rather than storing it as a heading block inside
   * the content array. Supplying `documentTitle` with `documentType: 'post'` ensures
   * the audit sees that H1 instead of falsely reporting `headings-missing-h1`.
   */
  documentTitle?: string | null;
  /**
   * The kind of document being graded. When set to 'post' and a documentTitle is present,
   * the title is treated as the primary H1 of the document.
   */
  documentType?: 'page' | 'post';
}

/**
 * Builds one `SeoDocument` from a page's or post's block list.
 *
 * `blocks` is deliberately typed `unknown`: it comes from form state, from a
 * draft row, or straight from Supabase as `Json`, and pretending at the
 * signature that it is already an array of well-formed rows would only push the
 * validation somewhere that has less context to do it in.
 */
export function buildPageSeoDocument(
  blocks: unknown,
  options?: BuildPageSeoDocumentOptions
): SeoDocument {
  const isPostWithTitle =
    options?.documentType === 'post' &&
    typeof options?.documentTitle === 'string' &&
    options.documentTitle.trim() !== '';

  if (!Array.isArray(blocks) || blocks.length === 0) {
    if (isPostWithTitle) {
      const titleText = options!.documentTitle!.trim();
      const titleWords = tokenizeWords(titleText);
      return {
        headings: [{ level: 1, order: 0, text: titleText }],
        images: [],
        links: [],
        text: titleText,
        words: titleWords,
      };
    }
    return emptySeoDocument();
  }

  const draft = createDraft();
  for (const block of blocks) {
    collectBlock(block, draft, 0);
  }

  if (isPostWithTitle) {
    const titleText = options!.documentTitle!.trim();
    const titleWords = tokenizeWords(titleText);
    draft.headings.unshift({
      level: 1,
      order: 0,
      text: titleText,
    });
    for (let i = 1; i < draft.headings.length; i++) {
      draft.headings[i].order = i;
    }
    draft.textParts.unshift(titleText);
    draft.words.unshift(...titleWords);
  }

  return {
    headings: draft.headings,
    images: draft.images,
    links: draft.links,
    text: draft.textParts.join(' '),
    words: draft.words,
  };
}
