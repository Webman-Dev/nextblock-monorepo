import { describe, expect, it } from 'vitest';
import {
  buildRedirectIndex,
  isExternalDestination,
  matchRedirect,
  normalizeRedirectPath,
  validateRedirectRule,
  wouldCreateLoop,
} from './redirects';
import type { RedirectRule } from './redirects';

function rule(overrides: Partial<RedirectRule> & Pick<RedirectRule, 'id'>): RedirectRule {
  return {
    destinationPath: '/new',
    isActive: true,
    sourcePath: '/old',
    statusCode: 301,
    ...overrides,
  };
}

/** A chain longer than the hop budget, none of whose links returns to the start. */
function longChain(length: number): RedirectRule[] {
  return Array.from({ length }, (_unused, index) =>
    rule({
      destinationPath: `/h${index + 1}`,
      id: `h${index}`,
      sourcePath: `/h${index}`,
    })
  );
}

describe('normalizeRedirectPath', () => {
  it('treats blank input as the site root', () => {
    expect(normalizeRedirectPath('')).toBe('/');
    expect(normalizeRedirectPath('   ')).toBe('/');
  });

  it('adds a leading slash and collapses repeated ones', () => {
    expect(normalizeRedirectPath('foo')).toBe('/foo');
    expect(normalizeRedirectPath('/foo//bar')).toBe('/foo/bar');
    expect(normalizeRedirectPath('///')).toBe('/');
  });

  it('strips a trailing slash except at the root', () => {
    expect(normalizeRedirectPath('/foo/')).toBe('/foo');
    expect(normalizeRedirectPath('/foo/bar//')).toBe('/foo/bar');
    expect(normalizeRedirectPath('/')).toBe('/');
  });

  it('preserves case, because URL paths are case-sensitive', () => {
    expect(normalizeRedirectPath('/Foo/Bar')).toBe('/Foo/Bar');
  });

  it('drops both a fragment and a query string', () => {
    // Neither can ever reach the matcher. A browser does not send the fragment
    // to the server at all, and the proxy matches on a pathname, which by
    // definition holds no query string — so a rule keyed on one was a dead key
    // that sat in the admin table marked Active for ever. The old test asserted
    // the opposite, and asserted it about behaviour nothing could exercise.
    expect(normalizeRedirectPath('/foo#section')).toBe('/foo');
    expect(normalizeRedirectPath('/foo/?ref=news')).toBe('/foo');
    expect(normalizeRedirectPath('/foo?ref=news#section')).toBe('/foo');
  });

  it('returns an absolute URL untouched except for lowercasing its scheme', () => {
    // The path keeps its case, because rewriting somebody's target would corrupt
    // it; the scheme does not, because the database CHECK matches '^https://'
    // case-sensitively and would reject the pasted form with a raw error.
    expect(normalizeRedirectPath('https://example.com/a/')).toBe('https://example.com/a/');
    expect(normalizeRedirectPath('  http://example.com  ')).toBe('http://example.com');
    expect(normalizeRedirectPath('HTTPS://example.com/A')).toBe('https://example.com/A');
  });

  it('decodes a percent-encoded path so both sides of the system agree', () => {
    // `request.nextUrl.pathname` is always percent-encoded and the admin stores
    // the operator's decoded keystrokes, so without this the two sit in
    // different encoding spaces and the lookup silently misses for ever.
    expect(normalizeRedirectPath('/%C3%A0-propos')).toBe('/à-propos');
    expect(normalizeRedirectPath('/à-propos')).toBe('/à-propos');
    expect(normalizeRedirectPath('/my%20page')).toBe('/my page');
    expect(normalizeRedirectPath('/my page')).toBe('/my page');
  });

  it('falls back to the raw segment on a malformed escape rather than throwing', () => {
    // This runs in the proxy in front of every page, so a truncated escape has
    // to produce a miss, never a URIError and a 500.
    expect(() => normalizeRedirectPath('/%E0%A4%A')).not.toThrow();
    expect(normalizeRedirectPath('/%E0%A4%A')).toBe('/%E0%A4%A');
    expect(normalizeRedirectPath('/ok/%zz')).toBe('/ok/%zz');
  });

  it('leaves an encoded slash encoded, so it cannot invent a path segment', () => {
    // '%2F' is a literal slash inside one segment, not a separator; decoding it
    // would merge two genuinely distinct paths into one rule.
    expect(normalizeRedirectPath('/a%2Fb')).toBe('/a%2Fb');
    expect(normalizeRedirectPath('/a/b')).toBe('/a/b');
  });

  it('collapses a protocol-relative value into a site path, which is the safe direction', () => {
    expect(normalizeRedirectPath('//example.com/x')).toBe('/example.com/x');
  });
});

describe('isExternalDestination', () => {
  it('recognises absolute and protocol-relative destinations', () => {
    expect(isExternalDestination('https://example.com')).toBe(true);
    expect(isExternalDestination('HTTP://example.com')).toBe(true);
    expect(isExternalDestination('  //example.com/x  ')).toBe(true);
  });

  it('treats a site path as internal', () => {
    expect(isExternalDestination('/new')).toBe(false);
    expect(isExternalDestination('new')).toBe(false);
    expect(isExternalDestination('')).toBe(false);
  });
});

describe('buildRedirectIndex and matchRedirect', () => {
  const rules = [
    rule({ id: 'a', sourcePath: '/old-page/', destinationPath: '/new-page' }),
    rule({ id: 'b', sourcePath: '/paused', destinationPath: '/somewhere', isActive: false }),
  ];
  const index = buildRedirectIndex(rules);

  it('matches regardless of trailing-slash differences between rule and request', () => {
    expect(matchRedirect(index, '/old-page')?.id).toBe('a');
    expect(matchRedirect(index, '/old-page/')?.id).toBe('a');
    expect(matchRedirect(index, '//old-page//')?.id).toBe('a');
  });

  it('does not fire a paused rule', () => {
    expect(matchRedirect(index, '/paused')).toBeNull();
  });

  it('returns null for a path nothing covers', () => {
    expect(matchRedirect(index, '/untouched')).toBeNull();
  });

  it('keeps inactive rules in the index so validation can still see them', () => {
    expect(index.get('/paused')?.id).toBe('b');
    expect(index.size).toBe(2);
  });

  it('matches an encoded request against a rule stored in decoded form', () => {
    // This is the case that was verified by actually running it: the operator
    // types '/à-propos' in the admin, the browser sends '/%C3%A0-propos', and
    // before the fix the two never met.
    const accented = buildRedirectIndex([
      rule({ id: 'fr', sourcePath: '/à-propos', destinationPath: '/about' }),
    ]);

    expect(matchRedirect(accented, '/%C3%A0-propos')?.id).toBe('fr');
    expect(matchRedirect(accented, '/à-propos')?.id).toBe('fr');
  });

  it('matches in the other direction too, for a rule stored already encoded', () => {
    const encoded = buildRedirectIndex([
      rule({ id: 'fr', sourcePath: '/%C3%A0-propos', destinationPath: '/about' }),
    ]);

    expect(encoded.has('/à-propos')).toBe(true);
    expect(matchRedirect(encoded, '/à-propos')?.id).toBe('fr');
    expect(matchRedirect(encoded, '/%C3%A0-propos')?.id).toBe('fr');
  });

  it('matches a space however it was spelled', () => {
    const spaced = buildRedirectIndex([
      rule({ id: 'gap', sourcePath: '/my page', destinationPath: '/new' }),
    ]);

    expect(matchRedirect(spaced, '/my%20page')?.id).toBe('gap');
    expect(matchRedirect(spaced, '/my page')?.id).toBe('gap');
  });

  it('lets the first rule win when two share a source', () => {
    const duplicated = buildRedirectIndex([
      rule({ id: 'first', sourcePath: '/dupe', destinationPath: '/one' }),
      rule({ id: 'second', sourcePath: '/dupe/', destinationPath: '/two' }),
    ]);

    expect(duplicated.get('/dupe')?.id).toBe('first');
  });
});

describe('wouldCreateLoop', () => {
  it('catches a rule that points at itself', () => {
    expect(wouldCreateLoop([], '/a', '/a')).toBe(true);
    expect(wouldCreateLoop([], '/a/', '/a')).toBe(true);
  });

  it('catches a two-hop loop back to the source', () => {
    const rules = [rule({ id: 'b', sourcePath: '/b', destinationPath: '/a' })];

    expect(wouldCreateLoop(rules, '/a', '/b')).toBe(true);
  });

  it('catches a longer loop back to the source', () => {
    const rules = [
      rule({ id: 'b', sourcePath: '/b', destinationPath: '/c' }),
      rule({ id: 'c', sourcePath: '/c', destinationPath: '/a' }),
    ];

    expect(wouldCreateLoop(rules, '/a', '/b')).toBe(true);
  });

  it('allows a chain that terminates somewhere else', () => {
    const rules = [rule({ id: 'b', sourcePath: '/b', destinationPath: '/c' })];

    expect(wouldCreateLoop(rules, '/a', '/b')).toBe(false);
  });

  it('never reports a loop for a destination that leaves the site', () => {
    const rules = [rule({ id: 'b', sourcePath: '/b', destinationPath: '/a' })];

    expect(wouldCreateLoop(rules, '/a', 'https://example.com/a')).toBe(false);
    expect(wouldCreateLoop(rules, '/a', '//example.com/a')).toBe(false);
  });

  it('stops following a chain once it leaves the site', () => {
    const rules = [rule({ id: 'b', sourcePath: '/b', destinationPath: 'https://example.com/a' })];

    expect(wouldCreateLoop(rules, '/a', '/b')).toBe(false);
  });

  it('rejects a chain that outruns the hop budget even when it never returns', () => {
    // Browsers give up after a handful of redirects, so a chain this long is a
    // broken configuration whether or not it technically terminates.
    expect(wouldCreateLoop(longChain(15), '/start', '/h0')).toBe(true);
  });
});

describe('validateRedirectRule', () => {
  const existing = [
    rule({ id: 'r1', sourcePath: '/old', destinationPath: '/somewhere' }),
    rule({ id: 'r2', sourcePath: '/new', destinationPath: '/final' }),
  ];

  it('accepts a well-formed new rule', () => {
    expect(validateRedirectRule({ destinationPath: '/target', sourcePath: '/fresh' }, existing)).toEqual({
      ok: true,
    });
  });

  it('accepts an external destination', () => {
    expect(
      validateRedirectRule({ destinationPath: 'https://example.com', sourcePath: '/fresh' }, existing)
    ).toEqual({ ok: true });
  });

  it('rejects a blank source or destination', () => {
    const blankSource = validateRedirectRule({ destinationPath: '/x', sourcePath: '   ' }, existing);
    const blankDestination = validateRedirectRule({ destinationPath: '', sourcePath: '/x' }, existing);

    expect(blankSource.ok).toBe(false);
    expect(blankDestination.ok).toBe(false);
  });

  it('rejects a source that is not a path on this site', () => {
    for (const sourcePath of ['https://example.com/old', '//example.com/old', 'mailto:a@b.c']) {
      const result = validateRedirectRule({ destinationPath: '/x', sourcePath }, existing);

      expect(result.ok).toBe(false);
      expect(result.ok === false ? result.error : '').toContain('path on this site');
    }
  });

  it('rejects a source that does not start with a slash', () => {
    const result = validateRedirectRule({ destinationPath: '/x', sourcePath: 'old-page' }, existing);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('start with a slash');
  });

  it('rejects a rule whose source and destination normalise to the same path', () => {
    const result = validateRedirectRule({ destinationPath: '/fresh', sourcePath: '/fresh/' }, existing);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('itself');
  });

  it('rejects a duplicate source even when it is spelled differently', () => {
    const result = validateRedirectRule({ destinationPath: '/x', sourcePath: '/old/' }, existing);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('already handles /old');
  });

  it('lets a rule keep its own source while being edited in place', () => {
    expect(
      validateRedirectRule({ destinationPath: '/elsewhere', id: 'r1', sourcePath: '/old' }, existing)
    ).toEqual({ ok: true });
  });

  it('rejects a source carrying a query string instead of silently ignoring it', () => {
    // The proxy only ever sees a pathname, so a rule keyed '/index.php?page=about'
    // could never fire. Truncating it quietly would be a second rule the operator
    // did not ask for, so the engine says what it cannot do.
    const result = validateRedirectRule(
      { destinationPath: '/about', sourcePath: '/index.php?page=about' },
      existing
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('Query strings cannot be matched');
    expect(result.ok === false ? result.error : '').toContain('/index.php');
  });

  it('rejects a protocol-relative destination, which the CHECK would have let through', () => {
    // '//evil.com' satisfies the '^/' half of the destination CHECK, so it stored
    // happily and then threw "Invalid URL" in the proxy on every single request
    // to that source. Validation has to refuse what the constraint cannot.
    const result = validateRedirectRule(
      { destinationPath: '//evil.com', sourcePath: '/fresh' },
      existing
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toBe(
      'Use a full https:// URL to send visitors off this site.'
    );
  });

  it('rejects a non-https scheme here rather than letting Postgres say it', () => {
    for (const destinationPath of ['http://example.com', 'mailto:a@b.c', 'ftp://example.com']) {
      const result = validateRedirectRule({ destinationPath, sourcePath: '/fresh' }, existing);

      expect(result.ok).toBe(false);
      expect(result.ok === false ? result.error : '').toContain('must use https://');
    }
  });

  it('accepts an uppercase HTTPS scheme, which normalisation folds for the CHECK', () => {
    expect(
      validateRedirectRule({ destinationPath: 'HTTPS://example.com', sourcePath: '/fresh' }, existing)
    ).toEqual({ ok: true });
    expect(normalizeRedirectPath('HTTPS://example.com')).toBe('https://example.com');
  });

  it('rejects a site destination that does not start with a slash', () => {
    // The other half of the same CHECK: with no scheme, the stored value must
    // start with '/', so accepting 'new-page' here only defers the failure.
    const result = validateRedirectRule(
      { destinationPath: 'new-page', sourcePath: '/fresh' },
      existing
    );

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('starting with a slash');
  });

  it('rejects a rule that would send visitors round in a loop', () => {
    // /new already points at /final, and r2 exists, so pointing /final back at
    // /new closes the circle.
    const result = validateRedirectRule({ destinationPath: '/new', sourcePath: '/final' }, existing);

    expect(result.ok).toBe(false);
    expect(result.ok === false ? result.error : '').toContain('loop');
  });
});
