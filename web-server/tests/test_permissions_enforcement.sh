#!/bin/bash
# Test script for Permission Enforcement features
# Tests:
# 1. Cannot modify inherited permissions directly
# 2. Changing parent folder permission updates all inherited permissions
# 3. Custom permissions are disabled
# 4. Viewers cannot see permission lists
# 5. Viewers cannot grant permissions

BASE_URL="http://localhost:3000"
PASS=0
FAIL=0
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
    echo "$header" | grep -i "Location:" | sed 's/.*\/\([^/]*\)$/\1/' | tr -d '\r\n '
}

section "SETUP: Creating Test Users and Files"

# Create users
info "Creating Owner, Editor, and Viewer users..."
OWNER_EMAIL="owner${TS}@gmail.com"
EDITOR_EMAIL="editor${TS}@gmail.com"
VIEWER_EMAIL="viewer${TS}@gmail.com"

OWNER_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$OWNER_EMAIL\",\"password\":\"password123\",\"firstName\":\"Owner\"}")
OWNER_ID=$(extract_id "$OWNER_RESP")

EDITOR_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EDITOR_EMAIL\",\"password\":\"password123\",\"firstName\":\"Editor\"}")
EDITOR_ID=$(extract_id "$EDITOR_RESP")

VIEWER_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$VIEWER_EMAIL\",\"password\":\"password123\",\"firstName\":\"Viewer\"}")
VIEWER_ID=$(extract_id "$VIEWER_RESP")

if [[ -n "$OWNER_ID" && -n "$EDITOR_ID" && -n "$VIEWER_ID" ]]; then
    pass "Users created (Owner: $OWNER_ID, Editor: $EDITOR_ID, Viewer: $VIEWER_ID)"
else
    fail "User creation failed"
    exit 1
fi

# Login users
info "Logging in users..."
OWNER_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$OWNER_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

EDITOR_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$EDITOR_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

VIEWER_TOKEN=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$VIEWER_EMAIL\",\"password\":\"password123\"}" | jq -r '.token')

if [[ -n "$OWNER_TOKEN" && -n "$EDITOR_TOKEN" && -n "$VIEWER_TOKEN" ]]; then
    pass "All users logged in successfully"
else
    fail "Login failed"
    exit 1
fi

# Create folder structure: Parent Folder -> Sub Folder -> File
info "Creating folder structure..."
PARENT_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name":"ParentFolder","type":"folder"}')
PARENT_ID=$(extract_id "$PARENT_RESP")

SUB_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"SubFolder\",\"type\":\"folder\",\"parentId\":\"$PARENT_ID\"}")
SUB_ID=$(extract_id "$SUB_RESP")

FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"TestFile.txt\",\"type\":\"file\",\"parentId\":\"$SUB_ID\",\"content\":\"Test content\"}")
FILE_ID=$(extract_id "$FILE_RESP")

if [[ -n "$PARENT_ID" && -n "$SUB_ID" && -n "$FILE_ID" ]]; then
    pass "Folder structure created (Parent: $PARENT_ID, Sub: $SUB_ID, File: $FILE_ID)"
else
    fail "Folder creation failed"
    exit 1
fi

# Share parent folder with Editor and Viewer
info "Sharing parent folder with Editor (EDITOR) and Viewer (VIEWER)..."
EDITOR_PERM_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$EDITOR_ID\",\"permissionLevel\":\"EDITOR\"}")
EDITOR_PERM_ID=$(extract_id "$EDITOR_PERM_RESP")

VIEWER_PERM_RESP=$(curl -s -i -X POST "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$VIEWER_ID\",\"permissionLevel\":\"VIEWER\"}")
VIEWER_PERM_ID=$(extract_id "$VIEWER_PERM_RESP")

if [[ -n "$EDITOR_PERM_ID" && -n "$VIEWER_PERM_ID" ]]; then
    pass "Permissions granted on parent folder"
else
    fail "Permission granting failed"
    exit 1
fi

# Wait a moment for inheritance to propagate
sleep 1

section "TEST 1: Cannot Modify Inherited Permissions Directly"

info "Getting inherited permission on the file..."
FILE_PERMS=$(curl -s -X GET "$BASE_URL/api/files/$FILE_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN")

# Find the inherited permission for editor
INHERITED_PERM_ID=$(echo "$FILE_PERMS" | jq -r ".[] | select(.userId==\"$EDITOR_ID\" and .isInherited==true) | .pid")

if [[ -n "$INHERITED_PERM_ID" && "$INHERITED_PERM_ID" != "null" ]]; then
    info "Found inherited permission: $INHERITED_PERM_ID"
    
    # Try to modify inherited permission - should fail
    MODIFY_RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$FILE_ID/permissions/$INHERITED_PERM_ID" \
      -H "Authorization: Bearer $OWNER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"permissionLevel":"VIEWER"}')
    
    HTTP_CODE=$(echo "$MODIFY_RESP" | tail -n1)
    BODY=$(echo "$MODIFY_RESP" | head -n-1)
    ERROR=$(echo "$BODY" | jq -r '.error // empty')
    SOURCE_FOLDER=$(echo "$BODY" | jq -r '.sourceFolder.id // empty')
    CAN_EDIT=$(echo "$BODY" | jq -r '.canEditSource // empty')
    
    if [[ "$HTTP_CODE" == "403" && "$ERROR" == "Cannot modify inherited permission directly" ]]; then
        pass "Correctly blocked modification of inherited permission"
        
        if [[ -n "$SOURCE_FOLDER" && "$SOURCE_FOLDER" != "null" ]]; then
            pass "Response includes source folder information"
        else
            fail "Missing source folder information in response"
        fi
        
        if [[ "$CAN_EDIT" == "true" ]]; then
            pass "Response indicates user can edit source folder"
        else
            fail "canEditSource not properly set"
        fi
    else
        fail "Should have blocked inherited permission modification (HTTP $HTTP_CODE, Error: $ERROR)"
    fi
else
    fail "Could not find inherited permission on file"
fi

section "TEST 2: Changing Parent Permission Updates All Inherited"

info "Verifying initial state - Editor has EDITOR on all files..."
FILE_PERM_LEVEL=$(echo "$FILE_PERMS" | jq -r ".[] | select(.userId==\"$EDITOR_ID\") | .level")
if [[ "$FILE_PERM_LEVEL" == "EDITOR" ]]; then
    pass "Editor initially has EDITOR permission on file"
else
    fail "Initial permission level incorrect: $FILE_PERM_LEVEL"
fi

info "Changing parent folder permission from EDITOR to VIEWER..."
UPDATE_RESP=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$PARENT_ID/permissions/$EDITOR_PERM_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissionLevel":"VIEWER"}')

HTTP_CODE=$(echo "$UPDATE_RESP" | tail -n1)
if [[ "$HTTP_CODE" == "204" ]]; then
    pass "Parent permission updated successfully"
    
    # Wait for update to propagate
    sleep 1
    
    # Check if inherited permissions were updated
    UPDATED_FILE_PERMS=$(curl -s -X GET "$BASE_URL/api/files/$FILE_ID/permissions" \
      -H "Authorization: Bearer $OWNER_TOKEN")
    
    UPDATED_LEVEL=$(echo "$UPDATED_FILE_PERMS" | jq -r ".[] | select(.userId==\"$EDITOR_ID\") | .level")
    
    if [[ "$UPDATED_LEVEL" == "VIEWER" ]]; then
        pass "Inherited permission on file was automatically updated to VIEWER"
    else
        fail "Inherited permission was not updated (still: $UPDATED_LEVEL)"
    fi
    
    # Change back to EDITOR for the remaining tests
    info "Changing back to EDITOR for remaining tests..."
    curl -s -X PATCH "$BASE_URL/api/files/$PARENT_ID/permissions/$EDITOR_PERM_ID" \
      -H "Authorization: Bearer $OWNER_TOKEN" \
      -H "Content-Type: application/json" \
      -d '{"permissionLevel":"EDITOR"}' > /dev/null
    sleep 1
else
    fail "Failed to update parent permission (HTTP $HTTP_CODE)"
fi

section "TEST 3: Custom Permissions are Disabled"

info "Attempting to create permission with CUSTOM level..."
CUSTOM_RESP=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$VIEWER_ID\",\"permissionLevel\":\"CUSTOM\"}")

HTTP_CODE=$(echo "$CUSTOM_RESP" | tail -n1)
ERROR_MSG=$(echo "$CUSTOM_RESP" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" && "$ERROR_MSG" == *"must be VIEWER, EDITOR, or OWNER"* ]]; then
    pass "CUSTOM permission level correctly rejected in POST"
else
    fail "Should reject CUSTOM permission level (HTTP $HTTP_CODE, Error: $ERROR_MSG)"
fi

info "Attempting to update permission to CUSTOM level..."
CUSTOM_UPDATE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/files/$PARENT_ID/permissions/$VIEWER_PERM_ID" \
  -H "Authorization: Bearer $OWNER_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"permissionLevel":"CUSTOM"}')

HTTP_CODE=$(echo "$CUSTOM_UPDATE" | tail -n1)
ERROR_MSG=$(echo "$CUSTOM_UPDATE" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" ]]; then
    pass "CUSTOM permission level correctly rejected in PATCH"
else
    fail "Should reject CUSTOM permission level in PATCH (HTTP $HTTP_CODE, Error: $ERROR_MSG)"
fi

section "TEST 4: Viewers Cannot See Permission Lists"

info "Viewer attempting to get permission list..."
VIEWER_GET=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $VIEWER_TOKEN")

HTTP_CODE=$(echo "$VIEWER_GET" | tail -n1)
ERROR_MSG=$(echo "$VIEWER_GET" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "403" && "$ERROR_MSG" == *"don't have permission to view sharing details"* ]]; then
    pass "Viewer correctly denied access to permission list"
else
    fail "Viewer should not be able to view permissions (HTTP $HTTP_CODE, Error: $ERROR_MSG)"
fi

info "Editor attempting to get permission list..."
EDITOR_GET=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $EDITOR_TOKEN")

HTTP_CODE=$(echo "$EDITOR_GET" | tail -n1)
BODY=$(echo "$EDITOR_GET" | head -n-1)

if [[ "$HTTP_CODE" == "200" ]]; then
    COUNT=$(echo "$BODY" | jq '. | length')
    if [[ "$COUNT" -ge 1 ]]; then
        pass "Editor can view permission list (found $COUNT permissions)"
    else
        fail "Editor got empty permission list"
    fi
else
    fail "Editor should be able to view permissions (HTTP $HTTP_CODE)"
fi

info "Owner attempting to get permission list..."
OWNER_GET=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/files/$PARENT_ID/permissions" \
  -H "Authorization: Bearer $OWNER_TOKEN")

HTTP_CODE=$(echo "$OWNER_GET" | tail -n1)
if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Owner can view permission list"
else
    fail "Owner should be able to view permissions (HTTP $HTTP_CODE)"
fi

section "TEST 5: Viewers Cannot Grant Permissions"

# Create another user to share with
info "Creating target user for sharing test..."
TARGET_EMAIL="target${TS}@gmail.com"
TARGET_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$TARGET_EMAIL\",\"password\":\"password123\",\"firstName\":\"Target\"}")
TARGET_ID=$(extract_id "$TARGET_RESP")

if [[ -n "$TARGET_ID" ]]; then
    info "Target user created: $TARGET_ID"
    
    info "Viewer attempting to grant permission..."
    VIEWER_GRANT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/$PARENT_ID/permissions" \
      -H "Authorization: Bearer $VIEWER_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"targetUserId\":\"$TARGET_ID\",\"permissionLevel\":\"VIEWER\"}")
    
    HTTP_CODE=$(echo "$VIEWER_GRANT" | tail -n1)
    ERROR_MSG=$(echo "$VIEWER_GRANT" | head -n-1 | jq -r '.error // empty')
    
    if [[ "$HTTP_CODE" == "403" && "$ERROR_MSG" == *"Only editors and owners can share files"* ]]; then
        pass "Viewer correctly denied permission to grant access"
    else
        fail "Viewer should not be able to grant permissions (HTTP $HTTP_CODE, Error: $ERROR_MSG)"
    fi
    
    info "Editor attempting to grant permission..."
    EDITOR_GRANT=$(curl -s -w "\n%{http_code}" -X POST "$BASE_URL/api/files/$PARENT_ID/permissions" \
      -H "Authorization: Bearer $EDITOR_TOKEN" \
      -H "Content-Type: application/json" \
      -d "{\"targetUserId\":\"$TARGET_ID\",\"permissionLevel\":\"VIEWER\"}")
    
    HTTP_CODE=$(echo "$EDITOR_GRANT" | tail -n1)
    
    if [[ "$HTTP_CODE" == "201" ]]; then
        pass "Editor successfully granted permission"
    else
        fail "Editor should be able to grant permissions (HTTP $HTTP_CODE)"
    fi
else
    fail "Could not create target user for sharing test"
fi

section "SUMMARY"
echo -e "${GREEN}Passed: $PASS${NC}"
echo -e "${RED}Failed: $FAIL${NC}"
echo -e "Total: $((PASS + FAIL))"

if [[ $FAIL -eq 0 ]]; then
    echo -e "\n${GREEN}✓ All tests passed!${NC}"
    exit 0
else
    echo -e "\n${RED}✗ Some tests failed${NC}"
    exit 1
fi
