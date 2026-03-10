/**
 * search_ql_code tool
 *
 * Searches QL source files for text or regex patterns, providing a
 * grep-like experience purpose-built for CodeQL development workflows.
 * Returns structured JSON results with file paths, line numbers, matching
 * lines, and optional context.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { readdirSync, readFileSync, statSync } from 'fs';
import { extname, join, resolve } from 'path';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Maximum file size in bytes to read (5 MB). */
const MAX_FILE_SIZE_BYTES = 5 * 1024 * 1024;

/** Maximum total files to traverse before stopping. */
const MAX_FILES_TRAVERSED = 10_000;

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
 * Respects the global file-count limit.
 */
function collectFiles(
  paths: string[],
  extensions: string[],
  fileCount: { value: number }
): string[] {
  const files: string[] = [];

  function walk(p: string): void {
    if (fileCount.value >= MAX_FILES_TRAVERSED) return;

    let stat;
    try {
      stat = statSync(p);
    } catch {
      // Skip inaccessible paths
      return;
    }

    if (stat.isFile()) {
      if (extensions.length === 0 || extensions.includes(extname(p))) {
        files.push(p);
      }
      fileCount.value++;
    } else if (stat.isDirectory()) {
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
 * Search a single file for matches against the compiled regex.
 */
function searchFile(
  filePath: string,
  regex: RegExp,
  contextLines: number
): SearchMatch[] {
  let stat;
  try {
    stat = statSync(filePath);
  } catch {
    return [];
  }

  if (stat.size > MAX_FILE_SIZE_BYTES) {
    return [];
  }

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
 * Search QL source files for a text or regex pattern.
 */
export function searchQlCode(params: {
  pattern: string;
  paths: string[];
  includeExtensions?: string[];
  caseSensitive?: boolean;
  contextLines?: number;
  maxResults?: number;
}): SearchResult {
  const {
    pattern,
    paths,
    includeExtensions = ['.ql', '.qll'],
    caseSensitive = true,
    contextLines = 0,
    maxResults = 100
  } = params;

  // Compile regex — propagate errors to caller
  const flags = caseSensitive ? '' : 'i';
  const regex = new RegExp(pattern, flags);

  const fileCount = { value: 0 };
  const filesToSearch = collectFiles(paths, includeExtensions, fileCount);

  const allMatches: SearchMatch[] = [];
  let totalMatches = 0;

  for (const file of filesToSearch) {
    const fileMatches = searchFile(file, regex, contextLines);
    totalMatches += fileMatches.length;

    for (const m of fileMatches) {
      if (allMatches.length < maxResults) {
        allMatches.push(m);
      }
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
      contextLines: z.number().optional().default(0)
        .describe('Lines of context before and after each match (default: 0)'),
      maxResults: z.number().optional().default(100)
        .describe('Maximum number of matching lines to return (default: 100)')
    },
    async ({ pattern, paths, includeExtensions, caseSensitive, contextLines, maxResults }) => {
      try {
        const result = searchQlCode({
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
