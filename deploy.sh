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
if [ "$#" -gt 1 ] || { [ "$#" -eq 1 ] && [ "$1" != "--preview" ]; }; then
  echo "Usage: bash deploy.sh [--preview]" >&2
  exit 2
fi
if [ "${1:-}" = "--preview" ]; then
  BRANCH="preview"
  echo "Preview deploy: this will NOT update roammate.com."
fi

echo "Verifying Cloudflare authentication..."
npx --yes wrangler@4.131.1 whoami
echo "Checking nonce middleware..."
node --test infra/csp-nonce/*.test.mjs
roammate.com/node_modules/.bin/tsc --allowJs --checkJs --noEmit --target ES2022 --module ESNext --lib ES2022,DOM --skipLibCheck infra/csp-nonce/functions/_middleware.js

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

# Heavy steps run at background priority (macOS taskpolicy -b) so a deploy on
# this shared 8 GB Mac doesn't starve other sessions' builds and tests.
BG=""
command -v taskpolicy >/dev/null 2>&1 && BG="taskpolicy -b"

echo "Running tests..."
$BG npm test

echo "Checking Astro types..."
$BG npx --no-install astro check

echo "Building Astro site..."
# npm run build runs scripts/normalize-sitemap.mjs, which merges Astro's
# sitemap shards into a single dist/sitemap.xml and removes the index.
$BG npm run build
node scripts/check-claims.mjs --all
cd ..

# Deploy the reviewed middleware from an isolated assembly so Astro's output
# and public/ remain static. Future normal deployments must retain this fix.
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/roammate-pages.XXXXXX")"
trap 'rm -rf "$STAGE"' EXIT
cp -R "$SCRIPT_DIR/roammate.com/dist" "$STAGE/dist"
cp -R "$SCRIPT_DIR/infra/csp-nonce/functions" "$STAGE/functions"
cp "$SCRIPT_DIR/infra/csp-nonce/_routes.json" "$STAGE/dist/_routes.json"
COMMIT_HASH="$(git rev-parse HEAD)"
cd "$STAGE"

echo "Deploying to Cloudflare Pages (project: $PROJECT_NAME, branch: $BRANCH)..."
npx --yes wrangler@4.131.1 pages deploy dist \
  --project-name="$PROJECT_NAME" \
  --branch="$BRANCH" \
  --commit-hash="$COMMIT_HASH" \
  --commit-dirty=true

echo "Deployment complete!"
if [ "$BRANCH" = "main" ]; then
  echo "Site live at: https://roammate.com"
else
  echo "Preview URL printed above (*.roammate-cs7.pages.dev)"
fi
