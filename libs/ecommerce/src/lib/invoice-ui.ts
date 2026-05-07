import type { InvoiceDocumentLabels } from './components/InvoiceDocument';
import type { InvoicePresentationData } from './invoice';

export type InvoiceTranslationFn = (
  key: string,
  params?: Record<string, string | number>
) => string;

export function translateOrFallback(
  t: InvoiceTranslationFn,
  key: string,
  fallback: string
) {
  const translated = t(key);
  return translated === key ? fallback : translated;
}

export function buildInvoiceDocumentLabels(
  t: InvoiceTranslationFn
): InvoiceDocumentLabels {
  return {
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
    discount: translateOrFallback(t, 'ecommerce.discount', 'Discount'),
    shipping: translateOrFallback(t, 'ecommerce.shipping', 'Shipping'),
    tax: translateOrFallback(t, 'ecommerce.tax', 'Tax'),
    total: translateOrFallback(t, 'ecommerce.total', 'Total'),
    taxBreakdown: translateOrFallback(t, 'tax_breakdown', 'Tax breakdown'),
    taxRegistrations: translateOrFallback(
      t,
      'tax_registrations',
      'Tax registrations'
    ),
  };
}

export function getInvoiceLocale(lang?: string | null) {
  return lang === 'fr' ? 'fr-CA' : 'en-US';
}

export function translateOrderStatus(
  status: string | null | undefined,
  t: InvoiceTranslationFn
) {
  if (!status) {
    return '';
  }

  const normalized = status.toLowerCase();

  switch (normalized) {
    case 'paid':
      return translateOrFallback(t, 'order_status_paid', 'Paid');
    case 'pending':
      return translateOrFallback(t, 'order_status_pending', 'Pending');
    case 'trial':
      return translateOrFallback(t, 'order_status_trial', 'Trial');
    case 'shipped':
      return translateOrFallback(t, 'order_status_shipped', 'Shipped');
    case 'cancelled':
      return translateOrFallback(t, 'order_status_cancelled', 'Cancelled');
    case 'refunded':
      return translateOrFallback(t, 'order_status_refunded', 'Refunded');
    default:
      return status;
  }
}

export function localizeInvoicePresentationData(
  invoice: InvoicePresentationData | null,
  t: InvoiceTranslationFn
) {
  if (!invoice) {
    return null;
  }

  return {
    ...invoice,
    order: {
      ...invoice.order,
      status: translateOrderStatus(invoice.order.status, t),
    },
  };
}
