import { getSsgSupabaseClient } from '@nextblock-cms/db/server';
import { getDefaultCurrency } from '../currency';
import { resolveShippingRateAmountForCurrency } from '../shipping-rate-currency';
import { resolveTranslatedText } from '../variation-utils';
import type { TranslationMap } from '../types';

export interface ShippingDestination {
    country: string;
    state?: string;
    postal_code?: string;
}

export interface ResolvedShippingMethod {
    id: string;
    name: string;
    amount: number;
    currency: string;
    type: 'flat_rate' | 'free_shipping';
}

/**
 * Resolves available shipping methods based on destination and cart value.
 */
export async function resolveShippingOptions(
    cartTotal: number, 
    destination: ShippingDestination,
    languageCode?: string | null,
    currencyCode?: string | null
): Promise<ResolvedShippingMethod[]> {
    const supabase = getSsgSupabaseClient();
    const { data: currenciesResult } = await supabase
        .from('currencies')
        .select(
          'code, symbol, exchange_rate, is_default, is_active, auto_sync_product_prices, auto_update_exchange_rate, exchange_rate_source, exchange_rate_updated_at, rounding_mode, rounding_increment, rounding_charm_amount'
        )
      .eq('is_active', true)
      .order('code', { ascending: true });
    const currencies = currenciesResult ?? [];
    const defaultCurrency = getDefaultCurrency(currencies);
    const selectedCurrencyCode = currencyCode || defaultCurrency.code;

    // 1. Find matching zones for the destination
    // Priority logic: 
    // - Local match (postal_code)
    // - Regional match (state_code)
    // - National match (country_code)
    // - Sort by priority_order (lower value = higher priority)

    const { data: matches, error } = await supabase
        .from('shipping_zone_locations')
        .select(`
            zone_id,
            country_code,
            state_code,
            postal_code,
            shipping_zones!inner(priority_order)
        `)
        .eq('country_code', destination.country)
        .order('shipping_zones(priority_order)', { ascending: true });

    if (error || !matches || matches.length === 0) {
        return [];
    }

    // 2. Filter matches for best priority (Zip > State > Country)
    // For now, simpler priority: just take the first match from the ordered zones
    // but we can refine to check if specific state/zip matches exist.
    
    let selectedZoneId: string | null = null;
    
    // Check for State match first if destination has one
    if (destination.state) {
        const stateMatch = matches.find((m: any) => m.state_code === destination.state);
        if (stateMatch) selectedZoneId = stateMatch.zone_id;
    }
    
    // Fallback to Country match
    if (!selectedZoneId) {
        const countryMatch = matches.find((m: any) => !m.state_code && !m.postal_code);
        if (countryMatch) selectedZoneId = countryMatch.zone_id;
    }
    
    // Final fallback: First zone in priority list
    if (!selectedZoneId) {
        selectedZoneId = matches[0].zone_id;
    }

    // 3. Fetch methods for the resolved zone
    const { data: methods, error: methodsError } = await supabase
        .from('shipping_zone_methods')
        .select('id, zone_id, method_type, cost_amount, cost_amounts, cost_currency, currency_pricing_mode, min_order_amount, min_order_amounts, name, name_translations')
        .eq('zone_id', selectedZoneId);

    if (methodsError || !methods) {
        return [];
    }

    // 4. Filter methods based on cart total (e.g., Free Shipping only if > $100)
    const validMethods = methods.filter((method: any) => {
        const convertedThreshold = resolveShippingRateAmountForCurrency({
            amountMap: method.min_order_amounts || {},
            fallbackAmount: method.min_order_amount || 0,
            sourceCurrencyCode: method.cost_currency || defaultCurrency.code,
            mode: method.currency_pricing_mode,
            currencyCode: selectedCurrencyCode,
            currencies,
        });

        return cartTotal >= convertedThreshold;
    });

    // 5. Convert valid methods into the shopper currency, then pick the cheapest.
    const resolvedMethods = validMethods.map((method: any) => ({
        id: method.id,
        name: resolveTranslatedText(
          method.name,
          (method.name_translations || null) as TranslationMap | null,
          languageCode
        ),
        amount: resolveShippingRateAmountForCurrency({
          amountMap: method.cost_amounts || {},
          fallbackAmount: method.cost_amount || 0,
          sourceCurrencyCode: method.cost_currency || defaultCurrency.code,
          mode: method.currency_pricing_mode,
          currencyCode: selectedCurrencyCode,
          currencies,
        }),
        currency: selectedCurrencyCode,
        type: method.method_type as 'flat_rate' | 'free_shipping',
    }));
    const cheapestMethod = resolvedMethods.sort((left: any, right: any) => left.amount - right.amount)[0];

    if (!cheapestMethod) {
        return [];
    }

    return [cheapestMethod];
}
