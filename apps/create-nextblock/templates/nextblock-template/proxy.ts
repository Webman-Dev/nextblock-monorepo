import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';
import type { Database } from '@nextblock-cms/db';

type Profile = Database['public']['Tables']['profiles']['Row'];
type UserRole = Database['public']['Enums']['user_role'];

const LANGUAGE_COOKIE_KEY = 'NEXT_USER_LOCALE';
const DEFAULT_LOCALE = 'en';
const SUPPORTED_LOCALES = ['en', 'fr'];

const cmsRoutePermissions: Record<string, UserRole[]> = {
  '/cms': ['WRITER', 'ADMIN'],
  '/cms/admin': ['ADMIN'],
  '/cms/users': ['ADMIN'],
  '/cms/settings': ['ADMIN'],
};

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

export default async function proxy(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const nonce = crypto.randomUUID();
  requestHeaders.set('x-nonce', nonce);

  let response = NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error('Missing required Supabase environment variables');
  }

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
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
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/cms')) {
    if (userError || !user) {
      return NextResponse.redirect(
        new URL(`/sign-in?redirect=${pathname}`, request.url),
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
        return NextResponse.redirect(
          new URL('/unauthorized?error=profile_issue', request.url),
        );
      }

      const userRole = profile.role as UserRole;
      if (!requiredRoles.includes(userRole)) {
        console.warn(
          `Proxy: User ${user.id} (Role: ${userRole}) denied access to ${pathname}. Required: ${requiredRoles.join(' OR ')}. Redirecting to unauthorized.`,
        );
        return NextResponse.redirect(
          new URL(
            `/unauthorized?path=${pathname}&required=${requiredRoles.join(',')}`,
            request.url,
          ),
        );
      }
    }
  }

  if (response.headers.get('location')) {
    return response;
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

  finalResponse.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  finalResponse.headers.set('X-Frame-Options', 'SAMEORIGIN');
  finalResponse.headers.set('X-Content-Type-Options', 'nosniff');
  finalResponse.headers.set('Referrer-Policy', 'origin-when-cross-origin');
  finalResponse.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  finalResponse.headers.set('Cross-Origin-Opener-Policy', 'same-origin');

  if (process.env.NODE_ENV === 'production') {
    const nonceValue = requestHeaders.get('x-nonce');
    if (nonceValue) {
      const supabaseHostname = new URL(supabaseUrl).hostname;
      
      const r2BaseUrl = process.env.NEXT_PUBLIC_R2_BASE_URL;
      const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL;
      const r2BucketName = process.env.R2_BUCKET_NAME;

      let r2Hostnames = '';
      if (r2BaseUrl) {
         try {
           r2Hostnames += ` https://${new URL(r2BaseUrl).hostname}`;
         } catch (e) {
           console.error('Invalid NEXT_PUBLIC_R2_BASE_URL', e);
         }
      }
      if (r2PublicUrl && r2BucketName) {
         try {
           const publicHostname = new URL(r2PublicUrl).hostname;
           r2Hostnames += ` https://${r2BucketName}.${publicHostname}`;
         } catch (e) {
            console.error('Invalid NEXT_PUBLIC_R2_PUBLIC_URL', e);
         }
      }

      const csp = [
        "default-src 'self'",
        `script-src 'self' blob: data: 'nonce-${nonceValue}' https://vercel.live https://vercel.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.googletagmanager.com`,
        "style-src 'self' 'unsafe-inline' https://vercel.live https://vercel.com",
        `img-src 'self' data: blob:${r2Hostnames} https://vercel.live https://vercel.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.googletagmanager.com`,
        "font-src 'self' https://vercel.live https://assets.vercel.com",
        "object-src 'none'",
        `connect-src 'self' https://${supabaseHostname} wss://${supabaseHostname}${r2Hostnames} https://vercel.live https://vercel.com https://www.googletagmanager.com https://www.google-analytics.com https://analytics.google.com https://*.googletagmanager.com`,
        "frame-src 'self' blob: data: https://www.youtube.com https://vercel.live https://vercel.com",
        "form-action 'self'",
        "base-uri 'self'",
      ].join('; ');

      finalResponse.headers.set('Content-Security-Policy', csp);
    }
  }

  const responseForLogging = finalResponse.clone();
  const cacheStatus = responseForLogging.headers.get('x-vercel-cache') || 'none';

  if (!pathname.startsWith('/api/')) {
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
    '/((?!_next/static|_next/image|favicon.ico|auth/.*|sign-in|sign-up|forgot-password|unauthorized|api/auth/.*|api/revalidate|api/revalidate-log).*)',
    '/cms/:path*',
  ],
};
