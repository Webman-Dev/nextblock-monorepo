import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';
import * as path from 'path';
import * as fs from 'fs';

const resolveFrom = (...segments: string[]) => path.resolve(__dirname, ...segments);
const packageJsonPath = resolveFrom('package.json');
const { version } = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

export default defineConfig({
  root: __dirname,
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.json',
      outDir: '../../dist/libs/editor',
      afterBuild: () => {
        const packageJson = {
          name: '@nextblock-cms/editor',
          version,
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts'
        };

        fs.writeFileSync(
          resolveFrom('../../dist/libs/editor', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      }
    }),
    react()
  ],
  resolve: {
    alias: [
      { find: '@nextblock-cms/ui/', replacement: resolveFrom('../ui/src/lib') + '/' },
      { find: '@nextblock-cms/ui', replacement: resolveFrom('../ui/src/index.ts') },
      { find: '@nextblock-cms/utils/', replacement: resolveFrom('../utils/src') + '/' },
      { find: '@nextblock-cms/utils', replacement: resolveFrom('../utils/src/index.ts') }
    ]
  },
  build: {
    emptyOutDir: true,
    outDir: '../../dist/libs/editor',
    lib: {
      entry: './src/index.ts',
      name: 'editor',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom', /^@nextblock-cms\/.*/]
    }
  }
});
