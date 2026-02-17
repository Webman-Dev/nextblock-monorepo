'use client';

import { useState, useTransition } from 'react';
import { markOrderAsPaid } from '../actions';
import { useRouter } from 'next/navigation';

export default function MarkPaidButton({ orderId }: { orderId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleMarkPaid = async () => {
    setError(null);
    startTransition(async () => {
      try {
        const result = await markOrderAsPaid(orderId);
        if (!result.success) {
          setError(result.error || 'Failed to update order');
          alert(`Error: ${result.error || 'Failed to update order'}`);
        } else {
           // Success
           router.refresh(); 
        }
      } catch (e) {
        setError('Unexpected error');
        console.error(e);
        alert('Unexpected error occurred');
      }
    });
  };

  return (
    <div>
      <button
        onClick={handleMarkPaid}
        disabled={isPending}
        className="px-4 py-2 text-sm bg-black text-white rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isPending ? 'Updating...' : 'Mark as Paid'}
      </button>
      {error && <p className="text-red-500 text-xs mt-1 absolute">{error}</p>}
    </div>
  );
}
