'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import {
  CartItem,
  isDigitalItem,
  mapRawVariantRelations,
  useCartStore,
  useIsCartHydrated,
} from '@nextblock-cms/ecommerce';
import { getTranslatedProductsForCart } from '@nextblock-cms/ecommerce/actions';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';

function resolveMediaUrl(filePath?: string | null) {
  if (!filePath) {
    return null;
  }

  if (filePath.startsWith('http')) {
    return filePath;
  }

  return R2_BASE_URL ? `${R2_BASE_URL}/${filePath}` : filePath;
}

function resolveProductImageUrl(product: any, fallback?: string | null) {
  const firstMedia = product?.product_media?.[0]?.media;
  return resolveMediaUrl(firstMedia?.file_path || firstMedia?.object_key) || fallback || null;
}

function syncCartItem(item: CartItem, translatedProduct: any, currentLocale: string): CartItem {
  const productImageUrl = resolveProductImageUrl(translatedProduct, item.image_url);
  const nextBase: CartItem = {
    ...item,
    id: translatedProduct.id,
    product_id: translatedProduct.id,
    title: translatedProduct.title,
    slug: translatedProduct.slug,
    sku: translatedProduct.sku || item.sku,
    stock: typeof translatedProduct.stock === 'number' ? translatedProduct.stock : item.stock,
    language_id: translatedProduct.language_id,
    translation_group_id: translatedProduct.translation_group_id,
    image_url: productImageUrl || item.image_url,
    is_taxable: translatedProduct.is_taxable ?? item.is_taxable,
    prices: translatedProduct.prices || item.prices,
    sale_prices: translatedProduct.sale_prices || item.sale_prices,
    has_variants: Boolean(translatedProduct.product_variants?.length),
  };

  if (isDigitalItem(item)) {
    return nextBase;
  }

  const isVariantLine = Boolean(item.variant_id || item.variant_label);
  if (!isVariantLine) {
    return {
      ...nextBase,
      price: translatedProduct.price,
      prices: translatedProduct.prices || item.prices,
      sale_price: translatedProduct.sale_price ?? null,
      sale_prices: translatedProduct.sale_prices || item.sale_prices,
    };
  }

  const { variants } = mapRawVariantRelations(translatedProduct.product_variants || [], currentLocale);
  const matchedVariant = variants.find((variant) => variant.sku === item.sku);

  if (!matchedVariant) {
    return item;
  }

  return {
    ...nextBase,
    id: matchedVariant.id,
    sku: matchedVariant.sku,
    price: matchedVariant.price,
    prices: matchedVariant.prices || item.prices,
    sale_price: matchedVariant.sale_price ?? null,
    sale_prices: matchedVariant.sale_prices || item.sale_prices,
    stock: matchedVariant.stock_quantity,
    image_url: matchedVariant.image_url || productImageUrl || item.image_url,
    variant_id: matchedVariant.id,
    variant_label: matchedVariant.label,
    selected_options: matchedVariant.selected_options,
  };
}

export function CartTranslator() {
  const { currentLocale, availableLanguages } = useLanguage();
  const { items, setItems } = useCartStore();
  const isHydrated = useIsCartHydrated();
  const prevLocaleRef = useRef<string | null>(null);

  useEffect(() => {
    async function translateCart() {
      if (!items || items.length === 0) {
        return;
      }

      const translationGroupIds = items
        .map((item) => item.translation_group_id)
        .filter(Boolean) as string[];
      const skus = items
        .map((item) => item.sku)
        .filter(Boolean) as string[];
      const productIds = items
        .map((item) => item.product_id)
        .filter(Boolean) as string[];

      if (translationGroupIds.length === 0 && skus.length === 0 && productIds.length === 0) {
        return;
      }

      try {
        const translatedProducts = await getTranslatedProductsForCart(
          translationGroupIds,
          currentLocale,
          skus,
          productIds
        ) as any[];

        if (!translatedProducts || translatedProducts.length === 0) {
          return;
        }

        const newItems = items.map((item) => {
          const translated = translatedProducts.find((product) =>
            (item.translation_group_id && product.translation_group_id === item.translation_group_id) ||
            product.id === item.product_id ||
            product.sku === item.sku
          );

          if (!translated) {
            return item;
          }

          return syncCartItem(item, translated, currentLocale);
        });

        const mergedItems = newItems.reduce((accumulator: CartItem[], current) => {
          const existingIndex = accumulator.findIndex((item) => item.id === current.id);
          if (existingIndex > -1) {
            accumulator[existingIndex] = {
              ...accumulator[existingIndex],
              quantity: accumulator[existingIndex].quantity + current.quantity,
            };
            return accumulator;
          }

          accumulator.push({ ...current });
          return accumulator;
        }, []);

        if (JSON.stringify(mergedItems) !== JSON.stringify(items)) {
          setItems(mergedItems);
        }
      } catch (error) {
        console.error("[CartTranslator] Translation failed:", error);
      }
    }

    if (!isHydrated || availableLanguages.length === 0) {
      return;
    }

    const currentLanguage = availableLanguages.find((language) => language.code === currentLocale);
    const hasLocaleMismatch = items.some((item) => item.language_id !== currentLanguage?.id);

    if (currentLocale !== prevLocaleRef.current || hasLocaleMismatch) {
      const timeoutId = setTimeout(() => {
        translateCart();
      }, 300);
      prevLocaleRef.current = currentLocale;
      return () => clearTimeout(timeoutId);
    }
  }, [availableLanguages, currentLocale, isHydrated, items, setItems]);

  return null;
}
