# 🚀 MISE EN ROUTE - OpenID4VP Implementation

## ⚡ 5 Minutes pour Commencer

### Étape 1: Vérifier que le serveur est actif
```bash
# Le serveur devrait tourner sur le port 3000
curl http://localhost:3000/api/health
```

Résultat attendu:
```json
{
  "status": "ok",
  "issuer": "http://localhost:3000",
  "timestamp": "2024-01-23T10:00:00Z"
}
```

### Étape 2: Ouvrir la page de vérification
Visitez: **http://localhost:3000/verification.html**

### Étape 3: Créer une Request Object
- Cliquez sur "✨ Créer Request Simple"
- Copiez le `request_id` affiché

### Étape 4: Créer un Credential
```bash
curl -X POST http://localhost:3000/credential \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type": "custom_credential",
    "subject": "test-user"
  }'
```

Sauvegardez le `credential` JWT retourné.

### Étape 5: Vérifier la Présentation
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token": "eyJhbGciOi..."
  }'
```

**Résultat:** `{"valid": true, ...}` ✅

---

## 📱 Interface Web - Guide Complet

### 🎯 Tab 1: Créer une Request Object

**Formulaire Simple:**
1. **Client ID:** `http://localhost:3000`
2. **Redirect URI:** `http://localhost:3000/callback`
3. Clic: **"✨ Créer Request Simple"**

**Résultat:** Vous recevez:
```json
{
  "request_id": "550e8400-e29b-...",
  "request_object_uri": "http://localhost:3000/request_object/550e8400-...",
  "expires_in": 600
}
```

### ✔️ Tab 2: Vérifier Présentation

**Option 1: Manuel**
1. Collez un VP token JWT dans le champ
2. Optionnel: Spécifiez les requirements
3. Clic: **"🔍 Vérifier Présentation"**

**Option 2: Simulation**
1. Clic: **"🎬 Simuler Workflow Complet"**
2. Attendez la génération automatique
3. Voyez le résultat

**Résultat:** Affichage de:
- ✅ ou ❌ Statut de validation
- 📊 Détails des credentials
- 🔍 Erreurs (si any)

### 📊 Tab 3: Résultats & Statistiques

**Résumé:** Derniers résultats de vérification  
**Détails:** Payload complet du JWT  
**Statistiques:** État du serveur en temps réel

---

## 🔧 Configuration (Optionnel)

Fichier `.env` à la racine du projet:

```env
# Serveur
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development

# Issuer
ISSUER_URL=http://localhost:3000
ISSUER_NAME=EIDAS OpenID4VC Server

# Verifier
VERIFIER_URL=http://localhost:3000
VERIFIER_NAME=EIDAS OpenID4VP Verifier

# Wallet
WALLET_URL=http://localhost:3000
```

**Pour appliquer:** Redémarrer le serveur après modification.

---

## 🧪 Tests Rapides

### Test 1: Health Check
```bash
curl http://localhost:3000/api/health
# Expected: {"status":"ok"}
```

### Test 2: Créer une Request
```bash
curl -X POST http://localhost:3000/request_object \
  -H "Content-Type: application/json" \
  -d '{"client_id":"http://localhost:3000"}'
# Expected: {"request_id":"...","expires_in":600}
```

### Test 3: Émettre un Credential
```bash
curl -X POST http://localhost:3000/credential \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type":"custom_credential",
    "subject":"user1"
  }'
# Expected: {"credential":"eyJ...","credential_format":"jwt_vc_json"}
```

### Test 4: Vérifier une Présentation
```bash
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{"vp_token":"eyJ..."}'
# Expected: {"valid":true/false,"presentation":{...}}
```

### Test 5: Obtenir les Statistiques
```bash
curl http://localhost:3000/stats
# Expected: {"pending_requests":0,"verification_responses":0}
```

---

## 🔐 Sécurité - À Connaître

### Signatures JWT
Tous les tokens sont signés avec:
- **Algorithm:** RS256 (RSA + SHA256)
- **Key Size:** 2048 bits
- **Location:** `/keys/private.pem` et `/keys/public.pem`

### Où Vérifier les Clés?
```bash
# Voir les clés publiques (JWKS)
curl http://localhost:3000/.well-known/jwks.json

# Décoder un JWT
# Allez sur https://jwt.io et collez le token
```

### Protection CSRF
Chaque request génère un `state` unique pour la validation.

---

## 💬 Exemples de Code

### JavaScript/Node.js

```javascript
// Créer une request object
async function createRequest() {
  const response = await fetch('http://localhost:3000/request_object', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ client_id: 'http://localhost:3000' })
  });
  return await response.json();
}

// Vérifier une présentation
async function verifyPresentation(vpToken) {
  const response = await fetch('http://localhost:3000/verify', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      vp_token: vpToken,
      requirements: {
        requiredClaims: ['family_name']
      }
    })
  });
  return await response.json();
}

// Utilisation
const request = await createRequest();
console.log('Request ID:', request.request_id);

const result = await verifyPresentation(jwtToken);
console.log('Valid:', result.valid);
```

### Python

```python
import requests
import json

BASE_URL = 'http://localhost:3000'

# Créer une request
def create_request():
    response = requests.post(
        f'{BASE_URL}/request_object',
        json={'client_id': BASE_URL}
    )
    return response.json()

# Vérifier une présentation
def verify_presentation(vp_token, requirements=None):
    body = {'vp_token': vp_token}
    if requirements:
        body['requirements'] = requirements
    
    response = requests.post(
        f'{BASE_URL}/verify',
        json=body
    )
    return response.json()

# Utilisation
request = create_request()
print(f"Request ID: {request['request_id']}")

result = verify_presentation(jwt_token)
print(f"Valid: {result['valid']}")
```

### cURL Scripts

```bash
#!/bin/bash

BASE_URL="http://localhost:3000"

# Créer request
echo "=== Créer Request ==="
REQUEST=$(curl -s -X POST $BASE_URL/request_object \
  -H "Content-Type: application/json" \
  -d '{"client_id":"'$BASE_URL'"}')
REQUEST_ID=$(echo $REQUEST | jq -r '.request_id')
echo "Request ID: $REQUEST_ID"

# Émettre credential
echo -e "\n=== Émettre Credential ==="
CRED=$(curl -s -X POST $BASE_URL/credential \
  -H "Content-Type: application/json" \
  -d '{
    "credential_type":"custom_credential",
    "subject":"test"
  }')
TOKEN=$(echo $CRED | jq -r '.credential')
echo "Token: ${TOKEN:0:50}..."

# Vérifier présentation
echo -e "\n=== Vérifier Présentation ==="
RESULT=$(curl -s -X POST $BASE_URL/verify \
  -H "Content-Type: application/json" \
  -d '{"vp_token":"'$TOKEN'"}')
echo $RESULT | jq '.'
```

---

## 🐛 Troubleshooting

### Serveur ne répond pas
```bash
# Vérifier que Node.js tourne
netstat -an | grep 3000

# Redémarrer le serveur
npm start
```

### Port 3000 occupé
```bash
# Trouver le processus
lsof -i :3000

# Le tuer
kill -9 <PID>

# Redémarrer
npm start
```

### JWT invalide
```bash
# Vérifier le JWT sur jwt.io
# Vérifier la signature avec la clé publique
curl http://localhost:3000/.well-known/jwks.json
```

### Claims manquants
```bash
# Vérifier les claims dans le JWT
# Décoder sur jwt.io et vérifier la structure

# Lors de la vérification, spécifier les claims requis
curl -X POST http://localhost:3000/verify \
  -H "Content-Type: application/json" \
  -d '{
    "vp_token":"...",
    "requirements":{
      "requiredClaims":["family_name","given_name"]
    }
  }'
```

---

## 📚 Documentation Complète

| Besoin | Fichier |
|--------|---------|
| Vue d'ensemble | `README.md` |
| Démarrage rapide | `OPENID4VP_README.md` |
| Spec technique | `OPENID4VP_VERIFICATION.md` |
| Guide développeur | `DEVELOPER_GUIDE_OPENID4VP.md` |
| Index du projet | `INDEX.md` |
| Rapport achèvement | `COMPLETION_REPORT.md` |

---

## ⏱️ Timeline Apprentissage

### Jour 1 (1 heure)
- [ ] Lire README.md
- [ ] Tester `/verification.html`
- [ ] Créer/vérifier une présentation

### Jour 2 (2 heures)
- [ ] Lire OPENID4VP_README.md
- [ ] Tester avec curl
- [ ] Comprendre les flows

### Jour 3 (3 heures)
- [ ] Lire DEVELOPER_GUIDE_OPENID4VP.md
- [ ] Étudier le code source
- [ ] Implémenter une intégration

### Semaine 1 (5+ heures)
- [ ] Lire OPENID4VP_VERIFICATION.md
- [ ] Tests approfondis
- [ ] Déploiement en production

---

## ✅ Checklist de Premier Test

- [ ] Serveur démarre sans erreur
- [ ] `/api/health` retourne OK
- [ ] `/.well-known/jwks.json` accessible
- [ ] Page `/verification.html` se charge
- [ ] Créer une request object ✅
- [ ] Émettre un credential ✅
- [ ] Vérifier une présentation ✅
- [ ] Voir les statistiques ✅

---

## 🎓 Concepts à Comprendre

### Minimal (< 5 min)
- Qu'est-ce qu'un Credential (VC)?
- Qu'est-ce qu'une Presentation (VP)?
- Qu'est-ce qu'une Request Object?

### Intermédiaire (< 30 min)
- Signature RSA et vérification
- Structure d'un JWT
- Validation des claims

### Avancé (< 2 heures)
- W3C Verifiable Credentials
- OpenID4VP specification
- EIDAS compliance

---

## 🚀 Prochaines Étapes

1. **Tester:** Utiliser `/verification.html`
2. **Intégrer:** Ajouter à votre application
3. **Déployer:** HTTPS + Production
4. **Monitorer:** Logs et metrics
5. **Évoluer:** DB + Advanced Features

---

## 📞 Aide Rapide

**Je veux...**

Créer une request?
→ `POST /request_object`

Vérifier un VP token?
→ `POST /verify`

Voir les détails?
→ Allez sur `/verification.html`

Tester l'API?
→ Utilisez `test-openid4vp.sh` ou `.bat`

Comprendre le code?
→ Lisez `routes/openid4vp.js`

---

## 🎉 Vous Êtes Prêt!

Tout est implémenté et fonctionnel.  
Commencez par la page interactive, puis explorez le code.

**Bonne chance!** 🚀

---

**Dernière mise à jour:** Janvier 2024  
**Version:** 1.1.0  
**Status:** ✅ Production Ready
