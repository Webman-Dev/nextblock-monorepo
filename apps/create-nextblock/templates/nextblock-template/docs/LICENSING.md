# NextBlock™ CMS: Monetization & Licensing Architecture

**Version:** 2.0
**Date:** March 19, 2026
**Status:** Implemented

## 1. Executive Summary

NextBlock™ CMS uses an **Open Core** model. The core CMS is free and open source (AGPL). Premium features (e.g., E-Commerce) are distributed in the codebase but gated behind a **Freemius License Key**. Freemius acts as the Merchant of Record (MoR), handling global tax compliance, license key generation, and subscription management.

## 2. Core Business Logic

### 2.1 The "Package" Concept

- **Core CMS:** Free, Open Source (AGPL).
- **Premium Packages:** Paid add-ons included in the codebase but locked by default.
  - **NextBlock™ Commerce Pro:** Full digital storefront with Stripe & Freemius payments.
  - **AI Agents (Future):** Generative content and site building.

### 2.2 The "Dual-Layer" Payment Strategy

| Layer | Description | Provider |
|---|---|---|
| **Layer 1** | Developer buys a NextBlock™ license key | **Freemius** (MoR) |
| **Layer 2** | Developer's store sells to end-users | **Stripe** or **Freemius** (configurable) |

Layer 1 keys are purchased at [nextblock.ca](https://nextblock.ca) and activated in the CMS Admin. Layer 2 is handled by the developer's own configured payment provider.

## 3. Licensing Architecture

### 3.1 The "Phone Home" Validation

Since NextBlock™ is self-hosted, the user's instance validates licenses against the **Freemius API** as the central authority.

**Activation Flow:**

1. **Hardcoded Catalog:** The codebase contains `NEXTBLOCK_PACKAGES` mapping internal IDs to Freemius Product & Plan IDs.
2. **Activation:** User enters a license key in `/cms/settings/packages`.
3. **Verification:** The server calls `POST https://api.freemius.com/v1/products/{product_id}/licenses/activate.json`.
4. **Storage:** On success, the install credentials are stored in the local `package_activations` database table.
5. **Gate Check:** All premium server functions call `verifyPackageOnline()` which checks the local `package_activations` table.

### 3.2 Sandbox vs. Production

The `NEXT_PUBLIC_IS_SANDBOX` environment variable controls the environment mode:

| `NEXT_PUBLIC_IS_SANDBOX` | Behavior |
|---|---|
| `true` | Sandbox/demo instance. License activation and deactivation are **disabled**. The "Buy License" button and checkout show a mock modal linking to nextblock.ca. |
| unset / `false` | Production instance. Full Freemius activation via production API. |

> **Important:** For Layer 1 package licensing, Freemius keys remain indistinguishable at the API level and the demo guard is enforced by `NEXT_PUBLIC_IS_SANDBOX`. For Layer 2 store checkout testing, Freemius sandbox checkout can be enabled independently with `FREEMIUS_SANDBOX_ENABLED=true`, using the same product public/secret keys to generate sandbox checkout tokens. Quote Freemius keys in `.env` files because those secrets often contain characters like `#` or `;` that can be misparsed if left unquoted.

### 3.3 Security Levels (The "Gatekeeper")

| Level | Name | Description |
|---|---|---|
| **L1** | **UI Hiding** | Menus and buttons for premium features are hidden if the package is not active. |
| **L2** | **Server Gate** | Critical functions (e.g., `createCheckoutSession`) call `verifyPackageOnline()` and throw if inactive. This is the primary enforcement mechanism. |
| **L3** | **RLS Policies** | The `package_activations` table is write-locked to the Service Role only. Users cannot falsify activations via the client-side API. |
| **L4** | **Sandbox Guard** | `activatePackage` and `deactivatePackage` return immediately with an error when `NEXT_PUBLIC_IS_SANDBOX=true`. |

## 4. Technical Implementation

### 4.1 Database Schema (`libs/db`)

**`package_activations`** — Stores the local state of licenses.

```sql
CREATE TABLE package_activations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id TEXT NOT NULL,       -- e.g., 'ecommerce'
  license_key TEXT NOT NULL,
  instance_name TEXT NOT NULL,    -- e.g., 'my-shop.com'
  status TEXT NOT NULL,           -- 'active'
  meta JSONB,                     -- Full Freemius activation response
  last_validated_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(license_key, package_id)
);

-- RLS Policies
-- 1. Service Role: Full access (INSERT, UPDATE, DELETE) for server actions.
-- 2. Authenticated Users: SELECT only, for CMS UI display.
```

### 4.2 Server Actions (`apps/nextblock/app/actions/package-actions.ts`)

- **`activatePackage(key)`**:
  1. Returns an error immediately if `NEXT_PUBLIC_IS_SANDBOX === 'true'`.
  2. Calls `POST https://api.freemius.com/v1/products/{fm_product_id}/licenses/activate.json`.
  3. Resolves the Freemius `plugin_id` from the response to an internal Package ID via `getPackageByFreemiusId()`.
  4. Inserts the activation record into `package_activations` via the Supabase Service Role.

- **`deactivatePackage(packageId)`**:
  1. Returns an error immediately if `NEXT_PUBLIC_IS_SANDBOX === 'true'`.
  2. Calls Freemius API to deactivate the install.
  3. Removes the record from the local database.

### 4.3 The Gatekeeper (`libs/db/src/lib/package-validation.ts`)

A `server-only` utility that checks the local database for active package status.

```typescript
import 'server-only';
export async function verifyPackageOnline(packageId: string): Promise<boolean> {
  // Checks package_activations table for 'active' status
}
```

### 4.4 The Package Registry (`libs/utils/src/lib/nextblock-packages.ts`)

Package definitions are hardcoded to avoid requiring ENV variables for products the developer hasn't purchased.

```typescript
export const NEXTBLOCK_PACKAGES = {
  ecommerce: {
    id: 'ecommerce',
    name: 'NextBlock™ Commerce Pro',
    description: 'Full-featured digital store with Stripe & Freemius.',
    fm_product_id: '24851',   // Freemius Product ID
    fm_plan_id: '41208',      // Freemius Plan ID ($25/mo or $250/yr)
    purchase_url: 'https://nextblock.ca',
  },
};
```

### 4.5 The Adapter Pattern (`libs/ecommerce`)

Developers can choose between Stripe and Freemius for their own store (Layer 2). The checkout logic is abstracted via a factory pattern.

```typescript
// libs/ecommerce/src/lib/factory.ts
export function getPaymentProvider(provider: 'stripe' | 'freemius'): PaymentProvider {
  // Returns StripeProvider or FreemiusProvider based on settings
}
```

## 5. User Experience (UX)

### 5.1 Admin — Package Settings (`/cms/settings/packages`)

- **Package Cards:** Status indicators (Active / Inactive) for each package.
  - **Inactive + Production:** "Buy License" button → `nextblock.ca`.
  - **Inactive + Sandbox:** "Buy License (Sandbox Demo)" button → mock checkout modal.
  - **Active:** License key (masked), "Deactivate License" button (disabled in sandbox).
- **Activation Form:** License key input to activate a purchased key.
  - Hidden and replaced with a sandbox notice when `NEXT_PUBLIC_IS_SANDBOX=true`.

### 5.2 Store Checkout (`/checkout`)

- **Production:** Opens the real Freemius or Stripe checkout flow.
- **Sandbox Demo (`NEXT_PUBLIC_IS_SANDBOX=true`)**: Clicking "Pay Now" shows a mock success modal and clears the cart. The real payment API is never called.
- **Freemius Checkout Sandbox (`FREEMIUS_SANDBOX_ENABLED=true`)**: The real Freemius checkout still opens, but in Freemius sandbox/test mode. Stripe and the rest of the app remain unaffected. `FREEMIUS_API_KEY` is only required for the SDK-first sandbox generation path, not for the normal production iframe checkout flow.

## 6. Future Proofing

- **New Packages:** Add a new entry to `NEXTBLOCK_PACKAGES` with the corresponding `fm_product_id` and `fm_plan_id`. The licensing gate logic requires no changes.
- **Marketplace:** The `package_activations` table is designed to eventually support 3rd-party plugins.

---

**Glossary:**

- **MoR:** Merchant of Record (Freemius).
- **Freemius Product ID (`fm_product_id`):** The numeric ID of the product on Freemius (e.g., `24851`).
- **Freemius Plan ID (`fm_plan_id`):** The specific pricing plan ID on Freemius (e.g., `41208`).
- **Instance Name:** The hostname of the self-hosted CMS, used to bind a license key to a specific domain.
- **Sandbox Mode:** In NextBlock™ this now has two meanings: the app-wide demo sandbox (`NEXT_PUBLIC_IS_SANDBOX=true`) and the Freemius-only checkout sandbox (`FREEMIUS_SANDBOX_ENABLED=true`).
