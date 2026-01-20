# Milestone 3.6: E-commerce Store Integration (Shop, Cart, Checkout)

## 1. Store Pages & Navigation

- **Admin Navigation**: Added "Store" section (Products, Orders) to the CMS sidebar in `CmsClientLayout.tsx`.
- **Frontend Navigation**: Integrated `CartIcon` into the Header and ResponsiveNav.
- **Cart Drawer**: Added global `CartDrawer` in `layout.tsx` to manage cart state.

## 2. New CMS Blocks

We registered and implemented two new blocks to power the store pages:

- **Cart Block**: (`cart`) Renders the full-page shopping cart with item management.
- **Checkout Block**: (`checkout`) Renders the order review page with "Pay Now" functionality.

Registered in `blockRegistry.ts` and implemented in `apps/nextblock/components/blocks/renderers/`.

## 3. Database & Seeding

- **Consolidated Activation Script**: Created a robust `activate-store.ts` script that:
  - Creates Shop, Cart, and Checkout pages if missing.
  - Automatically fixes legacy `product-grid` block types (hyphen vs underscore mismatch).
  - Seeds the correct `cart` and `checkout` blocks.
- **Corrections**: Fixed schema mismatches in `product_grid` block naming.

## 4. Checkout API & Payment Flow Reliability

We extensively debugged and fixed the `/api/checkout` flow in `libs/ecommerce/src/lib/stripe/checkout.ts`:

- **RLS Bypass**: Switched to using `SUPABASE_SERVICE_ROLE_KEY` to correctly bypass Row-Level Security when creating orders on the backend.
- **Schema Fixes**:
  - Removed query for non-existent `products.image_url` column.
  - Removed insert for non-existent `orders.currency` column.
  - Mapped `total_amount` to `total` and `price` to `price_at_purchase` to match the actual DB schema.
- **Price Calculation**: Fixed a critical bug where prices were incorrectly multiplied by 100 twice, resolving the $2,499.00 vs $24.99 issue.
- **Linting**: Fixed TypeScript non-null assertion errors.

## Current State

- **Shop Page**: Functional, rendering Product Grid.
- **Cart Page**: Functional, shows items and subtotal.
- **Checkout Page**: Functional, successfully creates orders in Supabase and redirects to Stripe for payment.
- **Admin**: "Store" links are present (pages pending implementation).

# Milestone 3.7: Customer Identity, Profiles, and Database Integrity

## 1. Customer Identity & Auth

- **GitHub Auth**: Added "Continue with GitHub" to Sign In/Sign Up pages.
- **Optional Fields**: Updated database schema to make `full_name` and `avatar_url` optional to support various auth providers.
- **Profile Redirection**: Implemented logic to handle new user onboarding and profile creation.

## 2. Customer Profile

- **Profile Page**: Created `/profile` page with `CustomerProfileForm`.
- **Navigation**: Added "Edit Profile" link to the user dropdown menu.
- **Admin Edit**: Updated the Admin User Edit page to include new profile fields (GitHub username, billing address, phone).

## 3. Critical Database Fixes

- **Role Display**: Fixed `getUsersData` in CMS to use `supabaseAdmin` (Service Role), resolving the issue where user roles appeared as "N/A" due to RLS.
- **Permission Denied (42501)**: Created explicit RLS policies (`profiles_service_role_policy`) and granted full privileges to `service_role` to ensure the Admin dashboard has full access.
- **User Deletion**: Fixed "Database error deleting user" by changing the `orders` table foreign key to `ON DELETE SET NULL`. This allows deleting users without breaking order history.
- **Migration Sync**: Resolved "Remote migration versions not found" by ensuring all local migrations are pushed and compatible.
- **Tooling**: Added `npm run db:reset` script for easier local development.
- **Profile Backfill & Robust Trigger**: Consolidated a fix into `setup_profiles.sql` to auto-create profiles for existing users and properly assign the ADMIN role to the first user.
- **Service Role Policies**: Added global service role policies in `setup_rls_policies.sql` to prevent permission errors across all tables.
- **Admin Visibility**: Updated CMS Users page to show the current admin in the list.

## 4. Codebase Cleanup

- **Username Removal**: Removed deprecated `username` field from codebase (Forms, Actions, Types) to rely on `email` or `full_name`.
- **Translation Fixes**: Fixed SQL syntax errors in translation migrations.

## 5. UI/UX Refinement & Admin Consolidation

- **Admin Self-Editing**: Enabled admins to edit their own profile and role within the CMS user list.
- **Form Consolidation**: Refactored `UserForm` to wrap the premium `CustomerProfileForm`, ensuring consistent UI/UX (2-column layout, Media Picker) across both Customer and Admin views.
- **Admin Capabilities**: Extended `CustomerProfileForm` to conditionally render "Admin Settings" (Role selection) and handle custom admin actions while preserving a unified codebase.
- **Enhanced Feedback**: Implemented success message handling by passing URL query parameters to the form state, giving users immediate feedback after server-side redirects.
- **Robustness**: Fixed multiple edge cases including `NEXT_REDIRECT` error handling, avatar `src` issues, and role selector defaults.

## 6. CMS Navigation & Profile UI Optimization

- **Profile Icon**:
  - Replaced generic initial with a circular `Avatar` component.
  - Added `avatar_url` support for user images.
  - Implemented a primary color border on hover for better interactivity.
- **Navigation Layout**:
  - Repositioned the **Shopping Bag** icon to the far right for a standard e-commerce feel.
  - Removed the redundant "CMS Dashboard" link from the main navigation.
  - Added a **Pencil Icon** to the "Edit Page" / "Edit Post" links to improve visibility and UX.
- **Sign Out Flow**:
  - Converted sign-out logic to client-side (`supabase.auth.signOut()`) to ensure immediate UI updates without page refreshes.

# Milestone 3.8: Sandbox Content Restoration & Security

## 1. Secure Sandbox Reset

- **Premium Gating**: Modified `reset_sandbox` function to accept a `p_include_premium` parameter (default: `FALSE`).
- **Conditional Seeding**: Wrapped all e-commerce data (Shop/Cart/Checkout pages, Products, Orders) in conditional logic, ensuring the open-source version stays clean while premium environments get the full suite.
- **Auto-Seed**: Configured local development (`npm run db:push`) to automatically seed both Standard and Premium content.

## 2. Content Restoration

- **Rich Content**: Restored the original, detailed block layouts for Home and Blog pages (replacing temporary placeholders).
  - **Home**: Banner, Features, Testimonials, CTA.
  - **Blog**: Hero, "Deep Dives" Grid.
- **Runtime Fixes**: Patched `HeroBlockRenderer` to safely handle missing styling properties, preventing crashes on older data.

## 3. Navigation & UX

- **Navigation Order**: Fixed menu order to **Home -> Articles -> Shop** for a logical user flow.
- **Consistency**: Verified `reset_sandbox` correctly recreates the navigation hierarchy on every reset.

# Milestone 3.9: Final Polish & UX Improvements

## 1. Store Experience

- **Cart Drawer**: Added a "View Cart" button to the cart drawer, allowing users to access the full `/cart` page before proceeding to checkout. This improves the user flow for reviewing and managing cart items.
