'use server';

import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { stripe, syncStripeOrderFromSession } from '@nextblock-cms/ecommerce/server';

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
      return { success: true, alreadyPaid: result.alreadyPaid };
    }

    const supabase = getServiceRoleSupabaseClient();
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status, provider')
      .eq('id', sessionId)
      .single();

    if (orderError || !order) {
      console.error('Order not found or error:', orderError);
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'paid') {
      return { success: true, alreadyPaid: true };
    }

    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('id', order.id);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return { success: false, error: 'Failed to update order status' };
    }

    return { success: true, alreadyPaid: false };
  } catch (error) {
    console.error('Action error reconciling order:', error);
    return { success: false, error: 'Internal server error' };
  }
}
