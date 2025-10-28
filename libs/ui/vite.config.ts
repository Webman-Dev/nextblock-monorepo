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
      tsconfigPath: './tsconfig.lib.json',
      outDir: '../../dist/libs/ui',
      skipDiagnostics: true,
      afterBuild: () => {
        const packageJson = {
          name: '@nextblock-cms/ui',
          version,
          main: 'index.cjs.js',
          module: 'index.es.js',
          types: 'index.d.ts'
        };

        fs.writeFileSync(
          resolveFrom('../../dist/libs/ui', 'package.json'),
          JSON.stringify(packageJson, null, 2)
        );
      }
    }),
    react()
  ],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'ui',
      fileName: 'index',
      formats: ['es', 'cjs']
    },
    rollupOptions: {
      external: ['react', 'react-dom', /^@nextblock-cms\/.*/]
    }
  }
});
