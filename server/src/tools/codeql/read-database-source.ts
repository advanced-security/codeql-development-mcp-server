/**
 * read_database_source tool
 *
 * Reads source file contents from a CodeQL database's source archive (src.zip)
 * or source directory (src/), enabling agents to explore code at alert locations
 * without requiring the original source tree to be present on disk.
 *
 * Typical workflow:
 * 1. Use `list_query_run_results` to obtain the `databasePath` from a previous run.
 * 2. Use `codeql_bqrs_interpret --sarif-add-snippets` to get SARIF with inline
 *    code snippets and `physicalLocation.artifactLocation.uri` values.
 * 3. Call this tool with the URI from a SARIF result to read broader context —
 *    e.g., the full function body surrounding an alert.
 *
 * Path normalization: accepts raw file paths, `file://`-prefixed URIs (as found
 * in SARIF), or paths relative to the archive root.  Falls back to suffix
 * matching against archive entry names when an exact match is not found.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import AdmZip from 'adm-zip';
import { existsSync, readdirSync, readFileSync, statSync } from 'fs';
import { join, resolve } from 'path';
import { z } from 'zod';
import { logger } from '../../utils/logger';

// ---------------------------------------------------------------------------
// Core implementation
// ---------------------------------------------------------------------------

export interface ReadDatabaseSourceParams {
  databasePath: string;
  filePath?: string;
  startLine?: number;
  endLine?: number;
}

export interface DatabaseSourceFile {
  content: string;
  endLine?: number;
  entryPath: string;
  sourceType: 'src.zip' | 'src/';
  startLine?: number;
  totalLines: number;
}

export interface DatabaseSourceListing {
  entries: string[];
  sourceType: 'src.zip' | 'src/';
  totalEntries: number;
}

/**
 * Strip a leading `file://` (or `file:///`) scheme from a URI and return the
 * resulting filesystem path.
 */
function stripFileScheme(uri: string): string {
  if (uri.startsWith('file:///')) {
    return uri.slice('file://'.length);
  }
  if (uri.startsWith('file://')) {
    return uri.slice('file://'.length);
  }
  return uri;
}

/**
 * Walk a directory recursively and yield relative paths (unix-style).
 */
function* walkDirectory(dir: string, base: string = dir): Generator<string> {
  for (const entry of readdirSync(dir)) {
    const fullPath = join(dir, entry);
    if (statSync(fullPath).isDirectory()) {
      yield* walkDirectory(fullPath, base);
    } else {
      // Return path relative to base, normalised with forward slashes
      yield fullPath.slice(base.length).replace(/\\/g, '/').replace(/^\//, '');
    }
  }
}

/**
 * Find the best-matching entry for a requested path within a list of available
 * entry names.  Resolution order:
 *  1. Exact match (with or without leading slash)
 *  2. Case-insensitive exact match
 *  3. Suffix match — entry ends with the requested path (handles absolute SARIF
 *     URIs stored as relative paths inside the archive)
 */
function resolveEntryPath(requested: string, available: string[]): string | undefined {
  const normalised = stripFileScheme(requested).replace(/\\/g, '/');
  // Strip leading slash for comparison
  const withoutLeading = normalised.replace(/^\//, '');

  // 1. Exact match
  for (const entry of available) {
    const entryNorm = entry.replace(/^\//, '');
    if (entryNorm === withoutLeading) {
      return entry;
    }
  }

  // 2. Case-insensitive exact
  const lower = withoutLeading.toLowerCase();
  for (const entry of available) {
    if (entry.replace(/^\//, '').toLowerCase() === lower) {
      return entry;
    }
  }

  // 3. Suffix match (handles absolute paths encoded inside archives)
  for (const entry of available) {
    const entryNorm = entry.replace(/^\//, '');
    if (entryNorm.endsWith(withoutLeading) || withoutLeading.endsWith(entryNorm)) {
      return entry;
    }
  }

  return undefined;
}

/**
 * Slice text content to the requested line range (1-based, inclusive).
 * Returns the sliced content and the effective bounds.
 */
function applyLineRange(
  content: string,
  startLine?: number,
  endLine?: number,
): { content: string; effectiveEnd: number; effectiveStart: number; totalLines: number } {
  const lines = content.split('\n');
  const totalLines = lines.length;
  const effectiveStart = Math.max(1, startLine ?? 1);
  const effectiveEnd = Math.min(totalLines, endLine ?? totalLines);
  const sliced = lines.slice(effectiveStart - 1, effectiveEnd).join('\n');
  return { content: sliced, effectiveEnd, effectiveStart, totalLines };
}

/**
 * Read the contents of a file from a CodeQL database source archive or source
 * directory.  When `filePath` is omitted, returns a listing of all entries.
 */
export async function readDatabaseSource(
  params: ReadDatabaseSourceParams,
): Promise<DatabaseSourceFile | DatabaseSourceListing> {
  const { databasePath, endLine, filePath, startLine } = params;
  const resolvedDbPath = resolve(databasePath);

  if (!existsSync(resolvedDbPath)) {
    throw new Error(`Database path does not exist: ${databasePath}`);
  }

  const srcZipPath = join(resolvedDbPath, 'src.zip');
  const srcDirPath = join(resolvedDbPath, 'src');
  const hasSrcZip = existsSync(srcZipPath);
  const hasSrcDir = existsSync(srcDirPath);

  if (!hasSrcZip && !hasSrcDir) {
    throw new Error(
      `No source archive found in database: expected src.zip or src/ in ${databasePath}`,
    );
  }

  const sourceType: 'src.zip' | 'src/' = hasSrcZip ? 'src.zip' : 'src/';

  // ------------------------------------------------------------------
  // Listing mode
  // ------------------------------------------------------------------
  if (!filePath) {
    if (hasSrcZip) {
      const zip = new AdmZip(srcZipPath);
      const entries = zip
        .getEntries()
        .filter((e) => !e.isDirectory)
        .map((e) => e.entryName)
        .sort();
      return { entries, sourceType, totalEntries: entries.length };
    } else {
      const entries = [...walkDirectory(srcDirPath)].sort();
      return { entries, sourceType, totalEntries: entries.length };
    }
  }

  // ------------------------------------------------------------------
  // File read mode
  // ------------------------------------------------------------------
  if (hasSrcZip) {
    const zip = new AdmZip(srcZipPath);
    const availableEntries = zip
      .getEntries()
      .filter((e) => !e.isDirectory)
      .map((e) => e.entryName);

    const matchedEntry = resolveEntryPath(filePath, availableEntries);
    if (!matchedEntry) {
      throw new Error(
        `File not found in src.zip: ${filePath}\n` +
          `Archive contains ${availableEntries.length} entries. ` +
          `Use read_database_source without filePath to list available entries.`,
      );
    }

    const entry = zip.getEntry(matchedEntry);
    if (!entry) {
      throw new Error(`Failed to read entry from src.zip: ${matchedEntry}`);
    }

    const rawContent = entry.getData().toString('utf-8');
    const { content, effectiveEnd, effectiveStart, totalLines } = applyLineRange(
      rawContent,
      startLine,
      endLine,
    );

    return {
      content,
      endLine: effectiveEnd,
      entryPath: matchedEntry,
      sourceType,
      startLine: effectiveStart,
      totalLines,
    };
  } else {
    // src/ directory fallback (test databases)
    const availableEntries = [...walkDirectory(srcDirPath)];
    const matchedRelative = resolveEntryPath(filePath, availableEntries);
    if (!matchedRelative) {
      throw new Error(
        `File not found in src/: ${filePath}\n` +
          `Directory contains ${availableEntries.length} entries. ` +
          `Use read_database_source without filePath to list available entries.`,
      );
    }

    const fullPath = join(srcDirPath, matchedRelative);
    const rawContent = readFileSync(fullPath, 'utf-8');
    const { content, effectiveEnd, effectiveStart, totalLines } = applyLineRange(
      rawContent,
      startLine,
      endLine,
    );

    return {
      content,
      endLine: effectiveEnd,
      entryPath: matchedRelative,
      sourceType,
      startLine: effectiveStart,
      totalLines,
    };
  }
}

// ---------------------------------------------------------------------------
// MCP tool registration
// ---------------------------------------------------------------------------

/**
 * Register the read_database_source tool with the MCP server.
 */
export function registerReadDatabaseSourceTool(server: McpServer): void {
  server.tool(
    'read_database_source',
    'Read source file contents from a CodeQL database source archive (src.zip) or source directory (src/). ' +
      'Use this to explore code at alert locations discovered via codeql_bqrs_interpret SARIF output. ' +
      'Omit filePath to list all files in the archive. ' +
      'Accepts raw file paths, file:// URIs (as found in SARIF physicalLocation.artifactLocation.uri), ' +
      'or paths relative to the archive root. ' +
      'Use startLine/endLine to return only the relevant portion of large files.',
    {
      databasePath: z.string().describe('Path to the CodeQL database directory'),
      endLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('Last line to return (1-based, inclusive). Defaults to end of file.'),
      filePath: z
        .string()
        .optional()
        .describe(
          'Path of the source file to read. Accepts a raw path, a file:// URI from SARIF, ' +
            'or a path relative to the archive root. ' +
            'Omit to list all files in the archive.',
        ),
      startLine: z
        .number()
        .int()
        .positive()
        .optional()
        .describe('First line to return (1-based, inclusive). Defaults to 1.'),
    },
    async ({ databasePath, endLine, filePath, startLine }) => {
      try {
        const result = await readDatabaseSource({ databasePath, endLine, filePath, startLine });
        return {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        logger.error('Error reading database source:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
