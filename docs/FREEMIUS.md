# Freemius E-commerce Migration & Multi-Product Integration

This document summarizes the steps taken to migrate the NextBlock CMS from Lemon Squeezy to Freemius for digital product checkouts, including the architectural changes made to support multiple distinct Freemius products on a single storefront.

## 1. Multi-Product Database Architecture

Initially, the codebase relied on a single `FREEMIUS_PRODUCT_ID` stored in `.env.local`. This limited the store to selling variants of only one Freemius App. We migrated this to a per-product database model:

- **Database Schema**: A new `freemius_product_id (text)` column was added to the Supabase `products` table migration (`20260115144026_setup_ecommerce.sql`).
- **TypeScript Types**: Updated the `Row`, `Insert`, and `Update` interfaces in `libs/db/src/lib/supabase/types.ts` to include the new column.
- **Zod Schema**: Updated `productSchema` in `libs/ecommerce/src/lib/product-schema.ts` to validate the new field.
- **Server Actions**: Modified `createProduct` and `updateProduct` in `product-actions.ts` to insert and update the `freemius_product_id` field in Supabase.

## 2. Admin CMS Updates

- Updated `ProductForm.tsx` (the NextBlock Admin product editor) to display a two-column grid. It now captures both the **Freemius Product ID** (App ID) and the **Freemius Plan ID** (Plan ID) for each unique product.

## 3. Checkout Provider (`FreemiusProvider`)

- Refactored `libs/ecommerce/src/lib/providers/freemius.ts` to query the `freemius_product_id` dynamically from the `products` table row instead of reading it from the environment.
- Corrected the `Invalid plan id` error by generating the URL as `https://checkout.freemius.com/app/{product_id}/plan/{plan_id}/` (previously, the Store ID was mistakenly used in place of the Product ID).

## 4. Customer Identity Capture

- Because Freemius checkouts occur off-site without a required storefront login, NextBlock orders were originally logging the customer as "Unknown".
- **Frontend Changes**: We added a required **Email Address** input to the `Checkout.tsx` payment summary page.
- **Backend Changes**: When the `FreemiusProvider` creates the initial `pending` order in the database, it immediately saves the captured email into the JSON `customer_details: { email }` column.

## 5. Order Fulfillment & Redirection (JS SDK Overlay)

Since the Freemius developer dashboard does not natively support an explicit `return_url` parameter using simple Hosted Links without a custom configuration, we transitioned to the **Freemius JS SDK (`checkout.min.js`)**.

- **The Provider**: The backend `FreemiusProvider` now securely returns your `.env.local`'s `FREEMIUS_PUBLIC_KEY` alongside the product configurations back to the API response payload.
- **The Overlay**: When "Pay Now" is clicked on NextBlock's UI, `Checkout.tsx` intercepts the response, initializes the `new FS.Checkout` handler, and opens the payment flow as an iframe overlay _on the current storefront page_.
- **The Redirect Hook**: Once the user completes the overlaid checkout, the local `success: function()` listener fires, forcefully rewriting the URL to `/checkout/success?session_id={order.id}`.
- **Server Action Fulfillment**: We created `actions.ts` inside `/checkout/success` containing `fulfillOrderAction(sessionId)`. This secure backend route flips the specific database order from `pending` to `paid`.
- **Cart Sync**: The `useEffect` hook on the frontend success page intercepts the returned parameter and instantly runs `clearCart()` to wipe the local storage shopping cart.

## 6. Webhooks (Background Sync)

To ensure orders are fulfilled even if a user closes their browser before the `return_url` triggers, we built the foundation for server-to-server webhook syncing:

- Created `apps/nextblock/app/api/webhooks/freemius/route.ts`.
- Implemented **HMAC SHA-256 Signature Verification** using the `FREEMIUS_SECRET_KEY` to authenticate incoming `purchase.created` payloads natively in the Next.js API route.

## 7. Sandbox Testing and Future npm SDK Migration

During the integration, we successfully built the backend MD5 hashing algorithm in `freemius.ts` to securely generate Sandbox Tokens structured as `{ ctx: timestamp, token: hash }` according to the official PHP implementation spec. Mathematical verification via standalone Node.js and PHP scripts confirmed our hash generation is 100% accurate byte-for-byte.

However, when passing these flawless sandbox credentials to the legacy frontend CDN script (`checkout.min.js`), the `FS.Checkout` global initialization stubbornly rejected it with a console error: `Failed to create cart`. As a result, the cart silently fell back to live mode. Because the Freemius dashboard did not expose native sandbox configuration for this specific product ID either, we could not force the legacy script to comply.

**Required Future Action:** To build a robust, native React popup checkout experience that fully supports sandbox carts, we must migrate away from the `window.FS.Checkout` CDN injection entirely. The project must be refactored to install and utilize the official modern NPM package: `@freemius/checkout`.
