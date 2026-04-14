import { verifyPackageOnline, getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, ChevronDown, ExternalLink } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { mapRawVariantRelations } from '@nextblock-cms/ecommerce';
import ProductFormClientShell from '../../ProductFormClientShell';
import {
  getProduct,
  getGlobalProductAttributes,
  getProductTranslations,
} from '../../../../../../../libs/ecommerce/src/lib/pages/cms/products/actions';
import { updateProductAction } from '../../../../../../../libs/ecommerce/src/lib/pages/cms/products/server-actions';
import { getPaymentSettings } from '../../../../../../../libs/ecommerce/src/lib/pages/cms/payments/queries';

export default async function EditProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ missing_lang_id?: string }>;
}) {
  const isOnline = await verifyPackageOnline('ecommerce');
  const { id } = await params;
  const { missing_lang_id } = await searchParams;

  if (!isOnline) {
    redirect('/cms/settings/packages');
  }

  const [product, languages, paymentProvider] = await Promise.all([
    getProduct(id),
    getActiveLanguagesServerSide(),
    getPaymentSettings(),
  ]);

  if (!product) {
    notFound();
  }

  const [globalAttributesRaw, translations] = await Promise.all([
    getGlobalProductAttributes(),
    product.translation_group_id ? getProductTranslations(product.translation_group_id) : Promise.resolve([]),
  ]);

  const currentLanguageCode =
    languages.find((language) => language.id === product.language_id)?.code;
  const missingLanguageId = missing_lang_id ? parseInt(missing_lang_id, 10) : null;
  const missingLanguage =
    missingLanguageId && Number.isFinite(missingLanguageId)
      ? languages.find((language) => language.id === missingLanguageId)
      : null;
  const translationByLanguageId = new Map(
    translations.map((translation: any) => [translation.language_id, translation])
  );
  const existingLanguages = languages.filter(
    (language) => language.id === product.language_id || translationByLanguageId.has(language.id)
  );
  const missingLanguages = languages.filter(
    (language) => language.id !== product.language_id && !translationByLanguageId.has(language.id)
  );
  const primaryCreateLanguage =
    missingLanguage && missingLanguages.some((language) => language.id === missingLanguage.id)
      ? missingLanguage
      : missingLanguages.length === 1
        ? missingLanguages[0]
        : null;
  const additionalCreateLanguages = missingLanguages.filter(
    (language) => language.id !== primaryCreateLanguage?.id
  );

  const { attributes: productAttributes, variants } = mapRawVariantRelations(
    (product as any).product_variants || [],
    currentLanguageCode
  );

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

  return (
    <div className="space-y-8 w-full max-w-[1400px] mx-auto px-6 py-8">
      <div className="flex justify-between items-center flex-wrap gap-4 w-full">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" aria-label="Back to products" asChild>
            <Link href="/cms/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Product</h1>
            <p className="text-sm text-muted-foreground truncate max-w-md" title={product.title}>
              {product.title}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {existingLanguages.map((language) => {
            const version = translationByLanguageId.get(language.id);
            const isCurrent = language.id === product.language_id;
            const href = version
              ? `/cms/products/${version.id}/edit`
              : `/cms/products/${product.id}/edit`;

            return (
              <Button key={language.id} asChild variant={isCurrent ? 'default' : 'outline'} size="sm">
                <Link href={href}>
                  {language.name} ({language.code.toUpperCase()})
                </Link>
              </Button>
            );
          })}

          {primaryCreateLanguage && product.translation_group_id ? (
            <Button asChild variant="secondary" size="sm">
              <Link
                href={`/cms/products/new?from_group=${product.translation_group_id}&target_lang_id=${primaryCreateLanguage.id}`}
              >
                Create {primaryCreateLanguage.name} Translation
              </Link>
            </Button>
          ) : null}

          {additionalCreateLanguages.length > 0 && product.translation_group_id ? (
            <details className="relative">
              <summary className="flex h-9 cursor-pointer list-none items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                Create Translation
                <ChevronDown className="h-4 w-4" />
              </summary>
              <div className="absolute right-0 top-full z-20 mt-2 min-w-[220px] rounded-md border bg-popover p-2 shadow-md">
                <div className="space-y-1">
                  {additionalCreateLanguages.map((language) => (
                    <Link
                      key={language.id}
                      href={`/cms/products/new?from_group=${product.translation_group_id}&target_lang_id=${language.id}`}
                      className="block rounded-sm px-3 py-2 text-sm hover:bg-accent hover:text-accent-foreground"
                    >
                      Create {language.name}
                    </Link>
                  ))}
                </div>
              </div>
            </details>
          ) : null}

          {product.slug && product.status === 'active' && (
            <Button variant="outline" asChild>
              <Link href={`/product/${product.slug}`} target="_blank">
                <ExternalLink className="w-4 h-4 mr-2" />
                View
              </Link>
            </Button>
          )}
        </div>
      </div>

      <ProductFormClientShell
        initialData={{
          id: product.id,
          title: product.title,
          slug: product.slug,
          sku: product.sku,
          upc: product.upc ?? undefined,
          stock: product.stock || 0,
          price: product.price || 0,
          status: product.status as 'draft' | 'active' | 'archived',
          short_description: product.short_description ?? undefined,
          description_json: product.description_json,
          sale_price: typeof product.sale_price === 'number' ? product.sale_price : undefined,
          freemius_plan_id: product.freemius_plan_id ?? undefined,
          freemius_product_id: product.freemius_product_id ?? undefined,
          language_id: product.language_id,
          translation_group_id: product.translation_group_id,
          product_media: product.product_media,
          variation_attributes: productAttributes.map((attribute) => ({
            attribute_id: attribute.id,
            term_ids: attribute.terms.map((term) => term.id),
          })),
          variants: variants.map((variant) => ({
            ...variant,
            upc: variant.upc ?? null,
            price: variant.price / 100,
            sale_price:
              typeof variant.sale_price === 'number' ? variant.sale_price / 100 : null,
            main_media_id: variant.main_media_id ?? null,
            main_image_url: variant.image_url ?? null,
          })),
        }}
        isEdit
        availableLanguagesProp={languages}
        globalAttributesProp={globalAttributes}
        paymentProvider={paymentProvider}
        updateAction={updateProductAction.bind(null, product.id)}
      />
    </div>
  );
}
