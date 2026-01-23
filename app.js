const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const config = require('./config');

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// Routes Well-Known (OpenID4VC, OpenID4VP, OAuth2)
const wellKnownRoutes = require('./routes/wellKnown');
app.use('/', wellKnownRoutes);

// ============ Routes OpenID4VC ============
// Authorization endpoint
app.get('/authorize', (req, res) => {
  res.json({ 
    message: 'Authorization endpoint',
    params: req.query
  });
});

// Token endpoint
app.post('/token', (req, res) => {
  res.json({ 
    message: 'Token endpoint',
    body: req.body
  });
});

// Credential endpoint (OpenID4VC)
app.post('/credential', (req, res) => {
  res.json({ 
    message: 'Credential endpoint',
    body: req.body
  });
});

// Batch Credential endpoint
app.post('/batch_credential', (req, res) => {
  res.json({ 
    message: 'Batch Credential endpoint',
    body: req.body
  });
});

// Deferred Credential endpoint
app.post('/deferred_credential', (req, res) => {
  res.json({ 
    message: 'Deferred Credential endpoint',
    body: req.body
  });
});

// Notification endpoint
app.post('/notification', (req, res) => {
  res.json({ 
    message: 'Notification endpoint',
    body: req.body
  });
});

// ============ Routes OpenID4VP ============
// Request Object endpoint
app.post('/request_object', (req, res) => {
  res.json({ 
    message: 'Request Object endpoint',
    body: req.body
  });
});

// Presentation endpoint (OpenID4VP)
app.post('/presentation', (req, res) => {
  res.json({ 
    message: 'Presentation endpoint',
    body: req.body
  });
});

// ============ Routes standard OAuth2 ============
app.get('/userinfo', (req, res) => {
  res.json({ 
    message: 'Userinfo endpoint',
    sub: 'user123'
  });
});

// Route pour la page d'accueil
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Route API santé du serveur
app.get('/api/health', (req, res) => {
  res.json({ 
    status: 'ok',
    issuer: config.issuerUrl,
    timestamp: new Date().toISOString()
  });
});

// Gestion des erreurs 404
app.use((req, res) => {
  res.status(404).json({ 
    error: 'Not found',
    path: req.path,
    method: req.method
  });
});

// Démarrage du serveur
const PORT = config.port;
app.listen(PORT, () => {
  console.log(`\n✅ Serveur EIDAS OpenID4VC/VP démarré`);
  console.log(`📍 URL: ${config.baseUrl}`);
  console.log(`\n🔍 Endpoints Well-Known:`);
  console.log(`  • OpenID4VC Issuer: ${config.baseUrl}/.well-known/openid-credential-issuer`);
  console.log(`  • OpenID4VP Verifier: ${config.baseUrl}/.well-known/openid-verifier`);
  console.log(`  • OAuth2 Server: ${config.baseUrl}/.well-known/oauth-authorization-server`);
  console.log(`  • JWKS: ${config.baseUrl}/.well-known/jwks.json\n`);
});
