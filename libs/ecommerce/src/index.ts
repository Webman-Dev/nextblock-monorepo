// Real implementation of the ecommerce library

export * from './lib/components/CartDrawer';
export * from './lib/components/Cart';
export * from './lib/components/Checkout';
export * from './lib/components/CartIcon';
export * from './lib/components/AddToCartButton';
export * from './lib/components/ProductCard';
export * from './lib/components/ProductGrid';
export * from './lib/components/ProductGallery';
export * from './lib/components/FeaturedProduct';
export * from './lib/components/CustomerProfileForm';
export * from './lib/components/SubscriptionSelector';

export * from './lib/cart-store';
export * from './lib/use-cart';
export * from './lib/customer';
export * from './lib/types';

export * from './lib/product-schema';
export * from './lib/product-context';
export * from './lib/components/ProductDetailsLayout';
export * from './lib/variation-utils';
// Server-side logic should be imported from @nextblock-cms/ecommerce/server or explicitly skipped here if using barelling limits.
// We removed server exports from here in the previous step, so this is correct.
