#!/bin/bash

# Stop MCP server and cleanup
# This script mimics the GitHub Actions workflow server cleanup

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"

PID_FILE="$CLIENT_DIR/server.pid"
LOG_FILE="$CLIENT_DIR/server.log"
HTTP_PORT="${HTTP_PORT:-3000}"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    echo "Stopping server with PID $PID"
    
    if kill -0 "$PID" 2>/dev/null; then
        kill "$PID" || true
        sleep 2
        
        # Force kill if still running
        if kill -0 "$PID" 2>/dev/null; then
            echo "Force killing server process"
            kill -9 "$PID" || true
        fi
        
        echo "Server stopped successfully"
    else
        echo "Server process was not running"
    fi
    
    rm "$PID_FILE"
else
    echo "No server.pid file found"
fi

# Also check for any process using the port and kill it
if lsof -i ":$HTTP_PORT" -sTCP:LISTEN -t >/dev/null 2>&1; then
    echo "Found process using port $HTTP_PORT, stopping it..."
    EXISTING_PID=$(lsof -i ":$HTTP_PORT" -sTCP:LISTEN -t)
    kill -9 "$EXISTING_PID" 2>/dev/null || true
    sleep 1
    echo "Freed port $HTTP_PORT"
fi

# Clean up log files
if [ -f "$LOG_FILE" ]; then
    echo "Removing server.log"
    rm "$LOG_FILE"
fi

echo "Server cleanup completed"