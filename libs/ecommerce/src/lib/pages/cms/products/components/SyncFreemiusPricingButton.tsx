'use client';

import { useState } from 'react';
import { Button } from '@nextblock-cms/ui';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { triggerSingleProductSync } from '../actions';

interface SyncFreemiusPricingButtonProps {
  productId: string;
}

export function SyncFreemiusPricingButton({ productId }: SyncFreemiusPricingButtonProps) {
  const [isPending, setIsPending] = useState(false);

  const handleSync = async () => {
    if (!productId) {
      toast.error('Product ID is missing');
      return;
    }
    
    setIsPending(true);
    try {
      const result = await triggerSingleProductSync(productId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Pricing sync complete!`);
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during sync');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant="outline" 
      onClick={handleSync} 
      disabled={isPending}
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Syncing...' : 'Sync Prices from Freemius'}
    </Button>
  );
}
