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
      outDir: '../../dist/libs/utils',
      afterBuild: () => {
        const packageJson = {
          name: '@nextblock-cms/utils',
          version: '0.0.1',
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts',
        };

        fs.writeFileSync(
          path.resolve(__dirname, '../../dist/libs/utils', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
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
      external: ['react', 'react-dom'],
    },
  },
});