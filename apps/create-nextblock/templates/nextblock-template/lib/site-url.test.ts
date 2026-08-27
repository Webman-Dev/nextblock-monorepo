import { afterEach, describe, expect, it } from 'vitest';

import { hasExplicitSiteUrl, isPubliclyRoutableSiteUrl } from './site-url';

/**
 * A real send looked successful end to end — SMTP2GO accepted it, Microsoft returned
 * "250 Queued mail for delivery" — and the message still never arrived. The cause was
 * the link inside it: `resolveSiteUrl()` falls back to http://localhost:3000 when
 * nothing is configured, so the reply carried a dead button under a "Re:" subject, which
 * reads as phishing and gets quarantined without a bounce.
 *
 * Anything that mails a link has to ask this question first.
 */

describe('isPubliclyRoutableSiteUrl', () => {
  it.each([
    'http://localhost:3000',
    'http://localhost:4200',
    'https://localhost',
    'http://127.0.0.1:3000',
    'http://[::1]:3000',
    'http://0.0.0.0:8080',
    'http://mymachine.local',
    'http://site.localhost:3000',
  ])('rejects the loopback address %s', (url) => {
    expect(isPubliclyRoutableSiteUrl(url)).toBe(false);
  });

  it.each([
    'http://10.0.0.5:3000',
    'http://192.168.1.20',
    'http://172.16.0.9',
    'http://172.31.255.254',
    'http://169.254.10.1',
  ])('rejects the private-network address %s', (url) => {
    expect(isPubliclyRoutableSiteUrl(url)).toBe(false);
  });

  it('rejects a bare hostname that only resolves on the local network', () => {
    expect(isPubliclyRoutableSiteUrl('http://intranet')).toBe(false);
  });

  it('rejects anything that is not a URL at all', () => {
    expect(isPubliclyRoutableSiteUrl('')).toBe(false);
    expect(isPubliclyRoutableSiteUrl('not a url')).toBe(false);
    expect(isPubliclyRoutableSiteUrl('ftp://example.com')).toBe(false);
  });

  it.each([
    'https://nextblock.dev',
    'https://www.newrootsherbal.com',
    'https://shop.example.co.uk',
    'https://my-app.vercel.app',
    // 172.32 is outside the RFC1918 block, so it is a public address.
    'http://172.32.0.1',
  ])('accepts the publicly reachable address %s', (url) => {
    expect(isPubliclyRoutableSiteUrl(url)).toBe(true);
  });
});

describe('hasExplicitSiteUrl', () => {
  const original = process.env.NEXT_PUBLIC_URL;
  afterEach(() => {
    if (original === undefined) delete process.env.NEXT_PUBLIC_URL;
    else process.env.NEXT_PUBLIC_URL = original;
  });

  it('is false when nothing is configured, which is the case that must be refused', () => {
    delete process.env.NEXT_PUBLIC_URL;
    expect(hasExplicitSiteUrl()).toBe(false);
  });

  it('is true for a deliberately local address — testing on your own machine is valid', () => {
    process.env.NEXT_PUBLIC_URL = 'http://localhost:3000';
    expect(hasExplicitSiteUrl()).toBe(true);
    // Still not routable: the send is allowed, but the log says who can open it.
    expect(isPubliclyRoutableSiteUrl('http://localhost:3000')).toBe(false);
  });

  it('is true for a real public URL', () => {
    process.env.NEXT_PUBLIC_URL = 'https://nextblock.dev';
    expect(hasExplicitSiteUrl()).toBe(true);
  });

  it('treats whitespace as unset rather than as a choice', () => {
    process.env.NEXT_PUBLIC_URL = '   ';
    expect(hasExplicitSiteUrl()).toBe(false);
  });
});
