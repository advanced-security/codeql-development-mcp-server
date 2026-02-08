#!/usr/bin/env bash
set -euo pipefail

##
## Test: Server must fail at startup when CODEQL_PATH points to a non-existent file.
##
## Usage:
##   ./server/scripts/test-codeql-path-invalid.sh [<server-bundle>]
##
## Arguments:
##   <server-bundle>  Path to the server JS bundle (default: server/dist/codeql-development-mcp-server.js)
##
## Environment:
##   CLEAN_PATH  Optional. When set, PATH is replaced with this value so that
##               codeql is not discoverable via PATH. When unset, the current
##               PATH is used as-is (useful for local testing).
##
## Exit codes:
##   0  Server failed at startup with the expected CODEQL_PATH error
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

# Replace PATH with CLEAN_PATH when provided
if [[ -n "${CLEAN_PATH:-}" ]]; then
  export PATH="${CLEAN_PATH}"
fi

# Point CODEQL_PATH at a non-existent file
export CODEQL_PATH="/nonexistent/path/to/codeql"

echo "=== Test: Server must fail when CODEQL_PATH is invalid ==="
echo "  SERVER_BUNDLE=${SERVER_BUNDLE}"
echo "  CODEQL_PATH=${CODEQL_PATH}"

# Run the server directly (no pipe) with a watchdog timeout.
# Feed /dev/null to stdin so the STDIO transport gets immediate EOF and the
# process can exit cleanly after the startup error.
# NOTE: We avoid GNU `timeout` because it may not be available on macOS CI runners.
STDOUT_FILE="$(mktemp)"
STDERR_FILE="$(mktemp)"
cleanup() { rm -f "${STDOUT_FILE}" "${STDERR_FILE}"; }
trap cleanup EXIT

node "${SERVER_BUNDLE}" \
  < /dev/null \
  > "${STDOUT_FILE}" \
  2> "${STDERR_FILE}" &
SERVER_PID=$!

# Watchdog: kill the server if it hasn't exited within 15 seconds
( sleep 15; kill "${SERVER_PID}" 2>/dev/null ) &
WATCHDOG_PID=$!

wait "${SERVER_PID}" 2>/dev/null && EXIT_CODE=0 || EXIT_CODE=$?

# Cancel the watchdog if the server exited on its own
kill "${WATCHDOG_PID}" 2>/dev/null || true
wait "${WATCHDOG_PID}" 2>/dev/null || true

echo "  Exit code: ${EXIT_CODE}"

if [[ "${EXIT_CODE}" -ne 0 ]] && grep -qi "does not exist" "${STDERR_FILE}"; then
  echo ""
  echo "--- stderr (first 20 lines) ---"
  head -20 "${STDERR_FILE}"
  echo ""
  echo "✅ PASS: Server failed at startup with expected CODEQL_PATH error"
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
