#!/usr/bin/env sh
# Non-secret smoke check: health + connector list + manifest.
# Usage: API_URL=http://localhost:4000 ./connectors/scripts/smoke.sh
set -eu
API_URL="${API_URL:-http://localhost:4000}"

snippet() {
  body="$1"
  max="$2"
  printf '%s' "$body" | head -c "$max"
}

printf 'GET %s/health\n' "$API_URL"
h="$(curl -sS -f "$API_URL/health")" || exit 1
snippet "$h" 200
printf '\n\nGET %s/api/connectors\n' "$API_URL"
c="$(curl -sS -f "$API_URL/api/connectors")" || exit 1
snippet "$c" 400
printf '\n\nGET %s/api/connectors/manifest\n' "$API_URL"
m="$(curl -sS -f "$API_URL/api/connectors/manifest")" || exit 1
snippet "$m" 600
printf '\n'
