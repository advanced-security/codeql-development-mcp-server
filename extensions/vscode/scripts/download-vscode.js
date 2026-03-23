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
 * The version defaults to 'stable' to match the .vscode-test.mjs configuration.
 * Pass an explicit version (e.g. "1.110.0") to override.
 */

import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const MAX_RETRIES = 3;
const version = process.argv[2] || 'stable';

console.log(`Downloading VS Code (${version}) for integration tests...`);

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  try {
    const vscodeExecutablePath = await downloadAndUnzipVSCode({
      version,
      timeout: 120_000,
    });
    console.log(`✅ VS Code downloaded to: ${vscodeExecutablePath}`);
    process.exit(0);
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`❌ Attempt ${attempt}/${MAX_RETRIES} failed: ${message}`);
    if (attempt < MAX_RETRIES) {
      const delayMs = attempt * 5_000;
      console.log(`   Retrying in ${delayMs / 1_000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else {
      console.error('❌ All download attempts failed.');
      process.exit(1);
    }
  }
}
