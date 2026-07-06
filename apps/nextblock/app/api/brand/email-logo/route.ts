import { NextResponse } from 'next/server';

import { resolveEmailBranding } from '../../../../lib/email/branding';

// Public, unauthenticated logo endpoint for the Supabase auth emails (magic link, password
// reset, confirm email, invite, ...). Those templates are rendered and sent by Supabase's
// own SMTP from static HTML, so they cannot read the CMS logo per-send. Instead their
// `<img>` points here (`{{ .SiteURL }}/api/brand/email-logo`); when the recipient opens the
// email their client fetches this route, which 302-redirects to the operator's CURRENT
// uploaded logo. That keeps the statically-pushed auth templates in sync with the live CMS
// logo with no re-deploy — "change at will".
//
// Email image proxies (e.g. Gmail) hit this unauthenticated and follow the redirect, so it
// must never require auth and must always return an image (never a 4xx/5xx that would show
// a broken-image icon). When no logo is configured it returns a 1x1 transparent PNG — a
// static <img> can't fall back to a text banner the way the app-rendered emails do.
export const dynamic = 'force-dynamic';

// 1x1 transparent PNG.
const TRANSPARENT_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64',
);

function transparentPixel(): NextResponse {
  return new NextResponse(TRANSPARENT_PNG, {
    status: 200,
    headers: {
      'Content-Type': 'image/png',
      // Short cache so a newly-set logo starts showing quickly on freshly-sent emails.
      'Cache-Control': 'public, max-age=60',
    },
  });
}

export async function GET() {
  try {
    const { logoUrl } = await resolveEmailBranding();
    if (logoUrl) {
      const response = NextResponse.redirect(logoUrl, 302);
      response.headers.set('Cache-Control', 'public, max-age=300');
      return response;
    }
  } catch {
    // Fall through to the transparent pixel — never surface an error to an email client.
  }
  return transparentPixel();
}
