import { normalizeCurrencyCode } from '@nextblock-cms/utils';

import {
  convertMinorUnitAmount,
  getDefaultCurrency,
  normalizePriceMap,
  type CurrencyRecord,
  type PriceMap,
} from './currency';

export const SHIPPING_RATE_CURRENCY_MODES = ['auto', 'manual'] as const;

export type ShippingRateCurrencyMode =
  (typeof SHIPPING_RATE_CURRENCY_MODES)[number];

export function normalizeShippingRateCurrencyMode(
  value: unknown
): ShippingRateCurrencyMode {
  if (typeof value === 'string') {
    const normalizedValue = value.trim().toLowerCase();

    if (
      SHIPPING_RATE_CURRENCY_MODES.includes(
        normalizedValue as ShippingRateCurrencyMode
      )
    ) {
      return normalizedValue as ShippingRateCurrencyMode;
    }
  }

  return 'auto';
}

function normalizeMinorAmount(value: unknown, fallback = 0) {
  if (typeof value === 'number' && Number.isFinite(value) && value >= 0) {
    return Math.round(value);
  }

  return fallback;
}

function resolveShippingRateSourceCurrencyCode(params: {
  amountMap?: PriceMap | null;
  sourceCurrencyCode?: string | null;
  currencies: CurrencyRecord[];
}) {
  const normalizedSourceCurrencyCode = normalizeCurrencyCode(
    params.sourceCurrencyCode
  );
  const normalizedAmountMap = normalizePriceMap(params.amountMap);

  if (normalizedAmountMap[normalizedSourceCurrencyCode] !== undefined) {
    return normalizedSourceCurrencyCode;
  }

  const firstAmountMapCurrencyCode = Object.keys(normalizedAmountMap)[0];

  if (firstAmountMapCurrencyCode) {
    return normalizeCurrencyCode(firstAmountMapCurrencyCode);
  }

  return getDefaultCurrency(params.currencies).code;
}

export function sanitizeShippingRateAmountMaps(params: {
  currencies: CurrencyRecord[];
  mode?: unknown;
  sourceCurrencyCode?: string | null;
  costAmounts?: PriceMap | null;
  minOrderAmounts?: PriceMap | null;
  fallbackCostAmount?: number | null;
  fallbackMinOrderAmount?: number | null;
}) {
  const mode = normalizeShippingRateCurrencyMode(params.mode);
  const normalizedCostAmounts = normalizePriceMap(params.costAmounts);
  const normalizedMinOrderAmounts = normalizePriceMap(params.minOrderAmounts);
  const sourceCurrencyCode = resolveShippingRateSourceCurrencyCode({
    amountMap:
      Object.keys(normalizedCostAmounts).length > 0
        ? normalizedCostAmounts
        : normalizedMinOrderAmounts,
    sourceCurrencyCode: params.sourceCurrencyCode,
    currencies: params.currencies,
  });
  const sourceCostAmount =
    normalizedCostAmounts[sourceCurrencyCode] ??
    normalizeMinorAmount(params.fallbackCostAmount);
  const sourceMinOrderAmount =
    normalizedMinOrderAmounts[sourceCurrencyCode] ??
    normalizeMinorAmount(params.fallbackMinOrderAmount);

  if (mode === 'auto') {
    return {
      mode,
      sourceCurrencyCode,
      costAmounts: {
        [sourceCurrencyCode]: sourceCostAmount,
      },
      minOrderAmounts: {
        [sourceCurrencyCode]: sourceMinOrderAmount,
      },
    };
  }

  const costAmounts =
    Object.keys(normalizedCostAmounts).length > 0
      ? { ...normalizedCostAmounts }
      : { [sourceCurrencyCode]: sourceCostAmount };
  const minOrderAmounts =
    Object.keys(normalizedMinOrderAmounts).length > 0
      ? { ...normalizedMinOrderAmounts }
      : { [sourceCurrencyCode]: sourceMinOrderAmount };

  if (costAmounts[sourceCurrencyCode] === undefined) {
    costAmounts[sourceCurrencyCode] = sourceCostAmount;
  }

  if (minOrderAmounts[sourceCurrencyCode] === undefined) {
    minOrderAmounts[sourceCurrencyCode] = sourceMinOrderAmount;
  }

  return {
    mode,
    sourceCurrencyCode,
    costAmounts,
    minOrderAmounts,
  };
}

export function resolveShippingRateAmountForCurrency(params: {
  currencies: CurrencyRecord[];
  mode?: unknown;
  amountMap?: PriceMap | null;
  fallbackAmount?: number | null;
  sourceCurrencyCode?: string | null;
  currencyCode?: string | null;
}) {
  const mode = normalizeShippingRateCurrencyMode(params.mode);
  const normalizedAmountMap = normalizePriceMap(params.amountMap);
  const targetCurrencyCode = normalizeCurrencyCode(params.currencyCode);

  if (mode === 'manual' && normalizedAmountMap[targetCurrencyCode] !== undefined) {
    return normalizedAmountMap[targetCurrencyCode];
  }

  const sourceCurrencyCode = resolveShippingRateSourceCurrencyCode({
    amountMap: normalizedAmountMap,
    sourceCurrencyCode: params.sourceCurrencyCode,
    currencies: params.currencies,
  });
  const sourceAmount =
    normalizedAmountMap[sourceCurrencyCode] ??
    normalizeMinorAmount(params.fallbackAmount);

  if (targetCurrencyCode === sourceCurrencyCode) {
    return sourceAmount;
  }

  return convertMinorUnitAmount({
    amount: sourceAmount,
    fromCurrencyCode: sourceCurrencyCode,
    toCurrencyCode: targetCurrencyCode,
    currencies: params.currencies,
  });
}
