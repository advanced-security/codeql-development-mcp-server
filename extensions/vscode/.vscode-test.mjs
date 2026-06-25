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
import { cpSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { fileURLToPath } from 'url';

// Place user-data-dir at the *project root* .tmp/ rather than under
// extensions/vscode/.tmp/ — the shorter path keeps the IPC socket under
// the 103-char sun_path limit on macOS/Linux.
const extensionRoot = fileURLToPath(new URL('.', import.meta.url));
const tmpRoot = join(extensionRoot, '..', '..', '.tmp');
// Ensure the gitignored .tmp/ exists before anything writes into it. In a
// clean checkout it is absent, so cpSync/userDataDir would otherwise throw
// ENOENT because the parent directory is missing.
mkdirSync(tmpRoot, { recursive: true });
const userDataDir = join(tmpRoot, 'vsc-ud');

// The multi-root workspace tests mutate the workspace folder list via
// `vscode.workspace.updateWorkspaceFolders`, which makes VS Code persist (and
// normalize, e.g. appending a `"settings": {}` block) the backing
// `.code-workspace` file. Opening the tracked fixture directly would therefore
// leave the working tree dirty and fail the CI "uncommitted changes" check.
// Copy the fixture into the gitignored .tmp/ on each run and open the copy so
// the tracked fixture is never modified. Folder entries inside the workspace
// file are relative, so copying the whole directory preserves them.
const multiRootFixture = join(
  extensionRoot,
  'test',
  'fixtures',
  'multi-root-workspace',
);
const multiRootWorkspaceCopy = join(
  tmpRoot,
  'multi-root-workspace',
);
rmSync(multiRootWorkspaceCopy, { recursive: true, force: true });
cpSync(multiRootFixture, multiRootWorkspaceCopy, { recursive: true });
const multiRootWorkspaceFile = join(
  multiRootWorkspaceCopy,
  'test.code-workspace',
);

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
    workspaceFolder: multiRootWorkspaceFile,
    launchArgs: ['--user-data-dir', userDataDir],
    mocha: {
      ui: 'tdd',
      color: true,
      timeout: 60_000,
    },
  },
]);
