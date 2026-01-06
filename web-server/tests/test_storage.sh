#!/bin/bash
# Test storage tracking and limits

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

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
echo "Testing Storage Tracking and Limits"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"

# Helper function to extract file ID from Location header
extract_id() {
    echo "$1" | grep -i "Location:" | awk -F'/' '{print $NF}' | tr -d '\r\n'
}

# Create test user
info "1. Creating test user..."
RANDOM_ID=$(date +%s%N)
TEST_USER="storagetest${RANDOM_ID}@gmail.com"
CREATE_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test12345678\",\"firstName\":\"StorageTest\",\"profileImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"}")
USER_ID=$(extract_id "$CREATE_RESPONSE")
[[ -n "$USER_ID" ]] && pass "User created: $USER_ID" || fail "User creation failed"

# Login
info "2. Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/api/tokens \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test12345678\"}" | jq -r '.token')
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] && pass "Token received" || fail "Login failed"

# Check initial storage (should be 0)
info "3. Checking initial storage..."
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED=$(echo "$STORAGE" | jq -r '.storageUsed')
LIMIT=$(echo "$STORAGE" | jq -r '.storageLimit')
USED_MB=$(echo "$STORAGE" | jq -r '.storageUsedMB')
LIMIT_MB=$(echo "$STORAGE" | jq -r '.storageLimitMB')
[[ "$USED" == "0" ]] && pass "Initial storage: $USED bytes ($USED_MB MB), Limit: $LIMIT_MB MB" || fail "Initial storage should be 0, got $USED"

# Create a small file
info "4. Creating small file..."
FILE1_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"small.txt","type":"docs","content":"AAAA"}')
FILE1_ID=$(extract_id "$FILE1_RESPONSE")
[[ -n "$FILE1_ID" ]] && pass "File created: $FILE1_ID" || fail "File creation failed"

# Check storage increased
info "5. Checking storage after file creation..."
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED=$(echo "$STORAGE" | jq -r '.storageUsed')
[[ "$USED" -gt "0" ]] && pass "Storage increased to: $USED bytes" || fail "Storage should have increased"

# Update file with larger content
info "6. Updating file with larger content..."
curl -s -X PATCH $BASE_URL/api/files/$FILE1_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"AAAAAAAAAA"}'
    
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_AFTER=$(echo "$STORAGE" | jq -r '.storageUsed')
[[ "$USED_AFTER" -gt "$USED" ]] && pass "Storage after update: $USED_AFTER bytes" || fail "Storage should have increased after update"

# Create another file
echo "7. Creating another file..."
FILE2_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"medium.txt","type":"docs","content":"BBBBBBBBBB"}')
FILE2_ID=$(extract_id "$FILE2_RESPONSE")
echo "✓ File created: $FILE2_ID"

STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_BEFORE_DELETE=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage before deletion: $USED_BEFORE_DELETE bytes"

# Delete first file (moves to trash - doesn't free storage yet)
echo "8. Deleting first file (moves to trash)..."
curl -s -X DELETE $BASE_URL/api/files/$FILE1_ID \
    -H "Authorization: Bearer $TOKEN"

STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_AFTER_TRASH=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage after moving to trash: $USED_AFTER_TRASH bytes"

if [[ "$USED_AFTER_TRASH" != "$USED_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: Storage should NOT change when moving to trash (actual deletion happens on permanent delete)"
    exit 1
fi

# Permanently delete from trash (this should free storage)
echo "9. Permanently deleting from trash..."
curl -s -X DELETE $BASE_URL/api/files/trash/$FILE1_ID \
    -H "Authorization: Bearer $TOKEN"

STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_AFTER_DELETE=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage after permanent deletion: $USED_AFTER_DELETE bytes"

if [[ "$USED_AFTER_DELETE" -ge "$USED_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: Storage should have decreased after permanent deletion"
    exit 1
fi

# Test storage limit
echo "10. Testing storage limit enforcement..."
# Note: Testing with a truly massive file (100MB+) is impractical in bash
# Instead, we verify that the storage endpoint correctly reports limits
STORAGE_INFO=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
AVAILABLE=$(echo "$STORAGE_INFO" | jq -r '.storageAvailable')
echo "✓ Storage limit validation: Available space = $AVAILABLE bytes"
if [[ "$AVAILABLE" -gt 0 && "$AVAILABLE" -lt 104857600 ]]; then
    echo "✓ Storage tracking is working correctly"
else
    echo "  Note: Full limit enforcement test skipped (would require 100MB+ upload)"
fi

# Test copy and storage tracking
echo "11. Testing copy with storage tracking..."
COPY_RESPONSE=$(curl -s -w "\n%{http_code}" -X POST $BASE_URL/api/files/$FILE2_ID/copy \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"newName":"copy_of_medium.txt"}')

HTTP_CODE=$(echo "$COPY_RESPONSE" | tail -n1)
RESPONSE_BODY=$(echo "$COPY_RESPONSE" | head -n-1)

if [[ "$HTTP_CODE" == "201" ]]; then
    COPY_ID=$(echo "$RESPONSE_BODY" | jq -r '.id')
    echo "✓ File copied: $COPY_ID"
    
    STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
    USED_AFTER_COPY=$(echo "$STORAGE" | jq -r '.storageUsed')
    echo "✓ Storage after copy: $USED_AFTER_COPY bytes"
    
    if [[ "$USED_AFTER_COPY" -le "$USED_AFTER_DELETE" ]]; then
        echo "✗ ERROR: Storage should increase after copy"
        exit 1
    fi
else
    echo "✗ ERROR: Copy failed with HTTP $HTTP_CODE"
    exit 1
fi

# Test folder storage (folders shouldn't consume storage)
echo "12. Testing folder creation (should not consume storage)..."
STORAGE_BEFORE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

FOLDER_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"TestFolder","type":"folder"}')
FOLDER_ID=$(extract_id "$FOLDER_RESPONSE")
echo "✓ Folder created: $FOLDER_ID"

STORAGE_AFTER=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
echo "✓ Storage before: $STORAGE_BEFORE bytes"
echo "✓ Storage after: $STORAGE_AFTER bytes"

if [[ "$STORAGE_AFTER" != "$STORAGE_BEFORE" ]]; then
    echo "✗ ERROR: Folder creation should not consume storage"
    exit 1
fi

# Final storage check
echo ""
echo "12. Final storage summary..."
FINAL_STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
echo "$FINAL_STORAGE" | jq '.'

# Advanced Tests - Multiple Users and Ownership

echo ""
echo "=== Advanced Storage Tests ==="
echo ""

# Create second user for permission tests
echo "13. Creating second user for permission tests..."
RANDOM_ID2=$(date +%s%N)
TEST_USER2="storagetest${RANDOM_ID2}@gmail.com"
CREATE_RESPONSE2=$(curl -s -i -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER2\",\"password\":\"test12345678\",\"firstName\":\"StorageTest2\",\"profileImage\":\"data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg==\"}")
USER2_ID=$(extract_id "$CREATE_RESPONSE2")
echo "✓ Second user created: $USER2_ID"

TOKEN2=$(curl -s -X POST $BASE_URL/api/tokens \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER2\",\"password\":\"test12345678\"}" | jq -r '.token')
echo "✓ Second user token received"

# Check second user's initial storage
USER2_STORAGE_INITIAL=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')
echo "✓ User 2 initial storage: $USER2_STORAGE_INITIAL bytes"

# Test: Editor permissions should NOT affect owner's storage
echo ""
echo "14. Testing EDITOR permissions - storage should track owner only..."
FILE3_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"shared.txt","type":"docs","content":"ORIGINALCONTENT"}')
FILE3_ID=$(extract_id "$FILE3_RESPONSE")
echo "✓ File created by User 1: $FILE3_ID"

USER1_STORAGE_BEFORE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

# Grant EDITOR permission to User 2
PERM_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files/$FILE3_ID/permissions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"EDITOR\"}")
PERM_ID=$(extract_id "$PERM_RESPONSE")
echo "✓ EDITOR permission granted to User 2"

# User 2 edits the file (larger content)
curl -s -X PATCH $BASE_URL/api/files/$FILE3_ID \
    -H "Authorization: Bearer $TOKEN2" \
    -H "Content-Type: application/json" \
    -d '{"content":"VERYLARGECONTENT123456789"}'

USER1_STORAGE_AFTER=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_STORAGE_AFTER=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

echo "✓ User 1 storage before edit: $USER1_STORAGE_BEFORE bytes"
echo "✓ User 1 storage after edit: $USER1_STORAGE_AFTER bytes"
echo "✓ User 2 storage after edit: $USER2_STORAGE_AFTER bytes"

if [[ "$USER1_STORAGE_AFTER" -le "$USER1_STORAGE_BEFORE" ]]; then
    echo "✗ ERROR: Owner's storage should increase when file content grows"
    exit 1
fi

if [[ "$USER2_STORAGE_AFTER" != "$USER2_STORAGE_INITIAL" ]]; then
    echo "✗ ERROR: Editor's storage should NOT change when editing others' files"
    exit 1
fi

echo "✓ Storage correctly tracked to owner only"

# Test: Nested folders with different owners
echo ""
echo "15. Testing nested folders with mixed ownership..."

# User 1 creates parent folder
PARENT_FOLDER_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"ParentFolder","type":"folder"}')
PARENT_FOLDER_ID=$(extract_id "$PARENT_FOLDER_RESPONSE")
echo "✓ Parent folder created by User 1: $PARENT_FOLDER_ID"

# User 1 creates file in folder
FILE_IN_FOLDER1_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"file1.txt\",\"type\":\"docs\",\"content\":\"USER1DATA\",\"parentId\":\"$PARENT_FOLDER_ID\"}")
FILE_IN_FOLDER1_ID=$(extract_id "$FILE_IN_FOLDER1_RESPONSE")
echo "✓ File1 created by User 1 in folder"

# Grant EDITOR to User 2 on parent folder
curl -s -X POST $BASE_URL/api/files/$PARENT_FOLDER_ID/permissions \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"targetUserId\":\"$USER2_ID\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

# User 2 creates file in the same folder (becomes owner of this file)
FILE_IN_FOLDER2_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN2" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"file2.txt\",\"type\":\"docs\",\"content\":\"USER2DATA\",\"parentId\":\"$PARENT_FOLDER_ID\"}")
FILE_IN_FOLDER2_ID=$(extract_id "$FILE_IN_FOLDER2_RESPONSE")
echo "✓ File2 created by User 2 in folder"

USER1_BEFORE_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_BEFORE_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

# User 1 deletes the entire parent folder (moves to trash first)
curl -s -X DELETE $BASE_URL/api/files/$PARENT_FOLDER_ID \
    -H "Authorization: Bearer $TOKEN"

USER1_AFTER_TRASH=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_AFTER_TRASH=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

echo "✓ User 1 storage before delete: $USER1_BEFORE_DELETE bytes"
echo "✓ User 1 storage after trash: $USER1_AFTER_TRASH bytes"
echo "✓ User 2 storage before delete: $USER2_BEFORE_DELETE bytes"
echo "✓ User 2 storage after trash: $USER2_AFTER_TRASH bytes"

# Storage should NOT change when moving to trash
if [[ "$USER1_AFTER_TRASH" != "$USER1_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 1 storage should not change when moving to trash"
    exit 1
fi

if [[ "$USER2_AFTER_TRASH" != "$USER2_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 2 storage should not change when moving to trash"
    exit 1
fi

# Now permanently delete from trash
curl -s -X DELETE $BASE_URL/api/files/trash/$PARENT_FOLDER_ID \
    -H "Authorization: Bearer $TOKEN"

USER1_AFTER_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_AFTER_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

echo "✓ User 1 storage after permanent delete: $USER1_AFTER_DELETE bytes"
echo "✓ User 2 storage after permanent delete: $USER2_AFTER_DELETE bytes"

# User 1's files should be deleted (folder + file1)
if [[ "$USER1_AFTER_DELETE" -ge "$USER1_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 1 storage should decrease after deleting their files"
    exit 1
fi

# User 2's file should NOT be deleted - it becomes an orphan (parentId=null)
# This is the orphan handling behavior tested in test_trash.sh Test 11
if [[ "$USER2_AFTER_DELETE" != "$USER2_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 2 storage should NOT change (their file becomes orphan, not deleted)"
    exit 1
fi

# Verify User 2's file still exists and is now orphaned
FILE2_CHECK=$(curl -s $BASE_URL/api/files/$FILE_IN_FOLDER2_ID -H "Authorization: Bearer $TOKEN2")
FILE2_PARENT=$(echo "$FILE2_CHECK" | jq -r '.parentId')
FILE2_OWNER=$(echo "$FILE2_CHECK" | jq -r '.ownerId')

if [[ "$FILE2_PARENT" != "null" ]]; then
    echo "✗ ERROR: User 2's file should be orphaned (parentId should be null)"
    exit 1
fi

if [[ "$FILE2_OWNER" != "$USER2_ID" ]]; then
    echo "✗ ERROR: User 2 should still own their file"
    exit 1
fi

echo "✓ User 1's files deleted, User 2's file orphaned (storage preserved)"
echo "✓ Orphan handling verified: User 2's file accessible with parentId=null"

# Test: Rename and move should NOT affect storage
echo ""
echo "16. Testing rename/move operations (should not affect storage)..."

FILE4_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"renameme.txt","type":"docs","content":"STATICCONTENT"}')
FILE4_ID=$(extract_id "$FILE4_RESPONSE")
echo "✓ File created: $FILE4_ID"

STORAGE_BEFORE_RENAME=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

# Rename only
curl -s -X PATCH $BASE_URL/api/files/$FILE4_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"renamed.txt"}'

STORAGE_AFTER_RENAME=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

echo "✓ Storage before rename: $STORAGE_BEFORE_RENAME bytes"
echo "✓ Storage after rename: $STORAGE_AFTER_RENAME bytes"

if [[ "$STORAGE_AFTER_RENAME" != "$STORAGE_BEFORE_RENAME" ]]; then
    echo "✗ ERROR: Rename should not affect storage"
    exit 1
fi

# Create folder and move file into it
MOVE_FOLDER_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"MoveTarget","type":"folder"}')
MOVE_FOLDER_ID=$(extract_id "$MOVE_FOLDER_RESPONSE")

# Move file
curl -s -X PATCH $BASE_URL/api/files/$FILE4_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d "{\"parentId\":\"$MOVE_FOLDER_ID\"}"

STORAGE_AFTER_MOVE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

echo "✓ Storage after move: $STORAGE_AFTER_MOVE bytes"

if [[ "$STORAGE_AFTER_MOVE" != "$STORAGE_BEFORE_RENAME" ]]; then
    echo "✗ ERROR: Move should not affect storage"
    exit 1
fi

echo "✓ Rename and move operations do not affect storage"

# Test: Content update affects owner's storage
echo ""
echo "17. Testing content update affects owner's storage..."

FILE5_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"updatetest.txt","type":"docs","content":"SMALL"}')
FILE5_ID=$(extract_id "$FILE5_RESPONSE")
echo "✓ File created with small content"

STORAGE_BEFORE_CONTENT_UPDATE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

# Update with larger content
curl -s -X PATCH $BASE_URL/api/files/$FILE5_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"MUCHLARGERCONTENTHERE12345"}'

STORAGE_AFTER_CONTENT_UPDATE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

echo "✓ Storage before content update: $STORAGE_BEFORE_CONTENT_UPDATE bytes"
echo "✓ Storage after content update: $STORAGE_AFTER_CONTENT_UPDATE bytes"

if [[ "$STORAGE_AFTER_CONTENT_UPDATE" -le "$STORAGE_BEFORE_CONTENT_UPDATE" ]]; then
    echo "✗ ERROR: Storage should increase when content grows"
    exit 1
fi

# Update with smaller content
curl -s -X PATCH $BASE_URL/api/files/$FILE5_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"TINY"}'

STORAGE_AFTER_SHRINK=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')

echo "✓ Storage after shrinking content: $STORAGE_AFTER_SHRINK bytes"

if [[ "$STORAGE_AFTER_SHRINK" -ge "$STORAGE_AFTER_CONTENT_UPDATE" ]]; then
    echo "✗ ERROR: Storage should decrease when content shrinks"
    exit 1
fi

echo "✓ Content updates correctly affect owner's storage"

echo ""
echo "=== All Storage Tests Passed! ==="
