import type { OrderCustomerDetails } from '../../../customer';
import type { OrderTaxDetails } from '../../../order-tax-details';

export type Order = {
  currency: string | null;
  created_at: string | null;
  customer_details: OrderCustomerDetails | null;
  coupon_code: string | null;
  discount_total: number | null;
  discount_details: Record<string, unknown> | null;
  freemius_product_id: string | null;
  freemius_plan_id: string | null;
  freemius_license_id: string | null;
  freemius_subscription_id: string | null;
  freemius_trial_id: string | null;
  freemius_user_id: string | null;
  freemius_trial_ends_at: string | null;
  freemius_last_event_type: string | null;
  freemius_last_synced_at: string | null;
  id: string;
  invoice_number: string | null;
  paid_at: string | null;
  payment_intent_id: string | null;
  provider: string | null;
  shipping_total: number | null;
  status: string;
  subtotal: number | null;
  stripe_session_id: string | null;
  tax_details: OrderTaxDetails | null;
  tax_total: number | null;
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
