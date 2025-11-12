#!/usr/bin/env node
'use strict';

/**
 * Runs `supabase link` using credentials provided via environment variables.
 * Allows npm scripts to stay cross-platform since the Supabase CLI arguments
 * include secrets we don't want to inline.
 */

const { spawnSync } = require('node:child_process');

const { SUPABASE_PROJECT_ID, POSTGRES_PASSWORD } = process.env;

if (!SUPABASE_PROJECT_ID) {
  console.error('Missing SUPABASE_PROJECT_ID environment variable.');
  process.exit(1);
}

if (!POSTGRES_PASSWORD) {
  console.error('Missing POSTGRES_PASSWORD environment variable.');
  process.exit(1);
}

const isWindows = process.platform === 'win32';
const cmd = isWindows ? 'npx.cmd' : 'npx';
const args = [
  'supabase',
  'link',
  '--project-ref',
  SUPABASE_PROJECT_ID,
  '--password',
  POSTGRES_PASSWORD,
  '--workdir',
  'libs/db/src',
];

const result = spawnSync(cmd, args, {
  stdio: 'inherit',
  shell: isWindows,
});

if (result.error) {
  console.error(result.error.message);
}

process.exit(result.status ?? 1);
