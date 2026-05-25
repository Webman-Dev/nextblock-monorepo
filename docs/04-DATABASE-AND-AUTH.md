# 04 Database and Auth

## Source of Truth

The database and auth implementation is spread across:

- `libs/db/src/lib/supabase/*`
- `libs/db/src/lib/package-validation.ts`
- `libs/db/src/supabase/config.toml`
- `libs/db/src/supabase/migrations/*`
- `apps/nextblock/app/auth/callback/route.ts`
- `apps/nextblock/app/cms/*`

When documentation and a migration disagree, the migration folder is the final
authority for schema, triggers, grants, and policies.

## Supabase Client Surfaces

`libs/db/src/server.ts` currently exports:

- `createClient()`: request-scoped server client using auth cookies
- `getProfileWithRoleServerSide()`
- `getActiveLanguagesServerSide()`
- `getServiceRoleSupabaseClient()`
- `getSsgSupabaseClient()`
- package activation helpers such as `verifyPackageOnline()`

Practical usage in the app is split by trust level:

- normal server routes and components use `createClient()`
- public static-ish reads often use `getSsgSupabaseClient()`
- admin or system workflows use `getServiceRoleSupabaseClient()`

## Auth Flow

### Session exchange

`app/auth/callback/route.ts` handles Supabase auth callback exchanges:

1. read the `code` query parameter
2. exchange it for a session with `supabase.auth.exchangeCodeForSession()`
3. load the user's profile and role
4. redirect through `resolvePostAuthRedirect()`

### Profile creation

The first-user and profile bootstrap logic lives in the database, not in React
code.

`00000000000005_setup_functions_and_triggers.sql` defines:

- `handle_new_user()`
- `on_auth_user_created` trigger on `auth.users`

That trigger:

- creates the first local admin automatically
- creates later users as `USER`
- inserts or updates `profiles`
- copies selected metadata such as `full_name`, avatar URL, and GitHub username

### CMS authorization

The CMS shell in `app/cms/CmsClientLayout.tsx` currently expects:

- an authenticated user
- a resolved profile role of `ADMIN` or `WRITER`

Writers and admins can enter the CMS. Admin-only navigation is used for
settings such as payments, shipping, users, and some branding/config surfaces.

### No live app middleware file

There is a generic Supabase middleware helper in `libs/db/src/lib/supabase`,
but there is no live `apps/nextblock/middleware.ts` file in the current app.
Document the callback, layout, and RLS model as the active auth path rather
than assuming middleware-based route protection is in use.

## Schema Overview

### Core platform tables

Defined primarily in `00000000000001_setup_cms_core.sql`:

- `site_settings`
- `profiles`
- `user_addresses`
- `languages`
- `media`
- `translations`
- `logos`

### Content tables

Defined primarily in `00000000000002_setup_content_tables.sql`:

- `posts`
- `pages`
- `blocks`
- `navigation_items`
- `page_revisions`
- `post_revisions`

### Commerce tables

Defined across `00000000000003` and `00000000000004`:

- `products`
- `product_media`
- `product_attributes`
- `product_attribute_terms`
- `product_variants`
- `inventory_items`
- `variant_attribute_mapping`
- `package_activations`
- `freemius_plans`
- `freemius_pricing`
- `orders`
- `order_items`
- `shipping_zones`
- `shipping_zone_locations`
- `shipping_zone_methods`
- `tax_rates`
- `currencies`

## Row Level Security Patterns

`00000000000006_setup_rls_and_grants.sql` is the consolidated RLS file.

The high-level access model is:

- public read access for languages, media, translations, published content, and
  several storefront commerce tables
- authenticated self-service access for user addresses and customer-owned
  orders
- `ADMIN` or `WRITER` write access for most CMS authoring tables
- `ADMIN`-only write access for higher-risk configuration surfaces
- `service_role` full access where background jobs or system syncs need it

Commerce-specific policy highlights include:

- public read access for products, product media, product attributes, variants,
  shipping zones, shipping methods, tax rates, and active currencies
- customer-scoped read access for `orders` and `order_items`
- service-role management access for orders, order items, inventory, taxes, and
  currencies

## Migration Structure

### Current reality

The current padded migration sequence in
`libs/db/src/supabase/migrations` runs from:

- `00000000000000`
- through `00000000000016`

It does **not** currently run through `...23+`.

These files are already squashed and grouped. Several of them preserve older
logical migration boundaries through embedded comment headers, so you will see
historical section numbers inside a smaller set of physical files.

### Production migration policy

NextBlock has live Supabase data. Treat migrations as append-only for any
production or shared database change.

- Do not edit, recycle, squash, reorder, or delete migration files that may
  already be recorded in a shared or production Supabase project.
- Add a new forward-only `.sql` file under
  `libs/db/src/supabase/migrations` for each new schema/data change.
- Keep migrations non-destructive by default. Avoid dropping or rewriting data
  that may include orders, users, payments, or customer records.
- Run `npm run db:migrate:check` before `npm run db:migrate`.
- If an existing database lists old baseline files such as
  `00000000000000_setup_foundation_and_enums.sql` as pending, do not replay
  them. Use `npm run db:migrate:repair-history:check`, then
  `npm run db:migrate:repair-history`, then rerun
  `npm run db:migrate:check`.
- Use `npm run db:migrate:fresh` only for a brand-new empty database.

### Category map

| Migration file | Domain | What it covers |
| :-- | :-- | :-- |
| `00000000000000_setup_foundation_and_enums.sql` | Core | Shared enums and schema-level foundation |
| `00000000000001_setup_cms_core.sql` | Core, CMS | settings, profiles, languages, media, translations, logos |
| `00000000000002_setup_content_tables.sql` | CMS | pages, posts, blocks, navigation, revisions |
| `00000000000003_setup_catalog_and_licensing.sql` | Commerce | catalog, variants, inventory cache tables, package activations, Freemius sync tables |
| `00000000000004_setup_fulfillment_shipping_taxes_and_currencies.sql` | Fulfillment, Commerce | orders, shipping, taxes, currencies, price-map sync functions |
| `00000000000005_setup_functions_and_triggers.sql` | Core, CMS, Fulfillment | auth/profile bootstrap, timestamps, invoice functions, inventory deduction, product upsert helpers |
| `00000000000006_setup_rls_and_grants.sql` | Security | grants, RLS enablement, policies |
| `00000000000007_setup_indexes.sql` | Core, CMS, Commerce | performance indexes across authoring and commerce tables |
| `00000000000008_seed_platform_defaults.sql` | Seeds | baseline site settings, default languages, default currencies |
| `00000000000009_seed_translations.sql` | Seeds | translation catalog |
| `00000000000010_seed_content_scaffold.sql` | Seeds, CMS | starter content, scaffold pages, seeded copy |
| `00000000000011_setup_cortex_ai_settings.sql` | AI, Settings | Cortex AI settings and provider defaults |
| `00000000000012_setup_commerce_coupons.sql` | Commerce | coupon tables and related commerce constraints |
| `00000000000013_setup_cortex_ai_db_mutation_audit.sql` | AI, Audit | Cortex AI database mutation audit support |
| `00000000000014_setup_content_drafts.sql` | CMS, Editor | visual-editing content draft tables |
| `00000000000015_setup_product_drafts.sql` | Commerce, Editor | product draft workflow support |
| `00000000000016_add_feature_image_to_pages.sql` | CMS | optional page feature image media relationship |

### How to read the folder

Read the migrations in lexical order from `00000000000000` upward.

That sequence is the cleanest under-the-hood blueprint for:

- which tables exist
- what triggers and functions are available
- what security rules are enforced
- what default content and configuration are seeded

If you need to understand whether the platform really supports something, check
the migration file first, then trace the corresponding route or library code.

## Important Site Settings in Active Use

These keys are actively referenced by the current codebase:

- `enabled_payment_providers`
- `ecommerce_inventory_settings`
- `invoice_settings`
- `footer_copyright`
- `is_admin_created`

There are many more seeded settings, but these are the most important ones for
understanding current runtime behavior.
