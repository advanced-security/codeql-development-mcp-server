/**
 * list_codeql_databases tool
 *
 * Discovers CodeQL databases in configured base directories.
 * Scans each directory in `CODEQL_DATABASES_BASE_DIRS` for subdirectories
 * containing `codeql-database.yml`, extracts metadata (language, CLI version,
 * creation time), and returns the list.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import { z } from 'zod';
import { readDatabaseMetadata } from '../../lib/database-resolver';
import { getDatabaseBaseDirs } from '../../lib/discovery-config';
import { logger } from '../../utils/logger';

export interface DatabaseInfo {
  cliVersion?: string;
  creationTime?: string;
  language?: string;
  name: string;
  path: string;
}

/**
 * Discover CodeQL databases in the given base directories.
 *
 * @param baseDirs - Directories to scan for database subdirectories
 * @param language - Optional language filter
 * @returns List of discovered databases with metadata
 */
export async function discoverDatabases(
  baseDirs: string[],
  language?: string,
): Promise<DatabaseInfo[]> {
  const databases: DatabaseInfo[] = [];

  for (const baseDir of baseDirs) {
    if (!existsSync(baseDir)) {
      continue;
    }

    let entries: string[];
    try {
      entries = readdirSync(baseDir);
    } catch {
      continue;
    }

    for (const entry of entries) {
      const entryPath = join(baseDir, entry);

      // Skip non-directories
      try {
        if (!statSync(entryPath).isDirectory()) {
          continue;
        }
      } catch {
        continue;
      }

      // Check for codeql-database.yml
      const ymlPath = join(entryPath, 'codeql-database.yml');
      if (!existsSync(ymlPath)) {
        continue;
      }

      const metadata = readDatabaseMetadata(entryPath);

      // Apply language filter
      if (language && metadata.language !== language) {
        continue;
      }

      databases.push({
        cliVersion: metadata.cliVersion,
        creationTime: metadata.creationTime,
        language: metadata.language,
        name: entry,
        path: entryPath,
      });
    }
  }

  return databases;
}

/**
 * Register the list_codeql_databases tool with the MCP server.
 */
export function registerListDatabasesTool(server: McpServer): void {
  server.tool(
    'list_codeql_databases',
    'List CodeQL databases discovered in configured base directories (set via CODEQL_DATABASES_BASE_DIRS env var). Returns path, language, CLI version, and creation time for each database. Use the returned database paths with codeql_query_run or codeql_database_analyze to run queries against them.',
    {
      language: z
        .string()
        .optional()
        .describe('Filter databases by language (e.g., "javascript", "python")'),
    },
    async ({ language }) => {
      try {
        const baseDirs = getDatabaseBaseDirs();

        if (baseDirs.length === 0) {
          return {
            content: [
              {
                type: 'text' as const,
                text: 'No database base directories configured. Set the CODEQL_DATABASES_BASE_DIRS environment variable to a colon-separated list of directories to search.',
              },
            ],
          };
        }

        const databases = await discoverDatabases(baseDirs, language);

        if (databases.length === 0) {
          const filterMsg = language ? ` for language "${language}"` : '';
          return {
            content: [
              {
                type: 'text' as const,
                text: `No CodeQL databases found${filterMsg} in: ${baseDirs.join(', ')}`,
              },
            ],
          };
        }

        const lines = [
          `Found ${databases.length} CodeQL database(s):`,
          '',
          ...databases.map((db) => {
            const parts = [`  ${db.name}`];
            parts.push(`    Path: ${db.path}`);
            if (db.language) parts.push(`    Language: ${db.language}`);
            if (db.cliVersion) parts.push(`    CLI Version: ${db.cliVersion}`);
            if (db.creationTime) parts.push(`    Created: ${db.creationTime}`);
            return parts.join('\n');
          }),
        ];

        return {
          content: [{ type: 'text' as const, text: lines.join('\n') }],
        };
      } catch (error) {
        logger.error('Error listing databases:', error);
        return {
          content: [
            {
              type: 'text' as const,
              text: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    },
  );
}
