
// Basic Product interface for UI components
// In a real app, this might come from database types, but we define the UI requirement here.
export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image_url?: string; // Resolved URL of the primary image
  images?: { url: string; alt?: string }[]; // Array of resolved image URLs
  short_description?: string | null;
  description_json?: any; // Tiptap JSON content
  stock?: number | null;
  freemius_product_id?: string;
  custom_props?: any;
}

export type CartItem = Product & {
  quantity: number;
  product_id: string; // Ensure this is present
};

export interface PaymentProvider {
  createCheckoutSession(items: CartItem[], customerEmail?: string, userId?: string): Promise<{ url: string | null; error?: string; customProps?: any }>;
  getProviderName(): string;
}

