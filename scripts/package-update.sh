#!/usr/bin/env bash
set -euo pipefail

# Packages dist/ into a versioned zip + manifest for the self-hosted
# live-update flow read by src/utils/liveUpdate.ts (via @capgo/capacitor-updater).
#
# Usage: scripts/package-update.sh <version> <public-base-url> <output-dir> [dist-dir]
# Example: scripts/package-update.sh abc1234 https://trip-tracker.blackmaroon.in/updates update dist

VERSION="${1:?version required}"
BASE_URL="${2:?public base url required}"
OUT_DIR="${3:?output dir required}"
DIST_DIR="${4:-dist}"

mkdir -p "$OUT_DIR"
OUT_DIR_ABS="$(cd "$OUT_DIR" && pwd)"
ZIP_NAME="${VERSION}.zip"
ZIP_PATH_ABS="${OUT_DIR_ABS}/${ZIP_NAME}"

rm -f "$ZIP_PATH_ABS"
# App files must sit at the zip root (not wrapped in a "dist" folder) per
# the capacitor-updater download() contract.
(cd "$DIST_DIR" && zip -rq "$ZIP_PATH_ABS" .)

CHECKSUM=$(shasum -a 256 "$ZIP_PATH_ABS" | awk '{print $1}')

cat > "${OUT_DIR_ABS}/latest.json" <<EOF
{
  "version": "${VERSION}",
  "url": "${BASE_URL}/${ZIP_NAME}",
  "checksum": "${CHECKSUM}"
}
EOF

echo "Packaged ${ZIP_PATH_ABS} (checksum ${CHECKSUM})"
