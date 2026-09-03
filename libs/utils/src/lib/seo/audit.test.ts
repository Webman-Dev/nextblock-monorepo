import { describe, expect, it } from 'vitest';
import { auditSeo, describeSeoAuditScope, toScoreBand } from './audit';
import { buildSeoDocument } from './document';
import type { SeoAuditInput, SeoAuditResult, SeoIssueSeverity } from './types';

/**
 * A page engineered to pass every check, so that any deviation in the engine
 * shows up as a specific failing issue rather than as a vague score change.
 *
 * The counts are deliberate: 5 + 5 heading words, three keyphrase sentences of
 * five words and 41 filler sentences of fourteen, for 599 words carrying five
 * occurrences of the two-word keyphrase — a density of 1.67%, comfortably
 * inside the 1.0-2.5% band.
 */
const FILLER_SENTENCE = 'We ship every order fast and we pack it with care for your pet.';
const KEYWORD_SENTENCE = 'Our cat food is fresh.';
const META_TITLE = 'Cat Food For Happy Pets';
const META_DESCRIPTION =
  'Discover fresh cat food for happy pets, shipped fast and packed with care for every order you place with us.';

function buildHealthyHtml(options: { withImage?: boolean } = {}): string {
  const paragraphs = [
    ...new Array(3).fill(KEYWORD_SENTENCE),
    ...new Array(41).fill(FILLER_SENTENCE),
  ].map((sentence: string) => `<p>${sentence}</p>`);

  return [
    '<h1>Cat Food For Happy Pets</h1>',
    '<h2>Why Our Cat Food Works</h2>',
    ...paragraphs,
    options.withImage === true ? '<p><img src="/cat.png" alt="A bowl of cat food"></p>' : '',
  ].join('');
}

function auditHealthy(overrides: Partial<SeoAuditInput> = {}): SeoAuditResult {
  const base: SeoAuditInput = {
    document: buildSeoDocument(buildHealthyHtml()),
    keyword: 'cat food',
    metaDescription: META_DESCRIPTION,
    metaTitle: META_TITLE,
  };

  return auditSeo({ ...base, ...overrides });
}

function issueIds(result: SeoAuditResult): string[] {
  return result.issues.map((issue) => issue.id);
}

function checkIds(result: SeoAuditResult): string[] {
  return result.checks.map((check) => check.id);
}

const SEVERITY_RANK: Record<SeoIssueSeverity, number> = { error: 0, warning: 1, info: 2 };

describe('toScoreBand', () => {
  it('maps a score onto its band at the documented boundaries', () => {
    expect(toScoreBand(100)).toBe('excellent');
    expect(toScoreBand(90)).toBe('excellent');
    expect(toScoreBand(89)).toBe('good');
    expect(toScoreBand(75)).toBe('good');
    expect(toScoreBand(74)).toBe('fair');
    expect(toScoreBand(50)).toBe('fair');
    expect(toScoreBand(49)).toBe('poor');
    expect(toScoreBand(0)).toBe('poor');
  });
});

describe('auditSeo on an empty document', () => {
  const result = auditSeo({
    document: buildSeoDocument(''),
    keyword: 'cat food',
    metaDescription: '',
    metaTitle: '',
  });

  it('scores zero without listing a pile of failures the author cannot act on', () => {
    expect(result.score).toBe(0);
    expect(result.scoreBand).toBe('poor');
    expect(result.issues).toHaveLength(1);
    expect(result.issues[0]?.id).toBe('content-empty');
    expect(result.issues[0]?.severity).toBe('info');
    expect(result.checks).toEqual([]);
  });

  it('still reports the readability and keyword shells so the UI has something to render', () => {
    expect(result.readability.grade).toBe('Not enough content');
    expect(result.readability.fleschReadingEase).toBe(0);
    expect(result.keyword).toEqual({
      count: 0,
      density: 0,
      inFirst100Words: false,
      inHeading1: false,
      inSubheadings: false,
      keyword: 'cat food',
    });
  });
});

describe('auditSeo on a healthy page', () => {
  it('finds nothing to complain about and scores 100', () => {
    const result = auditHealthy();

    expect(result.issues).toEqual([]);
    expect(result.score).toBe(100);
    expect(result.scoreBand).toBe('excellent');
    expect(result.checks.every((check) => check.passed)).toBe(true);
  });

  it('weights sum to 100 when every optional check applies', () => {
    const result = auditHealthy({ document: buildSeoDocument(buildHealthyHtml({ withImage: true })) });
    const totalWeight = result.checks.reduce((total, check) => total + check.weight, 0);

    expect(totalWeight).toBe(100);
    expect(checkIds(result)).toContain('images-have-alt');
    expect(result.score).toBe(100);
  });

  it('reports the heading outline it analysed', () => {
    expect(auditHealthy().headings).toEqual([
      { level: 1, order: 0, text: 'Cat Food For Happy Pets' },
      { level: 2, order: 1, text: 'Why Our Cat Food Works' },
    ]);
  });
});

describe('auditSeo scoring table', () => {
  it('leaves the image check out entirely when the page has no images', () => {
    expect(checkIds(auditHealthy())).not.toContain('images-have-alt');
  });

  it('leaves the metadata checks out when the caller does not supply metadata', () => {
    // `undefined` means "this caller is not auditing metadata", which is a
    // different statement from `null` meaning "the field exists and is blank".
    const result = auditSeo({
      document: buildSeoDocument(buildHealthyHtml()),
      keyword: 'cat food',
    });

    expect(checkIds(result)).not.toContain('meta-title');
    expect(checkIds(result)).not.toContain('meta-description');
    expect(issueIds(result)).not.toContain('meta-title-missing');
    expect(result.score).toBe(100);
  });

  it('treats an explicitly null metadata field as blank rather than absent', () => {
    const result = auditHealthy({ metaTitle: null });

    expect(issueIds(result)).toContain('meta-title-missing');
    expect(result.checks.find((check) => check.id === 'meta-title')?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('leaves the keyphrase checks out when no keyphrase is set, and still scores the rest', () => {
    // A page is not penalised for opting out of keyphrase targeting; the
    // informational reminder is raised, but no weighted check depends on it.
    const result = auditHealthy({ keyword: null });

    expect(checkIds(result)).not.toContain('keyword-density');
    expect(issueIds(result)).toEqual(['keyword-missing']);
    expect(result.score).toBe(100);
  });

  it('fails the check that corresponds to each issue it raised', () => {
    const result = auditHealthy({
      document: buildSeoDocument(
        buildHealthyHtml().replace('<h2>Why Our Cat Food Works</h2>', '<h1>Why Our Cat Food Works</h1>')
      ),
    });

    expect(issueIds(result)).toContain('headings-multiple-h1');
    expect(result.checks.find((check) => check.id === 'headings-single-h1')?.passed).toBe(false);
    expect(result.score).toBeLessThan(100);
  });

  it('keeps the score and the checklist in agreement', () => {
    // The score is derived from the checks, which are derived from the issues,
    // so "no failing checks" and "score of 100" cannot come apart.
    for (const result of [auditHealthy(), auditHealthy({ metaTitle: null })]) {
      const allPassed = result.checks.every((check) => check.passed);
      expect(result.score === 100).toBe(allPassed);
    }
  });
});

describe('auditSeo content and image findings', () => {
  it('flags a thin page', () => {
    const result = auditSeo({
      document: buildSeoDocument('<h1>Hi there friend</h1><p>Short page.</p>'),
      keyword: 'hi there',
    });
    const thin = result.issues.find((issue) => issue.id === 'content-thin');

    expect(thin?.severity).toBe('warning');
    expect(thin?.fixable).toBe(true);
    expect(thin?.detail).toContain('5 words');
    expect(result.checks.find((check) => check.id === 'content-length')?.passed).toBe(false);
  });

  it('flags a blank alt but does not offer the prose rewrite as the fix', () => {
    const result = auditSeo({
      document: buildSeoDocument(
        `${buildHealthyHtml()}<img src="/a.png" alt=""><img src="/b.png" alt="Fine">`
      ),
      keyword: 'cat food',
    });
    const missingAlt = result.issues.find((issue) => issue.id === 'images-missing-alt');

    expect(missingAlt?.severity).toBe('warning');
    // Alt text has to describe the pixels, which is the media library's
    // vision-backed generator, not the body-copy rewrite behind "Fix with AI".
    expect(missingAlt?.fixable).toBe(false);
    expect(missingAlt?.detail).toContain('alt-text generator');
    expect(result.checks.find((check) => check.id === 'images-have-alt')?.passed).toBe(false);
  });
});

describe('auditSeo readability findings', () => {
  it('reports a very difficult page once, not twice', () => {
    const monstrous = new Array(60).fill('incomprehensibility').join(' ');
    const result = auditSeo({ document: buildSeoDocument(`<h1>Words</h1><p>${monstrous}.</p>`) });
    const reported = issueIds(result);

    expect(reported).toContain('readability-very-difficult');
    expect(reported).not.toContain('readability-difficult');
    expect(result.issues.find((issue) => issue.id === 'readability-very-difficult')?.severity).toBe(
      'error'
    );
    expect(result.checks.find((check) => check.id === 'readability-score')?.passed).toBe(false);
  });

  it('reports long sentences separately from the overall score', () => {
    const oneLongSentence = new Array(30).fill('cat').join(' ');
    const result = auditSeo({ document: buildSeoDocument(`<h1>Cats</h1><p>${oneLongSentence}.</p>`) });
    const reported = issueIds(result);

    expect(reported).toContain('readability-long-sentences');
    expect(reported).not.toContain('readability-very-difficult');
    expect(reported).not.toContain('readability-difficult');
  });
});

describe('auditSeo metadata findings', () => {
  it('flags a title that would be truncated in the search result', () => {
    const result = auditHealthy({ metaTitle: 'x'.repeat(61) });

    expect(issueIds(result)).toContain('meta-title-too-long');
    expect(result.issues.find((issue) => issue.id === 'meta-title-too-long')?.detail).toContain('61');
  });

  it('accepts a title that sits exactly on the limit', () => {
    expect(issueIds(auditHealthy({ metaTitle: 'x'.repeat(60) }))).toEqual([]);
  });

  it('flags a description that is too long or too short, but never both', () => {
    expect(issueIds(auditHealthy({ metaDescription: 'x'.repeat(161) }))).toEqual([
      'meta-description-too-long',
    ]);
    expect(issueIds(auditHealthy({ metaDescription: 'x'.repeat(69) }))).toEqual([
      'meta-description-too-short',
    ]);
    expect(issueIds(auditHealthy({ metaDescription: 'x'.repeat(70) }))).toEqual([]);
    expect(issueIds(auditHealthy({ metaDescription: 'x'.repeat(160) }))).toEqual([]);
  });

  it('reports a blank description as an error and a merely short one as information', () => {
    expect(auditHealthy({ metaDescription: '   ' }).issues[0]?.severity).toBe('error');
    expect(auditHealthy({ metaDescription: 'x'.repeat(69) }).issues[0]?.severity).toBe('info');
  });
});

describe('auditSeo issue ordering', () => {
  it('lists errors before warnings before information', () => {
    const result = auditSeo({
      document: buildSeoDocument('<h2>No h1 here</h2><h4>And a skip</h4><p>Tiny.</p>'),
      keyword: 'missing phrase',
      metaDescription: null,
      metaTitle: null,
    });

    const ranks = result.issues.map((issue) => SEVERITY_RANK[issue.severity]);

    expect(ranks.length).toBeGreaterThan(3);
    expect([...ranks].sort((left, right) => left - right)).toEqual(ranks);
    expect(result.scoreBand).toBe('poor');
  });
});

describe('auditSeo with text the readability formula cannot measure', () => {
  // A page in a non-Latin script exercises a genuinely awkward corner: Flesch is an
  // English formula, so the honest answer is "no opinion". Getting this wrong has
  // already happened twice in opposite directions — first a free 100 ("Very easy")
  // because the syllable counter stripped the text to nothing, then, once that was
  // fixed, an error-severity "very difficult to read" on perfectly good copy. The
  // assertions below pin the third and correct behaviour: say nothing, and score
  // only what was actually assessed.
  const japanese =
    '<h1>コーヒーの淹れ方</h1><p>コーヒーは世界中で愛されている飲み物です。' +
    '豆の挽き方と湯の温度が味を大きく左右します。毎朝の一杯が一日を始める合図になります。</p>';

  it('raises no readability issue for a non-Latin-script page', () => {
    const result = auditSeo({ document: buildSeoDocument(japanese) });

    expect(result.readability.grade).toBe('Not analysable');
    expect(result.issues.filter((issue) => issue.category === 'readability')).toEqual([]);
  });

  it('drops the readability checks from the score instead of passing them for free', () => {
    const result = auditSeo({ document: buildSeoDocument(japanese) });
    const checkIds = result.checks.map((check) => check.id);

    expect(checkIds).not.toContain('readability-score');
    expect(checkIds).not.toContain('readability-sentence-length');
    // Removed from the denominator entirely, so the remaining checks still make up
    // the whole of the score rather than 87% of it.
    expect(result.score).toBeGreaterThan(0);
    expect(result.score).toBeLessThanOrEqual(100);
  });

  it('still applies the readability checks to ordinary English prose', () => {
    const english =
      '<h1>How to brew coffee</h1><p>Coffee is a drink that people love. ' +
      'The grind and the water temperature change the taste a lot. A cup each morning starts the day.</p>';
    const result = auditSeo({ document: buildSeoDocument(english) });

    expect(result.readability.grade).not.toBe('Not analysable');
    expect(result.checks.map((check) => check.id)).toContain('readability-score');
  });
});

describe('auditSeo at block scope', () => {
  /**
   * One paragraph, exactly as a rich-text block in the middle of a page holds
   * it. Graded as a page it collects a pile of true-of-the-page-but-not-of-this
   * findings — no H1, thin content, keyphrase nowhere, metadata blank — none of
   * which the author can act on from inside this block, and every one of which
   * is the reason the scope exists.
   */
  const FRAGMENT = '<p>We ship every order fast and we pack it with care for your pet.</p>';

  const fragmentInput: SeoAuditInput = {
    document: buildSeoDocument(FRAGMENT),
    keyword: 'cat food',
    metaDescription: null,
    metaTitle: null,
  };

  it('reports every page-level failing as a page, which is the behaviour being scoped', () => {
    const asPage = auditSeo(fragmentInput);
    const reported = issueIds(asPage);

    expect(reported).toContain('headings-missing-h1');
    expect(reported).toContain('content-thin');
    expect(reported).toContain('meta-title-missing');
    expect(reported).toContain('keyword-density-low');
  });

  it('says none of it as a block, because none of it is a property a block has', () => {
    const asBlock = auditSeo({ ...fragmentInput, scope: 'block' });

    expect(asBlock.issues).toEqual([]);
  });

  it('drops those checks from the denominator rather than passing them for free', () => {
    const asBlock = auditSeo({ ...fragmentInput, scope: 'block' });
    const rows = checkIds(asBlock);

    for (const dropped of [
      'content-length',
      'headings-single-h1',
      'keyword-density',
      'keyword-early',
      'keyword-in-h1',
      'keyword-in-subheadings',
      'meta-description',
      'meta-title',
    ]) {
      expect(rows).not.toContain(dropped);
    }

    // What is left is exactly the four rows a block can influence, and their
    // weights are the same weights they carry on a page — 4 + 3 + 9 + 4 — so a
    // block's score is the same fraction of the same numbers over a smaller
    // table, not a separate scale that happens to end in 100.
    expect(rows).toEqual([
      'headings-sequential',
      'headings-have-text',
      'readability-score',
      'readability-sentence-length',
    ]);
    expect(asBlock.checks.reduce((total, check) => total + check.weight, 0)).toBe(20);
    expect(asBlock.score).toBe(100);
  });

  it('still reports the findings a block genuinely owns', () => {
    // A skipped level inside the block's own run of headings, an empty heading
    // and a blank alt are all defects of this fragment, fixable from inside it.
    const asBlock = auditSeo({
      document: buildSeoDocument(
        `<h2>Care</h2><h4>Deep</h4><h3></h3>${FRAGMENT}<img src="/a.png" alt="">`
      ),
      scope: 'block',
    });

    expect(issueIds(asBlock)).toEqual([
      'headings-skipped-level',
      'headings-empty',
      'images-missing-alt',
    ]);
    expect(checkIds(asBlock)).toContain('images-have-alt');
    expect(asBlock.score).toBeLessThan(100);
  });

  it('still declines to score readability it cannot measure', () => {
    // The scope filter and the "not analysable" filter are independent; a block
    // in a non-Latin script loses the readability rows on top of the page-level
    // ones rather than getting them back.
    const asBlock = auditSeo({
      document: buildSeoDocument('<p>コーヒーは世界中で愛されている飲み物です。豆の挽き方が味を左右します。</p>'),
      scope: 'block',
    });

    expect(checkIds(asBlock)).not.toContain('readability-score');
    expect(asBlock.issues).toEqual([]);
  });

  it('reports no keyphrase statistics, because a density is a share of a page', () => {
    const asBlock = auditSeo({ ...fragmentInput, scope: 'block' });

    expect(asBlock.keyword).toBeNull();
    expect(issueIds(asBlock)).not.toContain('keyword-missing');
    expect(auditSeo({ document: buildSeoDocument(''), scope: 'block' }).keyword).toBeNull();
  });

  it('still has something honest to say about an empty block', () => {
    const asBlock = auditSeo({ document: buildSeoDocument(''), scope: 'block' });

    expect(issueIds(asBlock)).toEqual(['content-empty']);
    expect(asBlock.score).toBe(0);
  });

  it('defaults to page scope so every caller written before scopes kept its behaviour', () => {
    expect(auditSeo(fragmentInput)).toEqual(auditSeo({ ...fragmentInput, scope: 'page' }));
  });
});

describe('describeSeoAuditScope', () => {
  it('names the checks a block score leaves out, so the number is not read as a verdict', () => {
    expect(describeSeoAuditScope('block')).toContain('this block');
    expect(describeSeoAuditScope('block')).toContain('H1');
    expect(describeSeoAuditScope('page')).toContain('whole page');
    expect(describeSeoAuditScope('block')).not.toBe(describeSeoAuditScope('page'));
  });
});
