#!/usr/bin/env bash
# Fails when an Android artifact is signed with the debug key (or not signed at all).
# Usage: tool/check_release_signing.sh path/to/app-prod-release.aab|.apk
set -euo pipefail
f="${1:?usage: check_release_signing.sh <aab|apk>}"
out="$(keytool -printcert -jarfile "$f" 2>&1 || true)"
if [[ -z "$out" || "$out" == *"Not a signed jar file"* ]]; then echo "NOT SIGNED: $f" >&2; exit 1; fi
if grep -qi "Android Debug" <<<"$out"; then echo "SIGNED WITH THE DEBUG KEY: $f" >&2; exit 1; fi
echo "signing OK: $(grep -m1 'Owner:' <<<"$out")"
