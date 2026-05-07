import Link from 'next/link';
import { getOrders } from './actions';
import { ExportReportsDialog } from './ExportReportsDialog';
import type { OrderCustomerDetails } from './types';

// Helper to format currency if utils missing
const formatPrice = (amount: number, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
};

export async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; status?: string }>;
}) {
  const params = await searchParams;
  const page = Number(params.page) || 1;
  const status = params.status || 'all';

  const { data: orders, totalPages } = await getOrders(page, status);

  return (
    <div className="p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Orders</h1>
        <div className="flex items-center gap-2">
           <ExportReportsDialog />
           {/* Simple Refresh via Link to same page */}
           <Link href={`/cms/orders?page=${page}&status=${status}`} className="px-3 py-2 text-sm font-medium border rounded hover:bg-gray-50 dark:hover:bg-slate-800">
             Refresh
           </Link>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 border-b pb-4">
        {['all', 'paid', 'trial', 'pending', 'failed'].map((s) => (
          <Link
            key={s}
            href={`/cms/orders?page=1&status=${s}`}
            className={`px-3 py-1 rounded-full text-sm font-medium capitalize ${
              status === s
                ? 'bg-black text-white dark:bg-white dark:text-black'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200 dark:bg-slate-800 dark:text-gray-300 dark:hover:bg-slate-700'
            }`}
          >
            {s}
          </Link>
        ))}
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden dark:border-slate-800">
        <table className="w-full text-sm text-left align-middle">
          <thead className="bg-gray-50 text-gray-500 font-medium border-b dark:bg-slate-900 dark:text-slate-400 dark:border-slate-800">
            <tr>
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Provider</th>
              <th className="px-4 py-3 text-right">Amount</th>
              <th className="px-4 py-3 text-right">Date</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y dark:divide-slate-800">
            {orders.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-gray-500">
                  No orders found.
                </td>
              </tr>
            ) : (
              orders.map((order) => {
                const details = order.customer_details as OrderCustomerDetails | null;
                const customerEmail =
                  details?.name ||
                  details?.email ||
                  order.customer?.full_name ||
                  'Guest Customer';
                
                return (
                  <tr key={order.id} className="hover:bg-gray-50 dark:hover:bg-slate-800/50">
                    <td className="px-4 py-3 font-mono text-gray-500">
                      {order.id.slice(0, 8)}...
                    </td>
                    <td className="px-4 py-3 font-medium">{customerEmail}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={order.status} />
                    </td>
                    <td className="px-4 py-3 capitalize text-gray-600 dark:text-gray-400">
                        {order.provider === 'freemius' ? 'Freemius' : 'Stripe'}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex flex-col items-end">
                        <span>{formatPrice(order.total, order.currency || 'usd')}</span>
                        {order.discount_total ? (
                          <span className="text-[10px] text-emerald-600">
                            {order.coupon_code} -{formatPrice(order.discount_total, order.currency || 'usd')}
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-500 whitespace-nowrap">
                       {new Date(order.created_at || '').toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-right">
                      <Link
                        href={`/cms/orders/${order.id}`}
                        className="text-blue-600 hover:underline dark:text-blue-400"
                      >
                        View
                      </Link>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="flex justify-between items-center pt-4">
        <div className="text-sm text-gray-500">
          Page {page} of {totalPages}
        </div>
        <div className="flex gap-2">
          <Link
            href={`/cms/orders?page=${Math.max(1, page - 1)}&status=${status}`}
            className={`px-3 py-1 border rounded text-sm ${
              page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            Previous
          </Link>
          <Link
            href={`/cms/orders?page=${Math.min(totalPages, page + 1)}&status=${status}`}
            className={`px-3 py-1 border rounded text-sm ${
              page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50 dark:hover:bg-slate-800'
            }`}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  let colorClass = 'bg-gray-100 text-gray-700 dark:bg-slate-800 dark:text-gray-300';
  if (status === 'paid') colorClass = 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400';
  if (status === 'trial') colorClass = 'bg-cyan-100 text-cyan-700 dark:bg-cyan-900/30 dark:text-cyan-300';
  if (status === 'pending') colorClass = 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
  if (status === 'failed') colorClass = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium capitalize ${colorClass}`}>
      {status}
    </span>
  );
}
