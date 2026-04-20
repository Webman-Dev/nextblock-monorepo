import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function utils(): string {
  return 'utils';
}

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const ZERO_DECIMAL_CURRENCIES = new Set([
  'BIF',
  'CLP',
  'DJF',
  'GNF',
  'JPY',
  'KMF',
  'KRW',
  'MGA',
  'PYG',
  'RWF',
  'UGX',
  'VND',
  'VUV',
  'XAF',
  'XOF',
  'XPF',
]);

export function normalizeCurrencyCode(currencyCode?: string | null) {
  const normalized = currencyCode?.trim().toUpperCase();
  return normalized && /^[A-Z]{3}$/.test(normalized) ? normalized : 'USD';
}

export function getCurrencyMinorUnitFactor(currencyCode?: string | null) {
  const normalizedCode = normalizeCurrencyCode(currencyCode);
  return ZERO_DECIMAL_CURRENCIES.has(normalizedCode) ? 1 : 100;
}

export function minorUnitAmountToMajor(
  amount: number,
  currencyCode?: string | null
) {
  return amount / getCurrencyMinorUnitFactor(currencyCode);
}

export function majorUnitAmountToMinor(
  amount: number,
  currencyCode?: string | null
) {
  return Math.round(amount * getCurrencyMinorUnitFactor(currencyCode));
}

export function formatPrice(
  amount: number,
  currencyCode = 'USD',
  locale = 'en-US'
) {
  const normalizedCurrency = normalizeCurrencyCode(currencyCode);

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: normalizedCurrency,
  }).format(minorUnitAmountToMajor(amount, normalizedCurrency));
}
