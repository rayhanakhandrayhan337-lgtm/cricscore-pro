// Firebase Configuration for CricScore Pro
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword, 
  signOut, 
  updatePassword, 
  updateProfile,
  onAuthStateChanged,
  User as FirebaseUser
} from 'firebase/auth';
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  deleteDoc, 
  query, 
  where, 
  updateDoc,
  serverTimestamp
} from 'firebase/firestore';

// Your Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyBAIOYP5G8GrmhnXOVwckuYxIBNVXJC2BE",
  authDomain: "cricscore-pro-ddd2e.firebaseapp.com",
  projectId: "cricscore-pro-ddd2e",
  storageBucket: "cricscore-pro-ddd2e.firebasestorage.app",
  messagingSenderId: "437477314295",
  appId: "1:437477314295:web:82b760d308dd651e060df2",
  measurementId: "G-JVVRD1HT22"
};

// Initialize Firebase
let app: any = null;
let auth: any = null;
let db: any = null;
let firebaseAvailable = false;

try {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getFirestore(app);
  firebaseAvailable = true;
  console.log('✅ Firebase initialized successfully');
} catch (error) {
  console.warn('⚠️ Firebase initialization failed, using local storage only:', error);
}

export { auth, db, firebaseAvailable };

// ============= AUTH FUNCTIONS =============

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

export function onAuthChange(callback: (user: FirebaseUser | null) => void) {
  if (!auth) return () => {};
  return onAuthStateChanged(auth, callback);
}

// ============= MATCH FUNCTIONS =============

export async function saveMatchToFirebase(match: any) {
  if (!db || !firebaseAvailable) return;
  try {
    const matchData = {
      ...match,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'matches', match.id), matchData);
    console.log('✅ Match saved to Firebase:', match.id);
  } catch (error) {
    console.warn('⚠️ Failed to save match to Firebase:', error);
  }
}

export async function deleteMatchFromFirebase(matchId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    await deleteDoc(doc(db, 'matches', matchId));
    console.log('✅ Match deleted from Firebase:', matchId);
  } catch (error) {
    console.warn('⚠️ Failed to delete match from Firebase:', error);
  }
}

export async function getMatchesFromFirebase(userId: string): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const q = query(collection(db, 'matches'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('⚠️ Failed to get matches from Firebase:', error);
    return [];
  }
}

export async function getAllMatchesFromFirebase(): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const snapshot = await getDocs(collection(db, 'matches'));
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('⚠️ Failed to get all matches from Firebase:', error);
    return [];
  }
}

// ============= USER FUNCTIONS =============

export async function saveUserToFirebase(user: any) {
  if (!db || !firebaseAvailable) return;
  try {
    const userData = {
      ...user,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'users', user.id), userData);
    console.log('✅ User saved to Firebase:', user.id);
  } catch (error) {
    console.warn('⚠️ Failed to save user to Firebase:', error);
  }
}

export async function deleteUserFromFirebase(userId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    await deleteDoc(doc(db, 'users', userId));
    console.log('✅ User deleted from Firebase:', userId);
  } catch (error) {
    console.warn('⚠️ Failed to delete user from Firebase:', error);
  }
}

export async function getAllUsersFromFirebase(): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const snapshot = await getDocs(collection(db, 'users'));
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('⚠️ Failed to get users from Firebase:', error);
    return [];
  }
}

export async function getUserFromFirebase(userId: string): Promise<any> {
  if (!db || !firebaseAvailable) return null;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error) {
    console.warn('⚠️ Failed to get user from Firebase:', error);
    return null;
  }
}

// ============= LEAGUE FUNCTIONS =============

export async function saveLeagueToFirebase(league: any) {
  if (!db || !firebaseAvailable) return;
  try {
    const leagueData = {
      ...league,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'leagues', league.id), leagueData);
    console.log('✅ League saved to Firebase:', league.id);
  } catch (error) {
    console.warn('⚠️ Failed to save league to Firebase:', error);
  }
}

export async function deleteLeagueFromFirebase(leagueId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    await deleteDoc(doc(db, 'leagues', leagueId));
    console.log('✅ League deleted from Firebase:', leagueId);
  } catch (error) {
    console.warn('⚠️ Failed to delete league from Firebase:', error);
  }
}

export async function getLeaguesFromFirebase(userId: string): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const q = query(collection(db, 'leagues'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error) {
    console.warn('⚠️ Failed to get leagues from Firebase:', error);
    return [];
  }
}

// ============= SYNC FUNCTIONS =============

// Sync all local data to Firebase
export async function syncAllDataToFirebase(userId: string) {
  if (!firebaseAvailable) {
    console.log('⚠️ Firebase not available, skipping sync');
    return;
  }

  try {
    // Sync matches
    const localMatches = JSON.parse(localStorage.getItem('cric_matches') || '[]');
    const userMatches = localMatches.filter((m: any) => m.userId === userId);
    for (const match of userMatches) {
      await saveMatchToFirebase(match);
    }
    console.log(`✅ Synced ${userMatches.length} matches to Firebase`);

    // Sync leagues
    const localLeagues = JSON.parse(localStorage.getItem('cric_leagues') || '[]');
    const userLeagues = localLeagues.filter((l: any) => l.userId === userId);
    for (const league of userLeagues) {
      await saveLeagueToFirebase(league);
    }
    console.log(`✅ Synced ${userLeagues.length} leagues to Firebase`);

    // Sync user
    const localUsers = JSON.parse(localStorage.getItem('cric_users') || '[]');
    const user = localUsers.find((u: any) => u.id === userId);
    if (user) {
      await saveUserToFirebase(user);
      console.log('✅ Synced user to Firebase');
    }
  } catch (error) {
    console.warn('⚠️ Failed to sync data to Firebase:', error);
  }
}

// Load all data from Firebase to local storage
export async function loadAllDataFromFirebase(userId: string) {
  if (!firebaseAvailable) {
    console.log('⚠️ Firebase not available, skipping load');
    return;
  }

  try {
    // Load matches
    const firebaseMatches = await getMatchesFromFirebase(userId);
    if (firebaseMatches.length > 0) {
      const localMatches = JSON.parse(localStorage.getItem('cric_matches') || '[]');
      const mergedMatches = [...localMatches];
      
      for (const fMatch of firebaseMatches) {
        const existingIdx = mergedMatches.findIndex((m: any) => m.id === fMatch.id);
        if (existingIdx >= 0) {
          mergedMatches[existingIdx] = fMatch;
        } else {
          mergedMatches.push(fMatch);
        }
      }
      
      localStorage.setItem('cric_matches', JSON.stringify(mergedMatches));
      console.log(`✅ Loaded ${firebaseMatches.length} matches from Firebase`);
    }

    // Load leagues
    const firebaseLeagues = await getLeaguesFromFirebase(userId);
    if (firebaseLeagues.length > 0) {
      const localLeagues = JSON.parse(localStorage.getItem('cric_leagues') || '[]');
      const mergedLeagues = [...localLeagues];
      
      for (const fLeague of firebaseLeagues) {
        const existingIdx = mergedLeagues.findIndex((l: any) => l.id === fLeague.id);
        if (existingIdx >= 0) {
          mergedLeagues[existingIdx] = fLeague;
        } else {
          mergedLeagues.push(fLeague);
        }
      }
      
      localStorage.setItem('cric_leagues', JSON.stringify(mergedLeagues));
      console.log(`✅ Loaded ${firebaseLeagues.length} leagues from Firebase`);
    }
  } catch (error) {
    console.warn('⚠️ Failed to load data from Firebase:', error);
  }
}

// Check Firebase connection status
export function getFirebaseStatus(): { connected: boolean; projectId: string } {
  return {
    connected: firebaseAvailable,
    projectId: firebaseConfig.projectId
  };
}
