#!/bin/bash

# Deploy to Surge.sh
# Requires: npm install -g surge

set -e

# Create a temporary deploy directory
DEPLOY_DIR=$(mktemp -d)

echo "Preparing deployment..."

# Copy the current site files from www/
cp www/index.html "$DEPLOY_DIR/"
cp www/privacy.html "$DEPLOY_DIR/"
cp www/terms.html "$DEPLOY_DIR/"
cp www/faq.html "$DEPLOY_DIR/"
cp www/favicon.svg "$DEPLOY_DIR/" 2>/dev/null || true
cp www/site.webmanifest "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CNAME "$DEPLOY_DIR/" 2>/dev/null || true
cp www/CORS "$DEPLOY_DIR/" 2>/dev/null || true
cp -r www/images "$DEPLOY_DIR/"
cp -r www/css "$DEPLOY_DIR/"
cp -r www/js "$DEPLOY_DIR/"
cp -r www/fonts "$DEPLOY_DIR/"

# Build and copy the new Astro site
echo "Building new Astro site..."
cd new && npm run build && cd ..
echo "Copying new Astro site to /new/..."
cp -r new/dist "$DEPLOY_DIR/new"

echo "Deploying to www.roammate.com..."
surge "$DEPLOY_DIR" www.roammate.com

# Clean up
rm -rf "$DEPLOY_DIR"

echo "Deployment complete!"
echo "Current site: https://www.roammate.com"
echo "New design: https://www.roammate.com/new/"
