const { execSync } = require('child_process');

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

  // Check for DB password or parse from connection string
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
    process.exit(0); // Exit successfully to not break the build
  }

  const dbPassword = getDbPassword();
  if (!dbPassword) {
    console.error(
      `${colors.red}❌ Could not determine database password.${colors.reset}`,
    );
    process.exit(1);
  }

  // Workdir for Supabase - adjust if your config.toml is elsewhere
  const workDirFlag = '--workdir libs/db/src';

  // 1. Link Project
  console.log(
    `${colors.green}🔗 Linking to Supabase project...${colors.reset}`,
  );
  // Note: SUPABASE_ACCESS_TOKEN is automatically picked up by the CLI from env
  runCommand(
    `npx supabase link --project-ref ${process.env.SUPABASE_PROJECT_ID} --password ${dbPassword} ${workDirFlag}`,
  );

  // 2. Push Database Migrations
  console.log(
    `${colors.green}📦 Pushing database migrations...${colors.reset}`,
  );
  runCommand(`npx supabase db push --include-all ${workDirFlag}`);

  // 3. Push Config
  console.log(
    `${colors.green}⚙️  Pushing Supabase config (Site URL: ${process.env.NEXT_PUBLIC_URL})...${colors.reset}`,
  );
  runCommand(`npx supabase config push ${workDirFlag}`);

  console.log(`${colors.green}✅ Supabase deployment complete!${colors.reset}`);
}

deploy();
