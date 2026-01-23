const express = require('express');
const router = express.Router();
const config = require('../config');

/**
 * Well-Known Configuration for OpenID4VC
 * Conform to: https://openid.net/specs/openid-4-verifiable-credential-issuance-1_0.html
 */
router.get('/.well-known/openid-credential-issuer', (req, res) => {
  const wellKnownConfig = {
    credential_issuer: config.issuerUrl,
    authorization_servers: [config.issuerUrl],
    credential_endpoint: `${config.baseUrl}/credential`,
    batch_credential_endpoint: `${config.baseUrl}/batch_credential`,
    deferred_credential_endpoint: `${config.baseUrl}/deferred_credential`,
    notification_endpoint: `${config.baseUrl}/notification`,
    
    // Supported credential formats
    credential_configurations_supported: {
      // Custom credential type
      'custom_credential': {
        format: 'jwt_vc_json',
        scope: 'custom_credential',
        credential_definition: {
          type: ['VerifiableCredential', 'CustomCredential'],
          credentialSubject: {
            type: 'object',
            properties: {
              customData: {
                type: 'string',
                description: 'Custom data field'
              }
            },
            required: ['customData']
          }
        },
        proof_types_supported: ['jwt'],
        display: [
          {
            name: 'Custom Credential',
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/logo.png`,
              alt_text: 'Custom Credential Logo'
            }
          }
        ]
      },

      // PID (Person Identification Data) - EIDAS format
      'eu.europa.ec.eudi.pid.1': {
        format: 'jwt_vc_json',
        scope: 'eu.europa.ec.eudi.pid',
        credential_definition: {
          type: ['VerifiableCredential', 'PersonIdentificationData'],
          credentialSubject: {
            type: 'object',
            properties: {
              family_name: { type: 'string' },
              given_name: { type: 'string' },
              birth_date: { type: 'string' },
              age_over_18: { type: 'boolean' },
              age_over_21: { type: 'boolean' }
            },
            required: ['family_name', 'given_name']
          }
        },
        proof_types_supported: ['jwt'],
        display: [
          {
            name: 'Person Identification Data',
            locale: 'en-US',
            logo: {
              url: `${config.baseUrl}/eidas-logo.png`,
              alt_text: 'EIDAS PID Logo'
            }
          }
        ]
      }
    },

    // Display properties
    display: [
      {
        name: 'EIDAS Credential Issuer',
        locale: 'en-US',
        logo: {
          url: `${config.baseUrl}/issuer-logo.png`,
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
      logo_uri: `${config.baseUrl}/verifier-logo.png`,
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
  const jwksConfig = {
    keys: [
      {
        kty: 'RSA',
        use: 'sig',
        kid: 'key-1',
        n: 'xGOr-H0A-6_BOXMq83kU...',
        e: 'AQAB',
        alg: 'RS256'
      }
    ]
  };

  res.json(jwksConfig);
});

module.exports = router;
