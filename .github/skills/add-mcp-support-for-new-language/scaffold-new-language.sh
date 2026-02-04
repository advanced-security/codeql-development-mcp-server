#!/usr/bin/env bash
#
# scaffold-new-language.sh
#
# Creates the directory structure and boilerplate files for adding
# a new CodeQL language to the MCP server.
#
# Usage: ./scaffold-new-language.sh <language> <file-extension>
#
# Example: ./scaffold-new-language.sh rust rs
#
# This script creates:
#   - server/ql/{language}/tools/src/ with codeql-pack.yml and query stubs
#   - server/ql/{language}/tools/test/ with codeql-pack.yml and test stubs
#
# After running this script, you must:
#   1. Customize the query implementations for the language's CodeQL library
#   2. Write test source files (Example1.{ext})
#   3. Run tests to generate .expected files
#   4. Update TypeScript source, scripts, docs, and skills manually
#

set -euo pipefail

usage() {
    cat << EOF
Usage: $0 <language> <file-extension>

Arguments:
    language        The CodeQL language name (e.g., rust, kotlin)
    file-extension  The file extension for the language (e.g., rs, kt)

Example:
    $0 rust rs
    $0 kotlin kt

This script creates the directory structure and boilerplate files.
You must then customize the queries for the language's CodeQL library.
EOF
}

if [[ $# -lt 2 ]]; then
    usage
    exit 1
fi

LANGUAGE="$1"
EXT="$2"

# Get repository root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

TOOLS_DIR="${REPO_ROOT}/server/ql/${LANGUAGE}/tools"
SRC_DIR="${TOOLS_DIR}/src"
TEST_DIR="${TOOLS_DIR}/test"

echo "Creating directory structure for language: ${LANGUAGE} (extension: .${EXT})"

# Create directories
mkdir -p "${SRC_DIR}/PrintAST"
mkdir -p "${SRC_DIR}/PrintCFG"
mkdir -p "${SRC_DIR}/CallGraphFrom"
mkdir -p "${SRC_DIR}/CallGraphTo"
mkdir -p "${TEST_DIR}/PrintAST"
mkdir -p "${TEST_DIR}/PrintCFG"
mkdir -p "${TEST_DIR}/CallGraphFrom"
mkdir -p "${TEST_DIR}/CallGraphTo"

# Create source pack YAML
cat > "${SRC_DIR}/codeql-pack.yml" << EOF
name: ql-mcp-${LANGUAGE}-tools-src
version: 0.0.1
library: false
dependencies:
  codeql/${LANGUAGE}-all: '*'
EOF

# Create test pack YAML
cat > "${TEST_DIR}/codeql-pack.yml" << EOF
name: ql-mcp-${LANGUAGE}-tools-test
version: 0.0.1
dependencies:
  # Declare dependency to ensure queries are downloaded locally
  codeql/${LANGUAGE}-queries: '*'
  ql-mcp-${LANGUAGE}-tools-src: '*'
extractor: ${LANGUAGE}
EOF

# Create PrintAST.ql stub
cat > "${SRC_DIR}/PrintAST/PrintAST.ql" << 'QUERY_EOF'
/**
 * @name Print AST for LANGUAGE_PLACEHOLDER
 * @description Outputs a representation of the Abstract Syntax Tree for specified source files.
 * @id LANGUAGE_PLACEHOLDER/tools/print-ast
 * @kind graph
 * @tags ast
 */

// TODO: Update imports for the language's CodeQL library
// import LANGUAGE_PLACEHOLDER
// import {printast-module}  // e.g., semmle.code.java.PrintAst

/**
 * Gets the source files to generate AST from.
 */
external string selectedSourceFiles();

string getSelectedSourceFile() { result = selectedSourceFiles().splitAt(",").trim() }

File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      result.getRelativePath() = selectedFile
      or
      not selectedFile.matches("%/%") and result.getBaseName() = selectedFile
      or
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) = selectedFile
    )
  )
}

// TODO: Extend the appropriate PrintAstConfiguration class for this language
// class Cfg extends PrintAstConfiguration {
//   override predicate shouldPrint(Element e, Location l) {
//     super.shouldPrint(e, l) and
//     (
//       l.getFile() = getSelectedFile()
//       or
//       not exists(getSelectedFile()) and
//       l.getFile().getBaseName() = "Example1.EXT_PLACEHOLDER"
//     )
//   }
// }
QUERY_EOF

# Create PrintCFG.ql stub
cat > "${SRC_DIR}/PrintCFG/PrintCFG.ql" << 'QUERY_EOF'
/**
 * @name Print CFG for LANGUAGE_PLACEHOLDER
 * @description Produces a representation of a file's Control Flow Graph.
 * @id LANGUAGE_PLACEHOLDER/tools/print-cfg
 * @kind graph
 * @tags cfg
 */

// TODO: Update imports for the language's CodeQL library
// import LANGUAGE_PLACEHOLDER
// import {cfg-module}

external string selectedSourceFiles();

string getSelectedSourceFile() { result = selectedSourceFiles().splitAt(",").trim() }

File getSelectedFile() {
  exists(string selectedFile |
    selectedFile = getSelectedSourceFile() and
    (
      result.getRelativePath() = selectedFile
      or
      not selectedFile.matches("%/%") and result.getBaseName() = selectedFile
      or
      result.getAbsolutePath().suffix(result.getAbsolutePath().length() - selectedFile.length()) = selectedFile
    )
  )
}

// TODO: Update ControlFlowNode type for this language
predicate shouldPrintNode(ControlFlowNode node) {
  node.getLocation().getFile() = getSelectedFile()
  or
  not exists(getSelectedFile()) and
  node.getLocation().getFile().getBaseName() = "Example1.EXT_PLACEHOLDER"
}

query predicate nodes(ControlFlowNode node, string property, string value) {
  shouldPrintNode(node) and
  property = "semmle.label" and
  value = node.toString()
}

query predicate edges(ControlFlowNode pred, ControlFlowNode succ) {
  shouldPrintNode(pred) and shouldPrintNode(succ) and
  pred.getASuccessor() = succ
}
QUERY_EOF

# Create CallGraphFrom.ql stub
cat > "${SRC_DIR}/CallGraphFrom/CallGraphFrom.ql" << 'QUERY_EOF'
/**
 * @name Call Graph From for LANGUAGE_PLACEHOLDER
 * @description Displays calls made from a specified function.
 * @id LANGUAGE_PLACEHOLDER/tools/call-graph-from
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

// TODO: Update imports for the language's CodeQL library
// import LANGUAGE_PLACEHOLDER

external string sourceFunction();

string getSourceFunctionName() { result = sourceFunction().splitAt(",").trim() }

// TODO: Update Function type for this language
Function getSourceFunction() {
  exists(string selectedFunc |
    selectedFunc = getSourceFunctionName() and
    result.getName() = selectedFunc
  )
}

// TODO: Update CallExpr type and accessor methods for this language
string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call, Function source
where
  call.getEnclosingFunction() = source and
  (
    source = getSourceFunction()
    or
    not exists(getSourceFunction()) and
    source.getFile().getBaseName() = "Example1.EXT_PLACEHOLDER"
  )
select call, "Call from `" + source.getName() + "` to `" + getCalleeName(call) + "`"
QUERY_EOF

# Create CallGraphTo.ql stub
cat > "${SRC_DIR}/CallGraphTo/CallGraphTo.ql" << 'QUERY_EOF'
/**
 * @name Call Graph To for LANGUAGE_PLACEHOLDER
 * @description Displays calls made to a specified function.
 * @id LANGUAGE_PLACEHOLDER/tools/call-graph-to
 * @kind problem
 * @problem.severity recommendation
 * @tags call-graph
 */

// TODO: Update imports for the language's CodeQL library
// import LANGUAGE_PLACEHOLDER

external string targetFunction();

string getTargetFunctionName() { result = targetFunction().splitAt(",").trim() }

// TODO: Update CallExpr type and accessor methods for this language
string getCallerName(CallExpr call) {
  if exists(call.getEnclosingFunction())
  then result = call.getEnclosingFunction().getName()
  else result = "Top-level"
}

string getCalleeName(CallExpr call) {
  if exists(call.getStaticTarget())
  then result = call.getStaticTarget().getName()
  else result = call.toString()
}

from CallExpr call
where
  call.getStaticTarget().getName() = getTargetFunctionName()
  or
  not exists(getTargetFunctionName()) and
  call.getLocation().getFile().getBaseName() = "Example1.EXT_PLACEHOLDER"
select call, "Call to `" + getCalleeName(call) + "` from `" + getCallerName(call) + "`"
QUERY_EOF

# Replace placeholders in all query files
find "${SRC_DIR}" -name "*.ql" -exec sed -i '' \
    -e "s/LANGUAGE_PLACEHOLDER/${LANGUAGE}/g" \
    -e "s/EXT_PLACEHOLDER/${EXT}/g" {} \;

# Create qlref files for tests
echo "PrintAST/PrintAST.ql" > "${TEST_DIR}/PrintAST/PrintAST.qlref"
echo "PrintCFG/PrintCFG.ql" > "${TEST_DIR}/PrintCFG/PrintCFG.qlref"
echo "CallGraphFrom/CallGraphFrom.ql" > "${TEST_DIR}/CallGraphFrom/CallGraphFrom.qlref"
echo "CallGraphTo/CallGraphTo.ql" > "${TEST_DIR}/CallGraphTo/CallGraphTo.qlref"

# Create placeholder test source files
for dir in PrintAST PrintCFG CallGraphFrom CallGraphTo; do
    cat > "${TEST_DIR}/${dir}/Example1.${EXT}" << EOF
// TODO: Add test code for ${dir} query
// This file should contain representative ${LANGUAGE} code patterns
// that will be analyzed by the ${dir} query.
EOF
done

# Create placeholder .expected files
for dir in PrintAST PrintCFG CallGraphFrom CallGraphTo; do
    touch "${TEST_DIR}/${dir}/${dir}.expected"
done

echo ""
echo "✅ Created scaffold for '${LANGUAGE}' at: ${TOOLS_DIR}"
echo ""
echo "Next steps:"
echo "  1. Review and customize the query implementations in ${SRC_DIR}/"
echo "     - Update imports for the ${LANGUAGE} CodeQL library"
echo "     - Update type names (Function, CallExpr, ControlFlowNode, etc.)"
echo "     - Update accessor methods for the language's API"
echo ""
echo "  2. Write test source files:"
echo "     - ${TEST_DIR}/PrintAST/Example1.${EXT}"
echo "     - ${TEST_DIR}/PrintCFG/Example1.${EXT}"
echo "     - ${TEST_DIR}/CallGraphFrom/Example1.${EXT}"
echo "     - ${TEST_DIR}/CallGraphTo/Example1.${EXT}"
echo ""
echo "  3. Install packs and run tests:"
echo "     ./server/scripts/install-packs.sh --language ${LANGUAGE}"
echo "     ./server/scripts/run-query-unit-tests.sh --language ${LANGUAGE}"
echo ""
echo "  4. Accept test results to populate .expected files:"
echo "     codeql test accept ${TEST_DIR}/**"
echo ""
echo "  5. Follow the SKILL.md checklist to update:"
echo "     - TypeScript source files"
echo "     - Shell scripts"
echo "     - Documentation"
echo "     - Skills"
echo "     - CI/CD workflows"
echo ""
echo "See: .github/skills/add-mcp-support-for-new-language/SKILL.md"
