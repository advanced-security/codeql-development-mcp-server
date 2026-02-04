#!/usr/bin/env bash
set -euo pipefail

## Parse command line arguments
LANGUAGE=""

usage() {
	cat << EOF
Usage: $0 [OPTIONS]

Extract test databases for CodeQL queries associated with the MCP server.

OPTIONS:
    --language <lang>  Extract databases only for the specified language
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, swift
    -h, --help         Show this help message

By default, the script extracts databases for all supported languages.
EOF
}

while [[ $# -gt 0 ]]; do
	case $1 in
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

## Extract test databases for integration tests.
if [ -n "${LANGUAGE}" ]; then
	echo "Extracting test databases for language: ${LANGUAGE}"
	# Special handling for JavaScript which has both examples and tools
	if [ "${LANGUAGE}" = "javascript" ]; then
		extract_test_databases "server/ql/javascript/examples"
	fi
	if [ -d "server/ql/${LANGUAGE}/tools" ]; then
		extract_test_databases "server/ql/${LANGUAGE}/tools"
	fi
else
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
fi

echo "INFO: Test database extraction complete!"
