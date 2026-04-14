import { mapRawVariantRelations } from '@nextblock-cms/ecommerce';
import type { ProductAttribute } from '@nextblock-cms/ecommerce';

type LanguageOption = {
  id: number;
  code: string;
  is_default?: boolean;
};

export function buildGlobalAttributesForForm(globalAttributesRaw: any[]): ProductAttribute[] {
  return (globalAttributesRaw || []).map((attribute: any) => ({
    id: attribute.id,
    name: attribute.name,
    name_translations: attribute.name_translations || {},
    slug: attribute.slug,
    terms: (attribute.product_attribute_terms || []).map((term: any) => ({
      ...term,
      value_translations: term.value_translations || {},
    })),
  }));
}

export function resolveProductFormLanguageCode(
  availableLanguages: LanguageOption[],
  languageId?: number
) {
  return (
    availableLanguages.find((language) => language.id === languageId)?.code ||
    availableLanguages.find((language) => language.is_default)?.code ||
    availableLanguages[0]?.code
  );
}

export function buildTranslationSourceInitialData(
  sourceProduct: any,
  translationGroupId: string,
  targetLanguageId?: string
) {
  if (!sourceProduct) {
    return null;
  }

  return {
    ...sourceProduct,
    id: undefined,
    slug: sourceProduct.slug || '',
    sku: sourceProduct.sku || '',
    status: 'draft',
    language_id: targetLanguageId ? parseInt(targetLanguageId, 10) : sourceProduct.language_id,
    translation_group_id: translationGroupId,
    created_at: undefined,
    updated_at: undefined,
  };
}

export function buildProductFormInitialData(
  product: any,
  availableLanguages: LanguageOption[],
  languageIdOverride?: number
) {
  if (!product) {
    return undefined;
  }

  const resolvedLanguageId = languageIdOverride ?? product.language_id;
  const currentLanguageCode = resolveProductFormLanguageCode(
    availableLanguages,
    resolvedLanguageId
  );
  const { attributes: productAttributes, variants } = mapRawVariantRelations(
    product.product_variants || [],
    currentLanguageCode
  );

  return {
    ...product,
    language_id: resolvedLanguageId,
    variation_attributes:
      product.variation_attributes ||
      productAttributes.map((attribute) => ({
        attribute_id: attribute.id,
        term_ids: attribute.terms.map((term) => term.id),
      })),
    variants:
      product.variants ||
      variants.map((variant) => ({
        ...variant,
        upc: variant.upc ?? null,
        price: variant.price / 100,
        sale_price:
          typeof variant.sale_price === 'number' ? variant.sale_price / 100 : null,
        main_media_id: variant.main_media_id ?? null,
        main_image_url: variant.image_url ?? null,
      })),
  };
}
