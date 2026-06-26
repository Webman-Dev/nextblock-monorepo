'use server';

import { createClient } from '@nextblock-cms/db/server';
import {
  applyOrderInventoryDeduction,
  assignInvoiceMetadata,
} from '@nextblock-cms/ecommerce/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { OrderWithDetails } from './types';

const ITEMS_PER_PAGE = 20;

export async function getOrders(
  page = 1,
  status?: string,
  search?: string
): Promise<{ data: OrderWithDetails[]; total: number; totalPages: number }> {
  const supabase = createClient();
  const from = (page - 1) * ITEMS_PER_PAGE;
  const to = from + ITEMS_PER_PAGE - 1;

  // 1. Fetch Orders first
  let query = supabase
    .from('orders')
    .select(
      `
      *,
      order_items (*)
    `,
      { count: 'exact' }
    )
    .order('created_at', { ascending: false })
    .range(from, to);

  if (status && status !== 'all') {
    query = query.eq('status', status);
  }

  if (search) {
      query = query.or(`id.eq.${search},user_id.eq.${search}`);
  }

  const { data: ordersData, error: ordersError, count } = await query;

  if (ordersError) {
    console.error('Error fetching orders:', ordersError);
    throw new Error('Failed to fetch orders');
  }

  const orders = (ordersData as any[]) || [];

  // 2. Extract User IDs
  const userIds = Array.from(new Set(orders.map(o => o.user_id).filter(Boolean)));

  // 3. Fetch Profiles if needed
  const profilesMap = new Map();
  if (userIds.length > 0) {
      const { data: profilesData, error: profilesError } = await supabase
          .from('profiles')
          .select('*')
          .in('id', userIds);
      
      if (!profilesError && profilesData) {
          profilesData.forEach(p => profilesMap.set(p.id, p));
      }
  }

  // 4. Merge Data
  const data = orders.map(order => ({
      ...order,
      customer: order.user_id ? profilesMap.get(order.user_id) : null
  })) as OrderWithDetails[];

  return {
    data,
    total: count || 0,
    totalPages: count ? Math.ceil(count / ITEMS_PER_PAGE) : 0,
  };
}

export async function getOrderDetails(orderId: string): Promise<OrderWithDetails | null> {
  const supabase = createClient();

  // 1. Fetch Order
  const { data: orderData, error: orderError } = await supabase
    .from('orders')
    .select(
      `
      *,
      order_items (*)
    `
    )
    .eq('id', orderId)
    .single();

  if (orderError || !orderData) {
    console.error(`Error fetching order ${orderId}:`, orderError);
    return null;
  }

  const order = orderData as any;

  // 2. Fetch Customer if user_id exists
  let customer = null;
  if (order.user_id) {
      const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', order.user_id)
          .single();
      customer = profile;
  }

  // 3. Fetch Products for Items
  const productIds = order.order_items.map((i: any) => i.product_id).filter(Boolean);
  const productsMap = new Map();
  
  if (productIds.length > 0) {
      const { data: products } = await supabase
          .from('products')
          .select('id, title, slug, product_media(media(file_path))')
          .in('id', productIds);
      
      if (products) {
          products.forEach((p: any) => {
             // Extract first image
             let imageUrl = null;
             if (p.product_media && p.product_media.length > 0 && p.product_media[0].media) {
                 imageUrl = p.product_media[0].media.file_path; 
             }
             // DEBUG LOG REMOVED
             productsMap.set(p.id, {
                 title: p.title,
                 slug: p.slug,
                 image_url: imageUrl
             });
          });
      }
  }

  const orderItemsWithProduct = order.order_items.map((item: any) => ({
      ...item,
      product: item.product_id ? productsMap.get(item.product_id) : null
  }));

  return {
      ...order,
      order_items: orderItemsWithProduct,
      customer
  } as OrderWithDetails;
}

export async function markOrderAsPaid(orderId: string): Promise<{ success: boolean; error?: string }> {
    const supabase = createClient();
    
    // 1. Verify Authentication (using user session)
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
        return { success: false, error: 'Unauthorized' };
    }

    // 2. Perform Update using Service Role (Bypass RLS)
    
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY;
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;

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
