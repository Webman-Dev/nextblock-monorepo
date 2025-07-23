import { defineConfig } from 'vite';
import tsconfigPaths from 'vite-tsconfig-paths';

export default defineConfig({
  root: __dirname,
  plugins: [tsconfigPaths()],
  build: {
    lib: {
      entry: './src/index.ts',
      name: 'db',
      fileName: 'index',
      formats: ['es', 'cjs'],
    },
  },
});