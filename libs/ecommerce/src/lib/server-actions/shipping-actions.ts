'use server';

import { resolveShippingOptions, ShippingDestination, ResolvedShippingMethod } from '../shipping/resolver';

/**
 * Server action to fetch shipping estimates from the client components (Cart/Checkout).
 */
export async function getShippingEstimates(
    cartTotal: number, 
    destination: ShippingDestination
): Promise<{ success: boolean; methods?: ResolvedShippingMethod[]; error?: string }> {
    try {
        if (!destination.country) {
            return { success: false, error: 'Country is required for shipping calculation' };
        }

        const methods = await resolveShippingOptions(cartTotal, destination);
        return { success: true, methods };
    } catch (error: any) {
        console.error('Failed to resolve shipping options:', error);
        return { success: false, error: error.message || 'Failed to calculate shipping' };
    }
}
