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
