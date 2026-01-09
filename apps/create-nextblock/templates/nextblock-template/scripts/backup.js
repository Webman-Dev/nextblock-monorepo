// apps/nextblock/scripts/backup.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

// Load environment (database connection string should be in .env.local or .env)
require('dotenv').config({ path: '.env.local' });  // adjust path if needed

// Get the database URL from env
const dbUrl = process.env.POSTGRES_URL || process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌ No database connection URL found in environment.");
  process.exit(1);
}

// Parse the connection URL to extract components
let connectionUrl;
try {
  // Ensure the URL scheme is correct for Node's URL parser
  connectionUrl = new URL(dbUrl);
} catch (err) {
  console.error('Error parsing database URL:', err.message);
  // In case of a parsing error, try prefixing with 'postgresql://' (if not already)
  if (!dbUrl.startsWith('postgresql://') && dbUrl.startsWith('postgres://')) {
    connectionUrl = new URL(dbUrl.replace(/^postgres:\/\//, 'postgresql://'));
  } else {
    console.error("❌ Invalid database URL format.");
    process.exit(1);
  }
}

const host = connectionUrl.hostname;
const port = connectionUrl.port || '5432';
const dbName = connectionUrl.pathname.replace(/^\//, '');  // strip leading '/'
const user = connectionUrl.username;
const password = connectionUrl.password;
const sslMode = connectionUrl.searchParams.get('sslmode') || 'require';  // default to require SSL

// Prepare backup directory with timestamp name
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');  // replace colon and dot with hyphen for filename safety

function sanitizeName(rawName) {
  if (!rawName) {
    return '';
  }
  return rawName
    .trim()
    .replace(/[^\w.-]+/g, '-')  // keep letters/numbers/_/./-
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

function parseNameFromArgs() {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--name' || arg === '-n') {
      return args[i + 1] ?? '';
    }
    const match = arg.match(/^--name=(.*)$/);
    if (match) {
      return match[1];
    }
  }
  if (typeof process.env.BACKUP_NAME === 'string') {
    return process.env.BACKUP_NAME;
  }
  return null;
}

function promptForName(defaultLabel) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });
    rl.question(
      `Enter a friendly name for this backup (press Enter to use ${defaultLabel}): `,
      (answer) => {
        rl.close();
        resolve(answer);
      }
    );
  });
}

function buildFolderName(baseName, rawName) {
  const sanitized = sanitizeName(rawName);
  if (!sanitized) {
    return baseName;
  }
  return `${baseName}__${sanitized}`;
}

async function resolveBackupFolderName(baseName) {
  const providedName = parseNameFromArgs();
  if (providedName !== null) {
    return buildFolderName(baseName, providedName);
  }
  if (process.stdin.isTTY && process.stdout.isTTY) {
    const answer = await promptForName(baseName);
    return buildFolderName(baseName, answer);
  }
  return baseName;
}

(async () => {
  let backupFolderName;
  try {
    backupFolderName = await resolveBackupFolderName(timestamp);
  } catch (err) {
    console.error(`❌ Failed to determine backup name: ${err.message}`);
    process.exit(1);
  }

  const backupDir = path.join(__dirname, '../backups', backupFolderName);
  fs.mkdirSync(backupDir, { recursive: true });
  const dumpFile = path.join(backupDir, 'dump.sql');

  console.log(`🔄 Backing up database to ${dumpFile} ...`);

  // Spawn the pg_dump process
  const dumpArgs = [
    '--clean', '--if-exists', '--quote-all-identifiers',  // include DROP statements:contentReference[oaicite:8]{index=8}
    '-h', host,
    '-U', user,
    '-p', port,
    '-d', dbName,
    '-f', dumpFile
  ];
  const envVars = { ...process.env, PGPASSWORD: password, PGSSLMODE: sslMode };
  const pgDump = spawn('pg_dump', dumpArgs, { env: envVars });

  // Forward pg_dump errors to console
  pgDump.stderr.on('data', (data) => {
    process.stderr.write(data);
  });

  // Handle process exit
  pgDump.on('close', (code) => {
    if (code === 0) {
      console.log("✅ Backup completed successfully.");
    } else {
      console.error(`❌ pg_dump exited with code ${code}. Check error output above for details.`);
    }
  });
})();
