import { ProductForm } from '../../components/ProductForm';
import { getProduct } from '../../actions';
import { notFound } from 'next/navigation';

interface EditProductPageProps {
  params: {
    id: string;
  };
}

export default async function EditProductPage({ params }: EditProductPageProps) {
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
           product_media: product.product_media,
        }} 
        isEdit 
      />
    </div>
  );
}
