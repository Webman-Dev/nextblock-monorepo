import { redirect } from 'next/navigation';
import { createClient } from '@nextblock-cms/db/server';
import {
  evaluateTwoFactor,
  hasPendingEmailChallenge,
} from '../../../lib/auth/twoFactor';
import TwoFactorForm from './components/TwoFactorForm';

function safeRedirect(path?: string): string {
  return path && path.startsWith('/') && !path.startsWith('//') ? path : '/cms/dashboard';
}

export default async function TwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ redirect_to?: string }>;
}) {
  const params = await searchParams;
  const redirectTo = safeRedirect(params.redirect_to);

  const evaluation = await evaluateTwoFactor();
  const userId = evaluation.userId;
  if (!userId) {
    redirect('/sign-in');
  }
  // Already satisfied (or no MFA) -> straight through.
  if (evaluation.status === 'satisfied' || evaluation.status === 'not_required') {
    redirect(redirectTo);
  }

  const type = evaluation.status === 'totp_required' ? 'totp' : 'email';

  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pendingEmailCode =
    type === 'email' ? await hasPendingEmailChallenge(userId) : false;

  return (
    <div className="flex-1 flex flex-col w-full max-w-md mx-auto py-10">
      <TwoFactorForm
        type={type}
        email={user?.email ?? ''}
        redirectTo={redirectTo}
        pendingEmailCode={pendingEmailCode}
      />
    </div>
  );
}
