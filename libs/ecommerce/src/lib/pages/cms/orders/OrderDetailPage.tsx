import Link from 'next/link';
import { notFound } from 'next/navigation';

import { InvoiceDocument } from '../../../components/InvoiceDocument';
import { getInvoicePresentationData } from '../../../invoice-server';
import { getOrderDetails } from './actions';
import { MarkPaidButton } from './MarkPaidButton';
import type { OrderCustomerDetails } from './types';

const invoiceLabels = {
  invoice: 'Invoice',
  invoiceNumber: 'Invoice #',
  orderNumber: 'Order #',
  paidOn: 'Paid on',
  status: 'Status',
  from: 'From',
  billTo: 'Bill to',
  shipTo: 'Ship to',
  item: 'Item',
  details: 'Details',
  quantity: 'Qty',
  price: 'Price',
  amount: 'Amount',
  subtotal: 'Subtotal',
  shipping: 'Shipping',
  tax: 'Tax',
  total: 'Total',
  taxBreakdown: 'Tax breakdown',
  taxRegistrations: 'Tax registrations',
};

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

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-6">
      <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <div className="mb-2 flex items-center gap-2 text-sm text-gray-500">
            <Link href="/cms/orders" className="hover:underline">
              Orders
            </Link>
            <span>/</span>
            <span className="font-mono">{order.id}</span>
          </div>
          <h1 className="flex items-center gap-3 text-3xl font-bold tracking-tight">
            Order
            <StatusBadge status={order.status} size="lg" />
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Review the final invoice, customer details, and payment metadata for this order.
          </p>
        </div>

        <div className="flex gap-2">
          <Link
            href={`/cms/orders/${id}`}
            className="rounded-md border px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-slate-800"
          >
            Sync / Refresh
          </Link>
          {order.status !== 'paid' ? <MarkPaidButton orderId={id} /> : null}
        </div>
      </div>

      <div className="grid gap-8 xl:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          {invoice ? (
            <InvoiceDocument data={invoice} labels={invoiceLabels} locale="en-US" />
          ) : (
            <div className="rounded-3xl border bg-background px-6 py-12 text-center text-muted-foreground">
              The printable invoice will appear here after the order payment metadata is synced.
            </div>
          )}
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 font-medium text-gray-900 dark:text-gray-100">Customer</h3>
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

          <AddressCard
            title="Billing Address"
            emptyMessage="No billing address was captured for this order."
            address={customerDetails?.billing || null}
          />

          <AddressCard
            title="Shipping Address"
            emptyMessage="No shipping address was captured for this order."
            address={customerDetails?.shipping || null}
          />

          <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <h3 className="mb-3 font-medium text-gray-900 dark:text-gray-100">
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
      </div>
    </div>
  );
}

function AddressCard({
  title,
  emptyMessage,
  address,
}: {
  title: string;
  emptyMessage: string;
  address: OrderCustomerDetails['billing'];
}) {
  return (
    <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <h3 className="mb-3 font-medium text-gray-900 dark:text-gray-100">{title}</h3>
      <div className="text-sm text-gray-600 dark:text-gray-400">
        {!address ? (
          <p className="italic text-xs text-gray-400">{emptyMessage}</p>
        ) : (
          <address className="not-italic space-y-0.5">
            {address.company_name ? (
              <p className="font-medium text-gray-900 dark:text-gray-200">
                {address.company_name}
              </p>
            ) : null}
            <p className="font-medium text-gray-900 dark:text-gray-200">
              {address.recipient_name}
            </p>
            <p>{address.line1}</p>
            {address.line2 ? <p>{address.line2}</p> : null}
            <p>
              {address.city}, {address.state || ''} {address.postal_code}
            </p>
            <p className="pt-1 text-xs font-semibold uppercase tracking-wide">
              {address.country_code}
            </p>
          </address>
        )}
      </div>
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
  if (status === 'pending') colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (status === 'failed') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`${sizeClass} rounded-full font-medium capitalize ${colorClass}`}>
      {status}
    </span>
  );
}
