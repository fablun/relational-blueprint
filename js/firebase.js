// ============================================================
// FIREBASE INIT — Singleton
// ============================================================
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth }       from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore }  from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';
import FIREBASE_CONFIG   from '../firebase-config.js';

const app  = initializeApp(FIREBASE_CONFIG);
export const auth = getAuth(app);
export const db   = getFirestore(app);
