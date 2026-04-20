'use client';

import { Badge, Button, Input, Label } from '@nextblock-cms/ui';

import {
  describeCurrencyRoundingRule,
  normalizeCurrencyRecord,
  type CurrencyRecord,
} from '../../../../currency';

interface CurrencyPriceFieldsProps {
  idPrefix?: string;
  currencies: CurrencyRecord[];
  prices: Record<string, number | null | undefined>;
  salePrices: Record<string, number | null | undefined>;
  managedCurrencyCodes?: string[];
  onPriceChange: (currencyCode: string, value: number) => void;
  onSalePriceChange: (currencyCode: string, value: number | null) => void;
  onAutoFill?: () => void;
  readOnly?: boolean;
  helperText?: string;
}

export function CurrencyPriceFields({
  idPrefix = 'currency',
  currencies,
  prices,
  salePrices,
  managedCurrencyCodes = [],
  onPriceChange,
  onSalePriceChange,
  onAutoFill,
  readOnly = false,
  helperText,
}: CurrencyPriceFieldsProps) {
  const defaultCurrency = currencies.find((currency) => currency.is_default) ?? currencies[0];
  const managedCurrencyCodeSet = new Set(managedCurrencyCodes);
  const hasEditableFxCurrencies = currencies.some(
    (currency) =>
      !currency.is_default && !managedCurrencyCodeSet.has(normalizeCurrencyRecord(currency).code)
  );

  if (!defaultCurrency) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="space-y-1">
          <p className="font-medium">Currency Pricing</p>
          <p className="text-sm text-muted-foreground">
            {helperText ||
              `Set exact prices for each active currency. ${defaultCurrency.code} is the base currency for FX auto-fill.`}
          </p>
        </div>
        {onAutoFill && hasEditableFxCurrencies ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onAutoFill}
            disabled={readOnly}
          >
            Auto-fill manual FX prices
          </Button>
        ) : null}
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {currencies.map((currency) => {
          const normalizedCurrency = normalizeCurrencyRecord(currency);
          const isStoreManaged =
            normalizedCurrency.is_default !== true &&
            managedCurrencyCodeSet.has(normalizedCurrency.code);
          const isInputDisabled = readOnly || isStoreManaged;

          return (
            <div
              key={normalizedCurrency.code}
              className="rounded-lg border bg-card/70 p-4 shadow-sm"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="font-medium">{normalizedCurrency.code}</p>
                  <p className="text-xs text-muted-foreground">
                    {normalizedCurrency.symbol} | rate {normalizedCurrency.exchange_rate}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {describeCurrencyRoundingRule(normalizedCurrency)}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {normalizedCurrency.is_default ? <Badge>Default</Badge> : null}
                  {isStoreManaged ? <Badge variant="outline">Auto Price Sync</Badge> : null}
                </div>
              </div>

              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-price-${normalizedCurrency.code}`}>
                    Regular Price ({normalizedCurrency.code})
                  </Label>
                  <Input
                    id={`${idPrefix}-price-${normalizedCurrency.code}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices[normalizedCurrency.code] ?? ''}
                    disabled={isInputDisabled}
                    onChange={(event) =>
                      onPriceChange(
                        normalizedCurrency.code,
                        Number(event.target.value || 0)
                      )
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor={`${idPrefix}-sale-price-${normalizedCurrency.code}`}>
                    Sale Price ({normalizedCurrency.code})
                  </Label>
                  <Input
                    id={`${idPrefix}-sale-price-${normalizedCurrency.code}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrices[normalizedCurrency.code] ?? ''}
                    disabled={isInputDisabled}
                    placeholder={isStoreManaged ? 'Derived from base sale price' : 'Optional'}
                    onChange={(event) =>
                      onSalePriceChange(
                        normalizedCurrency.code,
                        event.target.value === ''
                          ? null
                          : Number(event.target.value)
                      )
                    }
                  />
                </div>
                {isStoreManaged ? (
                  <p className="text-xs text-muted-foreground">
                    This currency is derived from {defaultCurrency.code} using the current FX
                    rate and rounding rule. Update the base currency price to change it.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
