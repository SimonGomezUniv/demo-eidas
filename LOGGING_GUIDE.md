# 📨 Guide de Logging des Requêtes HTTP

## Vue d'ensemble

Un middleware de logging complet a été ajouté à votre serveur Express. Il enregistre **toutes les requêtes HTTP** et leurs réponses en temps réel dans la console.

## Ce qui est enregistré

### Pour chaque requête :
- ✅ **Timestamp** : Date et heure avec millisecondes (format FR)
- ✅ **Méthode HTTP** : GET, POST, PUT, DELETE, PATCH, etc.
- ✅ **Chemin** : URL path (premiers 50 caractères)
- ✅ **Query Parameters** : S'il y en a (aperçu sur 40 caractères)

### Pour chaque réponse :
- ✅ **Status Code** : 200, 404, 500, etc. (avec couleurs)
- ✅ **Taille** : Nombre de bytes envoyés
- ✅ **Durée** : Temps d'exécution en millisecondes

## Format d'affichage

```
📨 [23/01/2026 14:32:45:123] GET    /                          
    └─ 🟢 200 (5432 bytes) [12ms]

📨 [23/01/2026 14:32:46:015] POST   /credential                
    └─ 🟢 200 (892 bytes) [34ms]

📨 [23/01/2026 14:32:47:203] GET    /stats                     
    └─ 🟢 200 (654 bytes) [8ms]

📨 [23/01/2026 14:32:48:567] POST   /presentation              
    └─ 🔴 400 (234 bytes) [15ms]
```

## Interprétation des couleurs

| Couleur | Range | Signification |
|---------|-------|---------------|
| 🟢 Vert | 200-299 | Succès |
| 🟡 Jaune | 300-399 | Redirection |
| 🔴 Rouge | 400-599 | Erreur |

## Démarrer le serveur avec logging

```bash
# Démarrer le serveur
node app.js

# Vous verrez les logs pour chaque requête en temps réel
```

## Exemple d'utilisation

### 1. Démarrez le serveur
```bash
cd c:\Users\simon\Desktop\cmder\src\demo-eidas
node app.js
```

### 2. Visitez une page
```
Ouvrez: http://localhost:3000
Vous verrez dans la console:
  📨 [HH:MM:SS:mmm] GET    /                          
      └─ 🟢 200 (5432 bytes) [12ms]
```

### 3. Émettez un credential
```bash
curl -X POST http://localhost:3000/credential \
  -H "Content-Type: application/json" \
  -d '{"name":"John Doe"}'

Console affichera:
  📨 [HH:MM:SS:mmm] POST   /credential                
      └─ 🟢 200 (1234 bytes) [45ms]
```

## Cas d'utilisation

### Déboguer des erreurs
```
📨 [HH:MM:SS:mmm] POST   /verify                    
    └─ 🔴 400 (234 bytes) [15ms]  ← L'erreur 400 est immédiatement visible
```

### Identifier les requêtes lentes
```
📨 [HH:MM:SS:mmm] GET    /batch_credential        
    └─ 🟢 200 (9876 bytes) [2345ms]  ← 2.3 secondes = requête lente
```

### Suivre le flux de requêtes
```
📨 [14:32:45:001] GET    /                          
    └─ 🟢 200 (5432 bytes) [12ms]

📨 [14:32:46:015] GET    /issuance.html            
    └─ 🟢 200 (8923 bytes) [8ms]

📨 [14:32:47:203] POST   /credential               
    └─ 🟢 200 (892 bytes) [34ms]
```

## Filtrer les logs (optionnel)

Si les logs sont trop nombreux, vous pouvez rediriger vers un fichier :

```bash
# Sauvegarder les logs dans un fichier
node app.js > logs.txt 2>&1

# Ou avec PowerShell
node app.js *> logs.txt
```

## Désactiver le logging (si nécessaire)

Pour désactiver temporairement le middleware, commentez dans `app.js` :

```javascript
// Commentez cette ligne pour désactiver le logging
// app.use(loggingMiddleware);
```

## Personnalisations possibles

Le middleware se trouve dans `app.js` lignes 25-56. Vous pouvez personnaliser :

- **Format du timestamp** : Changer la locale ou le format
- **Format de l'affichage** : Ajouter/retirer des informations
- **Filtrage** : Ignorer certains paths (ex: `/favicon.ico`)
- **Niveaux** : Logger différemment selon le status code

### Exemple: Ignorer les requêtes statiques

```javascript
app.use((req, res, next) => {
  // Ignorer les fichiers statiques
  if (req.path.includes('.') || req.path.includes('favicon')) {
    return next();
  }
  
  // ... reste du middleware
});
```

## Fichiers concernés

- ✅ **app.js** : Middleware ajouté (lignes 25-56)
- ✅ **test-logging.js** : Script de test des requêtes (créé pour démonstration)

## Points importants

⚠️ **Note** : Le logging capture :
- Requêtes JSON (POST, PUT, PATCH)
- Requêtes GET avec query params
- Fichiers statiques servus
- Erreurs 404/500

⚠️ **Performance** : Le logging a un impact minimal (<1ms par requête)

## Support

Pour modifier le logging, éditez le middleware dans `app.js` aux lignes 25-56.

Toutes les requêtes, sans exception, passent par ce middleware et sont loggées.
