// Build script — genera firebase-config.js dalle env vars di Vercel
// Eseguito automaticamente da Vercel prima del deploy (vercel-build)
const fs = require('fs');

const required = [
  'FIREBASE_API_KEY',
  'FIREBASE_AUTH_DOMAIN',
  'FIREBASE_PROJECT_ID',
  'FIREBASE_STORAGE_BUCKET',
  'FIREBASE_MESSAGING_SENDER_ID',
  'FIREBASE_APP_ID'
];

const missing = required.filter(k => !process.env[k]);
if (missing.length) {
  console.error('❌ Variabili di ambiente mancanti:', missing.join(', '));
  process.exit(1);
}

const content = `// Auto-generato da build.js — non modificare manualmente
const FIREBASE_CONFIG = {
  apiKey:            "${process.env.FIREBASE_API_KEY}",
  authDomain:        "${process.env.FIREBASE_AUTH_DOMAIN}",
  projectId:         "${process.env.FIREBASE_PROJECT_ID}",
  storageBucket:     "${process.env.FIREBASE_STORAGE_BUCKET}",
  messagingSenderId: "${process.env.FIREBASE_MESSAGING_SENDER_ID}",
  appId:             "${process.env.FIREBASE_APP_ID}"
};

export default FIREBASE_CONFIG;
`;

fs.writeFileSync('firebase-config.js', content);
console.log('✅ firebase-config.js generato correttamente');
