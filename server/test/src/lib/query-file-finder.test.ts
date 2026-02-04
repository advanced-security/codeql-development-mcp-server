/**
 * Tests for query-file-finder module
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';
import { findCodeQLQueryFiles } from '../../../src/lib/query-file-finder.js';

describe('Query File Finder', () => {
  let testDir: string;

  beforeEach(() => {
    // Create a temporary test directory
    testDir = path.join(tmpdir(), `test-query-finder-${Date.now()}`);
    fs.mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    // Clean up test directory
    if (fs.existsSync(testDir)) {
      fs.rmSync(testDir, { recursive: true, force: true });
    }
  });

  describe('findCodeQLQueryFiles', () => {
    it('should find all query files when they exist', async () => {
      // Create a complete query structure
      const srcDir = path.join(testDir, 'javascript', 'src', 'TestQuery');
      const testDirPath = path.join(testDir, 'javascript', 'test', 'TestQuery');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      // Create all files
      const queryFile = path.join(srcDir, 'TestQuery.ql');
      const mdFile = path.join(srcDir, 'TestQuery.md');
      const qspecFile = path.join(srcDir, 'TestQuery.qspec');
      const qlrefFile = path.join(testDirPath, 'TestQuery.qlref');
      const testCodeFile = path.join(testDirPath, 'TestQuery.js');
      const expectedFile = path.join(testDirPath, 'TestQuery.expected');

      fs.writeFileSync(queryFile, 'import javascript\nselect 1');
      fs.writeFileSync(mdFile, '# TestQuery');
      fs.writeFileSync(qspecFile, 'purpose: Test');
      fs.writeFileSync(qlrefFile, 'TestQuery/TestQuery.ql');
      fs.writeFileSync(testCodeFile, '// test code');
      fs.writeFileSync(expectedFile, '');

      const result = await findCodeQLQueryFiles(queryFile, 'javascript', false);

      expect(result.queryName).toBe('TestQuery');
      expect(result.language).toBe('javascript');
      expect(result.files.query.dir).toBe(srcDir);
      expect(result.files.query.query).toBe('TestQuery.ql');
      expect(result.files.query.doc).toBe('TestQuery.md');
      expect(result.files.query.spec).toBe('TestQuery.qspec');
      expect(result.files.test.dir).toBe(testDirPath);
      expect(result.files.test.qlref).toBe('TestQuery.qlref');
      expect(result.files.test.expected).toBe('TestQuery.expected');
      expect(result.files.test.testCode).toHaveLength(1);
      expect(result.status.queryExists).toBe(true);
      expect(result.status.documentationExists).toBe(true);
      expect(result.status.specificationExists).toBe(true);
      expect(result.status.testDirectoryExists).toBe(true);
      expect(result.status.qlrefExists).toBe(true);
      expect(result.status.hasTestCode).toBe(true);
      expect(result.status.expectedResultsExist).toBe(true);
      expect(result.allFilesExist).toBe(true);
      expect(result.missingFiles).toHaveLength(0);
    });

    it('should detect missing files and suggest paths', async () => {
      // Create only the query file
      const srcDir = path.join(testDir, 'python', 'src', 'MissingQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'MissingQuery.ql');
      fs.writeFileSync(queryFile, 'import python\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.queryName).toBe('MissingQuery');
      expect(result.language).toBe('python');
      expect(result.status.queryExists).toBe(true);
      expect(result.status.documentationExists).toBe(false);
      expect(result.status.specificationExists).toBe(false);
      expect(result.status.testDirectoryExists).toBe(false);
      expect(result.status.qlrefExists).toBe(false);
      expect(result.status.hasTestCode).toBe(false);
      expect(result.status.expectedResultsExist).toBe(false);
      expect(result.allFilesExist).toBe(false);
      expect(result.missingFiles.length).toBeGreaterThan(0);

      // Verify suggested paths
      expect(result.files.query.doc).toBe('MissingQuery.md');
      expect(result.files.query.spec).toBe('MissingQuery.qspec');
    });

    it('should prefer .md over .qhelp for documentation', async () => {
      const srcDir = path.join(testDir, 'java', 'src', 'DocQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'DocQuery.ql');
      const mdFile = path.join(srcDir, 'DocQuery.md');
      const qhelpFile = path.join(srcDir, 'DocQuery.qhelp');

      fs.writeFileSync(queryFile, 'import java\nselect 1');
      fs.writeFileSync(mdFile, '# DocQuery');
      fs.writeFileSync(qhelpFile, '<qhelp>DocQuery</qhelp>');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.documentationExists).toBe(true);
      expect(result.files.query.doc).toBe('DocQuery.md');
    });

    it('should use .qhelp when .md does not exist', async () => {
      const srcDir = path.join(testDir, 'cpp', 'src', 'HelpQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'HelpQuery.ql');
      const qhelpFile = path.join(srcDir, 'HelpQuery.qhelp');

      fs.writeFileSync(queryFile, 'import cpp\nselect 1');
      fs.writeFileSync(qhelpFile, '<qhelp>HelpQuery</qhelp>');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.documentationExists).toBe(true);
      expect(result.files.query.doc).toBe('HelpQuery.qhelp');
    });

    it('should infer language from directory structure', async () => {
      const srcDir = path.join(testDir, 'go', 'tools', 'src', 'GoQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'GoQuery.ql');
      fs.writeFileSync(queryFile, 'import go\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.language).toBe('go');
    });

    it('should find multiple test code files', async () => {
      const srcDir = path.join(testDir, 'javascript', 'src', 'MultiTest');
      const testDirPath = path.join(testDir, 'javascript', 'test', 'MultiTest');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      const queryFile = path.join(srcDir, 'MultiTest.ql');
      fs.writeFileSync(queryFile, 'import javascript\nselect 1');

      // Create multiple test files
      fs.writeFileSync(path.join(testDirPath, 'MultiTest.js'), '// main test');
      fs.writeFileSync(path.join(testDirPath, 'test1.js'), '// test 1');
      fs.writeFileSync(path.join(testDirPath, 'test2.js'), '// test 2');
      fs.writeFileSync(path.join(testDirPath, 'MultiTest.qlref'), 'MultiTest/MultiTest.ql');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.files.test.testCode).toHaveLength(3);
      expect(result.files.test.testCode.some(p => p.endsWith('MultiTest.js'))).toBe(true);
      expect(result.files.test.testCode.some(p => p.endsWith('test1.js'))).toBe(true);
      expect(result.files.test.testCode.some(p => p.endsWith('test2.js'))).toBe(true);
    });

    it('should detect .testproj directory when it exists', async () => {
      const srcDir = path.join(testDir, 'java', 'src', 'DbQuery');
      const testDirPath = path.join(testDir, 'java', 'test', 'DbQuery');
      const testprojDir = path.join(testDirPath, 'DbQuery.testproj');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testprojDir, { recursive: true });

      const queryFile = path.join(srcDir, 'DbQuery.ql');
      fs.writeFileSync(queryFile, 'import java\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.testDatabaseDirExists).toBe(true);
      expect(result.files.test.testDatabaseDir).toBe(testprojDir);
    });

    it('should detect .actual file when it exists', async () => {
      const srcDir = path.join(testDir, 'python', 'src', 'ActualQuery');
      const testDirPath = path.join(testDir, 'python', 'test', 'ActualQuery');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      const queryFile = path.join(srcDir, 'ActualQuery.ql');
      const actualFile = path.join(testDirPath, 'ActualQuery.actual');

      fs.writeFileSync(queryFile, 'import python\nselect 1');
      fs.writeFileSync(actualFile, 'actual results');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.actualResultsExist).toBe(true);
      expect(result.files.test.actual).toBe('ActualQuery.actual');
    });

    it('should handle query files not in expected directory structure', async () => {
      const customDir = path.join(testDir, 'custom', 'queries');
      fs.mkdirSync(customDir, { recursive: true });

      const queryFile = path.join(customDir, 'CustomQuery.ql');
      fs.writeFileSync(queryFile, 'import javascript\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, 'javascript', false);

      expect(result.queryName).toBe('CustomQuery');
      expect(result.language).toBe('javascript');
      expect(result.status.queryExists).toBe(true);
      // Test directory will be constructed but won't exist
      expect(result.status.testDirectoryExists).toBe(false);
      // Verify test directory path was constructed (should be a string, even if directory doesn't exist)
      expect(result.files.test.dir).not.toBeNull();
      expect(typeof result.files.test.dir).toBe('string');
    });

    it('should handle paths with nested src directories correctly', async () => {
      const srcDir = path.join(testDir, 'src-project', 'javascript', 'src', 'NestedQuery');
      fs.mkdirSync(srcDir, { recursive: true });

      const queryFile = path.join(srcDir, 'NestedQuery.ql');
      fs.writeFileSync(queryFile, 'import javascript\nselect 1');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.queryName).toBe('NestedQuery');
      // Test directory should replace the last 'src' with 'test'
      expect(result.files.test.dir).toContain('src-project');
      expect(result.files.test.dir).toContain(path.join('javascript', 'test', 'NestedQuery'));
      expect(result.files.test.dir).not.toContain(path.join('javascript', 'src', 'NestedQuery'));
    });

    it('should not include non-code files as test files', async () => {
      const srcDir = path.join(testDir, 'javascript', 'src', 'FilterTest');
      const testDirPath = path.join(testDir, 'javascript', 'test', 'FilterTest');

      fs.mkdirSync(srcDir, { recursive: true });
      fs.mkdirSync(testDirPath, { recursive: true });

      const queryFile = path.join(srcDir, 'FilterTest.ql');
      fs.writeFileSync(queryFile, 'import javascript\nselect 1');

      // Create various files
      fs.writeFileSync(path.join(testDirPath, 'FilterTest.js'), '// test');
      fs.writeFileSync(path.join(testDirPath, 'FilterTest.qlref'), 'ref');
      fs.writeFileSync(path.join(testDirPath, 'FilterTest.expected'), 'expected');
      fs.writeFileSync(path.join(testDirPath, 'FilterTest.actual'), 'actual');
      fs.writeFileSync(path.join(testDirPath, 'README.txt'), 'readme');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      // Should only include .js file, not .qlref, .expected, .actual, or .txt files
      expect(result.files.test.testCode).toHaveLength(1);
      expect(result.files.test.testCode[0]).toContain('FilterTest.js');
    });

    it('should handle non-existent query file', async () => {
      const queryFile = path.join(testDir, 'nonexistent', 'Query.ql');

      const result = await findCodeQLQueryFiles(queryFile, undefined, false);

      expect(result.status.queryExists).toBe(false);
      expect(result.queryName).toBe('Query');
      expect(result.allFilesExist).toBe(false);
    });

    it('should work with different language extensions', async () => {
      const languages = [
        { lang: 'actions', ext: 'yml' },
        { lang: 'cpp', ext: 'cpp' },
        { lang: 'csharp', ext: 'cs' },
        { lang: 'go', ext: 'go' },
        { lang: 'java', ext: 'java' },
        { lang: 'python', ext: 'py' },
        { lang: 'ruby', ext: 'rb' }
      ];

      for (const { lang, ext } of languages) {
        const srcDir = path.join(testDir, lang, 'src', 'LangQuery');
        const testDirPath = path.join(testDir, lang, 'test', 'LangQuery');

        fs.mkdirSync(srcDir, { recursive: true });
        fs.mkdirSync(testDirPath, { recursive: true });

        const queryFile = path.join(srcDir, 'LangQuery.ql');
        const testCodeFile = path.join(testDirPath, `LangQuery.${ext}`);

        fs.writeFileSync(queryFile, `import ${lang}\nselect 1`);
        fs.writeFileSync(testCodeFile, '// test');

        const result = await findCodeQLQueryFiles(queryFile, undefined, false);

        expect(result.language).toBe(lang);
        expect(result.files.test.testCode).toHaveLength(1);
        expect(result.files.test.testCode[0]).toContain(ext);
      }
    });
  });
});
