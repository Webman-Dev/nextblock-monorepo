'use client';

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@nextblock-cms/ui/select';

import { useCurrency } from '../CurrencyProvider';

export function CurrencySwitcher() {
  const {
    activeCurrencyCode,
    currencies,
    setActiveCurrencyCode,
  } = useCurrency();

  if (currencies.length <= 1) {
    return null;
  }

  return (
    <Select value={activeCurrencyCode} onValueChange={setActiveCurrencyCode}>
      <SelectTrigger className="h-9 w-[88px] text-xs font-semibold">
        <SelectValue placeholder={activeCurrencyCode} />
      </SelectTrigger>
      <SelectContent>
        {currencies.map((currency) => (
          <SelectItem key={currency.code} value={currency.code}>
            {currency.code}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
