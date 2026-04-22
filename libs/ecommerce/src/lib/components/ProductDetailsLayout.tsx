'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Download, Package, ShieldCheck } from 'lucide-react';
import { Badge, Button, Label, Separator } from '@nextblock-cms/ui';
import { formatPrice, useTranslations } from '@nextblock-cms/utils';

import { useProduct } from '../product-context';
import { ProductGallery } from './ProductGallery';
import { AddToCartButton } from './AddToCartButton';
import { SubscriptionSelector } from './SubscriptionSelector';
import { SimpleTiptapRenderer } from './SimpleTiptapRenderer';
import {
  chooseInitialVariantSelections,
  findMatchingVariant,
  getAvailableTermIdsForAttribute,
  normalizeSelectionsToAvailableVariants,
} from '../variation-utils';
import { useCurrency } from '../CurrencyProvider';
import { resolvePriceForCurrency } from '../currency';
import { isDigitalProduct } from '../types';

export const ProductDetailsLayout: React.FC = () => {
  const product = useProduct();
  const { t } = useTranslations();
  const { activeCurrencyCode, currencies } = useCurrency();

  const translateOrFallback = (
    key: string,
    fallback: string,
    params?: Record<string, string | number>
  ) => {
    const translated = t(key, params);
    return translated === key ? fallback : translated;
  };

  const images =
    product.images && product.images.length > 0
      ? product.images
      : product.image_url
        ? [{ url: product.image_url, alt: product.title }]
        : [];

  const isFreemius =
    (product as any).custom_props?.provider === 'freemius' || isDigitalProduct(product);
  const hasVariants =
    !isFreemius &&
    Boolean(product.has_variants && product.attributes?.length && product.variants?.length);
  const attributes = product.attributes || [];
  const variants = product.variants || [];
  const [selectedTerms, setSelectedTerms] = useState<Record<string, string | undefined>>(() =>
    chooseInitialVariantSelections(attributes, variants)
  );

  useEffect(() => {
    if (!hasVariants) {
      return;
    }

    setSelectedTerms(chooseInitialVariantSelections(attributes, variants));
  }, [attributes, hasVariants, product.id, variants]);

  const normalizedSelections = useMemo(() => {
    if (!hasVariants) {
      return selectedTerms;
    }

    return normalizeSelectionsToAvailableVariants(attributes, variants, selectedTerms);
  }, [attributes, hasVariants, selectedTerms, variants]);

  useEffect(() => {
    if (JSON.stringify(normalizedSelections) !== JSON.stringify(selectedTerms)) {
      setSelectedTerms(normalizedSelections);
    }
  }, [normalizedSelections, selectedTerms]);

  const selectedVariant = useMemo(() => {
    if (!hasVariants) {
      return null;
    }

    return findMatchingVariant(variants, normalizedSelections);
  }, [hasVariants, normalizedSelections, variants]);

  const resolvedBasePrice = resolvePriceForCurrency({
    prices: product.prices,
    salePrices: product.sale_prices,
    fallbackPrice: product.price,
    fallbackSalePrice: product.sale_price,
    currencyCode: activeCurrencyCode,
    currencies,
  });
  const resolvedVariantPrice =
    hasVariants && selectedVariant
      ? resolvePriceForCurrency({
          prices: selectedVariant.prices,
          salePrices: selectedVariant.sale_prices,
          fallbackPrice: selectedVariant.price,
          fallbackSalePrice: selectedVariant.sale_price,
          currencyCode: activeCurrencyCode,
          currencies,
        })
      : null;
  const effectivePrice = resolvedVariantPrice?.price ?? resolvedBasePrice.price;
  const effectiveSalePrice =
    resolvedVariantPrice?.sale_price ?? resolvedBasePrice.sale_price;
  const effectiveStock = hasVariants ? selectedVariant?.stock_quantity ?? 0 : product.stock ?? 0;

  const displayImages = useMemo(() => {
    if (!selectedVariant?.image_url) {
      return images;
    }

    const variantImage = {
      url: selectedVariant.image_url,
      alt: `${product.title} ${selectedVariant.label}`,
    };
    const dedupedImages = images.filter((image) => image.url !== selectedVariant.image_url);
    return [variantImage, ...dedupedImages];
  }, [images, product.title, selectedVariant]);

  const discountPercentage =
    typeof effectiveSalePrice === 'number' && effectivePrice > 0
      ? Math.round(((effectivePrice - effectiveSalePrice) / effectivePrice) * 100)
      : 0;

  const addToCartProduct =
    hasVariants && selectedVariant
      ? {
          ...product,
          sku: selectedVariant.sku,
          price: selectedVariant.price,
          prices: selectedVariant.prices,
          sale_price:
            typeof selectedVariant.sale_price === 'number' ? selectedVariant.sale_price : null,
          sale_prices: selectedVariant.sale_prices,
          image_url: selectedVariant.image_url || product.image_url,
          stock: selectedVariant.stock_quantity,
          variant_id: selectedVariant.id,
          variant_label: selectedVariant.label,
          selected_options: selectedVariant.selected_options,
          currency_code: activeCurrencyCode,
        }
      : {
          ...product,
          currency_code: activeCurrencyCode,
        };

  const handleSelectionChange = (attributeId: string, termId: string) => {
    setSelectedTerms((current) =>
      normalizeSelectionsToAvailableVariants(attributes, variants, {
        ...current,
        [attributeId]: termId,
      })
    );
  };

  const chooseOptionsLabel = translateOrFallback(
    'ecommerce.choose_your_options',
    'Choose Your Options'
  );
  const variantAvailabilityHelp = translateOrFallback(
    'ecommerce.variant_availability_help',
    'Select a combination to resolve the exact variant price and availability.'
  );
  const inStockLabel = translateOrFallback(
    'ecommerce.in_stock',
    `${effectiveStock} in stock`,
    { count: String(effectiveStock) }
  );
  const outOfStockLabel = translateOrFallback(
    'ecommerce.out_of_stock',
    'Out of stock'
  );
  const selectOptionsLabel = translateOrFallback(
    'ecommerce.select_options',
    'Select Options'
  );
  const variantSelectionRequiredLabel = translateOrFallback(
    'ecommerce.variant_selection_required',
    'Select one term from every dropdown to resolve a variation.'
  );

  return (
    <div className="container mx-auto px-4 md:px-6 py-12 animate-in fade-in slide-in-from-bottom-4 duration-700 ease-out">
      <div className="grid gap-12 lg:grid-cols-[2fr_3fr] items-start">
        <div className="w-full max-w-2xl mx-auto lg:max-w-none">
          <ProductGallery images={displayImages} className="w-full" />
        </div>

        <div className="flex flex-col gap-8 pt-2 max-w-xl mx-auto lg:mx-0 lg:max-w-none lg:top-24">
          <div className="space-y-6">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                {typeof effectiveSalePrice === 'number' && (
                  <Badge
                    variant="destructive"
                    className="px-2.5 py-1 text-xs font-bold uppercase tracking-wide animate-pulse shadow-sm"
                  >
                    {t('ecommerce.sale_badge', { percent: String(discountPercentage) })}
                  </Badge>
                )}
                {!isFreemius && effectiveStock > 0 && effectiveStock < 10 && (
                  <Badge
                    variant="outline"
                    className="text-amber-600 border-amber-200 bg-amber-50"
                  >
                    {t('ecommerce.low_stock', { count: String(effectiveStock) })}
                  </Badge>
                )}
              </div>

              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight text-foreground leading-[1.1]">
                {product.title}
              </h1>

              <div className="prose prose-neutral dark:prose-invert max-w-none text-muted-foreground leading-relaxed text-left">
                {product.short_description ? (
                  <div
                    className="text-lg mb-6 leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: product.short_description }}
                  />
                ) : null}
              </div>

              {!isFreemius && (
                <div className="flex items-baseline gap-4">
                  <div className="flex items-baseline gap-3">
                    <span className="text-4xl font-bold text-primary">
                      {formatPrice(effectiveSalePrice ?? effectivePrice, activeCurrencyCode)}
                    </span>
                    {typeof effectiveSalePrice === 'number' && (
                      <span className="text-2xl text-muted-foreground line-through decoration-destructive/30 decoration-2">
                        {formatPrice(effectivePrice, activeCurrencyCode)}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {hasVariants && (
              <div className="rounded-2xl border bg-muted/20 p-5 space-y-4">
                <div>
                  <h2 className="text-lg font-semibold">{chooseOptionsLabel}</h2>
                  <p className="text-sm text-muted-foreground">{variantAvailabilityHelp}</p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {attributes.map((attribute) => {
                    const availableTermIds = getAvailableTermIdsForAttribute(
                      variants,
                      attribute.id,
                      normalizedSelections
                    );

                    return (
                      <div key={attribute.id} className="space-y-2">
                        <Label htmlFor={`attribute-${attribute.id}`}>{attribute.name}</Label>
                        <select
                          id={`attribute-${attribute.id}`}
                          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                          value={normalizedSelections[attribute.id] || ''}
                          onChange={(event) =>
                            handleSelectionChange(attribute.id, event.target.value)
                          }
                        >
                          {attribute.terms.map((term) => (
                            <option
                              key={term.id}
                              value={term.id}
                              disabled={!availableTermIds.has(term.id)}
                            >
                              {term.value}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  })}
                </div>

                {selectedVariant ? (
                  <div className="flex flex-wrap items-center justify-between gap-3 text-sm">
                    <div className="text-muted-foreground">
                      <span className="font-medium text-foreground">SKU:</span> {selectedVariant.sku}
                    </div>
                    <div className={effectiveStock > 0 ? 'text-emerald-600' : 'text-destructive'}>
                      {effectiveStock > 0 ? inStockLabel : outOfStockLabel}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{variantSelectionRequiredLabel}</p>
                )}
              </div>
            )}

            <Separator className="my-2" />
          </div>

          <div className="p-8 rounded-2xl bg-secondary/10 border border-secondary/20 shadow-sm backdrop-blur-sm mt-auto">
            <div className="flex flex-col gap-4">
              {isFreemius ? (
                <SubscriptionSelector product={product} />
              ) : hasVariants && (!selectedVariant || effectiveStock <= 0) ? (
                <Button disabled className="w-full h-14 text-lg font-bold shadow-md">
                  {selectedVariant ? outOfStockLabel : selectOptionsLabel}
                </Button>
              ) : (
                <AddToCartButton
                  product={addToCartProduct}
                  className="w-full h-14 text-lg font-bold shadow-md transition-all hover:shadow-lg active:scale-[0.98]"
                />
              )}

              <div className="grid grid-cols-2 gap-4 text-center text-xs text-muted-foreground pt-2">
                <div className="flex items-center justify-center gap-2">
                  {(product as any).custom_props?.provider === 'freemius' ||
                  isDigitalProduct(product) ? (
                    <span className="inline-flex items-center gap-2">
                      <Download className="h-4 w-4" />
                      {t('ecommerce.instant_digital_delivery')}
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-2">
                      <Package className="h-4 w-4" />
                      {t('ecommerce.free_shipping')}
                    </span>
                  )}
                </div>
                <div className="flex items-center justify-center gap-2">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {t('ecommerce.secure_checkout')}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="prose prose-neutral dark:prose-invert max-w-none leading-relaxed mt-12">
        {product.description_json ? (
          <SimpleTiptapRenderer content={product.description_json} />
        ) : (
          <p className="italic text-sm">{t('ecommerce.no_description')}</p>
        )}
      </div>
    </div>
  );
};
