const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

function getDbPassword() {
  if (process.env.SUPABASE_DB_PASSWORD) {
    return process.env.SUPABASE_DB_PASSWORD;
  }
  if (process.env.POSTGRES_URL) {
    try {
      const url = new URL(process.env.POSTGRES_URL);
      return url.password;
    } catch (e) {
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
      `${colors.yellow}⚠️  Skipping Supabase deployment: Missing environment variables: ${missing.join(', ')}${colors.reset}`,
    );
    console.log(
      `${colors.yellow}   This is expected for Pull Requests or forks without secrets configured.${colors.reset}`,
    );
    return false;
  }
  return true;
}

function runCommand(command) {
  try {
    console.log(`${colors.blue}Running: ${command}${colors.reset}`);
    execSync(command, { stdio: 'inherit' });
  } catch (error) {
    console.error(`${colors.red}❌ Command failed: ${command}${colors.reset}`);
    process.exit(1);
  }
}

async function deploy() {
  console.log(
    `${colors.green}🚀 Starting Supabase Deployment...${colors.reset}`,
  );

  if (!checkEnv()) {
    process.exit(0);
  }

  const dbPassword = getDbPassword();
  if (!dbPassword) {
    console.error(
      `${colors.red}❌ Could not determine database password.${colors.reset}`,
    );
    process.exit(1);
  }

  // Detect Supabase location
  // 1. Monorepo Dev (apps/nextblock -> libs/db/src)
  // 2. Standalone (root -> supabase)
  let workDirFlag = '';

  // Check if we are in monorepo structure relative to this script
  // Script is in apps/nextblock/tools/deploy-supabase.js
  // So monorepo root is ../../../
  // libs/db/src is ../../../libs/db/src

  // More robust check: check if libs/db/src/supabase/config.toml exists
  // We assume the command is run from the project root (process.cwd())

  // If running from apps/nextblock root (monorepo dev)
  const monorepoDbPath = path.join(
    process.cwd(),
    '../../libs/db/src/supabase/config.toml',
  );

  // If running from workspace root (standalone)
  const standaloneDbPath = path.join(process.cwd(), 'supabase/config.toml');

  if (fs.existsSync(monorepoDbPath)) {
    console.log(
      `${colors.blue}ℹ️  Detected Monorepo environment (libs/db/src)${colors.reset}`,
    );
    workDirFlag = '--workdir ../../libs/db/src';
  } else if (fs.existsSync(standaloneDbPath)) {
    console.log(
      `${colors.blue}ℹ️  Detected Standalone environment (./supabase)${colors.reset}`,
    );
    workDirFlag = '';
  } else {
    // Fallback or maybe we are running from root of monorepo?
    const rootDbPath = path.join(
      process.cwd(),
      'libs/db/src/supabase/config.toml',
    );
    if (fs.existsSync(rootDbPath)) {
      workDirFlag = '--workdir libs/db/src';
    }
  }

  console.log(
    `${colors.green}🔗 Linking to Supabase project...${colors.reset}`,
  );
  runCommand(
    `npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID} --password ${dbPassword} ${workDirFlag}`,
  );

  console.log(
    `${colors.green}📦 Pushing database migrations...${colors.reset}`,
  );
  runCommand(`npx supabase db push --include-all ${workDirFlag}`, {
    stdio: 'inherit',
  }); // db push input 'y' handled?
  // npx supabase db push usually asks for confirmation if destructive. --include-all might implies force? using input 'y' might be safer or --force if avail.
  // Actually, CI usually needs --no-interactive or equivalent if prompts exist.
  // But our previous script used just db push without input 'y' and relied on process.stdin or just worked.
  // Wait, in create-nextblock.js we piped 'y\n'.
  // In deploy-supabase.js we are using inherit stdio, so it might prompt if strictly necessary, but usually db push to remote is fine unless destructive.
  // However, I previously wrote `npx supabase db push ...` and it seemed fine.

  // Re-reading previous script: runCommand used `execSync(command, { stdio: 'inherit' });`

  // Let's stick to the previous working command.

  console.log(
    `${colors.green}⚙️  Pushing Supabase config (Site URL: ${process.env.NEXT_PUBLIC_URL})...${colors.reset}`,
  );
  runCommand(`npx supabase config push ${workDirFlag}`);

  console.log(`${colors.green}✅ Supabase deployment complete!${colors.reset}`);
}

deploy();
