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
| `project-name` / `repository-name` | Pre-fill the new Vercel project and Git repo names. |

The button deliberately carries **no `env=` and no integration parameter** — it just
clones and builds. (An earlier version used `integration-ids=oac_…`; that is Vercel's
**legacy** OAuth-integration trigger and does **not** provision the Marketplace Supabase
database, so it silently left the app unconfigured. Supabase is now a Vercel **Marketplace
(native) integration**, connected as described below.)

## Connect the database (Supabase Marketplace)

Provisioning a Postgres database requires choosing a region and plan, so it can't be
fully baked into a URL — but you never copy a key by hand. In the Vercel dashboard for
your new project:

1. Open the **Storage** tab → **Create Database** (or **Browse Marketplace**) → choose
   **Supabase**.
2. Pick a **region** and **database name**, then **Create**. Vercel provisions the
   Supabase project and **automatically injects** the env vars into your project:
   `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `POSTGRES_URL`, etc. — no manual entry.
3. **Redeploy** (env vars added after a build only take effect on the next deploy).

On that deploy the instance boots as **Profile A (pre-configured)**: the wizard skips the
database-connection step, **auto-applies the schema** from the injected `POSTGRES_URL`
(the migrations are embedded in the build — see `lib/setup/migrations-bundle.ts`), and
goes straight to creating the first administrator.

## Build configuration (Nx monorepo)

NextBlock is an Nx monorepo — the Next.js app lives at `apps/nextblock`, not the repo
root — so a bare `next build` at the root fails with *"Couldn't find any `pages` or
`app` directory."* The root [`vercel.json`](../vercel.json) pins the correct build, so
the one-click deploy needs **no manual dashboard configuration**:

```json
{
  "buildCommand": "npx nx build nextblock --prod",
  "outputDirectory": "apps/nextblock/.next",
  "framework": "nextjs"
}
```

- **`buildCommand`** runs the Nx target from the repo root, which resolves the
  workspace libraries (`@nextblock-cms/*` via the TS path aliases) and builds the app.
- **`outputDirectory`** points at the app's `.next`. This `@nx/next` version emits it
  to `apps/nextblock/.next` — **not** `dist/apps/nextblock/.next` (which only receives
  the deploy wrapper: `package.json`, `next.config.js`, `public/`). Verify with
  `npx nx build nextblock --prod` then check `apps/nextblock/.next/BUILD_ID`.
- **`framework: nextjs`** keeps Vercel's first-class Next.js runtime (SSR/ISR
  functions, image optimization, the `proxy.ts` middleware).

Leave the Vercel project's **Root Directory unset** (the repo root) — the build command
already targets the app. Do **not** set Root Directory to `apps/nextblock`: the app
imports the workspace libraries one level up, which a custom Root Directory would hide
(Vercel forbids `..` above a custom root).

## No environment variables required

A Deploy-Button URL can only carry variable **names**, never values — so secrets can
never be pre-filled through it. Rather than make you paste random strings, NextBlock
resolves everything in-app, and the button prompts for nothing:

- **`NEXT_PUBLIC_URL`** — optional. When unset the app falls back to Vercel's
  production URL (`VERCEL_PROJECT_PRODUCTION_URL` server-side /
  `NEXT_PUBLIC_VERCEL_PROJECT_PRODUCTION_URL` in the browser), i.e. your
  `*.vercel.app` domain. Sitemap, robots, and canonical links use it automatically.
  Add a custom domain later, set `NEXT_PUBLIC_URL=https://yourdomain.com` in the
  Vercel project, and redeploy (it is inlined at build time).
- **`DRAFT_MODE_SECRET`** and **`REVALIDATE_SECRET_TOKEN`** — optional. When unset they
  are derived deterministically from the Supabase service-role key (HMAC-SHA256), so
  Draft Mode and on-demand revalidation work out of the box. Setting either env var
  overrides the derived value — do this if you want a fixed `REVALIDATE_SECRET_TOKEN`
  to paste into a Supabase revalidation webhook. (See `apps/nextblock/lib/app-secrets.ts`.)
- **`CRON_SECRET`** — optional. The cron endpoints enforce the `Authorization: Bearer`
  header **only when it is set**. Leave it unset for a frictionless deploy, or set it
  in the Vercel project to lock the cron endpoints down. The destructive
  `/api/cron/reset-sandbox` job is independently gated to sandbox-mode only (404
  otherwise), so it never runs on a normal deploy.

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

## Cron jobs and the Hobby plan

`vercel.json` declares two crons (`/api/cron/reset-sandbox` at 03:00 and
`/api/cron/sync-currencies` at 18:00). Vercel's **Hobby (free) tier allows up to 100
cron jobs, each running at most once per day** — both jobs are daily, so they deploy
fine on the free tier. (Hobby timing is approximate, ±59 min, which is irrelevant for
daily jobs; only sub-daily schedules like `0 * * * *` are rejected on Hobby.)

`reset-sandbox` only does work in sandbox mode — it returns 404 otherwise — so on a
normal deploy it is a harmless no-op. Delete it from `vercel.json` if you'd rather not
see it scheduled.

## After deploy

Visit the deployment URL — it redirects to `/setup` until the first admin exists.
Complete the wizard, then sign in at `/cms/dashboard`.
