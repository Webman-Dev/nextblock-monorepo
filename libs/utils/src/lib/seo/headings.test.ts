import { describe, expect, it } from 'vitest';
import { auditHeadings } from './headings';
import type { SeoHeading, SeoHeadingLevel } from './types';

/** Builds a heading list whose `order` fields are consistent with their positions. */
function outline(...entries: Array<[SeoHeadingLevel, string]>): SeoHeading[] {
  return entries.map(([level, text], order) => ({ level, order, text }));
}

function ids(headings: SeoHeading[]): string[] {
  return auditHeadings(headings).map((issue) => issue.id);
}

describe('auditHeadings', () => {
  it('reports a missing H1, and does not offer to fix it automatically', () => {
    const issues = auditHeadings(outline([2, 'Intro'], [3, 'Detail']));
    const missing = issues.find((issue) => issue.id === 'headings-missing-h1');

    expect(missing).toBeDefined();
    expect(missing?.severity).toBe('error');
    // Inventing a page title is an editorial decision, not a rewrite, so the
    // "Fix with Cortex AI" button deliberately does not offer to do it.
    expect(missing?.fixable).toBe(false);
  });

  it('reports an empty outline as having no H1', () => {
    expect(ids([])).toEqual(['headings-missing-h1']);
  });

  it('accepts a well-formed outline without complaint', () => {
    expect(ids(outline([1, 'Title'], [2, 'Section'], [3, 'Detail'], [2, 'Another']))).toEqual([]);
  });

  it('reports more than one H1 with the count in the detail', () => {
    const issues = auditHeadings(outline([1, 'One'], [2, 'Sub'], [1, 'Two'], [1, 'Three']));
    const multiple = issues.find((issue) => issue.id === 'headings-multiple-h1');

    expect(multiple?.severity).toBe('error');
    expect(multiple?.detail).toContain('3 H1 headings');
    expect(multiple?.fixable).toBe(true);
    expect(multiple?.fixPrompt).toBeTruthy();
  });

  it('never reports a missing and a duplicated H1 at the same time', () => {
    const reported = ids(outline([1, 'One'], [1, 'Two']));

    expect(reported).toContain('headings-multiple-h1');
    expect(reported).not.toContain('headings-missing-h1');
  });

  it('detects a skipped level against the previous heading', () => {
    const issues = auditHeadings(outline([1, 'Title'], [2, 'Section'], [4, 'Too deep']));
    const skipped = issues.find((issue) => issue.id === 'headings-skipped-level');

    expect(skipped?.severity).toBe('warning');
    expect(skipped?.detail).toBe('H2 is followed by H4.');
    expect(skipped?.fixable).toBe(true);
  });

  it('does not treat coming back up the outline as a skip', () => {
    // H4 back to H2 closes a subsection; only going deeper by more than one
    // rung leaves a hole a screen reader has to jump over.
    expect(ids(outline([1, 'Title'], [2, 'A'], [3, 'B'], [4, 'C'], [2, 'D']))).toEqual([]);
  });

  it('reports only the first skip but counts them all in the detail', () => {
    const issues = auditHeadings(
      outline([1, 'Title'], [2, 'A'], [4, 'B'], [2, 'C'], [5, 'D'])
    );
    const skipped = issues.filter((issue) => issue.id === 'headings-skipped-level');

    expect(skipped).toHaveLength(1);
    expect(skipped[0]?.detail).toBe('H2 is followed by H4. 2 levels are skipped in total.');
  });

  it('reports an empty heading once, with the total in the detail', () => {
    const issues = auditHeadings(outline([1, 'Title'], [2, ''], [2, '   '], [2, 'Real']));
    const empty = issues.filter((issue) => issue.id === 'headings-empty');

    expect(empty).toHaveLength(1);
    expect(empty[0]?.detail).toBe('2 headings have no text.');
    expect(empty[0]?.severity).toBe('warning');
    expect(empty[0]?.fixable).toBe(true);
  });

  it('uses the singular form for a single empty heading', () => {
    const issues = auditHeadings(outline([1, 'Title'], [2, '']));

    expect(issues.find((issue) => issue.id === 'headings-empty')?.detail).toBe(
      '1 heading has no text.'
    );
  });

  it('notes when the H1 is not the first heading, as information only', () => {
    const issues = auditHeadings(outline([2, 'Eyebrow'], [1, 'Title'], [2, 'Section']));
    const notFirst = issues.find((issue) => issue.id === 'headings-h1-not-first');

    expect(notFirst?.severity).toBe('info');
    expect(notFirst?.fixable).toBe(false);
    expect(notFirst?.detail).toBe('The document opens with an H2; the H1 appears at position 2.');
  });

  it('does not raise the ordering note when there is no H1 at all', () => {
    expect(ids(outline([2, 'A'], [3, 'B']))).not.toContain('headings-h1-not-first');
  });

  it('gives every fixable issue a prompt and every unfixable one none', () => {
    const issues = auditHeadings(outline([2, ''], [1, 'A'], [1, 'B'], [4, 'C']));

    for (const issue of issues) {
      expect(issue.category).toBe('headings');
      if (issue.fixable) {
        expect(typeof issue.fixPrompt).toBe('string');
        expect(issue.fixPrompt).not.toBe('');
      } else {
        expect(issue.fixPrompt).toBeUndefined();
      }
    }
  });
});
