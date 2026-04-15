import { Button } from '@nextblock-cms/ui';
import { createClient } from '@nextblock-cms/db/server';
import { ArrowLeft, Settings2 } from 'lucide-react';
import Link from 'next/link';

import { getEcommerceInventorySettings } from '../../../../inventory-settings';
import { updateInventorySettingsAction } from './actions';

export async function ProductsSettingsPage({
  searchParams,
}: {
  searchParams?: { success?: string };
}) {
  const supabase = createClient();
  const settings = await getEcommerceInventorySettings(supabase);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6 px-6 py-8">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Button asChild variant="outline" size="icon" aria-label="Back to products">
            <Link href="/cms/products">
              <ArrowLeft className="h-4 w-4" />
            </Link>
          </Button>
          <div>
            <h1 className="text-2xl font-bold">Product Settings</h1>
            <p className="text-sm text-muted-foreground">
              Manage how inventory behaves during checkout and order fulfillment.
            </p>
          </div>
        </div>
        <div className="rounded-full border bg-muted/30 p-3 text-muted-foreground">
          <Settings2 className="h-5 w-5" />
        </div>
      </div>

      {searchParams?.success ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {searchParams.success}
        </div>
      ) : null}

      <form action={updateInventorySettingsAction} className="space-y-6 rounded-xl border bg-card p-6 shadow-sm">
        <div className="space-y-2">
          <h2 className="text-lg font-semibold">Inventory Tracking</h2>
          <p className="text-sm text-muted-foreground">
            When enabled, checkout validates available stock and paid orders deduct product quantities.
            When disabled, quantity limits are ignored and stock is left unchanged.
          </p>
        </div>

        <div className="rounded-lg border bg-muted/20 p-4">
          <input type="hidden" name="trackQuantities" value="false" />
          <label htmlFor="track-quantities" className="flex cursor-pointer items-start gap-3">
            <input
              id="track-quantities"
              name="trackQuantities"
              type="checkbox"
              value="true"
              defaultChecked={settings.trackQuantities}
              className="mt-1 h-4 w-4 rounded border-slate-300 text-primary focus:ring-primary"
            />
            <span className="space-y-1">
              <span className="block font-medium">Track product quantities</span>
              <span className="block text-sm text-muted-foreground">
                Prevent overselling by checking stock at checkout and decrementing quantities after
                payment is confirmed.
              </span>
            </span>
          </label>
        </div>

        <div className="flex justify-end border-t pt-4">
          <Button type="submit">Save Settings</Button>
        </div>
      </form>
    </div>
  );
}
