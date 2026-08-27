import { describe, expect, it } from 'vitest';

import {
  THREAD_TOKEN_PREFIX,
  mintThreadToken,
  hashThreadToken,
  parseThreadToken,
  secondsUntilExpiry,
  nextExpiry,
} from './thread-token';

/**
 * The pure half of the token module — the half that decides whether a value is worth a
 * database probe at all. Mirrors lib/visual-editing/draft-route.test.ts: test the parse
 * and normalise logic directly, leave the route handler alone.
 */

describe('parseThreadToken', () => {
  it('accepts a freshly minted token', () => {
    const { token } = mintThreadToken();
    expect(parseThreadToken(token)).toBe(token);
  });

  it('trims surrounding whitespace, which a mail client can introduce', () => {
    const { token } = mintThreadToken();
    expect(parseThreadToken(`  ${token}\n`)).toBe(token);
  });

  it.each([
    ['null', null],
    ['undefined', undefined],
    ['empty', ''],
    ['no prefix', 'abcdefghijklmnopqrstuvwxyz'],
    ['prefix only', THREAD_TOKEN_PREFIX],
    ['too short', `${THREAD_TOKEN_PREFIX}abc`],
    ['wrong prefix', 'nb_abcdefghijklmnopqrstuvwxyz'],
    ['sql-ish payload', `${THREAD_TOKEN_PREFIX}' OR 1=1 --`],
    ['path traversal', `${THREAD_TOKEN_PREFIX}../../etc/passwd`],
    ['non-string', 12345 as unknown as string],
  ])('rejects %s', (_label, input) => {
    expect(parseThreadToken(input as string)).toBeNull();
  });
});

describe('mintThreadToken', () => {
  it('never returns the same token twice', () => {
    const seen = new Set(Array.from({ length: 200 }, () => mintThreadToken().token));
    expect(seen.size).toBe(200);
  });

  it('carries enough entropy to make guessing infeasible', () => {
    const { token } = mintThreadToken();
    // 32 bytes base64url-encoded is 43 chars, plus the 4-char prefix.
    expect(token.length).toBeGreaterThanOrEqual(THREAD_TOKEN_PREFIX.length + 43);
  });

  it('returns the hash of its own token, not the token', () => {
    const { token, tokenHash } = mintThreadToken();
    expect(tokenHash).toBe(hashThreadToken(token));
    expect(tokenHash).not.toContain(token);
    expect(tokenHash).toMatch(/^[0-9a-f]{64}$/);
  });

  it('expires about 90 days out', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const { expiresAt } = mintThreadToken(now);
    const days = (new Date(expiresAt).getTime() - now.getTime()) / 86_400_000;
    expect(days).toBeCloseTo(90, 5);
  });
});

describe('secondsUntilExpiry', () => {
  const now = new Date('2026-01-01T00:00:00.000Z');

  it('measures the remaining window', () => {
    expect(secondsUntilExpiry('2026-01-01T01:00:00.000Z', now)).toBe(3600);
  });

  it('clamps an already-expired token to zero rather than a negative max-age', () => {
    expect(secondsUntilExpiry('2025-12-31T00:00:00.000Z', now)).toBe(0);
  });

  it('treats a missing expiry as expired', () => {
    expect(secondsUntilExpiry(null, now)).toBe(0);
  });
});

describe('nextExpiry', () => {
  it('extends the window from the given moment', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    expect(secondsUntilExpiry(nextExpiry(now), now)).toBe(90 * 24 * 60 * 60);
  });
});
