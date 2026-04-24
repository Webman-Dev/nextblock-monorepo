'use client';
import React, { useState, useEffect, useCallback } from 'react';
import type { z } from 'zod';

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
import { CurrencyPriceFields } from './CurrencyPriceFields';
import {
  getStoreManagedPriceCurrencyCodes,
  resolveEditorCurrencyPriceMaps,
  sanitizeProductFormValuesForStoreManagedCurrencies,
} from '../product-price-sync';
import {
  type EnabledPaymentProviders,
  ProductAttribute,
  derivePaymentProviderFromProductType,
} from '../../../../types';
import { convertMinorUnitAmount, type CurrencyRecord } from '../../../../currency';
import {
  majorUnitAmountToMinor,
  minorUnitAmountToMajor,
} from '@nextblock-cms/utils';

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

type ProductFormInitialData = Omit<z.infer<typeof productSchema>, 'product_media'> & {
  id?: string;
  product_media?: ProductMediaRelation[];
  language_id?: number;
  translation_group_id?: string;
};

type PaymentConfigStatus = {
  stripe: {
    hasKeys: boolean;
    missing: string[];
  };
  freemius: {
    hasKeys: boolean;
    missing: string[];
  };
};

interface ProductFormProps {
  initialData?: ProductFormInitialData;
  isEdit?: boolean;
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: ProductLanguageOption[];
  globalAttributesProp: ProductAttribute[];
  currenciesProp: CurrencyRecord[];
  translationGroupId?: string;
  targetLanguageId?: string;
  freemiusDashboardNode?: React.ReactNode;
  enabledProviders: EnabledPaymentProviders;
  configStatus: PaymentConfigStatus;
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
  currencies: CurrencyRecord[],
  translationGroupId?: string
): z.input<typeof productSchema> {
  const defaultCurrency =
    currencies.find((currency) => currency.is_default) ?? currencies[0];
  const defaultCurrencyCode = defaultCurrency?.code || 'USD';
  const initialPrices =
    initialData?.prices && Object.keys(initialData.prices).length > 0
      ? initialData.prices
      : {
          [defaultCurrencyCode]:
            typeof initialData?.price === 'number' ? initialData.price / 100 : 0,
        };
  const initialSalePrices =
    initialData?.sale_prices && Object.keys(initialData.sale_prices).length > 0
      ? initialData.sale_prices
      : typeof initialData?.sale_price === 'number'
        ? {
            [defaultCurrencyCode]: initialData.sale_price / 100,
          }
        : {};
  const productType = initialData?.product_type || '';
  const paymentProvider =
    initialData?.payment_provider ||
    (initialData?.product_type
      ? derivePaymentProviderFromProductType(initialData.product_type)
      : 'stripe');

  const sanitizedDefaults = sanitizeProductFormValuesForStoreManagedCurrencies({
    product_type: (productType || 'physical') as ProductFormValues['product_type'],
    payment_provider: paymentProvider as ProductFormValues['payment_provider'],
    title: initialData?.title || '',
    slug: initialData?.slug || '',
    sku: initialData?.sku || '',
    upc: initialData?.upc || '',
    is_taxable: initialData?.is_taxable ?? true,
    price: typeof initialData?.price === 'number' ? initialData.price / 100 : 0,
    prices: initialPrices,
    sale_price:
      typeof initialData?.sale_price === 'number' ? initialData.sale_price / 100 : null,
    sale_prices: initialSalePrices,
    stock: initialData?.stock || 0,
    meta_title: initialData?.meta_title || '',
    meta_description: initialData?.meta_description || '',
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
    variants:
      initialData?.variants?.map((variant) => ({
        ...variant,
        prices: variant.prices || {},
        sale_prices: variant.sale_prices || {},
      })) || [],
  }, currencies);

  return {
    ...sanitizedDefaults,
    product_type: productType,
    payment_provider: paymentProvider,
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
  currenciesProp,
  translationGroupId,
  targetLanguageId,
  freemiusDashboardNode,
  enabledProviders,
  configStatus,
  createAction,
  updateAction
}: ProductFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showVariations, setShowVariations] = useState(() => Boolean(initialData?.variants?.length));
  const currencies = React.useMemo(
    () =>
      currenciesProp
        .filter((currency) => currency.is_active !== false)
        .sort((left, right) => {
          if (left.is_default !== right.is_default) {
            return left.is_default ? -1 : 1;
          }

          return left.code.localeCompare(right.code);
        }),
    [currenciesProp]
  );
  const defaultCurrency = React.useMemo(
    () => currencies.find((currency) => currency.is_default) ?? currencies[0],
    [currencies]
  );
  const storeManagedPriceCurrencyCodes = React.useMemo(
    () => getStoreManagedPriceCurrencyCodes(currencies),
    [currencies]
  );
  const form = useForm<z.input<typeof productSchema>, unknown, ProductFormValues>({
    resolver: zodResolver(productSchema),
    defaultValues: buildProductFormDefaults(
      initialData,
      targetLanguageId,
      availableLanguagesProp,
      currencies,
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
  const productType = watch('product_type');
  const derivedPaymentProvider =
    productType === 'digital'
      ? 'freemius'
      : productType === 'physical'
        ? 'stripe'
        : undefined;
  const isStripeMode = productType === 'physical';
  const isFreemiusMode = productType === 'digital';
  const isProviderEnabled = derivedPaymentProvider
    ? enabledProviders[derivedPaymentProvider]
    : false;
  const isProviderReady = derivedPaymentProvider
    ? configStatus[derivedPaymentProvider].hasKeys
    : false;
  const hasFreemiusProductId = !!watch('freemius_product_id');
  const variants = (watch('variants') || []) as NonNullable<ProductFormValues['variants']>;
  const baseProductPrice = watch('price') as number;
  const baseProductSalePrice = watch('sale_price') as number | null;
  const productPrices = (watch('prices') || {}) as Record<string, number>;
  const productSalePrices = (watch('sale_prices') || {}) as Record<string, number | null>;
  const hasVariants = (variants?.length || 0) > 0;
  const selectedLanguageId = watch('language_id');
  const currentLanguageCode =
    availableLanguagesProp.find((lang) => lang.id === selectedLanguageId)?.code ||
    availableLanguagesProp.find((lang) => lang.is_default)?.code ||
    availableLanguagesProp[0]?.code;
  const resolvedProductPriceMaps = React.useMemo(
    () =>
      resolveEditorCurrencyPriceMaps({
        currencies,
        prices: productPrices,
        salePrices: productSalePrices,
        fallbackPrice: baseProductPrice,
        fallbackSalePrice: baseProductSalePrice,
      }),
    [baseProductPrice, baseProductSalePrice, currencies, productPrices, productSalePrices]
  );
  const initialVariantsForEditor = React.useMemo(
    () =>
      initialData?.variants?.map((variant) => ({
        ...variant,
        prices: variant.prices || {},
        sale_prices: variant.sale_prices || {},
      })),
    [initialData?.variants]
  );

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
        currencies,
        translationGroupId
      )
    );
    setMediaForManager(buildMediaManagerItems(initialData?.product_media));
    setRemovedMediaIds(new Set());
    setShowVariations(Boolean(initialData?.variants?.length));
  }, [
    availableLanguagesProp,
    currencies,
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

  useEffect(() => {
    register('is_taxable');
    register('price');
    register('sale_price');
    register('payment_provider');
  }, [register]);

  useEffect(() => {
    if (!derivedPaymentProvider) {
      return;
    }

    setValue('payment_provider', derivedPaymentProvider, {
      shouldDirty: false,
      shouldValidate: true,
    });
  }, [derivedPaymentProvider, setValue]);

  useEffect(() => {
    if (!defaultCurrency) {
      return;
    }

    if (productPrices[defaultCurrency.code] === undefined) {
      setValue(
        'prices',
        {
          ...productPrices,
          [defaultCurrency.code]: baseProductPrice || 0,
        },
        { shouldDirty: false }
      );
    }
  }, [baseProductPrice, defaultCurrency, productPrices, setValue]);

  const handleProductPriceChange = useCallback(
    (currencyCode: string, value: number) => {
      const nextPrices = {
        ...productPrices,
        [currencyCode]: value,
      };
      setValue('prices', nextPrices, { shouldDirty: true, shouldValidate: true });

      if (currencyCode === defaultCurrency?.code) {
        setValue('price', value, { shouldDirty: true, shouldValidate: true });
      }
    },
    [defaultCurrency?.code, productPrices, setValue]
  );

  const handleProductSalePriceChange = useCallback(
    (currencyCode: string, value: number | null) => {
      const nextSalePrices = {
        ...productSalePrices,
        [currencyCode]: value,
      };
      setValue('sale_prices', nextSalePrices, {
        shouldDirty: true,
        shouldValidate: true,
      });

      if (currencyCode === defaultCurrency?.code) {
        setValue('sale_price', value, { shouldDirty: true, shouldValidate: true });
      }
    },
    [defaultCurrency?.code, productSalePrices, setValue]
  );

  const handleAutoFillProductPrices = useCallback(() => {
    if (!defaultCurrency) {
      return;
    }

    const storeManagedCurrencyCodeSet = new Set(storeManagedPriceCurrencyCodes);

    const baseRegularPrice =
      productPrices[defaultCurrency.code] ?? baseProductPrice ?? 0;
    const baseSalePrice =
      productSalePrices[defaultCurrency.code] ?? baseProductSalePrice ?? null;

    const nextPrices = currencies.reduce<Record<string, number>>((accumulator, currency) => {
      if (
        currency.code !== defaultCurrency.code &&
        storeManagedCurrencyCodeSet.has(currency.code)
      ) {
        return accumulator;
      }

      const convertedMinor = convertMinorUnitAmount({
        amount: majorUnitAmountToMinor(baseRegularPrice, defaultCurrency.code),
        fromCurrencyCode: defaultCurrency.code,
        toCurrencyCode: currency.code,
        currencies,
        applyRounding: true,
      });
      accumulator[currency.code] = minorUnitAmountToMajor(convertedMinor, currency.code);
      return accumulator;
    }, {});

    const nextSalePrices = currencies.reduce<Record<string, number | null>>(
      (accumulator, currency) => {
        if (
          currency.code !== defaultCurrency.code &&
          storeManagedCurrencyCodeSet.has(currency.code)
        ) {
          return accumulator;
        }

        if (typeof baseSalePrice !== 'number') {
          if (currency.code === defaultCurrency.code || !storeManagedCurrencyCodeSet.has(currency.code)) {
            accumulator[currency.code] = null;
          }
          return accumulator;
        }

        const convertedMinor = convertMinorUnitAmount({
          amount: majorUnitAmountToMinor(baseSalePrice, defaultCurrency.code),
          fromCurrencyCode: defaultCurrency.code,
          toCurrencyCode: currency.code,
          currencies,
          applyRounding: true,
        });
        accumulator[currency.code] = minorUnitAmountToMajor(convertedMinor, currency.code);
        return accumulator;
      },
      {}
    );

    setValue('prices', nextPrices, { shouldDirty: true, shouldValidate: true });
    setValue('sale_prices', nextSalePrices, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('price', nextPrices[defaultCurrency.code] ?? baseRegularPrice, {
      shouldDirty: true,
      shouldValidate: true,
    });
    setValue('sale_price', nextSalePrices[defaultCurrency.code] ?? null, {
      shouldDirty: true,
      shouldValidate: true,
    });
  }, [
    currencies,
    defaultCurrency,
    productPrices,
    productSalePrices,
    setValue,
    storeManagedPriceCurrencyCodes,
    baseProductPrice,
    baseProductSalePrice,
  ]);

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
      if (!derivedPaymentProvider) {
        setError('product_type', {
          type: 'manual',
          message: 'Select whether this product is physical or digital before saving.',
        });
        setIsSubmitting(false);
        return;
      }

      if (
        data.status === 'active' &&
        (!isProviderEnabled || !isProviderReady)
      ) {
        setError('product_type', {
          type: 'manual',
          message: `${derivedPaymentProvider === 'stripe' ? 'Stripe' : 'Freemius'} must be enabled and fully configured before this product can be published.`,
        });
        setIsSubmitting(false);
        return;
      }

      const normalizedData: ProductFormValues = {
        ...data,
        product_type: data.product_type,
        payment_provider: derivedPaymentProvider,
        freemius_product_id: isStripeMode ? '' : data.freemius_product_id,
        freemius_plan_id: isStripeMode ? '' : data.freemius_plan_id,
        upc: isStripeMode ? data.upc : null,
        is_taxable: isStripeMode ? data.is_taxable : false,
        variation_attributes: isStripeMode ? data.variation_attributes : [],
        variants: isStripeMode ? data.variants : [],
      };
      const sanitizedData = sanitizeProductFormValuesForStoreManagedCurrencies(
        normalizedData,
        currencies
      );

      if (isEdit && updateAction) {
        await updateAction(sanitizedData);
      } else if (createAction) {
        await createAction(sanitizedData);
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
      <input type="hidden" {...register('payment_provider')} />

      <div className="space-y-8 w-full">
        <FormSection
          title="Product Type"
          description="Choose whether this catalog item is a physical good or a digital product. The payment provider is derived automatically from this choice."
        >
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <Label className="mb-2 block">Type</Label>
              <Select
                onValueChange={(value) =>
                  setValue('product_type', value as ProductFormValues['product_type'], {
                    shouldDirty: true,
                    shouldValidate: true,
                  })
                }
                value={productType || undefined}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose product type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="physical">Physical</SelectItem>
                  <SelectItem value="digital">Digital</SelectItem>
                </SelectContent>
              </Select>
              {errors.product_type && (
                <p className="text-destructive text-sm">{errors.product_type.message as string}</p>
              )}
            </div>
            <div className="rounded-lg border bg-muted/20 p-4">
              <p className="text-sm font-medium">Derived Payment Provider</p>
              <p className="mt-1 text-lg font-semibold">
                {derivedPaymentProvider
                  ? derivedPaymentProvider === 'stripe'
                    ? 'Stripe'
                    : 'Freemius'
                  : 'Select a product type'}
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Physical products always use Stripe. Digital products always use Freemius.
              </p>
            </div>
          </div>

          {derivedPaymentProvider ? (
            <div
              className={`rounded-lg border p-4 ${
                isProviderEnabled && isProviderReady
                  ? 'border-emerald-200 bg-emerald-50/70'
                  : 'border-amber-200 bg-amber-50/70'
              }`}
            >
              <p className="font-medium">
                {derivedPaymentProvider === 'stripe' ? 'Stripe' : 'Freemius'} status
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {isProviderEnabled
                  ? isProviderReady
                    ? 'This provider is enabled and ready for checkout.'
                    : 'This provider is enabled in settings, but required environment variables are still missing.'
                  : 'This provider is currently disabled in Payment Settings.'}
              </p>
              {!isProviderReady && configStatus[derivedPaymentProvider].missing.length > 0 ? (
                <p className="mt-2 text-xs text-muted-foreground">
                  Missing keys: {configStatus[derivedPaymentProvider].missing.join(', ')}
                </p>
              ) : null}
            </div>
          ) : null}
        </FormSection>

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

          {isStripeMode && (
            <div className="rounded-lg border bg-muted/20 p-4">
              <label htmlFor="is-taxable" className="flex cursor-pointer items-start gap-3">
                <input
                  id="is-taxable"
                  type="checkbox"
                  checked={watch('is_taxable')}
                  onChange={(event) =>
                    setValue('is_taxable', event.target.checked, { shouldDirty: true })
                  }
                  className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
                />
                <span className="space-y-1">
                  <span className="block font-medium">Charge tax on this product</span>
                  <span className="block text-sm text-muted-foreground">
                    Disable this for tax-exempt physical items when Stripe taxes are enabled.
                  </span>
                </span>
              </label>
            </div>
          )}
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
              <div className="grid grid-cols-1 gap-4">
                <CurrencyPriceFields
                  idPrefix="product"
                  currencies={currencies}
                  prices={resolvedProductPriceMaps.prices}
                  salePrices={resolvedProductPriceMaps.salePrices}
                  managedCurrencyCodes={storeManagedPriceCurrencyCodes}
                  onPriceChange={handleProductPriceChange}
                  onSalePriceChange={handleProductSalePriceChange}
                  onAutoFill={handleAutoFillProductPrices}
                  readOnly={hasVariants}
                  helperText={
                    hasVariants
                      ? 'Parent prices stay as a fallback, but active variants define the live shopper price.'
                      : storeManagedPriceCurrencyCodes.length > 0
                        ? `Store-managed currencies update automatically from ${defaultCurrency?.code || 'the base currency'}. Manual FX fills remain available for the rest.`
                        : undefined
                  }
                />
                {errors.price && (
                  <p className="text-destructive text-sm">{errors.price.message as string}</p>
                )}
                {errors.sale_price && (
                  <p className="text-destructive text-sm">{errors.sale_price.message as string}</p>
                )}
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
                    basePrice={baseProductPrice || 0}
                    basePrices={productPrices}
                    baseSalePrice={
                      typeof baseProductSalePrice === 'number' ? baseProductSalePrice : null
                    }
                    baseSalePrices={productSalePrices}
                    currencies={currencies}
                    availableVariantImages={variantImageOptions}
                    initialVariationAttributes={initialData?.variation_attributes}
                    initialVariants={initialVariantsForEditor}
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
          title="Search Engine Optimization (SEO)"
          description="Control how this product appears in Google and other search engines."
        >
          <div className="grid grid-cols-1 gap-6">
            <div>
              <Label htmlFor="meta_title">Meta Title (SEO)</Label>
              <Input id="meta_title" {...register('meta_title')} placeholder="Product Meta Title..." className="mt-1" />
              <p className="text-[11px] text-muted-foreground mt-1">Recommended: 50-60 characters. Falls back to product title if empty.</p>
            </div>
            <div>
              <Label htmlFor="meta_description">Meta Description (SEO)</Label>
              <textarea
                id="meta_description"
                {...register('meta_description')}
                placeholder="Product Meta Description..."
                rows={3}
                className="mt-1 flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
              />
              <p className="text-[11px] text-muted-foreground mt-1">Recommended: 150-160 characters. Falls back to short description if empty.</p>
            </div>
          </div>
        </FormSection>

        <FormSection
          title="Product Story"
          description="Write a rich story and detailed description for the product page."
        >
          <div className="mb-6">
            <Label htmlFor="short_description" className="font-semibold mb-2 block">Short Description / Excerpt</Label>
            <Input id="short_description" {...register('short_description')} placeholder="Brief summary shown on product cards..." />
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
              {errors.status && (
                <p className="text-destructive text-sm">{errors.status.message as string}</p>
              )}
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
