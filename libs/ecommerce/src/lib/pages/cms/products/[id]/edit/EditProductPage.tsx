import { ProductForm } from '../../components/ProductForm';
import { getProduct } from '../../actions';
import { notFound } from 'next/navigation';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
  renderMediaPicker?: (props: { onSelect: (media: any) => void }) => React.ReactNode;
  renderEditor?: (props: { initialContent?: any, onUpdate?: (content: any) => void }) => React.ReactNode;
}

export async function EditProductPage({ params, renderMediaPicker, renderEditor }: EditProductPageProps) {
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
           lemonsqueezy_variant_id: product.lemonsqueezy_variant_id ?? undefined,
           product_media: product.product_media,
        }} 
        isEdit 
        renderMediaPicker={renderMediaPicker}
        renderEditor={renderEditor}
      />
    </div>
  );
}
