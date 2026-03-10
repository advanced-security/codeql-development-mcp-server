/**
 * search_ql_code tool
 *
 * Searches QL source files for text or regex patterns, providing a
 * grep-like experience purpose-built for CodeQL development workflows.
 * Returns structured JSON results with file paths, line numbers, matching
 * lines, and optional context.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { createReadStream, lstatSync, readdirSync, readFileSync, realpathSync } from 'fs';
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
 * Search a small file (≤ MAX_FILE_SIZE_BYTES) by reading it entirely into
 * memory. This is the fast path for typical QL source files.
 */
function searchFileSmall(
  filePath: string,
  regex: RegExp,
  contextLines: number
): SearchMatch[] {
  let content: string;
  try {
    content = readFileSync(filePath, 'utf-8');
  } catch {
    return [];
  }

  // Normalize line endings for cross-platform compatibility
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const matches: SearchMatch[] = [];

  for (let i = 0; i < lines.length; i++) {
    if (regex.test(lines[i])) {
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

  return matches;
}

/**
 * Search a large file (> MAX_FILE_SIZE_BYTES) by streaming it line-by-line
 * to avoid allocating huge buffers. Context lines are maintained via a
 * fixed-size rolling window.
 */
async function searchFileLarge(
  filePath: string,
  regex: RegExp,
  contextLines: number
): Promise<SearchMatch[]> {
  const matches: SearchMatch[] = [];
  // Rolling window of recent lines for contextBefore
  const recentLines: string[] = [];
  // Pending matches that still need contextAfter lines
  const pending: { match: SearchMatch; afterNeeded: number }[] = [];
  let lineNumber = 0;

  const rl = createInterface({
    input: createReadStream(filePath, { encoding: 'utf-8' }),
    crlfDelay: Infinity
  });

  for await (const line of rl) {
    lineNumber++;

    // Feed this line as contextAfter to any pending matches
    for (const p of pending) {
      if (p.afterNeeded > 0) {
        p.match.contextAfter!.push(line);
        p.afterNeeded--;
      }
    }
    // Flush fully-resolved pending matches
    while (pending.length > 0 && pending[0].afterNeeded === 0) {
      pending.shift();
    }

    if (regex.test(line)) {
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

    // Maintain rolling window
    if (contextLines > 0) {
      recentLines.push(line);
      if (recentLines.length > contextLines) {
        recentLines.shift();
      }
    }
  }

  return matches;
}

/**
 * Search a single file for matches against the compiled regex.
 * Uses in-memory read for small files and streaming for large files.
 */
function searchFile(
  filePath: string,
  regex: RegExp,
  contextLines: number
): SearchMatch[] | Promise<SearchMatch[]> {
  try {
    const st = lstatSync(filePath);
    if (!st.isFile()) {
      return [];
    }
    if (st.size > MAX_FILE_SIZE_BYTES) {
      return searchFileLarge(filePath, regex, contextLines);
    }
  } catch {
    return [];
  }

  return searchFileSmall(filePath, regex, contextLines);
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
  let collectedEnough = false;

  for (const file of filesToSearch) {
    if (collectedEnough) {
      // Still need totalMatches count but skip storing results.
      // Read directly and catch errors to avoid TOCTOU race.
      try {
        const content = readFileSync(file, 'utf-8');
        for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
          if (regex.test(line)) totalMatches++;
        }
      } catch {
        // skip unreadable files
      }
      continue;
    }

    const fileMatches = await searchFile(file, regex, contextLines);
    totalMatches += fileMatches.length;

    for (const m of fileMatches) {
      if (allMatches.length < maxResults) {
        allMatches.push(m);
      }
    }

    if (allMatches.length >= maxResults) {
      collectedEnough = true;
    }
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
