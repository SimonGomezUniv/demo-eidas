#!/usr/bin/env node

/**
 * Script de test pour les credentials signés JWT
 * Teste l'émission et la vérification de credentials
 */

const axios = require('axios');

const API_URL = 'http://localhost:3000';

async function testCredentialIssuance() {
  console.log('\n🧪 Test d\'émission de Credentials JWT signés\n');
  console.log('='.repeat(70));

  try {
    // Test 1: Émettre un Custom Credential
    console.log('\n1️⃣  Émission d\'un Custom Credential...');
    const customResponse = await axios.post(`${API_URL}/credential`, {
      credential_type: 'custom_credential',
      subject: 'user:demo@example.com',
      customData: 'Données de test personnalisées',
      department: 'Engineering',
      role: 'Developer'
    });

    const customToken = customResponse.data.credential;
    console.log('✅ Credential émis!');
    console.log('   Format:', customResponse.data.credential_format);
    console.log('   C-Nonce:', customResponse.data.c_nonce);
    console.log('   JWT Token (truncated):', customToken.substring(0, 50) + '...');

    // Décoder le JWT pour voir le payload
    const parts = customToken.split('.');
    const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
    console.log('\n   📋 Payload du JWT:');
    console.log('      - iss:', payload.iss);
    console.log('      - sub:', payload.sub);
    console.log('      - credential_type:', payload.credential_type);
    console.log('      - vc.type:', payload.vc.type);
    console.log('      - vc.credentialSubject:', JSON.stringify(payload.vc.credentialSubject, null, 6));

    // Test 2: Émettre un PID EIDAS
    console.log('\n\n2️⃣  Émission d\'un PID EIDAS...');
    const pidResponse = await axios.post(`${API_URL}/credential`, {
      credential_type: 'eu.europa.ec.eudi.pid.1',
      subject: 'user:fr/person123',
      family_name: 'Dupont',
      given_name: 'Jean',
      birth_date: '1990-01-15',
      age_over_18: true,
      age_over_21: true,
      nationality: 'FR'
    });

    const pidToken = pidResponse.data.credential;
    console.log('✅ PID EIDAS émis!');
    console.log('   Format:', pidResponse.data.credential_format);

    const pidParts = pidToken.split('.');
    const pidPayload = JSON.parse(Buffer.from(pidParts[1], 'base64').toString());
    console.log('\n   📋 Payload du JWT:');
    console.log('      - iss:', pidPayload.iss);
    console.log('      - sub:', pidPayload.sub);
    console.log('      - credential_type:', pidPayload.credential_type);
    console.log('      - vc.type:', pidPayload.vc.type);
    console.log('      - vc.credentialSubject:', JSON.stringify(pidPayload.vc.credentialSubject, null, 6));

    // Test 3: Émettre plusieurs credentials en batch
    console.log('\n\n3️⃣  Émission de plusieurs credentials (Batch)...');
    const batchResponse = await axios.post(`${API_URL}/batch_credential`, {
      credentials: [
        {
          credential_type: 'custom_credential',
          subject: 'user1',
          customData: 'Credential 1'
        },
        {
          credential_type: 'custom_credential',
          subject: 'user2',
          customData: 'Credential 2'
        }
      ]
    });

    console.log('✅ Batch émis!');
    console.log(`   Nombre de credentials: ${batchResponse.data.credentials.length}`);

    // Test 4: Vérifier un credential
    console.log('\n\n4️⃣  Vérification d\'un credential...');
    const verifyResponse = await axios.post(`${API_URL}/verify_credential`, {
      credential: customToken
    });

    if (verifyResponse.data.valid) {
      console.log('✅ Credential valide!');
      console.log('   JWT validé avec succès (signature RS256 correcte)');
      console.log('   Payload vérifié:', verifyResponse.data.credential.credential_type);
    } else {
      console.log('❌ Credential invalide!');
    }

    // Test 5: Récupérer la config JWKS
    console.log('\n\n5️⃣  Récupération de la clé publique (JWKS)...');
    const jwksResponse = await axios.get(`${API_URL}/.well-known/jwks.json`);
    const jwks = jwksResponse.data;
    console.log('✅ JWKS récupéré!');
    console.log(`   Nombre de clés: ${jwks.keys.length}`);
    console.log(`   Première clé:`);
    console.log(`      - kty: ${jwks.keys[0].kty}`);
    console.log(`      - alg: ${jwks.keys[0].alg}`);
    console.log(`      - kid: ${jwks.keys[0].kid}`);
    console.log(`      - use: ${jwks.keys[0].use}`);

    console.log('\n' + '='.repeat(70));
    console.log('\n✅ Tous les tests réussis!\n');
    console.log('🎉 Les credentials sont maintenant signés avec JWT RS256 et peuvent');
    console.log('   être validés contre la clé publique disponible au endpoint JWKS.\n');

  } catch (error) {
    console.error('\n❌ Erreur complète:', error);
    if (error.response) {
      console.error('Status:', error.response.status);
      console.error('Data:', error.response.data);
    } else if (error.request) {
      console.error('No response received:', error.request);
    } else {
      console.error('Error message:', error.message);
    }
    process.exit(1);
  }
}

// Lancer les tests
testCredentialIssuance();
