import js from '@eslint/js';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  { ignores: ['dist', 'web/dist', 'node_modules', 'db/migrations', 'playwright-report', 'test-results'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/consistent-type-imports': 'error',
      'no-console': 'off',
    },
  },
  // Operational scripts run under node, outside the application. Declared
  // rather than exempted: the check caught the first one added here, which is
  // the check working, and switching it off would have been the wrong repair.
  {
    files: ['scripts/**/*.mjs', 'scripts/**/*.js'],
    languageOptions: { globals: globals.node },
  },
);
