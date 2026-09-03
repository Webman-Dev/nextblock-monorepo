import type { SeoHeading, SeoIssue } from './types';

/**
 * Audits the heading outline of a document.
 *
 * The outline is the one part of on-page SEO that is purely structural: it can
 * be judged without knowing anything about the topic, the keyword or the
 * audience, which is why it lives in its own module and is tested on its own.
 *
 * Two conventions run through the whole file. First, every issue id is stable
 * and machine-readable — the scoring table in `audit.ts` ties a weighted check
 * to an exact id, so renaming one would silently change everybody's score.
 * Second, each *kind* of problem is reported at most once no matter how many
 * times it occurs, with the total folded into the `detail` string. A page with
 * eleven empty headings needs one line telling it so, not eleven.
 */

/** Renders a count with the right singular/plural noun, e.g. "3 headings". */
function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

export function auditHeadings(headings: SeoHeading[]): SeoIssue[] {
  const issues: SeoIssue[] = [];
  const h1s = headings.filter((heading) => heading.level === 1);

  if (h1s.length === 0) {
    // Deliberately not fixable. A missing H1 is usually a symptom of the page
    // having no real title section at all, and inventing one is an editorial
    // decision rather than a rewrite of existing text, so the CMS asks the
    // author to add it instead of offering a one-click AI fix.
    issues.push({
      category: 'headings',
      detail:
        'Search engines and screen readers both treat the H1 as the title of the page. Promote the most important heading to H1, or add one.',
      fixable: false,
      id: 'headings-missing-h1',
      message: 'This page has no H1 heading.',
      severity: 'error',
    });
  } else if (h1s.length > 1) {
    issues.push({
      category: 'headings',
      detail: `This page has ${pluralize(h1s.length, 'H1 heading', 'H1 headings')}; exactly one is expected.`,
      fixable: true,
      fixPrompt:
        'Keep the single most representative H1 as the page title and demote every other H1 to an H2, preserving the wording of each heading.',
      id: 'headings-multiple-h1',
      message: 'This page has more than one H1 heading.',
      severity: 'error',
    });
  }

  // The H1 not leading the document is a presentation nit rather than a defect:
  // the outline is still valid, and plenty of legitimate layouts open with an
  // eyebrow or a breadcrumb heading. It is reported as information only.
  const firstHeading = headings[0];
  if (h1s.length > 0 && firstHeading !== undefined && firstHeading.level !== 1) {
    const firstH1 = h1s[0];
    issues.push({
      category: 'headings',
      detail: `The document opens with an H${firstHeading.level}; the H1 appears at position ${firstH1.order + 1}.`,
      fixable: false,
      id: 'headings-h1-not-first',
      message: 'The H1 is not the first heading on the page.',
      severity: 'info',
    });
  }

  // A "skip" is measured against the previous heading in document order rather
  // than against the deepest level seen so far, because that is how a screen
  // reader walks the outline: going from H2 straight to H4 leaves a rung of the
  // ladder missing, while coming back up from H4 to H2 is perfectly normal.
  const skips: Array<{ from: number; to: number }> = [];
  for (let index = 1; index < headings.length; index += 1) {
    const previous = headings[index - 1];
    const current = headings[index];
    if (current.level - previous.level > 1) {
      skips.push({ from: previous.level, to: current.level });
    }
  }

  const firstSkip = skips[0];
  if (firstSkip !== undefined) {
    const total =
      skips.length > 1 ? ` ${pluralize(skips.length, 'level is', 'levels are')} skipped in total.` : '';
    issues.push({
      category: 'headings',
      detail: `H${firstSkip.from} is followed by H${firstSkip.to}.${total}`,
      fixable: true,
      fixPrompt:
        'Renumber the headings so each one is at most one level deeper than the heading before it, without changing any heading text.',
      id: 'headings-skipped-level',
      message: 'The heading levels skip a step.',
      severity: 'warning',
    });
  }

  const emptyCount = headings.filter((heading) => heading.text.trim() === '').length;
  if (emptyCount > 0) {
    issues.push({
      category: 'headings',
      detail: `${pluralize(emptyCount, 'heading has', 'headings have')} no text.`,
      fixable: true,
      fixPrompt:
        'Give every empty heading a short, descriptive title drawn from the content that follows it, or remove the heading entirely if the content does not need one.',
      id: 'headings-empty',
      message: 'The page contains an empty heading.',
      severity: 'warning',
    });
  }

  return issues;
}
