/**
 * CodeQL query validation utilities
 */

import { resolve, normalize, isAbsolute, relative } from 'path';

export interface CodeQLValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
}

/**
 * Validates CodeQL query syntax and structure
 */
export function validateCodeQLSyntax(query: string, _language?: string): CodeQLValidationResult {
  const validation: CodeQLValidationResult = {
    isValid: true,
    errors: [],
    warnings: [],
    suggestions: [],
  };

  if (!query.trim()) {
    validation.isValid = false;
    validation.errors.push('Query cannot be empty');
    return validation;
  }

  if (!query.includes('from') && !query.includes('select')) {
    validation.warnings.push('Query should typically include "from" and "select" clauses');
  }

  if (!query.includes('@name') && !query.includes('@description')) {
    validation.suggestions.push('Consider adding @name and @description metadata');
  }

  return validation;
}

/**
 * Validates a file path to prevent path traversal attacks
 * @param filePath - The file path to validate
 * @param workspaceRoot - Optional workspace root directory. If not provided, allows any absolute path but still blocks traversal attempts
 * @returns The validated absolute path
 * @throws Error if the path contains path traversal sequences
 */
export function validateFilePath(filePath: string, workspaceRoot?: string): string {
  // Normalize the path to resolve any . or .. segments
  const normalizedPath = normalize(filePath);
  
  // Check for path traversal attempts in the normalized path
  // This blocks paths like "../../../etc/passwd" even after normalization
  if (normalizedPath.includes('..')) {
    throw new Error(`Invalid file path: path traversal detected in "${filePath}"`);
  }
  
  // Resolve to absolute path
  const absolutePath = isAbsolute(normalizedPath) 
    ? normalizedPath 
    : resolve(workspaceRoot || process.cwd(), normalizedPath);
  
  // If workspace root is specified, ensure the resolved path is within it
  if (workspaceRoot) {
    const relativePath = relative(workspaceRoot, absolutePath);
    
    // If relative path starts with .. or is absolute, it's outside workspace
    if (relativePath.startsWith('..') || isAbsolute(relativePath)) {
      throw new Error(`Invalid file path: "${filePath}" is outside the workspace root`);
    }
  }
  
  return absolutePath;
}