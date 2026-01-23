const express = require('express');
const path = require('path');
const cors = require('cors');
require('dotenv').config();

const app = express();
const config = require('./config');

// Initialiser les gestionnaires de clés et signatures
const KeyManager = require('./lib/keyManager');
const OpenID4VCRouter = require('./routes/openid4vc');
const OpenID4VPRouter = require('./routes/openid4vp');

const keyManager = new KeyManager();
const openid4vcRouter = new OpenID4VCRouter(keyManager);
const openid4vpRouter = new OpenID4VPRouter(keyManager);

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

// ============ Logging Middleware ============
// ============ Logging Middleware ============
// Log toutes les requêtes
app.use((req, res, next) => {
  // Ignorer le polling de session (trop de bruit dans les logs)
  if (req.path.includes('/issuance/session/')) {
    return next();
  }

  const timestamp = new Date().toLocaleString('fr-FR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    millisecond: '3-digit'
  });
  
  const method = req.method.padEnd(6);
  const pathDisplay = req.path.substring(0, 50).padEnd(50);
  const query = req.query && Object.keys(req.query).length > 0 ? ` ?${JSON.stringify(req.query).substring(0, 40)}` : '';
  
  console.log(`📨 [${timestamp}] ${method} ${pathDisplay}${query}`);
  
  // Capturer le moment de la réponse
  const startTime = Date.now();
  const originalSend = res.send;
  const originalJson = res.json;
  
  // Wrapper pour send()
  res.send = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    const size = data ? (typeof data === 'string' ? data.length : JSON.stringify(data).length) : '0';
    console.log(`    └─ ${statusColor}${statusCode}${resetColor} (${size} bytes) [${duration}ms]`);
    return originalSend.call(this, data);
  };
  
  // Wrapper pour json()
  res.json = function(data) {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;
    const statusColor = statusCode >= 400 ? '\x1b[31m' : statusCode >= 300 ? '\x1b[33m' : '\x1b[32m';
    const resetColor = '\x1b[0m';
    const size = JSON.stringify(data).length;
    console.log(`    └─ ${statusColor}${statusCode}${resetColor} (${size} bytes) [${duration}ms]`);
    return originalJson.call(this, data);
  };
  
  next();
});

/*
// Routes Well-Known (OpenID4VC, OpenID4VP, OAuth2)
const createWellKnownRoutes = require('./routes/wellKnown');
const wellKnownRoutes = createWellKnownRoutes(keyManager);
app.use('/', wellKnownRoutes);
*/
// Routes OpenID4VC avec signature JWT
app.use('/', openid4vcRouter.getRouter());

// Routes OpenID4VP - Vérification de présentations
app.use('/', openid4vpRouter.getRouter());

// Routes OpenID4VC Issuance avec QR code
const OpenID4VCIssuanceRouter = require('./routes/openid4vcIssuance');
const issuanceRouter = new OpenID4VCIssuanceRouter(openid4vcRouter.signer);
app.use('/', issuanceRouter.getRouter());

// ============ Routes OpenID4VC additionnelles ============
// State storage for authorization flow
const authorizationStates = new Map();
const authorizationCodes = new Map();

// Authorization endpoint
app.get('/authorize', (req, res) => {
  try {
    const { client_id, redirect_uri, scope, state, response_type, nonce, code_challenge, code_challenge_method } = req.query;
    
    // Validate required parameters
    if (!client_id || !redirect_uri || !state || !response_type) {
      return res.status(400).json({ 
        error: 'invalid_request',
        error_description: 'Missing required parameters: client_id, redirect_uri, state, response_type'
      });
    }

    // Store authorization parameters
    const authCode = require('crypto').randomBytes(16).toString('hex');
    authorizationStates.set(state, {
      client_id,
      redirect_uri,
      scope: scope || 'openid',
      nonce,
      code_challenge,
      code_challenge_method,
      created_at: Date.now()
    });
    
    authorizationCodes.set(authCode, {
      client_id,
      scope: scope || 'openid',
      nonce,
      created_at: Date.now()
    });

    // Redirect to redirect_uri with code and state
    const redirectUrl = new URL(redirect_uri);
    redirectUrl.searchParams.append('code', authCode);
    redirectUrl.searchParams.append('state', state);
    
    res.redirect(redirectUrl.toString());
  } catch (error) {
    console.error('❌ Authorize error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
});

// Token endpoint
app.post('/token', (req, res) => {
  try {
    const { grant_type, code, pre_authorized_code, redirect_uri, client_id, code_verifier, user_pin } = req.body;

    // Support du pre-authorized_code (OpenID4VCI)
    if (grant_type === 'urn:ietf:params:oauth:grant-type:pre-authorized_code') {
      if (!pre_authorized_code) {
        return res.status(400).json({
          error: 'invalid_request',
          error_description: 'pre-authorized_code is required'
        });
      }

      // Récupérer la session avec ce pre-authorized_code
      const { emissionSessions } = require('./routes/openid4vcIssuance');
      let sessionFound = null;
      
      for (const [sessionId, session] of emissionSessions.entries()) {
        if (session.pre_authorized_code === pre_authorized_code) {
          sessionFound = session;
          break;
        }
      }

      if (!sessionFound) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'pre-authorized_code is invalid or expired'
        });
      }

      // Vérifier l'expiration
      if (new Date() > sessionFound.expires_at) {
        return res.status(400).json({
          error: 'invalid_grant',
          error_description: 'pre-authorized_code has expired'
        });
      }

      // Générer un access token
      const accessToken = require('crypto').randomBytes(32).toString('hex');
      const cNonce = require('crypto').randomBytes(16).toString('hex');
      
      return res.json({
        access_token: accessToken,
        token_type: 'Bearer',
        expires_in: 3600,
        c_nonce: cNonce,
        c_nonce_expires_in: 600
      });
    }

    // Support du authorization_code standard
    if (grant_type !== 'authorization_code') {
      return res.status(400).json({
        error: 'unsupported_grant_type',
        error_description: `Grant type '${grant_type}' is not supported`
      });
    }

    // Validate authorization code
    if (!authorizationCodes.has(code)) {
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code is invalid or expired'
      });
    }

    const authCode = authorizationCodes.get(code);
    
    // Check if code is not expired (10 minutes)
    if (Date.now() - authCode.created_at > 600000) {
      authorizationCodes.delete(code);
      return res.status(400).json({
        error: 'invalid_grant',
        error_description: 'Authorization code has expired'
      });
    }

    // Generate access token (simple JWT)
    const accessToken = require('crypto').randomBytes(32).toString('hex');
    
    res.json({
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: 3600,
      scope: authCode.scope,
      ...(authCode.nonce && { id_token: accessToken })
    });

    // Clean up
    authorizationCodes.delete(code);
  } catch (error) {
    console.error('❌ Token error:', error);
    res.status(500).json({
      error: 'server_error',
      error_description: error.message
    });
  }
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
  console.log(`  • JWKS: ${config.baseUrl}/.well-known/jwks.json`);
  console.log(`\n🔐 Signature JWT:`);
  console.log(`  • Algorithm: RS256`);
  console.log(`  • Credentials are signed and ready for validation`);
  console.log(`\n📡 Endpoints Principaux:`);
  console.log(`  OpenID4VC Issuance:`);
  console.log(`    • GET /issuance.html - Interface interactive avec QR code`);
  console.log(`    • POST /credential - Émettre un credential`);
  console.log(`    • POST /batch_credential - Émettre plusieurs credentials`);
  console.log(`    • POST /deferred_credential - Credential asynchrone`);
  console.log(`  OpenID4VP Verification:`);
  console.log(`    • POST /request_object - Créer une request de présentation`);
  console.log(`    • GET /request_object/:id - Récupérer une request`);
  console.log(`    • POST /presentation - Vérifier une présentation`);
  console.log(`    • GET /presentation/:id - Récupérer un résultat`);
  console.log(`    • POST /verify - Vérifier avec requirements`);
  console.log(`    • GET /stats - Statistiques OpenID4VP`);
  console.log(`\n🌐 Interface Web:`);
  console.log(`  • http://localhost:${PORT}/ - Accueil`);
  console.log(`  • http://localhost:${PORT}/issuance.html - Émission de credentials`);
  console.log(`\n⏰ Système actuellement actif et prêt à accepter les connexions`);
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);;
  console.log(`  • POST /credential - Émettre un credential signé`);
  console.log(`  • POST /batch_credential - Émettre plusieurs credentials`);
  console.log(`  • POST /verify_credential - Vérifier un credential\n`);
});
