import { createClient, getProfileWithRoleServerSide } from "@nextblock-cms/db/server";
import { NextResponse } from "next/server";
import type { Database } from "@nextblock-cms/db";

export type UserRole = Database['public']['Enums']['user_role'];

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const origin = requestUrl.origin;
  const initialRedirectTo = requestUrl.searchParams.get("redirect_to")?.toString();
  const dashboardPath = "/cms/dashboard";
  const homePath = "/";

  if (code) {
    const supabase = await createClient();
    const { data: { user } , error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

    if (exchangeError) {
      console.error("Auth callback: Error exchanging code for session:", exchangeError.message);
      // Fallback: if initialRedirectTo is valid (not dashboard) use it, else home
      if (initialRedirectTo && initialRedirectTo !== dashboardPath && !initialRedirectTo.startsWith(dashboardPath + '/')) {
        return NextResponse.redirect(`${origin}${initialRedirectTo}`);
      }
      return NextResponse.redirect(`${origin}${homePath}`);
    }

    if (user) {
      const profile = await getProfileWithRoleServerSide(user.id);
      const role = profile?.role as UserRole | null;

      if (role === 'ADMIN' || role === 'WRITER') {
        return NextResponse.redirect(`${origin}${dashboardPath}`);
      } else {
        // For USER, null, or other roles:
        // Redirect to initialRedirectTo if it's present and NOT the dashboard.
        // Otherwise, redirect to the homepage.
        if (initialRedirectTo && initialRedirectTo !== dashboardPath && !initialRedirectTo.startsWith(dashboardPath + '/')) {
          return NextResponse.redirect(`${origin}${initialRedirectTo}`);
        }
        return NextResponse.redirect(`${origin}${homePath}`);
      }
    } else {
      // User object is null after successful exchange
      console.warn("Auth callback: User object is null after code exchange.");
      if (initialRedirectTo && initialRedirectTo !== dashboardPath && !initialRedirectTo.startsWith(dashboardPath + '/')) {
        return NextResponse.redirect(`${origin}${initialRedirectTo}`);
      }
      return NextResponse.redirect(`${origin}${homePath}`);
    }
  }

  // If no code parameter:
  if (initialRedirectTo && initialRedirectTo !== dashboardPath && !initialRedirectTo.startsWith(dashboardPath + '/')) {
    return NextResponse.redirect(`${origin}${initialRedirectTo}`);
  }
  return NextResponse.redirect(`${origin}${homePath}`);
}
