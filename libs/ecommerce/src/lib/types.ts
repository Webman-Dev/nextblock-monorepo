// Basic Product interface for UI components
// In a real app, this might come from database types, but we define the UI requirement here.
export interface Product {
  id: string;
  title: string;
  slug: string;
  price: number;
  sale_price?: number | null;
  image_url?: string; // Resolved URL
  short_description?: string;
  stock?: number;
}
