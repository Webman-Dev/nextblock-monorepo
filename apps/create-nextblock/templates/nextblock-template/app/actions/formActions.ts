// app/actions/formActions.ts
"use server";

import { sendEmail } from './email';
import { getServiceRoleSupabaseClient } from '@nextblock-cms/db/server';

interface FormSubmissionResult {
  success: boolean;
  message: string;
}

type BotProtectionProvider = 'none' | 'turnstile' | 'recaptcha';

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

  // Phase 1: Honeypot Validation
  const honeypot = formData.get('verification_secondary_email');
  if (honeypot && typeof honeypot === 'string' && honeypot.length > 0) {
    console.warn("[Bot Protection] Honeypot triggered. Discarding submission from bot.");
    // Fool the bot by returning a fake success response immediately
    return { success: true, message: "Submission successful!" };
  }

  // Phase 2: Advanced Captcha Verification
  try {
    const supabase = getServiceRoleSupabaseClient();
    
    // Fetch global bot protection settings
    const { data: publicSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bot_protection_public')
      .maybeSingle();

    const { data: secretSetting } = await supabase
      .from('site_settings')
      .select('value')
      .eq('key', 'bot_protection_secret')
      .maybeSingle();

    const publicVal = (publicSetting?.value || {}) as Record<string, any>;
    const secretVal = (secretSetting?.value || {}) as Record<string, any>;

    const blockProvider =
      botProtectionProvider === 'turnstile' || botProtectionProvider === 'recaptcha'
        ? botProtectionProvider
        : undefined;
    const provider = blockProvider || publicVal.provider || 'none';
    const secretKey = secretVal.secretKey || 
      (provider === 'turnstile' ? process.env.TURNSTILE_SECRET_KEY : process.env.RECAPTCHA_SECRET_KEY) || 
      '';

    if (provider === 'turnstile') {
      const token = formData.get('cf-turnstile-response') as string;
      if (!token) {
        return { success: false, message: "Security verification token is missing. Please try again." };
      }
      if (!secretKey) {
        console.error("[Bot Protection] Turnstile secret key is not configured.");
        return { success: false, message: "Bot protection is misconfigured. Please contact support." };
      }

      const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      });

      const outcome = await res.json();
      if (!outcome.success) {
        console.warn("[Bot Protection] Turnstile verification failed:", outcome);
        return { success: false, message: "Security verification failed. Please try again." };
      }
    } else if (provider === 'recaptcha') {
      const token = formData.get('g-recaptcha-response') as string;
      if (!token) {
        return { success: false, message: "Security verification token is missing. Please try again." };
      }
      if (!secretKey) {
        console.error("[Bot Protection] reCAPTCHA secret key is not configured.");
        return { success: false, message: "Bot protection is misconfigured. Please contact support." };
      }

      const res = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `secret=${encodeURIComponent(secretKey)}&response=${encodeURIComponent(token)}`,
      });

      const outcome = await res.json();
      if (!outcome.success || outcome.score < 0.5) {
        console.warn("[Bot Protection] reCAPTCHA verification failed:", outcome);
        return { success: false, message: "Security verification failed. Please try again." };
      }
    }
  } catch (error) {
    console.error("[Bot Protection] Error during validation:", error);
    // If database or fetch error occurs, we gracefully degrade or warn, but let's be secure and fail open/closed depending on preference.
    // The requirement says: "If the API indicates a verification failure or falls below a threshold... reject the operation securely."
    // Let's return error message.
    return { success: false, message: "Sorry, security verification could not be completed at this time." };
  }

  const data: Record<string, string | File> = {};
  let submitterEmail = 'a user'; // Default value

  formData.forEach((value, key) => {
    // Avoid sending internal bot protection tokens and honeypots in the notification email
    if (
      typeof value === 'string' && 
      !key.startsWith('$') && 
      key !== 'verification_secondary_email' && 
      key !== 'g-recaptcha-response' && 
      key !== 'cf-turnstile-response'
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
