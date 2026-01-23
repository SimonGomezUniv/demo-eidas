# 🔄 ISSUER_URL vs WALLET_URL - Explication

## 🎯 Résumé rapide

| Paramètre | Rôle | Exemple |
|-----------|------|---------|
| **ISSUER_URL** | Serveur qui **émet** les credentials | `http://localhost:3000` |
| **WALLET_URL** | Application qui **reçoit** les credentials | `http://localhost:4000` |

**Ils sont sur des ports différents car ce sont deux applications distinctes !**

---

## 📋 Explication détaillée

### 1️⃣ ISSUER_URL - C'est VOTRE serveur (Port 3000)

```
ISSUER_URL=http://localhost:3000
```

**Rôle :** Émettre (créer) les credentials vérifiables

- **Crée** les credentials JWT signés
- **Signe** avec la clé privée RSA
- Expose les endpoints d'émission :
  - `POST /credential` - Émettre un credential
  - `GET /.well-known/openid-credential-issuer` - Config d'émission
  - `POST /batch_credential` - Émettre en masse

**Utilisé dans :**
- Payload JWT: `iss: "http://localhost:3000"` (issuer)
- Endpoints well-known
- Documentation des credentials

**Exemple de use :**
```javascript
const payload = {
  iss: config.issuerUrl,  // http://localhost:3000
  sub: "user123",
  aud: config.walletUrl,  // http://localhost:4000
  vc: { ... }
};
```

---

### 2️⃣ WALLET_URL - Application tierce (Port 4000)

```
WALLET_URL=http://localhost:4000
```

**Rôle :** Stocker et gérer les credentials reçus

- **Reçoit** les credentials depuis l'issuer
- **Stocke** les credentials localement
- **Présente** les credentials lors des vérifications
- Gère l'authentification de l'utilisateur

**Utilisé dans :**
- Payload JWT: `aud: "http://localhost:4000"` (audience)
- URLs de redirection OAuth2
- QR codes de wallet
- Callbacks après l'émission

**Exemple de use :**
```javascript
// Dans le QR code:
{
  "credential_offer": "...",
  "wallet_url": "http://localhost:4000",  // Redirection vers le wallet
  "issuer": "http://localhost:3000"       // Issuer
}

// Redirection OAuth:
const authUrl = `${walletUrl}/authorize?...`;  // Envoie vers port 4000
```

---

## 🔄 Flux complet OpenID4VC

```
┌─────────────────────────────────────────────────────────────┐
│                    PROCESSUS D'ÉMISSION                      │
└─────────────────────────────────────────────────────────────┘

1. UTILISATEUR visite:
   http://localhost:3000/issuance.html
                    ↓
   (Serveur ISSUER)

2. ISSUER crée un credential:
   - iss: http://localhost:3000  (ISSUER_URL)
   - aud: http://localhost:4000  (WALLET_URL)
   - Signe avec clé RSA
                    ↓
   Crée un QR code avec:
   {
     "credential_offer_uri": "http://localhost:3000/offer/...",
     "wallet_redirect": "http://localhost:4000/..."
   }
                    ↓
3. UTILISATEUR scanne le QR code avec son WALLET:
   http://localhost:4000
        (App tierce - WALLET)
                    ↓
4. WALLET se connecte à ISSUER:
   http://localhost:3000/credential
        (Port 3000 = ISSUER)
                    ↓
5. ISSUER envoie le credential signé:
   JWT: iss=localhost:3000, aud=localhost:4000
                    ↓
6. WALLET stocke le credential:
   http://localhost:4000/credentials
        (Port 4000 = WALLET)

```

---

## 🏗️ Architecture

```
┌──────────────────┐                    ┌──────────────────┐
│                  │                    │                  │
│  ISSUER SERVER   │◄──────────────────►│   WALLET APP     │
│  Port 3000       │   HTTP Requests    │   Port 4000      │
│                  │   & Responses      │                  │
│ • Émet VC        │                    │ • Reçoit VC      │
│ • Signe JWT      │                    │ • Stocke VC      │
│ • Well-known     │                    │ • Présente VC    │
│                  │                    │                  │
└──────────────────┘                    └──────────────────┘
    ISSUER_URL                               WALLET_URL
    localhost:3000                           localhost:4000
```

---

## 📝 Où sont utilisées ces URLs ?

### ISSUER_URL - `http://localhost:3000`

**JWT Payload (credentials émis):**
```json
{
  "iss": "http://localhost:3000",  ← ISSUER_URL
  "aud": "http://localhost:4000",
  "vc": {...}
}
```

**Well-known Endpoints:**
```
http://localhost:3000/.well-known/openid-credential-issuer
http://localhost:3000/.well-known/jwks.json
```

**Credential Endpoints:**
```
POST http://localhost:3000/credential
POST http://localhost:3000/batch_credential
```

### WALLET_URL - `http://localhost:4000`

**JWT Audience (destination):**
```json
{
  "iss": "http://localhost:3000",
  "aud": "http://localhost:4000",  ← WALLET_URL
  "vc": {...}
}
```

**Redirection OAuth2:**
```javascript
const authUrl = `http://localhost:4000/authorize?...`;  // Redirection vers wallet
```

**QR Code (credential offer):**
```json
{
  "credential_offer_uri": "http://localhost:3000/offer/123",
  "wallet_url": "http://localhost:4000"
}
```

---

## 🎬 Scénarios réels

### Scénario 1: Développement local (Actuel)
```
ISSUER_URL=http://localhost:3000   (Ton serveur d'émission)
WALLET_URL=http://localhost:4000   (Application wallet tierce)
```
✅ C'est pour **tester** avec une wallet externe

### Scénario 2: Production
```
ISSUER_URL=https://api.example.com      (Serveur d'émission)
WALLET_URL=https://wallet.example.com   (Wallet tierce en production)
```
✅ C'est quand tu as une **vraie wallet** en production

### Scénario 3: Wallet intégrée (optionnel)
```
ISSUER_URL=https://api.example.com
WALLET_URL=https://api.example.com      (Même serveur)
```
✅ Si tu gères aussi la wallet toi-même

---

## ❓ Pourquoi deux URLs différentes ?

### 1. **Séparation des responsabilités**
- **ISSUER** = Création & validation des credentials
- **WALLET** = Stockage & présentation des credentials

### 2. **Modèle OpenID4VC standard**
- Chaque acteur a son rôle
- Issuer et Wallet peuvent être des entités différentes

### 3. **Flux OAuth2**
- L'issuer envoie vers la wallet
- La wallet se redirige vers l'issuer au besoin
- C'est un **flux triangulaire**

### 4. **Sécurité**
- Les audiences sont clairement définies
- Chaque credential sait où il doit aller
- `aud` claim = destinataire du credential

---

## 🔧 Comment configurer ?

### Pour votre environnement local (développement)

```env
# .env
ISSUER_URL=http://localhost:3000      # Votre serveur
WALLET_URL=http://localhost:4000      # Wallet test tierce
```

### Pour production avec domaines

```env
# .env.production
ISSUER_URL=https://issuer.votredomaine.com
WALLET_URL=https://wallet.votredomaine.com  # Ou domaine tiers
```

### Si vous contrôlez les deux

```env
# .env (même serveur pour les deux)
ISSUER_URL=http://localhost:3000
WALLET_URL=http://localhost:3000      # ISSUER et WALLET même domaine
```

---

## ⚠️ Points importants

1. **Elles peuvent être différentes** ✅
   - Issuer et Wallet sont souvent des services séparés

2. **Elles peuvent être identiques** ✅
   - Si vous gériez aussi la wallet

3. **L'audience (aud) doit matcher WALLET_URL** ✅
   - Sinon la wallet rejette le credential

4. **L'issuer (iss) doit matcher ISSUER_URL** ✅
   - Sinon impossible de vérifier la signature

---

## 📚 Résumé

```
┌─────────────────────────────────────────────────────┐
│              DEUX SYSTÈMES DIFFÉRENTS                │
├─────────────────────────────────────────────────────┤
│                                                     │
│  ISSUER (Port 3000)                                │
│  └─ Crée les credentials                           │
│  └─ Les signe avec RSA                             │
│  └─ Expose les endpoints d'émission                │
│  └─ Enregistre dans JWT: iss=localhost:3000        │
│                                                     │
│  WALLET (Port 4000)                                │
│  └─ Reçoit les credentials                         │
│  └─ Les stocke localement                          │
│  └─ Les présente quand nécessaire                  │
│  └─ Reçoit dans JWT: aud=localhost:4000            │
│                                                     │
└─────────────────────────────────────────────────────┘
```

C'est tout ! Des questions ? 🤔
