#!/usr/bin/env bash
set -euo pipefail

## Parse command line arguments
FAIL_FAST=false
LANGUAGE=""

usage() {
	cat << EOF
Usage: $0 [OPTIONS]

Run CodeQL query unit tests for all language tools directories.

OPTIONS:
    --fail-fast        Exit immediately after the first test failure
    --language <lang>  Run tests only for the specified language
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, swift
    -h, --help         Show this help message

By default, the script runs all tests and reports failures at the end.
EOF
}

while [[ $# -gt 0 ]]; do
	case $1 in
		--fail-fast)
			FAIL_FAST=true
			shift
			;;
		--language)
			LANGUAGE="$2"
			shift 2
			;;
		-h|--help)
			usage
			exit 0
			;;
		*)
			echo "Error: Unknown option $1" >&2
			usage >&2
			exit 1
			;;
	esac
done

## Validate language if provided
VALID_LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "swift")
if [ -n "${LANGUAGE}" ]; then
	LANGUAGE_VALID=false
	for valid_lang in "${VALID_LANGUAGES[@]}"; do
		if [ "${LANGUAGE}" = "${valid_lang}" ]; then
			LANGUAGE_VALID=true
			break
		fi
	done
	
	if [ "${LANGUAGE_VALID}" = false ]; then
		echo "Error: Invalid language '${LANGUAGE}'" >&2
		echo "Valid languages: ${VALID_LANGUAGES[*]}" >&2
		exit 1
	fi
fi

## Get the directory of this script.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
## Get the root directory of the repository.
REPO_ROOT_DIR="$(cd "${SCRIPT_DIR}/../.." && pwd)"

## Explicitly set the cwd to the REPO_ROOT_DIR.
cd "${REPO_ROOT_DIR}"

## Define a function to run tests for a given tools directory.
run_tests() {
	local _tools_dir="$1"
	local _test_dir="${_tools_dir}/test"
	
	if [ -d "${_test_dir}" ]; then
		echo "INFO: Running 'codeql test run' for '${_test_dir}' directory..."
		
		# Capture the output and exit code
		# Explicitly set --failing-exitcode=1 to ensure we get proper exit codes
		local _output
		local _exit_code=0
		_output=$(codeql test run --format=text --failing-exitcode=1 --additional-packs="${_tools_dir}" -- "${_test_dir}" 2>&1) || _exit_code=$?
		
		# Print the output
		echo "${_output}"
		
		# Check for test failures in the output
		# Look for specific failure patterns in codeql test run output
		if [ ${_exit_code} -ne 0 ] || echo "${_output}" | grep -q "tests failed:" || echo "${_output}" | grep -q "FAILED("; then
			echo "ERROR: Tests failed for '${_test_dir}'"
			return 1
		else
			echo "SUCCESS: Tests completed for '${_test_dir}'"
			return 0
		fi
	else
		echo "WARN: Test directory '${_test_dir}' not found, skipping..."
		return 0
	fi
}

## Define a function to run tests with error handling
run_tests_with_error_handling() {
	local _tools_dir="$1"
	
	echo "=========================================="
	echo "Running tests for: ${_tools_dir}"
	echo "=========================================="
	
	if run_tests "${_tools_dir}"; then
		echo "✅ Tests passed for: ${_tools_dir}"
		return 0
	else
		echo "❌ Tests failed for: ${_tools_dir}"
		if [ "${FAIL_FAST}" = true ]; then
			echo "FAIL_FAST mode enabled - exiting immediately due to test failure"
			exit 1
		fi
		return 1
	fi
	echo ""
}

## Define a function to count .qlref files in a test directory
count_qlref_files() {
	local _test_dir="$1"
	if [ -d "${_test_dir}" ]; then
		find "${_test_dir}" -name "*.qlref" -type f | wc -l
	else
		echo 0
	fi
}

## Initialize tracking variables
FAILED_TESTS=()
TOTAL_TOOLS_DIRS=0
PASSED_TOOLS_DIRS=0
TOTAL_QLREF_FILES=0

## Run CodeQL query unit tests for all language tools directories.
echo "Starting unit tests for CodeQL queries in 'server/ql/*/tools/**'..."
if [ "${FAIL_FAST}" = true ]; then
	echo "FAIL_FAST mode enabled - will exit on first test failure"
else
	echo "Running all tests - will continue even if individual tests fail"
fi

if [ -n "${LANGUAGE}" ]; then
	echo "Running tests only for language: ${LANGUAGE}"
else
	echo "Running tests for all languages"
fi
echo "======================================"

# Outer loop: iterate through language subdirectories in server/ql/
for _language_dir in server/ql/*/; do
	_language_name=$(basename "${_language_dir}")
	
	# Skip if filtering by language and this isn't the target language
	if [ -n "${LANGUAGE}" ] && [ "${_language_name}" != "${LANGUAGE}" ]; then
		continue
	fi
	
	_tools_dir="${_language_dir}tools"
	
	# Skip if tools directory doesn't exist
	if [ ! -d "${_tools_dir}" ]; then
		echo "WARN: Tools directory '${_tools_dir}' not found for language '${_language_name}', skipping..."
		continue
	fi
	
	echo "Processing language: ${_language_name}"
	TOTAL_TOOLS_DIRS=$((TOTAL_TOOLS_DIRS + 1))
	
	# Count .qlref files for this tools directory
	_qlref_count=$(count_qlref_files "${_tools_dir}/test")
	TOTAL_QLREF_FILES=$((TOTAL_QLREF_FILES + _qlref_count))
	echo "Found ${_qlref_count} .qlref files in ${_tools_dir}/test"
	
	if run_tests_with_error_handling "${_tools_dir}"; then
		PASSED_TOOLS_DIRS=$((PASSED_TOOLS_DIRS + 1))
	else
		FAILED_TESTS+=("${_tools_dir}")
	fi
done

## Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total language tool directories: ${TOTAL_TOOLS_DIRS}"
echo "Passed: ${PASSED_TOOLS_DIRS}"
echo "Failed: $((TOTAL_TOOLS_DIRS - PASSED_TOOLS_DIRS))"
echo "Total .qlref test files found: ${TOTAL_QLREF_FILES}"

if [ ${#FAILED_TESTS[@]} -eq 0 ]; then
	echo "🎉 All CodeQL query unit tests passed!"
	exit 0
else
	echo "❌ Some tool directories failed testing:"
	for failed_test in "${FAILED_TESTS[@]}"; do
		echo "  - ${failed_test}"
	done
	exit 1
fi