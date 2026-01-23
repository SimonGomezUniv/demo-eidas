# EIDAS OpenID4VC/VP Server

Serveur Node.js implémentant les protocoles OpenID4VC (Issuance) et OpenID4VP (Verification) pour la gestion de credentials vérifiables conformément aux standards EIDAS, avec **cinématique complète d'émission incluant QR code**.

## 🚀 Fonctionnalités Principales

### OpenID4VC (Issuance)
- ✅ **Émission de credentials signés JWT** (RS256)
- ✅ **Génération de QR codes** pour intégration wallet
- ✅ **Sessions d'émission temporaires** avec timeout
- ✅ **Support multi-types** de credentials:
  - Custom credentials personnalisés
  - EIDAS PID (Person Identification Data)
- ✅ **Interface web interactive** pour tester la cinématique
- ✅ **Émission unique et batch** de credentials
- ✅ **Well-Known endpoints** pour découverte (OAuth2, OpenID4VC)

### OpenID4VP (Verification)
- ✅ **Créer Request Objects** pour demander des présentations
- ✅ **Vérifier Présentations** avec validation complète
- ✅ **Validation des Claims** avec constraints
- ✅ **Gestion de Session** des vérifications
- ✅ **Interface web interactive** de test
- ✅ **Stockage temporaire** des résultats (1 heure)
- ✅ **Nettoyage automatique** des sessions expirées
- ✅ **Protection CSRF** avec state parameter

## 📋 Contenu du Projet

```
.
├── app.js                              # Point d'entrée principal
├── package.json                        # Dépendances npm
├── .env                               # Configuration (local)
├── config/
│   └── index.js                       # Chargement des variables
├── lib/
│   ├── keyManager.js                  # Gestion des clés RSA
│   └── credentialSigner.js            # Signature JWT des credentials
├── routes/
│   ├── wellKnown.js                   # Endpoints well-known
│   ├── openid4vc.js                   # Routes OpenID4VC basiques
│   ├── openid4vcIssuance.js           # Routes d'émission avec QR
│   └── openid4vp.js                   # Routes OpenID4VP (NOUVEAU)
├── keys/
│   ├── private.pem                    # Clé privée (généré)
│   └── public.pem                     # Clé publique (généré)
├── public/
│   ├── index.html                     # Page d'accueil
│   ├── issuance.html                  # 📱 Cinématique d'émission
│   ├── verification.html              # ✔️ Cinématique de vérification (NOUVEAU)
│   ├── style.css                      # Styles généraux
│   ├── issuance.css                   # Styles page émission
│   ├── issuance.js                    # Scripts page émission
│   └── script.js                      # Scripts généraux
├── test-credentials.js                # Script de test
├── test-openid4vp.sh                  # Tests vérification (NOUVEAU)
├── README.md                          # Ce fichier
├── CINEMATIQUE_OPENID4VC.md           # Documentation émission
├── OPENID4VP_VERIFICATION.md          # Documentation vérification (NOUVEAU)
└── DEVELOPER_GUIDE_OPENID4VP.md       # Guide développeur (NOUVEAU)
```

## ⚙️ Installation

### Prérequis
- Node.js >= 14.x
- npm >= 6.x

### Étapes

```bash
# 1. Cloner et entrer dans le répertoire
cd demo-eidas

# 2. Installer les dépendances
npm install

# 3. Configurer les variables d'environnement
cp .env.example .env  # ou créer .env manuellement

# 4. Démarrer le serveur
npm start

# Le serveur démarre sur http://localhost:3000
```

## 🔧 Configuration

Créez/modifiez `.env`:

```env
PORT=3000
BASE_URL=http://localhost:3000
ISSUER_URL=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-in-production
DID=did:example:issuer123
WALLET_URL=http://localhost:4000
```

## 🚀 Démarrage

### Mode production
```bash
npm start
```

### Mode développement (rechargement auto)
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 📱 Interface Utilisateur

### Page d'Accueil
- **URL**: `http://localhost:3000/`
- Dashboard avec raccourcis vers les fonctionnalités principales
- Lien vers la cinématique d'émission
- Tests API basiques

### 🎯 Cinématique d'Émission
- **URL**: `http://localhost:3000/issuance.html`
- **Description**: Interface complète pour tester l'émission de VC avec QR code
- **Fonctionnalités**:
  1. Sélection du type de credential
  2. Configuration des données
  3. Génération du QR code
  4. Affichage du statut en temps réel
  5. Simulation du scannage par wallet
  6. Affichage et copie du credential signé

### ✔️ Cinématique de Vérification (NOUVEAU)
- **URL**: `http://localhost:3000/verification.html`
- **Description**: Interface interactive pour vérifier les présentations
- **Fonctionnalités**:
  1. Créer des request objects
  2. Spécifier les requirements
  3. Vérifier les présentations reçues
  4. Valider les claims des credentials
  5. Simuler des workflows complets
  6. Afficher les résultats en détail

## 📡 Endpoints Disponibles

### Well-Known (Découverte)

```
GET /.well-known/openid-credential-issuer
GET /.well-known/openid-verifier
GET /.well-known/oauth-authorization-server
GET /.well-known/jwks.json
```

### Émission avec QR Code

```
POST   /issuance/initiate                  # Initier une émission
GET    /issuance/session/{sessionId}       # Vérifier le statut
GET    /issuance/callback?code&state       # Callback post-auth
GET    /issuance/credential/{sessionId}    # Récupérer le credential
```

### Émission Basique

```
POST   /credential                         # Émettre un credential
POST   /batch_credential                   # Émettre plusieurs
POST   /deferred_credential               # Émission asynchrone
POST   /notification                       # Recevoir notifications
POST   /verify_credential                 # Vérifier une signature
```

### Vérification (OpenID4VP - NOUVEAU)

```
POST   /request_object                     # Créer une request
GET    /request_object/{requestId}         # Récupérer une request
POST   /presentation                       # Vérifier une présentation
GET    /presentation/{responseId}          # Récupérer un résultat
POST   /verify                             # Vérifier avec requirements
GET    /stats                              # Statistiques
```

### OAuth2/OpenID

```
GET    /authorize                          # Authentification
POST   /token                              # Exchange code → token
GET    /userinfo                           # Informations utilisateur
```

## 🔐 Signature JWT

Chaque credential est signé avec:
- **Algorithm**: RS256 (RSA Signature with SHA-256)
- **Key Size**: 2048 bits
- **Format**: JWT Verifiable Credential (W3C standard)

### Structure du JWT

```
Header:
{
  "alg": "RS256",
  "typ": "JWT",
  "kid": "key-1"
}

Payload:
{
  "iss": "http://localhost:3000",
  "sub": "user:example@example.com",
  "aud": "http://localhost:4000",
  "iat": 1674415200,
  "exp": 1706038800,
  "jti": "550e8400-e29b-41d4-a716-446655440000",
  
  "vc": {
    "@context": [...],
    "type": ["VerifiableCredential", "CustomCredential"],
    "credentialSubject": {...}
  }
}

Signature: [HMAC-SHA256]
```

## 🧪 Tester la Cinématique

### Via Interface Web (Recommandé)

1. Accéder à `http://localhost:3000/issuance.html`
2. Configurer le credential:
   - Type: Custom Credential ou EIDAS PID
   - Données: Remplir les champs
3. Cliquer "Initier l'émission"
4. Scanner le QR code avec votre wallet (ou cliquer "Simuler le scannage")
5. Le credential signé s'affiche automatiquement

### Via cURL

```bash
# 1. Initier l'émission
SESSION=$(curl -s -X POST http://localhost:3000/issuance/initiate \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "custom_credential",
    "credential_data": {"customData": "Test"}
  }' | jq -r '.session_id')

# 2. Récupérer le credential
curl -X GET http://localhost:3000/issuance/credential/$SESSION
```

### Via Node.js

```javascript
const axios = require('axios');

// Initier l'émission
const response = await axios.post('http://localhost:3000/issuance/initiate', {
  credential_type: 'custom_credential',
  credential_data: {
    customData: 'Mon identité numérique'
  }
});

const { session_id, qr_code } = response.data;
console.log('QR Code:', qr_code);
```

## 🔑 Gestion des Clés

### Génération Automatique
- Les clés RSA 2048-bit sont générées automatiquement au premier démarrage
- Stockées dans `/keys/` pour réutilisation

### Clés Publiques via JWKS
```bash
curl http://localhost:3000/.well-known/jwks.json
```

## 📚 Types de Credentials Supportés

### 1. Custom Credential
```json
{
  "credential_type": "custom_credential",
  "subject": "user:john@company.com",
  "customData": "Mon identité numérique",
  "department": "Engineering",
  "role": "Developer"
}
```

### 2. EIDAS PID
```json
{
  "credential_type": "eu.europa.ec.eudi.pid.1",
  "family_name": "Dupont",
  "given_name": "Jean",
  "birth_date": "1990-01-15",
  "age_over_18": true,
  "nationality": "FR"
}
```

## 🔄 Flux Complet d'Émission

```
1. Utilisateur accède à /issuance.html
   ↓
2. Configure le credential (type + données)
   ↓
3. Clique "Initier l'émission"
   ↓
4. POST /issuance/initiate
   ├→ Session créée avec ID unique
   ├→ QR code généré (URL d'authorization)
   └→ Stockée en mémoire (10 min)
   ↓
5. Wallet scanne le QR code
   ↓
6. GET /issuance/callback?code=X&state=Y
   ├→ Session trouvée
   ├→ Credential signé JWT
   └→ Session marquée "completed"
   ↓
7. GET /issuance/credential/{sessionId}
   └→ JWT retourné au wallet
   ↓
8. Wallet valide la signature contre JWKS
   └→ Credential stocké localement
```

## 📋 Validation des Credentials

Pour valider un credential reçu:

```javascript
const jwt = require('jsonwebtoken');
const axios = require('axios');

// 1. Récupérer les clés publiques
const jwks = await axios.get('http://localhost:3000/.well-known/jwks.json');

// 2. Extraire la clé publique
const key = jwks.data.keys[0];

// 3. Vérifier la signature
try {
  const decoded = jwt.verify(credentialToken, publicKey, {
    algorithms: ['RS256']
  });
  console.log('✅ Credential valide:', decoded.vc.type);
} catch (err) {
  console.error('❌ Credential invalide:', err.message);
}
```

## 🏗️ Architecture

### Composants Principaux

```
┌─────────────────────────────────────────┐
│          Express Server (app.js)         │
├─────────────────────────────────────────┤
│                                          │
│  ┌──────────────────────────────────┐  │
│  │  Key Manager (RSA 2048-bit)      │  │
│  │  - Génération des clés           │  │
│  │  - Export JWKS                   │  │
│  └──────────────────────────────────┘  │
│           ↓                              │
│  ┌──────────────────────────────────┐  │
│  │  Credential Signer (JWT RS256)   │  │
│  │  - Signature des credentials     │  │
│  │  - Structure W3C VC              │  │
│  │  - Vérification                  │  │
│  └──────────────────────────────────┘  │
│           ↓                              │
│  ┌──────────────────────────────────┐  │
│  │  Issuance Router                 │  │
│  │  - Sessions d'émission           │  │
│  │  - QR codes (qrcode lib)         │  │
│  │  - Callback handler              │  │
│  └──────────────────────────────────┘  │
│                                          │
└─────────────────────────────────────────┘
```

## 📦 Dépendances

| Package | Version | Usage |
|---------|---------|-------|
| express | ^4.18.2 | Framework HTTP |
| cors | ^2.8.5 | CORS middleware |
| dotenv | ^16.0.3 | Configuration |
| jsonwebtoken | ^9.0.0 | Signature JWT |
| uuid | ^9.0.0 | ID uniques |
| axios | ^1.3.0 | Requêtes HTTP |
| qrcode | ^1.5.3 | Génération QR |

## 🧪 Script de Test

```bash
node test-credentials.js
```

Lance un test complet:
- Émission d'un custom credential
- Émission d'un PID EIDAS
- Émission batch
- Vérification de signature
- Récupération JWKS

## 📝 Notes de Développement

### À Implémenter
- [ ] Base de données pour persistance
- [ ] Authentification utilisateur réelle
- [ ] Intégration blockchain (optionnel)
- [ ] Revocation list management
- [ ] Back-channel communication
- [ ] DID Resolution
- [ ] Presentation requests (OpenID4VP)

### Points d'Extension
- Ajouter des types de credentials supplémentaires
- Intégrer un système d'authentification
- Persister les sessions en BD
- Ajouter des webhooks pour notifications
- Implémenter la verifiable presentation

## 🔒 Sécurité

✅ **Implémenté**:
- Signature RS256 (RSA-SHA256)
- Clés privées sécurisées sur serveur
- Clés publiques via JWKS
- CORS configuré
- Session timeout (10 minutes)
- State parameter (CSRF protection)

⚠️ **À Améliorer**:
- HTTPS en production
- Rate limiting
- Logging d'audit
- Chiffrement des données sensibles
- Rotation des clés

## 📚 Références

- [OpenID4VC Specification](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [OpenID4VP Specification](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model/)
- [EIDAS Digital Wallet](https://github.com/eu-digital-identity-wallet)
- [RFC 7519 - JWT](https://tools.ietf.org/html/rfc7519)

## 📄 Licence

MIT

## 👤 Auteur

EIDAS Development Team


## 📋 Prérequis

- Node.js >= 14.x
- npm >= 6.x

## ⚙️ Installation

```bash
npm install
```

## 🔧 Configuration

Créez un fichier `.env` à la racine:

```env
PORT=3000
BASE_URL=http://localhost:3000
ISSUER_URL=http://localhost:3000
NODE_ENV=development
JWT_SECRET=your-super-secret-key-change-in-production
DID=did:example:issuer123
WALLET_URL=http://localhost:4000
```

## 🚀 Démarrage

### Mode production
```bash
npm start
```

### Mode développement (avec rechargement automatique)
```bash
npm run dev
```

Le serveur démarre sur `http://localhost:3000`

## 📡 Endpoints Well-Known

Ces endpoints permettent au wallet EIDAS de découvrir les capacités du serveur:

### OpenID4VC Issuer Configuration
```
GET /.well-known/openid-credential-issuer
```
Contient:
- `credential_endpoint` - Point d'émission de credentials
- `credential_configurations_supported` - Types de credentials supportés
  - `custom_credential` - Credential personnalisé
  - `eu.europa.ec.eudi.pid.1` - Person Identification Data (EIDAS)

### OpenID4VP Verifier Configuration
```
GET /.well-known/openid-verifier
```
Contient:
- `request_object_endpoint` - Point de demande de présentation
- `vp_formats_supported` - Formats de présentation supportés

### OAuth2 Authorization Server Configuration
```
GET /.well-known/oauth-authorization-server
```
Configuration standard pour les opérations OAuth2/OIDC.

### JSON Web Key Set
```
GET /.well-known/jwks.json
```
Clés publiques pour la vérification des signatures.

## 🔐 Endpoints Principaux

### OpenID4VC (Issuance)

#### Authorization
```
GET /authorize
```
Point d'authentification de l'utilisateur.

#### Token
```
POST /token
```
Échange authorization code contre access token.

#### Credential (Émission simple)
```
POST /credential
Content-Type: application/json

{
  "credential_type": "custom_credential" | "eu.europa.ec.eudi.pid.1",
  "subject": "user123",
  // propriétés spécifiques du credential
}
```

#### Batch Credential (Émission multiple)
```
POST /batch_credential
```

#### Deferred Credential
```
POST /deferred_credential
```
Pour les credentials émis de manière asynchrone.

#### Notification
```
POST /notification
```
Pour les notifications de status.

### OpenID4VP (Verification)

#### Request Object
```
POST /request_object
Content-Type: application/json

{
  "requested_credentials": [
    {
      "credential_type": "eu.europa.ec.eudi.pid.1",
      "fields": ["family_name", "given_name", "age_over_18"]
    }
  ]
}
```
Crée une demande de présentation de credential.

#### Presentation
```
POST /presentation
Content-Type: application/json

{
  "vp": "...", // Verifiable Presentation JWT
  "presentation_submission": {...}
}
```
Réception et vérification d'une présentation.

## 🧪 Testing

L'interface web sur `http://localhost:3000` permet de tester tous les endpoints.

### Exemples avec curl

**Récupérer la config OpenID4VC:**
```bash
curl http://localhost:3000/.well-known/openid-credential-issuer | jq
```

**Récupérer la config OpenID4VP:**
```bash
curl http://localhost:3000/.well-known/openid-verifier | jq
```

**Émettre un PID:**
```bash
curl -X POST http://localhost:3000/credential \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "eu.europa.ec.eudi.pid.1",
    "subject": "user123",
    "family_name": "Dupont",
    "given_name": "Jean",
    "birth_date": "1990-01-15",
    "age_over_18": true
  }' | jq
```

## 📁 Structure du projet

```
.
├── app.js                          # Point d'entrée
├── package.json                    # Dépendances
├── .env                           # Configuration (local)
├── config/
│   └── index.js                   # Chargement config
├── routes/
│   └── wellKnown.js              # Endpoints well-known
└── public/
    ├── index.html                # Interface web
    ├── style.css                 # Styles
    └── script.js                 # Tests interactifs
```

## 🔄 Flux OpenID4VC

1. Wallet découvre le serveur via `.well-known/openid-credential-issuer`
2. Wallet envoie demande de credential à `/credential`
3. Serveur émet et retourne le credential signé

## 🔄 Flux OpenID4VP

1. Verifier crée une demande via `/request_object`
2. Wallet reçoit et affiche la demande
3. Wallet prépare une présentation
4. Wallet envoie la présentation à `/presentation`
5. Verifier valide la présentation

## 📚 Références

- [OpenID4VC Issuance Spec](https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html)
- [OpenID4VP Spec](https://openid.net/specs/openid-4-verifiable-presentations-1_0.html)
- [EIDAS Digital Wallet Spec](https://github.com/eu-digital-identity-wallet)

## 📝 Notes de développement

- Actuellement, les endpoints retournent des réponses de test
- À implémenter: signature JWT des credentials
- À implémenter: validation des présentations
- À implémenter: gestion d'état et persistence
- À implémenter: intégration avec vault pour les clés privées

## 📄 License

MIT

## 👤 Author

EIDAS Development Team

