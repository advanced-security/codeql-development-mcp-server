#!/bin/bash
set -e

WORKSHOP_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Building test databases for SAP UI5 XSS workshop..."

# Build solution test databases
for exercise_dir in "${WORKSHOP_ROOT}"/solutions-tests/Exercise*/; do
    exercise_name="$(basename "$exercise_dir")"
    DB_PATH="${exercise_dir}/${exercise_name}.testproj"

    echo "  Creating database: ${exercise_name} (solutions)"
    rm -rf "${DB_PATH}"

    codeql test extract --search-path="${WORKSHOP_ROOT}/solutions" "$exercise_dir"
done

# Build exercise test databases
for exercise_dir in "${WORKSHOP_ROOT}"/exercises-tests/Exercise*/; do
    exercise_name="$(basename "$exercise_dir")"
    DB_PATH="${exercise_dir}/${exercise_name}.testproj"

    echo "  Creating database: ${exercise_name} (exercises)"
    rm -rf "${DB_PATH}"

    codeql test extract --search-path="${WORKSHOP_ROOT}/exercises" "$exercise_dir"
done

echo "Database creation complete!"
echo ""
echo "To run tests:"
echo "  codeql test run solutions-tests    # Validate solutions"
echo "  codeql test run exercises-tests    # Test your exercises"
