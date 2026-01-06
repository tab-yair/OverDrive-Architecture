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

section "ADVANCED SEARCH TESTS (/:query format)"

PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=="

USER1_EMAIL="searchadv1${TS}@gmail.com"
USER2_EMAIL="searchadv2${TS}@gmail.com"

info "Creating test users..."
RESP1=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1_EMAIL\",\"password\":\"password123\",\"firstName\":\"SearchAdv1\",\"profileImage\":\"$PROFILE_IMG\"}")
USER1_ID=$(echo "$RESP1" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n ')

RESP2=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2_EMAIL\",\"password\":\"password123\",\"firstName\":\"SearchAdv2\",\"profileImage\":\"$PROFILE_IMG\"}")
USER2_ID=$(echo "$RESP2" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n ')

if [[ -n "$USER1_ID" && -n "$USER2_ID" ]]; then
    pass "Users created successfully"
else
    fail "User creation failed"
    exit 1
fi

info "Logging in users..."
TOKEN1=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

TOKEN2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

if [[ -n "$TOKEN1" && "$TOKEN1" != "null" && -n "$TOKEN2" && "$TOKEN2" != "null" ]]; then
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

# User 1 files
DOC1=$(create_file "$TOKEN1" "quarterly_report.txt" "docs" "CONFIDENTIAL Q4 2025 financial results and projections")
DOC2=$(create_file "$TOKEN1" "meeting_notes.txt" "docs" "Team meeting about project timeline and deliverables")
DOC3=$(create_file "$TOKEN1" "budget_analysis.txt" "docs" "Budget breakdown for marketing expenses Q1 2026")
PDF1=$(create_file "$TOKEN1" "annual_report.pdf" "pdf" "pdfdata1")
PDF2=$(create_file "$TOKEN1" "project_specifications.pdf" "pdf" "pdfdata2")
IMAGE1=$(create_file "$TOKEN1" "chart_revenue.png" "image" "base64imagedata1")
IMAGE2=$(create_file "$TOKEN1" "photo_team.jpg" "image" "base64imagedata2")
FOLDER1=$(create_file "$TOKEN1" "Reports" "folder" "")

# User 2 files (for shared testing)
DOC_USER2=$(create_file "$TOKEN2" "quarterly_summary.txt" "docs" "Q4 2025 summary for team review")

# Share a file from User1 to User2
curl -s -X POST "$BASE_URL/api/files/$DOC1/permissions" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

# Star some files
curl -s -X POST "$BASE_URL/api/files/$DOC1/star" \
    -H "Authorization: Bearer $TOKEN1" > /dev/null

curl -s -X POST "$BASE_URL/api/files/$PDF1/star" \
    -H "Authorization: Bearer $TOKEN1" > /dev/null

sleep 1

if [[ -n "$DOC1" && -n "$DOC2" && -n "$PDF1" ]]; then
    pass "Test files created and configured"
else
    fail "File creation failed"
    exit 1
fi

# ========================================
# NAME SEARCH TESTS (default: searches both name and content)
# ========================================
section "NAME SEARCH TESTS"

info "Testing basic search in name (default both)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1")
COUNT=$(echo "$RESULT" | jq '. | length')
if [[ "$COUNT" -ge 2 ]]; then
    pass "Search for 'report' finds multiple matches (found $COUNT)"
else
    fail "Search for 'report' should find at least 2 files, got $COUNT"
fi

info "Testing search only in name..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: name")
COUNT=$(echo "$RESULT" | jq '. | length')
if [[ "$COUNT" -ge 2 ]]; then
    pass "Name-only search for 'report' works (found $COUNT)"
else
    fail "Name-only search failed, got $COUNT"
fi

info "Testing search only in content..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: content")
HAS_DOC1=$(echo "$RESULT" | jq --arg id "$DOC1" 'any(.[]; .id == $id)')
if [[ "$HAS_DOC1" == "true" ]]; then
    pass "Content-only search for 'CONFIDENTIAL' works"
else
    fail "Content-only search failed"
fi

# ========================================
# TYPE FILTER TESTS
# ========================================
section "TYPE FILTER TESTS"

info "Testing search + type filter (pdf)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: name" \
    -H "x-filter-type: pdf")
ALL_PDF=$(echo "$RESULT" | jq 'all(.[]; .type == "pdf")')
if [[ "$ALL_PDF" == "true" ]]; then
    pass "Type filter (pdf) works"
else
    fail "Type filter (pdf) failed"
fi

info "Testing search + multiple types..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-type: pdf,docs")
ALL_VALID=$(echo "$RESULT" | jq 'all(.[]; .type == "pdf" or .type == "docs")')
if [[ "$ALL_VALID" == "true" ]]; then
    pass "Multiple type filter works"
else
    fail "Multiple type filter failed"
fi

info "Testing content search + docs filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/financial" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: content" \
    -H "x-filter-type: docs")
HAS_RESULTS=$(echo "$RESULT" | jq '. | length > 0')
if [[ "$HAS_RESULTS" == "true" ]]; then
    pass "Content search + docs filter works"
else
    fail "Content search + docs filter failed"
fi

# ========================================
# STARRED FILTER TESTS
# ========================================
section "STARRED FILTER TESTS"

info "Testing starred filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-starred: true")
ALL_STARRED=$(echo "$RESULT" | jq 'all(.[]; .isStarred == true)')
if [[ "$ALL_STARRED" == "true" ]]; then
    pass "Starred filter works"
else
    fail "Starred filter failed"
fi

info "Testing non-starred filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/meeting" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-starred: false")
ALL_NOT_STARRED=$(echo "$RESULT" | jq 'all(.[]; .isStarred == false)')
if [[ "$ALL_NOT_STARRED" == "true" ]]; then
    pass "Non-starred filter works"
else
    fail "Non-starred filter failed"
fi

info "Testing starred + type filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-starred: true" \
    -H "x-filter-type: pdf")
VALID=$(echo "$RESULT" | jq 'all(.[]; .isStarred == true and .type == "pdf")')
if [[ "$VALID" == "true" ]]; then
    pass "Starred + type filter works"
else
    fail "Starred + type filter failed"
fi

# ========================================
# OWNERSHIP FILTER TESTS
# ========================================
section "OWNERSHIP FILTER TESTS"

info "Testing owned filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-owner: owned")
ALL_OWNED=$(echo "$RESULT" | jq --arg uid "$USER1_ID" 'all(.[]; .ownerId == $uid)')
if [[ "$ALL_OWNED" == "true" ]]; then
    pass "Owned filter works"
else
    fail "Owned filter failed"
fi

info "Testing shared filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/quarterly" \
    -H "Authorization: Bearer $TOKEN2" \
    -H "x-filter-owner: shared")
HAS_SHARED=$(echo "$RESULT" | jq --arg id "$DOC1" 'any(.[]; .id == $id)')
if [[ "$HAS_SHARED" == "true" ]]; then
    pass "Shared filter works"
else
    fail "Shared filter failed - should find DOC1 shared from User1"
fi

# ========================================
# DATE FILTER TESTS
# ========================================
section "DATE FILTER TESTS"

info "Testing date category filter (today)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-date-category: today")
COUNT=$(echo "$RESULT" | jq '. | length')
if [[ "$COUNT" -ge 1 ]]; then
    pass "Date category (today) works (found $COUNT)"
else
    fail "Date category (today) failed"
fi

info "Testing date category filter (last7days)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-date-category: last7days")
COUNT=$(echo "$RESULT" | jq '. | length')
if [[ "$COUNT" -ge 1 ]]; then
    pass "Date category (last7days) works"
else
    fail "Date category (last7days) failed"
fi

# ========================================
# SHARED-WITH FILTER TESTS
# ========================================
section "SHARED-WITH FILTER TESTS"

info "Testing shared-with filter..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/quarterly" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-shared-with: $USER2_ID")
HAS_DOC1=$(echo "$RESULT" | jq --arg id "$DOC1" 'any(.[]; .id == $id)')
if [[ "$HAS_DOC1" == "true" ]]; then
    pass "Shared-with filter works"
else
    fail "Shared-with filter failed"
fi

# ========================================
# COMPLEX MULTI-FILTER TESTS
# ========================================
section "COMPLEX MULTI-FILTER TESTS"

info "Testing triple filter (search + type + starred)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-type: pdf" \
    -H "x-filter-starred: true")
VALID=$(echo "$RESULT" | jq 'all(.[]; .type == "pdf" and .isStarred == true)')
COUNT=$(echo "$RESULT" | jq '. | length')
if [[ "$VALID" == "true" && "$COUNT" -ge 1 ]]; then
    pass "Triple filter works (found $COUNT)"
else
    fail "Triple filter failed"
fi

info "Testing quintuple filter (all filters combined)..."
RESULT=$(curl -s -X GET "$BASE_URL/api/search/report" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: name" \
    -H "x-filter-type: docs,pdf" \
    -H "x-filter-owner: owned" \
    -H "x-filter-starred: true" \
    -H "x-filter-date-category: today")
ALL_VALID=$(echo "$RESULT" | jq --arg uid "$USER1_ID" 'all(.[]; .ownerId == $uid and .isStarred == true and (.type == "docs" or .type == "pdf"))')
if [[ "$ALL_VALID" == "true" ]]; then
    pass "Quintuple filter works"
else
    fail "Quintuple filter failed"
fi

# ========================================
# VALIDATION & ERROR TESTS
# ========================================
section "VALIDATION & ERROR TESTS"

info "Testing invalid search-in value..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/search/test" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-search-in: invalid")
if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid search-in returns 400"
else
    fail "Invalid search-in should return 400, got $HTTP_CODE"
fi

info "Testing invalid type..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/search/test" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-type: video")
if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid type returns 400"
else
    fail "Invalid type should return 400, got $HTTP_CODE"
fi

info "Testing invalid owner..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/search/test" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-owner: public")
if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid owner returns 400"
else
    fail "Invalid owner should return 400, got $HTTP_CODE"
fi

info "Testing invalid starred value..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET "$BASE_URL/api/search/test" \
    -H "Authorization: Bearer $TOKEN1" \
    -H "x-filter-starred: yes")
if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid starred value returns 400"
else
    fail "Invalid starred value should return 400, got $HTTP_CODE"
fi

# ========================================
# FINAL SUMMARY
# ========================================
section "FINAL SUMMARY"

TOTAL=$((TESTS_PASSED + TESTS_FAILED))
echo "Test Summary: $TESTS_PASSED/$TOTAL passed"
echo "Tests Passed: $TESTS_PASSED"
echo "Tests Failed: $TESTS_FAILED"

if [[ $TESTS_FAILED -eq 0 ]]; then
    echo -e "\n${GREEN}✓ PASS: All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ FAIL: Some tests failed${NC}"
    exit 1
fi
