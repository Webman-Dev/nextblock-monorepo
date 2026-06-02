const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
  dim: '\x1b[2m',
};

const repoRoot = path.resolve(__dirname, '../..');
const workdir = path.join(repoRoot, 'libs/db/src');
const migrationsDir = path.join(workdir, 'supabase/migrations');
const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = new Set(process.argv.slice(2));
const baselineRepairFirstVersion = '00000000000000';
const baselineRepairLastVersion = '00000000000022';

function log(message, color = colors.reset) {
  console.log(`${color}${message}${colors.reset}`);
}

function loadEnvFiles() {
  for (const envPath of [
    path.join(repoRoot, '.env.local'),
    path.join(repoRoot, '.env'),
  ]) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true });
    }
  }
}

function getDbPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) {
    return process.env.SUPABASE_DB_PASSWORD;
  }

  if (process.env.POSTGRES_PASSWORD) {
    return process.env.POSTGRES_PASSWORD.replace(/^"(.*)"$/, '$1');
  }

  for (const key of ['POSTGRES_URL', 'DATABASE_URL']) {
    const value = process.env[key];
    if (!value) {
      continue;
    }

    try {
      const url = new URL(value);
      return decodeURIComponent(url.password);
    } catch {
      // Ignore malformed URLs; the missing env check will explain the issue.
    }
  }

  return null;
}

function requireEnv() {
  const missing = [];

  if (!process.env.SUPABASE_PROJECT_ID) {
    missing.push('SUPABASE_PROJECT_ID');
  }
  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    missing.push('SUPABASE_ACCESS_TOKEN');
  }
  if (!getDbPassword()) {
    missing.push('SUPABASE_DB_PASSWORD, POSTGRES_PASSWORD, POSTGRES_URL, or DATABASE_URL');
  }

  if (missing.length > 0) {
    log(`Missing required environment variables: ${missing.join(', ')}`, colors.red);
    process.exit(1);
  }
}

function run(command, commandArgs) {
  const dbPassword = getDbPassword();
  const printable = [command, ...commandArgs.map((arg) => {
    if (arg === dbPassword) {
      return '<db-password>';
    }
    return arg.includes(' ') ? `"${arg}"` : arg;
  })].join(' ');

  log(`Running: ${printable}`, colors.blue);
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: 'inherit',
  });

  if (result.error) {
    log(result.error.message, colors.red);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }
}

function supabase(commandArgs) {
  run(npxBin, ['supabase', ...commandArgs]);
}

function getBaselineVersions() {
  return fs
    .readdirSync(migrationsDir)
    .filter((fileName) => /^\d{14}_.*\.sql$/.test(fileName))
    .map((fileName) => fileName.split('_')[0])
    .filter((version) => version >= baselineRepairFirstVersion && version <= baselineRepairLastVersion)
    .sort();
}

function main() {
  loadEnvFiles();
  requireEnv();

  const dbPassword = getDbPassword();
  const baselineVersions = getBaselineVersions();
  const confirmed =
    args.has('--confirm') ||
    process.env.CI === 'true' ||
    process.env.CONFIRM_DB_MIGRATION_REPAIR === 'true';

  log('Supabase migration history repair', colors.green);
  log(`Target project: ${process.env.SUPABASE_PROJECT_ID}`, colors.dim);
  log(
    `This marks existing baseline migrations from ${baselineRepairFirstVersion} through ${baselineRepairLastVersion} as applied. It does not run migration SQL.`,
    colors.dim,
  );
  log(`Versions: ${baselineVersions.join(', ')}`, colors.dim);

  if (args.has('--check') || !confirmed) {
    if (!confirmed) {
      log('Dry run only. Add --confirm or run `npm run db:migrate:repair-history` to update migration history.', colors.yellow);
    }
    return;
  }

  supabase([
    'link',
    '--project-ref',
    process.env.SUPABASE_PROJECT_ID,
    '--password',
    dbPassword,
    '--workdir',
    workdir,
    '--yes',
  ]);

  supabase([
    'migration',
    'repair',
    ...baselineVersions,
    '--status',
    'applied',
    '--password',
    dbPassword,
    '--workdir',
    workdir,
    '--yes',
  ]);

  log('Migration history repaired. Run `npm run db:migrate:check` next.', colors.green);
}

main();
