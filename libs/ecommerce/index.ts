// Stub implementation for Open Source version
// This file replaces the real libs/ecommerce during public sync

console.warn(
  '⚠️  NextBlock E-commerce: Free/Stub version installed. Features are disabled. Please configure your license key to unlock functionality.',
);

// Cart Components Stubs
export const CartIcon = () => null;
export const CartDrawer = () => null;
export const AddToCartButton = () => null;

// Product Components Stubs
export const ProductCard = () => null;
export const ProductGrid = () => null;
export const ProductGallery = () => null;
export const FeaturedProduct = () => null;

// Store Hooks Stubs
export const useCartStore = () => undefined;
export const useCart = () => undefined;
export const useCartTotalItems = () => 0;
export const useCartSubtotal = () => 0;

// Deprecated/Legacy support
export const addToCart = () => null;

// Product Schema Stubs
import { z } from 'zod';
export const productSchema = z.object({});
export type ProductFormValues = any;

// Types
export interface Product {
    id: string;
    title: string;
    price: number;
    slug: string;
}
