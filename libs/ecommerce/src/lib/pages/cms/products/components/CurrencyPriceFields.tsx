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
    <div className="divide-y divide-muted/50">
      {currencies.map((currency) => {
        const normalizedCurrency = normalizeCurrencyRecord(currency);
        const isStoreManaged =
          normalizedCurrency.is_default !== true &&
          managedCurrencyCodeSet.has(normalizedCurrency.code);
        const isInputDisabled = readOnly || isStoreManaged;

        return (
          <div
            key={normalizedCurrency.code}
            className="flex flex-wrap items-center gap-4 py-3 first:pt-0 last:pb-0"
          >
            {/* Currency Identity */}
            <div className="flex items-center gap-3 w-[140px] shrink-0">
              <div className="space-y-0.5">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold tracking-tight">{normalizedCurrency.code}</span>
                  {normalizedCurrency.is_default ? (
                    <Badge variant="secondary" className="text-[10px] px-1.5 h-4 uppercase font-bold">Default</Badge>
                  ) : null}
                  {isStoreManaged ? (
                    <Badge variant="outline" className="text-[10px] px-1.5 h-4 uppercase font-bold">Auto</Badge>
                  ) : null}
                </div>
                <p className="text-[11px] text-muted-foreground leading-none font-medium">
                  {normalizedCurrency.symbol} · rate {normalizedCurrency.exchange_rate}
                </p>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="flex-1 grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3">
                <Label
                  htmlFor={`${idPrefix}-price-${normalizedCurrency.code}`}
                  className="text-xs uppercase font-bold text-muted-foreground tracking-widest shrink-0"
                >
                  Price
                </Label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                    {normalizedCurrency.symbol}
                  </span>
                  <Input
                    id={`${idPrefix}-price-${normalizedCurrency.code}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={prices[normalizedCurrency.code] ?? ''}
                    disabled={isInputDisabled}
                    className="h-8 text-sm pl-6"
                    onChange={(event) =>
                      onPriceChange(
                        normalizedCurrency.code,
                        Number(event.target.value || 0)
                      )
                    }
                  />
                </div>
              </div>

              <div className="flex items-center gap-3">
                <Label
                  htmlFor={`${idPrefix}-sale-price-${normalizedCurrency.code}`}
                  className="text-xs uppercase font-bold text-muted-foreground tracking-widest shrink-0"
                >
                  Sale
                </Label>
                <div className="relative flex-1">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                    {normalizedCurrency.symbol}
                  </span>
                  <Input
                    id={`${idPrefix}-sale-price-${normalizedCurrency.code}`}
                    type="number"
                    step="0.01"
                    min="0"
                    value={salePrices[normalizedCurrency.code] ?? ''}
                    disabled={isInputDisabled}
                    placeholder={isStoreManaged ? 'Auto' : '—'}
                    className="h-8 text-sm pl-6"
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
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
