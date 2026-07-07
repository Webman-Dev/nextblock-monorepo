import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
  test: {
    globals: true,
    alias: [
      { find: 'server-only', replacement: path.resolve(__dirname, './tools/stubs/server-only.js') },
      
      // Exact anchored mappings (checked first)
      { find: /^@nextblock-cms\/db\/server$/, replacement: path.resolve(__dirname, './libs/db/src/server.ts') },
      { find: /^@nextblock-cms\/db$/, replacement: path.resolve(__dirname, './libs/db/src/index.ts') },
      
      { find: /^@nextblock-cms\/ecommerce\/server$/, replacement: path.resolve(__dirname, './libs/ecommerce/src/server.ts') },
      { find: /^@nextblock-cms\/ecommerce\/actions$/, replacement: path.resolve(__dirname, './libs/ecommerce/src/actions.ts') },
      { find: /^@nextblock-cms\/ecommerce$/, replacement: path.resolve(__dirname, './libs/ecommerce/src/index.ts') },
      
      { find: /^@nextblock-cms\/editor$/, replacement: path.resolve(__dirname, './libs/editor/src/index.ts') },
      { find: /^@nextblock-cms\/sdk$/, replacement: path.resolve(__dirname, './libs/sdk/src/index.ts') },
      
      { find: /^@nextblock-cms\/ui\/styles$/, replacement: path.resolve(__dirname, './libs/ui/src/styles') },
      { find: /^@nextblock-cms\/ui\/tailwind.config.js$/, replacement: path.resolve(__dirname, './libs/ui/tailwind.config.js') },
      { find: /^@nextblock-cms\/ui$/, replacement: path.resolve(__dirname, './libs/ui/src/index.ts') },
      
      { find: /^@nextblock-cms\/utils\/server$/, replacement: path.resolve(__dirname, './libs/utils/src/server.ts') },
      { find: /^@nextblock-cms\/utils$/, replacement: path.resolve(__dirname, './libs/utils/src/index.ts') },

      { find: /^@nextblock-cms\/cortex\/client$/, replacement: path.resolve(__dirname, './libs/cortex/src/client.ts') },
      { find: /^@nextblock-cms\/cortex$/, replacement: path.resolve(__dirname, './libs/cortex/src/index.ts') },

      // Wildcard fallback mappings
      { find: /^@nextblock-cms\/ui\/styles\/(.*)$/, replacement: path.resolve(__dirname, './libs/ui/src/styles/$1') },
      { find: /^@nextblock-cms\/ui\/(.*)$/, replacement: path.resolve(__dirname, './libs/ui/src/lib/$1') },
      { find: /^@nextblock-cms\/ecommerce\/(.*)$/, replacement: path.resolve(__dirname, './libs/ecommerce/src/lib/$1') },
      { find: /^@nextblock-cms\/editor\/(.*)$/, replacement: path.resolve(__dirname, './libs/editor/src/$1') },
      { find: /^@\/(.*)$/, replacement: path.resolve(__dirname, './apps/nextblock/$1') },
    ],
  },
});
