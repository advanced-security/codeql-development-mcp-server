#!/bin/bash

# Start MCP server in background for integration testing
# This script mimics the GitHub Actions workflow server startup
#
# Environment Variables:
#   HTTP_HOST                - Server host (default: localhost)
#   HTTP_PORT                - Server port (default: 3000)
#   TRANSPORT_MODE           - Transport mode (default: http)
#   ENABLE_MONITORING_TOOLS  - Enable session_* tools (default: false)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"
ROOT_DIR="$(dirname "$CLIENT_DIR")"

# Default environment variables (can be overridden)
HTTP_HOST="${HTTP_HOST:-localhost}"
HTTP_PORT="${HTTP_PORT:-3000}"
TRANSPORT_MODE="${TRANSPORT_MODE:-http}"
ENABLE_MONITORING_TOOLS="${ENABLE_MONITORING_TOOLS:-false}"

echo "Starting MCP server with HTTP_HOST=$HTTP_HOST HTTP_PORT=$HTTP_PORT"
echo "Monitoring tools enabled: $ENABLE_MONITORING_TOOLS"

# Check if port is already in use and kill the process if so
if lsof -i ":$HTTP_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "⚠️  Port $HTTP_PORT is already in use. Stopping existing process..."
    EXISTING_PID=$(lsof -i ":$HTTP_PORT" -sTCP:LISTEN -t)
    kill -9 "$EXISTING_PID" 2>/dev/null || true
    sleep 1
    echo "✅ Freed port $HTTP_PORT"
fi

# Change to root directory
cd "$ROOT_DIR"

# Start server in background and capture PID
HTTP_HOST="$HTTP_HOST" \
HTTP_PORT="$HTTP_PORT" \
TRANSPORT_MODE="$TRANSPORT_MODE" \
ENABLE_MONITORING_TOOLS="$ENABLE_MONITORING_TOOLS" \
node server/dist/ql-mcp-server.js > "$CLIENT_DIR/server.log" 2>&1 &

SERVER_PID=$!
echo $SERVER_PID > "$CLIENT_DIR/server.pid"

echo "Server started with PID $SERVER_PID"
echo "Server logs will be written to $CLIENT_DIR/server.log"