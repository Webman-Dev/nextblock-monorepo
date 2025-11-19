# Setup Wizard Open Issues (create-nextblock)

## Current Behavior (0.2.19)
- Supabase login flows, but after selecting a project the wizard still prompts for the project ref. It should read the ref from the Supabase CLI output or from `supabase/config.toml` written by the CLI, and only prompt if missing.
- Password/anon key prompts sometimes require pressing Enter before paste/input—likely TTY state left by the Supabase CLI between steps.
- Migrations are present in the published `@nextblock-cms/db` (e.g., 0.2.11-0.2.19) under `node_modules/@nextblock-cms/db/supabase/migrations`, but the wizard looks in `<project>/supabase/migrations` and often reports “No migrations found … skipping db push.” The package assets are not copied into the project before the push.

## What’s in the package
- `@nextblock-cms/db` publishes `supabase/config.toml` with `project_id = "env(SUPABASE_PROJECT_ID)"` and all migrations in `supabase/migrations/*.sql` (also visible under `lib/supabase`).
- create-nextblock depends on `@nextblock-cms/db: latest`.

## Root Causes
1) Project ref prompt: We parse the ref from link output/config.toml inconsistently and then overwrite config. We should read the concrete ref from CLI output or config, set it in `.env`, and leave `config.toml` from the package untouched (it should stay `env(SUPABASE_PROJECT_ID)`).
2) TTY/paste issues: Supabase CLI may leave stdin in raw mode; manual stdin fiddling has been removed/re-added inconsistently. We need a single, minimal reset of stdin after the link/login steps, or pass explicit `stdin/stdout` into Clack prompts.
3) Migrations: ensureSupabaseAssets only copies from the package if present; however, db push still checks the project `supabase/migrations`. We should always copy `node_modules/@nextblock-cms/db/supabase/**/*` into `<project>/supabase` before push, so the check finds the `.sql` files.

## Proposed Fixes
- Project ref: after `supabase link`, read the ref from `supabase/config.toml` if the CLI wrote a concrete ref; otherwise prompt once. Do NOT overwrite the package config; keep it as `env(SUPABASE_PROJECT_ID)`.
- Migrations: explicitly copy from `require.resolve('@nextblock-cms/db/package.json')` → `supabase` (and `lib/supabase` as a fallback) into `<project>/supabase` before the push block. Then run `supabase db push`.
- TTY: avoid manual stdin manipulation; if needed, reset raw mode once after link (`setRawMode(false); setEncoding('utf8'); resume()`) and/or set Clack prompts to use `stdin: process.stdin, stdout: process.stdout`.
- Keep Supabase UI colors: run link with `stdio: 'inherit'` and avoid piping unless we must parse output; prefer reading the ref from the CLI-written `config.toml`.

## Desired End State
- No ref prompt after link when the CLI provides a ref; only prompt if absolutely missing.
- Prompts accept paste without extra Enter.
- Migrations copied from `@nextblock-cms/db` into the project, and `supabase db push` runs successfully by default.
