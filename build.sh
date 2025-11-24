#!/usr/bin/env bash

set -e

# Check Node.js version
NODE_VERSION=$(node -v | cut -d'v' -f2)
REQUIRED_VERSION="22.0.0"

if [ "$(printf '%s\n' "$REQUIRED_VERSION" "$NODE_VERSION" | sort -V | head -n1)" != "$REQUIRED_VERSION" ]; then
    echo "Error: Node.js version $NODE_VERSION is less than required version $REQUIRED_VERSION"
    echo "Please upgrade to Node.js 22 or higher"
    exit 1
fi

echo "Using Node.js version: $NODE_VERSION"

# Build all packages with tsdown
echo "Building all packages with tsdown..."
node ./scripts/build-with-tsdown.js

# Run distribution build steps
node ./scripts/distro-configure.js --non-interactive
node ./scripts/distro-download-secrets.js
node ./scripts/distro-prepare.js
node ./scripts/distro-build.js
node ./scripts/distro-upload.js
