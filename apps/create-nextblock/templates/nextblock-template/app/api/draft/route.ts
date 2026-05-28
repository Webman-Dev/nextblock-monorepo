import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { createVerificationClient } from "../../../lib/visual-editing/draft-content";
import {
  normalizeDraftRedirectPath,
  resolveDraftPathTarget,
  type DraftPathTarget,
} from "../../../lib/visual-editing/draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestedPath(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const explicitPath = searchParams.get("path") ?? searchParams.get("redirect");
  const slug = searchParams.get("slug");
  const parentType = searchParams.get("type");

  if (explicitPath) {
    return explicitPath;
  }

  if (slug) {
    if (parentType === "post") {
      return `/article/${slug}`;
    }

    if (parentType === "product") {
      return `/product/${slug}`;
    }

    return `/${slug}`;
  }

  return "/";
}

async function targetExists(target: DraftPathTarget) {
  const supabase = createVerificationClient() as any;
  const tableByType: Record<DraftPathTarget["parentType"], string> = {
    page: "pages",
    post: "posts",
    product: "products",
  };
  const table = tableByType[target.parentType];
  const { data, error } = await supabase
    .from(table)
    .select("id")
    .eq("slug", target.slug)
    .limit(1);

  return !error && Array.isArray(data) && data.length > 0;
}

export async function GET(request: NextRequest) {
  const configuredSecret = process.env.DRAFT_MODE_SECRET;

  if (!configuredSecret) {
    return NextResponse.json(
      { error: "Draft Mode is not configured." },
      { status: 500 }
    );
  }

  const providedSecret =
    request.nextUrl.searchParams.get("secret") ??
    request.nextUrl.searchParams.get("token");

  if (providedSecret !== configuredSecret) {
    return NextResponse.json({ error: "Invalid Draft Mode secret." }, { status: 401 });
  }

  const normalizedPath = normalizeDraftRedirectPath(getRequestedPath(request));
  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid draft redirect path." }, { status: 400 });
  }

  const target = resolveDraftPathTarget(normalizedPath);
  if (!target) {
    return NextResponse.json({ error: "Unsupported draft target path." }, { status: 400 });
  }

  if (!(await targetExists(target))) {
    return NextResponse.json({ error: "Draft target was not found." }, { status: 404 });
  }

  const draft = await draftMode();
  draft.enable();

  const response = NextResponse.redirect(new URL(target.path, request.url));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
