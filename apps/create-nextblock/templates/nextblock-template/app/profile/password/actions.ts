'use server';

import { createClient } from '@nextblock-cms/db/server';
import { encodedRedirect } from '@nextblock-cms/utils/server';
import { redirect } from 'next/navigation';

export async function changePasswordAction(formData: FormData) {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    redirect('/profile');
  }

  const supabase = createClient();
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    redirect('/sign-in?redirect=%2Fprofile%2Fpassword');
  }

  const password = formData.get('password')?.toString() || '';
  const confirmPassword =
    formData.get('confirmPassword')?.toString() || '';

  if (!password || !confirmPassword) {
    return encodedRedirect(
      'error',
      '/profile/password',
      'password_update_failed'
    );
  }

  if (password !== confirmPassword) {
    return encodedRedirect(
      'error',
      '/profile/password',
      'passwords_do_not_match'
    );
  }

  const { error } = await supabase.auth.updateUser({
    password,
  });

  if (error) {
    return encodedRedirect(
      'error',
      '/profile/password',
      'password_update_failed'
    );
  }

  return encodedRedirect(
    'success',
    '/profile/password',
    'password_updated_success'
  );
}
