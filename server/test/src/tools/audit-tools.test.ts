/**
 * Tests for audit tools — registration gating, schema validation, and handler behavior.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { existsSync, rmSync } from 'fs';
import { registerAuditTools } from '../../../src/tools/audit-tools';
import { sessionDataManager } from '../../../src/lib/session-data-manager';
import { createProjectTempDir } from '../../../src/utils/temp-dir';

describe('Audit Tools', () => {
  let mockServer: McpServer;
  let testStorageDir: string;

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn(),
    } as unknown as McpServer;

    testStorageDir = createProjectTempDir('audit-tools-test-');
  });

  afterEach(() => {
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('registerAuditTools', () => {
    describe('opt-in behavior', () => {
      it('should not register audit tools when enableAnnotationTools is false', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: false,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerAuditTools(mockServer);

        expect(mockServer.tool).not.toHaveBeenCalled();
      });

      it('should register audit tools when enableAnnotationTools is true', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        registerAuditTools(mockServer);

        const toolCalls = (mockServer.tool as any).mock.calls;
        const toolNames = toolCalls.map((call: any) => call[0]);

        expect(toolNames).toContain('audit_add_notes');
        expect(toolNames).toContain('audit_clear_repo');
        expect(toolNames).toContain('audit_list_findings');
        expect(toolNames).toContain('audit_store_findings');
        expect(mockServer.tool).toHaveBeenCalledTimes(4);
      });
    });

    describe('schema validation', () => {
      beforeEach(() => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });
      });

      it('should validate audit_store_findings line as positive integer', () => {
        registerAuditTools(mockServer);

        const storeCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_store_findings',
        );
        expect(storeCall).toBeDefined();
        const findingsSchema = storeCall[2].findings;

        // The schema wraps an array of objects; extract the inner element shape
        const element = findingsSchema._def.type._def.shape();
        const lineSchema = element.line;

        expect(lineSchema.safeParse(0).success).toBe(false);
        expect(lineSchema.safeParse(-5).success).toBe(false);
        expect(lineSchema.safeParse(1.5).success).toBe(false);
        expect(lineSchema.safeParse(1).success).toBe(true);
        expect(lineSchema.safeParse(42).success).toBe(true);
      });

      it('should validate audit_add_notes line as positive integer', () => {
        registerAuditTools(mockServer);

        const addNotesCall = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_add_notes',
        );
        expect(addNotesCall).toBeDefined();
        const lineSchema = addNotesCall[2].line;

        expect(lineSchema.safeParse(0).success).toBe(false);
        expect(lineSchema.safeParse(-1).success).toBe(false);
        expect(lineSchema.safeParse(1.5).success).toBe(false);
        expect(lineSchema.safeParse(10).success).toBe(true);
      });
    });

    describe('handler behavior', () => {
      beforeEach(async () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: testStorageDir,
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableAnnotationTools: true,
          enableRecommendations: true,
          enableMonitoringTools: false,
        });

        await sessionDataManager.initialize();
      });

      afterEach(() => {
        sessionDataManager.getStore().close();
      });

      it('should store findings and skip duplicates', async () => {
        registerAuditTools(mockServer);

        const storeHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_store_findings',
        )[3];

        const result = await storeHandler({
          owner: 'test-org',
          repo: 'test-repo',
          findings: [
            { sourceLocation: 'src/app.ts', line: 10, sourceType: 'RemoteFlowSource' },
            { sourceLocation: 'src/db.ts', line: 20, sourceType: 'SqlInjection', description: 'SQL injection sink' },
          ],
        });

        expect(result.content[0].text).toContain('Stored 2 new finding(s)');

        // Storing the same findings again should skip duplicates
        const result2 = await storeHandler({
          owner: 'test-org',
          repo: 'test-repo',
          findings: [
            { sourceLocation: 'src/app.ts', line: 10, sourceType: 'RemoteFlowSource' },
          ],
        });

        expect(result2.content[0].text).toContain('Stored 0 new finding(s)');
        expect(result2.content[0].text).toContain('1 duplicates skipped');
      });

      it('should list stored findings for a repository', async () => {
        registerAuditTools(mockServer);

        const storeHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_store_findings',
        )[3];

        await storeHandler({
          owner: 'acme',
          repo: 'webapp',
          findings: [
            { sourceLocation: 'src/handler.ts', line: 5, sourceType: 'XSS' },
          ],
        });

        const listHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_list_findings',
        )[3];

        const result = await listHandler({ owner: 'acme', repo: 'webapp' });
        const findings = JSON.parse(result.content[0].text);
        expect(findings).toHaveLength(1);
        expect(findings[0].sourceType).toBe('XSS');
      });

      it('should add notes to an existing finding', async () => {
        registerAuditTools(mockServer);

        const storeHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_store_findings',
        )[3];

        await storeHandler({
          owner: 'org',
          repo: 'lib',
          findings: [
            { sourceLocation: 'src/api.ts', line: 42, sourceType: 'Source' },
          ],
        });

        const addNotesHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_add_notes',
        )[3];

        const result = await addNotesHandler({
          owner: 'org',
          repo: 'lib',
          sourceLocation: 'src/api.ts',
          line: 42,
          notes: 'Verified: true positive',
        });

        expect(result.content[0].text).toContain('Updated notes');
      });

      it('should return not found when adding notes to non-existent finding', async () => {
        registerAuditTools(mockServer);

        const addNotesHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_add_notes',
        )[3];

        const result = await addNotesHandler({
          owner: 'nope',
          repo: 'missing',
          sourceLocation: 'nonexistent.ts',
          line: 1,
          notes: 'notes',
        });

        expect(result.content[0].text).toContain('No finding found');
      });

      it('should clear all findings for a repository', async () => {
        registerAuditTools(mockServer);

        const storeHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_store_findings',
        )[3];

        await storeHandler({
          owner: 'org',
          repo: 'to-clear',
          findings: [
            { sourceLocation: 'a.ts', line: 1, sourceType: 'S1' },
            { sourceLocation: 'b.ts', line: 2, sourceType: 'S2' },
          ],
        });

        const clearHandler = (mockServer.tool as any).mock.calls.find(
          (call: any) => call[0] === 'audit_clear_repo',
        )[3];

        const result = await clearHandler({ owner: 'org', repo: 'to-clear' });
        expect(result.content[0].text).toContain('Cleared 2');
      });
    });
  });
});
