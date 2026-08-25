'use client';

import Link from 'next/link';
import { useState } from 'react';
import { Button } from '@nextblock-cms/ui';
import { CreditCard, X } from 'lucide-react';
import { useAuth } from '../../../context/AuthContext';
import type { PaymentsReminder } from '../../../lib/cms/payments-reminder';

/**
 * Shown when commerce is active but a payment provider isn't ready, so published
 * products cannot actually be bought. ADMIN-only: /cms/payments is an admin route, so a
 * WRITER would get a reminder they cannot act on. Dismissible for the session only —
 * this is a real revenue problem and should come back until it's fixed.
 */
export default function PaymentsReminderBanner({ reminder }: { reminder: PaymentsReminder }) {
  const { isAdmin } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isAdmin || dismissed) return null;

  const providerSummary = reminder.blocked
    .map(({ label, missing }) => (missing.length ? `${label} (missing: ${missing.join(', ')})` : label))
    .join(' and ');

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-amber-900 dark:border-amber-700/60 dark:bg-amber-900/20 dark:text-amber-200">
      <CreditCard className="mt-0.5 h-5 w-5 shrink-0" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">
          Your store can&rsquo;t take payments yet.
        </p>
        <p className="text-xs opacity-90">
          {providerSummary} still needs setting up.{' '}
          {reminder.affectedProducts > 0
            ? `${reminder.affectedProducts} published ${
                reminder.affectedProducts === 1 ? 'product' : 'products'
              } cannot be bought — visitors see a "Contact the seller" form instead of Add to cart.`
            : 'Products you publish will show visitors a "Contact the seller" form instead of Add to cart.'}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        <Button asChild size="sm" variant="outline" className="border-amber-400">
          <Link href="/cms/payments">Set up payments</Link>
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
