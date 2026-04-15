import { getInventoryItems } from '../../../../shared-inventory';
import { InventoryTableClient } from './InventoryTableClient';

export async function InventoryPage() {
  const inventoryItems = await getInventoryItems();

  return (
    <div className="p-8 space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold">Inventory</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage source-of-truth stock for every sellable SKU in one place. Matching SKUs share
          the same quantity across products, translations, and variants, and you can update those
          shared quantities inline or in bulk through CSV import and export.
        </p>
      </div>

      <InventoryTableClient initialItems={inventoryItems} />
    </div>
  );
}
