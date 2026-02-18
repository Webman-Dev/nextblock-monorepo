import { Database } from '@nextblock-cms/db';

export type Order = Database['public']['Tables']['orders']['Row'];
export type OrderItem = Database['public']['Tables']['order_items']['Row'];
export type Profile = Database['public']['Tables']['profiles']['Row'];

export interface OrderItemWithProduct extends OrderItem {
    product?: {
        title: string;
        image_url?: string | null;
        slug?: string;
    } | null;
}

export interface OrderWithDetails extends Order {
  order_items: OrderItemWithProduct[];
  customer?: Profile | null; // Joined from profiles table if user_id exists
  // We can also compute a display name/email helper if needed, 
  // but for now we'll use the raw data + customer_details
}
