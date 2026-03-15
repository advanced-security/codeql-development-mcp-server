#!/usr/bin/env node
/**
 * Downloads VS Code for integration testing.
 *
 * This script pre-downloads the VS Code instance required by @vscode/test-cli
 * for running Extension Host integration tests. Used in CI/copilot setup steps
 * to ensure VS Code is available before running tests.
 *
 * Usage: node scripts/download-vscode.js [version]
 *
 * The version defaults to the minimum VS Code version from engines.vscode in
 * package.json (e.g. "^1.110.0" -> "1.110.0"). Pass "stable" or an explicit
 * version to override.
 */

import { readFileSync } from 'node:fs';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

function getEnginesVscodeVersion() {
  const pkg = JSON.parse(readFileSync(new URL('../package.json', import.meta.url), 'utf-8'));
  const range = pkg.engines?.vscode;
  if (range) {
    const match = range.match(/(\d+\.\d+\.\d+)/);
    if (match) return match[1];
  }
  return 'stable';
}

const version = process.argv[2] || getEnginesVscodeVersion();

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
