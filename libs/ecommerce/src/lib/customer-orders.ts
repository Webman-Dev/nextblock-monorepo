import type { SupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@nextblock-cms/db/server';

import type { InvoicePresentationData } from './invoice';
import { getInvoicePresentationData } from './invoice-server';

type SupabaseLikeClient = SupabaseClient<any>;

export interface CustomerOrderSummary {
  id: string;
  invoice_number: string | null;
  paid_at: string | null;
  created_at: string | null;
  currency: string | null;
  status: string;
  provider: string | null;
  subtotal: number | null;
  shipping_total: number | null;
  tax_total: number | null;
  total: number;
}

function getSupabaseClient(client?: SupabaseLikeClient) {
  return client ?? (createClient() as unknown as SupabaseLikeClient);
}

async function requireAuthenticatedUser(supabase: SupabaseLikeClient) {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('Unauthorized');
  }

  return user;
}

export async function getCurrentCustomerOrders(
  client?: SupabaseLikeClient
): Promise<CustomerOrderSummary[]> {
  const supabase = getSupabaseClient(client);
  const user = await requireAuthenticatedUser(supabase);

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, invoice_number, paid_at, created_at, currency, status, provider, subtotal, shipping_total, tax_total, total'
    )
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as CustomerOrderSummary[];
}

export async function getCurrentCustomerOrder(
  orderId: string,
  client?: SupabaseLikeClient
): Promise<CustomerOrderSummary | null> {
  const supabase = getSupabaseClient(client);
  const user = await requireAuthenticatedUser(supabase);

  const { data, error } = await supabase
    .from('orders')
    .select(
      'id, invoice_number, paid_at, created_at, currency, status, provider, subtotal, shipping_total, tax_total, total'
    )
    .eq('id', orderId)
    .eq('user_id', user.id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as CustomerOrderSummary | null) ?? null;
}

export async function getCurrentCustomerOrderInvoice(
  orderId: string,
  client?: SupabaseLikeClient
): Promise<{
  order: CustomerOrderSummary;
  invoice: InvoicePresentationData | null;
} | null> {
  const supabase = getSupabaseClient(client);
  const order = await getCurrentCustomerOrder(orderId, supabase);

  if (!order) {
    return null;
  }

  const invoice = order.invoice_number
    ? await getInvoicePresentationData(orderId, supabase)
    : null;

  return {
    order,
    invoice,
  };
}
