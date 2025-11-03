//@ts-check

/**
 * @typedef {{ protocol?: 'http' | 'https'; hostname: string; port?: string; pathname?: string }} RemotePattern
 */

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  transpilePackages: [
    '@nextblock-cms/utils',
    '@nextblock-cms/ui',
    '@nextblock-cms/editor',
  ],
};

module.exports = nextConfig;

function getRemotePatterns() {
  /** @type {RemotePattern[]} */
  const patterns = [
    {
      protocol: 'https',
      hostname: 'pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev',
      pathname: '/**',
    },
    {
      protocol: 'https',
      hostname: 'e260676f72b0b18314b868f136ed72ae.r2.cloudflarestorage.com',
      pathname: '/**',
    },
  ];

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
