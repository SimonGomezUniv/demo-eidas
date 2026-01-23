const http = require('http');

console.log('📡 Envoi de requêtes de test...\n');

// Test 1: GET /
const req1 = http.request({
  hostname: 'localhost',
  port: 3000,
  path: '/',
  method: 'GET'
}, (res) => {
  res.on('data', () => {});
  res.on('end', () => console.log('✅ GET / terminée'));
});
req1.on('error', (e) => console.error('❌ Erreur:', e.message));
req1.end();

// Test 2: GET /stats
setTimeout(() => {
  const req2 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/stats',
    method: 'GET'
  }, (res) => {
    res.on('data', () => {});
    res.on('end', () => console.log('✅ GET /stats terminée'));
  });
  req2.on('error', (e) => console.error('❌ Erreur:', e.message));
  req2.end();
}, 500);

// Test 3: POST /verify (JSON)
setTimeout(() => {
  const postData = JSON.stringify({ test: 'data' });
  const req3 = http.request({
    hostname: 'localhost',
    port: 3000,
    path: '/verify',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (res) => {
    res.on('data', () => {});
    res.on('end', () => console.log('✅ POST /verify terminée'));
  });
  req3.on('error', (e) => console.error('❌ Erreur:', e.message));
  req3.write(postData);
  req3.end();
}, 1000);
