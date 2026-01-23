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
    authorization_servers: [config.issuerUrl],
    token_endpoint: `${config.baseUrl}/token`,
    credential_endpoint: `${config.baseUrl}/credential`,
    batch_credential_endpoint: `${config.baseUrl}/batch_credential`,
    deferred_credential_endpoint: `${config.baseUrl}/deferred_credential`,
    notification_endpoint: `${config.baseUrl}/notification`,
    credentials_supported: [
      {
        id: 'mso_mdoc',
        format: 'mso_mdoc',
        doctype: 'org.iso.18013.5.1.mDL',
        cryptographic_binding_methods_supported: ['cose_key'],
        credential_signing_alg_values_supported: ['ES256'],
        proof_types_supported: {
          urn_ietf_params_oauth_proof_type_attestation: {
            proof_signing_alg_values_supported: ['ES256']
          }
        },
        display: [
          {
            name: 'Mobile Driving License',
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/logo.svg`,
              alt_text: 'mDL Logo'
            }
          }
        ]
      },
      {
        id: 'eudi_pid_sd_jwt',
        format: 'vc+sd-jwt',
        scope: 'eu.europa.ec.eudi.pid.1',
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
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/eidas-logo.svg`,
              alt_text: 'EIDAS PID Logo'
            }
          }
        ]
      },
      {
        id: 'dc_sd_jwt',
        format: 'dc+sd-jwt',
        scope: 'eu.europa.ec.eudi.diploma',
        cryptographic_binding_methods_supported: ['jwk'],
        credential_signing_alg_values_supported: ['ES256'],
        proof_types_supported: {
          jwt: {
            proof_signing_alg_values_supported: ['ES256']
          }
        },
        display: [
          {
            name: 'Digital Credential',
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/diploma-logo.svg`,
              alt_text: 'Digital Credential Logo'
            }
          }
        ]
      }
    ],
    dpop_signing_alg_values_supported: ['ES256', 'ES384', 'ES512', 'RS256'],
    
    // Display properties
    display: [
      {
        name: 'EIDAS Credential Issuer',
        locale: 'en-US',
        logo: {
          url: `${config.baseUrl}/issuer-logo.svg`,
          alt_text: 'EIDAS Issuer Logo'
        }
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
    userinfo_endpoint: `${config.baseUrl}/userinfo`,
    jwks_uri: `${config.baseUrl}/.well-known/jwks.json`,
    scopes_supported: [
      'openid',
      'profile',
      'email',
      'custom_credential',
      'eu.europa.ec.eudi.pid'
    ],
    response_types_supported: ['code', 'id_token', 'token', 'code id_token'],
    response_modes_supported: ['query', 'fragment', 'form_post'],
    grant_types_supported: ['authorization_code', 'implicit', 'refresh_token'],
    token_endpoint_auth_methods_supported: ['client_secret_basic', 'client_secret_post', 'none'],
    code_challenge_methods_supported: ['S256', 'plain'],
    claim_types_supported: ['normal'],
    claims_supported: [
      'sub',
      'iss',
      'aud',
      'exp',
      'iat',
      'custom_data',
      'family_name',
      'given_name',
      'birth_date',
      'age_over_18'
    ]
  };

  res.json(authServerConfig);
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
