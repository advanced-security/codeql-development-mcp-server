/**
 * Session Tracking Middleware
 * Provides transparent session integration for existing MCP tools
 */

import { randomUUID } from 'crypto';
import { sessionDataManager } from '../lib/session-data-manager';
import { MCPCallRecord } from '../types/monitoring';
import { logger } from '../utils/logger';

/**
 * Current session context for tracking active sessions
 */
class SessionContext {
  private activeSessionsByQuery: Map<string, string> = new Map();
  private sessionCallCounts: Map<string, number> = new Map();

  /**
   * Get or create active session for a query path
   */
  async getOrCreateSession(
    queryPath?: string,
    language?: string,
    sessionId?: string
  ): Promise<string | null> {
    // If explicit sessionId provided, use it
    if (sessionId) {
      const session = await sessionDataManager.getSession(sessionId);
      if (session) {
        return sessionId;
      }
      logger.warn(`Provided sessionId not found: ${sessionId}`);
    }

    // If no queryPath provided, cannot create/find session
    if (!queryPath) {
      return null;
    }

    // Check if there's already an active session for this query
    if (this.activeSessionsByQuery.has(queryPath)) {
      const existingSessionId = this.activeSessionsByQuery.get(queryPath)!;
      const session = await sessionDataManager.getSession(existingSessionId);
      if (session && session.status === 'active') {
        return existingSessionId;
      }
      // Remove stale reference
      this.activeSessionsByQuery.delete(queryPath);
    }

    // Check for active sessions in the database
    const activeSessions = await sessionDataManager.getActiveSessionsForQuery(queryPath);
    if (activeSessions.length > 0) {
      // Use the most recent active session
      const mostRecent = activeSessions.sort((a, b) => 
        new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
      )[0];
      this.activeSessionsByQuery.set(queryPath, mostRecent.sessionId);
      return mostRecent.sessionId;
    }

    // Create new session if auto-tracking is enabled
    const config = sessionDataManager.getConfig();
    if (config.autoTrackSessions) {
      const newSessionId = await sessionDataManager.startSession(
        queryPath,
        language || 'unknown',
        undefined,
        'Auto-created session via session tracking middleware'
      );
      this.activeSessionsByQuery.set(queryPath, newSessionId);
      logger.info(`Auto-created new session: ${newSessionId} for query: ${queryPath}`);
      return newSessionId;
    }

    return null;
  }

  /**
   * Track MCP call for session
   */
  async trackMCPCall(
    sessionId: string,
    toolName: string,
    parameters: Record<string, unknown>,
    result: unknown,
    success: boolean,
    duration: number
  ): Promise<void> {
    const callRecord: MCPCallRecord = {
      callId: randomUUID(),
      timestamp: new Date().toISOString(),
      toolName,
      parameters: this.sanitizeParameters(parameters),
      result: this.sanitizeResult(result),
      success,
      duration,
    };

    // Add intelligent next-step suggestion
    callRecord.nextSuggestedTool = this.suggestNextTool(toolName, success, sessionId);

    await sessionDataManager.addMCPCall(sessionId, callRecord);

    // Update call count for this session
    const currentCount = this.sessionCallCounts.get(sessionId) || 0;
    this.sessionCallCounts.set(sessionId, currentCount + 1);

    // Trigger quality score calculation if configured
    const config = sessionDataManager.getConfig();
    if (config.scoringFrequency === 'per_call') {
      // Calculate score every 5 calls to avoid excessive computation
      if ((currentCount + 1) % 5 === 0) {
        await this.calculateQualityScore(sessionId);
      }
    }
  }

  /**
   * Sanitize parameters for storage (remove sensitive data, limit size)
   */
  private sanitizeParameters(parameters: Record<string, unknown>): Record<string, unknown> {
    const config = sessionDataManager.getConfig();
    if (!config.includeCallParameters) {
      return { _omitted: 'Parameters omitted by configuration' };
    }

    // Create a deep copy and sanitize
    const sanitized = JSON.parse(JSON.stringify(parameters));
    
    // Remove potentially sensitive fields
    const sensitiveFields = ['password', 'token', 'key', 'secret', 'credential'];
    this.removeSensitiveFields(sanitized, sensitiveFields);

    // Limit string lengths to prevent excessive storage
    this.limitStringLengths(sanitized, 1000);

    return sanitized;
  }

  /**
   * Sanitize result for storage
   */
  private sanitizeResult(result: unknown): unknown {
    const config = sessionDataManager.getConfig();
    if (!config.includeCallResults) {
      return { _omitted: 'Results omitted by configuration' };
    }

    // For MCP results, we typically want to preserve the structure but limit content size
    if (result && typeof result === 'object') {
      const sanitized = JSON.parse(JSON.stringify(result));
      this.limitStringLengths(sanitized, 2000);
      return sanitized;
    }

    return result;
  }

  /**
   * Remove sensitive fields recursively
   */
  private removeSensitiveFields(obj: unknown, sensitiveFields: string[]): void {
    if (typeof obj !== 'object' || obj === null) return;

    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (sensitiveFields.some(field => key.toLowerCase().includes(field))) {
        objRecord[key] = '[REDACTED]';
      } else if (typeof objRecord[key] === 'object') {
        this.removeSensitiveFields(objRecord[key], sensitiveFields);
      }
    }
  }

  /**
   * Limit string lengths recursively
   */
  private limitStringLengths(obj: unknown, maxLength: number): void {
    if (typeof obj !== 'object' || obj === null) return;

    const objRecord = obj as Record<string, unknown>;
    for (const key in objRecord) {
      if (typeof objRecord[key] === 'string' && (objRecord[key] as string).length > maxLength) {
        objRecord[key] = (objRecord[key] as string).substring(0, maxLength) + '... [TRUNCATED]';
      } else if (typeof objRecord[key] === 'object') {
        this.limitStringLengths(objRecord[key], maxLength);
      }
    }
  }

  /**
   * Suggest next tool based on current tool and result
   */
  private suggestNextTool(
    currentTool: string,
    success: boolean,
    _sessionId: string
  ): string | undefined {
    const config = sessionDataManager.getConfig();
    if (!config.enableRecommendations) {
      return undefined;
    }

    // Simple rule-based suggestions based on tool patterns
    if (!success) {
      // If current tool failed, suggest diagnostic tools
      if (currentTool.includes('compile')) {
        return 'codeql_query_format';
      }
      if (currentTool.includes('test')) {
        return 'codeql_query_compile';
      }
      return 'session_get'; // Get session details to understand the issue
    }

    // Success-based suggestions
    if (currentTool === 'session_start') {
      return 'codeql_query_compile';
    }
    if (currentTool.includes('compile') && success) {
      return 'codeql_test_run';
    }
    if (currentTool.includes('test') && success) {
      return 'session_calculate_current_score';
    }

    return undefined;
  }

  /**
   * Calculate quality score for session (placeholder)
   */
  private async calculateQualityScore(_sessionId: string): Promise<void> {
    try {
      // This would normally call the quality scoring logic
      // For now, we'll use a simplified approach
      logger.debug(`Quality score calculation triggered for session: ${_sessionId}`);
    } catch (error) {
      logger.error('Error calculating quality score:', error);
    }
  }

  /**
   * Clear session reference when session ends
   */
  clearSessionReference(queryPath: string): void {
    this.activeSessionsByQuery.delete(queryPath);
  }

  /**
   * Get current session for query path
   */
  getCurrentSession(queryPath: string): string | undefined {
    return this.activeSessionsByQuery.get(queryPath);
  }
}

// Singleton instance
export const sessionContext = new SessionContext();

/**
 * Middleware function to wrap MCP tool handlers with session tracking
 */
export function withSessionTracking<T extends unknown[], R>(
  toolName: string,
  originalHandler: (..._args: T) => Promise<R>
) {
  return async (..._args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let result: R | undefined;
    let sessionId: string | null = null;

    try {
      // Extract session-related parameters from the first argument (assumed to be parameters object)
      const params = _args[0] as Record<string, unknown>;
      const explicitSessionId = params?.sessionId as string;
      const queryPath = params?.queryPath as string || params?.query_path as string || params?.path as string;
      const language = params?.language as string;

      // Get or create session
      sessionId = await sessionContext.getOrCreateSession(queryPath, language, explicitSessionId);

      // Execute original handler
      result = await originalHandler(..._args);
      success = true;

      return result;
    } finally {
      const duration = Date.now() - startTime;

      // Track the call if we have a session
      if (sessionId) {
        try {
          const params = _args[0] as Record<string, unknown>;
          await sessionContext.trackMCPCall(
            sessionId,
            toolName,
            params || {},
            result,
            success,
            duration
          );
        } catch (trackingError) {
          // Don't fail the original call if tracking fails
          logger.error('Error tracking MCP call:', trackingError);
        }
      }
    }
  };
}

/**
 * Utility function to extract query path from various parameter formats
 */
export function extractQueryPath(params: Record<string, unknown>): string | undefined {
  // Common parameter names that might contain query paths
  const queryPathFields = [
    'queryPath',
    'query_path',
    'path',
    'filePath',
    'file_path',
    'qlPath',
    'ql_path',
  ];

  for (const field of queryPathFields) {
    if (params[field] && typeof params[field] === 'string') {
      // Ensure it looks like a .ql file path
      if (params[field].endsWith('.ql') || (params[field] as string).includes('.ql')) {
        return params[field] as string;
      }
    }
  }

  // If no obvious query path, check if any parameter value looks like a .ql path
  for (const [_key, value] of Object.entries(params)) {
    if (typeof value === 'string' && value.endsWith('.ql')) {
      return value;
    }
  }

  return undefined;
}

/**
 * Enhanced session tracking that automatically detects query paths and manages sessions
 */
export function withAdvancedSessionTracking<T extends unknown[], R>(
  toolName: string,
  originalHandler: (..._args: T) => Promise<R>
) {
  return async (..._args: T): Promise<R> => {
    const startTime = Date.now();
    let success = false;
    let result: R | undefined;
    let sessionId: string | null = null;

    try {
      const params = _args[0] as Record<string, unknown>;
      
      // Enhanced parameter extraction
      const explicitSessionId = params?.sessionId as string;
      let queryPath = extractQueryPath(params);
      const language = params?.language as string;

      // Special handling for different tool types
      if (!queryPath && toolName.includes('codeql')) {
        // For CodeQL tools, try to infer query path from command arguments
        if (params?.query && typeof params.query === 'string') {
          queryPath = params.query;
        } else if (params?.source && typeof params.source === 'string' && params.source.endsWith('.ql')) {
          queryPath = params.source;
        }
      }

      // Get or create session if we can identify a query
      if (queryPath || explicitSessionId) {
        sessionId = await sessionContext.getOrCreateSession(queryPath, language, explicitSessionId);
      }

      // Execute original handler
      result = await originalHandler(..._args);
      success = true;

      // Post-processing: extract additional context from results
      if (sessionId && result && typeof result === 'object') {
        await updateSessionStateFromResult(sessionId, toolName, result as Record<string, unknown>);
      }

      return result;
    } finally {
      const duration = Date.now() - startTime;

      // Track the call if we have a session
      if (sessionId) {
        try {
          const params = _args[0] as Record<string, unknown>;
          await sessionContext.trackMCPCall(
            sessionId,
            toolName,
            params || {},
            result,
            success,
            duration
          );
        } catch (trackingError) {
          logger.error('Error tracking MCP call:', trackingError);
        }
      }
    }
  };
}

/**
 * Update session state based on tool results
 */
async function updateSessionStateFromResult(
  sessionId: string,
  toolName: string,
  result: Record<string, unknown>
): Promise<void> {
  try {
    const stateUpdate: Record<string, unknown> = {};

    // Update compilation status based on CodeQL tool results
    if (toolName.includes('compile')) {
      if (result.isError || (result.content && Array.isArray(result.content) && result.content[0]?.text?.includes('error'))) {
        stateUpdate.compilationStatus = 'failed';
      } else {
        stateUpdate.compilationStatus = 'success';
      }
    }

    // Update test status based on test tool results
    if (toolName.includes('test') && toolName.includes('run')) {
      if (result.isError || (result.content && Array.isArray(result.content) && result.content[0]?.text?.includes('FAILED'))) {
        stateUpdate.testStatus = 'failing';
      } else if (result.content && Array.isArray(result.content) && result.content[0]?.text?.includes('PASSED')) {
        stateUpdate.testStatus = 'passing';
      }
    }

    // Update file presence based on file operations
    if (toolName.includes('generate') || toolName.includes('create')) {
      const session = await sessionDataManager.getSession(sessionId);
      if (session) {
        const currentFiles = session.currentState.filesPresent;
        const queryPath = session.queryPath;
        
        // Add common query-related files
        const newFiles = [...currentFiles];
        if (!newFiles.includes(queryPath)) {
          newFiles.push(queryPath);
        }
        
        // Add potential documentation files
        const docPath = queryPath.replace('.ql', '.md');
        if (!newFiles.includes(docPath)) {
          newFiles.push(docPath);
        }
        
        stateUpdate.filesPresent = newFiles;
      }
    }

    // Apply updates if any
    if (Object.keys(stateUpdate).length > 0) {
      await sessionDataManager.updateSessionState(sessionId, stateUpdate as Record<string, unknown>);
    }
  } catch (error) {
    logger.error('Error updating session state from result:', error);
  }
}