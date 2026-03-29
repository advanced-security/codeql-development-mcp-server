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
import { join } from 'path';
import { fileURLToPath } from 'url';

// Place user-data-dir at the *project root* .tmp/ rather than under
// extensions/vscode/.tmp/ — the shorter path keeps the IPC socket under
// the 103-char sun_path limit on macOS/Linux.
const extensionRoot = fileURLToPath(new URL('.', import.meta.url));
const userDataDir = join(extensionRoot, '..', '..', '.tmp', 'vsc-ud');

export default defineConfig([
  {
    label: 'noWorkspace',
    files: 'dist/test/suite/*.test.cjs',
    version: 'stable',
    launchArgs: ['--user-data-dir', userDataDir],
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
    launchArgs: ['--user-data-dir', userDataDir],
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
    launchArgs: ['--user-data-dir', userDataDir],
    mocha: {
      ui: 'tdd',
      color: true,
      timeout: 60_000,
    },
  },
]);
