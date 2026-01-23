# EIDAS OpenID4VC/VP Server

Serveur Node.js implémentant les protocoles OpenID4VC (Issuance) et OpenID4VP (Verification) pour la gestion de credentials vérifiables conformément aux standards EIDAS.

## 🚀 Fonctionnalités

- ✅ OpenID4VC Issuer - Émission de credentials vérifiables
- ✅ OpenID4VP Verifier - Vérification et demande de présentations
- ✅ Well-Known Endpoints - Configuration standard OAuth2/OpenID
- ✅ Custom Credentials - Support des credentials personnalisés
- ✅ PID (Person Identification Data) - Support EIDAS
- ✅ CORS activé - Intégration avec wallet externe

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

