import { describe, expect, it } from 'vitest';

import {
  buildTranslationsCsvContent,
  deriveTranslationCategory,
  parseCsvRows,
  prepareTranslationCsvImport,
} from '../src/lib/translation-workspace';

describe('deriveTranslationCategory', () => {
  it('uses dotted namespaces before the first period', () => {
    expect(deriveTranslationCategory('auth.signup_success_title')).toBe('auth');
  });

  it('maps known snake case prefixes and falls back to general', () => {
    expect(deriveTranslationCategory('profile_password_title')).toBe('profile');
    expect(deriveTranslationCategory('github_username')).toBe('general');
  });
});

describe('CSV helpers', () => {
  it('exports escaped CSV values that can be parsed back correctly', () => {
    const csv = buildTranslationsCsvContent(
      [
        {
          key: 'checkout.note',
          translations: {
            en: 'Hello, "friend"\nNext line',
            fr: 'Bonjour',
          },
        },
      ],
      ['en', 'fr']
    );

    expect(parseCsvRows(csv)).toEqual([
      ['key', 'category', 'en', 'fr'],
      ['checkout.note', 'checkout', 'Hello, "friend"\nNext line', 'Bonjour'],
    ]);
  });

  it('rejects imports without the key header', () => {
    const result = prepareTranslationCsvImport({
      csvText: 'category,en\ncheckout,Hello',
      existingItems: [],
      languageCodes: ['en', 'fr'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('key column');
    }
  });

  it('rejects unknown headers', () => {
    const result = prepareTranslationCsvImport({
      csvText: 'key,unknown,en\ncheckout.note,value,Hello',
      existingItems: [],
      languageCodes: ['en', 'fr'],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toContain('Unknown CSV column');
    }
  });

  it('merges non-empty imported cells without clearing existing translations', () => {
    const result = prepareTranslationCsvImport({
      csvText: 'key,category,en,fr\ncheckout.note,checkout,,Salut',
      existingItems: [
        {
          key: 'checkout.note',
          translations: {
            en: 'Hello',
            fr: 'Bonjour',
          },
          created_at: null,
          updated_at: null,
        },
      ],
      languageCodes: ['en', 'fr'],
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.updatedCount).toBe(1);
      expect(result.updatedRows[0]?.translations).toEqual({
        en: 'Hello',
        fr: 'Salut',
      });
    }
  });
});
