import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { NewProductPage as NewProductPageUI } from '@nextblock-cms/ecommerce/server';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from '../ClientNotionEditor';

import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import { createClient } from '@nextblock-cms/db/server';
import { getProduct } from '@nextblock-cms/ecommerce/server';

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

  let initialData = null;
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

  return (
    <NewProductPageUI 
      mediaPickerNode={
        <MediaPickerDialog
          triggerLabel="+ Add Image"
          triggerVariant="outline"
          defaultFolder="uploads/products/"
        />
      }
      editorNode={<NotionEditor />}
      availableLanguagesProp={languages}
      translationGroupId={from_group}
      targetLanguageId={target_lang_id}
      initialData={initialData}
    />
  );
}

