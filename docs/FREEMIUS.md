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

## 5. Order Fulfillment & Redirection (`@freemius/checkout`)

Since the Freemius developer dashboard does not natively support an explicit `return_url` parameter using simple Hosted Links without a custom configuration, we now use the official **`@freemius/checkout` npm package** inside the storefront.

- **The Provider**: The backend `FreemiusProvider` now resolves checkout credentials per Freemius product. For multi-product stores, product-scoped checkout keys should be provided through `FREEMIUS_CHECKOUT_PRODUCTS_JSON`.
- **The Overlay**: When "Pay Now" is clicked on NextBlock's UI, `Checkout.tsx` intercepts the response, initializes `new Checkout(...)` from `@freemius/checkout`, and opens the payment flow as an iframe overlay _on the current storefront page_.
- **The Redirect Hook**: Once the user completes the overlaid checkout, the local `success: function()` listener fires, forcefully rewriting the URL to `/checkout/success?session_id={order.id}`.
- **Server Action Fulfillment**: We created `actions.ts` inside `/checkout/success` containing `fulfillOrderAction(sessionId)`. This secure backend route flips the specific database order from `pending` to `paid`.
- **Cart Sync**: The `useEffect` hook on the frontend success page intercepts the returned parameter and instantly runs `clearCart()` to wipe the local storage shopping cart.

## 6. Webhooks (Background Sync)

To ensure orders are fulfilled even if a user closes their browser before the `return_url` triggers, we built the foundation for server-to-server webhook syncing:

- Created `apps/nextblock/app/api/webhooks/freemius/route.ts`.
- Implemented **HMAC SHA-256 Signature Verification** using the `FREEMIUS_SECRET_KEY` to authenticate incoming `purchase.created` payloads natively in the Next.js API route.

## 7. Sandbox Testing

Freemius sandbox checkout is now controlled separately from the global app demo sandbox.

- **`NEXT_PUBLIC_IS_SANDBOX=true`** remains the full-site demo mode. It disables real checkout and shows the local mock modal instead.
- **`FREEMIUS_SANDBOX_ENABLED=true`** enables the real Freemius checkout in sandbox/test mode while leaving the rest of the application in normal mode.
- The checkout provider generates Freemius sandbox tokens server-side using the official MD5 format:
  - `timestamp + product_id + secret_key + public_key + 'checkout'`
- When using the SDK-first sandbox path, `FREEMIUS_API_KEY` is also required by `@freemius/sdk` to generate sandbox params. The normal production iframe checkout flow still does not require that bearer/API key.
- Those sandbox parameters are passed into both:
  - the hosted checkout link as `sandbox` + `s_ctx_ts`
  - the `@freemius/checkout` handler as `sandbox: { ctx, token }`
- Per Freemius' official app-integration docs, sandbox checkout uses the same **product** public key and secret key used by the checkout itself. In NextBlock, developer credentials can still be used for sync/webhooks, but true sandbox checkout should use product-scoped keys for the current Freemius product.
- Quote Freemius keys in `.env` files. Their values often contain characters like `#`, `;`, `<`, `>`, or `=` that can be truncated or misparsed if left unquoted.

The Freemius dashboard's "Sandbox" hosted links are still useful for manual validation, but NextBlock can now switch sandbox behavior directly in code with `FREEMIUS_SANDBOX_ENABLED` once the active product's checkout credentials are configured.
