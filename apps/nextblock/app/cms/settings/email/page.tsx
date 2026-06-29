// app/cms/settings/email/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';
import { getEmailSettingsView } from '../../../../lib/config/email-settings';
import EmailForm from './components/EmailForm';

export const dynamic = 'force-dynamic';

export default async function EmailSettingsPage() {
  const settings = await getEmailSettingsView();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Email (SMTP)</CardTitle>
          <CardDescription>
            Configure the SMTP server used for transactional email (verification, password
            resets, 2FA codes, contact notifications). Credentials are encrypted at rest. If left
            blank, NextBlock falls back to the <code>SMTP_*</code> environment variables.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <EmailForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
