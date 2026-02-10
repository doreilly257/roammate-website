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

# Copy static pages from www/ (privacy, terms) with their assets
echo "Copying static pages..."
cp www/privacy.html "$DEPLOY_DIR/" 2>/dev/null || true
cp www/terms.html "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CNAME "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CORS "$DEPLOY_DIR/" 2>/dev/null || true

# Copy supporting assets (css, js, images, fonts) needed by static pages
echo "Copying static page assets..."
cp -r www/css "$DEPLOY_DIR/" 2>/dev/null || true
cp -r www/js "$DEPLOY_DIR/" 2>/dev/null || true
cp -r www/images "$DEPLOY_DIR/" 2>/dev/null || true
cp -r www/fonts "$DEPLOY_DIR/" 2>/dev/null || true

echo "Deploying to www.roammate.com..."
surge "$DEPLOY_DIR" www.roammate.com

# Clean up
rm -rf "$DEPLOY_DIR"

echo "Deployment complete!"
echo "Site live at: https://www.roammate.com"
