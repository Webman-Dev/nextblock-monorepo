import { ProductForm } from '../components/ProductForm';

interface NewProductPageProps {
  renderMediaPicker?: (props: { onSelect: (media: any) => void }) => React.ReactNode;
  renderEditor?: (props: { initialContent?: any, onUpdate?: (content: any) => void }) => React.ReactNode;
}

export function NewProductPage({ renderMediaPicker, renderEditor }: NewProductPageProps) {
  return (
    <div className="p-8">
      <ProductForm 
         renderMediaPicker={renderMediaPicker} 
         renderEditor={renderEditor}
      />
    </div>
  );
}
