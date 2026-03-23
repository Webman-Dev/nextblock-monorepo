'use client';

import { useState } from 'react';
import { Button, Input } from '@nextblock-cms/ui';
import { Download } from 'lucide-react';
import { toast } from 'sonner';
import { triggerSingleProductSync } from '../actions';

export function SyncProductForm() {
  const [productId, setProductId] = useState('');
  const [isPending, setIsPending] = useState(false);

  const handleSync = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!productId) {
      toast.error('Please enter a Freemius Product ID');
      return;
    }

    setIsPending(true);
    try {
      const result = await triggerSingleProductSync(productId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Sync complete! Found ${result.data?.count || 0} plans for product ${productId}.`);
        setProductId('');
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during sync');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <form onSubmit={handleSync} className="flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50 p-2 rounded-lg border dark:border-slate-800">
      <div className="text-xs font-semibold text-slate-500 px-2 uppercase tracking-wider">Sync by ID</div>
      <Input
        placeholder="Product ID (e.24851)"
        value={productId}
        onChange={(e) => setProductId(e.target.value)}
        className="h-9 w-40 text-sm"
        disabled={isPending}
      />
      <Button 
        type="submit"
        size="sm"
        variant="outline"
        disabled={isPending || !productId}
        className="gap-2 h-9"
      >
        <Download className={`w-4 h-4 ${isPending ? 'animate-bounce' : ''}`} />
        {isPending ? 'Syncing...' : 'Sync'}
      </Button>
    </form>
  );
}
