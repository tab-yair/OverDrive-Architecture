#!/bin/bash

BASE_URL="http://localhost:3000"
TESTS_PASSED=0
TESTS_FAILED=0
TS=$(date +%s%N | cut -b1-13)

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

section "ADVANCED FILTERING TESTS"

PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

USER1_EMAIL="filteruser1${TS}@gmail.com"
USER2_EMAIL="filteruser2${TS}@gmail.com"

info "Creating test users..."
RESP1=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1_EMAIL\",\"password\":\"password123\",\"firstName\":\"FilterUser1\",\"profileImage\":\"$PROFILE_IMG\"}")
USER1_ID=$(echo "$RESP1" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n ')

RESP2=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2_EMAIL\",\"password\":\"password123\",\"firstName\":\"FilterUser2\",\"profileImage\":\"$PROFILE_IMG\"}")
USER2_ID=$(echo "$RESP2" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n ')

if [[ -n "$USER1_ID" && -n "$USER2_ID" ]]; then
    pass "Users created successfully"
else
    fail "User creation failed"
    exit 1
fi

info "Logging in users..."
TOKEN_USER1=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

TOKEN_USER2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

if [[ -n "$TOKEN_USER1" && "$TOKEN_USER1" != "null" && -n "$TOKEN_USER2" && "$TOKEN_USER2" != "null" ]]; then
    pass "Login successful"
else
    fail "Login failed"
    exit 1
fi

info "Creating test files..."

create_file() {
    local TOKEN=$1
    local NAME=$2
    local TYPE=$3
    local CONTENT=$4
    
    if [ "$TYPE" = "folder" ]; then
        LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"$NAME\",\"type\":\"$TYPE\"}" 2>&1 \
            | grep -i "^Location:" | awk '{print $2}' | awk -F'/' '{print $NF}' | tr -d '\r\n ')
    else
        LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
            -H "Authorization: Bearer $TOKEN" \
            -H "Content-Type: application/json" \
            -d "{\"name\":\"$NAME\",\"type\":\"$TYPE\",\"content\":\"$CONTENT\"}" 2>&1 \
            | grep -i "^Location:" | awk '{print $2}' | awk -F'/' '{print $NF}' | tr -d '\r\n ')
    fi
    
    echo "$LOCATION"
}

IMAGE1=$(create_file "$TOKEN_USER1" "photo1.png" "image" "base64imagedata1")
IMAGE2=$(create_file "$TOKEN_USER1" "photo2.jpg" "image" "base64imagedata2")
PDF1=$(create_file "$TOKEN_USER1" "document1.pdf" "pdf" "pdfcontent1")
PDF2=$(create_file "$TOKEN_USER1" "document2.pdf" "pdf" "pdfcontent2")
DOC1=$(create_file "$TOKEN_USER1" "note1.txt" "docs" "doc content 1")
DOC2=$(create_file "$TOKEN_USER1" "note2.txt" "docs" "doc content 2")
FOLDER1=$(create_file "$TOKEN_USER1" "MyFolder" "folder" "")

PDF_SHARED=$(create_file "$TOKEN_USER2" "shared_doc.pdf" "pdf" "shared content")

curl -s -X POST "$BASE_URL/api/files/$PDF_SHARED/permissions" \
    -H "Authorization: Bearer $TOKEN_USER2" \
    -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$USER1_ID\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

curl -s -X POST "$BASE_URL/api/files/$IMAGE1/star" -H "Authorization: Bearer $TOKEN_USER1" > /dev/null
curl -s -X POST "$BASE_URL/api/files/$PDF1/star" -H "Authorization: Bearer $TOKEN_USER1" > /dev/null
curl -s -X POST "$BASE_URL/api/files/$DOC1/star" -H "Authorization: Bearer $TOKEN_USER1" > /dev/null

pass "Test files created and configured"

section "TYPE FILTERING"

info "Testing single type filter (image)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: image" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png" && echo "$RESPONSE" | grep -q "photo2.jpg" && ! echo "$RESPONSE" | grep -q "document1.pdf"; then
    pass "Single type filter works"
else
    fail "Single type filter failed"
fi

info "Testing multiple type filter (image,pdf)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: image,pdf" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png" && echo "$RESPONSE" | grep -q "document1.pdf" && ! echo "$RESPONSE" | grep -q "note1.txt"; then
    pass "Multiple type filter works"
else
    fail "Multiple type filter failed"
fi

info "Testing folder type filter..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: folder" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "MyFolder" && ! echo "$RESPONSE" | grep -q "photo1.png"; then
    pass "Folder type filter works"
else
    fail "Folder type filter failed"
fi

section "OWNERSHIP FILTERING"

info "Testing ownership filter (owned)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-ownership: owned" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png" && ! echo "$RESPONSE" | grep -q "shared_doc.pdf"; then
    pass "Ownership filter (owned) works"
else
    fail "Ownership filter (owned) failed"
fi

info "Testing ownership filter (shared)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-ownership: shared" \
    "$BASE_URL/api/files")

if ! echo "$RESPONSE" | grep -q "photo1.png"; then
    pass "Ownership filter (shared) excludes owned files"
else
    fail "Ownership filter (shared) failed"
fi

section "COMBINED FILTERS"

info "Testing combined type and ownership filters..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: pdf" \
    -H "x-filter-ownership: owned" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "document1.pdf" && ! echo "$RESPONSE" | grep -q "photo1.png"; then
    pass "Combined type+ownership filter works"
else
    fail "Combined filter failed"
fi

info "Testing filter on starred files endpoint..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: image" \
    "$BASE_URL/api/files/starred")

if echo "$RESPONSE" | grep -q "photo1.png" && ! echo "$RESPONSE" | grep -q "document1.pdf"; then
    pass "Starred files filter works"
else
    fail "Starred files filter failed"
fi

section "VALIDATION TESTS"

info "Testing no filters (should return all files)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    "$BASE_URL/api/files")

COUNT=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
if [ "$COUNT" -ge 7 ]; then
    pass "No filters returns all files"
else
    fail "No filters failed (got $COUNT files)"
fi

info "Testing invalid file type..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: video" \
    "$BASE_URL/api/files")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass "Invalid file type returns 400"
else
    fail "Invalid file type validation failed"
fi

info "Testing invalid ownership value..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-ownership: public" \
    "$BASE_URL/api/files")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass "Invalid ownership value returns 400"
else
    fail "Invalid ownership validation failed"
fi

info "Testing invalid date category..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-date-category: yesterday" \
    "$BASE_URL/api/files")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass "Invalid date category returns 400"
else
    fail "Invalid date validation failed"
fi

info "Testing incomplete custom date range..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-date-start: 2024-01-01T00:00:00.000Z" \
    "$BASE_URL/api/files")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    pass "Incomplete date range returns 400"
else
    fail "Incomplete date range validation failed"
fi

section "DATE & FORMAT TESTS"

info "Testing date filter (today)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-date-category: today" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png"; then
    pass "Date filter (today) works"
else
    fail "Date filter (today) failed"
fi

info "Testing date filter (last7days)..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-date-category: last7days" \
    "$BASE_URL/api/files")

COUNT=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
if [ "$COUNT" -ge 5 ]; then
    pass "Date filter (last7days) works"
else
    fail "Date filter (last7days) failed"
fi

info "Testing custom date range filter..."
START_DATE=$(date -u -d "30 days ago" +"%Y-%m-%dT00:00:00.000Z" 2>/dev/null || date -u -v-30d +"%Y-%m-%dT00:00:00.000Z")
END_DATE=$(date -u +"%Y-%m-%dT23:59:59.999Z")

RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-date-start: $START_DATE" \
    -H "x-filter-date-end: $END_DATE" \
    "$BASE_URL/api/files")

COUNT=$(echo "$RESPONSE" | grep -o '"id":"[^"]*"' | wc -l)
if [ "$COUNT" -ge 5 ]; then
    pass "Custom date range filter works"
else
    fail "Custom date range filter failed"
fi

info "Testing case-insensitive filter values..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: IMAGE" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png"; then
    pass "Case-insensitive filter works"
else
    fail "Case-insensitive filter failed"
fi

info "Testing whitespace handling..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type:  image , pdf  " \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "photo1.png" && echo "$RESPONSE" | grep -q "document1.pdf"; then
    pass "Whitespace trimming works"
else
    fail "Whitespace trimming failed"
fi

info "Testing empty result with conflicting filters..."
RESPONSE=$(curl -s -w "\n%{http_code}" -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: folder" \
    -H "x-filter-ownership: shared" \
    "$BASE_URL/api/files")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)

if [ "$HTTP_CODE" = "200" ] && echo "$BODY" | grep -q '^\[\]$'; then
    pass "Empty result returns 200 with empty array"
else
    fail "Empty result handling failed"
fi

section "SPECIAL CASES"

info "Testing trash endpoint ignores ownership filter..."
curl -s -X DELETE -H "Authorization: Bearer $TOKEN_USER1" "$BASE_URL/api/files/$DOC2" > /dev/null

RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-ownership: shared" \
    "$BASE_URL/api/files/trash")

if echo "$RESPONSE" | grep -q "note2.txt"; then
    pass "Trash endpoint ignores ownership filter"
else
    fail "Trash endpoint ownership filter handling failed"
fi

curl -s -X POST -H "Authorization: Bearer $TOKEN_USER1" "$BASE_URL/api/files/trash/$DOC2/restore" > /dev/null

info "Testing triple filter combination..."
RESPONSE=$(curl -s -H "Authorization: Bearer $TOKEN_USER1" \
    -H "x-filter-type: pdf" \
    -H "x-filter-date-category: last7days" \
    -H "x-filter-ownership: owned" \
    "$BASE_URL/api/files")

if echo "$RESPONSE" | grep -q "document1.pdf"; then
    pass "Triple filter combination works"
else
    fail "Triple filter combination failed"
fi

section "FINAL SUMMARY"
echo -e "Test Summary: ${TESTS_PASSED}/${TESTS_PASSED} passed"
echo -e "Tests Passed: ${TESTS_PASSED}"
echo -e "Tests Failed: ${TESTS_FAILED}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    pass "All tests passed!"
    exit 0
else
    fail "Some tests failed!"
    exit 1
fi
