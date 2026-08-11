import { createClient } from '@nextblock-cms/db/server';

/**
 * Admin gate shared by the Cortex AI settings server actions.
 *
 * Lives outside `actions.ts` because that file is `'use server'`, where every export
 * must itself be a valid server action — a helper returning a Supabase client cannot
 * be exported from there. Keeping one copy matters more than the file count: this is
 * the check standing between a WRITER and the OpenRouter key, the stock-photo keys,
 * and the MCP access tokens.
 */
export async function requireAdminSupabaseClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to manage Cortex AI settings.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to manage Cortex AI settings.');
  }

  return { supabase, userId: user.id };
}
