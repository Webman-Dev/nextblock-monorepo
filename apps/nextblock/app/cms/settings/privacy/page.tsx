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
            Control the Quebec Law 25 consent banner, the analytics that load only
            after consent, and the corporate identity appended to the CASL-compliant
            footer. Analytics scripts download zero bytes until a visitor opts in.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PrivacyForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
