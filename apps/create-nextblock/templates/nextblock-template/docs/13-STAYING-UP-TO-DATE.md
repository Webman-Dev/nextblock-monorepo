# 13 · Staying Up to Date (Automated Upstream Updates)

NextBlock keeps your instance in sync with the upstream project
(`nextblock-cms/nextblock`) with **as little manual work as possible**. How updates
arrive depends on how you deployed, and the system auto-detects which path applies:

| Install type | Track | How updates arrive |
| :--- | :--- | :--- |
| Vercel 1-click / GitHub fork (git-backed) | **A** | A daily GitHub Action merges upstream and pushes to your deploy branch (→ Vercel CD). |
| `npm create nextblock` / local clone / Docker image (standalone) | **B** | The CMS checks GitHub Releases and shows a "download the new version" banner. |

Both tracks surface their status in the CMS through a dashboard banner backed by the
`system_alerts` table (migration `00000000000036`). Reads are ADMIN-only (RLS).

---

## Track A — Git-backed installs (Vercel 1-click, GitHub forks)

The workflow lives at [`.github/workflows/nextblock-sync.yml`](../.github/workflows/nextblock-sync.yml).
It runs **daily at 00:00 UTC** and on demand (**Actions → NextBlock Upstream Sync → Run
workflow**). Each run:

1. Merges the upstream release branch into your deploy branch.
2. **Clean merge** → commits and pushes to your branch, which triggers a normal Vercel
   deployment. Any open conflict issue is auto-closed.
3. **Conflict** → aborts the merge and opens (or updates) a GitHub Issue labeled
   `nextblock-sync-conflict`. The CMS mirrors that issue into an **amber banner** on the
   dashboard with a link to resolve it. Once you resolve and **close the issue**, the
   banner clears automatically.

### One-time step: enable GitHub Actions

GitHub **disables Actions on a freshly-forked repo** until you turn them on once:

> Your repo → **Actions** tab → **"I understand my workflows, go ahead and enable them."**

The dashboard onboarding checklist reminds you of this ("Enable automatic updates
(GitHub Actions)") and links straight to your repo's Actions tab. The step marks itself
done once the workflow has run at least once.

### No GitHub secrets required (public forks)

The conflict signal uses the **`GITHUB_TOKEN` that GitHub provides to every workflow
automatically** — you do **not** add any Supabase secret to GitHub. The app writes the
dashboard alert itself using the Supabase key it already has, and reads your repo's
conflict issues over the public GitHub API.

> **We recommend forking to a _public_ repository** — it's fully zero-config.

### Private forks

If your fork is **private**, the public GitHub API can't read its issues, so add **one**
environment variable to your deployment (Vercel project → Settings → Environment
Variables, or your `.env`):

| Variable | Value |
| :--- | :--- |
| `NEXTBLOCK_GITHUB_TOKEN` | A GitHub token with **read access to issues** on your fork (a fine-grained PAT scoped to the repo, or a classic token with `repo`). |

With that set, the dashboard conflict banner works on private forks too. (The workflow
itself still needs no extra secret — `GITHUB_TOKEN` covers it either way.)

### How the dashboard stays current (no cron)

The CMS refreshes update/conflict status **in the background after a dashboard page
loads** (throttled to ~6 hours), so it works on Vercel's Hobby plan without consuming a
cron slot. Admins can also force a check immediately:

```
POST /api/cms/check-updates      # admin-only; returns the version + conflict status
```

---

## Track B — Standalone installs (npm create / local / Docker)

These installs aren't wired to a GitHub Action, so NextBlock checks the **GitHub Releases
API** and, when a newer release exists, records a `runtime_update_available` alert — an
**indigo banner** on the dashboard with a direct **download link** to the release tarball.
Updating is manual by design: download the archive, replace your files, and update
dependencies (`npm install`). The same admin check endpoint above triggers a check on
demand.

---

## Schema stays in step with deploys (build-time migrations)

So a new version's code never runs against an old schema, a build-time hook
([`apps/nextblock/tools/build-migrate.mjs`](../apps/nextblock/tools/build-migrate.mjs))
applies pending, forward-only migrations **before** `next build`:

- **Vercel:** runs automatically when `VERCEL_ENV=production`; **preview/development
  builds are skipped** so they never touch live data.
- **Standalone / local / Docker:** gated on `NEXTBLOCK_BUILD_MIGRATE=1`, which the
  `/setup` wizard and the create/Docker setup scripts write into your env automatically.

It is **non-destructive and never breaks the build** — if the database is unreachable it
logs a warning and continues. Migrations are tracked in `supabase_migrations.schema_migrations`,
identically to the Supabase CLI.

> **Edge case:** if your project's migration history is empty/inconsistent, the hook skips
> rather than risk misapplying. Run `npm run db:migrate:repair-history` then
> `npm run db:migrate` once to reconcile (see [docs/04](./04-DATABASE-AND-AUTH.md)).

---

## Quick reference

| You want… | Do this |
| :--- | :--- |
| Fully hands-off updates | Fork **public**, deploy on Vercel, **enable Actions** once. |
| Conflict banners on a **private** fork | Also set `NEXTBLOCK_GITHUB_TOKEN`. |
| To update a **standalone** install | Watch for the dashboard banner → download → replace → `npm install`. |
| To force an update check now | Dashboard (admin) → it polls in the background; or `POST /api/cms/check-updates`. |
| To resolve a sync conflict | Open the linked GitHub issue, merge upstream locally, fix, push, close the issue. |
