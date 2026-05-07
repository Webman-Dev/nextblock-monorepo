'use server';

import { createClient } from '@nextblock-cms/db/server';

export type ReportType = 'general_ledger' | 'tax_liability' | 'currency_summary';

export async function fetchOrderReportData(
  startDate: string,
  endDate: string
) {
  const supabase = createClient();

  // Basic date filtering
  let query = supabase
    .from('orders')
    .select('*, order_items(*)');

  if (startDate) {
    query = query.gte('created_at', startDate);
  }
  if (endDate) {
    // Add time to end date to include the whole day
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query = query.lte('created_at', end.toISOString());
  }

  // Filter only paid orders for accounting reports? 
  // Usually accountants care about realized revenue.
  // Requirement 1 mentions "Payment Status", so we should fetch all status but maybe default to paid?
  // Let's fetch all and let the mapping handle it or keep it as is.
  
  const { data: orders, error } = await query.order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching report data:', error);
    throw new Error(`Failed to fetch report data: ${error.message}`);
  }

  if (!orders || orders.length === 0) {
    return [];
  }

  // For General Ledger and Tax Liability, we might need user emails
  const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean)));
  const profilesMap = new Map();

  if (userIds.length > 0) {
    const { data: profiles } = await supabase
      .from('profiles')
      .select('id, full_name, email')
      .in('id', userIds);
    
    if (profiles) {
      profiles.forEach(p => profilesMap.set(p.id, p));
    }
  }

  return orders.map(order => ({
    ...order,
    customer: order.user_id ? profilesMap.get(order.user_id) : null
  }));
}
