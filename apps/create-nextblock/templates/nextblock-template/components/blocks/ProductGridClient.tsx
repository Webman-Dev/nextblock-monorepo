'use client';

import React from 'react';
import { ChevronLeft, ChevronRight, Loader2 } from 'lucide-react';
import { Button } from '@nextblock-cms/ui';
import { ProductGrid } from '@nextblock-cms/ecommerce/components/ProductGrid';
import type { Product } from '@nextblock-cms/ecommerce/types';
import { cn } from '@nextblock-cms/utils';

import { fetchProductGridPage } from '../../app/actions/productGridActions';
import type { ProductGridQuery } from '../../lib/blocks/product-grid-data';

interface ProductGridClientProps {
  initialProducts: Product[];
  totalCount: number;
  /** The block's resolved query, replayed by the server action for later pages. */
  query: ProductGridQuery;
  showPagination: boolean;
}

export default function ProductGridClient({
  initialProducts,
  totalCount,
  query,
  showPagination,
}: ProductGridClientProps) {
  const [products, setProducts] = React.useState(initialProducts);
  const [currentPage, setCurrentPage] = React.useState(1);
  const [isLoading, setIsLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const gridRef = React.useRef<HTMLDivElement>(null);

  // Re-sync when the server sends a new first page (e.g. a live draft edit).
  React.useEffect(() => {
    setProducts(initialProducts);
    setCurrentPage(1);
  }, [initialProducts]);

  const perPage = query.limit > 0 ? query.limit : products.length || 1;
  const totalPages = showPagination ? Math.max(1, Math.ceil(totalCount / perPage)) : 1;

  const goToPage = async (nextPage: number) => {
    if (isLoading || nextPage < 1 || nextPage > totalPages || nextPage === currentPage) return;

    setIsLoading(true);
    setError(null);
    try {
      const result = await fetchProductGridPage({ ...query, page: nextPage });
      if (result.error) {
        setError(result.error);
      } else {
        setProducts(result.products);
        setCurrentPage(nextPage);
        // Keep the top of the grid in view rather than leaving the reader
        // stranded at the bottom of the previous page.
        gridRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    } catch {
      setError('Failed to load products.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div ref={gridRef} className="scroll-mt-24">
      <div
        aria-busy={isLoading}
        className={cn('transition-opacity duration-200', isLoading && 'pointer-events-none opacity-50')}
      >
        <ProductGrid products={products} />
      </div>

      {error && (
        <p role="alert" className="mt-6 text-center text-sm text-destructive">
          {error}
        </p>
      )}

      {showPagination && totalPages > 1 && (
        <nav
          aria-label="Product grid pagination"
          className="mt-10 flex items-center justify-center gap-3"
        >
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          <span
            aria-live="polite"
            className="flex min-w-[7rem] items-center justify-center gap-1.5 text-sm text-muted-foreground"
          >
            {isLoading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Page {currentPage} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </nav>
      )}
    </div>
  );
}
