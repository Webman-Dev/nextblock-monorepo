import type { CheckoutSessionInput } from './customer';
import type {
  CurrencyRecord,
  PriceMap,
  SalePriceMap,
} from './currency';

export type TranslationMap = Record<string, string>;
export type { CurrencyRecord, PriceMap, SalePriceMap };

// Basic Product interface for UI components
// In a real app, this might come from database types, but we define the UI requirement here.
export interface ProductAttributeTerm {
  id: string;
  attribute_id: string;
  value: string;
  slug: string;
  sort_order?: number | null;
  value_translations?: TranslationMap | null;
}

export interface ProductAttribute {
  id: string;
  name: string;
  slug: string;
  name_translations?: TranslationMap | null;
  terms: ProductAttributeTerm[];
}

export interface ProductVariantOption {
  attribute_id: string;
  attribute_name: string;
  term_id: string;
  term_value: string;
  term_slug?: string;
}

export interface ProductVariant {
  id: string;
  combination_key: string;
  sku: string;
  upc?: string | null;
  price: number;
  prices?: PriceMap | null;
  sale_price?: number | null;
  sale_prices?: SalePriceMap | null;
  stock_quantity: number;
  attribute_term_ids: string[];
  selected_options: ProductVariantOption[];
  label: string;
  main_media_id?: string | null;
  image_url?: string | null;
}

export interface Product {
  id: string;
  title: string;
  slug: string;
  sku: string;
  upc?: string | null;
  price: number;
  prices?: PriceMap | null;
  sale_price?: number | null;
  sale_prices?: SalePriceMap | null;
  is_taxable?: boolean;
  price_range_min?: number | null;
  price_range_max?: number | null;
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
  has_variants?: boolean;
  variant_id?: string;
  variant_label?: string;
  selected_options?: ProductVariantOption[];
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  product_variants?: Array<{
    id: string;
    price: number;
    prices?: PriceMap | null;
    sale_price?: number | null;
    sale_prices?: SalePriceMap | null;
  }>;
}

export interface ShippingZone {
  id: string;
  name: string;
  priority_order: number;
  countries: string[];
  states: string[];
}

export interface TaxRate {
  id: string;
  country_code: string;
  state_code?: string | null;
  tax_name: string;
  tax_rate: number;
  created_at?: string | null;
  updated_at?: string | null;
}

export type TaxCalculationMode = 'manual' | 'automatic';

export interface EcommerceSettings {
  trackQuantities: boolean;
  enableTaxes: boolean;
  taxCalculationMode: TaxCalculationMode;
}

export interface TaxCalculationLine {
  id?: string;
  name: string;
  rate: number;
  amount: number;
  country_code: string;
  state_code?: string | null;
}

export interface TaxCalculationResult {
  enabled: boolean;
  mode: TaxCalculationMode;
  amount: number;
  taxableSubtotal: number;
  lines: TaxCalculationLine[];
  isPendingExternalCalculation?: boolean;
}

export type BillingCycle = 'monthly' | 'annual' | 'lifetime';

export type CartItemProvider = 'stripe' | 'freemius';

export type CartItem = Product & {
  quantity: number;
  product_id: string;
  currency_code?: string;
  /** Which payment provider handles this cart item */
  provider?: CartItemProvider;
  /** For Freemius items: the selected billing cycle */
  billing_cycle?: BillingCycle;
  /** The MSRP/Original price before any sale_price logic */
  original_price?: number;
};

export interface CheckoutProviderError {
  error: string;
  errorKey?: string;
  errorParams?: Record<string, string | number>;
  errorStatus?: number;
}

/** Helper to check if a cart item is a Freemius digital product */
export function isDigitalItem(item: Pick<CartItem, 'provider'>): boolean {
  return item.provider === 'freemius';
}

export interface PaymentProvider {
  createCheckoutSession(input: CheckoutSessionInput): Promise<{
    url: string | null;
    error?: string;
    errorKey?: string;
    errorParams?: Record<string, string | number>;
    errorStatus?: number;
    customProps?: any;
  }>;
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
