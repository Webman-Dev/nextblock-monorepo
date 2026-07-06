// Re-baseline transform: turn a pristine pg_dump (schema.sql + data.sql) into a small
// set of idempotent, reused-low-version baseline migration files.
//
//   node transform.mjs <buildDir> <outDir>
//
// It never reorders statements (pg_dump already emits a valid dependency order); it only
// (a) buckets statements into 4 files by kind, (b) adds idempotency guards, (c) re-attaches
// the auth.users trigger the public-only dump drops, and (d) normalizes 2 seed rows.
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';

const buildDir = process.argv[2];
const outDir = process.argv[3];
const schemaSql = readFileSync(path.join(buildDir, 'schema.sql'), 'utf8');
const dataSql = readFileSync(path.join(buildDir, 'data.sql'), 'utf8');

// --- dollar-quote / string / comment aware statement splitter -----------------
function splitStatements(sql) {
  const out = [];
  let i = 0, start = 0;
  let inLine = false, inBlock = false, inSingle = false, dollar = null;
  while (i < sql.length) {
    const two = sql.slice(i, i + 2);
    if (inLine) { if (sql[i] === '\n') inLine = false; i++; continue; }
    if (inBlock) { if (two === '*/') { inBlock = false; i += 2; continue; } i++; continue; }
    if (inSingle) { if (sql[i] === "'") { if (sql[i + 1] === "'") { i += 2; continue; } inSingle = false; } i++; continue; }
    if (dollar) { if (sql.startsWith(dollar, i)) { i += dollar.length; dollar = null; continue; } i++; continue; }
    if (two === '--') { inLine = true; i += 2; continue; }
    if (two === '/*') { inBlock = true; i += 2; continue; }
    if (sql[i] === "'") { inSingle = true; i++; continue; }
    if (sql[i] === '$') {
      const m = /^\$[A-Za-z0-9_]*\$/.exec(sql.slice(i));
      if (m) { dollar = m[0]; i += m[0].length; continue; }
    }
    if (sql[i] === ';') { out.push(sql.slice(start, i + 1)); i++; start = i; continue; }
    i++;
  }
  const tail = sql.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

// Strip leading pg_dump "-- Name: ...; Type: ..." metadata + blank lines, return {lead, body}
function stripLead(stmt) {
  const lines = stmt.split('\n');
  let k = 0;
  while (k < lines.length && (lines[k].trim() === '' || lines[k].trim().startsWith('--'))) k++;
  return lines.slice(k).join('\n').trim();
}

// --- per-statement transforms -------------------------------------------------
function wrapEnum(body) {
  return `DO $rb$ BEGIN\n${body}\nEXCEPTION WHEN duplicate_object THEN null; END $rb$;`;
}
function guardConstraint(body) {
  const m = /^ALTER TABLE (?:ONLY )?public\.("?[A-Za-z0-9_]+"?)\s+ADD CONSTRAINT\s+("?[A-Za-z0-9_]+"?)/.exec(body);
  if (!m) return body;
  const table = m[1].replace(/"/g, '');
  const cname = m[2].replace(/"/g, '');
  return `DO $rb$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = '${cname}' AND conrelid = 'public.${table}'::regclass) THEN\n    ${body.replace(/\n/g, '\n    ')}\n  END IF;\nEND $rb$;`;
}
function dropBeforePolicy(body) {
  const m = /^CREATE POLICY\s+("[^"]+"|[A-Za-z0-9_]+)\s+ON\s+public\.([A-Za-z0-9_]+)/.exec(body);
  if (!m) return body;
  return `DROP POLICY IF EXISTS ${m[1]} ON public.${m[2]};\n${body}`;
}
function dropBeforeTrigger(body) {
  const m = /^CREATE TRIGGER\s+([A-Za-z0-9_]+)[\s\S]*?\sON\s+public\.([A-Za-z0-9_]+)/.exec(body);
  if (!m) return body;
  return `DROP TRIGGER IF EXISTS ${m[1]} ON public.${m[2]};\n${body}`;
}
function guardIdentity(body) {
  const m = /^ALTER TABLE (?:ONLY )?public\.([A-Za-z0-9_]+) ALTER COLUMN ([A-Za-z0-9_]+) ADD GENERATED/.exec(body);
  if (!m) return body;
  return `DO $rb$ BEGIN\n  IF NOT EXISTS (SELECT 1 FROM pg_attribute WHERE attrelid = 'public.${m[1]}'::regclass AND attname = '${m[2]}' AND attidentity <> '') THEN\n    ${body.replace(/\n/g, '\n    ')}\n  END IF;\nEND $rb$;`;
}
function idempotentSetval(body) {
  // keep only "true" setvals (seeded tables); rewrite to MAX-based so replay never regresses
  const m = /setval\('public\.([A-Za-z0-9_]+)_id_seq'\s*,\s*\d+\s*,\s*(true|false)\)/.exec(body);
  if (!m) return null;
  if (m[2] === 'false') return null; // empty table — leave sequence at default
  const table = m[1];
  return `SELECT pg_catalog.setval('public.${table}_id_seq', COALESCE((SELECT MAX(id) FROM public.${table}), 1), true);`;
}

const AUTH_TRIGGER = `-- Re-attached: trigger lives on auth.users, which a public-only pg_dump omits (see migration 005).
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_new_user();
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;`;

// --- classify + transform schema statements -----------------------------------
const files = { schema: [], constraints: [], security: [] };
const counts = { type: 0, function: 0, table: 0, sequence: 0, index: 0, constraint: 0, fk: 0, policy: 0, trigger: 0, rls: 0, grant: 0, comment: 0, dropped: 0 };

for (const raw of splitStatements(schemaSql)) {
  const body = stripLead(raw);
  if (!body) continue;
  const head = body.replace(/\s+/g, ' ').toUpperCase();

  if (/^SET /.test(body)) { counts.dropped++; continue; }              // pg_dump session SETs (we add our own)
  if (/^SELECT PG_CATALOG\.SET_CONFIG/.test(head)) { counts.dropped++; continue; }
  if (/^CREATE SCHEMA /.test(head)) { files.schema.push(body.replace(/^CREATE SCHEMA /, 'CREATE SCHEMA IF NOT EXISTS ')); continue; }
  if (/^CREATE TYPE /.test(head)) { counts.type++; files.schema.push(wrapEnum(body)); continue; }
  if (/^CREATE (OR REPLACE )?FUNCTION /.test(head)) { counts.function++; files.schema.push(body.replace(/^CREATE FUNCTION /, 'CREATE OR REPLACE FUNCTION ')); continue; }
  if (/^CREATE TABLE /.test(head)) { counts.table++; files.schema.push(body.replace(/^CREATE TABLE public\./, 'CREATE TABLE IF NOT EXISTS public.')); continue; }
  if (/^CREATE SEQUENCE /.test(head)) { counts.sequence++; files.schema.push(body.replace(/^CREATE SEQUENCE public\./, 'CREATE SEQUENCE IF NOT EXISTS public.')); continue; }
  if (/^ALTER SEQUENCE /.test(head)) { files.schema.push(body); continue; }         // OWNED BY — idempotent
  if (/^ALTER TABLE (ONLY )?PUBLIC\.[A-Z0-9_"]+ ALTER COLUMN .* ADD GENERATED .* AS IDENTITY/.test(head)) { counts.identity = (counts.identity || 0) + 1; files.schema.push(guardIdentity(body)); continue; }
  if (/^ALTER TABLE (ONLY )?PUBLIC\.[A-Z0-9_"]+ ALTER COLUMN/.test(head)) { files.schema.push(body); continue; } // SET DEFAULT nextval — idempotent
  if (/^ALTER TABLE (ONLY )?PUBLIC\.[A-Z0-9_"]+ ADD CONSTRAINT/.test(head)) {
    if (/FOREIGN KEY/i.test(body)) counts.fk++; else counts.constraint++;
    files.constraints.push(guardConstraint(body)); continue;
  }
  if (/^CREATE (UNIQUE )?INDEX /.test(head)) {
    counts.index++;
    files.constraints.push(body.replace(/^CREATE INDEX /, 'CREATE INDEX IF NOT EXISTS ').replace(/^CREATE UNIQUE INDEX /, 'CREATE UNIQUE INDEX IF NOT EXISTS '));
    continue;
  }
  if (/ENABLE ROW LEVEL SECURITY/.test(head)) { counts.rls++; files.security.push(body); continue; }
  if (/^CREATE POLICY /.test(head)) { counts.policy++; files.security.push(dropBeforePolicy(body)); continue; }
  if (/^CREATE TRIGGER /.test(head)) { counts.trigger++; files.security.push(dropBeforeTrigger(body)); continue; }
  if (/^(GRANT |REVOKE )/.test(head)) { counts.grant++; files.security.push(body); continue; }
  if (/^COMMENT ON /.test(head)) {
    counts.comment++;
    if (/^COMMENT ON (POLICY)/.test(head)) files.security.push(body);
    else if (/^COMMENT ON (CONSTRAINT|INDEX)/.test(head)) files.constraints.push(body);
    else files.schema.push(body);
    continue;
  }
  if (/^ALTER TABLE .* OWNER TO /.test(head)) { counts.dropped++; continue; }
  if (/^ALTER DEFAULT PRIVILEGES/.test(head)) { counts.dropped++; continue; }  // Supabase platform defaults (not NextBlock schema; supabase_admin-owned)
  // Anything unrecognized: keep in schema verbatim so nothing is silently lost, and flag it.
  files.schema.push(body);
  console.error('UNCLASSIFIED (kept in schema):', head);
}

files.security.push(AUTH_TRIGGER);

// --- seed transform -----------------------------------------------------------
const seed = [];
for (const raw of splitStatements(dataSql)) {
  const body = stripLead(raw);
  if (!body) continue;
  const head = body.replace(/\s+/g, ' ').toUpperCase();
  if (/^SET /.test(body) || /^SELECT PG_CATALOG\.SET_CONFIG/.test(head)) { continue; }
  if (/SETVAL\(/.test(head)) { const s = idempotentSetval(body); if (s) seed.push(s); continue; }
  if (/^INSERT INTO PUBLIC\.SITE_SETTINGS/.test(head) && /'IS_ADMIN_CREATED'/.test(head)) {
    seed.push(`INSERT INTO public.site_settings (key, value) VALUES ('is_admin_created', 'false') ON CONFLICT DO NOTHING;`);
    continue;
  }
  if (/^INSERT INTO PUBLIC\.SYSTEM_CONFIGURATION/.test(head)) {
    seed.push(`INSERT INTO public.system_configuration (id, auto_accept_signups, settings) VALUES (1, false, '{}'::jsonb) ON CONFLICT DO NOTHING;`);
    continue;
  }
  if (/^INSERT INTO /.test(head)) { seed.push(body); continue; }
  // ignore anything else (comments already stripped)
}

// --- write files --------------------------------------------------------------
rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });
const banner = (title) => `-- AUTO-GENERATED baseline (re-baseline of migrations 000..044). Idempotent; safe to replay.\n-- ${title}\n-- Regenerate via tools/scripts/rebaseline-transform.mjs. Do not hand-edit.\n\n`;

const f0 = `${banner('00 · schema: enums, functions, tables, sequences, defaults')}SET check_function_bodies = false;\n\n${files.schema.join('\n\n')}\n`;
const f1 = `${banner('01 · constraints (PK / unique / check / FK) + indexes')}${files.constraints.join('\n\n')}\n`;
const f2 = `${banner('02 · row-level security, policies, triggers, grants')}${files.security.join('\n\n')}\n`;
const f3 = `${banner('03 · seed: canonical NextBlock demo content (no users, no secrets)')}${seed.join('\n')}\n`;

writeFileSync(path.join(outDir, '00000000000000_baseline_schema.sql'), f0);
writeFileSync(path.join(outDir, '00000000000001_baseline_constraints_and_indexes.sql'), f1);
writeFileSync(path.join(outDir, '00000000000002_baseline_security_and_grants.sql'), f2);
writeFileSync(path.join(outDir, '00000000000003_baseline_seed.sql'), f3);

console.log('== object counts (from schema dump) ==');
console.log(JSON.stringify(counts, null, 0));
console.log('seed INSERTs:', seed.filter((s) => s.startsWith('INSERT')).length, '| setvals kept:', seed.filter((s) => s.includes('setval')).length);
console.log('file sizes (lines):', [f0, f1, f2, f3].map((f) => f.split('\n').length).join(', '));
