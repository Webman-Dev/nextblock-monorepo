import { describe, expect, it } from 'vitest';

import {
  EMAIL_BRAND_HEADER_TOKEN,
  applyEmailBranding,
  pickEmailLogoObjectKey,
  renderEmailBrandHeader,
} from './branding-format';

describe('renderEmailBrandHeader', () => {
  it('renders an email-safe logo img capped at width 150 when a logo is set', () => {
    const html = renderEmailBrandHeader({
      logoUrl: 'https://cdn.example.com/logo.png',
      siteName: 'Acme Co',
    });
    expect(html).toContain('<img');
    expect(html).toContain('src="https://cdn.example.com/logo.png"');
    expect(html).toContain('width="150"');
    expect(html).toContain('alt="Acme Co"');
    // width is also pinned in the inline style so clients that ignore the attribute obey it.
    expect(html).toContain('width:150px');
  });

  it('falls back to a text banner with the site name and no image when logo is null', () => {
    const html = renderEmailBrandHeader({ logoUrl: null, siteName: 'Acme Co' });
    expect(html).not.toContain('<img');
    expect(html).toContain('Acme Co');
  });

  it('falls back to the text banner when the logo url is an empty string', () => {
    const html = renderEmailBrandHeader({ logoUrl: '', siteName: 'Acme Co' });
    expect(html).not.toContain('<img');
    expect(html).toContain('Acme Co');
  });

  it('html-escapes the site name and logo url to prevent attribute/markup breakout', () => {
    const html = renderEmailBrandHeader({
      logoUrl: 'https://x.test/a"onerror="alert(1)',
      siteName: 'A & B "Co" <script>',
    });
    expect(html).toContain('A &amp; B &quot;Co&quot; &lt;script&gt;');
    expect(html).not.toContain('onerror="alert(1)"');
    expect(html).toContain('&quot;onerror=&quot;');
  });
});

describe('applyEmailBranding', () => {
  it('replaces the brand-header token with the rendered logo header', () => {
    const out = applyEmailBranding(`<div>${EMAIL_BRAND_HEADER_TOKEN}<p>Hi</p></div>`, {
      logoUrl: 'https://cdn.example.com/logo.png',
      siteName: 'Acme Co',
    });
    expect(out).not.toContain(EMAIL_BRAND_HEADER_TOKEN);
    expect(out).toContain('src="https://cdn.example.com/logo.png"');
    expect(out).toContain('<p>Hi</p>');
  });

  it('replaces every occurrence of the token', () => {
    const out = applyEmailBranding(
      `${EMAIL_BRAND_HEADER_TOKEN}|${EMAIL_BRAND_HEADER_TOKEN}`,
      { logoUrl: null, siteName: 'Acme Co' },
    );
    expect(out).not.toContain(EMAIL_BRAND_HEADER_TOKEN);
    expect(out.match(/Acme Co/g)?.length).toBe(2);
  });

  it('defensively swaps a stray hardcoded legacy NextBlock logo img for the tenant header', () => {
    const legacy =
      '<img src="https://nextblock.dev/images/nextblock-logo-small.webp" alt="Site logo" width="88" />';
    const out = applyEmailBranding(`<td>${legacy}</td>`, {
      logoUrl: 'https://cdn.example.com/logo.png',
      siteName: 'Acme Co',
    });
    expect(out).not.toContain('nextblock-logo-small.webp');
    expect(out).toContain('src="https://cdn.example.com/logo.png"');
  });

  it('swaps a stray legacy logo for the text banner when no tenant logo is set', () => {
    const legacy =
      '<img src="https://nextblock.dev/images/nextblock-logo-small.webp" alt="Site logo" width="88" />';
    const out = applyEmailBranding(legacy, { logoUrl: null, siteName: 'Acme Co' });
    expect(out).not.toContain('<img');
    expect(out).toContain('Acme Co');
  });

  it('leaves an unrelated body untouched', () => {
    const body = '<h2>New Form Submission</h2>';
    expect(applyEmailBranding(body, { logoUrl: null, siteName: 'Acme Co' })).toBe(body);
  });
});

describe('pickEmailLogoObjectKey', () => {
  it('prefers the original_uploaded variant over the AVIF object_key', () => {
    const media = {
      object_key: 'uploads/logo_original.avif',
      file_path: 'uploads/logo_original.avif',
      variants: [
        { objectKey: 'uploads/logo_large.avif', variantLabel: 'large_avif', fileType: 'image/avif' },
        { objectKey: 'uploads/logo.png', variantLabel: 'original_uploaded', fileType: 'image/png' },
        { objectKey: 'uploads/logo_original.avif', variantLabel: 'original_avif', fileType: 'image/avif' },
      ],
    };
    expect(pickEmailLogoObjectKey(media)).toBe('uploads/logo.png');
  });

  it('falls back to object_key when there is no original_uploaded variant (seeded default)', () => {
    const media = {
      object_key: 'images/nextblock-logo-small.webp',
      file_path: null,
      variants: null,
    };
    expect(pickEmailLogoObjectKey(media)).toBe('images/nextblock-logo-small.webp');
  });

  it('falls back to file_path when object_key is missing', () => {
    expect(
      pickEmailLogoObjectKey({ object_key: null, file_path: 'uploads/legacy.png', variants: [] }),
    ).toBe('uploads/legacy.png');
  });

  it('ignores an original_uploaded entry with a blank key and falls back', () => {
    const media = {
      object_key: 'uploads/logo_original.avif',
      variants: [{ objectKey: '', variantLabel: 'original_uploaded' }],
    };
    expect(pickEmailLogoObjectKey(media)).toBe('uploads/logo_original.avif');
  });

  it('returns null when there is no media', () => {
    expect(pickEmailLogoObjectKey(null)).toBeNull();
    expect(pickEmailLogoObjectKey(undefined)).toBeNull();
  });
});
