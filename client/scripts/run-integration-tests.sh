#!/bin/bash

# Run integration tests - orchestrates the complete test workflow
# This script mimics the GitHub Actions workflow for local execution
#
# By default, this script runs integration tests in BOTH modes:
#   1. Default mode (monitoring tools disabled) - tests the user experience
#   2. Monitoring mode (monitoring tools enabled) - tests session_* tools
#
# Environment Variables:
#   MCP_MODE               - MCP transport mode (default: stdio, also: http)
#   HTTP_HOST              - Server host for HTTP mode (default: localhost)
#   HTTP_PORT              - Server port for HTTP mode (default: 3000)
#   TIMEOUT_SECONDS        - Request timeout (default: 30)
#   ENABLE_MONITORING_TOOLS - Force a specific mode instead of running both:
#                            "true"  = only run with monitoring tools enabled
#                            "false" = only run with monitoring tools disabled
#                            unset   = run BOTH modes (default)
#
# Usage:
#   ./run-integration-tests.sh                    # Run in BOTH modes (recommended)
#   ENABLE_MONITORING_TOOLS=false ./run-integration-tests.sh  # Only default mode
#   ENABLE_MONITORING_TOOLS=true ./run-integration-tests.sh   # Only monitoring mode
#   MCP_MODE=http ./run-integration-tests.sh      # Run using HTTP transport
#   ./run-integration-tests.sh --tools session_end            # Filter to specific tools

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
SERVER_DIR="$(dirname "$CLIENT_DIR")/server"

# Set default environment variables
export MCP_MODE="${MCP_MODE:-stdio}"
export HTTP_HOST="${HTTP_HOST:-localhost}"
export HTTP_PORT="${HTTP_PORT:-3000}"
export TIMEOUT_SECONDS="${TIMEOUT_SECONDS:-30}"
export URL_SCHEME="${URL_SCHEME:-http}"

# Determine which modes to run
# If ENABLE_MONITORING_TOOLS is explicitly set, run only that mode
# Otherwise, run both modes
RUN_DEFAULT_MODE=true
RUN_MONITORING_MODE=true

if [ -n "${ENABLE_MONITORING_TOOLS+x}" ]; then
    # Variable is explicitly set (even if empty)
    if [ "$ENABLE_MONITORING_TOOLS" = "true" ]; then
        RUN_DEFAULT_MODE=false
        RUN_MONITORING_MODE=true
        echo "🔧 Mode: Monitoring tools ONLY (ENABLE_MONITORING_TOOLS=true)"
    else
        RUN_DEFAULT_MODE=true
        RUN_MONITORING_MODE=false
        echo "🔧 Mode: Default mode ONLY (ENABLE_MONITORING_TOOLS=false)"
    fi
else
    echo "🔧 Mode: Running BOTH default and monitoring modes"
fi

# Check if --no-install-packs was passed
SKIP_PACK_INSTALL=false
for arg in "$@"; do
    if [ "$arg" = "--no-install-packs" ]; then
        SKIP_PACK_INSTALL=true
        break
    fi
done

echo "🚀 Starting CodeQL MCP Integration Tests"
echo "MCP Mode: $MCP_MODE"
if [ "$MCP_MODE" = "http" ]; then
    echo "Server URL: $URL_SCHEME://$HTTP_HOST:$HTTP_PORT/mcp"
fi

# Step 1: Build and bundle the server code
echo "📦 Building CodeQL MCP server bundle..."
cd "$SERVER_DIR"
npm run bundle

# Step 2: Install CodeQL packs (only once for both modes, skip if --no-install-packs)
if [ "$SKIP_PACK_INSTALL" = true ]; then
    echo "📦 Skipping CodeQL pack installation (--no-install-packs)"
else
    echo "📦 Installing CodeQL pack dependencies..."
    "$SERVER_DIR/scripts/install-packs.sh"
fi

cd "$CLIENT_DIR"

# For HTTP mode, set the server URL for the client
if [ "$MCP_MODE" = "http" ]; then
    export MCP_SERVER_URL="$URL_SCHEME://$HTTP_HOST:$HTTP_PORT/mcp"
fi

# Function to run tests in a specific mode
run_tests_in_mode() {
    local mode_name="$1"
    local enable_monitoring="$2"
    shift 2

    echo ""
    echo "═══════════════════════════════════════════════════════════════"
    echo "🧪 Running integration tests: $mode_name"
    echo "═══════════════════════════════════════════════════════════════"

    # Set the monitoring tools flag for this run
    export ENABLE_MONITORING_TOOLS="$enable_monitoring"

    if [ "$MCP_MODE" = "http" ]; then
        # HTTP mode: start server in background, run tests, stop server
        echo "🚀 Starting MCP server (monitoring=$enable_monitoring)..."
        "$SCRIPT_DIR/start-server.sh"

        # Wait for server startup
        echo "⏳ Waiting for server startup..."
        "$SCRIPT_DIR/wait-for-server.sh"
    else
        # stdio mode: client spawns server directly via StdioClientTransport
        echo "📡 Using stdio transport (client spawns server directly)"
    fi

    # Run the integration tests (skip pack installation since we already did it)
    echo "🧪 Running tests..."
    node src/ql-mcp-client.js integration-tests --no-install-packs "$@"

    if [ "$MCP_MODE" = "http" ]; then
        # Stop the server before next mode
        echo "🛑 Stopping server..."
        "$SCRIPT_DIR/stop-server.sh"
    fi
}

# Trap to ensure cleanup happens even if script fails
cleanup() {
    echo "🧹 Cleaning up..."
    if [ "$MCP_MODE" = "http" ]; then
        "$SCRIPT_DIR/stop-server.sh" 2>/dev/null || true
    fi
}
trap cleanup EXIT

# Shift past any mode-specific args we've handled, pass rest to test runner
EXTRA_ARGS=("$@")

# Run tests in requested modes
if [ "$RUN_DEFAULT_MODE" = true ]; then
    run_tests_in_mode "DEFAULT MODE (user experience)" "false" "${EXTRA_ARGS[@]}"
fi

if [ "$RUN_MONITORING_MODE" = true ]; then
    run_tests_in_mode "MONITORING MODE (session_* tools)" "true" "${EXTRA_ARGS[@]}"
fi

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "✅ All integration tests completed successfully!"
echo "═══════════════════════════════════════════════════════════════"