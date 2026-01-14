#!/bin/bash
# Test script for Permission Synchronization on Move
# Covers:
# 1. Move to root removes inherited access
# 2. Move to new parent rebuilds inheritance
# 3. Recursive folder move updates children
# 4. Direct permission persists across move
# 5. Move to root on folder removes inherited for subtree

BASE_URL="http://localhost:3000"
TESTS_PASSED=0
TESTS_FAILED=0
TS=$(date +%s%N | cut -b1-13)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓ PASS${NC}: $1"; ((TESTS_PASSED++)); }
fail() { echo -e "${RED}✗ FAIL${NC}: $1"; ((TESTS_FAILED++)); }
info() { echo -e "${YELLOW}➜${NC} $1"; }
section() {
  echo -e "\n${BLUE}======================================${NC}"
  echo -e "${BLUE}  $1${NC}"
  echo -e "${BLUE}======================================${NC}"
}
extract_id() {
  local header=$1
  echo "$header" | grep -i "Location:" | sed 's/.*\/\([^/]*\)$/\1/' | tr -d '\r\n '
}

section "SETUP: Users and Base Folders"

# Create users
OWNER_EMAIL="owner${TS}@gmail.com"
EDITOR_EMAIL="editor${TS}@gmail.com"
VIEWER_EMAIL="viewer${TS}@gmail.com"
NEWUSER_EMAIL="newuser${TS}@gmail.com"
DIRECT_EMAIL="direct${TS}@gmail.com"

# Minimal 1x1 PNG as Base64 for required profileImage
PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

OWNER_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" -H "Content-Type: application/json" -d "{\"username\":\"$OWNER_EMAIL\",\"password\":\"password12345678\",\"firstName\":\"Owner\",\"profileImage\":\"$PROFILE_IMG\"}")
EDITOR_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" -H "Content-Type: application/json" -d "{\"username\":\"$EDITOR_EMAIL\",\"password\":\"password12345678\",\"firstName\":\"Editor\",\"profileImage\":\"$PROFILE_IMG\"}")
VIEWER_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" -H "Content-Type: application/json" -d "{\"username\":\"$VIEWER_EMAIL\",\"password\":\"password12345678\",\"firstName\":\"Viewer\",\"profileImage\":\"$PROFILE_IMG\"}")
NEWUSER_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" -H "Content-Type: application/json" -d "{\"username\":\"$NEWUSER_EMAIL\",\"password\":\"password12345678\",\"firstName\":\"NewUser\",\"profileImage\":\"$PROFILE_IMG\"}")
DIRECT_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" -H "Content-Type: application/json" -d "{\"username\":\"$DIRECT_EMAIL\",\"password\":\"password12345678\",\"firstName\":\"Direct\",\"profileImage\":\"$PROFILE_IMG\"}")

OWNER_ID=$(extract_id "$OWNER_RESP"); EDITOR_ID=$(extract_id "$EDITOR_RESP"); VIEWER_ID=$(extract_id "$VIEWER_RESP"); NEWUSER_ID=$(extract_id "$NEWUSER_RESP"); DIRECT_ID=$(extract_id "$DIRECT_RESP")

if [[ -n "$OWNER_ID" && -n "$EDITOR_ID" && -n "$VIEWER_ID" && -n "$NEWUSER_ID" && -n "$DIRECT_ID" ]]; then
  pass "Users created"
else
  fail "User creation failed"; exit 1
fi

# Login
OWNER_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" -H "Content-Type: application/json" -d "{\"username\":\"$OWNER_EMAIL\",\"password\":\"password12345678\"}" | jq -r '.token')
EDITOR_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" -H "Content-Type: application/json" -d "{\"username\":\"$EDITOR_EMAIL\",\"password\":\"password12345678\"}" | jq -r '.token')
VIEWER_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" -H "Content-Type: application/json" -d "{\"username\":\"$VIEWER_EMAIL\",\"password\":\"password12345678\"}" | jq -r '.token')
NEWUSER_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" -H "Content-Type: application/json" -d "{\"username\":\"$NEWUSER_EMAIL\",\"password\":\"password12345678\"}" | jq -r '.token')
DIRECT_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" -H "Content-Type: application/json" -d "{\"username\":\"$DIRECT_EMAIL\",\"password\":\"password12345678\"}" | jq -r '.token')

if [[ -n "$OWNER_TOKEN" && -n "$EDITOR_TOKEN" && -n "$VIEWER_TOKEN" && -n "$NEWUSER_TOKEN" && -n "$DIRECT_TOKEN" ]]; then
  pass "Tokens issued"
else
  fail "Login failed"; exit 1
fi

# Create parent folders A and B
PARENT_A_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"name":"ParentA","type":"folder"}')
PARENT_A_ID=$(extract_id "$PARENT_A_RESP")
PARENT_B_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"name":"ParentB","type":"folder"}')
PARENT_B_ID=$(extract_id "$PARENT_B_RESP")

if [[ -n "$PARENT_A_ID" && -n "$PARENT_B_ID" ]]; then
  pass "Parents created"
else
  fail "Parent creation failed"; exit 1
fi

# Create subtree under ParentA
SUB_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"SubFolder\",\"type\":\"folder\",\"parentId\":\"$PARENT_A_ID\"}")
SUB_ID=$(extract_id "$SUB_RESP")
FILE1_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Doc1.txt\",\"type\":\"docs\",\"parentId\":\"$SUB_ID\",\"content\":\"Alpha\"}")
FILE1_ID=$(extract_id "$FILE1_RESP")
FILE2_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Doc2.txt\",\"type\":\"docs\",\"parentId\":\"$SUB_ID\",\"content\":\"Beta\"}")
FILE2_ID=$(extract_id "$FILE2_RESP")

if [[ -n "$SUB_ID" && -n "$FILE1_ID" && -n "$FILE2_ID" ]]; then
  pass "Subtree created"
else
  fail "Subtree creation failed"; exit 1
fi

# Share ParentA with Editor (EDITOR) and Viewer (VIEWER)
EDITOR_PERM_A=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_A_ID/permissions" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$EDITOR_ID\",\"permissionLevel\":\"EDITOR\"}")
VIEWER_PERM_A=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_A_ID/permissions" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$VIEWER_ID\",\"permissionLevel\":\"VIEWER\"}")

sleep 1

section "TEST 1: Move file to root removes inherited access"

# Verify Editor can read FILE1 before move
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $EDITOR_TOKEN" | tail -n1)
if [[ "$HTTP_CODE" == "200" ]]; then pass "Editor can read before move"; else fail "Editor should read before move"; fi

# Move FILE1 to root
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"parentId":null}' | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then pass "Moved file to root"; else fail "Move to root failed"; fi
sleep 1

# Editor should lose access
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $EDITOR_TOKEN" | tail -n1)
if [[ "$HTTP_CODE" == "403" ]]; then pass "Editor lost access after move to root"; else fail "Editor should not access after move"; fi

section "TEST 2: Move to new parent rebuilds inheritance"

# Share ParentB with NEWUSER as VIEWER
NEWUSER_PERM_B=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_B_ID/permissions" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$NEWUSER_ID\",\"permissionLevel\":\"VIEWER\"}")
sleep 1

# Move FILE1 under ParentB
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"parentId\":\"$PARENT_B_ID\"}" | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then pass "Moved file to ParentB"; else fail "Move to ParentB failed"; fi
sleep 1

# NEWUSER should gain read access
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $NEWUSER_TOKEN" | tail -n1)
if [[ "$HTTP_CODE" == "200" ]]; then pass "NewUser gained access via ParentB"; else fail "NewUser should access after move"; fi

section "TEST 3: Recursive folder move updates children"

# Share ParentB with Viewer as EDITOR
VIEWER_PERM_B=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_B_ID/permissions" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$VIEWER_ID\",\"permissionLevel\":\"EDITOR\"}")
sleep 1

# Before move: Viewer should NOT be able to edit FILE2 (still under ParentA with VIEWER)
RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE2_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Pre-move edit attempt by viewer"}')
HTTP_CODE_PM=$(echo "$RESP" | tail -n1)
if [[ "$HTTP_CODE_PM" == "403" ]]; then
  pass "Viewer cannot edit child before move (VIEWER on ParentA)"
else
  fail "Viewer should not be able to edit before move (HTTP $HTTP_CODE_PM)"
fi

# Move SubFolder under ParentB
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$SUB_ID" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"parentId\":\"$PARENT_B_ID\"}" | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then pass "Moved folder to ParentB"; else fail "Move folder failed"; fi
sleep 1

# Viewer should have access to children under SubFolder
HTTP_CODE1=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $VIEWER_TOKEN" | tail -n1)
if [[ "$HTTP_CODE1" == "200" ]]; then pass "Viewer has access to child after move"; else fail "Viewer should access child"; fi

# After move: Viewer SHOULD be able to edit FILE2 (EDITOR via ParentB)
RESP2=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE2_ID" \
  -H "Authorization: Bearer $VIEWER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Post-move edit by viewer (EDITOR)"}')
HTTP_CODE_AM=$(echo "$RESP2" | tail -n1)
if [[ "$HTTP_CODE_AM" == "204" ]]; then
  pass "Viewer can edit child after move (EDITOR via ParentB)"
else
  fail "Viewer should be able to edit after move (HTTP $HTTP_CODE_AM)"
fi

section "TEST 4: Direct permission persists across move"

# Create a new file under ParentA and give DIRECT user direct VIEWER
FILE3_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"DirectDoc.txt\",\"type\":\"docs\",\"parentId\":\"$PARENT_A_ID\",\"content\":\"Gamma\"}")
FILE3_ID=$(extract_id "$FILE3_RESP")
ADD_DIRECT=$(curl -s -i -X POST "$BASE_URL/api/files/$FILE3_ID/permissions" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$DIRECT_ID\",\"permissionLevel\":\"VIEWER\"}")
sleep 1

# Move FILE3 to root
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE3_ID" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"parentId":null}' | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then pass "Moved direct-permission file to root"; else fail "Move direct file failed"; fi
sleep 1

# DIRECT user should still access
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE3_ID" -H "Authorization: Bearer $DIRECT_TOKEN" | tail -n1)
if [[ "$HTTP_CODE" == "200" ]]; then pass "Direct permission persisted after move"; else fail "Direct should persist"; fi

section "TEST 5: Move folder to root removes inherited across subtree"

# Move SubFolder to root
HTTP_CODE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$SUB_ID" -H "Authorization: Bearer $OWNER_TOKEN" -H "Content-Type: application/json" -d '{"parentId":null}' | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then pass "Moved folder to root"; else fail "Move folder to root failed"; fi
sleep 1

# Viewer should lose access to child FILE2
HTTP_CODE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $VIEWER_TOKEN" | tail -n1)
if [[ "$HTTP_CODE2" == "403" ]]; then pass "Viewer lost access to subtree after move to root"; else fail "Viewer should not access after move to root"; fi

section "SUMMARY"
TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo "Test Summary: $TESTS_PASSED/$TOTAL passed"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"

if [[ $TESTS_FAILED -eq 0 ]]; then
  echo -e "\n${GREEN}✓ All tests passed!${NC}"
  exit 0
else
  echo -e "\n${RED}✗ $TESTS_FAILED test(s) failed${NC}"
  exit 1
fi
