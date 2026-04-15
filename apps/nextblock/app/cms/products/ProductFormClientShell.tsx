'use client';

import React from 'react';
import { ProductForm } from '@nextblock-cms/ecommerce';
import MediaPickerDialog from '../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from './ClientNotionEditor';
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
