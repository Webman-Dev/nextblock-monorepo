// app/cms/settings/global-css/page.tsx
import { getGlobalCss } from './actions';
import { getSiteThemes } from './theme-actions';
import GlobalCssForm from './components/GlobalCssForm';
import ThemeManager from './components/ThemeManager';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

export default async function GlobalCssSettingsPage() {
  const [css, themes] = await Promise.all([getGlobalCss(), getSiteThemes()]);

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Themes</CardTitle>
          <CardDescription>
            Recolour the themes visitors can pick from the switcher, or add your own. Changes apply
            site-wide without a redeploy.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ThemeManager initialThemes={themes} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Global CSS</CardTitle>
          <CardDescription>
            Inject custom CSS rules dynamically across the entire application front-end. Loaded after
            the themes above, so it can override any of them.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <GlobalCssForm initialCss={css} />
        </CardContent>
      </Card>
    </div>
  );
}
