import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { getCurrentUserCanEdit } from "../../../../lib/visual-editing/draft-content";
import {
  normalizeDraftRedirectPath,
  resolveDraftPathTarget,
  type DraftPathTarget,
} from "../../../../lib/visual-editing/draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestedPath(request: NextRequest) {
  return request.nextUrl.searchParams.get("path") ?? request.nextUrl.searchParams.get("redirect");
}

function redirectToSignIn(request: NextRequest, normalizedPath: string) {
  const retryUrl = new URL(request.nextUrl.pathname, request.url);
  retryUrl.searchParams.set("path", normalizedPath);

  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("redirect", `${retryUrl.pathname}${retryUrl.search}`);
  return redirectNoStore(signInUrl);
}

function redirectNoStore(url: URL) {
  const response = NextResponse.redirect(url);
  response.headers.set("Cache-Control", "no-store");
  return response;
}

async function targetExists(supabase: unknown, target: DraftPathTarget) {
  const tableByType: Record<DraftPathTarget["parentType"], string> = {
    page: "pages",
    post: "posts",
    product: "products",
  };
  const table = tableByType[target.parentType];
  const { data, error } = await (supabase as any)
    .from(table)
    .select("id")
    .eq("slug", target.slug)
    .maybeSingle();

  return !error && Boolean(data);
}

export async function GET(request: NextRequest) {
  const normalizedPath = normalizeDraftRedirectPath(getRequestedPath(request) ?? "/");

  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid draft redirect path." }, { status: 400 });
  }

  const target = resolveDraftPathTarget(normalizedPath);
  if (!target) {
    return NextResponse.json({ error: "Unsupported draft target path." }, { status: 400 });
  }

  const auth = await getCurrentUserCanEdit();
  if (!auth.user) {
    return redirectToSignIn(request, normalizedPath);
  }

  if (!auth.canEdit) {
    return NextResponse.json({ error: "You do not have permission to enter Draft Mode." }, { status: 403 });
  }

  if (!(await targetExists(auth.supabase, target))) {
    return NextResponse.json({ error: "Draft target was not found." }, { status: 404 });
  }

  const draft = await draftMode();
  draft.enable();

  return redirectNoStore(new URL(target.path, request.url));
}
