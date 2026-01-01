#!/bin/bash

GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

API_URL="http://localhost:3000/api"

echo -e "${BLUE}=== Testing Starred and Recent Files Features ===${NC}\n"

echo -e "${BLUE}1. Registering user...${NC}"
curl -s -X POST "$API_URL/users" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser@gmail.com", "password": "password12345678", "firstName": "Test"}'

echo -e "\n${BLUE}2. Logging in...${NC}"
TOKEN_RESPONSE=$(curl -s -X POST "$API_URL/tokens" \
  -H "Content-Type: application/json" \
  -d '{"username": "testuser@gmail.com", "password": "password12345678"}')
TOKEN=$(echo $TOKEN_RESPONSE | jq -r '.token')
echo "Token: ${TOKEN:0:30}..."

echo -e "\n${BLUE}3. Creating 3 test files...${NC}"
curl -s -X POST "$API_URL/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "file1.txt", "type": "file", "content": "Content 1"}'

curl -s -X POST "$API_URL/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "file2.txt", "type": "file", "content": "Content 2"}'

curl -s -X POST "$API_URL/files" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"name": "file3.txt", "type": "file", "content": "Content 3"}'

echo -e "${GREEN}✓ Files created${NC}"

echo -e "\n${BLUE}4. Getting all files...${NC}"
FILES=$(curl -s -X GET "$API_URL/files" -H "Authorization: Bearer $TOKEN")
echo $FILES | jq '.'

FILE1_ID=$(echo $FILES | jq -r '.[0].id')
FILE2_ID=$(echo $FILES | jq -r '.[1].id')
FILE3_ID=$(echo $FILES | jq -r '.[2].id')

echo -e "\nFile IDs: $FILE1_ID, $FILE2_ID, $FILE3_ID"

echo -e "\n${BLUE}5. Viewing files to create recent activity...${NC}"
sleep 1 && curl -s -X GET "$API_URL/files/$FILE1_ID" -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✓ Viewed file1"
sleep 1 && curl -s -X GET "$API_URL/files/$FILE2_ID" -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✓ Viewed file2"
sleep 1 && curl -s -X GET "$API_URL/files/$FILE3_ID" -H "Authorization: Bearer $TOKEN" > /dev/null && echo "✓ Viewed file3"

echo -e "\n${BLUE}6. Getting recent files (should show all 3, file3 first)...${NC}"
curl -s -X GET "$API_URL/files/recent" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}7. Starring file1 and file3...${NC}"
curl -s -X POST "$API_URL/files/$FILE1_ID/star" -H "Authorization: Bearer $TOKEN" | jq '.'
curl -s -X POST "$API_URL/files/$FILE3_ID/star" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}8. Getting starred files (should show file1 and file3)...${NC}"
curl -s -X GET "$API_URL/files/starred" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}9. Unstarring file1...${NC}"
curl -s -X POST "$API_URL/files/$FILE1_ID/star" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}10. Getting starred files (should show only file3)...${NC}"
curl -s -X GET "$API_URL/files/starred" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${BLUE}11. Editing file2 (should move it to top of recent)...${NC}"
sleep 1
curl -s -X PATCH "$API_URL/files/$FILE2_ID" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"content": "Updated content"}'
echo "✓ File edited"

echo -e "\n${BLUE}12. Getting recent files (file2 should be first)...${NC}"
curl -s -X GET "$API_URL/files/recent" -H "Authorization: Bearer $TOKEN" | jq '.'

echo -e "\n${GREEN}=== Test Complete ===${NC}"
