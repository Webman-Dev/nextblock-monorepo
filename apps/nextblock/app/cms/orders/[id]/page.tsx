import { getOrderDetails } from '../actions';
import { notFound } from 'next/navigation';
import MarkPaidButton from './MarkPaidButton';
import Image from 'next/image';

// Helper to format currency
const formatPrice = (amount: number, currency = 'usd') => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency,
  }).format(amount / 100);
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const order = await getOrderDetails(id);

  if (!order) {
    notFound();
  }

  const customerEmail =
        (order.customer_details as any)?.email ||
        order.customer?.full_name ||
        'Unknown';



  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row gap-4 justify-between md:items-center border-b pb-6">
        <div>
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <Link href="/cms/orders" className="hover:underline">Orders</Link>
            <span>/</span>
            <span className="font-mono">{order.id}</span>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
            Order
            <StatusBadge status={order.status} size="lg" />
          </h1>
        </div>
        <div className="flex gap-2">
           {/* Auto-refresh button (just reloads) */}
           <Link href={`/cms/orders/${id}`} className="px-4 py-2 text-sm border rounded hover:bg-gray-50">
             Sync / Refresh
           </Link>
           
           {order.status !== 'paid' && (
             <MarkPaidButton orderId={id} />
           )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        
        {/* Left Col: Order Items */}
        <div className="md:col-span-2 space-y-6">
          <div className="border rounded-lg bg-white overflow-hidden">
            <div className="bg-gray-50 px-4 py-3 border-b font-medium text-sm text-gray-700">
              Order Items
            </div>
            <table className="w-full text-sm text-left">
                <thead className="bg-white border-b text-gray-500">
                    <tr>
                        <th className="px-4 py-2 font-normal">Product</th>
                        <th className="px-4 py-2 font-normal text-right">Qty</th>
                        <th className="px-4 py-2 font-normal text-right">Price</th>
                        <th className="px-4 py-2 font-normal text-right">Total</th>
                    </tr>
                </thead>
                <tbody className="divide-y">
                    {order.order_items.map(item => (
                        <tr key={item.id}>
                            <td className="px-4 py-3">
                                <div className="flex items-center gap-3">
                                    {/* Thumbnail */}
                                    <div className="h-10 w-10 bg-gray-100 rounded overflow-hidden flex-shrink-0 border">
                                        {item.product?.image_url ? (
                                            <Image 
                                                src={`${process.env.NEXT_PUBLIC_R2_BASE_URL}/${item.product.image_url}`} 
                                                alt={item.product.title || 'Product Image'}
                                                width={40}
                                                height={40}
                                                className="h-full w-full object-cover"
                                            />
                                        ) : (
                                            <div className="h-full w-full flex items-center justify-center text-gray-300">
                                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                </svg>
                                            </div>
                                        )}
                                    </div>
                                    <div>
                                        <div className="font-medium text-gray-900">
                                            {item.product?.title || 'Unknown Product'}
                                        </div>
                                        {item.product_id && (
                                            <div className="text-xs text-gray-500 font-mono">
                                                {item.product_id.slice(0, 8)}...
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </td>
                            <td className="px-4 py-3 text-right">{item.quantity}</td>
                            <td className="px-4 py-3 text-right">{formatPrice(item.price_at_purchase)}</td>
                            <td className="px-4 py-3 text-right font-medium">
                                {formatPrice(item.price_at_purchase * item.quantity)}
                            </td>
                        </tr>
                    ))}
                </tbody>
                <tfoot className="bg-gray-50 font-medium">
                    <tr>
                        <td colSpan={3} className="px-4 py-3 text-right">Total</td>
                        <td className="px-4 py-3 text-right">{formatPrice(order.total, 'usd')}</td>
                    </tr>
                </tfoot>
            </table>
          </div>
        </div>

        {/* Right Col: Metadata */}
        <div className="space-y-6">
            
            {/* Customer Card */}
            <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-gray-900 mb-2">Customer</h3>
                <div className="text-sm space-y-1">
                    <p className="font-medium">{customerEmail}</p>
                    {order.user_id && (
                        <p className="text-gray-500 text-xs">User ID: {order.user_id}</p>
                    )}
                </div>
            </div>

            {/* Payment Info */}
             <div className="border rounded-lg p-4 bg-white">
                <h3 className="font-medium text-gray-900 mb-2">Payment Details</h3>
                <div className="text-sm space-y-2">
                    <div className="flex justify-between">
                        <span className="text-gray-500">Provider</span>
                        <span className="capitalize font-medium">{order.provider || 'Stripe'}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-500">Created</span>
                        <span>{new Date(order.created_at || '').toLocaleDateString()}</span>
                    </div>
                     <div className="flex justify-between">
                        <span className="text-gray-500">Time</span>
                        <span>{new Date(order.created_at || '').toLocaleTimeString()}</span>
                    </div>
                    {/* Add External ID if we had it, typically Stripe ID is in session_id or similar */}
                    {order.stripe_session_id && (
                         <div className="pt-2 border-t mt-2">
                             <p className="text-xs text-gray-500 mb-0.5">Session ID</p>
                             <p className="text-xs break-all font-mono bg-gray-50 p-1 rounded">
                                 {order.stripe_session_id}
                             </p>
                         </div>
                    )}
                </div>
            </div>

        </div>
      </div>



    </div>
  );
}

function StatusBadge({ status, size = 'md' }: { status: string; size?: 'md' | 'lg' }) {
  let colorClass = 'bg-gray-100 text-gray-700';
  if (status === 'paid') colorClass = 'bg-green-100 text-green-700';
  if (status === 'pending') colorClass = 'bg-yellow-100 text-yellow-700';
  if (status === 'failed') colorClass = 'bg-red-100 text-red-700';

  const sizeClass = size === 'lg' ? 'px-3 py-1 text-sm' : 'px-2 py-0.5 text-xs';

  return (
    <span className={`${sizeClass} rounded-full font-medium capitalize ${colorClass}`}>
      {status}
    </span>
  );
}
