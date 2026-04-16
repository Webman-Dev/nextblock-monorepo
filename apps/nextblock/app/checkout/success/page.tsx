'use client';

import {
  InvoiceDocument,
  type InvoiceDocumentLabels,
  type InvoicePresentationData,
  useCartStore,
} from '@nextblock-cms/ecommerce';
import { useTranslations } from '@nextblock-cms/utils';
import { Button } from '@nextblock-cms/ui';
import { CheckCircle2, Loader2, Printer } from 'lucide-react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { fulfillOrderAction } from './actions';

function translateOrFallback(
  t: (key: string, params?: Record<string, string | number>) => string,
  key: string,
  fallback: string
) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export default function CheckoutSuccessPage() {
  const { t, lang } = useTranslations();
  const clearCart = useCartStore((state) => state?.clearCart);
  const searchParams = useSearchParams();
  const sessionId = searchParams.get('session_id');
  const [invoice, setInvoice] = useState<InvoicePresentationData | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  const labels = useMemo<InvoiceDocumentLabels>(
    () => ({
      invoice: translateOrFallback(t, 'invoice', 'Invoice'),
      invoiceNumber: translateOrFallback(t, 'invoice_number', 'Invoice #'),
      orderNumber: translateOrFallback(t, 'order_number', 'Order #'),
      paidOn: translateOrFallback(t, 'paid_on', 'Paid on'),
      status: translateOrFallback(t, 'status', 'Status'),
      from: translateOrFallback(t, 'from', 'From'),
      billTo: translateOrFallback(t, 'bill_to', 'Bill to'),
      shipTo: translateOrFallback(t, 'ship_to', 'Ship to'),
      item: translateOrFallback(t, 'product', 'Item'),
      details: translateOrFallback(t, 'details', 'Details'),
      quantity: translateOrFallback(t, 'ecommerce.qty', 'Qty'),
      price: translateOrFallback(t, 'price', 'Price'),
      amount: translateOrFallback(t, 'amount', 'Amount'),
      subtotal: translateOrFallback(t, 'ecommerce.subtotal', 'Subtotal'),
      shipping: translateOrFallback(t, 'ecommerce.shipping', 'Shipping'),
      tax: translateOrFallback(t, 'ecommerce.tax', 'Tax'),
      total: translateOrFallback(t, 'ecommerce.total', 'Total'),
      taxBreakdown: translateOrFallback(t, 'tax_breakdown', 'Tax breakdown'),
      taxRegistrations: translateOrFallback(t, 'tax_registrations', 'Tax registrations'),
    }),
    [t]
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
    <>
      <style jsx global>{`
        @media print {
          @page {
            size: portrait;
            margin: 12mm;
          }

          body {
            background: white !important;
          }

          body * {
            visibility: hidden;
          }

          [data-print-invoice-root],
          [data-print-invoice-root] * {
            visibility: visible;
          }

          [data-print-invoice-root] {
            position: absolute;
            inset: 0;
            width: 100%;
            margin: 0;
            padding: 0;
          }
        }
      `}</style>

      <div className="mx-auto max-w-6xl px-4 py-10 md:px-6 print:max-w-none print:px-0 print:py-0">
      <div className="mb-6 flex flex-col gap-4 md:flex-row md:items-center md:justify-between print:hidden">
        <div className="flex items-center gap-4">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <CheckCircle2 className="h-8 w-8 text-emerald-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold">
              {translateOrFallback(t, 'ecommerce.checkout_successful', 'Payment received')}
            </h1>
            <p className="text-sm text-muted-foreground">
              {translateOrFallback(
                t,
                'print_invoice_help',
                'Use your browser print dialog to save this invoice as a PDF.'
              )}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={() => window.print()}
            disabled={!invoice}
          >
            <Printer className="mr-2 h-4 w-4" />
            {translateOrFallback(t, 'print_invoice', 'Print / Save as PDF')}
          </Button>
          <Button asChild>
            <Link href="/">{translateOrFallback(t, 'return_home', 'Return to Home')}</Link>
          </Button>
        </div>
      </div>

      {isSyncing ? (
        <div className="mb-6 flex items-center justify-center gap-3 rounded-2xl border bg-background px-5 py-4 text-sm text-muted-foreground print:hidden">
          <Loader2 className="h-4 w-4 animate-spin" />
          {translateOrFallback(
            t,
            'receipt_finalizing',
            'Finalizing your invoice and payment details...'
          )}
        </div>
      ) : null}

      {syncError ? (
        <div className="mb-6 rounded-2xl border border-amber-200 bg-amber-50 px-5 py-4 text-sm text-amber-700 print:hidden">
          {syncError}
        </div>
      ) : null}

      {invoice ? (
        <div data-print-invoice-root>
          <InvoiceDocument
            data={invoice}
            labels={labels}
            locale={lang === 'fr' ? 'fr-CA' : 'en-US'}
          />
        </div>
      ) : !isSyncing && !syncError ? (
        <div className="rounded-2xl border bg-background px-6 py-12 text-center text-muted-foreground print:hidden">
          {translateOrFallback(
            t,
            'receipt_not_ready',
            'Your invoice will appear here once the payment sync is complete.'
          )}
        </div>
      ) : null}
      </div>
    </>
  );
}
