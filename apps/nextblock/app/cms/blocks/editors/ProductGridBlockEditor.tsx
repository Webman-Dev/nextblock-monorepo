"use client";

import React from 'react';
import { AlertTriangle, Clock, Folder, ListChecks } from 'lucide-react';
import { Label, Input, Checkbox } from "@nextblock-cms/ui";
import { cn } from "@nextblock-cms/utils";
import { BlockEditorProps } from '../components/BlockEditorModal';
import MultiEntityPicker, { type PickerOption } from '../components/MultiEntityPicker';
import {
  PRODUCT_GRID_DEFAULT_PAGE_SIZE,
  PRODUCT_GRID_MAX_CATEGORIES,
  PRODUCT_GRID_MAX_LIMIT,
  PRODUCT_GRID_MAX_PRODUCTS,
  PRODUCT_GRID_UNLIMITED,
  resolveProductGridCategoryIds,
  resolveProductGridLimit,
  resolveProductGridProductIds,
  type ProductGridBlockContent,
} from '../../../../lib/blocks/ecommerce-block-schemas';

type SourceType = NonNullable<ProductGridBlockContent['type']>;

const SOURCE_OPTIONS: { value: SourceType; label: string; icon: React.ElementType; hint: string }[] = [
  {
    value: 'latest',
    label: 'Latest',
    icon: Clock,
    hint: 'Newest products first — the grid updates itself as you add products.',
  },
  {
    value: 'category',
    label: 'By category',
    icon: Folder,
    hint: 'Products belonging to any of the selected categories, newest first.',
  },
  {
    value: 'manual',
    label: 'Hand-picked',
    icon: ListChecks,
    hint: 'Exactly the products you choose, shown in the order you add them.',
  },
];

interface PickerProduct {
  id: string;
  title: string;
  sku: string | null;
  status: string | null;
  languageCode: string | null;
}

interface PickerData {
  categories: { id: string; name: string; slug: string }[];
  products: PickerProduct[];
  hasMore: boolean;
}

const EMPTY_DATA: PickerData = { categories: [], products: [], hasMore: false };

function toProductOption(product: PickerProduct): PickerOption {
  return {
    id: product.id,
    label: product.title,
    description: product.sku ? `SKU ${product.sku}` : null,
    badge:
      [product.languageCode, product.status !== 'active' ? product.status : null]
        .filter(Boolean)
        .join(' · ') || null,
  };
}

export default function ProductGridBlockEditor({ content, onChange }: BlockEditorProps<Partial<ProductGridBlockContent>>) {
  const [data, setData] = React.useState<PickerData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [productSearch, setProductSearch] = React.useState('');
  // Every product seen so far, so a chip keeps its label after the search that
  // surfaced it is cleared.
  const [knownProducts, setKnownProducts] = React.useState<Map<string, PickerProduct>>(
    () => new Map()
  );

  const sourceType: SourceType = content.type ?? 'latest';
  const selectedCategoryIds = React.useMemo(
    () => resolveProductGridCategoryIds(content),
    [content]
  );
  const selectedProductIds = React.useMemo(
    () => resolveProductGridProductIds(content),
    [content]
  );

  // Only the ids present when the editor mounts need hydrating — anything picked
  // afterwards is already in `data.products`. Keeping this out of the fetch
  // dependencies avoids a refetch on every selection change.
  const initialProductIdsRef = React.useRef(selectedProductIds.join(','));

  React.useEffect(() => {
    const controller = new AbortController();
    const handle = setTimeout(() => {
      setIsLoading(true);
      const params = new URLSearchParams();
      if (productSearch.trim()) params.set('search', productSearch.trim());
      if (initialProductIdsRef.current) params.set('ids', initialProductIdsRef.current);

      fetch(`/api/cms/ecommerce/product-picker?${params.toString()}`, {
        signal: controller.signal,
      })
        .then(async (response) => {
          if (!response.ok) {
            const body = await response.json().catch(() => ({}));
            throw new Error(body?.error || 'Failed to load products.');
          }
          return response.json();
        })
        .then((payload: PickerData) => {
          const products = payload.products ?? [];
          setData({
            categories: payload.categories ?? [],
            products,
            hasMore: Boolean(payload.hasMore),
          });
          setKnownProducts((previous) => {
            const next = new Map(previous);
            for (const product of products) next.set(product.id, product);
            return next;
          });
          setLoadError(null);
        })
        .catch((error: unknown) => {
          if (error instanceof DOMException && error.name === 'AbortError') return;
          setLoadError(error instanceof Error ? error.message : 'Failed to load products.');
        })
        .finally(() => {
          if (!controller.signal.aborted) setIsLoading(false);
        });
      // Debounce so typing in the product search does not fire a request per keystroke.
    }, productSearch ? 250 : 0);

    return () => {
      controller.abort();
      clearTimeout(handle);
    };
  }, [productSearch]);

  const handleChange = <K extends keyof ProductGridBlockContent>(
    field: K,
    value: ProductGridBlockContent[K]
  ) => {
    onChange({ ...content, [field]: value });
  };

  /**
   * Writing `categoryIds` has to drop the legacy `categoryId`, otherwise
   * `resolveProductGridCategoryIds` falls back to it and a category the author
   * just removed comes straight back.
   */
  const handleCategoryChange = (ids: string[]) => {
    const { categoryId: _legacyCategoryId, ...rest } = content;
    onChange({ ...rest, categoryIds: ids });
  };

  const limit = resolveProductGridLimit(content);
  const isUnlimited = limit === PRODUCT_GRID_UNLIMITED;
  const showPagination = Boolean(content.showPagination);

  /**
   * Pagination needs a page size, so switching it on for an unlimited grid picks
   * a sensible one instead of leaving the block in a contradictory state.
   */
  const handlePaginationChange = (checked: boolean) => {
    onChange({
      ...content,
      showPagination: checked,
      limit: checked && isUnlimited ? PRODUCT_GRID_DEFAULT_PAGE_SIZE : limit,
    });
  };

  // The field is backed by a draft string so it can be emptied mid-edit; only
  // parseable values are committed to the block.
  const [limitDraft, setLimitDraft] = React.useState(() => String(limit));
  React.useEffect(() => {
    setLimitDraft(String(limit));
  }, [limit]);

  const handleLimitChange = (raw: string) => {
    setLimitDraft(raw);
    const parsed = parseInt(raw, 10);
    if (Number.isNaN(parsed)) return;
    const floor = showPagination ? 1 : PRODUCT_GRID_UNLIMITED;
    handleChange('limit', Math.min(Math.max(parsed, floor), PRODUCT_GRID_MAX_LIMIT));
  };

  const handleSourceChange = (nextType: SourceType) => {
    const { categoryId: _legacyCategoryId, ...rest } = content;
    onChange({
      ...rest,
      type: nextType,
      // Both selections are kept so switching source back and forth is
      // non-destructive; the renderer only reads the one matching `type`.
      categoryIds: selectedCategoryIds,
      productIds: selectedProductIds,
    });
  };

  const categoryOptions: PickerOption[] = React.useMemo(
    () =>
      data.categories.map((category) => ({
        id: category.id,
        label: category.name,
        description: `/${category.slug}`,
      })),
    [data.categories]
  );

  const productOptions: PickerOption[] = React.useMemo(
    () => data.products.map(toProductOption),
    [data.products]
  );

  const selectedProductOptions: PickerOption[] = React.useMemo(
    () =>
      selectedProductIds
        .map((id) => knownProducts.get(id))
        .filter((product): product is PickerProduct => Boolean(product))
        .map(toProductOption),
    [selectedProductIds, knownProducts]
  );

  const activeSource = SOURCE_OPTIONS.find((option) => option.value === sourceType) ?? SOURCE_OPTIONS[0];

  return (
    <div className="mt-2 space-y-5 border-t p-3">
      <div>
        <Label htmlFor="pg-title">Grid title (optional)</Label>
        <Input
          id="pg-title"
          value={content.title || ""}
          onChange={(e) => handleChange('title', e.target.value)}
          placeholder="New Arrivals"
          className="mt-1"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">
          Shown as a heading above the grid. Leave empty for no heading.
        </p>
      </div>

      <div>
        <Label>Which products?</Label>
        <div
          role="radiogroup"
          aria-label="Product source"
          className="mt-1 grid grid-cols-3 gap-1 rounded-lg border bg-muted/40 p-1"
        >
          {SOURCE_OPTIONS.map((option) => {
            const Icon = option.icon;
            const isActive = option.value === sourceType;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={isActive}
                onClick={() => handleSourceChange(option.value)}
                className={cn(
                  'flex items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-xs transition-colors',
                  isActive
                    ? 'bg-background font-medium text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {option.label}
              </button>
            );
          })}
        </div>
        <p className="mt-1.5 text-[11px] leading-snug text-muted-foreground">{activeSource.hint}</p>
      </div>

      {loadError && (
        <p className="flex items-start gap-1.5 rounded-md bg-destructive/10 p-2 text-[11px] text-destructive">
          <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" />
          {loadError}
        </p>
      )}

      {sourceType === 'category' && (
        <div>
          <Label>Categories</Label>
          <div className="mt-1">
            <MultiEntityPicker
              options={categoryOptions}
              selectedIds={selectedCategoryIds}
              onChange={handleCategoryChange}
              nouns={['category', 'categories']}
              placeholder="Select categories…"
              searchPlaceholder="Search categories…"
              emptyMessage="No categories yet."
              isLoading={isLoading}
              maxSelected={PRODUCT_GRID_MAX_CATEGORIES}
              hint={
                selectedCategoryIds.length === 0
                  ? 'No category selected — the grid falls back to the latest products.'
                  : 'A product appears if it belongs to any of these categories.'
              }
            />
          </div>
        </div>
      )}

      {sourceType === 'manual' && (
        <div>
          <Label>Products</Label>
          <div className="mt-1">
            <MultiEntityPicker
              options={productOptions}
              selectedOptions={selectedProductOptions}
              selectedIds={selectedProductIds}
              onChange={(ids) => handleChange('productIds', ids)}
              nouns={['product', 'products']}
              placeholder="Select products…"
              searchPlaceholder="Search by title or SKU…"
              emptyMessage="No products match that search."
              isLoading={isLoading}
              onSearchChange={setProductSearch}
              showOrder
              maxSelected={PRODUCT_GRID_MAX_PRODUCTS}
              hint={
                selectedProductIds.length === 0
                  ? 'Pick at least one product — an empty list renders nothing on the page.'
                  : `Shown in this order. ${data.hasMore ? 'Search to find products beyond the 50 most recent. ' : ''}Products are matched to the page language automatically.`
              }
            />
          </div>
        </div>
      )}

      <div className="space-y-3">
        {/* A hand-picked list has no cap to set — the picks are the cap — so the
            count field only appears there once it means "per page". */}
        {(sourceType !== 'manual' || showPagination) && (
          <div>
            <Label htmlFor="pg-limit">
              {showPagination ? 'Products per page' : 'Products to show'}
            </Label>
            <Input
              id="pg-limit"
              type="number"
              min={showPagination ? 1 : PRODUCT_GRID_UNLIMITED}
              max={PRODUCT_GRID_MAX_LIMIT}
              value={limitDraft}
              onChange={(e) => handleLimitChange(e.target.value)}
              onBlur={() => setLimitDraft(String(limit))}
              className="mt-1 w-28"
            />
            <p className="mt-1 text-[11px] leading-snug text-muted-foreground">
              {showPagination ? (
                <>
                  How many products fill one page (1–{PRODUCT_GRID_MAX_LIMIT}). Visitors page
                  through {sourceType === 'manual' ? 'the whole list' : 'everything that matches'}.
                </>
              ) : isUnlimited ? (
                <>
                  <strong className="font-medium text-foreground">0 = unlimited</strong> — every
                  matching product is shown on one page.
                </>
              ) : (
                <>
                  Maximum number of products in this grid (max {PRODUCT_GRID_MAX_LIMIT}). Set it to{' '}
                  <strong className="font-medium text-foreground">0</strong> to show them all.
                </>
              )}
            </p>
          </div>
        )}

        <div className="flex items-start gap-2">
          <Checkbox
            id="pg-pagination"
            checked={showPagination}
            onCheckedChange={(checked) => handlePaginationChange(checked === true)}
            className="mt-0.5"
          />
          <div>
            <Label htmlFor="pg-pagination" className="cursor-pointer">
              Paginate
            </Label>
            <p className="text-[11px] leading-snug text-muted-foreground">
              Adds Previous / Next controls so visitors can reach every product
              {isUnlimited ? `, ${PRODUCT_GRID_DEFAULT_PAGE_SIZE} at a time.` : '.'}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
