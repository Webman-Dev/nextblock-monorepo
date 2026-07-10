'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@nextblock-cms/ui';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { triggerSingleProductSync } from '../actions';

interface SyncFreemiusPricingButtonProps {
  productId: string;
  /** True when an unpublished product draft is open — publishing it later would revert the synced pricing. */
  hasOpenDraft?: boolean;
}

export function SyncFreemiusPricingButton({ productId, hasOpenDraft = false }: SyncFreemiusPricingButtonProps) {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const handleSync = async () => {
    if (!productId) {
      toast.error('Product ID is missing');
      return;
    }

    // A sync writes pricing straight to the live product. If an unpublished
    // draft is open, publishing (or leaving) it later overwrites that pricing
    // with the draft's older values — so warn before syncing over an open draft.
    if (hasOpenDraft) {
      const proceed = window.confirm(
        'You have unpublished draft changes for this product.\n\n' +
          'Syncing updates the live pricing now, but publishing your draft ' +
          'afterward will overwrite it with the draft’s older values. ' +
          'Publish or discard your draft first to keep the synced prices.\n\n' +
          'Sync anyway?'
      );
      if (!proceed) {
        return;
      }
    }

    setIsPending(true);
    try {
      const result = await triggerSingleProductSync(productId);
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Pricing sync complete!`);
        // The sync upserts pricing directly onto the live product row(s). Re-fetch
        // the edit page so the form re-hydrates with the synced values — otherwise
        // a later field edit would autosave a draft built from the stale pre-sync
        // values and silently revert the pricing on publish.
        router.refresh();
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
      {isPending ? 'Syncing...' : 'Sync Plans & Pricing from Freemius'}
    </Button>
  );
}
