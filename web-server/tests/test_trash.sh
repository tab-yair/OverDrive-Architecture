#!/bin/bash

# Comprehensive test script for trash/restore functionality
# Tests: Remove, Restore, Permanent Delete, Empty Trash, Edge Cases

BASE_URL="http://localhost:3000"
CONTENT_TYPE="Content-Type: application/json"

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

TESTS_PASSED=0
TESTS_FAILED=0

# Helper function to assert
assert_equals() {
    local expected="$1"
    local actual="$2"
    local message="$3"
    
    if [ "$expected" == "$actual" ]; then
        echo -e "${GREEN}✓ PASS${NC}: $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $message"
        echo -e "  Expected: $expected"
        echo -e "  Actual: $actual"
        ((TESTS_FAILED++))
    fi
}

assert_contains() {
    local haystack="$1"
    local needle="$2"
    local message="$3"
    
    if echo "$haystack" | grep -q "$needle"; then
        echo -e "${GREEN}✓ PASS${NC}: $message"
        ((TESTS_PASSED++))
    else
        echo -e "${RED}✗ FAIL${NC}: $message"
        echo -e "  Expected to contain: $needle"
        echo -e "  Actual: $haystack"
        ((TESTS_FAILED++))
    fi
}

assert_not_contains() {
    local haystack="$1"
    local needle="$2"
    local message="$3"
    
    if echo "$haystack" | grep -q "$needle"; then
        echo -e "${RED}✗ FAIL${NC}: $message"
        echo -e "  Should NOT contain: $needle"
        echo -e "  Actual: $haystack"
        ((TESTS_FAILED++))
    else
        echo -e "${GREEN}✓ PASS${NC}: $message"
        ((TESTS_PASSED++))
    fi
}

echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}  OverDrive Trash/Restore Comprehensive Test Suite${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}\n"

# ========== SETUP ==========
echo -e "${YELLOW}[SETUP] Creating test users and files...${NC}"

# Register User 1 (Owner)
curl -s -X POST "$BASE_URL/api/users" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"owner1@gmail.com","password":"pass1234","firstName":"Owner","profileImage":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="}' > /dev/null

TOKEN1=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"owner1@gmail.com","password":"pass1234"}' | jq -r '.token')
echo "  • Owner logged in (TOKEN1)"

# Register User 2 (Editor)
curl -s -X POST "$BASE_URL/api/users" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"editor1@gmail.com","password":"pass1234","firstName":"Editor","profileImage":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="}' > /dev/null

TOKEN2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"editor1@gmail.com","password":"pass1234"}' | jq -r '.token')
echo "  • Editor logged in (TOKEN2)"

# Register User 3 (Viewer)
curl -s -X POST "$BASE_URL/api/users" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"viewer1@gmail.com","password":"pass1234","firstName":"Viewer","profileImage":"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="}' > /dev/null

TOKEN3=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "$CONTENT_TYPE" \
  -d '{"username":"viewer1@gmail.com","password":"pass1234"}' | jq -r '.token')
echo "  • Viewer logged in (TOKEN3)"

# Get User IDs by creating a dummy file and extracting owner
DUMMY1=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"dummy1.txt","type":"docs","content":"x"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
USER1_ID=$(curl -s -X GET "$BASE_URL/api/files/$DUMMY1" -H "Authorization: Bearer $TOKEN1" | jq -r '.ownerId')
curl -s -X DELETE "$BASE_URL/api/files/$DUMMY1" -H "Authorization: Bearer $TOKEN1" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/trash/$DUMMY1" -H "Authorization: Bearer $TOKEN1" > /dev/null

DUMMY2=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"dummy2.txt","type":"docs","content":"x"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
USER2_ID=$(curl -s -X GET "$BASE_URL/api/files/$DUMMY2" -H "Authorization: Bearer $TOKEN2" | jq -r '.ownerId')
curl -s -X DELETE "$BASE_URL/api/files/$DUMMY2" -H "Authorization: Bearer $TOKEN2" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/trash/$DUMMY2" -H "Authorization: Bearer $TOKEN2" > /dev/null

DUMMY3=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN3" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"dummy3.txt","type":"docs","content":"x"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
USER3_ID=$(curl -s -X GET "$BASE_URL/api/files/$DUMMY3" -H "Authorization: Bearer $TOKEN3" | jq -r '.ownerId')
curl -s -X DELETE "$BASE_URL/api/files/$DUMMY3" -H "Authorization: Bearer $TOKEN3" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/trash/$DUMMY3" -H "Authorization: Bearer $TOKEN3" > /dev/null

# Create test structure
# MainFolder
#   ├── SubFolder
#   │   └── deepFile.txt
#   ├── file1.txt
#   └── file2.txt
# StandaloneFile.txt

FOLDER_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"MainFolder","type":"folder"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
FOLDER_ID=$FOLDER_LOCATION
echo "  • MainFolder created: $FOLDER_ID"

SUBFOLDER_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"name\":\"SubFolder\",\"type\":\"folder\",\"parentId\":\"$FOLDER_ID\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
SUBFOLDER_ID=$SUBFOLDER_LOCATION
echo "  • SubFolder created: $SUBFOLDER_ID"

FILE1_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"name\":\"file1.txt\",\"type\":\"docs\",\"content\":\"Content 1\",\"parentId\":\"$FOLDER_ID\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
FILE1_ID=$FILE1_LOCATION
echo "  • file1.txt created: $FILE1_ID"

FILE2_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"name\":\"file2.txt\",\"type\":\"docs\",\"content\":\"Content 2\",\"parentId\":\"$FOLDER_ID\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
FILE2_ID=$FILE2_LOCATION
echo "  • file2.txt created: $FILE2_ID"

DEEPFILE_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"name\":\"deepFile.txt\",\"type\":\"docs\",\"content\":\"Deep Content\",\"parentId\":\"$SUBFOLDER_ID\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
DEEPFILE_ID=$DEEPFILE_LOCATION
echo "  • deepFile.txt created: $DEEPFILE_ID"

STANDALONE_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"StandaloneFile.txt","type":"docs","content":"Standalone"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
STANDALONE_ID=$STANDALONE_LOCATION
echo "  • StandaloneFile.txt created: $STANDALONE_ID"

# Share MainFolder with User2 (EDITOR) and User3 (VIEWER)
PERM1_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files/$FOLDER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"EDITOR\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
PERM1_ID=$PERM1_LOCATION
echo "  • EDITOR permission granted to User2 on MainFolder"

PERM2_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files/$FOLDER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"targetUserId\":\"$USER3_ID\",\"permissionLevel\":\"VIEWER\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
PERM2_ID=$PERM2_LOCATION
echo "  • VIEWER permission granted to User3 on MainFolder"

echo -e "${GREEN}Setup complete!${NC}\n"

# ========== TEST 1: Owner removes file (moves to trash) ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 1: Owner removes file (should move to trash)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Remove file1.txt
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/$FILE1_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

assert_equals "204" "$HTTP_CODE" "Owner remove returns 204"

# Verify file is in trash
FILE1_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FILE1_DATA" '"isTrashed":true' "File isTrashed flag is set"
assert_contains "$FILE1_DATA" '"parentId":"'$FOLDER_ID'"' "File parentId preserved"

# Verify trash endpoint shows the file
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_contains "$TRASH_LIST" "$FILE1_ID" "File appears in trash list"

# Verify Editor can't access trashed file
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "403" "$HTTP_CODE2" "Editor gets 403 for trashed file"

echo ""

# ========== TEST 2: Owner removes folder (recursive trash) ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 2: Owner removes folder (recursive trash)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Remove MainFolder
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

assert_equals "204" "$HTTP_CODE" "Owner remove folder returns 204"

# Verify folder is trashed
FOLDER_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FOLDER_DATA" '"isTrashed":true' "Folder isTrashed flag is set"

# Verify children are implicitly trashed (check visibility)
FILE2_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FILE2_DATA" '"id":"'$FILE2_ID'"' "Owner can see child file (in trash)"

# Verify deep child is also implicitly trashed
DEEPFILE_DATA=$(curl -s -X GET "$BASE_URL/api/files/$DEEPFILE_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$DEEPFILE_DATA" '"id":"'$DEEPFILE_ID'"' "Owner can see deep child (in trash)"

# Verify trash list shows only top-level item
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_contains "$TRASH_LIST" "$FOLDER_ID" "Folder appears in trash list"
assert_not_contains "$TRASH_LIST" "$FILE2_ID" "Child file NOT in trash list (implicit)"
assert_not_contains "$TRASH_LIST" "$SUBFOLDER_ID" "SubFolder NOT in trash list (implicit)"

# Verify Editor can't access
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "403" "$HTTP_CODE2" "Editor gets 403 for trashed folder"

echo ""

# ========== TEST 3: Restore file from trash ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 3: Restore file from trash${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Restore file1.txt
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/trash/$FILE1_ID/restore" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

assert_equals "204" "$HTTP_CODE" "Restore returns 204"

# Verify file is restored
FILE1_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FILE1_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FILE1_DATA" '"isTrashed":false' "File isTrashed flag cleared"
assert_contains "$FILE1_DATA" '"parentId":"'$FOLDER_ID'"' "File parentId still preserved"

# Verify file no longer in trash list
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_not_contains "$TRASH_LIST" "$FILE1_ID" "File removed from trash list"

echo ""

# ========== TEST 4: Restore folder (recursive restore) ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 4: Restore folder (recursive restore)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Restore MainFolder
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/trash/$FOLDER_ID/restore" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

assert_equals "204" "$HTTP_CODE" "Restore folder returns 204"

# Verify folder is restored
FOLDER_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FOLDER_DATA" '"isTrashed":false' "Folder isTrashed flag cleared"

# Verify children are also restored
FILE2_DATA=$(curl -s -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$FILE2_DATA" '"isTrashed":false' "Child file restored"

DEEPFILE_DATA=$(curl -s -X GET "$BASE_URL/api/files/$DEEPFILE_ID" -H "Authorization: Bearer $TOKEN1")
assert_contains "$DEEPFILE_DATA" '"isTrashed":false' "Deep child file restored"

# Verify Editor can access again
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "200" "$HTTP_CODE2" "Editor can access restored folder"

# Verify trash is empty
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_equals "[]" "$TRASH_LIST" "Trash is empty after restore"

echo ""

# ========== TEST 5: Permanent delete ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 5: Permanent delete from trash${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Move StandaloneFile to trash first
curl -s -X DELETE "$BASE_URL/api/files/$STANDALONE_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Permanently delete
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash/$STANDALONE_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

assert_equals "204" "$HTTP_CODE" "Permanent delete returns 204"

# Verify file is completely gone
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$STANDALONE_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "404" "$HTTP_CODE2" "File returns 404 after permanent delete"

echo ""

# ========== TEST 6: Permanent delete folder (recursive) ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 6: Permanent delete folder (recursive)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Trash the folder again
curl -s -X DELETE "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Permanently delete
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash/$FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)

assert_equals "204" "$HTTP_CODE" "Permanent delete folder returns 204"

# Verify folder is gone
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FOLDER_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "404" "$HTTP_CODE2" "Folder returns 404"

# Verify children are gone
RESPONSE3=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)
assert_equals "404" "$HTTP_CODE3" "Child file returns 404"

RESPONSE4=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$DEEPFILE_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE4=$(echo "$RESPONSE4" | tail -n1)
assert_equals "404" "$HTTP_CODE4" "Deep child file returns 404"

echo ""

# ========== TEST 7: Editor/Viewer local remove (hide) ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 7: Editor local remove (sets isHiddenForUser)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Create new shared file
SHARED_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"SharedFile.txt","type":"docs","content":"Shared Content"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
SHARED_ID=$SHARED_LOCATION

# Share with User2
curl -s -X POST "$BASE_URL/api/files/$SHARED_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

# Verify User2 can access
RESPONSE1=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$SHARED_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
assert_equals "200" "$HTTP_CODE1" "Editor can access shared file"

# User2 removes (local hide)
RESPONSE2=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/$SHARED_ID" \
  -H "Authorization: Bearer $TOKEN2")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "204" "$HTTP_CODE2" "Editor remove returns 204"

# Verify User2 can't access anymore
RESPONSE3=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$SHARED_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE3=$(echo "$RESPONSE3" | tail -n1)
assert_equals "403" "$HTTP_CODE3" "Editor gets 403 after local remove"

# Verify Owner can still access (not in trash)
RESPONSE4=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$SHARED_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE4=$(echo "$RESPONSE4" | tail -n1)
BODY4=$(echo "$RESPONSE4" | head -n-1)
assert_equals "200" "$HTTP_CODE4" "Owner can still access file"
assert_contains "$BODY4" '"isTrashed":false' "File NOT trashed for owner"

# Verify file NOT in owner's trash
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_not_contains "$TRASH_LIST" "$SHARED_ID" "File NOT in owner's trash"

echo ""

# ========== TEST 8: Empty trash ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 8: Empty trash (bulk delete)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Create multiple files and trash them
TEMP1_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"temp1.txt","type":"docs","content":"Temp 1"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
TEMP1_ID=$TEMP1_LOCATION

TEMP2_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"temp2.txt","type":"docs","content":"Temp 2"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
TEMP2_ID=$TEMP2_LOCATION

# Trash both
curl -s -X DELETE "$BASE_URL/api/files/$TEMP1_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/$TEMP2_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Verify trash has items
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_contains "$TRASH_LIST" "$TEMP1_ID" "temp1 in trash"
assert_contains "$TRASH_LIST" "$TEMP2_ID" "temp2 in trash"

# Empty trash
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

assert_equals "200" "$HTTP_CODE" "Empty trash returns 200"
assert_contains "$BODY" '"success":true' "Response contains success"
assert_contains "$BODY" '"deletedCount":2' "Deleted count is 2"

# Verify trash is empty
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_equals "[]" "$TRASH_LIST" "Trash is empty"

# Verify files are gone
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$TEMP1_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "404" "$HTTP_CODE2" "temp1 returns 404"

echo ""

# ========== TEST 9: Restore all trash ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 9: Restore all trash (bulk restore)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Create and trash multiple files
RESTORE1_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"restore1.txt","type":"docs","content":"Restore 1"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
RESTORE1_ID=$RESTORE1_LOCATION

RESTORE2_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"restore2.txt","type":"docs","content":"Restore 2"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
RESTORE2_ID=$RESTORE2_LOCATION

curl -s -X DELETE "$BASE_URL/api/files/$RESTORE1_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null
curl -s -X DELETE "$BASE_URL/api/files/$RESTORE2_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Restore all
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/trash/restore" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

assert_equals "200" "$HTTP_CODE" "Restore all returns 200"
assert_contains "$BODY" '"success":true' "Response contains success"
assert_contains "$BODY" '"restoredCount":2' "Restored count is 2"

# Verify files are restored
RESPONSE1=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$RESTORE1_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE1=$(echo "$RESPONSE1" | tail -n1)
BODY1=$(echo "$RESPONSE1" | head -n-1)
assert_equals "200" "$HTTP_CODE1" "restore1 accessible"
assert_contains "$BODY1" '"isTrashed":false' "restore1 not trashed"

RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$RESTORE2_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
BODY2=$(echo "$RESPONSE2" | head -n-1)
assert_equals "200" "$HTTP_CODE2" "restore2 accessible"
assert_contains "$BODY2" '"isTrashed":false' "restore2 not trashed"

# Verify trash is empty
TRASH_LIST=$(curl -s -X GET "$BASE_URL/api/files/trash" -H "Authorization: Bearer $TOKEN1")
assert_equals "[]" "$TRASH_LIST" "Trash is empty after restore all"

echo ""

# ========== TEST 10: Error cases ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 10: Error cases and edge conditions${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Try to permanently delete non-trashed file
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash/$SHARED_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
assert_equals "400" "$HTTP_CODE" "Can't permanently delete non-trashed file"

# Try to restore non-trashed file
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/trash/$SHARED_ID/restore" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
assert_equals "400" "$HTTP_CODE" "Can't restore non-trashed file"

# Create file, trash it, let non-owner try to restore
TEST_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"test.txt","type":"docs","content":"Test"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
TEST_ID=$TEST_LOCATION

curl -s -X DELETE "$BASE_URL/api/files/$TEST_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null

# Non-owner tries to restore
RESPONSE=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/trash/$TEST_ID/restore" \
  -H "Authorization: Bearer $TOKEN2")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
assert_equals "403" "$HTTP_CODE" "Non-owner can't restore file"

# Non-owner tries to permanently delete
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash/$TEST_ID" \
  -H "Authorization: Bearer $TOKEN2")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
assert_equals "403" "$HTTP_CODE" "Non-owner can't permanently delete"

echo ""

# ========== TEST 11: Orphan handling on permanent delete ==========
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"
echo -e "${BLUE}TEST 11: Orphan handling (children owned by others)${NC}"
echo -e "${BLUE}────────────────────────────────────────────────────────${NC}"

# Owner creates SharedFolder
ORPHAN_FOLDER_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d '{"name":"SharedFolder","type":"folder"}' | grep -i "^location:" | sed 's/.*\///;s/\r//')
ORPHAN_FOLDER_ID=$ORPHAN_FOLDER_LOCATION
echo "  • Owner created SharedFolder: $ORPHAN_FOLDER_ID"

# Owner shares folder with Editor (EDITOR permission)
curl -s -X POST "$BASE_URL/api/files/$ORPHAN_FOLDER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "$CONTENT_TYPE" \
  -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"EDITOR\"}" > /dev/null
echo "  • Shared with Editor"

# Editor creates file inside Owner's folder
EDITOR_FILE_LOCATION=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "$CONTENT_TYPE" \
  -d "{\"name\":\"editorFile.txt\",\"type\":\"docs\",\"content\":\"Editor's content\",\"parentId\":\"$ORPHAN_FOLDER_ID\"}" | grep -i "^location:" | sed 's/.*\///;s/\r//')
EDITOR_FILE_ID=$EDITOR_FILE_LOCATION
echo "  • Editor created editorFile.txt: $EDITOR_FILE_ID"

# Verify Editor's file has the folder as parent
EDITOR_FILE_DATA=$(curl -s -X GET "$BASE_URL/api/files/$EDITOR_FILE_ID" -H "Authorization: Bearer $TOKEN2")
EDITOR_FILE_PARENT=$(echo "$EDITOR_FILE_DATA" | jq -r '.parentId')
assert_equals "$ORPHAN_FOLDER_ID" "$EDITOR_FILE_PARENT" "Editor's file has SharedFolder as parent"

# Owner trashes the folder
curl -s -X DELETE "$BASE_URL/api/files/$ORPHAN_FOLDER_ID" -H "Authorization: Bearer $TOKEN1" > /dev/null
echo "  • Owner moved SharedFolder to trash"

# Owner permanently deletes the folder
RESPONSE=$(curl -s -w "\n%{http_code}" -X DELETE "$BASE_URL/api/files/trash/$ORPHAN_FOLDER_ID" \
  -H "Authorization: Bearer $TOKEN1")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
assert_equals "204" "$HTTP_CODE" "Permanent delete folder returns 204"
echo "  • Owner permanently deleted SharedFolder"

# Verify folder is gone
RESPONSE2=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$ORPHAN_FOLDER_ID" -H "Authorization: Bearer $TOKEN1")
HTTP_CODE2=$(echo "$RESPONSE2" | tail -n1)
assert_equals "404" "$HTTP_CODE2" "SharedFolder returns 404"

# Verify Editor's file still exists but is now orphaned (parentId = null)
EDITOR_FILE_AFTER=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$EDITOR_FILE_ID" -H "Authorization: Bearer $TOKEN2")
HTTP_CODE3=$(echo "$EDITOR_FILE_AFTER" | tail -n1)
BODY3=$(echo "$EDITOR_FILE_AFTER" | head -n-1)
assert_equals "200" "$HTTP_CODE3" "Editor's file still accessible"

ORPHAN_PARENT=$(echo "$BODY3" | jq -r '.parentId')
assert_equals "null" "$ORPHAN_PARENT" "Editor's file is orphaned (parentId=null)"

# Verify Editor's file is owned by Editor (not deleted)
ORPHAN_OWNER=$(echo "$BODY3" | jq -r '.ownerId')
assert_equals "$USER2_ID" "$ORPHAN_OWNER" "Editor still owns the file"

echo "  ✓ Orphan handling verified: Editor's file became root-level after parent deletion"

echo ""

# ========== SUMMARY ==========
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}                    TEST SUMMARY${NC}"
echo -e "${BLUE}════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN}Tests Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Tests Failed: $TESTS_FAILED${NC}"

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "\n${GREEN}✓ ALL TESTS PASSED!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ SOME TESTS FAILED${NC}"
    exit 1
fi
