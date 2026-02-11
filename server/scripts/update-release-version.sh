#!/usr/bin/env bash
set -euo pipefail

## update-release-version.sh
## Deterministically updates the release version across all version-bearing files
## in the codeql-development-mcp-server repository.
##
## Version-bearing files:
##   .codeql-version                                      (vX.Y.Z format)
##   package.json                                         (X.Y.Z format)
##   client/package.json                                  (X.Y.Z format)
##   server/package.json                                  (X.Y.Z format)
##   server/ql/*/tools/src/codeql-pack.yml                (X.Y.Z format)
##   server/ql/*/tools/test/codeql-pack.yml               (X.Y.Z format)
##
## The base version (X.Y.Z without any prerelease suffix) must correspond to
## an actual CodeQL CLI release. The script validates this by checking against
## the installed `codeql` CLI or the `.codeql-version` file.
##
## Usage:
##   ./server/scripts/update-release-version.sh <new-version>
##   ./server/scripts/update-release-version.sh --check [<expected-version>]
##
## Examples:
##   ./server/scripts/update-release-version.sh 2.24.1
##   ./server/scripts/update-release-version.sh 2.24.1-beta
##   ./server/scripts/update-release-version.sh v2.24.1-beta
##   ./server/scripts/update-release-version.sh --check
##   ./server/scripts/update-release-version.sh --check 2.24.1-beta

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

## Supported languages for ql-mcp-* packs
LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "swift")

usage() {
	cat <<EOF
Usage: $0 <new-version>
       $0 --check [<expected-version>]

Deterministically updates the release version across all version-bearing files.
The base version (X.Y.Z, without prerelease suffixes) must correspond to an
actual CodeQL CLI release.

ARGUMENTS:
    <new-version>          The new version to set (e.g., 2.24.1 or 2.24.1-beta).
                           The 'v' prefix is optional and will be normalized.
                           The base version (X.Y.Z) is validated against the
                           installed CodeQL CLI or .codeql-version file.

OPTIONS:
    --check [<version>]    Check version consistency across all files.
                           If <version> is provided, also validates that all files
                           match the expected version.
    --dry-run              Show what would be changed without modifying files.
    --skip-cli-validation  Skip CodeQL CLI version validation (not recommended).
    -h, --help             Show this help message.

EXAMPLES:
    $0 2.24.1              Update all files to version 2.24.1
    $0 2.24.1-beta         Update all files to version 2.24.1-beta
    $0 v2.24.1-beta        Same as above (v prefix is stripped automatically)
    $0 --check             Verify all version-bearing files are consistent
    $0 --check 2.24.1      Verify all files contain version 2.24.1
    $0 --dry-run 2.24.1    Preview changes without writing files
EOF
}

## Collect all version-bearing files and their current versions
collect_versions() {
	local versions=()

	## .codeql-version (stores vX.Y.Z)
	local codeql_version_file="${REPO_ROOT}/.codeql-version"
	if [[ -f "${codeql_version_file}" ]]; then
		local raw_version
		raw_version=$(tr -d '[:space:]' < "${codeql_version_file}")
		versions+=(".codeql-version|${raw_version#v}")
	else
		echo "WARNING: .codeql-version not found" >&2
	fi

	## package.json files
	local pkg_files=("package.json" "client/package.json" "server/package.json")
	for pkg_file in "${pkg_files[@]}"; do
		local full_path="${REPO_ROOT}/${pkg_file}"
		if [[ -f "${full_path}" ]]; then
			local pkg_version
			pkg_version=$(grep -m1 '"version"' "${full_path}" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
			versions+=("${pkg_file}|${pkg_version}")
		else
			echo "WARNING: ${pkg_file} not found" >&2
		fi
	done

	## codeql-pack.yml files (src and test packs for each language)
	for lang in "${LANGUAGES[@]}"; do
		for pack_type in "src" "test"; do
			local pack_file="server/ql/${lang}/tools/${pack_type}/codeql-pack.yml"
			local full_path="${REPO_ROOT}/${pack_file}"
			if [[ -f "${full_path}" ]]; then
				local pack_version
				pack_version=$(grep -m1 "^version:" "${full_path}" | awk '{print $2}')
				versions+=("${pack_file}|${pack_version}")
			fi
		done
	done

	printf '%s\n' "${versions[@]}"
}

## Check version consistency
check_versions() {
	local expected_version="${1:-}"
	local all_consistent=true
	local first_version=""
	local file_count=0

	echo "=== Version Consistency Check ==="
	echo ""

	while IFS='|' read -r file version; do
		file_count=$((file_count + 1))

		if [[ -z "${first_version}" ]]; then
			first_version="${version}"
		fi

		## .codeql-version stores only the base version (X.Y.Z) even for
		## prerelease tags. Compare it against the base version of the expected
		## value or the first version to avoid false mismatches.
		local effective_expected effective_first
		if [[ "${file}" == ".codeql-version" ]]; then
			effective_expected="${expected_version%%-*}"
			effective_first="${first_version%%-*}"
		else
			effective_expected="${expected_version}"
			effective_first="${first_version}"
		fi

		if [[ -n "${expected_version}" ]]; then
			if [[ "${version}" == "${effective_expected}" ]]; then
				echo "  ✅ ${file}: ${version}"
			else
				echo "  ❌ ${file}: ${version} (expected ${effective_expected})"
				all_consistent=false
			fi
		else
			if [[ "${version}" == "${effective_first}" ]]; then
				echo "  ✅ ${file}: ${version}"
			else
				echo "  ❌ ${file}: ${version} (differs from ${effective_first})"
				all_consistent=false
			fi
		fi
	done < <(collect_versions)

	echo ""
	echo "Checked ${file_count} version-bearing files."

	if [[ "${all_consistent}" == true ]]; then
		if [[ -n "${expected_version}" ]]; then
			echo "✅ All files match expected version: ${expected_version}"
		else
			echo "✅ All files are consistent at version: ${first_version}"
		fi
		return 0
	else
		echo "❌ Version inconsistency detected!"
		return 1
	fi
}

## Validate version format (X.Y.Z or X.Y.Z-suffix)
validate_version() {
	local version="$1"
	if [[ ! "${version}" =~ ^[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9._-]+)?$ ]]; then
		echo "ERROR: Invalid version format '${version}'" >&2
		echo "Expected format: X.Y.Z or X.Y.Z-suffix (e.g., 2.24.1 or 2.24.1-beta)" >&2
		return 1
	fi
}

## Extract the base version (X.Y.Z) from a potentially suffixed version (X.Y.Z-beta)
extract_base_version() {
	local version="$1"
	echo "${version%%-*}"
}

## Validate that the base version corresponds to an actual CodeQL CLI version.
## Checks in order:
##   1. If 'codeql' CLI is on PATH, compare its version
##   2. Fall back to the .codeql-version file in the repo
validate_cli_version() {
	local base_version="$1"

	echo "=== CodeQL CLI Version Validation ==="
	echo "  Required base version: ${base_version}"

	## Try the installed CLI first
	if command -v codeql >/dev/null 2>&1; then
		local installed_version
		installed_version=$(codeql version --format=terse 2>/dev/null || echo "unknown")
		echo "  Installed CLI version: ${installed_version}"
		if [[ "${installed_version}" == "${base_version}" ]]; then
			echo "  ✅ Base version ${base_version} matches installed CodeQL CLI"
			return 0
		else
			echo "  ❌ Base version ${base_version} does not match installed CodeQL CLI (${installed_version})" >&2
			echo "" >&2
			echo "  The base version (X.Y.Z, without prerelease suffix) must match an" >&2
			echo "  available CodeQL CLI release. Either:" >&2
			echo "    - Install the correct CLI: gh codeql set-version ${base_version}" >&2
			echo "    - Use a version matching the installed CLI: ${installed_version}" >&2
			echo "    - Skip validation with --skip-cli-validation (not recommended)" >&2
			return 1
		fi
	fi

	## Fall back to .codeql-version file
	local codeql_version_file="${REPO_ROOT}/.codeql-version"
	if [[ -f "${codeql_version_file}" ]]; then
		local file_version
		file_version=$(tr -d '[:space:]' < "${codeql_version_file}")
		file_version="${file_version#v}"  ## Strip v prefix
		echo "  .codeql-version file: ${file_version}"
		if [[ "${file_version}" == "${base_version}" ]]; then
			echo "  ✅ Base version ${base_version} matches .codeql-version"
			return 0
		else
			echo "  ❌ Base version ${base_version} does not match .codeql-version (${file_version})" >&2
			echo "" >&2
			echo "  The base version (X.Y.Z, without prerelease suffix) must correspond" >&2
			echo "  to the CodeQL CLI version in .codeql-version." >&2
			echo "  Current .codeql-version: v${file_version}" >&2
			echo "  Skip validation with --skip-cli-validation (not recommended)" >&2
			return 1
		fi
	fi

	echo "  WARNING: Cannot validate base version — no CodeQL CLI on PATH and no .codeql-version file" >&2
	return 1
}

## Update a JSON file's "version" field using sed
update_json_version() {
	local file="$1"
	local new_version="$2"
	## Match the "version": "..." line and replace the version value
	sed -i.bak "s/\"version\"[[:space:]]*:[[:space:]]*\"[^\"]*\"/\"version\": \"${new_version}\"/" "${file}"
	rm -f "${file}.bak"
}

## Update a codeql-pack.yml file's version field using sed
update_pack_version() {
	local file="$1"
	local new_version="$2"
	## Match the version: line at the start and replace the version value
	sed -i.bak "s/^version:[[:space:]]*.*/version: ${new_version}/" "${file}"
	rm -f "${file}.bak"
}

## Update all version-bearing files
update_versions() {
	local new_version="$1"
	local dry_run="${2:-false}"
	local updated_count=0

	echo "=== Updating Release Version to ${new_version} ==="
	echo ""

	## 1. Update .codeql-version (uses v prefix, base version only)
	## .codeql-version stores the CodeQL CLI version (X.Y.Z), NOT the project
	## release version. For prerelease tags like 2.24.1-beta, we write v2.24.1.
	local base_version
	base_version=$(extract_base_version "${new_version}")
	local codeql_version_file="${REPO_ROOT}/.codeql-version"
	if [[ -f "${codeql_version_file}" ]]; then
		local old_version
		old_version=$(tr -d '[:space:]' < "${codeql_version_file}")
		if [[ "${dry_run}" == true ]]; then
			echo "  [DRY RUN] .codeql-version: ${old_version} -> v${base_version}"
		else
			printf "v%s\n" "${base_version}" > "${codeql_version_file}"
			echo "  ✅ .codeql-version: ${old_version} -> v${base_version}"
		fi
		updated_count=$((updated_count + 1))
	fi

	## 2. Update package.json files
	local pkg_files=("package.json" "client/package.json" "server/package.json")
	for pkg_file in "${pkg_files[@]}"; do
		local full_path="${REPO_ROOT}/${pkg_file}"
		if [[ -f "${full_path}" ]]; then
			local old_version
			old_version=$(grep -m1 '"version"' "${full_path}" | sed 's/.*"version"[[:space:]]*:[[:space:]]*"\([^"]*\)".*/\1/')
			if [[ "${dry_run}" == true ]]; then
				echo "  [DRY RUN] ${pkg_file}: ${old_version} -> ${new_version}"
			else
				update_json_version "${full_path}" "${new_version}"
				echo "  ✅ ${pkg_file}: ${old_version} -> ${new_version}"
			fi
			updated_count=$((updated_count + 1))
		fi
	done

	## 3. Update codeql-pack.yml files (src and test packs for each language)
	for lang in "${LANGUAGES[@]}"; do
		for pack_type in "src" "test"; do
			local pack_file="server/ql/${lang}/tools/${pack_type}/codeql-pack.yml"
			local full_path="${REPO_ROOT}/${pack_file}"
			if [[ -f "${full_path}" ]]; then
				local old_version
				old_version=$(grep -m1 "^version:" "${full_path}" | awk '{print $2}')
				if [[ "${dry_run}" == true ]]; then
					echo "  [DRY RUN] ${pack_file}: ${old_version} -> ${new_version}"
				else
					update_pack_version "${full_path}" "${new_version}"
					echo "  ✅ ${pack_file}: ${old_version} -> ${new_version}"
				fi
				updated_count=$((updated_count + 1))
			fi
		done
	done

	echo ""
	if [[ "${dry_run}" == true ]]; then
		echo "Would update ${updated_count} files. (Dry run — no files modified)"
	else
		echo "Updated ${updated_count} files to version ${new_version}."
		echo ""
		echo "Next steps:"
		echo "  1. Run 'npm install' to regenerate package-lock.json"
		echo "  2. Run 'npm run build-and-test' to validate the changes"
		echo "  3. Commit the changes and tag with 'v${new_version}'"
	fi
}

## Parse arguments
CHECK_MODE=false
DRY_RUN=false
SKIP_CLI_VALIDATION=false
NEW_VERSION=""

while [[ $# -gt 0 ]]; do
	case $1 in
		--check)
			CHECK_MODE=true
			shift
			## Optional expected version argument
			if [[ $# -gt 0 && ! "$1" =~ ^-- ]]; then
				NEW_VERSION="${1#v}"
				shift
			fi
			;;
		--dry-run)
			DRY_RUN=true
			shift
			;;
		--skip-cli-validation)
			SKIP_CLI_VALIDATION=true
			shift
			;;
		-h|--help)
			usage
			exit 0
			;;
		-*)
			echo "Error: Unknown option $1" >&2
			usage >&2
			exit 1
			;;
		*)
			NEW_VERSION="${1#v}"  ## Strip optional v prefix
			shift
			;;
	esac
done

if [[ "${CHECK_MODE}" == true ]]; then
	check_versions "${NEW_VERSION}"
	exit $?
fi

if [[ -z "${NEW_VERSION}" ]]; then
	echo "Error: No version specified" >&2
	echo "" >&2
	usage >&2
	exit 1
fi

validate_version "${NEW_VERSION}"

## Validate that the base version matches an actual CodeQL CLI release
if [[ "${SKIP_CLI_VALIDATION}" == false ]]; then
	BASE_VERSION=$(extract_base_version "${NEW_VERSION}")
	validate_cli_version "${BASE_VERSION}"
	echo ""
else
	echo "⚠️  CLI version validation skipped (--skip-cli-validation)"
	echo ""
fi

update_versions "${NEW_VERSION}" "${DRY_RUN}"
