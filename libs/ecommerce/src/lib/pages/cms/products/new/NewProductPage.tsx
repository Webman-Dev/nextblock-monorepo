import { ProductForm } from '../components/ProductForm';

interface NewProductPageProps {
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: any[];
  translationGroupId?: string;
  targetLanguageId?: string;
  initialData?: any;
}

export function NewProductPage({ 
  mediaPickerNode, 
  editorNode,
  availableLanguagesProp,
  translationGroupId,
  targetLanguageId,
  initialData
}: NewProductPageProps) {
  return (
    <div className="p-8">
      <ProductForm 
         mediaPickerNode={mediaPickerNode} 
         editorNode={editorNode}
         availableLanguagesProp={availableLanguagesProp}
         translationGroupId={translationGroupId}
         targetLanguageId={targetLanguageId}
         initialData={initialData}
      />
    </div>
  );
}

