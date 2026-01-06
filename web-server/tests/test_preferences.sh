#!/bin/bash
# Test User Preferences System
# Validates auto-creation, GET/PATCH endpoints, validation, and security

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

section() {
    echo ""
    echo "======================================"
    echo "  $1"
    echo "======================================"
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
echo "User Preferences System Test Suite"
echo "=========================================="
echo ""

BASE_URL="http://localhost:3000"
PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

section "SETUP: Creating Test Users"

info "Creating User A..."
USER_A_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"userapreftest@gmail.com\",\"password\":\"password123\",\"firstName\":\"Alice\",\"profileImage\":\"$PROFILE_IMG\"}")

USER_A_ID=$(echo "$USER_A_RESP" | grep -i "Location:" | sed 's/.*\/users\///;s/\r//')

info "Creating User B..."
USER_B_RESP=$(curl -s -i -X POST "$BASE_URL/api/users" \
  -H "Content-Type: application/json" \
  -d "{\"username\":\"userbpreftest@gmail.com\",\"password\":\"password456\",\"firstName\":\"Bob\",\"profileImage\":\"$PROFILE_IMG\"}")

USER_B_ID=$(echo "$USER_B_RESP" | grep -i "Location:" | sed 's/.*\/users\///;s/\r//')

if [[ -n "$USER_A_ID" && -n "$USER_B_ID" ]]; then
    pass "Users created (A: $USER_A_ID, B: $USER_B_ID)"
else
    fail "Failed to create users"
    exit 1
fi

info "Logging in users..."
TOKEN_A=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d '{"username":"userapreftest@gmail.com","password":"password123"}' | jq -r '.token')

TOKEN_B=$(curl -s -X POST "$BASE_URL/api/tokens" \
  -H "Content-Type: application/json" \
  -d '{"username":"userbpreftest@gmail.com","password":"password456"}' | jq -r '.token')

if [[ -n "$TOKEN_A" && "$TOKEN_A" != "null" && -n "$TOKEN_B" && "$TOKEN_B" != "null" ]]; then
    pass "Users logged in successfully"
else
    fail "Login failed"
    exit 1
fi

section "TEST 1: Auto-Creation of Preferences"

info "Fetching User A's preferences (should exist with defaults)..."
PREF_A=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

HTTP_CODE=$(echo "$PREF_A" | tail -n1)
PREF_BODY=$(echo "$PREF_A" | head -n-1)

if [[ "$HTTP_CODE" == "200" ]]; then
    pass "Preferences exist (HTTP 200)"
else
    fail "Failed to retrieve preferences (HTTP $HTTP_CODE)"
fi

THEME=$(echo "$PREF_BODY" | jq -r '.theme')
LANDING_PAGE=$(echo "$PREF_BODY" | jq -r '.landingPage')
USER_ID_CHECK=$(echo "$PREF_BODY" | jq -r '.userId')

if [[ "$THEME" == "light" ]]; then
    pass "Default theme is 'light'"
else
    fail "Default theme incorrect: $THEME (expected: light)"
fi

if [[ "$LANDING_PAGE" == "home" ]]; then
    pass "Default landingPage is 'home'"
else
    fail "Default landingPage incorrect: $LANDING_PAGE (expected: home)"
fi

if [[ "$USER_ID_CHECK" == "$USER_A_ID" ]]; then
    pass "Preference linked to correct userId"
else
    fail "Preference userId mismatch: $USER_ID_CHECK (expected: $USER_A_ID)"
fi

section "TEST 2: Update Theme"

info "Updating User A's theme to 'dark'..."
UPDATE_THEME=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}')

HTTP_CODE=$(echo "$UPDATE_THEME" | tail -n1)

if [[ "$HTTP_CODE" == "204" ]]; then
    pass "Theme update successful (HTTP 204)"
else
    fail "Theme update failed (HTTP $HTTP_CODE)"
fi

info "Verifying theme change via GET..."
PREF_VERIFY=$(curl -s -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

THEME_VERIFY=$(echo "$PREF_VERIFY" | jq -r '.theme')
LANDING_VERIFY=$(echo "$PREF_VERIFY" | jq -r '.landingPage')

if [[ "$THEME_VERIFY" == "dark" ]]; then
    pass "Theme successfully changed to 'dark'"
else
    fail "Theme change not persisted: $THEME_VERIFY (expected: dark)"
fi

if [[ "$LANDING_VERIFY" == "home" ]]; then
    pass "LandingPage unchanged (still 'home')"
else
    fail "LandingPage unexpectedly changed: $LANDING_VERIFY"
fi

section "TEST 3: Update Landing Page"

info "Updating User A's landingPage to 'storage'..."
UPDATE_LANDING=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"landingPage":"storage"}')

HTTP_CODE=$(echo "$UPDATE_LANDING" | tail -n1)

if [[ "$HTTP_CODE" == "204" ]]; then
    pass "LandingPage update successful (HTTP 204)"
else
    fail "LandingPage update failed (HTTP $HTTP_CODE)"
fi

info "Verifying landingPage change via GET..."
PREF_VERIFY2=$(curl -s -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

LANDING_VERIFY2=$(echo "$PREF_VERIFY2" | jq -r '.landingPage')
THEME_VERIFY2=$(echo "$PREF_VERIFY2" | jq -r '.theme')

if [[ "$LANDING_VERIFY2" == "storage" ]]; then
    pass "LandingPage successfully changed to 'storage'"
else
    fail "LandingPage change not persisted: $LANDING_VERIFY2 (expected: storage)"
fi

if [[ "$THEME_VERIFY2" == "dark" ]]; then
    pass "Theme still 'dark' (previous update persisted)"
else
    fail "Theme unexpectedly changed: $THEME_VERIFY2"
fi

section "TEST 4: Update Both Fields"

info "Updating both theme and landingPage simultaneously..."
UPDATE_BOTH=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"theme":"light","landingPage":"home"}')

HTTP_CODE=$(echo "$UPDATE_BOTH" | tail -n1)

if [[ "$HTTP_CODE" == "204" ]]; then
    pass "Simultaneous update successful (HTTP 204)"
else
    fail "Simultaneous update failed (HTTP $HTTP_CODE)"
fi

PREF_VERIFY3=$(curl -s -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

THEME_FINAL=$(echo "$PREF_VERIFY3" | jq -r '.theme')
LANDING_FINAL=$(echo "$PREF_VERIFY3" | jq -r '.landingPage')

if [[ "$THEME_FINAL" == "light" && "$LANDING_FINAL" == "home" ]]; then
    pass "Both fields updated correctly (theme=light, landingPage=home)"
else
    fail "Simultaneous update failed (theme=$THEME_FINAL, landingPage=$LANDING_FINAL)"
fi

section "TEST 5: Validation - Invalid Theme"

info "Attempting to set invalid theme 'blue'..."
INVALID_THEME=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"theme":"blue"}')

HTTP_CODE=$(echo "$INVALID_THEME" | tail -n1)
ERROR_MSG=$(echo "$INVALID_THEME" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid theme rejected (HTTP 400)"
else
    fail "Invalid theme not rejected (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"Invalid theme"* ]]; then
    pass "Error message mentions 'Invalid theme'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 6: Validation - Invalid Landing Page"

info "Attempting to set invalid landingPage 'dashboard'..."
INVALID_LANDING=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"landingPage":"dashboard"}')

HTTP_CODE=$(echo "$INVALID_LANDING" | tail -n1)
ERROR_MSG=$(echo "$INVALID_LANDING" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Invalid landingPage rejected (HTTP 400)"
else
    fail "Invalid landingPage not rejected (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"Invalid landingPage"* ]]; then
    pass "Error message mentions 'Invalid landingPage'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 7: Validation - Unknown Fields"

info "Attempting to update with unknown field 'fontSize'..."
UNKNOWN_FIELD=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{"fontSize":"large"}')

HTTP_CODE=$(echo "$UNKNOWN_FIELD" | tail -n1)
ERROR_MSG=$(echo "$UNKNOWN_FIELD" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Unknown field rejected (HTTP 400)"
else
    fail "Unknown field not rejected (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"Invalid fields"* ]]; then
    pass "Error message mentions 'Invalid fields'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 8: Validation - Empty Update"

info "Attempting PATCH with no fields..."
EMPTY_UPDATE=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A" \
  -H "Content-Type: application/json" \
  -d '{}')

HTTP_CODE=$(echo "$EMPTY_UPDATE" | tail -n1)
ERROR_MSG=$(echo "$EMPTY_UPDATE" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "400" ]]; then
    pass "Empty update rejected (HTTP 400)"
else
    fail "Empty update not rejected (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"At least one field"* ]]; then
    pass "Error message mentions 'At least one field'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 9: Security - User B Cannot GET User A's Preferences"

info "User B attempting to GET User A's preferences..."
UNAUTHORIZED_GET=$(curl -s -w "\n%{http_code}" -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_B")

HTTP_CODE=$(echo "$UNAUTHORIZED_GET" | tail -n1)
ERROR_MSG=$(echo "$UNAUTHORIZED_GET" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "403" ]]; then
    pass "Cross-user GET blocked (HTTP 403)"
else
    fail "Cross-user GET not blocked (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"Access denied"* ]]; then
    pass "Error message indicates 'Access denied'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 10: Security - User B Cannot PATCH User A's Preferences"

info "User B attempting to PATCH User A's preferences..."
UNAUTHORIZED_PATCH=$(curl -s -w "\n%{http_code}" -X PATCH "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}')

HTTP_CODE=$(echo "$UNAUTHORIZED_PATCH" | tail -n1)
ERROR_MSG=$(echo "$UNAUTHORIZED_PATCH" | head -n-1 | jq -r '.error // empty')

if [[ "$HTTP_CODE" == "403" ]]; then
    pass "Cross-user PATCH blocked (HTTP 403)"
else
    fail "Cross-user PATCH not blocked (HTTP $HTTP_CODE)"
fi

if [[ "$ERROR_MSG" == *"Access denied"* ]]; then
    pass "Error message indicates 'Access denied'"
else
    fail "Error message unclear: $ERROR_MSG"
fi

section "TEST 11: Verify User A's Preferences Unchanged"

info "Verifying User A's preferences were not affected by User B's attempts..."
FINAL_CHECK=$(curl -s -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

FINAL_THEME=$(echo "$FINAL_CHECK" | jq -r '.theme')
FINAL_LANDING=$(echo "$FINAL_CHECK" | jq -r '.landingPage')

if [[ "$FINAL_THEME" == "light" && "$FINAL_LANDING" == "home" ]]; then
    pass "User A's preferences unchanged (theme=light, landingPage=home)"
else
    fail "User A's preferences corrupted (theme=$FINAL_THEME, landingPage=$FINAL_LANDING)"
fi

section "TEST 12: User B Has Own Independent Preferences"

info "Fetching User B's preferences..."
PREF_B=$(curl -s -X GET "$BASE_URL/api/users/$USER_B_ID/preference" \
  -H "Authorization: Bearer $TOKEN_B")

THEME_B=$(echo "$PREF_B" | jq -r '.theme')
LANDING_B=$(echo "$PREF_B" | jq -r '.landingPage')
USER_ID_B=$(echo "$PREF_B" | jq -r '.userId')

if [[ "$THEME_B" == "light" && "$LANDING_B" == "home" ]]; then
    pass "User B has default preferences (theme=light, landingPage=home)"
else
    fail "User B's preferences incorrect (theme=$THEME_B, landingPage=$LANDING_B)"
fi

if [[ "$USER_ID_B" == "$USER_B_ID" ]]; then
    pass "User B's preferences linked to correct userId"
else
    fail "User B's preference userId mismatch: $USER_ID_B"
fi

info "Updating User B's preferences independently..."
curl -s -o /dev/null -X PATCH "$BASE_URL/api/users/$USER_B_ID/preference" \
  -H "Authorization: Bearer $TOKEN_B" \
  -H "Content-Type: application/json" \
  -d '{"theme":"dark"}'

PREF_B_UPDATED=$(curl -s -X GET "$BASE_URL/api/users/$USER_B_ID/preference" \
  -H "Authorization: Bearer $TOKEN_B")

PREF_A_FINAL=$(curl -s -X GET "$BASE_URL/api/users/$USER_A_ID/preference" \
  -H "Authorization: Bearer $TOKEN_A")

THEME_B_UPDATED=$(echo "$PREF_B_UPDATED" | jq -r '.theme')
THEME_A_FINAL=$(echo "$PREF_A_FINAL" | jq -r '.theme')

if [[ "$THEME_B_UPDATED" == "dark" && "$THEME_A_FINAL" == "light" ]]; then
    pass "User preferences are independent (B=dark, A=light)"
else
    fail "User preferences not independent (B=$THEME_B_UPDATED, A=$THEME_A_FINAL)"
fi
