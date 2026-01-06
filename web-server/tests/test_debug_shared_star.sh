#!/bin/bash

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

pass() {
    TESTS_PASSED=$((TESTS_PASSED + 1))
    echo -e "${GREEN}✓ PASS${NC}: $1"
}

fail() {
    TESTS_FAILED=$((TESTS_FAILED + 1))
    echo -e "${RED}✗ FAIL${NC}: $1"
}

info() {
    echo -e "${YELLOW}➜${NC} $1"
}

# Print summary at exit
print_summary() {
    echo ""
    echo "=========================================="
    TOTAL=$((TESTS_PASSED + TESTS_FAILED))
    echo "Test Summary: $TESTS_PASSED/$TOTAL passed"
    if [ $TESTS_FAILED -eq 0 ]; then
        echo -e "${GREEN}All tests passed!${NC}"
        exit 0
    else
        echo -e "${RED}$TESTS_FAILED test(s) failed${NC}"
        exit 1
    fi
}

trap print_summary EXIT

echo "=========================================="
echo "Debug: Shared and Starred Files Test"
echo "=========================================="
echo ""

# Generate unique usernames
RANDOM_ID=$(date +%s%N)
USER1="user1test${RANDOM_ID}@gmail.com"
USER2="user2test${RANDOM_ID}@gmail.com"

# Create users
info "Creating User 1..."
curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1\",\"password\":\"pass1234\",\"firstName\":\"User1\",\"profileImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"}" > /dev/null

TOKEN1=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER1\",\"password\":\"pass1234\"}" | jq -r '.token')
echo "User 1 token: $TOKEN1"

sleep 0.5

echo "Creating User 2..."
curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2\",\"password\":\"pass1234\",\"firstName\":\"User2\",\"profileImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"}" > /dev/null

TOKEN2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$USER2\",\"password\":\"pass1234\"}" | jq -r '.token')
echo "User 2 token: $TOKEN2"

sleep 0.5

# Get User IDs
echo "Getting User IDs..."
DUMMY1=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"dummy1.txt","type":"docs","content":"x"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
USER1_ID=$(curl -s -X GET "$BASE_URL/api/files/$DUMMY1" -H "Authorization: Bearer $TOKEN1" | jq -r '.ownerId')
curl -s -X DELETE "$BASE_URL/api/files/$DUMMY1" -H "Authorization: Bearer $TOKEN1" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/trash/$DUMMY1" -H "Authorization: Bearer $TOKEN1" > /dev/null

DUMMY2=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"name":"dummy2.txt","type":"docs","content":"x"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
USER2_ID=$(curl -s -X GET "$BASE_URL/api/files/$DUMMY2" -H "Authorization: Bearer $TOKEN2" | jq -r '.ownerId')
curl -s -X DELETE "$BASE_URL/api/files/$DUMMY2" -H "Authorization: Bearer $TOKEN2" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/trash/$DUMMY2" -H "Authorization: Bearer $TOKEN2" > /dev/null

echo "User 1 ID: $USER1_ID"
echo "User 2 ID: $USER2_ID"

sleep 0.5

# User 1 creates file
echo "Creating file..."
FILE_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"shared-test.txt","type":"docs","content":"Shared content"}')

FILE_ID=$(echo "$FILE_RESPONSE" | grep -i "^location:" | sed 's/.*\///;s/\r//')
echo "Created file: $FILE_ID"

sleep 0.5

# Grant VIEWER to User 2
echo "Granting permission..."
PERM_RESPONSE=$(curl -s -i -X POST "$BASE_URL/api/files/$FILE_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"VIEWER\"}")

PERM_ID=$(echo "$PERM_RESPONSE" | grep -i "^location:" | sed 's/.*\///;s/\r//')
echo "Permission granted: $PERM_ID"

sleep 0.5

# User 2 stars the file
echo "User 2 starring file..."
STAR_RESULT=$(curl -s -X POST "$BASE_URL/api/files/$FILE_ID/star" \
  -H "Authorization: Bearer $TOKEN2")

echo "Star result: $STAR_RESULT"

sleep 0.5

# Get shared files
echo "Getting shared files for User 2..."
SHARED=$(curl -s "$BASE_URL/api/files/shared" \
  -H "Authorization: Bearer $TOKEN2")

echo "Shared files response:"
echo "$SHARED" | jq '.'

echo ""
echo "Checking isStarred field:"
echo "$SHARED" | jq '.[0].isStarred'
