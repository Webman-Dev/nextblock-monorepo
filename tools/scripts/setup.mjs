import fs from 'fs-extra';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

async function main() {
  console.log(chalk.bold.green('🚀 NextBlock™ CMS Developer Setup Wizard'));
  console.log(chalk.gray('This script will help you configure your local environment and link Supabase.'));
  console.log('');

  const envPath = resolve(REPO_ROOT, '.env.local');
  const envExamplePath = resolve(REPO_ROOT, '.env.exemple');

  // 1. Ensure .env.local exists
  let envContent = '';
  if (await fs.pathExists(envPath)) {
    console.log(chalk.blue('✓ Found existing .env.local'));
    envContent = await fs.readFile(envPath, 'utf8');
  } else {
    console.log(chalk.yellow('! .env.local not found, creating from .env.exemple...'));
    if (await fs.pathExists(envExamplePath)) {
      envContent = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envContent, 'utf8');
      console.log(chalk.green('✓ .env.local created.'));
    } else {
      console.log(chalk.red('✗ .env.exemple not found. Cannot automatically setup environment variables.'));
      process.exit(1);
    }
  }

  console.log('');
  console.log(chalk.bold('We need some details from your Supabase Dashboard:'));
  console.log(chalk.gray('Create a free account and project at https://supabase.com/dashboard'));

  // 2. Ask user for Supabase details
  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectId',
      message: 'Supabase Project ID (Reference ID):',
      validate: (val) => (val ? true : 'Project ID is required'),
    },
    {
      type: 'password',
      name: 'postgresUrl',
      message: 'Connection String (Dashboard > Connect > URI mode) [POSTGRES_URL]:',
      validate: (val) => (val ? true : 'Connection string is required'),
    },
    {
      type: 'input',
      name: 'anonKey',
      message: 'Project API Key (anon key):',
      validate: (val) => (val ? true : 'Anon Key is required'),
    },
    {
      type: 'password',
      name: 'serviceKey',
      message: 'Service Role Key:',
      validate: (val) => (val ? true : 'Service role key is required'),
    },
    {
      type: 'password',
      name: 'accessToken',
      message: 'Personal Access Token (Account > Access Tokens). Required to link db natively:',
      default: '', // optional but highly recommended
    },
  ]);

  // Extract password from connection string
  let dbPassword = '';
  try {
    const parsedUrl = new URL(answers.postgresUrl);
    dbPassword = parsedUrl.password;
  } catch {
    // If it fails, fallback to prompt
  }

  if (!dbPassword) {
    const pwdAnswer = await inquirer.prompt([
      {
        type: 'password',
        name: 'password',
        message: 'Could not extract db password from URI. Please enter your Postgres Password:',
        validate: (val) => (val ? true : 'Database Password is required'),
      },
    ]);
    dbPassword = pwdAnswer.password;
  }

  const supabaseUrl = `https://${answers.projectId}.supabase.co`;

  // 3. Optional R2 Setup
  console.log('');
  const r2Confirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setupR2',
      message: 'Do you want to set up Cloudflare R2 for media storage now? (Optional)',
      default: false
    }
  ]);

  let r2Values = null;
  if (r2Confirm.setupR2) {
    r2Values = await inquirer.prompt([
      { type: 'input', name: 'accountId', message: 'R2 Account ID:' },
      { type: 'input', name: 'bucketName', message: 'R2 Bucket Name:' },
      { type: 'input', name: 'accessKey', message: 'R2 Access Key ID:' },
      { type: 'password', name: 'secretKey', message: 'R2 Secret Access Key:' },
      { type: 'input', name: 'publicBaseUrl', message: 'R2 Public Base URL (e.g. https://pub-xxx.r2.dev):' },
    ]);
  }

  // 4. Optional SMTP Setup
  console.log('');
  const smtpConfirm = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'setupSMTP',
      message: 'Do you want to set up an SMTP server for emails now? (Optional)',
      default: false
    }
  ]);

  let smtpValues = null;
  if (smtpConfirm.setupSMTP) {
    smtpValues = await inquirer.prompt([
      { type: 'input', name: 'host', message: 'SMTP Host (e.g. smtp.resend.com):' },
      { type: 'input', name: 'port', message: 'SMTP Port (e.g. 465):', default: '465' },
      { type: 'input', name: 'user', message: 'SMTP User (e.g. resend):' },
      { type: 'password', name: 'pass', message: 'SMTP Password:' },
      { type: 'input', name: 'fromEmail', message: 'SMTP From Email:' },
      { type: 'input', name: 'fromName', message: 'SMTP From Name:' },
    ]);
  }

  // 5. Update the .env.local file with the new details
  console.log(chalk.blue('\nUpdating .env.local...'));
  
  const replacements = {
    'SUPABASE_PROJECT_ID=': `SUPABASE_PROJECT_ID=${answers.projectId}`,
    'POSTGRES_URL=': `POSTGRES_URL=${answers.postgresUrl}`,
    'NEXT_PUBLIC_SUPABASE_URL=': `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=': `NEXT_PUBLIC_SUPABASE_ANON_KEY=${answers.anonKey}`,
    'SUPABASE_SERVICE_ROLE_KEY=': `SUPABASE_SERVICE_ROLE_KEY=${answers.serviceKey}`,
    'SUPABASE_ACCESS_TOKEN=': `SUPABASE_ACCESS_TOKEN=${answers.accessToken}`,
    'POSTGRES_PASSWORD=': `POSTGRES_PASSWORD="${dbPassword}"`,
  };

  if (r2Values) {
    replacements['R2_ACCOUNT_ID='] = `R2_ACCOUNT_ID=${r2Values.accountId}`;
    replacements['R2_BUCKET_NAME='] = `R2_BUCKET_NAME=${r2Values.bucketName}`;
    replacements['R2_ACCESS_KEY_ID='] = `R2_ACCESS_KEY_ID=${r2Values.accessKey}`;
    replacements['R2_SECRET_ACCESS_KEY='] = `R2_SECRET_ACCESS_KEY=${r2Values.secretKey}`;
    replacements['NEXT_PUBLIC_R2_BASE_URL='] = `NEXT_PUBLIC_R2_BASE_URL=${r2Values.publicBaseUrl}`;
  }

  if (smtpValues) {
    replacements['SMTP_HOST='] = `SMTP_HOST=${smtpValues.host}`;
    replacements['SMTP_PORT='] = `SMTP_PORT=${smtpValues.port}`;
    replacements['SMTP_USER='] = `SMTP_USER=${smtpValues.user}`;
    replacements['SMTP_PASS='] = `SMTP_PASS=${smtpValues.pass}`;
    replacements['SMTP_FROM_EMAIL='] = `SMTP_FROM_EMAIL=${smtpValues.fromEmail}`;
    replacements['SMTP_FROM_NAME='] = `SMTP_FROM_NAME=${smtpValues.fromName}`;
  }

  const lines = envContent.split(/\r?\n/);
  const updatedLines = lines.map(line => {
    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(key)) {
        return value;
      }
    }
    return line;
  });

  await fs.writeFile(envPath, updatedLines.join('\n'), 'utf8');
  console.log(chalk.green('✓ .env.local updated with Supabase keys.'));

  // 6. Link Supabase
  console.log(chalk.blue('\nLinking Supabase project...'));
  try {
    await execa('npm', ['run', 'db:link'], {
      stdio: 'inherit',
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SUPABASE_PROJECT_ID: answers.projectId,
        POSTGRES_PASSWORD: dbPassword,
      }
    });
    console.log(chalk.green('✓ Supabase successfully linked.'));
  } catch {
    console.error(chalk.red('\nFailed to link Supabase. You may need to run `npm run db:link` manually.'));
    process.exit(1);
  }

  // 7. Push Database
  console.log(chalk.blue('\nPushing Database schema and config...'));
  try {
    const { setupPush } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupPush',
        message: 'Ready to push database schema? This will overwrite the linked database with local schema.',
        default: true
      }
    ]);

    if (setupPush) {
      await execa('npm', ['run', 'db:push'], {
        stdio: 'inherit',
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          // If the script needs them
          SUPABASE_PROJECT_ID: answers.projectId,
          SUPABASE_DB_PASSWORD: dbPassword,
          SUPABASE_ACCESS_TOKEN: answers.accessToken,
        }
      });
      console.log(chalk.green('\n✓ Database pushed successfully.'));
    } else {
      console.log(chalk.yellow('\nSkipped db push. Run `npm run db:push` to synchronize your database.'));
    }
  } catch {
    console.error(chalk.red('\nDatabase push failed. Please check your credentials and run `npm run db:push` manually.'));
  }

  // 8. Configure SMTP in Supabase Auth
  if (smtpValues && answers.accessToken) {
    console.log(chalk.blue('\nSyncing hosted Supabase Auth SMTP and branded email templates...'));
    try {
      await execa('npm', ['run', 'configure:supabase-auth'], {
        stdio: 'inherit',
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          SUPABASE_PROJECT_ID: answers.projectId,
          NEXT_PUBLIC_URL: 'http://localhost:3000',
          SUPABASE_ACCESS_TOKEN: answers.accessToken,
          SMTP_HOST: smtpValues.host,
          SMTP_PORT: smtpValues.port,
          SMTP_USER: smtpValues.user,
          SMTP_PASS: smtpValues.pass,
          SMTP_FROM_EMAIL: smtpValues.fromEmail,
          SMTP_FROM_NAME: smtpValues.fromName,
        }
      });
      console.log(chalk.green('✓ Hosted Supabase Auth set up successfully.'));
    } catch {
      console.log(chalk.yellow('! Hosted Supabase Auth configuration failed or skipped. You can manually run `npm run configure:supabase-auth`.'));
    }
  } else if (smtpValues) {
    console.log(chalk.yellow('\n! Skipping Supabase Auth SMTP Sync because Personal Access Token (SUPABASE_ACCESS_TOKEN) was not provided.'));
  }

  console.log(chalk.green('\n🎉 Setup Completed! Your environment is successfully configured. You can now start the local server.'));

}

main().catch(err => {
  console.error(chalk.red('An unexpected error occurred:'), err);
  process.exit(1);
});
