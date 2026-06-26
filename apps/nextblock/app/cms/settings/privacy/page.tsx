// app/cms/settings/privacy/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';
import { getPrivacySettings } from './actions';
import PrivacyForm from './components/PrivacyForm';

export default async function PrivacySettingsPage() {
  const settings = await getPrivacySettings();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Privacy &amp; Consent (Law 25 / CASL)</CardTitle>
          <CardDescription>
            Control the Quebec Law 25 consent banner and the corporate identity appended
            to the CASL-compliant footer. Analytics tags (Google Tag Manager / GA4) are
            configured under Settings &rarr; Google Analytics and download zero bytes until
            a visitor opts in here.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
