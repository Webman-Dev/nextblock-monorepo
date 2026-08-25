'use client';

import { useActionState, useState, useTransition } from 'react';
import { useFormStatus } from 'react-dom';
import { Button } from '@nextblock-cms/ui';
import { Input } from '@nextblock-cms/ui/input';
import {
  AlertTriangle,
  CheckCircle2,
  Loader2,
  Mail,
  MailWarning,
  RotateCcw,
} from 'lucide-react';
import { toast } from 'sonner';

import {
  saveStoreContactEmail,
  setInquiryResolved,
  type InquiryActionState,
} from './actions';

export interface InquiryRow {
  id: string;
  product_title: string | null;
  product_slug: string | null;
  sender_name: string;
  sender_email: string;
  message: string;
  email_delivered: boolean;
  is_resolved: boolean;
  created_at: string;
}

interface InquiriesClientProps {
  inquiries: InquiryRow[];
  storeContactEmail: string;
  /** Which source answered when no explicit address is set — shown so the admin knows. */
  resolvedFallback: { email: string | null; source: string };
  smtpConfigured: boolean;
}

const SOURCE_LABELS: Record<string, string> = {
  sandbox: 'the sandbox override',
  store_contact: 'the address set below',
  invoice: 'your invoice email',
  privacy: 'your support email',
  first_admin: "the first admin's login email",
  none: 'nowhere — no address could be resolved',
};

const INITIAL_STATE: InquiryActionState = { success: false, message: '' };

function SaveButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending}>
      {pending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save
    </Button>
  );
}

export default function InquiriesClient({
  inquiries,
  storeContactEmail,
  resolvedFallback,
  smtpConfigured,
}: InquiriesClientProps) {
  const [state, formAction] = useActionState(saveStoreContactEmail, INITIAL_STATE);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const toggleResolved = (inquiry: InquiryRow) => {
    setPendingId(inquiry.id);
    startTransition(async () => {
      const result = await setInquiryResolved(inquiry.id, !inquiry.is_resolved);
      setPendingId(null);
      if (result.success) toast.success(result.message);
      else toast.error(result.message);
    });
  };

  const open = inquiries.filter((inquiry) => !inquiry.is_resolved);
  const handled = inquiries.filter((inquiry) => inquiry.is_resolved);

  return (
    <div className="space-y-8">
      {/* Where enquiries go */}
      <section className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-base font-semibold">Where enquiries are sent</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Visitors never see this address. The form on your storefront posts to your server,
          which looks up where to deliver the message.
        </p>

        <form action={formAction} className="mt-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[260px] flex-1 space-y-1.5">
            <label
              htmlFor="contact_email"
              className="block text-xs font-semibold uppercase tracking-wider text-muted-foreground"
            >
              Seller contact email
            </label>
            <Input
              id="contact_email"
              name="contact_email"
              type="email"
              defaultValue={storeContactEmail}
              placeholder="sales@yourcompany.com"
            />
          </div>
          <SaveButton />
        </form>

        {state.message && (
          <p
            className={`mt-2 text-sm ${state.success ? 'text-emerald-600' : 'text-destructive'}`}
          >
            {state.message}
          </p>
        )}

        {!storeContactEmail && (
          <p className="mt-3 text-xs text-muted-foreground">
            Nothing set, so enquiries currently go to{' '}
            <strong>{SOURCE_LABELS[resolvedFallback.source] ?? resolvedFallback.source}</strong>.
          </p>
        )}

        {!smtpConfigured && (
          <div className="mt-4 flex items-start gap-3 rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />
            <span>
              Email sending isn&rsquo;t configured, so nobody is notified when an enquiry
              arrives — but every enquiry is still recorded on this page. Set up SMTP in
              CMS Settings → Configuration → Email to get notified.
            </span>
          </div>
        )}
      </section>

      {inquiries.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          No enquiries yet. These appear when a visitor asks about a product your store
          can&rsquo;t sell online yet.
        </p>
      ) : (
        <>
          <InquiryList
            title={`Open (${open.length})`}
            inquiries={open}
            pendingId={pendingId}
            onToggle={toggleResolved}
            emptyLabel="Nothing outstanding."
          />
          {handled.length > 0 && (
            <InquiryList
              title={`Handled (${handled.length})`}
              inquiries={handled}
              pendingId={pendingId}
              onToggle={toggleResolved}
            />
          )}
        </>
      )}
    </div>
  );
}

function InquiryList({
  title,
  inquiries,
  pendingId,
  onToggle,
  emptyLabel,
}: {
  title: string;
  inquiries: InquiryRow[];
  pendingId: string | null;
  onToggle: (inquiry: InquiryRow) => void;
  emptyLabel?: string;
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-semibold">{title}</h2>
      {inquiries.length === 0 && emptyLabel ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        inquiries.map((inquiry) => (
          <article
            key={inquiry.id}
            className={`rounded-lg border border-border bg-card p-4 ${
              inquiry.is_resolved ? 'opacity-70' : ''
            }`}
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  {inquiry.product_title ?? 'Deleted product'}
                </p>
                <p className="text-xs text-muted-foreground">
                  {inquiry.sender_name} &middot;{' '}
                  <a className="underline" href={`mailto:${inquiry.sender_email}`}>
                    {inquiry.sender_email}
                  </a>{' '}
                  &middot; {new Date(inquiry.created_at).toLocaleString()}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-2">
                {inquiry.email_delivered ? (
                  <span
                    className="flex items-center gap-1 text-xs text-muted-foreground"
                    title="You were emailed about this enquiry"
                  >
                    <Mail className="h-3.5 w-3.5" />
                    Emailed
                  </span>
                ) : (
                  <span
                    className="flex items-center gap-1 text-xs text-amber-600 dark:text-amber-400"
                    title="No notification was sent — this page is the only record"
                  >
                    <MailWarning className="h-3.5 w-3.5" />
                    Not emailed
                  </span>
                )}
                <Button
                  size="sm"
                  variant="outline"
                  disabled={pendingId === inquiry.id}
                  onClick={() => onToggle(inquiry)}
                >
                  {pendingId === inquiry.id ? (
                    <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                  ) : inquiry.is_resolved ? (
                    <RotateCcw className="mr-2 h-3.5 w-3.5" />
                  ) : (
                    <CheckCircle2 className="mr-2 h-3.5 w-3.5" />
                  )}
                  {inquiry.is_resolved ? 'Reopen' : 'Mark handled'}
                </Button>
              </div>
            </div>
            <p className="mt-3 whitespace-pre-wrap text-sm text-foreground">{inquiry.message}</p>
          </article>
        ))
      )}
    </section>
  );
}
