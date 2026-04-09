import type { OrderCustomerDetails } from '../../../customer';

export type Order = {
  created_at: string | null;
  customer_details: OrderCustomerDetails | null;
  id: string;
  payment_intent_id: string | null;
  provider: string | null;
  status: string;
  stripe_session_id: string | null;
  total: number;
  user_id: string | null;
};

export type OrderItem = {
  id: string;
  order_id: string;
  price_at_purchase: number;
  product_id: string | null;
  quantity: number;
};

export type Profile = {
  avatar_url: string | null;
  full_name: string | null;
  github_username?: string | null;
  id: string;
  phone?: string | null;
  role?: string | null;
  website?: string | null;
};

export type { OrderCustomerDetails };

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
}
