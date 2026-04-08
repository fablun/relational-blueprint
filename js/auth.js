// ============================================================
// AUTH MODULE — Google + Email/Password
// ============================================================
import { auth } from './firebase.js';
import {
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut,
  onAuthStateChanged,
  sendPasswordResetEmail
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getUserProfile, createUserProfile } from './db.js';

let currentUser = undefined;   // undefined = non ancora noto; null = noto, non loggato
let currentProfile = null;
const authListeners = [];

export function onAuthChange(callback) {
  authListeners.push(callback);
  if (currentUser !== undefined) callback(currentUser, currentProfile);
}

export function getCurrentUser()    { return currentUser; }
export function getCurrentProfile() { return currentProfile; }

export function initAuth(lang) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    try {
      if (user) {
        let profile = await getUserProfile(user.uid);
        if (!profile) {
          await createUserProfile(user.uid, {
            displayName: user.displayName || user.email.split('@')[0],
            email: user.email,
            photoURL: user.photoURL || '',
            lang
          });
          profile = await getUserProfile(user.uid);
        }
        currentProfile = profile;
      } else {
        currentProfile = null;
      }
    } catch (err) {
      console.error('[auth] initAuth error:', err);
      currentProfile = null;
    } finally {
      authListeners.forEach(cb => cb(currentUser, currentProfile));
    }
  });
}

// ── Google ────────────────────────────────────────────────

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user' &&
        err.code !== 'auth/cancelled-popup-request') throw err;
  }
}

// ── Email / Password ──────────────────────────────────────

export async function signInEmail(email, password) {
  await signInWithEmailAndPassword(auth, email, password);
}

export async function signUpEmail(email, password, displayName) {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    await updateProfile(credential.user, { displayName });
  }
}

export async function resetPassword(email) {
  await sendPasswordResetEmail(auth, email);
}

// ── Sign out ──────────────────────────────────────────────

export async function signOutUser() {
  await signOut(auth);
}

export async function refreshProfile() {
  if (!currentUser) return null;
  currentProfile = await getUserProfile(currentUser.uid);
  return currentProfile;
}
