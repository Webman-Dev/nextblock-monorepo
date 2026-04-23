# 05 Developer Guide

## Local Setup

The root developer workflow is defined by the workspace `package.json` and the
setup helper in `tools/scripts/setup.mjs`.

Recommended flow:

```bash
npm install
npm run setup
npx nx serve nextblock
```

What that does:

- installs workspace dependencies
- creates `.env.local` from `.env.exemple` if needed
- prompts for Supabase project credentials
- optionally captures R2 and SMTP values
- links the local Supabase CLI workdir to your project
- optionally pushes the schema and config to the linked database

If you skip `npm run setup`, the misspelled root sample file
`.env.exemple` is the current reference template for manual environment setup.

## Common Commands

### App and library workflows

- `npx nx serve nextblock`: start the main app in development
- `npm run lint`: run Nx lint targets across the workspace
- `npm run nx:lint:nextblock`: lint the main app only
- `npm run nx:lint:create-nextblock`: lint the CLI app only
- `npm run all-builds`: build workspace projects except the template output

### Database workflows

- `npm run db:link`: link the Supabase CLI to the target project
- `npm run db:push`: push migrations, config, and seed sandbox images
- `npm run db:reset`: reset the local/linked Supabase database from the db
  workdir
- `npm run db:types`: regenerate typed Supabase definitions
- `npm run db:backup`
- `npm run db:restore`
- `npm run deploy:supabase`

### Sandbox and automation workflows

- `npm run generate:sandbox`: regenerate the checked-in sandbox reset payload
- `npm run sandbox:reset`: call the app's sandbox reset cron route locally
- `npm run stripe`: forward Stripe events to the local webhook route

## Environment Expectations

The exact set of env vars depends on which surfaces you use, but the current
repo expects at least:

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `POSTGRES_URL` or `DATABASE_URL` for SQL fallback paths and db tooling
- `NEXT_PUBLIC_URL`
- `CRON_SECRET` for cron routes

Optional but commonly needed:

- R2 credentials for media storage
- SMTP credentials for hosted auth email configuration
- Stripe keys for physical-product checkout
- Freemius keys for digital-product checkout and product sync

## Running the Main App

The canonical application is `apps/nextblock`.

Useful targets:

- `nx serve nextblock`
- `nx build nextblock`
- `nx lint nextblock`

The CMS and public site share the same Next.js app, so one dev server covers:

- public pages and posts
- CMS routes
- checkout routes
- webhook routes
- cron routes

## Database and Migration Workflow

The migration source of truth is:

`libs/db/src/supabase/migrations`

Normal contributor workflow:

1. update code and migrations together
2. push or reset the linked Supabase project
3. regenerate db types if the schema changed
4. verify the app routes or server actions against the new shape

Because the migration set is already squashed, contributors should treat the
existing files as grouped domains rather than looking for one-file-per-feature
history.

## Sandbox Reset Operations

The sandbox automation is code-driven.

`npm run generate:sandbox`:

- reads the migration folder
- concatenates the SQL in lexical order
- writes the generated payload to
  `apps/nextblock/app/api/cron/reset-sandbox/sandboxResetSql.ts`

`npm run sandbox:reset`:

- loads `.env.local`
- reads `NEXT_PUBLIC_URL` and `CRON_SECRET`
- calls `GET /api/cron/reset-sandbox`

The cron route then:

- executes the generated reset SQL
- reseeds media assets
- reseeds commerce content
- triggers Freemius sync helpers for sandbox data

## Deployment Notes

The repo currently assumes:

- the app is deployed as a Next.js application
- Supabase remains the database/auth backend
- cron routes are protected with `Authorization: Bearer ${CRON_SECRET}`
- package activation and several system workflows require working server-side
  environment variables, not only public client keys

If you are configuring hosted Supabase auth email settings, use:

```bash
npm run configure:supabase-auth
```

## Current Repo Notes

Two repo facts are worth keeping in mind while contributing:

- the workspace import path is `@nextblock-cms/ecommerce`, but the current
  `libs/ecommerce/package.json` name is still `@nextblock-cms/ecom`
- a standalone `npx nx run ecommerce:build --skip-nx-cache` check is currently
  not green, so use app-level validation and targeted tracing until that build
  target is repaired
