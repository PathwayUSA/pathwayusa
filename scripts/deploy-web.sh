#!/bin/bash
# Build the Expo web export and deploy it to Cloudflare Pages (pathwayusa-app).
#
# Works around a Cloudflare Pages default: it silently excludes any directory
# literally named "node_modules" from uploads. Expo's web export nests
# third-party font/icon assets under dist/assets/node_modules/..., so without
# this rename most of those files never get uploaded — they 404, Pages'
# SPA fallback serves index.html in their place, and the app hangs on the
# splash screen trying to parse HTML as a font/asset.
set -euo pipefail
cd "$(dirname "$0")/.."

if [ -z "${CLOUDFLARE_API_TOKEN:-}" ]; then
  echo "Error: CLOUDFLARE_API_TOKEN is not set." >&2
  echo "Export it first: export CLOUDFLARE_API_TOKEN=..." >&2
  exit 1
fi

echo "==> Building web export..."
rm -rf dist
npx expo export --platform web

if [ -d dist/assets/node_modules ]; then
  echo "==> Renaming dist/assets/node_modules -> dist/assets/vendor_modules..."
  mv dist/assets/node_modules dist/assets/vendor_modules

  echo "==> Patching references to the old path..."
  while IFS= read -r f; do
    perl -pi -e 's#assets/node_modules#assets/vendor_modules#g' "$f"
  done < <(grep -rl "assets/node_modules" dist 2>/dev/null)
fi

echo "==> Deploying to Cloudflare Pages (pathwayusa-app)..."
npx wrangler pages deploy dist --project-name=pathwayusa-app --branch=main --commit-dirty=true

echo "==> Done. Live at https://pathwayusa-app.pages.dev"
