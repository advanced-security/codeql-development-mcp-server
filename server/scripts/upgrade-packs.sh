#!/usr/bin/env bash
set -euo pipefail

## upgrade-packs.sh
## Upgrade CodeQL pack dependencies for packs in the codeql-development-mcp-server
## repository. Unlike install-packs.sh (which honours existing lock files), this
## script resolves and pins the latest compatible codeql/<lang>-all dependency
## version in each source pack, then runs `codeql pack upgrade` to regenerate
## lock files. This is the script to use when the CodeQL CLI version changes.
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
Resolves and pins the latest compatible codeql/<lang>-all version in each
source pack, then regenerates codeql-pack.lock.yml files.

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

## Resolve and pin the latest compatible version of the codeql/<lang>-all
## upstream dependency in a source pack's codeql-pack.yml.
##
## Strategy: run `codeql pack upgrade` first to resolve the latest compatible
## version into the lock file, then read the resolved version back and update
## the codeql-pack.yml to pin that exact version. Packs with wildcard
## dependencies (e.g., '*') are skipped — those intentionally float.
pin_upstream_dep() {
	local pack_dir="$1"
	local pack_yml="${pack_dir}/codeql-pack.yml"
	local lock_file="${pack_dir}/codeql-pack.lock.yml"

	if [[ ! -f "${pack_yml}" ]]; then
		return
	fi

	## Extract the codeql/*-all dependency name and current version
	local dep_line
	dep_line=$(grep -m1 "codeql/.*-all:" "${pack_yml}" || true)
	if [[ -z "${dep_line}" ]]; then
		echo "  No codeql/*-all dependency found in ${pack_yml}, skipping"
		return
	fi

	local dep_name dep_old_version
	dep_name=$(echo "${dep_line}" | sed 's/^[[:space:]]*//' | cut -d: -f1)
	dep_old_version=$(echo "${dep_line}" | sed 's/^[^:]*:[[:space:]]*//')

	## Skip wildcard dependencies — these intentionally float
	if [[ "${dep_old_version}" == *"*"* ]]; then
		echo "  ℹ️  ${dep_name}: ${dep_old_version} (wildcard — skipping)"
		return
	fi

	## Run codeql pack upgrade to resolve the latest compatible version
	codeql pack upgrade -- "${pack_dir}" >/dev/null 2>&1

	if [[ ! -f "${lock_file}" ]]; then
		echo "  ⚠️  No lock file after upgrade for ${pack_dir}" >&2
		return
	fi

	## Read the resolved version from the lock file
	local resolved_version
	resolved_version=$(awk "/${dep_name//\//\\/}:/{getline; print}" "${lock_file}" \
		| sed 's/.*version:[[:space:]]*//' | head -1)

	if [[ -z "${resolved_version}" ]]; then
		echo "  ⚠️  ${dep_name}: not found in lock file, kept ${dep_old_version}" >&2
		return
	fi

	if [[ "${dep_old_version}" != "${resolved_version}" ]]; then
		sed -i.bak "s|${dep_name}: ${dep_old_version}|${dep_name}: ${resolved_version}|" "${pack_yml}"
		rm -f "${pack_yml}.bak"
		echo "  ✅ ${dep_name}: ${dep_old_version} -> ${resolved_version}"
	else
		echo "  ✅ ${dep_name}: ${resolved_version} (already current)"
	fi
}

## Upgrade the src and test packs for a given parent directory.
upgrade_packs() {
	local _parent_dir="$1"

	if [[ -d "${_parent_dir}/src" ]]; then
		echo "INFO: Upgrading '${_parent_dir}/src'..."
		pin_upstream_dep "${_parent_dir}/src"
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
