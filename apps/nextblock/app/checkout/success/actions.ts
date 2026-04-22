'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  applyOrderInventoryDeduction,
  assignInvoiceMetadata,
  getInvoicePresentationData,
  stripe,
  syncStripeOrderFromSession,
} from '@nextblock-cms/ecommerce/server';

function getServiceRoleSupabaseClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error('Missing Supabase Service Role environment variables');
  }

  return createSupabaseClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

export async function fulfillOrderAction(sessionId: string) {
  if (!sessionId) {
    return { success: false, error: 'No session ID provided' };
  }

  try {
    if (sessionId.startsWith('cs_')) {
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return { success: false, error: 'Payment is still pending' };
      }

      const result = await syncStripeOrderFromSession(session);
      const invoice = await getInvoicePresentationData(result.orderId, getServiceRoleSupabaseClient() as any);
      return {
        success: true,
        alreadyPaid: result.alreadyPaid,
        invoice,
      };
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select(
        'id, status, provider, total, currency, subtotal, shipping_total, tax_total, tax_details, paid_at'
      )
      .eq('id', sessionId)
      .single();

    if (orderError || !order) {
      console.error('Order not found or error:', orderError);
      return { success: false, error: 'Order not found' };
    }

    if (order.provider !== 'freemius') {
      return { success: false, error: 'Only Freemius order references can be finalized here' };
    }

    if (order.status === 'paid') {
      try {
        await applyOrderInventoryDeduction(supabase as any, order.id);
      } catch (inventoryError) {
        console.error('Failed to reconcile inventory for paid order:', inventoryError);
        return { success: false, error: 'Failed to update order inventory' };
      }

      await assignInvoiceMetadata({
        orderId: order.id,
        paidAt: order.paid_at ?? null,
        client: supabase as any,
      });

      return {
        success: true,
        alreadyPaid: true,
        invoice: await getInvoicePresentationData(order.id, supabase as any),
      };
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return { success: false, error: 'Failed to update order status' };
    }

    try {
      await applyOrderInventoryDeduction(supabase as any, order.id);
    } catch (inventoryError) {
      console.error('Failed to deduct inventory for paid order:', inventoryError);
      return { success: false, error: 'Failed to update order inventory' };
    }

    await assignInvoiceMetadata({
      orderId: order.id,
      paidAt: order.paid_at ?? null,
      client: supabase as any,
    });

    return {
      success: true,
      alreadyPaid: false,
      invoice: await getInvoicePresentationData(order.id, supabase as any),
    };
  } catch (error) {
    console.error('Action error reconciling order:', error);
    return { success: false, error: 'Internal server error' };
  }
}
