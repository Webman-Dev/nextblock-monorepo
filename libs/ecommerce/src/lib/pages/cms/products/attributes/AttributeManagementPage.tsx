import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';

import { getGlobalProductAttributes } from '../actions';
import {
  createProductAttributeAction,
  createProductAttributeTermAction,
  deleteProductAttributeAction,
  deleteProductAttributeTermAction,
  reorderProductAttributeTermsAction,
  updateProductAttributeTranslationsAction,
} from '../server-actions';
import { AttributeManager } from './components/AttributeManager';

export async function AttributeManagementPage() {
  const [attributesRaw, languages] = await Promise.all([
    getGlobalProductAttributes(),
    getActiveLanguagesServerSide(),
  ]);
  const attributes = (attributesRaw || []).map((attribute: any) => ({
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
    <div className="space-y-8 w-full max-w-[1200px] mx-auto px-6 py-8">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" asChild>
            <Link href="/cms/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Global Attribute Management</h1>
            <p className="text-sm text-muted-foreground">
              Define reusable attributes and terms for variation-based physical products.
            </p>
          </div>
        </div>
      </div>

      <AttributeManager
        attributes={attributes}
        createAttributeAction={createProductAttributeAction}
        deleteAttributeAction={deleteProductAttributeAction}
        createTermAction={createProductAttributeTermAction}
        deleteTermAction={deleteProductAttributeTermAction}
        reorderTermsAction={reorderProductAttributeTermsAction}
        updateTranslationsAction={updateProductAttributeTranslationsAction}
        languages={languages}
      />
    </div>
  );
}
