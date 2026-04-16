import { requireProfileAccountContext } from '../account-data';
import { PasswordSettingsPageClient } from './PasswordSettingsPageClient';
import { notFound } from 'next/navigation';

export default async function ProfilePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    notFound();
  }

  const { profile, user } = await requireProfileAccountContext(
    '/profile/password'
  );
  const params = await searchParams;

  return (
    <PasswordSettingsPageClient
      profile={profile}
      user={user}
      successMessage={params.success || null}
      errorMessage={params.error || null}
    />
  );
}
