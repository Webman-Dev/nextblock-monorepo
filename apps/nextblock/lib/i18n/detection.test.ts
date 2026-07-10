import { describe, expect, it } from 'vitest';
import {
  DEFAULT_LANGUAGE_DETECTION_SETTINGS,
  detectLocaleFromBrowser,
  detectLocaleFromCountry,
  getCountryFromRequestHeaders,
  matchLocale,
  normalizeLanguageDetectionSettings,
  parseAcceptLanguage,
  resolveDetectedLocale,
} from './detection';

function headersOf(record: Record<string, string>) {
  const lower = Object.fromEntries(
    Object.entries(record).map(([key, value]) => [key.toLowerCase(), value]),
  );
  return { get: (name: string) => lower[name.toLowerCase()] ?? null };
}

describe('normalizeLanguageDetectionSettings', () => {
  it('returns defaults for absent or malformed values', () => {
    expect(normalizeLanguageDetectionSettings(null)).toEqual(DEFAULT_LANGUAGE_DETECTION_SETTINGS);
    expect(normalizeLanguageDetectionSettings(undefined)).toEqual(
      DEFAULT_LANGUAGE_DETECTION_SETTINGS,
    );
    expect(normalizeLanguageDetectionSettings('browser')).toEqual(
      DEFAULT_LANGUAGE_DETECTION_SETTINGS,
    );
    expect(normalizeLanguageDetectionSettings([])).toEqual(DEFAULT_LANGUAGE_DETECTION_SETTINGS);
  });

  it('keeps valid fields and coerces invalid ones individually', () => {
    expect(
      normalizeLanguageDetectionSettings({ mode: 'country', rememberVisitorChoice: false }),
    ).toEqual({ mode: 'country', rememberVisitorChoice: false });
    expect(
      normalizeLanguageDetectionSettings({ mode: 'ip-magic', rememberVisitorChoice: false }),
    ).toEqual({ mode: 'browser', rememberVisitorChoice: false });
    expect(
      normalizeLanguageDetectionSettings({ mode: 'default', rememberVisitorChoice: 'yes' }),
    ).toEqual({ mode: 'default', rememberVisitorChoice: true });
  });
});

describe('parseAcceptLanguage', () => {
  it('parses tags sorted by q-value with defaults', () => {
    expect(parseAcceptLanguage('fr-CH, fr;q=0.9, en;q=0.8, de;q=0.7')).toEqual([
      { tag: 'fr-ch', base: 'fr', quality: 1 },
      { tag: 'fr', base: 'fr', quality: 0.9 },
      { tag: 'en', base: 'en', quality: 0.8 },
      { tag: 'de', base: 'de', quality: 0.7 },
    ]);
  });

  it('drops wildcards, q=0 entries, and malformed tags', () => {
    expect(parseAcceptLanguage('*, en;q=0, <script>;q=1, fr')).toEqual([
      { tag: 'fr', base: 'fr', quality: 1 },
    ]);
  });

  it('handles empty and missing headers', () => {
    expect(parseAcceptLanguage(null)).toEqual([]);
    expect(parseAcceptLanguage('')).toEqual([]);
  });

  it('keeps original order among equal q-values', () => {
    expect(parseAcceptLanguage('es, pt').map((entry) => entry.tag)).toEqual(['es', 'pt']);
  });
});

describe('matchLocale', () => {
  it('prefers exact matches, case-insensitively', () => {
    expect(matchLocale(['fr-ca'], ['en', 'fr-CA'])).toBe('fr-CA');
  });

  it('falls back from a regional candidate to its base language', () => {
    expect(matchLocale(['fr-CA'], ['en', 'fr'])).toBe('fr');
  });

  it('matches a base candidate to a regional site code', () => {
    expect(matchLocale(['pt'], ['en', 'pt-BR'])).toBe('pt-BR');
  });

  it('respects candidate priority over match quality', () => {
    // First candidate only base-matches, but it still beats later exact matches.
    expect(matchLocale(['de-AT', 'en'], ['en', 'de'])).toBe('de');
  });

  it('returns null when nothing matches', () => {
    expect(matchLocale(['ja', 'ko'], ['en', 'fr'])).toBeNull();
    expect(matchLocale([], ['en'])).toBeNull();
    expect(matchLocale(['en'], [])).toBeNull();
  });
});

describe('detectLocaleFromBrowser', () => {
  it('uses q-value order against the site languages', () => {
    expect(detectLocaleFromBrowser('de;q=0.5, fr;q=0.9', ['en', 'fr', 'de'])).toBe('fr');
  });

  it('returns null without a usable header', () => {
    expect(detectLocaleFromBrowser(null, ['en'])).toBeNull();
    expect(detectLocaleFromBrowser('ja', ['en'])).toBeNull();
  });
});

describe('detectLocaleFromCountry', () => {
  it('maps countries to their primary languages in order', () => {
    expect(detectLocaleFromCountry('FR', ['en', 'fr'])).toBe('fr');
    expect(detectLocaleFromCountry('BR', ['en', 'pt'])).toBe('pt');
    // Belgium lists nl before fr; the site only offers fr.
    expect(detectLocaleFromCountry('BE', ['en', 'fr'])).toBe('fr');
    expect(detectLocaleFromCountry('be', ['nl', 'fr'])).toBe('nl');
  });

  it('returns null for unknown countries or unmatched languages', () => {
    expect(detectLocaleFromCountry('ZZ', ['en'])).toBeNull();
    expect(detectLocaleFromCountry('JP', ['en', 'fr'])).toBeNull();
    expect(detectLocaleFromCountry(null, ['en'])).toBeNull();
  });
});

describe('getCountryFromRequestHeaders', () => {
  it('reads host geo headers in precedence order', () => {
    expect(getCountryFromRequestHeaders(headersOf({ 'x-vercel-ip-country': 'CA' }))).toBe('CA');
    expect(getCountryFromRequestHeaders(headersOf({ 'cf-ipcountry': 'fr' }))).toBe('FR');
    expect(
      getCountryFromRequestHeaders(
        headersOf({ 'x-vercel-ip-country': 'DE', 'cf-ipcountry': 'US' }),
      ),
    ).toBe('DE');
    expect(getCountryFromRequestHeaders(headersOf({ 'cloudfront-viewer-country': 'JP' }))).toBe(
      'JP',
    );
    expect(getCountryFromRequestHeaders(headersOf({ 'x-country-code': 'BR' }))).toBe('BR');
  });

  it('rejects unknown-country sentinels and malformed values', () => {
    expect(getCountryFromRequestHeaders(headersOf({ 'cf-ipcountry': 'XX' }))).toBeNull();
    expect(getCountryFromRequestHeaders(headersOf({ 'cf-ipcountry': 'T1' }))).toBeNull();
    expect(getCountryFromRequestHeaders(headersOf({ 'x-country-code': 'USA' }))).toBeNull();
    expect(getCountryFromRequestHeaders(headersOf({}))).toBeNull();
  });
});

describe('resolveDetectedLocale', () => {
  const base = {
    acceptLanguage: 'fr-CA, en;q=0.5',
    countryCode: 'DE',
    availableCodes: ['en', 'fr', 'de'],
    defaultCode: 'en',
  };

  it('browser mode uses Accept-Language', () => {
    expect(resolveDetectedLocale({ ...base, mode: 'browser' })).toBe('fr');
  });

  it('country mode uses the geo country', () => {
    expect(resolveDetectedLocale({ ...base, mode: 'country' })).toBe('de');
  });

  it('browser_then_country prefers the browser and falls back to country', () => {
    expect(resolveDetectedLocale({ ...base, mode: 'browser_then_country' })).toBe('fr');
    expect(
      resolveDetectedLocale({
        ...base,
        mode: 'browser_then_country',
        acceptLanguage: 'ja',
      }),
    ).toBe('de');
  });

  it('default mode ignores all signals', () => {
    expect(resolveDetectedLocale({ ...base, mode: 'default' })).toBe('en');
  });

  it('always falls back to the default language when detection finds nothing', () => {
    expect(
      resolveDetectedLocale({
        mode: 'browser_then_country',
        acceptLanguage: 'ja',
        countryCode: 'JP',
        availableCodes: ['en', 'fr'],
        defaultCode: 'fr',
      }),
    ).toBe('fr');
    expect(
      resolveDetectedLocale({
        mode: 'country',
        acceptLanguage: null,
        countryCode: null,
        availableCodes: ['en'],
        defaultCode: 'en',
      }),
    ).toBe('en');
  });
});
