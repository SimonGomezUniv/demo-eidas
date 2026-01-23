#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { createCanvas } = require('canvas');

// Créer le répertoire public s'il n'existe pas
const publicDir = path.join(__dirname, 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// Logo 1: Custom Credential Logo
function createCustomLogo() {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Cercle de fond gradient
  const gradient = ctx.createRadialGradient(100, 100, 20, 100, 100, 100);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(100, 100, 95, 0, Math.PI * 2);
  ctx.fill();
  
  // Cadenas (symbole de credential)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(80, 90, 40, 50);
  ctx.beginPath();
  ctx.arc(100, 90, 15, 0, Math.PI, true);
  ctx.fill();
  
  // Trou du cadenas
  ctx.fillStyle = '#667eea';
  ctx.fillRect(95, 110, 10, 20);
  
  // Border
  ctx.strokeStyle = '#764ba2';
  ctx.lineWidth = 3;
  ctx.stroke();
  
  return canvas;
}

// Logo 2: EIDAS PID Logo
function createEiadasLogo() {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Fond de la carte d'identité
  ctx.fillStyle = '#1a5490';
  ctx.fillRect(40, 50, 120, 100);
  
  // Bande or
  ctx.fillStyle = '#ffd700';
  ctx.fillRect(40, 50, 120, 15);
  
  // Cercle (photo)
  ctx.fillStyle = '#e8e8e8';
  ctx.beginPath();
  ctx.arc(100, 90, 25, 0, Math.PI * 2);
  ctx.fill();
  
  // Contour du cercle
  ctx.strokeStyle = '#1a5490';
  ctx.lineWidth = 2;
  ctx.stroke();
  
  // Texte
  ctx.fillStyle = '#1a5490';
  ctx.font = 'bold 12px Arial';
  ctx.textAlign = 'center';
  ctx.fillText('EU', 100, 150);
  
  return canvas;
}

// Logo 3: Issuer Logo
function createIssuerLogo() {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Cercle de fond
  const gradient = ctx.createRadialGradient(100, 100, 20, 100, 100, 100);
  gradient.addColorStop(0, '#38ada9');
  gradient.addColorStop(1, '#2a7a72');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(100, 100, 95, 0, Math.PI * 2);
  ctx.fill();
  
  // Seau (issuer/émetteur)
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(75, 95, 50, 55);
  ctx.beginPath();
  ctx.ellipse(100, 95, 25, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  
  // Poignée
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(100, 75, 25, 0, Math.PI);
  ctx.stroke();
  
  return canvas;
}

// Logo 4: Verifier Logo
function createVerifierLogo() {
  const canvas = createCanvas(200, 200);
  const ctx = canvas.getContext('2d');
  
  // Fond blanc
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, 200, 200);
  
  // Cercle de fond
  const gradient = ctx.createRadialGradient(100, 100, 20, 100, 100, 100);
  gradient.addColorStop(0, '#ee5a6f');
  gradient.addColorStop(1, '#d63447');
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.arc(100, 100, 95, 0, Math.PI * 2);
  ctx.fill();
  
  // Loupe (verifier/vérificateur)
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.arc(85, 95, 28, 0, Math.PI * 2);
  ctx.stroke();
  
  // Manche
  ctx.beginPath();
  ctx.moveTo(110, 120);
  ctx.lineTo(135, 145);
  ctx.stroke();
  
  return canvas;
}

// Générer les logos
console.log('📝 Génération des logos...\n');

try {
  // Custom Logo
  let canvas = createCustomLogo();
  let buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
  console.log('✅ logo.png créé (Custom Credential)');
  
  // EIDAS Logo
  canvas = createEiadasLogo();
  buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'eidas-logo.png'), buffer);
  console.log('✅ eidas-logo.png créé (EIDAS PID)');
  
  // Issuer Logo
  canvas = createIssuerLogo();
  buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'issuer-logo.png'), buffer);
  console.log('✅ issuer-logo.png créé (Issuer)');
  
  // Verifier Logo
  canvas = createVerifierLogo();
  buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(path.join(publicDir, 'verifier-logo.png'), buffer);
  console.log('✅ verifier-logo.png créé (Verifier)');
  
  console.log('\n✅ Tous les logos ont été générés avec succès !');
  console.log('📍 Emplacements:');
  console.log('   - public/logo.png');
  console.log('   - public/eidas-logo.png');
  console.log('   - public/issuer-logo.png');
  console.log('   - public/verifier-logo.png');
  
} catch (error) {
  console.error('❌ Erreur lors de la génération des logos:', error);
  process.exit(1);
}
