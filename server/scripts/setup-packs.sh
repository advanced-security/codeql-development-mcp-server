#!/usr/bin/env bash
set -euo pipefail

## setup-packs.sh — Install CodeQL pack dependencies for bundled tool query packs.
##
## This script runs `codeql pack install` for each tool query source pack bundled
## with the codeql-development-mcp-server. It works from both:
##   - npm install layout:  <pkg>/ql/<language>/tools/src/
##   - monorepo layout:     server/ql/<language>/tools/src/
##
## The lock files (codeql-pack.lock.yml) shipped with each source pack pin exact
## dependency versions. `codeql pack install` reads these and fetches packages
## from the GitHub Container Registry (GHCR) into ~/.codeql/packages/.
##
## Prerequisites: codeql CLI must be on PATH (or set CODEQL_PATH).
##
## Usage:
##   setup-packs.sh [OPTIONS]
##
## Options:
##   --language <lang>  Install packs only for the specified language
##   -h, --help         Show this help message

LANGUAGE=""

usage() {
  cat << EOF
Usage: $0 [OPTIONS]

Install CodeQL pack dependencies for bundled tool query packs.

OPTIONS:
    --language <lang>  Install packs only for the specified language
                       Valid values: actions, cpp, csharp, go, java, javascript, python, ruby, swift
    -h, --help         Show this help message

By default, installs pack dependencies for all supported languages.
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

## Resolve the CodeQL CLI binary.
CODEQL="${CODEQL_PATH:-codeql}"
if ! command -v "${CODEQL}" &> /dev/null; then
  echo "Error: CodeQL CLI not found. Install it or set CODEQL_PATH." >&2
  exit 1
fi

## Resolve the ql/ root directory.
## Works from both:
##   npm layout:     <pkg>/scripts/setup-packs.sh  → <pkg>/ql/
##   monorepo layout: server/scripts/setup-packs.sh → server/ql/
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PACKAGE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
QL_ROOT="${PACKAGE_ROOT}/ql"

if [ ! -d "${QL_ROOT}" ]; then
  echo "Error: ql/ directory not found at ${QL_ROOT}" >&2
  exit 1
fi

## Install pack dependencies for a single language.
install_language_pack() {
  local lang="$1"
  local pack_dir="${QL_ROOT}/${lang}/tools/src"

  if [ ! -d "${pack_dir}" ]; then
    echo "⚠️  Skipping ${lang}: ${pack_dir} not found"
    return
  fi

  if [ ! -f "${pack_dir}/codeql-pack.yml" ]; then
    echo "⚠️  Skipping ${lang}: no codeql-pack.yml in ${pack_dir}"
    return
  fi

  echo "📦 Installing pack dependencies for ${lang}..."
  "${CODEQL}" pack install --no-strict-mode -- "${pack_dir}"
  echo "✅ ${lang} pack dependencies installed"
}

## Main
if [ -n "${LANGUAGE}" ]; then
  echo "Installing pack dependencies for language: ${LANGUAGE}"
  install_language_pack "${LANGUAGE}"
else
  echo "Installing pack dependencies for all languages..."
  for lang in "${VALID_LANGUAGES[@]}"; do
    install_language_pack "${lang}"
  done
fi

echo ""
echo "Done. Tool query pack dependencies are cached in ~/.codeql/packages/"
