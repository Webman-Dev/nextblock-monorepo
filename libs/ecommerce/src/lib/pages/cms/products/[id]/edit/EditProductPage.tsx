import { ProductForm } from '../../components/ProductForm';
import { getProduct, getFreemiusPricingByProductId } from '../../actions';
import { FreemiusPricingDashboard } from '../../components/FreemiusPricingDashboard';

import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@nextblock-cms/ui';

interface EditProductPageProps {
  params: Promise<{
    id: string;
  }>;
  mediaPickerNode?: React.ReactNode;
  editorNode?: React.ReactNode;
  availableLanguagesProp: any[];
  languageSwitcherNode?: (product: any) => React.ReactNode;
  copyContentNode?: (product: any) => React.ReactNode;
}

export async function EditProductPage({ 
  params, 
  mediaPickerNode, 
  editorNode, 
  availableLanguagesProp,
  languageSwitcherNode,
  copyContentNode
}: EditProductPageProps) {
  const { id } = await params;
  const product = await getProduct(id) as any;

  if (!product) {
    notFound();
  }

  const pricingPlans = product.freemius_product_id ? await getFreemiusPricingByProductId(product.id) : null;

  return (
    <div className="space-y-8 w-full mx-auto px-6 py-8">
      <div className="flex justify-between items-center flex-wrap gap-4 w-full">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="icon"
            aria-label="Back to products"
            asChild
          >
            <Link href="/cms/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Edit Product</h1>
            <p className="text-sm text-muted-foreground truncate max-w-md" title={product.title}>
              {product.title}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
           {languageSwitcherNode?.(product)}
           {copyContentNode?.(product)}
        </div>
      </div>

       <ProductForm 
         initialData={{
            id: product.id,
            title: product.title,
            slug: product.slug,
            sku: product.sku,
            stock: product.stock || 0,
            price: product.price || 0,
            status: product.status as 'draft' | 'active' | 'archived',
            short_description: product.short_description ?? undefined,
            description_json: product.description_json,
            sale_price: product.sale_price || undefined,
            freemius_plan_id: product.freemius_plan_id ?? undefined,
            freemius_product_id: product.freemius_product_id ?? undefined,
            language_id: product.language_id,
            translation_group_id: product.translation_group_id,
            product_media: product.product_media,
         }} 
        isEdit 
        mediaPickerNode={mediaPickerNode}
        editorNode={editorNode}
        availableLanguagesProp={availableLanguagesProp}
      />

      {product.freemius_product_id && pricingPlans && (
        <FreemiusPricingDashboard 
          productId={product.id} 
          freemiusProductId={product.freemius_product_id}
          plans={pricingPlans}
        />
      )}
    </div>
  );
}
