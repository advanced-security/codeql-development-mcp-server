/**
 * Shared extensible predicate declarations for MCP server tools queries.
 * Values are provided via dataExtensions YAML files during testing,
 * or via a temporary data extension pack at runtime from the MCP server.
 */

/** Holds for each source function name for call graph analysis. */
extensible predicate sourceFunction(string name);

/** Holds for each target function name for call graph analysis. */
extensible predicate targetFunction(string name);

/** Holds for each selected source file path for AST/CFG printing. */
extensible predicate selectedSourceFiles(string path);
