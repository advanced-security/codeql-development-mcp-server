/**
 * Parameter normalization utilities for CLI tool schemas.
 *
 * Provides camelCase → kebab-case key normalization and
 * "did you mean?" suggestions for unrecognized property names.
 */

import { z } from 'zod';

// ─── String-case conversion helpers ──────────────────────────────────────────

/**
 * Convert a camelCase string to kebab-case.
 * Example: "sourceRoot" → "source-root"
 */
export function camelToKebabCase(key: string): string {
  return key.replace(/[A-Z]/g, (ch) => '-' + ch.toLowerCase());
}

/**
 * Convert a kebab-case string to camelCase.
 * Example: "source-root" → "sourceRoot"
 */
export function kebabToCamelCase(key: string): string {
  return key.replace(/-([a-z])/g, (_match, ch: string) => ch.toUpperCase());
}

// ─── Suggestion logic ────────────────────────────────────────────────────────

/**
 * Given an unrecognized property name and the set of known schema keys,
 * return the most likely intended key (or `undefined` if no close match).
 *
 * Resolution order:
 *  1. camelCase → kebab-case  (e.g. "sourceRoot" → "source-root")
 *  2. snake_case → kebab-case (e.g. "source_root" → "source-root")
 *  3. kebab-case → camelCase  (e.g. "source-root" → "sourceRoot")
 */
export function suggestPropertyName(
  key: string,
  knownKeys: ReadonlySet<string>,
): string | undefined {
  // 1. camelCase → kebab-case
  const kebab = camelToKebabCase(key);
  if (kebab !== key && knownKeys.has(kebab)) return kebab;

  // 2. snake_case → kebab-case
  const snakeToKebab = key.replace(/_/g, '-');
  if (snakeToKebab !== key && knownKeys.has(snakeToKebab)) return snakeToKebab;

  // 3. kebab-case → camelCase
  const camel = kebabToCamelCase(key);
  if (camel !== key && knownKeys.has(camel)) return camel;

  return undefined;
}

// ─── Schema builder ──────────────────────────────────────────────────────────

/**
 * Build an enhanced Zod schema from a raw tool input shape.
 *
 * The returned schema:
 *  - Accepts additional (unknown) properties without client-side rejection
 *    (`passthrough` mode → JSON Schema `additionalProperties: true`).
 *  - Normalizes camelCase / snake_case keys to their kebab-case equivalents
 *    when a matching schema key exists.
 *  - Rejects truly unknown properties with a helpful error that names the
 *    unrecognized key and, when possible, suggests the correct name.
 */
export function buildEnhancedToolSchema(
  shape: Record<string, z.ZodTypeAny>,
): z.ZodTypeAny {
  const knownKeys = new Set(Object.keys(shape));

  return z
    .object(shape)
    .passthrough()
    .transform((data, ctx) => {
      const normalized: Record<string, unknown> = {};
      const unknownEntries: Array<{ key: string; hint?: string; isDuplicate: boolean }> = [];

      for (const [key, value] of Object.entries(data)) {
        if (knownKeys.has(key)) {
          // Known key — keep as-is
          normalized[key] = value;
        } else {
          // Try to find a kebab-case equivalent
          const suggestion = suggestPropertyName(key, knownKeys);
          if (suggestion && !(suggestion in data) && !(suggestion in normalized)) {
            // Silently normalize to the canonical kebab-case key
            normalized[suggestion] = value;
          } else {
            // Either no suggestion (truly unknown) or the canonical key is
            // already present.  Capture the suggestion so the error message
            // can include a helpful hint.
            const isDuplicate = !!suggestion && (suggestion in data || suggestion in normalized);
            unknownEntries.push({ key, hint: suggestion, isDuplicate });
          }
        }
      }

      // Report unknown / duplicate properties with actionable messages
      for (const { key, hint, isDuplicate } of unknownEntries) {
        const message = isDuplicate && hint
          ? `duplicate property: both '${key}' and its canonical form '${hint}' were provided; use only '${hint}'`
          : hint
            ? `unknown property '${key}' — did you mean '${hint}'?`
            : `unknown property '${key}'`;
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message,
          path: [key],
        });
      }

      if (unknownEntries.length > 0) {
        return z.NEVER;
      }

      return normalized;
    });
}
