const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

/**
 * Gère les clés RSA pour la signature des credentials
 * Génère ou charge les clés depuis le disque
 */
class KeyManager {
  constructor() {
    this.keysDir = path.join(__dirname, '..', 'keys');
    this.publicKeyPath = path.join(this.keysDir, 'public.pem');
    this.privateKeyPath = path.join(this.keysDir, 'private.pem');
    
    // Assurer que le répertoire des clés existe
    if (!fs.existsSync(this.keysDir)) {
      fs.mkdirSync(this.keysDir, { recursive: true });
    }

    // Charger ou générer les clés
    this.loadOrGenerateKeys();
  }

  loadOrGenerateKeys() {
    // Essayer de charger les clés existantes
    if (fs.existsSync(this.publicKeyPath) && fs.existsSync(this.privateKeyPath)) {
      this.publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');
      this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
      console.log('✅ Clés RSA chargées depuis le disque');
    } else {
      // Générer de nouvelles clés
      this.generateKeys();
    }
  }

  generateKeys() {
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

    // Sauvegarder les clés
    fs.writeFileSync(this.publicKeyPath, publicKey);
    fs.writeFileSync(this.privateKeyPath, privateKey);

    this.publicKey = publicKey;
    this.privateKey = privateKey;
    console.log('✅ Clés RSA générées et sauvegardées');
  }

  getPublicKey() {
    return this.publicKey;
  }

  getPrivateKey() {
    return this.privateKey;
  }

  // Extraire la clé publique en format JWKS
  getPublicKeyAsJWK() {
    const key = crypto.createPublicKey({
      key: this.publicKey,
      format: 'pem',
    });

    const keyData = key.export({ format: 'jwk' });

    return {
      ...keyData,
      kid: 'key-1',
      use: 'sig',
      alg: 'RS256',
    };
  }

  // Extraire le modulus et exponent pour JWKS
  getJWKSConfig() {
    const jwk = this.getPublicKeyAsJWK();
    return {
      keys: [
        {
          kty: jwk.kty,
          use: jwk.use,
          kid: jwk.kid,
          n: jwk.n,
          e: jwk.e,
          alg: jwk.alg,
        },
      ],
    };
  }
}

module.exports = KeyManager;
