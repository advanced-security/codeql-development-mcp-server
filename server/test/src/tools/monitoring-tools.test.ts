/**
 * Tests for monitoring tools
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { registerMonitoringTools } from '../../../src/tools/monitoring-tools';
import { sessionDataManager } from '../../../src/lib/session-data-manager';
import { existsSync, rmSync } from 'fs';

// Mock the logger to suppress expected error output
vi.mock('../../../src/utils/logger', () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('Monitoring Tools', () => {
  let mockServer: McpServer;
  const testStorageDir = '.ql-mcp-tracking-test';

  beforeEach(() => {
    vi.clearAllMocks();
    mockServer = {
      tool: vi.fn()
    } as unknown as McpServer;
    
    // Clean up any existing test storage
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    // Clean up test storage
    if (existsSync(testStorageDir)) {
      rmSync(testStorageDir, { recursive: true, force: true });
    }
    vi.restoreAllMocks();
  });

  describe('registerMonitoringTools', () => {
    describe('opt-in behavior', () => {
      it('should not register monitoring tools by default (opt-in disabled)', () => {
        // Default config has enableMonitoringTools: false
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: '.ql-mcp-tracking/',
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableRecommendations: true,
          enableMonitoringTools: false, // Default - tools disabled
        });

        registerMonitoringTools(mockServer);

        // No tools should be registered when enableMonitoringTools is false
        expect(mockServer.tool).not.toHaveBeenCalled();
      });

      it('should register monitoring tools when opt-in is enabled', () => {
        vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
          storageLocation: '.ql-mcp-tracking/',
          autoTrackSessions: true,
          retentionDays: 90,
          includeCallParameters: true,
          includeCallResults: true,
          maxActiveSessionsPerQuery: 3,
          scoringFrequency: 'per_call',
          archiveCompletedSessions: true,
          enableRecommendations: true,
          enableMonitoringTools: true, // Opt-in enabled
        });

        registerMonitoringTools(mockServer);

        // Should register 11 tools when enabled
        expect(mockServer.tool).toHaveBeenCalledTimes(11);
      });
    });

    describe('tool registration (when enabled)', () => {
    beforeEach(() => {
      // Enable monitoring tools for these tests
      vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
        storageLocation: '.ql-mcp-tracking/',
        autoTrackSessions: true,
        retentionDays: 90,
        includeCallParameters: true,
        includeCallResults: true,
        maxActiveSessionsPerQuery: 3,
        scoringFrequency: 'per_call',
        archiveCompletedSessions: true,
        enableRecommendations: true,
        enableMonitoringTools: true, // Opt-in enabled for these tests
      });
    });

    it('should register monitoring tools without errors', () => {
      expect(() => {
        registerMonitoringTools(mockServer);
      }).not.toThrow();
    });

    it('should register session management tools', () => {
      registerMonitoringTools(mockServer);
      
      const toolCalls = (mockServer.tool as any).mock.calls;
      const toolNames = toolCalls.map((call: any) => call[0]);

      // Session Management Tools (session_start removed per feedback)
      expect(toolNames).toContain('session_end');
      expect(toolNames).toContain('session_get');
      expect(toolNames).toContain('session_list');
      expect(toolNames).toContain('session_update_state');
    });

    it('should register session analytics tools', () => {
      registerMonitoringTools(mockServer);
      
      const toolCalls = (mockServer.tool as any).mock.calls;
      const toolNames = toolCalls.map((call: any) => call[0]);

      // Session Analytics Tools
      expect(toolNames).toContain('session_get_call_history');
      expect(toolNames).toContain('session_get_test_history');
      expect(toolNames).toContain('session_get_score_history');
      expect(toolNames).toContain('session_calculate_current_score');
    });

    it('should register batch operations tools', () => {
      registerMonitoringTools(mockServer);
      
      const toolCalls = (mockServer.tool as any).mock.calls;
      const toolNames = toolCalls.map((call: any) => call[0]);

      // Batch Operations Tools
      expect(toolNames).toContain('sessions_compare');
      expect(toolNames).toContain('sessions_aggregate');
      expect(toolNames).toContain('sessions_export');
    });

    it('should not register functional testing tools (removed from MCP)', () => {
      registerMonitoringTools(mockServer);
      
      const toolCalls = (mockServer.tool as any).mock.calls;
      const toolNames = toolCalls.map((call: any) => call[0]);

      // Functional Testing Support Tools (removed from MCP registration per feedback)
      expect(toolNames).not.toContain('sessions_evaluate_functional_tests');
      expect(toolNames).not.toContain('sessions_generate_test_report');
    });

    it('should register all expected monitoring tools', () => {
      registerMonitoringTools(mockServer);

      // Should register 11 tools total:
      // 4 session management + 4 analytics + 3 batch (functional testing removed)
      expect(mockServer.tool).toHaveBeenCalledTimes(11);
    });

    it('should have removed session_start tool per feedback (auto-creation instead)', () => {
      registerMonitoringTools(mockServer);

      const sessionStartCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_start'
      );
      
      expect(sessionStartCall).toBeUndefined(); // Tool should not be registered
    });

    it('should register session_end tool with correct parameters', () => {
      registerMonitoringTools(mockServer);

      const sessionEndCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_end'
      );
      
      expect(sessionEndCall).toBeDefined();
      expect(sessionEndCall[1]).toBe('End a query development session with final status');
      expect(sessionEndCall[2]).toHaveProperty('sessionId');
      expect(sessionEndCall[2]).toHaveProperty('status');
      expect(sessionEndCall[3]).toBeInstanceOf(Function);
    });

    it('should register session_list tool with correct parameters', () => {
      registerMonitoringTools(mockServer);

      const sessionListCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_list'
      );
      
      expect(sessionListCall).toBeDefined();
      expect(sessionListCall[1]).toBe('List query development sessions with optional filtering');
      expect(sessionListCall[2]).toHaveProperty('queryPath');
      expect(sessionListCall[2]).toHaveProperty('status');
      expect(sessionListCall[2]).toHaveProperty('dateRange');
      expect(sessionListCall[2]).toHaveProperty('language');
      expect(sessionListCall[2]).toHaveProperty('queryType');
      expect(sessionListCall[3]).toBeInstanceOf(Function);
    });
  });
  }); // End of registerMonitoringTools describe block

  describe('Session Data Manager Integration', () => {
    it('should create session data manager without errors', () => {
      expect(() => {
        // SessionDataManager constructor should work
        expect(sessionDataManager).toBeDefined();
      }).not.toThrow();
    });

    it('should have default configuration with monitoring tools disabled', () => {
      const config = sessionDataManager.getConfig();
      expect(config).toBeDefined();
      expect(config.storageLocation).toBeDefined();
      expect(config.autoTrackSessions).toBeDefined();
      expect(config.enableRecommendations).toBeDefined();
      expect(config.enableMonitoringTools).toBe(false); // Default is disabled
    });
  });

  describe('Tool Handler Functions', () => {
    beforeEach(() => {
      // Enable monitoring tools for these tests
      vi.spyOn(sessionDataManager, 'getConfig').mockReturnValue({
        storageLocation: testStorageDir,
        autoTrackSessions: true,
        retentionDays: 90,
        includeCallParameters: true,
        includeCallResults: true,
        maxActiveSessionsPerQuery: 3,
        scoringFrequency: 'per_call',
        archiveCompletedSessions: true,
        enableRecommendations: true,
        enableMonitoringTools: true,
      });
    });

    it('should call session_end handler and return not found for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const sessionEndCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_end'
      );
      const handler = sessionEndCall[3];

      const result = await handler({ sessionId: 'nonexistent-session', status: 'completed' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('should call session_get handler and return not found for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const sessionGetCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_get'
      );
      const handler = sessionGetCall[3];

      const result = await handler({ sessionId: 'nonexistent-session' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('Session not found');
    });

    it('should call session_list handler and return empty list', async () => {
      registerMonitoringTools(mockServer);

      const sessionListCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_list'
      );
      const handler = sessionListCall[3];

      const result = await handler({});

      expect(result.isError).toBeUndefined();
      expect(result.content[0].text).toBeDefined();
    });

    it('should call session_update_state handler and return error for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const sessionUpdateStateCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_update_state'
      );
      const handler = sessionUpdateStateCall[3];

      const result = await handler({
        sessionId: 'nonexistent-session',
        state: 'writing_query'
      });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call session_get_call_history handler and return error for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const callHistoryCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_get_call_history'
      );
      const handler = callHistoryCall[3];

      const result = await handler({ sessionId: 'nonexistent-session' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call session_get_test_history handler and return error for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const testHistoryCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_get_test_history'
      );
      const handler = testHistoryCall[3];

      const result = await handler({ sessionId: 'nonexistent-session' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call session_get_score_history handler and return error for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const scoreHistoryCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_get_score_history'
      );
      const handler = scoreHistoryCall[3];

      const result = await handler({ sessionId: 'nonexistent-session' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call session_calculate_current_score handler and return error for invalid session', async () => {
      registerMonitoringTools(mockServer);

      const calculateScoreCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'session_calculate_current_score'
      );
      const handler = calculateScoreCall[3];

      const result = await handler({ sessionId: 'nonexistent-session' });

      expect(result.isError).toBe(true);
      expect(result.content[0].text).toContain('not found');
    });

    it('should call sessions_compare handler with empty session list', async () => {
      registerMonitoringTools(mockServer);

      const compareCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'sessions_compare'
      );
      const handler = compareCall[3];

      const result = await handler({
        sessionIds: ['nonexistent-1', 'nonexistent-2'],
        dimensions: ['duration']
      });

      // Should return a result (possibly with no valid sessions message)
      expect(result.content[0].text).toBeDefined();
    });

    it('should call sessions_aggregate handler with filters', async () => {
      registerMonitoringTools(mockServer);

      const aggregateCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'sessions_aggregate'
      );
      const handler = aggregateCall[3];

      const result = await handler({
        metrics: ['session_count', 'average_duration']
      });

      expect(result.content[0].text).toBeDefined();
    });

    it('should call sessions_export handler', async () => {
      registerMonitoringTools(mockServer);

      const exportCall = (mockServer.tool as any).mock.calls.find(
        (call: any) => call[0] === 'sessions_export'
      );
      const handler = exportCall[3];

      const result = await handler({
        format: 'json'
      });

      expect(result.content[0].text).toBeDefined();
    });
  });
});
