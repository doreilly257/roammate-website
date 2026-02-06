#!/bin/bash

# Deploy to Surge.sh
# Requires: npm install -g surge

set -e

# Create a temporary deploy directory
DEPLOY_DIR=$(mktemp -d)

echo "Preparing deployment..."

# Copy only the files we want to deploy
cp index.html "$DEPLOY_DIR/"
cp privacy.html "$DEPLOY_DIR/"
cp terms.html "$DEPLOY_DIR/"
cp faq.html "$DEPLOY_DIR/"
cp favicon.svg "$DEPLOY_DIR/" 2>/dev/null || true
cp site.webmanifest "$DEPLOY_DIR/" 2>/dev/null || true
cp -r images "$DEPLOY_DIR/"
cp -r css "$DEPLOY_DIR/"
cp -r js "$DEPLOY_DIR/"
cp -r fonts "$DEPLOY_DIR/"

echo "Deploying to www.roammate.com..."
surge "$DEPLOY_DIR" www.roammate.com

# Clean up
rm -rf "$DEPLOY_DIR"

echo "Deployment complete!"
