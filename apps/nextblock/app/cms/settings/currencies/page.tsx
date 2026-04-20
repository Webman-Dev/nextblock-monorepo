import { createClient } from '@nextblock-cms/db/server';
import {
  describeCurrencyRoundingRule,
  normalizeCurrencyRecord,
  type CurrencyRecord,
} from '@nextblock-cms/ecommerce/server';
import { formatPrice, minorUnitAmountToMajor } from '@nextblock-cms/utils';
import { Badge, Button, Input, Label } from '@nextblock-cms/ui';

import {
  deleteCurrencyAction,
  syncCurrencyRatesAction,
  upsertCurrencyAction,
} from './actions';

const ROUNDING_MODE_OPTIONS = [
  { value: 'none', label: 'Exact conversion' },
  { value: 'nearest', label: 'Round to nearest step' },
  { value: 'up', label: 'Always round up' },
  { value: 'down', label: 'Always round down' },
  { value: 'charm', label: 'Charm ending' },
] as const;

type CurrencySettingsRow = CurrencyRecord & {
  created_at: string;
  id: string;
  updated_at: string;
};

function formatExchangeRate(exchangeRate: number) {
  return Number(exchangeRate).toFixed(6);
}

function formatMinorUnitInput(amount: number | null | undefined, currencyCode: string) {
  if (typeof amount !== 'number') {
    return '';
  }

  return String(minorUnitAmountToMajor(amount, currencyCode));
}

function buildRateStatusText(currency: CurrencyRecord) {
  if (currency.is_default) {
    return 'Base currency. Rate is locked to 1.000000 and live syncing stays off.';
  }

  if (currency.exchange_rate_updated_at) {
    const updatedAt = new Date(currency.exchange_rate_updated_at).toLocaleString();
    const source = currency.exchange_rate_source || 'manual';
    return `Last rate update ${updatedAt} via ${source}.`;
  }

  if (currency.exchange_rate_source) {
    return `Rate source: ${currency.exchange_rate_source}.`;
  }

  return 'No live FX sync has been run yet.';
}

function buildProductPricingStatusText(currency: CurrencyRecord) {
  if (currency.is_default) {
    return 'Base product prices are entered directly in this currency.';
  }

  if (currency.auto_sync_product_prices) {
    return 'Product and variant prices are derived automatically from the base currency using the FX rate and rounding rule below.';
  }

  return 'Merchants can set explicit product and variant prices for this currency.';
}

async function getCurrencies() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('currencies')
    .select(
      'id, code, symbol, exchange_rate, is_default, is_active, auto_update_exchange_rate, auto_sync_product_prices, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount, created_at, updated_at'
    )
    .order('is_default', { ascending: false })
    .order('code', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map(
    (currency) =>
      ({
        ...currency,
        ...normalizeCurrencyRecord(currency),
      }) as CurrencySettingsRow
  );
}

export default async function CmsCurrenciesPage({
  searchParams,
}: {
  searchParams?: Promise<{ error?: string; success?: string }>;
}) {
  const [currencies, resolvedSearchParams] = await Promise.all([
    getCurrencies(),
    searchParams,
  ]);
  const successMessage = resolvedSearchParams?.success || null;
  const errorMessage = resolvedSearchParams?.error || null;

  return (
    <div className="space-y-8">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold">Currency Settings</h1>
        <p className="max-w-3xl text-sm text-muted-foreground">
          Manage shopper-facing currencies, store base pricing, live FX syncing, and the
          rounding rules that keep converted prices looking intentional instead of raw.
          You can also decide whether product prices in each currency are entered manually
          or derived automatically from the store default currency.
        </p>
      </div>

      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
          {successMessage}
        </div>
      ) : null}

      {errorMessage ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {errorMessage}
        </div>
      ) : null}

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold">Live FX Sync</h2>
            <p className="max-w-3xl text-sm text-muted-foreground">
              Rates can be refreshed manually here and are also ready for a daily cron sync.
              Only currencies with auto-update enabled are refreshed, while the default
              currency stays fixed at 1.
            </p>
          </div>
          <form action={syncCurrencyRatesAction}>
            <Button type="submit">Sync Live Rates</Button>
          </form>
        </div>
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Use rounding steps like <strong>0.05</strong> for nickel rounding or charm endings
          like <strong>0.90</strong> to auto-fill prices such as <strong>29.90</strong> and{' '}
          <strong>39.00</strong>.
        </div>
        <div className="rounded-lg border border-dashed bg-muted/20 p-4 text-sm text-muted-foreground">
          Store-managed product pricing disables manual product and variant inputs for that
          currency and derives them from the store default price instead.
        </div>
      </section>

      <section className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
        <div className="space-y-1">
          <h2 className="text-lg font-semibold">Add Currency</h2>
          <p className="text-sm text-muted-foreground">
            Add a new ISO 4217 currency, decide whether it should auto-sync, and define the
            storefront rounding behavior merchants want shoppers to see.
          </p>
        </div>

        <form action={upsertCurrencyAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div className="space-y-2">
            <Label htmlFor="new-code">Code</Label>
            <Input id="new-code" name="code" placeholder="USD" maxLength={3} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-symbol">Symbol</Label>
            <Input id="new-symbol" name="symbol" placeholder="$" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-rate">Exchange Rate</Label>
            <Input
              id="new-rate"
              name="exchange_rate"
              type="number"
              min="0.000001"
              step="0.000001"
              defaultValue="1"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-rounding-mode">Rounding Mode</Label>
            <select
              id="new-rounding-mode"
              name="rounding_mode"
              defaultValue="none"
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
            >
              {ROUNDING_MODE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-rounding-increment">Rounding Step</Label>
            <Input
              id="new-rounding-increment"
              name="rounding_increment"
              type="number"
              min="0.01"
              step="0.01"
              defaultValue="0.01"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="new-rounding-charm">Charm Ending</Label>
            <Input
              id="new-rounding-charm"
              name="rounding_charm_amount"
              type="number"
              min="0"
              step="0.01"
              placeholder="0.90"
            />
          </div>
          <div className="flex flex-col justify-end gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_active" defaultChecked className="h-4 w-4" />
              Active on storefront
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="auto_update_exchange_rate"
                defaultChecked
                className="h-4 w-4"
              />
              Auto-sync live FX
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="auto_sync_product_prices"
                defaultChecked
                className="h-4 w-4"
              />
              Auto-sync product prices
            </label>
            <label className="flex items-center gap-2">
              <input type="checkbox" name="is_default" className="h-4 w-4" />
              Make default currency
            </label>
          </div>
          <div className="flex items-end justify-end">
            <Button type="submit">Save Currency</Button>
          </div>
        </form>

        <p className="text-xs text-muted-foreground">
          For zero-decimal currencies like JPY, use whole-number rounding steps such as{' '}
          <strong>1</strong> or <strong>10</strong>.
        </p>
      </section>

      <section className="space-y-4">
        {currencies.map((currency) => {
          const roundingRule = describeCurrencyRoundingRule(currency);

          return (
            <div key={currency.code} className="space-y-4 rounded-lg border bg-card p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-lg font-semibold">{currency.code}</h2>
                    <Badge variant="outline">{currency.symbol}</Badge>
                    {currency.is_default ? <Badge>Default</Badge> : null}
                    {currency.is_active ? (
                      <Badge variant="secondary">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                    {currency.auto_update_exchange_rate && !currency.is_default ? (
                      <Badge variant="outline">Auto FX</Badge>
                    ) : null}
                    {currency.auto_sync_product_prices && !currency.is_default ? (
                      <Badge variant="outline">Auto Prices</Badge>
                    ) : null}
                  </div>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {buildRateStatusText(currency)}
                  </p>
                  <p className="max-w-3xl text-sm text-muted-foreground">
                    {buildProductPricingStatusText(currency)}
                  </p>
                </div>
                <div className="space-y-1 text-right text-xs text-muted-foreground">
                  <div>Exchange rate: {formatExchangeRate(currency.exchange_rate)}</div>
                  <div>{roundingRule}</div>
                  <div>Updated {new Date(currency.updated_at).toLocaleString()}</div>
                </div>
              </div>

              <div className="grid gap-4 rounded-lg border bg-muted/20 p-4 md:grid-cols-3 xl:grid-cols-4">
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rounding Step
                  </div>
                  <div className="mt-1 font-medium">
                    {formatPrice(currency.rounding_increment ?? 1, currency.code)}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Charm Ending
                  </div>
                  <div className="mt-1 font-medium">
                    {typeof currency.rounding_charm_amount === 'number'
                      ? formatPrice(currency.rounding_charm_amount, currency.code)
                      : 'Not set'}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Rate Source
                  </div>
                  <div className="mt-1 font-medium">
                    {currency.exchange_rate_source || 'Manual'}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Product Pricing
                  </div>
                  <div className="mt-1 font-medium">
                    {currency.is_default
                      ? 'Base prices'
                      : currency.auto_sync_product_prices
                        ? 'Store-managed'
                        : 'Manual'}
                  </div>
                </div>
                <div className="rounded-lg border bg-background p-3">
                  <div className="text-xs uppercase tracking-wide text-muted-foreground">
                    Last FX Sync
                  </div>
                  <div className="mt-1 font-medium">
                    {currency.exchange_rate_updated_at
                      ? new Date(currency.exchange_rate_updated_at).toLocaleString()
                      : 'Never'}
                  </div>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-[1fr_auto]">
                <form action={upsertCurrencyAction} className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                  <input type="hidden" name="id" value={currency.id} />
                  <div className="space-y-2">
                    <Label htmlFor={`code-${currency.id}`}>Code</Label>
                    <Input
                      id={`code-${currency.id}`}
                      name="code"
                      defaultValue={currency.code}
                      maxLength={3}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`symbol-${currency.id}`}>Symbol</Label>
                    <Input
                      id={`symbol-${currency.id}`}
                      name="symbol"
                      defaultValue={currency.symbol}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rate-${currency.id}`}>Exchange Rate</Label>
                    <Input
                      id={`rate-${currency.id}`}
                      name="exchange_rate"
                      type="number"
                      min="0.000001"
                      step="0.000001"
                      defaultValue={formatExchangeRate(currency.exchange_rate)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rounding-mode-${currency.id}`}>Rounding Mode</Label>
                    <select
                      id={`rounding-mode-${currency.id}`}
                      name="rounding_mode"
                      defaultValue={currency.rounding_mode || 'none'}
                      className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                    >
                      {ROUNDING_MODE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rounding-increment-${currency.id}`}>Rounding Step</Label>
                    <Input
                      id={`rounding-increment-${currency.id}`}
                      name="rounding_increment"
                      type="number"
                      min="0.01"
                      step="0.01"
                      defaultValue={formatMinorUnitInput(
                        currency.rounding_increment,
                        currency.code
                      )}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor={`rounding-charm-${currency.id}`}>Charm Ending</Label>
                    <Input
                      id={`rounding-charm-${currency.id}`}
                      name="rounding_charm_amount"
                      type="number"
                      min="0"
                      step="0.01"
                      defaultValue={formatMinorUnitInput(
                        currency.rounding_charm_amount,
                        currency.code
                      )}
                      placeholder="0.90"
                    />
                  </div>
                  <div className="flex flex-col justify-end gap-3 rounded-lg border bg-muted/20 px-4 py-3 text-sm">
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_active"
                        defaultChecked={currency.is_active}
                        className="h-4 w-4"
                      />
                      Active on storefront
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="auto_update_exchange_rate"
                        defaultChecked={
                          currency.is_default
                            ? false
                            : currency.auto_update_exchange_rate !== false
                        }
                        className="h-4 w-4"
                      />
                      Auto-sync live FX
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="auto_sync_product_prices"
                        defaultChecked={
                          currency.is_default ? false : currency.auto_sync_product_prices === true
                        }
                        disabled={currency.is_default}
                        className="h-4 w-4"
                      />
                      Auto-sync product prices
                    </label>
                    <label className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        name="is_default"
                        defaultChecked={currency.is_default}
                        className="h-4 w-4"
                      />
                      Default currency
                    </label>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button type="submit">Update</Button>
                  </div>
                </form>

                <form action={deleteCurrencyAction} className="flex items-end">
                  <input type="hidden" name="id" value={currency.id} />
                  <Button type="submit" variant="outline" disabled={currency.is_default}>
                    Delete
                  </Button>
                </form>
              </div>
            </div>
          );
        })}
      </section>
    </div>
  );
}
