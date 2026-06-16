# 12 · Cloud Deployment (Deploy to Vercel)

NextBlock ships a one-click **Deploy to Vercel** button (see the README) that brings
up a production instance already connected to a managed Supabase project. From there,
the in-app **First-Boot Setup Wizard** (`/setup`) finishes configuration in the
browser — there is no terminal step.

## How the button works

The badge links to `https://vercel.com/new/clone` with these query parameters:

| Parameter | Purpose |
| :--- | :--- |
| `repository-url` | The NextBlock repo to clone into the user's Git provider. |
| `integration-ids=oac_VqOgBHqhEoFTPzGkPd7L0iH6` | Vercel's **Supabase integration**. During import, Vercel provisions (or links) a Supabase project and injects its environment variables automatically. |
| `env=NEXT_PUBLIC_URL,CRON_SECRET,DRAFT_MODE_SECRET,REVALIDATE_SECRET_TOKEN` | The remaining variables Vercel prompts for. Only variable **names** are listed — never secret values. |
| `envDescription` / `envLink` | Help text + a link back to this doc. |

The Supabase integration injects the keys the app needs to boot:
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
`SUPABASE_SERVICE_ROLE_KEY`, and `POSTGRES_URL`. Because those are present on first
boot, the instance is **Profile A (pre-configured)**: the wizard skips the connection
step and goes straight to creating the first administrator.

## What the wizard does on Vercel

1. **Database** — already connected (integration-injected). The wizard verifies a
   first admin doesn't exist yet, otherwise it redirects to `/cms/dashboard`.
2. **Schema** — apply the migrations to the managed Supabase project. The Supabase
   integration creates the project but does **not** run NextBlock's migrations, so run
   them once after the first deploy (locally against the project, or via the Supabase
   dashboard SQL editor) — see [docs/04](./04-DATABASE-AND-AUTH.md) and
   [docs/05](./05-DEVELOPER-GUIDE.md).
3. **Storage** — pre-filled for **Supabase Storage** (S3-compatible). The wizard's
   storage step shows the endpoint derived from your Supabase URL
   (`<project>/storage/v1/s3`). Create an S3 access key in the Supabase dashboard
   (Storage → S3 connection) and set `R2_ACCESS_KEY_ID` / `R2_SECRET_ACCESS_KEY` in
   your Vercel project environment. (Cloudflare R2 remains the default for non-Vercel
   installs — it has a more generous free storage tier; only the one-click Vercel
   path defaults to Supabase Storage.)
4. **Email / Bot protection / Sign-ups** — optional steps; bot-protection and the
   sign-up policy persist to the database and work immediately. SMTP, if used, is set
   as Vercel environment variables.
5. **Administrator** — create the first admin. The account is created already
   confirmed (`email_confirm: true`), so no verification email is required.

> Filesystem is read-only on Vercel, so the wizard never writes `.env.local` there —
> all configuration is environment variables (platform-managed) plus the database.

## Cron jobs and the free tier

`vercel.json` declares two daily crons (`/api/cron/reset-sandbox` and
`/api/cron/sync-currencies`). Vercel's **Hobby (free) tier allows one cron per day**.
For a free-tier production deploy, either:

- Upgrade to a paid plan (both crons run as declared), **or**
- Keep only the cron you need (most production sites don't need `reset-sandbox`, which
  exists for the public demo sandbox), **or**
- Consolidate both jobs into a single cron handler.

This is intentionally left as a deploy-time decision rather than changed in the repo,
since the sandbox/demo deploy relies on both crons.

## After deploy

Visit the deployment URL — it redirects to `/setup` until the first admin exists.
Complete the wizard, then sign in at `/cms/dashboard`.
