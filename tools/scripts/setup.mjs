import fs from 'fs-extra';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes } from 'node:crypto';
import { execa } from 'execa';
import inquirer from 'inquirer';
import chalk from 'chalk';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const REPO_ROOT = resolve(__dirname, '../..');

// `npx nx serve nextblock` uses the @nx/next:server default port (4200).
const DEFAULT_LOCAL_URL = 'http://localhost:4200';

// Read the current value of a `KEY=` line from an .env file body (handles quotes).
function readEnvValue(envContent, key) {
  for (const line of envContent.split(/\r?\n/)) {
    if (line.startsWith(key)) {
      return line.slice(key.length).trim().replace(/^"(.*)"$/, '$1');
    }
  }
  return '';
}

function generateSecret() {
  return randomBytes(32).toString('hex');
}

async function main() {
  console.log(chalk.bold.green('🚀 NextBlock™ CMS Developer Setup Wizard'));
  console.log(
    chalk.gray(
      'This wizard writes .env.local, links your Supabase project, and applies the database schema.'
    )
  );
  console.log('');

  // Branch first: managed cloud (this wizard) or a one-click local self-hosted Docker sandbox.
  const { hostingMode } = await inquirer.prompt([
    {
      type: 'list',
      name: 'hostingMode',
      message: 'Select your target hosting environment profile:',
      choices: [
        { name: 'Managed Cloud Mode (Vercel + Supabase Cloud)', value: 'cloud' },
        {
          name: 'Local Self-Hosted Docker Mode (One-Click Local Sandbox)',
          value: 'docker',
        },
      ],
      default: 'cloud',
    },
  ]);

  if (hostingMode === 'docker') {
    // Docker mode skips ALL cloud credential prompts. Hand off to the single root hook, which
    // generates the container .env (internal routes + generated keys) and boots the stack.
    console.log(chalk.gray('\nLaunching the local self-hosted Docker setup...\n'));
    await execa('npm', ['run', 'docker:setup'], { stdio: 'inherit', cwd: REPO_ROOT });
    return;
  }

  // 0. Prerequisites — make sure the developer has everything BEFORE we start prompting.
  console.log(
    chalk.bold.cyan('Before you continue, have all of the following ready:')
  );
  console.log('');
  console.log(
    chalk.bold('  1. A Supabase project') +
      chalk.gray('   https://supabase.com/dashboard')
  );
  console.log(
    chalk.gray('     • Reference ID            — Project Settings > General > "Reference ID"')
  );
  console.log(
    chalk.gray('     • Connection string       — Connect (top bar) > Direct connection > URI')
  );
  console.log(
    chalk.gray('     • anon + service_role keys — Project Settings > API Keys')
  );
  console.log(
    chalk.gray('     • Personal Access Token   — Account > Access Tokens > Generate new token')
  );
  console.log('');
  console.log(
    chalk.bold('  2. A Cloudflare R2 bucket') +
      chalk.gray('   https://dash.cloudflare.com  > R2')
  );
  console.log(
    chalk.gray('     • Create a bucket, then enable its Public Development URL  (Bucket > Settings > General)')
  );
  console.log(
    chalk.gray('     • Create an Account API token  (R2 > Manage API Tokens)  with Object Read & Write')
  );
  console.log(
    chalk.gray('     • Copy the Access Key ID and Secret Access Key — the secret is shown only once')
  );
  console.log('');
  console.log(
    chalk.bold('  3. SMTP credentials') +
      chalk.gray('   SMTP2GO works very well: https://www.smtp2go.com')
  );
  console.log(
    chalk.gray('     • Required so Supabase can email the confirmation link your first admin needs to sign in')
  );
  console.log('');

  const { ready } = await inquirer.prompt([
    {
      type: 'confirm',
      name: 'ready',
      message: 'Do you have your Supabase, Cloudflare R2, and SMTP details ready?',
      default: true,
    },
  ]);

  if (!ready) {
    console.log(
      chalk.yellow('\nNo problem — gather the items above, then run `npm run setup` again.')
    );
    console.log(chalk.gray('Full step-by-step guide: docs/05-DEVELOPER-GUIDE.md'));
    process.exit(0);
  }

  const envPath = resolve(REPO_ROOT, '.env.local');
  const envExamplePath = resolve(REPO_ROOT, '.env.exemple');

  // 1. Ensure .env.local exists
  let envContent = '';
  if (await fs.pathExists(envPath)) {
    console.log(chalk.blue('\n✓ Found existing .env.local'));
    envContent = await fs.readFile(envPath, 'utf8');
  } else {
    console.log(chalk.yellow('\n! .env.local not found, creating from .env.exemple...'));
    if (await fs.pathExists(envExamplePath)) {
      envContent = await fs.readFile(envExamplePath, 'utf8');
      await fs.writeFile(envPath, envContent, 'utf8');
      console.log(chalk.green('✓ .env.local created.'));
    } else {
      console.log(
        chalk.red('✗ .env.exemple not found. Cannot automatically setup environment variables.')
      );
      process.exit(1);
    }
  }

  // 2. Supabase details. Nothing here is masked — you are pasting keys you just copied,
  //    and seeing them makes mistakes easy to spot.
  console.log('');
  console.log(
    chalk.bold('Supabase project') + chalk.gray('   https://supabase.com/dashboard')
  );

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'projectId',
      message: 'Project ID (Project Settings > General > "Reference ID"):',
      validate: (val) => (val ? true : 'Project Reference ID is required'),
    },
    {
      type: 'input',
      name: 'postgresUrl',
      message:
        'Connection String (Connect > Direct connection > URI — replace [YOUR-PASSWORD] with your DB password):',
      validate: (val) => (val ? true : 'Connection string is required'),
    },
    {
      type: 'input',
      name: 'anonKey',
      message: 'Project API Key — anon / public (Project Settings > API Keys):',
      validate: (val) => (val ? true : 'Anon key is required'),
    },
    {
      type: 'input',
      name: 'serviceKey',
      message: 'Service Role Key — service_role (Project Settings > API Keys):',
      validate: (val) => (val ? true : 'Service role key is required'),
    },
    {
      type: 'input',
      name: 'accessToken',
      message: 'Personal Access Token (Account > Access Tokens > Generate new token):',
      validate: (val) =>
        val ? true : 'Access token is required to link and migrate the database',
    },
    {
      type: 'input',
      name: 'siteUrl',
      message: 'Public site URL [NEXT_PUBLIC_URL]:',
      default: DEFAULT_LOCAL_URL,
      validate: (val) => (val ? true : 'Site URL is required'),
    },
  ]);

  // Extract the database password from the connection string.
  let dbPassword = '';
  try {
    dbPassword = decodeURIComponent(new URL(answers.postgresUrl).password);
  } catch {
    // Fall through to the manual prompt below.
  }

  if (!dbPassword || /YOUR-PASSWORD/i.test(dbPassword)) {
    const pwdAnswer = await inquirer.prompt([
      {
        type: 'input',
        name: 'password',
        message:
          'Could not read the DB password from the URI. Enter your Postgres database password:',
        validate: (val) => (val ? true : 'Database password is required'),
      },
    ]);
    dbPassword = pwdAnswer.password;
  }

  const supabaseUrl = `https://${answers.projectId}.supabase.co`;
  const siteUrl = answers.siteUrl.replace(/\/+$/, '');

  // 3. Cloudflare R2 — required. Powers media uploads, image processing, and backups.
  console.log('');
  console.log(
    chalk.bold('Cloudflare R2 storage') +
      chalk.gray('   https://dash.cloudflare.com  > R2')
  );
  const r2Values = await inquirer.prompt([
    {
      type: 'input',
      name: 'accountId',
      message: 'R2 Account ID (R2 overview > Account details):',
      validate: (val) => (val ? true : 'R2 Account ID is required'),
    },
    {
      type: 'input',
      name: 'bucketName',
      message: 'R2 Bucket Name:',
      validate: (val) => (val ? true : 'R2 Bucket Name is required'),
    },
    {
      type: 'input',
      name: 'publicBaseUrl',
      message:
        'R2 Public Development URL (Bucket > Settings > Public Development URL, e.g. https://pub-xxxx.r2.dev):',
      validate: (val) => (val ? true : 'R2 Public Development URL is required'),
    },
    {
      type: 'input',
      name: 'accessKey',
      message: 'R2 Access Key ID (R2 > Manage API Tokens):',
      validate: (val) => (val ? true : 'R2 Access Key ID is required'),
    },
    {
      type: 'input',
      name: 'secretKey',
      message: 'R2 Secret Access Key (shown only once when the token is created):',
      validate: (val) => (val ? true : 'R2 Secret Access Key is required'),
    },
  ]);

  // 4. SMTP — required. Sends the sign-up confirmation email your first admin needs.
  console.log('');
  console.log(
    chalk.bold('SMTP email') +
      chalk.gray('   SMTP2GO works very well: https://www.smtp2go.com')
  );
  const smtpValues = await inquirer.prompt([
    {
      type: 'input',
      name: 'host',
      message: 'SMTP Host (e.g. mail.smtp2go.com):',
      validate: (val) => (val ? true : 'SMTP Host is required'),
    },
    {
      type: 'input',
      name: 'port',
      message: 'SMTP Port (465 = SSL, 587 = STARTTLS):',
      default: '465',
      validate: (val) => (val ? true : 'SMTP Port is required'),
    },
    {
      type: 'input',
      name: 'user',
      message: 'SMTP User:',
      validate: (val) => (val ? true : 'SMTP User is required'),
    },
    {
      type: 'input',
      name: 'pass',
      message: 'SMTP Password:',
      validate: (val) => (val ? true : 'SMTP Password is required'),
    },
    {
      type: 'input',
      name: 'fromEmail',
      message: 'From Email (the address confirmation emails are sent from):',
      validate: (val) => (val ? true : 'From Email is required'),
    },
    {
      type: 'input',
      name: 'fromName',
      message: 'From Name (e.g. NextBlock):',
      validate: (val) => (val ? true : 'From Name is required'),
    },
  ]);

  // 4b. Cloudflare Turnstile (optional) — bot protection for public forms. Skippable.
  console.log('');
  console.log(
    chalk.bold('Cloudflare Turnstile') +
      chalk.gray('   optional — protects public forms (press Enter to skip)')
  );
  const turnstileValues = await inquirer.prompt([
    {
      type: 'input',
      name: 'siteKey',
      message: 'Turnstile Site Key [NEXT_PUBLIC_TURNSTILE_SITE_KEY] (Enter to skip):',
    },
    {
      type: 'input',
      name: 'secretKey',
      message: 'Turnstile Secret Key [TURNSTILE_SECRET_KEY] (Enter to skip):',
    },
  ]);

  // 5. Update .env.local with everything we collected.
  console.log(chalk.blue('\nUpdating .env.local...'));

  // Generate strong local secrets, but keep any that are already set (idempotent re-runs).
  const cronSecret = readEnvValue(envContent, 'CRON_SECRET=') || generateSecret();
  const draftSecret = readEnvValue(envContent, 'DRAFT_MODE_SECRET=') || generateSecret();
  const revalidateSecret =
    readEnvValue(envContent, 'REVALIDATE_SECRET_TOKEN=') || generateSecret();

  const replacements = {
    'SUPABASE_PROJECT_ID=': `SUPABASE_PROJECT_ID=${answers.projectId}`,
    'POSTGRES_URL=': `POSTGRES_URL=${answers.postgresUrl}`,
    'POSTGRES_PASSWORD=': `POSTGRES_PASSWORD="${dbPassword}"`,
    'NEXT_PUBLIC_SUPABASE_URL=': `NEXT_PUBLIC_SUPABASE_URL=${supabaseUrl}`,
    'NEXT_PUBLIC_SUPABASE_ANON_KEY=': `NEXT_PUBLIC_SUPABASE_ANON_KEY=${answers.anonKey}`,
    'SUPABASE_SERVICE_ROLE_KEY=': `SUPABASE_SERVICE_ROLE_KEY=${answers.serviceKey}`,
    'SUPABASE_ACCESS_TOKEN=': `SUPABASE_ACCESS_TOKEN=${answers.accessToken}`,
    'NEXT_PUBLIC_URL=': `NEXT_PUBLIC_URL=${siteUrl}`,
    'CRON_SECRET=': `CRON_SECRET=${cronSecret}`,
    'DRAFT_MODE_SECRET=': `DRAFT_MODE_SECRET=${draftSecret}`,
    'REVALIDATE_SECRET_TOKEN=': `REVALIDATE_SECRET_TOKEN=${revalidateSecret}`,
    // R2 public URL is consumed in two places (next/image remotePatterns and media
    // URL resolution), under two different var names — write the same value to both.
    'NEXT_PUBLIC_R2_PUBLIC_URL=': `NEXT_PUBLIC_R2_PUBLIC_URL=${r2Values.publicBaseUrl}`,
    'NEXT_PUBLIC_R2_BASE_URL=': `NEXT_PUBLIC_R2_BASE_URL=${r2Values.publicBaseUrl}`,
    'R2_ACCOUNT_ID=': `R2_ACCOUNT_ID=${r2Values.accountId}`,
    'R2_BUCKET_NAME=': `R2_BUCKET_NAME=${r2Values.bucketName}`,
    'R2_ACCESS_KEY_ID=': `R2_ACCESS_KEY_ID=${r2Values.accessKey}`,
    'R2_SECRET_ACCESS_KEY=': `R2_SECRET_ACCESS_KEY=${r2Values.secretKey}`,
    'SMTP_HOST=': `SMTP_HOST=${smtpValues.host}`,
    'SMTP_PORT=': `SMTP_PORT=${smtpValues.port}`,
    'SMTP_USER=': `SMTP_USER=${smtpValues.user}`,
    'SMTP_PASS=': `SMTP_PASS=${smtpValues.pass}`,
    'SMTP_FROM_EMAIL=': `SMTP_FROM_EMAIL=${smtpValues.fromEmail}`,
    'SMTP_FROM_NAME=': `SMTP_FROM_NAME=${smtpValues.fromName}`,
    // Turnstile is optional — only write the keys when the developer actually provided them.
    ...(turnstileValues.siteKey.trim()
      ? {
          'NEXT_PUBLIC_TURNSTILE_SITE_KEY=': `NEXT_PUBLIC_TURNSTILE_SITE_KEY=${turnstileValues.siteKey.trim()}`,
        }
      : {}),
    ...(turnstileValues.secretKey.trim()
      ? {
          'TURNSTILE_SECRET_KEY=': `TURNSTILE_SECRET_KEY=${turnstileValues.secretKey.trim()}`,
        }
      : {}),
  };

  const appliedKeys = new Set();
  const updatedLines = envContent.split(/\r?\n/).map((line) => {
    for (const [key, value] of Object.entries(replacements)) {
      if (line.startsWith(key)) {
        appliedKeys.add(key);
        return value;
      }
    }
    return line;
  });

  // Append any keys missing from the template so nothing is silently dropped
  // (e.g. POSTGRES_PASSWORD is not present in .env.exemple).
  for (const [key, value] of Object.entries(replacements)) {
    if (!appliedKeys.has(key)) {
      updatedLines.push(value);
    }
  }

  await fs.writeFile(envPath, updatedLines.join('\n'), 'utf8');
  console.log(
    chalk.green('✓ .env.local updated (Supabase, R2, SMTP, site URL, and generated secrets).')
  );

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
      },
    });
    console.log(chalk.green('✓ Supabase successfully linked.'));
  } catch {
    console.error(
      chalk.red('\nFailed to link Supabase. You may need to run `npm run db:link` manually.')
    );
    process.exit(1);
  }

  // 7. Push the database schema (full baseline for a brand-new database).
  console.log(chalk.blue('\nApplying database migrations...'));
  try {
    const { setupPush } = await inquirer.prompt([
      {
        type: 'confirm',
        name: 'setupPush',
        message:
          'Apply the database schema to the linked project now? (Safe for a new database; does not delete existing data.)',
        default: true,
      },
    ]);

    if (setupPush) {
      await execa('npm', ['run', 'db:migrate:fresh'], {
        stdio: 'inherit',
        cwd: REPO_ROOT,
        env: {
          ...process.env,
          SUPABASE_PROJECT_ID: answers.projectId,
          SUPABASE_DB_PASSWORD: dbPassword,
          SUPABASE_ACCESS_TOKEN: answers.accessToken,
        },
      });
      console.log(chalk.green('\n✓ Database schema applied.'));
    } else {
      console.log(
        chalk.yellow('\nSkipped. Run `npm run db:migrate:fresh` to initialize this database.')
      );
    }
  } catch {
    console.error(
      chalk.red(
        '\nDatabase push failed. Check your credentials and run `npm run db:migrate:fresh` manually for a new database.'
      )
    );
  }

  // 8. Configure hosted Supabase Auth: custom SMTP + branded email templates.
  //    SMTP and the access token are required, so this always runs.
  console.log(chalk.blue('\nSyncing hosted Supabase Auth SMTP and branded email templates...'));
  try {
    await execa('npm', ['run', 'configure:supabase-auth'], {
      stdio: 'inherit',
      cwd: REPO_ROOT,
      env: {
        ...process.env,
        SUPABASE_PROJECT_ID: answers.projectId,
        NEXT_PUBLIC_URL: siteUrl,
        SUPABASE_ACCESS_TOKEN: answers.accessToken,
        SMTP_HOST: smtpValues.host,
        SMTP_PORT: smtpValues.port,
        SMTP_USER: smtpValues.user,
        SMTP_PASS: smtpValues.pass,
        SMTP_FROM_EMAIL: smtpValues.fromEmail,
        SMTP_FROM_NAME: smtpValues.fromName,
      },
    });
    console.log(chalk.green('✓ Hosted Supabase Auth configured (custom SMTP + branded templates).'));
  } catch {
    console.log(
      chalk.yellow(
        '! Supabase Auth configuration failed. You can re-run it later with `npm run configure:supabase-auth`.'
      )
    );
  }

  // 9. Done — spell out exactly what to do next.
  console.log(chalk.green('\n🎉 Setup complete! Your environment is configured.'));
  console.log('');
  console.log(chalk.bold('Next steps:'));
  console.log(
    `  1. Start the app:       ${chalk.cyan('npx nx serve nextblock')}  ${chalk.gray('→ ' + siteUrl)}`
  );
  console.log(`  2. Create your account: open ${chalk.cyan(siteUrl + '/sign-up')}`);
  console.log(
    chalk.gray('     The FIRST account to sign up automatically becomes the ADMIN.')
  );
  console.log('  3. Confirm your email:  click the link sent to your inbox');
  console.log(
    chalk.gray('     (No email yet? You can also confirm the user in Supabase > Authentication > Users.)')
  );
  console.log(
    `  4. Sign in — you'll land in the CMS at ${chalk.cyan(siteUrl + '/cms/dashboard')}`
  );
  console.log('');
}

main().catch((err) => {
  console.error(chalk.red('An unexpected error occurred:'), err);
  process.exit(1);
});
