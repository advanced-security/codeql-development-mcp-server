#!/usr/bin/env bash
set -euo pipefail

## upgrade-packs.sh
## Upgrade CodeQL pack dependencies for packs in the codeql-development-mcp-server
## repository. Unlike install-packs.sh (which honours existing lock files), this
## script runs `codeql pack upgrade` to regenerate lock files with the latest
## compatible dependency versions. This is necessary when the CodeQL CLI version
## changes and existing lock files may reference incompatible pack versions.
##
## Usage:
##   ./server/scripts/upgrade-packs.sh
##   ./server/scripts/upgrade-packs.sh --language javascript

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

LANGUAGE=""

usage() {
	cat <<EOF
Usage: $0 [OPTIONS]

Upgrade CodeQL pack dependencies for all packs in the repository.
Regenerates codeql-pack.lock.yml files with the latest compatible versions.

OPTIONS:
    --language <lang>  Upgrade packs only for the specified language
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, swift
    -h, --help         Show this help message

By default, the script upgrades packs for all supported languages.
EOF
}

while [[ $# -gt 0 ]]; do
	case $1 in
		--language)
			if [[ $# -lt 2 || "${2-}" == -* ]]; then
				echo "Error: --language requires a value" >&2
				usage >&2
				exit 1
			fi
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
if [[ -n "${LANGUAGE}" ]]; then
	LANGUAGE_VALID=false
	for valid_lang in "${VALID_LANGUAGES[@]}"; do
		if [[ "${LANGUAGE}" == "${valid_lang}" ]]; then
			LANGUAGE_VALID=true
			break
		fi
	done

	if [[ "${LANGUAGE_VALID}" == false ]]; then
		echo "Error: Invalid language '${LANGUAGE}'" >&2
		echo "Valid languages: ${VALID_LANGUAGES[*]}" >&2
		exit 1
	fi
fi

cd "${REPO_ROOT}"

## Upgrade the src and test packs for a given parent directory.
upgrade_packs() {
	local _parent_dir="$1"
	if [[ -d "${_parent_dir}/src" ]]; then
		echo "INFO: Running 'codeql pack upgrade' for '${_parent_dir}/src'..."
		codeql pack upgrade -- "${_parent_dir}/src"
	else
		echo "WARNING: Directory '${_parent_dir}/src' not found, skipping" >&2
	fi
	if [[ -d "${_parent_dir}/test" ]]; then
		echo "INFO: Running 'codeql pack upgrade' for '${_parent_dir}/test'..."
		codeql pack upgrade -- "${_parent_dir}/test"
	else
		echo "WARNING: Directory '${_parent_dir}/test' not found, skipping" >&2
	fi
}

if [[ -n "${LANGUAGE}" ]]; then
	echo "Upgrading packs for language: ${LANGUAGE}"
	if [[ "${LANGUAGE}" == "javascript" ]]; then
		upgrade_packs "server/ql/javascript/examples"
	fi
	upgrade_packs "server/ql/${LANGUAGE}/tools"
else
	echo "Upgrading packs for all languages..."
	upgrade_packs "server/ql/actions/tools"
	upgrade_packs "server/ql/cpp/tools"
	upgrade_packs "server/ql/csharp/tools"
	upgrade_packs "server/ql/go/tools"
	upgrade_packs "server/ql/java/tools"
	upgrade_packs "server/ql/javascript/examples"
	upgrade_packs "server/ql/javascript/tools"
	upgrade_packs "server/ql/python/tools"
	upgrade_packs "server/ql/ruby/tools"
	upgrade_packs "server/ql/swift/tools"
fi

echo ""
echo "✅ All CodeQL pack lock files upgraded successfully."
