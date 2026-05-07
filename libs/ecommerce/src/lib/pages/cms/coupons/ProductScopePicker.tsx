'use client';

import { useMemo, useState } from 'react';
import { Button } from '@nextblock-cms/ui/button';
import { Input } from '@nextblock-cms/ui/input';
import { ImageIcon, Search } from 'lucide-react';

export type CouponProductOption = {
  id: string;
  title: string;
  sku?: string | null;
  payment_provider: string;
  freemius_product_id?: string | null;
  thumbnailUrl?: string | null;
  language?: {
    code?: string | null;
    name?: string | null;
  } | null;
};

type ProductScopeGroup = {
  key: string;
  title: string;
  sku: string;
  thumbnailUrl?: string | null;
  productIds: string[];
};

function normalizeSkuKey(product: CouponProductOption) {
  const sku = product.sku?.trim();
  return sku ? sku.toUpperCase() : `PRODUCT:${product.id}`;
}

function buildProductGroups(products: CouponProductOption[]) {
  const groups = new Map<string, ProductScopeGroup>();

  for (const product of products) {
    const key = normalizeSkuKey(product);
    const group = groups.get(key);

    if (group) {
      group.productIds.push(product.id);
      continue;
    }

    groups.set(key, {
      key,
      title: product.title,
      sku: product.sku?.trim() || 'No SKU',
      thumbnailUrl: product.thumbnailUrl ?? null,
      productIds: [product.id],
    });
  }

  return [...groups.values()];
}

export function ProductScopePicker({
  products,
  selectedProductIds = [],
}: {
  products: CouponProductOption[];
  selectedProductIds?: string[];
}) {
  const selectedDefaults = useMemo(() => new Set(selectedProductIds), [selectedProductIds]);
  const [selectedIds, setSelectedIds] = useState(selectedDefaults);
  const [searchQuery, setSearchQuery] = useState('');
  const productGroups = useMemo(() => buildProductGroups(products), [products]);
  const filteredGroups = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return productGroups;
    }

    return productGroups.filter((group) =>
      [group.title, group.sku].some((value) => value.toLowerCase().includes(normalizedQuery))
    );
  }, [productGroups, searchQuery]);

  const selectByProvider = (provider: 'stripe' | 'freemius') => {
    setSelectedIds(
      new Set(
        products
          .filter((product) => product.payment_provider === provider)
          .map((product) => product.id)
      )
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setSelectedIds(new Set(products.map((product) => product.id)))}
        >
          Select All
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectByProvider('stripe')}>
          Stripe
        </Button>
        <Button type="button" variant="outline" size="sm" onClick={() => selectByProvider('freemius')}>
          Freemius
        </Button>
      </div>

      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Search products by title or SKU"
          className="pl-9"
        />
      </div>

      <div className="grid max-h-[420px] gap-2 overflow-y-auto rounded-lg border p-3 md:grid-cols-2">
        {filteredGroups.map((group) => {
          const isSelected = group.productIds.some((productId) => selectedIds.has(productId));

          return (
            <label
              key={group.key}
              className="flex cursor-pointer items-center gap-3 rounded-md px-2 py-2 hover:bg-muted/40"
            >
              <input
                type="checkbox"
                checked={isSelected}
                onChange={(event) => {
                  const nextIds = new Set(selectedIds);

                  for (const productId of group.productIds) {
                    if (event.target.checked) {
                      nextIds.add(productId);
                    } else {
                      nextIds.delete(productId);
                    }
                  }

                  setSelectedIds(nextIds);
                }}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
              />
              {isSelected
                ? group.productIds.map((productId) => (
                    <input key={productId} type="hidden" name="product_ids" value={productId} />
                  ))
                : null}
              <span className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-md border bg-muted">
                {group.thumbnailUrl ? (
                  <img
                    src={group.thumbnailUrl}
                    alt=""
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  <ImageIcon className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                )}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block whitespace-normal break-words text-sm font-medium">
                  {group.title}
                </span>
                <span className="block font-mono text-xs text-muted-foreground">{group.sku}</span>
              </span>
            </label>
          );
        })}
        {filteredGroups.length === 0 ? (
          <div className="px-2 py-8 text-center text-sm text-muted-foreground md:col-span-2">
            No matching products.
          </div>
        ) : null}
      </div>
    </div>
  );
}
