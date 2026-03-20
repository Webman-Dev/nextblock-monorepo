# Sandbox Environment & Automated Resets

The NextBlock CMS provides a fully functional Sandbox environment (typically `cms.nextblock.ca`) to allow prospective users to test the editor, blocks, and core features without risking production data.

Because the Sandbox is public, its database and R2 cloud storage must be periodically reset to a pristine state.

## Architecture & Workflow

The Sandbox Reset relies on a direct-execution model to bypass Supabase migration limitations. 

Historically, attempting to drop and recreate the `public` schema via a Supabase RPC function caused the function to delete itself mid-execution, throwing a `404 Not Found` error. To resolve this, the architecture completely bypasses the Supabase Migration table and RPC endpoints.

### 1. Generating the SQL Payload
Instead of treating the reset as a standard Supabase Migration (which executes once and is immutable), we compile all existing production migrations into a single, stateless TypeScript SQL string.

1. Run `npm run generate:sandbox` locally.
2. The script reads all standard migrations from `libs/db/src/supabase/migrations/*.sql`.
3. It strips transaction blocks (`BEGIN;` / `COMMIT;`), drops the `public` schema, recreates it, applies the migrations, and injects the admin demo user.
4. It exports this massive query as a string inside: `apps/nextblock/app/api/cron/reset-sandbox/sandboxResetSql.ts`.

> **Note:** Whenever you add a new database migration to NextBlock, you **must** run `npm run generate:sandbox` to update the payload, and commit the resulting `sandboxResetSql.ts` file to version control.

### 2. Vercel Cron Job Execution
Vercel executes a Cron Job by hitting the `/api/cron/reset-sandbox` Next.js App Router endpoint.

1. **R2 Storage Wipe:** The endpoint connects to the Cloudflare S3/R2 client and deletes all user-uploaded media.
2. **Asset Re-seeding:** It fetches essential images (logos, featured images) using the `NEXT_PUBLIC_URL` and re-uploads them to the empty R2 bucket.
3. **Database Execution:** The endpoint connects *directly* to the Postgres database using the `postgres` Node library.
4. It executes the `sandboxResetSql.ts` payload natively, instantly wiping and recreating the database in a couple of seconds.

## Environment Variables

The Vercel Cron API route strictly checks for the following variables:
- `NEXT_PUBLIC_IS_SANDBOX="true"`
- `CRON_SECRET`
- `POSTGRES_URL` (Connection string to the Supabase database pooler)
- Cloudflare R2 credentials (`R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`)
- `NEXT_PUBLIC_URL` (Used to construct the `siteUrl` fallback to fetch production assets)

> ⚠️ **DANGER:** Never run this against your production database. Ensure your Vercel Project specifically points `POSTGRES_URL` to your Sandbox Supabase container!
