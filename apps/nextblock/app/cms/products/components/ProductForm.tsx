'use client';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
// Use dynamic import for NotionEditor to avoid SSR/lazy-loading issues
import dynamic from 'next/dynamic';
import { ProductFormValues, productSchema } from '@nextblock-cms/ecommerce';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useForm } from 'react-hook-form';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { createProductAction, updateProductAction } from '../actions';
import { useState, useEffect } from 'react';
import type { Database } from '@nextblock-cms/db';
import { DeleteProductButton } from './DeleteProductButton';

// Define NotionEditor props locally or import if available, needed for dynamic
interface NotionEditorProps {
  initialContent?: any;
  onUpdate?: (content: any) => void;
}

const NotionEditor = dynamic<NotionEditorProps>(
  () => import('@nextblock-cms/editor').then((mod) => mod.NotionEditor as any),
  { ssr: false }
);

interface ProductFormProps {
  initialData?: ProductFormValues & { 
    id?: string; 
    product_media?: { media_id: string }[] 
  };
  isEdit?: boolean;
}

// Simple slugify helper
const slugify = (text: string) => {
  return text
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')     // Replace spaces with -
    .replace(/[^\w-]+/g, '')  // Remove all non-word chars
    .replace(/--+/g, '-')     // Replace multiple - with single -
    .replace(/^-+/, '')       // Trim - from start
    .replace(/-+$/, '');      // Trim - from end
};

export function ProductForm({ initialData, isEdit = false }: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      sku: initialData?.sku || '',
      price: initialData?.price ? initialData.price / 100 : 0, // Convert cents to dollars for input
      sale_price: initialData?.sale_price ? initialData.sale_price / 100 : null,
      stock: initialData?.stock || 0,
      short_description: initialData?.short_description || '',
      description_json: initialData?.description_json || {},
      status: initialData?.status || 'draft',
      // Determine media_id from initialData relations if present
      media_id: initialData?.product_media?.[0]?.media_id || undefined, 
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    setError,
    formState: { errors, dirtyFields },
  } = form;

  // Auto-generate slug from title if title is modified
  const title = watch('title');

  // Use explicit useEffect to handle slug updates
  useEffect(() => {
    if (dirtyFields.title) {
        const newSlug = slugify(title);
        // optional: only update if user hasn't manually edited slug? 
        // User asked for auto-populate. Let's just update it. 
        // If they want to override, they can edit slug AFTER title.
        setValue('slug', newSlug, { shouldValidate: true });
    }
  }, [title, dirtyFields.title, setValue]);

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    try {
      if (isEdit && initialData?.id) {
        await updateProductAction(initialData.id, data);
      } else {
        await createProductAction(data);
      }
    } catch (error: any) {
      console.error(error);
      if (error.message === 'NEXT_REDIRECT') {
          // This is expected behavior for redirect actions
          return;
      }
      // Check for unique constraint violation on slug
      if (error.message && error.message.includes('products_slug_key')) {
        setError('slug', { 
            type: 'manual', 
            message: 'This slug is already in use. Please choose another one.' 
        });
      } else if (error.message && error.message.includes('products_sku_key')) {
         setError('sku', { 
            type: 'manual', 
            message: 'This SKU is already in use.' 
        });
      } else {
          // General error (toast could be better here in real app)
          alert(`Error saving product: ${error.message}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-4xl mx-auto py-8">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <div>
            <Label htmlFor="title">Title</Label>
            <Input id="title" {...register('title')} placeholder="Product Title" />
            {errors.title && <p className="text-red-500 text-sm">{errors.title.message as string}</p>}
          </div>

          <div>
            <Label htmlFor="slug">Slug</Label>
            <Input id="slug" {...register('slug')} placeholder="product-slug" />
            {errors.slug && <p className="text-red-500 text-sm">{errors.slug.message as string}</p>}
          </div>

          <div>
            <Label htmlFor="sku">SKU</Label>
            <Input id="sku" {...register('sku')} placeholder="SKU-123" />
            {errors.sku && <p className="text-red-500 text-sm">{errors.sku.message as string}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
             <div>
              <Label htmlFor="price">Price ($)</Label>
              <Input
                id="price"
                type="number"
                step="0.01"
                {...register('price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.price && <p className="text-red-500 text-sm">{errors.price.message as string}</p>}
            </div>
             <div>
              <Label htmlFor="sale_price">Sale Price ($)</Label>
              <Input
                id="sale_price"
                type="number"
                step="0.01"
                {...register('sale_price', { valueAsNumber: true })}
                placeholder="0.00"
              />
              {errors.sale_price && <p className="text-red-500 text-sm">{errors.sale_price.message as string}</p>}
            </div>
          </div>

          <div>
            <Label htmlFor="stock">Stock</Label>
            <Input
              id="stock"
              type="number"
              {...register('stock', { valueAsNumber: true })}
              placeholder="0"
            />
             {errors.stock && <p className="text-red-500 text-sm">{errors.stock.message as string}</p>}
          </div>

          <div>
             <Label>Status</Label>
             <Select 
                onValueChange={(val) => setValue('status', val as any)} 
                defaultValue={watch('status')}
             >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="draft">Draft</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="archived">Archived</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="space-y-4">
           <div>
            <Label>Product Image</Label>
            <MediaPickerDialog
              onSelect={(media: Database['public']['Tables']['media']['Row']) => {
                 if (media) {
                   setValue('media_id', media.id);
                 }
              }}
            />
            {watch('media_id') && (
               <div className="mt-2 border rounded p-2">
                 <p className="text-xs text-muted-foreground">Image ID: {watch('media_id')}</p>
                 {/* In a real app we'd fetch the URL or pass the media object to preview. */}
               </div>
            )}
           </div>

           <div>
              <Label>Short Description</Label>
              <Input {...register('short_description')} placeholder="Brief summary..." />
           </div>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Detailed Description</Label>
        <div className="min-h-[300px] border rounded-md overflow-hidden text-block-editor">
          <NotionEditor
            initialContent={watch('description_json') || {}}
            onUpdate={(content: any) => setValue('description_json', content)}
          />
        </div>
      </div>

      <div className="flex justify-between gap-4">
        {isEdit && initialData?.id && (
             <DeleteProductButton 
                id={initialData.id} 
                productName={watch('title')} 
                redirectTo="/cms/products"
             />
        )}
        <div className="flex gap-4 ml-auto">
            <Button disabled={isSubmitting} type="submit">
            {isSubmitting ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </Button>
        </div>
      </div>
    </form>
  );
}
