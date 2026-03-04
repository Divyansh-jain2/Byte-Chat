#!/bin/bash

# Test the reaction endpoints

echo "=================================="
echo "Testing Message Reaction Endpoints"
echo "=================================="

# First, let's get a valid token by logging in
echo -e "\n1. Logging in to get auth token..."

LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "rollNo": "B23CS001",
    "password": "wtf123"
  }')

echo "Login response: $LOGIN_RESPONSE"

# Extract token (simple grep/cut, or use jq if available)
TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)

if [ -z "$TOKEN" ]; then
  echo "[Err] Failed to get auth token. Trying alternative user..."
  LOGIN_RESPONSE=$(curl -s -X POST http://localhost:3001/api/auth/login \
    -H "Content-Type: application/json" \
    -d '{
      "email": "test@example.com",
      "password": "wtf123"
    }')
  echo "Login response: $LOGIN_RESPONSE"
  TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"accessToken":"[^"]*' | cut -d'"' -f4)
fi

if [ -z "$TOKEN" ]; then
  echo "[Err] Still failed to get token. Check credentials."
  exit 1
fi

echo "[OK] Got token: ${TOKEN:0:50}..."

# Get a message ID
echo -e "\n2. Getting a message ID..."
MESSAGE_ID="5224e8db-0d67-4c54-9734-f75c2d0099ef"
echo "Using message ID: $MESSAGE_ID"

# Test adding a reaction
echo -e "\n3. Adding a reaction..."
ADD_RESPONSE=$(curl -s -X POST "http://localhost:3001/api/messages/message/$MESSAGE_ID/reaction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"emoji": "😀"}')

echo "Add reaction response:"
echo "$ADD_RESPONSE"

# Test getting reactions
echo -e "\n4. Getting reactions for the message..."
GET_RESPONSE=$(curl -s -X GET "http://localhost:3001/api/messages/message/$MESSAGE_ID/reactions" \
  -H "Authorization: Bearer $TOKEN")

echo "Get reactions response:"
echo "$GET_RESPONSE"

# Test removing a reaction
echo -e "\n5. Removing the reaction..."
REMOVE_RESPONSE=$(curl -s -X DELETE "http://localhost:3001/api/messages/message/$MESSAGE_ID/reaction" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"emoji": "😀"}')

echo "Remove reaction response:"
echo "$REMOVE_RESPONSE"

echo -e "\n=================================="
echo "Test completed!"
echo "=================================="
