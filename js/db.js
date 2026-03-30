// ============================================================
// DATABASE SERVICE — Firestore CRUD
// ============================================================
import { db } from './firebase.js';
import {
  doc, getDoc, setDoc, updateDoc,
  collection, query, where, getDocs,
  serverTimestamp
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

// ── User Profile ──────────────────────────────────────────

export async function getUserProfile(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  return snap.exists() ? snap.data() : null;
}

export async function createUserProfile(uid, data) {
  const partnerCode = generatePartnerCode();
  await setDoc(doc(db, 'users', uid), {
    uid,
    displayName: data.displayName || '',
    email: data.email || '',
    photoURL: data.photoURL || '',
    partnerCode,
    partnerId: null,
    testResults: {},
    manualGenerated: false,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lang: data.lang || 'it'
  });
  return partnerCode;
}

export async function updateUserProfile(uid, updates) {
  await updateDoc(doc(db, 'users', uid), {
    ...updates,
    updatedAt: serverTimestamp()
  });
}

// ── Test Results ──────────────────────────────────────────

export async function saveTestResult(uid, testId, result) {
  const ref = doc(db, 'users', uid);
  await updateDoc(ref, {
    [`testResults.${testId}`]: {
      ...result,
      completedAt: serverTimestamp()
    },
    updatedAt: serverTimestamp()
  });
}

export async function getTestResults(uid) {
  const snap = await getDoc(doc(db, 'users', uid));
  if (!snap.exists()) return {};
  return snap.data().testResults || {};
}

// ── Partner Pairing ───────────────────────────────────────

export async function findUserByPartnerCode(code) {
  const q = query(
    collection(db, 'users'),
    where('partnerCode', '==', code.toUpperCase().trim())
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  return { uid: snap.docs[0].id, ...snap.docs[0].data() };
}

export async function linkPartners(myUid, partnerUid) {
  const batch = [
    updateDoc(doc(db, 'users', myUid),    { partnerId: partnerUid, updatedAt: serverTimestamp() }),
    updateDoc(doc(db, 'users', partnerUid), { partnerId: myUid,    updatedAt: serverTimestamp() })
  ];
  await Promise.all(batch);

  // Create/update couple document
  const coupleId = [myUid, partnerUid].sort().join('_');
  await setDoc(doc(db, 'couples', coupleId), {
    users: [myUid, partnerUid],
    linkedAt: serverTimestamp()
  }, { merge: true });

  return coupleId;
}

export async function unlinkPartner(myUid, partnerUid) {
  await Promise.all([
    updateDoc(doc(db, 'users', myUid),    { partnerId: null, updatedAt: serverTimestamp() }),
    updateDoc(doc(db, 'users', partnerUid), { partnerId: null, updatedAt: serverTimestamp() })
  ]);
}

export async function getPartnerProfile(partnerUid) {
  return getUserProfile(partnerUid);
}

// ── Utilities ─────────────────────────────────────────────

function generatePartnerCode() {
  // 6-char alphanumeric, no confusing chars (0,O,I,1)
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
