# OpenID4VP Implementation Guide

## Overview
La page `verification.html` permet maintenant de tester le workflow OpenID4VP complet avec un sélecteur de credentials et la génération d'un QR code qui peut être scanné par un wallet EIDAS pour présenter des credentials.

## Architecture

### Frontend (Client-Side)
- **verification.html**: Page HTML avec interface de sélection de credentials
- **verification.js**: Logique JavaScript pour gérer le workflow
- **verification.css**: Styles CSS adapté de issuance.css

### Backend (Server-Side)
- **routes/openid4vpVerification.js**: Nouvelles routes pour le workflow OpenID4VP
- **app.js**: Intégration de `OpenID4VPVerificationRouter`

## Workflow

### 1. Sélection du Credential
L'utilisateur choisit le type de credential à vérifier:
- `custom_credential`: Credential personnalisé
- `eu.europa.ec.eudi.pid.1`: EIDAS PID (Person ID)

### 2. Génération du QR Code
Quand l'utilisateur clique sur "Initier la vérification":
1. Le frontend appelle `POST /verification/initiate-presentation`
2. Le backend génère:
   - Une session de vérification unique (UUID)
   - Une `presentation_request` conforme à la spec OpenID4VP
   - Un QR code avec l'URL du wallet
3. Le frontend affiche le QR code et la session ID

### 3. Présentation du Credential par le Wallet
L'utilisateur scanne le QR code avec son wallet EIDAS:
1. Le wallet récupère la `presentation_request` depuis `GET /presentation-request/:sessionId`
2. L'utilisateur sélectionne et accepte la présentation
3. Le wallet envoie le `vp_token` à `POST /presentation-callback`

### 4. Vérification et Affichage des Résultats
1. Le backend vérifie le `vp_token` reçu
2. Met à jour le statut de la session
3. Le frontend poll le statut via `GET /verification/presentation-status/:sessionId`
4. Une fois reçue, le frontend affiche les résultats via `GET /verification/presentation-result/:sessionId`

## Routes API

### POST /verification/initiate-presentation
Initie une session de vérification et génère le QR code.

**Request:**
```json
{
  "credential_type": "custom_credential"
}
```

**Response:**
```json
{
  "session_id": "uuid",
  "status": "pending",
  "qr_content": "http://wallet.url?presentation_request_uri=...",
  "qr_code": "data:image/png;base64,...",
  "credential_type": "custom_credential",
  "verifier": "http://localhost:3000",
  "expires_in": 600
}
```

### GET /presentation-request/:sessionId
Retourne la présentation request pour un session ID donné.

**Response:**
```json
{
  "client_id": "http://localhost:3000",
  "redirect_uri": "http://localhost:3000/presentation-callback",
  "response_type": "vp_token id_token",
  "presentation_definition": { ... },
  "state": "uuid",
  "nonce": "uuid"
}
```

### POST /presentation-callback
Reçoit la présentation du wallet.

**Request:**
```json
{
  "vp_token": "eyJhbGc...",
  "presentation_submission": { ... },
  "state": "uuid"
}
```

**Response:**
```json
{
  "status": "completed",
  "message": "Présentation vérifiée avec succès"
}
```

### GET /verification/presentation-status/:sessionId
Vérifie le statut d'une session de vérification.

**Response:**
```json
{
  "session_id": "uuid",
  "status": "pending|completed|failed",
  "credential_type": "custom_credential",
  "created_at": "2024-01-27T...",
  "completed_at": "2024-01-27T..." 
}
```

### GET /verification/presentation-result/:sessionId
Retourne les résultats de la vérification.

**Response:**
```json
{
  "session_id": "uuid",
  "status": "completed",
  "valid": true,
  "vp_token": "eyJhbGc...",
  "claims": { ... },
  "presentation_info": {
    "holder": "user:uuid",
    "issuer": "http://localhost:3000",
    "credential_type": "custom_credential",
    "issued_at": "2024-01-27T...",
    "expires_at": "2025-01-27T..."
  }
}
```

## Configuration Requise

### Variables d'environnement (.env)
```
PORT=3000
BASE_URL=http://localhost:3000
ISSUER_URL=http://localhost:3000
WALLET_URL=http://smn.gmz:4000
JWT_SECRET=your-super-secret-key-change-in-production
DID=did:example:issuer123
```

- `BASE_URL`: URL du serveur (utilisée pour générer les URIs)
- `WALLET_URL`: URL du wallet EIDAS (utilisée pour générer le QR code)

## Flux d'Utilisation

1. Accédez à `http://localhost:3000/verification.html`
2. Sélectionnez le type de credential à vérifier
3. Cliquez sur "Initier la vérification"
4. Scannez le QR code avec votre wallet EIDAS
5. Acceptez la demande de présentation dans le wallet
6. Les résultats s'affichent automatiquement

## Structure des Sessions

Les sessions de vérification sont stockées en mémoire et contiennent:
- `id`: UUID de la session
- `credential_type`: Type de credential demandé
- `presentation_request`: La demande de présentation
- `wallet_url`: URL du wallet
- `status`: État de la session (pending, completed, failed)
- `vp_token`: Token de présentation reçu (une fois complété)
- `expires_at`: Expiration de la session (10 minutes par défaut)

## Expiration des Sessions

Les sessions expirent après 10 minutes. Le frontend doit relancer une nouvelle session après cette durée.

## Vérification des Credentials

La vérification utilise la méthode `verifyCredential()` de `CredentialSigner`:
1. Valide la signature JWT du credential
2. Vérifie les claims présents dans le credential
3. Retourne les informations extraites du credential

## Notes d'Implémentation

- Les sessions sont stockées en mémoire (à adapter pour une production avec DB)
- Les QR codes sont générés côté serveur et retournés en base64
- Le polling côté client utilise un intervalle de 2 secondes
- Les URLs dans les QR codes utilisent les valeurs du .env pour la flexibilité

## Prochaines Étapes (Optionnel)

- Ajouter une base de données pour persister les sessions
- Implémenter une validité plus longue des sessions
- Ajouter des logs plus détaillés pour le débogage
- Implémenter le support du `aud_tokens` pour plusieurs audiences
- Ajouter une interface d'administration pour voir l'historique des vérifications
