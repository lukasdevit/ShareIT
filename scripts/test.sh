#!/bin/bash
set -euo pipefail

BASE="${1:-http://localhost:3000}"
PASS=0
FAIL=0

green() { echo -e "\033[32m$1\033[0m"; }
red()   { echo -e "\033[31m$1\033[0m"; }
bold()  { echo -e "\n\033[1m=== $1 ===\033[0m"; }

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$actual" -eq "$expected" ]; then
    green "  ✓ $desc (HTTP $actual)"
    PASS=$((PASS + 1))
  else
    red "  ✗ $desc — expected HTTP $expected, got $actual"
    FAIL=$((FAIL + 1))
  fi
}

# -------------------- Setup test files --------------------
echo "text file" > /tmp/test_allowed.txt
echo "fake binary" > /tmp/test_blocked.exe
echo 'X5O!P%@AP[4\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*' > /tmp/eicar.txt

# -------------------- Test 1: Upload allowed file type --------------------
bold "Test 1 — Upload text/plain (should pass)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -F "file=@/tmp/test_allowed.txt;type=text/plain")
assert_status "text/plain upload" 200 "$HTTP"

# -------------------- Test 2: Upload disallowed file type --------------------
bold "Test 2 — Upload application/x-msdownload (should 415)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -F "file=@/tmp/test_blocked.exe;type=application/x-msdownload")
assert_status "exe block" 415 "$HTTP"

# -------------------- Test 3: Upload without file --------------------
bold "Test 3 — No file attached (should 400)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -X POST)
assert_status "missing file" 406 "$HTTP"

# -------------------- Test 4: EICAR virus test --------------------
bold "Test 4 — EICAR virus file (should fail)"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/upload" -F "file=@/tmp/eicar.txt;type=text/plain")
assert_status "eicar detected" 500 "$HTTP"

# -------------------- Test 5: List files --------------------
bold "Test 5 — GET /files"
HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/files")
BODY=$(curl -s "$BASE/files")
assert_status "list files" 200 "$HTTP"
echo "  Response: $BODY"

# -------------------- Test 6: Static file serve --------------------
bold "Test 6 — Serve uploaded file via /file/:name"
FILE_COUNT=$(echo "$BODY" | grep -o '"filename"' | wc -l)
if [ "$FILE_COUNT" -gt 0 ]; then
  FIRST_FILE=$(echo "$BODY" | grep -oP '"filename":"\K[^"]+' | head -1)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/file/$FIRST_FILE")
  assert_status "serve file /file/$FIRST_FILE" 200 "$HTTP"
else
  echo "  ⚠ No files to test serving — upload one first"
fi

# -------------------- Test 7: Delete file --------------------
bold "Test 7 — DELETE /file/:id"
if [ "$FILE_COUNT" -gt 0 ]; then
  FIRST_ID=$(echo "$BODY" | grep -oP '"id":\K\d+' | head -1)
  HTTP=$(curl -s -o /dev/null -w "%{http_code}" -X DELETE "$BASE/file/$FIRST_ID")
  assert_status "delete file id=$FIRST_ID" 200 "$HTTP"

  # Verify it's gone
  VERIFY=$(curl -s "$BASE/files" | grep -c "\"id\":$FIRST_ID" || true)
  if [ "$VERIFY" -eq 0 ]; then
    green "  ✓ file removed from list"
  else
    red "  ✗ file still in list after delete"
    FAIL=$((FAIL + 1))
  fi
else
  echo "  ⚠ No files to test delete — upload one first"
fi

# -------------------- Cleanup --------------------
rm -f /tmp/test_allowed.txt /tmp/test_blocked.exe /tmp/eicar.txt

# -------------------- Summary --------------------
bold "Results"
echo "  Passed: $PASS | Failed: $FAIL"
[ "$FAIL" -eq 0 ] && green "  All tests passed!" || red "  Some tests failed"
exit "$FAIL"
