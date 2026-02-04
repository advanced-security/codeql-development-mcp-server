/**
 * Monitoring Tools - MCP tool implementations for session management and reporting
 * Provides the MCP Tool APIs specified in the monitoring specification
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { randomUUID } from 'crypto';
import { sessionDataManager } from '../lib/session-data-manager';
import {
  QueryDevelopmentSession,
  SessionFilter,
  QualityScoreRecord,
  ComparisonReport,
  AggregateReport,
  ExportResult,
  FunctionalTestResult,
} from '../types/monitoring';
import { logger } from '../utils/logger';

/**
 * Register all monitoring and reporting tools with the MCP server
 * Note: These tools are opt-in and disabled by default for end-users.
 * Set enableMonitoringTools: true in monitoring config to enable them.
 */
export function registerMonitoringTools(server: McpServer): void {
  const config = sessionDataManager.getConfig();
  
  // Check if monitoring tools are enabled (opt-in, disabled by default)
  if (!config.enableMonitoringTools) {
    logger.info('Monitoring tools are disabled (opt-in). Set enableMonitoringTools: true to enable session_* tools.');
    return;
  }

  // Session Management Tools - session_start removed per feedback (auto-creation instead)
  registerSessionEndTool(server);
  registerSessionGetTool(server);
  registerSessionListTool(server);
  registerSessionUpdateStateTool(server);

  // Session Analytics Tools
  registerSessionGetCallHistoryTool(server);
  registerSessionGetTestHistoryTool(server);
  registerSessionGetScoreHistoryTool(server);
  registerSessionCalculateCurrentScoreTool(server);

  // Batch Operations Tools
  registerSessionsCompareTool(server);
  registerSessionsAggregateTool(server);
  registerSessionsExportTool(server);

  // Note: Functional Testing Support Tools are internal only, not exposed as MCP tools

  logger.info('Registered monitoring and reporting tools');
}

/**
 * Session Management Tools
 */

// session_start tool removed - sessions are now auto-created when needed
// Sessions are automatically created when MCP tools are called with queryPath
// If explicit session creation is needed, provide sessionId=null and it will auto-create

function registerSessionEndTool(server: McpServer): void {
  server.tool(
    'session_end',
    'End a query development session with final status',
    {
      sessionId: z.string().describe('ID of the session to end'),
      status: z.enum(['completed', 'failed', 'abandoned']).describe('Final status of the session'),
    },
    async ({ sessionId, status }) => {
      try {
        const session = await sessionDataManager.endSession(sessionId, status);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error ending session:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error ending session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionGetTool(server: McpServer): void {
  server.tool(
    'session_get',
    'Get complete details of a specific query development session',
    {
      sessionId: z.string().describe('ID of the session to retrieve'),
    },
    async ({ sessionId }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting session:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error getting session: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionListTool(server: McpServer): void {
  server.tool(
    'session_list',
    'List query development sessions with optional filtering',
    {
      queryPath: z.string().optional().describe('Filter by query path (partial match)'),
      status: z.string().optional().describe('Filter by session status'),
      dateRange: z.array(z.string()).length(2).optional().describe('Filter by date range [start, end] (ISO timestamps)'),
      language: z.string().optional().describe('Filter by programming language'),
      queryType: z.string().optional().describe('Filter by query type'),
    },
    async ({ queryPath, status, dateRange, language, queryType }) => {
      try {
        const filters: SessionFilter = {};
        if (queryPath) filters.queryPath = queryPath;
        if (status) filters.status = status;
        if (dateRange) filters.dateRange = [dateRange[0], dateRange[1]];
        if (language) filters.language = language;
        if (queryType) filters.queryType = queryType;

        const sessions = await sessionDataManager.listSessions(
          Object.keys(filters).length > 0 ? filters : undefined
        );

        const sessionList = {
          totalSessions: sessions.length,
          sessions: sessions.map(s => ({
            sessionId: s.sessionId,
            queryPath: s.queryPath,
            language: s.language,
            status: s.status,
            startTime: s.startTime,
            endTime: s.endTime,
            mcpCallsCount: s.mcpCalls.length,
            testExecutionsCount: s.testExecutions.length,
            currentScore: s.qualityScores.length > 0 
              ? s.qualityScores[s.qualityScores.length - 1].overallScore 
              : null,
          })),
        };

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(sessionList, null, 2),
            },
          ],
          recommendations: generateListRecommendations(sessions),
        };
      } catch (error) {
        logger.error('Error listing sessions:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error listing sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionUpdateStateTool(server: McpServer): void {
  server.tool(
    'session_update_state',
    'Update the current state of a query development session',
    {
      sessionId: z.string().describe('ID of the session to update'),
      filesPresent: z.array(z.string()).optional().describe('List of files present in the query development'),
      compilationStatus: z.enum(['unknown', 'success', 'failed']).optional().describe('Current compilation status'),
      testStatus: z.enum(['unknown', 'passing', 'failing', 'no_tests']).optional().describe('Current test status'),
      documentationStatus: z.enum(['unknown', 'present', 'missing', 'incomplete']).optional().describe('Documentation status'),
    },
    async ({ sessionId, filesPresent, compilationStatus, testStatus, documentationStatus }) => {
      try {
        const stateUpdate: Record<string, unknown> = {};
        if (filesPresent !== undefined) stateUpdate.filesPresent = filesPresent;
        if (compilationStatus !== undefined) stateUpdate.compilationStatus = compilationStatus;
        if (testStatus !== undefined) stateUpdate.testStatus = testStatus;
        if (documentationStatus !== undefined) stateUpdate.documentationStatus = documentationStatus;

        const session = await sessionDataManager.updateSessionState(sessionId, stateUpdate);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(session, null, 2),
            },
          ],
          recommendations: generateRecommendations(session, 'session_update_state'),
        };
      } catch (error) {
        logger.error('Error updating session state:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error updating session state: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Session Analytics Tools
 */

function registerSessionGetCallHistoryTool(server: McpServer): void {
  server.tool(
    'session_get_call_history',
    'Get MCP call history for a specific session',
    {
      sessionId: z.string().describe('ID of the session'),
      limit: z.number().optional().describe('Maximum number of calls to return (most recent first)'),
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        let calls = [...session.mcpCalls].reverse(); // Most recent first
        if (limit && limit > 0) {
          calls = calls.slice(0, limit);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId,
                totalCalls: session.mcpCalls.length,
                callHistory: calls,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting call history:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error getting call history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionGetTestHistoryTool(server: McpServer): void {
  server.tool(
    'session_get_test_history',
    'Get test execution history for a specific session',
    {
      sessionId: z.string().describe('ID of the session'),
      limit: z.number().optional().describe('Maximum number of test executions to return (most recent first)'),
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        let tests = [...session.testExecutions].reverse(); // Most recent first
        if (limit && limit > 0) {
          tests = tests.slice(0, limit);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId,
                totalTests: session.testExecutions.length,
                testHistory: tests,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting test history:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error getting test history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionGetScoreHistoryTool(server: McpServer): void {
  server.tool(
    'session_get_score_history',
    'Get quality score history for a specific session',
    {
      sessionId: z.string().describe('ID of the session'),
      limit: z.number().optional().describe('Maximum number of scores to return (most recent first)'),
    },
    async ({ sessionId, limit }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        let scores = [...session.qualityScores].reverse(); // Most recent first
        if (limit && limit > 0) {
          scores = scores.slice(0, limit);
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                sessionId,
                totalScores: session.qualityScores.length,
                scoreHistory: scores,
              }, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error getting score history:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error getting score history: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionCalculateCurrentScoreTool(server: McpServer): void {
  server.tool(
    'session_calculate_current_score',
    'Calculate current quality score for a session based on its state',
    {
      sessionId: z.string().describe('ID of the session'),
    },
    async ({ sessionId }) => {
      try {
        const session = await sessionDataManager.getSession(sessionId);
        
        if (!session) {
          return {
            content: [
              {
                type: 'text',
                text: `Session not found: ${sessionId}`,
              },
            ],
            isError: true,
          };
        }

        // Calculate quality score based on current state
        const scoreRecord = calculateQualityScore(session);
        
        // Add the score to the session
        await sessionDataManager.addQualityScore(sessionId, scoreRecord);
        
        // Get updated session with new score
        const updatedSession = await sessionDataManager.getSession(sessionId);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(scoreRecord, null, 2),
            },
          ],
          recommendations: generateRecommendations(updatedSession, 'session_calculate_current_score'),
        };
      } catch (error) {
        logger.error('Error calculating current score:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error calculating current score: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Batch Operations Tools
 */

function registerSessionsCompareTool(server: McpServer): void {
  server.tool(
    'sessions_compare',
    'Compare multiple query development sessions across specified dimensions',
    {
      sessionIds: z.array(z.string()).describe('Array of session IDs to compare'),
      dimensions: z.array(z.string()).optional().describe('Specific dimensions to compare (default: all)'),
    },
    async ({ sessionIds, dimensions }) => {
      try {
        const sessions = await Promise.all(
          sessionIds.map(id => sessionDataManager.getSession(id))
        );

        const validSessions = sessions.filter(s => s !== null) as QueryDevelopmentSession[];
        
        if (validSessions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No valid sessions found for comparison',
              },
            ],
            isError: true,
          };
        }

        const comparison = await compareSessions(validSessions, dimensions);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(comparison, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error comparing sessions:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error comparing sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionsAggregateTool(server: McpServer): void {
  server.tool(
    'sessions_aggregate',
    'Generate aggregate insights from multiple sessions based on filters',
    {
      queryPath: z.string().optional().describe('Filter by query path (partial match)'),
      status: z.string().optional().describe('Filter by session status'),
      dateRange: z.array(z.string()).length(2).optional().describe('Filter by date range [start, end] (ISO timestamps)'),
      language: z.string().optional().describe('Filter by programming language'),
      queryType: z.string().optional().describe('Filter by query type'),
    },
    async ({ queryPath, status, dateRange, language, queryType }) => {
      try {
        const filters: SessionFilter = {};
        if (queryPath) filters.queryPath = queryPath;
        if (status) filters.status = status;
        if (dateRange) filters.dateRange = [dateRange[0], dateRange[1]];
        if (language) filters.language = language;
        if (queryType) filters.queryType = queryType;

        const sessions = await sessionDataManager.listSessions(
          Object.keys(filters).length > 0 ? filters : undefined
        );

        const aggregate = await aggregateSessions(sessions, filters);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(aggregate, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error aggregating sessions:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error aggregating sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

function registerSessionsExportTool(server: McpServer): void {
  server.tool(
    'sessions_export',
    'Export session data in specified format for external analysis',
    {
      sessionIds: z.array(z.string()).describe('Array of session IDs to export'),
      format: z.enum(['json', 'html', 'markdown']).optional().default('json').describe('Export format'),
    },
    async ({ sessionIds, format = 'json' }) => {
      try {
        const sessions = await Promise.all(
          sessionIds.map(id => sessionDataManager.getSession(id))
        );

        const validSessions = sessions.filter(s => s !== null) as QueryDevelopmentSession[];
        
        if (validSessions.length === 0) {
          return {
            content: [
              {
                type: 'text',
                text: 'No valid sessions found for export',
              },
            ],
            isError: true,
          };
        }

        const exportResult = await exportSessions(validSessions, format);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(exportResult, null, 2),
            },
          ],
        };
      } catch (error) {
        logger.error('Error exporting sessions:', error);
        return {
          content: [
            {
              type: 'text',
              text: `Error exporting sessions: ${error instanceof Error ? error.message : 'Unknown error'}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}

/**
 * Helper Functions
 */

/**
 * Calculate quality score for a session based on current state and history
 */
function calculateQualityScore(session: QueryDevelopmentSession): QualityScoreRecord {
  const timestamp = new Date().toISOString();
  
  // Calculate syntactic correctness (25%)
  const syntacticCorrectness = session.currentState.compilationStatus === 'success' ? 100 :
    session.currentState.compilationStatus === 'failed' ? 0 : 50;

  // Calculate test coverage and results (30%)
  const testCoverageResults = session.currentState.testStatus === 'passing' ? 100 :
    session.currentState.testStatus === 'failing' ? 25 :
    session.currentState.testStatus === 'no_tests' ? 0 : 50;

  // Calculate documentation quality (20%)
  const documentationQuality = session.currentState.documentationStatus === 'present' ? 100 :
    session.currentState.documentationStatus === 'incomplete' ? 60 :
    session.currentState.documentationStatus === 'missing' ? 0 : 50;

  // Calculate functional correctness (25%) - based on successful test runs
  const successfulTests = session.testExecutions.filter(t => t.success && t.type === 'test_run').length;
  const totalTests = session.testExecutions.filter(t => t.type === 'test_run').length;
  const functionalCorrectness = totalTests > 0 ? (successfulTests / totalTests) * 100 : 50;

  // Calculate overall score
  const overallScore = Math.round(
    (syntacticCorrectness * 0.25) +
    (testCoverageResults * 0.30) +
    (documentationQuality * 0.20) +
    (functionalCorrectness * 0.25)
  );

  // Determine grade
  const grade = overallScore >= 90 ? 'A' :
    overallScore >= 80 ? 'B' :
    overallScore >= 70 ? 'C' :
    overallScore >= 60 ? 'D' : 'F';

  // Generate recommendations
  const recommendations: string[] = [];
  if (syntacticCorrectness < 100) {
    recommendations.push('Fix compilation errors to improve syntactic correctness');
  }
  if (testCoverageResults < 70) {
    recommendations.push('Add comprehensive tests and ensure they pass');
  }
  if (documentationQuality < 80) {
    recommendations.push('Add or improve query documentation with examples');
  }
  if (functionalCorrectness < 80) {
    recommendations.push('Improve test pass rate and verify query logic');
  }

  return {
    scoreId: randomUUID(),
    timestamp,
    overallScore,
    dimensions: {
      syntacticCorrectness,
      testCoverageResults,
      documentationQuality,
      functionalCorrectness,
    },
    grade,
    recommendations,
  };
}

/**
 * Compare multiple sessions
 */
async function compareSessions(
  sessions: QueryDevelopmentSession[],
  dimensions?: string[]
): Promise<ComparisonReport> {
  const timestamp = new Date().toISOString();
  const sessionIds = sessions.map(s => s.sessionId);
  
  const results: Record<string, unknown> = {
    sessionCount: sessions.length,
    sessionOverview: sessions.map(s => ({
      sessionId: s.sessionId,
      queryPath: s.queryPath,
      status: s.status,
      mcpCallsCount: s.mcpCalls.length,
      duration: s.endTime ? 
        new Date(s.endTime).getTime() - new Date(s.startTime).getTime() : 
        new Date().getTime() - new Date(s.startTime).getTime(),
      currentScore: s.qualityScores.length > 0 ? 
        s.qualityScores[s.qualityScores.length - 1].overallScore : null,
    })),
  };

  if (!dimensions || dimensions.includes('quality')) {
    const qualityScores = sessions.map(s => 
      s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1] : null
    );
    results.qualityComparison = {
      averageScore: qualityScores
        .filter(q => q !== null)
        .reduce((sum, q) => sum + q!.overallScore, 0) / qualityScores.filter(q => q !== null).length,
      scoreRange: {
        min: Math.min(...qualityScores.filter(q => q !== null).map(q => q!.overallScore)),
        max: Math.max(...qualityScores.filter(q => q !== null).map(q => q!.overallScore)),
      },
    };
  }

  if (!dimensions || dimensions.includes('activity')) {
    results.activityComparison = {
      totalMCPCalls: sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0),
      averageCallsPerSession: sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0) / sessions.length,
      mostActiveTool: getMostUsedTool(sessions),
    };
  }

  return {
    sessionIds,
    dimensions: dimensions || ['all'],
    timestamp,
    results,
  };
}

/**
 * Aggregate insights from multiple sessions
 */
async function aggregateSessions(
  sessions: QueryDevelopmentSession[],
  filters: SessionFilter
): Promise<AggregateReport> {
  const timestamp = new Date().toISOString();
  
  const completedSessions = sessions.filter(s => s.status === 'completed');
  const successRate = sessions.length > 0 ? completedSessions.length / sessions.length : 0;
  
  const qualityScores = sessions
    .map(s => s.qualityScores.length > 0 ? s.qualityScores[s.qualityScores.length - 1].overallScore : null)
    .filter(score => score !== null) as number[];
  
  const averageQualityScore = qualityScores.length > 0 ? 
    qualityScores.reduce((sum, score) => sum + score, 0) / qualityScores.length : 0;

  const commonPatterns = identifyCommonPatterns(sessions);
  const recommendations = generateAggregateRecommendations(sessions);

  return {
    filters,
    timestamp,
    totalSessions: sessions.length,
    successRate,
    averageQualityScore,
    commonPatterns,
    recommendations,
  };
}

/**
 * Export sessions in specified format
 */
async function exportSessions(
  sessions: QueryDevelopmentSession[],
  format: 'json' | 'html' | 'markdown'
): Promise<ExportResult> {
  const timestamp = new Date().toISOString();
  const filename = `session-export-${timestamp.replace(/[:.]/g, '-')}.${format}`;
  
  let content: string;
  
  switch (format) {
    case 'json':
      content = JSON.stringify(sessions, null, 2);
      break;
    case 'html':
      content = generateHTMLReport(sessions);
      break;
    case 'markdown':
      content = generateMarkdownReport(sessions);
      break;
  }

  return {
    format,
    filename,
    content,
    timestamp,
  };
}

/**
 * Utility functions
 */

function getMostUsedTool(sessions: QueryDevelopmentSession[]): string {
  const toolCounts: Record<string, number> = {};
  
  sessions.forEach(session => {
    session.mcpCalls.forEach(call => {
      toolCounts[call.toolName] = (toolCounts[call.toolName] || 0) + 1;
    });
  });

  return Object.entries(toolCounts)
    .sort(([, a], [, b]) => b - a)[0]?.[0] || 'none';
}

function identifyCommonPatterns(sessions: QueryDevelopmentSession[]): string[] {
  const patterns: string[] = [];
  
  const commonTools = getMostUsedTool(sessions);
  if (commonTools && commonTools !== 'none') {
    patterns.push(`Most commonly used tool: ${commonTools}`);
  }

  const completionRate = sessions.filter(s => s.status === 'completed').length / sessions.length;
  if (completionRate > 0.8) {
    patterns.push('High completion rate indicates effective workflow');
  } else if (completionRate < 0.5) {
    patterns.push('Low completion rate suggests workflow issues');
  }

  return patterns;
}

function generateAggregateRecommendations(sessions: QueryDevelopmentSession[]): string[] {
  const recommendations: string[] = [];
  
  const failedSessions = sessions.filter(s => s.status === 'failed');
  if (failedSessions.length > sessions.length * 0.3) {
    recommendations.push('High failure rate - consider improving error handling and guidance');
  }

  const averageCallsPerSession = sessions.reduce((sum, s) => sum + s.mcpCalls.length, 0) / sessions.length;
  if (averageCallsPerSession > 20) {
    recommendations.push('High number of MCP calls per session - consider workflow optimization');
  }

  return recommendations;
}

function generateHTMLReport(sessions: QueryDevelopmentSession[]): string {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <title>Session Export Report</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 20px; }
        table { border-collapse: collapse; width: 100%; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
        .session { margin-bottom: 20px; padding: 10px; border: 1px solid #eee; }
    </style>
</head>
<body>
    <h1>Query Development Sessions Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>
    <p>Total Sessions: ${sessions.length}</p>
    
    ${sessions.map(session => `
    <div class="session">
        <h2>Session: ${session.sessionId}</h2>
        <p><strong>Query Path:</strong> ${session.queryPath}</p>
        <p><strong>Status:</strong> ${session.status}</p>
        <p><strong>Language:</strong> ${session.language}</p>
        <p><strong>Start Time:</strong> ${session.startTime}</p>
        <p><strong>MCP Calls:</strong> ${session.mcpCalls.length}</p>
        <p><strong>Test Executions:</strong> ${session.testExecutions.length}</p>
        <p><strong>Quality Scores:</strong> ${session.qualityScores.length}</p>
    </div>
    `).join('')}
</body>
</html>`;
  
  return html;
}

function generateMarkdownReport(sessions: QueryDevelopmentSession[]): string {
  const md = `# Query Development Sessions Report

Generated: ${new Date().toISOString()}
Total Sessions: ${sessions.length}

## Session Summary

| Session ID | Query Path | Status | Language | MCP Calls | Test Executions |
|------------|-----------|--------|----------|-----------|-----------------|
${sessions.map(session => 
  `| ${session.sessionId} | ${session.queryPath} | ${session.status} | ${session.language} | ${session.mcpCalls.length} | ${session.testExecutions.length} |`
).join('\n')}

## Detailed Sessions

${sessions.map(session => `
### Session: ${session.sessionId}

- **Query Path:** ${session.queryPath}
- **Status:** ${session.status}
- **Language:** ${session.language}
- **Start Time:** ${session.startTime}
- **End Time:** ${session.endTime || 'N/A'}
- **MCP Calls:** ${session.mcpCalls.length}
- **Test Executions:** ${session.testExecutions.length}
- **Quality Scores:** ${session.qualityScores.length}

${session.recommendations.length > 0 ? `
**Current Recommendations:**
${session.recommendations.map(rec => `- ${rec}`).join('\n')}
` : ''}
`).join('\n')}`;

  return md;
}

function _calculateAverageDuration(sessions: QueryDevelopmentSession[]): number {
  const completedSessions = sessions.filter(s => s.endTime);
  if (completedSessions.length === 0) return 0;

  const totalDuration = completedSessions.reduce((sum, session) => {
    return sum + (new Date(session.endTime!).getTime() - new Date(session.startTime).getTime());
  }, 0);

  return totalDuration / completedSessions.length;
}

function _identifyFailureReasons(results: FunctionalTestResult[]): string[] {
  const failedResults = results.filter(r => !r.passed);
  const reasons: Record<string, number> = {};

  failedResults.forEach(result => {
    Object.entries(result.criteria).forEach(([criterion, passed]) => {
      if (!passed) {
        reasons[criterion] = (reasons[criterion] || 0) + 1;
      }
    });
  });

  return Object.entries(reasons)
    .sort(([, a], [, b]) => b - a)
    .map(([reason, count]) => `${reason}: ${count} sessions`);
}

/**
 * Generate recommendations for MCP tool responses
 * Returns a map of MCP primitive paths to recommendation reasons
 */
function generateRecommendations(
  session: QueryDevelopmentSession | null,
  currentTool: string
): Record<string, string> {
  if (!session) {
    return {};
  }

  const recommendations: Record<string, string> = {};

  // Session state-based recommendations
  if (session.currentState.compilationStatus === 'failed') {
    recommendations['codeql_query_format'] = 'Format query to fix potential syntax issues';
    recommendations['codeql_query_compile'] = 'Recompile after fixing syntax errors';
  } else if (session.currentState.compilationStatus === 'success') {
    if (session.currentState.testStatus === 'unknown' || session.currentState.testStatus === 'no_tests') {
      recommendations['codeql_test_run'] = 'Run tests to validate query functionality';
    } else if (session.currentState.testStatus === 'failing') {
      recommendations['session_get_test_history'] = 'Review test failures to identify issues';
      recommendations['codeql_query_compile'] = 'Verify query logic matches test expectations';
    } else if (session.currentState.testStatus === 'passing') {
      recommendations['session_calculate_current_score'] = 'Calculate quality score for completed query';
    }
  }

  // Tool-specific follow-up recommendations
  switch (currentTool) {
    case 'session_get':
      if (session.mcpCalls.length === 0) {
        recommendations['codeql_query_compile'] = 'Start development by compiling the query';
      }
      break;
    case 'session_end':
      if (session.status === 'completed') {
        recommendations['sessions_export'] = 'Export session data for analysis';
      }
      break;
    case 'session_calculate_current_score': {
      const latestScore = session.qualityScores[session.qualityScores.length - 1];
      if (latestScore && latestScore.overallScore < 80) {
        if (latestScore.dimensions.syntacticCorrectness < 100) {
          recommendations['codeql_query_format'] = 'Improve syntax and formatting';
        }
        if (latestScore.dimensions.testCoverageResults < 70) {
          recommendations['codeql_test_run'] = 'Improve test coverage and results';
        }
      }
      break;
    }
    case 'session_update_state':
      // Recommend next logical step based on updated state
      if (session.currentState.compilationStatus === 'success' && session.currentState.testStatus === 'unknown') {
        recommendations['codeql_test_run'] = 'Run tests now that compilation is successful';
      }
      break;
  }

  return recommendations;
}

/**
 * Generate recommendations for session list results
 */
function generateListRecommendations(sessions: QueryDevelopmentSession[]): Record<string, string> {
  const recommendations: Record<string, string> = {};

  const activeSessions = sessions.filter(s => s.status === 'active');
  const completedSessions = sessions.filter(s => s.status === 'completed');

  if (activeSessions.length > 0) {
    recommendations['session_get'] = `Review details of ${activeSessions.length} active session(s)`;
  }

  if (completedSessions.length > 1) {
    recommendations['sessions_compare'] = 'Compare completed sessions to identify patterns';
    recommendations['sessions_aggregate'] = 'Generate aggregate insights from multiple sessions';
  }

  if (sessions.length > 5) {
    recommendations['sessions_export'] = 'Export session data for comprehensive analysis';
  }

  return recommendations;
}