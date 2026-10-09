import { User, Match, League, AdminLog } from './types';
import { saveMatchToFirebase, deleteMatchFromFirebase, saveUserToFirebase, deleteUserFromFirebase, saveLeagueToFirebase, deleteLeagueFromFirebase } from './firebase';

const ADMIN_EMAIL = 'rayhanakhandrayhan337@gmail.com';
const ADMIN_PASSWORD = '1210Rayhan#';

export function getUsers(): User[] {
  const data = localStorage.getItem('cric_users');
  return data ? JSON.parse(data) : [];
}

export async function saveUsers(users: User[]) {
  localStorage.setItem('cric_users', JSON.stringify(users));
  
  // Sync each user with Firebase
  try {
    for (const user of users) {
      await saveUserToFirebase(user);
    }
    console.log('✅ Users saved locally and to Firebase');
  } catch (err) {
    console.warn('⚠️ Firebase sync failed:', err);
  }
}

export function getCurrentUser(): User | null {
  const data = localStorage.getItem('cric_current_user');
  return data ? JSON.parse(data) : null;
}

export function setCurrentUser(user: User | null) {
  if (user) {
    localStorage.setItem('cric_current_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('cric_current_user');
  }
}

export async function login(email: string, password: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const users = getUsers();
  const user = users.find(u => u.email === email);
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    const adminUser: User = {
      id: 'admin',
      email: ADMIN_EMAIL,
      name: 'Admin',
      isAdmin: true,
      createdAt: new Date().toISOString()
    };
    setCurrentUser(adminUser);
    
    // Sync admin to Firebase
    try {
      const { firebaseLogin, saveUserToFirebase } = await import('./firebase');
      await firebaseLogin(email, password);
      await saveUserToFirebase(adminUser);
      console.log('✅ Admin logged in and synced to Firebase');
    } catch (error) {
      console.warn('⚠️ Firebase admin login failed');
    }
    
    return { success: true, user: adminUser };
  }
  
  if (!user) return { success: false, error: 'User not found' };
  
  const storedPass = localStorage.getItem(`cric_pass_${email}`);
  if (storedPass !== password) return { success: false, error: 'Invalid password' };
  
  setCurrentUser(user);
  
  // Login to Firebase and sync user data
  try {
    const { firebaseLogin, saveUserToFirebase } = await import('./firebase');
    await firebaseLogin(email, password);
    await saveUserToFirebase(user);
    console.log('✅ User logged in and synced to Firebase:', user.email);
  } catch (error) {
    console.warn('⚠️ Firebase login failed, continuing with local user');
  }
  
  return { success: true, user };
}

export async function signup(email: string, password: string, name: string): Promise<{ success: boolean; user?: User; error?: string }> {
  const users = getUsers();
  if (users.find(u => u.email === email)) return { success: false, error: 'Email already exists' };
  
  const newUser: User = {
    id: `user_${Date.now()}`,
    email,
    name,
    isAdmin: email === ADMIN_EMAIL,
    createdAt: new Date().toISOString()
  };
  
  // Save to local storage
  users.push(newUser);
  saveUsers(users);
  localStorage.setItem(`cric_pass_${email}`, password);
  setCurrentUser(newUser);
  
  // Save to Firebase Authentication and Firestore
  try {
    const { firebaseSignup, saveUserToFirebase } = await import('./firebase');
    
    // Create Firebase Auth user
    const firebaseUser = await firebaseSignup(email, password, name);
    console.log('✅ Firebase Auth user created:', firebaseUser.uid);
    
    // Save user data to Firestore
    const userWithFirebaseId = {
      ...newUser,
      firebaseUid: firebaseUser.uid
    };
    await saveUserToFirebase(userWithFirebaseId);
    console.log('✅ User data saved to Firestore');
    
  } catch (error: any) {
    console.warn('⚠️ Firebase signup failed:', error.message);
    // Continue anyway - user is saved locally
  }
  
  return { success: true, user: newUser };
}

export function getMatches(userId?: string): Match[] {
  const data = localStorage.getItem('cric_matches');
  const matches: Match[] = data ? JSON.parse(data) : [];
  if (userId) return matches.filter(m => m.userId === userId);
  return matches;
}

export function saveMatch(match: Match) {
  const matches = getMatches();
  const idx = matches.findIndex(m => m.id === match.id);
  if (idx >= 0) matches[idx] = match;
  else matches.push(match);
  localStorage.setItem('cric_matches', JSON.stringify(matches));
  
  // Sync with Firebase in background (don't wait)
  saveMatchToFirebase(match).catch(err => {
    console.warn('⚠️ Firebase sync failed:', err);
  });
}

export function deleteMatch(matchId: string) {
  // Delete from local storage instantly
  const matches = getMatches().filter(m => m.id !== matchId);
  localStorage.setItem('cric_matches', JSON.stringify(matches));
  console.log('✅ Match deleted from local storage:', matchId);
  
  // Delete from Firebase in background (don't wait)
  deleteMatchFromFirebase(matchId).catch(err => {
    console.warn('⚠️ Firebase delete failed:', err);
  });
}

export function getLeagues(userId?: string): League[] {
  const data = localStorage.getItem('cric_leagues');
  const leagues: League[] = data ? JSON.parse(data) : [];
  if (userId) return leagues.filter(l => l.userId === userId);
  return leagues;
}

export async function saveLeague(league: League) {
  const leagues = getLeagues();
  const idx = leagues.findIndex(l => l.id === league.id);
  if (idx >= 0) leagues[idx] = league;
  else leagues.push(league);
  localStorage.setItem('cric_leagues', JSON.stringify(leagues));
  
  // Sync with Firebase
  try {
    await saveLeagueToFirebase(league);
    console.log('✅ League saved locally and to Firebase');
  } catch (err) {
    console.warn('⚠️ Firebase sync failed:', err);
  }
}

export function deleteLeague(leagueId: string) {
  // Delete from local storage instantly
  const leagues = getLeagues().filter(l => l.id !== leagueId);
  localStorage.setItem('cric_leagues', JSON.stringify(leagues));
  console.log('✅ League deleted from local storage:', leagueId);
  
  // Delete from Firebase in background (don't wait)
  deleteLeagueFromFirebase(leagueId).catch(err => {
    console.warn('⚠️ Firebase delete failed:', err);
  });
}

export function getAdminLogs(): AdminLog[] {
  const data = localStorage.getItem('cric_admin_logs');
  return data ? JSON.parse(data) : [];
}

export function addAdminLog(action: string, target: string) {
  const logs = getAdminLogs();
  logs.unshift({
    id: `log_${Date.now()}`,
    action,
    target,
    timestamp: new Date().toISOString(),
    adminEmail: ADMIN_EMAIL
  });
  localStorage.setItem('cric_admin_logs', JSON.stringify(logs));
}

export function generateTeamName(): string {
  const names = [
    'Mumbai Indians', 'Chennai Super Kings', 'Royal Challengers',
    'Kolkata Knight Riders', 'Delhi Capitals', 'Rajasthan Royals',
    'Sunrisers Hyderabad', 'Punjab Kings', 'Gujarat Titans',
    'Lucknow Super Giants', 'Lahore Qalandars', 'Karachi Kings',
    'Islamabad United', 'Peshawar Zalmi', 'Quetta Gladiators',
    'Multan Sultans', 'Sydney Sixers', 'Perth Scorchers',
    'Melbourne Stars', 'Trinidad Tobago', 'Barbados Royals'
  ];
  return names[Math.floor(Math.random() * names.length)];
}

export function generatePlayerName(): string {
  const firstNames = ['Virat', 'Rohit', 'Jasprit', 'Rashid', 'Babar', 'Kane', 'Joe', 'Steve', 'David', 'Ben', 'Shakib', 'Trent', 'Pat', 'Mitchell', 'Kagiso', 'Faf', 'Quinton', 'Aiden', 'Glenn', 'Tim'];
  const lastNames = ['Kohli', 'Sharma', 'Bumrah', 'Khan', 'Azam', 'Williamson', 'Root', 'Smith', 'Warner', 'Stokes', 'Hasan', 'Boult', 'Cummins', 'Starc', 'Rabada', 'du Plessis', 'de Kock', 'Markram', 'Maxwell', 'Southee'];
  return `${firstNames[Math.floor(Math.random() * firstNames.length)]} ${lastNames[Math.floor(Math.random() * lastNames.length)]}`;
}

// Profile Management Functions
export function updateUserProfile(userId: string, updates: Partial<User>) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], ...updates };
    saveUsers(users);
    
    // Update current user if it's the logged-in user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, ...updates });
    }
  }
}

export function changePassword(email: string, newPassword: string) {
  localStorage.setItem(`cric_pass_${email}`, newPassword);
}

export function getUserPassword(email: string): string | null {
  return localStorage.getItem(`cric_pass_${email}`);
}

export function setUserProfileImage(userId: string, imageUrl: string) {
  const users = getUsers();
  const idx = users.findIndex(u => u.id === userId);
  if (idx >= 0) {
    users[idx] = { ...users[idx], profileImage: imageUrl };
    saveUsers(users);
    
    // Update current user if it's the logged-in user
    const currentUser = getCurrentUser();
    if (currentUser && currentUser.id === userId) {
      setCurrentUser({ ...currentUser, profileImage: imageUrl });
    }
  }
}
