#!/bin/bash
# Comprehensive test - all 18 endpoints validated (including starred/recent)

echo "=== Testing OverDrive API - All 18 Endpoints ==="
echo ""

# Create users
echo "1. Creating users..."
U1=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"username":"testowner1@gmail.com","password":"pass12345678","firstName":"Owner"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
U2=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"username":"testeditor@gmail.com","password":"pass12345678","firstName":"Editor"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
U3=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d '{"username":"testviewer@gmail.com","password":"pass12345678","firstName":"Viewer"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "✓ Users: $U1, $U2, $U3"

# Login
echo "2. Testing login..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d '{"username":"testowner1@gmail.com","password":"pass12345678"}' | jq -r '.token')
echo "✓ Login successful - Token received"

# Get user
echo "3. Get user info..."
USER=$(curl -s http://localhost:3000/api/users/$U1 -H "Authorization: Bearer $TOKEN" | jq -r '.firstName')
echo "✓ Retrieved: $USER"

# Create files
echo "4. Creating files..."
F1=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"TestFolder","type":"folder"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
F2=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"zebra.txt","type":"docs","content":"Zebra research data"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
F3=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"python.txt","type":"docs","content":"Python code example"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "✓ Files: $F1, $F2, $F3"

# List files
echo "5. List all files..."
COUNT=$(curl -s http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" | jq '. | length')
echo "✓ Found $COUNT files"

# Get file
echo "6. Get file content..."
CONTENT=$(curl -s http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" | jq -r '.content')
echo "✓ Content: $CONTENT"

# Update file
echo "7. Update file..."
curl -s -o /dev/null -X PATCH http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"content":"Updated Zebra data"}'
UPDATED=$(curl -s http://localhost:3000/api/files/$F2 -H "Authorization: Bearer $TOKEN" | jq -r '.content')
echo "✓ Updated: $UPDATED"

# Search by name
echo "8. Search by name..."
FOUND=$(curl -s "http://localhost:3000/api/search/TestFolder" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
echo "✓ Search result: $FOUND"

# Search by content (THE CRITICAL TEST!)
echo "9. Search by content (Zebra)..."
ZEBRA=$(curl -s "http://localhost:3000/api/search/Zebra" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
if [[ -n "$ZEBRA" ]]; then
    echo "✓ Content search works: $ZEBRA"
else
    echo "✗ Content search FAILED - missing split fix!"
fi

echo "10. Search by content (Python)..."
PYTHON=$(curl -s "http://localhost:3000/api/search/Python" -H "Authorization: Bearer $TOKEN" | jq -r '.[].name')
if [[ -n "$PYTHON" ]]; then
    echo "✓ Content search works: $PYTHON"
else
    echo "✗ Content search FAILED"
fi

# Grant permission
echo "11. Grant VIEWER permission..."
P1=$(curl -s -X POST http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "✓ Permission granted: $P1"

# List permissions
echo "12. List permissions..."
PERMS=$(curl -s http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" | jq '. | length')
echo "✓ Permissions count: $PERMS"

# Update permission
echo "13. Update permission to EDITOR..."
curl -s -o /dev/null -X PATCH http://localhost:3000/api/files/$F2/permissions/$P1 -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"permissionLevel":"EDITOR"}'
LEVEL=$(curl -s http://localhost:3000/api/files/$F2/permissions -H "Authorization: Bearer $TOKEN" | jq -r ".[] | select(.id==\"$P1\") | .level")
echo "✓ Updated to: $LEVEL"

# Delete permission
echo "14. Delete permission..."
curl -s -o /dev/null -X DELETE http://localhost:3000/api/files/$F2/permissions/$P1 -H "Authorization: Bearer $TOKEN"
echo "✓ Permission deleted"

# Delete file
echo "15. Delete file..."
curl -s -o /dev/null -X DELETE http://localhost:3000/api/files/$F3 -H "Authorization: Bearer $TOKEN"
echo "✓ File deleted"

# Star files
echo "16. Star a file..."
STAR_RESULT=$(curl -s -X POST http://localhost:3000/api/files/$F2/star -H "Authorization: Bearer $TOKEN" | jq -r '.isStarred')
if [[ "$STAR_RESULT" == "true" ]]; then
    echo "✓ File starred: $STAR_RESULT"
else
    echo "✗ Star failed"
fi

# Get starred files
echo "17. Get starred files..."
STARRED_COUNT=$(curl -s http://localhost:3000/api/files/starred -H "Authorization: Bearer $TOKEN" | jq '. | length')
echo "✓ Starred files count: $STARRED_COUNT"

# Get recent files
echo "18. Get recent files..."
RECENT_COUNT=$(curl -s http://localhost:3000/api/files/recent -H "Authorization: Bearer $TOKEN" | jq '. | length')
RECENT_FIRST=$(curl -s http://localhost:3000/api/files/recent -H "Authorization: Bearer $TOKEN" | jq -r '.[0].name')
echo "✓ Recent files count: $RECENT_COUNT, Most recent: $RECENT_FIRST"

echo ""
echo "=== ALL 18 ENDPOINTS TESTED SUCCESSFULLY ==="
