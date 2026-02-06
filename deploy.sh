#!/bin/bash

# Deploy to Surge.sh
# Requires: npm install -g surge

set -e

# Create a temporary deploy directory
DEPLOY_DIR=$(mktemp -d)

echo "Preparing deployment..."

# Build the new Astro site
echo "Building Astro site..."
cd new && npm run build && cd ..

# Copy the built Astro site
echo "Copying Astro site..."
cp -r new/dist/* "$DEPLOY_DIR/"

# Copy static pages from www/ (privacy, terms)
echo "Copying static pages..."
cp www/privacy.html "$DEPLOY_DIR/" 2>/dev/null || true
cp www/terms.html "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CNAME "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CORS "$DEPLOY_DIR/" 2>/dev/null || true

echo "Deploying to www.roammate.com..."
surge "$DEPLOY_DIR" www.roammate.com

# Clean up
rm -rf "$DEPLOY_DIR"

echo "Deployment complete!"
echo "Site live at: https://www.roammate.com"
