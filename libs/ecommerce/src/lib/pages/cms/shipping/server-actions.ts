"use server"

import { createClient, getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { normalizeCountryCode } from '../../../countries';
import {
    getEcommerceInventorySettings,
    upsertEcommerceInventorySettings,
} from '../../../inventory-settings';
import { normalizeSubdivisionCode } from '../../../states';

export interface ShippingZoneLocationInput {
    country_code: string;
    state_code?: string | null;
}

function sanitizeTranslations(translations?: Record<string, string> | null) {
    return Object.entries(translations || {}).reduce<Record<string, string>>((accumulator, [code, value]) => {
        const normalizedCode = code.trim().toLowerCase();
        const normalizedValue = value.trim();

        if (normalizedCode && normalizedValue) {
            accumulator[normalizedCode] = normalizedValue;
        }

        return accumulator;
    }, {});
}

export async function updateInventoryTrackingAction(formData: FormData) {
    const supabase = createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
        throw new Error('Unauthorized');
    }

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user.id)
        .single();

    if (!profile || profile.role !== 'ADMIN') {
        throw new Error('Forbidden');
    }

    const trackQuantities = formData.getAll('trackQuantities').includes('true');
    const currentSettings = await getEcommerceInventorySettings(supabase);

    const { error } = await upsertEcommerceInventorySettings(supabase, {
        trackQuantities,
        enableTaxes: currentSettings.enableTaxes,
        taxCalculationMode: currentSettings.taxCalculationMode,
    });

    if (error) {
        throw new Error(error.message);
    }

    revalidatePath('/cms/shipping');
    redirect('/cms/shipping?success=Inventory settings updated');
}

function normalizeShippingZoneLocations(locations: ShippingZoneLocationInput[]) {
    const deduped = new Map<string, ShippingZoneLocationInput>();

    for (const location of locations) {
        const countryCode = normalizeCountryCode(location.country_code);

        if (!countryCode) {
            continue;
        }

        const stateCode = normalizeSubdivisionCode(countryCode, location.state_code) || null;
        const key = `${countryCode}:${stateCode ?? '*'}`;

        deduped.set(key, {
            country_code: countryCode,
            state_code: stateCode,
        });
    }

    return [...deduped.values()];
}

/**
 * Creates a new shipping zone with associated countries/states.
 */
export async function createShippingZone(
    name: string,
    priority: number,
    locations: ShippingZoneLocationInput[]
) {
    const supabase = getServiceRoleSupabaseClient();
    const normalizedLocations = normalizeShippingZoneLocations(locations);
    
    // 1. Insert Zone
    const { data: zone, error: zoneError } = await supabase
        .from('shipping_zones')
        .insert({ name, priority_order: priority })
        .select()
        .single();
        
    if (zoneError || !zone) {
        return { error: zoneError?.message || 'Failed to create zone' };
    }
    
    // 2. Insert Locations
    if (normalizedLocations.length > 0) {
        const locationRows = normalizedLocations.map((location) => ({
            zone_id: zone.id,
            country_code: location.country_code,
            state_code: location.state_code ?? null,
        }));
        
        const { error: locError } = await supabase
            .from('shipping_zone_locations')
            .insert(locationRows);
            
        if (locError) {
            return { error: locError.message };
        }
    }
    
    revalidatePath('/cms/shipping');
    return { success: true };
}

/**
 * Updates an existing shipping zone and its country/state associations.
 */
export async function updateShippingZone(
    id: string,
    name: string,
    priority: number,
    locations: ShippingZoneLocationInput[]
) {
    const supabase = getServiceRoleSupabaseClient();
    const normalizedLocations = normalizeShippingZoneLocations(locations);
    
    // 1. Update Zone Metadata
    const { error: zoneError } = await supabase
        .from('shipping_zones')
        .update({ name, priority_order: priority, updated_at: new Date().toISOString() })
        .eq('id', id);
        
    if (zoneError) {
        return { error: zoneError.message || 'Failed to update zone' };
    }
    
    // 2. Refresh Locations (Delete and Re-insert)
    const { error: deleteError } = await supabase
        .from('shipping_zone_locations')
        .delete()
        .eq('zone_id', id);
        
    if (deleteError) {
        return { error: 'Failed to refresh locations' };
    }
    
    if (normalizedLocations.length > 0) {
        const locationRows = normalizedLocations.map((location) => ({
            zone_id: id,
            country_code: location.country_code,
            state_code: location.state_code ?? null,
        }));
        
        const { error: locError } = await supabase
            .from('shipping_zone_locations')
            .insert(locationRows);
            
        if (locError) {
            return { error: locError.message };
        }
    }
    
    revalidatePath('/cms/shipping');
    return { success: true };
}

export async function deleteShippingZone(id: string) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zones').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cms/shipping');
    return { success: true };
}

/**
 * Creates a new shipping rate for a zone.
 */
export async function createShippingRate(zoneId: string, data: { 
    name: string, 
    nameTranslations?: Record<string, string>,
    type: 'flat_rate' | 'free_shipping', 
    cost: number,
    minOrderAmount?: number
}) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zone_methods').insert({
        zone_id: zoneId,
        name: data.name.trim(),
        name_translations: sanitizeTranslations(data.nameTranslations),
        method_type: data.type,
        cost_amount: data.cost,
        cost_currency: 'usd',
        min_order_amount: data.minOrderAmount || 0
    });
    
    if (error) return { error: error.message };
    revalidatePath('/cms/shipping');
    return { success: true };
}

/**
 * Updates an existing shipping rate.
 */
export async function updateShippingRate(id: string, data: { 
    name: string, 
    nameTranslations?: Record<string, string>,
    type: 'flat_rate' | 'free_shipping', 
    cost: number,
    minOrderAmount?: number
}) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zone_methods').update({
        name: data.name.trim(),
        name_translations: sanitizeTranslations(data.nameTranslations),
        method_type: data.type,
        cost_amount: data.cost,
        min_order_amount: data.minOrderAmount || 0,
        updated_at: new Date().toISOString()
    }).eq('id', id);
    
    if (error) return { error: error.message };
    revalidatePath('/cms/shipping');
    return { success: true };
}

export async function deleteShippingRate(id: string) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zone_methods').delete().eq('id', id);
    if (error) return { error: error.message };
    revalidatePath('/cms/shipping');
    return { success: true };
}
