#!/usr/bin/env bash
set -euo pipefail

API="${API_URL:-http://localhost:3000}"
ADMIN_USER="${ADMIN_USER:-admin}"
ADMIN_PASS="${ADMIN_PASS:-admin}"
COUNT="${COUNT:-100}"
BATCH="${BATCH:-10}"

TMPDIR=$(mktemp -d)
trap "rm -rf $TMPDIR" EXIT

echo "Logging in as $ADMIN_USER..."
TOKEN=$(curl -s -X POST "$API/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"username\":\"$ADMIN_USER\",\"password\":\"$ADMIN_PASS\"}" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))")

if [[ "$TOKEN" == "null" || -z "$TOKEN" ]]; then
  echo "Login failed — check ADMIN_USER / ADMIN_PASS"
  exit 1
fi

echo "Creating $COUNT tiny images ($BATCH at a time)..."

for ((i = 1; i <= COUNT; i++)); do
  python3 -c "
import struct, zlib
def make_png(path):
    sig = b'\\x89PNG\\r\\n\\x1a\\n'
    ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    ihdr_crc = zlib.crc32(b'IHDR' + ihdr_data) & 0xffffffff
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data + struct.pack('>I', ihdr_crc)
    raw = b'\\x00\\xff\\x00\\x00'
    compressed = zlib.compress(raw)
    idat_crc = zlib.crc32(b'IDAT' + compressed) & 0xffffffff
    idat = struct.pack('>I', len(compressed)) + b'IDAT' + compressed + struct.pack('>I', idat_crc)
    iend_crc = zlib.crc32(b'IEND') & 0xffffffff
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', iend_crc)
    with open(path, 'wb') as f:
        f.write(sig + ihdr + idat + iend)
make_png('$TMPDIR/img$i.png')
" 2>/dev/null

  curl -s -X POST "$API/upload" \
    -H "Authorization: Bearer $TOKEN" \
    -F "file=@$TMPDIR/img$i.png;type=image/png" > /dev/null &

  if (( i % BATCH == 0 )); then
    wait
    echo "  $i / $COUNT"
  fi
done
wait

echo "Done — $COUNT images uploaded."
