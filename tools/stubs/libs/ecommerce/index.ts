// Stub implementation for Open Source version
// This file replaces the real libs/ecommerce during public sync

console.warn(
  '⚠️  NextBlock E-commerce: Free/Stub version installed. Features are disabled. Please configure your license key to unlock functionality.',
);

export const CartIcon = () => null;

export const addToCart = () => null;

export const CartDrawer = () => null;

// Product Stubs
import { z } from 'zod';
export const productSchema = z.object({});
export type ProductFormValues = any;

export const getProducts = async () => ({ data: [], error: null, count: 0 });
export const getProduct = async () => ({ data: null, error: null });
export const createProduct = async () => ({ data: null, error: null });
export const updateProduct = async () => ({ data: null, error: null });
