/**
 * Configuration for @vscode/test-cli.
 *
 * Defines integration test profiles that run inside a VS Code Extension
 * Development Host with the REAL VS Code API. The compiled Mocha test
 * suite (dist/test/suite/*.cjs) is discovered by the runner in index.ts.
 *
 * Run all profiles:  npx vscode-test
 * Run one profile:   npx vscode-test --label noWorkspace
 *
 * Prerequisites:
 *   npm run bundle          # builds extension + test suite
 *   npm run bundle:server   # bundles MCP server for e2e tests
 */

import { defineConfig } from '@vscode/test-cli';

export default defineConfig([
  {
    label: 'noWorkspace',
    files: 'dist/test/suite/*.test.cjs',
    version: 'stable',
    mocha: {
      ui: 'tdd',
      color: true,
      timeout: 60_000,
    },
  },
  {
    label: 'singleFolder',
    files: 'dist/test/suite/*.test.cjs',
    version: 'stable',
    workspaceFolder: './test/fixtures/single-folder-workspace',
    mocha: {
      ui: 'tdd',
      color: true,
      timeout: 60_000,
    },
  },
  {
    label: 'multiRoot',
    files: 'dist/test/suite/*.test.cjs',
    version: 'stable',
    workspaceFolder: './test/fixtures/multi-root-workspace/test.code-workspace',
    mocha: {
      ui: 'tdd',
      color: true,
      timeout: 60_000,
    },
  },
]);
