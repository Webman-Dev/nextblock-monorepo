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
  console.log(chalk.bold.green('🚀 NextBlock CMS Developer Setup Wizard'));
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
      message: 'Connection String (Dashboard > Connect > URI mode):',
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

  // 3. Update the .env.local file with the new details
  console.log(chalk.blue('\nUpdating .env.local...'));
  
  const replacements = {
    'SUPABASE_PROJECT_ID=': `SUPABASE_PROJECT_ID=${answers.projectId}`,
    'POSTGRES_URL=': `POSTGRES_URL=${answers.postgresUrl}`,
    'NEXT_PUBLIC_SUPABASE_URL=': `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=': `NEXT_PUBLIC_SUPABASE_ANON_KEY=${answers.anonKey}`,
    'SUPABASE_SERVICE_ROLE_KEY=': `SUPABASE_SERVICE_ROLE_KEY=${answers.serviceKey}`,
    'SUPABASE_ACCESS_TOKEN=': `SUPABASE_ACCESS_TOKEN=${answers.accessToken}`,
  };

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

  // 4. Link Supabase
  console.log(chalk.blue('\nLinking Supabase project...'));
  try {
    await execa('npx', ['supabase', 'link', '--project-ref', answers.projectId, '--password', dbPassword, '--workdir', 'libs/db/src'], {
      stdio: 'inherit',
      cwd: REPO_ROOT,
    });
    console.log(chalk.green('✓ Supabase successfully linked.'));
  } catch {
    console.error(chalk.red('\nFailed to link Supabase. You may need to run `npm run db:link` manually.'));
    process.exit(1);
  }

  // 5. Push Database
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
      console.log(chalk.green('\n🎉 Setup Completed! Your environment is successfully configured. You can now run `npm run dev`.'));
    } else {
      console.log(chalk.yellow('\nSkipped db push. Run `npm run db:push` to synchronize your database.'));
    }
  } catch {
    console.error(chalk.red('\nDatabase push failed. Please check your credentials and run `npm run db:push` manually.'));
  }

}

main().catch(err => {
  console.error(chalk.red('An unexpected error occurred:'), err);
  process.exit(1);
});
