/**
 * Tests for find-predicate-position tool
 */

import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { findPredicatePosition } from '../../../../src/tools/codeql/find-predicate-position';
import { safeUnlink } from '../../../utils/file-cleanup';

// Helper function to create unique temp files and ensure cleanup
// eslint-disable-next-line no-unused-vars
async function withTempFile<T>(content: string, testName: string, fn: (filePath: string) => Promise<T>): Promise<T> {
  const tempFile = join(tmpdir(), `${testName}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}.ql`);
  try {
    await fs.writeFile(tempFile, content);
    return await fn(tempFile);
  } finally {
    await safeUnlink(tempFile);
  }
}

describe('findPredicatePosition', () => {
  it('should find a simple predicate definition', async () => {
    const testContent = `
import javascript

predicate isVulnerable(DataFlow::Node node) {
  // predicate body
}

class SomeClass extends Node {
  // class body
}
`;

    await withTempFile(testContent, 'test-predicate', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'isVulnerable');
      
      expect(position).toEqual({
        start_line: 4,
        start_col: 11,
        end_line: 4,
        end_col: 22
      });
    });
  });

  it('should find predicate inside a class', async () => {
    const testContent = `class MyConfiguration extends DataFlow::Configuration {
  predicate isSource(DataFlow::Node source) {
    // body
  }
  
  predicate isSink(DataFlow::Node sink) {
    // body
  }
}`;

    await withTempFile(testContent, 'test-class-predicate', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'isSink');
      
      expect(position).toEqual({
        start_line: 6,
        start_col: 13,
        end_line: 6,
        end_col: 18
      });
    });
  });

  it('should find predicate with different whitespace patterns', async () => {
    const testContent = `predicate   getSink   (DataFlow::Node n) {
  // body
}`;

    await withTempFile(testContent, 'test-whitespace', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'getSink');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 13,
        end_line: 1,
        end_col: 19
      });
    });
  });

  it('should find predicate with no parameters', async () => {
    const testContent = `predicate hasVulnerability() {
  // body
}`;

    await withTempFile(testContent, 'test-no-params', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'hasVulnerability');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 11,
        end_line: 1,
        end_col: 26
      });
    });
  });

  it('should throw error when predicate not found', async () => {
    const testContent = `predicate existingPredicate() {
  // body
}`;

    await withTempFile(testContent, 'test-not-found', async (tempFile) => {
      await expect(findPredicatePosition(tempFile, 'nonExistentPredicate'))
        .rejects.toThrow("Predicate name 'nonExistentPredicate' not found in file:");
    });
  });

  it('should throw error when file does not exist', async () => {
    // Act & Assert
    await expect(findPredicatePosition('/nonexistent/file.ql', 'anyPredicate'))
      .rejects.toThrow('Failed to read or parse file');
  });

  it('should find the first occurrence when multiple matches exist', async () => {
    const testContent = `predicate testPredicate() {
  // first occurrence
}

class SomeClass {
  predicate testPredicate() {
    // second occurrence in class
  }
}`;

    await withTempFile(testContent, 'test-multiple-predicate', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'testPredicate');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 11,
        end_line: 1,
        end_col: 23
      });
    });
  });

  it('should handle predicate names with special characters', async () => {
    const testContent = `predicate test$Predicate_Name() {
  // body
}`;

    await withTempFile(testContent, 'test-special-chars', async (tempFile) => {
      const position = await findPredicatePosition(tempFile, 'test$Predicate_Name');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 11,
        end_line: 1,
        end_col: 29
      });
    });
  });
});