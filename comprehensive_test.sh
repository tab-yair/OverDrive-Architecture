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

section "SECTION 2: LOGIN & TOKEN"

info "Testing login for User 1..."
USER_ID=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"$U1_EMAIL\",\"password\":\"password123\"}" | jq -r '."user-id"')

if [[ "$USER_ID" == "$U1" ]]; then 
    pass "Login successful (200 OK)"
else 
    fail "Login failed."
fi

section "SECTION 3: FILE CREATION & OWNER SEARCH"

info "Creating file with RLE content (Owner: User 1)..."
FILE_RESP=$(curl -s -i -X POST "$BASE_URL/api/files" \
  -H "user-id: $U1" \
  -H "Content-Type: application/json" \
  -d '{"name":"project_report.txt","type":"file","content":"CONFIDENTIAL_DATA_123"}')

FILE_ID=$(echo "$FILE_RESP" | grep -i "Location:" | sed 's/.*\/files\///' | tr -d '\r\n ')

if [[ -n "$FILE_ID" ]]; then
    pass "File created (ID: $FILE_ID)"
else
    fail "File creation failed"
fi

info "Performing search as Owner (User 1)..."
SEARCH_U1=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "user-id: $U1")
if [[ "$SEARCH_U1" == *"project_report.txt"* ]]; then
    pass "Owner found the file correctly"
else
    fail "Owner failed to find their own file"
fi

section "SECTION 4: SECURITY & PERMISSION FILTERING"

# בדיקה שמשתמש ב' (U2) לא רואה את הקובץ בחיפוש כי אין לו הרשאה
info "Verifying User 2 (Guest) CANNOT see the file in search..."
SEARCH_U2=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "user-id: $U2")

if [[ "$SEARCH_U2" == "[]" || -z "$SEARCH_U2" || "$SEARCH_U2" != *"project_report.txt"* ]]; then
    pass "Security Check Passed: User 2 filtered out correctly (Privacy maintained)"
else
    fail "SECURITY BREACH: User 2 found a file without permissions!"
    echo "Leakage data: $SEARCH_U2"
fi

# אופציונלי: מתן הרשאה ובדיקה שמעכשיו הוא כן רואה
info "Granting VIEWER permission to User 2..."
curl -s -X POST "$BASE_URL/api/files/$FILE_ID/permissions" \
  -H "user-id: $U1" \
  -H "Content-Type: application/json" \
  -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" > /dev/null

info "Performing search again as User 2 (After permission granted)..."
SEARCH_U2_AFTER=$(curl -s -X GET "$BASE_URL/api/search/CONFIDENTIAL" -H "user-id: $U2")
if [[ "$SEARCH_U2_AFTER" == *"project_report.txt"* ]]; then
    pass "Permission Elevation Worked: User 2 can now see the file"
else
    fail "Permission update failed to reflect in search"
fi

section "FINAL SUMMARY"
echo -e "Tests Passed: ${GREEN}$PASS${NC}"
echo -e "Tests Failed: ${RED}$FAIL${NC}"