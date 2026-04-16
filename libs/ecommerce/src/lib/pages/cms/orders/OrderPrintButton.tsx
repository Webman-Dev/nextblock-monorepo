'use client';

import { Printer } from 'lucide-react';

import { Button } from '@nextblock-cms/ui';

export function OrderPrintButton({ disabled = false }: { disabled?: boolean }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.print()}
      disabled={disabled}
    >
      <Printer className="mr-2 h-4 w-4" />
      Print / Save as PDF
    </Button>
  );
}
