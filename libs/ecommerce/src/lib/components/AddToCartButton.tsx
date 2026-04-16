'use client';

import { Button } from '@nextblock-cms/ui';
import { ShoppingCart } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

import { useCart } from '../use-cart';
import { useTranslations } from '@nextblock-cms/utils';

import { Product } from '../types';

interface AddToCartButtonProps {
  product: Product;
  className?: string;
}

export const AddToCartButton = ({ product, className }: AddToCartButtonProps) => {
  // Use useCart to get safe hydration version of addItem, 
  // or use store directly since this action is client-side interaction anyway.
  const store = useCart((state) => state);
  const { t } = useTranslations();
  const requiresVariantSelection =
    Boolean(product.has_variants) && !product.variant_id && !(product as any).freemius_product_id;

  if (requiresVariantSelection) {
    return (
      <Button asChild className={className}>
        <Link href={`/product/${product.slug}`}>Select Options</Link>
      </Button>
    );
  }

  if (!store) {
    return (
      <Button disabled className={className}>
        <ShoppingCart className="mr-2 h-4 w-4" />
        {t('ecommerce.add_to_cart')}
      </Button>
    );
  }

  const { addItem } = store;

  const handleAddToCart = () => {

    const { success, error } = addItem({
      id: product.variant_id || product.id,
      product_id: product.id,
      title: product.title,
      price: product.price,
      sale_price: product.sale_price,
      is_taxable: product.is_taxable,
      image_url: product.image_url,
      slug: product.slug,
      sku: product.sku,
      stock: product.stock,
      language_id: product.language_id,
      translation_group_id: product.translation_group_id,
      freemius_product_id: product.freemius_product_id, // include just in case it wasn't intercepted
      has_variants: product.has_variants,
      variant_id: product.variant_id,
      variant_label: product.variant_label,
      selected_options: product.selected_options,
    });

    if (success) {
      toast.success(t('ecommerce.added_to_cart_success', { item: product.title }));
    } else {
      toast.error(error || t('ecommerce.added_to_cart_error'));
    }
  };

  return (
    <Button onClick={handleAddToCart} className={className}>
      <ShoppingCart className="mr-2 h-4 w-4" />
      {t('ecommerce.add_to_cart')}
    </Button>
  );
};
