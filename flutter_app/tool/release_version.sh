#!/usr/bin/env bash
# Prints "--build-name=X.Y.Z --build-number=N" for `flutter build`.
#   name   = package.json version (same as the web app and the Capacitor builds)
#   number = commit count, the scheme scripts/sync-native-version.mjs uses for Capacitor, so store
#            build numbers keep increasing across the switch. Must be above the last Capacitor store
#            build (746 at 3.39.2; CHECK the store consoles). Override the floor with TT_MIN_BUILD_NUMBER.
set -euo pipefail
root="$(cd "$(dirname "$0")/../.." && pwd)"
name="$(node -p "require('$root/package.json').version")"
number="${TT_BUILD_NUMBER:-$(git -C "$root" rev-list --count HEAD)}"
floor="${TT_MIN_BUILD_NUMBER:-746}"
if ! [[ "$name" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then echo "package.json version '$name' is not x.y.z" >&2; exit 1; fi
if (( number <= floor )); then
  echo "build number $number is not above the last Capacitor build ($floor): the stores would reject the update" >&2
  exit 1
fi
echo "--build-name=$name --build-number=$number"
