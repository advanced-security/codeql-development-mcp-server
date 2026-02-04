/**
 * CodeQL query file finder utilities
 * Handles discovery and tracking of query-related files and directories
 */

import * as fs from 'fs';
import * as path from 'path';
import * as yaml from 'js-yaml';
import { QueryFileInfo, QueryFilesResult } from '../types/codeql';
import { resolveQueryMetadata } from './metadata-resolver';

// Supported CodeQL languages and their file extensions (alphabetically ordered)
const LANGUAGE_EXTENSIONS: Record<string, string> = {
  actions: 'yml',
  cpp: 'cpp',
  csharp: 'cs',
  go: 'go',
  java: 'java',
  javascript: 'js',
  python: 'py',
  ruby: 'rb',
  swift: 'swift',
  typescript: 'ts'
};

const KNOWN_LANGUAGES = Object.keys(LANGUAGE_EXTENSIONS);

/**
 * Get the file extension for test code based on language
 */
function getLanguageExtension(language: string): string {
  return LANGUAGE_EXTENSIONS[language.toLowerCase()] || 'txt';
}

/**
 * Infer the language from the query file's directory structure
 */
function inferLanguageFromPath(queryPath: string): string {
  const parts = queryPath.split(path.sep);

  for (const part of parts) {
    if (KNOWN_LANGUAGES.includes(part.toLowerCase())) {
      return part.toLowerCase();
    }
  }

  // Default fallback
  return 'unknown';
}

/**
 * Find the nearest qlpack.yml or codeql-pack.yml file by walking up the directory tree
 */
function findNearestQlpack(startPath: string): string | null {
  let currentPath = startPath;
  const root = path.parse(currentPath).root;

  while (currentPath !== root) {
    // Check for codeql-pack.yml first (newer format), then qlpack.yml
    for (const packFile of ['codeql-pack.yml', 'qlpack.yml']) {
      const packPath = path.join(currentPath, packFile);
      if (fs.existsSync(packPath) && fs.statSync(packPath).isFile()) {
        return packPath;
      }
    }
    currentPath = path.dirname(currentPath);
  }

  return null;
}

/**
 * Read and parse qlpack.yml file
 */
function readQlpackMetadata(qlpackPath: string): Record<string, unknown> | null {
  try {
    const content = fs.readFileSync(qlpackPath, 'utf-8');
    const parsed = yaml.load(content) as Record<string, unknown>;
    return parsed;
  } catch (_error) {
    // If we can't parse it, return null rather than failing
    return null;
  }
}

/**
 * Check if a file exists and return QueryFileInfo
 */
function checkFile(filePath: string): QueryFileInfo {
  try {
    const exists = fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    return {
      exists,
      path: filePath  // Always return path, whether it exists or not
    };
  } catch {
    return {
      exists: false,
      path: filePath  // Return the path even on error
    };
  }
}

/**
 * Check if a directory exists and return QueryFileInfo
 */
function checkDirectory(dirPath: string): QueryFileInfo {
  try {
    const exists = fs.existsSync(dirPath) && fs.statSync(dirPath).isDirectory();
    return {
      exists,
      path: dirPath  // Always return path, whether it exists or not
    };
  } catch {
    return {
      exists: false,
      path: dirPath  // Return the path even on error
    };
  }
}

/**
 * Find all test code files in the test directory
 */
function findTestCodeFiles(testDir: string, queryName: string, language: string): string[] {
  if (!fs.existsSync(testDir)) {
    return [];
  }

  try {
    const files = fs.readdirSync(testDir);
    const languageExt = getLanguageExtension(language);
    const testFiles: string[] = [];

    // Look for files matching the query name or other test code files
    const allValidExtensions = [...new Set([...Object.values(LANGUAGE_EXTENSIONS), 'yaml'])]; // Include yaml as alias for yml

    for (const file of files) {
      const filePath = path.join(testDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isFile()) {
        // Include the primary test file matching query name
        if (file === `${queryName}.${languageExt}`) {
          testFiles.push(filePath);
        }
        // Include other code files (but not .qlref, .expected, .actual files)
        else if (!file.endsWith('.qlref') && !file.endsWith('.expected') && !file.endsWith('.actual')) {
          const ext = path.extname(file).slice(1);
          if (ext === languageExt || allValidExtensions.includes(ext)) {
            testFiles.push(filePath);
          }
        }
      }
    }

    return testFiles;
  } catch {
    return [];
  }
}

/**
 * Find CodeQL query files and directories based on a query file path
 * Optionally resolves metadata if the query file exists
 */
export async function findCodeQLQueryFiles(
  queryFilePath: string,
  language?: string,
  resolveMetadata: boolean = true
): Promise<QueryFilesResult> {
  // Resolve absolute path
  const absoluteQueryPath = path.resolve(queryFilePath);

  // Extract query name and directory
  const queryName = path.basename(absoluteQueryPath, '.ql');
  const queryDir = path.dirname(absoluteQueryPath);

  // Infer language if not provided
  const detectedLanguage = language || inferLanguageFromPath(absoluteQueryPath);

  // Check query file itself
  const queryPath = checkFile(absoluteQueryPath);
  const queryDirectory = checkDirectory(queryDir);

  // Check for documentation files
  const mdPath = path.join(queryDir, `${queryName}.md`);
  const qhelpPath = path.join(queryDir, `${queryName}.qhelp`);
  const mdInfo = checkFile(mdPath);
  const qhelpInfo = checkFile(qhelpPath);

  const documentationPath: QueryFileInfo = mdInfo.exists ? mdInfo : (qhelpInfo.exists ? qhelpInfo : {
    exists: false,
    path: mdPath  // Suggest .md as the default
  });

  // Check for specification file
  const qspecPath = path.join(queryDir, `${queryName}.qspec`);
  const specificationPath = checkFile(qspecPath);

  // Determine test directory
  // Pattern: if query is in .../src/QueryName/, test should be in .../test/QueryName/
  let testDir: string;
  if (queryDir.includes(`${path.sep}src${path.sep}`)) {
    // Find the last occurrence of /src/ and replace it with /test/
    const parts = queryDir.split(path.sep);
    const srcIndex = parts.lastIndexOf('src');
    if (srcIndex !== -1) {
      parts[srcIndex] = 'test';
      testDir = parts.join(path.sep);
    } else {
      // Fallback in case split didn't find it
      testDir = path.join(path.dirname(queryDir), 'test', queryName);
    }
  } else {
    // Fallback: if not in src directory, construct test dir based on parent
    testDir = path.join(path.dirname(queryDir), 'test', queryName);
  }
  const testDirectory = checkDirectory(testDir);

  // Check for .qlref file
  const qlrefPath = path.join(testDir, `${queryName}.qlref`);
  const qlrefInfo = checkFile(qlrefPath);

  // Find test code files
  const testCodePaths = findTestCodeFiles(testDir, queryName, detectedLanguage);

  // Check for expected results
  const expectedPath = path.join(testDir, `${queryName}.expected`);
  const expectedResultsPath = checkFile(expectedPath);

  // Check for actual results
  const actualPath = path.join(testDir, `${queryName}.actual`);
  const actualResultsPath = checkFile(actualPath);

  // Check for test database
  const testprojPath = path.join(testDir, `${queryName}.testproj`);
  const testDatabasePath = checkDirectory(testprojPath);

  // Determine missing files
  const missingFiles: string[] = [];
  if (!queryPath.exists) missingFiles.push(queryPath.path);
  if (!documentationPath.exists) missingFiles.push(documentationPath.path);
  if (!specificationPath.exists) missingFiles.push(specificationPath.path);
  if (!testDirectory.exists) missingFiles.push(testDirectory.path);
  if (!qlrefInfo.exists) missingFiles.push(qlrefInfo.path);
  if (testCodePaths.length === 0) missingFiles.push(path.join(testDir, `${queryName}.${getLanguageExtension(detectedLanguage)}`));
  if (!expectedResultsPath.exists) missingFiles.push(expectedResultsPath.path);

  const allFilesExist = missingFiles.length === 0;

  // Resolve metadata if requested and query file exists
  let metadata: { [key: string]: string | string[] } | undefined;
  if (resolveMetadata && queryPath.exists) {
    const resolvedMetadata = await resolveQueryMetadata(absoluteQueryPath);
    if (resolvedMetadata) {
      metadata = resolvedMetadata;
    }
  }

  // Resolve pack metadata and directories by finding the nearest qlpack.yml files
  let packMetadata: Record<string, unknown> | undefined;
  const queryPackPath = findNearestQlpack(queryDir);
  const queryPackDir = queryPackPath ? path.dirname(queryPackPath) : queryDir;
  if (queryPackPath) {
    const parsed = readQlpackMetadata(queryPackPath);
    if (parsed) {
      packMetadata = parsed;
    }
  }

  // Find pack directory for test files
  const testPackPath = findNearestQlpack(testDir);
  const testPackDir = testPackPath ? path.dirname(testPackPath) : testDir;

  return {
    queryName,
    language: detectedLanguage,

    allFilesExist,

    files: {
      query: {
        dir: queryDirectory.path,
        doc: path.basename(documentationPath.path),
        packDir: queryPackDir,
        query: path.basename(queryPath.path),
        spec: path.basename(specificationPath.path)
      },
      test: {
        actual: path.basename(actualResultsPath.path),
        dir: testDirectory.path,
        expected: path.basename(expectedResultsPath.path),
        packDir: testPackDir,
        qlref: path.basename(qlrefInfo.path),
        testCode: testCodePaths,
        testDatabaseDir: testDatabasePath.path
      }
    },

    metadata,

    missingFiles,

    packMetadata,

    status: {
      actualResultsExist: actualResultsPath.exists,
      documentationExists: documentationPath.exists,
      expectedResultsExist: expectedResultsPath.exists,
      hasTestCode: testCodePaths.length > 0,
      qlrefExists: qlrefInfo.exists,
      queryExists: queryPath.exists,
      specificationExists: specificationPath.exists,
      testDatabaseDirExists: testDatabasePath.exists,
      testDirectoryExists: testDirectory.exists
    }
  };
}
