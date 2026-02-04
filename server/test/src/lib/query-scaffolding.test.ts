/**
 * Tests for query scaffolding utilities
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { createCodeQLQuery } from '../../../src/lib/query-scaffolding';

describe('createCodeQLQuery', () => {
  const testBasePath = path.join(process.cwd(), '.test-query-scaffolding');
  
  beforeEach(() => {
    // Clean up test directory before each test
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });
  
  afterEach(() => {
    // Clean up test directory after each test
    if (fs.existsSync(testBasePath)) {
      fs.rmSync(testBasePath, { recursive: true, force: true });
    }
  });
  
  it('should create query structure with intermediate directories', () => {
    const result = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'TestQuery',
      language: 'javascript'
    });
    
    // Check that paths are correct
    expect(result.queryPath).toBe(path.join(testBasePath, 'src', 'TestQuery', 'TestQuery.ql'));
    expect(result.qlrefPath).toBe(path.join(testBasePath, 'test', 'TestQuery', 'TestQuery.qlref'));
    expect(result.testCodePath).toBe(path.join(testBasePath, 'test', 'TestQuery', 'TestQuery.js'));
    
    // Check that files were created
    expect(fs.existsSync(result.queryPath)).toBe(true);
    expect(fs.existsSync(result.qlrefPath)).toBe(true);
    expect(fs.existsSync(result.testCodePath)).toBe(true);
    
    // Check that directories have intermediate level
    expect(fs.existsSync(path.join(testBasePath, 'src', 'TestQuery'))).toBe(true);
    expect(fs.existsSync(path.join(testBasePath, 'test', 'TestQuery'))).toBe(true);
  });
  
  it('should create correct qlref file content', () => {
    const result = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'MyQuery',
      language: 'python'
    });
    
    const qlrefContent = fs.readFileSync(result.qlrefPath, 'utf8');
    expect(qlrefContent).toBe('MyQuery/MyQuery.ql\n');
  });
  
  it('should create query file with correct metadata', () => {
    const result = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'SecurityQuery',
      language: 'java',
      description: 'Test security query',
      queryId: 'java/security/test-query'
    });
    
    const queryContent = fs.readFileSync(result.queryPath, 'utf8');
    expect(queryContent).toContain('@id java/security/test-query');
    expect(queryContent).toContain('@name SecurityQuery');
    expect(queryContent).toContain('@description Test security query');
    expect(queryContent).toContain('import java');
  });
  
  it('should use correct file extension for different languages', () => {
    const languages = [
      { lang: 'javascript', ext: 'js' },
      { lang: 'python', ext: 'py' },
      { lang: 'java', ext: 'java' },
      { lang: 'csharp', ext: 'cs' },
      { lang: 'go', ext: 'go' }
    ];
    
    languages.forEach(({ lang, ext }) => {
      const queryBasePath = path.join(testBasePath, lang);
      const result = createCodeQLQuery({
        basePath: queryBasePath,
        queryName: 'TestQuery',
        language: lang
      });
      
      expect(result.testCodePath).toContain(`.${ext}`);
    });
  });
  
  it('should not overwrite existing files', () => {
    // Create first time
    const result1 = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'ExistingQuery',
      language: 'javascript'
    });
    
    // Modify query file
    fs.writeFileSync(result1.queryPath, 'modified content', 'utf8');
    
    // Try to create again
    const result2 = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'ExistingQuery',
      language: 'javascript'
    });
    
    // Files created list should be empty (no new files created)
    expect(result2.filesCreated.length).toBe(0);
    
    // Original content should be preserved
    const content = fs.readFileSync(result1.queryPath, 'utf8');
    expect(content).toBe('modified content');
  });
  
  it('should report all created files', () => {
    const result = createCodeQLQuery({
      basePath: testBasePath,
      queryName: 'NewQuery',
      language: 'javascript'
    });
    
    expect(result.filesCreated).toHaveLength(3);
    expect(result.filesCreated).toContain(result.queryPath);
    expect(result.filesCreated).toContain(result.qlrefPath);
    expect(result.filesCreated).toContain(result.testCodePath);
  });
});
