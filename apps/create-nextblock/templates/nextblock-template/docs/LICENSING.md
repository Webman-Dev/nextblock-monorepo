# NextBlock CMS: Monetization & Licensing Architecture

**Version:** 1.0
**Date:** February 18, 2026
**Status:** Implemented (Feb 18, 2026)

## 1. Executive Summary

We have pivoted the monetization strategy of NextBlock CMS from a "GitHub Organization Invite" model to a **"Self-Hosted Package Licensing"** model.

Instead of restricting access to the code repositories, we distribute the code openly ("Open Core") but gate specific features (Premium Packages like E-Commerce) behind a **License Key System**. We utilize **Lemon Squeezy** as our Merchant of Record (MoR) to handle global tax compliance and license key generation.

## 2. Core Business Logic

### 2.1 The "Package" Concept

We are moving away from the term "Modules" to **"Packages"**.

- **Core CMS:** Free, Open Source (AGPL).
- **Premium Packages:** Paid add-ons included in the codebase but locked by default.
- **E-Commerce Pro:** Full digital storefront capabilities.
- **AI Agents (Future):** Generative content and site building.

### 2.2 The "Dual-Layer" Payment Strategy

It is critical to distinguish between the two layers of payments in this architecture:

1. **Layer 1: Buying NextBlock (US selling to Developers)**

- **Provider:** Lemon Squeezy.
- **Mechanism:** Developer buys a license key ($25/mo) -> Receives Key -> Activates in CMS Admin.

2. **Layer 2: The Developer's Store (Developer selling to End-Users)**

- **Provider:** Agnostic (Stripe OR Lemon Squeezy).
- **Mechanism:** Developer configures _their_ API keys in Settings. The CMS uses an **Adapter Pattern** to handle checkout flows regardless of the chosen provider.

## 3. Licensing Architecture

### 3.1 The "Phone Home" Validation

Since NextBlock is self-hosted, the user's instance cannot directly access our private database. We use the **Lemon Squeezy API** as the central authority.

**The Flow:**

1. **Hardcoded Catalog:** The codebase contains a registry (`NEXTBLOCK_PACKAGES`) mapping internal IDs (e.g., `ecommerce`) to Lemon Squeezy Variant IDs.
2. **Activation:** User enters a key in the Admin UI.
3. **Verification:** The server calls `https://api.lemonsqueezy.com/v1/licenses/activate`.
4. **Binding:** If valid, the key is bound to the `instance_name` (domain).
5. **Storage:** The result is stored in the local `package_activations` database table.

### 3.2 Security Levels (The "Gatekeeper")

We use a "Defense in Depth" approach to prevent unauthorized usage without frustrating honest developers.

| Level  | Name             | Description                                                                                                                                                                         |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Level  | Name             | Description                                                                                                                                                                         |
| ------ | ---------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **L1** | **UI Hiding**    | Menus and buttons for premium features are hidden if the package is not active (`page.tsx`, `nav-links.tsx`).                                                                       |
| **L2** | **Server Gate**  | Critical functions (e.g., `createCheckoutSession`) call `verifyPackageOnline()` and throw if inactive. This is the primary enforcement mechanism.                                   |
| **L3** | **RLS Policies** | The `package_activations` table is write-locked to the Service Role only. Users cannot falsify activations via the client-side API.                                                 |

## 4. Technical Implementation

### 4.1 Database Schema (`libs/db`)

**`package_activations`**
Stores the local state of licenses.

```sql
CREATE TABLE package_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT NOT NULL,       -- e.g., 'ecommerce'
  license_key TEXT NOT NULL,
  instance_name TEXT NOT NULL,    -- e.g., 'my-shop.com'
  status TEXT NOT NULL,           -- 'active'
  meta JSONB,                     -- Full LS response
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_key, package_id) -- Prevent duplicate activations
);

-- RLS Policies
-- 1. Service Role: Full access (INSERT, UPDATE, DELETE) for server actions `activatePackage`.
-- 2. Authenticated Users: SELECT only, to allow the CMS UI to display status.

```

**`site_settings`**
Updated to support the provider choice.

````sql
### 4.2 Server Actions (`apps/nextblock/app/actions`)

We use **Next.js Server Actions** to handle the activation logic securely.

**`package-actions.ts`**
- **`activatePackage(key)`**:
    1.  Validates the key against Lemon Squeezy API (`/licenses/activate`).
    2.  Resolves the Lemon Squeezy Variant ID to an internal Package ID.
    3.  **Bypasses RLS** using the `SUPABASE_SERVICE_ROLE_KEY` to insert the record into `package_activations`.
- **`deactivatePackage(packageId)`**:
    1.  Calls Lemon Squeezy API to deactivate.
    2.  Removes the record from the local database (also via Service Role).

### 4.3 The Gatekeeper (`libs/db/src/lib/package-validation.ts`)

A `server-only` utility function that strictly checks the local database status.

```typescript
// libs/db/src/lib/package-validation.ts
import 'server-only';
export async function verifyPackageOnline(packageId: string): Promise<boolean> {
   // Checks package_activations table for 'active' status
}
````

### 4.4 The Package Registry (`libs/utils/src/lib/nextblock-packages.ts`)

````

### 4.2 The Adapter Pattern (`libs/ecommerce`)

To allow developers to choose between Stripe and Lemon Squeezy for _their_ store, we abstracted the checkout logic.

```typescript
// libs/ecommerce/src/lib/types.ts
export interface PaymentProvider {
  createCheckoutSession(items: CartItem[], userEmail?: string): Promise<{ url: string }>;
}

// libs/ecommerce/src/lib/factory.ts
export function getPaymentProvider(provider: 'stripe' | 'lemon_squeezy'): PaymentProvider {
  // Returns StripeProvider or LemonSqueezyProvider based on settings
}
````

### 4.3 The Package Registry (`libs/utils`)

We hardcode the package definitions to avoid requiring users to set `ENV` variables for products they haven't bought yet.

```typescript
// libs/utils/src/lib/nextblock-packages.ts
export const NEXTBLOCK_PACKAGES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'E-Commerce Pro',
    ls_variant_id: '1317020', // Hardcoded LS ID
    purchase_url: 'https://nextblock.ca/pricing',
  },
};
```

## 5. User Experience (UX)

### 5.1 Admin Settings

### 5.1 Admin Settings

- **Page:** `/cms/settings/packages` (`apps/nextblock/app/cms/settings/packages/page.tsx`)
- **Features:**
  - **Dynamic List:** Renders cards for all packages defined in `NEXTBLOCK_PACKAGES`.
  - **Status Indicators:** "Active" (Green) vs "Inactive" (Gray).
  - **Activation Form:** Simple input field to bind a license key to the current instance.
  - **Security:** The page fetches initial state via server-side Supabase client (Authenticated role), ensuring consistency with the database.

### 5.2 Store Settings

- **Page:** `/cms/settings/store`
- **Features:**
- Radio toggle: "Stripe" vs. "Lemon Squeezy".
- **Env Var Check:** Automatically detects if `STRIPE_SECRET_KEY` or `LEMONSQUEEZY_API_KEY` are missing in `.env` and shows a warning alert if the user tries to select an unconfigured provider.

## 6. Future Proofing

- **AI Agents:** When the AI module is ready, we simply add a new entry to `NEXTBLOCK_PACKAGES`. The licensing logic remains identical.
- **Marketplace:** The `package_activations` table is designed to eventually support 3rd party plugins if we open up the ecosystem.

---

**Glossary:**

- **MoR:** Merchant of Record (Lemon Squeezy).
- **Variant ID:** The specific ID of a product variation (e.g., "Monthly Plan") in Lemon Squeezy.
- **Instance Name:** The hostname of the self-hosted CMS, used to lock a license key to a specific domain.
