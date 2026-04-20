import 'server-only';

import type { Database } from '@nextblock-cms/db';
import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { normalizeCurrencyCode } from '@nextblock-cms/utils';

import {
  getDefaultCurrency,
  normalizeCurrencyRecord,
  type CurrencyRecord,
} from './currency';

type CurrencyRow = Pick<
  Database['public']['Tables']['currencies']['Row'],
  | 'id'
  | 'code'
  | 'symbol'
  | 'exchange_rate'
  | 'is_default'
  | 'is_active'
  | 'auto_update_exchange_rate'
  | 'auto_sync_product_prices'
  | 'exchange_rate_source'
  | 'exchange_rate_updated_at'
  | 'updated_at'
  | 'rounding_mode'
  | 'rounding_increment'
  | 'rounding_charm_amount'
>;

type FrankfurterRate = {
  base: string;
  date: string;
  quote: string;
  rate: number;
};

const FX_API_BASE_URL = 'https://api.frankfurter.dev';
const CURRENCY_SYNC_SELECT =
  'id, code, symbol, exchange_rate, is_default, is_active, auto_update_exchange_rate, auto_sync_product_prices, exchange_rate_source, exchange_rate_updated_at, updated_at, rounding_mode, rounding_increment, rounding_charm_amount';

function getCurrencyId(currency: Pick<CurrencyRow, 'code' | 'id'>) {
  if (!currency.id) {
    throw new Error(`Currency ${normalizeCurrencyCode(currency.code)} is missing its ID.`);
  }

  return currency.id;
}

function getFxApiBaseUrl() {
  return process.env.FX_API_BASE_URL?.trim().replace(/\/+$/, '') || FX_API_BASE_URL;
}

function getFxProviderLabel(baseUrl: string) {
  try {
    const parsedUrl = new URL(baseUrl);
    const normalizedPath = parsedUrl.pathname.replace(/\/+$/, '');
    return `${parsedUrl.host}${normalizedPath && normalizedPath !== '/' ? normalizedPath : ''}`;
  } catch {
    return baseUrl;
  }
}

function isFrankfurterRate(value: unknown): value is FrankfurterRate {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const record = value as Record<string, unknown>;

  return (
    typeof record.base === 'string' &&
    typeof record.date === 'string' &&
    typeof record.quote === 'string' &&
    typeof record.rate === 'number' &&
    Number.isFinite(record.rate) &&
    record.rate > 0
  );
}

function isFrankfurterRateArray(value: unknown): value is FrankfurterRate[] {
  return Array.isArray(value) && value.every(isFrankfurterRate);
}

async function getCurrenciesForSync() {
  const supabase = getServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('currencies')
    .select(CURRENCY_SYNC_SELECT)
    .order('code', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return {
    supabase,
    currencies: (data || []) as CurrencyRow[],
  };
}

export async function rebaseStoreCurrencyExchangeRates(params: {
  newDefaultCurrencyCode: string;
  previousBaseRate: number;
}) {
  const newDefaultCurrencyCode = normalizeCurrencyCode(params.newDefaultCurrencyCode);
  const previousBaseRate = Number(params.previousBaseRate);

  if (!Number.isFinite(previousBaseRate) || previousBaseRate <= 0) {
    throw new Error('Cannot rebase exchange rates without a valid previous base rate.');
  }

  const { supabase, currencies } = await getCurrenciesForSync();
  const newDefaultCurrency = currencies.find(
    (currency) => normalizeCurrencyCode(currency.code) === newDefaultCurrencyCode
  );

  if (!newDefaultCurrency) {
    throw new Error(`Currency ${newDefaultCurrencyCode} was not found for rebasing.`);
  }

  const rebasedAt = new Date().toISOString();
  const updatedCurrencies: string[] = [];
  const rebasedRows = currencies.map((currency) => {
    const currencyId = getCurrencyId(currency);
    const currencyCode = normalizeCurrencyCode(currency.code);
    const nextExchangeRate =
      currencyCode === newDefaultCurrencyCode
        ? 1
        : Number((currency.exchange_rate / previousBaseRate).toFixed(10));

    updatedCurrencies.push(currencyCode);

    return {
      ...currency,
      id: currencyId,
      exchange_rate: nextExchangeRate,
      auto_update_exchange_rate:
        currencyCode === newDefaultCurrencyCode
          ? false
          : currency.auto_update_exchange_rate,
      exchange_rate_source:
        currencyCode === newDefaultCurrencyCode
          ? 'store-default'
          : currency.exchange_rate_source || 'rebased-default',
      exchange_rate_updated_at: rebasedAt,
      updated_at: rebasedAt,
    };
  });

  const { error } = await supabase.from('currencies').upsert(rebasedRows, {
    onConflict: 'id',
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    rebasedAt,
    newDefaultCurrencyCode,
    updatedCurrencies,
  };
}

export async function syncStoreCurrencyRates() {
  const { supabase, currencies } = await getCurrenciesForSync();

  if (!currencies.length) {
    throw new Error('No currencies are configured yet.');
  }

  const normalizedCurrencies = currencies.map((currency) =>
    normalizeCurrencyRecord(currency as Partial<CurrencyRecord>)
  );
  const defaultCurrency = getDefaultCurrency(normalizedCurrencies);
  const baseCurrencyCode = normalizeCurrencyCode(defaultCurrency.code);
  const defaultCurrencyRow = currencies.find(
    (currency) => normalizeCurrencyCode(currency.code) === baseCurrencyCode
  );

  if (!defaultCurrencyRow) {
    throw new Error(`Default currency ${baseCurrencyCode} could not be found for syncing.`);
  }

  const syncableCurrencies = currencies.filter(
    (currency) =>
      normalizeCurrencyCode(currency.code) !== baseCurrencyCode &&
      currency.auto_update_exchange_rate !== false
  );
  const providerUrl = getFxApiBaseUrl();
  const provider = getFxProviderLabel(providerUrl);
  const fetchedAt = new Date().toISOString();

  const { error: defaultCurrencyError } = await supabase.from('currencies').upsert(
    {
      ...defaultCurrencyRow,
      id: getCurrencyId(defaultCurrencyRow),
      exchange_rate: 1,
      auto_update_exchange_rate: false,
      exchange_rate_source: 'store-default',
      exchange_rate_updated_at: fetchedAt,
      updated_at: fetchedAt,
    },
    {
      onConflict: 'id',
    }
  );

  if (defaultCurrencyError) {
    throw new Error(defaultCurrencyError.message);
  }

  if (!syncableCurrencies.length) {
    return {
      baseCurrencyCode,
      fetchedAt,
      provider,
      providerUrl,
      skippedCurrencies: [] as string[],
      updatedCurrencies: [] as string[],
    };
  }

  const requestUrl = new URL(`${providerUrl}/v2/rates`);
  requestUrl.searchParams.set('base', baseCurrencyCode);
  requestUrl.searchParams.set(
    'quotes',
    [...new Set(syncableCurrencies.map((currency) => normalizeCurrencyCode(currency.code)))].join(
      ','
    )
  );

  const response = await fetch(requestUrl.toString(), {
    cache: 'no-store',
    headers: {
      Accept: 'application/json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `FX provider request failed (${response.status}): ${
        errorText || 'Unexpected response body.'
      }`
    );
  }

  const responseBody: unknown = await response.json();

  if (!isFrankfurterRateArray(responseBody)) {
    throw new Error('FX provider returned an unexpected response payload.');
  }

  const ratesByCode = new Map<string, number>();

  for (const rate of responseBody) {
    ratesByCode.set(normalizeCurrencyCode(rate.quote), rate.rate);
  }

  const updatedCurrencies: string[] = [];
  const skippedCurrencies: string[] = [];
  const syncedRows: CurrencyRow[] = [];

  for (const currency of syncableCurrencies) {
    const currencyCode = normalizeCurrencyCode(currency.code);
    const exchangeRate = ratesByCode.get(currencyCode);

    if (!exchangeRate || !Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      skippedCurrencies.push(currencyCode);
      continue;
    }

    syncedRows.push({
      ...currency,
      id: getCurrencyId(currency),
      exchange_rate: Number(exchangeRate.toFixed(10)),
      exchange_rate_source: provider,
      exchange_rate_updated_at: fetchedAt,
      updated_at: fetchedAt,
    });
    updatedCurrencies.push(currencyCode);
  }

  if (syncedRows.length) {
    const { error } = await supabase.from('currencies').upsert(syncedRows, {
      onConflict: 'id',
    });

    if (error) {
      throw new Error(error.message);
    }
  }

  return {
    baseCurrencyCode,
    fetchedAt,
    provider,
    providerUrl,
    skippedCurrencies,
    updatedCurrencies,
  };
}

export async function clearAutoSyncedCurrencyPriceOverrides(currencyCode: string) {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const supabase = getServiceRoleSupabaseClient();
  const { error } = await supabase.rpc('clear_currency_price_overrides', {
    target_currency: normalizedCurrencyCode,
  });

  if (error) {
    throw new Error(error.message);
  }

  return {
    currencyCode: normalizedCurrencyCode,
  };
}
