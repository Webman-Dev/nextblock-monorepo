import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import { EditProductPage as EditProductPageUI } from '@nextblock-cms/ecommerce/server';
import MediaPickerDialog from '../../../media/components/MediaPickerDialog';
import { ClientNotionEditor as NotionEditor } from '../../ClientNotionEditor';

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return (
    <EditProductPageUI 
      params={params}
      mediaPickerNode={
        <MediaPickerDialog
          onSelect={(media) => console.log('This will not work across boundary', media)}
          triggerLabel="+ Add Image"
          triggerVariant="outline"
          defaultFolder="uploads/products/"
        />
      }
      editorNode={<NotionEditor />}
    />
  );
}
