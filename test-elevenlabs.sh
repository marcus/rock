#!/bin/bash

# Test ElevenLabs API key
# Usage: ./test-elevenlabs.sh [API_KEY]

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Get API key from argument or environment
if [ -n "$1" ]; then
    API_KEY="$1"
elif [ -n "$ELEVENLABS_API_KEY" ]; then
    API_KEY="$ELEVENLABS_API_KEY"
else
    echo -e "${RED}Error: No API key provided.${NC}"
    echo "Usage: $0 [API_KEY]"
    echo "Or set ELEVENLABS_API_KEY environment variable"
    exit 1
fi

echo -e "${GREEN}Testing ElevenLabs API key...${NC}"
echo "Key length: ${#API_KEY}"
echo "Key prefix: ${API_KEY:0:8}..."

echo -e "\n${GREEN}Testing API connection...${NC}"

# Test the models endpoint
RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Xi-Api-Key: $API_KEY" \
    -H "Accept: application/json" \
    "https://api.elevenlabs.io/v1/models")

# Extract HTTP code and response body
HTTP_CODE=$(echo "$RESPONSE" | tail -n1 | sed 's/.*HTTP_CODE://')
BODY=$(echo "$RESPONSE" | sed '$d')

echo "HTTP Status Code: $HTTP_CODE"

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ API key is valid and working!${NC}"
    echo "Available models:"
    echo "$BODY" | python3 -m json.tool 2>/dev/null || echo "$BODY"
elif [ "$HTTP_CODE" = "401" ]; then
    echo -e "${RED}✗ API key is invalid or expired${NC}"
    echo "Response: $BODY"
elif [ "$HTTP_CODE" = "429" ]; then
    echo -e "${YELLOW}✗ Rate limit exceeded${NC}"
    echo "Response: $BODY"
else
    echo -e "${RED}✗ API request failed with status $HTTP_CODE${NC}"
    echo "Response: $BODY"
fi

# Test user info endpoint for additional validation
echo -e "\n${GREEN}Testing user info endpoint...${NC}"
USER_RESPONSE=$(curl -s -w "\nHTTP_CODE:%{http_code}" \
    -H "Xi-Api-Key: $API_KEY" \
    -H "Accept: application/json" \
    "https://api.elevenlabs.io/v1/user")

USER_HTTP_CODE=$(echo "$USER_RESPONSE" | tail -n1 | sed 's/.*HTTP_CODE://')
USER_BODY=$(echo "$USER_RESPONSE" | sed '$d')

if [ "$USER_HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✓ User info retrieved successfully${NC}"
    echo "$USER_BODY" | python3 -c "
import sys, json
try:
    data = json.load(sys.stdin)
    print(f\"Subscription: {data.get('subscription', {}).get('tier', 'Unknown')}\")
    print(f\"Character count: {data.get('subscription', {}).get('character_count', 'Unknown')}\")
    print(f\"Character limit: {data.get('subscription', {}).get('character_limit', 'Unknown')}\")
except:
    print('Could not parse user info')
" 2>/dev/null || echo "Raw response: $USER_BODY"
else
    echo -e "${YELLOW}Could not retrieve user info (Status: $USER_HTTP_CODE)${NC}"
fi

echo -e "\n${GREEN}Test completed.${NC}"