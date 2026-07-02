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

### One-click install (Connect GitHub)

Vercel's 1-click deploy creates your repo through an integration whose token lacks the
GitHub **`workflow`** scope, so GitHub **strips `.github/workflows/`** from the copy — your
new repo won't have the sync workflow even though the template ships it. To fix that with no
token to create, the dashboard onboarding step shows a **Connect GitHub** button:

1. Click **Connect GitHub** — a short code appears.
2. Click **Authorize on GitHub**, enter the code, approve.
3. NextBlock installs `.github/workflows/nextblock-sync.yml` into your repo for you, and the
   step turns green.

This uses GitHub's **device flow** — no token to create, no per-site callback, nothing to
configure (the public client id ships with NextBlock). The authorization requests the
`repo` + `workflow` scopes because GitHub requires them to write a workflow file; NextBlock
uses the grant once to install the file and does **not** store it. Revoke it anytime at
GitHub → **Settings → Applications**.

### Do you need to enable GitHub Actions?

It depends on how the repository was created:

- **Vercel 1-click deploy** creates a **new repository you own** (a copy, *not* a GitHub
  fork). GitHub **enables Actions by default** on repos you own — **there's nothing to turn
  on**. The sync workflow runs automatically once it lands on your repo's **default branch**.
- **A manual GitHub _fork_** (the "Fork" button) has Actions **disabled** by default. Enable
  them once: your repo → **Actions** tab → **"I understand my workflows, go ahead and enable
  them."**

> **Seeing GitHub's "Get started with Actions / choose a workflow" page?** That only means
> your Actions tab is **empty** — `.github/workflows/nextblock-sync.yml` isn't on your
> **default branch** yet (scheduled workflows only run from the default branch). Once it is,
> the tab shows **NextBlock Upstream Sync** with a **Run workflow** button. There is no
> separate "enable" button on an owned repo because Actions are already on.

The dashboard onboarding step ("Automatic updates (GitHub Actions)") links to **Settings →
Actions** — where you can confirm Actions are allowed — and completes itself once GitHub
reports the sync workflow as active.

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

> **⚠️ Vercel Hobby (free) plan + a private repo blocks auto-deploys.** On Hobby, Vercel only
> deploys **private**-repo commits authored by the project owner and rejects automated
> (bot/collaborator) commits — so the auto-merge push won't deploy (*"Hobby Plan does not
> support collaboration for private repositories"*). Either **make the repo public**
> (recommended — it also makes the conflict banner tokenless) or upgrade to **Vercel Pro**.
> Public repos have no such restriction on Hobby.

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
