"use server";

import { resolveEmailServerConfig } from '../../lib/config/email-settings';
import { applyEmailBranding, resolveEmailBranding } from '../../lib/email/branding';
import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: EmailParams) {
  // DB-first (CMS Settings → Configuration → Email), falling back to SMTP_* env vars.
  const emailConfig = await resolveEmailServerConfig();

  if (!emailConfig) {
    throw new Error("Email server is not configured. Configure SMTP in CMS Settings → Configuration → Email.");
  }

  // Single interception point: white-label every outgoing email with the tenant's own
  // logo + site name (or a text banner when no logo is set). Every app-dispatched email
  // funnels through here, so branding is applied once, centrally.
  const branding = await resolveEmailBranding();
  const brandedHtml = applyEmailBranding(html, branding);

  const transporter = nodemailer.createTransport(emailConfig);

  const options = {
    from: emailConfig.from,
    to,
    subject,
    text,
    html: brandedHtml,
  };

  return transporter.sendMail(options);
}