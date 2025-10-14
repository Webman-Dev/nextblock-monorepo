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
