import { fetchAllPublishedPages, fetchAllPublishedPosts } from '../lib/sitemap-utils';
import { NextResponse } from 'next/server';

const baseUrl = process.env.NEXT_PUBLIC_URL || 'http://localhost:3000';
if (!process.env.NEXT_PUBLIC_URL) {
  console.warn("Warning: NEXT_PUBLIC_URL environment variable is not set for sitemap. Defaulting to http://localhost:3000. Ensure this is set for production.");
}

interface SitemapEntry {
  path: string;
  lastModified: string;
}

export async function GET() {
  try {
    let pages: SitemapEntry[] = [];
    try {
      pages = await fetchAllPublishedPages();
    } catch (error) {
      console.error("Error fetching published pages for sitemap:", error);
      // Proceed with an empty array for pages
    }

    let posts: SitemapEntry[] = [];
    try {
      posts = await fetchAllPublishedPosts();
    } catch (error) {
      console.error("Error fetching published posts for sitemap:", error);
      // Proceed with an empty array for posts
    }

    const staticRoutes: SitemapEntry[] = [
      { path: '/', lastModified: new Date().toISOString() },
      { path: '/articles', lastModified: new Date().toISOString() },
    ];

    const allEntries = [...staticRoutes, ...pages, ...posts];

    const sitemapXml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  ${allEntries
    .map(
      (entry) => `
    <url>
      <loc>${baseUrl}${entry.path}</loc>
      <lastmod>${entry.lastModified}</lastmod>
    </url>
  `
    )
    .join('')}
</urlset>`;

    return new Response(sitemapXml, {
      headers: {
        'Content-Type': 'application/xml',
        'Cache-Control': 's-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error("Error generating sitemap:", error);
    return new NextResponse('Internal Server Error', { status: 500 });
  }
}
