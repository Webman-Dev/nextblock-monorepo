'use client';

import { useMemo, useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';

import {
  type ManageableOrderStatus,
  updateOrderStatus,
} from './server-actions';

const ORDER_STATUS_OPTIONS: Array<{
  value: ManageableOrderStatus;
  label: string;
}> = [
  { value: 'pending', label: 'Pending' },
  { value: 'trial', label: 'Trial' },
  { value: 'paid', label: 'Paid' },
  { value: 'shipped', label: 'Shipped' },
  { value: 'cancelled', label: 'Cancelled' },
  { value: 'refunded', label: 'Refunded' },
];

export function OrderStatusForm({
  orderId,
  currentStatus,
}: {
  orderId: string;
  currentStatus: string;
}) {
  const router = useRouter();
  const [selectedStatus, setSelectedStatus] = useState<ManageableOrderStatus>(
    ORDER_STATUS_OPTIONS.some((option) => option.value === currentStatus)
      ? (currentStatus as ManageableOrderStatus)
      : 'pending'
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const hasChanged = useMemo(
    () => selectedStatus !== currentStatus,
    [currentStatus, selectedStatus]
  );

  const handleSave = () => {
    if (!hasChanged) {
      return;
    }

    setMessage(null);

    startTransition(async () => {
      try {
        const result = await updateOrderStatus(orderId, selectedStatus);

        if (!result.success) {
          setMessage(result.error || 'Failed to update order status.');
          return;
        }

        router.refresh();
      } catch (error) {
        console.error(error);
        setMessage('Unexpected error while saving the order status.');
      }
    });
  };

  return (
    <div className="rounded-lg border bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-[220px] flex-1 space-y-2">
          <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">
            Order Status
          </p>
          <Select
            value={selectedStatus}
            onValueChange={(value: ManageableOrderStatus) => {
              setSelectedStatus(value);
              setMessage(null);
            }}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select status" />
            </SelectTrigger>
            <SelectContent>
              {ORDER_STATUS_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSave}
            disabled={isPending || !hasChanged}
          >
            {isPending ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </div>

      {message ? (
        <p className="mt-2 text-xs text-red-600 dark:text-red-400">{message}</p>
      ) : !hasChanged ? (
        <p className="mt-2 text-xs text-slate-500">
          Status is already up to date.
        </p>
      ) : null}
    </div>
  );
}
