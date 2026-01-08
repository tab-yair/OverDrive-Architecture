#!/bin/bash

# Test script for GET /api/users/:id endpoint
# Tests both owner and non-owner access scenarios

BASE_URL="http://localhost:3000/api"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Test counters
TESTS_RUN=0
TESTS_PASSED=0

# Helper function to print test results
print_result() {
    TESTS_RUN=$((TESTS_RUN + 1))
    if [ $1 -eq 0 ]; then
        TESTS_PASSED=$((TESTS_PASSED + 1))
        echo -e "${GREEN}✓ PASS${NC}: $2"
    else
        echo -e "${RED}✗ FAIL${NC}: $2"
    fi
}

echo "=========================================="
echo "User GET Endpoint Tests"
echo "=========================================="
echo ""

# Setup: Register two test users
echo "Setting up test users..."
TIMESTAMP=$(date +%s)
USER_A_USERNAME="usera${TIMESTAMP}@gmail.com"
USER_B_USERNAME="userb${TIMESTAMP}@gmail.com"

# Register User A
REGISTER_A=$(curl -s -X POST "$BASE_URL/users" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$USER_A_USERNAME\",
        \"password\": \"password123\",
        \"firstName\": \"Alice\",
        \"lastName\": \"Anderson\",
        \"profileImage\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"
    }")

USER_A_ID=$(echo "$REGISTER_A" | jq -r '.id')

if [ -z "$USER_A_ID" ] || [ "$USER_A_ID" = "null" ]; then
    echo "Failed to register User A"
    exit 1
fi

# Register User B
REGISTER_B=$(curl -s -X POST "$BASE_URL/users" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$USER_B_USERNAME\",
        \"password\": \"password456\",
        \"firstName\": \"Bob\",
        \"lastName\": \"Brown\",
        \"profileImage\": \"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==\"
    }")

USER_B_ID=$(echo "$REGISTER_B" | jq -r '.id')

if [ -z "$USER_B_ID" ] || [ "$USER_B_ID" = "null" ]; then
    echo "Failed to register User B"
    exit 1
fi

# Login both users
LOGIN_A=$(curl -s -X POST "$BASE_URL/tokens" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$USER_A_USERNAME\",
        \"password\": \"password123\"
    }")

TOKEN_A=$(echo "$LOGIN_A" | jq -r '.token')

LOGIN_B=$(curl -s -X POST "$BASE_URL/tokens" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$USER_B_USERNAME\",
        \"password\": \"password456\"
    }")

TOKEN_B=$(echo "$LOGIN_B" | jq -r '.token')

echo "User A registered (ID: $USER_A_ID)"
echo "User B registered (ID: $USER_B_ID)"
echo ""

# Test 1: Owner accessing their own profile should get full details
echo "Test 1: Owner accessing their own profile (full details)"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_A_ID" \
    -H "Authorization: Bearer $TOKEN_A")

ID=$(echo "$USER_INFO" | jq -r '.id')
USERNAME=$(echo "$USER_INFO" | jq -r '.username')
FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
PROFILE_IMAGE=$(echo "$USER_INFO" | jq -r '.profileImage')
STORAGE_USED=$(echo "$USER_INFO" | jq -r '.storageUsed')
CREATED_AT=$(echo "$USER_INFO" | jq -r '.createdAt')
MODIFIED_AT=$(echo "$USER_INFO" | jq -r '.modifiedAt')

# Should have all fields
if [ "$ID" = "$USER_A_ID" ] && \
   [ "$USERNAME" = "$USER_A_USERNAME" ] && \
   [ "$FIRST_NAME" = "Alice" ] && \
   [ "$LAST_NAME" = "Anderson" ] && \
   [ "$PROFILE_IMAGE" != "null" ] && \
   [ "$STORAGE_USED" != "null" ] && \
   [ "$CREATED_AT" != "null" ] && \
   [ "$MODIFIED_AT" != "null" ]; then
    print_result 0 "Owner gets full profile (all fields present)"
else
    echo "  Received: $USER_INFO"
    print_result 1 "Owner should get full profile"
fi

# Test 2: Non-owner accessing another user's profile should get limited details
echo "Test 2: Non-owner accessing another user's profile (limited details)"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_A_ID" \
    -H "Authorization: Bearer $TOKEN_B")

ID=$(echo "$USER_INFO" | jq -r '.id')
USERNAME=$(echo "$USER_INFO" | jq -r '.username')
FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
PROFILE_IMAGE=$(echo "$USER_INFO" | jq -r '.profileImage')
STORAGE_USED=$(echo "$USER_INFO" | jq -r '.storageUsed')
CREATED_AT=$(echo "$USER_INFO" | jq -r '.createdAt')
MODIFIED_AT=$(echo "$USER_INFO" | jq -r '.modifiedAt')

# Should have only limited fields (id, firstName, lastName, username, profileImage)
if [ "$ID" = "$USER_A_ID" ] && \
   [ "$USERNAME" = "$USER_A_USERNAME" ] && \
   [ "$FIRST_NAME" = "Alice" ] && \
   [ "$LAST_NAME" = "Anderson" ] && \
   [ "$PROFILE_IMAGE" != "null" ] && \
   [ "$STORAGE_USED" = "null" ] && \
   [ "$CREATED_AT" = "null" ] && \
   [ "$MODIFIED_AT" = "null" ]; then
    print_result 0 "Non-owner gets limited profile (only public fields)"
else
    echo "  Received: $USER_INFO"
    print_result 1 "Non-owner should get limited profile"
fi

# Test 3: Verify exact field count for non-owner
echo "Test 3: Verify non-owner profile has exactly 5 fields"
FIELD_COUNT=$(echo "$USER_INFO" | jq 'keys | length')
if [ "$FIELD_COUNT" = "5" ]; then
    print_result 0 "Non-owner profile has exactly 5 fields"
else
    echo "  Expected 5 fields, got $FIELD_COUNT"
    echo "  Fields: $(echo "$USER_INFO" | jq 'keys')"
    print_result 1 "Non-owner profile should have exactly 5 fields"
fi

# Test 4: User B accessing their own profile (full details)
echo "Test 4: User B accessing their own profile (full details)"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_B_ID" \
    -H "Authorization: Bearer $TOKEN_B")

ID=$(echo "$USER_INFO" | jq -r '.id')
USERNAME=$(echo "$USER_INFO" | jq -r '.username')
FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
STORAGE_USED=$(echo "$USER_INFO" | jq -r '.storageUsed')

if [ "$ID" = "$USER_B_ID" ] && \
   [ "$USERNAME" = "$USER_B_USERNAME" ] && \
   [ "$FIRST_NAME" = "Bob" ] && \
   [ "$LAST_NAME" = "Brown" ] && \
   [ "$STORAGE_USED" != "null" ]; then
    print_result 0 "User B gets full profile when accessing own account"
else
    print_result 1 "User B should get full profile"
fi

# Test 5: User A accessing User B's profile (limited details)
echo "Test 5: User A accessing User B's profile (limited details)"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_B_ID" \
    -H "Authorization: Bearer $TOKEN_A")

ID=$(echo "$USER_INFO" | jq -r '.id')
USERNAME=$(echo "$USER_INFO" | jq -r '.username')
FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
STORAGE_USED=$(echo "$USER_INFO" | jq -r '.storageUsed')
CREATED_AT=$(echo "$USER_INFO" | jq -r '.createdAt')

if [ "$ID" = "$USER_B_ID" ] && \
   [ "$USERNAME" = "$USER_B_USERNAME" ] && \
   [ "$FIRST_NAME" = "Bob" ] && \
   [ "$STORAGE_USED" = "null" ] && \
   [ "$CREATED_AT" = "null" ]; then
    print_result 0 "User A gets limited profile when accessing User B"
else
    echo "  Received: $USER_INFO"
    print_result 1 "User A should get limited profile"
fi

# Test 6: Accessing non-existent user
echo "Test 6: Accessing non-existent user (should fail)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/users/nonexistent-id" \
    -H "Authorization: Bearer $TOKEN_A")

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "404" ] || [ "$HTTP_CODE" = "400" ]; then
    print_result 0 "Non-existent user correctly rejected"
else
    print_result 1 "Non-existent user should return error (got HTTP $HTTP_CODE)"
fi

# Test 7: Verify limited profile doesn't include password
echo "Test 7: Verify limited profile doesn't include password field"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_A_ID" \
    -H "Authorization: Bearer $TOKEN_B")

HAS_PASSWORD=$(echo "$USER_INFO" | jq 'has("password")')
if [ "$HAS_PASSWORD" = "false" ]; then
    print_result 0 "Limited profile correctly excludes password"
else
    print_result 1 "Limited profile should not include password"
fi

# Test 8: Verify owner profile doesn't include password either
echo "Test 8: Verify owner profile doesn't include password field"
USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_A_ID" \
    -H "Authorization: Bearer $TOKEN_A")

HAS_PASSWORD=$(echo "$USER_INFO" | jq 'has("password")')
if [ "$HAS_PASSWORD" = "false" ]; then
    print_result 0 "Owner profile correctly excludes password"
else
    print_result 1 "Owner profile should not include password"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"
echo ""

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    TESTS_FAILED=$((TESTS_RUN - TESTS_PASSED))
    echo -e "${RED}✗ $TESTS_FAILED test(s) failed${NC}"
    exit 1
fi
