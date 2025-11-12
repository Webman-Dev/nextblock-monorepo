// apps/nextblock/scripts/restore.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

function createPrefixSuppressor(regexes, label) {
  return (line) => {
    for (const regex of regexes) {
      if (regex.test(line)) {
        return label;
      }
    }
    return null;
  };
}

const stdoutSuppressors = [
  createPrefixSuppressor([/^SET\b/i, /^RESET\b/i], 'SET/RESET statements'),
  createPrefixSuppressor([/^CREATE\b/i], 'CREATE statements'),
  createPrefixSuppressor([/^ALTER\b/i], 'ALTER statements'),
  createPrefixSuppressor([/^DROP\b/i], 'DROP statements'),
  createPrefixSuppressor([/^COMMENT\b/i], 'COMMENT statements'),
  createPrefixSuppressor([/^GRANT\b/i], 'GRANT statements'),
  createPrefixSuppressor([/^REVOKE\b/i], 'REVOKE statements'),
  createPrefixSuppressor([/^COPY\b/i], 'COPY statements'),
  createPrefixSuppressor([/^SELECT\s+pg_catalog\.setval/i, /^\s*setval\b/i], 'setval outputs'),
  createPrefixSuppressor([/^\(\d+\s+rows?\)$/i, /^\(1 row\)$/i], 'row count outputs'),
  createPrefixSuppressor([/^\s*set_config\b/i], 'set_config outputs'),
  createPrefixSuppressor([/^\s*-{3,}\s*$/], 'table separators'),
  createPrefixSuppressor([/^\s*\d+\s*$/], 'numeric result lines'),
];

function extractMultiplier(line) {
  const match = line.match(/\sx(\d+)$/i);
  return match ? parseInt(match[1], 10) : 1;
}

function createDuplicateCollapser(outputFn, options = {}) {
  const suppressors = options.suppressors || [];
  const suppressedCounts = new Map();
  let buffer = '';
  let lastLine = null;
  let repeatCount = 0;
  let finished = false;

  const flush = () => {
    if (lastLine === null) {
      return;
    }
    const baseLine = lastLine;
    const multiplier = extractMultiplier(baseLine);
    const occurrences = repeatCount * multiplier;

    for (const suppressor of suppressors) {
      const label = suppressor(baseLine);
      if (label) {
        suppressedCounts.set(label, (suppressedCounts.get(label) || 0) + occurrences);
        lastLine = null;
        repeatCount = 0;
        return;
      }
    }

    const line =
      repeatCount > 1 ? `${baseLine} x${repeatCount}` : baseLine;
    outputFn(line);
    lastLine = null;
    repeatCount = 0;
  };

  const handleLine = (line) => {
    const normalized = line.replace(/\r$/, '');
    if (!normalized.trim()) {
      return;
    }
    if (lastLine === null) {
      lastLine = normalized;
      repeatCount = 1;
      return;
    }
    if (normalized === lastLine) {
      repeatCount += 1;
      return;
    }
    flush();
    lastLine = normalized;
    repeatCount = 1;
  };

  return {
    write(chunk) {
      if (finished) {
        return;
      }
      buffer += chunk.toString();
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        handleLine(line);
        buffer = buffer.slice(newlineIndex + 1);
      }
    },
    finish() {
      if (finished) {
        return suppressedCounts;
      }
      if (buffer.length > 0) {
        handleLine(buffer);
        buffer = '';
      }
      flush();
      finished = true;
      return suppressedCounts;
    },
  };
}

function createErrorFilter(outputFn) {
  let buffer = '';
  const suppressedCounts = new Map();
  let finished = false;

  const ignorePatterns = [
    {
      regex: /ERROR:\s+permission denied to change default privileges/i,
      label: 'permission denied to change default privileges',
    },
    {
      regex: /ERROR:\s+Non-superuser owned event trigger must execute a non-superuser owned function/i,
      label: 'event trigger requires non-superuser function',
    },
    {
      regex: /DETAIL:\s+The current user "postgres" is not a superuser and the function "extensions\.[^"]+" is owned by a superuser/i,
    },
    {
      regex: /ERROR:\s+cannot drop function/i,
      label: 'function drop dependency issues',
    },
    {
      regex: /ERROR:\s+cannot drop schema/i,
      label: 'schema drop dependency issues',
    },
    {
      regex: /ERROR:\s+schema "[^"]+" already exists/i,
      label: 'schema exists warnings',
    },
    {
      regex: /ERROR:\s+type "[^"]+" already exists/i,
      label: 'type exists warnings',
    },
    {
      regex: /ERROR:\s+function "[^"]+" already exists/i,
      label: 'function exists warnings',
    },
    {
      regex: /ERROR:\s+relation "[^"]+" already exists/i,
      label: 'relation exists warnings',
    },
    {
      regex: /ERROR:\s+permission denied for schema/i,
      label: 'schema permission warnings',
    },
    {
      regex: /^(event trigger\s+|function\s+extensions\.)/i,
      label: 'dependency detail lines',
    },
    {
      regex: /ERROR:\s+must be able to SET ROLE/i,
      label: 'SET ROLE permission issues',
    },
    {
      regex: /ERROR:\s+must be owner of/i,
      label: 'ownership warnings',
    },
    {
      regex: /ERROR:\s+permission denied for table/i,
      label: 'table permission warnings',
    },
    {
      regex: /ERROR:\s+duplicate key value violates unique constraint/i,
      label: 'duplicate key conflicts',
    },
    {
      regex: /ERROR:\s+insert or update on table .* violates foreign key constraint/i,
      label: 'foreign key conflicts',
    },
    {
      regex: /ERROR:\s+grant options cannot be granted back to your own grantor/i,
      label: 'grant option warnings',
    },
    {
      regex: /ERROR:\s+function extensions\.pg_stat_statements_reset\(oid, oid, bigint\) does not exist/i,
      label: 'pg_stat_statements_reset missing',
    },
    {
      regex: /ERROR:\s+trailing junk after numeric literal/i,
      label: 'copy trailing junk errors',
    },
    {
      regex: /ERROR:\s+invalid command \\\S+/i,
      label: 'copy invalid command errors',
    },
    {
      regex: /WARNING:\s+no privileges were granted/i,
      label: 'privilege grant warnings',
    },
    {
      regex: /WARNING:\s+no privileges could be revoked/i,
      label: 'privilege revoke warnings',
    },
    {
      regex: /WARNING:\s+not all privileges were granted/i,
      label: 'partial privilege warnings',
    },
    {
      regex: /ERROR:\s+permission denied to set parameter/i,
      label: 'configuration permission warnings',
    },
    {
      regex: /^DETAIL:/i,
      label: 'suppressed detail lines',
    },
    {
      regex: /^HINT:/i,
      label: 'suppressed hint lines',
    },
    {
      regex: /^CONTEXT:\s+/i,
      label: 'suppressed context lines',
    },
    {
      regex: /^LINE \d+:/i,
      label: 'suppressed context lines',
    },
    {
      regex: /^\s*\^$/i,
      label: 'suppressed context lines',
    },
  ];

  const recordSuppressed = (label) => {
    if (!label) {
      return;
    }
    suppressedCounts.set(label, (suppressedCounts.get(label) || 0) + 1);
  };

  const handleLine = (line) => {
    const normalized = line.replace(/\r$/, '');
    if (!normalized.trim()) {
      return;
    }
    for (const { regex, label } of ignorePatterns) {
      if (regex.test(normalized)) {
        recordSuppressed(label);
        return;
      }
    }
    outputFn(normalized);
  };

  const finish = () => {
    if (finished) {
      return suppressedCounts;
    }
    if (buffer.length > 0) {
      handleLine(buffer);
      buffer = '';
    }
    finished = true;
    return suppressedCounts;
  };

  return {
    write(chunk) {
      if (finished) {
        return;
      }
      buffer += chunk.toString();
      let newlineIndex;
      while ((newlineIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, newlineIndex);
        handleLine(line);
        buffer = buffer.slice(newlineIndex + 1);
      }
    },
    finish,
  };
}

// Load target database connection from env
require('dotenv').config({ path: '.env.local' });  // ensure this has the new DB credentials

const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ No database connection URL found for restore.");
  process.exit(1);
}

// Parse connection URL for target DB (similar to backup.js)
let connectionUrl;
try {
  connectionUrl = new URL(dbUrl);
} catch (err) {
  if (!dbUrl.startsWith('postgresql://') && dbUrl.startsWith('postgres://')) {
    connectionUrl = new URL(dbUrl.replace(/^postgres:\/\//, 'postgresql://'));
  } else {
    console.error("❌ Invalid database URL format:", err.message);
    process.exit(1);
  }
}
const host = connectionUrl.hostname;
const port = connectionUrl.port || '5432';
const dbName = connectionUrl.pathname.replace(/^\//, '');
const user = connectionUrl.username;
const password = connectionUrl.password;
const sslMode = connectionUrl.searchParams.get('sslmode') || 'require';

function formatBackupLabel(dirName) {
  const delimiter = '__';
  const idx = dirName.indexOf(delimiter);
  if (idx === -1) {
    return dirName;
  }
  const label = dirName.slice(idx + delimiter.length);
  return label || dirName;
}

// List available backup folders
const backupsPath = path.join(__dirname, '../backups');
if (!fs.existsSync(backupsPath)) {
  console.error("❌ Backups directory not found.");
  process.exit(1);
}
const backupDirs = fs.readdirSync(backupsPath, { withFileTypes: true })
  .filter(dirent => dirent.isDirectory())
  .map(dirent => dirent.name);
// Sort by name (timestamp in name means lexicographical sort is chronological)
backupDirs.sort().reverse();  // latest first

if (backupDirs.length === 0) {
  console.error("❌ No backups found in the backups directory.");
  process.exit(1);
}

// Show list of backups
console.log("Available backups:");
backupDirs.forEach((dir, index) => {
  const label = formatBackupLabel(dir);
  const prefix = index === 0 ? '(latest) ' : '';
  console.log(`${index + 1}. ${prefix}${label}`);
});

// Prompt user to choose a backup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.question("Enter the number of the backup to restore (press Enter for latest): ", (answer) => {
  rl.close();
  const trimmed = answer.trim();
  const choice = trimmed === '' ? 1 : parseInt(trimmed, 10);
  if (isNaN(choice) || choice < 1 || choice > backupDirs.length) {
    console.error("❌ Invalid selection. Exiting.");
    process.exit(1);
  }

  const selectedDir = backupDirs[choice - 1];
  const dumpFile = path.join(backupsPath, selectedDir, 'dump.sql');
  if (!fs.existsSync(dumpFile)) {
    console.error(`❌ dump.sql not found in backup folder: ${selectedDir}`);
    process.exit(1);
  }

  console.log(`🔄 Restoring database from backup "${selectedDir}"...`);

  // Spawn psql to execute the dump file
  const restoreArgs = [
    '-h', host,
    '-U', user,
    '-p', port,
    '-d', dbName,
    '-f', dumpFile
  ];
  const envVars = { ...process.env, PGPASSWORD: password, PGSSLMODE: sslMode };
  const psql = spawn('psql', restoreArgs, { env: envVars });
  const stdoutCollapser = createDuplicateCollapser(line => {
    process.stdout.write(`${line}\n`);
  }, { suppressors: stdoutSuppressors });
  const stderrFilter = createErrorFilter(line => {
    process.stderr.write(`${line}\n`);
  });

  psql.stdout.on('data', chunk => stdoutCollapser.write(chunk));
  psql.stderr.on('data', chunk => stderrFilter.write(chunk));

  psql.on('close', code => {
    const stdoutSuppressed = stdoutCollapser.finish();
    const stderrSuppressed = stderrFilter.finish();

    const formatSummary = (label, map) => {
      if (!map || map.size === 0) {
        return null;
      }
      const parts = [];
      let subtotal = 0;
      for (const [entryLabel, count] of map.entries()) {
        subtotal += count;
        parts.push(`${entryLabel} x${count}`);
      }
      return { label, subtotal, parts };
    };

    const summaries = [
      formatSummary('stdout', stdoutSuppressed),
      formatSummary('stderr', stderrSuppressed),
    ].filter(Boolean);

    if (summaries.length > 0) {
      const totalSuppressed = summaries.reduce((acc, { subtotal }) => acc + subtotal, 0);
      const detail = summaries
        .map(({ label, parts }) => `${label}: ${parts.join(', ')}`)
        .join(' | ');
      console.log(`ℹ️ Suppressed ${totalSuppressed} known restore messages (${detail}).`);
    }

    if (code === 0) {
      console.log("✅ Restore completed successfully.");
    } else {
      console.error(`❌ psql exited with code ${code}. The restore may have errors.`);
    }
  });
});
