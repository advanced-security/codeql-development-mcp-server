/**
 * CodeQL query scaffolding utilities
 * Handles creation of query directory structure and files
 */

import * as fs from 'fs';
import * as path from 'path';

export interface QueryScaffoldingOptions {
  basePath: string;
  queryName: string;
  language: string;
  description?: string;
  queryId?: string;
}

export interface QueryScaffoldingResult {
  queryPath: string;
  testPath: string;
  qlrefPath: string;
  testCodePath: string;
  filesCreated: string[];
}

/**
 * Get the file extension for test code based on language
 */
function getLanguageExtension(language: string): string {
  const extensions: Record<string, string> = {
    javascript: 'js',
    typescript: 'ts',
    python: 'py',
    java: 'java',
    csharp: 'cs',
    cpp: 'cpp',
    go: 'go',
    ruby: 'rb',
    actions: 'yml'
  };
  return extensions[language.toLowerCase()] || 'txt';
}

/**
 * Generate query template content
 */
function generateQueryTemplate(
  queryName: string,
  language: string,
  description?: string,
  queryId?: string
): string {
  const desc = description || `${queryName} query`;
  const id = queryId || `${language}/example/${queryName.toLowerCase()}`;
  
  return `/**
 * @id ${id}
 * @name ${queryName}
 * @description ${desc}
 * @kind problem
 * @precision medium
 * @problem.severity warning
 */

import ${language}

// TODO: Implement query logic
from File f
where f.getBaseName() = "${queryName}.${getLanguageExtension(language)}"
select f, "TODO: Add query logic"
`;
}

/**
 * Create the directory structure and files for a new CodeQL query
 */
export function createCodeQLQuery(options: QueryScaffoldingOptions): QueryScaffoldingResult {
  const { basePath, queryName, language, description, queryId } = options;
  
  // Resolve absolute paths
  const absoluteBasePath = path.resolve(basePath);
  
  // Define paths with intermediate directory
  const srcDir = path.join(absoluteBasePath, 'src', queryName);
  const testDir = path.join(absoluteBasePath, 'test', queryName);
  
  const queryPath = path.join(srcDir, `${queryName}.ql`);
  const qlrefPath = path.join(testDir, `${queryName}.qlref`);
  const testCodePath = path.join(testDir, `${queryName}.${getLanguageExtension(language)}`);
  
  const filesCreated: string[] = [];
  
  try {
    // Create directories (recursive: true is a no-op if they already exist)
    fs.mkdirSync(srcDir, { recursive: true });
    fs.mkdirSync(testDir, { recursive: true });
    
    // Create files atomically using 'wx' flag (exclusive create) to avoid
    // TOCTOU race between existsSync check and writeFileSync (CWE-367).
    // The 'wx' flag fails with EEXIST if the file already exists.
    try {
      const queryContent = generateQueryTemplate(queryName, language, description, queryId);
      fs.writeFileSync(queryPath, queryContent, { encoding: 'utf8', flag: 'wx' });
      filesCreated.push(queryPath);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'EEXIST') throw e;
    }
    
    try {
      const qlrefContent = `${queryName}/${queryName}.ql\n`;
      fs.writeFileSync(qlrefPath, qlrefContent, { encoding: 'utf8', flag: 'wx' });
      filesCreated.push(qlrefPath);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'EEXIST') throw e;
    }
    
    try {
      const testCodeContent = `// Test code for ${queryName}\n// TODO: Add test cases\n`;
      fs.writeFileSync(testCodePath, testCodeContent, { encoding: 'utf8', flag: 'wx' });
      filesCreated.push(testCodePath);
    } catch (e: unknown) {
      const err = e as { code?: string };
      if (err.code !== 'EEXIST') throw e;
    }
    
    return {
      queryPath,
      testPath: testDir,
      qlrefPath,
      testCodePath,
      filesCreated
    };
  } catch (error) {
    throw new Error(`Failed to create query scaffolding: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
