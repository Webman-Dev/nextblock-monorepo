import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@nextblock-cms/db';
import { resolveSupabaseAnonKey, resolveSupabaseUrl } from './lib/setup/env-status';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

const LANGUAGE_COOKIE_KEY = 'NEXT_USER_LOCALE';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'fr'];
const cacheLoggingEnabled = process.env.NEXTBLOCK_CACHE_LOGGING_ENABLED === 'true';

const cmsRoutePermissions: Record<string, UserRole[]> = {
  '/cms': ['WRITER', 'ADMIN'],
  '/cms/admin': ['ADMIN'],
  '/cms/users': ['ADMIN'],
  '/cms/settings': ['ADMIN'],
};

const securityHeaders = [
  ['X-DNS-Prefetch-Control', 'on'],
  ['Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload'],
  ['X-Frame-Options', 'SAMEORIGIN'],
  ['X-Content-Type-Options', 'nosniff'],
  ['Referrer-Policy', 'strict-origin-when-cross-origin'],
  ['Permissions-Policy', 'camera=(), microphone=(), geolocation=()'],
  ['Cross-Origin-Opener-Policy', 'same-origin'],
] as const;

function getRequiredRolesForPath(pathname: string): UserRole[] | null {
  const sortedPaths = Object.keys(cmsRoutePermissions).sort(
    (a, b) => b.length - a.length,
  );
  for (const specificPath of sortedPaths) {
    if (
      pathname === specificPath ||
      pathname.startsWith(specificPath + (specificPath === '/' ? '' : '/'))
    ) {
      return cmsRoutePermissions[specificPath];
    }
  }
  return null;
}

/**
 * Paths that must stay reachable while the instance is unprovisioned: the wizard,
 * its server actions/APIs, the auth callback, and framework internals. Everything
 * else is redirected to /setup until a first admin exists.
 */
function isSetupAllowlisted(pathname: string): boolean {
  return (
    pathname === '/setup' ||
    pathname.startsWith('/setup/') ||
    pathname.startsWith('/api/setup') ||
    pathname.startsWith('/auth/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    // Bundled public image assets (the site logo, marketing art). These are referenced by
    // the public chrome AND transactional-email templates, and the Next Image optimizer
    // fetches them server-side WITHOUT an auth cookie — so if the gate bounced them to
    // /setup the optimizer would receive a redirect instead of image bytes and the logo
    // would render broken ("isn't a valid image … received null"). Always serve them.
    pathname.startsWith('/images/') ||
    // Crawler-facing static routes: keep them reachable while unprovisioned so a fresh
    // deploy never redirects robots.txt / the sitemap to /setup (which would let crawlers
    // treat the wizard as the canonical entry point).
    pathname === '/robots.txt' ||
    pathname.startsWith('/sitemap')
  );
}

// Module-level cache for the "has the first admin been created?" flag. Middleware
// modules persist across requests in a worker, so this avoids a per-request DB hit.
let provisionedAdminCache: { value: boolean; expires: number } | null = null;

/**
 * A Supabase/PostgREST error that means the table itself is absent — i.e. the schema
 * was never applied. This is NOT a transient hiccup: it's the signature of a fresh,
 * unprovisioned deploy (env injected, migrations not yet run), so the caller treats it
 * as "no admin" and funnels traffic to /setup instead of failing open.
 * 42P01 = undefined_table (Postgres); PGRST205 = PostgREST "table not in schema cache".
 */
function isSchemaMissingError(error: { code?: string; message?: string } | null): boolean {
  if (!error) return false;
  const code = error.code ?? '';
  if (code === '42P01' || code === 'PGRST205') return true;
  const message = (error.message ?? '').toLowerCase();
  return (
    message.includes('does not exist') ||
    message.includes('schema cache') ||
    message.includes('could not find the table')
  );
}

/**
 * Returns true once the system has a first admin (site_settings.is_admin_created).
 * `is_admin_created` is a non-sensitive, anon-readable key, so the request-scoped
 * anon client can read it. Cached aggressively once true (it never reverts) and
 * briefly while false (so the gate releases promptly after the wizard runs).
 * A missing-schema error returns false (unprovisioned → /setup); any OTHER read error
 * fails open (returns true) so a transient hiccup never traps the whole site.
 */
async function hasProvisionedAdmin(supabase: SupabaseClient): Promise<boolean> {
  const now = Date.now();
  if (provisionedAdminCache && provisionedAdminCache.expires > now) {
    return provisionedAdminCache.value;
  }

  try {
    const { data, error } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'is_admin_created')
      .maybeSingle();

    if (error) {
      // Schema not applied yet → definitively unprovisioned: send traffic to /setup
      // (otherwise the homepage 404s on a fresh deploy because no content exists).
      if (isSchemaMissingError(error)) {
        provisionedAdminCache = { value: false, expires: now + 3_000 };
        return false;
      }
      return true;
    }

    const hasAdmin = data?.value === true || data?.value === 'true';
    // Cache "provisioned" for a long time (it never reverts); keep the unprovisioned
    // window short so the gate releases promptly once the wizard creates the admin.
    provisionedAdminCache = {
      value: hasAdmin,
      expires: now + (hasAdmin ? 10 * 60_000 : 3_000),
    };
    return hasAdmin;
  } catch {
    return true;
  }
}

function getHttpOrigin(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch (error) {
    console.error('Invalid URL used while building CSP sources', error);
  }

  return null;
}

function uniqueSources(sources: Array<string | null | undefined>): string[] {
  return Array.from(new Set(sources.filter(Boolean) as string[]));
}

function createDirective(name: string, sources: Array<string | null | undefined>): string {
  return `${name} ${uniqueSources(sources).join(' ')}`;
}

function getAssetSources(): string[] {
  const sources: string[] = [];
  const r2BaseOrigin = getHttpOrigin(process.env.NEXT_PUBLIC_R2_BASE_URL);
  const r2PublicOrigin = getHttpOrigin(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);

  if (r2BaseOrigin) {
    sources.push(r2BaseOrigin);
  }

  if (r2PublicOrigin) {
    sources.push(r2PublicOrigin);
  }

  if (r2PublicOrigin && process.env.R2_BUCKET_NAME) {
    const parsed = new URL(r2PublicOrigin);
    sources.push(`${parsed.protocol}//${process.env.R2_BUCKET_NAME}.${parsed.hostname}`);
  }

  return uniqueSources(sources);
}

function applySecurityHeaders(
  response: NextResponse,
  contentSecurityPolicy?: string | null,
): NextResponse {
  for (const [key, value] of securityHeaders) {
    response.headers.set(key, value);
  }

  if (contentSecurityPolicy) {
    response.headers.set('Content-Security-Policy', contentSecurityPolicy);
  }

  return response;
}

function createRedirectResponse(
  url: URL,
  contentSecurityPolicy?: string | null,
): NextResponse {
  return applySecurityHeaders(NextResponse.redirect(url), contentSecurityPolicy);
}

function createContentSecurityPolicy(nonceValue: string, supabaseUrl: string | undefined): string {
  const isDev = process.env.NODE_ENV !== 'production';
  // supabaseUrl is absent on an unconfigured instance (pre-/setup). Build the policy
  // without Supabase origins in that case — uniqueSources() drops the null entries.
  let supabaseOrigin: string | null = null;
  let supabaseRealtimeOrigin: string | null = null;
  if (supabaseUrl) {
    try {
      const parsedSupabaseUrl = new URL(supabaseUrl);
      supabaseOrigin = parsedSupabaseUrl.origin;
      supabaseRealtimeOrigin = `${parsedSupabaseUrl.protocol === 'https:' ? 'wss:' : 'ws:'}//${parsedSupabaseUrl.host}`;
    } catch {
      // malformed URL — treat as unconfigured for CSP purposes
    }
  }
  const assetSources = getAssetSources();

  const googleSources = [
    'https://www.googletagmanager.com',
    'https://*.googletagmanager.com',
    'https://www.google-analytics.com',
    'https://*.google-analytics.com',
    'https://analytics.google.com',
    'https://stats.g.doubleclick.net',
  ];

  const vercelSources = [
    'https://vercel.live',
    'https://vercel.com',
    'https://assets.vercel.com',
    'https://vitals.vercel-insights.com',
    'https://*.vercel-insights.com',
  ];
  const vercelToolbarConnectSources = ['wss://ws-us3.pusher.com'];
  const turnstileSources = ['https://challenges.cloudflare.com'];
  // Google reCAPTCHA: api.js is served from www.google.com, the widget worker from
  // www.gstatic.com, and the challenge/badge iframe + verification calls hit
  // www.google.com/recaptcha. Needed by both the bot-protected contact forms and
  // the signup page when the reCAPTCHA provider is selected.
  const recaptchaSources = ['https://www.google.com', 'https://www.gstatic.com'];

  const developmentHttpSources = isDev
    ? [
        'http://localhost:*',
        'https://localhost:*',
        'http://127.0.0.1:*',
      ]
    : [];
  const developmentConnectSources = isDev
    ? [
        ...developmentHttpSources,
        'ws://localhost:*',
        'wss://localhost:*',
        'ws://127.0.0.1:*',
      ]
    : [];

  const directives = [
    createDirective('default-src', ["'self'"]),
    createDirective(
      'script-src',
      isDev
        ? [
            "'self'",
            `'nonce-${nonceValue}'`,
            "'unsafe-inline'",
            "'unsafe-eval'",
            'blob:',
            'data:',
            ...vercelSources,
            ...turnstileSources,
            ...recaptchaSources,
            ...developmentHttpSources,
          ]
        : [
            "'self'",
            `'nonce-${nonceValue}'`,
            'blob:',
            ...googleSources,
            ...vercelSources,
            ...turnstileSources,
            ...recaptchaSources,
          ],
    ),
    createDirective('script-src-attr', ["'none'"]),
    createDirective('style-src', [
      "'self'",
      "'unsafe-inline'",
      'https://vercel.live',
      'https://vercel.com',
    ]),
    createDirective('img-src', [
      "'self'",
      'data:',
      'blob:',
      supabaseOrigin,
      ...assetSources,
      'https://checkout.freemius.com',
      ...googleSources,
      ...vercelSources,
      ...recaptchaSources,
      ...developmentHttpSources,
    ]),
    createDirective('font-src', [
      "'self'",
      'data:',
      'https://vercel.live',
      'https://assets.vercel.com',
    ]),
    createDirective('connect-src', [
      "'self'",
      supabaseOrigin,
      supabaseRealtimeOrigin,
      ...assetSources,
      ...googleSources,
      ...vercelSources,
      ...vercelToolbarConnectSources,
      ...turnstileSources,
      ...recaptchaSources,
      ...developmentConnectSources,
    ]),
    createDirective('frame-src', [
      "'self'",
      'blob:',
      'data:',
      'https://checkout.freemius.com',
      'https://www.youtube.com',
      'https://www.youtube-nocookie.com',
      'https://player.vimeo.com',
      'https://vercel.live',
      'https://vercel.com',
      ...turnstileSources,
      ...recaptchaSources,
    ]),
    createDirective('media-src', ["'self'", 'data:', 'blob:', supabaseOrigin, ...assetSources]),
    createDirective('worker-src', ["'self'", 'blob:']),
    createDirective('manifest-src', ["'self'"]),
    createDirective('object-src', ["'none'"]),
    createDirective('base-uri', ["'self'"]),
    createDirective('form-action', ["'self'"]),
    createDirective('frame-ancestors', ["'self'"]),
    isDev ? null : 'upgrade-insecure-requests',
  ];

  return directives.filter(Boolean).join('; ');
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  // Resolve Supabase creds under every alias the Vercel integration may inject (prefixed,
  // non-prefixed, and the new publishable key) so the gate doesn't bounce a configured
  // deploy to /setup just because the credentials arrived under a different name.
  const supabaseUrl = resolveSupabaseUrl();
  const supabaseAnonKey = resolveSupabaseAnonKey();
  const configured = Boolean(supabaseUrl && supabaseAnonKey);
  process.env.NEXTBLOCK_UNCONFIGURED = configured ? 'false' : 'true';

  const requestHeaders = new Headers(request.headers);
  const nonce = Buffer.from(crypto.randomUUID()).toString('base64');
  const contentSecurityPolicy = createContentSecurityPolicy(nonce, supabaseUrl);

  requestHeaders.set('x-nonce', nonce);
  requestHeaders.set('x-nextblock-path', pathname);
  if (contentSecurityPolicy) {
    requestHeaders.set('Content-Security-Policy', contentSecurityPolicy);
  }

  const allowlisted = isSetupAllowlisted(pathname);

  // First-boot setup gate (unconfigured): no Supabase env yet, so the browser /setup
  // wizard is the only thing that can run. Let allowlisted paths render with the
  // nonce/CSP applied; redirect everything else to /setup. No Supabase work happens.
  if (!configured) {
    if (allowlisted) {
      return applySecurityHeaders(
        NextResponse.next({ request: { headers: requestHeaders } }),
        contentSecurityPolicy,
      );
    }
    return createRedirectResponse(new URL('/setup', request.url), contentSecurityPolicy);
  }

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabase = createServerClient(supabaseUrl as string, supabaseAnonKey as string, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: '', ...options });
        response = NextResponse.next({ request: { headers: requestHeaders } });
        response.cookies.set({ name, value: '', ...options });
      },
    },
  });

  await supabase.auth.getSession();

  const cookieLocale = request.cookies.get(LANGUAGE_COOKIE_KEY)?.value;
  let currentLocale = cookieLocale;

  if (!currentLocale || !SUPPORTED_LOCALES.includes(currentLocale)) {
    currentLocale = DEFAULT_LOCALE;
  }

  requestHeaders.set('X-User-Locale', currentLocale);

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  // First-boot setup gate (configured but no admin yet, and nobody signed in): funnel
  // anonymous traffic to /setup so the wizard can create the first admin. A logged-in
  // user is proof the system is provisioned, so never gate them — this also prevents a
  // redirect loop in the moment right after the wizard signs the new admin in. Cached
  // + fail-open so a transient status error can't trap the whole site.
  if (!user && !allowlisted && !(await hasProvisionedAdmin(supabase))) {
    return createRedirectResponse(
      new URL('/setup', request.url),
      contentSecurityPolicy,
    );
  }

  if (pathname.startsWith('/cms')) {
    if (userError || !user) {
      return createRedirectResponse(
        new URL(`/sign-in?redirect=${pathname}`, request.url),
        contentSecurityPolicy,
      );
    }

    const requiredRoles = getRequiredRolesForPath(pathname);

    if (requiredRoles && requiredRoles.length > 0) {
      const {
        data: profile,
        error: profileError,
      } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single<Pick<Profile, 'role'>>();

      if (profileError || !profile) {
        console.error(
          `Proxy: Profile error for user ${user.id} accessing ${pathname}. Error: ${profileError?.message}. Redirecting to unauthorized.`,
        );
        return createRedirectResponse(
          new URL('/unauthorized?error=profile_issue', request.url),
          contentSecurityPolicy,
        );
      }

      const userRole = profile.role as UserRole;
      if (!requiredRoles.includes(userRole)) {
        console.warn(
          `Proxy: User ${user.id} (Role: ${userRole}) denied access to ${pathname}. Required: ${requiredRoles.join(' OR ')}. Redirecting to unauthorized.`,
        );
        return createRedirectResponse(
          new URL(
            `/unauthorized?path=${pathname}&required=${requiredRoles.join(',')}`,
            request.url,
          ),
          contentSecurityPolicy,
        );
      }
    }
  }

  if (
    user &&
    !pathname.startsWith('/cms') &&
    pathname !== '/profile' &&
    pathname !== '/profile/password' &&
    pathname !== '/checkout/success'
  ) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, full_name')
      .eq('id', user.id)
      .single<Pick<Profile, 'role' | 'full_name'>>();

    if (profile?.role === 'USER' && !profile.full_name?.trim()) {
      return createRedirectResponse(new URL('/profile', request.url), contentSecurityPolicy);
    }
  }

  if (response.headers.get('location')) {
    return applySecurityHeaders(response, contentSecurityPolicy);
  }

  const finalResponse = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  response.cookies.getAll().forEach((cookie) => {
    finalResponse.cookies.set(cookie.name, cookie.value, cookie);
  });

  if (request.cookies.get(LANGUAGE_COOKIE_KEY)?.value !== currentLocale) {
    finalResponse.cookies.set(LANGUAGE_COOKIE_KEY, currentLocale, {
      path: '/',
      maxAge: 31_536_000,
      sameSite: 'lax',
    });
  }

  if (
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    pathname === '/forgot-password'
  ) {
    finalResponse.headers.set('X-Page-Type', 'auth');
    finalResponse.headers.set('X-Prefetch-Priority', 'critical');
  } else if (pathname === '/') {
    finalResponse.headers.set('X-Page-Type', 'home');
    finalResponse.headers.set('X-Prefetch-Priority', 'high');
  } else if (pathname === '/articles') {
    finalResponse.headers.set('X-Page-Type', 'articles-index');
    finalResponse.headers.set('X-Prefetch-Priority', 'high');
  } else if (pathname.startsWith('/article/')) {
    finalResponse.headers.set('X-Page-Type', 'article');
    finalResponse.headers.set('X-Prefetch-Priority', 'medium');
  } else {
    const segments = pathname.split('/').filter(Boolean);
    if (segments.length === 1 && !pathname.startsWith('/cms')) {
      finalResponse.headers.set('X-Page-Type', 'dynamic-page');
      finalResponse.headers.set('X-Prefetch-Priority', 'medium');
    }
  }

  const acceptHeader = request.headers.get('accept');
  if (acceptHeader && acceptHeader.includes('text/html') && !pathname.startsWith('/api/')) {
    finalResponse.headers.set('Cache-Control', 'public, max-age=0, must-revalidate');
    finalResponse.headers.set('X-BFCache-Applied', 'true');
  }

  applySecurityHeaders(finalResponse, contentSecurityPolicy);

  if (cacheLoggingEnabled && !pathname.startsWith('/api/')) {
    const cacheStatus = finalResponse.headers.get('x-vercel-cache') || 'none';
    console.log(
      JSON.stringify({
        type: 'cache',
        status: cacheStatus,
        path: pathname,
      }),
    );
  }

  return finalResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|auth/.*|api/auth/.*|api/revalidate|api/revalidate-log).*)',
    '/cms/:path*',
  ],
};
