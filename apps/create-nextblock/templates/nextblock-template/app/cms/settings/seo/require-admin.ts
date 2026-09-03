import { createClient } from '@nextblock-cms/db/server';

/**
 * Admin gate shared by the SEO settings server actions and by the page itself.
 *
 * Lives outside `actions.ts` because that file is `'use server'`, where every export
 * must itself be a valid server action — a helper that returns a Supabase client
 * cannot be exported from there. Keeping one copy matters more than the file count:
 * this is the check standing between a WRITER and the redirect table, and a redirect
 * rule is an open-redirect surface. Anyone who can write one can point every visitor
 * of `/checkout` at a phishing clone of the site, with the real domain in the
 * referrer, without touching a single page or post. The same reasoning is why
 * migration 00000000000030 grants writes on `cms_redirects` to ADMIN only and leaves
 * WRITER out entirely — the RLS policy is the boundary, and this is the friendly
 * error that keeps an operator from meeting it as an unexplained empty list.
 *
 * It throws rather than returning a result because its two kinds of caller want
 * opposite things. A Server Component wants the throw: an unauthorised visitor gets
 * the error boundary instead of a half-rendered admin screen. A server action called
 * from a client component wants a message it can render, so those callers catch the
 * throw and return it as data — see `requireAdminOrMessage` in `actions.ts` and the
 * note on `SettingsActionResult` about Next replacing uncaught Server Action error
 * messages with a generic string in production.
 */
export async function requireAdminSupabaseClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to manage SEO settings.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to manage SEO settings.');
  }

  return { supabase, userId: user.id };
}
