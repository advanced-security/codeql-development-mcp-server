#!/bin/bash

# Show server logs on failure - useful for debugging failed tests
# This script mimics the GitHub Actions log display functionality

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CLIENT_DIR="$(dirname "$SCRIPT_DIR")"

LOG_FILE="$CLIENT_DIR/server.log"

if [ -f "$LOG_FILE" ]; then
    echo "=== Full server logs (last 50 lines) ==="
    tail -50 "$LOG_FILE" || echo "No server logs found"
    echo "========================================"
else
    echo "No server logs found"
fi