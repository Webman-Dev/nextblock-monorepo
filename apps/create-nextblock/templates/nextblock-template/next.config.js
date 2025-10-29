//@ts-check

const { composePlugins, withNx } = require('@nx/next');

/**
 * @type {import('@nx/next/plugins/with-nx').WithNxOptions}
 **/
const nextConfig = {
  // Use this to set Nx-specific options
  // See: https://nx.dev/recipes/next/next-config-setup
  nx: {svgr: false},
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  },
  images: {
    formats: ['image/avif', 'image/webp'],
    imageSizes: [16, 32, 48, 64, 96, 128, 256, 384, 512],
    deviceSizes: [320, 480, 640, 750, 828, 1080, 1200, 1440, 1920, 2048, 2560],
    minimumCacheTTL: 31536000,
    dangerouslyAllowSVG: false,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'pub-a31e3f1a87d144898aeb489a8221f92e.r2.dev',
      },
      {
        protocol: 'https',
        hostname: 'e260676f72b0b18314b868f136ed72ae.r2.cloudflarestorage.com',
      },
      // Add other necessary hostnames, for example, from NEXT_PUBLIC_URL if it's different
      // and used for images. This example assumes NEXT_PUBLIC_R2_BASE_URL's hostname is the one above.
      // If NEXT_PUBLIC_URL is also an image source and has a different hostname:
      ...(process.env.NEXT_PUBLIC_URL
        ? [
            {
              protocol: /** @type {'http' | 'https'} */ (new URL(process.env.NEXT_PUBLIC_URL).protocol.slice(0, -1)),
              hostname: new URL(process.env.NEXT_PUBLIC_URL).hostname,
            },
          ]
        : []),
    ],
  },
experimental: {
    optimizeCss: true,
    cssChunking: 'strict',
  },
  transpilePackages: ['@nextblock-cms/utils', '@nextblock-cms/ui', '@nextblock-cms/editor'],
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.module.rules.push({
      test: /\.svg$/i,
      issuer: /\.[jt]sx?$/,
      use: ['@svgr/webpack'],
    });
      // Optimize TipTap bundle separation for client-side
      config.optimization = {
        ...config.optimization,
        splitChunks: {
          ...config.optimization.splitChunks,
          cacheGroups: {
            ...config.optimization.splitChunks?.cacheGroups,
            // Create a separate chunk for TipTap and related dependencies
            tiptap: {
              test: /[\\/]node_modules[\\/](@tiptap|prosemirror)[\\/]/,
              name: 'tiptap',
              chunks: 'async', // Only include in async chunks (dynamic imports)
              priority: 30,
              reuseExistingChunk: true,
            },
            // Separate chunk for TipTap extensions and custom components
            tiptapExtensions: {
              test: /[\\/](tiptap-extensions|RichTextEditor|MenuBar|MediaLibraryModal)[\\/]/,
              name: 'tiptap-extensions',
              chunks: 'async',
              priority: 25,
              reuseExistingChunk: true,
            },
          },
        },
      };
    }
    return config;
  },
  turbopack: {
    // Turbopack-specific options can be placed here if needed in the future
  },
  compiler: {
    removeConsole: process.env.NODE_ENV === 'production',
  }
};

const plugins = [
  // Add more Next.js plugins to this list if needed.
  withNx,
];

module.exports = composePlugins(...plugins)(nextConfig);
