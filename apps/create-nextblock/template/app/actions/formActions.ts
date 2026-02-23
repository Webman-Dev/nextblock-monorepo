// app/actions/formActions.ts
"use server";

import { sendEmail } from './email';

interface FormSubmissionResult {
  success: boolean;
  message: string;
}

export async function handleFormSubmission(
  recipient: string,
  prevState: unknown,
  formData: FormData
): Promise<FormSubmissionResult> {

  const data: Record<string, string | File> = {};
  let submitterEmail = 'a user'; // Default value

  formData.forEach((value, key) => {
    if (typeof value === 'string' && !key.startsWith('$')) {
      data[key] = value;
      // Attempt to find a field that looks like an email address to use in the subject
      if (key.toLowerCase().includes('email')) {
        submitterEmail = value;
      }
    }
  });

  // Create a more readable HTML body for the email
  const htmlBody = `
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