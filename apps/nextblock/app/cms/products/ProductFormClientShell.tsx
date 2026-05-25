'use client';

import React from 'react';
import { ProductForm } from '@nextblock-cms/ecommerce';
import MediaPickerDialog from '../media/components/MediaPickerDialog';
type ProductFormClientShellProps = React.ComponentProps<typeof ProductForm>;

const productFormSkeletonRows = ['details', 'description', 'media', 'inventory'];

export default function ProductFormClientShell(props: ProductFormClientShellProps) {
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
    setIsMounted(true);
  }, []);

  if (!isMounted) {
    return <ProductFormShellSkeleton />;
  }

  return (
    <ProductForm
      {...props}
      mediaPickerNode={
        <MediaPickerDialog
          triggerLabel="+ Add Image"
          triggerVariant="outline"
          defaultFolder="uploads/products/"
        />
      }
    />
  );
}

function ProductFormShellSkeleton() {
  return (
    <div className="space-y-8" aria-hidden="true">
      <div className="space-y-3">
        <div className="h-8 w-56 rounded-md bg-muted" />
        <div className="h-4 w-80 max-w-full rounded-md bg-muted/70" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="h-24 rounded-lg border bg-muted/30" />
        <div className="h-24 rounded-lg border bg-muted/30" />
      </div>

      {productFormSkeletonRows.map((row) => (
        <div key={row} className="rounded-lg border p-4">
          <div className="mb-4 h-5 w-40 rounded-md bg-muted" />
          <div className="h-32 rounded-md bg-muted/30" />
        </div>
      ))}
    </div>
  );
}
