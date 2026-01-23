# 🎬 Guide d'Utilisation - Cinématique OpenID4VC avec QR Code

## 📱 Accès à la Cinématique

### Option 1: Via le Bouton de Navigation
1. Accéder à `http://localhost:3000/`
2. Cliquer sur le bouton **"📱 Cinématique d'Émission"**
3. Vous êtes redirigé vers `http://localhost:3000/issuance.html`

### Option 2: Accès Direct
Accéder directement à `http://localhost:3000/issuance.html`

---

## 🛠️ Étapes de Mise en Place d'un Credential

### Étape 1: Configurer le Type de Credential

La page propose deux types:

#### A. Custom Credential (Par défaut)
- Sélectionner: **"Custom Credential"**
- Ce type permet des données libres

#### B. EIDAS PID (Sécurisé)
- Sélectionner: **"EIDAS PID (Person ID)"**
- Ce type respecte le standard EIDAS pour l'identification

### Étape 2: Remplir les Données

#### Pour Custom Credential:
- **Données personnalisées**: Ex: "Mon identité numérique"
- **Département**: Ex: "Engineering"
- **Rôle**: Ex: "Developer"

```
┌─────────────────────────────────────┐
│ Type de Credential: Custom          │
│ Données personnalisées: Mon ID      │
│ Département: IT                     │
│ Rôle: Administrator                 │
└─────────────────────────────────────┘
```

#### Pour EIDAS PID:
- **Nom**: Ex: "Martin"
- **Prénom**: Ex: "Alice"
- **Date de naissance**: 1990-01-15
- **Nationalité**: FR (code ISO 2 caractères)
- **Age >= 18 ans**: ✓ (cocher si oui)
- **Age >= 21 ans**: Optionnel

```
┌─────────────────────────────────────┐
│ Type de Credential: EIDAS PID       │
│ Nom: Martin                         │
│ Prénom: Alice                       │
│ Date de naissance: 1990-01-15       │
│ Nationalité: FR                     │
│ Age >= 18: ✓                        │
└─────────────────────────────────────┘
```

### Étape 3: Initier l'Émission

1. Cliquer sur le bouton **"Initier l'émission →"**
2. Le serveur crée une session d'émission unique
3. La page passe à la section d'affichage du QR code

**Ce qui se passe en arrière-plan**:
```
POST /issuance/initiate
{
  "credential_type": "custom_credential",
  "credential_data": {
    "customData": "...",
    "department": "..."
  }
}
↓
Response:
{
  "session_id": "550e8400-e29b-41d4-a716-446655440000",
  "qr_code": "data:image/png;base64,...",
  "auth_url": "http://wallet:4000/authorize?..."
}
```

### Étape 4: Afficher et Scanner le QR Code

#### Vue Écran:
```
┌─────────────────────────────────────────────┐
│ 📱 Scanner avec votre Wallet                 │
│ Session ID: 550e8400-e29b-41d4-a716-...    │
│                                              │
│  ┌──────────────────────────────────────┐  │
│  │     ██████████████████████████        │  │
│  │     ██        ████        ████        │  │
│  │     ██  █████    ██  ██    ████  ██  │  │
│  │     ██  ██  ██   ██  ██    ████  ██  │  │
│  │     ██  █████    ██  ██    ████  ██  │  │
│  │     ██        ████        ████        │  │
│  │     ██████████████████████████        │  │
│  └──────────────────────────────────────┘  │
│                                              │
│  Statut de l'émission                       │
│  Type: Custom Credential                    │
│  Issuer: http://localhost:3000              │
│  Statut: ⏳ En attente...                   │
│  Expiration: 600 secondes                   │
│                                              │
│  🧪 Simulation (sans wallet)                │
│  [Simuler le scannage du wallet]            │
└─────────────────────────────────────────────┘
```

#### Option A: Avec un Wallet Réel
1. Ouvrir l'application wallet EIDAS sur votre téléphone
2. Accéder à la fonctionnalité de scannage QR
3. Pointer la caméra sur le QR code
4. Le wallet initie l'authentification
5. L'utilisateur s'authentifie
6. Le wallet reçoit le credential signé

#### Option B: Simulation (Pas de Wallet)
1. Pour tester sans wallet physique
2. Cliquer sur **"Simuler le scannage du wallet"**
3. Le serveur simule le processus complet
4. Le credential s'affiche automatiquement

### Étape 5: Credential Émis ✅

**Vue Écran**:
```
┌─────────────────────────────────────────────┐
│ ✅ Credential émis!                         │
│                                              │
│ JWT Token:                                  │
│ eyJhbGciOiJSUzI1NiIsInR5cCI6IkpXVCIsImt... │
│ [Copier]                                    │
│                                              │
│ Payload (décodé):                           │
│ {                                           │
│   "iss": "http://localhost:3000",          │
│   "sub": "user:123",                       │
│   "vc": {                                  │
│     "type": ["VerifiableCredential", ...], │
│     "credentialSubject": {                 │
│       "customData": "..."                  │
│     }                                       │
│   }                                         │
│ }                                           │
└─────────────────────────────────────────────┘
```

#### Actions Disponibles:
- **Copier**: Copier le JWT dans le presse-papiers
- **Nouveau**: Revenir au formulaire pour émettre un autre credential

---

## 🔄 Flux Complet Détaillé

### Timeline Complète:

```
T0: Utilisateur accède à /issuance.html
    │
    ├─→ Page charge avec formulaire
    │   • Type de credential à sélectionner
    │   • Champs de données
    │
T1: Utilisateur remplit les données
    ├─→ "Données personnalisées: Mon ID"
    ├─→ "Département: IT"
    └─→ "Rôle: Administrator"
    │
T2: Utilisateur clique "Initier l'émission"
    │
T3: POST /issuance/initiate
    ├─→ Serveur crée une session unique
    ├─→ Session stockée en mémoire
    ├─→ QR code généré (URL d'authorization)
    ├─→ Expiration définie à T3 + 10 minutes
    └─→ Réponse avec QR code et session ID
    │
T4: Page affiche le QR code
    ├─→ Image QR visible à l'écran
    ├─→ Session ID affiché
    ├─→ Statut: "⏳ En attente..."
    └─→ Décompte de l'expiration
    │
T5: Scannage du QR code (2 options)
    │
    ├─ Option A: Wallet Réel
    │  ├─→ Wallet scanne le QR code
    │  ├─→ Wallet ouvre l'URL d'authorization
    │  ├─→ Utilisateur s'authentifie
    │  └─→ Wallet appelle le callback
    │
    └─ Option B: Simulation
       └─→ Clic sur "Simuler le scannage"
           ├─→ Simule appel au callback
           └─→ Lance le processus d'émission
    │
T6: GET /issuance/callback?code=X&state=Y
    ├─→ Serveur valide le state
    ├─→ Serveur génère le credential
    ├─→ Credential signé avec clé privée RSA
    ├─→ Session marquée "completed"
    └─→ Credential stocké en mémoire
    │
T7: Page vérifie le statut (polling toutes les 2s)
    ├─→ Statut passe à "✅ Complété"
    └─→ Affichage du credential
    │
T8: Credential s'affiche à l'écran
    ├─→ JWT Token visible
    ├─→ Payload décodé visible
    └─→ Bouton Copier disponible
    │
T9: Utilisateur copie le credential
    ├─→ JWT copié dans le presse-papiers
    └─→ Notification "✅ Copié!"
    │
T10: Utilisateur peut réutiliser le credential
     ├─→ Envoyer à un verifier
     ├─→ Stocker dans son wallet
     └─→ Utiliser pour s'authentifier ailleurs
```

---

## 🔐 Sécurité de la Cinématique

### Chaîne de Sécurité:

```
1️⃣  Génération RSA 2048-bit
    └─→ Clé privée stockée sécurisée sur serveur
    └─→ Clé publique disponible via JWKS

2️⃣  Session ID Unique
    └─→ UUID généré aléatoirement
    └─→ Imposible à prédire
    └─→ Stocké en mémoire

3️⃣  State Parameter (CSRF Protection)
    └─→ Token aléatoire associé à la session
    └─→ Validé au callback
    └─→ Empêche les attaques CSRF

4️⃣  Timeout Session
    └─→ Durée: 10 minutes
    └─→ Auto-expiration après timeout
    └─→ Nettoyage automatique

5️⃣  JWT Signature (RS256)
    └─→ Signé avec clé privée
    └─→ Vérifié avec clé publique
    └─→ Immuable après signature

6️⃣  Claims Validation
    └─→ Issuer (iss): Vérifier la confiance
    └─→ Expiration (exp): Vérifier la validité
    └─→ Audience (aud): Vérifier le destinataire
```

---

## 📊 Statuts de Session

```
┌──────────────────────────────────────┐
│          Session Lifecycle            │
├──────────────────────────────────────┤
│                                       │
│  initiated ─┐                        │
│             │                        │
│             ├─→ pending ─┐           │
│             │             │          │
│             │             ├─→ ✅ completed
│             │             │          │
│             └─→ ❌ expired           │
│                                       │
│  • initiated: Session juste créée   │
│  • pending: En attente du callback  │
│  • completed: Credential émis       │
│  • expired: Timeout dépassé         │
│                                       │
└──────────────────────────────────────┘
```

---

## 💡 Cas d'Usage

### Cas 1: Émission Simple
**Objectif**: Émettre un credential personnalisé rapidement

**Étapes**:
1. Sélectionner "Custom Credential"
2. Remplir "Données personnalisées" uniquement
3. Cliquer "Initier l'émission"
4. Simuler le scannage
5. Copier le credential

### Cas 2: Émission EIDAS Complète
**Objectif**: Émettre une pièce d'identité numérique EIDAS

**Étapes**:
1. Sélectionner "EIDAS PID (Person ID)"
2. Remplir tous les champs
3. Cocher "Age >= 18"
4. Cliquer "Initier l'émission"
5. Laisser wallet réel scanner
6. Utiliser pour authentification

### Cas 3: Test Multi-Credentials
**Objectif**: Tester plusieurs types successivement

**Étapes**:
1. Créer un credential Custom
2. Cliquer "← Nouvel émission"
3. Créer un credential PID
4. Comparer les deux dans le presse-papiers

---

## 🧪 Dépannage

### Le QR code ne s'affiche pas
- **Cause**: Erreur lors de la génération du QR
- **Solution**: Vérifier la console (F12) pour les erreurs
- **Vérifier**: Le serveur est-il bien lancé? npm start

### La page reste "En attente..."
- **Cause**: Le callback n'a pas été appelé
- **Solution**: Cliquer "Simuler le scannage du wallet"
- **Vérifier**: Les clés RSA sont-elles générées? Chercher `/keys/`

### Le credential n'apparaît pas
- **Cause**: Session expirée ou non trouvée
- **Solution**: Recommencer une nouvelle émission
- **Vérifier**: Délai pour que le serveur émette (1-2 sec)

### Erreur de copie
- **Cause**: Problème d'accès au presse-papiers
- **Solution**: Copier manuellement le texte du JWT
- **Vérifier**: Navigateur supporte l'API Clipboard

---

## 📚 Intégration avec un Wallet

Pour intégrer cette cinématique avec votre wallet EIDAS:

### 1. Découvrir les Capacités
```
GET http://localhost:3000/.well-known/openid-credential-issuer
```

### 2. Scanner le QR Code
L'URL obtenue du QR contient:
```
http://localhost:4000/authorize?
  client_id=http://localhost:3000
  &response_type=code
  &scope=custom_credential
  &state=...
  &redirect_uri=http://localhost:3000/issuance/callback
  &issuer=http://localhost:3000
```

### 3. Effectuer l'Authorization
Votre wallet doit:
1. Authentifier l'utilisateur
2. Récupérer l'autorisation
3. Appeler le callback avec le code

### 4. Récupérer le Credential
```
GET http://localhost:3000/issuance/credential/{sessionId}
```

### 5. Valider la Signature
1. Récupérer les clés publiques: `/.well-known/jwks.json`
2. Vérifier la signature JWT RS256
3. Valider les claims
4. Stocker le credential

---

## 🎓 Résumé de la Cinématique

| Étape | Action | Endpoint | Résultat |
|-------|--------|----------|----------|
| 1 | Initier | POST /issuance/initiate | QR code généré |
| 2 | Scanner | QR code | URL authorization |
| 3 | Callback | GET /issuance/callback | Credential signé |
| 4 | Récupérer | GET /issuance/credential | JWT retourné |
| 5 | Valider | JWKS validation | Signature vérifiée ✅ |

---

**Prêt à tester? Accédez à `http://localhost:3000/issuance.html` maintenant! 🚀**
