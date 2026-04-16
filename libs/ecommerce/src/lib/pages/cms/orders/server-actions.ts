'use server';

import { createClient } from '@nextblock-cms/db/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { applyOrderInventoryDeduction } from '../../../order-inventory';
import { assignInvoiceMetadata } from '../../../invoice-server';

export async function markOrderAsPaid(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = await createClient();
    
    // 1. Verify Authentication (using user session)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Perform Update using Service Role (Bypass RLS)
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;

    if (!serviceRoleKey || !supabaseUrl) {
         return { success: false, error: 'Server configuration error' };
    }

    const adminSupabase = createSupabaseClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    });

    const { data: updatedData, error } = await adminSupabase
        .from('orders')
        .update({ status: 'paid' })
        .eq('id', orderId)
        .select();

    if (error) {
        console.error('Mark Paid DB Error:', error);
        return { success: false, error: error.message };
    }

    if (!updatedData || updatedData.length === 0) {
        return { success: false, error: 'Order not found or update failed.' };
    }

    await assignInvoiceMetadata({
        orderId,
        client: adminSupabase as any,
    });
    await applyOrderInventoryDeduction(adminSupabase as any, orderId);

    return { success: true };
}
