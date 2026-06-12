#!/usr/bin/env node
// Zero-dependency Docker setup for a standalone NextBlock project. Runs via `npm run docker:setup`
// (and is invoked automatically when you pick Docker mode in `npm create nextblock`). Uses only
// Node built-ins so it works before any host `npm install`.
//
// Self-hosted Supabase (GoTrue + PostgREST) validates REAL HS256 JWTs, so we generate a JWT
// secret and derive properly-signed anon/service_role keys from it — a random string is not a
// usable key. Then it writes .env and boots the stack via docker compose.

import { randomBytes, createHmac } from 'node:crypto';
import { readFile, writeFile, access } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawn, spawnSync } from 'node:child_process';
import { createInterface } from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';

const __dirname = dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = resolve(__dirname, '..');
const ENV_PATH = resolve(PROJECT_ROOT, '.env');

const TURNSTILE_TEST_SITE_KEY = '1x00000000000000000000AA';
const TURNSTILE_TEST_SECRET_KEY = '1x0000000000000000000000000000000AA';

const generateSecret = () => randomBytes(32).toString('hex');
const base64url = (value) =>
  Buffer.from(value).toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');

function signJwtHS256(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  return `${data}.${base64url(createHmac('sha256', secret).update(data).digest())}`;
}

function generateSupabaseKeys() {
  const jwtSecret = generateSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 365 * 10;
  return {
    jwtSecret,
    anonKey: signJwtHS256({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret),
    serviceRoleKey: signJwtHS256({ role: 'service_role', iss: 'supabase', iat, exp }, jwtSecret),
  };
}

function readEnvValue(content, key) {
  for (const line of content.split(/\r?\n/)) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1).trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return '';
}

function upsertEnv(content, replacements) {
  const applied = new Set();
  const lines = content.split(/\r?\n/).map((line) => {
    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(`${key}=`)) {
        applied.add(key);
        return value;
      }
    }
    return line;
  });
  for (const [key, value] of Object.entries(replacements)) {
    if (!applied.has(key)) lines.push(value);
  }
  return lines.join('\n');
}

const pathExists = async (p) => {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
};

const commandWorks = (cmd, args) => spawnSync(cmd, args, { stdio: 'ignore' }).status === 0;

function detectCompose() {
  if (commandWorks('docker', ['compose', 'version'])) return { cmd: 'docker', args: ['compose'] };
  if (commandWorks('docker-compose', ['version'])) return { cmd: 'docker-compose', args: [] };
  return null;
}

const run = (cmd, args, opts = {}) =>
  new Promise((res, rej) => {
    const child = spawn(cmd, args, {
      stdio: 'inherit',
      shell: process.platform === 'win32',
      ...opts,
    });
    child.on('error', rej);
    child.on('close', (code) => (code === 0 ? res() : rej(new Error(`${cmd} exited with ${code}`))));
  });

async function main() {
  console.log('🐳 NextBlock — Local Self-Hosted Docker Setup\n');

  if (!commandWorks('docker', ['info'])) {
    console.error('✗ Docker is not installed or not running. Start Docker Desktop, then re-run `npm run docker:setup`.');
    process.exit(1);
  }
  const compose = detectCompose();
  if (!compose) {
    console.error('✗ Docker Compose not found. Update Docker Desktop or install the Compose plugin.');
    process.exit(1);
  }

  const rl = createInterface({ input, output });
  const ask = async (q, def = '') => (await rl.question(q)).trim() || def;

  console.log('Optional integrations (press Enter to skip):');
  let turnstileSiteKey = await ask('  Cloudflare Turnstile Site Key (Enter = sandbox test keys): ');
  let turnstileSecretKey = '';
  if (turnstileSiteKey) {
    turnstileSecretKey = await ask('  Cloudflare Turnstile Secret Key: ');
  } else {
    turnstileSiteKey = TURNSTILE_TEST_SITE_KEY;
    turnstileSecretKey = TURNSTILE_TEST_SECRET_KEY;
    console.log('  → Using Cloudflare Turnstile test keys (always pass).');
  }

  const smtp = { host: await ask('  SMTP Host (Enter = no email, auto-confirm sign-ups): '), port: '', user: '', pass: '', fromEmail: '', fromName: '' };
  let mailerAutoconfirm = 'true';
  if (smtp.host) {
    smtp.port = await ask('  SMTP Port (465 = SSL, 587 = STARTTLS): ', '587');
    smtp.user = await ask('  SMTP User: ');
    smtp.pass = await ask('  SMTP Password: ');
    smtp.fromEmail = await ask('  From Email: ');
    smtp.fromName = await ask('  From Name: ', 'NextBlock');
    mailerAutoconfirm = 'false';
  } else {
    console.log('  → No SMTP: new accounts auto-confirm so your first admin can sign in immediately.');
  }
  rl.close();

  let existing = '';
  if (await pathExists(ENV_PATH)) {
    existing = await readFile(ENV_PATH, 'utf8');
    console.log('\n✓ Found existing .env — reusing previously generated secrets where present.');
  }
  const reuse = (key, gen) => readEnvValue(existing, key) || gen();

  const postgresPassword = reuse('POSTGRES_PASSWORD', generateSecret);
  let jwtSecret = readEnvValue(existing, 'JWT_SECRET');
  let anonKey = readEnvValue(existing, 'ANON_KEY');
  let serviceRoleKey = readEnvValue(existing, 'SERVICE_ROLE_KEY');
  if (!jwtSecret || !anonKey || !serviceRoleKey) {
    ({ jwtSecret, anonKey, serviceRoleKey } = generateSupabaseKeys());
  }
  const cronSecret = reuse('CRON_SECRET', generateSecret);
  const draftSecret = reuse('DRAFT_MODE_SECRET', generateSecret);
  const revalidateSecret = reuse('REVALIDATE_SECRET_TOKEN', generateSecret);
  const minioUser = readEnvValue(existing, 'MINIO_ROOT_USER') || 'nextblock';
  const minioPassword = reuse('MINIO_ROOT_PASSWORD', generateSecret);
  const bucket = readEnvValue(existing, 'STORAGE_BUCKET') || 'nextblock';

  const replacements = {
    POSTGRES_PASSWORD: `POSTGRES_PASSWORD=${postgresPassword}`,
    POSTGRES_DB: 'POSTGRES_DB=postgres',
    JWT_SECRET: `JWT_SECRET=${jwtSecret}`,
    JWT_EXP: 'JWT_EXP=3600',
    ANON_KEY: `ANON_KEY=${anonKey}`,
    SERVICE_ROLE_KEY: `SERVICE_ROLE_KEY=${serviceRoleKey}`,
    NEXT_PUBLIC_SUPABASE_URL: 'NEXT_PUBLIC_SUPABASE_URL=http://localhost:8000',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: `NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`,
    SUPABASE_SERVICE_ROLE_KEY: `SUPABASE_SERVICE_ROLE_KEY=${serviceRoleKey}`,
    API_EXTERNAL_URL: 'API_EXTERNAL_URL=http://localhost:8000',
    SITE_URL: 'SITE_URL=http://localhost:3000',
    NEXT_PUBLIC_URL: 'NEXT_PUBLIC_URL=http://localhost:3000',
    NEXT_PUBLIC_IS_SANDBOX: 'NEXT_PUBLIC_IS_SANDBOX=true',
    CRON_SECRET: `CRON_SECRET=${cronSecret}`,
    DRAFT_MODE_SECRET: `DRAFT_MODE_SECRET=${draftSecret}`,
    REVALIDATE_SECRET_TOKEN: `REVALIDATE_SECRET_TOKEN=${revalidateSecret}`,
    MINIO_ROOT_USER: `MINIO_ROOT_USER=${minioUser}`,
    MINIO_ROOT_PASSWORD: `MINIO_ROOT_PASSWORD=${minioPassword}`,
    STORAGE_BUCKET: `STORAGE_BUCKET=${bucket}`,
    R2_ACCOUNT_ID: 'R2_ACCOUNT_ID=minio',
    R2_REGION: 'R2_REGION=us-east-1',
    R2_S3_ENDPOINT: 'R2_S3_ENDPOINT=http://minio:9000',
    R2_S3_PUBLIC_ENDPOINT: 'R2_S3_PUBLIC_ENDPOINT=http://localhost:9000',
    R2_FORCE_PATH_STYLE: 'R2_FORCE_PATH_STYLE=true',
    NEXT_PUBLIC_R2_BASE_URL: `NEXT_PUBLIC_R2_BASE_URL=http://localhost:9000/${bucket}`,
    NEXT_PUBLIC_R2_PUBLIC_URL: `NEXT_PUBLIC_R2_PUBLIC_URL=http://localhost:9000/${bucket}`,
    NEXT_PUBLIC_TURNSTILE_SITE_KEY: `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileSiteKey}`,
    TURNSTILE_SECRET_KEY: `TURNSTILE_SECRET_KEY=${turnstileSecretKey}`,
    GOTRUE_MAILER_AUTOCONFIRM: `GOTRUE_MAILER_AUTOCONFIRM=${mailerAutoconfirm}`,
    SMTP_HOST: `SMTP_HOST=${smtp.host}`,
    SMTP_PORT: `SMTP_PORT=${smtp.port}`,
    SMTP_USER: `SMTP_USER=${smtp.user}`,
    SMTP_PASS: `SMTP_PASS=${smtp.pass}`,
    SMTP_FROM_EMAIL: `SMTP_FROM_EMAIL=${smtp.fromEmail}`,
    SMTP_FROM_NAME: `SMTP_FROM_NAME=${smtp.fromName}`,
  };

  const seed = existing || '# Generated by `npm run docker:setup` — local self-hosted secrets. Do not commit.\n';
  let nextEnv = upsertEnv(seed, replacements);
  if (!nextEnv.endsWith('\n')) nextEnv += '\n';
  await writeFile(ENV_PATH, nextEnv, 'utf8');
  console.log('✓ Wrote .env (Postgres, JWT secret + signed anon/service keys, MinIO, app secrets).\n');

  console.log('Building and starting the stack (first run pulls images + builds the app — a few minutes)...');
  await run(compose.cmd, [...compose.args, 'up', '-d', '--build'], { cwd: PROJECT_ROOT });

  console.log('\n🎉 Stack is up!');
  console.log('  1. Open the app:    http://localhost:3000');
  console.log('  2. Create account:  http://localhost:3000/sign-up  (first sign-up becomes ADMIN)');
  console.log(
    mailerAutoconfirm === 'true'
      ? '     No SMTP → your account is auto-confirmed; just sign in.'
      : '     Click the confirmation link emailed by your SMTP provider.',
  );
  console.log('  3. Supabase API:    http://localhost:8000    MinIO console: http://localhost:9001');
  const composeStr = `${compose.cmd} ${compose.args.join(' ')}`.trim();
  console.log(`\n  Logs: ${composeStr} logs -f nextblock-cms   |   Stop: ${composeStr} down   (add -v to wipe data)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
