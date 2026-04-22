'use server';

import { resolveShippingOptions, ShippingDestination, ResolvedShippingMethod } from '../shipping/resolver';
import { normalizeCountryCode } from '../countries';
import { normalizeSubdivisionCode } from '../states';

/**
 * Server action to fetch shipping estimates from the client components (Cart/Checkout).
 */
export async function getShippingEstimates(
    cartTotal: number, 
    destination: ShippingDestination,
    languageCode?: string,
    currencyCode?: string
): Promise<{
    success: boolean;
    methods?: ResolvedShippingMethod[];
    error?: string;
    errorKey?: string;
}> {
    try {
        const normalizedCountry = normalizeCountryCode(destination.country);

        if (!normalizedCountry) {
            return {
                success: false,
                error: 'Country is required for shipping calculation',
                errorKey: 'ecommerce.shipping_country_required',
            };
        }

        const methods = await resolveShippingOptions(cartTotal, {
            ...destination,
            country: normalizedCountry,
            state: normalizeSubdivisionCode(normalizedCountry, destination.state) || undefined,
        }, languageCode, currencyCode);
        return { success: true, methods };
    } catch (error: any) {
        console.error('Failed to resolve shipping options:', error);
        return {
            success: false,
            error: error.message || 'Failed to calculate shipping',
            errorKey: 'ecommerce.shipping_calculation_failed',
        };
    }
}
