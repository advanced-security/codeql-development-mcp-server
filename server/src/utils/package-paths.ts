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

import { delimiter, dirname, resolve, sep } from 'path';
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

/**
 * Read the package version from the nearest package.json.
 *
 * Cached at first call so the file is read at most once per process.
 */
let _cachedVersion: string | undefined;
export function getPackageVersion(): string {
  if (_cachedVersion !== undefined) return _cachedVersion;
  try {
    const pkgPath = resolve(getPackageRootDir(), 'package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    _cachedVersion = pkg.version ?? '0.0.0';
  } catch {
    _cachedVersion = '0.0.0';
  }
  return _cachedVersion as string;
}

/**
 * Get the effective workspace directory for resolving user-supplied relative
 * paths (test directories, database paths, pack dirs, etc.).
 *
 * In a monorepo checkout the workspace root is the monorepo parent.  In an
 * npm-installed layout, `workspaceRootDir` falls back to `packageRootDir`
 * which may be read-only and is not the user's project.  In that case we
 * fall back to `process.cwd()` so that relative paths resolve against the
 * directory the user actually invoked the server from.
 *
 * Override with `CODEQL_MCP_WORKSPACE` for deterministic behavior.
 */
export function getUserWorkspaceDir(): string {
  if (process.env.CODEQL_MCP_WORKSPACE) {
    return process.env.CODEQL_MCP_WORKSPACE;
  }
  // When workspaceRootDir === packageRootDir we are NOT in a monorepo
  // (npm-installed), so fall back to process.cwd().
  if (workspaceRootDir === packageRootDir) {
    return process.cwd();
  }
  return workspaceRootDir;
}

/**
 * Get the ordered list of user workspace directories used to resolve
 * user-supplied relative paths.
 *
 * In a multi-root VS Code workspace the project spans several root folders, so
 * a query, database, or pack referenced by a relative path may live in any of
 * them — not just the first.  When the host sets
 * `CODEQL_MCP_WORKSPACE_FOLDERS` (a {@link path.delimiter}-separated list, e.g.
 * `/a/repo:/b/app`) the entries are returned in order so callers can try each
 * root in turn.  Otherwise this falls back to the single
 * {@link getUserWorkspaceDir} result for a single-root workspace.
 */
export function getUserWorkspaceDirs(): string[] {
  const folders = process.env.CODEQL_MCP_WORKSPACE_FOLDERS;
  if (folders) {
    const dirs = folders
      .split(delimiter)
      .map((dir) => dir.trim())
      .filter((dir) => dir.length > 0);
    if (dirs.length > 0) {
      return dirs;
    }
  }
  return [getUserWorkspaceDir()];
}

/**
 * Compute a short, unique display label for each workspace root.
 *
 * In a multi-root workspace, path completions prefix each root-relative result
 * with the owning root's label so users can tell which folder/repo a file lives
 * in — without surfacing long absolute paths that can overflow the picker. The
 * label is the folder's basename, extended with just enough trailing parent
 * segments to disambiguate roots that happen to share a basename. The same
 * labels are used on the resolution side (see `resolvePromptFilePath`) so
 * labeled completion values round-trip back to the correct root.
 *
 * Labels are joined with the platform path separator so they read naturally in
 * the picker and resolve consistently. Genuinely identical root paths (which
 * callers de-duplicate upstream) collapse to the same label.
 *
 * @param roots Ordered list of absolute workspace root paths.
 * @returns A Map from each root path to its unique label.
 */
export function computeRootLabels(roots: string[]): Map<string, string> {
  const segmentsByRoot = new Map<string, string[]>();
  for (const root of roots) {
    segmentsByRoot.set(root, root.split(sep).filter((s) => s.length > 0));
  }

  const labelAtDepth = (segments: string[], depth: number): string => {
    if (segments.length === 0) {
      return sep; // filesystem-root edge case
    }
    return segments.slice(Math.max(0, segments.length - depth)).join(sep);
  };

  const depthByRoot = new Map<string, number>();
  for (const root of roots) {
    depthByRoot.set(root, 1);
  }

  // Grow the depth of any roots whose current label collides with another
  // root, until every label is unique or no further parent segments remain.
  for (;;) {
    const labelToRoots = new Map<string, string[]>();
    for (const root of roots) {
      const label = labelAtDepth(segmentsByRoot.get(root)!, depthByRoot.get(root)!);
      const sharing = labelToRoots.get(label);
      if (sharing) {
        sharing.push(root);
      } else {
        labelToRoots.set(label, [root]);
      }
    }

    let progressed = false;
    for (const sharing of labelToRoots.values()) {
      if (sharing.length < 2) {
        continue;
      }
      for (const root of sharing) {
        const depth = depthByRoot.get(root)!;
        if (depth < segmentsByRoot.get(root)!.length) {
          depthByRoot.set(root, depth + 1);
          progressed = true;
        }
      }
    }
    if (!progressed) {
      break;
    }
  }

  const labels = new Map<string, string>();
  for (const root of roots) {
    labels.set(root, labelAtDepth(segmentsByRoot.get(root)!, depthByRoot.get(root)!));
  }
  return labels;
}

// Pre-computed values for use throughout the server
export const packageRootDir = getPackageRootDir();
export const workspaceRootDir = getWorkspaceRootDir(packageRootDir);
