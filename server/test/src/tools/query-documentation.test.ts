/**
 * Tests that every server/ql tools query (.ql) has a matching
 * documentation file (.md) in the same directory.
 *
 * This is a filesystem-level guard that runs as part of the standard
 * `npm test` suite and will fail the build if any documentation is
 * missing.
 */

import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** Absolute path to `server/ql` within the repository. */
const QL_ROOT = path.resolve(__dirname, '..', '..', '..', 'ql');

/**
 * Recursively discover all `.ql` files under `server/ql/<lang>/tools/src/`.
 */
function discoverToolsQueries(): string[] {
  const queries: string[] = [];

  // Each language directory under server/ql/
  const languages = fs
    .readdirSync(QL_ROOT, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);

  for (const lang of languages) {
    const toolsSrcDir = path.join(QL_ROOT, lang, 'tools', 'src');
    if (!fs.existsSync(toolsSrcDir)) continue;

    // Each query directory under tools/src/
    const queryDirs = fs
      .readdirSync(toolsSrcDir, { withFileTypes: true })
      .filter((d) => d.isDirectory())
      .map((d) => d.name);

    for (const queryDir of queryDirs) {
      const qlFile = path.join(toolsSrcDir, queryDir, `${queryDir}.ql`);
      if (fs.existsSync(qlFile)) {
        queries.push(qlFile);
      }
    }
  }

  return queries.sort();
}

describe('Tools query documentation', () => {
  const queries = discoverToolsQueries();

  it('should discover at least one tools query', () => {
    expect(queries.length).toBeGreaterThan(0);
  });

  it('every tools query (.ql) should have a matching documentation file (.md)', () => {
    const missing: string[] = [];

    for (const qlFile of queries) {
      const mdFile = qlFile.replace(/\.ql$/, '.md');
      if (!fs.existsSync(mdFile)) {
        // Report workspace-relative path for readability
        const relative = path.relative(path.resolve(QL_ROOT, '..'), mdFile);
        missing.push(relative);
      }
    }

    expect(
      missing,
      `Missing documentation files:\n  ${missing.join('\n  ')}`
    ).toHaveLength(0);
  });
});
