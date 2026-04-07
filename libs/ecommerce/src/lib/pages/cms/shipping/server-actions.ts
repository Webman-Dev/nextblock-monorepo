"use server"

import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';

/**
 * Creates a new shipping zone with associated countries.
 */
export async function createShippingZone(name: string, priority: number, countries: string[]) {
    const supabase = getServiceRoleSupabaseClient();
    
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
    if (countries.length > 0) {
        const locations = countries.map(code => ({
            zone_id: zone.id,
            country_code: code
        }));
        
        const { error: locError } = await supabase
            .from('shipping_zone_locations')
            .insert(locations);
            
        if (locError) {
            return { error: locError.message };
        }
    }
    
    revalidatePath('/cms/shipping');
    return { success: true };
}

/**
 * Updates an existing shipping zone and its country associations.
 */
export async function updateShippingZone(id: string, name: string, priority: number, countries: string[]) {
    const supabase = getServiceRoleSupabaseClient();
    
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
    
    if (countries.length > 0) {
        const locations = countries.map(code => ({
            zone_id: id,
            country_code: code
        }));
        
        const { error: locError } = await supabase
            .from('shipping_zone_locations')
            .insert(locations);
            
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
    type: 'flat_rate' | 'free_shipping', 
    cost: number,
    minOrderAmount?: number
}) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zone_methods').insert({
        zone_id: zoneId,
        name: data.name,
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
    type: 'flat_rate' | 'free_shipping', 
    cost: number,
    minOrderAmount?: number
}) {
    const supabase = getServiceRoleSupabaseClient();
    const { error } = await supabase.from('shipping_zone_methods').update({
        name: data.name,
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
