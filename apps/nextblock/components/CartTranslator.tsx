'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';
import { useCartStore, CartItem, useIsCartHydrated } from '@nextblock-cms/ecommerce';
import { getTranslatedProductsForCart } from '@nextblock-cms/ecommerce/actions';

const R2_BASE_URL = process.env.NEXT_PUBLIC_R2_BASE_URL || '';

export function CartTranslator() {
  const { currentLocale, availableLanguages } = useLanguage();
  const { items, setItems } = useCartStore();
  const isHydrated = useIsCartHydrated();
  const prevLocaleRef = useRef<string | null>(null);

  useEffect(() => {
    async function translateCart() {
      if (!items || items.length === 0) return;
      const translationGroupIds = (items as CartItem[])
        .map((item: CartItem) => {
          return item.translation_group_id;
        })
        .filter(Boolean) as string[];

      const skus = (items as CartItem[])
        .map((item: CartItem) => item.sku)
        .filter(Boolean) as string[];

      if (translationGroupIds.length === 0 && skus.length === 0) {
        return;
      }

      try {
        const translatedProducts = await getTranslatedProductsForCart(translationGroupIds, currentLocale, skus) as any[];

        if (!translatedProducts || translatedProducts.length === 0) {
          return;
        }

        const newItems = (items as CartItem[]).map((item: CartItem) => {
          // Try to find by translation_group_id first, then fallback to SKU
          const translated = translatedProducts.find((tp: any) => 
            (item.translation_group_id && tp.translation_group_id === item.translation_group_id) || 
            (tp.sku === item.sku)
          );
          if (translated) {
            // Resolve image URL correctly
            let imageUrl = item.image_url;
            const firstMedia = (translated as any).product_media?.[0]?.media;
            if (firstMedia?.file_path) {
              if (firstMedia.file_path.startsWith('http')) {
                imageUrl = firstMedia.file_path;
              } else if (R2_BASE_URL) {
                imageUrl = `${R2_BASE_URL}/${firstMedia.file_path}`;
              }
            }

            return {
              ...item,
              id: translated.id,
              product_id: translated.id,
              title: translated.title,
              price: translated.price / 100,
              sale_price: translated.sale_price ? translated.sale_price / 100 : null,
              slug: translated.slug,
              language_id: translated.language_id,
              image_url: imageUrl,
            };
          }
          return item;
        });

        const mergedItems = newItems.reduce((acc: CartItem[], current: CartItem) => {
          const existingIndex = acc.findIndex(item => item.id === current.id);
          if (existingIndex > -1) {
            acc[existingIndex] = {
              ...acc[existingIndex],
              quantity: acc[existingIndex].quantity + current.quantity
            };
            return acc;
          }
          acc.push({ ...current });
          return acc;
        }, []);

        const isChanged = JSON.stringify(mergedItems) !== JSON.stringify(items);
        if (isChanged) {
          setItems(mergedItems);
        }
      } catch (error) {
        console.error("[CartTranslator] Translation failed:", error);
      }
    }

    if (!isHydrated || availableLanguages.length === 0) return;

    const currentLang = availableLanguages.find((l: any) => l.code === currentLocale);
    const hasMismatch = items.some((item: CartItem) => item.language_id !== currentLang?.id);
    
    if (currentLocale !== prevLocaleRef.current || hasMismatch) {
      const timeoutId = setTimeout(() => {
        translateCart();
      }, 300);
      prevLocaleRef.current = currentLocale;
      return () => clearTimeout(timeoutId);
    }
  }, [currentLocale, items, setItems, availableLanguages, isHydrated]);

  return null;
}
