#!/bin/bash

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0
# שימוש בפורמט מספרים בלבד כדי למנוע תווים אסורים
TS=$(date +%s%N | cut -b1-13) 

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

pass() { echo -e "${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "${RED}✗${NC} $1"; ((FAIL++)); }
info() { echo -e "${YELLOW}→${NC} $1"; }

section() {
    echo -e "\n${BLUE}======================================${NC}"
    echo -e "${BLUE}  $1${NC}"
    echo -e "${BLUE}======================================${NC}"
}

extract_id() {
    local header=$1
    echo "$header" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n '
}

section "SECTION 1: USER MANAGEMENT"

U1_EMAIL="owner${TS}@gmail.com"
U2_EMAIL="editor${TS}@gmail.com"

info "Registering users: $U1_EMAIL and $U2_EMAIL"

RESP1=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U1_EMAIL\",\"password\":\"password123\",\"firstName\":\"Owner\"}")
U1=$(extract_id "$RESP1")

RESP2=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U2_EMAIL\",\"password\":\"password123\",\"firstName\":\"Editor\"}")
U2=$(echo "$RESP2" | grep -i "Location:" | sed 's/.*\/users\///' | tr -d '\r\n ')

if [[ -n "$U1" && -n "$U2" ]]; then 
    pass "Users created successfully (U1: $U1, U2: $U2)"
else 
    fail "User creation failed."
    exit 1
fi

# Login for User 2 as well
info "Testing login for User 2..."
TOKEN2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U2_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

if [[ -n "$TOKEN2" && "$TOKEN2" != "null" ]]; then 
    pass "User 2 login successful"
else 
    fail "User 2 login failed."
fi

section "SECTION 2: LOGIN & TOKEN"

info "Testing login for User 1..."
TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U1_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

if [[ -n "$TOKEN" && "$TOKEN" != "null" ]]; then 
    pass "Login successful - JWT token received"
else 
    fail "Login failed."
fi

section "SECTION 3: FILE CREATION & OWNER SEARCH"

info "Creating file with RLE content (Owner: User 1)..."
FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"project_report.txt","type":"docs","content":"CONFIDENTIAL_DATA_123"}')

FILE_ID=$(echo "$FILE_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$FILE_ID" ]]; then
    pass "File created (ID: $FILE_ID)"
else
    fail "File creation failed"
fi

info "Performing search as Owner (User 1)..."
SEARCH_U1=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "Authorization: Bearer $TOKEN")
if [[ "$SEARCH_U1" == *"project_report.txt"* ]]; then
    pass "Owner found the file correctly"
else
    fail "Owner failed to find their own file"
fi

section "SECTION 4: SECURITY & PERMISSION FILTERING"

# בדיקה שמשתמש ב' (U2) לא רואה את הקובץ בחיפוש כי אין לו הרשאה
info "Verifying User 2 (Guest) CANNOT see the file in search..."
SEARCH_U2=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "Authorization: Bearer $TOKEN2")

if [[ "$SEARCH_U2" == "[]" || -z "$SEARCH_U2" || "$SEARCH_U2" != *"project_report.txt"* ]]; then
    pass "Security Check Passed: User 2 filtered out correctly (Privacy maintained)"
else
    fail "SECURITY BREACH: User 2 found a file without permissions!"
    echo "Leakage data: $SEARCH_U2"
fi

# אופציונלי: מתן הרשאה ובדיקה שמעכשיו הוא כן רואה
info "Granting VIEWER permission to User 2..."
curl -s -X POST "$BASE_URL/api/files/$FILE_ID/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

info "Performing search again as User 2 (After permission granted)..."
SEARCH_U2_AFTER=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "Authorization: Bearer $TOKEN2")
if [[ "$SEARCH_U2_AFTER" == *"project_report.txt"* ]]; then
    pass "Permission Elevation Worked: User 2 can now see the file"
else
    fail "Permission update failed to reflect in search"
fi

section "SECTION 5: STARRED FILES"

info "Creating additional files for starring tests..."
FILE2_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"important.txt","type":"docs","content":"Important document"}')
FILE2_ID=$(echo "$FILE2_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

FILE3_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"notes.txt","type":"docs","content":"Meeting notes"}')
FILE3_ID=$(echo "$FILE3_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$FILE2_ID" && -n "$FILE3_ID" ]]; then
    pass "Additional files created (FILE2: $FILE2_ID, FILE3: $FILE3_ID)"
else
    fail "Additional file creation failed"
fi

info "Testing initial starred files list (should be empty)..."
STARRED_INITIAL=$(curl -s -X GET "$BASE_URL/api/files/starred" -H "Authorization: Bearer $TOKEN")
if [[ "$STARRED_INITIAL" == "[]" ]]; then
    pass "Initial starred list is empty"
else
    fail "Initial starred list should be empty"
fi

info "Starring first file..."
STAR1=$(curl -s -X POST "$BASE_URL/api/files/$FILE_ID/star" -H "Authorization: Bearer $TOKEN" | jq -r '.isStarred')
if [[ "$STAR1" == "true" ]]; then
    pass "File starred successfully"
else
    fail "Failed to star file"
fi

info "Starring second file..."
STAR2=$(curl -s -X POST "$BASE_URL/api/files/$FILE2_ID/star" -H "Authorization: Bearer $TOKEN" | jq -r '.isStarred')
if [[ "$STAR2" == "true" ]]; then
    pass "Second file starred successfully"
else
    fail "Failed to star second file"
fi

info "Checking starred files list (should have 2 files)..."
STARRED_COUNT=$(curl -s -X GET "$BASE_URL/api/files/starred" -H "Authorization: Bearer $TOKEN" | jq '. | length')
if [[ "$STARRED_COUNT" == "2" ]]; then
    pass "Starred list has correct count: 2"
else
    fail "Starred list count incorrect: $STARRED_COUNT (expected 2)"
fi

info "Unstarring first file..."
UNSTAR=$(curl -s -X POST "$BASE_URL/api/files/$FILE_ID/star" -H "Authorization: Bearer $TOKEN" | jq -r '.isStarred')
if [[ "$UNSTAR" == "false" ]]; then
    pass "File unstarred successfully"
else
    fail "Failed to unstar file"
fi

info "Checking starred files list after unstar (should have 1 file)..."
STARRED_AFTER=$(curl -s -X GET "$BASE_URL/api/files/starred" -H "Authorization: Bearer $TOKEN" | jq '. | length')
if [[ "$STARRED_AFTER" == "1" ]]; then
    pass "Starred list updated correctly: 1"
else
    fail "Starred list count incorrect after unstar: $STARRED_AFTER (expected 1)"
fi

info "Verifying User 2 has separate starred list..."
STARRED_U2=$(curl -s -X GET "$BASE_URL/api/files/starred" -H "Authorization: Bearer $TOKEN2")
if [[ "$STARRED_U2" == "[]" ]]; then
    pass "User isolation: User 2 has empty starred list"
else
    fail "Starred lists not properly isolated between users"
fi

section "SECTION 6: RECENTLY ACCESSED FILES"

info "Viewing files to create recent activity..."
sleep 1
curl -s -X GET "$BASE_URL/api/files/$FILE_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
sleep 1
curl -s -X GET "$BASE_URL/api/files/$FILE2_ID" -H "Authorization: Bearer $TOKEN" > /dev/null
sleep 1
curl -s -X GET "$BASE_URL/api/files/$FILE3_ID" -H "Authorization: Bearer $TOKEN" > /dev/null

info "Checking recent files list..."
RECENT=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
RECENT_COUNT=$(echo "$RECENT" | jq '. | length')
if [[ "$RECENT_COUNT" -ge "3" ]]; then
    pass "Recent files list has at least 3 files"
else
    fail "Recent files count incorrect: $RECENT_COUNT (expected at least 3)"
fi

info "Verifying most recent file is at top..."
FIRST_FILE=$(echo "$RECENT" | jq -r '.[0].id')
if [[ "$FIRST_FILE" == "$FILE3_ID" ]]; then
    pass "Most recently viewed file is first in list"
else
    fail "Recent files not sorted correctly (expected $FILE3_ID, got $FIRST_FILE)"
fi

info "Editing a file to test EDIT interaction..."
sleep 1
curl -s -X PATCH "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Updated content"}' > /dev/null

info "Verifying edited file moved to top of recent list..."
RECENT_AFTER_EDIT=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
FIRST_AFTER_EDIT=$(echo "$RECENT_AFTER_EDIT" | jq -r '.[0].id')
INTERACTION_TYPE=$(echo "$RECENT_AFTER_EDIT" | jq -r '.[0].lastInteractionType')

if [[ "$FIRST_AFTER_EDIT" == "$FILE_ID" && "$INTERACTION_TYPE" == "EDIT" ]]; then
    pass "Edited file moved to top with EDIT interaction type"
else
    fail "Recent list not updated correctly after edit"
fi

info "Verifying recent files have metadata..."
HAS_VIEWED=$(echo "$RECENT_AFTER_EDIT" | jq '.[0] | has("lastViewedAt")')
HAS_INTERACTION=$(echo "$RECENT_AFTER_EDIT" | jq '.[0] | has("lastInteractionType")')
HAS_STARRED=$(echo "$RECENT_AFTER_EDIT" | jq '.[0] | has("isStarred")')

if [[ "$HAS_VIEWED" == "true" && "$HAS_INTERACTION" == "true" && "$HAS_STARRED" == "true" ]]; then
    pass "Recent files include all metadata fields"
else
    fail "Recent files missing metadata fields"
fi

info "Creating and viewing a folder to verify folders don't appear in recent..."
TEST_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"RecentTestFolder","type":"folder"}')
TEST_FOLDER_ID=$(echo "$TEST_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

sleep 1
curl -s -X GET "$BASE_URL/api/files/$TEST_FOLDER_ID" -H "Authorization: Bearer $TOKEN" > /dev/null

info "Verifying folder does NOT appear in recent files list..."
RECENT_WITH_FOLDER=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
FOLDER_IN_RECENT=$(echo "$RECENT_WITH_FOLDER" | jq --arg fid "$TEST_FOLDER_ID" '.[] | select(.id==$fid) | .id')

if [[ -z "$FOLDER_IN_RECENT" ]]; then
    pass "Folders correctly excluded from recent files list"
else
    fail "Folder incorrectly appears in recent files"
fi

section "SECTION 7: FILE COPY (DEEP COPY)"

info "Testing file copy with default name..."
COPY_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$FILE_ID/copy" -H "Authorization: Bearer $TOKEN")
COPY_ID=$(echo "$COPY_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$COPY_ID" ]]; then
    pass "File copied successfully (ID: $COPY_ID)"
else
    fail "File copy failed"
fi

info "Verifying copied file has correct name..."
COPY_NAME=$(curl -s -X GET "$BASE_URL/api/files/$COPY_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.name')
if [[ "$COPY_NAME" == "Copy of project_report.txt" ]]; then
    pass "Copy has default name 'Copy of <original>'"
else
    fail "Copy name incorrect: $COPY_NAME"
fi

info "Verifying User 1 is owner of the copy..."
COPY_OWNER=$(curl -s -X GET "$BASE_URL/api/files/$COPY_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.ownerId')
if [[ "$COPY_OWNER" == "$U1" ]]; then
    pass "User 1 is owner of the copied file"
else
    fail "Copy ownership incorrect"
fi

info "Creating folder with files for deep copy test..."
FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"TestFolder","type":"folder"}')
FOLDER_ID=$(echo "$FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

FILE_IN_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"nested.txt\",\"type\":\"docs\",\"content\":\"Nested content\",\"parentId\":\"$FOLDER_ID\"}") 
FILE_IN_FOLDER_ID=$(echo "$FILE_IN_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

info "Testing deep copy of folder..."
FOLDER_COPY_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$FOLDER_ID/copy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newName":"TestFolder Copy"}')
FOLDER_COPY_ID=$(echo "$FOLDER_COPY_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$FOLDER_COPY_ID" ]]; then
    pass "Folder copied successfully (ID: $FOLDER_COPY_ID)"
else
    fail "Folder copy failed"
fi

info "Verifying folder copy contains children..."
FOLDER_COPY_CONTENT=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_COPY_ID" -H "Authorization: Bearer $TOKEN")
CHILDREN_COUNT=$(echo "$FOLDER_COPY_CONTENT" | jq '.children | length')
if [[ "$CHILDREN_COUNT" -ge "1" ]]; then
    pass "Deep copy successful: Folder contains $CHILDREN_COUNT children"
else
    fail "Deep copy failed: No children in copied folder"
fi

info "Testing copy with User 2 (who has VIEWER permission)..."
COPY_BY_U2_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$FILE_ID/copy" -H "Authorization: Bearer $TOKEN2")
COPY_BY_U2_ID=$(echo "$COPY_BY_U2_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$COPY_BY_U2_ID" ]]; then
    COPY_BY_U2_OWNER=$(curl -s -X GET "$BASE_URL/api/files/$COPY_BY_U2_ID" -H "Authorization: Bearer $TOKEN2" | jq -r '.ownerId')
    if [[ "$COPY_BY_U2_OWNER" == "$U2" ]]; then
        pass "User 2 can copy and becomes owner of their copy"
    else
        fail "Copy ownership transfer failed"
    fi
else
    fail "User 2 failed to copy file they have permission to"
fi

section "SECTION 8: SHARED WITH ME"

info "Checking User 2's shared files list..."
SHARED_U2=$(curl -s -X GET "$BASE_URL/api/files/shared" -H "Authorization: Bearer $TOKEN2")
SHARED_COUNT=$(echo "$SHARED_U2" | jq '. | length')

if [[ "$SHARED_COUNT" -ge "1" ]]; then
    pass "User 2 can see shared files (count: $SHARED_COUNT)"
else
    fail "Shared files list empty for User 2"
fi

info "Verifying shared file has correct metadata..."
FIRST_SHARED=$(echo "$SHARED_U2" | jq -r '.[0].id')
SHARED_PERM_LEVEL=$(echo "$SHARED_U2" | jq -r '.[0].sharedPermissionLevel')
SHARED_OWNER=$(echo "$SHARED_U2" | jq -r '.[0].ownerId')

if [[ "$SHARED_PERM_LEVEL" == "VIEWER" && "$SHARED_OWNER" == "$U1" ]]; then
    pass "Shared file has correct permission level and owner info"
else
    fail "Shared file metadata incorrect (level: $SHARED_PERM_LEVEL, owner: $SHARED_OWNER)"
fi

info "Verifying User 1 (owner) does NOT see their own files in shared list..."
SHARED_U1=$(curl -s -X GET "$BASE_URL/api/files/shared" -H "Authorization: Bearer $TOKEN")
SHARED_U1_COUNT=$(echo "$SHARED_U1" | jq '. | length')

if [[ "$SHARED_U1_COUNT" == "0" ]]; then
    pass "User 1 correctly has empty shared list (they own the files)"
else
    fail "Owner seeing their own files in shared list"
fi

info "Creating file owned by User 2 and sharing with User 1..."
U2_FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"name":"u2_file.txt","type":"docs","content":"User 2 content"}')
U2_FILE_ID=$(echo "$U2_FILE_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

curl -s -X POST "$BASE_URL/api/files/$U2_FILE_ID/permissions" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U1\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

info "Verifying User 1 now sees this file in shared list..."
SHARED_U1_AFTER=$(curl -s -X GET "$BASE_URL/api/files/shared" -H "Authorization: Bearer $TOKEN")
U1_SHARED_COUNT=$(echo "$SHARED_U1_AFTER" | jq '. | length')
U1_SHARED_LEVEL=$(echo "$SHARED_U1_AFTER" | jq -r '.[0].sharedPermissionLevel')

if [[ "$U1_SHARED_COUNT" -ge "1" && "$U1_SHARED_LEVEL" == "EDITOR" ]]; then
    pass "User 1 sees file shared by User 2 with EDITOR permission"
else
    fail "Shared with me not working correctly for User 1"
fi

section "SECTION 9: RECURSIVE PERMISSIONS"

info "Creating folder hierarchy: MainFolder > SubFolder > DeepFile.txt"
MAIN_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MainFolder","type":"folder"}')
MAIN_FOLDER=$(echo "$MAIN_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

SUB_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SubFolder\",\"type\":\"folder\",\"parentId\":\"$MAIN_FOLDER\"}")
SUB_FOLDER=$(echo "$SUB_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

DEEP_FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"DeepFile.txt\",\"type\":\"docs\",\"content\":\"Deep content\",\"parentId\":\"$SUB_FOLDER\"}") 
DEEP_FILE=$(echo "$DEEP_FILE_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$MAIN_FOLDER" && -n "$SUB_FOLDER" && -n "$DEEP_FILE" ]]; then
    pass "Folder hierarchy created successfully"
else
    fail "Failed to create folder hierarchy"
fi

info "Granting VIEWER permission on MainFolder to User 2 (should propagate)..."
curl -s -X POST "$BASE_URL/api/files/$MAIN_FOLDER/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

info "Testing User 2 access to deeply nested file (inherited permission)..."
DEEP_ACCESS=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/api/files/$DEEP_FILE" \
  -H "Authorization: Bearer $TOKEN2")

if [[ "$DEEP_ACCESS" == "200" ]]; then
    pass "Recursive permission grant works - User 2 can access nested file"
else
    fail "Recursive permission failed (HTTP $DEEP_ACCESS)"
fi

info "Granting EDITOR permission directly on DeepFile.txt to User 2..."
curl -s -X POST "$BASE_URL/api/files/$DEEP_FILE/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

info "Testing if User 2 can edit file (direct EDITOR should override inherited VIEWER)..."
EDIT_RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/api/files/$DEEP_FILE" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"content":"Modified by User2"}')

if [[ "$EDIT_RESULT" == "204" ]]; then
    pass "Direct EDITOR permission overrides inherited VIEWER"
else
    fail "Permission override failed (HTTP $EDIT_RESULT)"
fi

info "Deleting folder permission (should keep direct permission on file)..."
FOLDER_PERM=$(curl -s -X GET "$BASE_URL/api/files/$MAIN_FOLDER/permissions" \
  -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.userId==\"$U2\") | .pid")

curl -s -X DELETE "$BASE_URL/api/files/$MAIN_FOLDER/permissions/$FOLDER_PERM" \
  -H "Authorization: Bearer $TOKEN" > /dev/null

info "Verifying User 2 still has access to file (direct permission kept)..."
FILE_ACCESS=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/api/files/$DEEP_FILE" \
  -H "Authorization: Bearer $TOKEN2")

if [[ "$FILE_ACCESS" == "200" ]]; then
    pass "Direct permission preserved after folder permission deletion"
else
    fail "Direct permission incorrectly removed (HTTP $FILE_ACCESS)"
fi

info "Verifying User 2 lost access to subfolder (inherited permission removed)..."
SUBFOLDER_ACCESS=$(curl -s -X GET "$BASE_URL/api/files/$SUB_FOLDER" \
  -H "Authorization: Bearer $TOKEN2" 2>&1)

if [[ "$SUBFOLDER_ACCESS" == *"Permission denied"* ]] || [[ "$SUBFOLDER_ACCESS" == *"error"* ]]; then
    pass "Inherited permission correctly removed from subfolder"
else
    fail "Inherited permission not properly removed"
fi

section "SECTION 10: RECURSIVE COPY"

info "Creating complex folder structure for copy test..."
COPY_SRC_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"SourceFolder","type":"folder"}')
COPY_SRC=$(echo "$COPY_SRC_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"file1.txt\",\"type\":\"docs\",\"content\":\"File 1\",\"parentId\":\"$COPY_SRC\"}" > /dev/null

COPY_SUBFOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SubDir\",\"type\":\"folder\",\"parentId\":\"$COPY_SRC\"}")
COPY_SUBFOLDER=$(echo "$COPY_SUBFOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"file2.txt\",\"type\":\"docs\",\"content\":\"File 2\",\"parentId\":\"$COPY_SUBFOLDER\"}" > /dev/null

if [[ -n "$COPY_SRC" && -n "$COPY_SUBFOLDER" ]]; then
    pass "Source folder structure created"
else
    fail "Failed to create source structure"
fi

info "Copying entire folder recursively..."
COPY_RESULT=$(curl -s -X POST "$BASE_URL/api/files/$COPY_SRC/copy" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"newName":"SourceFolder_Copy"}')

COPY_ID=$(echo "$COPY_RESULT" | jq -r '.id')
COPY_NAME=$(echo "$COPY_RESULT" | jq -r '.name')

if [[ "$COPY_NAME" == "SourceFolder_Copy" ]]; then
    pass "Folder copy initiated successfully"
else
    fail "Folder copy failed"
fi

info "Verifying copied folder structure..."
COPY_CONTENT=$(curl -s -X GET "$BASE_URL/api/files/$COPY_ID" \
  -H "Authorization: Bearer $TOKEN")
COPY_CHILDREN=$(echo "$COPY_CONTENT" | jq '.children | length')

if [[ "$COPY_CHILDREN" -ge "2" ]]; then
    pass "Recursive copy successful - folder has $COPY_CHILDREN children"
else
    fail "Recursive copy incomplete - only $COPY_CHILDREN children"
fi

info "Verifying deep copy created NEW file IDs (not same as original)..."
ORIG_CHILDREN=$(curl -s -X GET "$BASE_URL/api/files/$COPY_SRC" -H "Authorization: Bearer $TOKEN")
ORIG_CHILD_ID=$(echo "$ORIG_CHILDREN" | jq -r '.children[0].id')
COPY_CHILD_ID=$(echo "$COPY_CONTENT" | jq -r '.children[0].id')

if [[ "$ORIG_CHILD_ID" != "$COPY_CHILD_ID" ]]; then
    pass "Deep copy creates new file instances (Original: $ORIG_CHILD_ID, Copy: $COPY_CHILD_ID)"
else
    fail "CRITICAL: Deep copy reused same file IDs - not a true copy!"
fi

info "Verifying parent-child relationships preserved correctly..."
COPY_CHILD_PARENT=$(echo "$COPY_CONTENT" | jq -r '.children[0].parentId')

if [[ "$COPY_CHILD_PARENT" == "$COPY_ID" ]]; then
    pass "Child's parentId points to copied folder (not original)"
else
    fail "CRITICAL: Child still points to original folder! (Expected: $COPY_ID, Got: $COPY_CHILD_PARENT)"
fi

info "Verifying copy ownership (User 1 should own the copy)..."
COPY_OWNER=$(echo "$COPY_RESULT" | jq -r '.ownerId')

if [[ "$COPY_OWNER" == "$U1" ]]; then
    pass "Copy has correct owner"
else
    fail "Copy ownership incorrect"
fi

info "Testing copy by non-owner (User 2 with EDITOR permission)..."
curl -s -X POST "$BASE_URL/api/files/$COPY_SRC/permissions" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

U2_COPY=$(curl -s -X POST "$BASE_URL/api/files/$COPY_SRC/copy" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"newName":"U2_Copy"}')

U2_COPY_OWNER=$(echo "$U2_COPY" | jq -r '.ownerId')

if [[ "$U2_COPY_OWNER" == "$U2" ]]; then
    pass "User 2 becomes owner of their copy"
else
    fail "Copy ownership transfer failed"
fi

section "SECTION 11: RECURSIVE DELETION (TRASH + PERMANENT DELETE)"

info "Creating folder with nested structure for deletion test..."
DEL_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"DeleteMe","type":"folder"}')
DEL_FOLDER=$(echo "$DEL_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

DEL_FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"child.txt\",\"type\":\"docs\",\"content\":\"Will be deleted\",\"parentId\":\"$DEL_FOLDER\"}") 
DEL_FILE=$(echo "$DEL_FILE_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$DEL_FOLDER" && -n "$DEL_FILE" ]]; then
    pass "Deletion test structure created (Folder: $DEL_FOLDER, File: $DEL_FILE)"
else
    fail "Failed to create deletion test structure"
fi

info "Moving parent folder to trash (should cascade to children)..."
DEL_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/api/files/$DEL_FOLDER" \
  -H "Authorization: Bearer $TOKEN")

if [[ "$DEL_STATUS" == "204" ]]; then
    pass "Folder moved to trash successfully"
else
    fail "Folder move to trash failed (HTTP $DEL_STATUS)"
fi

info "Verifying folder is in trash (owner can still access)..."
FOLDER_IN_TRASH=$(curl -s -X GET "$BASE_URL/api/files/$DEL_FOLDER" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.isTrashed')

if [[ "$FOLDER_IN_TRASH" == "true" ]]; then
    pass "Folder correctly marked as trashed"
else
    fail "Folder not in trash (isTrashed=$FOLDER_IN_TRASH)"
fi

info "Permanently deleting folder from trash (should cascade to children)..."
PERM_DEL_STATUS=$(curl -s -w "%{http_code}" -o /dev/null -X DELETE "$BASE_URL/api/files/trash/$DEL_FOLDER" \
  -H "Authorization: Bearer $TOKEN")

if [[ "$PERM_DEL_STATUS" == "204" ]]; then
    pass "Folder permanently deleted successfully"
else
    fail "Permanent deletion failed (HTTP $PERM_DEL_STATUS)"
fi

info "Verifying child file was also deleted (should get 404)..."
CHILD_CHECK=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/api/files/$DEL_FILE" \
  -H "Authorization: Bearer $TOKEN")

if [[ "$CHILD_CHECK" == "404" ]]; then
    pass "Recursive deletion works - child file deleted with parent"
else
    fail "Recursive deletion failed - child file still exists (HTTP $CHILD_CHECK)"
fi

info "Verifying parent folder is also gone (should get 404)..."
FOLDER_CHECK=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/api/files/$DEL_FOLDER" \
  -H "Authorization: Bearer $TOKEN")

if [[ "$FOLDER_CHECK" == "404" ]]; then
    pass "Parent folder properly deleted"
else
    fail "Parent folder still exists (HTTP $FOLDER_CHECK)"
fi

section "SECTION 12: SHARED + STARRED COMBINATION"

info "User 2 starring a file shared by User 1..."
# Use FILE_ID which was shared with User 2 earlier
STAR_SHARED=$(curl -s -X POST "$BASE_URL/api/files/$FILE_ID/star" \
  -H "Authorization: Bearer $TOKEN2" | jq -r '.isStarred')

if [[ "$STAR_SHARED" == "true" ]]; then
    pass "User 2 starred shared file successfully"
else
    fail "Failed to star shared file"
fi

sleep 0.5  # Give time for metadata to persist

info "Verifying file appears in User 2's starred list..."
STARRED_BY_U2=$(curl -s -X GET "$BASE_URL/api/files/starred" -H "Authorization: Bearer $TOKEN2")
STARRED_HAS_SHARED=$(echo "$STARRED_BY_U2" | jq -r ".[] | select(.id==\"$FILE_ID\") | .id")

if [[ "$STARRED_HAS_SHARED" == "$FILE_ID" ]]; then
    pass "Shared file appears in starred list"
else
    fail "Shared file missing from starred list"
fi

info "Verifying file ALSO appears in User 2's shared list..."
SHARED_BY_U2=$(curl -s -X GET "$BASE_URL/api/files/shared" -H "Authorization: Bearer $TOKEN2")
SHARED_HAS_FILE=$(echo "$SHARED_BY_U2" | jq -r ".[] | select(.id==\"$FILE_ID\") | .id")

if [[ "$SHARED_HAS_FILE" == "$FILE_ID" ]]; then
    pass "File appears in both shared AND starred lists"
else
    fail "File missing from shared list after starring"
fi

info "Verifying starred metadata on shared file..."
SHARED_IS_STARRED=$(echo "$SHARED_BY_U2" | jq -r ".[] | select(.id==\"$FILE_ID\") | .isStarred")

if [[ "$SHARED_IS_STARRED" == "true" ]]; then
    pass "Shared file has correct isStarred metadata"
else
    fail "Starred metadata missing on shared file (got: $SHARED_IS_STARRED)"
fi

section "SECTION 13: RECENT FILES AFTER COPY"

info "Capturing recent files before copy operation..."
RECENT_BEFORE=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
ORIG_FILE_TIMESTAMP=$(echo "$RECENT_BEFORE" | jq -r ".[] | select(.id==\"$FILE2_ID\") | .lastViewedAt")

info "Performing copy operation..."
sleep 1
NEW_COPY=$(curl -s -X POST "$BASE_URL/api/files/$FILE2_ID/copy" \
  -H "Authorization: Bearer $TOKEN" | jq -r '.id')

if [[ -n "$NEW_COPY" ]]; then
    pass "Copy operation completed (New ID: $NEW_COPY)"
else
    fail "Copy operation failed"
fi

info "Verifying original file timestamp NOT changed..."
RECENT_AFTER=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
ORIG_FILE_TIMESTAMP_AFTER=$(echo "$RECENT_AFTER" | jq -r ".[] | select(.id==\"$FILE2_ID\") | .lastViewedAt")

if [[ "$ORIG_FILE_TIMESTAMP" == "$ORIG_FILE_TIMESTAMP_AFTER" ]]; then
    pass "Copy operation preserved original file's timestamps"
else
    fail "Original file timestamp was modified by copy operation"
fi

info "Verifying copied file does NOT appear in recent (no interaction yet)..."
COPY_IN_RECENT=$(echo "$RECENT_AFTER" | jq -r ".[] | select(.id==\"$NEW_COPY\") | .id")

if [[ -z "$COPY_IN_RECENT" || "$COPY_IN_RECENT" == "null" ]]; then
    pass "Copied file correctly absent from recent files (no interaction)"
else
    fail "Copied file incorrectly appeared in recent files"
fi

info "Accessing copied file to trigger interaction..."
curl -s -X GET "$BASE_URL/api/files/$NEW_COPY" -H "Authorization: Bearer $TOKEN" > /dev/null

info "Verifying copied file NOW appears in recent after access..."
RECENT_FINAL=$(curl -s -X GET "$BASE_URL/api/files/recent" -H "Authorization: Bearer $TOKEN")
COPY_IN_RECENT_FINAL=$(echo "$RECENT_FINAL" | jq -r ".[] | select(.id==\"$NEW_COPY\") | .id")

if [[ "$COPY_IN_RECENT_FINAL" == "$NEW_COPY" ]]; then
    pass "Copied file appears in recent after interaction"
else
    fail "Copied file missing from recent after interaction"
fi

section "SECTION 14: PDF AND IMAGE FILE TYPES (READ-ONLY CONTENT)"

info "Creating PDF file..."
PDF_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"document.pdf","type":"pdf","content":"PDF_BINARY_DATA_HERE"}')
PDF_ID=$(echo "$PDF_RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

if [[ -n "$PDF_ID" ]]; then
    pass "PDF file created successfully (ID: $PDF_ID)"
else
    fail "PDF file creation failed"
fi

info "Creating image file..."
IMAGE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"photo.jpg","type":"image","content":"IMAGE_BINARY_DATA_HERE"}')
IMAGE_ID=$(echo "$IMAGE_RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

if [[ -n "$IMAGE_ID" ]]; then
    pass "Image file created successfully (ID: $IMAGE_ID)"
else
    fail "Image file creation failed"
fi

info "Attempting to PATCH content of PDF file (should fail)..."
PDF_EDIT_RESP=$(curl -s -X PATCH "$BASE_URL/api/files/$PDF_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Modified PDF content"}')

PDF_ERROR=$(echo "$PDF_EDIT_RESP" | jq -r '.error')
if [[ "$PDF_ERROR" == "Cannot modify content of pdf files - they are read-only" ]]; then
    pass "PDF content modification correctly blocked with proper error message"
else
    fail "PDF content modification error incorrect: $PDF_ERROR"
fi

info "Attempting to PATCH content of image file (should fail)..."
IMAGE_EDIT_RESP=$(curl -s -X PATCH "$BASE_URL/api/files/$IMAGE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content":"Modified image content"}')

IMAGE_ERROR=$(echo "$IMAGE_EDIT_RESP" | jq -r '.error')
if [[ "$IMAGE_ERROR" == "Cannot modify content of image files - they are read-only" ]]; then
    pass "Image content modification correctly blocked with proper error message"
else
    fail "Image content modification error incorrect: $IMAGE_ERROR"
fi

info "Testing PATCH can update name of PDF file..."
PDF_RENAME=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$PDF_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"renamed_document.pdf"}')

PDF_RENAME_CODE=$(echo "$PDF_RENAME" | tail -n1)
if [[ "$PDF_RENAME_CODE" == "204" ]]; then
    VERIFY_NAME=$(curl -s -X GET "$BASE_URL/api/files/$PDF_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.name')
    if [[ "$VERIFY_NAME" == "renamed_document.pdf" ]]; then
        pass "PDF file name can be updated successfully"
    else
        fail "PDF file name update failed (got: $VERIFY_NAME)"
    fi
else
    fail "PDF rename failed (HTTP $PDF_RENAME_CODE)"
fi

info "Testing PATCH can update name of image file..."
IMAGE_RENAME=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$IMAGE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"renamed_photo.jpg"}')

IMAGE_RENAME_CODE=$(echo "$IMAGE_RENAME" | tail -n1)
if [[ "$IMAGE_RENAME_CODE" == "204" ]]; then
    VERIFY_IMAGE_NAME=$(curl -s -X GET "$BASE_URL/api/files/$IMAGE_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.name')
    if [[ "$VERIFY_IMAGE_NAME" == "renamed_photo.jpg" ]]; then
        pass "Image file name can be updated successfully"
    else
        fail "Image file name update failed (got: $VERIFY_IMAGE_NAME)"
    fi
else
    fail "Image rename failed (HTTP $IMAGE_RENAME_CODE)"
fi

info "Creating folder for testing parentId updates..."
TEST_FOLDER_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"MediaFolder","type":"folder"}')
TEST_FOLDER_ID=$(echo "$TEST_FOLDER_RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

info "Testing PATCH can update parentId of PDF file..."
PDF_MOVE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$PDF_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"parentId\":\"$TEST_FOLDER_ID\"}")

PDF_MOVE_CODE=$(echo "$PDF_MOVE" | tail -n1)
if [[ "$PDF_MOVE_CODE" == "204" ]]; then
    VERIFY_PARENT=$(curl -s -X GET "$BASE_URL/api/files/$PDF_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.parentId')
    if [[ "$VERIFY_PARENT" == "$TEST_FOLDER_ID" ]]; then
        pass "PDF file parentId can be updated successfully"
    else
        fail "PDF file parentId update failed (got: $VERIFY_PARENT)"
    fi
else
    fail "PDF move failed (HTTP $PDF_MOVE_CODE)"
fi

info "Testing PATCH can update parentId of image file..."
IMAGE_MOVE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$IMAGE_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"parentId\":\"$TEST_FOLDER_ID\"}")

IMAGE_MOVE_CODE=$(echo "$IMAGE_MOVE" | tail -n1)
if [[ "$IMAGE_MOVE_CODE" == "204" ]]; then
    VERIFY_IMAGE_PARENT=$(curl -s -X GET "$BASE_URL/api/files/$IMAGE_ID" -H "Authorization: Bearer $TOKEN" | jq -r '.parentId')
    if [[ "$VERIFY_IMAGE_PARENT" == "$TEST_FOLDER_ID" ]]; then
        pass "Image file parentId can be updated successfully"
    else
        fail "Image file parentId update failed (got: $VERIFY_IMAGE_PARENT)"
    fi
else
    fail "Image move failed (HTTP $IMAGE_MOVE_CODE)"
fi

section "FINAL SUMMARY"
echo -e "Tests Passed: ${GREEN}$PASS${NC}"
echo -e "Tests Failed: ${RED}$FAIL${NC}"