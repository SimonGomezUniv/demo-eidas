#!/bin/bash
# Test script for OpenID4VP verification endpoints

BASE_URL="http://localhost:3000"
TIMESTAMP=$(date +%s)

echo "╔════════════════════════════════════════════════════════════════╗"
echo "║         OpenID4VP Verification Endpoints Testing              ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""

# =============================================================================
# 1. TEST: Create a Request Object
# =============================================================================
echo "📋 TEST 1: Create Request Object"
echo "─────────────────────────────────────────────────────────────────"

REQUEST_RESPONSE=$(curl -s -X POST "${BASE_URL}/request_object" \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "http://localhost:3000",
    "redirect_uri": "http://localhost:3000/callback",
    "input_descriptors": [
      {
        "id": "credential-1",
        "name": "Test Credential",
        "purpose": "Verification test",
        "format": {
          "jwt_vc_json": {
            "alg": ["RS256"]
          }
        }
      }
    ]
  }')

echo "Response:"
echo "$REQUEST_RESPONSE" | jq '.' 2>/dev/null || echo "$REQUEST_RESPONSE"
echo ""

# Extract request_id
REQUEST_ID=$(echo "$REQUEST_RESPONSE" | jq -r '.request_id' 2>/dev/null)
echo "✅ Request ID: $REQUEST_ID"
echo ""

# =============================================================================
# 2. TEST: Get Request Object Details
# =============================================================================
echo "📋 TEST 2: Get Request Object Details"
echo "─────────────────────────────────────────────────────────────────"

curl -s -X GET "${BASE_URL}/request_object/${REQUEST_ID}" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed to get request"
echo ""

# =============================================================================
# 3. TEST: Create a Credential (for testing)
# =============================================================================
echo "📋 TEST 3: Create a Test Credential"
echo "─────────────────────────────────────────────────────────────────"

CRED_RESPONSE=$(curl -s -X POST "${BASE_URL}/credential" \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "eu.europa.ec.eudi.pid.1",
    "subject": "test-user-'${TIMESTAMP}'",
    "family_name": "Dupont",
    "given_name": "Jean",
    "birth_date": "1990-01-15",
    "nationality": "FR",
    "age_over_18": true
  }')

echo "Response:"
echo "$CRED_RESPONSE" | jq '.' 2>/dev/null || echo "$CRED_RESPONSE"
echo ""

CREDENTIAL=$(echo "$CRED_RESPONSE" | jq -r '.credential' 2>/dev/null)
echo "✅ Credential JWT (first 50 chars): ${CREDENTIAL:0:50}..."
echo ""

# =============================================================================
# 4. TEST: Verify Credential Signature
# =============================================================================
echo "📋 TEST 4: Verify Credential Signature"
echo "─────────────────────────────────────────────────────────────────"

VERIFY_CRED=$(curl -s -X POST "${BASE_URL}/verify_credential" \
  -H "Content-Type: application/json" \
  -d '{
    "credential": "'${CREDENTIAL}'"
  }')

echo "Response:"
echo "$VERIFY_CRED" | jq '.' 2>/dev/null || echo "$VERIFY_CRED"
echo ""

# =============================================================================
# 5. TEST: Create a Batch of Credentials
# =============================================================================
echo "📋 TEST 5: Create Batch Credentials"
echo "─────────────────────────────────────────────────────────────────"

BATCH_RESPONSE=$(curl -s -X POST "${BASE_URL}/batch_credential" \
  -H "Content-Type: application/json" \
  -d '{
    "credentials": [
      {
        "credential_type": "custom_credential",
        "subject": "batch-test-1",
        "customData": "Test data 1"
      },
      {
        "credential_type": "custom_credential",
        "subject": "batch-test-2",
        "customData": "Test data 2"
      }
    ]
  }')

echo "Response:"
echo "$BATCH_RESPONSE" | jq '.credentials | length' 2>/dev/null || echo "Failed"
echo ""

# Extract credentials for presentation test
CRED1=$(echo "$BATCH_RESPONSE" | jq -r '.credentials[0]' 2>/dev/null)
CRED2=$(echo "$BATCH_RESPONSE" | jq -r '.credentials[1]' 2>/dev/null)

# =============================================================================
# 6. TEST: Verify Presentation (Simple)
# =============================================================================
echo "📋 TEST 6: Verify Presentation (Simple)"
echo "─────────────────────────────────────────────────────────────────"

VERIFY_RESPONSE=$(curl -s -X POST "${BASE_URL}/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "'${CREDENTIAL}'"
  }')

echo "Response:"
echo "$VERIFY_RESPONSE" | jq '.' 2>/dev/null || echo "$VERIFY_RESPONSE"
echo ""

# =============================================================================
# 7. TEST: Verify Presentation with Requirements
# =============================================================================
echo "📋 TEST 7: Verify Presentation with Requirements"
echo "─────────────────────────────────────────────────────────────────"

VERIFY_WITH_REQ=$(curl -s -X POST "${BASE_URL}/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "'${CREDENTIAL}'",
    "requirements": {
      "requiredClaims": ["family_name", "given_name"],
      "claimConstraints": {
        "nationality": "FR"
      }
    }
  }')

echo "Response:"
echo "$VERIFY_WITH_REQ" | jq '.' 2>/dev/null || echo "$VERIFY_WITH_REQ"
echo ""

# =============================================================================
# 8. TEST: Get Verification Stats
# =============================================================================
echo "📋 TEST 8: Get Verification Statistics"
echo "─────────────────────────────────────────────────────────────────"

curl -s -X GET "${BASE_URL}/stats" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed"
echo ""

# =============================================================================
# 9. TEST: Verify with Invalid Token (Error Case)
# =============================================================================
echo "📋 TEST 9: Verify with Invalid Token (Error Case)"
echo "─────────────────────────────────────────────────────────────────"

curl -s -X POST "${BASE_URL}/verify" \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "invalid.token.here"
  }' | jq '.' 2>/dev/null || echo "Failed"
echo ""

# =============================================================================
# 10. TEST: Get Non-Existent Request (Error Case)
# =============================================================================
echo "📋 TEST 10: Get Non-Existent Request (Error Case)"
echo "─────────────────────────────────────────────────────────────────"

curl -s -X GET "${BASE_URL}/request_object/non-existent-id" \
  -H "Content-Type: application/json" | jq '.' 2>/dev/null || echo "Failed"
echo ""

# =============================================================================
# Summary
# =============================================================================
echo "╔════════════════════════════════════════════════════════════════╗"
echo "║                    Tests Completed ✅                         ║"
echo "╚════════════════════════════════════════════════════════════════╝"
echo ""
echo "Summary:"
echo "  • Created request object with ID: $REQUEST_ID"
echo "  • Created PID EIDAS credential"
echo "  • Verified credential signature"
echo "  • Created batch credentials"
echo "  • Verified presentations with and without requirements"
echo "  • Tested error cases"
echo ""
echo "Next Steps:"
echo "  1. Visit http://localhost:3000/verification.html for interactive testing"
echo "  2. Test with wallet integration"
echo "  3. Verify JWT payloads in https://jwt.io"
echo ""
