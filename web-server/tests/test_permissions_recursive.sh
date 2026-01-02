#!/bin/bash

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0

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

# Timestamp for unique emails
TS=$(date +%s%N | cut -b1-13)

section "SETUP: Creating Users"

# Create 3 users
U1_EMAIL="owner${TS}@gmail.com"
U2_EMAIL="editor${TS}@gmail.com"
U3_EMAIL="viewer${TS}@gmail.com"

curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U1_EMAIL\",\"password\":\"pass12345678\",\"firstName\":\"Owner\"}" > /dev/null

curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U2_EMAIL\",\"password\":\"pass12345678\",\"firstName\":\"Editor\"}" > /dev/null

curl -s -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U3_EMAIL\",\"password\":\"pass12345678\",\"firstName\":\"Viewer\"}" > /dev/null

# Login all users
TOKEN1=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U1_EMAIL\",\"password\":\"pass12345678\"}" | jq -r '.token')

TOKEN2=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U2_EMAIL\",\"password\":\"pass12345678\"}" | jq -r '.token')

TOKEN3=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U3_EMAIL\",\"password\":\"pass12345678\"}" | jq -r '.token')

if [[ -n "$TOKEN1" && -n "$TOKEN2" && -n "$TOKEN3" ]]; then
    pass "All users created and logged in"
else
    fail "User creation/login failed"
    exit 1
fi

section "TEST 1: Recursive Permission Grant on Folder"

info "Creating folder hierarchy: ProjectFolder > src > file.txt"
# Create main folder
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"ProjectFolder","type":"folder"}')
FOLDER_ID=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

# Create subfolder
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"src\",\"type\":\"folder\",\"parentId\":\"$FOLDER_ID\"}")
SUBFOLDER_ID=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

# Create file in subfolder
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"file.txt\",\"type\":\"docs\",\"content\":\"Hello World\",\"parentId\":\"$SUBFOLDER_ID\"}")
FILE_ID=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$FOLDER_ID" && -n "$SUBFOLDER_ID" && -n "$FILE_ID" ]]; then
    pass "Folder hierarchy created"
else
    fail "Failed to create folder hierarchy"
fi

info "Granting VIEWER permission on ProjectFolder to User2"
U2_ID=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U2_EMAIL\",\"password\":\"pass12345678\"}" | jq -r '.userId' 2>/dev/null || echo "")

# Get U2 ID from token payload
U2_ID=$(echo $TOKEN2 | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.userId')

curl -s -X POST "$BASE_URL/api/files/$FOLDER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2_ID\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

info "Checking if User2 can access the file (should inherit VIEWER)"
FILE_ACCESS=$(curl -s -X GET "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN2" 2>&1)

if [[ "$FILE_ACCESS" == *"Hello World"* ]]; then
    pass "Recursive permission grant works - User2 can access nested file"
else
    fail "Recursive permission grant failed"
fi

section "TEST 2: Direct Permission Overrides Inherited"

info "Granting EDITOR permission directly on file.txt to User2"
curl -s -X POST "$BASE_URL/api/files/$FILE_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2_ID\",\"permissionLevel\":\"EDITOR\"}" > /dev/null

info "Trying to edit file as User2 (should succeed with EDITOR)"
EDIT_RESULT=$(curl -s -w "%{http_code}" -o /dev/null -X PATCH "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"content":"Modified by User2"}')

if [[ "$EDIT_RESULT" == "204" ]]; then
    pass "Direct EDITOR permission overrides inherited VIEWER"
else
    fail "Direct permission override failed (HTTP $EDIT_RESULT)"
fi

section "TEST 3: Recursive Permission Deletion Keeps Direct Permissions"

info "Deleting folder permission for User2"
# Get permission ID
PERM_ID=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_ID/permissions" \
  -H "Authorization: Bearer $TOKEN1" | jq -r ".[] | select(.userId==\"$U2_ID\") | .pid")

curl -s -X DELETE "$BASE_URL/api/files/$FOLDER_ID/permissions/$PERM_ID" \
  -H "Authorization: Bearer $TOKEN1" > /dev/null

info "User2 should still have access to file.txt (direct permission)"
FILE_ACCESS2=$(curl -s -w "%{http_code}" -o /dev/null -X GET "$BASE_URL/api/files/$FILE_ID" \
  -H "Authorization: Bearer $TOKEN2")

if [[ "$FILE_ACCESS2" == "200" ]]; then
    pass "Direct permission kept after folder permission deletion"
else
    fail "Direct permission was incorrectly removed (HTTP $FILE_ACCESS2)"
fi

info "User2 should NOT have access to subfolder (inherited was removed)"
SUBFOLDER_ACCESS=$(curl -s -X GET "$BASE_URL/api/files/$SUBFOLDER_ID" \
  -H "Authorization: Bearer $TOKEN2" 2>&1)

if [[ "$SUBFOLDER_ACCESS" == *"Permission denied"* ]] || [[ "$SUBFOLDER_ACCESS" == *"error"* ]]; then
    pass "Inherited permission correctly removed from subfolder"
else
    fail "Inherited permission not removed properly"
fi

section "TEST 4: Copy File (Simple)"

info "Creating a new file for User2 to test copy"
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{"name":"FileToCopy.txt","type":"docs","content":"Copy test"}')
COPY_TEST_FILE=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

info "User2 copying own file to root"
COPY_RESP=$(curl -s -X POST "$BASE_URL/api/files/$COPY_TEST_FILE/copy" \
  -H "Authorization: Bearer $TOKEN2" \
  -H "Content-Type: application/json" \
  -d '{}')

COPY_ID=$(echo "$COPY_RESP" | jq -r '.id')
COPY_NAME=$(echo "$COPY_RESP" | jq -r '.name')

if [[ "$COPY_NAME" == "Copy of FileToCopy.txt" ]]; then
    pass "File copied successfully with correct name"
else
    fail "File copy failed or incorrect name: $COPY_NAME"
fi

info "Checking if User2 is owner of copied file"
COPY_OWNER=$(echo "$COPY_RESP" | jq -r '.ownerId')
if [[ "$COPY_OWNER" == "$U2_ID" ]]; then
    pass "User2 is owner of copied file"
else
    fail "Copy ownership incorrect"
fi

section "TEST 5: Copy Folder (Recursive)"

info "User1 creating folder with nested structure"
# Create FolderA
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"FolderA","type":"folder"}')
FOLDER_A=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

# Create file1.txt in FolderA
curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"file1.txt\",\"type\":\"docs\",\"content\":\"File 1\",\"parentId\":\"$FOLDER_A\"}" > /dev/null

# Create SubfolderB in FolderA
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SubfolderB\",\"type\":\"folder\",\"parentId\":\"$FOLDER_A\"}")
SUBFOLDER_B=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

# Create file2.txt in SubfolderB
curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"file2.txt\",\"type\":\"docs\",\"content\":\"File 2\",\"parentId\":\"$SUBFOLDER_B\"}" > /dev/null

info "Copying entire FolderA"
FOLDER_COPY=$(curl -s -X POST "$BASE_URL/api/files/$FOLDER_A/copy" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"newName":"FolderA_Copy"}')

FOLDER_COPY_ID=$(echo "$FOLDER_COPY" | jq -r '.id')

info "Checking copied folder structure"
COPIED_CHILDREN=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_COPY_ID" \
  -H "Authorization: Bearer $TOKEN1" | jq -r '.children | length')

if [[ "$COPIED_CHILDREN" == "2" ]]; then
    pass "Recursive folder copy successful (2 children)"
else
    fail "Recursive folder copy incomplete (children: $COPIED_CHILDREN)"
fi

section "TEST 6: Shared With Me"

info "Creating a specific file to share directly with User3"
RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"DirectlySharedFile.txt","type":"docs","content":"Direct share test"}')
DIRECT_SHARED_FILE=$(echo "$RESP" | grep -i "Location:" | sed 's/.*\/files\///;s/\r//')

info "Granting DIRECT VIEWER permission to User3 on the file"
U3_ID=$(echo $TOKEN3 | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.userId')

curl -s -X POST "$BASE_URL/api/files/$DIRECT_SHARED_FILE/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U3_ID\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

info "Getting 'Shared With Me' for User3"
SHARED=$(curl -s -X GET "$BASE_URL/api/files/shared" \
  -H "Authorization: Bearer $TOKEN3")

SHARED_COUNT=$(echo "$SHARED" | jq '. | length')
SHARED_NAME=$(echo "$SHARED" | jq -r '.[0].name' 2>/dev/null)

if [[ "$SHARED_COUNT" -gt "0" && "$SHARED_NAME" == "DirectlySharedFile.txt" ]]; then
    pass "Shared With Me works - User3 sees directly shared file"
else
    fail "Shared With Me failed (count: $SHARED_COUNT, name: $SHARED_NAME)"
fi

info "User3 should NOT see files they own in 'Shared With Me'"
# User3 creates a file
curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN3" \
  -H "Content-Type: application/json" \
  -d '{"name":"MyOwnFile.txt","type":"docs","content":"Mine"}' > /dev/null

SHARED_AFTER=$(curl -s -X GET "$BASE_URL/api/files/shared" \
  -H "Authorization: Bearer $TOKEN3")

CONTAINS_OWN=$(echo "$SHARED_AFTER" | jq -r '.[] | select(.name=="MyOwnFile.txt") | .name')

if [[ -z "$CONTAINS_OWN" ]]; then
    pass "Shared With Me correctly excludes owned files"
else
    fail "Shared With Me incorrectly includes owned files"
fi

section "TEST 7: POST Cannot Grant OWNER"

info "Trying to grant OWNER via POST (should fail)"
OWNER_GRANT=$(curl -s -X POST "$BASE_URL/api/files/$FOLDER_A/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2_ID\",\"permissionLevel\":\"OWNER\"}" 2>&1)

if [[ "$OWNER_GRANT" == *"POST"* ]] || [[ "$OWNER_GRANT" == *"PATCH"* ]] || [[ "$OWNER_GRANT" == *"error"* ]]; then
    pass "POST correctly rejects OWNER permission grant"
else
    fail "POST incorrectly allowed OWNER grant"
fi

section "TEST 8: Ownership Transfer via PATCH (Non-Recursive)"

info "Granting EDITOR to User2 on FolderA"
PERM_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$FOLDER_A/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2_ID\",\"permissionLevel\":\"EDITOR\"}")

PERM_ID2=$(echo "$PERM_RESP" | grep -i "Location:" | sed 's/.*\/permissions\///' | tr -d '\r\n ')

info "Transferring ownership to User2 via PATCH"
curl -s -X PATCH "$BASE_URL/api/files/$FOLDER_A/permissions/$PERM_ID2" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"permissionLevel":"OWNER"}' > /dev/null

info "Checking if User2 is now owner of FolderA"
FOLDER_OWNER=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_A" \
  -H "Authorization: Bearer $TOKEN2" | jq -r '.ownerId')

if [[ "$FOLDER_OWNER" == "$U2_ID" ]]; then
    pass "Ownership transfer successful"
else
    fail "Ownership transfer failed"
fi

info "Checking if children ownership NOT transferred (non-recursive)"
# Get one of the children
CHILD_FILES=$(curl -s -X GET "$BASE_URL/api/files/$FOLDER_A" \
  -H "Authorization: Bearer $TOKEN2" | jq -r '.children[0].id')

if [[ -n "$CHILD_FILES" ]]; then
    CHILD_OWNER=$(curl -s -X GET "$BASE_URL/api/files/$CHILD_FILES" \
      -H "Authorization: Bearer $TOKEN2" | jq -r '.ownerId')
    
    U1_ID=$(echo $TOKEN1 | cut -d. -f2 | base64 -d 2>/dev/null | jq -r '.userId')
    
    if [[ "$CHILD_OWNER" == "$U1_ID" ]]; then
        pass "Ownership transfer is non-recursive (children still owned by User1)"
    else
        fail "Ownership transfer incorrectly recursive"
    fi
fi

section "FINAL SUMMARY"
echo -e "Tests Passed: ${GREEN}$PASS${NC}"
echo -e "Tests Failed: ${RED}$FAIL${NC}"

if [[ $FAIL -eq 0 ]]; then
    echo -e "\n${GREEN}🎉 All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}❌ Some tests failed${NC}"
    exit 1
fi
