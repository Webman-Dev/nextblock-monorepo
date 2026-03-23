import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { EditProductPage as EditProductPageUI, CopyProductFromLanguage } from '@nextblock-cms/ecommerce/server';
import MediaPickerDialog from '../../../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from '../../ClientNotionEditor';

import { getActiveLanguagesServerSide } from '@nextblock-cms/db/server';
import ContentLanguageSwitcher from '../../../components/ContentLanguageSwitcher';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const isOnline = await verifyPackageOnline('ecommerce');
  const [languages] = await Promise.all([
    getActiveLanguagesServerSide(),
  ]);

  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return (
    <EditProductPageUI 
      params={params}
      mediaPickerNode={
        <MediaPickerDialog
          triggerLabel="+ Add Image"
          triggerVariant="outline"
          defaultFolder="uploads/products/"
        />
      }
      editorNode={<NotionEditor />}
      availableLanguagesProp={languages}
      languageSwitcherNode={(product) => (
        <ContentLanguageSwitcher 
          currentItem={{
            ...product,
            translation_group_id: product.translation_group_id ?? ""
          }}
          itemType="product"
          allSiteLanguages={languages}
        />
      )}
      copyContentNode={(product) => (
        <CopyProductFromLanguage 
          productId={product.id}
          currentLanguageId={product.language_id}
          translationGroupId={product.translation_group_id ?? ""}
          allSiteLanguages={languages}
        />
      )}
    />
  );
}
