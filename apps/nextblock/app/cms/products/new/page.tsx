import { NewProductPage as NewProductPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import MediaPickerDialog from '../../media/components/MediaPickerDialog';
import dynamic from 'next/dynamic';

interface EditorProps {
  initialContent?: any;
  onUpdate?: (content: any) => void;
}

const NotionEditor = dynamic<EditorProps>(
  () => import('@nextblock-cms/editor').then((mod) => mod.NotionEditor as any),
  { ssr: false }
);

export default async function NewProductPage() {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return (
    <NewProductPageUI 
      renderMediaPicker={(props) => (
        <MediaPickerDialog 
          onSelect={props.onSelect} 
          triggerLabel="+ Add Image"
          triggerVariant="outline"
          defaultFolder="uploads/products/"
        />
      )} 
      renderEditor={(props: EditorProps) => (
        <NotionEditor 
          initialContent={props.initialContent}
          onUpdate={props.onUpdate}
        />
      )}
    />
  );
}
