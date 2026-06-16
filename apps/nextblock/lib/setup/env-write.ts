import 'server-only';
// Server-only `.env.local` writer for the local-dev (Profile B) setup path.
//
// Reimplements the three tiny helpers from tools/scripts/lib/supabase-keys.mjs
// (generateSecret / readEnvValue / upsertEnv) inside the app so the browser wizard
// writes `.env.local` identically to the terminal flow it replaces — without pulling
// a file from outside the app's build graph. Kept dependency-free (node built-ins).
import { randomBytes } from 'node:crypto';
import { existsSync } from 'node:fs';
import { readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { isLocalWritableEnv } from './env-status';

/**
 * Where `.env.local` belongs. In this Nx monorepo the canonical location is the
 * workspace root (where `npm run setup` writes and `db:migrate`/`db:types` read), but
 * `nx serve` runs server actions with cwd = apps/nextblock — so we walk up to the
 * nearest ancestor containing `nx.json`. A standalone create-nextblock project has no
 * `nx.json`, so we fall back to cwd (its own root, where `next dev` runs).
 */
function resolveEnvDir(): string {
  let dir = process.cwd();
  for (let i = 0; i < 8; i++) {
    if (existsSync(path.join(dir, 'nx.json'))) return dir;
    const parent = path.dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return process.cwd();
}

/** 64-char (32-byte) hex secret. Matches tools/scripts/lib/supabase-keys.mjs. */
export function generateSecret(): string {
  return randomBytes(32).toString('hex');
}

/** Read a `KEY=` value from an .env body (tolerates surrounding quotes). */
function readEnvValue(envContent: string, key: string): string {
  for (const line of envContent.split(/\r?\n/)) {
    if (line.startsWith(`${key}=`)) {
      return line
        .slice(key.length + 1)
        .trim()
        .replace(/^"(.*)"$/, '$1');
    }
  }
  return '';
}

/** Apply `KEY=value` replacements line-by-line, appending keys not already present. */
function upsertEnv(envContent: string, replacements: Record<string, string>): string {
  const applied = new Set<string>();
  const lines = envContent.split(/\r?\n/).map((line) => {
    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(`${key}=`)) {
        applied.add(key);
        return `${key}=${value}`;
      }
    }
    return line;
  });

  for (const [key, value] of Object.entries(replacements)) {
    if (!applied.has(key)) {
      lines.push(`${key}=${value}`);
    }
  }

  return lines.join('\n');
}

const ROTATING_SECRET_KEYS = ['CRON_SECRET', 'DRAFT_MODE_SECRET', 'REVALIDATE_SECRET_TOKEN'];

/**
 * Write KEY=value pairs to `.env.local` at the working directory AND mirror them into
 * the live `process.env` so the running dev server can use them for server-side work
 * (schema probe, admin creation) without a hard restart.
 *
 * Caveat the caller must surface: `NEXT_PUBLIC_*` values are inlined into client
 * bundles at build/compile time, so the browser-side Supabase client still needs a
 * dev-server restart to pick them up. No-op (returns false) outside a local writable
 * environment (Vercel/Docker runner are read-only / platform-managed).
 */
export async function writeEnvLocal(values: Record<string, string>): Promise<boolean> {
  if (!isLocalWritableEnv()) return false;

  const envPath = path.join(resolveEnvDir(), '.env.local');
  let existing = '';
  try {
    existing = await readFile(envPath, 'utf8');
  } catch {
    existing = '';
  }

  // Generate the three rotating secrets only if absent (idempotent), like setup.mjs.
  const ensured: Record<string, string> = { ...values };
  for (const key of ROTATING_SECRET_KEYS) {
    if (!ensured[key] && !readEnvValue(existing, key)) {
      ensured[key] = generateSecret();
    }
  }

  const next = upsertEnv(existing, ensured);
  await writeFile(envPath, next.endsWith('\n') ? next : `${next}\n`, 'utf8');

  for (const [key, value] of Object.entries(ensured)) {
    process.env[key] = value;
  }

  return true;
}
