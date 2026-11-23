#!/bin/bash
# Build the Expo web export for Cloudflare Pages' own CI.
#
# Unlike scripts/deploy-web.sh, this does NOT call `wrangler pages deploy` —
# Cloudflare's own build pipeline uploads the output directory (dist) itself
# after this script runs. It still needs the same node_modules rename/patch
# workaround: Cloudflare Pages silently excludes any directory literally
# named "node_modules" from uploads, and Expo's web export nests third-party
# font/icon assets under dist/assets/node_modules/..., so without this the
# web app 404s on those assets and hangs forever on the splash screen.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "==> Building web export..."
npx expo export --platform web

if [ -d dist/assets/node_modules ]; then
  echo "==> Renaming dist/assets/node_modules -> dist/assets/vendor_modules..."
  mv dist/assets/node_modules dist/assets/vendor_modules

  echo "==> Patching references to the old path..."
  while IFS= read -r f; do
    perl -pi -e 's#assets/node_modules#assets/vendor_modules#g' "$f"
  done < <(grep -rl "assets/node_modules" dist 2>/dev/null)
fi

echo "==> Build complete: dist"
