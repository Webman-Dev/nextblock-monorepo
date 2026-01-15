// Stub implementation for Open Source version
// This file replaces the real libs/ecommerce during public sync

console.warn(
  '⚠️  NextBlock E-commerce: Free/Stub version installed. Features are disabled. Please configure your license key to unlock functionality.',
);

// Cart Components Stubs
export const CartIcon = () => null;
export const CartDrawer = () => null;
export const AddToCartButton = () => null;

// Store Hooks Stubs
export const useCartStore = () => undefined;
export const useCart = () => undefined;
export const useCartTotalItems = () => 0;
export const useCartSubtotal = () => 0;

// Deprecated/Legacy support if needed (based on previous file content)
export const addToCart = () => null;

// Product Stubs
import { z } from 'zod';
export const productSchema = z.object({});
export type ProductFormValues = any;

export const getProducts = async () => ({ data: [], error: null, count: 0 });
export const getProduct = async () => ({ data: null, error: null });
export const createProduct = async () => ({ data: null, error: null });
export const updateProduct = async () => ({ data: null, error: null });
