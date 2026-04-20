import {
  majorUnitAmountToMinor,
  minorUnitAmountToMajor,
  normalizeCurrencyCode,
} from '@nextblock-cms/utils';

import {
  convertMinorUnitAmount,
  normalizeCurrencyRecord,
  type CurrencyRecord,
} from '../../../currency';
import type { ProductFormValues } from '../../../product-schema';

type EditorPriceMap = Record<string, number | null | undefined>;
type ProductVariantValue = NonNullable<ProductFormValues['variants']>[number];

function normalizeEditorPriceMap<T extends number | null | undefined>(
  amounts: Record<string, T> | null | undefined
) {
  return Object.entries(amounts || {}).reduce<Record<string, T>>(
    (accumulator, [currencyCode, amount]) => {
      if (typeof amount === 'number' && Number.isFinite(amount) && amount >= 0) {
        accumulator[normalizeCurrencyCode(currencyCode)] = amount as T;
      } else if (amount === null) {
        accumulator[normalizeCurrencyCode(currencyCode)] = null as T;
      }

      return accumulator;
    },
    {}
  );
}

export function isCurrencyStoreManagedPrice(
  currency: CurrencyRecord | null | undefined
) {
  const normalizedCurrency = normalizeCurrencyRecord(currency);
  return (
    normalizedCurrency.is_default !== true &&
    normalizedCurrency.auto_sync_product_prices === true
  );
}

export function getStoreManagedPriceCurrencyCodes(currencies: CurrencyRecord[]) {
  return currencies
    .map((currency) => normalizeCurrencyRecord(currency))
    .filter((currency) => isCurrencyStoreManagedPrice(currency))
    .map((currency) => currency.code);
}

function stripStoreManagedPriceMapEntries<T extends number | null | undefined>(
  amounts: Record<string, T> | null | undefined,
  currencies: CurrencyRecord[]
) {
  const managedCodes = new Set(getStoreManagedPriceCurrencyCodes(currencies));
  const normalizedAmounts = normalizeEditorPriceMap(amounts);

  return Object.entries(normalizedAmounts).reduce<Record<string, T>>(
    (accumulator, [currencyCode, amount]) => {
      if (!managedCodes.has(currencyCode)) {
        accumulator[currencyCode] = amount as T;
      }

      return accumulator;
    },
    {}
  );
}

function resolveManagedDisplayAmount(params: {
  baseAmount: number | null | undefined;
  defaultCurrencyCode: string;
  targetCurrencyCode: string;
  currencies: CurrencyRecord[];
}) {
  const { baseAmount, defaultCurrencyCode, targetCurrencyCode, currencies } = params;

  if (typeof baseAmount !== 'number' || !Number.isFinite(baseAmount) || baseAmount < 0) {
    return null;
  }

  const convertedMinorAmount = convertMinorUnitAmount({
    amount: majorUnitAmountToMinor(baseAmount, defaultCurrencyCode),
    fromCurrencyCode: defaultCurrencyCode,
    toCurrencyCode: targetCurrencyCode,
    currencies,
    applyRounding: true,
  });

  return minorUnitAmountToMajor(convertedMinorAmount, targetCurrencyCode);
}

export function resolveEditorCurrencyPriceMaps(params: {
  currencies: CurrencyRecord[];
  prices: EditorPriceMap | null | undefined;
  salePrices: EditorPriceMap | null | undefined;
  fallbackPrice: number | null | undefined;
  fallbackSalePrice: number | null | undefined;
}) {
  const { currencies, fallbackPrice, fallbackSalePrice } = params;
  const normalizedPrices = normalizeEditorPriceMap(params.prices);
  const normalizedSalePrices = normalizeEditorPriceMap(params.salePrices);
  const defaultCurrency =
    currencies.find((currency) => currency.is_default) ?? currencies[0];

  if (!defaultCurrency) {
    return {
      prices: normalizedPrices,
      salePrices: normalizedSalePrices,
    };
  }

  const baseCurrencyCode = normalizeCurrencyCode(defaultCurrency.code);
  const baseRegularPrice =
    normalizedPrices[baseCurrencyCode] ??
    (typeof fallbackPrice === 'number' ? fallbackPrice : null);
  const baseSalePrice =
    normalizedSalePrices[baseCurrencyCode] ??
    (typeof fallbackSalePrice === 'number' ? fallbackSalePrice : null);

  const prices = currencies.reduce<EditorPriceMap>((accumulator, currency) => {
    const normalizedCurrency = normalizeCurrencyRecord(currency);

    if (isCurrencyStoreManagedPrice(normalizedCurrency)) {
      accumulator[normalizedCurrency.code] = resolveManagedDisplayAmount({
        baseAmount: baseRegularPrice,
        defaultCurrencyCode: baseCurrencyCode,
        targetCurrencyCode: normalizedCurrency.code,
        currencies,
      });
      return accumulator;
    }

    accumulator[normalizedCurrency.code] =
      normalizedPrices[normalizedCurrency.code] ??
      (normalizedCurrency.code === baseCurrencyCode ? baseRegularPrice : undefined);
    return accumulator;
  }, {});

  const salePrices = currencies.reduce<EditorPriceMap>((accumulator, currency) => {
    const normalizedCurrency = normalizeCurrencyRecord(currency);

    if (isCurrencyStoreManagedPrice(normalizedCurrency)) {
      accumulator[normalizedCurrency.code] = resolveManagedDisplayAmount({
        baseAmount: baseSalePrice,
        defaultCurrencyCode: baseCurrencyCode,
        targetCurrencyCode: normalizedCurrency.code,
        currencies,
      });
      return accumulator;
    }

    accumulator[normalizedCurrency.code] =
      normalizedSalePrices[normalizedCurrency.code] ??
      (normalizedCurrency.code === baseCurrencyCode ? baseSalePrice : undefined);
    return accumulator;
  }, {});

  return {
    prices,
    salePrices,
  };
}

export function sanitizeVariantDraftForStoreManagedCurrencies(
  variant: ProductVariantValue,
  currencies: CurrencyRecord[]
): ProductVariantValue {
  const defaultCurrency =
    currencies.find((currency) => currency.is_default) ?? currencies[0];
  const defaultCurrencyCode = defaultCurrency
    ? normalizeCurrencyCode(defaultCurrency.code)
    : 'USD';
  const prices = stripStoreManagedPriceMapEntries(variant.prices, currencies);
  const salePrices = stripStoreManagedPriceMapEntries(variant.sale_prices, currencies);

  return {
    ...variant,
    price:
      typeof prices[defaultCurrencyCode] === 'number'
        ? (prices[defaultCurrencyCode] as number)
        : variant.price,
    prices,
    sale_price:
      typeof salePrices[defaultCurrencyCode] === 'number'
        ? (salePrices[defaultCurrencyCode] as number)
        : variant.sale_price ?? null,
    sale_prices: salePrices,
  };
}

export function sanitizeVariantDraftsForStoreManagedCurrencies(
  variants: ProductFormValues['variants'] | undefined,
  currencies: CurrencyRecord[]
) {
  return (
    variants?.map((variant) =>
      sanitizeVariantDraftForStoreManagedCurrencies(variant, currencies)
    ) || []
  );
}

export function sanitizeProductFormValuesForStoreManagedCurrencies(
  data: ProductFormValues,
  currencies: CurrencyRecord[]
): ProductFormValues {
  const defaultCurrency =
    currencies.find((currency) => currency.is_default) ?? currencies[0];
  const defaultCurrencyCode = defaultCurrency
    ? normalizeCurrencyCode(defaultCurrency.code)
    : 'USD';
  const prices = stripStoreManagedPriceMapEntries(data.prices, currencies);
  const salePrices = stripStoreManagedPriceMapEntries(data.sale_prices, currencies);

  return {
    ...data,
    price:
      typeof prices[defaultCurrencyCode] === 'number'
        ? prices[defaultCurrencyCode]
        : data.price,
    prices,
    sale_price:
      typeof salePrices[defaultCurrencyCode] === 'number'
        ? salePrices[defaultCurrencyCode]
        : data.sale_price ?? null,
    sale_prices: salePrices,
    variants: sanitizeVariantDraftsForStoreManagedCurrencies(data.variants, currencies),
  };
}
