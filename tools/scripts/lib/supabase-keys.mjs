// Shared helpers for the self-hosted Docker setup (`npm run docker:setup`).
//
// Self-hosted Supabase (GoTrue + PostgREST) validates REAL HS256 JWTs — a random hex string is
// not a usable anon/service_role key. So we generate a JWT secret with crypto.randomBytes and
// derive properly-signed anon and service_role JWTs from it, exactly like Supabase Cloud does.
// Implemented with Node's built-in crypto — no extra dependency.

import { createHmac, randomBytes } from 'node:crypto';

/** 64-char (32-byte) hex secret. Used for CRON/DRAFT/REVALIDATE and the Postgres password. */
export function generateSecret() {
  return randomBytes(32).toString('hex');
}

function base64url(input) {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

/** Sign a payload as a compact HS256 JWT. */
export function signJwtHS256(payload, secret) {
  const header = base64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const signature = base64url(createHmac('sha256', secret).update(data).digest());
  return `${data}.${signature}`;
}

/**
 * Generate a JWT secret plus the matching anon + service_role keys for a self-hosted stack.
 * GoTrue requires the secret to be at least 32 characters; 32 random bytes hex-encoded is 64.
 */
export function generateSupabaseKeys() {
  const jwtSecret = generateSecret();
  const iat = Math.floor(Date.now() / 1000);
  const exp = iat + 60 * 60 * 24 * 365 * 10; // 10 years — long-lived local sandbox keys.

  const anonKey = signJwtHS256({ role: 'anon', iss: 'supabase', iat, exp }, jwtSecret);
  const serviceRoleKey = signJwtHS256(
    { role: 'service_role', iss: 'supabase', iat, exp },
    jwtSecret,
  );

  return { jwtSecret, anonKey, serviceRoleKey };
}

/** Read a `KEY=` value from an .env body (tolerates surrounding quotes). */
export function readEnvValue(envContent, key) {
  for (const line of envContent.split(/\r?\n/)) {
    if (line.startsWith(`${key}=`)) {
      return line.slice(key.length + 1).trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return '';
}

/**
 * Apply `KEY=value` replacements to an .env body line-by-line, appending any keys that are not
 * already present. `replacements` is a plain object of { KEY: 'KEY=value' } (matching the
 * existing setup.mjs convention so the two stay readable side-by-side).
 */
export function upsertEnv(envContent, replacements) {
  const appliedKeys = new Set();
  const lines = envContent.split(/\r?\n/).map((line) => {
    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(`${key}=`)) {
        appliedKeys.add(key);
        return value;
      }
    }
    return line;
  });

  for (const [key, value] of Object.entries(replacements)) {
    if (!appliedKeys.has(key)) {
      lines.push(value);
    }
  }

  return lines.join('\n');
}
