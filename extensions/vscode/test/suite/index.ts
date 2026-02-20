/**
 * Extension Host test runner entry point.
 *
 * VS Code's `--extensionTestsPath` expects a module that exports a `run()`
 * function. This file runs integration tests with Mocha inside the Extension
 * Development Host — where the real VS Code API is available.
 *
 * Each test file is compiled to a separate .cjs file by esbuild (via outdir),
 * so the runner discovers them via glob at runtime.
 *
 * These are INTEGRATION tests (real vscode API, real extension activation).
 * Unit tests stay in test/ and run via vitest (no Extension Host needed).
 */

import * as path from 'path';
import Mocha from 'mocha';
import { glob } from 'glob';

export async function run(): Promise<void> {
  const mocha = new Mocha({
    ui: 'tdd',
    color: true,
    timeout: 30_000,
  });

  const testsRoot = path.resolve(__dirname);

  // Find all compiled test files (*.test.cjs) in this directory
  const files = await glob('**/*.test.cjs', { cwd: testsRoot });

  for (const f of files) {
    mocha.addFile(path.resolve(testsRoot, f));
  }

  return new Promise((resolve, reject) => {
    try {
      mocha.run((failures) => {
        if (failures > 0) {
          reject(new Error(`${failures} test(s) failed.`));
        } else {
          resolve();
        }
      });
    } catch (err) {
      console.error('Test runner error:', err);
      reject(err);
    }
  });
}
