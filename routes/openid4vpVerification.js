const express = require('express');
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');
const crypto = require('crypto');

// Store pour les sessions de vérification temporaires
const verificationSessions = new Map();

/**
 * Routes pour la cinématique OpenID4VP avec QR code
 */
class OpenID4VPVerificationRouter {
  constructor(credentialSigner) {
    this.signer = credentialSigner;
  }

  /**
   * Crée une structure complète OpenID4VP presentation_request
   * Conforme à la spec OpenID4VP
   */
  createPresentationRequest(sessionId, responseUri) {
    const now = Math.floor(Date.now() / 1000);
    const nonce = uuidv4().replace(/-/g, '').substring(0, 43) + '='; // Format nonce OpenID
    const state = crypto.randomBytes(32).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');

    return {
      response_type: 'vp_token',
      client_id: `https://smngmz.com`,
      response_uri: responseUri,
      response_mode: "direct_post.jwt",
      nonce: nonce,
    dcql_query: {
    credentials: [
        {
        id: "custom_credential",
        format: "jwt_vc",
        meta: {
            type_values: ["CustomCredential"]
        },
        claims: [
            {
            id: "customData",
            path: ["credentialSubject", "customData"]
            }
        ]
        }
    ],
    credential_sets: [
        {
        options: [["custom_credential"]],
        purpose: "Provide the custom credential issued by smngmz.com"
        }
    ]
    },

      client_metadata: {
        jwks: {
          keys: [
            this.signer.keyManager.getECPublicKeyAsJWK()
          ]
        },
        vp_formats_supported: {
          'dc+sd-jwt': {
            'sd-jwt_alg_values': ['ES256', 'ES384', 'EdDSA', 'Ed25519', 'ES256K'],
            'kb-jwt_alg_values': ['ES256', 'ES384', 'EdDSA', 'Ed25519', 'ES256K']
          }
        },
        encrypted_response_enc_values_supported: ['A128GCM', 'A256GCM', 'A128CBC-HS256'],
        logo_uri: `${config.baseUrl}/assets/verifiers/openbank.png`,
        client_name: 'Open Horizon Bank',
        response_types_supported: ['vp_token']
      },
      state: state,
      aud: responseUri,
      exp: now + 600, // 10 minutes
      iat: now
    };
  }

  /**
   * Génère un hash SHA-256 pour le client_id format x509_hash
   */
  _getClientIdHash() {
    // Utiliser un hash déterministe basé sur la clé publique
    const publicKeyJwk = this.signer.keyManager.getECPublicKeyAsJWK();
    const keyString = JSON.stringify(publicKeyJwk);
    return crypto.createHash('sha256').update(keyString).digest('base64')
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=/g, '');
  }

  getRouter() {
    const router = express.Router();

    /**
     * Initier une session de vérification avec QR code
     * POST /verification/initiate-presentation
     */
    router.post('/verification/initiate-presentation', async (req, res) => {
      try {
        const {
          credential_type = 'custom_credential',
        } = req.body;

        // Générer un ID de session unique
        const sessionId = uuidv4();

        // Utiliser la WALLET_URL depuis la config (celle du .env)
        const walletUrl = config.walletUrl;

        // URL de callback pour la réponse (où la wallet envoie la VP)
        const responseUri = `${config.baseUrl}/presentation-callback?session=${sessionId}`;

        // URL de la présentation request (endpoint que la wallet va appeler)
        const presentationRequestUri = `${config.baseUrl}/presentation-request/${sessionId}`;

        // Créer la presentation request avec la structure complète OpenID4VP
        const presentationRequest = this.createPresentationRequest(sessionId, responseUri);

        // Signer le JWT
        const signedJwt = this.signer.signPresentationRequest(presentationRequest);

        // Stocker la session
        verificationSessions.set(sessionId, {
          id: sessionId,
          credential_type,
          presentation_request: presentationRequest,
          presentation_request_jwt: signedJwt,
          wallet_url: walletUrl,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          status: 'pending',
          nonce: presentationRequest.nonce,
          state: presentationRequest.state
        });

        // Générer le contenu du QR code
        // Format OpenID4VP : openid4vp://?request_uri=...
        const qrContent = `${walletUrl}?request_uri=${encodeURIComponent(presentationRequestUri)}`;

        // Générer le QR code avec le contenu correct
        const qrCodeUrl = await QRCode.toDataURL(qrContent);

        res.json({
          session_id: sessionId,
          status: 'pending',
          qr_content: qrContent,
          qr_code: qrCodeUrl,
          credential_type,
          verifier: config.baseUrl,
          wallet_url: walletUrl,
          presentation_request_uri: presentationRequestUri,
          expires_in: 600, // 10 minutes
        });
      } catch (error) {
        console.error('❌ Erreur lors de l\'initiation de la vérification:', error);
        res.status(500).json({
          error: 'verification_initiation_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * Endpoint pour récupérer la présentation request signée en JWT
     * GET /presentation-request/:sessionId
     * Retourne un JWT signé contenant la presentation request
     */
    router.get('/presentation-request/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = verificationSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'request_not_found',
            error_description: `Présentation request ${sessionId} non trouvée`,
          });
        }

        // Vérifier que la session n'a pas expiré
        if (new Date() > session.expires_at) {
          verificationSessions.delete(sessionId);
          return res.status(410).json({
            error: 'request_expired',
            error_description: 'Présentation request a expiré',
          });
        }

        console.log(`📋 [${new Date().toLocaleString('fr-FR')}] Présentation Request retournée (sessionId: ${sessionId})`);

        // Retourner le JWT signé (pas JSON brut)
        res.set('Content-Type', 'application/oauth-authz-req+jwt');
        res.send(session.presentation_request_jwt);
      } catch (error) {
        console.error('❌ Erreur lors de la récupération de la request:', error);
        res.status(500).json({
          error: 'request_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * Callback pour recevoir la présentation
     * POST /presentation-callback
     */
    router.post('/presentation-callback', (req, res) => {
      try {
        const {
          vp_token,
          presentation_submission,
          state,
        } = req.body;

        const sessionIdFromQuery = req.query.session;

        console.log(`\n🔐 [${new Date().toLocaleString('fr-FR')}] Présentation reçue`);
        console.log(`   • Session (query): ${sessionIdFromQuery}`);
        console.log(`   • VP Token (first 50 chars): ${vp_token?.substring(0, 50)}...`);
        console.log(`   • Submission: ${JSON.stringify(presentation_submission)}`);
        console.log(`   • State: ${state}`);

        if (!vp_token) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'vp_token est requis',
          });
        }

        // Trouver la session - d'abord par query param, puis par state
        let sessionId = sessionIdFromQuery;
        
        if (!sessionId) {
          for (const [id, session] of verificationSessions.entries()) {
            if (session.state === state) {
              sessionId = id;
              break;
            }
          }
        }

        if (!sessionId) {
          console.error('❌ Session non trouvée. Query session:', sessionIdFromQuery, 'State:', state);
          return res.status(400).json({
            error: 'invalid_state',
            error_description: 'State invalide ou session expirée',
          });
        }

        const session = verificationSessions.get(sessionId);

        if (!session) {
          return res.status(400).json({
            error: 'session_not_found',
            error_description: 'Session non trouvée',
          });
        }

        // Vérifier la présentation
        const verificationResult = this.signer.verifyCredential(vp_token);

        if (verificationResult) {
          console.log(`   ✅ Présentation valide`);

          // Mettre à jour la session
          session.status = 'completed';
          session.vp_token = vp_token;
          session.presentation_submission = presentation_submission;
          session.completed_at = new Date();
          session.verification_result = verificationResult;

          console.log(`   ✅ Session mise à jour`);
        } else {
          console.error('❌ Vérification échouée');
          session.status = 'failed';
          session.error = 'Vérification de la présentation échouée';
        }

        // Répondre au callback
        res.json({
          status: session.status,
          message: session.status === 'completed' ? 'Présentation vérifiée avec succès' : 'Vérification échouée',
        });
      } catch (error) {
        console.error('❌ Erreur lors du traitement de la présentation:', error);
        res.status(500).json({
          error: 'presentation_processing_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * Obtenir le statut d'une session de vérification
     * GET /verification/presentation-status/:sessionId
     */
    router.get('/verification/presentation-status/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = verificationSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'session_not_found',
          });
        }

        // Vérifier l'expiration
        if (new Date() > session.expires_at) {
          verificationSessions.delete(sessionId);
          return res.status(410).json({
            error: 'session_expired',
          });
        }

        res.json({
          session_id: sessionId,
          status: session.status,
          credential_type: session.credential_type,
          created_at: session.created_at,
          completed_at: session.completed_at,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la vérification du statut:', error);
        res.status(500).json({
          error: 'status_check_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * Obtenir les résultats de la vérification
     * GET /verification/presentation-result/:sessionId
     */
    router.get('/verification/presentation-result/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = verificationSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'session_not_found',
          });
        }

        if (session.status !== 'completed') {
          return res.status(400).json({
            error: 'presentation_not_ready',
            error_description: 'Présentation non encore reçue',
            status: session.status,
          });
        }

        // Décoder le VP token pour extraire les données
        let claims = null;
        let presentationInfo = {};

        try {
          const parts = session.vp_token.split('.');
          if (parts.length === 3) {
            const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
            claims = payload;

            // Extraire les infos du credential
            if (payload.vc && Array.isArray(payload.vc)) {
              const credential = payload.vc[0];
              presentationInfo = {
                holder: payload.sub || 'N/A',
                issuer: credential.issuer || 'N/A',
                credential_type: session.credential_type,
                issued_at: credential.issuanceDate || 'N/A',
                expires_at: credential.expirationDate || 'N/A',
              };
            }
          }
        } catch (e) {
          console.error('Erreur lors du décodage du token:', e);
        }

        res.json({
          session_id: sessionId,
          status: session.status,
          valid: session.status === 'completed',
          vp_token: session.vp_token,
          claims: claims,
          presentation_info: presentationInfo,
          completed_at: session.completed_at,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération des résultats:', error);
        res.status(500).json({
          error: 'result_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    return router;
  }
}


/**
 * Formater le type de credential
 */
function formatCredentialType(type) {
  const types = {
    'custom_credential': 'Custom Credential',
    'eu.europa.ec.eudi.pid.1': 'EIDAS PID (Person ID)',
  };
  return types[type] || type;
}

module.exports = OpenID4VPVerificationRouter;
module.exports.verificationSessions = verificationSessions;
