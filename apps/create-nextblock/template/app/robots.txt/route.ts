export async function GET() {
  const siteUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';

  if (!process.env.NEXT_PUBLIC_URL) {
    console.warn(
      'Warning: NEXT_PUBLIC_URL environment variable is not set for robots.txt. Defaulting to http://localhost:3000. Ensure this is set for production.'
    );
  }

  const robotsTxtContent = `User-agent: *
Allow: /
Sitemap: ${siteUrl}/sitemap.xml`;

  return new Response(robotsTxtContent, {
    headers: {
      'Content-Type': 'text/plain',
    },
  });
}