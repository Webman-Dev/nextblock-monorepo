'use client';

import {
  InvoiceViewerShell,
  type InvoicePresentationData,
  buildInvoiceDocumentLabels,
  getInvoiceLocale,
  localizeInvoicePresentationData,
  translateOrFallback,
  useCartStore,
} from '@nextblock-cms/ecommerce';
import { useTranslations } from '@nextblock-cms/utils';
import { CheckCircle2 } from 'lucide-react';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { fulfillOrderAction } from './actions';

export default function CheckoutSuccessPage() {
  const { t, lang } = useTranslations();
  const clearCart = useCartStore((state) => state?.clearCart);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [invoice, setInvoice] = useState<InvoicePresentationData | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const labels = useMemo(() => buildInvoiceDocumentLabels(t), [t]);
  const localizedInvoice = useMemo(
    () => localizeInvoicePresentationData(invoice, t),
    [invoice, t]
  );

  useEffect(() => {
    async function finalizeOrder() {
      if (!sessionId) {
        return;
      }

      setIsSyncing(true);
      setSyncError(null);

      try {
        const result = await fulfillOrderAction(sessionId);

        if (!result.success) {
          setSyncError(
            result.error || 'We could not finalize your invoice yet. Please refresh shortly.'
          );
          return;
        }

        if (result.invoice) {
          setInvoice(result.invoice as InvoicePresentationData);
        }
      } finally {
        setIsSyncing(false);
      }
    }

    if (sessionId) {
      clearCart?.();
      void finalizeOrder();
    }
  }, [clearCart, sessionId]);

  return (
    <InvoiceViewerShell
      invoice={localizedInvoice}
      labels={labels}
      locale={getInvoiceLocale(lang)}
      title={translateOrFallback(
        t,
        'ecommerce.checkout_successful',
        'Payment received'
      )}
      description={translateOrFallback(
        t,
        'print_invoice_help',
        'Use your browser print dialog to save this invoice as a PDF.'
      )}
      printLabel={translateOrFallback(
        t,
        'print_invoice',
        'Print / Save as PDF'
      )}
      headerVisual={
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <CheckCircle2 className="h-8 w-8 text-emerald-600" />
        </div>
      }
      action={{
        href: '/',
        label: translateOrFallback(t, 'return_home', 'Return to Home'),
      }}
      loading={isSyncing}
      loadingMessage={translateOrFallback(
        t,
        'receipt_finalizing',
        'Finalizing your invoice and payment details...'
      )}
      error={syncError}
      emptyMessage={translateOrFallback(
        t,
        'receipt_not_ready',
        'Your invoice will appear here once the payment sync is complete.'
      )}
    />
  );
}
