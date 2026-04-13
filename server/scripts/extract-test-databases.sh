#!/usr/bin/env bash
set -euo pipefail

## Parse command line arguments
LANGUAGE=""
SCOPE=""

usage() {
	cat << EOF
Usage: $0 [OPTIONS]

Extract test databases for CodeQL queries associated with the MCP server.

By default, only a minimal set of databases for client integration tests is
pre-extracted (currently: javascript/examples only). This is not an
exhaustive list of databases the integration test suite may use; additional
databases may be extracted on demand, so full extraction is rarely needed.

OPTIONS:
    --scope <scope>    Extract databases for a specific use case
                       Valid values:
                         integration  - Only databases needed by client integration tests (default)
                         all          - All test databases for all languages
    --language <lang>  Extract databases only for the specified language (implies --scope all)
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, rust, swift
    -h, --help         Show this help message
EOF
}

while [[ $# -gt 0 ]]; do
	case $1 in
		--language)
			LANGUAGE="$2"
			shift 2
			;;
		--scope)
			SCOPE="$2"
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

## Validate scope if provided
if [ -n "${SCOPE}" ]; then
	case "${SCOPE}" in
		integration|all) ;;
		*)
			echo "Error: Invalid scope '${SCOPE}'" >&2
			echo "Valid scopes: integration, all" >&2
			exit 1
			;;
	esac
fi

## Validate language if provided
VALID_LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "rust" "swift")
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

## Define a function to extract test databases for a given directory
extract_test_databases() {
	local _base_dir="$1"
	
	if [ ! -d "${_base_dir}/test" ]; then
		echo "INFO: No test directory found at ${_base_dir}/test, skipping..."
		return 0
	fi
	
	echo "INFO: Extracting test databases in '${_base_dir}/test' directory..."
	
	# Find all test directories (those containing .qlref files)
	while IFS= read -r -d '' test_dir; do
		test_dir_name=$(basename "${test_dir}")
		echo "INFO: Extracting test database for ${test_dir}..."
		
		# Check if .testproj already exists
		if [ -d "${test_dir}/${test_dir_name}.testproj" ]; then
			echo "INFO: Database already exists at ${test_dir}/${test_dir_name}.testproj, skipping extraction..."
		else
			# Extract the test database
			codeql test extract "${test_dir}" || {
				echo "WARNING: Failed to extract database for ${test_dir}, continuing..."
			}
		fi
	done < <(find "${_base_dir}/test" -mindepth 1 -maxdepth 1 -type d -print0)
}

## Extract test databases based on scope and language filters.
##
## Default (no flags): only databases needed by client integration tests
##   (javascript/examples + specific tools databases referenced by
##   integration test fixtures).
## --scope all: all languages × examples + tools.
## --language: filter to a single language (implies --scope all).

# --language implies --scope all for that language
if [ -n "${LANGUAGE}" ]; then
	echo "Extracting test databases for language: ${LANGUAGE}"
	# Special handling for JavaScript which has both examples and tools
	if [ "${LANGUAGE}" = "javascript" ]; then
		extract_test_databases "server/ql/javascript/examples"
	fi
	if [ -d "server/ql/${LANGUAGE}/tools" ]; then
		extract_test_databases "server/ql/${LANGUAGE}/tools"
	fi
elif [ "${SCOPE}" = "all" ]; then
	echo "Extracting test databases for all languages..."
	for lang in "${VALID_LANGUAGES[@]}"; do
		# Special handling for JavaScript which has both examples and tools
		if [ "${lang}" = "javascript" ]; then
			extract_test_databases "server/ql/javascript/examples"
		fi
		if [ -d "server/ql/${lang}/tools" ]; then
			extract_test_databases "server/ql/${lang}/tools"
		fi
	done
else
	echo "Extracting test databases for integration tests only..."
	# Extract javascript/examples for default codeql_query_run parameters
	extract_test_databases "server/ql/javascript/examples"
	# Extract only the specific tools/test databases referenced by client
	# integration test fixtures (client/integration-tests/**/test-config.json).
	# This is much faster than extracting all tools databases for all languages.
	INTEGRATION_TOOLS_DIRS=(
		"server/ql/cpp/tools/test/CallGraphFrom"
		"server/ql/cpp/tools/test/CallGraphFromTo"
		"server/ql/cpp/tools/test/CallGraphTo"
		"server/ql/javascript/tools/test/CallGraphFromTo"
		"server/ql/python/tools/test/CallGraphFromTo"
		"server/ql/rust/tools/test/CallGraphFrom"
		"server/ql/rust/tools/test/PrintAST"
	)
	for test_dir in "${INTEGRATION_TOOLS_DIRS[@]}"; do
		if [ ! -d "${test_dir}" ]; then
			echo "INFO: Directory ${test_dir} does not exist, skipping..."
			continue
		fi
		test_dir_name=$(basename "${test_dir}")
		if [ -d "${test_dir}/${test_dir_name}.testproj" ]; then
			echo "INFO: Database already exists at ${test_dir}/${test_dir_name}.testproj, skipping extraction..."
		else
			echo "INFO: Extracting test database for ${test_dir}..."
			codeql test extract "${test_dir}" || {
				echo "WARNING: Failed to extract database for ${test_dir}, continuing..."
			}
		fi
	done
fi

echo "INFO: Test database extraction complete!"
