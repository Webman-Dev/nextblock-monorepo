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
- **Optional- **Profiles\*\*: Extended user data (`full_name`, `avatar_url`, `billing_address`, `github_username`). Linked to Auth users via `id`.ers.
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

# Milestone 4.0: Product Gallery & CMS Refinement

## 1. Product Form Overhaul (`ProductForm.tsx`)

- **Premium Layout**:
  - Reorganized form into a structured 2-column grid layout (Product Info | Status & Pricing).
  - Implemented shadcn/ui "Card" containers for logical grouping.
  - moved "Save Changes" to the bottom footer for better visual balance.
- **Action Header**:
  - Added a dedicated header with "View Product" (opens live page) and "Delete Product" buttons.
  - Added "Edit Product" badge/subtitle for clearer context.

## 2. Advanced Gallery Management

- **New Component**: Created `ProductMediaManager` with:
  - **Drag-and-Drop Reordering**: Native HTML5 DnD for intuitive image sorting.
  - **Grid Layout**: Responsive thumbnail grid (optimized to `grid-cols-6` for density).
  - **Main Image Indicator**: Visual tag for the first image in the list.
- **Server Integration**:
  - Updated `product-actions.ts` to handle complex relation updates (delete + re-insert with `sort_order`).
  - Implemented `MediaPickerDialog` to reuse the global media library.

## 3. Critical Fixes

- **Image Loading**: Fixed PDP 404 errors by updating `apps/nextblock/app/product/[slug]/page.tsx` to correctly resolve `R2_BASE_URL` vs Supabase Storage URLs.
- **Type Safety**: Resolved strict null checks in `EditProductPage` props.
- **UX Polish**: removed duplicate `<h1>` headers from parent wrappers to clean up the UI.

# Milestone 4.1: Sandbox & Frontend Reliability

## 1. Sandbox Image Resolution

- **Issue**: `NBcover.webp` was appearing blurred/low-res in the sandbox environment (520px vs 1024px).
- **Fix**:
  - Updated `20260120120000_update_sandbox_reset.sql` to seed the correct dimensions (1024x572) and size in bytes.
  - Updated `activate-store.ts` to ensure the high-resolution source file is uploaded to the bucket.

## 2. Invisible Content Debugging (Articles Page)

- **Issue**: The "Articles" page hero subtitle and buttons were present in the database but invisible on the frontend.
- **Diagnosis**:
  - **Subtitle**: Used custom Tailwind classes (e.g., `tracking-[0.3em]`, `text-blue-400`) that existed in the DB but not in the codebase, preventing JIT generation.
  - **Buttons**: The `Button` component classes (from `@nextblock-cms/ui`) were not identifying correctly due to Windows path resolution issues in the Tailwind config.
  - **Renderer**: `ButtonBlockRenderer` was crashing silently because it tried to invoke client-side `buttonVariants` from a Server Component.
- **Fixes**:
  - **Force Styles**: Added all missing classes (both custom and Button component classes) to `apps/nextblock/app/force-styles.tsx` to force Generation.
  - **Client Boundary**: Refactored `ButtonBlockRenderer.tsx` to be a Client Component (`"use client"`) and direct `Link` wrapper, resolving the server-side execution error.

# Milestone 4.2: Storage Optimization & Media Cleanup

## 1. R2 Storage Optimization

- **Orphan Cleanup Logic**: Implemented automated media deletion to prevent storage bloat (`libs/ecommerce/src/lib/product-actions.ts`).
  - When media is removed from a product, the system checks if it is used by any other entity (products, posts, logos).
  - If unused (orphaned), it is deleted from both the database and R2 storage.
- **Variant Handling**: Updated `deleteMediaItem` to ensure **all** generated image variants (thumbnails, medium, large) are deleted along with the original file, preventing partial leftovers.
- **Transient Uploads**: Fixed a critical edge case where images uploaded and removed within the same session (before saving) were not being cleaned up. Implemented tracking in `ProductForm.tsx` to explicitly flag these for deletion on save.

## 2. Configuration & Organization

- **Dynamic Remote Patterns**: Updated `next.config.js` to rely on `NEXT_PUBLIC_R2_USER_URL` environment variables instead of hardcoded patterns, making the configuration environment-agnostic.
- **Product Folders**: Configured `ProductMediaManager` to upload new product images to the specific `/uploads/products/` directory by default, improving bucket organization.
