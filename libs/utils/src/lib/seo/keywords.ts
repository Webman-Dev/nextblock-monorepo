import { getPhraseBlockBoundaries, tokenizeWords } from './document';
import type { KeywordStats, SeoDocument, SeoIssue } from './types';

/**
 * Focus-keyphrase analysis.
 *
 * Everything here works on the token stream rather than on the raw string, and
 * that is the single most important decision in the file. Substring matching
 * would report "cat" as present in "catalogue", "her" in "there" and "art" in
 * "start", which inflates the density of exactly the short, high-value keywords
 * authors most often choose. Matching a *sequence of whole tokens* also gets
 * multi-word keyphrases right for free: "organic dog food" is found only where
 * those three words appear consecutively, not wherever all three happen to
 * occur somewhere on the page.
 *
 * The token stream is flat, though, and the wrong assumption used to be that
 * adjacency in the array meant adjacency on the page. It does not: a document
 * that ends one paragraph with "…our coffee" and opens the next with "beans
 * are…" put those two tokens side by side, and the phrase "coffee beans" was
 * counted as occurring there, inflating the density and satisfying the
 * early-placement check on a phrase no reader could find. So every match here
 * is checked against the block boundaries `document.ts` recorded while it built
 * the stream, and a match that would straddle one is refused.
 */

/**
 * The boundary set for a token array that has no block structure of its own —
 * a heading's text, or a document built by something other than the two
 * builders in `document.ts`.
 */
const NO_BOUNDARIES: ReadonlySet<number> = new Set<number>();

/**
 * The density band the audit treats as healthy, in percent, inclusive at both
 * ends. Below the floor the page reads as off-topic to a search engine; above
 * the ceiling it reads as stuffed. These are the numbers every check and every
 * message in this file refers to, so changing the band changes it everywhere.
 */
export const KEYWORD_DENSITY_MINIMUM = 1.0;
export const KEYWORD_DENSITY_MAXIMUM = 2.5;

/** How many leading words count as "early" in the document. */
export const KEYWORD_EARLY_WINDOW = 100;

/** Rounds to two decimals, which is as precise as a percentage needs to be. */
function roundToTwoDecimals(value: number): number {
  return Math.round(value * 100) / 100;
}

/** True when `phrase` appears as a run of consecutive tokens inside `words`. */
function containsSequence(
  words: string[],
  phrase: string[],
  boundaries: ReadonlySet<number> = NO_BOUNDARIES
): boolean {
  return countSequence(words, phrase, boundaries) > 0;
}

/**
 * Counts non-overlapping occurrences of `phrase` within `words`, never across a
 * block boundary.
 *
 * Overlap is skipped on purpose: in "buy buy buy" the phrase "buy buy" occurs
 * twice by an overlapping count and once by this one. A reader perceives one
 * repetition, and an overlapping count would let a short repeated phrase drive
 * the density well past 100%, which makes the number meaningless.
 *
 * `boundaries` holds indices into `words` at which a new block starts, so a
 * candidate match is rejected as soon as one of its interior positions is a
 * boundary. Index `index` itself is never consulted: a phrase is free to *start*
 * at the first word of a block, it just may not run on into the next one.
 */
function countSequence(
  words: string[],
  phrase: string[],
  boundaries: ReadonlySet<number> = NO_BOUNDARIES
): number {
  if (phrase.length === 0 || words.length < phrase.length) {
    return 0;
  }

  let count = 0;
  let index = 0;

  while (index <= words.length - phrase.length) {
    let matched = true;
    for (let offset = 0; offset < phrase.length; offset += 1) {
      if (offset > 0 && boundaries.has(index + offset)) {
        matched = false;
        break;
      }

      if (words[index + offset] !== phrase[offset]) {
        matched = false;
        break;
      }
    }

    if (matched) {
      count += 1;
      index += phrase.length;
    } else {
      index += 1;
    }
  }

  return count;
}

/** True when any heading at one of the given levels contains the phrase. */
function anyHeadingContains(
  document: SeoDocument,
  levels: number[],
  phrase: string[]
): boolean {
  return document.headings.some(
    (heading) => levels.includes(heading.level) && containsSequence(tokenizeWords(heading.text), phrase)
  );
}

/**
 * Measures where and how often the focus keyphrase appears.
 *
 * Returns `null` when no keyphrase has been set, or when the one that was set
 * contains no word characters at all (someone typed only punctuation). `null`
 * means "there is nothing to measure", which is a different statement from a
 * zeroed `KeywordStats` meaning "we looked and found none", and the audit
 * reports the two cases with different issues.
 */
export function computeKeywordStats(document: SeoDocument, keyword: string): KeywordStats | null {
  const trimmed = typeof keyword === 'string' ? keyword.trim() : '';
  if (trimmed === '') {
    return null;
  }

  const phrase = tokenizeWords(trimmed);
  if (phrase.length === 0) {
    return null;
  }

  const totalWords = document.words.length;
  const boundaries = getPhraseBlockBoundaries(document);
  const count = countSequence(document.words, phrase, boundaries);

  return {
    count,
    // Density is measured in words, not in matches: a three-word keyphrase
    // occurring twice occupies six of the page's words, and reporting it as
    // two out of N would understate its weight by a factor of three.
    density: totalWords === 0 ? 0 : roundToTwoDecimals(((count * phrase.length) / totalWords) * 100),
    // Slicing from zero leaves every surviving index where it was, so the same
    // boundary set still describes the window.
    inFirst100Words: containsSequence(
      document.words.slice(0, KEYWORD_EARLY_WINDOW),
      phrase,
      boundaries
    ),
    inHeading1: anyHeadingContains(document, [1], phrase),
    inSubheadings: anyHeadingContains(document, [2, 3], phrase),
    keyword: trimmed,
  };
}

/**
 * Turns keyphrase statistics into findings.
 *
 * The placement checks are independent of one another and of the density check,
 * so a page can legitimately raise several of these at once — a keyphrase that
 * appears nowhere raises the low-density issue *and* all three placement
 * issues, which is the honest description of that page.
 */
export function auditKeyword(stats: KeywordStats | null): SeoIssue[] {
  if (stats === null) {
    // Not fixable: choosing what a page should rank for is the author's
    // judgement about their own business, and no rewrite can supply it.
    return [
      {
        category: 'keyword',
        detail:
          'Set a focus keyphrase to have the analysis check how well this page targets the search someone would actually type.',
        fixable: false,
        id: 'keyword-missing',
        message: 'No focus keyphrase is set for this page.',
        severity: 'info',
      },
    ];
  }

  const issues: SeoIssue[] = [];
  const { keyword } = stats;

  if (stats.density < KEYWORD_DENSITY_MINIMUM) {
    issues.push({
      category: 'keyword',
      detail: `The keyphrase accounts for ${stats.density}% of the text across ${stats.count} occurrence${stats.count === 1 ? '' : 's'}; aim for ${KEYWORD_DENSITY_MINIMUM}% to ${KEYWORD_DENSITY_MAXIMUM}%.`,
      fixable: true,
      fixPrompt: `Work the phrase "${keyword}" into the body copy a few more times where it reads naturally, until it accounts for roughly ${KEYWORD_DENSITY_MINIMUM}% to ${KEYWORD_DENSITY_MAXIMUM}% of the words. Do not repeat it mechanically or change the meaning of any sentence.`,
      id: 'keyword-density-low',
      message: 'The focus keyphrase appears too rarely.',
      severity: 'warning',
    });
  } else if (stats.density > KEYWORD_DENSITY_MAXIMUM) {
    issues.push({
      category: 'keyword',
      detail: `The keyphrase accounts for ${stats.density}% of the text across ${stats.count} occurrences; aim for ${KEYWORD_DENSITY_MINIMUM}% to ${KEYWORD_DENSITY_MAXIMUM}%.`,
      fixable: true,
      fixPrompt: `Replace some occurrences of the phrase "${keyword}" with pronouns or natural synonyms so it accounts for roughly ${KEYWORD_DENSITY_MINIMUM}% to ${KEYWORD_DENSITY_MAXIMUM}% of the words, keeping the meaning intact.`,
      id: 'keyword-density-high',
      message: 'The focus keyphrase is repeated too often.',
      severity: 'warning',
    });
  }

  if (!stats.inHeading1) {
    issues.push({
      category: 'keyword',
      detail: 'The H1 is the strongest on-page signal of what a page is about.',
      fixable: true,
      fixPrompt: `Rewrite the H1 so it contains the phrase "${keyword}" while still reading as a natural page title.`,
      id: 'keyword-not-in-h1',
      message: 'The focus keyphrase does not appear in the H1.',
      severity: 'warning',
    });
  }

  if (!stats.inSubheadings) {
    issues.push({
      category: 'keyword',
      detail: 'Repeating the keyphrase in an H2 or H3 reinforces the topic without stuffing the body copy.',
      fixable: true,
      fixPrompt: `Rewrite one of the H2 or H3 subheadings so it contains the phrase "${keyword}", keeping it accurate to the section it introduces.`,
      id: 'keyword-not-in-subheadings',
      message: 'The focus keyphrase does not appear in any subheading.',
      severity: 'info',
    });
  }

  if (!stats.inFirst100Words) {
    issues.push({
      category: 'keyword',
      detail: `Readers and crawlers both weight the opening of a page heavily, so the keyphrase should appear within the first ${KEYWORD_EARLY_WINDOW} words.`,
      fixable: true,
      fixPrompt: `Rewrite the opening paragraph so the phrase "${keyword}" appears within the first ${KEYWORD_EARLY_WINDOW} words, without padding the introduction.`,
      id: 'keyword-not-early',
      message: 'The focus keyphrase does not appear near the start of the page.',
      severity: 'warning',
    });
  }

  return issues;
}
