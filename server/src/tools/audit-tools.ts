/**
 * Audit Tools — security-audit-state tracking built on the annotation store.
 *
 * These tools provide a repo-keyed workflow for storing CodeQL analysis
 * findings with notes, mirroring the seclab codeql_python MCP server's
 * SQLite-backed source tracking — but now backed by the shared SqliteStore.
 *
 * Enabled when ENABLE_ANNOTATION_TOOLS=true (disabled by default when annotation tools are off).
 * Audit tools are layered on annotations; there is no separate ENABLE_AUDIT_TOOLS flag.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { sessionDataManager } from '../lib/session-data-manager';
import { logger } from '../utils/logger';

const AUDIT_CATEGORY = 'audit-finding';

/**
 * Register all audit tools with the MCP server.
 */
export function registerAuditTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();

  if (!config.enableAnnotationTools) {
    logger.info(
      'Audit tools are disabled (opt-in). Set ENABLE_ANNOTATION_TOOLS=true to enable audit_* and annotation_* tools.',
    );
    return;
  }

  registerAuditStoreFindingsTool(server);
  registerAuditListFindingsTool(server);
  registerAuditAddNotesTool(server);
  registerAuditClearRepoTool(server);

  logger.info('Registered audit tools');
}

/**
 * Build a canonical repo key: "repo:owner/name" (lowercased).
 */
function repoKey(owner: string, repo: string): string {
  return `repo:${owner}/${repo}`.toLowerCase();
}

// ---------------------------------------------------------------------------
// audit_store_findings
// ---------------------------------------------------------------------------

function registerAuditStoreFindingsTool(server: McpServer): void {
  server.tool(
    'audit_store_findings',
    'Store CodeQL analysis findings for a repository. Each finding is persisted as an annotation with category "audit-finding".',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
      findings: z.array(z.object({
        sourceLocation: z.string().describe('File path of the finding.'),
        line: z.number().describe('Line number of the finding.'),
        sourceType: z.string().describe('Type of the source (e.g. "RemoteFlowSource").'),
        description: z.string().optional().describe('Human-readable description.'),
      })).describe('Array of findings to store.'),
    },
    async ({ owner, repo, findings }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      let stored = 0;

      for (const f of findings) {
        const entityKey = `${entityPrefix}:${f.sourceLocation}:L${f.line}`;
        const metadata = JSON.stringify({
          sourceType: f.sourceType,
          line: f.line,
          sourceLocation: f.sourceLocation,
        });

        // Check for existing annotation at this exact location to avoid duplicates
        const existing = store.listAnnotations({
          category: AUDIT_CATEGORY,
          entityKey,
          limit: 1,
        });

        if (existing.length === 0) {
          store.createAnnotation(AUDIT_CATEGORY, entityKey, f.description ?? null, f.sourceType, metadata);
          stored++;
        }
      }

      return {
        content: [{
          type: 'text' as const,
          text: `Stored ${stored} new finding(s) for ${owner}/${repo} (${findings.length - stored} duplicates skipped).`,
        }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_list_findings
// ---------------------------------------------------------------------------

function registerAuditListFindingsTool(server: McpServer): void {
  server.tool(
    'audit_list_findings',
    'List all audit findings for a repository, including any analyst notes.',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
      limit: z.number().optional().describe('Maximum number of results.'),
    },
    async ({ owner, repo, limit }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      const results = store.listAnnotations({
        category: AUDIT_CATEGORY,
        entityKeyPrefix: entityPrefix,
        limit: limit ?? 200,
      });

      // Enrich with parsed metadata for convenience
      const findings = results.map(a => {
        let meta: Record<string, unknown> = {};
        try { meta = JSON.parse(a.metadata || '{}'); } catch { /* ignore */ }
        return {
          id: a.id,
          sourceLocation: meta.sourceLocation ?? a.entity_key,
          line: meta.line,
          sourceType: a.label ?? meta.sourceType,
          notes: a.content,
          createdAt: a.created_at,
          updatedAt: a.updated_at,
        };
      });

      return { content: [{ type: 'text' as const, text: JSON.stringify(findings, null, 2) }] };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_add_notes
// ---------------------------------------------------------------------------

function registerAuditAddNotesTool(server: McpServer): void {
  server.tool(
    'audit_add_notes',
    'Append notes to an existing audit finding. The notes are appended to the annotation content.',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
      sourceLocation: z.string().describe('File path of the finding.'),
      line: z.number().describe('Line number of the finding.'),
      notes: z.string().describe('Notes to append.'),
    },
    async ({ owner, repo, sourceLocation, line, notes }) => {
      const store = sessionDataManager.getStore();
      const entityKey = `${repoKey(owner, repo)}:${sourceLocation}:L${line}`;

      const existing = store.listAnnotations({
        category: AUDIT_CATEGORY,
        entityKey,
        limit: 1,
      });

      if (existing.length === 0) {
        return {
          content: [{ type: 'text' as const, text: `No finding found at ${sourceLocation}:${line} in ${owner}/${repo}.` }],
        };
      }

      const annotation = existing[0];
      const updatedContent = (annotation.content || '') + '\n' + notes;
      store.updateAnnotation(annotation.id, { content: updatedContent.trim() });

      return {
        content: [{ type: 'text' as const, text: `Updated notes for finding at ${sourceLocation}:${line} in ${owner}/${repo}.` }],
      };
    },
  );
}

// ---------------------------------------------------------------------------
// audit_clear_repo
// ---------------------------------------------------------------------------

function registerAuditClearRepoTool(server: McpServer): void {
  server.tool(
    'audit_clear_repo',
    'Delete all audit findings for a repository.',
    {
      owner: z.string().describe('Repository owner.'),
      repo: z.string().describe('Repository name.'),
    },
    async ({ owner, repo }) => {
      const store = sessionDataManager.getStore();
      const entityPrefix = repoKey(owner, repo);
      const deleted = store.deleteAnnotations({
        category: AUDIT_CATEGORY,
        entityKeyPrefix: entityPrefix,
      });
      return {
        content: [{ type: 'text' as const, text: `Cleared ${deleted} finding(s) for ${owner}/${repo}.` }],
      };
    },
  );
}
