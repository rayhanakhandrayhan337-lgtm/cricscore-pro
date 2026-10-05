import { initializeApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, updatePassword, updateProfile, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, getDoc, getDocs, deleteDoc, query, where, onSnapshot } from 'firebase/firestore';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDemoKeyForCricScorePro",
  authDomain: "cricscore-pro.firebaseapp.com",
  projectId: "cricscore-pro",
  storageBucket: "cricscore-pro.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};

// Initialize Firebase
let app: any = null;
let auth: any = null;
let db: any = null;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
} catch (error) {
  console.warn('Firebase initialization failed, using local storage only:', error);
}

export { auth, db };

// Firebase Auth Functions
export async function firebaseSignup(email: string, password: string, name: string) {
  if (!auth) throw new Error('Firebase not available');
  const userCredential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(userCredential.user, { displayName: name });
  return userCredential.user;
}

export async function firebaseLogin(email: string, password: string) {
  if (!auth) throw new Error('Firebase not available');
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  return userCredential.user;
}

export async function firebaseLogout() {
  if (!auth) throw new Error('Firebase not available');
  await signOut(auth);
}

export async function firebaseUpdatePassword(newPassword: string) {
  if (!auth || !auth.currentUser) throw new Error('No user logged in');
  await updatePassword(auth.currentUser, newPassword);
}

export async function firebaseUpdateProfile(name: string, photoURL?: string) {
  if (!auth || !auth.currentUser) throw new Error('No user logged in');
  await updateProfile(auth.currentUser, { displayName: name, photoURL });
}

// Firestore Functions
export async function saveMatchToFirebase(match: any) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'matches', match.id), match);
  } catch (error) {
    console.warn('Failed to save match to Firebase:', error);
  }
}

export async function deleteMatchFromFirebase(matchId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'matches', matchId));
  } catch (error) {
    console.warn('Failed to delete match from Firebase:', error);
  }
}

export async function getMatchesFromFirebase(userId: string) {
  if (!db) return [];
  try {
    const q = query(collection(db, 'matches'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('Failed to get matches from Firebase:', error);
    return [];
  }
}

export async function saveUserToFirebase(user: any) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'users', user.id), user);
  } catch (error) {
    console.warn('Failed to save user to Firebase:', error);
  }
}

export async function deleteUserFromFirebase(userId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'users', userId));
  } catch (error) {
    console.warn('Failed to delete user from Firebase:', error);
  }
}

export async function getAllUsersFromFirebase() {
  if (!db) return [];
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('Failed to get users from Firebase:', error);
    return [];
  }
}

export async function saveLeagueToFirebase(league: any) {
  if (!db) return;
  try {
    await setDoc(doc(db, 'leagues', league.id), league);
  } catch (error) {
    console.warn('Failed to save league to Firebase:', error);
  }
}

export async function deleteLeagueFromFirebase(leagueId: string) {
  if (!db) return;
  try {
    await deleteDoc(doc(db, 'leagues', leagueId));
  } catch (error) {
    console.warn('Failed to delete league from Firebase:', error);
  }
}
