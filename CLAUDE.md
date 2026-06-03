# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

NextBlock is an Nx monorepo for an AI-native, open-core CMS: a single Next.js 16
app backed by Supabase, plus shared libraries and a scaffolding CLI. The numbered
files in `docs/` are the maintained, code-accurate reference set — read the
subsystem file that matches your task, and treat `apps/nextblock`, `libs/*`, and
`libs/db/src/supabase/migrations` as the final authority if a doc disagrees.

## Commands

```bash
# Dev / build / lint
npx nx serve nextblock              # run the CMS + public site (one app covers both)
npx nx build nextblock              # production build of the app
npm run lib-builds                  # build the publishable libs (ui, utils, db, editor, sdk)
npm run lint                        # lint the whole workspace
npm run nx:lint:nextblock           # lint just the app (npx nx lint <project> --skip-nx-cache)

# Tests (Vitest; there is no root "test" npm script)
npx vitest run                      # run all tests once
npx vitest run apps/nextblock/lib/visual-editing/draft-route.test.ts   # a single test file
npx vitest                          # watch mode
npx nx test <project>               # nx-wrapped test target

# Database (see "Migration safety" below before touching a shared DB)
npm run db:migrate:check            # preview pending migrations (run this FIRST)
npm run db:migrate                  # apply pending forward-only migrations (== db:push)
npm run db:types                    # regenerate Supabase TypeScript types
npm run db:reset                    # reset LOCAL/disposable DB only
npm run db:push:sandbox             # full sandbox bootstrap (disposable DBs only)

# Sandbox + first-time setup
npm run setup                       # interactive .env.local + Supabase link wizard
npm run generate:sandbox            # regenerate the checked-in sandbox reset SQL payload
npm run sandbox:reset               # hit the local reset-sandbox cron route

# CLI / template
npm run sync:create-nextblock       # regenerate the create-nextblock template from the source app
npm run test-create                 # run the create-nextblock CLI locally

# Focused verification scripts (preferred over broad suites for these subsystems)
npm run verify:cortex-ai-routing            # also: verify:cortex-ai-generate-blocks, verify:cortex-ai-global-tools, verify:cortex-ai-build-widget
npm run verify:editor-block-schema
```

Single tests run through Vitest directly (`npx vitest run <file>`), not Nx.
`npm run stripe` forwards Stripe events to the local webhook route.

## Architecture

One Next.js app, many route groups. `apps/nextblock` is the canonical runtime —
the public site, the authenticated CMS (`app/cms/*`), checkout/webhook/cron API
routes (`app/api/*`), and auth callback all share the same app and database. CMS
routes are guarded in `app/cms/CmsClientLayout.tsx` and expect a profile role of
`ADMIN` or `WRITER`. There is no `middleware.ts`; auth is the callback + layout +
RLS, not middleware.

Workspace shape:

- `apps/nextblock` — the source-of-truth application.
- `apps/create-nextblock` — CLI that generates a standalone project from a
  **copied** template (`templates/nextblock-template`).
- `libs/db` — Supabase clients, `verifyPackageOnline()` activation checks,
  generated types, and the migration tree.
- `libs/editor` — reusable Tiptap editor (`NotionEditor`, `editorExtensions`, …).
- `libs/ecommerce` — premium commerce package (tagged `scope:premium`).
- `libs/sdk` — small typed block-authoring contract.
- `libs/ui`, `libs/utils` — shared primitives, helpers, and Zod schemas.

Cross-package imports use `@nextblock-cms/*` aliases (resolved by
`tsconfig.base.json`; Vitest has its own alias map in `vitest.config.ts`).

Subsystems that span many files (each has a doc):

- **Block system** — two parallel models. Code-defined built-ins live in
  `apps/nextblock/lib/blocks/blockRegistry.ts` (+ `blockTypes.ts`,
  `availableBlockTypes`). Data-defined **custom blocks** are rows in
  `custom_block_definitions` rendered by `DynamicLayoutEngine`; a block
  instance's `block_type` equals a custom definition's `slug`. (`docs/03`,
  `docs/07`, `docs/10`)
- **Cortex AI** — premium AI package (`docs/08`). Inline editor assistance +
  a global agent with typed tools + a custom-block "build widget" route.
- **Live Draft Mode** — visual in-page editing into `content_drafts` /
  `product_drafts` (`docs/09`).
- **Commerce** — Stripe (physical) / Freemius (digital) checkout, multi-currency,
  shipping, tax (`docs/02`).
- **Package activation** — premium features gate on `package_activations` via
  `verifyPackageOnline()`; if a gate and a route disagree, the route wins.

## Repo-specific rules (non-obvious)

- **The template is generated. Do not hand-edit it.** Only edit `apps/nextblock`,
  `libs/*`, and root `docs/`. `apps/create-nextblock/templates/nextblock-template/**`
  (including its `docs/` copy) is produced by `npm run sync:create-nextblock`,
  which copies the source app and root docs and rewrites imports. Make the change
  at the source, then run the sync to propagate.

- **Migrations are append-only in production.** NextBlock runs against live
  Supabase data. Add a new forward-only `.sql` file under
  `libs/db/src/supabase/migrations` for each schema/data change; never edit,
  reorder, squash, or delete applied files. Run `npm run db:migrate:check` before
  `npm run db:migrate`. Never run `db:reset`, `sandbox:reset`, `db:push:sandbox`,
  or `db:migrate:fresh` against a shared/production database. The migration folder
  (currently `00000000000000`–`00000000000024`) is the schema source of truth.
  Read `AGENTS.md` and `docs/04`/`docs/05` before touching migrations.

- **After schema/seed changes**, regenerate types and the sandbox payload:
  `npm run db:types`, then `npm run generate:sandbox` (writes
  `apps/nextblock/app/api/cron/reset-sandbox/sandboxResetSql.ts`).

- **Cortex AI package id is `cortex-ai`, never `ai`.** AI config/client modules
  are server-only and throw if imported into client code; keep keys server-side.

- **Ecommerce alias mismatch is intentional.** The import path is
  `@nextblock-cms/ecommerce`, but `libs/ecommerce/package.json` is still named
  `@nextblock-cms/ecom` (CLI activation installs the alias). Don't "fix" it. A
  standalone `nx build ecommerce` is known not to be green — validate commerce
  changes at the app level.

- **Pick the right Supabase client by trust level** (`libs/db/src/server.ts`):
  `createClient()` for request-scoped/cookie auth, `getSsgSupabaseClient()` for
  public static-ish reads, `getServiceRoleSupabaseClient()` for admin/system work.

- **Custom block slug is a public contract.** Renaming a definition's `slug`
  orphans every page/post block that references the old slug (they render
  "Unsupported block type" until re-pointed).
