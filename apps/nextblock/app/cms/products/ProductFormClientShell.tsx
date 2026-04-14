'use client';

import React from 'react';
import MediaPickerDialog from '../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from './ClientNotionEditor';
import { ProductForm } from '../../../../../libs/ecommerce/src/lib/pages/cms/products/components/ProductForm';
import type { ProductFormValues } from '@nextblock-cms/ecommerce';
import type { ProductAttribute } from '@nextblock-cms/ecommerce';

interface ProductFormClientShellProps {
  initialData?: ProductFormValues & {
    id?: string;
    product_media?: { media_id: string }[];
    language_id?: number;
    translation_group_id?: string;
  };
  isEdit?: boolean;
  availableLanguagesProp: any[];
  globalAttributesProp: ProductAttribute[];
  translationGroupId?: string;
  targetLanguageId?: string;
  paymentProvider: 'stripe' | 'freemius';
  createAction?: (data: ProductFormValues) => Promise<void>;
  updateAction?: (data: ProductFormValues) => Promise<void>;
}

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
