import { createClient } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';

import type {
  ProfileAccountSummary,
  ProfileAccountUser,
} from './account-types';

export async function requireProfileAccountContext(redirectTo: string) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?redirect=${encodeURIComponent(redirectTo)}`);
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, avatar_url, full_name, github_username')
    .eq('id', user.id)
    .maybeSingle();

  if (!profile) {
    redirect('/profile');
  }

  return {
    supabase,
    user: {
      id: user.id,
      email: user.email,
    } satisfies ProfileAccountUser,
    profile: profile satisfies ProfileAccountSummary,
  };
}
