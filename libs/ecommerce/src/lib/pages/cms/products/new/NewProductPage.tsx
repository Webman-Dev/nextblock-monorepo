import { ProductForm } from '../components/ProductForm';
import { getGlobalProductAttributes } from '../actions';
import { mapRawVariantRelations } from '../../../../variation-utils';
import { createProductAction } from '../server-actions';
import { getPaymentSettings } from '../../payments/queries';

interface NewProductPageProps {
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: any[];
  translationGroupId?: string;
  targetLanguageId?: string;
  initialData?: any;
}

export async function NewProductPage({ 
  mediaPickerNode, 
  editorNode,
  availableLanguagesProp,
  translationGroupId,
  targetLanguageId,
  initialData
}: NewProductPageProps) {
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
    availableLanguagesProp.find((lang) => lang.id === initialData?.language_id)?.code ||
    availableLanguagesProp.find((lang) => lang.id === (targetLanguageId ? parseInt(targetLanguageId, 10) : undefined))?.code ||
    availableLanguagesProp.find((lang) => lang.is_default)?.code;
  const { attributes: productAttributes, variants } = mapRawVariantRelations(
    initialData?.product_variants || [],
    initialLanguageCode
  );
  const normalizedInitialData = initialData
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
    : initialData;

  return (
    <div className="p-8">
      <ProductForm 
         mediaPickerNode={mediaPickerNode} 
         editorNode={editorNode}
         availableLanguagesProp={availableLanguagesProp}
         globalAttributesProp={globalAttributes}
         translationGroupId={translationGroupId}
         targetLanguageId={targetLanguageId}
         initialData={normalizedInitialData}
         paymentProvider={paymentProvider}
         createAction={createProductAction}
      />
    </div>
  );
}

