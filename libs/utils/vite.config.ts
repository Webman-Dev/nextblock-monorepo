import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import * as fs from 'fs';

const packageJsonPath = path.resolve(__dirname, 'package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

export default defineConfig({
  root: __dirname,
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.json',
      outDir: '../../dist/libs/utils',
      afterBuild: () => {
        const packageJson = {
          name: '@nextblock-cms/utils',
          version,
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts',
          exports: {
            '.': {
              types: './index.d.ts',
              require: './index.cjs.js',
              default: './index.es.js',
            },
            './server': {
              types: './server.d.ts',
              require: './server.cjs.js',
              default: './server.es.js',
            },
            './package.json': './package.json',
          },
          dependencies: {
            'clsx': '^2.1.1',
            'tailwind-merge': '^3.0.0',
          },
        };

        const outputDir = path.resolve(__dirname, '../../dist/libs/utils');
        fs.writeFileSync(
          path.join(outputDir, 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );

        const ensureClientDirective = (fileName: string) => {
          const filePath = path.join(outputDir, fileName);
          if (!fs.existsSync(filePath)) {
            return;
          }

          const contents = fs.readFileSync(filePath, 'utf8');
          if (contents.includes("'use client'") || contents.includes('"use client"')) {
            return;
          }

          const directive = "'use client';\n";
          const strictPatterns = [
            "'use strict';\r\n",
            "'use strict';\n",
            "'use strict';",
            '"use strict";\r\n',
            '"use strict";\n',
            '"use strict";',
          ];

          for (const pattern of strictPatterns) {
            if (contents.startsWith(pattern)) {
              const suffix = contents.slice(pattern.length);
              const lineBreak = pattern.endsWith('\n') || pattern.endsWith('\r\n') ? '' : '\n';
              fs.writeFileSync(filePath, `${pattern}${lineBreak}${directive}${suffix}`);
              return;
            }
          }

          fs.writeFileSync(filePath, `${directive}${contents}`);
        };

        ensureClientDirective('libs/utils/src/lib/translations-context.es.js');
        ensureClientDirective('libs/utils/src/lib/translations-context.cjs.js');
        ensureClientDirective('libs/utils/src/lib/client-utils.es.js');
        ensureClientDirective('libs/utils/src/lib/client-utils.cjs.js');

        const serverSharedHelper = `
const missingEnvMessage = 'R2 client environment variables are missing. File uploads will not work. Needed: R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_S3_ENDPOINT (or construct from R2_ACCOUNT_ID)';

let cachedClient = null;
let warnedMissingEnv = false;

function buildS3Client(factory) {
  if (cachedClient) {
    return cachedClient;
  }

  const accountId = process.env.R2_ACCOUNT_ID;
  const accessKeyId = process.env.R2_ACCESS_KEY_ID;
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
  const endpoint =
    process.env.R2_S3_ENDPOINT ||
    (accountId ? \`https://\${accountId}.r2.cloudflarestorage.com\` : undefined);

  if (!accountId || !accessKeyId || !secretAccessKey || !endpoint) {
    if (!warnedMissingEnv) {
      console.warn(missingEnvMessage);
      warnedMissingEnv = true;
    }
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = factory({
    region: process.env.R2_REGION || 'auto',
    endpoint,
    credentials: {
      accessKeyId,
      secretAccessKey,
    },
  });

  return cachedClient;
}

async function hasEnvVars() {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

async function getEmailServerConfig() {
  const SMTP_HOST = process.env.SMTP_HOST;
  const SMTP_PORT = process.env.SMTP_PORT;
  const SMTP_USER = process.env.SMTP_USER;
  const SMTP_PASS = process.env.SMTP_PASS;
  const SMTP_FROM_EMAIL = process.env.SMTP_FROM_EMAIL;
  const SMTP_FROM_NAME = process.env.SMTP_FROM_NAME;

  if (
    !SMTP_HOST ||
    !SMTP_PORT ||
    !SMTP_USER ||
    !SMTP_PASS ||
    !SMTP_FROM_EMAIL
  ) {
    console.warn(
      'Email server environment variables are missing. Email will not be sent.',
    );
    return null;
  }

  const from = SMTP_FROM_NAME
    ? \`"\${SMTP_FROM_NAME}" <\${SMTP_FROM_EMAIL}>\`
    : SMTP_FROM_EMAIL;

  return {
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
    from,
  };
}

async function encodedRedirect(type, path, message) {
  const { redirect } = await import('next/navigation');
  return redirect(\`\${path}?\${type}=\${encodeURIComponent(message)}\`);
}
`.trimStart();

        const serverOnlyGuard = `
const SERVER_ONLY_ERROR_MESSAGE = 'This module cannot be imported from a Client Component module. It should only be used from a Server Component.';

if (typeof window !== 'undefined') {
  throw new Error(SERVER_ONLY_ERROR_MESSAGE);
}
`.trimStart();

        const serverEsm = `'use server';
${serverOnlyGuard}
import { S3Client } from '@aws-sdk/client-s3';

${serverSharedHelper}

async function getS3Client() {
  const client = buildS3Client((config) => new S3Client(config));
  return client;
}

export { getS3Client, encodedRedirect, getEmailServerConfig, hasEnvVars };
`;

        const serverCjs = `'use server';
${serverOnlyGuard}
const { S3Client } = require('@aws-sdk/client-s3');

${serverSharedHelper}

async function getS3Client() {
  const client = buildS3Client((config) => new S3Client(config));
  return client;
}

module.exports = { getS3Client, encodedRedirect, getEmailServerConfig, hasEnvVars };
`;

        const serverDts = `import { S3Client } from '@aws-sdk/client-s3';

export declare function getS3Client(): Promise<S3Client | null>;
export declare function encodedRedirect(type: 'error' | 'success', path: string, message: string): Promise<never>;
export declare function getEmailServerConfig(): Promise<{
  host: string;
  port: number;
  auth: {
    user: string;
    pass: string;
  };
  from: string;
} | null>;
export declare function hasEnvVars(): Promise<boolean>;
`;

        fs.writeFileSync(path.join(outputDir, 'server.es.js'), serverEsm);
        fs.writeFileSync(path.join(outputDir, 'server.cjs.js'), serverCjs);
        fs.writeFileSync(path.join(outputDir, 'server.d.ts'), serverDts);

      },
    }),
    react(),
  ],
  build: {
    lib: {
      entry: {
        index: './src/index.ts',
        server: './src/server.ts',
      },
      name: 'utils',
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      output: {
        preserveModules: true,
        preserveModulesRoot: 'src',
      },
      external: (id) => {
        if (id === 'react' || id === 'react-dom' || id === 'react/jsx-runtime') {
          return true;
        }
        if (id === 'clsx' || id === 'tailwind-merge') {
          return true;
        }
        if (id.startsWith('next/')) {
          return true;
        }
        if (id.includes('node_modules/next/')) {
          return true;
        }
        return false;
      },
    },
  },
});
