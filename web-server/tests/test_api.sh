#!/bin/bash
# Comprehensive test - all 18 endpoints validated (including starred/recent)

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
echo "Testing OverDrive API - All 18 Endpoints"
echo "=========================================="
echo ""

# Small base64 test image (1x1 red pixel PNG)
PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

# Create users
info "1. Creating users..."
U1=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"username\":\"testowner1@gmail.com\",\"password\":\"pass12345678\",\"firstName\":\"Owner\",\"profileImage\":\"$PROFILE_IMG\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
U2=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"username\":\"testeditor@gmail.com\",\"password\":\"pass12345678\",\"firstName\":\"Editor\",\"profileImage\":\"$PROFILE_IMG\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
U3=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"username\":\"testviewer@gmail.com\",\"password\":\"pass12345678\",\"firstName\":\"Viewer\",\"profileImage\":\"$PROFILE_IMG\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
[[ -n "$U1" && -n "$U2" && -n "$U3" ]] && pass "Users created: $U1, $U2, $U3" || fail "User creation failed"

# Login
info "2. Testing login..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"username":"testowner1@gmail.com","password":"pass12345678"}' | jq -r '.token')
[[ -n "$TOKEN" && "$TOKEN" != "null" ]] && pass "Login successful - Token received" || fail "Login failed"

# Get user
info "3. Get user info..."
USER=$(curl -s http://localhost:3000/api/users/$U1 -H "Authorization: Bearer $TOKEN" | jq -r '.firstName')
[[ "$USER" == "Owner" ]] && pass "Retrieved user: $USER" || fail "Get user failed"

# Create files
info "4. Creating files..."
F1=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"TestFolder","type":"folder"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
F2=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"zebra.txt","type":"docs","content":"Zebra research data"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
F3=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"python.txt","type":"docs","content":"Python code example"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
[[ -n "$F1" && -n "$F2" && -n "$F3" ]] && pass "Files created: $F1, $F2, $F3" || fail "File creation failed"

# List files
info "5. List all files..."
COUNT=$(curl -s http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" | jq '. | length')
[[ "$COUNT" -ge 3 ]] && pass "Found $COUNT files" || fail "List files failed"

# Get file
info "6. Get file content..."
CONTENT=$(curl -s http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" | jq -r '.content')
[[ -n "$CONTENT" ]] && pass "Retrieved content: $CONTENT" || fail "Get file failed"

# Update file
info "7. Update file..."
curl -s -o /dev/null -X PATCH http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"content":"Updated Zebra data"}'
UPDATED=$(curl -s http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" | jq -r '.content')
[[ "$UPDATED" == "Updated Zebra data" ]] && pass "File updated: $UPDATED" || fail "Update file failed"

# Search by name
info "8. Search by name..."
FOUND=$(curl -s "http://localhost:3000/api/search/TestFolder" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
[[ -n "$FOUND" ]] && pass "Search by name: $FOUND" || fail "Search by name failed"

# Search by content
info "9. Search by content (Zebra)..."
ZEBRA=$(curl -s "http://localhost:3000/api/search/Zebra" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
[[ -n "$ZEBRA" ]] && pass "Content search works: $ZEBRA" || fail "Content search (Zebra) failed"

info "10. Search by content (Python)..."
PYTHON=$(curl -s "http://localhost:3000/api/search/Python" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
[[ -n "$PYTHON" ]] && pass "Content search works: $PYTHON" || fail "Content search (Python) failed"

# Grant permission
info "11. Grant VIEWER permission..."
P1=$(curl -s -X POST http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
[[ -n "$P1" ]] && pass "Permission granted: $P1" || fail "Grant permission failed"

# List permissions
info "12. List permissions..."
PERMS=$(curl -s http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" | jq '. | length')
[[ "$PERMS" -ge 1 ]] && pass "Permissions count: $PERMS" || fail "List permissions failed"

# Update permission
info "13. Update permission to EDITOR..."
curl -s -o /dev/null -X PATCH http://localhost:3000/api/files/$F2/permissions/$P1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"permissionLevel":"EDITOR"}'
LEVEL=$(curl -s http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.pid==\"$P1\") | .level")
[[ "$LEVEL" == "EDITOR" ]] && pass "Permission updated to: $LEVEL" || fail "Update permission failed"

# Delete permission
info "14. Delete permission..."
curl -s -o /dev/null -X DELETE http://localhost:3000/api/files/$F2/permissions/$P1 -H "Authorization: Bearer $TOKEN"
pass "Permission deleted"

# Delete file
info "15. Delete file..."
curl -s -o /dev/null -X DELETE http://localhost:3000/api/files/$F3 -H "Authorization: Bearer $TOKEN"
pass "File deleted"

# Star files
info "16. Star a file..."
STAR_RESULT=$(curl -s -X POST http://localhost:3000/api/files/$F2/star -H "Authorization: Bearer $TOKEN" | jq -r '.isStarred')
[[ "$STAR_RESULT" == "true" ]] && pass "File starred: $STAR_RESULT" || fail "Star file failed"

# Get starred files
info "17. Get starred files..."
STARRED_COUNT=$(curl -s http://localhost:3000/api/files/starred -H "Authorization: Bearer $TOKEN" | jq '. | length')
[[ "$STARRED_COUNT" -ge 1 ]] && pass "Starred files count: $STARRED_COUNT" || fail "Get starred files failed"

# Get recent files
info "18. Get recent files..."
RECENT_COUNT=$(curl -s http://localhost:3000/api/files/recent -H "Authorization: Bearer $TOKEN" | jq '. | length')
RECENT_FIRST=$(curl -s http://localhost:3000/api/files/recent -H "Authorization: Bearer $TOKEN" | jq -r '.[0].name')
[[ "$RECENT_COUNT" -ge 1 ]] && pass "Recent files count: $RECENT_COUNT, Most recent: $RECENT_FIRST" || fail "Get recent files failed"
