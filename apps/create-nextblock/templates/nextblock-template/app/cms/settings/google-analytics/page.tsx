// app/cms/settings/google-analytics/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';
import { getGoogleAnalyticsSettings } from './actions';
import GoogleAnalyticsForm from './components/GoogleAnalyticsForm';

export default async function GoogleAnalyticsSettingsPage() {
  const settings = await getGoogleAnalyticsSettings();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Google Analytics</CardTitle>
          <CardDescription>
            Configure Google Tag Manager and Google Analytics 4. These tags load only
            after a visitor accepts analytics in the Law 25 consent banner (managed under
            Privacy &amp; Consent), so the default page weight stays at zero tracking bytes.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GoogleAnalyticsForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
