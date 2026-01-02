#!/bin/bash

# Test script for user profile update functionality

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
echo "User Profile Update Tests"
echo "=========================================="
echo ""

# Register test user with timestamp to ensure uniqueness
echo "Setting up test user..."
TIMESTAMP=$(date +%s)
TEST_USERNAME="updatetest${TIMESTAMP}@gmail.com"

REGISTER_RESPONSE=$(curl -s -X POST "$BASE_URL/users" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$TEST_USERNAME\",
        \"password\": \"testpass123\",
        \"firstName\": \"Original\",
        \"lastName\": \"Name\"
    }")

USER_ID=$(echo "$REGISTER_RESPONSE" | jq -r '.id')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "Failed to register test user"
    echo "Response: $REGISTER_RESPONSE"
    exit 1
fi

# Login to get token
LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/tokens" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"$TEST_USERNAME\",
        \"password\": \"testpass123\"
    }")

TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')

if [ -z "$TOKEN" ] || [ "$TOKEN" = "null" ]; then
    echo "Failed to login test user"
    exit 1
fi

echo "User registered successfully (ID: $USER_ID)"
echo ""

# Test 1: Update first name
echo "Test 1: Update first name"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"firstName":"NewFirst"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    # Verify the change
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
    [ "$FIRST_NAME" = "NewFirst" ]
    print_result $? "First name updated successfully"
else
    print_result 1 "First name update failed (HTTP $HTTP_CODE)"
fi

# Test 2: Update last name
echo "Test 2: Update last name"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"lastName":"NewLast"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
    [ "$LAST_NAME" = "NewLast" ]
    print_result $? "Last name updated successfully"
else
    print_result 1 "Last name update failed (HTTP $HTTP_CODE)"
fi

# Test 3: Update password
echo "Test 3: Update password"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"password":"newpass45678901"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    # Try to login with new password
    LOGIN_RESPONSE=$(curl -s -X POST "$BASE_URL/tokens" \
        -H "$CONTENT_TYPE" \
        -d "{
            \"username\": \"$TEST_USERNAME\",
            \"password\": \"newpass45678901\"
        }")
    NEW_TOKEN=$(echo "$LOGIN_RESPONSE" | jq -r '.token')
    [ -n "$NEW_TOKEN" ] && [ "$NEW_TOKEN" != "null" ]
    print_result $? "Password updated successfully"
    TOKEN=$NEW_TOKEN
else
    print_result 1 "Password update failed (HTTP $HTTP_CODE)"
fi

# Test 4: Set last name to null
echo "Test 4: Set last name to null"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"lastName":null}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
    [ "$LAST_NAME" = "null" ]
    print_result $? "Last name set to null successfully"
else
    print_result 1 "Setting last name to null failed (HTTP $HTTP_CODE)"
fi

# Test 5: Update profile image
echo "Test 5: Update profile image"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"profileImage":"https://example.com/avatar.jpg"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    PROFILE_IMAGE=$(echo "$USER_INFO" | jq -r '.profileImage')
    [ "$PROFILE_IMAGE" = "https://example.com/avatar.jpg" ]
    print_result $? "Profile image updated successfully"
else
    print_result 1 "Profile image update failed (HTTP $HTTP_CODE)"
fi

# Test 6: Set profile image to null
echo "Test 6: Set profile image to null"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"profileImage":null}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    PROFILE_IMAGE=$(echo "$USER_INFO" | jq -r '.profileImage')
    [ "$PROFILE_IMAGE" = "null" ]
    print_result $? "Profile image set to null successfully"
else
    print_result 1 "Setting profile image to null failed (HTTP $HTTP_CODE)"
fi

# Test 7: Try to update username (should fail)
echo "Test 7: Try to update username (should be rejected)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"username":"newusername@gmail.com"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n -1)
if [ "$HTTP_CODE" = "400" ]; then
    ERROR_MSG=$(echo "$BODY" | jq -r '.error')
    [[ "$ERROR_MSG" == *"username"* ]] || [[ "$ERROR_MSG" == *"cannot be changed"* ]]
    print_result $? "Username change correctly rejected"
else
    print_result 1 "Username change should have been rejected (HTTP $HTTP_CODE)"
fi

# Test 8: Update with multiple fields at once
echo "Test 8: Update multiple fields at once"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"firstName":"Multi","lastName":"Update","profileImage":"https://example.com/new.jpg"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "204" ]; then
    USER_INFO=$(curl -s -X GET "$BASE_URL/users/$USER_ID" \
        -H "Authorization: Bearer $TOKEN")
    FIRST_NAME=$(echo "$USER_INFO" | jq -r '.firstName')
    LAST_NAME=$(echo "$USER_INFO" | jq -r '.lastName')
    PROFILE_IMAGE=$(echo "$USER_INFO" | jq -r '.profileImage')
    [ "$FIRST_NAME" = "Multi" ] && [ "$LAST_NAME" = "Update" ] && [ "$PROFILE_IMAGE" = "https://example.com/new.jpg" ]
    print_result $? "Multiple fields updated successfully"
else
    print_result 1 "Multiple field update failed (HTTP $HTTP_CODE)"
fi

# Test 9: Try to update another user's profile (should fail)
echo "Test 9: Try to update another user's profile (should be unauthorized)"
# Register another user
TIMESTAMP2=$(date +%s)
REGISTER_RESPONSE2=$(curl -s -X POST "$BASE_URL/users" \
    -H "$CONTENT_TYPE" \
    -d "{
        \"username\": \"otheruser${TIMESTAMP2}@gmail.com\",
        \"password\": \"pass12345678\",
        \"firstName\": \"Other\",
        \"lastName\": \"User\"
    }")

OTHER_USER_ID=$(echo "$REGISTER_RESPONSE2" | jq -r '.id')

RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$OTHER_USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"firstName":"Hacked"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "403" ]; then
    print_result 0 "Unauthorized update correctly blocked"
else
    print_result 1 "Should not be able to update other user's profile (HTTP $HTTP_CODE)"
fi

# Test 10: Invalid password (too short)
echo "Test 10: Try to set invalid password (too short)"
RESPONSE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/users/$USER_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "$CONTENT_TYPE" \
    -d '{"password":"abc"}')

HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
if [ "$HTTP_CODE" = "400" ]; then
    print_result 0 "Invalid password correctly rejected"
else
    print_result 1 "Invalid password should have been rejected (HTTP $HTTP_CODE)"
fi

# Summary
echo ""
echo "=========================================="
echo "Test Summary"
echo "=========================================="
echo "Tests run: $TESTS_RUN"
echo "Tests passed: $TESTS_PASSED"
echo "Tests failed: $((TESTS_RUN - TESTS_PASSED))"

if [ $TESTS_PASSED -eq $TESTS_RUN ]; then
    echo -e "${GREEN}All tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some tests failed.${NC}"
    exit 1
fi
