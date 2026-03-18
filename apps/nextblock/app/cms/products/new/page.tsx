import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { NewProductPage as NewProductPageUI } from '@nextblock-cms/ecommerce/server';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from '../ClientNotionEditor';

export default async function NewProductPage() {
  const isOnline = await verifyPackageOnline('ecommerce');
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
    />
  );
}
