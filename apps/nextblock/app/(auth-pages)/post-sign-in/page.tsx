import { createClient } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { resolvePostAuthRedirect } from '../../../lib/auth-redirects';

export default async function PostSignIn({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string }>;
}) {
  const params = await searchParams;
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/sign-in');
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, full_name')
    .eq('id', user.id)
    .single();

  redirect(resolvePostAuthRedirect(profile ?? null, params.redirect_to));
}
