#!/bin/bash

# Wait for server startup and validate it's running
# This script mimics the GitHub Actions workflow server validation

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"

PID_FILE="$CLIENT_DIR/server.pid"
LOG_FILE="$CLIENT_DIR/server.log"

echo "Waiting 5 seconds for server to initialize..."
sleep 5

echo "=== Server startup logs ==="
if [ -f "$LOG_FILE" ]; then
    head -20 "$LOG_FILE" || echo "No server logs found"
else
    echo "No server logs found"
fi
echo "=========================="

if [ ! -f "$PID_FILE" ]; then
    echo "ERROR: No server.pid file found!"
    exit 1
fi

PID=$(cat "$PID_FILE")

if ! kill -0 "$PID" 2>/dev/null; then
    echo "ERROR: Server process is not running!"
    echo "=== Full server logs ==="
    if [ -f "$LOG_FILE" ]; then
        cat "$LOG_FILE" || echo "No server logs found"
    else
        echo "No server logs found"
    fi
    echo "======================="
    exit 1
fi

echo "Server process is running with PID $PID"
echo "Server validation completed successfully"