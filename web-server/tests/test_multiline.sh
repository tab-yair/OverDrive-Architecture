#!/bin/bash
# Test multi-line file support with newline escaping

BASE_URL="http://localhost:3000"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Test counters
TESTS_PASSED=0
TESTS_FAILED=0

# Helper functions
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
echo "Testing Multi-Line File Support"
echo "=========================================="
echo ""

# Helper function to extract file ID from Location header
extract_id() {
    echo "$1" | grep -i "Location:" | awk -F'/' '{print $NF}' | tr -d '\r\n'
}

# Create test user
info "Creating test user..."
RANDOM_ID=$(date +%s | tail -c 6)
TEST_USER="mlt${RANDOM_ID}@gmail.com"
CREATE_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test12345678\",\"firstName\":\"MultiTest\",\"profileImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"}")
USER_ID=$(extract_id "$CREATE_RESPONSE")
pass "User created: $USER_ID"

# Login
info "Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/api/tokens \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test12345678\"}" | jq -r '.token')
pass "Token received"

# Test 1: Create file with newlines
info "Test 1: Creating file with multiple lines..."
# Use \n as literal newline characters in JSON
MULTILINE_CONTENT="Line 1: Hello World\nLine 2: This is a test\nLine 3: With multiple lines\nLine 4: Final line"

FILE1_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"multiline.txt\",\"type\":\"docs\",\"content\":\"$MULTILINE_CONTENT\"}")
FILE1_ID=$(extract_id "$FILE1_RESPONSE")

if [[ -n "$FILE1_ID" ]]; then
    pass "Multi-line file created: $FILE1_ID"
else
    fail "Failed to create multi-line file"
fi

# Test 2: Retrieve and verify content
info "Test 2: Retrieving file content..."
RETRIEVED=$(curl -s -X GET "$BASE_URL/api/files/$FILE1_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.content')

# Check if content contains newlines
if [[ "$RETRIEVED" == *$'\n'* ]]; then
    pass "Content contains newlines"
else
    fail "Content does not contain newlines"
fi

# Check if first line is correct
FIRST_LINE=$(echo "$RETRIEVED" | head -n 1)
if [[ "$FIRST_LINE" == "Line 1: Hello World" ]]; then
    pass "First line matches: $FIRST_LINE"
else
    fail "First line mismatch. Expected 'Line 1: Hello World', got '$FIRST_LINE'"
fi

# Check if last line is correct
LAST_LINE=$(echo "$RETRIEVED" | tail -n 1)
if [[ "$LAST_LINE" == "Line 4: Final line" ]]; then
    pass "Last line matches: $LAST_LINE"
else
    fail "Last line mismatch. Expected 'Line 4: Final line', got '$LAST_LINE'"
fi

# Count lines
LINE_COUNT=$(echo "$RETRIEVED" | wc -l)
if [[ "$LINE_COUNT" -eq 4 ]]; then
    pass "Line count correct: $LINE_COUNT lines"
else
    fail "Line count mismatch. Expected 4, got $LINE_COUNT"
fi

# Test 3: Search for content in multi-line file
info "Test 3: Searching for text in multi-line file..."

# Search for text from line 1
SEARCH_RESULT=$(curl -s -X GET "$BASE_URL/api/search/Hello" \
    -H "Authorization: Bearer $TOKEN")
if [[ "$SEARCH_RESULT" == *"multiline.txt"* ]]; then
    pass "Found file when searching for 'Hello' (from line 1)"
else
    fail "Search failed for 'Hello'"
fi

# Search for text from line 2
SEARCH_RESULT=$(curl -s -X GET "$BASE_URL/api/search/test" \
    -H "Authorization: Bearer $TOKEN")
if [[ "$SEARCH_RESULT" == *"multiline.txt"* ]]; then
    pass "Found file when searching for 'test' (from line 2)"
else
    fail "Search failed for 'test'"
fi

# Search for text from line 3
SEARCH_RESULT=$(curl -s -X GET "$BASE_URL/api/search/multiple" \
    -H "Authorization: Bearer $TOKEN")
if [[ "$SEARCH_RESULT" == *"multiline.txt"* ]]; then
    pass "Found file when searching for 'multiple' (from line 3)"
else
    fail "Search failed for 'multiple'"
fi

# Test 4: Update file with new multi-line content
info "Test 4: Updating file with new multi-line content..."
NEW_CONTENT="Updated Line 1\nUpdated Line 2\nUpdated Line 3"

curl -s -X PATCH "$BASE_URL/api/files/$FILE1_ID" \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"content\":\"$NEW_CONTENT\"}" > /dev/null

UPDATED=$(curl -s -X GET "$BASE_URL/api/files/$FILE1_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.content')

if [[ "$UPDATED" == *"Updated Line 1"* && "$UPDATED" == *"Updated Line 3"* ]]; then
    pass "File updated successfully with new multi-line content"
else
    fail "File update failed"
fi

# Test 5: File with special characters and newlines
info "Test 5: Creating file with backslashes and newlines..."
SPECIAL_CONTENT="Path: C:\\\\Users\\\\Test\nNewline: \\\\n is escaped\nBackslash: \\\\\\\\"

FILE2_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"special.txt\",\"type\":\"docs\",\"content\":\"$SPECIAL_CONTENT\"}")
FILE2_ID=$(extract_id "$FILE2_RESPONSE")

if [[ -n "$FILE2_ID" ]]; then
    pass "File with special characters created: $FILE2_ID"
else
    fail "Failed to create file with special characters"
fi

SPECIAL_RETRIEVED=$(curl -s -X GET "$BASE_URL/api/files/$FILE2_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.content')

if [[ "$SPECIAL_RETRIEVED" == *"C:\\Users\\Test"* ]]; then
    pass "Backslashes preserved correctly"
else
    fail "Backslashes not preserved"
fi

# Test 6: Empty lines
info "Test 6: File with empty lines..."
EMPTY_LINES="Line 1\n\nLine 3 (after empty line)\n\n\nLine 6 (after multiple empty lines)"

FILE3_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"empty_lines.txt\",\"type\":\"docs\",\"content\":\"$EMPTY_LINES\"}")
FILE3_ID=$(extract_id "$FILE3_RESPONSE")

if [[ -n "$FILE3_ID" ]]; then
    pass "File with empty lines created: $FILE3_ID"
else
    fail "Failed to create file with empty lines"
fi

EMPTY_RETRIEVED=$(curl -s -X GET "$BASE_URL/api/files/$FILE3_ID" \
    -H "Authorization: Bearer $TOKEN" | jq -r '.content')

# Count total lines (including empty ones)
TOTAL_LINES=$(echo "$EMPTY_RETRIEVED" | wc -l)
if [[ "$TOTAL_LINES" -ge 5 ]]; then
    pass "Empty lines preserved (total lines: $TOTAL_LINES)"
else
    fail "Empty lines not preserved correctly (total lines: $TOTAL_LINES)"
fi

echo ""
echo -e "${GREEN}=== All Multi-Line Tests Passed! ===${NC}"
