import { defineConfig } from 'vite';
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
      outDir: '../../dist/libs/db',
      exclude: ['vite.config.ts'],
      afterBuild: () => {
        const packageJson = {
          name: '@nextblock-cms/db',
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
          files: [
            'dist',
            'supabase',
            'supabase/**',
            'lib',
            '*.js',
            '*.cjs.js',
            '*.es.js',
            '*.mjs',
            '*.d.ts'
          ],
        };

        fs.writeFileSync(
          path.resolve(__dirname, '../../dist/libs/db', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      },
    }),
  ],
  build: {
    lib: {
      entry: {
        index: path.resolve(__dirname, './src/index.ts'),
        server: path.resolve(__dirname, './src/server.ts'),
      },
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => {
        const extension = format === 'es' ? 'es' : 'cjs';
        return `${entryName}.${extension}.js`;
      },
    },
    rollupOptions: {
      external: [
        '@supabase/ssr',
        '@supabase/supabase-js',
        'next/headers',
        'next/server',
      ],
    },
  },
});
