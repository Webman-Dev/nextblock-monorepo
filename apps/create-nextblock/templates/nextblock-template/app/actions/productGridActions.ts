'use server';

import {
  loadProductGridPage,
  type ProductGridQuery,
} from '../../lib/blocks/product-grid-data';
import {
  PRODUCT_GRID_MAX_LIMIT,
  PRODUCT_GRID_DEFAULT_PAGE_SIZE,
} from '../../lib/blocks/ecommerce-block-schemas';
import type { Product } from '@nextblock-cms/ecommerce/types';

export interface ProductGridPageResult {
  products: Product[];
  totalCount: number;
  error?: string;
}

/**
 * Pagination for the Product Grid block. Only ever returns published products
 * (`getProducts` defaults to status `active`), so this is safe to call from the
 * storefront. The page size is clamped here because the argument arrives from
 * the client — the unlimited path stays server-render only.
 */
export async function fetchProductGridPage(
  query: ProductGridQuery
): Promise<ProductGridPageResult> {
  try {
    const limit = Math.min(
      Math.max(1, Math.floor(query.limit) || PRODUCT_GRID_DEFAULT_PAGE_SIZE),
      PRODUCT_GRID_MAX_LIMIT
    );

    const { products, totalCount } = await loadProductGridPage({ ...query, limit });
    return { products, totalCount };
  } catch (error) {
    console.error('[Product Grid] Failed to load page:', error);
    return { products: [], totalCount: 0, error: 'Failed to load products.' };
  }
}
