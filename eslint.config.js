// @ts-check
const eslint = require('@eslint/js');
const tseslint = require('typescript-eslint');
const prettierConfig = require('eslint-config-prettier');

module.exports = tseslint.config(
  eslint.configs.recommended,
  ...tseslint.configs.recommended,
  prettierConfig,
  {
    rules: {
      // TypeScript handles unused vars better than ESLint
      'no-unused-vars': 'off',
      '@typescript-eslint/no-unused-vars': ['error', { argsIgnorePattern: '^_' }],

      // Allow explicit `any` with a warning — useful in places like jimp interop
      '@typescript-eslint/no-explicit-any': 'warn',

      // Prefer const assertions over type assertions where possible
      '@typescript-eslint/consistent-type-assertions': ['error', { assertionStyle: 'as' }],

      // Don't require return types on every function — inferred types are fine
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/explicit-module-boundary-types': 'off',
    },
  },
  {
    files: ['test/**/*.ts'],
    rules: {
      // chai's .to.be.true / .to.be.false etc. are property accesses, not calls
      '@typescript-eslint/no-unused-expressions': 'off',
      // (img as any).write() cast is intentional jimp interop
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    ignores: ['dist/**', 'node_modules/**', 'test/**/*.js'],
  },
);
