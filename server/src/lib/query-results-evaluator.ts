/**
 * Query results evaluation functions for processing .bqrs files
 */

import { executeCodeQLCommand } from './cli-executor';
import { logger } from '../utils/logger';
import { writeFileSync, readFileSync } from 'fs';
import { dirname, isAbsolute } from 'path';
import { mkdirSync } from 'fs';

export interface QueryEvaluationResult {
  success: boolean;
  outputPath?: string;
  content?: string;
  error?: string;
}

export interface QueryMetadata {
  kind?: string;
  name?: string;
  description?: string;
  id?: string;
  tags?: string[];
}

/**
 * Built-in evaluation functions
 */
export const BUILT_IN_EVALUATORS = {
  'json-decode': 'JSON format decoder for query results',
  'csv-decode': 'CSV format decoder for query results', 
  'mermaid-graph': 'Mermaid diagram generator for @kind graph queries (like PrintAST)',
} as const;

export type BuiltInEvaluator = keyof typeof BUILT_IN_EVALUATORS;

/**
 * Extract metadata from a CodeQL query file
 */
export async function extractQueryMetadata(queryPath: string): Promise<QueryMetadata> {
  try {
    const queryContent = readFileSync(queryPath, 'utf-8');
    const metadata: QueryMetadata = {};
    
    // Extract metadata from comments using regex patterns
    const kindMatch = queryContent.match(/@kind\s+([^\s]+)/);
    if (kindMatch) metadata.kind = kindMatch[1];
    
    const nameMatch = queryContent.match(/@name\s+(.+)/);
    if (nameMatch) metadata.name = nameMatch[1].trim();
    
    const descMatch = queryContent.match(/@description\s+(.+)/);
    if (descMatch) metadata.description = descMatch[1].trim();
    
    const idMatch = queryContent.match(/@id\s+(.+)/);
    if (idMatch) metadata.id = idMatch[1].trim();
    
    const tagsMatch = queryContent.match(/@tags\s+(.+)/);
    if (tagsMatch) {
      metadata.tags = tagsMatch[1].split(/\s+/).filter(t => t.length > 0);
    }
    
    return metadata;
  } catch (error) {
    logger.error('Failed to extract query metadata:', error);
    return {};
  }
}

/**
 * JSON decoder - converts .bqrs to JSON format
 */
export async function evaluateWithJsonDecoder(
  bqrsPath: string, 
  outputPath?: string
): Promise<QueryEvaluationResult> {
  try {
    const result = await executeCodeQLCommand(
      'bqrs decode',
      { format: 'json' },
      [bqrsPath]
    );
    
    if (!result.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${result.stderr || result.error}`
      };
    }
    
    const defaultOutputPath = outputPath || bqrsPath.replace('.bqrs', '.json');
    
    // Ensure output directory exists
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
    
    // Write JSON results
    writeFileSync(defaultOutputPath, result.stdout);
    
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: result.stdout
    };
  } catch (error) {
    return {
      success: false,
      error: `JSON evaluation failed: ${error}`
    };
  }
}

/**
 * CSV decoder - converts .bqrs to CSV format
 */
export async function evaluateWithCsvDecoder(
  bqrsPath: string,
  outputPath?: string
): Promise<QueryEvaluationResult> {
  try {
    const result = await executeCodeQLCommand(
      'bqrs decode',
      { format: 'csv' },
      [bqrsPath]
    );
    
    if (!result.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${result.stderr || result.error}`
      };
    }
    
    const defaultOutputPath = outputPath || bqrsPath.replace('.bqrs', '.csv');
    
    // Ensure output directory exists
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
    
    // Write CSV results
    writeFileSync(defaultOutputPath, result.stdout);
    
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: result.stdout
    };
  } catch (error) {
    return {
      success: false,
      error: `CSV evaluation failed: ${error}`
    };
  }
}

/**
 * Mermaid graph generator - converts @kind graph query results to mermaid diagrams
 */
export async function evaluateWithMermaidGraph(
  bqrsPath: string,
  queryPath: string,
  outputPath?: string
): Promise<QueryEvaluationResult> {
  try {
    // First extract query metadata to confirm this is a graph query
    const metadata = await extractQueryMetadata(queryPath);
    
    if (metadata.kind !== 'graph') {
      logger.error(`Query is not a graph query (kind: ${metadata.kind}), mermaid-graph evaluation is only for @kind graph queries`);
      return {
        success: false,
        error: `Query is not a graph query (kind: ${metadata.kind}), mermaid-graph evaluation is only for @kind graph queries`
      };
    }
    
    // Decode the BQRS file to JSON first
    const jsonResult = await executeCodeQLCommand(
      'bqrs decode',
      { format: 'json' },
      [bqrsPath]
    );
    
    if (!jsonResult.success) {
      return {
        success: false,
        error: `Failed to decode BQRS file: ${jsonResult.stderr || jsonResult.error}`
      };
    }
    
    // Parse the JSON results
    let queryResults;
    try {
      queryResults = JSON.parse(jsonResult.stdout);
    } catch (parseError) {
      return {
        success: false,
        error: `Failed to parse query results JSON: ${parseError}`
      };
    }
    
    // Generate mermaid diagram from graph results
    const mermaidContent = generateMermaidFromGraphResults(queryResults, metadata);
    
    const defaultOutputPath = outputPath || bqrsPath.replace('.bqrs', '.md');
    
    // Ensure output directory exists
    mkdirSync(dirname(defaultOutputPath), { recursive: true });
    
    // Write markdown file with mermaid diagram
    writeFileSync(defaultOutputPath, mermaidContent);
    
    return {
      success: true,
      outputPath: defaultOutputPath,
      content: mermaidContent
    };
  } catch (error) {
    return {
      success: false,
      error: `Mermaid graph evaluation failed: ${error}`
    };
  }
}

/**
 * Generate mermaid diagram from CodeQL graph query results
 */
function generateMermaidFromGraphResults(queryResults: unknown, metadata: QueryMetadata): string {
  const queryName = sanitizeMarkdown(metadata.name || 'CodeQL Query Results');
  const queryDesc = sanitizeMarkdown(metadata.description || 'Graph visualization of CodeQL query results');
  
  let mermaidContent = `# ${queryName}\n\n${queryDesc}\n\n`;
  
  // Handle different result structures that CodeQL graph queries can produce
  if (!queryResults || typeof queryResults !== 'object') {
    mermaidContent += '```mermaid\ngraph TD\n    A[No Results]\n```\n';
    return mermaidContent;
  }
  
  // Check if results have the expected structure for graph queries
  const tuples = queryResults.tuples || queryResults;
  
  if (!Array.isArray(tuples) || tuples.length === 0) {
    mermaidContent += '```mermaid\ngraph TD\n    A[No Graph Data]\n```\n';
    return mermaidContent;
  }
  
  mermaidContent += '```mermaid\ngraph TD\n';
  
  // Track nodes and edges to avoid duplicates
  const nodes = new Set<string>();
  const edges = new Set<string>();
  
  // Process each tuple in the results
  tuples.forEach((tuple: unknown, index: number) => {
    if (Array.isArray(tuple) && tuple.length >= 2) {
      // Extract source and target from tuple
      const source = sanitizeNodeId(tuple[0]?.toString() || `node_${index}_0`);
      const target = sanitizeNodeId(tuple[1]?.toString() || `node_${index}_1`);
      const label = tuple[2]?.toString() || '';
      
      // Add nodes
      nodes.add(source);
      nodes.add(target);
      
      // Add edge
      const edgeId = `${source}_${target}`;
      if (!edges.has(edgeId)) {
        if (label) {
          mermaidContent += `    ${source} -->|${sanitizeLabel(label)}| ${target}\n`;
        } else {
          mermaidContent += `    ${source} --> ${target}\n`;
        }
        edges.add(edgeId);
      }
    } else if (typeof tuple === 'object' && tuple !== null) {
      // Handle object-based results
      const source = sanitizeNodeId(tuple.source?.toString() || tuple.from?.toString() || `node_${index}_src`);
      const target = sanitizeNodeId(tuple.target?.toString() || tuple.to?.toString() || `node_${index}_tgt`);
      const label = tuple.label?.toString() || tuple.relation?.toString() || '';
      
      nodes.add(source);
      nodes.add(target);
      
      const edgeId = `${source}_${target}`;
      if (!edges.has(edgeId)) {
        if (label) {
          mermaidContent += `    ${source} -->|${sanitizeLabel(label)}| ${target}\n`;
        } else {
          mermaidContent += `    ${source} --> ${target}\n`;
        }
        edges.add(edgeId);
      }
    }
  });
  
  // If no edges were created, create a simple diagram showing the first few nodes
  if (edges.size === 0 && nodes.size > 0) {
    const nodeArray = Array.from(nodes).slice(0, 10); // Limit to avoid clutter
    nodeArray.forEach((node, index) => {
      if (index === 0) {
        mermaidContent += `    ${node}[${sanitizeLabel(node)}]\n`;
      } else {
        mermaidContent += `    ${nodeArray[0]} --> ${node}\n`;
      }
    });
  }
  
  mermaidContent += '```\n\n';
  
  // Add statistics
  mermaidContent += `## Query Statistics\n\n`;
  mermaidContent += `- Total nodes: ${nodes.size}\n`;
  mermaidContent += `- Total edges: ${edges.size}\n`;
  mermaidContent += `- Total tuples processed: ${tuples.length}\n`;
  
  return mermaidContent;
}

/**
 * Sanitize node IDs for mermaid compatibility
 */
function sanitizeNodeId(id: string): string {
  return id
    .replace(/[^a-zA-Z0-9_]/g, '_')
    .replace(/^(\d)/, 'n$1') // Prefix with 'n' if starts with number
    .substring(0, 50); // Limit length
}

/**
 * Sanitize labels for mermaid compatibility
 */
function sanitizeLabel(label: string): string {
  return label
    .replace(/[|"`<>\n\r\t]/g, '') // Remove problematic characters including backticks, newlines, angle brackets
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 30); // Limit length for readability
}

/**
 * Sanitize markdown content to prevent injection
 */
function sanitizeMarkdown(content: string): string {
  return content
    .replace(/[<>"`]/g, '') // Remove potentially dangerous characters
    .replace(/\n/g, ' ') // Convert newlines to spaces
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim()
    .substring(0, 100); // Limit length
}

/**
 * Main evaluation function that determines which evaluator to use
 */
export async function evaluateQueryResults(
  bqrsPath: string,
  queryPath: string,
  evaluationFunction?: string,
  outputPath?: string
): Promise<QueryEvaluationResult> {
  try {
    // If no evaluation function specified, default to json-decode
    const evalFunc = evaluationFunction || 'json-decode';
    
    logger.info(`Evaluating query results with function: ${evalFunc}`);
    
    // Handle built-in evaluation functions
    switch (evalFunc) {
      case 'json-decode':
        return await evaluateWithJsonDecoder(bqrsPath, outputPath);
        
      case 'csv-decode':
        return await evaluateWithCsvDecoder(bqrsPath, outputPath);
        
      case 'mermaid-graph':
        return await evaluateWithMermaidGraph(bqrsPath, queryPath, outputPath);
        
      default:
        // Check if it's a path to a custom evaluation script
        if (isAbsolute(evalFunc)) {
          return await evaluateWithCustomScript(bqrsPath, queryPath, evalFunc, outputPath);
        } else {
          return {
            success: false,
            error: `Unknown evaluation function: ${evalFunc}. Available built-in functions: ${Object.keys(BUILT_IN_EVALUATORS).join(', ')}`
          };
        }
    }
  } catch (error) {
    return {
      success: false,
      error: `Query evaluation failed: ${error}`
    };
  }
}

/**
 * Execute custom evaluation script
 */
async function evaluateWithCustomScript(
  _bqrsPath: string,
  _queryPath: string,
  _scriptPath: string,
  _outputPath?: string
): Promise<QueryEvaluationResult> {
  // TODO: Implement custom script execution
  // This would need to execute the script with bqrsPath and queryPath as arguments
  // and capture the output
  return {
    success: false,
    error: 'Custom evaluation scripts are not yet implemented'
  };
}