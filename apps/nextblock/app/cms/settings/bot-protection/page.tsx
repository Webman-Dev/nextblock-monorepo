// app/cms/settings/bot-protection/page.tsx
import { getBotProtectionSettings } from './actions';
import BotProtectionForm from './components/BotProtectionForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

export default async function BotProtectionSettingsPage() {
  const settings = await getBotProtectionSettings();

  return (
    <div className="max-w-4xl mx-auto">
      <Card>
        <CardHeader>
          <CardTitle>Bot Protection Settings</CardTitle>
          <CardDescription>
            Configure bot and spam protection settings for all form blocks on your site. NextBlock supports lightweight Honeypots, Google reCAPTCHA v3, and Cloudflare Turnstile.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <BotProtectionForm initialSettings={settings} />
        </CardContent>
      </Card>
    </div>
  );
}
