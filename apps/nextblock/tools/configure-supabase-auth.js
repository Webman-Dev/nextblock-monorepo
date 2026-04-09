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

const TEMPLATE_FILES = {
  confirmation: 'confirmation.html',
  recovery: 'recovery.html',
  magic_link: 'magic_link.html',
  invite: 'invite.html',
  email_change: 'email_change.html',
  reauthentication: 'reauthentication.html',
};

const TEMPLATE_SUBJECTS = {
  confirmation: 'Confirm your email',
  recovery: 'Reset your password',
  magic_link: 'Your sign-in link',
  invite: "You're invited",
  email_change: 'Confirm your email change',
  reauthentication: "Confirm it's you",
};

function getEnv(name) {
  return (process.env[name] || '').trim();
}

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

function stripTrailingSlash(value) {
  return value.replace(/\/+$/, '');
}

function resolveSupabaseDir() {
  const candidates = [
    path.join(process.cwd(), 'supabase'),
    path.join(process.cwd(), 'libs', 'db', 'src', 'supabase'),
    path.resolve(__dirname, '..', '..', '..', 'libs', 'db', 'src', 'supabase'),
    path.resolve(__dirname, '..', 'supabase'),
  ];

  for (const candidate of candidates) {
    if (
      fs.existsSync(candidate) &&
      fs.existsSync(path.join(candidate, 'templates'))
    ) {
      return candidate;
    }
  }

  return null;
}

function readTemplate(supabaseDir, fileName) {
  return fs.readFileSync(
    path.join(supabaseDir, 'templates', fileName),
    'utf8',
  );
}

function getTemplateConfig(supabaseDir) {
  return {
    mailer_subjects_confirmation: TEMPLATE_SUBJECTS.confirmation,
    mailer_subjects_recovery: TEMPLATE_SUBJECTS.recovery,
    mailer_subjects_magic_link: TEMPLATE_SUBJECTS.magic_link,
    mailer_subjects_invite: TEMPLATE_SUBJECTS.invite,
    mailer_subjects_email_change: TEMPLATE_SUBJECTS.email_change,
    mailer_subjects_reauthentication: TEMPLATE_SUBJECTS.reauthentication,
    mailer_templates_confirmation_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.confirmation,
    ),
    mailer_templates_recovery_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.recovery,
    ),
    mailer_templates_magic_link_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.magic_link,
    ),
    mailer_templates_invite_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.invite,
    ),
    mailer_templates_email_change_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.email_change,
    ),
    mailer_templates_reauthentication_content: readTemplate(
      supabaseDir,
      TEMPLATE_FILES.reauthentication,
    ),
  };
}

function getSmtpConfig() {
  const smtp = {
    smtp_host: getEnv('SMTP_HOST'),
    smtp_port: getEnv('SMTP_PORT'),
    smtp_user: getEnv('SMTP_USER'),
    smtp_pass: getEnv('SMTP_PASS'),
    smtp_admin_email: getEnv('SMTP_FROM_EMAIL'),
    smtp_sender_name: getEnv('SMTP_FROM_NAME'),
  };

  const requiredKeys = [
    'smtp_host',
    'smtp_port',
    'smtp_user',
    'smtp_pass',
    'smtp_admin_email',
  ];

  const missingKeys = requiredKeys.filter((key) => !smtp[key]);
  const hasAnyValue = Object.values(smtp).some(Boolean);

  if (missingKeys.length === 0) {
    return {
      isConfigured: true,
      config: {
        ...smtp,
        smtp_port: String(smtp.smtp_port),
        external_email_enabled: true,
      },
    };
  }

  return {
    isConfigured: false,
    hasAnyValue,
    missingKeys,
    config: null,
  };
}

function getRateLimitConfig(smtpConfigured) {
  const value = getEnv('SUPABASE_AUTH_RATE_LIMIT_EMAIL_SENT');
  if (!value) {
    return smtpConfigured
      ? {
          rate_limit_email_sent: 30,
        }
      : {};
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(
      'SUPABASE_AUTH_RATE_LIMIT_EMAIL_SENT must be a positive number when provided.',
    );
  }

  return {
    rate_limit_email_sent: parsed,
  };
}

function buildPayload(supabaseDir) {
  const siteUrl = stripTrailingSlash(getEnv('NEXT_PUBLIC_URL'));
  if (!siteUrl) {
    throw new Error('NEXT_PUBLIC_URL is required to configure Supabase Auth.');
  }

  const smtp = getSmtpConfig();
  const payload = {
    site_url: siteUrl,
    ...getTemplateConfig(supabaseDir),
    ...getRateLimitConfig(smtp.isConfigured),
  };
  if (smtp.isConfigured) {
    Object.assign(payload, smtp.config);
  }

  return {
    payload,
    smtp,
  };
}

async function patchAuthConfig(projectRef, accessToken, payload) {
  const response = await fetch(
    `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    },
  );

  if (!response.ok) {
    const bodyText = await response.text();
    throw new Error(
      `Supabase Management API returned ${response.status}: ${bodyText}`,
    );
  }
}

async function main() {
  loadEnvFiles();

  const dryRun = process.argv.includes('--dry-run');
  const projectRef = getEnv('SUPABASE_PROJECT_ID');
  const accessToken = getEnv('SUPABASE_ACCESS_TOKEN');

  if (!projectRef || !accessToken) {
    console.log(
      `${colors.yellow}Skipping Supabase Auth configuration: SUPABASE_PROJECT_ID or SUPABASE_ACCESS_TOKEN is missing.${colors.reset}`,
    );
    process.exit(0);
  }

  const supabaseDir = resolveSupabaseDir();
  if (!supabaseDir) {
    throw new Error(
      'Could not locate a Supabase directory with auth email templates.',
    );
  }

  const { payload, smtp } = buildPayload(supabaseDir);

  console.log(
    `${colors.green}Configuring Supabase Auth for project ${projectRef}...${colors.reset}`,
  );
  console.log(
    `${colors.blue}Using template source: ${path.relative(process.cwd(), supabaseDir) || supabaseDir}${colors.reset}`,
  );

  if (smtp.isConfigured) {
    console.log(
      `${colors.blue}Custom SMTP detected. Syncing SMTP settings and branded templates.${colors.reset}`,
    );
  } else if (smtp.hasAnyValue) {
    console.log(
      `${colors.yellow}SMTP values are incomplete. Syncing branded templates only. Missing: ${smtp.missingKeys.join(', ')}${colors.reset}`,
    );
  } else {
    console.log(
      `${colors.yellow}No SMTP values found. Syncing branded templates only.${colors.reset}`,
    );
  }

  if (dryRun) {
    console.log(
      `${colors.green}Dry run only. Payload keys:${colors.reset} ${Object.keys(payload).join(', ')}`,
    );
    process.exit(0);
  }

  await patchAuthConfig(projectRef, accessToken, payload);

  console.log(
    `${colors.green}Supabase Auth configuration updated successfully.${colors.reset}`,
  );
}

main().catch((error) => {
  console.error(
    `${colors.red}Failed to configure Supabase Auth:${colors.reset} ${error.message}`,
  );
  process.exit(1);
});
