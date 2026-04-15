'use client';

import { useMemo, useRef, useState, useTransition } from 'react';
import {
  Badge,
  Button,
  Input,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@nextblock-cms/ui';
import { Download, RotateCcw, Save, Search, Upload } from 'lucide-react';
import { toast } from 'sonner';

import type { InventoryItem } from '../../../../shared-inventory';
import { importInventoryCsvAction, updateInventoryQuantityAction } from './actions';

interface InventoryTableClientProps {
  initialItems: InventoryItem[];
}

function escapeCsvValue(value: string | number) {
  const normalized = String(value ?? '');

  if (/[",\n]/.test(normalized)) {
    return `"${normalized.replace(/"/g, '""')}"`;
  }

  return normalized;
}

function buildCsvContent(items: InventoryItem[]) {
  const header = [
    'sku',
    'stock',
    'usage_type',
    'product_titles',
    'languages',
    'statuses',
    'parent_product_skus',
  ];

  const rows = items.map((item) => [
    item.sku,
    item.stock,
    item.usageType,
    item.productTitles.join('|'),
    item.languages.join('|'),
    item.statuses.join('|'),
    item.parentProductSkus.join('|'),
  ]);

  return [header, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');
}

function getInventoryLabel(item: InventoryItem) {
  if (item.usageType === 'mixed') {
    return 'Shared SKU';
  }

  if (item.usageType === 'variant') {
    return `Variant SKU ${item.sku}`;
  }

  return 'Simple Product';
}

function getUsageBadgeVariant(item: InventoryItem): 'secondary' | 'outline' {
  if (item.usageType === 'variant') {
    return 'secondary';
  }

  return 'outline';
}

export function InventoryTableClient({ initialItems }: InventoryTableClientProps) {
  const [items, setItems] = useState(initialItems);
  const [draftStockByKey, setDraftStockByKey] = useState<Record<string, string>>(
    () =>
      initialItems.reduce<Record<string, string>>((accumulator, item) => {
        accumulator[item.key] = String(item.stock);
        return accumulator;
      }, {})
  );
  const [searchTerm, setSearchTerm] = useState('');
  const [isPending, startTransition] = useTransition();
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const visibleItems = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    if (!normalizedSearch) {
      return items;
    }

    return items.filter((item) => {
      return (
        item.sku.toLowerCase().includes(normalizedSearch) ||
        item.productTitles.join(' ').toLowerCase().includes(normalizedSearch) ||
        item.parentProductSkus.join(' ').toLowerCase().includes(normalizedSearch) ||
        item.languages.join(' ').toLowerCase().includes(normalizedSearch)
      );
    });
  }, [items, searchTerm]);

  const handleDownloadCsv = () => {
    const csv = buildCsvContent(items);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');

    link.href = url;
    link.download = 'inventory-export.csv';
    link.click();

    URL.revokeObjectURL(url);
  };

  const handleSave = (item: InventoryItem) => {
    const rawValue = draftStockByKey[item.key] ?? String(item.stock);
    const parsedStock = Number.parseInt(rawValue, 10);

    if (!Number.isFinite(parsedStock) || parsedStock < 0) {
      toast.error('Stock must be a non-negative whole number.');
      return;
    }

    setPendingKey(item.key);
    startTransition(async () => {
      const result = await updateInventoryQuantityAction({
        sku: item.sku,
        stock: parsedStock,
      });

      if (!result.success) {
        toast.error(result.error || 'Failed to update inventory.');
        setPendingKey(null);
        return;
      }

      const nextStock = typeof result.stock === 'number' ? result.stock : parsedStock;

      setItems((previous) =>
        previous.map((candidate) =>
          candidate.key === item.key
            ? {
                ...candidate,
                stock: nextStock,
              }
            : candidate
        )
      );
      setDraftStockByKey((previous) => ({
        ...previous,
        [item.key]: String(nextStock),
      }));
      setPendingKey(null);
      toast.success(`Inventory updated for ${item.sku}.`);
    });
  };

  const handleImportClick = () => {
    fileInputRef.current?.click();
  };

  const handleImportFile = async (file: File) => {
    const text = await file.text();
    setPendingKey('import');

    startTransition(async () => {
      const result = await importInventoryCsvAction(text);

      if (!result.success) {
        toast.error(result.error || 'Failed to import inventory CSV.');
        setPendingKey(null);
        return;
      }

      const nextItems = result.items || [];
      setItems(nextItems);
      setDraftStockByKey(
        nextItems.reduce<Record<string, string>>((accumulator, item) => {
          accumulator[item.key] = String(item.stock);
          return accumulator;
        }, {})
      );
      setPendingKey(null);
      toast.success(`Imported ${result.updatedCount || 0} inventory updates.`);
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 rounded-xl border bg-card p-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
          <div className="relative w-full lg:max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by SKU, product title, parent SKU, or language..."
              className="pl-9"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) {
                  void handleImportFile(file);
                }
                event.currentTarget.value = '';
              }}
            />
            <Button type="button" variant="outline" onClick={handleImportClick} disabled={isPending}>
              <Upload className="mr-2 h-4 w-4" />
              Import CSV
            </Button>
            <Button type="button" variant="outline" onClick={handleDownloadCsv} disabled={isPending}>
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </div>

        <p className="text-sm text-muted-foreground">
          Inventory is keyed by sellable SKU. Any product or variant using the same SKU shares the
          same quantity, and CSV imports can update those shared SKU quantities in bulk.
        </p>
      </div>

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>SKU</TableHead>
              <TableHead>Usage</TableHead>
              <TableHead>Linked Products</TableHead>
              <TableHead>Languages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[160px]">Quantity</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visibleItems.length > 0 ? (
              visibleItems.map((item) => {
                const draftValue = draftStockByKey[item.key] ?? String(item.stock);
                const parsedDraft = Number.parseInt(draftValue, 10);
                const isDirty = Number.isFinite(parsedDraft) && parsedDraft !== item.stock;
                const isRowPending = pendingKey === item.key;

                return (
                  <TableRow key={item.key}>
                    <TableCell className="font-mono text-sm">{item.sku}</TableCell>
                    <TableCell>
                      <Badge variant={getUsageBadgeVariant(item)}>
                        {getInventoryLabel(item)}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{item.productTitles.join(', ')}</p>
                        {item.usageType !== 'product' ? (
                          <p className="text-xs text-muted-foreground">
                            Parent SKU{item.parentProductSkus.length > 1 ? 's' : ''}:{' '}
                            <span className="font-mono">{item.parentProductSkus.join(', ')}</span>
                          </p>
                        ) : null}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.languages.map((languageCode) => (
                          <Badge key={`${item.key}:${languageCode}`} variant="outline">
                            {languageCode}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        {item.statuses.map((status) => (
                          <Badge key={`${item.key}:${status}`} variant="outline">
                            {status}
                          </Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        step={1}
                        value={draftValue}
                        disabled={isPending}
                        onChange={(event) =>
                          setDraftStockByKey((previous) => ({
                            ...previous,
                            [item.key]: event.target.value,
                          }))
                        }
                        className="w-28"
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          disabled={!isDirty || isPending}
                          onClick={() =>
                            setDraftStockByKey((previous) => ({
                              ...previous,
                              [item.key]: String(item.stock),
                            }))
                          }
                        >
                          <RotateCcw className="mr-2 h-4 w-4" />
                          Reset
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          disabled={!isDirty || isPending}
                          onClick={() => handleSave(item)}
                        >
                          <Save className="mr-2 h-4 w-4" />
                          {isRowPending ? 'Saving...' : 'Save'}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                  No inventory rows matched your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
