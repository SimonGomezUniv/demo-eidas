# 📱 Cinématique OpenID4VC avec QR Code

## Vue d'ensemble

Cette implémentation fournit une cinématique complète d'émission de credentials vérifiables (VC) conformément à la spécification OpenID4VC, avec support du QR code pour l'intégration avec des wallets EIDAS.

## Flux d'émission

```
┌─────────────────────────────────────────────────────────────────┐
│                    Utilisateur / Wallet                          │
└────────────────┬──────────────────────────────────────────────┘
                 │
    1. Scanne QR Code (authorization URL)
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  2. Wallet effectue Authorization Request                        │
│     /authorize?client_id=...&scope=custom_credential             │
└────────────────┬──────────────────────────────────────────────┘
                 │
    3. L'utilisateur s'authentifie
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  4. Credential Issuer génère le credential signé (JWT)           │
│     POST /credential { credential_type, credential_data }       │
└────────────────┬──────────────────────────────────────────────┘
                 │
    5. Credential est signé avec clé privée RSA
                 │
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│  6. Wallet reçoit le credential signé                            │
│     { credential: "eyJhbGc...", format: "jwt_vc_json" }          │
└────────────────┬──────────────────────────────────────────────┘
                 │
    7. Wallet valide la signature contre JWKS
                 │
                 ▼
        ✅ Credential stocké dans le wallet
```

## Pages et Routes

### Page d'Accueil
- **URL**: `http://localhost:3000/`
- **Description**: Dashboard principal avec liens vers les différentes fonctionnalités
- **Accès rapide**: Bouton vers cinématique d'émission

### Page d'Émission avec QR Code
- **URL**: `http://localhost:3000/issuance.html`
- **Description**: Interface complète pour tester l'émission de credentials avec QR code
- **Fonctionnalités**:
  - Sélection du type de credential
  - Configuration des données (Custom ou EIDAS PID)
  - Génération du QR code
  - Simulation du scannage par un wallet
  - Affichage du credential signé

## Points de terminaison API

### 1. Well-Known Endpoints (Découverte)

#### OpenID4VC Issuer Configuration
```
GET /.well-known/openid-credential-issuer
```

**Réponse**:
```json
{
  "credential_issuer": "http://localhost:3000",
  "credential_endpoint": "http://localhost:3000/credential",
  "credential_configurations_supported": {
    "custom_credential": {...},
    "eu.europa.ec.eudi.pid.1": {...}
  }
}
```

#### JWKS (Clés publiques)
```
GET /.well-known/jwks.json
```

**Réponse**: Clés publiques RSA pour valider les signatures JWT

### 2. Routes d'Émission OpenID4VC

#### Initier une Émission (nouveau)
```
POST /issuance/initiate
Content-Type: application/json

{
  "credential_type": "custom_credential" | "eu.europa.ec.eudi.pid.1",
  "credential_data": {
    // Données spécifiques du type
  },
  "wallet_url": "http://localhost:4000"  // Optionnel
}
```

**Réponse**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "initiated",
  "auth_url": "http://localhost:4000/authorize?...",
  "qr_code": "data:image/png;base64,iVBORw0K...",
  "credential_type": "custom_credential",
  "issuer": "http://localhost:3000",
  "authorization_endpoint": "http://localhost:3000/authorize",
  "credential_endpoint": "http://localhost:3000/credential",
  "expires_in": 600
}
```

#### Obtenir le Statut d'une Session
```
GET /issuance/session/{sessionId}
```

**Réponse**:
```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "pending" | "completed",
  "credential_type": "custom_credential",
  "created_at": "2026-01-23T12:00:00Z",
  "expires_at": "2026-01-23T12:10:00Z",
  "credential": "eyJhbGc..." // Non-null si completed
}
```

#### Callback après Autorisation
```
GET /issuance/callback?code={code}&state={state}
```

Le serveur traite l'autorisation et émet le credential

#### Récupérer le Credential
```
GET /issuance/credential/{sessionId}
```

**Réponse**:
```json
{
  "credential": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImtpZCI6ImtleS0xIn0...",
  "credential_format": "jwt_vc_json",
  "credential_type": "custom_credential"
}
```

### 3. Routes d'Émission Basiques

#### Émettre un Credential Unique
```
POST /credential
Content-Type: application/json

{
  "credential_type": "custom_credential",
  "subject": "user:test@example.com",
  "customData": "Mon identité numérique",
  "department": "Engineering",
  "role": "Developer"
}
```

#### Émettre Plusieurs Credentials (Batch)
```
POST /batch_credential
Content-Type: application/json

{
  "credentials": [
    { "credential_type": "custom_credential", "subject": "user1", ... },
    { "credential_type": "custom_credential", "subject": "user2", ... }
  ]
}
```

#### Vérifier un Credential
```
POST /verify_credential
Content-Type: application/json

{
  "credential": "eyJhbGc..."
}
```

## Types de Credentials Supportés

### 1. Custom Credential
Credential personnalisé avec champs libres

**Données requises**:
- `subject` (optionnel): Identifiant du sujet
- `customData`: Données personnalisées
- `department` (optionnel): Département
- `role` (optionnel): Rôle

**Exemple**:
```json
{
  "credential_type": "custom_credential",
  "subject": "user:john@company.com",
  "customData": "Developer ID",
  "department": "Engineering",
  "role": "Senior Developer"
}
```

### 2. EIDAS PID (Person Identification Data)
Credential conforme à la réglementation EIDAS

**Données requises**:
- `family_name`: Nom de famille
- `given_name`: Prénom
- `birth_date`: Date de naissance (YYYY-MM-DD)
- `age_over_18` (optionnel): Majeur
- `age_over_21` (optionnel): Plus de 21 ans
- `nationality` (optionnel): Code pays (ex: FR)

**Exemple**:
```json
{
  "credential_type": "eu.europa.ec.eudi.pid.1",
  "subject": "user:fr/person123",
  "family_name": "Dupont",
  "given_name": "Jean",
  "birth_date": "1990-01-15",
  "age_over_18": true,
  "age_over_21": true,
  "nationality": "FR"
}
```

## Structure du JWT Émis

Chaque credential est un JWT RS256 signé avec la structure suivante:

```json
{
  // Header
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-1"
}
.
{
  // Payload
  "iss": "http://localhost:3000",
  "sub": "user:example@domain.com",
  "aud": "http://localhost:4000",
  "iat": 1674415200,
  "exp": 1706038800,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  
  // Verifiable Credential Structure
  "vc": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
    ],
    "type": ["VerifiableCredential", "CustomCredential"],
    "name": "Custom Credential",
    "description": "Custom verifiable credential for demonstration purposes",
    "credentialSubject": {
      "id": "user:example@domain.com",
      "customData": "Données de test"
    }
  },
  
  "credential_type": "custom_credential"
}
.
[SIGNATURE]
```

## Validation des Credentials

### Valider une Signature JWT

1. **Récupérer les clés publiques**:
   ```
   GET /.well-known/jwks.json
   ```

2. **Vérifier la signature** avec l'algorithme RS256

3. **Valider les claims**:
   - `exp`: Le credential n'a pas expiré
   - `iss`: L'issuer est de confiance
   - `aud`: L'audience correspond

## Architecture Interne

### Gestionnaire de Clés (`lib/keyManager.js`)
- Génère les paires de clés RSA 2048-bit
- Persiste les clés sur disque (`/keys/`)
- Fournit les clés publiques au format JWKS

### Signataire de Credentials (`lib/credentialSigner.js`)
- Signe les credentials avec la clé privée
- Crée la structure Verifiable Credential W3C
- Génère les présentations vérifiables

### Routes d'Émission (`routes/openid4vcIssuance.js`)
- Gère les sessions d'émission
- Génère les QR codes
- Traite les callbacks d'autorisation

## Cinématique Complète de Test

### Via Interface Web
1. Accéder à `http://localhost:3000/issuance.html`
2. Choisir le type de credential
3. Remplir les données
4. Cliquer "Initier l'émission"
5. Scanner le QR code avec le wallet (ou simuler le scannage)
6. Le credential signé s'affiche dans l'interface

### Via API REST
```bash
# 1. Initier l'émission
curl -X POST http://localhost:3000/issuance/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "custom_credential",
    "credential_data": {
      "customData": "Test data"
    }
  }'

# 2. Récupérer le credential
curl -X GET http://localhost:3000/issuance/credential/{sessionId}
```

## Stockage des Sessions

Les sessions d'émission sont stockées en mémoire avec:
- **Durée de vie**: 10 minutes
- **Informations**: ID, état, type, données, statut
- **Nettoyage**: Automatique à l'expiration

## Sécurité

- ✅ Credentials signés RS256 (RSA-SHA256)
- ✅ Clés privées protégées sur le serveur
- ✅ Clés publiques disponibles via JWKS
- ✅ CORS activé pour l'intégration wallet
- ✅ Session avec timeout (10 minutes)
- ✅ State parameter pour prévenir CSRF

## À Améliorer en Production

- [ ] Persister les sessions en base de données
- [ ] Intégrer avec un système d'authentification réel
- [ ] Ajouter des logs d'audit
- [ ] Implémenter le refresh des credentials
- [ ] Support du back-channel communication
- [ ] Rate limiting sur les endpoints sensibles
- [ ] Chiffrement des données sensibles

## Références

- [OpenID4VC Issuance](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [Verifiable Credentials Data Model](https://www.w3.org/TR/vc-data-model/)
- [EIDAS Digital Wallet](https://github.com/eu-digital-identity-wallet)
