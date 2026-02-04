#!/usr/bin/env bash
set -euo pipefail

## verify-pack-compatibility.sh
## Verifies that CodeQL pack versions are compatible with the current CLI version.

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

## Read the target CLI version from .codeql-version
if [[ ! -f "${REPO_ROOT}/.codeql-version" ]]; then
    echo "ERROR: .codeql-version file not found" >&2
    exit 1
fi

CLI_VERSION=$(cat "${REPO_ROOT}/.codeql-version" | tr -d '[:space:]')
CLI_VERSION_NUM=${CLI_VERSION#v}  # Remove 'v' prefix

echo "=== CodeQL Pack Compatibility Check ==="
echo "Target CLI Version: ${CLI_VERSION}"
echo ""

## Get the CodeQL CLI installation directory
CODEQL_DIST=$(dirname "$(command -v codeql)")
if [[ -z "${CODEQL_DIST}" ]]; then
    echo "ERROR: CodeQL CLI not found in PATH" >&2
    exit 1
fi

## Detect the actual CLI version installed
INSTALLED_VERSION=$(codeql version --format=terse 2>/dev/null || echo "unknown")
echo "Installed CLI Version: ${INSTALLED_VERSION}"
echo ""

## Find extractor directory (works with gh-codeql extension)
find_extractor_dir() {
    local lang=$1
    local search_paths=(
        "${HOME}/.local/share/gh/extensions/gh-codeql/dist/release/${CLI_VERSION}/${lang}"
        "${CODEQL_DIST}/${lang}"
        "${CODEQL_DIST}/../${lang}"
    )

    for path in "${search_paths[@]}"; do
        if [[ -d "${path}" ]]; then
            echo "${path}"
            return 0
        fi
    done
    return 1
}

## Languages to check
LANGUAGES=("actions" "cpp" "csharp" "go" "java" "javascript" "python" "ruby" "swift")

## Track overall status
ALL_COMPATIBLE=true

echo "=== Checking dbscheme Compatibility ==="
echo ""

for lang in "${LANGUAGES[@]}"; do
    echo "--- ${lang} ---"

    ## Find extractor directory
    EXTRACTOR_DIR=$(find_extractor_dir "${lang}" 2>/dev/null || true)
    if [[ -z "${EXTRACTOR_DIR}" ]]; then
        echo "  WARNING: Extractor not found for ${lang}"
        continue
    fi

    ## Find extractor dbscheme
    EXTRACTOR_DBSCHEME=$(find "${EXTRACTOR_DIR}" -maxdepth 1 -name "*.dbscheme" ! -name "*.dbscheme.stats" 2>/dev/null | head -1)
    if [[ -z "${EXTRACTOR_DBSCHEME}" ]]; then
        echo "  WARNING: No dbscheme found in extractor directory"
        continue
    fi

    ## Read the pack version from codeql-pack.yml
    PACK_YML="${REPO_ROOT}/server/ql/${lang}/tools/src/codeql-pack.yml"
    if [[ ! -f "${PACK_YML}" ]]; then
        echo "  SKIP: No pack found at ${PACK_YML}"
        continue
    fi

    ## Extract the codeql/*-all dependency version
    PACK_DEP=$(grep -E "codeql/${lang}-all:" "${PACK_YML}" 2>/dev/null | awk '{print $2}' || true)
    if [[ -z "${PACK_DEP}" ]]; then
        echo "  WARNING: Could not read dependency version from ${PACK_YML}"
        continue
    fi

    ## Find the installed pack
    PACK_DIR="${HOME}/.codeql/packages/codeql/${lang}-all/${PACK_DEP}"
    if [[ ! -d "${PACK_DIR}" ]]; then
        echo "  WARNING: Pack codeql/${lang}-all@${PACK_DEP} not installed"
        echo "           Run: codeql pack download codeql/${lang}-all@${PACK_DEP}"
        ALL_COMPATIBLE=false
        continue
    fi

    ## Find pack dbscheme (some packs have it in subdirectories)
    PACK_DBSCHEME=$(find "${PACK_DIR}" -name "*.dbscheme" ! -name "*.dbscheme.stats" 2>/dev/null | head -1)
    if [[ -z "${PACK_DBSCHEME}" ]]; then
        echo "  WARNING: No dbscheme found in pack directory"
        continue
    fi

    ## Compare dbscheme hashes
    EXTRACTOR_HASH=$(md5 -q "${EXTRACTOR_DBSCHEME}" 2>/dev/null || md5sum "${EXTRACTOR_DBSCHEME}" | awk '{print $1}')
    PACK_HASH=$(md5 -q "${PACK_DBSCHEME}" 2>/dev/null || md5sum "${PACK_DBSCHEME}" | awk '{print $1}')

    if [[ "${EXTRACTOR_HASH}" == "${PACK_HASH}" ]]; then
        echo "  ✅ COMPATIBLE: codeql/${lang}-all@${PACK_DEP}"
    else
        echo "  ❌ MISMATCH: codeql/${lang}-all@${PACK_DEP}"
        echo "     Extractor dbscheme: ${EXTRACTOR_HASH}"
        echo "     Pack dbscheme:      ${PACK_HASH}"
        ALL_COMPATIBLE=false
    fi
done

echo ""
echo "=== Checking ql-mcp-* Pack Versions ==="
echo ""

## Check that all ql-mcp-* packs use the CLI version
for lang in "${LANGUAGES[@]}"; do
    SRC_PACK="${REPO_ROOT}/server/ql/${lang}/tools/src/codeql-pack.yml"
    TEST_PACK="${REPO_ROOT}/server/ql/${lang}/tools/test/codeql-pack.yml"

    if [[ ! -f "${SRC_PACK}" ]]; then
        continue
    fi

    SRC_VERSION=$(grep "^version:" "${SRC_PACK}" | awk '{print $2}')

    if [[ "${SRC_VERSION}" == "${CLI_VERSION_NUM}" ]]; then
        echo "  ✅ ql-mcp-${lang}-tools-src: ${SRC_VERSION}"
    else
        echo "  ❌ ql-mcp-${lang}-tools-src: ${SRC_VERSION} (expected ${CLI_VERSION_NUM})"
        ALL_COMPATIBLE=false
    fi

    if [[ -f "${TEST_PACK}" ]]; then
        TEST_VERSION=$(grep "^version:" "${TEST_PACK}" | awk '{print $2}')
        if [[ "${TEST_VERSION}" == "${CLI_VERSION_NUM}" ]]; then
            echo "  ✅ ql-mcp-${lang}-tools-test: ${TEST_VERSION}"
        else
            echo "  ❌ ql-mcp-${lang}-tools-test: ${TEST_VERSION} (expected ${CLI_VERSION_NUM})"
            ALL_COMPATIBLE=false
        fi
    fi
done

echo ""

if [[ "${ALL_COMPATIBLE}" == true ]]; then
    echo "=== All packs are compatible! ==="
    exit 0
else
    echo "=== Some packs have compatibility issues ==="
    echo "See the SKILL.md for guidance on resolving these issues."
    exit 1
fi
