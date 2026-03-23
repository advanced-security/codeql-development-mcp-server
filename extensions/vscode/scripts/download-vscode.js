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

import { existsSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { downloadAndUnzipVSCode } from '@vscode/test-electron';

const MAX_RETRIES = 3;
const version = process.argv[2] || 'stable';

// @vscode/test-electron can emit unhandled rejections from internal stream
// errors (e.g. ECONNRESET). Suppress them here so the retry loop can handle
// the failure via the caught exception from the await.
let suppressedError = null;
process.on('unhandledRejection', (reason) => {
  suppressedError = reason;
  const msg = reason instanceof Error ? reason.message : String(reason);
  console.error(`   (suppressed unhandled rejection: ${msg})`);
});

/**
 * Remove partially-downloaded VS Code artifacts so the next attempt starts
 * fresh instead of hitting a checksum mismatch on a truncated archive.
 */
function cleanPartialDownload() {
  const cacheDir = join(new URL('..', import.meta.url).pathname, '.vscode-test');
  if (existsSync(cacheDir)) {
    console.log('   Cleaning .vscode-test/ to remove partial downloads...');
    rmSync(cacheDir, { recursive: true, force: true });
  }
}

console.log(`Downloading VS Code (${version}) for integration tests...`);

for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
  suppressedError = null;
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
      cleanPartialDownload();
      const delayMs = attempt * 5_000;
      console.log(`   Retrying in ${delayMs / 1_000}s...`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    } else {
      console.error('❌ All download attempts failed.');
      process.exit(1);
    }
  }
}
