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
  stock?: number;
}
