"use server";

import { resolveEmailServerConfig } from '../../lib/config/email-settings';
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

  const transporter = nodemailer.createTransport(emailConfig);

  const options = {
    from: emailConfig.from,
    to,
    subject,
    text,
    html,
  };

  return transporter.sendMail(options);
}