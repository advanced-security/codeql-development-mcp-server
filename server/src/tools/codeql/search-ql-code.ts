/**
 * search_ql_code tool
 *
 * Searches QL source files for text or regex patterns, providing a
 * grep-like experience purpose-built for CodeQL development workflows.
 * Returns structured JSON results with file paths, line numbers, matching
 * lines, and optional context.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { closeSync, createReadStream, fstatSync, lstatSync, openSync, readdirSync, readFileSync, realpathSync } from 'fs';
import { basename, extname, join, resolve } from 'path';
import { createInterface } from 'readline';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum file size in bytes to read (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum total files to traverse before stopping. */
const MAX_FILES_TRAVERSED = 10_000;

/** Maximum allowed value for `contextLines`. */
const MAX_CONTEXT_LINES = 50;

/** Maximum allowed value for `maxResults`. */
const MAX_MAX_RESULTS = 10_000;

/** Directory names to skip during traversal (compiled pack caches, deps). */
const SKIP_DIRS = new Set(['.codeql', 'node_modules', '.git']);

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SearchMatch {
  filePath: string;
  lineNumber: number;
  lineContent: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

export interface SearchResult {
  results: SearchMatch[];
  totalMatches: number;
  returnedMatches: number;
  truncated: boolean;
  filesSearched: number;
}

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

/**
 * Collect files recursively from the given paths, filtered by extension.
 * Respects the global file-count limit. Uses lstatSync to avoid following
 * symlinks and tracks visited real paths to prevent cycles.
 */
function collectFiles(
  paths: string[],
  extensions: string[],
  fileCount: { value: number }
): string[] {
  const files: string[] = [];
  const visitedDirs = new Set<string>();

  function walk(p: string): void {
    if (fileCount.value >= MAX_FILES_TRAVERSED) return;

    let stat;
    try {
      stat = lstatSync(p);
    } catch {
      // Skip inaccessible paths
      return;
    }

    // Skip symlinks to avoid cycles and symlink-following issues
    if (stat.isSymbolicLink()) return;

    if (stat.isFile()) {
      if (extensions.length === 0 || extensions.includes(extname(p))) {
        files.push(p);
      }
      fileCount.value++;
    } else if (stat.isDirectory()) {
      // Skip well-known directories that mirror source or contain deps
      if (SKIP_DIRS.has(basename(p))) return;

      // Track visited directories by real path to prevent cycles
      let realPath: string;
      try {
        realPath = realpathSync(p);
      } catch {
        return;
      }
      if (visitedDirs.has(realPath)) return;
      visitedDirs.add(realPath);

      let entries: string[];
      try {
        entries = readdirSync(p);
      } catch {
        return;
      }
      for (const entry of entries) {
        if (fileCount.value >= MAX_FILES_TRAVERSED) return;
        walk(join(p, entry));
      }
    }
  }

  for (const p of paths) {
    if (fileCount.value >= MAX_FILES_TRAVERSED) break;
    walk(resolve(p));
  }

  return files;
}

/**
 * Search a file for matches. Returns up to `maxCollect` full match objects
 * (with context) and a `totalCount` of all regex hits in the file.
 *
 * Opens a single file descriptor, uses fstatSync(fd) to check size, then
 * either reads in-memory (small files) or streams (large files) — all via
 * the same fd. This avoids both TOCTOU races and reading huge files into
 * memory before the size check.
 */
async function searchFile(
  filePath: string,
  regex: RegExp,
  contextLines: number,
  maxCollect: number
): Promise<{ matches: SearchMatch[]; totalCount: number }> {
  // Open once; fstatSync(fd) is safe — it operates on the handle, not the path.
  let fd: number;
  try {
    fd = openSync(filePath, 'r');
  } catch {
    return { matches: [], totalCount: 0 };
  }

  let size: number;
  try {
    size = fstatSync(fd).size;
  } catch {
    try { closeSync(fd); } catch { /* ignore */ }
    return { matches: [], totalCount: 0 };
  }

  // Large files: stream directly from the open fd
  if (size > MAX_FILE_SIZE_BYTES) {
    return searchFileStreaming(filePath, regex, contextLines, maxCollect, fd);
  }

  // Small files: read entirely into memory from the open fd, then close
  let content: string;
  try {
    content = readFileSync(fd, 'utf-8');
  } catch {
    try { closeSync(fd); } catch { /* ignore */ }
    return { matches: [], totalCount: 0 };
  }
  try { closeSync(fd); } catch { /* ignore */ }

  // In-memory search
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const matches: SearchMatch[] = [];
  let totalCount = 0;

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
      totalCount++;
      if (matches.length < maxCollect) {
        const match: SearchMatch = {
          filePath,
          lineNumber: i + 1,
          lineContent: lines[i]
        };
        if (contextLines > 0) {
          const beforeStart = Math.max(0, i - contextLines);
          const afterEnd = Math.min(lines.length - 1, i + contextLines);
          match.contextBefore = lines.slice(beforeStart, i);
          match.contextAfter = lines.slice(i + 1, afterEnd + 1);
        }
        matches.push(match);
      }
    }
  }

  return { matches, totalCount };
}

/**
 * Stream a file line-by-line, collecting up to `maxCollect` matches with
 * context and counting all hits. Used for files exceeding MAX_FILE_SIZE_BYTES.
 *
 * When `fd` is provided the stream is created from the already-open file
 * descriptor (autoClose: true) so the fd is closed when the stream ends.
 */
async function searchFileStreaming(
  filePath: string,
  regex: RegExp,
  contextLines: number,
  maxCollect: number,
  fd?: number
): Promise<{ matches: SearchMatch[]; totalCount: number }> {
  const matches: SearchMatch[] = [];
  const recentLines: string[] = [];
  const pending: { match: SearchMatch; afterNeeded: number }[] = [];
  let lineNumber = 0;
  let totalCount = 0;

  let rl: ReturnType<typeof createInterface>;
  try {
    const streamOpts: Record<string, unknown> = { encoding: 'utf-8' };
    if (fd !== undefined) {
      streamOpts.fd = fd;
      streamOpts.autoClose = true;
      streamOpts.start = 0;
    }
    rl = createInterface({
      input: createReadStream(filePath, streamOpts as Parameters<typeof createReadStream>[1]),
      crlfDelay: Infinity
    });
  } catch {
    if (fd !== undefined) {
      try { closeSync(fd); } catch { /* ignore */ }
    }
    return { matches: [], totalCount: 0 };
  }

  for await (const line of rl) {
    lineNumber++;

    // Feed contextAfter to pending matches
    for (const p of pending) {
      if (p.afterNeeded > 0) {
        p.match.contextAfter!.push(line);
        p.afterNeeded--;
      }
    }
    while (pending.length > 0 && pending[0].afterNeeded === 0) {
      pending.shift();
    }

    if (regex.test(line)) {
      totalCount++;
      if (matches.length < maxCollect) {
        const match: SearchMatch = {
          filePath,
          lineNumber,
          lineContent: line
        };
        if (contextLines > 0) {
          match.contextBefore = recentLines.slice(-contextLines);
          match.contextAfter = [];
          pending.push({ match, afterNeeded: contextLines });
        }
        matches.push(match);
      }
    }

    if (contextLines > 0) {
      recentLines.push(line);
      if (recentLines.length > contextLines) {
        recentLines.shift();
      }
    }
  }

  return { matches, totalCount };
}

/**
 * Search QL source files for a text or regex pattern.
 */
export async function searchQlCode(params: {
  pattern: string;
  paths: string[];
  includeExtensions?: string[];
  caseSensitive?: boolean;
  contextLines?: number;
  maxResults?: number;
}): Promise<SearchResult> {
  const {
    pattern,
    paths,
    includeExtensions = ['.ql', '.qll'],
    caseSensitive = true,
    contextLines: rawContextLines = 0,
    maxResults: rawMaxResults = 100
  } = params;

  // Clamp to valid ranges
  const contextLines = Math.min(Math.max(0, Math.floor(rawContextLines)), MAX_CONTEXT_LINES);
  const maxResults = Math.min(Math.max(1, Math.floor(rawMaxResults)), MAX_MAX_RESULTS);

  // Compile regex — propagate errors to caller
  const flags = caseSensitive ? '' : 'i';
  const regex = new RegExp(pattern, flags);

  const fileCount = { value: 0 };
  const filesToSearch = collectFiles(paths, includeExtensions, fileCount);

  const allMatches: SearchMatch[] = [];
  let totalMatches = 0;

  for (const file of filesToSearch) {
    const remainingSlots = Math.max(0, maxResults - allMatches.length);
    const { matches: fileMatches, totalCount } = await searchFile(
      file, regex, contextLines, remainingSlots
    );
    totalMatches += totalCount;
    allMatches.push(...fileMatches);
  }

  return {
    results: allMatches,
    totalMatches,
    returnedMatches: allMatches.length,
    truncated: totalMatches > maxResults,
    filesSearched: filesToSearch.length
  };
}

// ---------------------------------------------------------------------------
// MCP tool registration
// ---------------------------------------------------------------------------

/**
 * Register the search_ql_code tool with the MCP server.
 */
export function registerSearchQlCodeTool(server: McpServer): void {
  server.tool(
    'search_ql_code',
    'Search QL source files (.ql/.qll) for text or regex patterns. Returns structured results with file paths, line numbers, and optional context lines. Use this instead of grep for searching CodeQL source code.',
    {
      pattern: z.string().describe('Text or regex pattern to search for (JavaScript regex syntax)'),
      paths: z.array(z.string()).min(1).describe('Directories or files to search in'),
      includeExtensions: z.array(z.string()).optional().default(['.ql', '.qll'])
        .describe('File extensions to search (default: [\'.ql\', \'.qll\'])'),
      caseSensitive: z.boolean().optional().default(true)
        .describe('Whether search is case sensitive (default: true)'),
      contextLines: z.number().int().min(0).max(MAX_CONTEXT_LINES).optional().default(0)
        .describe('Lines of context before and after each match (default: 0, max: 50)'),
      maxResults: z.number().int().min(1).max(MAX_MAX_RESULTS).optional().default(100)
        .describe('Maximum number of matching lines to return (default: 100, max: 10000)')
    },
    async ({ pattern, paths, includeExtensions, caseSensitive, contextLines, maxResults }) => {
      try {
        const result = await searchQlCode({
          pattern,
          paths,
          includeExtensions,
          caseSensitive,
          contextLines,
          maxResults
        });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }]
        };
      } catch (error) {
        logger.error('Error in search_ql_code:', error);
        const message = error instanceof SyntaxError || (error instanceof Error && error.message.includes('Invalid regular expression'))
          ? `Invalid regex pattern: ${error.message}`
          : `Error: ${error instanceof Error ? error.message : String(error)}`;
        return {
          content: [{ type: 'text', text: message }],
          isError: true
        };
      }
    }
  );
}
