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
npm run build
# Astro generates sitemap-index.xml + sitemap-0.xml; merge into single sitemap.xml
cp dist/sitemap-0.xml dist/sitemap.xml 2>/dev/null || true
rm -f dist/sitemap-index.xml dist/sitemap-0.xml
cd ..

echo "Deploying to roammate.com..."
PATH="$HOME/.nvm/versions/node/v22.2.0/bin:$PATH" npx surge@0.23.1 roammate.com/dist roammate.com

echo "Deployment complete!"
echo "Site live at: https://roammate.com"
