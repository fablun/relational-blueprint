// ============================================================
// AUTH MODULE — Google & GitHub sign-in
// ============================================================
import { auth } from './firebase.js';
import {
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getUserProfile, createUserProfile } from './db.js';

let currentUser = null;
let currentProfile = null;
const authListeners = [];

export function onAuthChange(callback) {
  authListeners.push(callback);
  // Fire immediately if already known
  if (currentUser !== undefined) callback(currentUser, currentProfile);
}

export function getCurrentUser()    { return currentUser; }
export function getCurrentProfile() { return currentProfile; }

// Internal: called once on app init
export function initAuth(lang) {
  onAuthStateChanged(auth, async (user) => {
    currentUser = user;
    if (user) {
      let profile = await getUserProfile(user.uid);
      if (!profile) {
        await createUserProfile(user.uid, {
          displayName: user.displayName,
          email: user.email,
          photoURL: user.photoURL,
          lang
        });
        profile = await getUserProfile(user.uid);
      }
      currentProfile = profile;
    } else {
      currentProfile = null;
    }
    authListeners.forEach(cb => cb(currentUser, currentProfile));
  });
}

export async function signInGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') throw err;
  }
}

export async function signInGithub() {
  const provider = new GithubAuthProvider();
  try {
    await signInWithPopup(auth, provider);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') throw err;
  }
}

export async function signOutUser() {
  await signOut(auth);
}

export async function refreshProfile() {
  if (!currentUser) return null;
  currentProfile = await getUserProfile(currentUser.uid);
  return currentProfile;
}
