import type { ComponentType } from "react";

type PublicBlockRendererLoader = () => Promise<{
  default: ComponentType<any>;
}>;

const ecommerceBlockRendererLoaders: Record<string, PublicBlockRendererLoader> = {
  product_grid: () => import("./renderers/ProductGridBlockRenderer"),
  featured_product: () => import("./renderers/FeaturedProductBlockRenderer"),
  cart: () => import("./renderers/CartBlockRenderer"),
  checkout: () => import("./renderers/CheckoutBlockRenderer"),
  product_details: () => import("./renderers/ProductDetailsBlockRenderer"),
};

export function loadEcommerceBlockRenderer(blockType: string) {
  const loader = ecommerceBlockRendererLoaders[blockType];

  if (!loader) {
    return Promise.reject(new Error(`Unsupported ecommerce block type: ${blockType}`));
  }

  return loader();
}
