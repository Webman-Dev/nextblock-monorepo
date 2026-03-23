import { ProductForm } from '../components/ProductForm';

interface NewProductPageProps {
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: any[];
  translationGroupId?: string;
  targetLanguageId?: string;
}

export function NewProductPage({ 
  mediaPickerNode, 
  editorNode,
  availableLanguagesProp,
  translationGroupId,
  targetLanguageId
}: NewProductPageProps) {
  return (
    <div className="p-8">
      <ProductForm 
         mediaPickerNode={mediaPickerNode} 
         editorNode={editorNode}
         availableLanguagesProp={availableLanguagesProp}
         translationGroupId={translationGroupId}
         targetLanguageId={targetLanguageId}
      />
    </div>
  );
}

