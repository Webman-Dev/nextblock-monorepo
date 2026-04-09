import { getSsgSupabaseClient } from '@nextblock-cms/db/server';

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
    destination: ShippingDestination
): Promise<ResolvedShippingMethod[]> {
    const supabase = getSsgSupabaseClient();

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
        const stateMatch = matches.find(m => m.state_code === destination.state);
        if (stateMatch) selectedZoneId = stateMatch.zone_id;
    }
    
    // Fallback to Country match
    if (!selectedZoneId) {
        const countryMatch = matches.find(m => !m.state_code && !m.postal_code);
        if (countryMatch) selectedZoneId = countryMatch.zone_id;
    }
    
    // Final fallback: First zone in priority list
    if (!selectedZoneId) {
        selectedZoneId = matches[0].zone_id;
    }

    // 3. Fetch methods for the resolved zone
    const { data: methods, error: methodsError } = await supabase
        .from('shipping_zone_methods')
        .select('*')
        .eq('zone_id', selectedZoneId);

    if (methodsError || !methods) {
        return [];
    }

    // 4. Filter methods based on cart total (e.g., Free Shipping only if > $100)
    const validMethods = methods.filter(m => cartTotal >= (m.min_order_amount || 0));

    // 5. Select only the most economical (cheapest) method available
    const sortedMethods = validMethods.sort((a, b) => (a.cost_amount ?? 0) - (b.cost_amount ?? 0));
    const cheapestMethod = sortedMethods[0];

    if (!cheapestMethod) {
        return [];
    }

    return [{
        id: cheapestMethod.id,
        name: cheapestMethod.name,
        amount: cheapestMethod.cost_amount || 0,
        currency: cheapestMethod.cost_currency || 'USD',
        type: cheapestMethod.method_type as any
    }];
}
