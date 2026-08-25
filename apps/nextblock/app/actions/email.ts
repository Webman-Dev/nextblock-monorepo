import 'server-only';
// The single outbound-mail choke point. Deliberately NOT a "use server" module: every
// caller is server-side (2FA codes, form/interaction notifications, feedback, the SMTP
// test), and marking it as an action would register `sendEmail` as a client-callable
// endpoint — an open relay taking an arbitrary recipient, subject and HTML body.

import nodemailer, { type Transporter } from 'nodemailer';
import { resolveEmailServerConfig, type ResolvedEmailConfig } from '../../lib/config/email-settings';
import { applyEmailBranding, resolveEmailBranding } from '../../lib/email/branding';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
  /**
   * Where a reply should go, when that is not the SMTP identity. Set only from a
   * server-validated address — it lands in a mail header, so an unvalidated value
   * would be a header-injection vector.
   */
  replyTo?: string;
}

// Without explicit bounds nodemailer inherits the OS socket timeouts, so an unreachable
// or silently-dropping relay hangs the request (and the user's spinner) for minutes.
const CONNECTION_TIMEOUT_MS = 10_000;
const GREETING_TIMEOUT_MS = 10_000;
const SOCKET_TIMEOUT_MS = 20_000;

// Opening a fresh SMTP connection per message costs a TCP handshake + TLS negotiation +
// AUTH round trip before the first byte of the message is sent — typically the bulk of the
// wait when a user clicks "send me a code". A pooled transport keeps the authenticated
// connection warm so subsequent sends start at DATA. Set SMTP_POOL=false to opt out.
const POOL_ENABLED = process.env['SMTP_POOL'] !== 'false';

let cachedTransport: { key: string; transporter: Transporter } | null = null;

/** Identity of a transport: anything that changes it must force a rebuild. */
function transportKey(config: ResolvedEmailConfig): string {
  return [config.host, config.port, config.secure, config.auth.user].join('|');
}

function getTransporter(config: ResolvedEmailConfig): Transporter {
  const key = transportKey(config);
  if (cachedTransport && cachedTransport.key === key) {
    return cachedTransport.transporter;
  }

  // Settings changed — tear the old pool down rather than leaking its sockets.
  if (cachedTransport) {
    try {
      cachedTransport.transporter.close();
    } catch {
      /* already closed */
    }
    cachedTransport = null;
  }

  const base = {
    host: config.host,
    port: config.port,
    secure: config.secure,
    auth: config.auth,
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
  };

  // Branched rather than `pool: POOL_ENABLED` — nodemailer types `pool` as the literal
  // `true` to select the pooled transport overload, so a boolean matches neither.
  const transporter: Transporter = POOL_ENABLED
    ? nodemailer.createTransport({ ...base, pool: true, maxConnections: 3, maxMessages: 100 })
    : nodemailer.createTransport(base);

  // A pool that errors out (relay restart, credentials rotated, idle socket reaped) must
  // not be handed to the next caller — drop it so the following send reconnects cleanly.
  transporter.on('error', () => {
    if (cachedTransport?.transporter === transporter) {
      cachedTransport = null;
    }
  });

  cachedTransport = { key, transporter };
  return transporter;
}

export async function sendEmail({ to, subject, text, html, replyTo }: EmailParams) {
  // DB-first (CMS Settings → Configuration → Email), falling back to SMTP_* env vars.
  // Resolved in parallel with branding — neither depends on the other, and both are
  // pure reads standing between the click and the first SMTP packet.
  const [emailConfig, branding] = await Promise.all([
    resolveEmailServerConfig(),
    resolveEmailBranding(),
  ]);

  if (!emailConfig) {
    throw new Error("Email server is not configured. Configure SMTP in CMS Settings → Configuration → Email.");
  }

  // Single interception point: white-label every outgoing email with the tenant's own
  // logo + site name (or a text banner when no logo is set). Every app-dispatched email
  // funnels through here, so branding is applied once, centrally.
  const brandedHtml = applyEmailBranding(html, branding);

  const transporter = getTransporter(emailConfig);

  const options = {
    from: emailConfig.from,
    to,
    subject,
    text,
    html: brandedHtml,
    // Strip CR/LF defensively: this value ends up in a mail header.
    ...(replyTo ? { replyTo: replyTo.replace(/[\r\n]+/g, ' ').trim() } : {}),
  };

  return transporter.sendMail(options);
}
