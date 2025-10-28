// app/cms/settings/copyright/page.tsx
import { getActiveLanguagesServerSide } from '@/app/cms/settings/languages/actions';
import { getCopyrightSettings } from './actions';
import CopyrightForm from './components/CopyrightForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

export default async function CopyrightSettingsPage() {
  const languages = await getActiveLanguagesServerSide();
  const copyrightSettings = await getCopyrightSettings();

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
                />
            </CardContent>
        </Card>
    </div>
  );
}