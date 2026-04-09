import { createClient, getProfileWithRoleServerSide } from "@nextblock-cms/db/server";
import { NextResponse } from "next/server";
import { resolvePostAuthRedirect } from "../../../lib/auth-redirects";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const initialRedirectTo = requestUrl.searchParams.get("redirect_to")?.toString();

  if (code) {
    const supabase = await createClient();
    const { data: { user } , error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback: Error exchanging code for session:", exchangeError.message);
      return NextResponse.redirect(`${origin}${initialRedirectTo || '/'}`);
    }

    if (user) {
      const profile = await getProfileWithRoleServerSide(user.id);
      const targetPath = resolvePostAuthRedirect(profile, initialRedirectTo);
      return NextResponse.redirect(`${origin}${targetPath}`);
    }

    console.warn("Auth callback: User object is null after code exchange.");
    return NextResponse.redirect(`${origin}/`);
  }

  return NextResponse.redirect(`${origin}${initialRedirectTo || '/'}`);
}
