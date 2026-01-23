const express = require('express');
const router = express.Router();
const QRCode = require('qrcode');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

// Store pour les sessions d'émission temporaires
const emissionSessions = new Map();

/**
 * Routes pour la cinématique OpenID4VC avec QR code
 */
class OpenID4VCIssuanceRouter {
  constructor(credentialSigner) {
    this.signer = credentialSigner;
  }

  getRouter() {
    // Créer une nouvelle session d'émission avec QR code
    router.post('/issuance/initiate', async (req, res) => {
      try {
        const {
          credential_type = 'custom_credential',
          credential_data = {},
        } = req.body;

        // Générer un ID de session unique
        const sessionId = uuidv4();
        const preAuthorizedCode = uuidv4();
        const userPin = Math.random().toString().slice(2, 6); // PIN 4 chiffres optionnel

        // Utiliser la WALLET_URL depuis la config (celle du .env)
        const walletUrl = config.walletUrl;

        // URL de la credential offer (endpoint que la wallet va appeler)
        const credentialOfferUri = `${config.baseUrl}/offer/${sessionId}`;

        // Préparer la credential offer avec PRE-AUTHORIZED CODE
        // C'est le format simple sans authentification
        // Mapper les credential_type aux credential_configuration_ids
        const credentialConfigMap = {
          'custom_credential': 'custom_credential',
          'eu.europa.ec.eudi.pid.1': 'eu.europa.ec.eudi.pid.1',
          'eu.europa.ec.eudi.diploma': 'eu.europa.ec.eudi.diploma'
        };
        
        const credentialConfigId = credentialConfigMap[credential_type] || credential_type;

        const credentialOffer = {
          credential_issuer: config.issuerUrl,
          credential_configuration_ids: [credentialConfigId],
          grants: {
            'urn:ietf:params:oauth:grant-type:pre-authorized_code': {
              'pre-authorized_code': preAuthorizedCode
            }
          }
        };

        // Stocker la session
        emissionSessions.set(sessionId, {
          id: sessionId,
          pre_authorized_code: preAuthorizedCode,
          user_pin: userPin,
          credential_type,
          credential_data,
          credential_offer: credentialOffer,
          wallet_url: walletUrl,
          created_at: new Date(),
          expires_at: new Date(Date.now() + 10 * 60 * 1000), // 10 minutes
          status: 'pending'
        });

        // Générer le contenu du QR code : credential_offer_uri
        // Format OpenID4VC : openid-credential://?credential_offer_uri=...
        // Ou format URI standard : https://wallet.url/?credential_offer_uri=...
        const qrContent = `${walletUrl}?credential_offer_uri=${encodeURIComponent(credentialOfferUri)}`;

        // Générer le QR code avec le contenu correct
        const qrCodeUrl = await QRCode.toDataURL(qrContent);

        res.json({
          session_id: sessionId,
          pre_authorized_code: preAuthorizedCode,
          user_pin: userPin,
          status: 'initiated',
          qr_content: qrContent,
          qr_code: qrCodeUrl,
          credential_type,
          issuer: config.issuerUrl,
          wallet_url: walletUrl,
          credential_offer_uri: credentialOfferUri,
          expires_in: 600, // 10 minutes
        });
      } catch (error) {
        console.error('❌ Erreur lors de l\'initiation de l\'émission:', error);
        res.status(500).json({
          error: 'issuance_initiation_failed',
          error_description: error.message,
        });
      }
    });

    // Endpoint pour récupérer la credential offer
    // Conforme à OpenID4VC spec
    router.get('/offer/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = emissionSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'offer_not_found',
            error_description: `Credential offer ${sessionId} not found or expired`,
          });
        }

        // Vérifier que la session n'a pas expiré
        if (new Date() > session.expires_at) {
          emissionSessions.delete(sessionId);
          return res.status(410).json({
            error: 'offer_expired',
            error_description: 'Credential offer has expired',
          });
        }

        // Log pour debug
        console.log('📋 Credential Offer retournée:');
        console.log(JSON.stringify(session.credential_offer, null, 2));

        // Retourner la credential offer
        res.json(session.credential_offer);
      } catch (error) {
        console.error('❌ Erreur lors de la récupération de l\'offre:', error);
        res.status(500).json({
          error: 'offer_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    // Obtenir le statut d'une session
    router.get('/issuance/session/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = emissionSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'session_not_found',
            error_description: `Session ${sessionId} not found`,
          });
        }

        // Vérifier l'expiration
        if (new Date() > session.expires_at) {
          emissionSessions.delete(sessionId);
          return res.status(410).json({
            error: 'session_expired',
            error_description: 'Session has expired',
          });
        }

        res.json({
          session_id: sessionId,
          status: session.status,
          credential_type: session.credential_type,
          created_at: session.created_at,
          expires_at: session.expires_at,
          credential: session.credential || null,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du statut:', error);
        res.status(500).json({
          error: 'status_check_failed',
          error_description: error.message,
        });
      }
    });

    // Endpoint de callback après autorisation (simulé pour test)
    router.get('/issuance/callback', async (req, res) => {
      try {
        const { state, code } = req.query;

        // Trouver la session correspondante
        let sessionId = null;
        let session = null;

        for (const [id, sess] of emissionSessions) {
          if (sess.state === state) {
            sessionId = id;
            session = sess;
            break;
          }
        }

        if (!session) {
          return res.status(400).json({
            error: 'invalid_state',
            error_description: 'State parameter does not match',
          });
        }

        // Vérifier l'expiration
        if (new Date() > session.expires_at) {
          emissionSessions.delete(sessionId);
          return res.status(410).json({
            error: 'session_expired',
            error_description: 'Session has expired',
          });
        }

        // Émettre le credential
        const signedCredential = this.signer.signCredential(
          {
            subject: `user:${uuidv4()}`,
            ...session.credential_data,
          },
          session.credential_type
        );

        // Mettre à jour la session
        session.status = 'completed';
        session.credential = signedCredential;
        session.completed_at = new Date();

        // Rediriger vers le wallet avec le credential
        // Reconstruire l'URL du wallet avec le credential
        const redirectUrl = new URL(session.wallet_url);
        redirectUrl.searchParams.set('credential', signedCredential);
        redirectUrl.searchParams.set('credential_format', 'jwt_vc_json');
        redirectUrl.searchParams.set('state', state);

        res.redirect(redirectUrl.toString());
      } catch (error) {
        console.error('❌ Erreur lors du callback:', error);
        res.status(500).json({
          error: 'callback_failed',
          error_description: error.message,
        });
      }
    });

    // Obtenir le credential d'une session complétée
    router.get('/issuance/credential/:sessionId', (req, res) => {
      try {
        const { sessionId } = req.params;
        const session = emissionSessions.get(sessionId);

        if (!session) {
          return res.status(404).json({
            error: 'session_not_found',
          });
        }

        if (session.status !== 'completed') {
          return res.status(400).json({
            error: 'credential_not_ready',
            error_description: 'Credential is not yet available',
            status: session.status,
          });
        }

        res.json({
          credential: session.credential,
          credential_format: 'jwt_vc_json',
          credential_type: session.credential_type,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du credential:', error);
        res.status(500).json({
          error: 'credential_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    return router;
  }
}

module.exports = OpenID4VCIssuanceRouter;
module.exports.emissionSessions = emissionSessions;
