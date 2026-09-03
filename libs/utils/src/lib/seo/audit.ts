import { auditHeadings } from './headings';
import { auditKeyword, computeKeywordStats } from './keywords';
import { computeReadability } from './readability';
import type {
  SeoAuditInput,
  SeoAuditResult,
  SeoAuditScope,
  SeoCheck,
  SeoIssue,
  SeoIssueSeverity,
  SeoScoreBand,
} from './types';

/**
 * The composed, deterministic SEO audit.
 *
 * The design rule that shapes this whole file: **the score is derived from the
 * issue list, never computed alongside it.** A weighted check is nothing more
 * than "did any of these issue ids get raised", so it is structurally
 * impossible for the badge to say 92 while the checklist shows a failure, or
 * for a checklist row to go green while its issue is still on screen. Anyone
 * adding a check must add it to `SCORING_RULES` referencing an issue id that
 * some auditor actually emits; there is nowhere else to put the logic.
 *
 * The second rule: a check that cannot possibly fail is left out of the
 * denominator rather than counted as a free pass. A page with no images does
 * not earn the alt-text points, a page with no focus keyphrase is not scored on
 * keyphrase placement, and a caller that does not pass metadata is not scored
 * on metadata. Handing out points for work nobody did would make an empty page
 * outscore a real one.
 *
 * The third rule follows from the second: a check that is not *about* the thing
 * being audited is also left out. `input.scope` says whether the document is a
 * whole page or one block of one, and at block scope every finding that
 * describes a property only a page can have is dropped from the issue list and
 * its row is dropped from the scoring table at the same time, from the same
 * list of issue ids — so the two can never disagree about what was assessed.
 */

/** Below this many words a page is too thin to rank for anything competitive. */
export const SEO_CONTENT_MINIMUM_WORDS = 300;

/** Flesch Reading Ease below this is reported as an error rather than a warning. */
export const SEO_READABILITY_ERROR_THRESHOLD = 30;

/** Flesch Reading Ease below this is reported as a warning. */
export const SEO_READABILITY_WARNING_THRESHOLD = 50;

/** Average words per sentence above which prose reads as heavy. */
export const SEO_SENTENCE_LENGTH_MAXIMUM = 25;

/** Google truncates a title around this length in the desktop SERP. */
export const SEO_META_TITLE_MAX_LENGTH = 60;

/** Google truncates a description around this length in the desktop SERP. */
export const SEO_META_DESCRIPTION_MAX_LENGTH = 160;

/** Shorter than this and the description wastes the space the SERP gives it. */
export const SEO_META_DESCRIPTION_MIN_LENGTH = 70;

/**
 * One row of the scoring table.
 *
 * `failingIssueIds` is the entire definition of the check: the row passes when
 * none of those ids appear in the issue list. Weights are chosen so that the
 * full table — every optional row included — sums to exactly 100, which makes
 * the raw weights readable as percentage points when reviewing this table.
 */
interface ScoringRule {
  failingIssueIds: string[];
  id: string;
  label: string;
  weight: number;
}

/** Ordering used to bring the most serious findings to the top of the list. */
const SEVERITY_RANK: Record<SeoIssueSeverity, number> = { error: 0, warning: 1, info: 2 };

/**
 * The findings that only mean something when the whole page is in view.
 *
 * Everything here answers a question about the document as a whole — is there
 * exactly one H1, does the H1 lead, is there enough copy, is the keyphrase
 * placed and dosed across the page, is the metadata written — and none of it is
 * a property a single block can have or fix. A rich-text block that is one
 * paragraph long is not "missing an H1"; the page it sits in either has one or
 * does not, which is a judgement only the page-level panel can make.
 *
 * What is deliberately *not* here is just as important. Readability, blank alt
 * text and an internally skipped heading level (H2 followed by H4 inside this
 * block's own run of headings) are all defects of the fragment itself, so they
 * survive at block scope and keep their weight in the block's score.
 *
 * This one set drives both halves of the suppression: the issue filter reads it
 * directly, and `appliesAtScope` derives the scoring table from it, so a check
 * can never be silently passed because its issues were filtered out from under
 * it.
 */
const PAGE_SCOPE_ONLY_ISSUE_IDS: ReadonlySet<string> = new Set([
  'content-thin',
  'headings-h1-not-first',
  'headings-missing-h1',
  'headings-multiple-h1',
  'keyword-density-high',
  'keyword-density-low',
  'keyword-missing',
  'keyword-not-early',
  'keyword-not-in-h1',
  'keyword-not-in-subheadings',
  'meta-description-missing',
  'meta-description-too-long',
  'meta-description-too-short',
  'meta-title-missing',
  'meta-title-too-long',
]);

/** True when a finding is worth reporting for the part of the page in hand. */
function isIssueInScope(issue: SeoIssue, scope: SeoAuditScope): boolean {
  return scope === 'page' || !PAGE_SCOPE_ONLY_ISSUE_IDS.has(issue.id);
}

/**
 * True when a scoring row still has something to fail on at this scope.
 *
 * Derived from `PAGE_SCOPE_ONLY_ISSUE_IDS` rather than from a second
 * hand-written list of row ids, because two lists drift and this one cannot: a
 * row whose every failing issue has been suppressed can no longer be failed, so
 * keeping it would hand the block free points for a check that never ran, which
 * is exactly what the "no free passes" rule at the top of this file forbids.
 */
function appliesAtScope(rule: ScoringRule, scope: SeoAuditScope): boolean {
  return (
    scope === 'page' ||
    rule.failingIssueIds.some((issueId) => !PAGE_SCOPE_ONLY_ISSUE_IDS.has(issueId))
  );
}

/**
 * A sentence the UI can put under the score so the number is not mistaken for a
 * verdict on the whole page. The block-scope wording names the checks that were
 * deliberately left out, because "82" with no explanation invites exactly the
 * bug report this scope was introduced to answer.
 */
export function describeSeoAuditScope(scope: SeoAuditScope): string {
  return scope === 'block'
    ? 'Scoring this block on its own. Checks that belong to the whole page — the H1 outline, total word count, keyphrase placement and metadata — are graded in the page analysis instead.'
    : 'Scoring the whole page: every block together, plus the page metadata.';
}

/** Maps a 0-100 score onto the band the UI colours and headlines from. */
export function toScoreBand(score: number): SeoScoreBand {
  if (score >= 90) return 'excellent';
  if (score >= 75) return 'good';
  if (score >= 50) return 'fair';

  return 'poor';
}

/**
 * Sorts findings by severity while preserving the order each auditor emitted
 * them in within a severity. `Array.prototype.sort` has been specified as
 * stable since ES2019, so the secondary ordering needs no tiebreaker field and
 * the output stays byte-for-byte reproducible across runs.
 */
function sortBySeverity(issues: SeoIssue[]): SeoIssue[] {
  return [...issues].sort((left, right) => SEVERITY_RANK[left.severity] - SEVERITY_RANK[right.severity]);
}

function auditReadabilityIssues(
  fleschReadingEase: number,
  averageSentenceLength: number,
  isAnalysable: boolean,
): SeoIssue[] {
  const issues: SeoIssue[] = [];

  // Flesch Reading Ease is an English-language formula. It weighs words per
  // sentence and syllables per word, and the syllable counter behind it is an
  // English heuristic that folds diacritics and then works on a-z — so for a page
  // written in Japanese, Greek or Cyrillic it has nothing to measure and
  // `computeReadability` reports the grade 'Not analysable' rather than a number.
  //
  // Staying silent here is the whole point of that signal. Scoring such a page
  // would mean picking between two wrong answers: before diacritic folding it
  // stripped to zero syllables and produced a confident 100 ("Very easy") for text
  // it could not read at all, and simply reversing that would flag every
  // non-Latin-script page as "very difficult to read" — an error-severity finding
  // an author cannot act on, because the text is fine and the ruler is wrong.
  // A metric that does not apply should decline to answer, not guess.
  if (!isAnalysable) {
    return issues;
  }

  // The two score thresholds are reported as one finding, not two: a page below
  // 30 is also below 50, and telling an author their text is both "difficult"
  // and "very difficult" is noise, not information.
  if (fleschReadingEase < SEO_READABILITY_ERROR_THRESHOLD) {
    issues.push({
      category: 'readability',
      detail: `The text scores ${fleschReadingEase} on the Flesch Reading Ease scale, which is roughly the difficulty of an academic paper.`,
      fixable: true,
      fixPrompt:
        'Rewrite the body copy in plain language: split long sentences, prefer short common words over long formal ones, and use the active voice. Keep every fact, figure and claim exactly as written.',
      id: 'readability-very-difficult',
      message: 'The text is very difficult to read.',
      severity: 'error',
    });
  } else if (fleschReadingEase < SEO_READABILITY_WARNING_THRESHOLD) {
    issues.push({
      category: 'readability',
      detail: `The text scores ${fleschReadingEase} on the Flesch Reading Ease scale; 60 or above reads comfortably for a general audience.`,
      fixable: true,
      fixPrompt:
        'Simplify the body copy so it reads comfortably for a general audience: shorten the longest sentences and replace formal vocabulary with everyday equivalents, without changing the meaning.',
      id: 'readability-difficult',
      message: 'The text is difficult to read.',
      severity: 'warning',
    });
  }

  // Sentence length is checked separately from the score because it is the one
  // readability problem an author can act on directly, and because a page can
  // score acceptably overall while still burying its point in 40-word sentences.
  if (averageSentenceLength > SEO_SENTENCE_LENGTH_MAXIMUM) {
    issues.push({
      category: 'readability',
      detail: `Sentences average ${averageSentenceLength} words; ${SEO_SENTENCE_LENGTH_MAXIMUM} or fewer is easier to follow.`,
      fixable: true,
      fixPrompt: `Break the longest sentences into shorter ones so the average sentence runs to about ${SEO_SENTENCE_LENGTH_MAXIMUM} words or fewer, without dropping any content.`,
      id: 'readability-long-sentences',
      message: 'The sentences are long.',
      severity: 'warning',
    });
  }

  return issues;
}

function auditMetaIssues(input: SeoAuditInput): SeoIssue[] {
  const issues: SeoIssue[] = [];

  // `undefined` means the caller is not auditing metadata at all, whereas
  // `null` or '' means there is a metadata field here and it was left blank.
  // Conflating the two would make every caller that only analyses body content
  // report two metadata failures it has no way to fix.
  if (input.metaTitle !== undefined) {
    const title = (input.metaTitle ?? '').trim();

    if (title === '') {
      issues.push({
        category: 'meta',
        detail: 'Without a meta title, search engines fall back to whatever text they can find on the page.',
        fixable: true,
        fixPrompt: `Write a meta title of at most ${SEO_META_TITLE_MAX_LENGTH} characters that names what this page is about and leads with its most important words.`,
        id: 'meta-title-missing',
        message: 'The meta title is empty.',
        severity: 'error',
      });
    } else if (title.length > SEO_META_TITLE_MAX_LENGTH) {
      issues.push({
        category: 'meta',
        detail: `The title is ${title.length} characters; search results truncate it at around ${SEO_META_TITLE_MAX_LENGTH}.`,
        fixable: true,
        fixPrompt: `Shorten the meta title to at most ${SEO_META_TITLE_MAX_LENGTH} characters while keeping its most important words at the front.`,
        id: 'meta-title-too-long',
        message: 'The meta title is too long.',
        severity: 'warning',
      });
    }
  }

  if (input.metaDescription !== undefined) {
    const description = (input.metaDescription ?? '').trim();

    if (description === '') {
      issues.push({
        category: 'meta',
        detail: 'Without a meta description, the search result snippet is assembled from arbitrary page text.',
        fixable: true,
        fixPrompt: `Write a meta description of ${SEO_META_DESCRIPTION_MIN_LENGTH} to ${SEO_META_DESCRIPTION_MAX_LENGTH} characters that summarises the page and gives someone a reason to click.`,
        id: 'meta-description-missing',
        message: 'The meta description is empty.',
        severity: 'error',
      });
    } else if (description.length > SEO_META_DESCRIPTION_MAX_LENGTH) {
      issues.push({
        category: 'meta',
        detail: `The description is ${description.length} characters; search results truncate it at around ${SEO_META_DESCRIPTION_MAX_LENGTH}.`,
        fixable: true,
        fixPrompt: `Shorten the meta description to at most ${SEO_META_DESCRIPTION_MAX_LENGTH} characters without losing the reason someone would click it.`,
        id: 'meta-description-too-long',
        message: 'The meta description is too long.',
        severity: 'warning',
      });
    } else if (description.length < SEO_META_DESCRIPTION_MIN_LENGTH) {
      issues.push({
        category: 'meta',
        detail: `The description is ${description.length} characters; ${SEO_META_DESCRIPTION_MIN_LENGTH} to ${SEO_META_DESCRIPTION_MAX_LENGTH} uses the space a search result gives you.`,
        fixable: true,
        fixPrompt: `Expand the meta description to between ${SEO_META_DESCRIPTION_MIN_LENGTH} and ${SEO_META_DESCRIPTION_MAX_LENGTH} characters, adding a concrete detail rather than padding.`,
        id: 'meta-description-too-short',
        message: 'The meta description is shorter than it needs to be.',
        severity: 'info',
      });
    }
  }

  return issues;
}

/**
 * The result for a document with no words in it.
 *
 * Running the full audit over an empty page produces a dozen true-but-useless
 * failures — no H1, thin content, keyphrase missing everywhere — which reads as
 * an accusation rather than as guidance for someone who has simply not started
 * writing yet. One informational line is the honest report.
 */
function emptyDocumentResult(input: SeoAuditInput, scope: SeoAuditScope): SeoAuditResult {
  return {
    checks: [],
    headings: input.document.headings,
    issues: [
      {
        category: 'content',
        detail: 'Add some body content and the analysis will run automatically.',
        fixable: false,
        id: 'content-empty',
        message: 'There is nothing to analyse yet.',
        severity: 'info',
      },
    ],
    keyword: scope === 'page' ? computeKeywordStats(input.document, input.keyword ?? '') : null,
    readability: computeReadability(input.document.text),
    score: 0,
    scoreBand: 'poor',
  };
}

export function auditSeo(input: SeoAuditInput): SeoAuditResult {
  const { document } = input;
  const scope: SeoAuditScope = input.scope ?? 'page';

  if (document.words.length === 0) {
    return emptyDocumentResult(input, scope);
  }

  const readability = computeReadability(document.text);
  // Keyphrase statistics are a measurement of the *page*: a density is a share
  // of the page's words and "in the first 100 words" is a position in the page.
  // Computing them over one block would put a number on screen that means
  // nothing an author could act on, so block scope reports no keyphrase stats
  // at all rather than a plausible-looking wrong one.
  const keyword = scope === 'page' ? computeKeywordStats(document, input.keyword ?? '') : null;

  // `computeReadability` reports this grade when the text is not the kind the
  // Flesch formula can measure — in practice, a page in a non-Latin script, where
  // the English syllable heuristic finds nothing to count. Both the issue list and
  // the scoring table treat that as "no opinion" rather than as a failing page.
  const isReadabilityAnalysable = readability.grade !== 'Not analysable';

  // Every auditor still runs at every scope and the out-of-scope findings are
  // filtered afterwards, rather than each auditor being taught about scopes.
  // One filter reading one list is far easier to keep honest than six auditors
  // each deciding for themselves what a block is allowed to be told, and the
  // cost is a handful of objects that are built and immediately dropped.
  const issues: SeoIssue[] = [
    ...auditHeadings(document.headings),
    ...auditContentIssues(document.words.length),
    ...auditReadabilityIssues(
      readability.fleschReadingEase,
      readability.averageSentenceLength,
      isReadabilityAnalysable
    ),
    ...auditKeyword(keyword),
    ...auditImageIssues(document.images),
    ...auditMetaIssues(input),
  ].filter((issue) => isIssueInScope(issue, scope));

  const rules = buildScoringRules(
    input,
    keyword !== null,
    document.images.length > 0,
    isReadabilityAnalysable
  ).filter((rule) => appliesAtScope(rule, scope));
  const raisedIssueIds = new Set(issues.map((issue) => issue.id));
  const checks: SeoCheck[] = rules.map((rule) => ({
    id: rule.id,
    label: rule.label,
    passed: !rule.failingIssueIds.some((issueId) => raisedIssueIds.has(issueId)),
    weight: rule.weight,
  }));

  const totalWeight = checks.reduce((total, check) => total + check.weight, 0);
  const passedWeight = checks.reduce((total, check) => total + (check.passed ? check.weight : 0), 0);
  // The guard is theoretically unreachable — the heading rules are always in
  // the table — but a divide-by-zero here would render "NaN" in the CMS badge,
  // and this file's whole job is to never do that.
  const score = totalWeight === 0 ? 0 : Math.round((100 * passedWeight) / totalWeight);

  return {
    checks,
    headings: document.headings,
    issues: sortBySeverity(issues),
    keyword,
    readability,
    score,
    scoreBand: toScoreBand(score),
  };
}

function auditContentIssues(wordCount: number): SeoIssue[] {
  if (wordCount >= SEO_CONTENT_MINIMUM_WORDS) {
    return [];
  }

  return [
    {
      category: 'content',
      detail: `This page has ${wordCount} words; ${SEO_CONTENT_MINIMUM_WORDS} or more gives a search engine enough to work with.`,
      fixable: true,
      fixPrompt: `Expand the body copy to at least ${SEO_CONTENT_MINIMUM_WORDS} words by developing the points already made — add detail, examples and context rather than restating what is already there.`,
      id: 'content-thin',
      message: 'There is not much content on this page.',
      severity: 'warning',
    },
  ];
}

function auditImageIssues(images: SeoAuditInput['document']['images']): SeoIssue[] {
  const missing = images.filter((image) => image.alt.trim() === '').length;
  if (missing === 0) {
    return [];
  }

  return [
    {
      category: 'images',
      // Marked not fixable even though it is very obviously fixable, because a
      // text rewrite is the wrong tool: alt text has to describe the pixels,
      // which needs the dedicated vision-backed alt-text generator in the media
      // library rather than the prose rewrite behind the "Fix with Cortex AI"
      // button. Saying so here keeps the UI from looking broken.
      detail: `${missing} image${missing === 1 ? '' : 's'} on this page ${missing === 1 ? 'has' : 'have'} no alt text. Use the alt-text generator in the media library, which describes the image itself rather than rewriting the page copy.`,
      fixable: false,
      id: 'images-missing-alt',
      message: 'An image is missing alt text.',
      severity: 'warning',
    },
  ];
}

/**
 * Assembles the scoring table for this particular run.
 *
 * Weights sum to 100 when every optional row applies: headings 17, content 10,
 * readability 13, images 6, keyphrase 34 and metadata 20. When an optional row
 * is dropped the denominator shrinks with it, so the remaining checks keep
 * their relative importance instead of being quietly diluted.
 *
 * This function always builds the full page-scope table; the caller then drops
 * the rows that do not apply to the scope it was given. Keeping the weights in
 * one place means a block's score is the same fraction of the same numbers as a
 * page's, just over the subset of rows a block can actually influence.
 */
function buildScoringRules(
  input: SeoAuditInput,
  hasKeyword: boolean,
  hasImages: boolean,
  isReadabilityAnalysable: boolean
): ScoringRule[] {
  const rules: ScoringRule[] = [
    {
      failingIssueIds: ['headings-missing-h1', 'headings-multiple-h1'],
      id: 'headings-single-h1',
      label: 'The page has exactly one H1',
      weight: 10,
    },
    {
      failingIssueIds: ['headings-skipped-level'],
      id: 'headings-sequential',
      label: 'Heading levels do not skip a step',
      weight: 4,
    },
    {
      failingIssueIds: ['headings-empty'],
      id: 'headings-have-text',
      label: 'Every heading has text',
      weight: 3,
    },
    {
      failingIssueIds: ['content-thin'],
      id: 'content-length',
      label: `The page has at least ${SEO_CONTENT_MINIMUM_WORDS} words`,
      weight: 10,
    },
  ];

  // The readability rows are conditional for the same reason the keyphrase and
  // image rows are: a check that cannot be evaluated is REMOVED from the
  // denominator rather than silently passed. Passing it for free would hand every
  // non-English page 13 points it never earned and quietly make its score
  // incomparable with an English page's; dropping it means the score still means
  // "this much of what we could actually assess is in good shape".
  if (isReadabilityAnalysable) {
    rules.push(
      {
        failingIssueIds: ['readability-very-difficult', 'readability-difficult'],
        id: 'readability-score',
        label: 'The text is reasonably easy to read',
        weight: 9,
      },
      {
        failingIssueIds: ['readability-long-sentences'],
        id: 'readability-sentence-length',
        label: `Sentences average ${SEO_SENTENCE_LENGTH_MAXIMUM} words or fewer`,
        weight: 4,
      }
    );
  }

  if (hasImages) {
    rules.push({
      failingIssueIds: ['images-missing-alt'],
      id: 'images-have-alt',
      label: 'Every image has alt text',
      weight: 6,
    });
  }

  if (hasKeyword) {
    rules.push(
      {
        failingIssueIds: ['keyword-density-low', 'keyword-density-high'],
        id: 'keyword-density',
        label: 'The keyphrase density is in range',
        weight: 12,
      },
      {
        failingIssueIds: ['keyword-not-in-h1'],
        id: 'keyword-in-h1',
        label: 'The keyphrase appears in the H1',
        weight: 10,
      },
      {
        failingIssueIds: ['keyword-not-in-subheadings'],
        id: 'keyword-in-subheadings',
        label: 'The keyphrase appears in a subheading',
        weight: 5,
      },
      {
        failingIssueIds: ['keyword-not-early'],
        id: 'keyword-early',
        label: 'The keyphrase appears near the start',
        weight: 7,
      }
    );
  }

  if (input.metaTitle !== undefined) {
    rules.push({
      failingIssueIds: ['meta-title-missing', 'meta-title-too-long'],
      id: 'meta-title',
      label: `The meta title is set and at most ${SEO_META_TITLE_MAX_LENGTH} characters`,
      weight: 10,
    });
  }

  if (input.metaDescription !== undefined) {
    rules.push({
      failingIssueIds: [
        'meta-description-missing',
        'meta-description-too-long',
        'meta-description-too-short',
      ],
      id: 'meta-description',
      label: `The meta description is ${SEO_META_DESCRIPTION_MIN_LENGTH} to ${SEO_META_DESCRIPTION_MAX_LENGTH} characters`,
      weight: 10,
    });
  }

  return rules;
}
