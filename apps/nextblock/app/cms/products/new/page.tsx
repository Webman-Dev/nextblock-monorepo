import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { NewProductPage as NewProductPageUI } from '@nextblock-cms/ecommerce/server';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from '../ClientNotionEditor';

import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';

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
    />
  );
}

