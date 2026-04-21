# Role & Context
You are an expert Next.js, Supabase, and Nx Monorepo developer working on NextBlock CMS. 
Currently, the CMS architecture forces administrators to choose a single global payment provider: either Stripe (primarily for physical goods) OR Freemius (for SaaS/digital packages). 

# The Objective
Refactor the e-commerce architecture to support **Concurrent Multi-Provider E-commerce**. A single website must be able to sell products via Stripe AND products via Freemius simultaneously. The payment provider should be determined at the **Product Level**, not the global store level.

# Step-by-Step Implementation Plan

Please review the codebase and execute the following phases. Stop and ask for my confirmation after evaluating Phase 1 before writing code.

## Phase 1: Database Schema & Types Evaluation (`libs/db`)
1. **Product Schema:** Check `libs/db/src/supabase/migrations/` and the TypeScript types (`libs/ecommerce/src/lib/types.ts` or `product-schema.ts`). 
   - We need a way to assign a provider to a specific product. Check if there is a `payment_provider` column (enum: 'stripe' | 'freemius') or if we should rely on a `product_type` (e.g., 'physical' -> stripe, 'digital_software' -> freemius).
   - *Action:* Draft a new Supabase migration to add `payment_provider` to the `products` table, and default existing products to the current global store setting.
2. **Order Schema:** Check the `orders` table.
   - *Action:* Ensure `orders` has a `payment_provider` column so we know how to handle refunds, fulfillments, and syncs for that specific order.

## Phase 2: Admin Settings & UI Adjustments (`apps/nextblock` & `libs/ecommerce`)
1. **Global Settings (`/cms/payments` or `/cms/settings/store`):**
   - Locate the UI where the user toggles "Stripe vs Freemius".
   - *Action:* Change this from a mutually exclusive Radio toggle to independent switch toggles (or dual configuration cards). Admins should be able to activate *both* if they provide the necessary `.env` variables (`STRIPE_SECRET_KEY` and Freemius keys).
2. **Product Editor (`libs/ecommerce/src/lib/pages/cms/products/components/ProductForm.tsx`):**
   - *Action:* Add a dropdown/toggle in the Product creation/edit form: "Payment Provider".
   - If Freemius is selected, show Freemius-specific fields (Plan ID, Sync button).
   - If Stripe is selected, show standard pricing/SKU/inventory fields.

## Phase 3: Cart Logic & Guardrails (`libs/ecommerce/src/lib/cart-store.ts`)
Handling mixed carts (Stripe + Freemius items together) is dangerous because they use completely different checkout flows (Stripe Checkout Session redirect vs Freemius overlay).
1. *Action:* Inspect `cart-store.ts`. Implement a "Cart Conflict" guardrail. 
2. If a user adds a Stripe product to a cart that already has a Freemius product (or vice versa), throw a UI toast error: "You cannot mix physical goods and software subscriptions in the same checkout. Please purchase them separately."
3. Ensure the Cart UI (`CartDrawer.tsx` or `Cart.tsx`) checks the provider of the items currently in the cart to dynamically determine which checkout button/function to trigger.

## Phase 4: Checkout Routing (`api/checkout/route.ts`)
1. *Action:* Refactor the main checkout API route. 
2. It must inspect the items in the request. 
3. If `provider === 'stripe'`, route to `libs/ecommerce/src/lib/stripe/checkout.ts`.
4. If `provider === 'freemius'`, route to the Freemius checkout/activation flow.

## Phase 5: Order Management & Webhooks
1. **Webhooks:** Review `api/webhooks/stripe/route.ts` and `api/webhooks/freemius/route.ts`. Ensure they do not assume exclusive control over the `orders` table. They should only update orders associated with their respective provider.
2. **CMS Order Dashboard (`libs/ecommerce/src/lib/pages/cms/orders/OrdersPage.tsx`):**
   - *Action:* Add a visual badge to the Order list/details indicating whether the order was processed via Stripe or Freemius.
   - Ensure the "Mark as Paid" or "Refund" actions map to the correct provider's server actions.

# Instructions for the Agent
1. Start by searching for `STRIPE_SECRET_KEY`, `freemius`, and `payment_provider` in the `libs/ecommerce` directory to understand the current state.
2. Map out exactly which files need to be touched.
3. Present your findings and the generated SQL migration first. Do not proceed to modifying React components until I approve the database/schema approach.# Role & Context
You are an expert Next.js, Supabase, and Nx Monorepo developer working on NextBlock CMS. 
Currently, the CMS architecture forces administrators to choose a single global payment provider: either Stripe (primarily for physical goods) OR Freemius (for SaaS/digital packages). 

# The Objective
Refactor the e-commerce architecture to support **Concurrent Multi-Provider E-commerce**. A single website must be able to sell products via Stripe AND products via Freemius simultaneously. The payment provider should be determined at the **Product Level**, not the global store level.

# Step-by-Step Implementation Plan

Please review the codebase and execute the following phases. Stop and ask for my confirmation after evaluating Phase 1 before writing code.

## Phase 1: Database Schema & Types Evaluation (`libs/db`)
1. **Product Schema:** Check `libs/db/src/supabase/migrations/` and the TypeScript types (`libs/ecommerce/src/lib/types.ts` or `product-schema.ts`). 
   - We need a way to assign a provider to a specific product. Check if there is a `payment_provider` column (enum: 'stripe' | 'freemius') or if we should rely on a `product_type` (e.g., 'physical' -> stripe, 'digital_software' -> freemius).
   - *Action:* Draft a new Supabase migration to add `payment_provider` to the `products` table, and default existing products to the current global store setting.
2. **Order Schema:** Check the `orders` table.
   - *Action:* Ensure `orders` has a `payment_provider` column so we know how to handle refunds, fulfillments, and syncs for that specific order.

## Phase 2: Admin Settings & UI Adjustments (`apps/nextblock` & `libs/ecommerce`)
1. **Global Settings (`/cms/payments` or `/cms/settings/store`):**
   - Locate the UI where the user toggles "Stripe vs Freemius".
   - *Action:* Change this from a mutually exclusive Radio toggle to independent switch toggles (or dual configuration cards). Admins should be able to activate *both* if they provide the necessary `.env` variables (`STRIPE_SECRET_KEY` and Freemius keys).
2. **Product Editor (`libs/ecommerce/src/lib/pages/cms/products/components/ProductForm.tsx`):**
   - *Action:* Add a dropdown/toggle in the Product creation/edit form: "Payment Provider".
   - If Freemius is selected, show Freemius-specific fields (Plan ID, Sync button).
   - If Stripe is selected, show standard pricing/SKU/inventory fields.

## Phase 3: Cart Logic & Guardrails (`libs/ecommerce/src/lib/cart-store.ts`)
Handling mixed carts (Stripe + Freemius items together) is dangerous because they use completely different checkout flows (Stripe Checkout Session redirect vs Freemius overlay).
1. *Action:* Inspect `cart-store.ts`. Implement a "Cart Conflict" guardrail. 
2. If a user adds a Stripe product to a cart that already has a Freemius product (or vice versa), throw a UI toast error: "You cannot mix physical goods and software subscriptions in the same checkout. Please purchase them separately."
3. Ensure the Cart UI (`CartDrawer.tsx` or `Cart.tsx`) checks the provider of the items currently in the cart to dynamically determine which checkout button/function to trigger.

## Phase 4: Checkout Routing (`api/checkout/route.ts`)
1. *Action:* Refactor the main checkout API route. 
2. It must inspect the items in the request. 
3. If `provider === 'stripe'`, route to `libs/ecommerce/src/lib/stripe/checkout.ts`.
4. If `provider === 'freemius'`, route to the Freemius checkout/activation flow.

## Phase 5: Order Management & Webhooks
1. **Webhooks:** Review `api/webhooks/stripe/route.ts` and `api/webhooks/freemius/route.ts`. Ensure they do not assume exclusive control over the `orders` table. They should only update orders associated with their respective provider.
2. **CMS Order Dashboard (`libs/ecommerce/src/lib/pages/cms/orders/OrdersPage.tsx`):**
   - *Action:* Add a visual badge to the Order list/details indicating whether the order was processed via Stripe or Freemius.
   - Ensure the "Mark as Paid" or "Refund" actions map to the correct provider's server actions.

# Instructions for the Agent
1. Start by searching for `STRIPE_SECRET_KEY`, `freemius`, and `payment_provider` in the `libs/ecommerce` directory to understand the current state.
2. Map out exactly which files need to be touched.
3. Present your findings and the generated SQL migration first. Do not proceed to modifying React components until I approve the database/schema approach.