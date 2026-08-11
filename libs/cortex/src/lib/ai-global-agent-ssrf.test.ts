import { describe, expect, it } from 'vitest';

import { isBlockedFetchHost } from './ai-global-agent-tools';

/**
 * `fetch_url_content` performs server-side HTTP on a caller-supplied URL and is a
 * READ-scoped tool, so this blocklist is what stops a read-only MCP token from
 * reaching internal services or a cloud metadata endpoint. It shipped with an
 * IPv4-mapped IPv6 bypass (`http://[::ffff:127.0.0.1]/` reached loopback), so the
 * encodings are pinned here rather than trusted to review.
 *
 * The URL parser hands `hostname` over already normalised — brackets stripped for
 * IPv6, decimal/hex hosts converted to dotted-quad — so these inputs are the shapes
 * the function actually receives.
 */
describe('isBlockedFetchHost', () => {
  const blocked = [
    'localhost',
    'app.localhost',
    'printer.local',
    'db.internal',
    'metadata.google.internal',
    '127.0.0.1',
    '0.0.0.0',
    '10.0.0.5',
    '192.168.1.1',
    '172.16.0.1',
    '172.31.255.255',
    '169.254.169.254',
    '::1',
    '::',
    'fe80::1',
    'fd00::1',
    // IPv4-mapped IPv6, in both the dotted and the hextet form the parser produces.
    '::ffff:127.0.0.1',
    '::ffff:7f00:1',
    '::ffff:169.254.169.254',
    '::ffff:a9fe:a9fe',
    '::ffff:10.0.0.1',
    '::ffff:192.168.0.1',
    // Trailing dot and casing must not smuggle anything past.
    'LOCALHOST',
    'localhost.',
  ];

  const allowed = [
    'example.com',
    'newrootsherbal.com',
    'images.pexels.com',
    '8.8.8.8',
    '172.32.0.1', // just outside the 172.16/12 private range
    '172.15.0.1', // just below it
    '169.253.0.1', // adjacent to link-local, not in it
    '2606:4700::1111', // public IPv6
    '::ffff:8.8.8.8', // mapped, but a public address
  ];

  for (const host of blocked) {
    it(`blocks ${host}`, () => {
      expect(isBlockedFetchHost(host)).toBe(true);
    });
  }

  for (const host of allowed) {
    it(`allows ${host}`, () => {
      expect(isBlockedFetchHost(host)).toBe(false);
    });
  }
});
