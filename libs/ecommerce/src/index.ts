// Real implementation of the ecommerce library

export * from './lib/components/CartDrawer';
export * from './lib/components/Cart';
export * from './lib/components/Checkout';
export * from './lib/components/CartIcon';
export * from './lib/components/CouponForm';
export * from './lib/components/CurrencySwitcher';
export * from './lib/components/AddToCartButton';
export * from './lib/components/ProductCard';
export * from './lib/components/ProductGrid';
export * from './lib/components/ProductGallery';
export * from './lib/components/FeaturedProduct';
export * from './lib/components/CustomerProfileForm';
export * from './lib/components/SubscriptionSelector';
export * from './lib/components/InvoiceDocument';
export * from './lib/components/InvoiceViewerShell';
export * from './lib/components/AccountNavigationMenu';
export * from './lib/components/SimpleTiptapRenderer';
export { ProductForm } from './lib/pages/cms/products/components/ProductForm';
export { ProductCategorySelector } from './lib/pages/cms/products/components/ProductCategorySelector';

export * from './lib/cart-store';
export * from './lib/coupons';
export * from './lib/CurrencyProvider';
export * from './lib/currency';
export * from './lib/currency-store';
export * from './lib/use-cart';
export * from './lib/customer';
export * from './lib/types';
export * from './lib/trials';
export * from './lib/order-tax-details';
export * from './lib/invoice';
export * from './lib/invoice-ui';

export * from './lib/product-schema';
export * from './lib/product-context';
export * from './lib/components/ProductDetailsLayout';
export * from './lib/variation-utils';
// Server-side logic should be imported from @nextblock-cms/ecommerce/server or explicitly skipped here if using barelling limits.
// We removed server exports from here in the previous step, so this is correct.
