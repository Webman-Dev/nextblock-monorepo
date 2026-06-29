'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@nextblock-cms/ui';
import { ShieldAlert, X } from 'lucide-react';

/**
 * In-app reminder for staff (ADMIN/WRITER) who have not enrolled a second factor,
 * shown when the "Encourage staff to enable 2FA" policy is on. Dismissible for the
 * session (state lives in the persistent CMS layout, so it survives client-side
 * navigation but reappears on the next full load until 2FA is set up).
 */
export default function TwoFactorReminderBanner() {
  const [dismissed, setDismissed] = useState(false);
  if (dismissed) return null;

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
      <ShieldAlert className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Your account doesn&rsquo;t have two-factor authentication enabled.
        </p>
        <p className="text-xs opacity-90">
          Protect your CMS account by adding a second factor (authenticator app or email code).
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm" variant="outline" className="border-amber-400">
          <Link href="/cms/settings/security">Set up 2FA</Link>
        </Button>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setDismissed(true)}
          aria-label="Dismiss for now"
          className="h-8 w-8"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
