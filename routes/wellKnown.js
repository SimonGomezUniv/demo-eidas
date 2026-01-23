const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * Middleware pour injecter le keyManager
 */
function attachKeyManager(keyManager) {
  return (req, res, next) => {
    req.keyManager = keyManager;
    next();
  };
}

/**
 * Crée les routes well-known avec le keyManager
 */
function createWellKnownRoutes(keyManager) {
  const router = express.Router();

  // Ajouter le middleware
  router.use(attachKeyManager(keyManager));

/**
 * Well-Known Configuration for OpenID4VC
 * Conform to: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
 */
router.get('/.well-known/openid-credential-issuer', (req, res) => {
  const wellKnownConfig = {
    credential_issuer: config.issuerUrl,
    credential_endpoint: `${config.baseUrl}/credential`,
    batch_credential_endpoint: `${config.baseUrl}/batch_credential`,
    deferred_credential_endpoint: `${config.baseUrl}/deferred_credential`,
    notification_endpoint: `${config.baseUrl}/notification`,
    token_endpoint: `${config.baseUrl}/token`,

    credential_configurations_supported: {
      custom_credential: {
        scope: "custom_credential",
        format: 'vc+sd-jwt',
        claims: {
              "given_name": { "mandatory": true },
              "family_name": { "mandatory": false }
            },
        cryptographic_binding_methods_supported: ['jwk'],
        credential_signing_alg_values_supported: ['ES256'],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ['ES256']
          }
        },
        display: [
          {
            name: 'Custom Credential',
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/logo.svg`,
              alt_text: 'Custom Credential Logo'
            }
          },
          {
            name: 'Identifiant Personnalisé',
            locale: 'fr-FR',
            logo: {
              url: `${config.baseUrl}/logo.svg`,
              alt_text: 'Logo Identifiant Personnalisé'
            }
          }
        ]
      },

      'eu.europa.ec.eudi.pid.1': {
        format: 'vc+sd-jwt',
        cryptographic_binding_methods_supported: ['jwk'],
        credential_signing_alg_values_supported: ['ES256'],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ['ES256']
          }
        },
        display: [
          {
            name: 'EUDI PID',
            locale: 'en-US'
          },
          {
            name: 'Identité Numérique Européenne',
            locale: 'fr-FR'
          }
        ]
      }
    },

    display: [
      {
        name: 'EIDAS Credential Issuer',
        locale: 'en-US'
      },
      {
        name: 'Émetteur de Justificatifs EIDAS',
        locale: 'fr-FR'
      }
    ]
  };

  res.json(wellKnownConfig);
});

/**
 * Well-Known Configuration for OpenID4VP (Verifier)
 * Conform to: https://openid.net/specs/openid-4-verifiable-presentations-1_0.html
 */
router.get('/.well-known/openid-verifier', (req, res) => {
  const verifierConfig = {
    verifier: config.issuerUrl,
    authorization_servers: [config.issuerUrl],
    request_object_endpoint: `${config.baseUrl}/request_object`,
    
    // Supported VP formats
    vp_formats_supported: {
      jwt_vp: {
        alg_values_supported: ['ES256', 'RS256']
      },
      ldp_vp: {
        proof_type: ['JsonWebSignature2020', 'EcdsaSecp256k1Signature2019']
      }
    },

    // Client metadata
    client_metadata: {
      client_id: config.issuerUrl,
      client_name: 'EIDAS Verifier',
      logo_uri: `${config.baseUrl}/verifier-logo.svg`,
      contacts: ['support@example.com']
    },

    // Display properties
    display: [
      {
        name: 'EIDAS Verifier',
        locale: 'en-US'
      }
    ]
  };

  res.json(verifierConfig);
});

/**
 * OAuth2 Authorization Server Well-Known Configuration
 * This endpoint is required for OpenID Connect discovery
 */
router.get('/.well-known/oauth-authorization-server', (req, res) => {
  const authServerConfig = {
    issuer: config.issuerUrl,
    authorization_endpoint: `${config.baseUrl}/authorize`,
    token_endpoint: `${config.baseUrl}/token`,

    jwks_uri: `${config.baseUrl}/.well-known/jwks.json`,

    grant_types_supported: [
      'authorization_code',
      'urn:ietf:params:oauth:grant-type:pre-authorized_code'
    ],

    response_types_supported: ['code'],
    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],

    dpop_signing_alg_values_supported: ['ES256'],

    pre_authorized_grant_anonymous_access_supported: true
  };

  res.json(authServerConfig);
});

/**
 * OpenID Connect Well-Known Configuration
 * Required by wallets during discovery, even for pre-authorized flows
 */
router.get('/.well-known/openid-configuration', (req, res) => {
  const oidcConfig = {
    issuer: config.issuerUrl,

    authorization_endpoint: `${config.baseUrl}/authorize`,
    token_endpoint: `${config.baseUrl}/token`,
    jwks_uri: `${config.baseUrl}/.well-known/jwks.json`,

    response_types_supported: ['code'],
    subject_types_supported: ['public'],
    id_token_signing_alg_values_supported: ['ES256'],

    grant_types_supported: [
      'authorization_code',
      'urn:ietf:params:oauth:grant-type:pre-authorized_code'
    ],

    code_challenge_methods_supported: ['S256'],
    token_endpoint_auth_methods_supported: ['none'],

    dpop_signing_alg_values_supported: ['ES256']
  };

  res.json(oidcConfig);
});


/**
 * JWKS (JSON Web Key Set) endpoint
 * Used for verifying signatures
 */
router.get('/.well-known/jwks.json', (req, res) => {
  const jwksConfig = req.keyManager.getJWKSConfig();
  res.json(jwksConfig);
});

  return router;
}

module.exports = createWellKnownRoutes;
