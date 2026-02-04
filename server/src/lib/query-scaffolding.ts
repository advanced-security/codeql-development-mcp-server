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
    // Create source directory
    if (!fs.existsSync(srcDir)) {
      fs.mkdirSync(srcDir, { recursive: true });
    }
    
    // Create test directory
    if (!fs.existsSync(testDir)) {
      fs.mkdirSync(testDir, { recursive: true });
    }
    
    // Create query file
    if (!fs.existsSync(queryPath)) {
      const queryContent = generateQueryTemplate(queryName, language, description, queryId);
      fs.writeFileSync(queryPath, queryContent, 'utf8');
      filesCreated.push(queryPath);
    }
    
    // Create .qlref file with relative path
    if (!fs.existsSync(qlrefPath)) {
      const qlrefContent = `${queryName}/${queryName}.ql\n`;
      fs.writeFileSync(qlrefPath, qlrefContent, 'utf8');
      filesCreated.push(qlrefPath);
    }
    
    // Create test code file stub
    if (!fs.existsSync(testCodePath)) {
      const testCodeContent = `// Test code for ${queryName}\n// TODO: Add test cases\n`;
      fs.writeFileSync(testCodePath, testCodeContent, 'utf8');
      filesCreated.push(testCodePath);
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
