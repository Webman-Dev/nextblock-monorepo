//@ts-check

const fs = require('node:fs');
const path = require('node:path');

const shouldEnableVercelToolbarPlugin =
  process.env.NEXTBLOCK_VERCEL_TOOLBAR_ENABLED === 'true';

function ensureVercelToolbarProjectJson() {
  const vercelDir = path.join(process.cwd(), '.vercel');
  const projectJsonPath = path.join(vercelDir, 'project.json');
  const repoJsonPath = path.join(vercelDir, 'repo.json');

  if (fs.existsSync(projectJsonPath) || !fs.existsSync(repoJsonPath)) {
    return;
  }

  try {
    const repo = JSON.parse(fs.readFileSync(repoJsonPath, 'utf8'));
    const appDirectory = path
      .relative(process.cwd(), __dirname)
      .replaceAll(path.sep, '/');
    const project =
      repo.projects?.find(
        /** @param {{ directory?: string }} candidate */
        (candidate) =>
          candidate.directory === '.' ||
          candidate.directory === '' ||
          candidate.directory === appDirectory
      ) ?? repo.projects?.[0];

    if (!project?.id || !project?.orgId) {
      return;
    }

    fs.writeFileSync(
      projectJsonPath,
      `${JSON.stringify({ orgId: project.orgId, projectId: project.id }, null, 2)}\n`
    );
  } catch {
    // The Toolbar plugin will print its normal setup guidance if linking is incomplete.
  }
}

if (shouldEnableVercelToolbarPlugin) {
  ensureVercelToolbarProjectJson();
}

/**
 * @typedef {{ protocol?: 'http' | 'https'; hostname: string; port?: string; pathname?: string }} RemotePattern
 */

const securityHeaders = [
  {
    key: 'X-DNS-Prefetch-Control',
    value: 'on',
  },
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  {
    key: 'X-Frame-Options',
    value: 'SAMEORIGIN',
  },
  {
    key: 'X-Content-Type-Options',
    value: 'nosniff',
  },
  {
    key: 'Referrer-Policy',
    value: 'strict-origin-when-cross-origin',
  },
  {
    key: 'Permissions-Policy',
    value: 'camera=(), microphone=(), geolocation=()',
  },
  {
    key: 'Cross-Origin-Opener-Policy',
    value: 'same-origin',
  },
];

/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    optimizePackageImports: ['@nextblock-cms/ui', '@nextblock-cms/utils'],
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 2560],
    qualities: [60, 75],
    minimumCacheTTL: 31_536_000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: getRemotePatterns(),
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  },
  turbopack: {
    // Work around Turbopack subpath resolution for the latest y-protocols package.
    resolveAlias: {
      'y-protocols/awareness': 'y-protocols/awareness.js',
    },
  },
  transpilePackages: [
    '@nextblock-cms/utils',
    '@nextblock-cms/ui',
    '@nextblock-cms/editor',
  ],
  async headers() {
    const headers = [...securityHeaders];
    if (process.env.NEXT_PUBLIC_IS_SANDBOX === 'true') {
      headers.push({
        key: 'X-Robots-Tag',
        value: 'noindex',
      });
    }
    return [
      {
        source: '/:path*',
        headers,
      },
    ];
  },
};

/** @type {typeof import('@vercel/toolbar/plugins/next').withVercelToolbar} */
const withVercelToolbar = require('@vercel/toolbar/plugins/next').withVercelToolbar;

module.exports = shouldEnableVercelToolbarPlugin
  ? withVercelToolbar()(nextConfig)
  : nextConfig;

function getRemotePatterns() {
  /** @type {RemotePattern[]} */
  const patterns = [];

  // Add R2 Bucket URL if authenticated
  if (process.env.NEXT_PUBLIC_R2_PUBLIC_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_R2_PUBLIC_URL);
      patterns.push({
        protocol: parsed.protocol === 'https:' ? 'https' : 'http',
        hostname: parsed.hostname,
        pathname: '/**',
      });
    } catch {
      // ignore malformed value
    }
  }

  // Add R2 Custom Domain URL
  if (process.env.NEXT_PUBLIC_R2_BASE_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_R2_BASE_URL);
      patterns.push({
        protocol: parsed.protocol === 'https:' ? 'https' : 'http',
        hostname: parsed.hostname,
        pathname: '/**',
      });
    } catch {
      // ignore malformed value
    }
  }

  // Add General Public URL
  if (process.env.NEXT_PUBLIC_URL) {
    try {
      const parsed = new URL(process.env.NEXT_PUBLIC_URL);
      if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
        patterns.push({
          protocol: parsed.protocol === 'https:' ? 'https' : 'http',
          hostname: parsed.hostname,
          pathname: '/**',
        });
      }
    } catch {
      // ignore malformed value
    }
  }

  return patterns;
}
