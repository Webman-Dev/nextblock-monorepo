export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (!process.env.NEXT_PUBLIC_URL) {
    console.warn(
      'Warning: NEXT_PUBLIC_URL environment variable is not set for robots.txt. Defaulting to http://localhost:3000. Ensure this is set for production.'
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