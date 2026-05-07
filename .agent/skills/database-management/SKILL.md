---
name: database-management
description: When you need to modify the database schema, run migrations, or deploy Supabase changes. Use this for all SQL and Supabase-related tasks.
---

# Database Management (Supabase)

## 1. Core Workflow

- **Environment:** We use Supabase (PostgreSQL + Auth).
- **Local Config:** `supabase/config.toml` manages local settings.
- **Env Vars:** Ensure `.env.local` is populated with valid Supabase credentials.

## 2. Key Commands

- **Push Migrations:** `npm run db:push`
  - This pushes schema changes to the remote Supabase instance.
  - It also pushes the local configuration.
- **Link Database:** `npm run db:link`
  - Links the local development environment to the remote Supabase project.
- **Generate Types:** `npm run db:types`
  - Generates TypeScript definitions from the database schema. **Run this after every schema change.**
- **Deploy:** `npm run deploy:supabase`
  - Deploys migrations and config (often used in CI/CD).

## 3. Schema Management

- **Migrations:** SQL migrations are located in `libs/db/src/supabase/migrations`.
- **Edit, Don't Create:** Always **edit and fix existing migration files** instead of creating new migration files — unless the change is for a totally new feature or something that genuinely can't be added to an existing file.
- **No Local Docker:** There is no local Supabase Docker instance. The user will always reset and push the DB migrations manually via `npm run db:push`. Do not attempt to run `db:push` or `supabase db reset` yourself.
- **Validation:** Always verify schema changes are syntactically correct SQL before leaving them for the user to push.

## 4. Troubleshooting

- **CSP/Connection Issues:** If the build fails to connect to Supabase, check the Content Security Policy (CSP) headers in `next.config.js` or `middleware.ts`.
- **Url Sync:** Ensure `NEXT_PUBLIC_URL` matches your `site_url` in Supabase config to prevent redirect issues with auth.
