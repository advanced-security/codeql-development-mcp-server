#!/usr/bin/env bash
set -euo pipefail

##
## Test: Server must fail at startup when codeql is not on PATH and CODEQL_PATH
## is not set.
##
## Usage:
##   ./server/scripts/test-codeql-path-missing.sh [<server-bundle>]
##
## Arguments:
##   <server-bundle>  Path to the server JS bundle (default: server/dist/codeql-development-mcp-server.js)
##
## Environment:
##   CLEAN_PATH  Optional. A PATH value that does NOT include codeql.
##               When unset, the script auto-builds a clean PATH by removing
##               directories that contain a codeql binary.
##
## Exit codes:
##   0  Server failed at startup with the expected "not reachable" error
##   1  Unexpected behavior (server did not fail, wrong error, etc.)
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

SERVER_BUNDLE="${1:-server/dist/codeql-development-mcp-server.js}"

# Resolve relative paths against the repo root
if [[ ! "${SERVER_BUNDLE}" = /* ]]; then
  SERVER_BUNDLE="${REPO_ROOT}/${SERVER_BUNDLE}"
fi

if [[ ! -f "${SERVER_BUNDLE}" ]]; then
  echo "::error::Server bundle not found: ${SERVER_BUNDLE}"
  exit 1
fi

# CLEAN_PATH is required for this test — we need a PATH without codeql
if [[ -z "${CLEAN_PATH:-}" ]]; then
  # Build CLEAN_PATH automatically by removing every directory that contains
  # a codeql binary (either by name match or by actual file presence).
  CLEAN_PATH=""
  IFS=':' read -ra PARTS <<< "${PATH}"
  for part in "${PARTS[@]}"; do
    case "$part" in
      *codeql*|*gh-codeql*) continue ;;
    esac
    # Also skip dirs that contain a codeql binary (e.g. /usr/local/bin)
    if [[ -x "${part}/codeql" ]] || [[ -x "${part}/codeql.exe" ]]; then
      continue
    fi
    CLEAN_PATH="${CLEAN_PATH:+${CLEAN_PATH}:}${part}"
  done
fi

# Verify codeql is NOT findable on the clean PATH
if PATH="${CLEAN_PATH}" command -v codeql >/dev/null 2>&1; then
  echo "::error::codeql is still discoverable after PATH cleanup — cannot run this test"
  exit 1
fi

export PATH="${CLEAN_PATH}"

# Ensure CODEQL_PATH is NOT set
unset CODEQL_PATH

echo "=== Test: Server must fail when codeql is not on PATH and CODEQL_PATH is unset ==="
echo "  SERVER_BUNDLE=${SERVER_BUNDLE}"
echo "  CODEQL_PATH=(unset)"

STDOUT_FILE="$(mktemp)"
STDERR_FILE="$(mktemp)"
cleanup() { rm -f "${STDOUT_FILE}" "${STDERR_FILE}"; }
trap cleanup EXIT

# NOTE: We avoid GNU `timeout` because it may not be available on macOS CI runners.
node "${SERVER_BUNDLE}" \
  < /dev/null \
  > "${STDOUT_FILE}" \
  2> "${STDERR_FILE}" &
SERVER_PID=$!

# Watchdog: kill the server if it hasn't exited within 30 seconds
( sleep 30; kill "${SERVER_PID}" 2>/dev/null ) &
WATCHDOG_PID=$!

wait "${SERVER_PID}" 2>/dev/null && EXIT_CODE=0 || EXIT_CODE=$?

# Cancel the watchdog if the server exited on its own
kill "${WATCHDOG_PID}" 2>/dev/null || true
wait "${WATCHDOG_PID}" 2>/dev/null || true

echo "  Exit code: ${EXIT_CODE}"

if [[ "${EXIT_CODE}" -ne 0 ]] && grep -qi "not reachable" "${STDERR_FILE}"; then
  echo ""
  echo "--- stderr (first 20 lines) ---"
  head -20 "${STDERR_FILE}"
  echo ""
  echo "✅ PASS: Server failed at startup — CodeQL CLI not reachable"
  exit 0
else
  echo ""
  echo "::error::Unexpected behavior (exit=${EXIT_CODE})"
  echo "--- stderr ---"
  cat "${STDERR_FILE}"
  echo "--- stdout ---"
  cat "${STDOUT_FILE}"
  exit 1
fi
