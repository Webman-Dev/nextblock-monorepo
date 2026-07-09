'use client';

import { useEffect, useState, type ReactNode } from 'react';

import { Input, Label } from '@nextblock-cms/ui';
import { getCurrencyMinorUnitFactor } from '@nextblock-cms/utils';

import {
  normalizeCurrencyRecord,
  type CurrencyRecord,
} from '../../../../currency';

/** Currency amounts render with 2 decimals, except zero-decimal currencies (JPY, …). */
function currencyDecimals(currencyCode: string): number {
  return getCurrencyMinorUnitFactor(currencyCode) === 1 ? 0 : 2;
}

function formatMoney(value: number | null | undefined, decimals: number): string {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '';
  }
  return value.toFixed(decimals);
}

interface MoneyInputProps {
  id: string;
  currencyCode: string;
  value: number | null | undefined;
  disabled?: boolean;
  placeholder?: string;
  className?: string;
  /** Sale prices may be cleared to null; base prices fall back to 0 when empty. */
  allowEmpty?: boolean;
  onValueChange: (value: number | null) => void;
}

/**
 * A money field that always displays the padded, currency-correct amount
 * (e.g. "29.50", not "29.5") when idle, while letting the user type freely
 * without the value being reformatted mid-keystroke. A plain
 * `<input type="number">` can't show trailing zeros because its value is a raw
 * JS number, so we buffer the text locally and re-pad on blur.
 */
function MoneyInput({
  id,
  currencyCode,
  value,
  disabled,
  placeholder,
  className,
  allowEmpty = false,
  onValueChange,
}: MoneyInputProps) {
  const decimals = currencyDecimals(currencyCode);
  const [focused, setFocused] = useState(false);
  const [draft, setDraft] = useState(() => formatMoney(value, decimals));

  // While the field isn't being edited, mirror external updates (auto-fill,
  // currency sync, variant recalcs) and keep the padded display.
  useEffect(() => {
    if (!focused) {
      setDraft(formatMoney(value, decimals));
    }
  }, [value, decimals, focused]);

  return (
    <Input
      id={id}
      type="text"
      inputMode="decimal"
      value={draft}
      disabled={disabled}
      placeholder={placeholder}
      className={className}
      onFocus={() => setFocused(true)}
      onChange={(event) => {
        // Keep only digits and a single decimal separator as the user types.
        let cleaned = event.target.value.replace(/[^0-9.]/g, '');
        const firstDot = cleaned.indexOf('.');
        if (firstDot !== -1) {
          cleaned =
            cleaned.slice(0, firstDot + 1) +
            cleaned.slice(firstDot + 1).replace(/\./g, '');
        }
        setDraft(cleaned);
        if (cleaned === '' || cleaned === '.') {
          onValueChange(allowEmpty ? null : 0);
          return;
        }
        const parsed = Number(cleaned);
        if (!Number.isNaN(parsed)) {
          onValueChange(parsed);
        }
      }}
      onBlur={() => {
        setFocused(false);
        // Snap the stored value to the currency precision so it matches the
        // padded display and never lingers as e.g. 29.999.
        if (value !== null && value !== undefined && !Number.isNaN(value)) {
          const rounded = Number(value.toFixed(decimals));
          if (rounded !== value) {
            onValueChange(rounded);
          }
        }
      }}
    />
  );
}

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
  /** Rendered inline at the end of the default-currency row (e.g. a sale schedule). */
  trailing?: ReactNode;
}

export function CurrencyPriceFields({
  idPrefix = 'currency',
  currencies,
  prices,
  salePrices,
  managedCurrencyCodes = [],
  onPriceChange,
  onSalePriceChange,
  readOnly = false,
  helperText,
  trailing,
}: CurrencyPriceFieldsProps) {
  const defaultCurrency = currencies.find((currency) => currency.is_default) ?? currencies[0];
  const managedCurrencyCodeSet = new Set(managedCurrencyCodes);

  if (!defaultCurrency) {
    return null;
  }

  return (
    <div className="flex flex-col gap-2">
      {helperText && (
        <p className="text-xs text-muted-foreground bg-muted/20 p-2 rounded-md border">{helperText}</p>
      )}
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
            className="flex flex-wrap items-stretch gap-4 py-3 first:pt-0 last:pb-0"
          >
            {/* Currency Identity */}
            <div className="flex items-center gap-2 w-[160px] shrink-0 self-stretch border-r border-border/50 pr-4">
                <span className="text-sm font-black tracking-tighter text-foreground">{normalizedCurrency.code}</span>
                <span className="text-[11px] text-muted-foreground font-medium">{normalizedCurrency.symbol}</span>
                {normalizedCurrency.is_default ? (
                  <span className="text-[9px] uppercase font-bold bg-primary/10 text-primary px-1.5 py-0.5 rounded tracking-widest leading-none">Default</span>
                ) : isStoreManaged ? (
                  <span className="text-[9px] uppercase font-bold bg-muted text-muted-foreground px-1.5 py-0.5 rounded tracking-widest leading-none">Auto</span>
                ) : null}
                {!normalizedCurrency.is_default && (
                  <span className="text-[9px] text-muted-foreground/80 font-medium tracking-wide leading-none ml-auto">
                    x{normalizedCurrency.exchange_rate}
                  </span>
                )}
            </div>

            {/* Four equal-width columns: Price · Sale · Sale starts · Sale ends */}
            <div className="grid flex-1 grid-cols-2 items-end gap-3 sm:grid-cols-4">
              {/* Price */}
              <div className="min-w-0 space-y-1">
                <Label
                  htmlFor={`${idPrefix}-price-${normalizedCurrency.code}`}
                  className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest"
                >
                  Price
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                    {normalizedCurrency.symbol}
                  </span>
                  <MoneyInput
                    id={`${idPrefix}-price-${normalizedCurrency.code}`}
                    currencyCode={normalizedCurrency.code}
                    value={prices[normalizedCurrency.code]}
                    disabled={isInputDisabled}
                    className="h-8 w-full text-sm pl-6"
                    onValueChange={(value) =>
                      onPriceChange(normalizedCurrency.code, value ?? 0)
                    }
                  />
                </div>
              </div>

              {/* Sale */}
              <div className="min-w-0 space-y-1">
                <Label
                  htmlFor={`${idPrefix}-sale-price-${normalizedCurrency.code}`}
                  className="block text-[10px] uppercase font-bold text-muted-foreground tracking-widest"
                >
                  Sale
                </Label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground font-bold pointer-events-none">
                    {normalizedCurrency.symbol}
                  </span>
                  <MoneyInput
                    id={`${idPrefix}-sale-price-${normalizedCurrency.code}`}
                    currencyCode={normalizedCurrency.code}
                    value={salePrices[normalizedCurrency.code]}
                    disabled={isInputDisabled}
                    placeholder={isStoreManaged ? 'Auto' : '—'}
                    allowEmpty
                    className="h-8 w-full text-sm pl-6"
                    onValueChange={(value) =>
                      onSalePriceChange(normalizedCurrency.code, value)
                    }
                  />
                </div>
              </div>

              {/* Sale schedule (two equal cells) on the default-currency row */}
              {trailing && normalizedCurrency.is_default ? trailing : null}
            </div>
          </div>
        );
      })}
    </div>
    </div>
  );
}
