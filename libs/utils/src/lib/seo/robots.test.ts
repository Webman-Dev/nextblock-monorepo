import { describe, expect, it } from 'vitest';
import {
  DEFAULT_ROBOTS_SETTINGS,
  formatPathList,
  normalizeRobotsSettings,
  parsePathList,
} from './robots';

describe('DEFAULT_ROBOTS_SETTINGS', () => {
  it('describes a fully crawlable site', () => {
    expect(DEFAULT_ROBOTS_SETTINGS).toEqual({
      customRules: '',
      isIndexingEnabled: true,
      sitemapEnabled: true,
      userAgentRules: [{ allow: ['/'], disallow: [], userAgent: '*' }],
    });
  });
});

describe('normalizeRobotsSettings', () => {
  it('returns the defaults for anything that is not an object', () => {
    // The value comes out of a jsonb column and is read on the public
    // /robots.txt path, where a throw would hand a crawler a 500 and risk it
    // treating the whole site as disallowed.
    for (const garbage of [null, undefined, 'nonsense', 42, true, [], [1, 2, 3]]) {
      expect(normalizeRobotsSettings(garbage)).toEqual(DEFAULT_ROBOTS_SETTINGS);
    }
  });

  it('fills in every field a partial object omits', () => {
    expect(normalizeRobotsSettings({ isIndexingEnabled: false })).toEqual({
      customRules: '',
      isIndexingEnabled: false,
      sitemapEnabled: true,
      userAgentRules: [{ allow: ['/'], disallow: [], userAgent: '*' }],
    });
  });

  it('replaces wrongly-typed fields with their defaults', () => {
    expect(
      normalizeRobotsSettings({
        customRules: 42,
        isIndexingEnabled: 'yes',
        sitemapEnabled: null,
        userAgentRules: 'nope',
      })
    ).toEqual(DEFAULT_ROBOTS_SETTINGS);
  });

  it('does not rewrite the rules when indexing is switched off', () => {
    // Emitting the site-wide disallow is the caller's decision: the admin
    // preview still has to show the operator the rules they configured.
    const settings = normalizeRobotsSettings({
      isIndexingEnabled: false,
      userAgentRules: [{ allow: ['/'], disallow: ['/cms'], userAgent: '*' }],
    });

    expect(settings.isIndexingEnabled).toBe(false);
    expect(settings.userAgentRules).toEqual([{ allow: ['/'], disallow: ['/cms'], userAgent: '*' }]);
  });

  it('cleans up the entries inside a rule and drops the ones it cannot use', () => {
    const settings = normalizeRobotsSettings({
      userAgentRules: [
        null,
        7,
        { allow: ['/'], userAgent: '   ' },
        { allow: ['admin', ' /ok ', '', 7, '*.pdf'], disallow: 'not-an-array', userAgent: ' Googlebot ' },
      ],
    });

    expect(settings.userAgentRules).toEqual([
      { allow: ['/admin', '/ok', '*.pdf'], disallow: [], userAgent: 'Googlebot' },
    ]);
  });

  it('falls back to the default rules when every rule is unusable', () => {
    // A robots.txt with no User-agent block is meaningless rather than strict.
    expect(normalizeRobotsSettings({ userAgentRules: [null, { userAgent: '' }] }).userAgentRules).toEqual(
      DEFAULT_ROBOTS_SETTINGS.userAgentRules
    );
  });

  it('hands back a deep copy so a caller cannot mutate the shared defaults', () => {
    const settings = normalizeRobotsSettings(null);
    settings.userAgentRules.push({ allow: [], disallow: ['/'], userAgent: 'Evil' });
    settings.userAgentRules[0]?.allow.push('/mutated');

    expect(DEFAULT_ROBOTS_SETTINGS.userAgentRules).toEqual([
      { allow: ['/'], disallow: [], userAgent: '*' },
    ]);
    expect(normalizeRobotsSettings(null).userAgentRules).toHaveLength(1);
  });
});

describe('parsePathList', () => {
  it('splits on newlines and commas, trims and drops empties', () => {
    expect(parsePathList('/cms\n/api, /private\n\n  ,  ')).toEqual(['/cms', '/api', '/private']);
  });

  it('adds a leading slash where one is missing', () => {
    expect(parsePathList('admin\ncheckout')).toEqual(['/admin', '/checkout']);
  });

  it('leaves a wildcard pattern alone', () => {
    // Prefixing a slash onto *.pdf would change which URLs it matches.
    expect(parsePathList('*.pdf, /docs')).toEqual(['*.pdf', '/docs']);
  });

  it('returns nothing for blank or non-string input', () => {
    expect(parsePathList('')).toEqual([]);
    expect(parsePathList('   \n  ')).toEqual([]);
    expect(parsePathList(null as unknown as string)).toEqual([]);
  });
});

describe('formatPathList', () => {
  it('writes one path per line', () => {
    expect(formatPathList(['/cms', '/api'])).toBe('/cms\n/api');
  });

  it('drops blank and non-string entries so a round trip stays stable', () => {
    expect(formatPathList(['/cms', '', '  ', 9 as unknown as string, '/api'])).toBe('/cms\n/api');
    expect(parsePathList(formatPathList(parsePathList('admin\n/api, ')))).toEqual([
      '/admin',
      '/api',
    ]);
  });

  it('tolerates a non-array', () => {
    expect(formatPathList(null as unknown as string[])).toBe('');
  });
});
