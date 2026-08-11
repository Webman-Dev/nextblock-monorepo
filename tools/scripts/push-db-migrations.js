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

  // Only the link step needs an access token, and the check path no longer links.
  const willLink = !args.has('--skip-link') && !args.has('--check') && !args.has('--dry-run');

  if (!process.env.SUPABASE_ACCESS_TOKEN && willLink) {
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
  const { allowFailure = false, echoStdout = true, ...spawnOptions } = options;
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
    ...spawnOptions,
  });

  if (capture) {
    if (result.stdout && echoStdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
  }

  if (result.error) {
    if (allowFailure) {
      return { failed: true, output: '' };
    }
    log(result.error.message, colors.red);
    process.exit(1);
  }

  const output = `${result.stdout || ''}${result.stderr || ''}`;

  if (result.status !== 0) {
    if (allowFailure) {
      return { failed: true, output };
    }
    process.exit(result.status || 1);
  }

  return allowFailure ? { failed: false, output } : output;
}

function supabase(commandArgs, options = {}) {
  return run(npxBin, ['supabase', ...commandArgs], options);
}

function getMigrationVersion(fileName) {
  return fileName.split('_')[0];
}

function isHistoricalBaselineMigration(fileName) {
  const version = getMigrationVersion(fileName);
  return version >= baselineRepairFirstVersion && version <= baselineRepairLastVersion;
}

function readLocalMigrationFiles() {
  const dir = path.join(workdir, 'supabase/migrations');

  if (!fs.existsSync(dir)) {
    return [];
  }

  return fs
    .readdirSync(dir)
    .filter((name) => /^\d{14}_.*\.sql$/.test(name))
    .sort();
}

const VERSION_PATTERN = /^\d{14}$/;

/**
 * Parse `supabase migration list` into local/remote sets.
 *
 * Output is a three-column table (Local | Remote | Time). A row with only a Local
 * value is a migration file that has never been applied; a row with only a Remote
 * value is a history entry with no file behind it.
 */
function parseMigrationList(output) {
  const pending = [];
  const applied = [];
  const remoteOnly = [];

  for (const line of output.split('\n')) {
    if (!line.includes('|')) {
      continue;
    }

    const cells = line.split('|').map((cell) => cell.trim());

    if (cells.length < 2) {
      continue;
    }

    const hasLocal = VERSION_PATTERN.test(cells[0]);
    const hasRemote = VERSION_PATTERN.test(cells[1]);

    if (hasLocal && hasRemote) {
      applied.push(cells[0]);
    } else if (hasLocal) {
      pending.push(cells[0]);
    } else if (hasRemote) {
      remoteOnly.push(cells[1]);
    }
  }

  return { applied, pending, remoteOnly };
}

/**
 * Ask the remote database which migrations it has already recorded.
 *
 * `supabase migration list` is a pure read. It deliberately replaces the older
 * `link` + `db push --dry-run` probe: `link` writes project state and, on 2026-08-10,
 * that probe applied migration 00000000000017 to production while printing
 * "DRY RUN: migrations will *not* be pushed". A command named `check` must not be
 * able to change anything, so the check path now runs only this.
 */
function readMigrationStatus(dbPassword, { allowFailure = false } = {}) {
  const result = supabase(
    ['migration', 'list', '--workdir', workdir, '--password', dbPassword],
    { allowFailure, capture: true, echoStdout: false },
  );

  const output = allowFailure ? result.output : result;

  if (allowFailure && result.failed) {
    return null;
  }

  return parseMigrationList(output);
}

function describeVersion(version, localFiles) {
  const match = localFiles.find((file) => getMigrationVersion(file) === version);
  return match || `${version} (no local file)`;
}

function reportMigrationStatus(status, localFiles) {
  log('');

  if (status.pending.length === 0) {
    log('Pending migrations: 0 — the remote database already has every local migration.', colors.green);
  } else {
    log(`Pending migrations: ${status.pending.length}`, colors.yellow);
    for (const version of status.pending) {
      log(`  - ${describeVersion(version, localFiles)}`, colors.yellow);
    }
  }

  log(`Already applied: ${status.applied.length}`, colors.dim);

  if (status.remoteOnly.length > 0) {
    log('');
    log(
      `WARNING: ${status.remoteOnly.length} version(s) are recorded remotely with no local file:`,
      colors.red,
    );
    for (const version of status.remoteOnly) {
      log(`  - ${version}`, colors.red);
    }
    log(
      'A new migration file reusing one of those versions would be skipped silently.',
      colors.yellow,
    );
  }

  // Supabase matches history by version only and never by content, so a file whose
  // version is already recorded never runs — no error, no output, just silence.
  // Surfacing this is the whole point of printing the pending list.
  if (status.pending.length === 0 && localFiles.length > 0) {
    log('');
    log(
      'If you just added a migration and expected it here, its version is already in the remote history.',
      colors.yellow,
    );
    log(
      'Supabase matches migrations by version only (never by content), so that file will never run.',
      colors.yellow,
    );
    log('Renumber it above the highest recorded version and re-run this check.', colors.yellow);
  }
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

  const localFiles = readLocalMigrationFiles();

  log(isCheck ? 'Supabase migration check (read-only)' : 'Supabase migration-only push', colors.green);
  log(`Target project: ${process.env.SUPABASE_PROJECT_ID}`, colors.dim);
  log(
    isCheck
      ? 'This only reads the remote migration history. It links nothing, pushes nothing, and cannot change the database.'
      : 'This applies pending migration files only. It does not reset data, seed sandbox media, deploy functions, or push Supabase config.',
    colors.dim,
  );

  if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
    log(
      'NEXT_PUBLIC_IS_SANDBOX=true: you are targeting a sandbox-flavored environment.',
      colors.yellow,
    );
  }

  // The check path never links. `supabase link` writes project state, and it is one of
  // the two candidates for the 2026-08-10 incident where `--check` applied a migration
  // to production. Reading the history needs an existing link, so an unlinked repo is
  // told to link explicitly rather than having it done silently underneath a "check".
  if (isCheck) {
    const status = readMigrationStatus(dbPassword, { allowFailure: true });

    if (!status) {
      log('');
      log('Could not read the remote migration history.', colors.red);
      log(
        'If this project has never been linked, run `npx supabase link --project-ref <ref> --workdir libs/db/src` once.',
        colors.yellow,
      );
      log(
        'The check deliberately does not link for you, because linking changes local project state.',
        colors.yellow,
      );
      process.exit(1);
    }

    reportMigrationStatus(status, localFiles);
    log('');
    log('Check complete. Nothing was written — this ran a read-only history query.', colors.green);
    log('Apply the pending list above with `npm run db:migrate`.', colors.dim);
    return;
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

  // Compute the guard input from the history read rather than by regex-scraping
  // `db push --dry-run` output. Same reason as above, plus it is simply more reliable.
  const status = readMigrationStatus(dbPassword);
  reportMigrationStatus(status, localFiles);

  const pendingMigrations = status.pending.map((version) => describeVersion(version, localFiles));

  if (pendingMigrations.length === 0) {
    log('');
    log('Nothing to apply.', colors.green);
    return;
  }

  if (!confirmed) {
    log('');
    log('Refusing to apply migrations without --confirm.', colors.red);
    log('Run `npm run db:migrate:check` first, then `npm run db:migrate` when the pending list looks right.', colors.yellow);
    process.exit(1);
  }

  const pendingHistoricalBaseline = pendingMigrations.filter(isHistoricalBaselineMigration);

  if (pendingHistoricalBaseline.length > 0 && !allowBaselineReplay) {
    log('Refusing to replay historical baseline migrations on this database.', colors.red);
    log(
      `The pending list includes ${pendingHistoricalBaseline.length} baseline migration(s) from ${baselineRepairFirstVersion} through ${baselineRepairLastVersion}.`,
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

// Pure helpers are exported for tests; `main()` runs only on direct execution so
// requiring this file never touches a database.
module.exports = { getMigrationVersion, isHistoricalBaselineMigration, parseMigrationList };

if (require.main === module) {
  main();
}
