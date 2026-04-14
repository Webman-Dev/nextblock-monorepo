import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import { createClient } from '@nextblock-cms/db/server';
import { getProduct } from '@nextblock-cms/ecommerce/server';
import { mapRawVariantRelations } from '@nextblock-cms/ecommerce';
import ProductFormClientShell from '../ProductFormClientShell';
import {
  getGlobalProductAttributes,
} from '../../../../../../libs/ecommerce/src/lib/pages/cms/products/actions';
import { createProductAction } from '../../../../../../libs/ecommerce/src/lib/pages/cms/products/server-actions';
import { getPaymentSettings } from '../../../../../../libs/ecommerce/src/lib/pages/cms/payments/queries';

export default async function NewProductPage({ 
  searchParams 
}: { 
  searchParams: Promise<{ from_group?: string; target_lang_id?: string }> 
}) {
  const isOnline = await verifyPackageOnline('ecommerce');
  const [languages, { from_group, target_lang_id }] = await Promise.all([
    getActiveLanguagesServerSide(),
    searchParams
  ]);


  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  let initialData: any = null;
  if (from_group) {
    try {
      const supabase = createClient();
      const { data: groupProducts } = await supabase
        .from('products')
        .select('id')
        .eq('translation_group_id', from_group)
        .limit(1);
      
      if (groupProducts && groupProducts[0]) {
        const { data: sourceProduct, error: fetchError } = await getProduct(supabase, groupProducts[0].id);
        if (sourceProduct && !fetchError) {
          // Prepare initialData for translation
          // We copy SKU and Slug exactly as requested.
          initialData = {
            ...sourceProduct,
            id: undefined,
            // User requested the same Slug be used by default (now allowed by composite unique constraint)
            slug: sourceProduct.slug || '',
            // User requested the same SKU be used by default
            sku: sourceProduct.sku || '',
            status: 'draft', // Translations usually start as draft
            language_id: target_lang_id ? parseInt(target_lang_id, 10) : sourceProduct.language_id,
            translation_group_id: from_group,
            created_at: undefined,
            updated_at: undefined,
          };
        }
      }
    } catch (e) {
      console.error('Error pre-filling translation data:', e);
    }
  }

  const paymentProvider = await getPaymentSettings();
  const globalAttributesRaw = await getGlobalProductAttributes();
  const globalAttributes = (globalAttributesRaw || []).map((attribute: any) => ({
    id: attribute.id,
    name: attribute.name,
    name_translations: attribute.name_translations || {},
    slug: attribute.slug,
    terms: (attribute.product_attribute_terms || []).map((term: any) => ({
      ...term,
      value_translations: term.value_translations || {},
    })),
  }));
  const initialLanguageCode =
    languages.find((lang) => lang.id === initialData?.language_id)?.code ||
    languages.find((lang) => lang.id === (target_lang_id ? parseInt(target_lang_id, 10) : undefined))?.code ||
    languages.find((lang) => lang.is_default)?.code;
  const { attributes: productAttributes, variants } = mapRawVariantRelations(
    initialData?.product_variants || [],
    initialLanguageCode
  );
  const normalizedInitialData: any = initialData
    ? {
        ...initialData,
        variation_attributes:
          initialData.variation_attributes ||
          productAttributes.map((attribute) => ({
            attribute_id: attribute.id,
            term_ids: attribute.terms.map((term) => term.id),
          })),
        variants:
          initialData.variants ||
          variants.map((variant) => ({
            ...variant,
            upc: variant.upc ?? null,
            price: variant.price / 100,
            sale_price:
              typeof variant.sale_price === 'number' ? variant.sale_price / 100 : null,
            main_media_id: variant.main_media_id ?? null,
            main_image_url: variant.image_url ?? null,
          })),
      }
    : undefined;

  return (
    <div className="p-8">
      <ProductFormClientShell
        availableLanguagesProp={languages}
        globalAttributesProp={globalAttributes}
        translationGroupId={from_group}
        targetLanguageId={target_lang_id}
        initialData={normalizedInitialData}
        paymentProvider={paymentProvider}
        createAction={createProductAction}
      />
    </div>
  );
}

