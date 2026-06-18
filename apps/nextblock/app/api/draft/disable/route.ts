import { draftMode } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import {
  normalizeDraftRedirectPath,
  resolveRequestOrigin,
} from "../../../../lib/visual-editing/draft-route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function getRequestedPath(request: NextRequest) {
  return request.nextUrl.searchParams.get("path") ?? request.nextUrl.searchParams.get("redirect") ?? "/";
}

export async function GET(request: NextRequest) {
  const normalizedPath = normalizeDraftRedirectPath(getRequestedPath(request));

  if (!normalizedPath) {
    return NextResponse.json({ error: "Invalid draft redirect path." }, { status: 400 });
  }

  const draft = await draftMode();
  draft.disable();

  const response = NextResponse.redirect(new URL(normalizedPath, resolveRequestOrigin(request)));
  response.headers.set("Cache-Control", "no-store");
  return response;
}
