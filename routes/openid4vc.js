const express = require('express');
const CredentialSigner = require('../lib/credentialSigner');

/**
 * Routes pour OpenID4VC (Credential Issuance)
 */
class OpenID4VCRouter {
  constructor(keyManager) {
    this.signer = new CredentialSigner(keyManager);
    this.router = null;
  }

  /**
   * Crée les routes OpenID4VC
   */
  getRouter() {
    const router = express.Router();
    
    // Credential endpoint - Émettre un credential unique
    router.post('/credential', (req, res) => {
      try {
        const timestamp = new Date().toLocaleString('fr-FR', {
          year: 'numeric',
          month: '2-digit',
          day: '2-digit',
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
          millisecond: '3-digit'
        });

        const { credential_configuration_id: credential_type, subject, ...credentialData } = req.body;

        console.log(`\n📋 [${timestamp}] /credential endpoint called`);
        console.log(`   • credential_type: ${credential_type}`);
        console.log(`   • subject: ${subject || 'N/A'}`);
        console.log(`   • credentialData keys: ${Object.keys(credentialData).join(', ') || 'none'}`);
        console.log(`   • Full payload: ${JSON.stringify(req.body)}`);

        // Valider le type de credential
        const supportedTypes = ['custom_credential', 'eu.europa.ec.eudi.pid.1'];
        if (!supportedTypes.includes(credential_type)) {
          console.log(`   ❌ Unsupported credential type: ${credential_type}`);
          return res.status(400).json({
            error: 'unsupported_credential_type',
            error_description: `Credential type '${credential_type}' is not supported`,
          });
        }

        console.log(`   ✓ Credential type validated`);

        // Créer et signer le credential
        const signedCredential = this.signer.signCredential(
          { subject, ...credentialData },
          credential_type
        );

        const cNonce = Math.random().toString(36).substring(7);

        console.log(`   ✓ Credential signed`);
        console.log(`   • Signed credential (first 50 chars): ${signedCredential}...`);
        console.log(`   • Credential format: jwt_vc_json`);
        console.log(`   • c_nonce generated: ${cNonce}`);
        console.log(`   • c_nonce_expires_in: 300`);
        console.log(`   ✅ Credential issued successfully\n`);

        // Réponse OpenID4VC
        res.json({
          credential: signedCredential,
          credential_format: 'jwt_vc_json',
          c_nonce: cNonce,
          c_nonce_expires_in: 300,
        });
      } catch (error) {
        console.error('❌ Erreur lors de l\'émission du credential:', error);
        res.status(500).json({
          error: 'credential_issuance_failed',
          error_description: error.message,
        });
      }
    });

    // Batch credential endpoint - Émettre plusieurs credentials
    router.post('/batch_credential', (req, res) => {
      try {
        const { credentials: credentialRequests } = req.body;

        if (!Array.isArray(credentialRequests)) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'credentials must be an array',
          });
        }

        const signedCredentials = credentialRequests.map(credReq => {
          const { credential_type, subject, ...data } = credReq;
          return this.signer.signCredential(
            { subject, ...data },
            credential_type || 'custom_credential'
          );
        });

        res.json({
          credentials: signedCredentials,
          credential_format: 'jwt_vc_json',
          c_nonce: Math.random().toString(36).substring(7),
          c_nonce_expires_in: 300,
        });
      } catch (error) {
        console.error('❌ Erreur lors de l\'émission batch:', error);
        res.status(500).json({
          error: 'batch_issuance_failed',
          error_description: error.message,
        });
      }
    });

    // Deferred credential endpoint - Pour les credentials asynchrones
    router.post('/deferred_credential', (req, res) => {
      try {
        const { acceptance_token } = req.body;

        if (!acceptance_token) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'acceptance_token is required',
          });
        }

        // Simuler une vérification du token
        // En production, il faudrait vérifier le token et récupérer l'état du credential
        const signedCredential = this.signer.signCredential(
          { subject: 'user123' },
          'custom_credential'
        );

        res.json({
          credential: signedCredential,
          credential_format: 'jwt_vc_json',
        });
      } catch (error) {
        console.error('❌ Erreur pour credential différé:', error);
        res.status(500).json({
          error: 'deferred_issuance_failed',
          error_description: error.message,
        });
      }
    });

    // Notification endpoint - Recevoir des notifications
    router.post('/notification', (req, res) => {
      try {
        const { credential_id, status } = req.body;

        console.log(`📬 Notification reçue: credential ${credential_id} - ${status}`);

        res.json({
          status: 'acknowledged',
          message: 'Notification received',
        });
      } catch (error) {
        console.error('❌ Erreur lors du traitement de la notification:', error);
        res.status(500).json({
          error: 'notification_failed',
          error_description: error.message,
        });
      }
    });

    // Vérifier un credential (endpoint utilitaire)
    router.post('/verify_credential', (req, res) => {
      try {
        const { credential } = req.body;

        if (!credential) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'credential is required',
          });
        }

        const verified = this.signer.verifyCredential(credential);

        if (verified) {
          res.json({
            valid: true,
            credential: verified,
          });
        } else {
          res.status(401).json({
            valid: false,
            error: 'credential_verification_failed',
          });
        }
      } catch (error) {
        console.error('❌ Erreur de vérification:', error);
        res.status(500).json({
          error: 'verification_failed',
          error_description: error.message,
        });
      }
    });

    return router;
  }
}

module.exports = OpenID4VCRouter;
