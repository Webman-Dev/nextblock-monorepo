// app/cms/settings/site-scripts/page.tsx
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@nextblock-cms/ui';

import { getSiteScriptRevisions, getSiteScripts } from './actions';
import SiteScriptManager from './components/SiteScriptManager';

export default async function SiteScriptsSettingsPage() {
  const [scripts, revisions] = await Promise.all([getSiteScripts(), getSiteScriptRevisions()]);

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Site Scripts</CardTitle>
          <CardDescription>
            JavaScript that runs on every page of the public site — animation helpers, chat widgets,
            third-party embeds. Each script is injected with the page&apos;s Content-Security-Policy
            nonce, so it runs without weakening the site&apos;s security headers. Disabled scripts are
            never sent to visitors. Every change is logged and can be rolled back from the history
            below.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SiteScriptManager initialRevisions={revisions} initialScripts={scripts} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Where else code can live</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            <strong className="text-foreground">One page only?</strong> A rich-text block accepts an
            inline <code>&lt;style&gt;</code> and <code>&lt;script&gt;</code> directly, so
            page-specific effects do not need to live here.
          </p>
          <p>
            <strong className="text-foreground">Site-wide styling?</strong> Use Themes &amp; CSS for
            palettes and global stylesheets.
          </p>
          <p>
            <strong className="text-foreground">Marketing or analytics tags?</strong> Put those under
            Google Analytics instead — scripts there only fire once a visitor accepts cookies, which
            is what consent law requires. Scripts on this page run unconditionally.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
