import js from '@eslint/js';
import typescript from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default [
  js.configs.recommended,
  prettier,
  {
    files: ['src/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescript.parser,
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': typescript.plugin,
    },
    rules: {
      ...typescript.configs.recommendedTypeChecked[0].rules,
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },
  {
    // Handle test files with their own tsconfig - more lenient rules for tests
    files: ['test/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      parser: typescript.parser,
      globals: {
        process: 'readonly',
        console: 'readonly',
        Buffer: 'readonly',
        __dirname: 'readonly',
        __filename: 'readonly',
      },
      parserOptions: {
        tsconfigRootDir: import.meta.dirname,
        project: ['./test/tsconfig.json'],
      },
    },
    plugins: {
      '@typescript-eslint': typescript.plugin,
    },
    rules: {
      ...typescript.configs.recommendedTypeChecked[0].rules,
      '@typescript-eslint/no-unused-vars': ['error', {
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        caughtErrorsIgnorePattern: '^_',
      }],
      'no-unused-vars': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
    },
  },
  {
    files: ['*.config.{js,mjs,ts}', 'eslint.config.mjs'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
    },
    rules: {},
  },
  {
    // Integration test suite files use Mocha globals (suite/test),
    // not vitest, and don't need type-checked lint rules.
    files: ['test/suite/**/*.ts'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        suite: 'readonly',
        test: 'readonly',
        setup: 'readonly',
        teardown: 'readonly',
        suiteSetup: 'readonly',
        suiteTeardown: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': 'off',
    },
  },
  {
    ignores: ['dist/', 'node_modules/', 'esbuild.config.js'],
  },
];
