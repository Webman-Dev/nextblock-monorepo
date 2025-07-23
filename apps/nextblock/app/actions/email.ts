"use server";

import { getEmailServerConfig } from '@nextblock-monorepo/utils';
import nodemailer from 'nodemailer';

interface EmailParams {
  to: string;
  subject: string;
  text: string;
  html: string;
}

export async function sendEmail({ to, subject, text, html }: EmailParams) {
  const emailConfig = getEmailServerConfig();

  if (!emailConfig) {
    throw new Error("Email server is not configured. Please check environment variables.");
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