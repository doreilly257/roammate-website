#!/bin/bash

# Deploy to Surge.sh
# Requires: npm install -g surge

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

cd roammate.com

echo "Running validation..."
npm run validate

echo "Building Astro site..."
# npm run build runs scripts/normalize-sitemap.mjs, which merges Astro's
# sitemap shards into a single dist/sitemap.xml and removes the index.
npm run build
cd ..

echo "Deploying to roammate.com..."
PATH="$HOME/.nvm/versions/node/v22.2.0/bin:$PATH" npx surge@0.23.1 roammate.com/dist roammate.com

echo "Deployment complete!"
echo "Site live at: https://roammate.com"
