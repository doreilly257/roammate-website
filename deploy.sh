#!/bin/bash

# Deploy roammate.com to Cloudflare Pages.
# Requires: wrangler (run via npx) authenticated against the roammate
# Cloudflare account -- `npx wrangler login` once, or set CLOUDFLARE_API_TOKEN.
#
# Usage:
#   bash deploy.sh              # deploy to production (roammate.com)
#   bash deploy.sh --preview    # deploy a preview build to *.pages.dev only

set -euo pipefail

PROJECT_NAME="roammate"
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

BRANCH="main"
if [ "${1:-}" = "--preview" ]; then
  BRANCH="preview"
  echo "Preview deploy: this will NOT update roammate.com."
fi

cd roammate.com

# Builds without this key silently ship with analytics disabled, which is
# indistinguishable from a working deploy until PostHog goes quiet.
if [ ! -f .env ] || ! grep -q '^PUBLIC_POSTHOG_KEY=phc_' .env; then
  echo "ERROR: roammate.com/.env is missing a real PUBLIC_POSTHOG_KEY." >&2
  echo "Analytics would be silently disabled. See .env.example." >&2
  exit 1
fi

echo "Running validation..."
npm run validate

echo "Running tests..."
npm test

echo "Building Astro site..."
# npm run build runs scripts/normalize-sitemap.mjs, which merges Astro's
# sitemap shards into a single dist/sitemap.xml and removes the index.
npm run build
cd ..

echo "Deploying to Cloudflare Pages (project: $PROJECT_NAME, branch: $BRANCH)..."
npx wrangler pages deploy roammate.com/dist \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-dirty=true

echo "Deployment complete!"
if [ "$BRANCH" = "main" ]; then
  echo "Site live at: https://roammate.com"
else
  echo "Preview URL printed above (*.roammate-cs7.pages.dev)"
fi
