import { describe, expect, it } from 'vitest';

import { auditSeo, buildSeoDocument, type SeoIssue } from '@nextblock-cms/utils/seo';

import {
  buildSeoFixContext,
  buildSeoFixPrompt,
  canFixIssueWithCortexAi,
  SEO_FIX_CONTEXT_MAX_LENGTH,
  SEO_FIX_PROMPT_MAX_LENGTH,
  SEO_FIX_PROMPT_MIN_LENGTH,
} from './fix-prompts';

/**
 * The audit panel cannot be rendered in a test — there is no DOM environment in
 * this workspace and no React testing library — so these two builders are the
 * only part of the "Fix with Cortex AI" path that can be pinned down. They are
 * also the part where a mistake is invisible: an over-long prompt comes back as
 * a bare 400 from a `z.strictObject` route, and a prompt missing its numbers
 * produces a plausible-looking rewrite that does not actually fix anything.
 */

function issue(overrides: Partial<SeoIssue> = {}): SeoIssue {
  return {
    category: 'readability',
    detail: 'Sentences average 34 words; 25 or fewer is easier to follow.',
    fixable: true,
    fixPrompt: 'Break the longest sentences into shorter ones.',
    id: 'readability-long-sentences',
    message: 'The sentences are long.',
    severity: 'warning',
    ...overrides,
  };
}

describe('canFixIssueWithCortexAi', () => {
  it('offers a fix when the audit marked the issue fixable and supplied an instruction', () => {
    expect(canFixIssueWithCortexAi(issue())).toBe(true);
  });

  it('refuses an issue the audit marked unfixable', () => {
    // A missing H1 is the real case: the audit deliberately declines to invent
    // a page title, because that is an editorial decision rather than a rewrite.
    expect(
      canFixIssueWithCortexAi(
        issue({
          category: 'headings',
          fixable: false,
          fixPrompt: undefined,
          id: 'headings-missing-h1',
        })
      )
    ).toBe(false);
  });

  it('refuses a fixable issue that carries no instruction', () => {
    // Without `fixPrompt` the request would be assembled entirely from the
    // problem statement, and the model would answer by describing the problem.
    expect(canFixIssueWithCortexAi(issue({ fixPrompt: undefined }))).toBe(false);
    expect(canFixIssueWithCortexAi(issue({ fixPrompt: '   ' }))).toBe(false);
  });

  it('agrees with the audit engine on a real document', () => {
    // Guards against the predicate drifting away from the engine's own verdicts:
    // every issue this panel would offer to fix must actually carry the
    // instruction the request is built from.
    const document = buildSeoDocument(
      '<h1>Tea</h1><h1>More tea</h1><p>Short page about tea leaves and water.</p>'
    );
    const result = auditSeo({ document, keyword: 'tea' });
    const fixable = result.issues.filter(canFixIssueWithCortexAi);

    expect(fixable.length).toBeGreaterThan(0);
    for (const finding of fixable) {
      expect(finding.fixPrompt?.trim()).toBeTruthy();
    }
    expect(result.issues.some((finding) => finding.id === 'headings-missing-h1')).toBe(false);
  });

  it('never offers to fix missing alt text, which needs the vision generator instead', () => {
    const document = buildSeoDocument(
      `<h1>Gallery</h1><p>${'photo '.repeat(40)}</p><img src="/a.png" alt="">`
    );
    const missingAlt = auditSeo({ document }).issues.find(
      (finding) => finding.id === 'images-missing-alt'
    );

    expect(missingAlt).toBeDefined();
    expect(canFixIssueWithCortexAi(missingAlt as SeoIssue)).toBe(false);
  });
});

describe('buildSeoFixPrompt', () => {
  it('leads with the audit instruction and repeats the concrete numbers', () => {
    const prompt = buildSeoFixPrompt({ issue: issue(), wordCount: 118 });

    expect(prompt.startsWith('Break the longest sentences into shorter ones.')).toBe(true);
    expect(prompt).toContain('The sentences are long.');
    expect(prompt).toContain('Sentences average 34 words');
    expect(prompt).toContain('118 words');
  });

  it('names the focus keyphrase only when one is set', () => {
    expect(buildSeoFixPrompt({ issue: issue(), keyword: 'green tea' })).toContain(
      'focus keyphrase for this page is "green tea"'
    );
    expect(buildSeoFixPrompt({ issue: issue(), keyword: '   ' })).not.toContain('focus keyphrase');
    expect(buildSeoFixPrompt({ issue: issue(), keyword: null })).not.toContain('focus keyphrase');
  });

  it('omits the word count when the caller has none', () => {
    const prompt = buildSeoFixPrompt({ issue: issue() });

    expect(prompt).not.toContain('currently runs to');
    expect(prompt).not.toContain('NaN');
  });

  it('states the output contract so the fragment can be inserted verbatim', () => {
    const prompt = buildSeoFixPrompt({ issue: issue() });

    expect(prompt).toContain('HTML fragment');
    expect(prompt).toContain('code fence');
  });

  it('survives an issue with no detail sentence', () => {
    const prompt = buildSeoFixPrompt({ issue: issue({ detail: undefined }) });

    expect(prompt).toContain('The SEO audit reported: The sentences are long.');
    expect(prompt).not.toContain('undefined');
  });

  it('stays inside the schema length bounds even with an absurd instruction', () => {
    const prompt = buildSeoFixPrompt({
      issue: issue({ detail: 'x'.repeat(9000), fixPrompt: 'y'.repeat(9000) }),
      keyword: 'z'.repeat(500),
      wordCount: 4321,
    });

    expect(prompt.length).toBeLessThanOrEqual(SEO_FIX_PROMPT_MAX_LENGTH);
    expect(prompt.length).toBeGreaterThanOrEqual(SEO_FIX_PROMPT_MIN_LENGTH);
  });

  it('produces a prompt long enough to pass the minimum for every real fixable issue', () => {
    const document = buildSeoDocument(
      '<h1>Tea</h1><h1>Tea again</h1><h4>Deep</h4><h2></h2><p>A very short page.</p>'
    );
    const result = auditSeo({
      document,
      keyword: 'coffee',
      metaDescription: '',
      metaTitle: '',
    });
    const fixable = result.issues.filter(canFixIssueWithCortexAi);

    expect(fixable.length).toBeGreaterThan(3);
    for (const finding of fixable) {
      const prompt = buildSeoFixPrompt({
        issue: finding,
        keyword: 'coffee',
        wordCount: result.readability.wordCount,
      });
      expect(prompt.length).toBeGreaterThanOrEqual(SEO_FIX_PROMPT_MIN_LENGTH);
      expect(prompt.length).toBeLessThanOrEqual(SEO_FIX_PROMPT_MAX_LENGTH);
    }
  });
});

describe('buildSeoFixContext', () => {
  it('short-circuits an empty document rather than describing nothing', () => {
    const context = buildSeoFixContext({
      documentText: '',
      insertionMode: 'replace-empty-document',
      wordCount: 0,
    });

    expect(context).toBe(
      'Insertion target: empty editor. Create the initial content for this document.'
    );
  });

  it('quotes the tail of the document when appending', () => {
    const context = buildSeoFixContext({
      documentText: `START ${'middle '.repeat(400)}END`,
      insertionMode: 'append-to-end',
    });

    expect(context).toContain('END');
    expect(context).not.toContain('START');
    expect(context).toContain('Continue after the existing content');
  });

  it('quotes the head of the document when replacing a selection', () => {
    const context = buildSeoFixContext({
      documentText: `START ${'middle '.repeat(400)}END`,
      insertionMode: 'replace-selection',
      selectedText: 'the highlighted sentence',
    });

    expect(context).toContain('START');
    expect(context).not.toContain('END');
    expect(context).toContain('Selected text:\nthe highlighted sentence');
    expect(context).toContain('Replace only the selected content');
  });

  it('includes the heading outline when one is supplied', () => {
    const context = buildSeoFixContext({
      documentText: 'Body copy.',
      headingOutline: ['H1 Tea', 'H3 Water temperature'],
      insertionMode: 'append-to-end',
    });

    expect(context).toContain('Heading outline:\nH1 Tea\nH3 Water temperature');
  });

  it('drops the optional sections instead of emitting empty labels', () => {
    const context = buildSeoFixContext({
      documentText: '   ',
      headingOutline: [],
      insertionMode: 'append-to-end',
      selectedText: '   ',
      wordCount: null,
    });

    expect(context).not.toContain('Heading outline');
    expect(context).not.toContain('Selected text');
    expect(context).not.toContain('Existing editor text');
    expect(context).not.toContain('words.');
    expect(context.startsWith('Insertion target: append-to-end.')).toBe(true);
  });

  it('never exceeds the 2000 character cap the route enforces', () => {
    const context = buildSeoFixContext({
      documentText: 'word '.repeat(50_000),
      headingOutline: Array.from({ length: 200 }, (_, index) => `H2 Section ${index}`),
      insertionMode: 'replace-selection',
      selectedText: 'selected '.repeat(5_000),
      wordCount: 50_000,
    });

    expect(context.length).toBeLessThanOrEqual(SEO_FIX_CONTEXT_MAX_LENGTH);
  });
});
