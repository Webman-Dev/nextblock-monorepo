import { resolveSiteUrl, hasResolvedSiteUrl } from '../../lib/site-url';

export async function GET() {
  // Explicit NEXT_PUBLIC_URL → Vercel production URL → local-dev fallback.
  const siteUrl = resolveSiteUrl();

  if (!hasResolvedSiteUrl()) {
    console.warn(
      'Warning: no site URL is set for robots.txt (NEXT_PUBLIC_URL / Vercel production URL). Defaulting to http://localhost:3000. Set NEXT_PUBLIC_URL for production.'
    );
  }

  const isSandbox = process.env.NEXT_PUBLIC_IS_SANDBOX === 'true';
  // Sandbox: ALLOW crawling so Googlebot can actually see the `noindex` we send
  // on every response (the X-Robots-Tag header in next.config.js + the robots
  // meta in layout.tsx) and drop the pages from its index. `Disallow: /` would
  // block crawling, so Google could never read that noindex and might leave
  // URL-only entries in the index — the opposite of what we want. The Sitemap
  // line is intentionally omitted here (the sandbox sitemap is empty).
  const robotsTxtContent = isSandbox
    ? `User-agent: *
Allow: /`
    : `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml`;

  return new Response(robotsTxtContent, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}