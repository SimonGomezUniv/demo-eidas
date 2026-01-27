# OpenID4VP Verification - Guide Rapide

## C'est Quoi ?

L'interface de vérification OpenID4VP permet de tester le workflow complet de présentation de credentials:
- **Sélectionnez** le type de credential à vérifier
- **Générez** un QR code pour interroger le wallet
- **Scannez** avec votre wallet EIDAS
- **Recevez** la présentation et affichage des résultats

## Comment Utiliser

### 1. Accédez à la Page
```
http://localhost:3000/verification.html
```

### 2. Sélectionnez un Credential
Deux options disponibles:
- **🔐 Custom Credential**: Credential personnalisé
- **🎫 EIDAS PID (Person ID)**: Credential d'identité EIDAS

La description et les requirements s'affichent automatiquement.

### 3. Lancez la Vérification
Cliquez sur **"Initier la vérification →"**

Le système va:
- Générer une session unique
- Créer une `presentation_request` conforme à OpenID4VP
- Générer un QR code avec l'URL du wallet

### 4. Scannez avec le Wallet
1. Ouvrez votre wallet EIDAS
2. Scannez le QR code affiché
3. Sélectionnez le credential à présenter
4. Acceptez la demande

### 5. Consultez les Résultats
Une fois la présentation reçue:
- ✅ Statut de vérification
- 📋 Détails du credential (holder, issuer, dates)
- 📊 Données complètes du credential
- 🔑 JWT Token

## Architecture

```
┌─────────────────────────────────────────────────────┐
│           Browser (Client)                          │
│  ┌────────────────────────────────────────────────┐ │
│  │  verification.html                             │ │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────────┐ │ │
│  │  │Selector  │→ │QR Code   │→ │Results Panel │ │ │
│  │  └──────────┘  └──────────┘  └──────────────┘ │ │
│  └────────────────────────────────────────────────┘ │
│           ↕ (verification.js)                       │
└─────────────────────────────────────────────────────┘
           ↕                              ↕
┌─────────────────────────────┐  ┌──────────────────┐
│  Demo Server                │  │  Wallet EIDAS    │
│  ┌───────────────────────┐  │  │                  │
│  │/verification/         │  │  │ Scans QR code   │
│  │  initiate-pres        │←-┼→ │ Sends VP Token  │
│  │                       │  │  │                  │
│  │/presentation-request  │←-┼─ │                  │
│  │  (avec QR URI)        │  │  │                  │
│  │                       │  │  │                  │
│  │/presentation-callback │  │  │                  │
│  │  (reçoit VP token)    │←-┼─ │                  │
│  │                       │  │  │                  │
│  │/presentation-status   │→-┼─ │                  │
│  │  /presentation-result │  │  │                  │
│  └───────────────────────┘  │  │                  │
└─────────────────────────────┘  └──────────────────┘
```

## Endpoints API

### Initiation
```
POST /verification/initiate-presentation
{
  "credential_type": "custom_credential"
}
→ QR code + session ID
```

### Récupération Request
```
GET /presentation-request/:sessionId
→ Présentation request pour le wallet
```

### Callback du Wallet
```
POST /presentation-callback
{
  "vp_token": "eyJhbGc...",
  "state": "uuid"
}
```

### Vérification du Statut
```
GET /verification/presentation-status/:sessionId
→ { "status": "pending|completed" }
```

### Résultats
```
GET /verification/presentation-result/:sessionId
→ { "vp_token": "...", "claims": {...} }
```

## Fichiers Modifiés/Créés

### Nouveau (Frontend)
- ✅ `public/verification.js` - Logique du workflow
- ✅ `public/verification.css` - Styles UI
- ✅ `public/verification.html` - Interface (remplacée)

### Nouveau (Backend)
- ✅ `routes/openid4vpVerification.js` - Routes OpenID4VP

### Modifié
- ✅ `app.js` - Intégration des routes

## Configuration

Le fichier `.env` doit contenir:
```
BASE_URL=http://localhost:3000
WALLET_URL=http://smn.gmz:4000
```

- `BASE_URL`: URL du serveur de démonstration
- `WALLET_URL`: URL du wallet EIDAS (pour les QR codes)

## Flux de Données

### 1️⃣ Initiation
```javascript
// Frontend
await fetch('/verification/initiate-presentation', {
  method: 'POST',
  body: { credential_type: 'custom_credential' }
})
// ↓
// Backend génère session + QR code
// ↓
// Frontend affiche QR code
```

### 2️⃣ Présentation
```
Utilisateur scanne QR code
↓
Wallet récupère presentation_request
↓
Wallet envoie VP token au callback
```

### 3️⃣ Résultats
```javascript
// Frontend poll le statut
GET /verification/presentation-status/:sessionId
// ↓
// Une fois complétée
GET /verification/presentation-result/:sessionId
// ↓
// Frontend affiche les résultats
```

## Exemple de Résultat

```json
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "status": "completed",
  "valid": true,
  "vp_token": "eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCJ9...",
  "claims": {
    "sub": "user:uuid",
    "vc": {
      "issuer": "http://localhost:3000",
      "type": ["VerifiableCredential", "custom_credential"],
      "credentialSubject": {
        "customData": "Credential EIDAS démo",
        "department": "IT",
        "role": "Administrator"
      }
    }
  },
  "presentation_info": {
    "holder": "user:uuid",
    "issuer": "http://localhost:3000",
    "credential_type": "custom_credential",
    "issued_at": "2024-01-27T10:30:45.000Z",
    "expires_at": "2025-01-27T10:30:45.000Z"
  }
}
```

## Dépannage

### Le QR code ne s'affiche pas
- Vérifier que `WALLET_URL` est configuré dans `.env`
- Vérifier la console du navigateur pour les erreurs

### Le wallet ne trouve pas la presentation_request
- Vérifier que le `BASE_URL` dans `.env` est accessible du wallet
- Vérifier que les logs serveur montrent l'accès au endpoint

### La présentation ne s'affiche pas dans les résultats
- Vérifier que le wallet a bien scanni le QR code
- Vérifier les logs serveur pour voir si le callback a été reçu
- Rafraîchir la page si le polling a expiré

### L'expiration de session
- Les sessions expirent après 10 minutes
- Relancez une nouvelle vérification après cette durée

## Prochaines Étapes

1. **Tester avec un vrai wallet EIDAS**
   - Remplacer `WALLET_URL` par l'URL réelle
   - Vérifier que les QR codes sont bien reconnus

2. **Persistance des données**
   - Ajouter une base de données pour historique
   - Exporter les vérifications

3. **Validations avancées**
   - Ajouter des contraintes sur les credentials
   - Vérifier les signatures cryptographiques

4. **Interface administrative**
   - Dashboard des vérifications
   - Statistiques d'utilisation

## Support

Pour plus d'informations:
- Consultez `OPENID4VP_IMPLEMENTATION.md`
- Consultez `VERIFICATION_CHANGES_SUMMARY.md`
- Consultez les commentaires dans `verification.js` et `openid4vpVerification.js`
