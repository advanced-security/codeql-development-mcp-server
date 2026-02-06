/**
 * Tests for find-class-position tool
 */

import { describe, expect, it } from 'vitest';
import { promises as fs } from 'fs';
import { join } from 'path';
import { findClassPosition } from '../../../../src/tools/codeql/find-class-position';
import { safeUnlink } from '../../../utils/file-cleanup';
import { createTestTempDir } from '../../../utils/temp-dir';

// Helper function to create unique temp files and ensure cleanup
// eslint-disable-next-line no-unused-vars
async function withTempFile<T>(content: string, testName: string, fn: (filePath: string) => Promise<T>): Promise<T> {
  const tempDir = createTestTempDir('find-class-pos');
  const tempFile = join(tempDir, `${testName}.ql`);
  try {
    await fs.writeFile(tempFile, content);
    return await fn(tempFile);
  } finally {
    await safeUnlink(tempFile);
  }
}

describe('findClassPosition', () => {
  it('should find a simple class definition', async () => {
    const testContent = `
import javascript

class MyTestClass extends DataFlow::Node {
  // class body
}

predicate someOtherFunction() { 
  // body
}
`;

    await withTempFile(testContent, 'test-class', async (tempFile) => {
      const position = await findClassPosition(tempFile, 'MyTestClass');
      
      expect(position).toEqual({
        start_line: 4,
        start_col: 7,
        end_line: 4,
        end_col: 17
      });
    });
  });

  it('should find a class with different whitespace patterns', async () => {
    const testContent = `class   VulnerableFunction   extends Configuration {
  // body
}`;

    await withTempFile(testContent, 'test-whitespace', async (tempFile) => {
      const position = await findClassPosition(tempFile, 'VulnerableFunction');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 9,
        end_line: 1,
        end_col: 26
      });
    });
  });

  it('should handle class names with special characters in search', async () => {
    const testContent = `class MyClass$Test extends Node {
  // body
}`;

    await withTempFile(testContent, 'test-special', async (tempFile) => {
      const position = await findClassPosition(tempFile, 'MyClass$Test');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 7,
        end_line: 1,
        end_col: 18
      });
    });
  });

  it('should throw error when class not found', async () => {
    const testContent = `class ExistingClass extends Node {
  // body
}`;

    await withTempFile(testContent, 'test-not-found', async (tempFile) => {
      await expect(findClassPosition(tempFile, 'NonExistentClass'))
        .rejects.toThrow("Class name 'NonExistentClass' not found in file:");
    });
  });

  it('should throw error when file does not exist', async () => {
    // Act & Assert
    await expect(findClassPosition('/nonexistent/file.ql', 'AnyClass'))
      .rejects.toThrow('Failed to read or parse file');
  });

  it('should find the first occurrence when multiple matches exist', async () => {
    const testContent = `class TestClass extends Node {
  // first occurrence
}

// comment mentioning TestClass but this should not match

class OtherClass extends Node {
  // body
}`;

    await withTempFile(testContent, 'test-multiple-class', async (tempFile) => {
      const position = await findClassPosition(tempFile, 'TestClass');
      
      expect(position).toEqual({
        start_line: 1,
        start_col: 7,
        end_line: 1,
        end_col: 15
      });
    });
  });
});