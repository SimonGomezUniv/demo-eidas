const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
const config = require('../config');

/**
 * Gère la création et la signature des credentials
 */
class CredentialSigner {
  constructor(keyManager) {
    this.keyManager = keyManager;
  }

  /**
   * Crée et signe un credential JWT
   * @param {Object} credentialData - Données du credential
   * @param {string} credentialType - Type de credential
   * @returns {string} Credential JWT signé
   */
  signCredential(credentialData, credentialType = 'custom_credential') {
    const now = Math.floor(Date.now() / 1000);
    const expiryTime = now + (365 * 24 * 60 * 60); // 1 an

    // En-têtes du JWT
    const header = {
      alg: 'RS256',
      typ: 'JWT',
      kid: 'key-1',
    };

    // Payload du JWT - format Verifiable Credential
    const payload = {
      iss: config.issuerUrl,
      sub: credentialData.subject || uuidv4(),
      aud: credentialData.audience || config.walletUrl,
      iat: now,
      exp: expiryTime,
      jti: uuidv4(), // Unique credential ID

      // Structure Verifiable Credential
      vc: {
        '@context': [
          'https://www.w3.org/2018/credentials/v1',
          'https://www.w3.org/2018/credentials/examples/v1',
        ],
        type: this.getCredentialTypes(credentialType),
        credentialSubject: this.getCredentialSubject(credentialData, credentialType),

        // Métadonnées
        name: this.getCredentialName(credentialType),
        description: this.getCredentialDescription(credentialType),
      },

      // Données supplémentaires
      credential_type: credentialType,
    };

    // Signer le JWT
    const token = jwt.sign(payload, this.keyManager.getPrivateKey(), {
      algorithm: 'RS256',
      header,
      noTimestamp: false,
    });

    return token;
  }

  /**
   * Obtient les types pour le credential selon son type
   */
  getCredentialTypes(credentialType) {
    switch (credentialType) {
      case 'eu.europa.ec.eudi.pid.1':
        return ['VerifiableCredential', 'PersonIdentificationData'];
      case 'custom_credential':
      default:
        return ['VerifiableCredential', 'CustomCredential'];
    }
  }

  /**
   * Extrait le sujet du credential
   */
  getCredentialSubject(credentialData, credentialType) {
    const subject = {
      id: credentialData.subject || uuidv4(),
    };

    switch (credentialType) {
      case 'eu.europa.ec.eudi.pid.1':
        // PID EIDAS
        return {
          ...subject,
          family_name: credentialData.family_name,
          given_name: credentialData.given_name,
          birth_date: credentialData.birth_date,
          age_over_18: credentialData.age_over_18 || true,
          age_over_21: credentialData.age_over_21 || false,
          nationality: credentialData.nationality || 'FR',
        };

      case 'custom_credential':
      default:
        // Credential personnalisé
        return {
          ...subject,
          customData: credentialData.customData || 'No data provided',
          department: credentialData.department,
          role: credentialData.role,
        };
    }
  }

  /**
   * Obtient le nom du credential
   */
  getCredentialName(credentialType) {
    const names = {
      'eu.europa.ec.eudi.pid.1': 'Person Identification Data (PID)',
      'custom_credential': 'Custom Credential',
    };
    return names[credentialType] || 'Unknown Credential';
  }

  /**
   * Obtient la description du credential
   */
  getCredentialDescription(credentialType) {
    const descriptions = {
      'eu.europa.ec.eudi.pid.1': 'EIDAS Person Identification Data issued according to the European Digital Identity Regulation',
      'custom_credential': 'Custom verifiable credential for demonstration purposes',
    };
    return descriptions[credentialType] || 'Verifiable Credential';
  }

  /**
   * Vérifie la signature d'un credential JWT
   * @param {string} token - Token JWT
   * @returns {Object} Payload décodé si valide, null sinon
   */
  verifyCredential(token) {
    try {
      const decoded = jwt.verify(token, this.keyManager.getPublicKey(), {
        algorithms: ['RS256'],
      });
      return decoded;
    } catch (error) {
      console.error('❌ Erreur de vérification du credential:', error.message);
      return null;
    }
  }

  /**
   * Crée une présentation vérifiable (Verifiable Presentation)
   */
  createPresentation(credentials, audience) {
    const now = Math.floor(Date.now() / 1000);

    const payload = {
      iss: config.issuerUrl,
      aud: audience || config.walletUrl,
      iat: now,
      exp: now + (60 * 60), // 1 heure
      jti: uuidv4(),

      vp: {
        '@context': 'https://www.w3.org/2018/credentials/v1',
        type: 'VerifiablePresentation',
        verifiableCredential: credentials,
      },
    };

    const token = jwt.sign(payload, this.keyManager.getPrivateKey(), {
      algorithm: 'RS256',
      header: {
        alg: 'RS256',
        typ: 'JWT',
        kid: 'key-1',
      },
    });

    return token;
  }

  /**
   * Crée une réponse d'authentification avec credential
   */
  createAuthResponse(credential, state, redirectUri) {
    return {
      state,
      redirect_uri: redirectUri,
      credential,
      credential_format: 'jwt_vc_json',
      expires_in: 3600,
    };
  }

  /**
   * Vérifie une présentation vérifiable (Verifiable Presentation)
   * @param {string} vpToken - Token JWT de la présentation
   * @returns {Object} Résultat de la vérification { valid, data, errors }
   */
  verifyPresentation(vpToken) {
    const result = {
      valid: false,
      data: null,
      errors: [],
    };

    try {
      // 1. Vérifier et décoder le JWT de la présentation
      const vpPayload = jwt.verify(vpToken, this.keyManager.getPublicKey(), {
        algorithms: ['RS256'],
      });

      result.data = vpPayload;

      // 2. Vérifier la structure de la présentation
      if (!vpPayload.vp || vpPayload.vp.type !== 'VerifiablePresentation') {
        result.errors.push('Invalid presentation structure: missing or incorrect vp.type');
        return result;
      }

      // 3. Vérifier l'expiration
      const now = Math.floor(Date.now() / 1000);
      if (vpPayload.exp && vpPayload.exp < now) {
        result.errors.push(`Presentation has expired (exp: ${vpPayload.exp}, now: ${now})`);
        return result;
      }

      // 4. Vérifier les credentials contenus dans la présentation
      const credentials = vpPayload.vp.verifiableCredential || [];
      
      if (!Array.isArray(credentials) || credentials.length === 0) {
        result.errors.push('Presentation must contain at least one credential');
        return result;
      }

      const credentialVerifications = [];
      
      for (const credentialToken of credentials) {
        const credVerification = this.verifyCredential(credentialToken);
        
        if (!credVerification) {
          result.errors.push(`Invalid credential signature in presentation`);
          return result;
        }

        // Vérifier l'expiration du credential
        if (credVerification.exp && credVerification.exp < now) {
          result.errors.push(`Credential expired (exp: ${credVerification.exp}, now: ${now})`);
          return result;
        }

        credentialVerifications.push({
          valid: true,
          credentialType: credVerification.credential_type,
          subject: credVerification.sub,
          iat: credVerification.iat,
          exp: credVerification.exp,
        });
      }

      // 5. Si tous les credentials sont valides, marquer la présentation comme valide
      if (result.errors.length === 0) {
        result.valid = true;
        result.data.credentials = credentialVerifications;
      }

    } catch (error) {
      if (error.name === 'TokenExpiredError') {
        result.errors.push(`Token expired at ${new Date(error.expiredAt).toISOString()}`);
      } else if (error.name === 'JsonWebTokenError') {
        result.errors.push(`Invalid token signature: ${error.message}`);
      } else {
        result.errors.push(`Verification failed: ${error.message}`);
      }
    }

    return result;
  }

  /**
   * Valide les claims d'une présentation selon les requirements
   * @param {Object} vpPayload - Payload décodu de la présentation
   * @param {Object} requirements - Requirements à vérifier
   * @returns {Object} Résultat de la validation
   */
  validatePresentationClaims(vpPayload, requirements = {}) {
    const result = {
      valid: true,
      missingClaims: [],
      invalidClaims: [],
    };

    // Vérifier les claims requis
    const requiredClaims = requirements.requiredClaims || [];
    
    for (const claim of requiredClaims) {
      const credentials = vpPayload.vp?.verifiableCredential || [];
      let claimFound = false;

      for (const credentialToken of credentials) {
        try {
          const credPayload = jwt.decode(credentialToken);
          const subject = credPayload?.vc?.credentialSubject;

          if (subject && claim in subject) {
            claimFound = true;
            break;
          }
        } catch (e) {
          // Continue checking other credentials
        }
      }

      if (!claimFound) {
        result.missingClaims.push(claim);
        result.valid = false;
      }
    }

    // Vérifier les claims avec des values spécifiques
    const claimConstraints = requirements.claimConstraints || {};

    for (const [claim, expectedValue] of Object.entries(claimConstraints)) {
      const credentials = vpPayload.vp?.verifiableCredential || [];
      let claimValid = false;

      for (const credentialToken of credentials) {
        try {
          const credPayload = jwt.decode(credentialToken);
          const subject = credPayload?.vc?.credentialSubject;

          if (subject && subject[claim] === expectedValue) {
            claimValid = true;
            break;
          }
        } catch (e) {
          // Continue checking other credentials
        }
      }

      if (!claimValid) {
        result.invalidClaims.push({
          claim,
          expected: expectedValue,
        });
        result.valid = false;
      }
    }

    return result;
  }

  /**
   * Génère un request object pour demander une présentation
   * @param {Object} options - Options de configuration
   * @returns {Object} Request object
   */
  generatePresentationRequest(options = {}) {
    const requestId = uuidv4();
    const now = Math.floor(Date.now() / 1000);

    return {
      request_id: requestId,
      client_id: options.clientId || config.verifierUrl,
      redirect_uri: options.redirectUri || `${config.verifierUrl}/callback`,
      response_type: 'vp_token',
      presentation_definition: {
        id: 'presentation-def-' + requestId,
        input_descriptors: options.inputDescriptors || [
          {
            id: 'credential-1',
            name: 'Required Credential',
            purpose: 'Please provide a verifiable credential',
            format: {
              jwt_vc_json: {
                alg: ['RS256'],
              },
            },
            constraints: {
              fields: [
                {
                  path: ['$.vc.credentialSubject'],
                  purpose: 'Verification of credential subject',
                },
              ],
            },
          },
        ],
      },
      iat: now,
      exp: now + 600, // 10 minutes
      state: options.state || uuidv4(),
      nonce: options.nonce || uuidv4(),
    };
  }
}

module.exports = CredentialSigner;
