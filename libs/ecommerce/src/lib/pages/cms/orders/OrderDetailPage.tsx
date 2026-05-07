import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InvoiceViewerShell } from '../../../components/InvoiceViewerShell';
import { getInvoicePresentationData } from '../../../invoice-server';
import { buildInvoiceDocumentLabels } from '../../../invoice-ui';
import { getOrderDetails } from './actions';
import { OrderPrintButton } from './OrderPrintButton';
import { OrderStatusForm } from './OrderStatusForm';
import type { OrderCustomerDetails } from './types';

const formatMinorUnitPrice = (amount: number, currency = 'usd') =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(amount / 100);

export async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [order, invoice] = await Promise.all([
    getOrderDetails(id),
    getInvoicePresentationData(id).catch(() => null),
  ]);

  if (!order) {
    notFound();
  }

  const customerDetails = (invoice?.order.customer_details ??
    order.customer_details) as OrderCustomerDetails | null;
  const invoiceLabels = buildInvoiceDocumentLabels((key) => key);

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 md:px-6">
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-start md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/cms/orders" className="hover:underline">
              Orders
            </Link>
            <span>/</span>
            <span className="font-mono">{order.id}</span>
          </div>
          <h1 className="flex flex-wrap items-center gap-3 text-3xl font-bold tracking-tight">
            Order
            <StatusBadge status={order.status} size="lg" />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review the finalized invoice, customer details, and payment metadata in one place.
          </p>
        </div>

        <div className="w-full max-w-md">
          <OrderStatusForm orderId={id} currentStatus={order.status} />
        </div>
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Customer
          </h3>
          <div className="space-y-2 text-sm">
            {customerDetails?.name ? (
              <p className="font-semibold text-gray-900 dark:text-white">
                {customerDetails.name}
              </p>
            ) : null}
            {customerDetails?.email ? (
              <p className="text-gray-600 dark:text-gray-400">{customerDetails.email}</p>
            ) : null}
            {customerDetails?.phone ? (
              <p className="text-gray-600 dark:text-gray-400">{customerDetails.phone}</p>
            ) : null}
            {!customerDetails?.name && !customerDetails?.email && !customerDetails?.phone ? (
              <p className="italic text-gray-400">No contact info captured.</p>
            ) : null}
            {order.user_id ? (
              <p className="pt-1 font-mono text-[10px] uppercase tracking-wider text-gray-400">
                User ID: {order.user_id.slice(0, 13)}...
              </p>
            ) : null}
          </div>
        </div>

        <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
          <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Payment Details
          </h3>
          <div className="space-y-2 text-sm">
            <MetaRow label="Provider" value={order.provider || 'stripe'} capitalize />
            <MetaRow label="Currency" value={(order.currency || 'usd').toUpperCase()} />
            <MetaRow
              label="Created"
              value={new Date(order.created_at || '').toLocaleDateString()}
            />
            <MetaRow
              label="Invoice #"
              value={invoice?.order.invoice_number || 'Pending assignment'}
            />
            <MetaRow
              label="Paid on"
              value={
                invoice?.order.paid_at
                  ? new Date(invoice.order.paid_at).toLocaleString()
                  : 'Pending payment'
              }
            />
            <MetaRow
              label="Total"
              value={
                typeof order.total === 'number'
                  ? formatMinorUnitPrice(order.total, order.currency || 'usd')
                  : '--'
              }
            />
            {order.discount_total ? (
              <MetaRow
                label="Discount"
                value={`${
                  order.coupon_code ? `${order.coupon_code} ` : ''
                }-${formatMinorUnitPrice(order.discount_total, order.currency || 'usd')}`}
              />
            ) : null}
            {order.stripe_session_id ? (
              <div className="mt-3 border-t pt-3 dark:border-slate-800">
                <p className="mb-1 text-xs text-gray-500">Session ID</p>
                <p className="break-all rounded bg-gray-50 p-1 font-mono text-xs dark:bg-slate-800">
                  {order.stripe_session_id}
                </p>
              </div>
            ) : null}
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end print:hidden">
        <OrderPrintButton disabled={!invoice} />
      </div>

      <InvoiceViewerShell
        invoice={invoice}
        labels={invoiceLabels}
        locale="en-US"
        title={invoice?.order.invoice_number || 'Order invoice'}
        description="Open the printable invoice below and update the order status whenever you need to."
        printLabel="Print / Save as PDF"
        action={{
          href: '/cms/orders',
          label: 'Back to orders',
          variant: 'outline',
        }}
        emptyMessage="The printable invoice will appear here after the order payment metadata is synced."
        className="max-w-none px-0 py-6 md:px-0"
        showHeader={false}
      />
    </div>
  );
}

function MetaRow({
  label,
  value,
  capitalize = false,
}: {
  label: string;
  value: string;
  capitalize?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-gray-500">{label}</span>
      <span className={capitalize ? 'capitalize font-medium' : 'font-medium'}>{value}</span>
    </div>
  );
}

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'md' | 'lg' }) {
  let colorClass = 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300';
  if (status === 'paid') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'trial') colorClass = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
  if (status === 'pending') colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (status === 'shipped') colorClass = 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
  if (status === 'cancelled') colorClass = 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300';
  if (status === 'refunded') colorClass = 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-300';
  if (status === 'failed') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`${sizeClass} rounded-full font-medium capitalize ${colorClass}`}>
      {status}
    </span>
  );
}
