import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import dts from 'vite-plugin-dts';

export default defineConfig({
  root: __dirname,
  plugins: [
    dts({
      entryRoot: 'src',
      tsconfigPath: './tsconfig.lib.json',
      outDir: '../../dist/libs/ecommerce',
    }),
    react(),
  ],
  build: {
    lib: {
      entry: {
        index: './src/index.ts',
        server: './src/server.ts',
      },
      name: 'ecommerce',
      fileName: (format, entryName) => `${entryName}.${format}.js`,
      formats: ['es', 'cjs'],
    },
    rollupOptions: {
      external: (id) => {
        if (id.startsWith('react') || id.startsWith('next/')) return true;
        if (id.startsWith('@nextblock-cms/')) return true;
        if (id.includes('node_modules/')) return true;
        if (id.startsWith('@supabase/')) return true;
        if (id.startsWith('stripe')) return true;
        if (id === 'crypto' || id.startsWith('node:')) return true;
        return false;
      },
    },
  },
});
