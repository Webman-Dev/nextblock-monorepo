/**
 * Shared vocabulary for the deterministic SEO audit engine.
 *
 * Every type in this file is a pure data contract: no behaviour, no imports, no
 * runtime cost. The audit engine, the CMS analysis panel, the Cortex AI "fix
 * this" flow and the public-facing sitemap/robots tooling all speak in these
 * shapes, so the file is deliberately kept free of anything that could drag a
 * dependency (React, Zod, Supabase types) into a library that has to run in the
 * browser, in Node and inside the Next.js proxy alike.
 *
 * Keys are written alphabetically throughout, matching the house convention, so
 * that a reviewer can diff two versions of an interface without re-reading it.
 */

/** The six levels an HTML document may use for a section heading. */
export type SeoHeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

/**
 * One heading pulled out of the analysed document.
 *
 * `order` is the zero-based position of this heading among *all* headings in
 * document order. It exists because the audit needs to answer questions like
 * "is the H1 the first heading on the page?" long after the original document
 * structure has been discarded, and because an issue's `detail` string wants to
 * cite a position the author can actually find.
 *
 * `text` is the flattened, entity-decoded plain text of the heading, which may
 * legitimately be the empty string: an empty heading is a real SEO defect and
 * therefore has to survive extraction so the audit can flag it.
 */
export interface SeoHeading {
  level: SeoHeadingLevel;
  order: number;
  text: string;
}

/**
 * One image reference. `alt` is the empty string when the attribute is absent
 * or blank — the audit treats "no alt attribute" and "alt=''" identically,
 * because from a screen reader's perspective a blank alt on a content image is
 * the same failure either way.
 */
export interface SeoImage {
  alt: string;
  src: string;
}

/**
 * One hyperlink. `external` is decided purely from the href's shape (an
 * absolute http/https URL or a protocol-relative `//host/path`), never by
 * comparing against a configured site origin, because this library has no
 * access to configuration and must produce the same answer everywhere.
 */
export interface SeoLink {
  external: boolean;
  href: string;
  text: string;
}

/**
 * The normalised, format-agnostic view of a piece of content.
 *
 * `buildSeoDocument` produces this from an HTML string, a JSON-stringified
 * Tiptap document or an already-parsed Tiptap node tree, so every downstream
 * check can be written once against a single shape rather than being forked per
 * storage format.
 *
 * `text` is whitespace-normalised to single spaces; `words` is the lowercased
 * token stream derived from it. Both are precomputed because the readability
 * pass, the keyword pass and the content-length check would otherwise each
 * re-tokenise the same string.
 */
export interface SeoDocument {
  headings: SeoHeading[];
  images: SeoImage[];
  links: SeoLink[];
  text: string;
  words: string[];
}

/** Which part of the audit produced an issue; used to group the UI checklist. */
export type SeoIssueCategory =
  | 'content'
  | 'headings'
  | 'images'
  | 'keyword'
  | 'meta'
  | 'readability';

/**
 * How loudly to complain. `error` means the page is materially damaged for
 * search, `warning` means it is measurably worse than it should be, and `info`
 * is advisory — a nudge the author is free to ignore.
 */
export type SeoIssueSeverity = 'error' | 'info' | 'warning';

/**
 * A single finding. `id` is a stable machine identifier (never localised, never
 * renamed once shipped) so the UI can key on it, tests can assert on it, and
 * the scoring table can tie a weighted check to the exact issue that fails it.
 */
export interface SeoIssue {
  category: SeoIssueCategory;
  detail?: string;
  /** True when "Fix with Cortex AI" can plausibly repair this in-place. */
  fixable: boolean;
  /** Instruction fragment handed to the AI rewrite when the user clicks Fix. */
  fixPrompt?: string;
  id: string;
  message: string;
  severity: SeoIssueSeverity;
}

/**
 * One row of the scoring checklist.
 *
 * A check is always derived from the issue list rather than recomputed from the
 * document, which is what guarantees that the number the user sees and the list
 * of problems the user reads can never contradict one another.
 */
export interface SeoCheck {
  id: string;
  label: string;
  passed: boolean;
  weight: number;
}

/**
 * Flesch Reading Ease output plus the raw counts it was derived from, so the UI
 * can explain *why* a score is what it is instead of showing a bare number.
 */
export interface ReadabilityStats {
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  fleschReadingEase: number;
  grade: string;
  sentenceCount: number;
  syllableCount: number;
  wordCount: number;
}

/** Where and how often the focus keyphrase appears in the analysed document. */
export interface KeywordStats {
  count: number;
  density: number;
  inFirst100Words: boolean;
  inHeading1: boolean;
  inSubheadings: boolean;
  keyword: string;
}

/** Coarse bucket for the numeric score, used to pick a colour and a headline. */
export type SeoScoreBand = 'excellent' | 'fair' | 'good' | 'poor';

/** The complete result of one audit run. */
export interface SeoAuditResult {
  checks: SeoCheck[];
  headings: SeoHeading[];
  issues: SeoIssue[];
  keyword: KeywordStats | null;
  readability: ReadabilityStats;
  score: number;
  scoreBand: SeoScoreBand;
}

/**
 * How much of the page the caller is handing to the audit.
 *
 * `'page'` means "this document is the whole page", which is what every check
 * in the engine was written against. `'block'` means "this document is one
 * fragment of a larger page", and it exists because the CMS mounts an analysis
 * panel inside a single rich-text block: grading that fragment as though it
 * were the page produced findings no author could ever act on — "this page has
 * no H1" on a paragraph that sits under an H1 stored in a *different* block,
 * and "fewer than 300 words" on a paragraph that was never meant to carry the
 * page's whole word budget. Neither is a property a block can have, so at block
 * scope those checks are not merely passed, they are not run.
 */
export type SeoAuditScope = 'block' | 'page';

/**
 * Everything the audit needs.
 *
 * `metaTitle` and `metaDescription` distinguish `undefined` from `null` on
 * purpose: `undefined` means "this caller is not auditing metadata at all", and
 * the meta checks are then left out of the score entirely, whereas `null` or an
 * empty string means "there is a metadata field here and the author left it
 * blank", which is a finding.
 *
 * `scope` defaults to `'page'` when omitted, so every caller written before the
 * scope existed keeps the behaviour it already had.
 */
export interface SeoAuditInput {
  document: SeoDocument;
  keyword?: string | null;
  metaDescription?: string | null;
  metaTitle?: string | null;
  scope?: SeoAuditScope;
}
