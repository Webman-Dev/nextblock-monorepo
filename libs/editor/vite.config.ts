import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import * as fs from 'fs';

export default defineConfig({
  root: __dirname,
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.json',
      outDir: '../../dist/libs/editor',
      afterBuild: () => {
        const packageJson = {
          name: 'editor',
          version: '0.0.1',
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts',
        };
        fs.writeFileSync(
          path.resolve(__dirname, '../../dist/libs/editor', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      },
    }),
    react(),
  ],
  resolve: {
    alias: {
      '@nextblock-monorepo/ui': path.resolve(__dirname, '../ui/src/index.ts'),
      '@nextblock-monorepo/utils': path.resolve(__dirname, '../utils/src/index.ts'),
    },
  },
  build: {
    emptyOutDir: true,
    outDir: '../../dist/libs/editor',
    lib: {
      entry: './src/index.ts',
      name: 'editor',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: ['react', 'react-dom', /^@nextblock-monorepo\/.*/],
    },
  },
});
