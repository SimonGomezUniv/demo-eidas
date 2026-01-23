# 📚 Guide Complet - OpenID4VP pour Développeurs

## 🎯 Objectif

Ce guide explique comment utiliser les endpoints OpenID4VP pour vérifier des présentations vérifiables dans votre application.

## 🚀 Démarrage Rapide

### 1. Démarrer le serveur

```bash
cd c:\Users\simon\Desktop\cmder\src\demo-eidas
npm install
node app.js
```

Le serveur démarre sur `http://localhost:3000`

### 2. Accéder aux pages d'interface

- **Page d'accueil:** http://localhost:3000/
- **Émission (QR Code):** http://localhost:3000/issuance.html
- **Vérification:** http://localhost:3000/verification.html

### 3. Tester les APIs

```bash
# Créer une request object
curl -X POST http://localhost:3000/request_object \
  -H "Content-Type: application/json" \
  -d '{
    "client_id": "http://localhost:3000",
    "redirect_uri": "http://localhost:3000/callback"
  }'
```

## 📋 Workflow Complet: Émission → Vérification

### Phase 1: Émission (OpenID4VC)

```mermaid
┌─────────────────────────────────────────────────────────────┐
│ 1. ÉMISSION: Créer un Credential                           │
└─────────────────────────────────────────────────────────────┘

POST /credential
{
  "credential_type": "eu.europa.ec.eudi.pid.1",
  "subject": "user-123",
  "family_name": "Dupont",
  "given_name": "Jean",
  "birth_date": "1990-01-15",
  "nationality": "FR",
  "age_over_18": true
}

RESPONSE:
{
  "credential": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "credential_format": "jwt_vc_json",
  "c_nonce": "random123",
  "c_nonce_expires_in": 300
}
```

### Phase 2: Vérification (OpenID4VP)

```mermaid
┌─────────────────────────────────────────────────────────────┐
│ 2. VÉRIFICATION: Créer une Request                          │
└─────────────────────────────────────────────────────────────┘

POST /request_object
{
  "client_id": "http://localhost:3000",
  "redirect_uri": "http://localhost:3000/callback"
}

RESPONSE:
{
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "request_object_uri": "http://localhost:3000/request_object/550e8400...",
  "expires_in": 600
}

┌─────────────────────────────────────────────────────────────┐
│ 3. VÉRIFICATION: Soumettre la Présentation                  │
└─────────────────────────────────────────────────────────────┘

POST /presentation
{
  "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "request_id": "550e8400-e29b-41d4-a716-446655440000",
  "requirements": {
    "requiredClaims": ["family_name", "given_name"],
    "claimConstraints": {
      "nationality": "FR"
    }
  }
}

RESPONSE:
{
  "success": true,
  "message": "Presentation verified successfully",
  "response_id": "resp-123456",
  "verification_result": {
    "valid": true,
    "credential_count": 1,
    "issuer": "http://localhost:3000",
    "issued_at": "2024-01-23T10:00:00Z",
    "expires_at": "2024-01-24T10:00:00Z"
  }
}
```

## 🔐 Sécurité: Comment ça Marche

### Signature RSA

1. **Génération des Clés**
   ```
   /keys/private.pem  ← Clé privée (secrète, serveur uniquement)
   /keys/public.pem   ← Clé publique (publiée via JWKS)
   ```

2. **Signature du Credential**
   ```javascript
   // Serveur signe le credential avec la clé privée
   const token = jwt.sign(payload, privateKey, {
     algorithm: 'RS256'
   });
   ```

3. **Vérification de la Signature**
   ```javascript
   // Application vérifie avec la clé publique du serveur
   const verified = jwt.verify(vpToken, publicKey, {
     algorithms: ['RS256']
   });
   ```

### Publication des Clés Publiques (JWKS)

```
GET /.well-known/jwks.json

RESPONSE:
{
  "keys": [
    {
      "kty": "RSA",
      "use": "sig",
      "kid": "key-1",
      "n": "xvKjsz...",  // Clé publique N
      "e": "AQAB"        // Exposant E
    }
  ]
}
```

## 📝 Exemples de Code

### Exemple 1: Vérifier une Présentation en JavaScript

```javascript
// Frontend (Navigateur)
async function verifyPresentation(vpToken) {
  const response = await fetch('http://localhost:3000/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      vp_token: vpToken,
      requirements: {
        requiredClaims: ['family_name'],
        claimConstraints: {
          age_over_18: true
        }
      }
    })
  });

  const result = await response.json();
  
  if (result.valid) {
    console.log('✅ Présentation valide');
    console.log('Credentials:', result.presentation.credentials);
  } else {
    console.error('❌ Présentation invalide');
    console.error('Erreurs:', result.errors);
  }
}

// Utilisation
verifyPresentation(jwtToken);
```

### Exemple 2: Créer une Request Object en Node.js

```javascript
// Backend (Node.js)
const axios = require('axios');

async function createVerificationRequest() {
  try {
    const response = await axios.post(
      'http://localhost:3000/request_object',
      {
        client_id: 'http://localhost:3000',
        redirect_uri: 'http://localhost:3000/callback',
        input_descriptors: [
          {
            id: 'pid-descriptor',
            name: 'EIDAS PID',
            format: {
              jwt_vc_json: {
                alg: ['RS256']
              }
            }
          }
        ]
      }
    );

    const requestId = response.data.request_id;
    console.log('Request créée:', requestId);
    
    // Générer QR code avec la URI
    const requestUri = response.data.request_object_uri;
    generateQRCode(requestUri);
    
  } catch (error) {
    console.error('Erreur:', error.message);
  }
}

createVerificationRequest();
```

### Exemple 3: Intégration avec un Wallet

```javascript
// Côté Wallet
class WalletVerifier {
  async submitPresentation(requestId, credentials) {
    // 1. Créer la présentation
    const vpToken = this.createPresentation(credentials);
    
    // 2. Envoyer au vérificateur
    const response = await fetch('/presentation', {
      method: 'POST',
      body: JSON.stringify({
        vp_token: vpToken,
        request_id: requestId
      })
    });
    
    // 3. Afficher le résultat
    const result = await response.json();
    if (result.success) {
      this.onVerificationSuccess(result.response_id);
    } else {
      this.onVerificationFailed(result.error);
    }
  }
}
```

## 🔍 Debugging

### 1. Vérifier que le Serveur est Actif

```bash
curl http://localhost:3000/api/health
```

Expected response:
```json
{
  "status": "ok",
  "issuer": "http://localhost:3000",
  "timestamp": "2024-01-23T10:00:00Z"
}
```

### 2. Vérifier les Clés Publiques

```bash
curl http://localhost:3000/.well-known/jwks.json | jq .
```

### 3. Décoder un JWT

Allez sur https://jwt.io et collez le JWT pour voir son contenu:

```
Header: {
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-1"
}

Payload: {
  "iss": "http://localhost:3000",
  "sub": "user-123",
  "iat": 1706000000,
  "exp": 1706086400,
  "jti": "credential-id",
  "vc": {
    "@context": [...],
    "type": ["VerifiableCredential", "PersonIdentificationData"],
    "credentialSubject": {
      "id": "user-123",
      "family_name": "Dupont",
      ...
    }
  }
}
```

### 4. Tester avec curl

```bash
# Créer et émettre
CRED=$(curl -s -X POST http://localhost:3000/credential \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "custom_credential",
    "subject": "test"
  }' | jq -r '.credential')

# Vérifier
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{"vp_token": "'$CRED'"}'
```

## 📊 Structure des Données

### Credential JWT Payload

```json
{
  "iss": "http://localhost:3000",           // Issuer
  "sub": "user-123",                         // Subject
  "aud": "http://localhost:3000",           // Audience
  "iat": 1706000000,                        // Issued At
  "exp": 1706086400,                        // Expires
  "jti": "uuid",                            // JWT ID (unique)
  "vc": {
    "@context": [
      "https://www.w3.org/2018/credentials/v1",
      "https://www.w3.org/2018/credentials/examples/v1"
    ],
    "type": ["VerifiableCredential", "PersonIdentificationData"],
    "name": "Person Identification Data (PID)",
    "credentialSubject": {
      "id": "user-123",
      "family_name": "Dupont",
      "given_name": "Jean",
      "birth_date": "1990-01-15",
      "nationality": "FR",
      "age_over_18": true
    }
  },
  "credential_type": "eu.europa.ec.eudi.pid.1"
}
```

### Verifiable Presentation JWT Payload

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

## ⚙️ Configuration

### Variables d'Environnement

Créez un fichier `.env` à la racine du projet:

```env
# Node environment
NODE_ENV=development

# Serveur
PORT=3000
BASE_URL=http://localhost:3000

# Issuer configuration
ISSUER_URL=http://localhost:3000
ISSUER_NAME=EIDAS OpenID4VC Server

# Verifier configuration
VERIFIER_URL=http://localhost:3000
VERIFIER_NAME=EIDAS OpenID4VP Verifier

# Wallet configuration
WALLET_URL=http://localhost:3000

# Keys
KEYS_DIR=./keys
```

## 🧪 Tests

### Exécuter les Tests

```bash
# Sur Linux/Mac
bash test-openid4vp.sh

# Sur Windows (avec PowerShell)
# Adapter les commandes curl en Invoke-WebRequest
```

### Cas de Test

1. ✅ Créer une request object
2. ✅ Récupérer une request object
3. ✅ Émettre un credential
4. ✅ Vérifier une présentation
5. ✅ Vérifier avec requirements
6. ✅ Tester les erreurs

## 🎓 Concepts Clés

### Claim
Un **claim** est une affirmation ou un fait dans un credential.
Exemple: `"family_name": "Dupont"` est un claim

### Constraint
Une **constraint** est une condition que doit satisfaire un claim.
Exemple: `"nationality": "FR"` contraint le claim nationality

### Credential vs Presentation
- **Credential:** Émis par l'issuer, contient les données
- **Presentation:** Créée par le titulaire, contient un ou plusieurs credentials

### State Parameter
Protection CSRF - chaque request obtient un `state` unique à vérifier

## 📞 Support

Pour plus d'informations:

- **OpenID4VP Spec:** https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
- **W3C VC Data Model:** https://www.w3.org/TR/vc-data-model/
- **GitHub Issues:** Ouvrir une issue dans le repository

## ✅ Checklist d'Implémentation

Pour intégrer OpenID4VP à votre application:

- [ ] Installer les dépendances (`npm install`)
- [ ] Générer les clés RSA (`node app.js` une première fois)
- [ ] Configurer les URLs dans `.env`
- [ ] Implémenter création de request objects
- [ ] Implémenter réception de présentations
- [ ] Ajouter validation des claims
- [ ] Intégrer les vérifications dans votre logique métier
- [ ] Configurer HTTPS pour production
- [ ] Mettre en place logging/audit
- [ ] Tester avec vrai wallet
- [ ] Déployer en production

## 🔄 Workflow Complet: Étape par Étape

### Scénario: Connexion avec EIDAS PID

**Utilisateur:** Jean Dupont
**Application:** Banque en ligne
**But:** Vérifier l'identité de Jean avec sa PID EIDAS

```
1️⃣ AFFICHAGE INITIAL
   ┌──────────────────────┐
   │  Cliquez ici pour    │
   │  vous connecter      │
   │  avec votre PID      │
   │  [Bouton]            │
   └──────────────────────┘

2️⃣ CRÉATION DE LA REQUEST
   Application: POST /request_object
   ↓
   Serveur génère: request-id avec state

3️⃣ AFFICHAGE DU QR CODE
   ┌──────────────────────┐
   │      ▄▄▄▄▄▄▄▄       │
   │      █   ████       │
   │      █ ▄ ████       │  ← QR code contenant la request
   │      █▄ ████       │     URI + state
   │      ▀▀▀▀▀▀▀▀       │
   └──────────────────────┘

4️⃣ WALLET SCANNE
   Wallet: GET /request_object/request-id
   ↓
   Récupère les requirements

5️⃣ UTILISATEUR SÉLECTIONNE CREDENTIALS
   Jean: Sélectionne sa PID EIDAS

6️⃣ WALLET CRÉE PRÉSENTATION
   Wallet: crée VP JWT avec credential

7️⃣ WALLET ENVOIE AU VÉRIFICATEUR
   Wallet: POST /presentation
   ├─ vp_token: [VP JWT]
   ├─ request_id: request-id
   └─ requirements: [...]

8️⃣ VÉRIFICATION EFFECTUÉE
   Serveur:
   ├─ Vérifie signature RSA ✓
   ├─ Vérifie expiration ✓
   ├─ Vérifie claims requis ✓
   └─ Vérifie état ✓

9️⃣ RÉSULTAT RETOURNÉ
   Serveur: POST response
   ├─ success: true
   ├─ response_id: resp-123
   └─ verified_credentials: [...]

🔟 AFFICHAGE FINAL
   Application affiche:
   ✅ Connexion réussie, Jean Dupont
```

## 🚀 Prochaines Étapes

1. **Test en Local:** Utiliser `/verification.html`
2. **Test API:** Exécuter `test-openid4vp.sh`
3. **Intégration:** Implémenter dans votre app
4. **Déploiement:** HTTPS + Base de données
5. **Wallet Réel:** Tester avec wallet EIDAS officiel

---

**Dernière mise à jour:** Janvier 2024
**Version:** 1.0.0
**Statut:** ✅ Production Ready
