const express = require('express');
const { v4: uuidv4 } = require('uuid');
const CredentialSigner = require('../lib/credentialSigner');
const config = require('../config');

/**
 * Routes pour OpenID4VP (Verifiable Presentation)
 */
class OpenID4VPRouter {
  constructor(keyManager) {
    this.signer = new CredentialSigner(keyManager);
    this.requestObjects = new Map(); // Stockage des request objects
    this.presentationResponses = new Map(); // Stockage des réponses de présentation
    this.cleanupInterval = setInterval(() => this.cleanup(), 60000); // Nettoyage toutes les minutes
  }

  /**
   * Nettoie les request objects expirés
   */
  cleanup() {
    const now = Math.floor(Date.now() / 1000);
    let cleaned = 0;

    for (const [id, data] of this.requestObjects.entries()) {
      if (data.exp < now) {
        this.requestObjects.delete(id);
        cleaned++;
      }
    }

    for (const [id, data] of this.presentationResponses.entries()) {
      if (data.expiredAt < Date.now()) {
        this.presentationResponses.delete(id);
        cleaned++;
      }
    }

    if (cleaned > 0) {
      console.log(`🧹 Nettoyage OpenID4VP: ${cleaned} objets expirés supprimés`);
    }
  }

  /**
   * Crée les routes OpenID4VP
   */
  getRouter() {
    const router = express.Router();

    /**
     * 1. Request Object Endpoint
     * POST /request_object
     * Génère une request de présentation que le wallet devra satisfaire
     */
    router.post('/request_object', (req, res) => {
      try {
        const {
          input_descriptors,
          state,
          nonce,
          redirect_uri,
          client_id,
        } = req.body;

        // Générer la request
        const requestObject = this.signer.generatePresentationRequest({
          inputDescriptors: input_descriptors,
          state: state || uuidv4(),
          nonce: nonce || uuidv4(),
          redirectUri: redirect_uri,
          clientId: client_id,
        });

        // Stocker la request pour validation ultérieure
        this.requestObjects.set(requestObject.request_id, {
          ...requestObject,
          createdAt: Date.now(),
          expiredAt: Date.now() + (10 * 60 * 1000), // 10 minutes
        });

        console.log(`✅ Request object créé: ${requestObject.request_id}`);

        res.json({
          request_id: requestObject.request_id,
          request_object_uri: `${config.verifierUrl}/request_object/${requestObject.request_id}`,
          expires_in: 600,
          request_format: 'jwt_vc_json',
        });
      } catch (error) {
        console.error('❌ Erreur lors de la création de la request:', error);
        res.status(500).json({
          error: 'request_creation_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * 2. Get Request Object
     * GET /request_object/:requestId
     * Récupère le détail d'une request de présentation
     */
    router.get('/request_object/:requestId', (req, res) => {
      try {
        const { requestId } = req.params;

        const requestObject = this.requestObjects.get(requestId);

        if (!requestObject) {
          return res.status(404).json({
            error: 'request_not_found',
            error_description: `Request object '${requestId}' not found`,
          });
        }

        // Vérifier l'expiration
        if (requestObject.expiredAt < Date.now()) {
          this.requestObjects.delete(requestId);
          return res.status(410).json({
            error: 'request_expired',
            error_description: 'This request object has expired',
          });
        }

        res.json({
          request_id: requestObject.request_id,
          client_id: requestObject.client_id,
          redirect_uri: requestObject.redirect_uri,
          response_type: requestObject.response_type,
          presentation_definition: requestObject.presentation_definition,
          state: requestObject.state,
          nonce: requestObject.nonce,
          iat: requestObject.iat,
          exp: requestObject.exp,
        });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération de la request:', error);
        res.status(500).json({
          error: 'request_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * 3. Presentation Endpoint
     * POST /presentation
     * Reçoit et vérifie une présentation vérifiable
     */
    router.post('/presentation', (req, res) => {
      try {
        const {
          vp_token,
          presentation_submission,
          state,
          request_id,
        } = req.body;

        if (!vp_token) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'vp_token is required',
          });
        }

        console.log(`🔍 Vérification de présentation reçue...`);

        // 1. Vérifier la présentation
        const verificationResult = this.signer.verifyPresentation(vp_token);

        if (!verificationResult.valid) {
          console.error('❌ Présentation invalide:', verificationResult.errors);
          return res.status(400).json({
            error: 'invalid_presentation',
            error_description: 'Presentation verification failed',
            errors: verificationResult.errors,
          });
        }

        console.log(`✅ Présentation valide`);

        // 2. Vérifier la request associée si fournie
        if (request_id) {
          const requestObject = this.requestObjects.get(request_id);
          if (!requestObject) {
            return res.status(400).json({
              error: 'invalid_request',
              error_description: `Request object '${request_id}' not found or expired`,
            });
          }

          // Vérifier le state
          if (state && state !== requestObject.state) {
            return res.status(400).json({
              error: 'invalid_state',
              error_description: 'State parameter does not match',
            });
          }
        }

        // 3. Valider les claims si des requirements ont été spécifiées
        const claimsValidation = this.signer.validatePresentationClaims(
          verificationResult.data,
          req.body.requirements || {}
        );

        if (!claimsValidation.valid) {
          console.error('❌ Validation des claims échouée:', claimsValidation);
          return res.status(400).json({
            error: 'claims_validation_failed',
            error_description: 'Required claims are missing or invalid',
            missing_claims: claimsValidation.missingClaims,
            invalid_claims: claimsValidation.invalidClaims,
          });
        }

        console.log(`✅ Validation des claims réussie`);

        // 4. Générer une réponse d'authentification
        const responseId = uuidv4();
        const authResponse = {
          id: responseId,
          status: 'success',
          verified: true,
          presentation: verificationResult.data,
          credentials: verificationResult.data.credentials || [],
          timestamp: new Date().toISOString(),
          redirect_uri: request_id ? this.requestObjects.get(request_id).redirect_uri : undefined,
        };

        // Stocker la réponse
        this.presentationResponses.set(responseId, {
          ...authResponse,
          createdAt: Date.now(),
          expiredAt: Date.now() + (60 * 60 * 1000), // 1 heure
        });

        console.log(`✅ Présentation vérifiée avec succès: ${responseId}`);

        res.json({
          success: true,
          message: 'Presentation verified successfully',
          response_id: responseId,
          verification_result: {
            valid: true,
            credential_count: verificationResult.data.credentials?.length || 0,
            issuer: verificationResult.data.iss,
            audience: verificationResult.data.aud,
            issued_at: new Date(verificationResult.data.iat * 1000).toISOString(),
            expires_at: new Date(verificationResult.data.exp * 1000).toISOString(),
          },
        });
      } catch (error) {
        console.error('❌ Erreur lors de la vérification de la présentation:', error);
        res.status(500).json({
          error: 'presentation_verification_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * 4. Get Verification Result
     * GET /presentation/:responseId
     * Récupère le résultat d'une vérification de présentation
     */
    router.get('/presentation/:responseId', (req, res) => {
      try {
        const { responseId } = req.params;

        const response = this.presentationResponses.get(responseId);

        if (!response) {
          return res.status(404).json({
            error: 'response_not_found',
            error_description: `Verification response '${responseId}' not found`,
          });
        }

        // Vérifier l'expiration
        if (response.expiredAt < Date.now()) {
          this.presentationResponses.delete(responseId);
          return res.status(410).json({
            error: 'response_expired',
            error_description: 'This verification response has expired',
          });
        }

        res.json({
          id: response.id,
          status: response.status,
          verified: response.verified,
          timestamp: response.timestamp,
          credential_count: response.credentials.length,
          credentials_info: response.credentials.map(cred => ({
            type: cred.credentialType,
            subject: cred.subject,
            issued_at: new Date(cred.iat * 1000).toISOString(),
            expires_at: new Date(cred.exp * 1000).toISOString(),
          })),
        });
      } catch (error) {
        console.error('❌ Erreur lors de la récupération du résultat:', error);
        res.status(500).json({
          error: 'response_retrieval_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * 5. Verify Presentation (Utility endpoint)
     * POST /verify
     * Endpoint utilitaire pour vérifier une présentation avec requirements
     */
    router.post('/verify', (req, res) => {
      try {
        const { vp_token, requirements } = req.body;

        if (!vp_token) {
          return res.status(400).json({
            error: 'invalid_request',
            error_description: 'vp_token is required',
          });
        }

        // Vérifier la présentation
        const verificationResult = this.signer.verifyPresentation(vp_token);

        if (!verificationResult.valid) {
          return res.status(400).json({
            valid: false,
            errors: verificationResult.errors,
          });
        }

        // Valider les claims
        let claimsValidation = { valid: true };
        if (requirements) {
          claimsValidation = this.signer.validatePresentationClaims(
            verificationResult.data,
            requirements
          );
        }

        res.json({
          valid: verificationResult.valid && claimsValidation.valid,
          presentation: {
            issuer: verificationResult.data.iss,
            audience: verificationResult.data.aud,
            issued_at: new Date(verificationResult.data.iat * 1000).toISOString(),
            expires_at: new Date(verificationResult.data.exp * 1000).toISOString(),
            credentials: verificationResult.data.credentials,
          },
          claims_validation: claimsValidation,
          errors: [...verificationResult.errors, ...claimsValidation.missingClaims],
        });
      } catch (error) {
        console.error('❌ Erreur lors de la vérification:', error);
        res.status(500).json({
          error: 'verification_failed',
          error_description: error.message,
        });
      }
    });

    /**
     * 6. Stats Endpoint
     * GET /stats
     * Statistiques sur les vérifications et requests
     */
    router.get('/stats', (req, res) => {
      res.json({
        pending_requests: this.requestObjects.size,
        verification_responses: this.presentationResponses.size,
        uptime_seconds: process.uptime(),
        endpoints: [
          'POST /request_object - Créer une request de présentation',
          'GET /request_object/:id - Récupérer une request',
          'POST /presentation - Vérifier une présentation',
          'GET /presentation/:id - Récupérer un résultat de vérification',
          'POST /verify - Vérifier une présentation avec requirements',
          'GET /stats - Statistiques',
        ],
      });
    });

    return router;
  }
}

module.exports = OpenID4VPRouter;
