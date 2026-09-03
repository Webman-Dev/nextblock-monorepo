import { describe, expect, it } from 'vitest';
import {
  fetchActiveRedirects,
  isSchemaMissingError,
  isSelfRedirect,
  mapRedirectRow,
  resolveRedirectTarget,
  shouldSkipRedirectLookup,
  type RedirectQueryClient,
} from './redirect-store';

/**
 * Builds a stand-in for the two-call PostgREST chain this module uses
 * (`.from(table).select(columns).eq(column, value)` and then await).
 *
 * The fake resolves to whatever `result` says, which is how the three outcomes
 * that actually matter — a readable empty table, a read error, and a missing
 * table — get exercised without a database. It also records the table name and
 * the filter so a test can assert that the query really is scoped to active rows;
 * a lookup that forgot the `.eq` would still pass every other assertion here while
 * quietly publishing paused redirects in production.
 */
function createFakeSupabase(result: { data?: unknown; error?: unknown }): RedirectQueryClient & {
  calls: { columns: string; filters: Array<[string, unknown]>; table: string }[];
} {
  const calls: { columns: string; filters: Array<[string, unknown]>; table: string }[] = [];

  return {
    calls,
    from(table: string) {
      const call = { columns: '', filters: [] as Array<[string, unknown]>, table };
      calls.push(call);

      const builder = {
        eq(column: string, value: unknown) {
          call.filters.push([column, value]);
          return Promise.resolve(result);
        },
        select(columns: string) {
          call.columns = columns;
          return builder;
        },
      };

      return builder;
    },
  };
}

describe('mapRedirectRow', () => {
  it('maps a well-formed row onto the engine shape', () => {
    expect(
      mapRedirectRow({
        created_at: '2026-01-01T00:00:00Z',
        destination_path: '/new-page',
        id: 'a2b1c0d9-0000-4000-8000-000000000001',
        is_active: true,
        source_path: '/old-page',
        status_code: 302,
        updated_at: '2026-01-01T00:00:00Z',
      }),
    ).toEqual({
      destinationPath: '/new-page',
      id: 'a2b1c0d9-0000-4000-8000-000000000001',
      isActive: true,
      sourcePath: '/old-page',
      statusCode: 302,
    });
  });

  it('accepts an absolute https destination and an explicitly paused rule', () => {
    expect(
      mapRedirectRow({
        destination_path: 'https://example.com/moved',
        id: 'rule-2',
        is_active: false,
        source_path: '/gone',
        status_code: 301,
      }),
    ).toEqual({
      destinationPath: 'https://example.com/moved',
      id: 'rule-2',
      isActive: false,
      sourcePath: '/gone',
      statusCode: 301,
    });
  });

  it('returns null for anything that is not a usable row', () => {
    expect(mapRedirectRow(null)).toBeNull();
    expect(mapRedirectRow(undefined)).toBeNull();
    expect(mapRedirectRow('/old-page')).toBeNull();
    expect(mapRedirectRow(42)).toBeNull();
    // An array is an object in JavaScript, so it has to be rejected explicitly or
    // it would map to a rule with three undefined fields.
    expect(mapRedirectRow([])).toBeNull();
    expect(mapRedirectRow({})).toBeNull();
    // Each required field missing on its own, because dropping only one of these
    // checks is the mistake that would otherwise go unnoticed.
    expect(mapRedirectRow({ destination_path: '/new', source_path: '/old' })).toBeNull();
    expect(mapRedirectRow({ destination_path: '/new', id: 'r' })).toBeNull();
    expect(mapRedirectRow({ id: 'r', source_path: '/old' })).toBeNull();
    // Present but the wrong type, or present but blank: both are unusable.
    expect(mapRedirectRow({ destination_path: '/new', id: 7, source_path: '/old' })).toBeNull();
    expect(mapRedirectRow({ destination_path: '/new', id: 'r', source_path: '   ' })).toBeNull();
    expect(mapRedirectRow({ destination_path: '', id: 'r', source_path: '/old' })).toBeNull();
  });

  it('coerces an unexpected status_code to a permanent redirect rather than dropping the rule', () => {
    const base = { destination_path: '/new', id: 'r', source_path: '/old' };

    expect(mapRedirectRow({ ...base, status_code: 307 })?.statusCode).toBe(301);
    expect(mapRedirectRow({ ...base, status_code: 0 })?.statusCode).toBe(301);
    expect(mapRedirectRow({ ...base, status_code: null })?.statusCode).toBe(301);
    expect(mapRedirectRow({ ...base, status_code: 'nonsense' })?.statusCode).toBe(301);
    expect(mapRedirectRow({ ...base })?.statusCode).toBe(301);
    // A numeric string survives a jsonb/import round trip and must still mean 302.
    expect(mapRedirectRow({ ...base, status_code: '302' })?.statusCode).toBe(302);
  });

  it('treats a row with no is_active column as active, matching the column default', () => {
    expect(mapRedirectRow({ destination_path: '/new', id: 'r', source_path: '/old' })?.isActive).toBe(
      true,
    );
  });
});

describe('shouldSkipRedirectLookup', () => {
  it('skips every reserved namespace', () => {
    for (const prefix of [
      '/cms',
      '/api',
      '/_next',
      '/setup',
      '/auth',
      '/images',
      '/favicon',
      '/robots.txt',
      '/sitemap',
    ]) {
      expect(shouldSkipRedirectLookup(prefix)).toBe(true);
      expect(shouldSkipRedirectLookup(`${prefix}/nested/thing`)).toBe(true);
    }
  });

  it('skips anything whose last segment looks like a static asset', () => {
    expect(shouldSkipRedirectLookup('/favicon.ico')).toBe(true);
    expect(shouldSkipRedirectLookup('/site.webmanifest')).toBe(true);
    expect(shouldSkipRedirectLookup('/sitemap.xml')).toBe(true);
    expect(shouldSkipRedirectLookup('/assets/app.js.map')).toBe(true);
    expect(shouldSkipRedirectLookup('/media/photos/hero.png')).toBe(true);
  });

  it('does not skip ordinary content paths', () => {
    expect(shouldSkipRedirectLookup('/')).toBe(false);
    expect(shouldSkipRedirectLookup('/about')).toBe(false);
    expect(shouldSkipRedirectLookup('/article/hello-world')).toBe(false);
    expect(shouldSkipRedirectLookup('/product/commerce-license')).toBe(false);
    // A trailing slash leaves an empty last segment, which contains no dot.
    expect(shouldSkipRedirectLookup('/about/')).toBe(false);
  });

  it('still resolves redirects for legacy page URLs that carry a file extension', () => {
    // This is the regression that matters most for the whole feature. Migrating a
    // site onto NextBlock is the single most common reason to write a redirect at
    // all, and the URLs being migrated FROM are overwhelmingly `.html` / `.php` /
    // `.aspx`. An earlier version of this guard skipped any path whose last segment
    // contained a dot, which meant `/about-us.html -> /about` could be saved, would
    // appear in the admin list, and would then never fire — with nothing anywhere to
    // explain why. Page-ish extensions must stay redirectable.
    expect(shouldSkipRedirectLookup('/about-us.html')).toBe(false);
    expect(shouldSkipRedirectLookup('/index.htm')).toBe(false);
    expect(shouldSkipRedirectLookup('/products/detail.php')).toBe(false);
    expect(shouldSkipRedirectLookup('/Default.aspx')).toBe(false);
    expect(shouldSkipRedirectLookup('/legacy/page.jsp')).toBe(false);
    // A version-numbered slug is a plausible product URL, not an asset request.
    expect(shouldSkipRedirectLookup('/product/widget-2.0')).toBe(false);
    // An unrecognised extension is treated as content rather than guessed at.
    expect(shouldSkipRedirectLookup('/reports/q1.quux')).toBe(false);
  });

  it('matches asset extensions case-insensitively and ignores dotfile-ish edges', () => {
    expect(shouldSkipRedirectLookup('/media/HERO.PNG')).toBe(true);
    expect(shouldSkipRedirectLookup('/assets/App.Js')).toBe(true);
    // A trailing dot has no extension after it, so there is nothing to match.
    expect(shouldSkipRedirectLookup('/weird.')).toBe(false);
    // A leading dot is the whole segment, not an extension on a name.
    expect(shouldSkipRedirectLookup('/.well-known')).toBe(false);
  });

  it('matches reserved namespaces on a path boundary, not as a bare string prefix', () => {
    // These all start with a reserved prefix but are legitimate content URLs that
    // an operator must still be able to redirect.
    expect(shouldSkipRedirectLookup('/setup-guide')).toBe(false);
    expect(shouldSkipRedirectLookup('/images-of-our-team')).toBe(false);
    expect(shouldSkipRedirectLookup('/authors')).toBe(false);
    expect(shouldSkipRedirectLookup('/apis-we-support')).toBe(false);
    expect(shouldSkipRedirectLookup('/sitemaps-explained')).toBe(false);
  });

  it('skips an unusable path instead of trying to match it', () => {
    expect(shouldSkipRedirectLookup('')).toBe(true);
    expect(shouldSkipRedirectLookup(undefined as unknown as string)).toBe(true);
  });
});

describe('isSchemaMissingError', () => {
  it('recognises the two error codes that mean the table is absent', () => {
    expect(isSchemaMissingError({ code: '42P01' })).toBe(true);
    expect(isSchemaMissingError({ code: 'PGRST205' })).toBe(true);
  });

  it('recognises the message shapes PostgREST emits without a code', () => {
    expect(isSchemaMissingError({ message: 'relation "cms_redirects" does not exist' })).toBe(true);
    expect(
      isSchemaMissingError({ message: "Could not find the table 'public.cms_redirects'" }),
    ).toBe(true);
    expect(isSchemaMissingError({ message: 'Perhaps you meant to reload the schema cache' })).toBe(
      true,
    );
  });

  it('does not mistake an ordinary failure for a missing table', () => {
    expect(isSchemaMissingError(null)).toBe(false);
    expect(isSchemaMissingError(undefined)).toBe(false);
    expect(isSchemaMissingError({})).toBe(false);
    expect(isSchemaMissingError({ code: '57014', message: 'canceling statement due to timeout' })).toBe(
      false,
    );
    expect(isSchemaMissingError({ code: '42501', message: 'permission denied for table' })).toBe(
      false,
    );
  });
});

describe('fetchActiveRedirects', () => {
  it('queries only the active rows of cms_redirects', async () => {
    const supabase = createFakeSupabase({ data: [], error: null });
    await fetchActiveRedirects(supabase);

    expect(supabase.calls).toHaveLength(1);
    expect(supabase.calls[0].table).toBe('cms_redirects');
    expect(supabase.calls[0].filters).toEqual([['is_active', true]]);
  });

  it('returns an empty array when the table is readable but empty', async () => {
    // This is the case that must NOT be confused with a failure: it is a positive
    // answer the caller is entitled to cache for the full success TTL.
    await expect(fetchActiveRedirects(createFakeSupabase({ data: [], error: null }))).resolves.toEqual(
      [],
    );
  });

  it('returns the mapped rules and silently drops the malformed ones', async () => {
    const supabase = createFakeSupabase({
      data: [
        { destination_path: '/new', id: 'r1', is_active: true, source_path: '/old', status_code: 301 },
        { destination_path: '/nowhere' },
        null,
        { destination_path: '/b', id: 'r2', is_active: true, source_path: '/a', status_code: 302 },
      ],
      error: null,
    });

    await expect(fetchActiveRedirects(supabase)).resolves.toEqual([
      { destinationPath: '/new', id: 'r1', isActive: true, sourcePath: '/old', statusCode: 301 },
      { destinationPath: '/b', id: 'r2', isActive: true, sourcePath: '/a', statusCode: 302 },
    ]);
  });

  it('returns null when the read fails, so the caller can negative-cache', async () => {
    await expect(
      fetchActiveRedirects(
        createFakeSupabase({ data: null, error: { code: '57014', message: 'statement timeout' } }),
      ),
    ).resolves.toBeNull();
  });

  it('returns null when the table does not exist yet', async () => {
    // An install that has pulled the code but not run `npm run db:migrate`. This
    // has to be distinguishable from "no redirects", or the site would cache an
    // empty rule set and ignore the table for a full minute after it appeared.
    await expect(
      fetchActiveRedirects(
        createFakeSupabase({
          data: null,
          error: { code: '42P01', message: 'relation "public.cms_redirects" does not exist' },
        }),
      ),
    ).resolves.toBeNull();
  });

  it('returns null instead of throwing when the client itself blows up', async () => {
    const exploding: RedirectQueryClient = {
      from() {
        throw new Error('fetch failed');
      },
    };

    await expect(fetchActiveRedirects(exploding)).resolves.toBeNull();
  });

  it('returns null instead of throwing when the query rejects', async () => {
    const rejecting: RedirectQueryClient = {
      from() {
        return {
          select() {
            return { eq: () => Promise.reject(new Error('socket hang up')) };
          },
        };
      },
    };

    await expect(fetchActiveRedirects(rejecting)).resolves.toBeNull();
  });

  it('returns null when the driver hands back a non-array payload with no error', async () => {
    await expect(
      fetchActiveRedirects(createFakeSupabase({ data: null, error: null })),
    ).resolves.toBeNull();
  });
});

describe('isSelfRedirect', () => {
  it('catches the loop the database CHECK constraint cannot see', () => {
    // `source_path <> destination_path` passes for this pair, because the strings
    // differ; normalisation is what reveals it as a redirect to itself.
    expect(isSelfRedirect('/about', '/about/')).toBe(true);
    expect(isSelfRedirect('/about', '//about')).toBe(true);
    expect(isSelfRedirect('/about', '/about')).toBe(true);
  });

  it('leaves a genuine move alone', () => {
    expect(isSelfRedirect('/about', '/about-us')).toBe(false);
    expect(isSelfRedirect('/', '/home')).toBe(false);
  });
});

describe('resolveRedirectTarget', () => {
  const SITE = 'https://example.com';

  it('carries the incoming query onto a site-relative destination', () => {
    // The defect this test exists for: a visitor arriving from a newsletter was
    // forwarded with the campaign parameters stripped, so the move that redirects
    // are meant to rescue silently destroyed the attribution that justified it.
    expect(
      resolveRedirectTarget('/new-page', {
        search: '?utm_source=newsletter&utm_campaign=spring',
        url: `${SITE}/old-page?utm_source=newsletter&utm_campaign=spring`,
      })?.href,
    ).toBe(`${SITE}/new-page?utm_source=newsletter&utm_campaign=spring`);
  });

  it('carries a query whose meaning is the legacy URL itself', () => {
    // A pre-NextBlock URL frequently keeps its identity in the query rather than in
    // the path, and dropping it loses the only part that said which product it was.
    expect(
      resolveRedirectTarget('/products/widget', {
        search: '?id=42',
        url: `${SITE}/product.php?id=42`,
      })?.href,
    ).toBe(`${SITE}/products/widget?id=42`);
  });

  it('leaves a destination that defines its own query completely alone', () => {
    // The operator was explicit, so nothing is merged: a merge would build a URL
    // nobody wrote, and a key present on both sides has no defensible winner.
    expect(
      resolveRedirectTarget('/new-page?page=2', {
        search: '?page=7&utm_source=newsletter',
        url: `${SITE}/old-page?page=7&utm_source=newsletter`,
      })?.href,
    ).toBe(`${SITE}/new-page?page=2`);
  });

  it('changes nothing when the request carries no query', () => {
    expect(resolveRedirectTarget('/new-page', { search: '', url: `${SITE}/old-page` })?.href).toBe(
      `${SITE}/new-page`,
    );
  });

  it('resolves a relative destination against the request, so no origin is ever hard-coded', () => {
    // The same rule has to work on localhost, on a preview deployment and in
    // production without the operator writing a host anywhere.
    expect(
      resolveRedirectTarget('/new-page', {
        search: '?a=1',
        url: 'http://localhost:3000/old-page?a=1',
      })?.href,
    ).toBe('http://localhost:3000/new-page?a=1');
  });

  it('does not hand the visitor\u2019s query to an off-site destination', () => {
    // Deliberate: an inbound query is scoped to this site and routinely carries more
    // than campaign tags, and the same response already declares
    // Referrer-Policy: strict-origin-when-cross-origin, which is a standing decision
    // that another origin does not get this site's paths and query strings.
    expect(
      resolveRedirectTarget('https://partner.example.net/landing', {
        search: '?utm_source=newsletter&email=someone%40example.com',
        url: `${SITE}/old-page?utm_source=newsletter&email=someone%40example.com`,
      })?.href,
    ).toBe('https://partner.example.net/landing');
  });

  it('still honours a query the operator wrote into an off-site destination', () => {
    expect(
      resolveRedirectTarget('https://partner.example.net/landing?ref=nextblock', {
        search: '?utm_source=newsletter',
        url: `${SITE}/old-page?utm_source=newsletter`,
      })?.href,
    ).toBe('https://partner.example.net/landing?ref=nextblock');
  });

  it('treats an absolute URL on the site\u2019s own origin as internal', () => {
    // An operator who writes their own host out in full expects the same behaviour
    // as one who writes a bare path, so same-origin is decided by the resolved
    // target rather than by whether the stored string happens to start with https.
    expect(
      resolveRedirectTarget(`${SITE}/new-page`, {
        search: '?utm_source=newsletter',
        url: `${SITE}/old-page?utm_source=newsletter`,
      })?.href,
    ).toBe(`${SITE}/new-page?utm_source=newsletter`);
  });

  it('resolves a protocol-relative destination instead of throwing on it', () => {
    // `//partner.example.net/x` passes validateRedirectRule as an external
    // destination, but `new URL()` with no base rejects it. The proxy used to build
    // exactly that URL, so such a rule threw on every matching request and was
    // swallowed by the block-wide handler that also catches database failures --
    // a permanently broken rule logging an error forever. Resolving against the
    // request gives it the request's scheme, which is what a browser would do.
    const target = resolveRedirectTarget('//partner.example.net/landing', {
      search: '?utm_source=newsletter',
      url: `${SITE}/old-page?utm_source=newsletter`,
    });

    expect(target?.href).toBe('https://partner.example.net/landing');
    expect(target?.origin).toBe('https://partner.example.net');
  });

  it('keeps a destination fragment after the carried query', () => {
    expect(
      resolveRedirectTarget('/new-page#section', { search: '?a=1', url: `${SITE}/old-page?a=1` })
        ?.href,
    ).toBe(`${SITE}/new-page?a=1#section`);
  });

  it('returns null rather than throwing for a destination that cannot be a URL', () => {
    // Nothing in this module may throw: the only caller runs in front of every route
    // on the site, so an escaping exception is a 500 for the whole site at once.
    expect(resolveRedirectTarget('https://', { search: '', url: `${SITE}/old` })).toBeNull();
    expect(resolveRedirectTarget('', { search: '', url: `${SITE}/old` })).toBeNull();
    expect(resolveRedirectTarget('   ', { search: '', url: `${SITE}/old` })).toBeNull();
    expect(
      resolveRedirectTarget(undefined as unknown as string, { search: '', url: `${SITE}/old` }),
    ).toBeNull();
    expect(resolveRedirectTarget('/new', { search: '', url: 'not-a-url' })).toBeNull();
    expect(
      resolveRedirectTarget('/new', { search: undefined as unknown as string, url: `${SITE}/old` })
        ?.href,
    ).toBe(`${SITE}/new`);
  });

  it('cannot move the self-redirect guard by carrying a query', () => {
    // The guard compares pathnames, and URL.pathname never contains a query string.
    // A rule that differs from its source only by normalisation is still caught as
    // the browser-level infinite loop it is, query or no query.
    const target = resolveRedirectTarget('/about/', {
      search: '?ref=x',
      url: `${SITE}/about?ref=x`,
    });

    expect(target?.href).toBe(`${SITE}/about/?ref=x`);
    expect(target?.pathname).toBe('/about/');
    expect(isSelfRedirect('/about', target?.pathname ?? '')).toBe(true);
  });
});
