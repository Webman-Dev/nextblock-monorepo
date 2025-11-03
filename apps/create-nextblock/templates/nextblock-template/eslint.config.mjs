import nx from '@nx/eslint-plugin';
import baseConfig from '../../eslint.config.mjs';
import nextPlugin from '@next/eslint-plugin-next';

const nextRules = {
  ...nextPlugin.configs.recommended.rules,
  ...nextPlugin.configs['core-web-vitals'].rules,
};

const config = [
  ...baseConfig,
  ...nx.configs['flat/react-typescript'],
  {
    ignores: ['.next/**/*', '**/next-env.d.ts', 'apps/nextblock/next-env.d.ts'],
  },
  {
    files: [
      '**/*.ts',
      '**/*.tsx',
      '**/*.js',
      '**/*.jsx',
      '**/*.mjs',
      '**/*.cjs',
    ],
    plugins: {
      '@next/next': nextPlugin,
    },
    rules: {
      ...nextRules,
      '@next/next/no-html-link-for-pages': ['error', 'apps/nextblock/app'],
    },
  },
];

export default config;
