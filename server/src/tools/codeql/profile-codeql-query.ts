/**
 * CodeQL query profiling tool
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { executeCodeQLCommand } from '../../lib/cli-executor';
import { logger } from '../../utils/logger';
import { writeFileSync, readFileSync, existsSync } from 'fs';
import { join, dirname, basename } from 'path';
import { mkdirSync } from 'fs';

interface EvaluatorLogEvent {
  time: string;
  type: string;
  eventId: number;
  nanoTime: number;
  [key: string]: unknown;
}

interface PipelineNode {
  eventId: number;
  name: string;
  position?: string;
  type?: string;
  startTime: number;
  endTime: number;
  duration: number;
  resultSize?: number;
  tupleCount?: number;
  dependencies: string[];
  dependencyEventIds: number[];
}

interface ProfileData {
  queryName: string;
  totalDuration: number;
  totalEvents: number;
  pipelines: PipelineNode[];
}

/**
 * Parse evaluator log and create profile data
 */
function parseEvaluatorLog(logPath: string): ProfileData {
  const logContent = readFileSync(logPath, 'utf-8');
  
  // Split by empty lines to get each JSON object (handles both JSONL and pretty-printed JSON)
  const jsonObjects = logContent.split('\n\n').filter((s) => s.trim());
  const events: EvaluatorLogEvent[] = jsonObjects
    .map((obj) => {
      try {
        return JSON.parse(obj);
      } catch (_error) {
        logger.warn(`Failed to parse evaluator log object: ${obj.substring(0, 100)}...`);
        return null;
      }
    })
    .filter((event): event is EvaluatorLogEvent => event !== null);

  // Map to track pipeline nodes by their start event ID
  const pipelineMap = new Map<number, Partial<PipelineNode>>();
  // Map to track dependency event IDs by predicate name
  const predicateNameToEventId = new Map<string, number>();
  
  let queryName = '';
  let queryStartTime = 0;
  let queryEndTime = 0;

  for (const event of events) {
    switch (event.type) {
      case 'QUERY_STARTED':
        queryName = (event.queryName as string) || '';
        queryStartTime = event.nanoTime;
        break;

      case 'QUERY_COMPLETED':
        queryEndTime = event.nanoTime;
        break;

      case 'PREDICATE_STARTED': {
        const predicateName = event.predicateName as string;
        const position = event.position as string | undefined;
        const predicateType = event.predicateType as string | undefined;
        const dependencies = event.dependencies as Record<string, string> | undefined;
        
        // Track this predicate's event ID by name for dependency resolution
        predicateNameToEventId.set(predicateName, event.eventId);
        
        // Get dependency event IDs
        const dependencyEventIds: number[] = [];
        const dependencyNames: string[] = [];
        if (dependencies) {
          for (const depName of Object.keys(dependencies)) {
            dependencyNames.push(depName);
            const depEventId = predicateNameToEventId.get(depName);
            if (depEventId !== undefined) {
              dependencyEventIds.push(depEventId);
            }
          }
        }

        pipelineMap.set(event.eventId, {
          eventId: event.eventId,
          name: predicateName,
          position,
          type: predicateType,
          startTime: event.nanoTime,
          dependencies: dependencyNames,
          dependencyEventIds,
        });
        break;
      }

      case 'PREDICATE_COMPLETED': {
        const startEventId = event.startEvent as number;
        const pipelineInfo = pipelineMap.get(startEventId);
        if (pipelineInfo) {
          const startEvent = events.find((e) => e.eventId === startEventId);
          if (startEvent) {
            const duration = (event.nanoTime - startEvent.nanoTime) / 1_000_000; // Convert to ms
            pipelineInfo.endTime = event.nanoTime;
            pipelineInfo.duration = duration;
            pipelineInfo.resultSize = event.resultSize as number | undefined;
            pipelineInfo.tupleCount = event.tupleCount as number | undefined;
          }
        }
        break;
      }
    }
  }

  // Convert to array and maintain original evaluation order (by eventId)
  const pipelines: PipelineNode[] = Array.from(pipelineMap.values())
    .filter((p): p is PipelineNode => p.duration !== undefined)
    .sort((a, b) => a.eventId - b.eventId);

  const totalDuration = queryEndTime > 0 ? (queryEndTime - queryStartTime) / 1_000_000 : 0;

  return {
    queryName,
    totalDuration,
    totalEvents: events.length,
    pipelines,
  };
}

/**
 * Format profile data as JSON
 */
function formatAsJson(profile: ProfileData): string {
  return JSON.stringify(profile, null, 2);
}

/**
 * Format profile data as Mermaid diagram
 * Creates a graph showing the query evaluation pipelines in order of execution
 * with dependencies as edges, annotated with duration and result sizes
 */
function formatAsMermaid(profile: ProfileData): string {
  const lines: string[] = [];

  lines.push('```mermaid');
  lines.push('graph TD');
  lines.push('');
  
  // Add query root node
  lines.push(`  QUERY["${basename(profile.queryName)}<br/>Total: ${profile.totalDuration.toFixed(2)}ms"]`);
  lines.push('');
  
  // Create nodes for each pipeline in evaluation order (already sorted by eventId)
  profile.pipelines.forEach((pipeline) => {
    const nodeId = `P${pipeline.eventId}`;
    const duration = pipeline.duration.toFixed(2);
    const resultSize = pipeline.resultSize !== undefined ? pipeline.resultSize : '?';
    // Sanitize predicate name for Mermaid
    const name = pipeline.name.replace(/[<>]/g, '').substring(0, 40);
    lines.push(`  ${nodeId}["${name}<br/>${duration}ms | ${resultSize} results"]`);
  });
  
  lines.push('');
  
  // Add edges from QUERY to root pipelines (those with no dependencies)
  const rootPipelines = profile.pipelines.filter((p) => p.dependencies.length === 0);
    
  rootPipelines.forEach((pipeline) => {
    lines.push(`  QUERY --> P${pipeline.eventId}`);
  });
  
  lines.push('');
  
  // Add edges between pipelines based on dependencies (using eventIds to preserve links)
  profile.pipelines.forEach((pipeline) => {
    pipeline.dependencyEventIds.forEach((depEventId) => {
      const duration = pipeline.duration.toFixed(2);
      lines.push(`  P${depEventId} -->|"${duration}ms"| P${pipeline.eventId}`);
    });
  });
  
  lines.push('');
  lines.push('  classDef default fill:#e1f5ff,stroke:#333,stroke-width:2px');
  lines.push('  classDef query fill:#ffe1e1,stroke:#333,stroke-width:3px');
  lines.push('  class QUERY query');
  lines.push('```');

  return lines.join('\n');
}

/**
 * Register the profile_codeql_query tool
 */
export function registerProfileCodeQLQueryTool(server: McpServer): void {
  server.tool(
    'profile_codeql_query',
    'Profile the performance of a CodeQL query run against a specific database by analyzing the evaluator log JSON file',
    {
      query: z.string().describe('Path to the .ql query file'),
      database: z.string().describe('Path to the CodeQL database directory'),
      evaluatorLog: z
        .string()
        .optional()
        .describe(
          'Path to an existing structured JSON log (e.g., evaluator-log.jsonl) file. If not provided, the tool will run the query to generate one.'
        ),
      outputDir: z
        .string()
        .optional()
        .describe('Directory to write profiling data files (defaults to same directory as evaluator log)'),
    },
    async (params) => {
      try {
        const { query, database, evaluatorLog, outputDir } = params;
        let logPath = evaluatorLog;
        let bqrsPath: string | undefined;
        let sarifPath: string | undefined;

        // If evaluator log not provided, run the query to generate one
        if (!logPath) {
          logger.info('No evaluator log provided, running query to generate one');

          // Determine output directory
          const defaultOutputDir = outputDir || join(dirname(query as string), 'profile-output');
          mkdirSync(defaultOutputDir, { recursive: true });

          logPath = join(defaultOutputDir, 'evaluator-log.jsonl');
          bqrsPath = join(defaultOutputDir, 'query-results.bqrs');
          sarifPath = join(defaultOutputDir, 'query-results.sarif');

          // Run query with evaluator logging and tuple counting
          const queryResult = await executeCodeQLCommand(
            'query run',
            {
              database: database as string,
              output: bqrsPath,
              'evaluator-log': logPath,
              'tuple-counting': true,
              'evaluator-log-level': 5,
            },
            [query as string]
          );

          if (!queryResult.success) {
            return {
              content: [
                {
                  type: 'text' as const,
                  text: `Failed to run query: ${queryResult.stderr || queryResult.error}`,
                },
              ],
              isError: true,
            };
          }

          // Generate SARIF interpretation
          if (existsSync(bqrsPath)) {
            try {
              const sarifResult = await executeCodeQLCommand(
                'bqrs interpret',
                { format: 'sarif-latest', output: sarifPath },
                [bqrsPath]
              );

              if (sarifResult.success) {
                logger.info(`Generated SARIF interpretation at ${sarifPath}`);
              }
            } catch (error) {
              logger.warn(`Failed to generate SARIF interpretation: ${error}`);
            }
          }
        }

        // Verify evaluator log exists
        if (!existsSync(logPath)) {
          return {
            content: [
              {
                type: 'text' as const,
                text: `Evaluator log not found at: ${logPath}`,
              },
            ],
            isError: true,
          };
        }

        // Parse the evaluator log
        logger.info(`Parsing evaluator log from: ${logPath}`);
        const profile = parseEvaluatorLog(logPath);

        // Determine output directory for profile
        const profileOutputDir = outputDir || dirname(logPath);
        mkdirSync(profileOutputDir, { recursive: true });

        // Write profile JSON file
        const jsonPath = join(profileOutputDir, 'query-evaluation-profile.json');
        const jsonContent = formatAsJson(profile);
        writeFileSync(jsonPath, jsonContent);
        logger.info(`Profile JSON written to: ${jsonPath}`);

        // Write profile Mermaid diagram file
        const mdPath = join(profileOutputDir, 'query-evaluation-profile.md');
        const mdContent = formatAsMermaid(profile);
        writeFileSync(mdPath, mdContent);
        logger.info(`Profile Mermaid diagram written to: ${mdPath}`);

        // Build response message
        const outputFiles: string[] = [
          `Profile JSON: ${jsonPath}`,
          `Profile Mermaid: ${mdPath}`,
          `Evaluator Log: ${logPath}`,
        ];

        if (bqrsPath) {
          outputFiles.push(`Query Results (BQRS): ${bqrsPath}`);
        }

        if (sarifPath && existsSync(sarifPath)) {
          outputFiles.push(`Query Results (SARIF): ${sarifPath}`);
        }

        const responseText = [
          'Query profiling completed successfully!',
          '',
          'Output Files:',
          ...outputFiles.map((f) => `  - ${f}`),
          '',
          'Profile Summary:',
          `  - Query: ${basename(profile.queryName)}`,
          `  - Total Duration: ${profile.totalDuration.toFixed(2)} ms`,
          `  - Total Pipelines: ${profile.pipelines.length}`,
          `  - Total Events: ${profile.totalEvents}`,
          '',
          'First 5 Pipeline Nodes (in evaluation order):',
          ...profile.pipelines.slice(0, 5).map((p, idx) => {
            return `  ${idx + 1}. ${p.name} (${p.duration.toFixed(2)} ms, ${p.resultSize || '?'} results)`;
          }),
        ].join('\n');

        return {
          content: [
            {
              type: 'text' as const,
              text: responseText,
            },
          ],
        };
      } catch (error) {
        logger.error('Error profiling CodeQL query:', error);

        return {
          content: [
            {
              type: 'text' as const,
              text: `Failed to profile query: ${error instanceof Error ? error.message : String(error)}`,
            },
          ],
          isError: true,
        };
      }
    }
  );
}
