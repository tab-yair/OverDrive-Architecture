#!/bin/bash
# Test download endpoint - single files and folder exports

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
echo "Testing Download Endpoint"
echo "=========================================="
echo ""

# Create test users with unique emails
echo "1. Creating test users..."
RAND=$(( $RANDOM % 10000 ))
# Small base64 test image (1x1 red pixel PNG)
PROFILE_IMG="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="

U1=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"username\":\"dlown${RAND}@gmail.com\",\"password\":\"pass12345678\",\"firstName\":\"DownloadOwner\",\"profileImage\":\"$PROFILE_IMG\"}" | jq -r '.id')
U2=$(curl -s -X POST http://localhost:3000/api/users -H "Content-Type: application/json" -d "{\"username\":\"dlview${RAND}@gmail.com\",\"password\":\"pass12345678\",\"firstName\":\"DownloadViewer\",\"profileImage\":\"$PROFILE_IMG\"}" | jq -r '.id')
echo "✓ Users created: $U1, $U2"

# Login as owner
echo "2. Logging in as owner..."
TOKEN=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d "{\"username\":\"dlown${RAND}@gmail.com\",\"password\":\"pass12345678\"}" | jq -r '.token')
echo "✓ Token received"

# Create test files of different types
echo ""
echo "3. Creating test files..."

# Create a docs file with multi-line content (including newlines)
# Use proper JSON escaping for newlines
DOC=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"readme.txt\",\"type\":\"docs\",\"content\":\"Welcome to OverDrive!\\nThis is a test document.\\nLine 3 of content.\\nSpecial chars: @#\$%\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created docs file: $DOC"

# Create a PDF file (Base64 encoded - minimal valid PDF)
# This is a properly encoded minimal PDF that says "Test PDF"
PDF_CONTENT="JVBERi0xLjQKJeLjz9MKMyAwIG9iago8PC9UeXBlIC9QYWdlCi9QYXJlbnQgMSAwIFIKL01lZGlhQm94IFswIDAgNjEyIDc5Ml0KL0NvbnRlbnRzIDQgMCBSPj4KZW5kb2JqCjQgMCBvYmoKPDwvTGVuZ3RoIDQ0Pj4Kc3RyZWFtCkJUCi9GMSAxMiBUZgoxMCA3MjAgVGQKKFRlc3QgUERGKSBUagpFVAplbmRzdHJlYW0KZW5kb2JqCjEgMCBvYmoKPDwvVHlwZSAvUGFnZXMKL0NvdW50IDEKL0tpZHMgWzMgMCBSXT4+CmVuZG9iagoyIDAgb2JqCjw8L1R5cGUgL0NhdGFsb2cKL1BhZ2VzIDEgMCBSPj4KZW5kb2JqCjUgMCBvYmoKPDwvVHlwZSAvRm9udAovU3VidHlwZSAvVHlwZTEKL0Jhc2VGb250IC9IZWx2ZXRpY2E+PgplbmRvYmoKeHJlZgowIDYKMDAwMDAwMDAwMCA2NTUzNSBmIAowMDAwMDAwMjA4IDAwMDAwIG4gCjAwMDAwMDAyNjcgMDAwMDAgbiAKMDAwMDAwMDAxNSAwMDAwMCBuIAowMDAwMDAwMTA2IDAwMDAwIG4gCjAwMDAwMDAzMTYgMDAwMDAgbiAKdHJhaWxlcgo8PC9TaXplIDYKL1Jvb3QgMiAwIFI+PgpzdGFydHhyZWYKMzk2CiUlRU9G"
PDF=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"document.pdf\",\"type\":\"pdf\",\"content\":\"$PDF_CONTENT\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created PDF file: $PDF"

# Create an image file (Base64 encoded - tiny 1x1 PNG, red pixel)
IMAGE_CONTENT="iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFBQIAX8jx0gAAAABJRU5ErkJggg=="
IMAGE=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"pixel.png\",\"type\":\"image\",\"content\":\"$IMAGE_CONTENT\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created image file: $IMAGE"

# Create folder structure for export test 
echo ""
echo "4. Creating folder structure..."

# Main folder
FOLDER=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"ProjectRoot","type":"folder"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created folder: $FOLDER"

# Subfolder
SUBFOLDER=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"Subfolder\",\"type\":\"folder\",\"parentId\":\"$FOLDER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created subfolder: $SUBFOLDER"

# Files in folder structure
FILE1=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"root_file.txt\",\"type\":\"docs\",\"content\":\"File in root\\nLine 2\\nLine 3\",\"parentId\":\"$FOLDER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created file in root: $FILE1"

FILE2=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"name\":\"sub_file.txt\",\"type\":\"docs\",\"content\":\"File in subfolder\\nAnother line\\nThird line\",\"parentId\":\"$SUBFOLDER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
echo "  ✓ Created file in subfolder: $FILE2"

# Test single file downloads
echo ""
echo "=== Testing Single File Downloads ==="

# Test 1: Download docs file
echo "5. Download docs file..."
HTTP_RESPONSE=$(curl -s -i -X GET http://localhost:3000/api/files/$DOC/download -H "Authorization: Bearer $TOKEN")
HTTP_CODE=$(echo "$HTTP_RESPONSE" | grep -oP '^HTTP/[0-9.]+ \K[0-9]+' | head -1)
CONTENT_TYPE=$(echo "$HTTP_RESPONSE" | grep -i "content-type:" | awk -F': ' '{print $2}' | tr -d '\r\n')
DOWNLOADED_CONTENT=$(echo "$HTTP_RESPONSE" | awk -v RS='\r\n\r\n' 'NR>1')

if [[ "$HTTP_CODE" == "200" ]]; then
    # Verify Content-Type header
    if [[ "$CONTENT_TYPE" == *"text/plain"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content-Type header correct: $CONTENT_TYPE"
    else
        echo -e "  ${RED}✗${NC} Content-Type header incorrect: $CONTENT_TYPE (expected text/plain)"
    fi
    
    # Verify content with newlines preserved
    if [[ "$DOWNLOADED_CONTENT" == *"Welcome to OverDrive"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content downloaded successfully"
        
        # Check for actual newlines (not escaped \n)
        NEWLINE_COUNT=$(echo "$DOWNLOADED_CONTENT" | grep -c "")
        if [[ $NEWLINE_COUNT -ge 3 ]]; then
            echo -e "  ${GREEN}✓${NC} Newlines preserved correctly (found $NEWLINE_COUNT lines)"
        else
            echo -e "  ${RED}✗${NC} Newlines not preserved - got $NEWLINE_COUNT lines, expected 4+"
            echo "    Content: $(echo "$DOWNLOADED_CONTENT" | cat -A | head -c 100)"
        fi
    else
        echo -e "  ${RED}✗${NC} Docs download failed - content mismatch"
        echo "    Expected: 'Welcome to OverDrive'"
        echo "    Got: $DOWNLOADED_CONTENT"
    fi
else
    echo -e "  ${RED}✗${NC} Docs download failed - HTTP $HTTP_CODE"
fi

# Test 2: Download PDF file
echo "6. Download PDF file..."
curl -s -X GET http://localhost:3000/api/files/$PDF/download -H "Authorization: Bearer $TOKEN" -o /tmp/test_doc.pdf -D /tmp/pdf_headers.txt
HTTP_CODE=$(grep -oP '^HTTP/[0-9.]+ \K[0-9]+' /tmp/pdf_headers.txt | head -1)
CONTENT_TYPE=$(grep -i "content-type:" /tmp/pdf_headers.txt | awk -F': ' '{print $2}' | tr -d '\r\n')
CONTENT_DISP=$(grep -i "content-disposition:" /tmp/pdf_headers.txt | awk -F': ' '{print $2}' | tr -d '\r\n')

if [[ "$HTTP_CODE" == "200" ]]; then
    # Verify Content-Type header
    if [[ "$CONTENT_TYPE" == *"application/pdf"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content-Type header correct: $CONTENT_TYPE"
    else
        echo -e "  ${RED}✗${NC} Content-Type header incorrect: $CONTENT_TYPE (expected application/pdf)"
    fi
    
    # Verify Content-Disposition header
    if [[ "$CONTENT_DISP" == *"attachment"* ]] && [[ "$CONTENT_DISP" == *"filename"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content-Disposition header present: $CONTENT_DISP"
    else
        echo -e "  ${RED}✗${NC} Content-Disposition header missing or incorrect"
    fi
    
    # Check PDF Magic Bytes (25 50 44 46 = %PDF)
    MAGIC=$(hexdump -n 4 -e '4/1 "%02x" "\n"' /tmp/test_doc.pdf)
    if [[ "$MAGIC" == "25504446" ]]; then
        echo -e "  ${GREEN}✓${NC} PDF Magic Bytes verified (0x25504446 = %PDF)"
    else
        echo -e "  ${RED}✗${NC} PDF Magic Bytes incorrect: 0x$MAGIC (expected 0x25504446)"
    fi
else
    echo -e "  ${RED}✗${NC} PDF download failed - HTTP $HTTP_CODE"
fi

# Test 3: Download image file
echo "7. Download image file..."
curl -s -X GET http://localhost:3000/api/files/$IMAGE/download -H "Authorization: Bearer $TOKEN" -o /tmp/test_image.png -D /tmp/image_headers.txt
HTTP_CODE=$(grep -oP '^HTTP/[0-9.]+ \K[0-9]+' /tmp/image_headers.txt | head -1)
CONTENT_TYPE=$(grep -i "content-type:" /tmp/image_headers.txt | awk -F': ' '{print $2}' | tr -d '\r\n')
CONTENT_DISP=$(grep -i "content-disposition:" /tmp/image_headers.txt | awk -F': ' '{print $2}' | tr -d '\r\n')

if [[ "$HTTP_CODE" == "200" ]]; then
    # Verify Content-Type header
    if [[ "$CONTENT_TYPE" == *"image/"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content-Type header correct: $CONTENT_TYPE"
    else
        echo -e "  ${RED}✗${NC} Content-Type header incorrect: $CONTENT_TYPE (expected image/*)"
    fi
    
    # Verify Content-Disposition header
    if [[ "$CONTENT_DISP" == *"attachment"* ]] && [[ "$CONTENT_DISP" == *"filename"* ]]; then
        echo -e "  ${GREEN}✓${NC} Content-Disposition header present: $CONTENT_DISP"
    else
        echo -e "  ${RED}✗${NC} Content-Disposition header missing or incorrect"
    fi
    
    # Check PNG Magic Bytes (89 50 4E 47 = \x89PNG)
    MAGIC=$(hexdump -n 4 -e '4/1 "%02x" "\n"' /tmp/test_image.png)
    if [[ "$MAGIC" == "89504e47" ]]; then
        echo -e "  ${GREEN}✓${NC} PNG Magic Bytes verified (0x89504E47 = \\x89PNG)"
    else
        echo -e "  ${RED}✗${NC} PNG Magic Bytes incorrect: 0x$MAGIC (expected 0x89504E47)"
    fi
else
    echo -e "  ${RED}✗${NC} Image download failed - HTTP $HTTP_CODE"
fi

# Test folder export
echo ""
echo "=== Testing Folder Export ==="

# Test 4: Export folder as JSON
echo "8. Export folder (flattened recursive)..."
curl -s -X GET http://localhost:3000/api/files/$FOLDER/download -H "Authorization: Bearer $TOKEN" -o /tmp/folder_export.json
HTTP_CODE=$?

if [[ $HTTP_CODE -eq 0 ]]; then
    # Verify it's valid JSON
    if jq empty /tmp/folder_export.json 2>/dev/null; then
        FILE_COUNT=$(jq '. | length' /tmp/folder_export.json)
        echo -e "  ${GREEN}✓${NC} Folder export successful - JSON valid"
        echo "    Found $FILE_COUNT files in export"
        
        # Verify all files are present
        HAS_ROOT=$(jq -r '.[] | select(.name=="root_file.txt") | .name' /tmp/folder_export.json)
        HAS_SUB=$(jq -r '.[] | select(.name=="sub_file.txt") | .name' /tmp/folder_export.json)
        
        if [[ -n "$HAS_ROOT" && -n "$HAS_SUB" ]]; then
            echo -e "  ${GREEN}✓${NC} All files present in export"
        else
            echo -e "  ${RED}✗${NC} Missing files in export"
        fi
        
        # Verify relative paths
        ROOT_PATH=$(jq -r '.[] | select(.name=="root_file.txt") | .path' /tmp/folder_export.json)
        SUB_PATH=$(jq -r '.[] | select(.name=="sub_file.txt") | .path' /tmp/folder_export.json)
        
        echo "    Paths:"
        echo "      - $ROOT_PATH (expected: root_file.txt)"
        echo "      - $SUB_PATH (expected: Subfolder/sub_file.txt)"
        
        if [[ "$ROOT_PATH" == "root_file.txt" && "$SUB_PATH" == "Subfolder/sub_file.txt" ]]; then
            echo -e "  ${GREEN}✓${NC} Relative paths correct"
        else
            echo -e "  ${RED}✗${NC} Relative paths incorrect"
        fi
        
        # Verify content is included and properly unescaped (no \\n)
        ROOT_CONTENT=$(jq -r '.[] | select(.name=="root_file.txt") | .content' /tmp/folder_export.json)
        SUB_CONTENT=$(jq -r '.[] | select(.name=="sub_file.txt") | .content' /tmp/folder_export.json)
        
        if [[ "$ROOT_CONTENT" == *"File in root"* && "$SUB_CONTENT" == *"File in subfolder"* ]]; then
            echo -e "  ${GREEN}✓${NC} Content included in export"
        else
            echo -e "  ${RED}✗${NC} Content missing or incorrect"
        fi
        
        # Verify newlines are preserved in folder export content
        ROOT_LINES=$(echo "$ROOT_CONTENT" | wc -l)
        SUB_LINES=$(echo "$SUB_CONTENT" | wc -l)
        if [[ $ROOT_LINES -ge 3 && $SUB_LINES -ge 3 ]]; then
            echo -e "  ${GREEN}✓${NC} Newlines preserved in exported files (root: $ROOT_LINES lines, sub: $SUB_LINES lines)"
        else
            echo -e "  ${RED}✗${NC} Newlines not preserved in exported files (root: $ROOT_LINES, sub: $SUB_LINES)"
        fi
        
        # Verify newlines are properly unescaped (not escaped as \\n)
        # Check that \n does not appear as literal \\n in JSON
        RAW_JSON=$(cat /tmp/folder_export.json)
        if ! echo "$RAW_JSON" | grep -q '\\\\n'; then
            echo -e "  ${GREEN}✓${NC} Content properly unescaped (no \\\\n found in JSON)"
        else
            echo -e "  ${RED}✗${NC} Content contains escaped newlines (\\\\n) - should be unescaped"
            echo "    Raw JSON sample: $(echo "$RAW_JSON" | head -c 200)"
        fi
        
        # Verify folders are excluded from array
        FOLDER_COUNT=$(jq '[.[] | select(.type=="folder")] | length' /tmp/folder_export.json)
        if [[ "$FOLDER_COUNT" == "0" ]]; then
            echo -e "  ${GREEN}✓${NC} Folders correctly excluded from export"
        else
            echo -e "  ${RED}✗${NC} Folders should not be in export array"
        fi
        
    else
        echo -e "  ${RED}✗${NC} Folder export failed - invalid JSON"
    fi
else
    echo -e "  ${RED}✗${NC} Folder export failed"
fi

# Test empty folder
echo ""
echo "=== Testing Empty Folder Export ==="

# Test 4.1: Export empty folder
echo "8.1 Export empty folder (should return empty array)..."
EMPTY_FOLDER=$(curl -s -X POST http://localhost:3000/api/files -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d '{"name":"EmptyFolder","type":"folder"}' -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
curl -s -X GET http://localhost:3000/api/files/$EMPTY_FOLDER/download -H "Authorization: Bearer $TOKEN" -o /tmp/empty_folder_export.json

if jq empty /tmp/empty_folder_export.json 2>/dev/null; then
    EMPTY_COUNT=$(jq '. | length' /tmp/empty_folder_export.json)
    if [[ "$EMPTY_COUNT" == "0" ]]; then
        echo -e "  ${GREEN}✓${NC} Empty folder returns empty array []"
    else
        echo -e "  ${RED}✗${NC} Empty folder should return empty array, got $EMPTY_COUNT items"
    fi
    
    # Verify it's actually an array
    if jq -e '. | type == "array"' /tmp/empty_folder_export.json > /dev/null; then
        echo -e "  ${GREEN}✓${NC} Response is an array type"
    else
        echo -e "  ${RED}✗${NC} Response should be an array"
    fi
else
    echo -e "  ${RED}✗${NC} Empty folder export failed - invalid JSON"
fi

# Test permission-based access
echo ""
echo "=== Testing Permission-Based Download ==="

# Test 5: Download without permission (should fail)
echo "9. Download without permission (should fail)..."
TOKEN2=$(curl -s -X POST http://localhost:3000/api/tokens -H "Content-Type: application/json" -d "{\"username\":\"dlview${RAND}@gmail.com\",\"password\":\"pass12345678\"}" | jq -r '.token')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/files/$DOC/download -H "Authorization: Bearer $TOKEN2")
if [[ "$HTTP_CODE" == "403" ]]; then
    echo -e "  ${GREEN}✓${NC} Permission denied correctly (HTTP 403)"
else
    echo -e "  ${RED}✗${NC} Should have denied access - got HTTP $HTTP_CODE"
fi

# Test 6: Grant permission and download
echo "10. Grant VIEWER permission and download..."
PERM=$(curl -s -X POST http://localhost:3000/api/files/$DOC/permissions -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" -d "{\"targetUserId\":\"$U2\",\"permissionLevel\":\"VIEWER\"}" -i | grep Location | awk -F'/' '{print $NF}' | tr -d '\r\n')
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/files/$DOC/download -H "Authorization: Bearer $TOKEN2")
if [[ "$HTTP_CODE" == "200" ]]; then
    echo -e "  ${GREEN}✓${NC} Download successful with VIEWER permission"
else
    echo -e "  ${RED}✗${NC} Download failed with permission - HTTP $HTTP_CODE"
fi

# Test 7: Download non-existent file
echo "11. Download non-existent file (should fail)..."
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X GET http://localhost:3000/api/files/invalid-id-12345/download -H "Authorization: Bearer $TOKEN")
if [[ "$HTTP_CODE" == "404" ]]; then
    echo -e "  ${GREEN}✓${NC} Correctly returned 404 for non-existent file"
else
    echo -e "  ${RED}✗${NC} Should have returned 404 - got HTTP $HTTP_CODE"
fi

# Cleanup
echo ""
echo "=== Cleanup ==="
rm -f /tmp/test_doc.txt /tmp/test_doc.pdf /tmp/test_image.png /tmp/folder_export.json /tmp/empty_folder_export.json /tmp/pdf_headers.txt /tmp/image_headers.txt
echo "✓ Temporary files cleaned up"

echo ""
echo "=== Download Tests Complete ==="
