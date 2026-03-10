#!/usr/bin/env bash
set -euo pipefail

## Parse command line arguments
LANGUAGE=""

usage() {
	cat << EOF
Usage: $0 [OPTIONS]

Install CodeQL packs for queries and query-tests associated with the MCP server.

OPTIONS:
    --language <lang>  Install packs only for the specified language
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, swift
    -h, --help         Show this help message

By default, the script installs packs for all supported languages.
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

## Define a helper to run a command with exponential-backoff retry.
## Usage: run_with_retry <max_attempts> <initial_delay_seconds> <command> [args...]
run_with_retry() {
	local _max_attempts="$1"
	local _delay="$2"
	shift 2
	local _attempt=1
	while true; do
		if "$@"; then
			return 0
		fi
		if [ "${_attempt}" -ge "${_max_attempts}" ]; then
			echo "ERROR: Command failed after ${_max_attempts} attempt(s): $*" >&2
			return 1
		fi
		echo "WARNING: Command failed (attempt ${_attempt}/${_max_attempts}). Retrying in ${_delay}s..." >&2
		sleep "${_delay}"
		_attempt=$((_attempt + 1))
		_delay=$((_delay * 2))
	done
}

## Define a function to install the src and test packs for a given parent directory.
install_packs() {
	local _parent_dir="$1"
	echo "INFO: Running 'codeql pack install' for '${_parent_dir}/src' directory..."
	run_with_retry 3 10 codeql pack install --no-strict-mode --additional-packs="${_parent_dir}" -- "${_parent_dir}/src"
	echo "INFO: Running 'codeql pack install' for '${_parent_dir}/test' directory..."
	run_with_retry 3 10 codeql pack install --no-strict-mode --additional-packs="${_parent_dir}" -- "${_parent_dir}/test"
}

## Install codeql packs needed for integration tests.
if [ -n "${LANGUAGE}" ]; then
	echo "Installing packs for language: ${LANGUAGE}"
	# Special handling for JavaScript which has both examples and tools
	if [ "${LANGUAGE}" = "javascript" ]; then
		install_packs "server/ql/javascript/examples"
	fi
	install_packs "server/ql/${LANGUAGE}/tools"
else
	echo "Installing packs for all languages..."
	install_packs "server/ql/actions/tools"
	install_packs "server/ql/cpp/tools"
	install_packs "server/ql/csharp/tools"
	install_packs "server/ql/go/tools"
	install_packs "server/ql/java/tools"
	install_packs "server/ql/javascript/examples"
	install_packs "server/ql/javascript/tools"
	install_packs "server/ql/python/tools"
	install_packs "server/ql/ruby/tools"
	install_packs "server/ql/swift/tools"
fi
