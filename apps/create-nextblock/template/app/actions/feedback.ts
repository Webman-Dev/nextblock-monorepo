"use server";

import { sendEmail } from "./email";


interface FeedbackData {
  subject: string;
  message: string;
  userEmail: string;
  userName?: string;
  url?: string;
}

export async function submitFeedback(data: FeedbackData) {
  try {
    // If we have an email config, we use it. If not, we might fail or log.
    // sendEmail throws if not configured.
    
    const { subject, message, userEmail, userName, url } = data;
    
    const htmlContent = `
      <h2>New Feedback Received</h2>
      <p><strong>From:</strong> ${userName || 'Unknown'} (${userEmail})</p>
      <p><strong>Subject:</strong> ${subject}</p>
      <p><strong>URL:</strong> ${url || 'N/A'}</p>
      <br/>
      <h3>Message:</h3>
      <p style="white-space: pre-wrap;">${message}</p>
    `;

    const textContent = `
      New Feedback Received
      From: ${userName || 'Unknown'} (${userEmail})
      Subject: ${subject}
      URL: ${url || 'N/A'}

      Message:
      ${message}
    `;

    await sendEmail({
      to: "feedback@nextblock.ca", // Fixed typo from 'feeedback'
      subject: `[CMS Feedback] ${subject}`,
      text: textContent,
      html: htmlContent,
    });

    return { success: true };
  } catch (error) {
    console.error("Failed to submit feedback:", error);
    return { success: false, error: "Failed to send feedback email." };
  }
}
