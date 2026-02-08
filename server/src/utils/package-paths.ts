/**
 * Utilities for resolving filesystem paths relative to the server package root.
 *
 * The server can run from three different directory layouts:
 *
 * 1. **Source** (dev):  `server/src/lib/` → packageRoot = `server/`
 * 2. **Bundle in monorepo** (dev/CI):  `server/dist/` → packageRoot = `server/`
 * 3. **Bundle via npm** (production):  `<pkg>/dist/` → packageRoot = `<pkg>/`
 *
 * In all three cases, the bundled QL tool query packs live at
 * `<packageRoot>/ql/<language>/tools/src/`.
 *
 * The "workspace root" (monorepo root) is one level above packageRoot when
 * running from the monorepo checkout, and the packageRoot itself when running
 * from an npm install (no parent monorepo).
 */

import { dirname, resolve } from 'path';
import { existsSync, readFileSync } from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Detect whether the current __dirname looks like source code (`src/lib` or
 * `src/utils`) vs a bundled flat output directory (`dist/`).
 *
 * Uses a tail-of-path check so that unrelated `/src/` segments earlier in the
 * install path (e.g. `~/src/project/node_modules/.../dist`) don't cause a
 * false positive.
 */
function isRunningFromSource(dir: string): boolean {
  const normalized = dir.replace(/\\/g, '/');
  return /\/src(\/[^/]+)?$/.test(normalized);
}

/**
 * Get the server package root directory.
 *
 * - From source (`server/src/utils/`): up 2 levels → `server/`
 * - From bundle (`server/dist/` or `<pkg>/dist/`): up 1 level → package root
 */
export function getPackageRootDir(currentDir: string = __dirname): string {
  return isRunningFromSource(currentDir)
    ? resolve(currentDir, '..', '..')   // src/utils → server/
    : resolve(currentDir, '..');         // dist/ → package root
}

/**
 * Get the workspace root directory (monorepo root when applicable).
 *
 * If a `package.json` with `workspaces` exists one level above the package
 * root, we're in a monorepo and that parent is the workspace root. Otherwise,
 * the packageRoot itself is the workspace root (npm install scenario).
 */
export function getWorkspaceRootDir(packageRoot?: string): string {
  const pkgRoot = packageRoot ?? getPackageRootDir();
  const parentDir = resolve(pkgRoot, '..');

  // In the monorepo, the parent directory contains a package.json with workspaces
  try {
    const parentPkgPath = resolve(parentDir, 'package.json');
    if (existsSync(parentPkgPath)) {
      const parentPkg = JSON.parse(readFileSync(parentPkgPath, 'utf8'));
      if (parentPkg.workspaces) {
        return parentDir;
      }
    }
  } catch {
    // Not in a monorepo — fall through
  }

  return pkgRoot;
}

/**
 * Resolve the path to a tool query pack's source directory.
 *
 * @param language - CodeQL language identifier (e.g., "javascript", "cpp")
 * @param packageRoot - Override the package root (for testing)
 * @returns Absolute path to `ql/<language>/tools/src/`
 */
export function resolveToolQueryPackPath(language: string, packageRoot?: string): string {
  const pkgRoot = packageRoot ?? getPackageRootDir();
  return resolve(pkgRoot, 'ql', language, 'tools', 'src');
}

// Pre-computed values for use throughout the server
export const packageRootDir = getPackageRootDir();
export const workspaceRootDir = getWorkspaceRootDir(packageRootDir);
