'use server';

import { createClient } from '@nextblock-cms/db/server';

export async function fulfillOrderAction(sessionId: string) {
  if (!sessionId) return { success: false, error: 'No session ID provided' };

  try {
    const supabase = createClient();

    // 1. Verify the order exists and is currently pending
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('id, status')
      .eq('stripe_session_id', sessionId)
      .single();

    if (orderError || !order) {
      console.error('Order not found or error:', orderError);
      return { success: false, error: 'Order not found' };
    }

    if (order.status === 'paid') {
      return { success: true, message: 'Order already paid' };
    }

    // 2. Mark as paid
    const { error: updateError } = await supabase
      .from('orders')
      .update({ status: 'paid' })
      .eq('stripe_session_id', sessionId);

    if (updateError) {
      console.error('Failed to update order status:', updateError);
      return { success: false, error: 'Failed to update order status' };
    }

    return { success: true };
  } catch (error) {
    console.error('Action error marking order as paid:', error);
    return { success: false, error: 'Internal server error' };
  }
}
