export function getEmailServerConfig() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !SMTP_FROM_EMAIL
  ) {
    console.warn(
      'Email server environment variables are missing. Email will not be sent.'
    );
    return null;
  }

  const from = SMTP_FROM_NAME
    ? `"${SMTP_FROM_NAME}" <${SMTP_FROM_EMAIL}>`
    : SMTP_FROM_EMAIL;

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    from,
  };
}