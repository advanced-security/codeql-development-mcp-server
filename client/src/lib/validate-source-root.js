/**
 * Validate Source Root
 * Validates SOURCE_ROOT environment variable and directory structure
 */

import { existsSync } from "fs";
import { join } from "path";

/**
 * Validate SOURCE_ROOT directory structure
 * @param {Object} options - Validation options
 * @param {string} options.sourceRoot - Path to source root directory
 * @returns {Object} Validation result
 */
export function validateSourceRoot(options = {}) {
  const { sourceRoot } = options;

  if (!sourceRoot) {
    return {
      valid: false,
      error: "SOURCE_ROOT is not set"
    };
  }

  if (!existsSync(sourceRoot)) {
    return {
      valid: false,
      error: `SOURCE_ROOT directory does not exist: ${sourceRoot}`
    };
  }

  // Check for codeql-workspace.yml or codeql-workspace.yaml
  const workspaceYml = join(sourceRoot, "codeql-workspace.yml");
  const workspaceYaml = join(sourceRoot, "codeql-workspace.yaml");

  if (!existsSync(workspaceYml) && !existsSync(workspaceYaml)) {
    return {
      valid: false,
      error: `No codeql-workspace.yml or codeql-workspace.yaml found in ${sourceRoot}`
    };
  }

  return {
    valid: true,
    source_root: sourceRoot
  };
}
