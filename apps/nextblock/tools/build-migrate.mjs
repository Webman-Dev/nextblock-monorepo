// Milestone 4 — environment-aware, zero-config build-time schema migration hook.
//
// Runs BEFORE `next build` (wired in apps/nextblock/project.json for nx/Vercel and in
// the app's `prebuild` script for standalone/Docker `npm run build`). It applies any
// pending, forward-only migrations to the tenant's Postgres so the deployed app and its
// schema move together — additively, transactionally, and tracked exactly like the
// Supabase CLI in supabase_migrations.schema_migrations.
//
// Gating (no manual config required):
//   * On Vercel: run only when VERCEL_ENV === 'production'. Preview/development builds
//     are skipped so feature previews never touch live data structures.
//   * Off Vercel (npm create / local / Docker): run only when NEXTBLOCK_BUILD_MIGRATE === '1'
//     (the /setup wizard and the create/docker setup scripts write this into .env).
//
// Safety: this NEVER fails the build. A missing flag, missing POSTGRES_URL, or an
// unreachable database logs a warning and exits 0 so static packaging always proceeds.
//
// The SQL constants + apply loop are intentionally kept in lockstep with
// apps/nextblock/lib/setup/schema-apply.ts (the /setup wizard's applier). This file is
// plain ESM with no app/server-only imports so it loads safely in any build context.

import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

const log = (msg) => console.log(`[build-migrate] ${msg}`);

/** Best-effort .env.local / .env load (dotenv is a dependency; tolerate its absence). */
async function loadEnv() {
  try {
    const dotenv = await import('dotenv');
    for (const file of ['.env.local', '.env']) {
      const p = path.join(process.cwd(), file);
      if (existsSync(p)) dotenv.config({ path: p, override: false, quiet: true });
    }
  } catch {
    /* dotenv unavailable — env may already be injected by the platform */
  }
}

/** Decide whether the hook should run, with a human-readable reason for the log. */
function evaluateGate() {
  const vercelEnv = process.env.VERCEL_ENV;
  if (vercelEnv) {
    return vercelEnv === 'production'
      ? { run: true, reason: 'VERCEL_ENV=production' }
      : { run: false, reason: `VERCEL_ENV=${vercelEnv} — preview/development build, skipping` };
  }
  if (process.env.NEXTBLOCK_BUILD_MIGRATE === '1') {
    return { run: true, reason: 'NEXTBLOCK_BUILD_MIGRATE=1' };
  }
  return { run: false, reason: 'NEXTBLOCK_BUILD_MIGRATE is not set — skipping' };
}

/**
 * Locate the migrations dir: monorepo keeps them at libs/db/src/supabase/migrations
 * (found via the nearest nx.json); a standalone create-nextblock project materializes
 * them at <projectRoot>/supabase/migrations. Mirrors schema-apply.ts.
 */
function resolveMigrationsDir() {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, 'nx.json'))) {
      const monorepo = path.join(dir, 'libs', 'db', 'src', 'supabase', 'migrations');
      if (existsSync(monorepo)) return monorepo;
      break;
    }
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    const standalone = path.join(dir, 'supabase', 'migrations');
    if (existsSync(standalone)) return standalone;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return null;
}

// --- SQL kept in sync with apps/nextblock/lib/setup/schema-apply.ts ---------------
const TRACKING_DDL =
  'create schema if not exists supabase_migrations;' +
  'create table if not exists supabase_migrations.schema_migrations ' +
  '(version text primary key, name text, statements text[]);';

const GRANTS_SQL =
  'grant usage on schema public to anon, authenticated, service_role;' +
  'grant select on all tables in schema public to anon;' +
  'grant all on all tables in schema public to authenticated, service_role;' +
  'grant all on all sequences in schema public to anon, authenticated, service_role;' +
  'grant execute on all functions in schema public to anon, authenticated, service_role;';

function recordSql(version, file) {
  return (
    `insert into supabase_migrations.schema_migrations (version, name) ` +
    `values ('${version}', '${file.replace(/'/g, "''")}') on conflict (version) do nothing;`
  );
}

/** Wrap a migration file + its version record in one transaction (all-or-nothing). */
function transactionalMigration(version, file, sqlText) {
  return `begin;\n${sqlText}\n;\n${recordSql(version, file)}\ncommit;`;
}

/** Apply pending migrations over a direct Postgres connection. Never throws. */
async function applyViaPostgres(dbUrl, files, readSql) {
  let postgres;
  try {
    ({ default: postgres } = await import('postgres'));
  } catch {
    return { ok: false, applied: 0, error: 'the "postgres" package is not installed' };
  }

  const db = postgres(dbUrl, { ssl: 'require', onnotice: () => undefined, max: 1 });
  let applied = 0;
  try {
    await db.unsafe(TRACKING_DDL);
    const rows = await db`select version from supabase_migrations.schema_migrations`;
    const done = new Set(rows.map((r) => r.version));

    // Self-heal stale history: recorded versions but a core table missing means the
    // schema was wiped without clearing history (separate schema) — re-apply all.
    if (done.size > 0) {
      const sentinel = await db`select to_regclass('public.site_settings')::text as t`;
      if (!sentinel[0]?.t) {
        await db`delete from supabase_migrations.schema_migrations`;
        done.clear();
      }
    }

    for (const file of files) {
      const version = file.split('_')[0];
      if (done.has(version)) continue;
      const sqlText = await readSql(file);
      await db.unsafe(transactionalMigration(version, file, sqlText));
      applied += 1;
    }

    await db.unsafe(GRANTS_SQL);
    await db.unsafe("notify pgrst, 'reload schema';");
    return { ok: true, applied };
  } catch (caught) {
    const message = caught instanceof Error ? caught.message : 'unknown error applying migrations';
    const unreachable = /ENOTFOUND|ENOENT|EAI_AGAIN|getaddrinfo|ECONNREFUSED|ETIMEDOUT/i.test(message);
    return {
      ok: false,
      applied,
      error: unreachable
        ? `could not reach the database host (${message}); use the Session pooler connection string for IPv4 build networks`
        : message,
    };
  } finally {
    try {
      await db.end({ timeout: 5 });
    } catch {
      /* closing should never mask the result */
    }
  }
}

async function main() {
  await loadEnv();

  const gate = evaluateGate();
  if (!gate.run) {
    log(`Skipping build-time migrations (${gate.reason}).`);
    return;
  }
  log(`Build-time migrations enabled (${gate.reason}).`);

  const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
  if (!dbUrl) {
    log(
      'No POSTGRES_URL/DATABASE_URL is set — skipping. Apply the schema with the /setup wizard or "npm run db:migrate".',
    );
    return;
  }

  const dir = resolveMigrationsDir();
  if (!dir) {
    log('Could not locate the migrations directory — skipping.');
    return;
  }

  const files = (await readdir(dir)).filter((name) => /^\d+_.*\.sql$/.test(name)).sort();
  const result = await applyViaPostgres(dbUrl, files, (file) =>
    readFile(path.join(dir, file), 'utf8'),
  );

  if (result.ok) {
    log(result.applied > 0 ? `Applied ${result.applied} pending migration(s).` : 'Schema already up to date.');
  } else {
    log(`WARNING: could not apply migrations: ${result.error}.`);
    log('Continuing the build — apply later with "npm run db:migrate".');
  }
}

// Guarantee a clean exit code regardless of outcome: infrastructure issues must never
// break web packaging.
main()
  .catch((err) => {
    log(`WARNING: ${err instanceof Error ? err.message : String(err)}.`);
  })
  .finally(() => {
    process.exit(0);
  });
