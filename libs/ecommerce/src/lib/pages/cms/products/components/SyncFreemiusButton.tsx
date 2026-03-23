'use client';

import { useState } from 'react';
import { Button } from '@nextblock-cms/ui';
import { RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { triggerFreemiusSync } from '../actions';

export function SyncFreemiusButton({ title = 'Sync Full Store' }: { title?: string }) {
  const [isPending, setIsPending] = useState(false);

  const handleSync = async () => {
    setIsPending(true);
    try {
      const result = await triggerFreemiusSync();
      if (result.error) {
        toast.error(result.error);
      } else {
        toast.success(`Full store sync complete! Found ${result.data?.count || 0} products.`);
      }
    } catch (err: any) {
      toast.error(err.message || 'An unexpected error occurred during sync');
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Button 
      variant="secondary" 
      onClick={handleSync} 
      disabled={isPending}
      className="gap-2"
    >
      <RefreshCw className={`w-4 h-4 ${isPending ? 'animate-spin' : ''}`} />
      {isPending ? 'Syncing...' : title}
    </Button>
  );
}
