#!/bin/bash
set -e

WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building test databases for null pointer workshop..."
echo ""
echo "Note: CodeQL test framework automatically creates test databases"
echo "when you run 'codeql test run'. This script is provided for reference."
echo ""
echo "To run tests:"
echo "  codeql test run exercises-tests/"
echo "  codeql test run solutions-tests/"
echo ""
echo "Test databases will be created automatically in:"
echo "  exercises-tests/Exercise1/Exercise1.testproj/"
echo "  exercises-tests/Exercise2/Exercise2.testproj/"
echo "  exercises-tests/Exercise3/Exercise3.testproj/"
echo "  solutions-tests/Exercise1/Exercise1.testproj/"
echo "  solutions-tests/Exercise2/Exercise2.testproj/"
echo "  solutions-tests/Exercise3/Exercise3.testproj/"

