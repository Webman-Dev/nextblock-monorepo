
// Basic Product interface for UI components
// In a real app, this might come from database types, but we define the UI requirement here.
export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  price: number;
  sale_price?: number | null;
  image_url?: string; // Resolved URL of the primary image
  images?: { url: string; alt?: string }[]; // Array of resolved image URLs
  short_description?: string | null;
  description_json?: any; // Tiptap JSON content
  stock?: number | null;
  freemius_product_id?: string;
  freemius_plan_id?: string;
  custom_props?: any;
  language_id: number;
  translation_group_id: string;
  language_code?: string;
}

export type BillingCycle = 'monthly' | 'annual' | 'lifetime';

export type CartItemProvider = 'stripe' | 'freemius';

export type CartItem = Product & {
  quantity: number;
  product_id: string;
  /** Which payment provider handles this cart item */
  provider?: CartItemProvider;
  /** For Freemius items: the selected billing cycle */
  billing_cycle?: BillingCycle;
  /** The MSRP/Original price before any sale_price logic */
  original_price?: number;
};

/** Helper to check if a cart item is a Freemius digital product */
export function isDigitalItem(item: Pick<CartItem, 'provider'>): boolean {
  return item.provider === 'freemius';
}

export interface PaymentProvider {
  createCheckoutSession(
    items: CartItem[], 
    customerEmail?: string, 
    userId?: string,
    shippingAddress?: any,
    shippingMethodId?: string
  ): Promise<{ url: string | null; error?: string; customProps?: any }>;
  getProviderName(): string;
}

export interface FreemiusPlanAPI {
  id: number;
  name: string;
  title: string;
  description: string;
  created: string;
  updated: string;
}

export interface FreemiusPricingAPI {
  id: number;
  plan_id: number;
  currency: string;
  monthly_price: number | null;
  annual_price: number | null;
  lifetime_price: number | null;
  licenses: number;
}

/** Resolved pricing tier for the storefront (override takes precedence over api) */
export interface ResolvedPricingTier {
  id: string;
  license_quota: number;
  monthly_price: number | null;
  annual_price: number | null;
  lifetime_price: number | null;
  is_active: boolean;
}

export interface ResolvedPlanWithPricing {
  id: string;
  name: string;
  title: string;
  pricing: ResolvedPricingTier[];
}
