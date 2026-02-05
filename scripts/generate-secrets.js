#!/usr/bin/env node

/**
 * Generate secure random secrets for production deployment
 * Run: node scripts/generate-secrets.js
 */

const crypto = require('crypto');

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString('hex');
}

console.log('\n===========================================');
console.log('🔐 Production Secrets Generator');
console.log('===========================================\n');

console.log('Copy these values to your .env.production file:\n');

console.log('# JWT Authentication');
console.log(`JWT_SECRET=${generateSecret(64)}`);
console.log(`REFRESH_TOKEN_SECRET=${generateSecret(64)}`);

console.log('\n# Session Secret (if using express-session)');
console.log(`SESSION_SECRET=${generateSecret(32)}`);

console.log('\n# API Keys (if needed)');
console.log(`API_KEY=${generateSecret(32)}`);

console.log('\n===========================================');
console.log('⚠️  IMPORTANT SECURITY NOTES:');
console.log('===========================================');
console.log('1. Never commit these secrets to Git');
console.log('2. Use different secrets for each environment');
console.log('3. Rotate secrets regularly (every 90 days)');
console.log('4. Store backups securely (password manager)');
console.log('5. Revoke old secrets after rotation');
console.log('===========================================\n');
