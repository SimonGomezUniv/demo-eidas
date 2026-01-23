# 🔐 OpenID4VP - Vérification de Présentations Vérifiables

## Vue d'Ensemble

**OpenID4VP** (OpenID for Verifiable Presentations) est le complément d'OpenID4VC. Alors que OpenID4VC gère l'**émission** de credentials vérifiables, OpenID4VP gère la **vérification** de présentations.

### Flux Général

```
┌─────────────┐
│   Wallet    │  1. Demande Request Object
│   (Titulaire)├──────────────────────────────┐
└─────────────┘                               │
                                              ▼
                                    ┌──────────────────┐
                                    │   Vérificateur   │
                                    │  (Applicaton)    │
                                    └──────────────────┘
                                              ▲
        ┌─────────────────────────────────────┘
        │ 2. Envoie Présentation + JWT
        │
┌───────┴─────┐
│   Wallet    │
│ (Titulaire) │
└─────────────┘
        │
        │ 3. Résultat Vérification
        │
        ▼
┌─────────────┐
│ Titulaire   │
│ Accepté ✅  │
└─────────────┘
```

## 📋 Endpoints OpenID4VP

### 1. Créer une Request Object

**Endpoint:** `POST /request_object`

**Description:** Crée une demande de présentation que le wallet doit satisfaire.

**Request Body:**
```json
{
  "client_id": "http://localhost:3000",
  "redirect_uri": "http://localhost:3000/callback",
  "input_descriptors": [
    {
      "id": "credential-1",
      "name": "Your Credential",
      "purpose": "Verify your identity",
      "format": {
        "jwt_vc_json": {
          "alg": ["RS256"]
        }
      }
    }
  ]
}
```

**Response:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_object_uri": "http://localhost:3000/request_object/550e8400-e29b-41d4-a716-446655440000",
  "expires_in": 600
}
```

### 2. Récupérer une Request Object

**Endpoint:** `GET /request_object/:requestId`

**Description:** Récupère les détails d'une request créée.

**Response:**
```json
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "client_id": "http://localhost:3000",
  "redirect_uri": "http://localhost:3000/callback",
  "response_type": "vp_token",
  "presentation_definition": {
    "id": "presentation-def-...",
    "input_descriptors": [...]
  },
  "state": "abc123",
  "nonce": "xyz789",
  "iat": 1706000000,
  "exp": 1706000600
}
```

### 3. Vérifier une Présentation

**Endpoint:** `POST /presentation`

**Description:** Reçoit et vérifie une présentation vérifiable avec ses credentials.

**Request Body:**
```json
{
  "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "presentation_submission": {},
  "state": "abc123",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "requirements": {
    "requiredClaims": ["family_name", "given_name"],
    "claimConstraints": {
      "nationality": "FR"
    }
  }
}
```

**Response - Succès:**
```json
{
  "success": true,
  "message": "Presentation verified successfully",
  "response_id": "resp-123456",
  "verification_result": {
    "valid": true,
    "credential_count": 1,
    "issuer": "http://localhost:3000",
    "audience": "http://localhost:3000",
    "issued_at": "2024-01-23T10:00:00Z",
    "expires_at": "2024-01-24T10:00:00Z"
  }
}
```

**Response - Erreur:**
```json
{
  "error": "invalid_presentation",
  "error_description": "Presentation verification failed",
  "errors": [
    "Invalid credential signature in presentation",
    "Required claim 'family_name' is missing"
  ]
}
```

### 4. Récupérer un Résultat de Vérification

**Endpoint:** `GET /presentation/:responseId`

**Description:** Récupère le résultat d'une vérification antérieure.

**Response:**
```json
{
  "id": "resp-123456",
  "status": "success",
  "verified": true,
  "timestamp": "2024-01-23T10:05:30Z",
  "credential_count": 1,
  "credentials_info": [
    {
      "type": "custom_credential",
      "subject": "user-uuid-123",
      "issued_at": "2024-01-23T09:00:00Z",
      "expires_at": "2025-01-23T09:00:00Z"
    }
  ]
}
```

### 5. Vérifier une Présentation (Utilitaire)

**Endpoint:** `POST /verify`

**Description:** Endpoint simplifié pour vérifier une présentation avec des requirements optionnels.

**Request Body:**
```json
{
  "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "requirements": {
    "requiredClaims": ["family_name"],
    "claimConstraints": {
      "age_over_18": true
    }
  }
}
```

**Response:**
```json
{
  "valid": true,
  "presentation": {
    "issuer": "http://localhost:3000",
    "audience": "http://localhost:3000",
    "issued_at": "2024-01-23T10:00:00Z",
    "expires_at": "2024-01-24T10:00:00Z",
    "credentials": [
      {
        "credentialType": "eu.europa.ec.eudi.pid.1",
        "subject": "user-uuid",
        "iat": 1706000000,
        "exp": 1706086400
      }
    ]
  },
  "claims_validation": {
    "valid": true,
    "missingClaims": [],
    "invalidClaims": []
  },
  "errors": []
}
```

### 6. Statistiques

**Endpoint:** `GET /stats`

**Description:** Retourne les statistiques du service de vérification.

**Response:**
```json
{
  "pending_requests": 5,
  "verification_responses": 12,
  "uptime_seconds": 3600,
  "endpoints": [
    "POST /request_object - Créer une request de présentation",
    "GET /request_object/:id - Récupérer une request",
    "POST /presentation - Vérifier une présentation",
    "GET /presentation/:id - Récupérer un résultat",
    "POST /verify - Vérifier une présentation avec requirements",
    "GET /stats - Statistiques"
  ]
}
```

## 🔍 Processus de Vérification Détaillé

### 1. Validation de la Signature JWT

La présentation est d'abord décodée et sa signature est vérifiée avec la clé publique RSA stockée dans le JWKS endpoint (`/.well-known/jwks.json`).

```javascript
// Vérification interne
verifyPresentation(vpToken) {
  // 1. Vérifier et décoder le JWT
  const vpPayload = jwt.verify(vpToken, publicKey, {
    algorithms: ['RS256']
  });
  
  // 2. Vérifier la structure
  if (vpPayload.vp.type !== 'VerifiablePresentation') {
    throw new Error('Invalid presentation structure');
  }
  
  // 3. Vérifier l'expiration
  if (vpPayload.exp < now) {
    throw new Error('Presentation has expired');
  }
  
  // 4. Vérifier chaque credential
  for (const credentialToken of vpPayload.vp.verifiableCredential) {
    verifyCredential(credentialToken);
  }
}
```

### 2. Validation des Claims

Si des requirements sont spécifiés, les claims des credentials sont vérifiés.

**Types de Validation:**

- **requiredClaims:** Vérifie que les claims requis existent dans les credentials
- **claimConstraints:** Vérifie que les claims ont une valeur spécifique

```javascript
validatePresentationClaims(vpPayload, requirements) {
  // Exemple: Vérifier que la nationalité est 'FR'
  const requirements = {
    requiredClaims: ['family_name', 'given_name'],
    claimConstraints: {
      nationality: 'FR',
      age_over_18: true
    }
  };
  
  // La validation échouera si:
  // - 'family_name' ou 'given_name' manque
  // - La nationalité n'est pas 'FR'
  // - L'âge n'est pas >= 18 ans
}
```

### 3. Stockage des Résultats

Les résultats de vérification sont stockés en mémoire avec une expiration de 1 heure.

```javascript
presentationResponses.set(responseId, {
  id: responseId,
  status: 'success',
  verified: true,
  presentation: vpPayload,
  credentials: [...],
  timestamp: new Date(),
  createdAt: Date.now(),
  expiredAt: Date.now() + (60 * 60 * 1000) // 1 heure
});
```

## 🧪 Cas d'Usage - Vérification EIDAS PID

### Scénario: Vérifier une PID EIDAS

**Étape 1: Créer une Request**
```bash
curl -X POST http://localhost:3000/request_object \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "http://localhost:3000",
    "redirect_uri": "http://localhost:3000/callback",
    "input_descriptors": [
      {
        "id": "pid-descriptor",
        "name": "EIDAS PID",
        "format": {
          "jwt_vc_json": {
            "alg": ["RS256"]
          }
        }
      }
    ]
  }'
```

**Étape 2: Wallet envoie la présentation**

Le wallet scanne le QR code et soumet la présentation:

```bash
curl -X POST http://localhost:3000/presentation \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
    "state": "abc123",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "requirements": {
      "requiredClaims": ["family_name", "given_name", "birth_date"],
      "claimConstraints": {
        "nationality": "FR"
      }
    }
  }'
```

**Étape 3: Obtenir le résultat**

```bash
curl http://localhost:3000/presentation/resp-123456
```

## 🛡️ Sécurité

### Éléments de Sécurité Implémentés

1. **Signature RSA 2048-bit:** Tous les tokens sont signés avec RS256
2. **JWKS Endpoint:** Les clés publiques sont disponibles pour validation
3. **State Parameter:** Protection CSRF avec state parameter
4. **Nonce:** Token anti-replay avec nonce unique
5. **TTL:** 
   - Request Objects: 10 minutes
   - Responses: 1 heure
6. **Expiration JWT:** Vérification de l'expiration dans les tokens

### Validations Effectuées

```javascript
// 1. Signature valide ✓
jwt.verify(vpToken, publicKey, { algorithms: ['RS256'] });

// 2. Structure correcte ✓
if (vpPayload.vp.type !== 'VerifiablePresentation') throw;

// 3. Pas expiré ✓
if (vpPayload.exp < now) throw;

// 4. État correct ✓
if (state !== requestObject.state) throw;

// 5. Credentials valides ✓
for (const cred of credentials) verifyCredential(cred);

// 6. Claims conformes ✓
validateRequiredClaims(credentials, requirements);
```

## 📊 Structure de Données

### Request Object

```json
{
  "request_id": "uuid",
  "client_id": "http://...",
  "redirect_uri": "http://...",
  "response_type": "vp_token",
  "presentation_definition": {
    "id": "...",
    "input_descriptors": [...]
  },
  "state": "random_state",
  "nonce": "random_nonce",
  "iat": 1706000000,
  "exp": 1706000600
}
```

### Verifiable Presentation

```json
{
  "iss": "http://localhost:3000",
  "aud": "http://localhost:3000",
  "iat": 1706000000,
  "exp": 1706086400,
  "jti": "uuid",
  "vp": {
    "@context": "https://www.w3.org/2018/credentials/v1",
    "type": "VerifiablePresentation",
    "verifiableCredential": [
      "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9..."
    ]
  }
}
```

### Verification Response

```json
{
  "id": "response-uuid",
  "status": "success",
  "verified": true,
  "presentation": { ... },
  "credentials": [
    {
      "valid": true,
      "credentialType": "eu.europa.ec.eudi.pid.1",
      "subject": "user-id",
      "iat": 1706000000,
      "exp": 1706086400
    }
  ],
  "timestamp": "2024-01-23T10:05:30Z"
}
```

## 🔄 Gestion de la Session

### Lifecycle des Objets

1. **Request Object Créé**
   - Stocké avec TTL de 10 minutes
   - Peut être récupéré via l'API
   - Auto-supprimé à l'expiration

2. **Présentation Reçue**
   - Validation complète effectuée
   - Résultat stocké avec TTL de 1 heure
   - Peut être récupéré pour audit

3. **Nettoyage Automatique**
   - Toutes les minutes
   - Suppression des objets expirés
   - Libération de mémoire

```javascript
cleanup() {
  const now = Math.floor(Date.now() / 1000);
  let cleaned = 0;

  // Nettoyer les requests expirées
  for (const [id, data] of this.requestObjects.entries()) {
    if (data.exp < now) {
      this.requestObjects.delete(id);
      cleaned++;
    }
  }

  // Nettoyer les réponses expirées
  for (const [id, data] of this.presentationResponses.entries()) {
    if (data.expiredAt < Date.now()) {
      this.presentationResponses.delete(id);
      cleaned++;
    }
  }
}
```

## 🎯 Intégration avec Wallets

### Workflow Wallet

1. **Wallet scanne QR code** contenant la Request Object URI
2. **Wallet récupère** la Request Object depuis `/request_object/:id`
3. **Utilisateur sélectionne** les credentials à présenter
4. **Wallet crée** une Verifiable Presentation
5. **Wallet envoie** la présentation à `/presentation`
6. **Application affiche** le résultat (accepté/rejeté)

### Exemple d'Intégration

```javascript
// Côté Wallet
async function submitPresentation(requestId) {
  // 1. Récupérer la request
  const request = await fetch(`/request_object/${requestId}`);
  
  // 2. Créer la présentation
  const vpToken = createPresentation(selectedCredentials);
  
  // 3. Envoyer la présentation
  const response = await fetch('/presentation', {
    method: 'POST',
    body: JSON.stringify({
      vp_token: vpToken,
      state: request.state,
      request_id: requestId
    })
  });
  
  // 4. Afficher le résultat
  if (response.ok) {
    showMessage('✅ Vérification réussie!');
  }
}
```

## 📱 Page de Test

Une page web interactive est disponible à `/verification.html` avec:

- ✅ Création de Request Objects
- ✅ Vérification de Présentations
- ✅ Validation de Claims
- ✅ Simulation du Workflow complet
- ✅ Statistiques en temps réel

## 🚀 Déploiement

### Configuration pour Production

```javascript
// config/index.js - À adapter
module.exports = {
  issuerUrl: process.env.ISSUER_URL || 'https://issuer.example.com',
  verifierUrl: process.env.VERIFIER_URL || 'https://verifier.example.com',
  walletUrl: process.env.WALLET_URL || 'https://wallet.example.com',
  baseUrl: process.env.BASE_URL || 'https://example.com',
  port: process.env.PORT || 3000,
};
```

### Points d'Attention

1. **Utiliser HTTPS** en production
2. **Clés RSA:** Générer des clés fortes et les sauvegarder de manière sécurisée
3. **Stockage:** Passer d'en-mémoire à une base de données
4. **Rate Limiting:** Ajouter une limitation des requêtes
5. **Logging:** Ajouter un logging complet pour audit
6. **CORS:** Limiter les origines autorisées

## 📚 Références

- [OpenID4VP Specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [JWT RFC 7519](https://tools.ietf.org/html/rfc7519)
- [EIDAS Regulation](https://eur-lex.europa.eu/legal-content/EN/TXT/?uri=CELEX:32014R0910)
