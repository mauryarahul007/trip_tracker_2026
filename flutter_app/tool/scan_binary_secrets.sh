#!/usr/bin/env bash
# Looks for secrets inside a built APK / AAB / IPA (zip files). Exit 1 on a finding.
#  - private keys, service-account JSON, Stripe-style secret keys, FCM legacy server keys
#  - any JWT whose payload says role=service_role (the anon key is expected and allowed)
# Usage: tool/scan_binary_secrets.sh path/to/artifact
set -euo pipefail
f="${1:?usage: scan_binary_secrets.sh <apk|aab|ipa>}"
tmp="$(mktemp -d)"; trap 'rm -rf "$tmp"' EXIT
unzip -q -o "$f" -d "$tmp" || { echo "cannot unzip $f" >&2; exit 2; }
fail=0
strings_all() { find "$tmp" -type f -print0 | xargs -0 strings -n 8 2>/dev/null; }
if strings_all | grep -E -q 'BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY|"private_key"|"type": *"service_account"|sk_live_[0-9A-Za-z]{10,}|AAAA[A-Za-z0-9_-]{7}:APA91b[A-Za-z0-9_-]{100,}'; then
  echo "FOUND a private key, service account or server key" >&2; fail=1
fi
while read -r jwt; do
  payload="$(cut -d. -f2 <<<"$jwt" | tr '_-' '/+')"
  pad=$(( (4 - ${#payload} % 4) % 4 )); payload="$payload$(printf '=%.0s' $(seq 1 $pad))"
  if base64 -d <<<"$payload" 2>/dev/null | grep -q '"role" *: *"service_role"'; then
    echo "FOUND a service_role JWT" >&2; fail=1
  fi
done < <(strings_all | grep -E -o 'eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}' | sort -u)
if (( fail )); then exit 1; fi
echo "no secrets found in $(basename "$f")"
