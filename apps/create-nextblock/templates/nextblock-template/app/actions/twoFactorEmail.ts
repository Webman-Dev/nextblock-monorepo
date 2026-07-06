// Shared transactional email for 2FA codes. Server-only helper (not a server
// action); callable from sign-in, the challenge page, and the security panel.
import { sendEmail } from './email';

export async function sendTwoFactorCodeEmail(
  to: string,
  code: string,
  purpose = 'verify your sign-in',
): Promise<void> {
  await sendEmail({
    to,
    subject: 'Your verification code',
    text: `Your verification code is ${code}. It expires in 5 minutes. If you didn't request it, you can ignore this email.`,
    html: `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
    {{brand_header}}
    <p style="font-size:14px;color:#475569;">Use this code to ${purpose}:</p>
    <p style="font-size:32px;font-weight:700;letter-spacing:8px;margin:16px 0;color:#0f172a;">${code}</p>
    <p style="font-size:13px;color:#64748b;">This code expires in 5 minutes. If you didn't request it, you can safely ignore this email.</p>
  </div>`,
  });
}
