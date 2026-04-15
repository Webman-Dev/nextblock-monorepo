'use client';
import React, { useState, useEffect, useCallback } from 'react';

import { zodResolver } from '@hookform/resolvers/zod';
import {
  Badge,
  Button,
  Input,
  Label,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nextblock-cms/ui';
// Use dependency injection for NotionEditor to avoid SSR/lazy-loading issues
import { ProductFormValues, productSchema } from '../../../../product-schema';
import { useForm } from 'react-hook-form';
import { ProductMediaManager } from './ProductMediaManager';
import { SyncFreemiusPricingButton } from './SyncFreemiusPricingButton';
import { VariationsEditor } from './VariationsEditor';
import { ProductAttribute } from '../../../../types';

type ProductLanguageOption = {
  id: number;
  name: string;
  code: string;
  is_default?: boolean;
};

type ProductMediaRelation = {
  id?: string;
  media_id: string;
  sort_order?: number | null;
  media?: {
    file_path?: string | null;
    object_key?: string | null;
    alt_text?: string | null;
  } | null;
};

type ProductMediaManagerItem = {
  id: string;
  media_id: string;
  file_path: string;
  alt: string;
  sort_order: number;
};

type ProductFormInitialData = Omit<ProductFormValues, 'product_media'> & {
  id?: string;
  product_media?: ProductMediaRelation[];
  language_id?: number;
  translation_group_id?: string;
};

interface ProductFormProps {
  initialData?: ProductFormInitialData;
  isEdit?: boolean;
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: ProductLanguageOption[];
  globalAttributesProp: ProductAttribute[];
  translationGroupId?: string;
  targetLanguageId?: string;
  freemiusDashboardNode?: React.ReactNode;
  paymentProvider: 'stripe' | 'freemius';
  createAction?: (data: ProductFormValues) => Promise<void>;
  updateAction?: (data: ProductFormValues) => Promise<void>;
}

interface FormSectionProps {
  title: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}

function FormSection({ title, description, action, children }: FormSectionProps) {
  return (
    <section className="rounded-lg border bg-card p-6 shadow-sm space-y-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">{title}</h2>
          {description ? (
            <p className="text-sm text-muted-foreground max-w-3xl">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function resolveDefaultLanguageId(
  initialData: ProductFormInitialData | undefined,
  targetLanguageId: string | undefined,
  availableLanguages: ProductLanguageOption[]
) {
  const parsedTargetLanguageId = targetLanguageId
    ? Number.parseInt(targetLanguageId, 10)
    : undefined;

  return (
    initialData?.language_id ||
    (Number.isFinite(parsedTargetLanguageId) ? parsedTargetLanguageId : undefined) ||
    availableLanguages.find((language) => language.is_default)?.id ||
    availableLanguages[0]?.id ||
    1
  );
}

function buildProductFormDefaults(
  initialData: ProductFormInitialData | undefined,
  targetLanguageId: string | undefined,
  availableLanguages: ProductLanguageOption[],
  translationGroupId?: string
): ProductFormValues {
  return {
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    upc: initialData?.upc || '',
    price: typeof initialData?.price === 'number' ? initialData.price / 100 : 0,
    sale_price:
      typeof initialData?.sale_price === 'number' ? initialData.sale_price / 100 : null,
    stock: initialData?.stock || 0,
    short_description: initialData?.short_description || '',
    description_json:
      initialData?.description_json || {
        type: 'doc',
        content: [{ type: 'paragraph' }],
      },
    freemius_product_id: initialData?.freemius_product_id || '',
    freemius_plan_id: initialData?.freemius_plan_id || '',
    status: initialData?.status || 'draft',
    language_id: resolveDefaultLanguageId(
      initialData,
      targetLanguageId,
      availableLanguages
    ),
    translation_group_id:
      initialData?.translation_group_id || translationGroupId || undefined,
    product_media:
      initialData?.product_media?.map((productMedia) => ({
        media_id: productMedia.media_id,
      })) || [],
    variation_attributes: initialData?.variation_attributes || [],
    variants: initialData?.variants || [],
  };
}

function buildMediaManagerItems(
  productMedia: ProductFormInitialData['product_media']
): ProductMediaManagerItem[] {
  if (!productMedia) {
    return [];
  }

  return productMedia
    .map((item) => ({
      id: item.id || item.media_id,
      media_id: item.media_id,
      file_path: item.media?.file_path || item.media?.object_key || '',
      alt: item.media?.alt_text || '',
      sort_order: item.sort_order ?? 0,
    }))
    .sort((left, right) => left.sort_order - right.sort_order);
}

function serializeProductMedia(items: ProductMediaManagerItem[]) {
  return items.map((item) => ({ media_id: item.media_id }));
}

function buildVariantImageOptions(items: ProductMediaManagerItem[]) {
  return items.map((item) => ({
    media_id: item.media_id,
    file_path: item.file_path,
    alt: item.alt,
  }));
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
    defaultValues: buildProductFormDefaults(
      initialData,
      targetLanguageId,
      availableLanguagesProp,
      translationGroupId
    ),
  });

  const {
    register,
    handleSubmit,
    setValue,
    reset,
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

  const [mediaForManager, setMediaForManager] = useState<ProductMediaManagerItem[]>(() =>
    buildMediaManagerItems(initialData?.product_media)
  );

  const [removedMediaIds, setRemovedMediaIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    reset(
      buildProductFormDefaults(
        initialData,
        targetLanguageId,
        availableLanguagesProp,
        translationGroupId
      )
    );
    setMediaForManager(buildMediaManagerItems(initialData?.product_media));
    setRemovedMediaIds(new Set());
    setShowVariations(Boolean(initialData?.variants?.length));
  }, [
    availableLanguagesProp,
    initialData,
    reset,
    targetLanguageId,
    translationGroupId,
  ]);

  const onMediaUpdate = (updatedMedia: ProductMediaManagerItem[]) => {
      // identify items that were in mediaForManager but are not in updatedMedia
      const currentIds = new Set(updatedMedia.map(m => m.id));
      const removed = mediaForManager.filter(m => !currentIds.has(m.id));

      const nextRemovedMediaIds = new Set(removedMediaIds);
      removed.forEach((mediaItem) => {
        if (mediaItem.media_id) {
          nextRemovedMediaIds.add(mediaItem.media_id);
        }
      });

      setRemovedMediaIds(nextRemovedMediaIds);
      setMediaForManager(updatedMedia);
      setValue('product_media', serializeProductMedia(updatedMedia), { shouldDirty: true });
      setValue('explicitly_removed_media_ids', Array.from(nextRemovedMediaIds), {
        shouldDirty: true,
      });
  };

  // Keep the hidden field aligned with the latest gallery removals.
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
  const variantImageOptions = buildVariantImageOptions(mediaForManager);

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 pb-8">

      <input type="hidden" {...register('translation_group_id')} />

      <div className="space-y-8 w-full">
        <FormSection
          title="Product Information"
          description="Set the core catalog details shoppers and integrations rely on."
          action={
            isEdit && initialData?.id ? (
              <div
                className="text-[10px] font-mono text-muted-foreground bg-muted/50 px-2 py-1 rounded select-all"
                title="Internal System ID"
              >
                ID: {initialData.id}
              </div>
            ) : null
          }
        >
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
        </FormSection>

        <FormSection
          title={isStripeMode ? 'Pricing & Inventory' : 'Freemius Configuration'}
          description={
            isStripeMode
              ? 'Keep the parent product simple, or switch to variant-driven pricing and stock when needed.'
              : 'Connect the product to its Freemius catalog IDs and let synced plan pricing drive the storefront.'
          }
          action={
            <div className="flex items-center gap-2 flex-wrap">
              {isStripeMode && hasVariants ? (
                <Badge variant="secondary">Variant-driven pricing active</Badge>
              ) : null}
              {isFreemiusMode && hasFreemiusProductId ? (
                <SyncFreemiusPricingButton productId={watch('freemius_product_id') as string} />
              ) : null}
            </div>
          }
        >
          {isStripeMode ? (
            <>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
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
                    min="0"
                    {...register('sale_price', {
                      setValueAs: (value) => (value === '' ? null : Number(value)),
                    })}
                    placeholder="0.00"
                    readOnly={hasVariants}
                    className={disabledBaseFieldClass}
                  />
                  {errors.sale_price && (
                    <p className="text-destructive text-sm">{errors.sale_price.message as string}</p>
                  )}
                </div>
                <div>
                  <Label htmlFor="stock">Qty</Label>
                  <Input
                    id="stock"
                    type="number"
                    min="0"
                    {...register('stock', { valueAsNumber: true })}
                    placeholder="0"
                    readOnly={hasVariants}
                    className={disabledBaseFieldClass}
                  />
                  <p className="mt-1 text-[11px] text-muted-foreground">
                    Products using this same SKU share inventory. Use Inventory for bulk updates and
                    CSV imports.
                  </p>
                  {errors.stock && <p className="text-destructive text-sm">{errors.stock.message as string}</p>}
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
                    availableVariantImages={variantImageOptions}
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
        </FormSection>

        <FormSection
          title="Description"
          description="Write a short SEO summary and a rich product story for the detail page."
        >
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
        </FormSection>

        <FormSection
          title="Media Gallery"
          description="Reorder the gallery to control the parent product image and the variant image options."
        >
          <ProductMediaManager
            initialMedia={mediaForManager}
            onUpdate={onMediaUpdate}
            mediaPickerNode={mediaPickerNode}
          />
          <input type="hidden" {...register('product_media')} />
        </FormSection>

        <FormSection
          title="Publishing"
          description="Choose the language and publication status for this catalog entry."
        >
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label className="mb-2 block">Status</Label>
              <Select
                onValueChange={(val) => setValue('status', val as any)}
                value={watch('status')}
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
        </FormSection>
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
