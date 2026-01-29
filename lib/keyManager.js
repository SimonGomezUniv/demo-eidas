const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Gère les clés EC (P-256) et RSA pour la signature des credentials et JWTs
 * Support OpenID4VP avec signatures ES256
 */
class KeyManager {
  constructor() {
    this.keysDir = path.join(__dirname, '..', 'keys');
    
    // Clés EC pour OpenID4VP (ES256)
    this.ecPublicKeyPath = path.join(this.keysDir, 'ec-public.pem');
    this.ecPrivateKeyPath = path.join(this.keysDir, 'ec-private.pem');
    
    // Clés RSA pour les credentials (RS256)
    this.rsaPublicKeyPath = path.join(this.keysDir, 'rsa-public.pem');
    this.rsaPrivateKeyPath = path.join(this.keysDir, 'rsa-private.pem');
    
    // Assurer que le répertoire des clés existe
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }

    // Charger ou générer les clés
    this.loadOrGenerateKeys();
  }

  loadOrGenerateKeys() {
    // Charger ou générer les clés EC
    if (fs.existsSync(this.ecPublicKeyPath) && fs.existsSync(this.ecPrivateKeyPath)) {
      this.ecPublicKey = fs.readFileSync(this.ecPublicKeyPath, 'utf8');
      this.ecPrivateKey = fs.readFileSync(this.ecPrivateKeyPath, 'utf8');
      console.log('✅ Clés EC (P-256) chargées depuis le disque');
    } else {
      this.generateECKeys();
    }

    // Charger ou générer les clés RSA
    if (fs.existsSync(this.rsaPublicKeyPath) && fs.existsSync(this.rsaPrivateKeyPath)) {
      this.rsaPublicKey = fs.readFileSync(this.rsaPublicKeyPath, 'utf8');
      this.rsaPrivateKey = fs.readFileSync(this.rsaPrivateKeyPath, 'utf8');
      console.log('✅ Clés RSA chargées depuis le disque');
    } else {
      this.generateRSAKeys();
    }
  }

  generateECKeys() {
    console.log('🔐 Génération des clés EC (P-256)...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1', // P-256 / secp256r1
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(this.ecPublicKeyPath, publicKey);
    fs.writeFileSync(this.ecPrivateKeyPath, privateKey);

    this.ecPublicKey = publicKey;
    this.ecPrivateKey = privateKey;
    console.log('✅ Clés EC générées et sauvegardées');
  }

  generateRSAKeys() {
    console.log('🔐 Génération des clés RSA...');
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem',
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem',
      },
    });

    fs.writeFileSync(this.rsaPublicKeyPath, publicKey);
    fs.writeFileSync(this.rsaPrivateKeyPath, privateKey);

    this.rsaPublicKey = publicKey;
    this.rsaPrivateKey = privateKey;
    console.log('✅ Clés RSA générées et sauvegardées');
  }

  // Clés EC (pour OpenID4VP JWT)
  getECPublicKey() {
    return this.ecPublicKey;
  }

  getECPrivateKey() {
    return this.ecPrivateKey;
  }

  // Clés RSA (pour credentials)
  getPublicKey() {
    return this.rsaPublicKey;
  }

  getPrivateKey() {
    return this.rsaPrivateKey;
  }

  /**
   * Obtenir la clé publique EC au format JWK
   */
  getECPublicKeyAsJWK() {
    const key = crypto.createPublicKey({
      key: this.ecPublicKey,
      format: 'pem',
    });

    const keyData = key.export({ format: 'jwk' });

    return {
      kty: keyData.kty,
      crv: keyData.crv,
      x: keyData.x,
      y: keyData.y,
      kid: 'ec-key-1',
      use: 'enc',
      alg: 'ECDH-ES',
    };
  }

  /**
   * Obtenir la clé publique RSA au format JWK
   */
  getPublicKeyAsJWK() {
    const key = crypto.createPublicKey({
      key: this.rsaPublicKey,
      format: 'pem',
    });

    const keyData = key.export({ format: 'jwk' });

    return {
      kty: keyData.kty,
      kid: 'rsa-key-1',
      use: 'sig',
      alg: 'RS256',
      n: keyData.n,
      e: keyData.e,
    };
  }

  /**
   * Obtenir la configuration JWKS avec toutes les clés publiques
   */
  getJWKSConfig() {
    return {
      keys: [
        this.getECPublicKeyAsJWK(),
        this.getPublicKeyAsJWK(),
      ],
    };
  }
}

module.exports = KeyManager;
