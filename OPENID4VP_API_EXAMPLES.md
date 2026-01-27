# OpenID4VP API - Exemples cURL et Postman

## 1. Initiation de Vérification

### cURL
```bash
curl -X POST http://localhost:3000/verification/initiate-presentation \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "custom_credential"
  }'
```

### Response (JSON)
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "qr_content": "http://smn.gmz:4000?presentation_request_uri=http%3A%2F%2Flocalhost%3A3000%2Fpresentation-request%2F550e8400-e29b-41d4-a716-446655440000",
  "qr_code": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAGQ...",
  "credential_type": "custom_credential",
  "verifier": "http://localhost:3000",
  "wallet_url": "http://smn.gmz:4000",
  "presentation_request_uri": "http://localhost:3000/presentation-request/550e8400-e29b-41d4-a716-446655440000",
  "expires_in": 600
}
```

## 2. Récupération de la Présentation Request

### cURL
```bash
curl -X GET "http://localhost:3000/presentation-request/550e8400-e29b-41d4-a716-446655440000" \
  -H "Accept: application/json"
```

### Response (JSON)
```json
{
  "client_id": "http://localhost:3000",
  "redirect_uri": "http://localhost:3000/presentation-callback",
  "response_type": "vp_token id_token",
  "response_mode": "direct_post",
  "presentation_definition": {
    "id": "openid4vp-request",
    "input_descriptors": [
      {
        "id": "credential",
        "name": "Custom Credential",
        "purpose": "Vérification du credential",
        "format": {
          "jwt_vc_json": {}
        },
        "constraints": {
          "fields": [
            {
              "path": ["$.vc.type"],
              "filter": {
                "type": "string",
                "pattern": "custom_credential"
              }
            }
          ]
        }
      }
    ]
  },
  "state": "abc-123-def-456",
  "nonce": "xyz-789-uvw-012"
}
```

## 3. Envoi de la Présentation (Callback Wallet)

### cURL
```bash
curl -X POST http://localhost:3000/presentation-callback \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyOmZmZDY4MjYxLWFmMGMtNDczYS04ZDk2LWI3ZGM4OTU1MmU2NSIsInZjIjpbeyJpc3N1ZXIiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiY3VzdG9tX2NyZWRlbnRpYWwiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiY3VzdG9tRGF0YSI6IkNyZWRlbnRpYWwgRUlEQVMgZMOobW8iLCJkZXBhcnRtZW50IjoiSVQiLCJyb2xlIjoiQWRtaW5pc3RyYXRvciJ9fV0sImlhdCI6MTcwNDcwMzEzOX0.signature...",
    "presentation_submission": {
      "id": "openid4vp-response",
      "definition_id": "openid4vp-request",
      "descriptor_map": [
        {
          "id": "credential",
          "format": "jwt_vc_json",
          "path": "$.vc[0]"
        }
      ]
    },
    "state": "abc-123-def-456"
  }'
```

### Response (JSON)
```json
{
  "status": "completed",
  "message": "Présentation vérifiée avec succès"
}
```

## 4. Vérification du Statut

### cURL
```bash
curl -X GET "http://localhost:3000/verification/presentation-status/550e8400-e29b-41d4-a716-446655440000" \
  -H "Accept: application/json"
```

### Response - En attente (JSON)
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending",
  "credential_type": "custom_credential",
  "created_at": "2024-01-27T10:30:45.123Z",
  "completed_at": null
}
```

### Response - Complétée (JSON)
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "credential_type": "custom_credential",
  "created_at": "2024-01-27T10:30:45.123Z",
  "completed_at": "2024-01-27T10:32:15.456Z"
}
```

## 5. Récupération des Résultats

### cURL
```bash
curl -X GET "http://localhost:3000/verification/presentation-result/550e8400-e29b-41d4-a716-446655440000" \
  -H "Accept: application/json"
```

### Response (JSON)
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "valid": true,
  "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJ1c2VyOmZmZDY4MjYxLWFmMGMtNDczYS04ZDk2LWI3ZGM4OTU1MmU2NSIsInZjIjpbeyJpc3N1ZXIiOiJodHRwOi8vbG9jYWxob3N0OjMwMDAiLCJ0eXBlIjpbIlZlcmlmaWFibGVDcmVkZW50aWFsIiwiY3VzdG9tX2NyZWRlbnRpYWwiXSwiY3JlZGVudGlhbFN1YmplY3QiOnsiY3VzdG9tRGF0YSI6IkNyZWRlbnRpYWwgRUlEQVMgZMOobW8iLCJkZXBhcnRtZW50IjoiSVQiLCJyb2xlIjoiQWRtaW5pc3RyYXRvciJ9fV0sImlhdCI6MTcwNDcwMzEzOX0.signature...",
  "claims": {
    "sub": "user:ffd68261-af0c-473a-8d96-b7dc899552e65",
    "vc": [
      {
        "issuer": "http://localhost:3000",
        "type": ["VerifiableCredential", "custom_credential"],
        "credentialSubject": {
          "customData": "Credential EIDAS démo",
          "department": "IT",
          "role": "Administrator"
        }
      }
    ],
    "iat": 1704703139
  },
  "presentation_info": {
    "holder": "user:ffd68261-af0c-473a-8d96-b7dc899552e65",
    "issuer": "http://localhost:3000",
    "credential_type": "custom_credential",
    "issued_at": "2024-01-27T10:30:45.000Z",
    "expires_at": "2025-01-27T10:30:45.000Z"
  },
  "completed_at": "2024-01-27T10:32:15.456Z"
}
```

## Postman Collection

```json
{
  "info": {
    "name": "OpenID4VP - Demo EIDAS",
    "description": "API OpenID4VP pour vérification de credentials"
  },
  "item": [
    {
      "name": "1. Initiate Verification",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/verification/initiate-presentation",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"credential_type\": \"custom_credential\"}"
        }
      }
    },
    {
      "name": "2. Get Presentation Request",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/presentation-request/{{session_id}}"
      }
    },
    {
      "name": "3. Submit Presentation (Callback)",
      "request": {
        "method": "POST",
        "url": "http://localhost:3000/presentation-callback",
        "header": [
          {
            "key": "Content-Type",
            "value": "application/json"
          }
        ],
        "body": {
          "mode": "raw",
          "raw": "{\"vp_token\": \"{{vp_token}}\", \"state\": \"{{state}}\"}"
        }
      }
    },
    {
      "name": "4. Check Status",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/verification/presentation-status/{{session_id}}"
      }
    },
    {
      "name": "5. Get Results",
      "request": {
        "method": "GET",
        "url": "http://localhost:3000/verification/presentation-result/{{session_id}}"
      }
    }
  ],
  "variable": [
    {
      "key": "session_id",
      "value": "",
      "type": "string"
    },
    {
      "key": "vp_token",
      "value": "",
      "type": "string"
    },
    {
      "key": "state",
      "value": "",
      "type": "string"
    }
  ]
}
```

## Tests Bash Complets

```bash
#!/bin/bash

# Couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== OpenID4VP API Tests ===${NC}\n"

# 1. Initiation
echo -e "${BLUE}1. Initiating Verification...${NC}"
RESPONSE=$(curl -s -X POST http://localhost:3000/verification/initiate-presentation \
  -H "Content-Type: application/json" \
  -d '{"credential_type": "custom_credential"}')

SESSION_ID=$(echo $RESPONSE | grep -o '"session_id":"[^"]*' | cut -d'"' -f4)
echo -e "${GREEN}✓ Session ID: $SESSION_ID${NC}\n"

# 2. Récupération Request
echo -e "${BLUE}2. Getting Presentation Request...${NC}"
curl -s -X GET "http://localhost:3000/presentation-request/$SESSION_ID" \
  -H "Accept: application/json" | jq '.' | head -20
echo -e "${GREEN}✓ Done${NC}\n"

# 3. Vérification du Statut
echo -e "${BLUE}3. Checking Status...${NC}"
curl -s -X GET "http://localhost:3000/verification/presentation-status/$SESSION_ID" \
  -H "Accept: application/json" | jq '.'
echo -e "${GREEN}✓ Status checked${NC}\n"

# 4. Attendre callback (simulation)
echo -e "${BLUE}4. Simulating Wallet Response...${NC}"
sleep 2

# 5. Vérifier les résultats
echo -e "${BLUE}5. Getting Results...${NC}"
curl -s -X GET "http://localhost:3000/verification/presentation-result/$SESSION_ID" \
  -H "Accept: application/json" | jq '.'
echo -e "${GREEN}✓ Tests completed!${NC}"
```

## Notes

1. **Session ID**: Généré à chaque initiation, utilisé pour toutes les opérations suivantes
2. **VP Token**: Le credential présenté par le wallet, envoyé au callback
3. **State**: Paramètre de sécurité pour éviter les attaques CSRF
4. **Nonce**: Paramètre pour replay protection
5. **Expiration**: Les sessions expirent après 10 minutes

## Débogage

Pour voir les logs détaillés, consulter la console du serveur:
```
📋 Présentation Request retournée:
   • VP Token (first 50 chars): eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...
   • Submission: {...}
   • State: abc-123...
```
