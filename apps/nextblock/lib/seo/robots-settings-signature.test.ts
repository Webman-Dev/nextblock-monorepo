import { describe, expect, it } from 'vitest';
import type { RobotsSettings } from '@nextblock-cms/utils/seo';

import { robotsSettingsSignature } from './robots-settings-signature';

function settings(overrides: Partial<RobotsSettings> = {}): RobotsSettings {
  return {
    customRules: '',
    isIndexingEnabled: true,
    sitemapEnabled: true,
    userAgentRules: [{ allow: ['/'], disallow: ['/cms'], userAgent: '*' }],
    ...overrides,
  };
}

describe('robotsSettingsSignature', () => {
  it('matches for two structurally identical objects that are not the same object', () => {
    // This is the case that matters most: a server component hands down a brand-new object
    // on every render, and re-seeding the form on that would destroy in-progress typing.
    expect(robotsSettingsSignature(settings())).toBe(robotsSettingsSignature(settings()));
  });

  it('ignores the key order of the object literal it is handed', () => {
    const alphabetical = settings();
    const reordered = {
      userAgentRules: [{ userAgent: '*', disallow: ['/cms'], allow: ['/'] }],
      sitemapEnabled: true,
      isIndexingEnabled: true,
      customRules: '',
    } as RobotsSettings;

    expect(robotsSettingsSignature(reordered)).toBe(robotsSettingsSignature(alphabetical));
    // The old comparison this replaces was raw JSON.stringify, which does not.
    expect(JSON.stringify(reordered)).not.toBe(JSON.stringify(alphabetical));
  });

  it('changes when the server normalises a path the operator typed', () => {
    const typed = settings({ userAgentRules: [{ allow: ['/'], disallow: ['cms'], userAgent: '*' }] });
    const normalised = settings({
      userAgentRules: [{ allow: ['/'], disallow: ['/cms'], userAgent: '*' }],
    });

    expect(robotsSettingsSignature(typed)).not.toBe(robotsSettingsSignature(normalised));
  });

  it('changes when a rule is dropped, added, or emptied', () => {
    expect(robotsSettingsSignature(settings({ userAgentRules: [] }))).not.toBe(
      robotsSettingsSignature(settings())
    );
    expect(
      robotsSettingsSignature(
        settings({
          userAgentRules: [
            { allow: ['/'], disallow: ['/cms'], userAgent: '*' },
            { allow: [], disallow: ['/'], userAgent: 'GPTBot' },
          ],
        })
      )
    ).not.toBe(robotsSettingsSignature(settings()));
  });

  it('changes when only the order of the user-agent blocks differs', () => {
    const first = settings({
      userAgentRules: [
        { allow: [], disallow: ['/'], userAgent: 'GPTBot' },
        { allow: ['/'], disallow: [], userAgent: '*' },
      ],
    });
    const swapped = settings({
      userAgentRules: [
        { allow: ['/'], disallow: [], userAgent: '*' },
        { allow: [], disallow: ['/'], userAgent: 'GPTBot' },
      ],
    });

    expect(robotsSettingsSignature(first)).not.toBe(robotsSettingsSignature(swapped));
  });

  it('changes for each of the scalar fields', () => {
    expect(robotsSettingsSignature(settings({ customRules: '# hi' }))).not.toBe(
      robotsSettingsSignature(settings())
    );
    expect(robotsSettingsSignature(settings({ isIndexingEnabled: false }))).not.toBe(
      robotsSettingsSignature(settings())
    );
    expect(robotsSettingsSignature(settings({ sitemapEnabled: false }))).not.toBe(
      robotsSettingsSignature(settings())
    );
  });

  it('does not confuse an allow list with a disallow list of the same paths', () => {
    expect(
      robotsSettingsSignature(
        settings({ userAgentRules: [{ allow: ['/a'], disallow: [], userAgent: '*' }] })
      )
    ).not.toBe(
      robotsSettingsSignature(
        settings({ userAgentRules: [{ allow: [], disallow: ['/a'], userAgent: '*' }] })
      )
    );
  });
});
