import { createClient } from '@nextblock-cms/db/server';

/**
 * Admin gate shared by the Messages server actions.
 *
 * Lives outside `actions.ts` because that file is `'use server'`, where every export
 * must itself be a valid server action — a helper returning a Supabase client cannot be
 * exported from there.
 *
 * This is the check standing between a WRITER and every private conversation on the
 * site: visitor names, addresses, and free text. RLS enforces the same rule
 * independently, so a bug here fails closed rather than open, but the redundancy is the
 * point.
 */
export async function requireAdminSupabaseClient() {
  const supabase = createClient();
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    throw new Error('You must be logged in to manage messages.');
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  if (profileError || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to manage messages.');
  }

  return { supabase, userId: user.id, fullName: profile.full_name as string | null };
}
