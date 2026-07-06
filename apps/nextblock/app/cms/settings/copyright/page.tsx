// app/cms/settings/copyright/page.tsx
import { getActiveLanguagesServerSide } from '../languages/actions';
import { getCopyrightSettings, getFooterAttributionEnabled } from './actions';
import CopyrightForm from './components/CopyrightForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

export default async function CopyrightSettingsPage() {
  const languages = await getActiveLanguagesServerSide();
  const [copyrightSettings, footerAttributionEnabled] = await Promise.all([
    getCopyrightSettings(),
    getFooterAttributionEnabled(),
  ]);

  const year = new Date().getFullYear();

  return (
    <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Footer Copyright Settings</CardTitle>
                <CardDescription>
                    Manage the copyright text displayed in the site footer for each language.
                    Use &quot;{year}&quot; as a placeholder for the current year.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <CopyrightForm
                    languages={languages}
                    initialSettings={copyrightSettings}
                    initialAttributionEnabled={footerAttributionEnabled}
                />
            </CardContent>
        </Card>
    </div>
  );
}