#!/bin/bash

# Function to handle cleanup on shutdown
cleanup() {
    echo "Stopping processes..."
    kill -TERM "$BACKEND_PID" 2>/dev/null
    exit 0
}

# Trap termination signals
trap cleanup SIGTERM SIGINT

# Start FastAPI backend (Uvicorn)
echo "Starting FastAPI backend on port 8000..."
cd /app/backend && uvicorn app.main:app --host 0.0.0.0 --port 8000 &
BACKEND_PID=$!

# Start Nginx
echo "Starting Nginx on port 80..."
nginx -g "daemon off;" &
NGINX_PID=$!

# Wait for processes
wait -n "$BACKEND_PID" "$NGINX_PID"

# Exit with status of the process that exited first
exit $?
