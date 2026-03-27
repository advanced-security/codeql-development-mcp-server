/**
 * Download CodeQL databases using the GitHub REST API.
 *
 * When running inside the VS Code Extension Development Host, this uses
 * the VS Code GitHub authentication session (same auth as vscode-codeql).
 * When running standalone, it falls back to the GH_TOKEN env var.
 *
 * Downloads are cached on disk and reused if less than 24 hours old.
 */

import { createWriteStream, existsSync, mkdirSync, readFileSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { execFileSync } from 'child_process';
import { homedir } from 'os';
import { pipeline } from 'stream/promises';

const MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours

export interface RepoConfig {
  callGraphFromTo?: { sourceFunction: string; targetFunction: string };
  language: string;
  owner: string;
  repo: string;
}

/**
 * Get a GitHub token. Tries VS Code auth session first, then GH_TOKEN env var,
 * then `gh auth token` CLI.
 */
async function getGitHubToken(): Promise<string | undefined> {
  // Try VS Code authentication (when running in Extension Host)
  try {
    const vscode = await import('vscode');
    const session = await vscode.authentication.getSession('github', ['repo'], { createIfNone: false });
    if (session?.accessToken) {
      console.log('  🔑 Using VS Code GitHub authentication');
      return session.accessToken;
    }
  } catch {
    // Not in VS Code — fall through
  }

  // Try GH_TOKEN env var
  if (process.env.GH_TOKEN) {
    console.log('  🔑 Using GH_TOKEN environment variable');
    return process.env.GH_TOKEN;
  }

  // Try `gh auth token` CLI
  try {
    const { execFileSync } = await import('child_process');
    const token = execFileSync('gh', ['auth', 'token'], { encoding: 'utf8', timeout: 5000 }).trim();
    if (token) {
      console.log('  🔑 Using GitHub CLI (gh auth token)');
      return token;
    }
  } catch {
    // gh CLI not available or not authenticated
  }

  return undefined;
}

/**
 * Download a CodeQL database for a repository via GitHub REST API.
 * Returns the path to the extracted database, or null if download failed.
 */
async function downloadDatabase(
  repo: RepoConfig,
  databaseDir: string,
  token: string,
): Promise<string | null> {
  const { language, owner, repo: repoName } = repo;
  const repoDir = join(databaseDir, owner, repoName);
  const dbDir = join(repoDir, language);
  const zipPath = join(repoDir, `${language}.zip`);
  const markerFile = join(dbDir, 'codeql-database.yml');

  // Check cache
  if (existsSync(markerFile)) {
    try {
      const mtime = statSync(markerFile).mtimeMs;
      if (Date.now() - mtime < MAX_AGE_MS) {
        console.log(`  ✓ Cached: ${owner}/${repoName} (${language})`);
        return dbDir;
      }
    } catch {
      // Fall through to download
    }
  }

  mkdirSync(repoDir, { recursive: true });

  const url = `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repoName)}/code-scanning/codeql/databases/${encodeURIComponent(language)}`;
  console.log(`  ⬇ Downloading: ${owner}/${repoName} (${language})...`);

  try {
    const response = await fetch(url, {
      headers: {
        Accept: 'application/zip',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'codeql-development-mcp-server-extended-tests',
      },
    });

    if (!response.ok) {
      console.error(`  ✗ Download failed: ${response.status} ${response.statusText}`);
      return null;
    }

    if (!response.body) {
      console.error(`  ✗ Empty response body`);
      return null;
    }

    // Stream to zip file
    const dest = createWriteStream(zipPath);
    // @ts-expect-error — ReadableStream → NodeJS.ReadableStream interop
    await pipeline(response.body, dest);

    // Extract
    console.log(`  📦 Extracting: ${owner}/${repoName} (${language})...`);
    mkdirSync(dbDir, { recursive: true });
    execFileSync('unzip', ['-o', '-q', zipPath, '-d', dbDir]);

    // Flatten if single nested directory (zip often has one top-level dir)
    const entries = readdirSync(dbDir);
    if (entries.length === 1 && !existsSync(join(dbDir, 'codeql-database.yml'))) {
      const nested = join(dbDir, entries[0]);
      if (existsSync(join(nested, 'codeql-database.yml'))) {
        // Copy all contents up, then remove the nested directory
        execFileSync('bash', ['-c', `cp -a "${nested}"/. "${dbDir}/" && rm -rf "${nested}"`]);
      }
    }

    if (!existsSync(markerFile)) {
      console.error(`  ✗ Extraction failed: ${markerFile} not found`);
      return null;
    }

    // Clean up zip
    try { const { unlinkSync } = await import('fs'); unlinkSync(zipPath); } catch { /* best effort */ }

    console.log(`  ✓ Ready: ${owner}/${repoName} (${language})`);
    return dbDir;
  } catch (err) {
    console.error(`  ✗ Error downloading ${owner}/${repoName}: ${err}`);
    return null;
  }
}

/**
 * Get the default vscode-codeql global storage paths (platform-dependent).
 */
function getVscodeCodeqlStoragePaths(): string[] {
  const home = homedir();
  const candidates = [
    join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'GitHub.vscode-codeql'),
    join(home, 'Library', 'Application Support', 'Code', 'User', 'globalStorage', 'github.vscode-codeql'),
    join(home, '.config', 'Code', 'User', 'globalStorage', 'GitHub.vscode-codeql'),
    join(home, '.config', 'Code', 'User', 'globalStorage', 'github.vscode-codeql'),
  ];
  return candidates.filter(p => existsSync(p));
}

/**
 * Scan directories for CodeQL databases (by codeql-database.yml marker).
 */
function scanForDatabases(dir: string, found: Map<string, { language: string; path: string }>, depth: number): void {
  if (depth > 4) return;
  const markerPath = join(dir, 'codeql-database.yml');
  if (existsSync(markerPath)) {
    try {
      const yml = readFileSync(markerPath, 'utf8');
      const langMatch = yml.match(/primaryLanguage:\s*(\S+)/);
      found.set(dir, { language: langMatch?.[1] ?? 'unknown', path: dir });
    } catch { /* skip */ }
    return;
  }
  try {
    for (const entry of readdirSync(dir)) {
      if (entry.startsWith('.') || entry === 'node_modules') continue;
      const full = join(dir, entry);
      try { if (statSync(full).isDirectory()) scanForDatabases(full, found, depth + 1); } catch { /* skip */ }
    }
  } catch { /* skip */ }
}

/**
 * Discover and/or download databases for the requested repos.
 * Returns a map of "owner/repo" → database path.
 */
export async function resolveAllDatabases(
  repos: RepoConfig[],
  additionalDirs: string[],
): Promise<{ databases: Map<string, string>; missing: RepoConfig[] }> {
  const databases = new Map<string, string>();
  const missing: RepoConfig[] = [];

  // First: discover existing databases on disk
  const searchDirs = [...additionalDirs, ...getVscodeCodeqlStoragePaths()];
  const envDirs = process.env.CODEQL_DATABASES_BASE_DIRS;
  if (envDirs) searchDirs.push(...envDirs.split(':').filter(Boolean));

  console.log(`  Searching ${searchDirs.length} directories for existing databases...`);
  const existing = new Map<string, { language: string; path: string }>();
  for (const dir of searchDirs) {
    if (existsSync(dir)) scanForDatabases(dir, existing, 0);
  }
  console.log(`  Found ${existing.size} existing database(s) on disk`);

  // Match existing databases to requested repos
  for (const repo of repos) {
    let found = false;
    for (const [dbPath, info] of existing) {
      if (info.language === repo.language) {
        const pathLower = dbPath.toLowerCase();
        if (pathLower.includes(repo.repo.toLowerCase()) || pathLower.includes(repo.owner.toLowerCase())) {
          databases.set(`${repo.owner}/${repo.repo}`, dbPath);
          found = true;
          console.log(`  ✓ Found: ${repo.owner}/${repo.repo} → ${dbPath}`);
          break;
        }
      }
    }
    if (!found) missing.push(repo);
  }

  // Second: try to download missing databases
  if (missing.length > 0) {
    const token = await getGitHubToken();
    if (token) {
      console.log(`\n  ⬇ Attempting to download ${missing.length} missing database(s)...`);
      const downloadDir = additionalDirs[0] || join(homedir(), '.codeql-mcp-test-databases');
      mkdirSync(downloadDir, { recursive: true });

      const stillMissing: RepoConfig[] = [];
      for (const repo of missing) {
        const dbPath = await downloadDatabase(repo, downloadDir, token);
        if (dbPath) {
          databases.set(`${repo.owner}/${repo.repo}`, dbPath);
        } else {
          stillMissing.push(repo);
        }
      }
      return { databases, missing: stillMissing };
    } else {
      console.log(`\n  ⚠️ No GitHub token available for downloading missing databases.`);
      console.log(`  💡 Options to provide databases:`);
      console.log(`     1. Open VS Code, use "CodeQL: Download Database from GitHub"`);
      console.log(`     2. Set GH_TOKEN env var for automatic download`);
      console.log(`     3. Set CODEQL_DATABASES_BASE_DIRS to point to existing databases`);
    }
  }

  return { databases, missing };
}

