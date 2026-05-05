import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { FlatCompat } from '@eslint/eslintrc';
import tseslint from 'typescript-eslint';
import importPlugin from 'eslint-plugin-import';
import prettierConfig from 'eslint-config-prettier';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// FlatCompat lets us keep eslint-config-next (which still ships a
// legacy preset on Next 14.x) until Next exposes a flat-native
// config. The rest of the config is native flat.
const compat = new FlatCompat({ baseDirectory: __dirname });

const config = [
  {
    ignores: ['.next/**', 'node_modules/**', 'coverage/**', '.lighthouseci/**', 'next-env.d.ts'],
  },

  ...compat.extends('next/core-web-vitals'),

  {
    rules: {
      // Apostrophes in JSX prose ("you're", "didn't") are intentional;
      // escaping them via &apos; hurts readability without buying
      // anything since React already escapes text content.
      'react/no-unescaped-entities': 'off',
    },
  },

  ...tseslint.configs.recommendedTypeChecked.map((c) => ({
    ...c,
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ...c.languageOptions,
      parserOptions: {
        ...c.languageOptions?.parserOptions,
        project: './tsconfig.json',
        tsconfigRootDir: __dirname,
      },
    },
  })),

  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: { import: importPlugin },
    settings: {
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
        node: true,
      },
    },
    rules: {
      'import/order': [
        'error',
        {
          groups: ['builtin', 'external', 'internal', 'parent', 'sibling', 'index', 'type'],
          'newlines-between': 'never',
          alphabetize: { order: 'asc', caseInsensitive: true },
        },
      ],
      'import/no-duplicates': 'error',
      // Type-checked rules: these flag real bugs but the recommended
      // preset has a few that are too noisy for this codebase. Tune
      // them rather than disabling whole-cloth.
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-misused-promises': [
        'error',
        { checksVoidReturn: { attributes: false } },
      ],
    },
  },

  // Test files don't need the strictest type-checked rules — fakes
  // and partial mocks make `unsafe-*` reports too loud to be useful.
  // require-await is also intentionally off: `act(async () => sync())`
  // is the documented pattern with fake timers + React 18.
  {
    files: ['src/**/*.test.{ts,tsx}', 'src/__a11y__/**'],
    rules: {
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/unbound-method': 'off',
      '@typescript-eslint/require-await': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
      'import/order': 'off',
    },
  },

  prettierConfig,
];

export default config;
