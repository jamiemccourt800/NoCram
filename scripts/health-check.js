#!/usr/bin/env node

/**
 * Health check script for production deployment
 * Run: node scripts/health-check.js
 */

const https = require('https');
const http = require('http');

const API_URL = process.env.API_URL || 'http://localhost:4000';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

async function checkEndpoint(url, name) {
  return new Promise((resolve) => {
    const protocol = url.startsWith('https') ? https : http;
    
    const request = protocol.get(url, (res) => {
      if (res.statusCode === 200) {
        console.log(`✅ ${name}: OK (${res.statusCode})`);
        resolve(true);
      } else {
        console.log(`⚠️  ${name}: Unexpected status (${res.statusCode})`);
        resolve(false);
      }
    });

    request.on('error', (error) => {
      console.log(`❌ ${name}: FAILED - ${error.message}`);
      resolve(false);
    });

    request.setTimeout(10000, () => {
      console.log(`❌ ${name}: TIMEOUT`);
      request.destroy();
      resolve(false);
    });
  });
}

async function healthCheck() {
  console.log('\n🏥 NoCram Health Check');
  console.log('='.repeat(50));
  console.log(`API URL: ${API_URL}`);
  console.log(`Frontend URL: ${FRONTEND_URL}`);
  console.log('='.repeat(50) + '\n');

  const results = [];

  // Check backend health endpoint
  console.log('Checking backend...');
  results.push(await checkEndpoint(`${API_URL}/health`, 'Backend Health'));

  // Check backend API auth endpoint
  results.push(await checkEndpoint(`${API_URL}/api/auth/me`, 'Backend API (expects 401)'));

  // Check frontend
  console.log('\nChecking frontend...');
  results.push(await checkEndpoint(FRONTEND_URL, 'Frontend'));

  // Check manifest
  results.push(await checkEndpoint(`${FRONTEND_URL}/manifest.json`, 'PWA Manifest'));

  console.log('\n' + '='.repeat(50));
  const passed = results.filter(r => r).length;
  const total = results.length;
  
  if (passed === total) {
    console.log(`✅ All checks passed! (${passed}/${total})`);
    console.log('='.repeat(50) + '\n');
    process.exit(0);
  } else {
    console.log(`⚠️  Some checks failed (${passed}/${total} passed)`);
    console.log('='.repeat(50) + '\n');
    process.exit(1);
  }
}

healthCheck();
