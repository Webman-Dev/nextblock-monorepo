import { ProductForm } from '../../components/ProductForm';
import { getProduct } from '../../actions';

console.log('--- EditProductPage Debug ---', {
    ProductForm: typeof ProductForm,
    getProduct: typeof getProduct,
});
import { notFound } from 'next/navigation';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
}

export async function EditProductPage({ params, mediaPickerNode, editorNode }: EditProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id);

  if (!product) {
    notFound();
  }

  return (
    <div className="p-8">
      <ProductForm 
        initialData={{
           id: product.id,
           title: product.title,
           slug: product.slug,
           sku: product.sku,
           stock: product.stock || 0,
           price: product.price,
           status: product.status as 'draft' | 'active' | 'archived',
           short_description: product.short_description ?? undefined,
           description_json: product.description_json,
           sale_price: product.sale_price ?? undefined,
           freemius_plan_id: product.freemius_plan_id ?? undefined,
           freemius_product_id: product.freemius_product_id ?? undefined,
           product_media: product.product_media,
        }} 
        isEdit 
        mediaPickerNode={mediaPickerNode}
        editorNode={editorNode}
      />
    </div>
  );
}
