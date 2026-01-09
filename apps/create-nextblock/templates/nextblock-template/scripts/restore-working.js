// apps/nextblock/scripts/restore.js
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');
const readline = require('readline');

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
  console.log(`${index + 1}. ${dir}`);
});

// Prompt user to choose a backup
const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});
rl.question("Enter the number of the backup to restore: ", (answer) => {
  rl.close();
  const choice = parseInt(answer.trim(), 10);
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

  // Forward output (especially errors)
  psql.stdout.on('data', data => process.stdout.write(data));
  psql.stderr.on('data', data => process.stderr.write(data));

  psql.on('close', code => {
    if (code === 0) {
      console.log("✅ Restore completed successfully.");
    } else {
      console.error(`❌ psql exited with code ${code}. The restore may have errors.`);
    }
  });
});
