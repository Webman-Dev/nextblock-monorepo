const { exec } = require('child_process');
const { URL } = require('url');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: '.env.local' });

// Backup directory
const backupDir = path.join(__dirname, '..', 'backup');

// Create backup directory if it doesn't exist
if (!fs.existsSync(backupDir)) {
  fs.mkdirSync(backupDir);
}

// Backup file name
const backupFile = path.join(backupDir, `backup_${new Date().toISOString().slice(0, 10)}.sql`);

// Function to perform the backup
const backupDatabase = () => {
  const connectionString = process.env.POSTGRES_URL;

  if (!connectionString) {
    console.error('Error: Missing POSTGRES_URL in .env.local file.');
    return;
  }

  // Parse the URL and remove non-standard parameters for pg_dump
  const url = new URL(connectionString);
  url.searchParams.delete('supa'); // Remove supa parameter
  const finalConnectionString = url.toString();

  const command = `pg_dump "${finalConnectionString}" > "${backupFile}"`;

  console.log('Starting database backup...');

  exec(command, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error executing backup: ${error.message}`);
      if (stderr) {
        console.error(`pg_dump error: ${stderr}`);
      }
      return;
    }
    if (stderr && stderr.toLowerCase().includes('error')) {
      console.error(`Error: ${stderr}`);
      return;
    }
    console.log(`Backup successful! File saved as ${backupFile}`);
  });
};

// Run the backup
backupDatabase();