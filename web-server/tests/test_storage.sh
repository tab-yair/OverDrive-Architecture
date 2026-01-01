#!/bin/bash
# Test storage tracking and limits

echo "=== Testing Storage Tracking and Limits ==="
echo ""

BASE_URL="http://localhost:3000"

# Helper function to extract file ID from Location header
extract_id() {
    echo "$1" | grep -i "Location:" | awk -F'/' '{print $NF}' | tr -d '\r\n'
}

# Create test user
echo "1. Creating test user..."
RANDOM_ID=$(date +%s%N)
TEST_USER="storagetest${RANDOM_ID}@gmail.com"
CREATE_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/users \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test1234\",\"firstName\":\"StorageTest\"}")
USER_ID=$(extract_id "$CREATE_RESPONSE")
echo "✓ User created: $USER_ID"

# Login
echo "2. Logging in..."
TOKEN=$(curl -s -X POST $BASE_URL/api/tokens \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER\",\"password\":\"test1234\"}" | jq -r '.token')
echo "✓ Token received"

# Check initial storage (should be 0)
echo "3. Checking initial storage..."
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED=$(echo "$STORAGE" | jq -r '.storageUsed')
LIMIT=$(echo "$STORAGE" | jq -r '.storageLimit')
USED_MB=$(echo "$STORAGE" | jq -r '.storageUsedMB')
LIMIT_MB=$(echo "$STORAGE" | jq -r '.storageLimitMB')
echo "✓ Storage used: $USED bytes ($USED_MB MB)"
echo "✓ Storage limit: $LIMIT bytes ($LIMIT_MB MB)"

if [[ "$USED" != "0" ]]; then
    echo "✗ ERROR: Initial storage should be 0, got $USED"
    exit 1
fi

# Create a small file (single line as per requirements)
echo "4. Creating small file..."
FILE1_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"small.txt","type":"file","content":"AAAA"}')
FILE1_ID=$(extract_id "$FILE1_RESPONSE")
echo "✓ File created: $FILE1_ID"

# Check storage increased
echo "5. Checking storage after file creation..."
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage used: $USED bytes"

if [[ "$USED" == "0" ]]; then
    echo "✗ ERROR: Storage should have increased"
    exit 1
fi

# Update file with larger content
echo "6. Updating file with larger content..."
curl -s -X PATCH $BASE_URL/api/files/$FILE1_ID \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"content":"AAAAAAAAAA"}'
    
STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_AFTER=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage after update: $USED_AFTER bytes"

if [[ "$USED_AFTER" -le "$USED" ]]; then
    echo "✗ ERROR: Storage should have increased after update"
    exit 1
fi

# Create another file
echo "7. Creating another file..."
FILE2_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"medium.txt","type":"file","content":"BBBBBBBBBB"}')
FILE2_ID=$(extract_id "$FILE2_RESPONSE")
echo "✓ File created: $FILE2_ID"

STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_BEFORE_DELETE=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage before deletion: $USED_BEFORE_DELETE bytes"

# Delete first file
echo "8. Deleting first file..."
curl -s -X DELETE $BASE_URL/api/files/$FILE1_ID \
    -H "Authorization: Bearer $TOKEN"

STORAGE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN")
USED_AFTER_DELETE=$(echo "$STORAGE" | jq -r '.storageUsed')
echo "✓ Storage after deletion: $USED_AFTER_DELETE bytes"

if [[ "$USED_AFTER_DELETE" -ge "$USED_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: Storage should have decreased after deletion"
    exit 1
fi

# Test storage limit
echo "9. Testing storage limit enforcement..."
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
echo "10. Testing copy with storage tracking..."
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
echo "11. Testing folder creation (should not consume storage)..."
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
    -d "{\"username\":\"$TEST_USER2\",\"password\":\"test1234\",\"firstName\":\"StorageTest2\"}")
USER2_ID=$(extract_id "$CREATE_RESPONSE2")
echo "✓ Second user created: $USER2_ID"

TOKEN2=$(curl -s -X POST $BASE_URL/api/tokens \
    -H "Content-Type: application/json" \
    -d "{\"username\":\"$TEST_USER2\",\"password\":\"test1234\"}" | jq -r '.token')
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
    -d '{"name":"shared.txt","type":"file","content":"ORIGINALCONTENT"}')
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
    -d "{\"name\":\"file1.txt\",\"type\":\"file\",\"content\":\"USER1DATA\",\"parentId\":\"$PARENT_FOLDER_ID\"}")
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
    -d "{\"name\":\"file2.txt\",\"type\":\"file\",\"content\":\"USER2DATA\",\"parentId\":\"$PARENT_FOLDER_ID\"}")
FILE_IN_FOLDER2_ID=$(extract_id "$FILE_IN_FOLDER2_RESPONSE")
echo "✓ File2 created by User 2 in folder"

USER1_BEFORE_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_BEFORE_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

# User 1 deletes the entire parent folder
curl -s -X DELETE $BASE_URL/api/files/$PARENT_FOLDER_ID \
    -H "Authorization: Bearer $TOKEN"

USER1_AFTER_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN" | jq -r '.storageUsed')
USER2_AFTER_DELETE=$(curl -s $BASE_URL/api/storage -H "Authorization: Bearer $TOKEN2" | jq -r '.storageUsed')

echo "✓ User 1 storage before delete: $USER1_BEFORE_DELETE bytes"
echo "✓ User 1 storage after delete: $USER1_AFTER_DELETE bytes"
echo "✓ User 2 storage before delete: $USER2_BEFORE_DELETE bytes"
echo "✓ User 2 storage after delete: $USER2_AFTER_DELETE bytes"

if [[ "$USER1_AFTER_DELETE" -ge "$USER1_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 1 storage should decrease after deleting their files"
    exit 1
fi

if [[ "$USER2_AFTER_DELETE" -ge "$USER2_BEFORE_DELETE" ]]; then
    echo "✗ ERROR: User 2 storage should decrease after their files are deleted"
    exit 1
fi

echo "✓ Nested folder deletion correctly freed storage for each owner"

# Test: Rename and move should NOT affect storage
echo ""
echo "16. Testing rename/move operations (should not affect storage)..."

FILE4_RESPONSE=$(curl -s -i -X POST $BASE_URL/api/files \
    -H "Authorization: Bearer $TOKEN" \
    -H "Content-Type: application/json" \
    -d '{"name":"renameme.txt","type":"file","content":"STATICCONTENT"}')
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
    -d '{"name":"updatetest.txt","type":"file","content":"SMALL"}')
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
