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
  console.log('📊 Project ID:', firebaseConfig.projectId);
} catch (error) {
  console.error('❌ Firebase initialization failed:', error);
  firebaseAvailable = false;
}

export { auth, db, firebaseAvailable };

// ============= AUTH FUNCTIONS =============

export async function firebaseSignup(email: string, password: string, name: string) {
  if (!auth) {
    console.error('❌ Firebase Auth not available');
    throw new Error('Firebase not available');
  }
  try {
    console.log('🔄 Creating Firebase Auth user:', email);
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    console.log('✅ Firebase Auth user created:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Firebase signup error:', error.message);
    throw error;
  }
}

export async function firebaseLogin(email: string, password: string) {
  if (!auth) {
    console.error('❌ Firebase Auth not available');
    throw new Error('Firebase not available');
  }
  try {
    console.log('🔄 Logging in to Firebase Auth:', email);
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    console.log('✅ Firebase Auth login successful:', userCredential.user.uid);
    return userCredential.user;
  } catch (error: any) {
    console.error('❌ Firebase login error:', error.message);
    throw error;
  }
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

// ============= USER FUNCTIONS - CRITICAL FOR FIRESTORE =============

export async function saveUserToFirebase(user: any) {
  if (!db || !firebaseAvailable) {
    console.error('❌ Firestore not available');
    return;
  }
  try {
    console.log('🔄 Saving user to Firestore:', user.id, user.email);
    const userData = {
      id: user.id,
      email: user.email,
      name: user.name,
      isAdmin: user.isAdmin || false,
      profileImage: user.profileImage || null,
      createdAt: user.createdAt || new Date().toISOString(),
      updatedAt: serverTimestamp()
    };
    
    const userDocRef = doc(db, 'users', user.id);
    await setDoc(userDocRef, userData, { merge: true });
    console.log('✅ User saved to Firestore successfully:', user.id);
    console.log('📁 Collection: users, Document:', user.id);
  } catch (error: any) {
    console.error('❌ Failed to save user to Firestore:', error.message);
    console.error('Error details:', error);
    throw error;
  }
}

export async function deleteUserFromFirebase(userId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    console.log('🔄 Deleting user from Firestore:', userId);
    await deleteDoc(doc(db, 'users', userId));
    console.log('✅ User deleted from Firestore:', userId);
  } catch (error: any) {
    console.error('❌ Failed to delete user from Firestore:', error.message);
  }
}

export async function getAllUsersFromFirebase(): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    console.log('🔄 Fetching all users from Firestore');
    const snapshot = await getDocs(collection(db, 'users'));
    const users = snapshot.docs.map(doc => doc.data());
    console.log('✅ Fetched users from Firestore:', users.length);
    return users;
  } catch (error: any) {
    console.error('❌ Failed to get users from Firestore:', error.message);
    return [];
  }
}

export async function getUserFromFirebase(userId: string): Promise<any> {
  if (!db || !firebaseAvailable) return null;
  try {
    const docRef = doc(db, 'users', userId);
    const docSnap = await getDoc(docRef);
    return docSnap.exists() ? docSnap.data() : null;
  } catch (error: any) {
    console.error('❌ Failed to get user from Firestore:', error.message);
    return null;
  }
}

// ============= MATCH FUNCTIONS =============

export async function saveMatchToFirebase(match: any) {
  if (!db || !firebaseAvailable) return;
  try {
    console.log('🔄 Saving match to Firestore:', match.id);
    const matchData = {
      ...match,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'matches', match.id), matchData, { merge: true });
    console.log('✅ Match saved to Firestore:', match.id);
  } catch (error: any) {
    console.error('❌ Failed to save match to Firestore:', error.message);
  }
}

export async function deleteMatchFromFirebase(matchId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    console.log('🔄 Deleting match from Firestore:', matchId);
    await deleteDoc(doc(db, 'matches', matchId));
    console.log('✅ Match deleted from Firestore:', matchId);
  } catch (error: any) {
    console.error('❌ Failed to delete match from Firestore:', error.message);
  }
}

export async function getMatchesFromFirebase(userId: string): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const q = query(collection(db, 'matches'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error: any) {
    console.error('❌ Failed to get matches from Firestore:', error.message);
    return [];
  }
}

export async function getAllMatchesFromFirebase(): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const snapshot = await getDocs(collection(db, 'matches'));
    return snapshot.docs.map(doc => doc.data());
  } catch (error: any) {
    console.error('❌ Failed to get all matches from Firestore:', error.message);
    return [];
  }
}

// ============= LEAGUE FUNCTIONS =============

export async function saveLeagueToFirebase(league: any) {
  if (!db || !firebaseAvailable) return;
  try {
    console.log('🔄 Saving league to Firestore:', league.id);
    const leagueData = {
      ...league,
      updatedAt: serverTimestamp()
    };
    await setDoc(doc(db, 'leagues', league.id), leagueData, { merge: true });
    console.log('✅ League saved to Firestore:', league.id);
  } catch (error: any) {
    console.error('❌ Failed to save league to Firestore:', error.message);
  }
}

export async function deleteLeagueFromFirebase(leagueId: string) {
  if (!db || !firebaseAvailable) return;
  try {
    await deleteDoc(doc(db, 'leagues', leagueId));
    console.log('✅ League deleted from Firestore:', leagueId);
  } catch (error: any) {
    console.error('❌ Failed to delete league from Firestore:', error.message);
  }
}

export async function getLeaguesFromFirebase(userId: string): Promise<any[]> {
  if (!db || !firebaseAvailable) return [];
  try {
    const q = query(collection(db, 'leagues'), where('userId', '==', userId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => doc.data());
  } catch (error: any) {
    console.error('❌ Failed to get leagues from Firestore:', error.message);
    return [];
  }
}

// ============= SYNC FUNCTIONS =============

export async function syncAllDataToFirebase(userId: string) {
  if (!firebaseAvailable) {
    console.log('⚠️ Firebase not available, skipping sync');
    return;
  }

  try {
    console.log('🔄 Starting full data sync to Firebase for user:', userId);
    
    // Sync user
    const localUsers = JSON.parse(localStorage.getItem('cric_users') || '[]');
    const user = localUsers.find((u: any) => u.id === userId);
    if (user) {
      await saveUserToFirebase(user);
      console.log('✅ User synced to Firebase');
    }

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
    
    console.log('✅ Full data sync completed successfully');
  } catch (error: any) {
    console.error('❌ Failed to sync data to Firebase:', error.message);
  }
}

export async function loadAllDataFromFirebase(userId: string) {
  if (!firebaseAvailable) {
    console.log('⚠️ Firebase not available, skipping load');
    return;
  }

  try {
    console.log('🔄 Loading all data from Firebase for user:', userId);
    
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
    
    console.log('✅ Full data load completed successfully');
  } catch (error: any) {
    console.error('❌ Failed to load data from Firebase:', error.message);
  }
}

export function getFirebaseStatus(): { connected: boolean; projectId: string } {
  return {
    connected: firebaseAvailable,
    projectId: firebaseConfig.projectId
  };
}
