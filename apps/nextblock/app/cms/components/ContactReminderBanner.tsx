'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@nextblock-cms/ui';
import { MailWarning, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import type { ContactReminder } from '../../../lib/cms/contact-reminder';

/**
 * Shown when a contact form is addressed to a placeholder, or when nothing resolves to a
 * deliverable address at all.
 *
 * Worth interrupting for, because this failure is completely silent: the visitor is
 * thanked, the mail server accepts the message, and it goes to a reserved domain that can
 * never receive it. The messages are safely stored either way — the problem is that
 * nobody is being *told* they arrived.
 */
export default function ContactReminderBanner({ reminder }: { reminder: ContactReminder }) {
  const { isAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isAdmin || dismissed) return null;

  const { placeholderForms, noFallback } = reminder;
  const first = placeholderForms[0];

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
      <MailWarning className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          {placeholderForms.length > 0
            ? 'Your contact form is still using the example address.'
            : 'Nobody is being notified when someone contacts you.'}
        </p>
        <p className="text-xs opacity-90">
          {placeholderForms.length > 0 ? (
            <>
              &ldquo;{first?.label}&rdquo; sends to <strong>{first?.recipient}</strong>, a
              reserved address that can never receive mail
              {placeholderForms.length > 1
                ? ` (and ${placeholderForms.length - 1} other form${
                    placeholderForms.length > 2 ? 's' : ''
                  } like it)`
                : ''}
              . {noFallback ? 'No fallback address is set either. ' : ''}
              Messages are still saved under Messages — but no one is told they arrived.
            </>
          ) : (
            <>
              No contact address is configured anywhere, so notifications have nowhere to
              go. Messages are still saved under Messages — but no one is told they
              arrived.
            </>
          )}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm" variant="outline" className="border-amber-400">
          <Link href="/cms/messages">Set an address</Link>
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
