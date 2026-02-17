The Architecture Plan
Database Layer:

site_settings: Needs a generic payment_provider column ('stripe' | 'lemon_squeezy'). Please update the schema to include this column, do not create a new migrations file. I like to keep my migrations folder clean. I can reset the db and push myself.

products: Need to store ID for LS system lemonsqueezy_variant_id. Stripe: Continue using the numeric price column (Inline Pricing) -> No migration needed for Stripe products. Please update the products schema to include this column, do not create a new migrations file. I like to keep my migrations folder clean. I can reset the db and push myself.

Logic Layer (libs/ecommerce):

We will refactor the existing code into a PaymentProvider interface.

We will create two implementations: StripeProvider and LemonSqueezyProvider.

UI Layer:

Settings Page: A radio selection for the provider. It will check server-side if the required .env variables exist for the selected provider and show a warning if they are missing.

Product Form: Will now show input Lemon Squeezy Variant ID (or conditionally show it based on the active provider).

Phase 1: Analysis, Cleanup & Schema
Goal: Remove the GitHub code and prepare the database for Lemon Squeezy IDs and the global Provider setting.

Prompt 1 (Copy/Paste):

Markdown
We are refactoring the E-commerce module to support multiple payment providers (Stripe and Lemon Squeezy).
The user can choose which provider to use.

1.  **Analyze & Clean:**
    - Scan `apps/nextblock/app/api/checkout/route.ts` and `apps/nextblock/app/api/webhooks/stripe/route.ts`.
    - **Action:** Completely remove any logic related to "GitHub Organization Invites" or `github` metadata. This business model is deprecated.
    - **Verify:** Confirm that the current Stripe implementation uses "Inline Pricing" (constructing `price_data` from the database `price` column) rather than a `stripe_price_id`.

2.  **Database Migration (Supabase):**
    - Update migrations in `libs/db/src/supabase/migrations`.
    - **Update `site_settings`:** Add `payment_provider` column (Text, default 'stripe', Check: 'stripe' OR 'lemon_squeezy').
    - **Update `products`:** Add `lemonsqueezy_variant_id` column (Text, Nullable).
    - _Note:_ Do NOT remove the existing `price` or `sale_price` columns; we need them for the UI and for Stripe's inline pricing.
    - _Note:_ Please update the migration files to reflect these changes. Do not create a new migration file. I like to keep my migrations folder clean. I can reset the db and push myself.

3.  **Update Types:** \* Regenerate the Supabase types to reflect these changes.
    Phase 2: The Payment Adapter Pattern
    Goal: Create a "Driver" system so the checkout code doesn't care which provider is active.

Prompt 2 (Copy/Paste):

Markdown
We need to abstract the payment logic so we can switch between Stripe and Lemon Squeezy dynamically.

1.  **Define Interface (`libs/ecommerce/src/lib/types.ts`):**
    - `export interface PaymentProvider {`
    - `createCheckoutSession(items: CartItem[], customerEmail?: string): Promise<{ url: string }>;`
    - `getProviderName(): string;`
    - `}`

2.  **Implement Stripe Provider (`libs/ecommerce/src/lib/providers/stripe.ts`):**
    - Move the existing checkout logic here.
    - **Logic:** Iterate through `items`. Use `price_data` (inline pricing) mapping the item's `price` and `name` to Stripe's line item format.
    - **Env Check:** Ensure it uses `process.env.STRIPE_SECRET_KEY`.

3.  **Implement Lemon Squeezy Provider (`libs/ecommerce/src/lib/providers/lemon-squeezy.ts`):**
    - Install `@lemonsqueezy/lemonsqueezy.js` if missing.
    - **Logic:**
      - Iterate through `items`.
      - **CRITICAL:** Check if the item has a `lemonsqueezy_variant_id`.
      - If a Variant ID is missing for any item in the cart, throw a specific error: "Product [Name] is not configured for Lemon Squeezy checkout."
      - Use `createCheckout` from the SDK with the variant IDs.
      - Pass `checkout_data: { custom: { user_id: ... } }` to track ownership.

4.  **Provider Factory (`libs/ecommerce/src/lib/factory.ts`):** \* Export `getPaymentProvider(provider: 'stripe' | 'lemon_squeezy'): PaymentProvider`.
    Phase 3: Store Settings & Env Var Warning (The UX Logic)
    Goal: The user selects a provider. If they select one without keys in .env, we warn them immediately.

Prompt 3 (Copy/Paste):

We need a "Store Settings" page in the CMS Admin that manages the payment provider and checks server-side configuration.

1.  **Server Action (`apps/nextblock/app/cms/settings/payments/actions.ts`):**
    - Create `getStoreConfigStatus`.
    - **Logic:** Check `process.env` on the server.
    - Return:
      ```json
      {
        stripe: { hasKeys: boolean, missing: string[] }, // Checks STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, STRIPE_WEBHOOK_SECRET
        lemonSqueezy: { hasKeys: boolean, missing: string[] } // Checks LEMONSQUEEZY_API_KEY, LEMONSQUEEZY_STORE_ID, LEMONSQUEEZY_WEBHOOK_SECRET
      }
      ```

2.  **Settings Page (`apps/nextblock/app/cms/settings/payments/page.tsx`):**
    - Fetch current `site_settings.payment_provider` from DB.
    - Fetch config status using the server action above.
    - **UI:**
      - Radio Group: "Stripe" vs "Lemon Squeezy".
      - **Warning Banner:** If user selects "Lemon Squeezy" but `!lemonSqueezy.hasKeys`, show a Yellow/Red Alert: "Missing Environment Variables: [List]. Please add them to your .env file."
      - Submit Button: "Save Changes" (Updates `site_settings` table).

3.  **Product Form Update (`apps/nextblock/app/cms/products/components/ProductForm.tsx`):**
    - Add a text input for `Lemon Squeezy Variant ID`.
    - **UX Hint:** Add a helper text: "Required if using Lemon Squeezy. Found in your LS Dashboard."

Phase 4: Unifying the Checkout Endpoint
Goal: Make the frontend "Buy" button work for both, automatically using the correct logic.

Prompt 4 (Copy/Paste):

Markdown
Now we wire the backend checkout route to use our new Factory.

1.  **Refactor Route (`apps/nextblock/app/api/checkout/route.ts`):**
    - Get `payment_provider` from `site_settings`.
    - Get the correct adapter: `const provider = getPaymentProvider(settings.payment_provider)`.
    - Call `provider.createCheckoutSession(cartItems)`.
    - Return `{ url }`.

2.  **Error Handling:**
    - Wrap the execution in a `try/catch`.
    - If the error is "Product not configured for Lemon Squeezy" (from Phase 2), return a 400 status with that specific message so the frontend can show a toast notification to the user.

3.  **Frontend Update (Optional but recommended):**
    _ Check `apps/nextblock/components/cart-drawer.tsx` (or wherever the checkout button is).
    _ Ensure it handles the 400 error cleanly (e.g., toast.error(message)).
    Phase 5: The Webhooks (Dual Handlers)
    Goal: Handle the "Success" event from both providers to record the order.

Prompt 5 (Copy/Paste):

Markdown
We need to ensure orders are recorded regardless of the provider.

1.  **Stripe Webhook (`apps/nextblock/app/api/webhooks/stripe/route.ts`):**
    - Ensure this inserts into the `orders` table.
    - Set `provider` column to 'stripe' (add this column to `orders` if missing).

2.  **Lemon Squeezy Webhook (`apps/nextblock/app/api/webhooks/lemon-squeezy/route.ts`):**
    - Create this route.
    - Verify signature.
    - Handle `order_created`.
    - **Logic:**
      - Normalize the payload (extract email, amount, status).
      - Insert into the SAME `orders` table.
      - Set `provider` to 'lemon_squeezy'.

3.  **Migration Check:**
    - If the `orders` table doesn't have a `provider` column, update the migration to add it now.

    _Note:_ Maybe we would like the order number or confirmation code from the provider? Please update the migration files to reflect these changes. Do not create a new migration file. I like to keep my migrations folder clean. I can reset the db and push myself.
