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
const npxBin = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const args = new Set(process.argv.slice(2));
const baselineRepairFirstVersion = '00000000000000';
// Re-baseline (2026-07): migrations 000..044 were squashed into the idempotent baseline
// 000..003. That range is the non-replayable baseline; 004+ are normal forward migrations.
const baselineRepairLastVersion = '00000000000003';

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

  if (!process.env.SUPABASE_ACCESS_TOKEN && !args.has('--skip-link')) {
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

function run(command, commandArgs, options = {}) {
  const printable = [command, ...commandArgs.map((arg) => {
    if (arg === getDbPassword()) {
      return '<db-password>';
    }
    return arg.includes(' ') ? `"${arg}"` : arg;
  })].join(' ');

  log(`Running: ${printable}`, colors.blue);
  const capture = options.capture === true;
  const result = spawnSync(command, commandArgs, {
    cwd: repoRoot,
    env: process.env,
    shell: process.platform === 'win32',
    stdio: capture ? 'pipe' : 'inherit',
    encoding: capture ? 'utf8' : undefined,
    ...options,
  });

  if (capture) {
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (result.error) {
    log(result.error.message, colors.red);
    process.exit(1);
  }

  if (result.status !== 0) {
    process.exit(result.status || 1);
  }

  return `${result.stdout || ''}${result.stderr || ''}`;
}

function supabase(commandArgs, options = {}) {
  return run(npxBin, ['supabase', ...commandArgs], options);
}

function parsePendingMigrations(output) {
  const matches = output.match(/\b\d{14}_[^\s]+\.sql\b/g);
  return Array.from(new Set(matches || []));
}

function getMigrationVersion(fileName) {
  return fileName.split('_')[0];
}

function isHistoricalBaselineMigration(fileName) {
  const version = getMigrationVersion(fileName);
  return version >= baselineRepairFirstVersion && version <= baselineRepairLastVersion;
}

function main() {
  loadEnvFiles();
  requireEnv();

  const dbPassword = getDbPassword();
  const isCheck = args.has('--check') || args.has('--dry-run');
  const confirmed =
    args.has('--confirm') ||
    process.env.CI === 'true' ||
    process.env.CONFIRM_DB_MIGRATION === 'true';
  const allowBaselineReplay = args.has('--allow-baseline-replay');

  log('Supabase migration-only push', colors.green);
  log(`Target project: ${process.env.SUPABASE_PROJECT_ID}`, colors.dim);
  log(
    'This applies pending migration files only. It does not reset data, seed sandbox media, deploy functions, or push Supabase config.',
    colors.dim,
  );

  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    log(
      'NEXT_PUBLIC_IS_SANDBOX=true: you are targeting a sandbox-flavored environment.',
      colors.yellow,
    );
  }

  if (!args.has('--skip-link')) {
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
  }

  const pushArgs = [
    'db',
    'push',
    '--workdir',
    workdir,
    '--password',
    dbPassword,
    '--yes',
  ];

  const dryRunOutput = supabase([...pushArgs, '--dry-run'], { capture: true });
  const pendingMigrations = parsePendingMigrations(dryRunOutput);

  if (isCheck) {
    log('Dry run complete. No database changes were applied.', colors.green);
    return;
  }

  if (!confirmed) {
    log('Refusing to apply migrations without --confirm.', colors.red);
    log('Run `npm run db:migrate:check` first, then `npm run db:migrate` when the pending list looks right.', colors.yellow);
    process.exit(1);
  }

  const pendingHistoricalBaseline = pendingMigrations.filter(isHistoricalBaselineMigration);

  if (pendingHistoricalBaseline.length > 0 && !allowBaselineReplay) {
    log('Refusing to replay historical baseline migrations on this database.', colors.red);
    log(
      `The dry run includes ${pendingHistoricalBaseline.length} baseline migration(s) from ${baselineRepairFirstVersion} through ${baselineRepairLastVersion}.`,
      colors.yellow,
    );
    log(
      'If this is an existing production database, repair the migration history first with `npm run db:migrate:repair-history`.',
      colors.yellow,
    );
    log(
      'If this is a brand-new empty database, use `npm run db:migrate:fresh` instead.',
      colors.yellow,
    );
    process.exit(1);
  }

  supabase(pushArgs);
  log('Database migrations applied without running a reset or sandbox seed.', colors.green);
}

main();
