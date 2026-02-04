/**
 * Tests for workflow prompts context builders and schema validation
 */

import { describe, it, expect } from 'vitest';
import {
  buildToolsQueryContext,
  buildWorkshopContext,
  SUPPORTED_LANGUAGES,
  workshopCreationWorkflowSchema
} from '../../../src/prompts/workflow-prompts';

describe('Workflow Prompts', () => {
  describe('workshopCreationWorkflowSchema', () => {
    it('should accept valid parameters with number numStages', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'javascript',
        numStages: 5
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBe(5);
      }
    });

    it('should coerce string numStages to number (VSCode slash command input)', () => {
      // VSCode slash commands pass all arguments as strings
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'python',
        numStages: '6' // String input from VSCode
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBe(6);
        expect(typeof result.data.numStages).toBe('number');
      }
    });

    it('should accept optional numStages', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'java'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.numStages).toBeUndefined();
      }
    });

    it('should accept optional workshopName', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'go',
        workshopName: 'my-workshop'
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.workshopName).toBe('my-workshop');
      }
    });

    it('should reject invalid language', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql',
        language: 'invalid-language'
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing queryPath', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        language: 'javascript'
      });

      expect(result.success).toBe(false);
    });

    it('should reject missing language', () => {
      const result = workshopCreationWorkflowSchema.safeParse({
        queryPath: '/path/to/query.ql'
      });

      expect(result.success).toBe(false);
    });

    it('should support all SUPPORTED_LANGUAGES', () => {
      for (const lang of SUPPORTED_LANGUAGES) {
        const result = workshopCreationWorkflowSchema.safeParse({
          queryPath: '/path/to/query.ql',
          language: lang
        });

        expect(result.success).toBe(true);
      }
    });
  });

  describe('buildToolsQueryContext', () => {
    it('should build minimal context with required fields only', () => {
      const result = buildToolsQueryContext('javascript', '/path/to/db');

      expect(result).toContain('## Your Context');
      expect(result).toContain('**Language**: javascript');
      expect(result).toContain('**Database**: /path/to/db');
      expect(result).toContain('## Recommended Next Steps');
    });

    it('should include source files when provided', () => {
      const result = buildToolsQueryContext(
        'python',
        '/path/to/db',
        'main.py,utils.py'
      );

      expect(result).toContain('**Source Files**: main.py,utils.py');
      expect(result).toContain('PrintAST');
      expect(result).toContain('sourceFiles="main.py,utils.py"');
    });

    it('should include source function when provided', () => {
      const result = buildToolsQueryContext(
        'java',
        '/path/to/db',
        undefined,
        'processData'
      );

      expect(result).toContain('**Source Function**: processData');
      expect(result).toContain('PrintCFG');
      expect(result).toContain('CallGraphFrom');
      expect(result).toContain('sourceFunction="processData"');
    });

    it('should include target function when provided', () => {
      const result = buildToolsQueryContext(
        'go',
        '/path/to/db',
        undefined,
        undefined,
        'validate'
      );

      expect(result).toContain('**Target Function**: validate');
      expect(result).toContain('CallGraphTo');
      expect(result).toContain('targetFunction="validate"');
    });

    it('should include all optional parameters when provided', () => {
      const result = buildToolsQueryContext(
        'cpp',
        '/path/to/db',
        'main.cpp',
        'init',
        'cleanup'
      );

      expect(result).toContain('**Source Files**: main.cpp');
      expect(result).toContain('**Source Function**: init');
      expect(result).toContain('**Target Function**: cleanup');
    });

    it('should provide generic guidance when optional parameters not provided', () => {
      const result = buildToolsQueryContext('ruby', '/path/to/db');

      expect(result).toContain('Identify source files to analyze');
      expect(result).toContain('Identify key functions for CFG');
      expect(result).toContain('Identify target functions');
    });
  });

  describe('buildWorkshopContext', () => {
    it('should build context with required fields', () => {
      const result = buildWorkshopContext(
        'path/to/MyQuery.ql',
        'javascript',
        'my-workshop'
      );

      expect(result).toContain('## Your Workshop Context');
      expect(result).toContain('**Target Query**: path/to/MyQuery.ql');
      expect(result).toContain('**Language**: javascript');
      expect(result).toContain('**Workshop Name**: my-workshop');
    });

    it('should show auto-detect suggestion when numStages not provided', () => {
      const result = buildWorkshopContext(
        'query.ql',
        'python',
        'python-workshop'
      );

      expect(result).toContain(
        '**Suggested Stages**: 4-8 (auto-detect based on query complexity)'
      );
    });

    it('should show specific stage count when numStages provided', () => {
      const result = buildWorkshopContext(
        'query.ql',
        'java',
        'java-workshop',
        6
      );

      expect(result).toContain('**Suggested Stages**: 6');
    });

    it('should include immediate actions guidance', () => {
      const result = buildWorkshopContext(
        'path/to/MyQuery.ql',
        'go',
        'go-workshop'
      );

      expect(result).toContain('## Immediate Actions');
      expect(result).toContain('find_codeql_query_files');
      expect(result).toContain('explain_codeql_query');
      expect(result).toContain('codeql_test_run');
    });

    it('should include query path in find command', () => {
      const result = buildWorkshopContext(
        'experimental/Security/MyQuery.ql',
        'csharp',
        'csharp-workshop'
      );

      expect(result).toContain(
        'queryPath="experimental/Security/MyQuery.ql"'
      );
    });
  });
});
