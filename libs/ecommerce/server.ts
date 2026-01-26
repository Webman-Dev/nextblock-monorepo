// Stub implementation for Open Source version - SERVER
console.warn('⚠️  NextBlock E-commerce Server: Stub version.');

export const createCheckoutSession = async () => ({ error: 'Not implemented', url: null });
export const handleStripeWebhook = async () => ({ received: true });

// Product Actions Stubs
export const getProducts = async () => ({ data: [], error: null, count: 0 });
export const getProduct = async () => ({ data: null, error: null });
export const createProduct = async () => ({ data: null, error: null });
export const updateProduct = async () => ({ data: null, error: null });
