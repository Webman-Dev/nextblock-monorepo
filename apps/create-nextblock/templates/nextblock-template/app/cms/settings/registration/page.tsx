// app/cms/settings/registration/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';
import { getRegistrationSettings } from './actions';
import RegistrationForm from './components/RegistrationForm';

export const dynamic = 'force-dynamic';

export default async function RegistrationSettingsPage() {
  const settings = await getRegistrationSettings();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Sign-ups &amp; Registration</CardTitle>
          <CardDescription>
            Control how new public registrations are handled. Email verification requires a
            configured SMTP server (Settings → Configuration → Email).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RegistrationForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
