require('dotenv').config();

module.exports = {
  port: process.env.PORT || 3000,
  baseUrl: process.env.BASE_URL || 'http://localhost:3000',
  issuerUrl: process.env.ISSUER_URL || 'http://localhost:3000',
  jwtSecret: process.env.JWT_SECRET || 'your-super-secret-key',
  did: process.env.DID || 'did:example:issuer123',
  walletUrl: process.env.WALLET_URL || 'http://localhost:4000',
  nodeEnv: process.env.NODE_ENV || 'development'
};
