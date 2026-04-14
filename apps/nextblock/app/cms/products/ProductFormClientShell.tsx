'use client';

import React from 'react';
import MediaPickerDialog from '../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from './ClientNotionEditor';
import { ProductForm } from '../../../../../libs/ecommerce/src/lib/pages/cms/products/components/ProductForm';
type ProductFormClientShellProps = React.ComponentProps<typeof ProductForm>;

export default function ProductFormClientShell(props: ProductFormClientShellProps) {
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
      editorNode={<NotionEditor />}
    />
  );
}
