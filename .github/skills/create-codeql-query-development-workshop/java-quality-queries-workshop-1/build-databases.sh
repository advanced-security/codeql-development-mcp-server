#!/bin/bash
# Build script for Java Quality Queries Workshop 1
set -e

WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "=== Java Quality Queries Workshop 1 - Build Script ==="
echo ""
echo "Workshop directory: $WORKSHOP_ROOT"
echo ""

# Check we're in the right place
if [[ ! -f "${WORKSHOP_ROOT}/codeql-workspace.yml" ]]; then
    echo "Error: Must run from workshop root directory"
    exit 1
fi

# Install pack dependencies
echo "Installing pack dependencies..."
codeql pack install "${WORKSHOP_ROOT}/solutions"
codeql pack install "${WORKSHOP_ROOT}/solutions-tests"
codeql pack install "${WORKSHOP_ROOT}/exercises"
codeql pack install "${WORKSHOP_ROOT}/exercises-tests"

echo ""
echo "Build complete!"
echo ""
echo "To run tests:"
echo "  codeql test run ${WORKSHOP_ROOT}/solutions-tests"
echo "  codeql test run ${WORKSHOP_ROOT}/exercises-tests"

