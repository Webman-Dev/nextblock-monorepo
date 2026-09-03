import { describe, expect, it } from 'vitest';

import {
  CORTEX_AI_SEO_METADATA_LENGTH_BUDGETS,
  cortexAiSeoMetadataOutputSchema,
  extractJsonObject,
  truncateOnWordBoundary,
} from './ai-seo-metadata';

describe('truncateOnWordBoundary', () => {
  it('returns a value that already fits, untouched apart from surrounding whitespace', () => {
    expect(truncateOnWordBoundary('  Hiking boots for wet trails.  ', 60)).toBe(
      'Hiking boots for wet trails.'
    );
  });

  it('leaves a value that is exactly at the boundary alone, including its final period', () => {
    const exact = 'Twelve characters, and then some more.';

    expect(truncateOnWordBoundary(exact, exact.length)).toBe(exact);
    // One character under the budget is the first case that actually truncates, which
    // pins down that the comparison is inclusive rather than off by one.
    expect(truncateOnWordBoundary(exact, exact.length - 1)).toBe(
      'Twelve characters, and then some'
    );
  });

  it('cuts at the last whole word rather than mid-word', () => {
    // The 20-character window is "Waterproof hiking bo", so the partial "bo" has to go.
    const result = truncateOnWordBoundary('Waterproof hiking boots for wet trails', 20);

    expect(result).toBe('Waterproof hiking');
    expect(result.length).toBeLessThanOrEqual(20);
  });

  it('never leaves a dangling separator at the cut', () => {
    // A naive word-boundary cut here would end on the comma after "boots".
    expect(truncateOnWordBoundary('Waterproof boots, tested in rain', 18)).toBe(
      'Waterproof boots'
    );
    expect(truncateOnWordBoundary('Trail gear - reviewed by our team', 14)).toBe('Trail gear');
  });

  it('hard-cuts at the budget when the value contains no whitespace to break on', () => {
    // A German compound noun: there is no word boundary inside the budget, so the
    // only choices are an over-budget string, nothing at all, or a hard cut.
    const result = truncateOnWordBoundary('Donaudampfschiffahrtsgesellschaftskapitaen', 20);

    expect(result).toBe('Donaudampfschiffahrt');
    expect(result).toHaveLength(20);
  });

  it('strips a trailing slash left behind by a hard cut', () => {
    // The 21-character window is "supercalifragilistic/", which ends on a separator.
    expect(truncateOnWordBoundary('supercalifragilistic/expialidocious', 21)).toBe(
      'supercalifragilistic'
    );
  });

  it('returns an empty string for a non-positive budget', () => {
    expect(truncateOnWordBoundary('Anything at all', 0)).toBe('');
    expect(truncateOnWordBoundary('Anything at all', -10)).toBe('');
  });
});

describe('extractJsonObject', () => {
  it('returns a bare JSON object unchanged', () => {
    const json = '{"metaTitle":"Boots"}';

    expect(extractJsonObject(json)).toBe(json);
  });

  it('unwraps a fenced ```json block', () => {
    const response = ['```json', '{"metaTitle":"Boots","metaDescription":"Dry feet."}', '```'].join(
      '\n'
    );

    expect(extractJsonObject(response)).toBe(
      '{"metaTitle":"Boots","metaDescription":"Dry feet."}'
    );
  });

  it('skips a conversational prefix and a trailing explanation', () => {
    const response =
      'Sure! Here is the metadata:\n{"metaTitle":"Boots"}\nI kept the title under 60 characters.';

    expect(extractJsonObject(response)).toBe('{"metaTitle":"Boots"}');
  });

  it('keeps nested objects inside the outermost braces', () => {
    const response = 'Result: {"a":{"b":{"c":1}},"d":2} done';

    expect(extractJsonObject(response)).toBe('{"a":{"b":{"c":1}},"d":2}');
  });

  it('ignores braces that appear inside string values', () => {
    const response = '{"metaTitle":"Use {{ site.title }} in your theme","metaDescription":"}"}';

    expect(extractJsonObject(response)).toBe(response);
  });

  it('ignores an escaped quote inside a string value', () => {
    const response = '{"metaTitle":"The \\"best\\" boots {2026}"}';

    expect(extractJsonObject(response)).toBe(response);
  });

  it('returns null when the object never closes', () => {
    expect(extractJsonObject('{"metaTitle":"Boots","metaDescription":{"nested":1}')).toBeNull();
  });

  it('returns null when there is no object at all', () => {
    expect(extractJsonObject('I could not produce metadata for this page.')).toBeNull();
    expect(extractJsonObject('')).toBeNull();
  });
});

describe('cortexAiSeoMetadataOutputSchema', () => {
  it('trims every field and accepts a complete object', () => {
    expect(
      cortexAiSeoMetadataOutputSchema.parse({
        metaDescription: '  Dry feet on wet trails.  ',
        metaTitle: ' Waterproof Hiking Boots ',
        ogDescription: ' Tested over 200km. ',
        ogTitle: ' Boots that stay dry ',
      })
    ).toEqual({
      metaDescription: 'Dry feet on wet trails.',
      metaTitle: 'Waterproof Hiking Boots',
      ogDescription: 'Tested over 200km.',
      ogTitle: 'Boots that stay dry',
    });
  });

  it('rejects a whitespace-only field, a missing field, and an extra key', () => {
    const complete = {
      metaDescription: 'Dry feet.',
      metaTitle: 'Boots',
      ogDescription: 'Tested.',
      ogTitle: 'Boots',
    };

    expect(() =>
      cortexAiSeoMetadataOutputSchema.parse({ ...complete, metaDescription: '   ' })
    ).toThrow();
    expect(() =>
      cortexAiSeoMetadataOutputSchema.parse({ ...complete, ogTitle: undefined })
    ).toThrow();
    expect(() =>
      cortexAiSeoMetadataOutputSchema.parse({ ...complete, keywords: 'boots, hiking' })
    ).toThrow();
  });
});

describe('CORTEX_AI_SEO_METADATA_LENGTH_BUDGETS', () => {
  it('keeps every generated field inside the budget it is truncated against', () => {
    const overlongTitle =
      'The Definitive Field-Tested Guide To Choosing Waterproof Hiking Boots For Multi-Day Alpine Treks';

    for (const [field, budget] of Object.entries(CORTEX_AI_SEO_METADATA_LENGTH_BUDGETS)) {
      const truncated = truncateOnWordBoundary(overlongTitle, budget);

      expect(truncated.length, field).toBeLessThanOrEqual(budget);
      expect(truncated, field).not.toMatch(/[\s,;:-]$/);
    }
  });
});
