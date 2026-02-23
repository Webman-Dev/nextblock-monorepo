import { EditProductPage as EditProductPageUI } from '@nextblock-cms/ecommerce/server';
import { verifyPackageOnline } from '@nextblock-cms/db/server';
import { redirect } from 'next/navigation';
import MediaPickerDialog from '../../../media/components/MediaPickerDialog';
import dynamic from 'next/dynamic';

interface EditorProps {
  initialContent?: any;
  onUpdate?: (content: any) => void;
}

const NotionEditor = dynamic<EditorProps>(
  () => import('@nextblock-cms/editor').then((mod) => mod.NotionEditor as any),
  { ssr: false }
);

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const isOnline = await verifyPackageOnline('ecommerce');
  if (!isOnline) {
      redirect('/cms/settings/packages');
  }

  return (
    <EditProductPageUI 
      params={params} 
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
