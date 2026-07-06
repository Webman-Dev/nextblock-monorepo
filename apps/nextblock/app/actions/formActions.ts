// app/actions/formActions.ts
"use server";

import { sendEmail } from './email';
import {
  verifyBotProtection,
  type BotProtectionProvider,
  HONEYPOT_FIELD,
  TURNSTILE_TOKEN_FIELD,
  RECAPTCHA_TOKEN_FIELD,
} from '../../lib/botProtection/verify';

interface FormSubmissionResult {
  success: boolean;
  message: string;
}

type FormSubmissionConfig = {
  recipient: string;
  botProtectionProvider?: BotProtectionProvider;
};

function normalizeSubmissionConfig(config: string | FormSubmissionConfig) {
  if (typeof config === 'string') {
    return {
      recipient: config,
      botProtectionProvider: undefined,
    };
  }

  return config;
}

export async function handleFormSubmission(
  config: string | FormSubmissionConfig,
  prevState: unknown,
  formData: FormData
): Promise<FormSubmissionResult> {
  const { recipient: configuredRecipient, botProtectionProvider } = normalizeSubmissionConfig(config);

  // In sandbox mode the DB is periodically wiped and re-seeded with a dummy
  // recipient, so route every submission to the operator's sandbox inbox instead.
  // Real installs ignore this and use the recipient configured on the form block.
  const sandboxRecipient =
    process.env.NEXT_PUBLIC_IS_SANDBOX === 'true'
      ? process.env.SANDBOX_CONTACT_EMAIL?.trim() || ''
      : '';
  const recipient = sandboxRecipient || configuredRecipient;

  // Honeypot + captcha verification (shared with the account-signup flow).
  const verification = await verifyBotProtection(formData, { botProtectionProvider });
  if (!verification.ok) {
    if (verification.reason === 'honeypot') {
      // Fool the bot by returning a fake success response immediately.
      return { success: true, message: "Submission successful!" };
    }
    return { success: false, message: verification.message };
  }

  const data: Record<string, string | File> = {};
  let submitterEmail = 'a user'; // Default value

  formData.forEach((value, key) => {
    // Avoid sending internal bot protection tokens and honeypots in the notification email
    if (
      typeof value === 'string' &&
      !key.startsWith('$') &&
      key !== HONEYPOT_FIELD &&
      key !== RECAPTCHA_TOKEN_FIELD &&
      key !== TURNSTILE_TOKEN_FIELD
    ) {
      data[key] = value;
      // Attempt to find a field that looks like an email address to use in the subject
      if (key.toLowerCase().includes('email')) {
        submitterEmail = value;
      }
    }
  });

  // Create a more readable HTML body for the email
  const htmlBody = `
    {{brand_header}}
    <h2>New Form Submission</h2>
    <p>You have received a new submission from your website form.</p>
    <table border="1" cellpadding="5" cellspacing="0" style="border-collapse: collapse;">
      <tbody>
        ${Object.entries(data)
          .map(([key, value]) => `
            <tr>
              <td style="padding: 8px;"><strong>${key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}</strong></td>
              <td style="padding: 8px;">${value}</td>
            </tr>
          `)
          .join('')}
      </tbody>
    </table>
  `;

  const textBody = `
    New Form Submission:
    ${Object.entries(data).map(([key, value]) => `${key}: ${value}`).join('\n')}
  `;

  try {
    await sendEmail({
      to: recipient,
      subject: `New Form Submission from ${submitterEmail}`,
      text: textBody,
      html: htmlBody,
    });
    return { success: true, message: "Submission successful!" };
  } catch (error) {
    console.error("Email sending failed:", error);
    return { success: false, message: "Sorry, there was an error sending your message. Please try again later." };
  }
}
