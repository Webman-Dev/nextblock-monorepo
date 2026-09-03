import { describe, expect, it } from 'vitest';
import { buildSeoDocument } from './document';
import { auditKeyword, computeKeywordStats } from './keywords';
import type { KeywordStats } from './types';

/** A healthy set of statistics, so each test can vary exactly one dimension. */
function statsWith(overrides: Partial<KeywordStats>): KeywordStats {
  return {
    count: 5,
    density: 1.5,
    inFirst100Words: true,
    inHeading1: true,
    inSubheadings: true,
    keyword: 'cat food',
    ...overrides,
  };
}

function ids(stats: KeywordStats | null): string[] {
  return auditKeyword(stats).map((issue) => issue.id);
}

describe('computeKeywordStats', () => {
  it('returns null when no keyphrase has been set', () => {
    const document = buildSeoDocument('<p>Some words here.</p>');

    expect(computeKeywordStats(document, '')).toBeNull();
    expect(computeKeywordStats(document, '   ')).toBeNull();
  });

  it('returns null for a keyphrase made entirely of punctuation', () => {
    const document = buildSeoDocument('<p>Some words here.</p>');

    expect(computeKeywordStats(document, '!!! ---')).toBeNull();
  });

  it('matches whole words, so "cat" is not found inside "catalogue"', () => {
    // Substring matching would report three hits here and drive the density to
    // 100%, which is exactly the failure mode that makes naive SEO tools useless
    // for short keyphrases.
    const document = buildSeoDocument('<p>catalogue catalogues cataloging</p>');
    const stats = computeKeywordStats(document, 'cat');

    expect(stats?.count).toBe(0);
    expect(stats?.density).toBe(0);
  });

  it('counts the whole-word occurrences it does find', () => {
    const document = buildSeoDocument('<p>cat catalogue cat</p>');
    const stats = computeKeywordStats(document, 'CAT');

    expect(stats?.count).toBe(2);
    expect(stats?.density).toBe(66.67);
    expect(stats?.keyword).toBe('CAT');
  });

  it('matches a multi-word keyphrase only where the words are consecutive', () => {
    const document = buildSeoDocument(
      '<h1>Organic Dog Food</h1><p>We sell organic dog food. Dog food is organic.</p>'
    );
    const stats = computeKeywordStats(document, 'Organic Dog Food');

    expect(stats?.count).toBe(2);
    // Two matches of a three-word phrase occupy six of the twelve words.
    expect(stats?.density).toBe(50);
    expect(stats?.inHeading1).toBe(true);
  });

  it('does not match the words of a keyphrase scattered across a sentence', () => {
    const document = buildSeoDocument('<p>organic and dog and food</p>');

    expect(computeKeywordStats(document, 'organic dog food')?.count).toBe(0);
  });

  it('does not match a phrase across a paragraph boundary', () => {
    // The token stream is flat, so "coffee" and "beans" were adjacent in the
    // array even though a paragraph break separates them on the page. The
    // phantom match inflated the density and could satisfy the early-placement
    // check for a phrase no reader could find.
    const split = buildSeoDocument('<p>We roast our coffee</p><p>beans are sold here</p>');
    const together = buildSeoDocument('<p>We roast our coffee beans and sell them here</p>');

    expect(computeKeywordStats(split, 'coffee beans')?.count).toBe(0);
    expect(computeKeywordStats(split, 'coffee beans')?.density).toBe(0);
    expect(computeKeywordStats(split, 'coffee beans')?.inFirst100Words).toBe(false);
    expect(computeKeywordStats(together, 'coffee beans')?.count).toBe(1);
  });

  it('does not match a phrase across a heading and the paragraph after it', () => {
    const document = buildSeoDocument('<h2>We sell coffee</h2><p>beans arrive weekly</p>');

    expect(computeKeywordStats(document, 'coffee beans')?.count).toBe(0);
  });

  it('applies the same boundary rule to the Tiptap path', () => {
    const document = buildSeoDocument({
      content: [
        { content: [{ text: 'We roast our coffee', type: 'text' }], type: 'paragraph' },
        { content: [{ text: 'beans are sold here', type: 'text' }], type: 'paragraph' },
      ],
      type: 'doc',
    });

    expect(computeKeywordStats(document, 'coffee beans')?.count).toBe(0);
  });

  it('leaves the word count and the density denominator alone', () => {
    // Boundaries live beside the token stream rather than inside it, so nothing
    // that counts words sees an extra entry and the denominator is unchanged.
    const document = buildSeoDocument('<p>cat food</p><p>cat food</p>');

    expect(document.words).toHaveLength(4);
    // Two matches of a two-word phrase occupy all four words.
    expect(computeKeywordStats(document, 'cat food')?.count).toBe(2);
    expect(computeKeywordStats(document, 'cat food')?.density).toBe(100);
  });

  it('still matches a phrase that starts at the first word of a block', () => {
    const document = buildSeoDocument('<p>Nothing here</p><p>cat food is good</p>');

    expect(computeKeywordStats(document, 'cat food')?.count).toBe(1);
  });

  it('counts repeated phrases without overlapping them', () => {
    const document = buildSeoDocument('<p>buy buy buy</p>');

    expect(computeKeywordStats(document, 'buy buy')?.count).toBe(1);
  });

  it('reports zero density rather than dividing by zero on an empty document', () => {
    const stats = computeKeywordStats(buildSeoDocument(''), 'cat food');

    expect(stats).toEqual({
      count: 0,
      density: 0,
      inFirst100Words: false,
      inHeading1: false,
      inSubheadings: false,
      keyword: 'cat food',
    });
  });

  it('only counts the keyphrase as early when it lands in the first 100 words', () => {
    const filler = new Array(120).fill('filler').join(' ');
    const late = computeKeywordStats(buildSeoDocument(`<p>${filler} target word</p>`), 'target');
    const early = computeKeywordStats(buildSeoDocument(`<p>target ${filler}</p>`), 'target');

    expect(late?.count).toBe(1);
    expect(late?.inFirst100Words).toBe(false);
    expect(early?.inFirst100Words).toBe(true);
  });

  it('looks for the keyphrase in the H1 and in H2/H3 subheadings only', () => {
    const inSubheading = buildSeoDocument('<h1>Title</h1><h3>Cat Food Deals</h3><p>Nothing.</p>');
    const inDeepHeading = buildSeoDocument('<h1>Title</h1><h4>Cat Food Deals</h4><p>Nothing.</p>');

    expect(computeKeywordStats(inSubheading, 'cat food')?.inHeading1).toBe(false);
    expect(computeKeywordStats(inSubheading, 'cat food')?.inSubheadings).toBe(true);
    // An H4 is too deep to count as a topical signal for the page as a whole.
    expect(computeKeywordStats(inDeepHeading, 'cat food')?.inSubheadings).toBe(false);
  });
});

describe('auditKeyword', () => {
  it('reports an unset keyphrase as information the author has to supply', () => {
    const issues = auditKeyword(null);

    expect(issues).toHaveLength(1);
    expect(issues[0]?.id).toBe('keyword-missing');
    expect(issues[0]?.severity).toBe('info');
    // Choosing what a page should rank for is a business decision, not a rewrite.
    expect(issues[0]?.fixable).toBe(false);
  });

  it('says nothing about a keyphrase that is well placed and in band', () => {
    expect(ids(statsWith({}))).toEqual([]);
  });

  it('treats the density band as inclusive at both ends', () => {
    expect(ids(statsWith({ density: 1.0 }))).toEqual([]);
    expect(ids(statsWith({ density: 2.5 }))).toEqual([]);
    expect(ids(statsWith({ density: 0.99 }))).toEqual(['keyword-density-low']);
    expect(ids(statsWith({ density: 2.51 }))).toEqual(['keyword-density-high']);
  });

  it('never reports both a low and a high density', () => {
    expect(ids(statsWith({ count: 0, density: 0 }))).toEqual(['keyword-density-low']);
  });

  it('reports each placement gap independently', () => {
    expect(ids(statsWith({ inHeading1: false }))).toEqual(['keyword-not-in-h1']);
    expect(ids(statsWith({ inSubheadings: false }))).toEqual(['keyword-not-in-subheadings']);
    expect(ids(statsWith({ inFirst100Words: false }))).toEqual(['keyword-not-early']);
  });

  it('reports every problem at once for a keyphrase that appears nowhere', () => {
    const issues = auditKeyword(
      statsWith({
        count: 0,
        density: 0,
        inFirst100Words: false,
        inHeading1: false,
        inSubheadings: false,
      })
    );

    expect(issues.map((issue) => issue.id)).toEqual([
      'keyword-density-low',
      'keyword-not-in-h1',
      'keyword-not-in-subheadings',
      'keyword-not-early',
    ]);
  });

  it('names the keyphrase in the prompt handed to the AI rewrite', () => {
    const issues = auditKeyword(statsWith({ inHeading1: false, keyword: 'organic dog food' }));

    expect(issues[0]?.fixable).toBe(true);
    expect(issues[0]?.fixPrompt).toContain('organic dog food');
  });

  it('tags every finding as a keyword-category issue', () => {
    const issues = auditKeyword(statsWith({ density: 9, inHeading1: false }));

    expect(issues.every((issue) => issue.category === 'keyword')).toBe(true);
  });
});
