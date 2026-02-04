import { z } from 'zod';

/**
 * SARIF (Static Analysis Results Interchange Format) types
 * Based on SARIF v2.1.0 specification used by GitHub Code Scanning
 */

/**
 * SARIF location schema
 */
export const SarifLocationSchema = z.object({
  physicalLocation: z
    .object({
      artifactLocation: z
        .object({
          uri: z.string(),
          uriBaseId: z.string().optional(),
        })
        .optional(),
      region: z
        .object({
          startLine: z.number().optional(),
          startColumn: z.number().optional(),
          endLine: z.number().optional(),
          endColumn: z.number().optional(),
          snippet: z
            .object({
              text: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
      contextRegion: z
        .object({
          startLine: z.number().optional(),
          startColumn: z.number().optional(),
          endLine: z.number().optional(),
          endColumn: z.number().optional(),
          snippet: z
            .object({
              text: z.string().optional(),
            })
            .optional(),
        })
        .optional(),
    })
    .optional(),
  message: z
    .object({
      text: z.string().optional(),
    })
    .optional(),
});

export type SarifLocation = z.infer<typeof SarifLocationSchema>;

/**
 * SARIF result schema
 */
export const SarifResultSchema = z.object({
  ruleId: z.string(),
  ruleIndex: z.number().optional(),
  message: z.object({
    text: z.string(),
  }),
  level: z.enum(['none', 'note', 'warning', 'error']).optional(),
  locations: z.array(SarifLocationSchema).optional(),
  relatedLocations: z.array(SarifLocationSchema).optional(),
  codeFlows: z.array(z.any()).optional(),
  partialFingerprints: z.record(z.string()).optional(),
  properties: z.record(z.any()).optional(),
});

export type SarifResult = z.infer<typeof SarifResultSchema>;

/**
 * SARIF rule schema
 */
export const SarifRuleSchema = z.object({
  id: z.string(),
  name: z.string().optional(),
  shortDescription: z
    .object({
      text: z.string(),
    })
    .optional(),
  fullDescription: z
    .object({
      text: z.string(),
    })
    .optional(),
  help: z
    .object({
      text: z.string().optional(),
      markdown: z.string().optional(),
    })
    .optional(),
  properties: z.record(z.any()).optional(),
});

export type SarifRule = z.infer<typeof SarifRuleSchema>;

/**
 * SARIF run schema
 */
export const SarifRunSchema = z.object({
  tool: z.object({
    driver: z.object({
      name: z.string(),
      version: z.string().optional(),
      informationUri: z.string().optional(),
      rules: z.array(SarifRuleSchema).optional(),
    }),
  }),
  results: z.array(SarifResultSchema).optional(),
  properties: z.record(z.any()).optional(),
});

export type SarifRun = z.infer<typeof SarifRunSchema>;

/**
 * SARIF document schema
 */
export const SarifDocumentSchema = z.object({
  version: z.string(),
  $schema: z.string().optional(),
  runs: z.array(SarifRunSchema),
});

export type SarifDocument = z.infer<typeof SarifDocumentSchema>;

/**
 * Ranked SARIF result schema
 */
export const RankedSarifResultSchema = SarifResultSchema.extend({
  confidence: z.number().min(0).max(1).describe('Confidence score (0-1) for this ranking'),
  reasoning: z.string().describe('Explanation for why this result was ranked as TP or FP'),
  sourceFile: z.string().optional().describe('Original SARIF file containing this result'),
  resultIndex: z.number().optional().describe('Index of this result in the original SARIF file'),
});

export type RankedSarifResult = z.infer<typeof RankedSarifResultSchema>;

/**
 * Ranking result schema
 */
export const RankingResultSchema = z.object({
  queryId: z.string().describe('The CodeQL query ID that was analyzed'),
  queryPath: z.string().describe('Path to the query file'),
  totalResults: z.number().describe('Total number of results processed'),
  likelyFalsePositives: z
    .array(RankedSarifResultSchema)
    .describe('Top-N most likely false positives'),
  likelyTruePositives: z
    .array(RankedSarifResultSchema)
    .describe('Top-N most likely true positives'),
  metadata: z
    .object({
      queryName: z.string().optional(),
      queryDescription: z.string().optional(),
      hasCodeSnippets: z.boolean().describe('Whether SARIF files include code snippets'),
      sourceFiles: z.array(z.string()).describe('SARIF files that were analyzed'),
    })
    .optional(),
});

export type RankingResult = z.infer<typeof RankingResultSchema>;
