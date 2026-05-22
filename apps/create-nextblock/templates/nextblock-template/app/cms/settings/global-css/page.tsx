// app/cms/settings/global-css/page.tsx
import { getGlobalCss } from './actions';
import GlobalCssForm from './components/GlobalCssForm';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

export default async function GlobalCssSettingsPage() {
  const css = await getGlobalCss();

  return (
    <div className="max-w-4xl mx-auto">
        <Card>
            <CardHeader>
                <CardTitle>Global CSS</CardTitle>
                <CardDescription>
                    Inject custom CSS rules dynamically across the entire application front-end.
                </CardDescription>
            </CardHeader>
            <CardContent>
                <GlobalCssForm initialCss={css} />
            </CardContent>
        </Card>
    </div>
  );
}
