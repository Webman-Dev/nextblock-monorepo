const { execSync } = require('child_process');
const path = require('path');

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  blue: '\x1b[34m',
};

const requiredVars = [
  'SUPABASE_ACCESS_TOKEN',
  'SUPABASE_PROJECT_ID',
  'SUPABASE_DB_PASSWORD',
  'NEXT_PUBLIC_URL',
];

function checkEnv() {
  const missing = requiredVars.filter((v) => !process.env[v]);
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
    process.exit(0); // Exit successfully to not break the build
  }

  // Workdir for Supabase - adjust if your config.toml is elsewhere
  // Based on your package.json, it's in libs/db/src
  const workDirFlag = '--workdir libs/db/src';

  // 1. Link Project
  // We use the access token provided in env for authentication
  console.log(
    `${colors.green}🔗 Linking to Supabase project...${colors.reset}`,
  );
  runCommand(
    `npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID} --password ${process.env.SUPABASE_DB_PASSWORD} ${workDirFlag}`,
  );

  // 2. Push Database Migrations
  console.log(
    `${colors.green}📦 Pushing database migrations...${colors.reset}`,
  );
  runCommand(`npx supabase db push --include-all ${workDirFlag}`);

  // 3. Push Config
  // Ensure NEXT_PUBLIC_URL is explicitly passed/available to the child process
  console.log(
    `${colors.green}⚙️  Pushing Supabase config (Site URL: ${process.env.NEXT_PUBLIC_URL})...${colors.reset}`,
  );
  runCommand(`npx supabase config push ${workDirFlag}`);

  console.log(`${colors.green}✅ Supabase deployment complete!${colors.reset}`);
}

deploy();
