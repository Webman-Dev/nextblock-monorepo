import { defineConfig } from 'vite';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import * as fs from 'fs';

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
          version: '0.0.1',
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts',
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
      entry: './src/index.ts',
      name: 'db',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
  },
});