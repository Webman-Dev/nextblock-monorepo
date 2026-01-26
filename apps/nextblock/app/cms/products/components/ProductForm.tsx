'use client';

// eslint-disable-next-line @nx/enforce-module-boundaries
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
// Use dynamic import for NotionEditor to avoid SSR/lazy-loading issues
import dynamic from 'next/dynamic';
import { ProductFormValues, productSchema } from '@nextblock-cms/ecommerce';
// eslint-disable-next-line @nx/enforce-module-boundaries
import { useForm } from 'react-hook-form';
// import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { ProductMediaManager } from './ProductMediaManager';
import { createProductAction, updateProductAction } from '../actions';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ExternalLink } from 'lucide-react';
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
      // Map initial media relations relative to provided initialData.product_media
      product_media: initialData?.product_media?.map(pm => ({ media_id: pm.media_id })) || [],
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
    if (dirtyFields.title && !isEdit) { // Only auto-update on creation or if explicitly focusing on auto-generation logic
        const newSlug = slugify(title);
        setValue('slug', newSlug, { shouldValidate: true });
    }
  }, [title, dirtyFields.title, setValue, isEdit]);

  // Initial media state for the manager
  // We need to pass full media objects to the manager, but initialData might only have relation IDs if not typed fully.
  // The 'initialData' prop in ProductFormProps seems to assume a certain shape. 
  // Let's rely on what's passed.
  // Logic to transform provided product_media (which likely has media join) to the shape ProductMediaManager expects
  
  const [mediaForManager, setMediaForManager] = useState<any[]>(() => {
     // Transform db structure to manager structure
     if (initialData?.product_media) {
         return initialData.product_media.map((pm: any) => ({
             id: pm.id || pm.media_id, // unique key
             media_id: pm.media_id,
             file_path: pm.media?.file_path || '',
             alt: pm.media?.alt_text || '',
             sort_order: pm.sort_order
         })).sort((a: any, b: any) => a.sort_order - b.sort_order);
     }
     return [];
  });

  const [removedMediaIds, setRemovedMediaIds] = useState<Set<string>>(new Set());

  const onMediaUpdate = (updatedMedia: any[]) => {
      // identify items that were in mediaForManager but are not in updatedMedia
      const currentIds = new Set(updatedMedia.map(m => m.id));
      const removed = mediaForManager.filter(m => !currentIds.has(m.id));
      
      if (removed.length > 0) {
          setRemovedMediaIds(prev => {
              const next = new Set(prev);
              removed.forEach(m => {
                  // We only care about the media_id (UUID), not the temp id if it differs
                  // ProductMediaManager uses 'id' for keying, but 'media_id' is the real DB ID
                  if (m.media_id) next.add(m.media_id);
              });
              return next;
          });
      }

      setMediaForManager(updatedMedia);
      // Update form value 'product_media' expected by Zod/Action
      // Schema expects array of { media_id: string }
      setValue('product_media', updatedMedia.map(m => ({ media_id: m.media_id })));
      // Also update the explicitly removed field
      setValue('explicitly_removed_media_ids', Array.from(removedMediaIds));
  };

  // Sync removedMediaIds to form whenever it changes (due to closure staleness in onMediaUpdate, better to use effect)
  useEffect(() => {
     setValue('explicitly_removed_media_ids', Array.from(removedMediaIds));
  }, [removedMediaIds, setValue]);

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
          return;
      }
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
          alert(`Error saving product: ${error.message}`);
      }
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
         <div>
            <h1 className="text-3xl font-bold tracking-tight">{isEdit ? 'Edit Product' : 'Create Product'}</h1>
            <p className="text-sm text-muted-foreground">
               {isEdit ? 'Manage product details, pricing, and media.' : 'Add a new product to your store.'}
            </p>
         </div>
         <div className="flex items-center gap-2">
             {isEdit && initialData?.id && (
                <DeleteProductButton 
                    id={initialData.id} 
                    productName={watch('title')} 
                    redirectTo="/cms/products"
                    className="border-red-200 hover:bg-red-50 hover:text-red-700"
                />
             )}
             
             {watch('slug') && watch('status') === 'active' && (
                 <Button variant="outline" asChild>
                    <Link href={`/product/${watch('slug')}`} target="_blank">
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View
                    </Link>
                 </Button>
             )}
         </div>
      </div>

      <div className="space-y-8">
         {/* Row 1: Product Information */}
         <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
            <h2 className="text-lg font-semibold">Product Information</h2>
            <div className="space-y-4">
              <div>
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" {...register('title')} placeholder="Product Title" />
                  {errors.title && <p className="text-destructive text-sm">{errors.title.message as string}</p>}
              </div>
              <div>
                  <Label htmlFor="slug">Slug</Label>
                  <Input id="slug" {...register('slug')} placeholder="product-slug" className="font-mono text-sm" />
                  {errors.slug && <p className="text-destructive text-sm">{errors.slug.message as string}</p>}
              </div>
            </div>
         </div>

         {/* Row 2: Pricing/Inventory (50%) & Status (50%) */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Pricing & Inventory</h2>
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
                        {errors.price && <p className="text-destructive text-sm">{errors.price.message as string}</p>}
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
                    </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="sku">SKU</Label>
                        <Input id="sku" {...register('sku')} placeholder="SKU-123" />
                    </div>
                    <div>
                        <Label htmlFor="stock">Stock</Label>
                        <Input
                        id="stock"
                        type="number"
                        {...register('stock', { valueAsNumber: true })}
                        placeholder="0"
                        />
                    </div>
                </div>
            </div>

            <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
                <h2 className="text-lg font-semibold">Status & Metadata</h2>
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
                <div>
                  <Label htmlFor="short_description">Short Description</Label>
                  <Input {...register('short_description')} placeholder="Brief summary (SEO)..." />
                </div>
            </div>
         </div>

         {/* Row 3: Description & Media - Keeping Media big or side? 
             User didn't specify, but Media is nicer wide for gallery. 
             Detailed description is vertical.
             Let's split 60/40 or just stack. 
             Ideally Description is main content, Media is visual. 
             Let's use the 1fr/400px split for the bottom part which worked well before.
         */}
         <div className="grid grid-cols-1 lg:grid-cols-[1fr,400px] gap-8">
            <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
                <Label className="text-lg font-semibold">Detailed Description</Label>
                <div className="min-h-[400px] border rounded-lg overflow-hidden text-block-editor">
                <NotionEditor
                    initialContent={watch('description_json') || {}}
                    onUpdate={(content: any) => setValue('description_json', content)}
                />
                </div>
            </div>

            <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4 h-fit">
                {/* 
                  ProductMediaManager
                */}
                <ProductMediaManager 
                    initialMedia={mediaForManager} 
                    onUpdate={onMediaUpdate}
                />
                {/* Hidden input to ensure form state catches it if needed, though setValue usually enough */}
                <input type="hidden" {...register('product_media')} /> 
            </div>
         </div>

         {/* Bottom Actions */}
         <div className="flex justify-end pt-4 border-t">
            <Button disabled={isSubmitting} type="submit" size="lg">
                {isSubmitting ? 'Saving...' : 'Save Changes'}
            </Button>
         </div>

      </div>
    </form>
  );
}
