#!/usr/bin/env bash
set -euo pipefail

##
## Test: Server must start successfully when CODEQL_PATH points to a valid
## CodeQL binary, even when codeql is NOT on PATH.
##
## Usage:
##   ./server/scripts/test-codeql-path-valid.sh <codeql-binary> [<server-bundle>]
##
## Arguments:
##   <codeql-binary>  Absolute path to a valid CodeQL CLI binary
##   <server-bundle>  Path to the server JS bundle (default: server/dist/codeql-development-mcp-server.js)
##
## Environment:
##   CLEAN_PATH  Optional. When set, PATH is replaced with this value so that
##               codeql is not discoverable via PATH. When unset, the current
##               PATH is used as-is (useful for local testing).
##
## Exit codes:
##   0  Server started successfully and was shut down cleanly
##   1  Server failed to start or exited prematurely
##

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"

if [[ $# -lt 1 ]]; then
  echo "Usage: $0 <codeql-binary> [<server-bundle>]"
  exit 1
fi

CODEQL_BINARY="$1"
SERVER_BUNDLE="${2:-server/dist/codeql-development-mcp-server.js}"

# Resolve relative paths against the repo root
if [[ ! "${SERVER_BUNDLE}" = /* ]]; then
  SERVER_BUNDLE="${REPO_ROOT}/${SERVER_BUNDLE}"
fi

if [[ ! -f "${SERVER_BUNDLE}" ]]; then
  echo "::error::Server bundle not found: ${SERVER_BUNDLE}"
  exit 1
fi

if [[ ! -f "${CODEQL_BINARY}" ]]; then
  echo "::error::CodeQL binary not found: ${CODEQL_BINARY}"
  exit 1
fi

# Replace PATH with CLEAN_PATH when provided (CI strips codeql from PATH)
if [[ -n "${CLEAN_PATH:-}" ]]; then
  export PATH="${CLEAN_PATH}"
fi

export CODEQL_PATH="${CODEQL_BINARY}"

echo "=== Test: Server must start with valid CODEQL_PATH ==="
echo "  SERVER_BUNDLE=${SERVER_BUNDLE}"
echo "  CODEQL_PATH=${CODEQL_PATH}"
echo "  codeql in PATH: $(command -v codeql 2>/dev/null || echo 'not found')"

STDERR_FILE="$(mktemp)"
cleanup() {
  rm -f "${STDERR_FILE}"
  # Kill the server if still running
  if [[ -n "${SERVER_PID:-}" ]] && kill -0 "${SERVER_PID}" 2>/dev/null; then
    kill "${SERVER_PID}" 2>/dev/null || true
    wait "${SERVER_PID}" 2>/dev/null || true
  fi
  # Kill the FIFO feeder and its children (e.g. sleep) if still running
  if [[ -n "${FEEDER_PID:-}" ]]; then
    kill "${FEEDER_PID}" 2>/dev/null || true
    # Also kill the process group to catch child processes like sleep
    kill -- -"${FEEDER_PID}" 2>/dev/null || true
  fi
  # Remove the FIFO
  if [[ -n "${FIFO:-}" ]]; then
    rm -f "${FIFO}"
  fi
}
trap cleanup EXIT

# Start the server in the background.
# Use a long-running stdin feeder as a SEPARATE backgrounded process, then
# connect it to the server via a named pipe (FIFO) to avoid bash subshell
# PID issues with `A | B &`.
FIFO="$(mktemp -u)"
mkfifo "${FIFO}" 2>/dev/null || {
  # mkfifo may not exist on Windows Git Bash — fall back to /dev/null stdin.
  # The server will exit immediately on EOF but we can still check if startup
  # succeeds before the transport closes.
  FIFO=""
}

if [[ -n "${FIFO}" ]]; then
  # Feed the FIFO in the background so the server's stdin stays open
  ( sleep 30 > "${FIFO}" ) &
  FEEDER_PID=$!

  node "${SERVER_BUNDLE}" < "${FIFO}" > /dev/null 2> "${STDERR_FILE}" &
  SERVER_PID=$!
else
  # Fallback: use process substitution to keep stdin open
  node "${SERVER_BUNDLE}" < <(sleep 30) > /dev/null 2> "${STDERR_FILE}" &
  SERVER_PID=$!
fi

echo "  Server PID: ${SERVER_PID}"

# Give the server time to either start successfully or crash
sleep 5

# Helper: check whether stderr proves the server started successfully and
# resolved the CodeQL CLI via CODEQL_PATH.
check_startup_logs() {
  echo ""
  echo "--- startup logs ---"
  cat "${STDERR_FILE}"

  if grep -q "CODEQL_PATH" "${STDERR_FILE}"; then
    echo "✅ Server logged CODEQL_PATH resolution"
  else
    echo "⚠️  CODEQL_PATH not mentioned in stderr (non-fatal)"
  fi

  # The definitive success marker logged by the server
  if grep -q "McpServer started successfully" "${STDERR_FILE}"; then
    return 0
  fi
  return 1
}

if kill -0 "${SERVER_PID}" 2>/dev/null; then
  check_startup_logs
  echo ""
  echo "✅ PASS: Server is running after 5 seconds (PID ${SERVER_PID})"
  # Cleanup is handled by the EXIT trap
  exit 0
else
  wait "${SERVER_PID}" 2>/dev/null && EXIT_CODE=0 || EXIT_CODE=$?

  # On Windows, mkfifo is unavailable and the process-substitution fallback
  # may not keep stdin open reliably.  When the STDIO transport receives EOF
  # the server shuts down cleanly (exit 0) even though startup succeeded.
  # Accept that as a pass when the logs prove the server started correctly.
  if [[ "${EXIT_CODE}" -eq 0 ]] && check_startup_logs; then
    echo ""
    echo "✅ PASS: Server started successfully (exited cleanly after stdin EOF)"
    exit 0
  fi

  echo ""
  echo "::error::Server exited prematurely with code ${EXIT_CODE}"
  echo "--- stderr ---"
  cat "${STDERR_FILE}"
  # Cleanup is handled by the EXIT trap
  exit 1
fi
