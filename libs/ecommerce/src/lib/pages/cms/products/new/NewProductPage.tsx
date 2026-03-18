import { ProductForm } from '../components/ProductForm';

interface NewProductPageProps {
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
}

export function NewProductPage({ mediaPickerNode, editorNode }: NewProductPageProps) {
  return (
    <div className="p-8">
      <ProductForm 
         mediaPickerNode={mediaPickerNode} 
         editorNode={editorNode}
      />
    </div>
  );
}
