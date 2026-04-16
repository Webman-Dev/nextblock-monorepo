import { requireProfileAccountContext } from '../account-data';
import { PasswordSettingsPageClient } from './PasswordSettingsPageClient';

export default async function ProfilePasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ success?: string; error?: string }>;
}) {
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
