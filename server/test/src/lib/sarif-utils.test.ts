/**
 * Tests for sarif-utils — shared SARIF decomposition, visualization, and overlap analysis.
 */

import { describe, expect, it } from 'vitest';
import {
  computeLocationOverlap,
  decomposeSarifByRule,
  diffSarifRules,
  extractRuleFromSarif,
  findOverlappingAlerts,
  listSarifRules,
  sarifResultToMermaid,
  sarifRuleToMarkdown,
} from '../../../src/lib/sarif-utils';
import type { SarifDocument, SarifResult, SarifRule } from '../../../src/types/sarif';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

/** Minimal valid SARIF document with multiple rules and results. */
function createMultiRuleSarif(): SarifDocument {
  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: 'CodeQL',
          version: '2.20.4',
          rules: [
            {
              id: 'js/sql-injection',
              name: 'js/sql-injection',
              shortDescription: { text: 'SQL injection' },
              fullDescription: { text: 'User-controlled data in SQL query' },
              help: { text: 'SQL injection help', markdown: '# SQL Injection\n\nAvoid concatenating user input.' },
              properties: { tags: ['security'], kind: 'path-problem', precision: 'high', 'security-severity': '8.8' },
            },
            {
              id: 'js/xss',
              name: 'js/xss',
              shortDescription: { text: 'Cross-site scripting' },
              fullDescription: { text: 'User-controlled data in HTML output' },
              help: { text: 'XSS help', markdown: '# XSS\n\nSanitize output.' },
              properties: { tags: ['security'], kind: 'path-problem', precision: 'high', 'security-severity': '6.1' },
            },
            {
              id: 'js/missing-token-validation',
              name: 'js/missing-token-validation',
              shortDescription: { text: 'Missing token validation' },
              help: { text: 'Validate CSRF tokens', markdown: '# CSRF\n\nValidate tokens.' },
              properties: { tags: ['security'], kind: 'problem', precision: 'medium' },
            },
          ],
        },
        extensions: [
          { name: 'codeql/javascript-queries', version: '1.0.0' },
        ],
      },
      results: [
        {
          ruleId: 'js/sql-injection',
          ruleIndex: 0,
          message: { text: 'SQL injection from [user input](1).' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/db.js', uriBaseId: '%SRCROOT%' },
              region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
            },
          }],
          relatedLocations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/handler.js' },
              region: { startLine: 10, startColumn: 12, endColumn: 25 },
            },
            message: { text: 'user input' },
          }],
          codeFlows: [{
            threadFlows: [{
              locations: [
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/handler.js' },
                      region: { startLine: 10, startColumn: 12, endColumn: 25 },
                    },
                    message: { text: 'req.query.id' },
                  },
                },
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/handler.js' },
                      region: { startLine: 15, startColumn: 5, endColumn: 20 },
                    },
                    message: { text: 'userId' },
                  },
                },
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/db.js' },
                      region: { startLine: 42, startColumn: 5, endColumn: 38 },
                    },
                    message: { text: 'query(...)' },
                  },
                },
              ],
            }],
          }],
          partialFingerprints: { primaryLocationLineHash: 'abc123' },
        },
        {
          ruleId: 'js/sql-injection',
          ruleIndex: 0,
          message: { text: 'SQL injection from [body param](1).' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/db.js' },
              region: { startLine: 55, startColumn: 5, endLine: 55, endColumn: 42 },
            },
          }],
          codeFlows: [{
            threadFlows: [{
              locations: [
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/api.js' },
                      region: { startLine: 20, startColumn: 8, endColumn: 22 },
                    },
                    message: { text: 'req.body.name' },
                  },
                },
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/db.js' },
                      region: { startLine: 55, startColumn: 5, endColumn: 42 },
                    },
                    message: { text: 'execute(...)' },
                  },
                },
              ],
            }],
          }],
          partialFingerprints: { primaryLocationLineHash: 'def456' },
        },
        {
          ruleId: 'js/xss',
          ruleIndex: 1,
          message: { text: 'XSS vulnerability.' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/views.js' },
              region: { startLine: 30, startColumn: 10, endLine: 30, endColumn: 50 },
            },
          }],
          codeFlows: [{
            threadFlows: [{
              locations: [
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/handler.js' },
                      region: { startLine: 10, startColumn: 12, endColumn: 25 },
                    },
                    message: { text: 'req.query.name' },
                  },
                },
                {
                  location: {
                    physicalLocation: {
                      artifactLocation: { uri: 'src/views.js' },
                      region: { startLine: 30, startColumn: 10, endColumn: 50 },
                    },
                    message: { text: 'render(...)' },
                  },
                },
              ],
            }],
          }],
          partialFingerprints: { primaryLocationLineHash: 'ghi789' },
        },
        {
          ruleId: 'js/missing-token-validation',
          ruleIndex: 2,
          message: { text: 'Missing CSRF token validation.' },
          locations: [{
            physicalLocation: {
              artifactLocation: { uri: 'src/handler.js' },
              region: { startLine: 5, startColumn: 1, endLine: 5, endColumn: 30 },
            },
          }],
          partialFingerprints: { primaryLocationLineHash: 'jkl012' },
        },
      ],
    }],
  };
}

/** Minimal SARIF with a single rule and single result. */
function createSingleRuleSarif(): SarifDocument {
  return {
    version: '2.1.0',
    runs: [{
      tool: {
        driver: {
          name: 'CodeQL',
          rules: [{
            id: 'js/test-query',
            shortDescription: { text: 'Test query' },
            help: { markdown: '# Test\n\nThis is a test query.' },
            properties: { kind: 'problem', precision: 'high', tags: ['test'] },
          }],
        },
      },
      results: [{
        ruleId: 'js/test-query',
        ruleIndex: 0,
        message: { text: 'Test finding.' },
        locations: [{
          physicalLocation: {
            artifactLocation: { uri: 'src/test.js' },
            region: { startLine: 1, startColumn: 1, endColumn: 10 },
          },
        }],
      }],
    }],
  };
}

// ---------------------------------------------------------------------------
// extractRuleFromSarif
// ---------------------------------------------------------------------------

describe('extractRuleFromSarif', () => {
  it('should extract results for a specific ruleId', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/sql-injection');

    expect(extracted.runs).toHaveLength(1);
    expect(extracted.runs[0].results).toHaveLength(2);
    expect(extracted.runs[0].results![0].ruleId).toBe('js/sql-injection');
    expect(extracted.runs[0].results![1].ruleId).toBe('js/sql-injection');
  });

  it('should include only the matching rule definition', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/sql-injection');

    expect(extracted.runs[0].tool.driver.rules).toHaveLength(1);
    expect(extracted.runs[0].tool.driver.rules![0].id).toBe('js/sql-injection');
  });

  it('should preserve codeFlows in extracted results', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/sql-injection');

    expect(extracted.runs[0].results![0].codeFlows).toBeDefined();
    expect(extracted.runs[0].results![0].codeFlows![0].threadFlows).toHaveLength(1);
  });

  it('should preserve relatedLocations in extracted results', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/sql-injection');

    expect(extracted.runs[0].results![0].relatedLocations).toHaveLength(1);
  });

  it('should preserve tool extensions', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/sql-injection');

    const extensions = extracted.runs[0].tool.extensions;
    expect(extensions).toBeDefined();
    expect(extensions).toHaveLength(1);
  });

  it('should preserve SARIF version and schema', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/xss');

    expect(extracted.version).toBe('2.1.0');
    expect(extracted.$schema).toBe('https://json.schemastore.org/sarif-2.1.0.json');
  });

  it('should return empty results for non-existent ruleId', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/nonexistent');

    expect(extracted.runs[0].results).toHaveLength(0);
    expect(extracted.runs[0].tool.driver.rules).toHaveLength(0);
  });

  it('should extract problem (non-path) results', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/missing-token-validation');

    expect(extracted.runs[0].results).toHaveLength(1);
    expect(extracted.runs[0].results![0].codeFlows).toBeUndefined();
  });

  it('should update ruleIndex to 0 for extracted results', () => {
    const sarif = createMultiRuleSarif();
    const extracted = extractRuleFromSarif(sarif, 'js/xss');

    // The xss rule was at index 1 in the original; should be 0 in extracted
    expect(extracted.runs[0].results![0].ruleIndex).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// decomposeSarifByRule
// ---------------------------------------------------------------------------

describe('decomposeSarifByRule', () => {
  it('should decompose SARIF into per-rule subsets', () => {
    const sarif = createMultiRuleSarif();
    const decomposed = decomposeSarifByRule(sarif);

    expect(decomposed.size).toBe(3);
    expect(decomposed.has('js/sql-injection')).toBe(true);
    expect(decomposed.has('js/xss')).toBe(true);
    expect(decomposed.has('js/missing-token-validation')).toBe(true);
  });

  it('should produce correct result counts per rule', () => {
    const sarif = createMultiRuleSarif();
    const decomposed = decomposeSarifByRule(sarif);

    expect(decomposed.get('js/sql-injection')!.runs[0].results).toHaveLength(2);
    expect(decomposed.get('js/xss')!.runs[0].results).toHaveLength(1);
    expect(decomposed.get('js/missing-token-validation')!.runs[0].results).toHaveLength(1);
  });

  it('should return a single entry for single-rule SARIF', () => {
    const sarif = createSingleRuleSarif();
    const decomposed = decomposeSarifByRule(sarif);

    expect(decomposed.size).toBe(1);
    expect(decomposed.has('js/test-query')).toBe(true);
  });

  it('should handle SARIF with no results', () => {
    const sarif: SarifDocument = {
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'CodeQL', rules: [] } },
        results: [],
      }],
    };
    const decomposed = decomposeSarifByRule(sarif);

    expect(decomposed.size).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// sarifResultToMermaid
// ---------------------------------------------------------------------------

describe('sarifResultToMermaid', () => {
  it('should generate a mermaid flowchart for a path-problem result', () => {
    const sarif = createMultiRuleSarif();
    const result = sarif.runs[0].results![0]; // sql-injection with 3-step path
    const rule = sarif.runs[0].tool.driver.rules![0];

    const mermaid = sarifResultToMermaid(result, rule);

    expect(mermaid).toContain('flowchart LR');
    expect(mermaid).toContain('req.query.id');
    expect(mermaid).toContain('handler.js:10');
    expect(mermaid).toContain('query(...)');
    expect(mermaid).toContain('db.js:42');
    // Source node should be green, sink node should be red
    expect(mermaid).toContain('fill:#d4edda');
    expect(mermaid).toContain('fill:#f8d7da');
  });

  it('should generate a mermaid diagram for a 2-step path', () => {
    const sarif = createMultiRuleSarif();
    const result = sarif.runs[0].results![1]; // sql-injection with 2-step path
    const rule = sarif.runs[0].tool.driver.rules![0];

    const mermaid = sarifResultToMermaid(result, rule);

    expect(mermaid).toContain('flowchart LR');
    expect(mermaid).toContain('req.body.name');
    expect(mermaid).toContain('execute(...)');
  });

  it('should return empty string for results without codeFlows', () => {
    const sarif = createMultiRuleSarif();
    const result = sarif.runs[0].results![3]; // missing-token-validation (no codeFlows)
    const rule = sarif.runs[0].tool.driver.rules![2];

    const mermaid = sarifResultToMermaid(result, rule);

    expect(mermaid).toBe('');
  });

  it('should escape quotes in node labels', () => {
    const result: SarifResult = {
      ruleId: 'test',
      message: { text: 'test' },
      codeFlows: [{
        threadFlows: [{
          locations: [
            {
              location: {
                physicalLocation: {
                  artifactLocation: { uri: 'test.js' },
                  region: { startLine: 1 },
                },
                message: { text: 'value with "quotes"' },
              },
            },
            {
              location: {
                physicalLocation: {
                  artifactLocation: { uri: 'test.js' },
                  region: { startLine: 2 },
                },
                message: { text: 'sink' },
              },
            },
          ],
        }],
      }],
    };
    const rule: SarifRule = { id: 'test', shortDescription: { text: 'test' } };

    const mermaid = sarifResultToMermaid(result, rule);
    // Raw double quotes should be escaped to #quot; inside labels
    expect(mermaid).toContain('#quot;');
    expect(mermaid).not.toContain('value with "quotes"');
  });

  it('should handle missing step messages gracefully', () => {
    const result: SarifResult = {
      ruleId: 'test',
      message: { text: 'test' },
      codeFlows: [{
        threadFlows: [{
          locations: [
            {
              location: {
                physicalLocation: {
                  artifactLocation: { uri: 'src/a.js' },
                  region: { startLine: 1 },
                },
                // no message
              },
            },
            {
              location: {
                physicalLocation: {
                  artifactLocation: { uri: 'src/b.js' },
                  region: { startLine: 5 },
                },
                message: { text: 'sink' },
              },
            },
          ],
        }],
      }],
    };
    const rule: SarifRule = { id: 'test', shortDescription: { text: 'test' } };

    const mermaid = sarifResultToMermaid(result, rule);

    expect(mermaid).toContain('flowchart LR');
    expect(mermaid).toContain('a.js:1');
    expect(mermaid).toContain('sink');
  });
});

// ---------------------------------------------------------------------------
// sarifRuleToMarkdown
// ---------------------------------------------------------------------------

describe('sarifRuleToMarkdown', () => {
  it('should generate markdown with rule summary', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/sql-injection');

    expect(markdown).toContain('js/sql-injection');
    expect(markdown).toContain('SQL injection');
    expect(markdown).toContain('path-problem');
  });

  it('should include query help markdown', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/sql-injection');

    expect(markdown).toContain('Avoid concatenating user input');
  });

  it('should include results table', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/sql-injection');

    expect(markdown).toContain('src/db.js');
    expect(markdown).toContain('42');
    expect(markdown).toContain('55');
  });

  it('should include mermaid diagrams for path-problem results', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/sql-injection');

    expect(markdown).toContain('```mermaid');
    expect(markdown).toContain('flowchart LR');
  });

  it('should not include mermaid diagrams for problem results', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/missing-token-validation');

    expect(markdown).not.toContain('```mermaid');
  });

  it('should return empty string for non-existent rule', () => {
    const sarif = createMultiRuleSarif();
    const markdown = sarifRuleToMarkdown(sarif, 'js/nonexistent');

    expect(markdown).toBe('');
  });
});

// ---------------------------------------------------------------------------
// computeLocationOverlap
// ---------------------------------------------------------------------------

describe('computeLocationOverlap', () => {
  it('should detect exact location match', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'sink');

    expect(overlap.overlaps).toBe(true);
    expect(overlap.sharedLocations).toHaveLength(1);
    expect(overlap.sharedLocations[0].uri).toBe('src/db.js');
    expect(overlap.sharedLocations[0].startLine).toBe(42);
  });

  it('should detect partial line range overlap', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 20, endLine: 42, endColumn: 50 },
        },
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'sink');

    expect(overlap.overlaps).toBe(true);
  });

  it('should normalize file:// URIs when comparing locations', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'file:///Users/dev/project/src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'sink');
    expect(overlap.overlaps).toBe(true);
  });

  it('should normalize %SRCROOT% URIs when comparing locations', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/handler.js', uriBaseId: '%SRCROOT%' },
          region: { startLine: 10, startColumn: 5, endColumn: 20 },
        },
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'file:///workspace/project/src/handler.js' },
          region: { startLine: 10, startColumn: 5, endColumn: 20 },
        },
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'sink');
    expect(overlap.overlaps).toBe(true);
  });

  it('should not detect overlap for different files', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/other.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'sink');

    expect(overlap.overlaps).toBe(false);
    expect(overlap.sharedLocations).toHaveLength(0);
  });

  it('should detect source overlap in path-problem results', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'sink.js' }, region: { startLine: 50 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10, startColumn: 5, endColumn: 20 } }, message: { text: 'source' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'sink.js' }, region: { startLine: 50 } }, message: { text: 'sink' } } },
          ],
        }],
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'other-sink.js' }, region: { startLine: 99 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10, startColumn: 5, endColumn: 20 } }, message: { text: 'source' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'other-sink.js' }, region: { startLine: 99 } }, message: { text: 'other sink' } } },
          ],
        }],
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'source');

    expect(overlap.overlaps).toBe(true);
    expect(overlap.sharedLocations[0].uri).toBe('src/handler.js');
    expect(overlap.sharedLocations[0].startLine).toBe(10);
  });

  it('should compute any-location overlap across all locations', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/a.js' }, region: { startLine: 1 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/shared.js' }, region: { startLine: 25, startColumn: 3, endColumn: 15 } }, message: { text: 'step' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/a.js' }, region: { startLine: 1 } }, message: { text: 'sink' } } },
          ],
        }],
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/b.js' }, region: { startLine: 99 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/shared.js' }, region: { startLine: 25, startColumn: 3, endColumn: 15 } }, message: { text: 'step' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/b.js' }, region: { startLine: 99 } }, message: { text: 'sink' } } },
          ],
        }],
      }],
    };

    // Sinks differ but a shared intermediate location exists
    const sinkOverlap = computeLocationOverlap(resultA, resultB, 'sink');
    expect(sinkOverlap.overlaps).toBe(false);

    const anyOverlap = computeLocationOverlap(resultA, resultB, 'any-location');
    expect(anyOverlap.overlaps).toBe(true);
  });

  it('should compute full-path similarity', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/util.js' }, region: { startLine: 20 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } } },
          ],
        }],
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/util.js' }, region: { startLine: 20 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } } },
          ],
        }],
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'full-path');

    expect(overlap.overlaps).toBe(true);
    expect(overlap.pathSimilarity).toBe(1.0);
  });

  it('should compute partial path similarity for divergent paths', () => {
    const resultA: SarifResult = {
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/middle-a.js' }, region: { startLine: 15 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } } },
          ],
        }],
      }],
    };
    const resultB: SarifResult = {
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'src/handler.js' }, region: { startLine: 10 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/middle-b.js' }, region: { startLine: 25 } } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'src/db.js' }, region: { startLine: 42 } } } },
          ],
        }],
      }],
    };

    const overlap = computeLocationOverlap(resultA, resultB, 'full-path');

    expect(overlap.overlaps).toBe(true);
    // 2 shared out of 4 unique = 0.5
    expect(overlap.pathSimilarity).toBeCloseTo(0.5, 1);
  });
});

// ---------------------------------------------------------------------------
// findOverlappingAlerts
// ---------------------------------------------------------------------------

describe('findOverlappingAlerts', () => {
  it('should find overlapping alerts between two rules', () => {
    const sarif = createMultiRuleSarif();
    const sqlResults = sarif.runs[0].results!.filter(r => r.ruleId === 'js/sql-injection');
    const sqlRule = sarif.runs[0].tool.driver.rules![0];

    // Create a result that overlaps with one of the SQL injection sinks
    const capResults: SarifResult[] = [{
      ruleId: 'js/cap-sql-injection',
      message: { text: 'CAP SQL injection' },
      locations: [{
        physicalLocation: {
          artifactLocation: { uri: 'src/db.js' },
          region: { startLine: 42, startColumn: 5, endLine: 42, endColumn: 38 },
        },
      }],
    }];
    const capRule: SarifRule = { id: 'js/cap-sql-injection', shortDescription: { text: 'CAP SQL injection' } };

    const overlaps = findOverlappingAlerts(sqlResults, sqlRule, capResults, capRule);

    expect(overlaps).toHaveLength(1);
    expect(overlaps[0].resultAIndex).toBe(0);
    expect(overlaps[0].resultBIndex).toBe(0);
    expect(overlaps[0].overlapDetails.overlaps).toBe(true);
  });

  it('should find no overlaps for disjoint results', () => {
    const sarif = createMultiRuleSarif();
    const sqlResults = sarif.runs[0].results!.filter(r => r.ruleId === 'js/sql-injection');
    const sqlRule = sarif.runs[0].tool.driver.rules![0];
    const xssResults = sarif.runs[0].results!.filter(r => r.ruleId === 'js/xss');
    const xssRule = sarif.runs[0].tool.driver.rules![1];

    const overlaps = findOverlappingAlerts(sqlResults, sqlRule, xssResults, xssRule);

    expect(overlaps).toHaveLength(0);
  });

  it('should use the specified overlap mode', () => {
    const resultA: SarifResult[] = [{
      ruleId: 'r1',
      message: { text: 'a' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'sink.js' }, region: { startLine: 1 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'source.js' }, region: { startLine: 10, startColumn: 1, endColumn: 20 } }, message: { text: 'source' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'sink.js' }, region: { startLine: 1 } }, message: { text: 'sink' } } },
          ],
        }],
      }],
    }];
    const resultB: SarifResult[] = [{
      ruleId: 'r2',
      message: { text: 'b' },
      locations: [{ physicalLocation: { artifactLocation: { uri: 'other-sink.js' }, region: { startLine: 99 } } }],
      codeFlows: [{
        threadFlows: [{
          locations: [
            { location: { physicalLocation: { artifactLocation: { uri: 'source.js' }, region: { startLine: 10, startColumn: 1, endColumn: 20 } }, message: { text: 'source' } } },
            { location: { physicalLocation: { artifactLocation: { uri: 'other-sink.js' }, region: { startLine: 99 } }, message: { text: 'other sink' } } },
          ],
        }],
      }],
    }];
    const ruleA: SarifRule = { id: 'r1' };
    const ruleB: SarifRule = { id: 'r2' };

    // Different sinks → no sink overlap
    const sinkOverlaps = findOverlappingAlerts(resultA, ruleA, resultB, ruleB, 'sink');
    expect(sinkOverlaps).toHaveLength(0);

    // Same source → source overlap
    const sourceOverlaps = findOverlappingAlerts(resultA, ruleA, resultB, ruleB, 'source');
    expect(sourceOverlaps).toHaveLength(1);
  });
});

// ---------------------------------------------------------------------------
// listSarifRules
// ---------------------------------------------------------------------------

describe('listSarifRules', () => {
  it('should list all rules with result counts', () => {
    const sarif = createMultiRuleSarif();
    const rules = listSarifRules(sarif);

    expect(rules).toHaveLength(3);
    expect(rules[0].ruleId).toBe('js/sql-injection');
    expect(rules[0].resultCount).toBe(2);
    expect(rules[1].ruleId).toBe('js/xss');
    expect(rules[1].resultCount).toBe(1);
    expect(rules[2].ruleId).toBe('js/missing-token-validation');
    expect(rules[2].resultCount).toBe(1);
  });

  it('should include rule metadata', () => {
    const sarif = createMultiRuleSarif();
    const rules = listSarifRules(sarif);

    const sqlRule = rules.find(r => r.ruleId === 'js/sql-injection')!;
    expect(sqlRule.name).toBe('SQL injection');
    expect(sqlRule.kind).toBe('path-problem');
    expect(sqlRule.precision).toBe('high');
    expect(sqlRule.severity).toBe('8.8');
  });

  it('should include tags', () => {
    const sarif = createMultiRuleSarif();
    const rules = listSarifRules(sarif);

    const sqlRule = rules.find(r => r.ruleId === 'js/sql-injection')!;
    expect(sqlRule.tags).toContain('security');
  });

  it('should return empty array for SARIF with no rules', () => {
    const sarif: SarifDocument = {
      version: '2.1.0',
      runs: [{
        tool: { driver: { name: 'CodeQL' } },
        results: [],
      }],
    };
    const rules = listSarifRules(sarif);
    expect(rules).toHaveLength(0);
  });

  it('should handle rules with no results', () => {
    const sarif: SarifDocument = {
      version: '2.1.0',
      runs: [{
        tool: {
          driver: {
            name: 'CodeQL',
            rules: [{ id: 'js/unused-rule', shortDescription: { text: 'Unused' } }],
          },
        },
        results: [],
      }],
    };
    const rules = listSarifRules(sarif);
    expect(rules).toHaveLength(1);
    expect(rules[0].ruleId).toBe('js/unused-rule');
    expect(rules[0].resultCount).toBe(0);
  });

  it('should include tool name and version', () => {
    const sarif = createMultiRuleSarif();
    const rules = listSarifRules(sarif);

    expect(rules[0].tool).toBe('CodeQL');
    expect(rules[0].toolVersion).toBe('2.20.4');
  });
});

// ---------------------------------------------------------------------------
// diffSarifRules
// ---------------------------------------------------------------------------

describe('diffSarifRules', () => {
  it('should detect identical results across two runs', () => {
    const sarifA = createMultiRuleSarif();
    const sarifB = createMultiRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.addedRules).toHaveLength(0);
    expect(diff.removedRules).toHaveLength(0);
    // All 3 rules should be unchanged
    expect(diff.changedRules).toHaveLength(0);
    expect(diff.unchangedRules).toHaveLength(3);
  });

  it('should detect added rules', () => {
    const sarifA = createSingleRuleSarif();
    const sarifB = createMultiRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.addedRules).toHaveLength(3);
    expect(diff.addedRules.map(r => r.ruleId).sort()).toEqual([
      'js/missing-token-validation',
      'js/sql-injection',
      'js/xss',
    ]);
    expect(diff.removedRules).toHaveLength(1);
    expect(diff.removedRules[0].ruleId).toBe('js/test-query');
  });

  it('should detect removed rules', () => {
    const sarifA = createMultiRuleSarif();
    const sarifB = createSingleRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.removedRules).toHaveLength(3);
    expect(diff.addedRules).toHaveLength(1);
    expect(diff.addedRules[0].ruleId).toBe('js/test-query');
  });

  it('should detect changed result counts for shared rules', () => {
    const sarifA = createMultiRuleSarif();
    // Create a version with different result count for sql-injection
    const sarifB = createMultiRuleSarif();
    // Remove one sql-injection result from B
    sarifB.runs[0].results = sarifB.runs[0].results!.filter(
      (r, i) => !(r.ruleId === 'js/sql-injection' && i === 1),
    );

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.changedRules).toHaveLength(1);
    expect(diff.changedRules[0].ruleId).toBe('js/sql-injection');
    expect(diff.changedRules[0].countA).toBe(2);
    expect(diff.changedRules[0].countB).toBe(1);
    expect(diff.changedRules[0].delta).toBe(-1);
  });

  it('should work with empty SARIF', () => {
    const sarifA: SarifDocument = {
      version: '2.1.0',
      runs: [{ tool: { driver: { name: 'CodeQL' } }, results: [] }],
    };
    const sarifB = createMultiRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.addedRules).toHaveLength(3);
    expect(diff.removedRules).toHaveLength(0);
    expect(diff.changedRules).toHaveLength(0);
  });

  it('should include summary counts', () => {
    const sarifA = createMultiRuleSarif();
    const sarifB = createMultiRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.summary.totalRulesA).toBe(3);
    expect(diff.summary.totalRulesB).toBe(3);
    expect(diff.summary.totalResultsA).toBe(4);
    expect(diff.summary.totalResultsB).toBe(4);
  });

  it('should report tool versions', () => {
    const sarifA = createMultiRuleSarif();
    const sarifB = createMultiRuleSarif();

    const diff = diffSarifRules(sarifA, sarifB);

    expect(diff.summary.toolA).toBe('CodeQL');
    expect(diff.summary.toolVersionA).toBe('2.20.4');
  });
});
