#!/usr/bin/env node
/**
 * Downloads VS Code for integration testing.
 *
 * This script pre-downloads the VS Code instance required by @vscode/test-cli
 * for running Extension Host integration tests. Used in CI/copilot setup steps
 * to ensure VS Code is available before running tests.
 *
 * Usage: node scripts/download-vscode.js [version]
 * Default version: stable
 */

import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const version = process.argv[2] || 'stable';

console.log(`Downloading VS Code (${version}) for integration tests...`);

try {
  const vscodeExecutablePath = await downloadAndUnzipVSCode(version);
  console.log(`✅ VS Code downloaded to: ${vscodeExecutablePath}`);
} catch (error) {
  console.error(
    '❌ Failed to download VS Code:',
    error instanceof Error ? error.message : String(error),
  );
  process.exit(1);
}
