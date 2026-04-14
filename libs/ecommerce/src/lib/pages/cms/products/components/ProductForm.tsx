'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Label, Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@nextblock-cms/ui';
// Use dependency injection for NotionEditor to avoid SSR/lazy-loading issues
import { ProductFormValues, productSchema } from '../../../../product-schema';
import { useForm } from 'react-hook-form';
import { ProductMediaManager } from './ProductMediaManager';
import { SyncFreemiusPricingButton } from './SyncFreemiusPricingButton';
import { VariationsEditor } from './VariationsEditor';
import { ProductAttribute } from '../../../../types';
interface ProductFormProps {
  initialData?: ProductFormValues & { 
    id?: string; 
    product_media?: { media_id: string }[] ;
    language_id?: number;
    translation_group_id?: string;
  };
  isEdit?: boolean;
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: any[]; // Or a specific Language type if imported
  globalAttributesProp: ProductAttribute[];
  translationGroupId?: string;
  targetLanguageId?: string;
  freemiusDashboardNode?: React.ReactNode;
  paymentProvider: 'stripe' | 'freemius';
  createAction?: (data: ProductFormValues) => Promise<void>;
  updateAction?: (data: ProductFormValues) => Promise<void>;
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

export function ProductForm({ 
  initialData, 
  isEdit = false, 
  mediaPickerNode, 
  editorNode,
  availableLanguagesProp,
  globalAttributesProp,
  translationGroupId,
  targetLanguageId,
  freemiusDashboardNode,
  paymentProvider,
  createAction,
  updateAction
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVariations, setShowVariations] = useState(() => Boolean(initialData?.variants?.length));
  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: initialData?.title || '',
      slug: initialData?.slug || '',
      sku: initialData?.sku || '',
      upc: initialData?.upc || '',
      price: typeof initialData?.price === 'number' ? initialData.price / 100 : 0, // Convert cents to dollars for input
      sale_price: typeof initialData?.sale_price === 'number' ? initialData.sale_price / 100 : null,
      stock: initialData?.stock || 0,
      short_description: initialData?.short_description || '',
      description_json: initialData?.description_json || { type: 'doc', content: [{ type: 'paragraph' }] },
      freemius_product_id: initialData?.freemius_product_id || '',
      freemius_plan_id: initialData?.freemius_plan_id || '',
      status: initialData?.status || 'draft',
      language_id: initialData?.language_id || (targetLanguageId ? parseInt(targetLanguageId, 10) : (availableLanguagesProp.find(l => l.is_default)?.id || availableLanguagesProp[0]?.id)),
      translation_group_id: initialData?.translation_group_id || translationGroupId || undefined,
      // Map initial media relations relative to provided initialData.product_media
      product_media: initialData?.product_media?.map(pm => ({ media_id: pm.media_id })) || [],
      variation_attributes: initialData?.variation_attributes || [],
      variants: initialData?.variants || [],
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
  const isStripeMode = paymentProvider === 'stripe';
  const isFreemiusMode = paymentProvider === 'freemius';
  const hasFreemiusProductId = !!watch('freemius_product_id');
  const variants = watch('variants') || [];
  const hasVariants = variants.length > 0;
  const selectedLanguageId = watch('language_id');
  const currentLanguageCode =
    availableLanguagesProp.find((lang) => lang.id === selectedLanguageId)?.code ||
    availableLanguagesProp.find((lang) => lang.is_default)?.code ||
    availableLanguagesProp[0]?.code;

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

  useEffect(() => {
    if (hasVariants) {
      setShowVariations(true);
    }
  }, [hasVariants]);

  const handleVariationChange = useCallback(
    ({
      variationAttributes,
      variants,
    }: {
      variationAttributes: ProductFormValues['variation_attributes'];
      variants: ProductFormValues['variants'];
    }) => {
      setValue('variation_attributes', variationAttributes, { shouldDirty: true });
      setValue('variants', variants, { shouldDirty: true, shouldValidate: true });
    },
    [setValue]
  );

  const onSubmit = async (data: ProductFormValues) => {
    setIsSubmitting(true);
    
    try {
      const normalizedData: ProductFormValues = {
        ...data,
        freemius_product_id: isStripeMode ? '' : data.freemius_product_id,
        freemius_plan_id: isStripeMode ? '' : data.freemius_plan_id,
        upc: isStripeMode ? data.upc : null,
        variation_attributes: isStripeMode ? data.variation_attributes : [],
        variants: isStripeMode ? data.variants : [],
      };

      if (isEdit && updateAction) {
        await updateAction(normalizedData);
      } else if (createAction) {
        await createAction(normalizedData);
      } else {
        throw new Error('Product form action is not configured.');
      }
    } catch (error: any) {
      console.error(error);
      if (error.message === 'NEXT_REDIRECT') {
          return;
      }
      if (error.code === '23505') {
        const msg = error.message?.toLowerCase() || '';
        if (msg.includes('products_slug_key') || msg.includes('slug')) {
          setError('slug', { 
              type: 'manual', 
              message: 'This slug is already in use. Please choose another one.' 
          });
        } else if (msg.includes('products_sku_key') || msg.includes('sku')) {
          setError('sku', { 
              type: 'manual', 
              message: 'This SKU is already in use.' 
          });
        } else {
          alert(`Error saving product (Unique Violation): ${error.message}`);
        }
      } else {
          alert(`Error saving product: ${error.message}`);
      }
      setIsSubmitting(false);
    }
  };

  const disabledBaseFieldClass = hasVariants
    ? 'bg-muted/60 text-muted-foreground opacity-70'
    : '';

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-8">

      <input type="hidden" {...register('translation_group_id')} />

      <div className="space-y-8 w-full">
        <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Product Information</h2>
            {isEdit && initialData?.id && (
              <div className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded select-all" title="Internal System ID">
                ID: {initialData.id}
              </div>
            )}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <div>
              <Label htmlFor="sku">SKU</Label>
              <Input id="sku" {...register('sku')} placeholder="SKU-123" />
              {errors.sku && <p className="text-destructive text-sm">{errors.sku.message as string}</p>}
            </div>
            {isStripeMode && (
              <div>
                <Label htmlFor="upc">UPC</Label>
                <Input
                  id="upc"
                  {...register('upc')}
                  placeholder="012345678905"
                  readOnly={hasVariants}
                  className={disabledBaseFieldClass}
                />
                <p className="mt-1 text-[11px] text-muted-foreground">
                  {hasVariants
                    ? 'Parent UPC is ignored once at least one variation exists.'
                    : 'Use the parent UPC when this product has no variations.'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border shadow-sm space-y-5">
          <div className="flex items-center justify-between gap-4 flex-wrap">
            <h2 className="text-lg font-semibold">
              {isStripeMode ? 'Pricing & Inventory' : 'Freemius Configuration'}
            </h2>
            {isFreemiusMode && hasFreemiusProductId && (
              <SyncFreemiusPricingButton productId={watch('freemius_product_id') as string} />
            )}
          </div>

          {isStripeMode ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    {...register('price', { valueAsNumber: true })}
                    placeholder="0.00"
                    readOnly={hasVariants}
                    className={disabledBaseFieldClass}
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
                    readOnly={hasVariants}
                    className={disabledBaseFieldClass}
                  />
                </div>
                <div>
                  <Label htmlFor="stock">Qty</Label>
                  <Input
                    id="stock"
                    type="number"
                    {...register('stock', { valueAsNumber: true })}
                    placeholder="0"
                    readOnly={hasVariants}
                    className={disabledBaseFieldClass}
                  />
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-dashed p-4">
                <div>
                  <p className="font-medium">Variations</p>
                  <p className="text-sm text-muted-foreground">
                    {hasVariants
                      ? 'Variant prices, UPCs, images, and stock override the parent values.'
                      : 'Create size, color, or packaging options directly under pricing and inventory.'}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={showVariations ? 'outline' : 'default'}
                  onClick={() => setShowVariations((current) => !current)}
                >
                  {showVariations ? 'Hide Variations' : 'Create Variations'}
                </Button>
              </div>

              {showVariations && (
                <div className="border-t pt-6">
                  <VariationsEditor
                    globalAttributes={globalAttributesProp}
                    currentLanguageCode={currentLanguageCode}
                    baseSku={watch('sku') || ''}
                    basePrice={watch('price') || 0}
                    baseSalePrice={typeof watch('sale_price') === 'number' ? watch('sale_price') : null}
                    availableVariantImages={mediaForManager.map((media) => ({
                      media_id: media.media_id,
                      file_path: media.file_path,
                      alt: media.alt,
                    }))}
                    initialVariationAttributes={initialData?.variation_attributes}
                    initialVariants={initialData?.variants}
                    onChange={handleVariationChange}
                  />
                </div>
              )}
            </>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="freemius_product_id">Freemius Product ID</Label>
                  <Input id="freemius_product_id" {...register('freemius_product_id')} />
                </div>
                <div>
                  <Label htmlFor="freemius_plan_id">Freemius Plan ID</Label>
                  <Input id="freemius_plan_id" {...register('freemius_plan_id')} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground leading-relaxed">
                <strong>Note:</strong> Freemius products use synchronized plan pricing. Physical inventory and variations are only available in Stripe mode.
              </p>
              {freemiusDashboardNode && (
                <div className="pt-2 border-t">
                  {freemiusDashboardNode}
                </div>
              )}
            </>
          )}
        </div>

        <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
          <div className="flex flex-col space-y-4 mb-4">
            <div>
              <Label htmlFor="short_description" className="font-semibold text-lg block mb-2">Short Description (SEO)</Label>
              <Input {...register('short_description')} placeholder="Brief summary (SEO)..." />
            </div>
          </div>
          <Label className="mb-2 block font-semibold text-lg border-t pt-4">Detailed Description</Label>
          <div className="min-h-[400px] border rounded-lg overflow-hidden text-block-editor">
            {editorNode ? (
              React.cloneElement(editorNode as React.ReactElement<any>, {
                initialContent: watch('description_json') || {},
                onUpdate: (content: any) => setValue('description_json', content)
              })
            ) : (
              <div className="p-4 text-sm text-muted-foreground italic text-center mt-10">
                Editor not injected. Adding descriptions is disabled.
              </div>
            )}
          </div>
        </div>

        <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Media Gallery</h2>
          <ProductMediaManager
            initialMedia={mediaForManager}
            onUpdate={onMediaUpdate}
            mediaPickerNode={mediaPickerNode}
          />
          <input type="hidden" {...register('product_media')} />
        </div>

        <div className="p-6 bg-card rounded-lg border shadow-sm space-y-4">
          <h2 className="text-lg font-semibold">Publishing</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Status</Label>
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
              <Label className="mb-2 block">Language</Label>
              <Select
                onValueChange={(val) => setValue('language_id', parseInt(val, 10), { shouldValidate: true })}
                value={watch('language_id')?.toString()}
                defaultValue={watch('language_id')?.toString()}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select language" />
                </SelectTrigger>
                <SelectContent>
                  {availableLanguagesProp.map((lang) => (
                    <SelectItem key={lang.id} value={lang.id.toString()}>
                      {lang.name} ({lang.code.toUpperCase()})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.language_id && <p className="text-destructive text-sm">{errors.language_id.message as string}</p>}
            </div>
          </div>
        </div>
      </div>

      {/* Bottom Actions */}
      <div className="flex justify-end pt-4 border-t">
        <Button disabled={isSubmitting} type="submit" size="lg">
          {isSubmitting ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>
    </form>
  );
}
