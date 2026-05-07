'use client';

import { useState } from 'react';
import { Button } from '@nextblock-cms/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@nextblock-cms/ui/dialog';
import { Plus } from 'lucide-react';

import { CouponEditorForm } from './CouponEditorForm';
import type { CouponProductOption } from './ProductScopePicker';

export function CreateCouponDialog({
  action,
  products,
  currencyCode,
}: {
  action: (formData: FormData) => Promise<void>;
  products: CouponProductOption[];
  currencyCode: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button type="button" className="gap-2">
          <Plus className="h-4 w-4" />
          Create Coupon
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[92vw] lg:max-w-5xl xl:max-w-6xl">
        <DialogHeader>
          <DialogTitle className="sr-only">Create Coupon</DialogTitle>
        </DialogHeader>
        <CouponEditorForm
          action={action}
          products={products}
          submitLabel="Create Coupon"
          currencyCode={currencyCode}
        />
      </DialogContent>
    </Dialog>
  );
}
