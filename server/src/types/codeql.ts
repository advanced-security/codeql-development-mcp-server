import { z } from 'zod';

/**
 * CodeQL Query Language types
 */
export const CodeQLQuerySchema = z.object({
  name: z.string(),
  description: z.string(),
  content: z.string(),
  language: z.enum(['java', 'javascript', 'python', 'cpp', 'csharp', 'go', 'ruby']).optional(),
  severity: z.enum(['info', 'warning', 'error']).optional(),
  tags: z.array(z.string()).optional(),
});

export type CodeQLQuery = z.infer<typeof CodeQLQuerySchema>;

/**
 * CodeQL Database types
 */
export const CodeQLDatabaseSchema = z.object({
  name: z.string(),
  language: z.string(),
  path: z.string(),
  created: z.string(),
  size: z.number().optional(),
});

export type CodeQLDatabase = z.infer<typeof CodeQLDatabaseSchema>;

/**
 * CodeQL Analysis Result types
 */
export const CodeQLResultSchema = z.object({
  rule_id: z.string(),
  message: z.string(),
  severity: z.string(),
  file: z.string(),
  line: z.number(),
  column: z.number(),
  snippet: z.string().optional(),
});

export type CodeQLResult = z.infer<typeof CodeQLResultSchema>;

/**
 * CodeQL Learning Resource types
 */
export const CodeQLLearningResourceSchema = z.object({
  title: z.string(),
  description: z.string(),
  category: z.enum(['tutorial', 'reference', 'example', 'pattern', 'best-practice']),
  difficulty: z.enum(['beginner', 'intermediate', 'advanced']),
  content: z.string(),
  tags: z.array(z.string()).optional(),
});

export type CodeQLLearningResource = z.infer<typeof CodeQLLearningResourceSchema>;

/**
 * CodeQL Query File Information types
 * Used by query file finder utilities to track query-related files
 */
export interface QueryFileInfo {
  exists: boolean;
  path: string;  // Always set, whether file exists or not (suggested path for missing files)
}

export interface QueryFilesResult {
  // Always at the top for easy reference
  queryName: string;
  language: string;

  // Alphabetically ordered from here
  allFilesExist: boolean;

  files: {
    query: {
      dir: string;
      doc: string;      // filename only (e.g., "MyQuery.md")
      packDir: string;  // full path to directory containing codeql-pack.yml or qlpack.yml
      query: string;    // filename only (e.g., "MyQuery.ql")
      spec: string;     // filename only (e.g., "MyQuery.qspec")
    };
    test: {
      actual: string;         // filename only (e.g., "MyQuery.actual")
      dir: string;
      expected: string;       // filename only (e.g., "MyQuery.expected")
      packDir: string;        // full path to directory containing codeql-pack.yml or qlpack.yml
      qlref: string;          // filename only (e.g., "MyQuery.qlref")
      testCode: string[];     // array of full paths to test code files
      testDatabaseDir: string; // full path to .testproj directory
    };
  };

  // Library path information (from codeql resolve library-path)
  libraryPaths?: string[];  // Resolved library paths for the query

  // Query metadata (from codeql resolve metadata)
  metadata?: {
    [key: string]: string | string[];
  };

  missingFiles: string[];

  // Pack metadata (from qlpack.yml nearest to the query)
  packMetadata?: {
    name?: string;
    version?: string;
    library?: boolean;
    dependencies?: Record<string, string>;
    [key: string]: unknown;
  };

  status: {
    actualResultsExist: boolean;
    documentationExists: boolean;
    expectedResultsExist: boolean;
    hasTestCode: boolean;
    qlrefExists: boolean;
    queryExists: boolean;
    specificationExists: boolean;
    testDatabaseDirExists: boolean;
    testDirectoryExists: boolean;
  };
}
