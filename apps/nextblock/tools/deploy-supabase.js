const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const dotenv = require('dotenv');

const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function loadEnvFiles() {
  const candidates = [
    path.join(process.cwd(), '.env.local'),
    path.join(process.cwd(), '.env'),
  ];

  for (const envPath of candidates) {
    if (fs.existsSync(envPath)) {
      dotenv.config({ path: envPath, override: false, quiet: true });
    }
  }
}

function getDbPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) {
    return process.env.SUPABASE_DB_PASSWORD;
  }

  if (process.env.POSTGRES_URL) {
    try {
      const url = new URL(process.env.POSTGRES_URL);
      return url.password;
    } catch {
      return null;
    }
  }

  return null;
}

function checkEnv() {
  const missing = [];

  if (!process.env.SUPABASE_ACCESS_TOKEN) {
    missing.push('SUPABASE_ACCESS_TOKEN');
  }
  if (!process.env.SUPABASE_PROJECT_ID) {
    missing.push('SUPABASE_PROJECT_ID');
  }
  if (!process.env.NEXT_PUBLIC_URL) {
    missing.push('NEXT_PUBLIC_URL');
  }

  const dbPassword = getDbPassword();
  if (!dbPassword) {
    missing.push('SUPABASE_DB_PASSWORD (or POSTGRES_URL)');
  }

  if (missing.length > 0) {
    console.log(
      `${colors.yellow}Skipping Supabase deployment: Missing environment variables: ${missing.join(', ')}${colors.reset}`,
    );
    console.log(
      `${colors.yellow}This is expected for pull requests or forks without secrets configured.${colors.reset}`,
    );
    return false;
  }

  return true;
}

function runCommand(command) {
  try {
    console.log(`${colors.blue}Running: ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
  } catch {
    console.error(`${colors.red}Command failed: ${command}${colors.reset}`);
    process.exit(1);
  }
}

function detectWorkDirFlag() {
  const monorepoDbPath = path.join(
    process.cwd(),
    '../../libs/db/src/supabase/config.toml',
  );
  const standaloneDbPath = path.join(process.cwd(), 'supabase/config.toml');
  const rootDbPath = path.join(process.cwd(), 'libs/db/src/supabase/config.toml');

  if (fs.existsSync(monorepoDbPath)) {
    console.log(
      `${colors.blue}Detected monorepo environment (../../libs/db/src).${colors.reset}`,
    );
    return '--workdir ../../libs/db/src';
  }

  if (fs.existsSync(standaloneDbPath)) {
    console.log(
      `${colors.blue}Detected standalone environment (./supabase).${colors.reset}`,
    );
    return '';
  }

  if (fs.existsSync(rootDbPath)) {
    console.log(
      `${colors.blue}Detected monorepo workspace root (libs/db/src).${colors.reset}`,
    );
    return '--workdir libs/db/src';
  }

  return '';
}

async function deploy() {
  loadEnvFiles();

  console.log(`${colors.green}Starting Supabase deployment...${colors.reset}`);

  if (!checkEnv()) {
    process.exit(0);
  }

  const dbPassword = getDbPassword();
  if (!dbPassword) {
    console.error(
      `${colors.red}Could not determine database password.${colors.reset}`,
    );
    process.exit(1);
  }

  const workDirFlag = detectWorkDirFlag();

  console.log(`${colors.green}Linking to Supabase project...${colors.reset}`);
  runCommand(
    `npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID} --password ${dbPassword} ${workDirFlag} --yes`.trim(),
  );

  console.log(
    `${colors.green}Pushing database migrations...${colors.reset}`,
  );
  runCommand(`npx supabase db push --password ${dbPassword} --yes ${workDirFlag}`.trim());

  console.log(
    `${colors.green}Pushing Supabase config (Site URL: ${process.env.NEXT_PUBLIC_URL})...${colors.reset}`,
  );
  runCommand(`npx supabase config push ${workDirFlag} --yes`.trim());

  console.log(
    `${colors.green}Syncing Supabase Auth SMTP + email templates...${colors.reset}`,
  );
  runCommand('node tools/configure-supabase-auth.js');

  console.log(`${colors.green}Supabase deployment complete!${colors.reset}`);
}

deploy();
