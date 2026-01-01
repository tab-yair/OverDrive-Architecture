#!/bin/bash

BASE_URL="http://localhost:3000"

# Create users
echo "Creating User 1..."
REGISTER1=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"u1@test.com","password":"pass123","name":"User1"}')

TOKEN1=$(echo "$REGISTER1" | jq -r '.token')
echo "User 1 token: $TOKEN1"

sleep 0.5

echo "Creating User 2..."
REGISTER2=$(curl -s -X POST "$BASE_URL/api/auth/register" \
  -H "Content-Type: application/json" \
  -d '{"email":"u2@test.com","password":"pass123","name":"User2"}')

TOKEN2=$(echo "$REGISTER2" | jq -r '.token')
echo "User 2 token: $TOKEN2"

sleep 0.5

# User 1 creates file
echo "Creating file..."
FILE_RESPONSE=$(curl -s -X POST "$BASE_URL/api/files" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d '{"name":"shared-test.txt","type":"file","contentUrl":"http://test.com/file"}')

FILE_ID=$(echo "$FILE_RESPONSE" | jq -r '.id')
echo "Created file: $FILE_ID"

sleep 0.5

# Grant VIEWER to User 2
echo "Granting permission..."
PERM_RESPONSE=$(curl -s -X POST "$BASE_URL/api/permissions" \
  -H "Authorization: Bearer $TOKEN1" \
  -H "Content-Type: application/json" \
  -d "{\"fileId\":\"$FILE_ID\",\"userId\":\"u2@test.com\",\"level\":\"VIEWER\"}")

echo "Permission granted: $PERM_RESPONSE"

sleep 0.5

# User 2 stars the file
echo "User 2 starring file..."
STAR_RESULT=$(curl -s -X POST "$BASE_URL/api/files/$FILE_ID/star" \
  -H "Authorization: Bearer $TOKEN2")

echo "Star result: $STAR_RESULT"

sleep 0.5

# Get shared files
echo "Getting shared files for User 2..."
SHARED=$(curl -s "$BASE_URL/api/files/shared" \
  -H "Authorization: Bearer $TOKEN2")

echo "Shared files response:"
echo "$SHARED" | jq '.'

echo ""
echo "Checking isStarred field:"
echo "$SHARED" | jq '.[0].isStarred'
