import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserCanEdit } from "../../../lib/visual-editing/draft-content";
import {
  normalizeDraftRedirectPath,
  resolveDraftPathTarget,
  resolveRequestOrigin,
} from "../../../lib/visual-editing/draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Entry point behind the CMS "Preview" and "View Live" buttons.
 *
 * The public site carries no locale in its URLs: `/[slug]`, `/article/[slug]`,
 * `/product/[slug]` and `/` all resolve their language per-request from the
 * `NEXT_USER_LOCALE` cookie (see proxy.ts). A link built from the slug alone
 * therefore renders in whatever language the *editor's own* cookie says — which,
 * for an admin working in the CMS, is almost always the default one. Opening the
 * French version of a page landed you on the English one, three different ways:
 *
 *   1. `getPageDataBySlug(slug, cookieLocale)` prefers the row matching the
 *      cookie, so when two translations share a slug the cookie's language wins.
 *   2. `PageClientContent` / `PostClientContent` navigate to
 *      `translatedSlugs[currentLocale]` whenever the rendered row's language
 *      differs from the cookie — bouncing distinct French slugs back to English.
 *   3. `/` (the homepage) resolves its language from the cookie with no slug to
 *      go on at all, so the French homepage was unreachable by URL.
 *
 * Pinning the locale here fixes all three at once, because after the redirect the
 * cookie *agrees* with the content: the server picks the right row, the client
 * effect is a no-op, and the surrounding chrome (nav, footer, UI strings) renders
 * in the same language as the body — so the preview isn't lying about the page.
 *
 * The alternative, a `?lang=` param read by each route, would leave a second
 * cacheable variant of every public URL behind and can leak into shares and
 * search indexes as duplicate content. The redirect lands on the clean canonical
 * URL instead, and the param never reaches the public route.
 */

const LANGUAGE_COOKIE_KEY = "NEXT_USER_LOCALE";

function redirectNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

function redirectToSignIn(request: NextRequest, search: string) {
  const origin = resolveRequestOrigin(request);
  const signInUrl = new URL("/sign-in", origin);
  signInUrl.searchParams.set("redirect", `${request.nextUrl.pathname}${search}`);
  return redirectNoStore(signInUrl);
}

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const normalizedPath = normalizeDraftRedirectPath(params.get("path") ?? "/");

  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid path." }, { status: 400 });
  }

  const target = resolveDraftPathTarget(normalizedPath);
  if (!target) {
    return NextResponse.json({ error: "Unsupported target path." }, { status: 400 });
  }

  const wantsDraft = params.get("draft") === "1";

  const auth = await getCurrentUserCanEdit();
  if (!auth.user) {
    return redirectToSignIn(request, request.nextUrl.search);
  }
  if (!auth.canEdit) {
    return NextResponse.json(
      { error: "You do not have permission to preview content." },
      { status: 403 },
    );
  }

  // Only ever write a language the CMS actually has configured — the value lands
  // in a cookie every public request reads, so it must not be attacker-supplied.
  let locale: string | null = null;
  const requestedLang = params.get("lang")?.trim();
  if (requestedLang) {
    const { data: language } = await (auth.supabase as any)
      .from("languages")
      .select("code")
      .eq("code", requestedLang)
      .maybeSingle();
    locale = (language as { code?: string } | null)?.code ?? null;
  }

  if (wantsDraft) {
    const draft = await draftMode();
    draft.enable();
  }

  const response = redirectNoStore(new URL(target.path, resolveRequestOrigin(request)));

  if (locale) {
    // Session-scoped on purpose: previewing French shouldn't pin the editor's own
    // browsing language for a year. The proxy leaves a matching cookie alone, so
    // this survives the preview and expires with the browser session.
    response.cookies.set(LANGUAGE_COOKIE_KEY, locale, {
      path: "/",
      sameSite: "lax",
    });
  }

  return response;
}
