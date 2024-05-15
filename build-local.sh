#!/bin/bash

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if npm is available
command -v npm >/dev/null 2>&1 || { echo >&2 "npm is not installed. Aborting."; exit 1; }

echo "Navigating to script directory: $SCRIPT_DIR"
cd "$SCRIPT_DIR"

echo "Installing dependencies..."
npm install

echo "Compiling..."
npm run compile

echo "Building Docker image..."
docker build -t govukpay/frontend:local .

echo "Build completed successfully."
