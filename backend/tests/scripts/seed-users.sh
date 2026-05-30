#!/usr/bin/env bash
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
COUNT="${COUNT:-100}"
BATCH="${BATCH:-10}"

echo "Logging in as $ADMIN_USER..."
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "Login failed — check ADMIN_USER / ADMIN_PASS"
  exit 1
fi

echo "Creating $COUNT users ($BATCH at a time)..."

for ((i = 1; i <= COUNT; i++)); do
  curl -s -X POST "$API/admin/users" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"test$i\",\"password\":\"pass123456\"}" > /dev/null &

  if (( i % BATCH == 0 )); then
    wait
    echo "  $i / $COUNT"
  fi
done
wait

echo "Done — $COUNT users created."
