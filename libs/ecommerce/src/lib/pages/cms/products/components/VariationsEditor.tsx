'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Input, Label } from '@nextblock-cms/ui';

import { ProductFormValues } from '../../../../product-schema';
import {
  ProductVariantDraft,
  VariationSelectionGroup,
  extractSelectedTermsByAttribute,
  generateVariantDrafts,
  resolveAttributeName,
  resolveTermValue,
} from '../../../../variation-utils';
import { ProductAttribute } from '../../../../types';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';
const SUPABASE_PUBLIC_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const resolveMediaUrl = (path: string) => {
  if (path.startsWith('http')) {
    return path;
  }

  if (R2_BASE_URL) {
    return `${R2_BASE_URL.replace(/\/+$/, '')}/${path.replace(/^\/+/, '')}`;
  }

  if (SUPABASE_PUBLIC_URL) {
    return `${SUPABASE_PUBLIC_URL.replace(/\/+$/, '')}/storage/v1/object/public/media/${path.replace(/^\/+/, '')}`;
  }

  return path;
};

interface VariationsEditorProps {
  globalAttributes: ProductAttribute[];
  currentLanguageCode?: string;
  baseSku: string;
  basePrice: number;
  baseSalePrice?: number | null;
  availableVariantImages?: Array<{
    media_id: string;
    file_path: string;
    alt?: string | null;
  }>;
  initialVariationAttributes?: ProductFormValues['variation_attributes'];
  initialVariants?: ProductFormValues['variants'];
  onChange: (payload: {
    variationAttributes: ProductFormValues['variation_attributes'];
    variants: ProductFormValues['variants'];
  }) => void;
}

function formatCurrency(value: number) {
  return `$${value.toFixed(2)}`;
}

function buildVariationAttributes(selectedTermsByAttribute: Record<string, string[]>) {
  return Object.entries(selectedTermsByAttribute)
    .filter(([, termIds]) => termIds.length > 0)
    .map(([attribute_id, term_ids]) => ({ attribute_id, term_ids }));
}

export function VariationsEditor({
  globalAttributes,
  currentLanguageCode,
  baseSku,
  basePrice,
  baseSalePrice,
  availableVariantImages = [],
  initialVariationAttributes,
  initialVariants,
  onChange,
}: VariationsEditorProps) {
  const [selectedTermsByAttribute, setSelectedTermsByAttribute] = useState<Record<string, string[]>>(() => {
    if (initialVariationAttributes && initialVariationAttributes.length > 0) {
      return initialVariationAttributes.reduce<Record<string, string[]>>((accumulator, attribute) => {
        accumulator[attribute.attribute_id] = attribute.term_ids;
        return accumulator;
      }, {});
    }

    return extractSelectedTermsByAttribute(initialVariants || []);
  });
  const [variantDrafts, setVariantDrafts] = useState<ProductVariantDraft[]>(
    (initialVariants as ProductVariantDraft[]) || []
  );

  const selectedAttributes = useMemo<VariationSelectionGroup[]>(
    () =>
      globalAttributes
        .map((attribute) => ({
          attribute_id: attribute.id,
          attribute_name: resolveAttributeName(attribute, currentLanguageCode),
          terms: attribute.terms
            .filter((term) => (selectedTermsByAttribute[attribute.id] || []).includes(term.id))
            .map((term) => ({
              ...term,
              value: resolveTermValue(term, currentLanguageCode),
            })),
        }))
        .filter((attribute) => attribute.terms.length > 0),
    [currentLanguageCode, globalAttributes, selectedTermsByAttribute]
  );

  useEffect(() => {
    if (selectedAttributes.length === 0) {
      setVariantDrafts([]);
      return;
    }

    setVariantDrafts((currentDrafts) =>
      generateVariantDrafts({
        baseSku,
        basePrice,
        baseSalePrice,
        selectedAttributes,
        previousVariants: currentDrafts,
      })
    );
  }, [basePrice, baseSalePrice, baseSku, selectedAttributes]);

  useEffect(() => {
    onChange({
      variationAttributes: buildVariationAttributes(selectedTermsByAttribute),
      variants: variantDrafts,
    });
  }, [onChange, selectedTermsByAttribute, variantDrafts]);

  const totalVariantStock = variantDrafts.reduce(
    (accumulator, variant) => accumulator + (variant.stock_quantity || 0),
    0
  );

  const handleToggleTerm = (attributeId: string, termId: string) => {
    setSelectedTermsByAttribute((current) => {
      const selectedTerms = new Set(current[attributeId] || []);
      if (selectedTerms.has(termId)) {
        selectedTerms.delete(termId);
      } else {
        selectedTerms.add(termId);
      }

      return {
        ...current,
        [attributeId]: [...selectedTerms],
      };
    });
  };

  const handleVariantChange = (
    combinationKey: string,
    field: 'sku' | 'upc' | 'price' | 'sale_price' | 'stock_quantity',
    value: string
  ) => {
    setVariantDrafts((currentDrafts) =>
      currentDrafts.map((variant) => {
        if (variant.combination_key !== combinationKey) {
          return variant;
        }

        if (field === 'sku') {
          return {
            ...variant,
            sku: value,
          };
        }

        if (field === 'upc') {
          return {
            ...variant,
            upc: value,
          };
        }

        if (field === 'sale_price' && value === '') {
          return {
            ...variant,
            sale_price: null,
          };
        }

        const numericValue = value === '' ? 0 : Number(value);

        return {
          ...variant,
          [field]: Number.isFinite(numericValue) ? numericValue : 0,
        };
      })
    );
  };

  const handleVariantImageSelect = (
    combinationKey: string,
    selectedMediaId: string
  ) => {
    const selectedMedia = availableVariantImages.find((image) => image.media_id === selectedMediaId);
    if (!selectedMedia) {
      return;
    }

    const filePath = selectedMedia.file_path;
    const imageUrl = resolveMediaUrl(filePath);

    setVariantDrafts((currentDrafts) =>
      currentDrafts.map((variant) =>
        variant.combination_key === combinationKey
          ? {
              ...variant,
              main_media_id: selectedMedia.media_id,
              main_image_url: imageUrl,
            }
          : variant
      )
    );
  };

  const clearVariantImage = (combinationKey: string) => {
    setVariantDrafts((currentDrafts) =>
      currentDrafts.map((variant) =>
        variant.combination_key === combinationKey
          ? {
              ...variant,
              main_media_id: null,
              main_image_url: null,
            }
          : variant
      )
    );
  };

  if (globalAttributes.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
        No global attributes have been created yet. Create them first in{' '}
        <Link href="/cms/products/attributes" className="font-medium text-primary underline-offset-4 hover:underline">
          Attribute Management
        </Link>
        .
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-2">
            <h2 className="text-lg font-semibold">Assign Global Attributes</h2>
            <p className="text-sm text-muted-foreground">
              Select the terms that apply to this product. The variation matrix is generated from every possible combination.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline">{variantDrafts.length} variants</Badge>
            <Badge variant="secondary">Total stock: {totalVariantStock}</Badge>
            <Button asChild variant="outline" size="sm">
              <Link href="/cms/products/attributes">Manage Attributes</Link>
            </Button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-2">
          {globalAttributes.map((attribute) => {
            const selectedTerms = selectedTermsByAttribute[attribute.id] || [];

            return (
              <div key={attribute.id} className="rounded-lg border p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <h3 className="font-medium">{resolveAttributeName(attribute, currentLanguageCode)}</h3>
                    <p className="text-xs text-muted-foreground">{attribute.slug}</p>
                  </div>
                  <Badge variant="outline">{selectedTerms.length} selected</Badge>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {attribute.terms.map((term) => {
                    const isSelected = selectedTerms.includes(term.id);

                    return (
                      <button
                        key={term.id}
                        type="button"
                        onClick={() => handleToggleTerm(attribute.id, term.id)}
                        className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${
                          isSelected
                            ? 'border-primary bg-primary/10 text-primary'
                            : 'border-border bg-background text-foreground hover:border-primary/40'
                        }`}
                      >
                        {resolveTermValue(term, currentLanguageCode)}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Generated Variation Matrix</h2>
          <p className="text-sm text-muted-foreground">
            Each combination gets its own SKU, regular price, sale price, and stock quantity.
          </p>
          <p className="text-xs text-muted-foreground">
            Variant inventory is shared by matching variant SKU, even when that SKU appears on
            translated products.
          </p>
        </div>

        {variantDrafts.length === 0 ? (
          <div className="mt-6 rounded-lg border border-dashed p-6 text-sm text-muted-foreground">
            Select at least one term from one or more attributes to generate variations.
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            {variantDrafts.map((variant) => {
              return (
                <div key={variant.combination_key} className="rounded-lg border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h3 className="font-medium">{variant.label}</h3>
                      <p className="text-xs text-muted-foreground">
                        {variant.selected_options
                          .map((option) => `${option.attribute_name}: ${option.term_value}`)
                          .join(' / ')}
                      </p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <div>Regular: {formatCurrency(variant.price)}</div>
                      <div>Sale: {variant.sale_price !== null && variant.sale_price !== undefined ? formatCurrency(variant.sale_price) : 'No sale price'}</div>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-4 md:grid-cols-5">
                    <div className="space-y-2">
                      <Label htmlFor={`variant-sku-${variant.combination_key}`}>SKU</Label>
                      <Input
                        id={`variant-sku-${variant.combination_key}`}
                        value={variant.sku}
                        onChange={(event) =>
                          handleVariantChange(variant.combination_key, 'sku', event.target.value)
                        }
                        placeholder="SKU"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`variant-upc-${variant.combination_key}`}>UPC</Label>
                      <Input
                        id={`variant-upc-${variant.combination_key}`}
                        value={variant.upc ?? ''}
                        onChange={(event) =>
                          handleVariantChange(variant.combination_key, 'upc', event.target.value)
                        }
                        placeholder="Optional UPC"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`variant-price-${variant.combination_key}`}>Price ($)</Label>
                      <Input
                        id={`variant-price-${variant.combination_key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.price}
                        onChange={(event) =>
                          handleVariantChange(
                            variant.combination_key,
                            'price',
                            event.target.value
                          )
                        }
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`variant-sale-price-${variant.combination_key}`}>Sale Price ($)</Label>
                      <Input
                        id={`variant-sale-price-${variant.combination_key}`}
                        type="number"
                        step="0.01"
                        min="0"
                        value={variant.sale_price ?? ''}
                        onChange={(event) =>
                          handleVariantChange(
                            variant.combination_key,
                            'sale_price',
                            event.target.value
                          )
                        }
                        placeholder="Optional"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor={`variant-stock-${variant.combination_key}`}>Stock Quantity</Label>
                      <Input
                        id={`variant-stock-${variant.combination_key}`}
                        type="number"
                        min="0"
                        value={variant.stock_quantity}
                        onChange={(event) =>
                          handleVariantChange(
                            variant.combination_key,
                            'stock_quantity',
                            event.target.value
                          )
                        }
                        />
                    </div>
                  </div>

                  <div className="mt-4 rounded-lg border bg-muted/20 p-4">
                    <div className="flex flex-wrap items-center justify-between gap-4">
                      <div>
                        <p className="font-medium">Variant Main Image</p>
                        <p className="text-sm text-muted-foreground">
                          Choose from the product gallery. This image replaces the parent product image when shoppers select this variation.
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        {availableVariantImages.length > 0 ? (
                          <select
                            className="flex h-10 min-w-[220px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                            value={variant.main_media_id ?? ''}
                            onChange={(event) => {
                              if (!event.target.value) {
                                clearVariantImage(variant.combination_key);
                                return;
                              }

                              handleVariantImageSelect(variant.combination_key, event.target.value);
                            }}
                          >
                            <option value="">Use parent image</option>
                            {availableVariantImages.map((image, index) => (
                              <option key={image.media_id} value={image.media_id}>
                                {image.alt?.trim() || `Gallery image ${index + 1}`}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="text-sm text-muted-foreground">
                            Add images to the product gallery first.
                          </span>
                        )}
                        {variant.main_media_id && (
                          <Button
                            type="button"
                            variant="outline"
                            onClick={() => clearVariantImage(variant.combination_key)}
                          >
                            Remove Image
                          </Button>
                        )}
                      </div>
                    </div>

                    {variant.main_image_url ? (
                      <div className="mt-4 h-28 w-28 overflow-hidden rounded-lg border bg-background">
                        <img
                          src={variant.main_image_url}
                          alt={`${variant.label} image`}
                          className="h-full w-full object-cover"
                        />
                      </div>
                    ) : (
                      <p className="mt-4 text-sm text-muted-foreground">No variant image selected yet.</p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
