'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import {
  applyOrderInventoryDeduction,
  assignInvoiceMetadata,
  getInvoicePresentationData,
  getStripeClient,
  syncStripeOrderFromSession,
} from '@nextblock-cms/ecommerce/server';
import { resolveSupabaseServiceKey, resolveSupabaseUrl } from '../../../lib/setup/env-status';

function getServiceRoleSupabaseClient() {
  const supabaseUrl = resolveSupabaseUrl();
  const serviceRoleKey = resolveSupabaseServiceKey();

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
    return {
      success: false,
      error: 'No session ID provided',
      errorKey: 'ecommerce.checkout_missing_session_id',
    };
  }

  try {
    if (sessionId.startsWith('cs_')) {
      const stripe = await getStripeClient();
      const session = await stripe.checkout.sessions.retrieve(sessionId);

      if (session.payment_status !== 'paid') {
        return {
          success: false,
          error: 'Payment is still pending',
          errorKey: 'ecommerce.checkout_payment_pending',
        };
      }

      const result = await syncStripeOrderFromSession(session);
      const invoice = await getInvoicePresentationData(result.orderId, getServiceRoleSupabaseClient() as any);
      return {
        success: true,
        alreadyPaid: result.alreadyPaid,
        status: 'paid',
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
      return {
        success: false,
        error: 'Order not found',
        errorKey: 'ecommerce.checkout_success_order_not_found',
      };
    }

    if (order.provider !== 'freemius') {
      return {
        success: false,
        error: 'Only Freemius order references can be finalized here',
        errorKey: 'ecommerce.checkout_success_invalid_reference',
      };
    }

    if (order.status === 'paid') {
      try {
        await applyOrderInventoryDeduction(supabase as any, order.id);
      } catch (inventoryError) {
        console.error('Failed to reconcile inventory for paid order:', inventoryError);
        return {
          success: false,
          error: 'Failed to update order inventory',
          errorKey: 'ecommerce.checkout_success_inventory_update_failed',
        };
      }

      await assignInvoiceMetadata({
        orderId: order.id,
        paidAt: order.paid_at ?? null,
        client: supabase as any,
      });

      return {
        success: true,
        alreadyPaid: true,
        status: 'paid',
        invoice: await getInvoicePresentationData(order.id, supabase as any),
      };
    }

    if (order.status === 'trial') {
      return {
        success: true,
        alreadyPaid: false,
        status: 'trial',
        invoice: await getInvoicePresentationData(order.id, supabase as any),
      };
    }

    return {
      success: false,
      error: 'Payment is still pending',
      errorKey:
        order.status === 'cancelled'
          ? 'order_status_cancelled'
          : 'ecommerce.checkout_payment_pending',
    };
  } catch (error) {
    console.error('Action error reconciling order:', error);
    return {
      success: false,
      error: 'Internal server error',
      errorKey: 'ecommerce.checkout_internal_server_error',
    };
  }
}
