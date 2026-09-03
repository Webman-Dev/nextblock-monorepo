/**
 * Turns an SEO finding into the two strings the Cortex AI rewrite endpoint takes.
 *
 * The audit panel that calls this is a React component with a network call, a
 * debounce and a Tiptap instance in it, and this repository has no DOM test
 * environment (`@testing-library/react` is deliberately not a dependency), so
 * the panel itself cannot be exercised by a test. Everything in it that can get
 * the *content* of a request wrong therefore lives here instead, as ordinary
 * functions over plain data: which issues may offer a Fix button at all, what
 * instruction the model is given, and what it is told about the surrounding
 * document. What is left in the component is wiring — state, fetch, insertion —
 * which fails loudly in the browser rather than silently producing a bad prompt.
 *
 * The hard constraint this module exists to honour is the request schema on
 * `POST /api/ai/generate-blocks`, which is a `z.strictObject`:
 *
 *   { context?: string (max 2000); prompt: string (min 3, max 4000) }
 *
 * Strict means an unrecognised key is a 400 with no useful message, and the
 * length caps are enforced server-side, so both strings are clamped here rather
 * than hoped about at the call site. Every limit below mirrors that schema; if
 * the route's schema ever changes, these constants change with it.
 */

import type { SeoIssue } from '@nextblock-cms/utils/seo';

/** Mirrors `context: z.string().max(2000)` on the generate-blocks schema. */
export const SEO_FIX_CONTEXT_MAX_LENGTH = 2000;

/** Mirrors `prompt: z.string().max(4000)` on the generate-blocks schema. */
export const SEO_FIX_PROMPT_MAX_LENGTH = 4000;

/** Mirrors `prompt: z.string().min(3)` on the generate-blocks schema. */
export const SEO_FIX_PROMPT_MIN_LENGTH = 3;

/**
 * How much of the document body to quote back to the model.
 *
 * Sized so the quoted body plus the framing lines around it still fit inside
 * `SEO_FIX_CONTEXT_MAX_LENGTH` without the final clamp having to bite, because
 * a clamp that lands in the *middle* of the assembled context would cut the
 * trailing sections off entirely and leave the model reading a truncated
 * excerpt as if it were the whole page.
 */
export const SEO_FIX_CONTEXT_BODY_BUDGET = 1200;

/** How much of the author's selection to quote when fixing a selected passage. */
export const SEO_FIX_CONTEXT_SELECTION_BUDGET = 600;

/**
 * Where the rewritten fragment is going to land, which changes what the model
 * should produce: a whole document, a replacement for the highlighted passage,
 * or a continuation appended after everything that already exists.
 *
 * The three values match the branches the editor's own prompt bar already uses
 * (`buildAiEditorContext` in `libs/editor/src/lib/NotionEditor.tsx`), so a
 * one-click fix and a hand-typed prompt are framed to the model identically.
 */
export type SeoFixInsertionMode =
  | 'append-to-end'
  | 'replace-empty-document'
  | 'replace-selection';

export interface SeoFixContextInput {
  /** Plain text of the document being audited, used to ground the rewrite. */
  documentText: string;
  /** Headings in document order, already formatted as e.g. `H2 Ingredients`. */
  headingOutline?: string[];
  insertionMode: SeoFixInsertionMode;
  /** The text the author had highlighted, when the fix targets a selection. */
  selectedText?: string | null;
  /** Word count from the audit, so the model is told the real number. */
  wordCount?: number | null;
}

export interface SeoFixPromptInput {
  issue: SeoIssue;
  /** The focus keyphrase, when one is set; blank and `null` are equivalent. */
  keyword?: string | null;
  /** Word count from the audit, quoted for the findings that are about length. */
  wordCount?: number | null;
}

/**
 * Cuts a string to `limit` characters without ever exceeding it.
 *
 * Deliberately a hard slice rather than a word-boundary trim: the caps are a
 * server-side validation boundary, and "nearly 2000" is a rejected request. A
 * ragged final word costs the model nothing; a 400 costs the author their click.
 */
function clampLength(value: string, limit: number): string {
  return value.length <= limit ? value : value.slice(0, limit);
}

/**
 * Whether the "Fix with Cortex AI" button should appear for this finding.
 *
 * Two conditions, and both matter. `fixable` is the audit engine's own verdict,
 * and it says no to more than you might expect: a missing H1 and a missing
 * keyphrase are unfixable because choosing them is an editorial decision, and
 * missing image alt text is unfixable *here* because describing pixels needs the
 * vision-backed generator in the media library rather than a prose rewrite. A
 * non-empty `fixPrompt` is then required because it is the entire instruction
 * handed to the model — an issue marked fixable without one would send a prompt
 * assembled from nothing but the problem statement, and the model would answer
 * by restating the problem instead of repairing it.
 */
export function canFixIssueWithCortexAi(issue: SeoIssue): boolean {
  return issue.fixable && typeof issue.fixPrompt === 'string' && issue.fixPrompt.trim() !== '';
}

/**
 * Builds the `prompt` field: the audit's own repair instruction, plus the
 * concrete numbers behind the finding, plus the output contract.
 *
 * The numbers come from `issue.detail`, which every auditor writes as a sentence
 * that already contains them ("This page has 118 words; 300 or more…"), so
 * quoting it verbatim keeps the figure on screen and the figure in the request
 * from ever drifting apart. Restating the message alongside the instruction is
 * not redundancy: `fixPrompt` is phrased as a bare command, and a model told
 * only "shorten the longest sentences" has no idea by how much.
 *
 * The output contract at the end exists because the response is inserted
 * straight into a Tiptap document. A model that answered with a markdown code
 * fence, a preamble, or a full HTML document would have all of that rendered as
 * literal content in the page the author is editing.
 */
export function buildSeoFixPrompt(input: SeoFixPromptInput): string {
  const { issue, keyword, wordCount } = input;
  const instruction = (issue.fixPrompt ?? '').trim();
  const trimmedKeyword = (keyword ?? '').trim();

  const lines: Array<string | null> = [
    instruction,
    '',
    `The SEO audit reported: ${issue.message}${issue.detail ? ` ${issue.detail}` : ''}`,
    trimmedKeyword === '' ? null : `The focus keyphrase for this page is "${trimmedKeyword}".`,
    typeof wordCount === 'number' && Number.isFinite(wordCount)
      ? `The document currently runs to ${wordCount} words.`
      : null,
    '',
    'Return only the corrected content as an HTML fragment using semantic tags such as <h2>, <p>, <ul> and <li>. Do not wrap it in a code fence, do not add commentary, and do not emit <html>, <head> or <body>.',
  ];

  const prompt = lines
    .filter((line): line is string => line !== null)
    .join('\n')
    .trim();

  return clampLength(prompt, SEO_FIX_PROMPT_MAX_LENGTH);
}

/**
 * Builds the `context` field: what the model needs to know about the document
 * it is editing, framed by where its answer is going to be inserted.
 *
 * This mirrors `buildAiEditorContext` in the editor's prompt bar on purpose.
 * Both feed the same endpoint, and a fix that described the document
 * differently from a hand-typed prompt would get systematically different
 * output from the same model for no reason an author could see.
 *
 * The body excerpt is taken from the *end* of the document when appending and
 * from the *start* otherwise, because those are the parts adjacent to where the
 * answer lands: a continuation needs to know what it is continuing, while a
 * rewrite anchored at the top is best grounded by the opening.
 */
export function buildSeoFixContext(input: SeoFixContextInput): string {
  const { documentText, headingOutline, insertionMode, selectedText, wordCount } = input;

  // An empty document has no context worth sending, and saying so is more
  // useful to the model than an excerpt of nothing followed by an outline of
  // nothing. This matches the editor's own early return for the same case.
  if (insertionMode === 'replace-empty-document') {
    return 'Insertion target: empty editor. Create the initial content for this document.';
  }

  const body = (documentText ?? '').trim();
  const selection = (selectedText ?? '').trim();
  const excerpt =
    insertionMode === 'append-to-end'
      ? body.slice(-SEO_FIX_CONTEXT_BODY_BUDGET)
      : body.slice(0, SEO_FIX_CONTEXT_BODY_BUDGET);

  const parts: Array<string | null> = [
    `Insertion target: ${insertionMode}.`,
    insertionMode === 'append-to-end'
      ? 'Continue after the existing content. Do not repeat existing headings, paragraphs, or lists unless the fix explicitly calls for a rewrite.'
      : 'Replace only the selected content. Keep the surrounding editor content in mind for continuity.',
    typeof wordCount === 'number' && Number.isFinite(wordCount)
      ? `The document has ${wordCount} words.`
      : null,
    headingOutline && headingOutline.length > 0
      ? `Heading outline:\n${headingOutline.join('\n')}`
      : null,
    selection === ''
      ? null
      : `Selected text:\n${selection.slice(0, SEO_FIX_CONTEXT_SELECTION_BUDGET)}`,
    excerpt === '' ? null : `Existing editor text:\n${excerpt}`,
  ];

  const context = parts.filter((part): part is string => part !== null).join('\n\n');

  return clampLength(context, SEO_FIX_CONTEXT_MAX_LENGTH);
}
