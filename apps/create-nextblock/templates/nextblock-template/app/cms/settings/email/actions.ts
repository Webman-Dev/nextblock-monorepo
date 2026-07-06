// app/cms/settings/email/actions.ts
'use server';

import { createClient } from '@nextblock-cms/db/server';
import { revalidatePath } from 'next/cache';
import { saveEmailSettings } from '../../../../lib/config/email-settings';
import { sendEmail } from '../../../actions/email';

async function assertAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error('You must be logged in to update settings.');
  }
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single();
  if (error || !profile || profile.role !== 'ADMIN') {
    throw new Error('You do not have permission to perform this action.');
  }
}

export async function updateEmailSettings(formData: FormData) {
  await assertAdmin();

  await saveEmailSettings({
    host: String(formData.get('host') ?? ''),
    port: String(formData.get('port') ?? ''),
    fromEmail: String(formData.get('fromEmail') ?? ''),
    fromName: String(formData.get('fromName') ?? ''),
    secure: formData.get('secure') === 'on' || formData.get('secure') === 'true',
    user: String(formData.get('user') ?? ''),
    pass: String(formData.get('pass') ?? ''),
  });

  revalidatePath('/cms/settings/email');
  return { success: true as const, message: 'Email settings saved.' };
}

export async function sendTestEmail(formData: FormData) {
  await assertAdmin();

  const to = String(formData.get('to') ?? '').trim();
  if (!to) {
    throw new Error('Enter a recipient email address.');
  }

  await sendEmail({
    to,
    subject: 'Test email',
    text: 'This is a test email from your CMS. SMTP is configured correctly.',
    html:
      '<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:480px;margin:0 auto;padding:24px;">' +
      '{{brand_header}}' +
      '<p>This is a test email from your CMS. SMTP is configured correctly. 🎉</p>' +
      '</div>',
  });

  return { success: true as const, message: `Test email sent to ${to}.` };
}
