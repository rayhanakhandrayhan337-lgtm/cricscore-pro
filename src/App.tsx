import React, { useState, useEffect, useRef } from 'react';
import { User, Match, League, Player, BallEvent, InningsData, BatsmanStats, BowlerStats, LeagueTeam } from './types';
import { getCurrentUser, setCurrentUser, login, signup, getMatches, saveMatch, deleteMatch, getLeagues, saveLeague, deleteLeague, getAdminLogs, addAdminLog, generateTeamName, generatePlayerName, getUsers, saveUsers, updateUserProfile, changePassword, getUserPassword, setUserProfileImage } from './store';
import { firebaseUpdatePassword, firebaseUpdateProfile } from './firebase';

// ============= MAIN APP =============
export default function App() {
  const [user, setUser] = useState<User | null>(getCurrentUser());
  const [screen, setScreen] = useState<string>('splash');

  useEffect(() => {
    // Sync data with Firebase when app loads
    if (user) {
      import('./firebase').then(({ syncAllDataToFirebase }) => {
        syncAllDataToFirebase(user.id).catch(err => console.warn('Sync failed:', err));
      });
      
      // Reload user data to get latest profile image
      const users = getUsers();
      const currentUserData = users.find(u => u.id === user.id);
      if (currentUserData) {
        setUser(currentUserData);
      }
    }

    const timer = setTimeout(() => {
      setScreen(user ? 'home' : 'auth');
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  if (screen === 'splash') return <SplashScreen />;
  if (!user) return <AuthScreen onLogin={(u) => { setUser(u); setScreen('home'); }} />;
  if (user.isAdmin && screen === 'admin') return <AdminPanel user={user} onBack={() => setScreen('home')} />;
  if (screen === 'profile') return <ProfileScreen user={user} onUpdate={(u) => { setUser(u); setCurrentUser(u); }} onBack={() => setScreen('home')} onLogout={() => { setCurrentUser(null); setUser(null); setScreen('auth'); }} />;

  return <HomeScreen user={user} onLogout={() => { setCurrentUser(null); setUser(null); setScreen('auth'); }} onAdmin={() => setScreen('admin')} onProfile={() => setScreen('profile')} />;
}

// ============= SPLASH SCREEN =============
function SplashScreen() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-950 flex items-center justify-center">
      <div className="text-center animate-pulse">
        <div className="text-7xl mb-4">🏏</div>
        <h1 className="text-4xl font-bold text-white mb-2">CricScore Pro</h1>
        <p className="text-green-300 text-lg">Professional Cricket Scoring</p>
        <div className="mt-8 flex justify-center gap-1">
          {[0, 1, 2].map(i => (
            <div key={i} className="w-3 h-3 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: `${i * 0.2}s` }} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ============= AUTH SCREEN =============
function AuthScreen({ onLogin }: { onLogin: (user: User) => void }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (isLogin) {
      const result = await login(email, password);
      if (result.success && result.user) onLogin(result.user);
      else setError(result.error || 'Login failed');
    } else {
      if (!name.trim()) { setError('Name is required'); return; }
      const result = await signup(email, password, name);
      if (result.success && result.user) onLogin(result.user);
      else setError(result.error || 'Signup failed');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-emerald-800 to-green-950 flex items-center justify-center p-4">
      <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 w-full max-w-md border border-white/20 shadow-2xl">
        <div className="text-center mb-8">
          <div className="inline-block p-4 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full mb-4 shadow-lg">
            {isLogin ? (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
              </svg>
            ) : (
              <svg className="w-12 h-12 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
              </svg>
            )}
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">CricScore Pro</h1>
          <p className="text-green-300 text-sm">{isLogin ? 'Welcome Back!' : 'Create Your Account'}</p>
        </div>
        
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-3 rounded-xl mb-4 text-sm flex items-center gap-2">
            <svg className="w-5 h-5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <span>{error}</span>
          </div>
        )}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
              </div>
              <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
                className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
            </div>
          )}
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" />
          </div>
          
          <div className="relative">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required
              className="w-full bg-white/10 border border-white/20 rounded-xl pl-10 pr-12 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400 focus:ring-2 focus:ring-green-400/20 transition-all" 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-white transition-colors"
            >
              {showPassword ? (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                </svg>
              )}
            </button>
          </div>
          
          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-xl hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg hover:shadow-xl transform hover:scale-[1.02] active:scale-[0.98]">
            {isLogin ? '🔐 Sign In' : '✨ Create Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-white hover:text-gray-200 text-sm font-medium transition-colors">
            {isLogin ? "Don't have an account? Sign Up" : 'Already have an account? Sign In'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= PROFILE SCREEN =============
function ProfileScreen({ user, onUpdate, onBack, onLogout }: { user: User; onUpdate: (u: User) => void; onBack: () => void; onLogout: () => void }) {
  const [name, setName] = useState(user.name);
  const [currentPass, setCurrentPass] = useState('');
  const [newPass, setNewPass] = useState('');
  const [confirmPass, setConfirmPass] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [theme, setTheme] = useState<'dark' | 'light'>(
    (localStorage.getItem('cric_theme') as 'dark' | 'light') || 'dark'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  const toggleTheme = () => {
    const newTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(newTheme);
    localStorage.setItem('cric_theme', newTheme);
    // Apply theme to document
    if (newTheme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
    setMessage(`Theme changed to ${newTheme} mode!`);
    setTimeout(() => setMessage(''), 2000);
  };

  // Apply theme on mount
  useEffect(() => {
    if (theme === 'light') {
      document.documentElement.classList.add('light-mode');
    } else {
      document.documentElement.classList.remove('light-mode');
    }
  }, []);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const imageUrl = reader.result as string;
        // Save to localStorage immediately
        localStorage.setItem(`profile_image_${user.id}`, imageUrl);
        setUserProfileImage(user.id, imageUrl);
        onUpdate({ ...user, profileImage: imageUrl });
        setMessage('Profile image updated!');
        setTimeout(() => setMessage(''), 3000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateName = () => {
    if (!name.trim()) { setError('Name cannot be empty'); return; }
    // Save to localStorage immediately
    localStorage.setItem(`profile_name_${user.id}`, name);
    updateUserProfile(user.id, { name });
    onUpdate({ ...user, name });
    setMessage('Name updated!');
    setError('');
    setTimeout(() => setMessage(''), 3000);
  };

  const handleChangePassword = () => {
    setError('');
    setMessage('');
    const storedPass = getUserPassword(user.email);
    if (storedPass && currentPass !== storedPass) {
      setError('Current password is incorrect');
      return;
    }
    if (newPass.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }
    if (newPass !== confirmPass) {
      setError('Passwords do not match');
      return;
    }
    changePassword(user.email, newPass);
    // Try Firebase update too
    firebaseUpdatePassword(newPass).catch(() => {});
    setCurrentPass('');
    setNewPass('');
    setConfirmPass('');
    setMessage('Password changed successfully!');
    setTimeout(() => setMessage(''), 3000);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-white text-xl">←</button>
        <h1 className="text-xl font-bold">My Profile</h1>
      </div>

      <div className="p-4 space-y-4">
        {message && <div className="bg-green-600/20 border border-green-500/50 text-green-200 px-4 py-2 rounded-lg text-sm">{message}</div>}
        {error && <div className="bg-red-600/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg text-sm">{error}</div>}

        {/* Profile Image */}
        <div className="bg-gray-800 rounded-xl p-4 text-center">
          <div className="relative inline-block">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-4xl overflow-hidden mx-auto">
              {user.profileImage ? (
                <img src={user.profileImage} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <span>{user.name.charAt(0).toUpperCase()}</span>
              )}
            </div>
            <button onClick={() => fileInputRef.current?.click()} className="absolute bottom-0 right-0 bg-blue-600 w-8 h-8 rounded-full flex items-center justify-center text-sm hover:bg-blue-700">
              📷
            </button>
            <input ref={fileInputRef} type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
          </div>
          <p className="mt-3 font-bold text-lg">{user.name}</p>
          <p className="text-gray-400 text-sm">{user.email}</p>
          {user.isAdmin && <span className="bg-yellow-600 text-xs px-2 py-0.5 rounded mt-1 inline-block">ADMIN</span>}
        </div>

        {/* Update Name */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-bold mb-3">Update Name</h3>
          <div className="flex gap-2">
            <input type="text" value={name} onChange={e => setName(e.target.value)}
              className="flex-1 bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none" />
            <button onClick={handleUpdateName} className="bg-green-600 px-4 py-2 rounded-lg font-bold hover:bg-green-700">Save</button>
          </div>
        </div>

        {/* Change Password */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-bold mb-3">Change Password</h3>
          <div className="space-y-3">
            <input type="password" placeholder="Current Password" value={currentPass} onChange={e => setCurrentPass(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none" />
            <input type="password" placeholder="New Password (min 6 chars)" value={newPass} onChange={e => setNewPass(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none" />
            <input type="password" placeholder="Confirm New Password" value={confirmPass} onChange={e => setConfirmPass(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none" />
            <button onClick={handleChangePassword} className="w-full bg-blue-600 py-2 rounded-lg font-bold hover:bg-blue-700">Change Password</button>
          </div>
        </div>

        {/* Export Match Summary */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-bold mb-3">📄 Export Match Summary</h3>
          <p className="text-xs text-gray-400 mb-3">Download match summary as PDF to your phone</p>
          <div className="space-y-2">
            <button 
              onClick={async () => {
                try {
                  const { exportMatchToPDF } = require('./exportImport');
                  const matches = JSON.parse(localStorage.getItem('cric_matches') || '[]');
                  const completedMatches = matches.filter((m: any) => m.status === 'completed');
                  
                  if (completedMatches.length === 0) {
                    setError('No completed matches to export');
                    setTimeout(() => setError(''), 3000);
                    return;
                  }
                  
                  // Export latest completed match
                  const latestMatch = completedMatches[completedMatches.length - 1];
                  await exportMatchToPDF(latestMatch);
                  setMessage(`✅ Match summary downloaded to your phone!`);
                  setTimeout(() => setMessage(''), 3000);
                } catch (err: any) {
                  setError('Failed to export PDF: ' + err.message);
                  setTimeout(() => setError(''), 3000);
                }
              }}
              className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700 text-sm"
            >
              📥 Download Latest Match Summary (PDF)
            </button>
          </div>
        </div>

        {/* Theme Toggle */}
        <div className="bg-gray-800 rounded-xl p-4">
          <h3 className="font-bold mb-3">🎨 App Theme</h3>
          <button 
            onClick={toggleTheme}
            className={`w-full py-3 rounded-lg font-bold transition-all ${
              theme === 'dark' 
                ? 'bg-gray-700 hover:bg-gray-600 text-white' 
                : 'bg-white hover:bg-gray-100 text-gray-900 border-2 border-gray-300'
            }`}
          >
            {theme === 'dark' ? '🌙 Dark Mode' : '☀️ Light Mode'}
          </button>
          <p className="text-xs text-gray-400 mt-2 text-center">
            Current: {theme === 'dark' ? 'Dark' : 'Light'} Mode
          </p>
        </div>

        {/* Logout */}
        <button onClick={onLogout} className="w-full bg-red-600 py-3 rounded-xl font-bold hover:bg-red-700 transition-all">
          🚪 Logout
        </button>
      </div>
    </div>
  );
}

// ============= HOME SCREEN =============
function HomeScreen({ user, onLogout, onAdmin, onProfile }: { user: User; onLogout: () => void; onAdmin: () => void; onProfile: () => void }) {
  const [tab, setTab] = useState(0);
  const [activeMatch, setActiveMatch] = useState<Match | null>(null);
  const [showCreateMatch, setShowCreateMatch] = useState(false);
  const [showLeagueCreate, setShowLeagueCreate] = useState(false);
  const [showMatchSummary, setShowMatchSummary] = useState<Match | null>(null);
  const [leagueMatchSetup, setLeagueMatchSetup] = useState<League | null>(null);

  const tabs = [
    { icon: '🏠', label: 'Dashboard' },
    { icon: '📺', label: 'Live' },
    { icon: '🏆', label: 'League' },
    { icon: '🏏', label: 'Custom' },
  ];

  if (activeMatch && activeMatch.status === 'live' && activeMatch.innings && activeMatch.innings.length > 0) {
    return <LiveScoringScreen match={activeMatch} onBack={() => setActiveMatch(null)} onUpdate={(m) => { setActiveMatch(m); saveMatch(m); }} />;
  }

  if (activeMatch && activeMatch.status === 'live' && (!activeMatch.innings || activeMatch.innings.length === 0)) {
    return <MatchSummaryScreen match={activeMatch} onBack={() => setActiveMatch(null)} />;
  }

  if (showMatchSummary) {
    return <MatchSummaryScreen match={showMatchSummary} onBack={() => setShowMatchSummary(null)} />;
  }

  if (showCreateMatch || leagueMatchSetup) {
    return <CreateMatchScreen user={user} league={leagueMatchSetup || undefined} onBack={() => { setShowCreateMatch(false); setLeagueMatchSetup(null); }} onStart={(match) => { setActiveMatch(match); setShowCreateMatch(false); setLeagueMatchSetup(null); }} />;
  }

  if (showLeagueCreate) {
    return <CreateLeagueScreen user={user} onBack={() => setShowLeagueCreate(false)} />;
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white pb-20">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div onClick={onProfile} className="w-10 h-10 rounded-full bg-gradient-to-br from-green-500 to-emerald-700 flex items-center justify-center text-lg font-bold cursor-pointer overflow-hidden">
            {user.profileImage ? (
              <img src={user.profileImage} alt="" className="w-full h-full object-cover" />
            ) : (
              <span>{user.name.charAt(0).toUpperCase()}</span>
            )}
          </div>
          <div>
            <h1 className="text-lg font-bold">CricScore Pro</h1>
            <p className="text-green-300 text-xs">Hi, {user.name}</p>
          </div>
        </div>
        <div className="flex gap-2">
          {user.isAdmin && (
            <button onClick={onAdmin} className="bg-yellow-600 px-3 py-1 rounded-lg text-xs font-bold">Admin</button>
          )}
        </div>
      </div>

      {/* Tab Content */}
      <div className="p-4">
        {tab === 0 && <DashboardTab user={user} onOpenMatch={(m) => { if (m.status === 'live' && m.innings?.length > 0) setActiveMatch(m); else setShowMatchSummary(m); }} />}
        {tab === 1 && <LiveTab user={user} onOpenMatch={(m) => setActiveMatch(m)} />}
        {tab === 2 && <LeagueTab user={user} onCreateLeague={() => setShowLeagueCreate(true)} onCreateMatch={(l) => setLeagueMatchSetup(l)} onOpenMatch={(m) => { if (m.status === 'live' && m.innings?.length > 0) setActiveMatch(m); else setShowMatchSummary(m); }} />}
        {tab === 3 && <CustomTab user={user} onCreateMatch={() => setShowCreateMatch(true)} onOpenMatch={(m) => { if (m.status === 'live' && m.innings?.length > 0) setActiveMatch(m); else setShowMatchSummary(m); }} />}
      </div>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-purple-950 to-violet-900 border-t border-purple-700 flex shadow-2xl">
        {tabs.map((t, i) => (
          <button 
            key={i} 
            onClick={() => setTab(i)} 
            className={`flex-1 py-3 flex flex-col items-center gap-1.5 transition-all relative ${
              tab === i 
                ? 'text-white' 
                : 'text-purple-300 hover:text-white'
            }`}
          >
            {tab === i && (
              <div className="absolute top-0 left-1/2 transform -translate-x-1/2 w-12 h-1 bg-white rounded-full"></div>
            )}
            <div className={`p-2 rounded-xl transition-all ${
              tab === i 
                ? 'bg-white/20 shadow-lg' 
                : 'bg-purple-500/20'
            }`}>
              {i === 0 && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
              )}
              {i === 1 && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
              )}
              {i === 2 && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
              )}
              {i === 3 && (
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
            </div>
            <span className="text-xs font-semibold">{t.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

// ============= DASHBOARD TAB =============
function DashboardTab({ user, onOpenMatch }: { user: User; onOpenMatch: (m: Match) => void }) {
  const [matches, setMatches] = useState(getMatches(user.id));
  const completedMatches = matches.filter(m => m.status === 'completed');
  const liveMatches = matches.filter(m => m.status === 'live');
  const wins = completedMatches.filter(m => {
    if (!m.result) return false;
    return m.result.includes(m.team1.name + ' won') || m.result.includes(m.team2.name + ' won');
  }).length;

  const recentMatches = [...matches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5);

  const handleDelete = (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      console.log('Deleting match:', matchId);
      deleteMatch(matchId);
      console.log('Match deleted, updating state...');
      // Force re-render by creating new array
      setTimeout(() => {
        const updatedMatches = getMatches(user.id);
        console.log('Updated matches count:', updatedMatches.length);
        setMatches([...updatedMatches]);
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">📊 My Dashboard</h2>
      
      {/* Stats Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-xl p-4">
          <p className="text-blue-200 text-sm">Total Matches</p>
          <p className="text-3xl font-bold">{matches.length}</p>
        </div>
        <div className="bg-gradient-to-br from-green-600 to-green-800 rounded-xl p-4">
          <p className="text-green-200 text-sm">Wins</p>
          <p className="text-3xl font-bold">{wins}</p>
        </div>
        <div className="bg-gradient-to-br from-red-600 to-red-800 rounded-xl p-4">
          <p className="text-red-200 text-sm">Losses</p>
          <p className="text-3xl font-bold">{completedMatches.length - wins}</p>
        </div>
        <div className="bg-gradient-to-br from-yellow-600 to-yellow-800 rounded-xl p-4">
          <p className="text-yellow-200 text-sm">Live Now</p>
          <p className="text-3xl font-bold">{liveMatches.length}</p>
        </div>
      </div>

      {/* Recent Matches */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Recent Matches</h3>
        {recentMatches.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No matches yet. Create one!</p>
        ) : (
          <div className="space-y-2">
            {recentMatches.map(m => (
              <MatchCard key={m.id} match={m} onClick={() => onOpenMatch(m)} onDelete={() => handleDelete(m.id)} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============= MATCH CARD =============
function MatchCard({ match, onClick, onDelete }: { match: Match; onClick: () => void; onDelete: () => void }) {
  const inn1 = match.innings?.[0];
  const score1 = inn1 ? `${inn1.runs}/${inn1.wickets} (${inn1.overs}.${inn1.balls})` : 'Yet to bat';
  const inn2 = match.innings?.[1];
  const score2 = inn2 ? `${inn2.runs}/${inn2.wickets} (${inn2.overs}.${inn2.balls})` : 'Yet to bat';

  // Determine winning team for blue color
  const getWinningTeam = () => {
    if (!match.result) return null;
    if (match.result.includes('won by')) {
      if (match.result.includes(match.team1.name + ' won')) return match.team1.name;
      if (match.result.includes(match.team2.name + ' won')) return match.team2.name;
    }
    return null;
  };

  const winningTeam = getWinningTeam();

  const formatResult = () => {
    if (!match.result) return null;
    if (winningTeam) {
      const parts = match.result.split(' won by');
      return (
        <>
          <span className="text-blue-400 font-bold">{winningTeam}</span>
          <span className="text-yellow-300"> won by{parts[1]}</span>
        </>
      );
    }
    return <span className="text-yellow-300">{match.result}</span>;
  };

  // Determine losing team
  const getLosingTeam = () => {
    if (!winningTeam) return null;
    return winningTeam === match.team1.name ? match.team2.name : match.team1.name;
  };
  const losingTeam = getLosingTeam();

  return (
    <div className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-2xl p-5 border border-gray-700 hover:border-green-500/50 hover:shadow-xl transition-all cursor-pointer group" onClick={onClick}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex items-center gap-2">
          <span className={`px-3 py-1 rounded-full text-xs font-bold shadow-lg ${
            match.status === 'live' 
              ? 'bg-gradient-to-r from-red-500 to-red-600 text-white animate-pulse' 
              : match.status === 'completed' 
              ? 'bg-gradient-to-r from-yellow-500 to-yellow-600 text-white' 
              : 'bg-gradient-to-r from-blue-500 to-blue-600 text-white'
          }`}>
            {match.status === 'live' ? '● LIVE' : match.status === 'completed' ? '🏆 COMPLETE' : 'UPCOMING'}
          </span>
        </div>
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(); }} 
          className="text-red-400 hover:text-red-300 hover:bg-red-500/10 p-2 rounded-lg transition-all" 
          title="Delete match"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
      
      <div className="flex items-center gap-2 mb-4">
        <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        <span className="text-xs text-green-400 font-medium">{match.venue}</span>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center bg-gray-700/30 rounded-xl p-3 group-hover:bg-gray-700/50 transition-all">
          <span className={`text-lg font-black bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent`}>
            {match.team1.name}
          </span>
          <span className="text-xl font-bold text-yellow-400 font-mono tracking-wider">
            {score1}
          </span>
        </div>
        
        <div className="flex justify-between items-center bg-gray-700/30 rounded-xl p-3 group-hover:bg-gray-700/50 transition-all">
          <span className={`text-lg font-black bg-gradient-to-r from-teal-400 to-cyan-500 bg-clip-text text-transparent`}>
            {match.team2.name}
          </span>
          <span className="text-xl font-bold text-yellow-400 font-mono tracking-wider">
            {score2}
          </span>
        </div>
      </div>
      
      {match.result && (
        <div className="mt-4 bg-gradient-to-r from-yellow-900/40 to-yellow-800/40 px-4 py-2 rounded-xl border border-yellow-600/30">
          <p className="text-sm font-medium text-center">
            {formatResult()}
          </p>
        </div>
      )}
    </div>
  );
}

// ============= LIVE TAB =============
function LiveTab({ user, onOpenMatch }: { user: User; onOpenMatch: (m: Match) => void }) {
  const [liveMatches, setLiveMatches] = useState(getMatches().filter(m => m.status === 'live' && m.innings && m.innings.length > 0));
  const [broadcastMatch, setBroadcastMatch] = useState<Match | null>(null);

  const refreshMatches = () => {
    setLiveMatches(getMatches().filter(m => m.status === 'live' && m.innings && m.innings.length > 0));
  };

  // ✅ Real-time update: Refresh live matches every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      refreshMatches();
    }, 2000); // Refresh every 2 seconds

    return () => clearInterval(interval);
  }, []);

  const handleDelete = (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this live match?')) {
      console.log('Deleting live match:', matchId);
      deleteMatch(matchId);
      setTimeout(() => {
        const updated = getMatches().filter(m => m.status === 'live' && m.innings && m.innings.length > 0);
        console.log('Updated live matches:', updated.length);
        setLiveMatches(updated);
      }, 100);
    }
  };

  const handleShare = (match: Match) => {
    const currentInnings = match.innings?.[match.currentInnings];
    const battingTeam = match.battingFirst === match.team1.id ? match.team1 : match.team2;
    const bowlingTeam = match.battingFirst === match.team1.id ? match.team2 : match.team1;
    const currentBattingTeam = currentInnings?.battingTeamId === match.team1.id ? match.team1 : match.team2;
    
    let text = `🏏 LIVE MATCH\n\n`;
    text += `${match.team1.name} vs ${match.team2.name}\n`;
    text += `📍 ${match.venue}\n\n`;
    if (currentInnings) {
      text += `📊 Score: ${currentInnings.runs}/${currentInnings.wickets} (${currentInnings.overs}.${currentInnings.balls} ov)\n`;
      const striker = currentInnings.batsmenStats?.[currentInnings.currentBatsmen?.[0]];
      const nonStriker = currentInnings.batsmenStats?.[currentInnings.currentBatsmen?.[1]];
      const bowler = currentInnings.bowlersStats?.[currentInnings.currentBowler];
      if (striker) text += `🏏 Striker: ${striker.playerName}: ${striker.runs}(${striker.balls}) [4s:${striker.fours}, 6s:${striker.sixes}]\n`;
      if (nonStriker) text += `🏏 Non-Striker: ${nonStriker.playerName}: ${nonStriker.runs}(${nonStriker.balls})\n`;
      if (bowler) text += `⚾ Bowler: ${bowler.playerName}: ${bowler.overs}.${bowler.balls}-${bowler.runs}-${bowler.wickets}\n`;
    }
    text += `\n🔴 Watch Live on CricScore Pro!`;

    // ✅ Share to Facebook Live
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookShareUrl, '_blank');
  };

  const handleFacebookLive = (match: Match) => {
    // Open Facebook Live with score card
    const currentInnings = match.innings?.[match.currentInnings];
    const battingTeam = currentInnings?.battingTeamId === match.team1.id ? match.team1 : match.team2;
    
    let liveDescription = `🔴 LIVE CRICKET SCORE\n\n`;
    liveDescription += `${match.team1.name} vs ${match.team2.name}\n`;
    liveDescription += `📍 ${match.venue}\n\n`;
    
    if (currentInnings) {
      liveDescription += `📊 ${battingTeam.name}: ${currentInnings.runs}/${currentInnings.wickets} (${currentInnings.overs}.${currentInnings.balls} ov)\n\n`;
      
      const striker = currentInnings.batsmenStats?.[currentInnings.currentBatsmen?.[0]];
      const nonStriker = currentInnings.batsmenStats?.[currentInnings.currentBatsmen?.[1]];
      const bowler = currentInnings.bowlersStats?.[currentInnings.currentBowler];
      
      liveDescription += `🏏 BATTING:\n`;
      if (striker) liveDescription += `• ${striker.playerName}* ${striker.runs}(${striker.balls}) [4s:${striker.fours}, 6s:${striker.sixes}]\n`;
      if (nonStriker) liveDescription += `• ${nonStriker.playerName} ${nonStriker.runs}(${nonStriker.balls})\n`;
      
      if (bowler) {
        liveDescription += `\n⚾ BOWLING:\n`;
        liveDescription += `• ${bowler.playerName}* ${bowler.overs}.${bowler.balls}-${bowler.runs}-${bowler.wickets}\n`;
      }
    }
    
    liveDescription += `\n📱 Score via CricScore Pro`;
    
    // Open Facebook Live
    const facebookLiveUrl = `https://www.facebook.com/dialog/share?app_id=YOUR_APP_ID&display=popup&href=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(liveDescription)}`;
    window.open(facebookLiveUrl, '_blank');
  };

  if (broadcastMatch) {
    return <BroadcastScreen match={broadcastMatch} onBack={() => setBroadcastMatch(null)} />;
  }

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-bold">📺 Live Matches</h2>
      
      {liveMatches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">📺</div>
          <p className="text-gray-400">No live matches right now</p>
          <p className="text-gray-500 text-sm mt-2">Start a match from Custom or League tab</p>
        </div>
      ) : (
        <div className="space-y-3">
          {liveMatches.map(m => {
            const currentInnings = m.innings?.[m.currentInnings];
            const battingTeam = currentInnings?.battingTeamId === m.team1.id ? m.team1 : m.team2;
            const striker = currentInnings?.batsmenStats?.[currentInnings.currentBatsmen?.[0]];
            const nonStriker = currentInnings?.batsmenStats?.[currentInnings.currentBatsmen?.[1]];
            const bowler = currentInnings?.bowlersStats?.[currentInnings.currentBowler];
            
            return (
              <div key={m.id} className="bg-gradient-to-br from-gray-800 to-gray-900 rounded-xl p-4 border-2 border-red-500/30 shadow-xl">
                <div className="flex items-center justify-between mb-3">
                  <span className="bg-red-500 text-white px-3 py-1 rounded-full text-xs font-bold animate-pulse shadow-lg">● LIVE</span>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => handleShare(m)} 
                      className="group bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-1 transform hover:scale-105 active:scale-95"
                    >
                      <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                      </svg>
                      <span>Share</span>
                    </button>
                    <button 
                      onClick={() => handleFacebookLive(m)} 
                      className="group bg-gradient-to-r from-red-500 to-pink-600 hover:from-red-600 hover:to-pink-700 text-white px-3 py-1.5 rounded-lg text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 flex items-center gap-1 transform hover:scale-105 active:scale-95"
                      title="Facebook Live"
                    >
                      <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-300" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span>Live</span>
                    </button>
                    <button 
                      onClick={() => setBroadcastMatch(m)} 
                      className="group bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                      title="Broadcast"
                    >
                      <svg className="w-3.5 h-3.5 group-hover:scale-110 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    </button>
                    <button 
                      onClick={() => handleDelete(m.id)} 
                      className="group bg-gradient-to-r from-gray-600 to-gray-700 hover:from-red-500 hover:to-red-600 text-white px-2.5 py-1.5 rounded-lg text-xs font-semibold shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 active:scale-95"
                      title="Delete"
                    >
                      <svg className="w-3.5 h-3.5 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  </div>
                </div>
                
                {/* Match Info */}
                <div className="mb-3">
                  <p className="font-bold text-lg text-white">{m.team1.name} vs {m.team2.name}</p>
                  <p className="text-green-400 text-xs font-medium">📍 {m.venue}</p>
                </div>
                
                {/* Live Score Card */}
                {currentInnings && (
                  <div className="bg-black/30 rounded-lg p-3 mb-3 border border-gray-700">
                    <div className="flex justify-between items-center mb-2">
                      <span className="text-xs text-gray-400">{battingTeam.name} - Innings {m.currentInnings + 1}</span>
                      <span className="text-2xl font-black text-yellow-400">
                        {currentInnings.runs}/{currentInnings.wickets}
                        <span className="text-sm text-gray-400 ml-1">({currentInnings.overs}.{currentInnings.balls})</span>
                      </span>
                    </div>
                    
                    {/* Batsmen */}
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <div className="bg-green-900/30 rounded p-2 border border-green-700/30">
                        <p className="text-[10px] text-green-400 font-bold mb-0.5">🏏 STRIKER</p>
                        <p className="text-xs font-bold truncate">{striker?.playerName || '-'}</p>
                        <p className="text-sm font-black text-green-400">
                          {striker?.runs || 0}<span className="text-xs text-gray-400 ml-1">({striker?.balls || 0})</span>
                        </p>
                      </div>
                      <div className="bg-blue-900/30 rounded p-2 border border-blue-700/30">
                        <p className="text-[10px] text-blue-400 font-bold mb-0.5">🏏 NON-STRIKER</p>
                        <p className="text-xs font-bold truncate">{nonStriker?.playerName || '-'}</p>
                        <p className="text-sm font-black text-blue-400">
                          {nonStriker?.runs || 0}<span className="text-xs text-gray-400 ml-1">({nonStriker?.balls || 0})</span>
                        </p>
                      </div>
                    </div>
                    
                    {/* Bowler */}
                    <div className="bg-purple-900/30 rounded p-2 border border-purple-700/30">
                      <p className="text-[10px] text-purple-400 font-bold mb-0.5">⚾ BOWLER</p>
                      <p className="text-xs font-bold truncate">{bowler?.playerName || '-'}</p>
                      <p className="text-sm font-black text-purple-400">
                        {bowler?.overs || 0}.{bowler?.balls || 0}-{bowler?.runs || 0}-{bowler?.wickets || 0}
                      </p>
                    </div>
                  </div>
                )}
                
                <button onClick={() => onOpenMatch(m)} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-2.5 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg">
                  ▶ Continue Scoring
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ============= BROADCAST SCREEN =============
function BroadcastScreen({ match, onBack }: { match: Match; onBack: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const innings = match.innings?.[match.currentInnings];
  const battingTeam = innings?.battingTeamId === match.team1.id ? match.team1 : match.team2;
  const striker = innings?.batsmenStats?.[innings?.currentBatsmen?.[0]];
  const bowler = innings?.bowlersStats?.[innings?.currentBowler];

  useEffect(() => {
    startCamera();
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { facingMode: 'environment' }, 
        audio: true 
      });
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
      setStream(mediaStream);
      setStreaming(true);
    } catch (err) {
      alert('Camera access denied. Please allow camera access to broadcast.');
      console.error('Camera error:', err);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
    setStreaming(false);
  };

  const handleShare = () => {
    let text = `🏏 LIVE BROADCAST\n\n`;
    text += `${match.team1.name} vs ${match.team2.name}\n`;
    text += `📍 ${match.venue}\n\n`;
    if (innings) {
      text += `📊 ${battingTeam.name}: ${innings.runs}/${innings.wickets} (${innings.overs}.${innings.balls} ov)\n`;
      if (striker) text += `🏏 Striker: ${striker.playerName} - ${striker.runs}(${striker.balls})\n`;
      if (bowler) text += `⚾ Bowler: ${bowler.playerName} - ${bowler.overs}.${bowler.balls}-${bowler.runs}-${bowler.wickets}\n`;
    }
    text += `\n🔴 Watch Live on CricScore Pro!`;

    // Share to Facebook
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookShareUrl, '_blank');
  };

  return (
    <div className="min-h-screen bg-black text-white relative">
      {/* Camera Feed */}
      <div className="relative w-full h-screen">
        <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
        
        {/* Score Overlay */}
        <div className="absolute top-0 left-0 right-0 bg-gradient-to-b from-black/80 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="bg-red-600 px-2 py-0.5 rounded text-xs font-bold animate-pulse">● LIVE</span>
              <span className="text-sm font-bold">{match.team1.name} vs {match.team2.name}</span>
            </div>
            <button onClick={onBack} className="bg-gray-800/80 px-3 py-1 rounded text-sm">✕ Close</button>
          </div>
        </div>

        {/* Score Card Overlay */}
        {innings && (
          <div className="absolute bottom-20 left-4 right-4">
            <div className="bg-black/70 backdrop-blur-sm rounded-xl p-3 border border-white/20">
              <div className="flex justify-between items-center mb-2">
                <span className="font-bold">{battingTeam.name}</span>
                <span className="text-2xl font-bold text-green-400">{innings.runs}/{innings.wickets}</span>
              </div>
              <div className="text-xs text-gray-300">Overs: {innings.overs}.{innings.balls}/{match.totalOvers}</div>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div className="bg-green-900/40 rounded p-2">
                  <p className="text-xs text-green-300">🏏 Striker</p>
                  <p className="font-bold text-sm truncate">{striker?.playerName || '-'}</p>
                  <p className="text-green-400">{striker?.runs || 0} ({striker?.balls || 0})</p>
                </div>
                <div className="bg-purple-900/40 rounded p-2">
                  <p className="text-xs text-purple-300">⚾ Bowler</p>
                  <p className="font-bold text-sm truncate">{bowler?.playerName || '-'}</p>
                  <p className="text-purple-400">{bowler?.overs || 0}.{bowler?.balls || 0}-{bowler?.runs || 0}-{bowler?.wickets || 0}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Controls */}
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3">
          <button onClick={handleShare} className="bg-blue-600 px-4 py-2 rounded-full font-bold text-sm hover:bg-blue-700">
            📤 Share
          </button>
          <button onClick={streaming ? stopCamera : startCamera} className={`${streaming ? 'bg-red-600' : 'bg-green-600'} px-4 py-2 rounded-full font-bold text-sm`}>
            {streaming ? '⏹ Stop' : '▶ Start'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============= LEAGUE TAB =============
function LeagueTab({ user, onCreateLeague, onCreateMatch, onOpenMatch }: { user: User; onCreateLeague: () => void; onCreateMatch: (l: League) => void; onOpenMatch: (m: Match) => void }) {
  const [leagues, setLeagues] = useState(getLeagues(user.id));

  const handleDeleteLeague = (leagueId: string) => {
    if (window.confirm('Are you sure you want to delete this league and all its matches?')) {
      console.log('Deleting league:', leagueId);
      // Delete all league matches first
      const leagueMatches = getMatches().filter(m => m.leagueId === leagueId);
      console.log('League matches to delete:', leagueMatches.length);
      leagueMatches.forEach(m => deleteMatch(m.id));
      
      // Delete the league
      deleteLeague(leagueId);
      
      setTimeout(() => {
        const updated = getLeagues(user.id);
        console.log('Updated leagues:', updated.length);
        setLeagues([...updated]);
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">🏆 Premier League</h2>
        <button onClick={onCreateLeague} className="bg-green-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">
          + Create League
        </button>
      </div>

      {leagues.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏆</div>
          <p className="text-gray-400">No leagues created yet</p>
        </div>
      ) : (
        <div className="space-y-4">
          {leagues.map(league => (
            <LeagueCard key={league.id} league={league} onCreateMatch={() => onCreateMatch(league)} onOpenMatch={onOpenMatch} onDelete={() => handleDeleteLeague(league.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

function LeagueCard({ league, onCreateMatch, onOpenMatch, onDelete }: { league: League; onCreateMatch: () => void; onOpenMatch: (m: Match) => void; onDelete: () => void }) {
  const allMatches = getMatches();
  const leagueMatches = allMatches.filter(m => m.leagueId === league.id);
  const sortedTeams = [...league.teams].sort((a, b) => b.points - a.points || b.nrr - a.nrr);

  return (
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
      <div className="flex justify-between items-center mb-3">
        <h3 className="font-bold text-lg">{league.name}</h3>
        <div className="flex gap-1">
          <button onClick={onCreateMatch} className="bg-blue-600 px-3 py-1 rounded text-xs font-bold hover:bg-blue-700">
            + Match
          </button>
          <button onClick={onDelete} className="bg-red-600 px-3 py-1 rounded text-xs font-bold hover:bg-red-700" title="Delete League">
            🗑️
          </button>
        </div>
      </div>

      {/* Point Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-gray-400 border-b border-gray-700">
              <th className="text-left py-2 px-1">#</th>
              <th className="text-left py-2 px-1">Team</th>
              <th className="text-center py-2 px-1">P</th>
              <th className="text-center py-2 px-1">W</th>
              <th className="text-center py-2 px-1">L</th>
              <th className="text-center py-2 px-1">T</th>
              <th className="text-center py-2 px-1">Pts</th>
              <th className="text-center py-2 px-1">NRR</th>
            </tr>
          </thead>
          <tbody>
            {sortedTeams.map((team, idx) => (
              <tr key={team.id} className="border-b border-gray-700/50">
                <td className="py-2 px-1 font-bold text-yellow-400">{idx + 1}</td>
                <td className="py-2 px-1 font-medium">{team.name}</td>
                <td className="py-2 px-1 text-center">{team.played}</td>
                <td className="py-2 px-1 text-center text-green-400">{team.won}</td>
                <td className="py-2 px-1 text-center text-red-400">{team.lost}</td>
                <td className="py-2 px-1 text-center text-gray-400">{team.tied || 0}</td>
                <td className="py-2 px-1 text-center font-bold text-yellow-400">{team.points}</td>
                <td className="py-2 px-1 text-center text-blue-300">{team.nrr > 0 ? '+' : ''}{team.nrr.toFixed(3)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {leagueMatches.length > 0 && (
        <div className="mt-3 space-y-2">
          <p className="text-xs text-gray-400 font-semibold">Matches:</p>
          {leagueMatches.map(m => (
            <div key={m.id} onClick={() => onOpenMatch(m)} className="bg-gray-700/50 rounded-lg p-2 cursor-pointer hover:bg-gray-700">
              <div className="flex justify-between text-xs">
                <span>{m.team1.name} vs {m.team2.name}</span>
                <span className={m.status === 'live' ? 'text-red-400' : 'text-gray-400'}>{m.status}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============= CUSTOM TAB =============
function CustomTab({ user, onCreateMatch, onOpenMatch }: { user: User; onCreateMatch: () => void; onOpenMatch: (m: Match) => void }) {
  const [matches, setMatches] = useState(getMatches(user.id).filter(m => !m.leagueId));

  const handleDelete = (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      console.log('Deleting custom match:', matchId);
      deleteMatch(matchId);
      setTimeout(() => {
        const updated = getMatches(user.id).filter(m => !m.leagueId);
        console.log('Updated custom matches:', updated.length);
        setMatches([...updated]);
      }, 100);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">🏏 Custom Matches</h2>
        <button onClick={onCreateMatch} className="bg-green-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">
          + New Match
        </button>
      </div>

      {matches.length === 0 ? (
        <div className="text-center py-12">
          <div className="text-5xl mb-4">🏏</div>
          <p className="text-gray-400">No custom matches yet</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...matches].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map(m => (
            <MatchCard key={m.id} match={m} onClick={() => onOpenMatch(m)} onDelete={() => handleDelete(m.id)} />
          ))}
        </div>
      )}
    </div>
  );
}

// ============= CREATE MATCH SCREEN =============
function CreateMatchScreen({ user, league, onBack, onStart }: { user: User; league?: League; onBack: () => void; onStart: (match: Match) => void }) {
  const [team1Name, setTeam1Name] = useState('');
  const [team2Name, setTeam2Name] = useState('');
  const [venue, setVenue] = useState('');
  const [totalOvers, setTotalOvers] = useState(5);
  const [team1Players, setTeam1Players] = useState<Player[]>([]);
  const [team2Players, setTeam2Players] = useState<Player[]>([]);
  const [tossWinner, setTossWinner] = useState('');
  const [tossDecision, setTossDecision] = useState<'bat' | 'bowl'>('bat');
  const [step, setStep] = useState(1);

  const [leagueTeam1Id, setLeagueTeam1Id] = useState<string>('');
  const [leagueTeam2Id, setLeagueTeam2Id] = useState<string>('');

  useEffect(() => {
    if (league) {
      setTeam1Name(league.teams[0]?.name || '');
      setTeam2Name(league.teams[1]?.name || '');
      setTeam1Players(league.teams[0]?.players || []);
      setTeam2Players(league.teams[1]?.players || []);
      setLeagueTeam1Id(league.teams[0]?.id || '');
      setLeagueTeam2Id(league.teams[1]?.id || '');
    }
  }, [league]);

  const generatePlayers = (teamNum: number) => {
    const roles: Player['role'][] = ['batsman', 'batsman', 'batsman', 'batsman', 'allrounder', 'allrounder', 'wicketkeeper', 'bowler', 'bowler', 'bowler', 'bowler'];
    const players: Player[] = roles.map((role, i) => ({
      id: `p${teamNum}_${i}_${Date.now()}`,
      name: generatePlayerName(),
      role
    }));
    if (teamNum === 1) setTeam1Players(players);
    else setTeam2Players(players);
  };

  const updatePlayerName = (teamNum: number, idx: number, name: string) => {
    const players = teamNum === 1 ? [...team1Players] : [...team2Players];
    players[idx] = { ...players[idx], name };
    if (teamNum === 1) setTeam1Players(players);
    else setTeam2Players(players);
  };

  const randomizeOvers = () => {
    const options = [3, 5, 7, 10, 14, 20];
    setTotalOvers(options[Math.floor(Math.random() * options.length)]);
  };

  const handleStart = async () => {
    if (!team1Name || !team2Name || !venue) { alert('Please fill all fields'); return; }
    if (team1Players.length !== 11 || team2Players.length !== 11) { alert('Each team must have 11 players'); return; }
    if (!tossWinner) { alert('Please select toss winner'); return; }

    const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === team1Name ? team2Name : team1Name);
    
    // Use league team IDs if this is a league match, otherwise generate new IDs
    const team1Id = league && leagueTeam1Id ? leagueTeam1Id : `t1_${Date.now()}`;
    const team2Id = league && leagueTeam2Id ? leagueTeam2Id : `t2_${Date.now()}`;
    
    const team1: { id: string; name: string; players: Player[] } = { id: team1Id, name: team1Name, players: team1Players };
    const team2: { id: string; name: string; players: Player[] } = { id: team2Id, name: team2Name, players: team2Players };

    const striker = team1Players[0].id;
    const nonStriker = team1Players[1].id;
    const bowler = (battingFirst === team1Name ? team2Players : team1Players)[0].id;

    const batsmenStats: Record<string, BatsmanStats> = {};
    const bowlersStats: Record<string, BowlerStats> = {};

    const battingTeam = battingFirst === team1Name ? team1 : team2;
    const bowlingTeam = battingFirst === team1Name ? team2 : team1;

    battingTeam.players.forEach(p => {
      batsmenStats[p.id] = { playerId: p.id, playerName: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    });
    bowlingTeam.players.forEach(p => {
      bowlersStats[p.id] = { playerId: p.id, playerName: p.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, extras: 0 };
    });

    const innings1: InningsData = {
      battingTeamId: battingFirst === team1Name ? team1.id : team2.id,
      bowlingTeamId: battingFirst === team1Name ? team2.id : team1.id,
      runs: 0, wickets: 0, overs: 0, balls: 0,
      extras: { wides: 0, noBalls: 0 },
      ballEvents: [],
      batsmenStats,
      bowlersStats,
      currentBatsmen: [striker, nonStriker],
      currentBowler: bowler,
      isCompleted: false
    };

    const match: Match = {
      id: `match_${Date.now()}`,
      userId: user.id,
      team1, team2, venue, totalOvers,
      tossWinner, tossDecision, battingFirst,
      innings: [innings1],
      currentInnings: 0,
      status: 'live',
      createdAt: new Date().toISOString(),
      leagueId: league?.id
    };

    await saveMatch(match);
    onStart(match);
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-white text-xl">←</button>
        <h1 className="text-xl font-bold">Create Match {league ? '(League)' : ''}</h1>
      </div>

      <div className="p-4 space-y-4">
        <div className="flex gap-2 mb-4">
          {[1, 2, 3, 4, 5].map(s => (
            <div key={s} className={`flex-1 h-2 rounded-full ${step >= s ? 'bg-green-500' : 'bg-gray-700'}`} />
          ))}
        </div>

        {step === 1 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Match Details</h3>
            <input type="text" placeholder="Team 1 Name" value={team1Name} onChange={e => setTeam1Name(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none" />
            <input type="text" placeholder="Team 2 Name" value={team2Name} onChange={e => setTeam2Name(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none" />
            <input type="text" placeholder="Venue" value={venue} onChange={e => setVenue(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none" />
            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="text-sm text-gray-400">Total Overs</label>
                <button onClick={randomizeOvers} className="text-xs bg-purple-600 px-3 py-1 rounded hover:bg-purple-700">🎲 Random</button>
              </div>
              <div className="flex gap-2">
                {[3, 5, 10, 15, 20].map(o => (
                  <button key={o} onClick={() => setTotalOvers(o)} className={`flex-1 py-2 rounded-lg font-bold ${totalOvers === o ? 'bg-green-600' : 'bg-gray-700'}`}>{o}</button>
                ))}
              </div>
            </div>
            <button onClick={() => { if (team1Name && team2Name && venue) setStep(2); else alert('Fill all fields'); }}
              className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700">Next →</button>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Team 1: {team1Name} Players</h3>
            <button onClick={() => generatePlayers(1)} className="bg-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-700">🎲 Generate Random Players</button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-6">{i + 1}.</span>
                  <input type="text" placeholder={`Player ${i + 1} name`} value={team1Players[i]?.name || ''} onChange={e => updatePlayerName(1, i, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
                  <span className="text-xs text-gray-500">{team1Players[i]?.role || ''}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(3)} className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700">Next →</button>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">Team 2: {team2Name} Players</h3>
            <button onClick={() => generatePlayers(2)} className="bg-blue-600 px-4 py-2 rounded-lg text-sm hover:bg-blue-700">🎲 Generate Random Players</button>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {Array.from({ length: 11 }).map((_, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-gray-400 text-sm w-6">{i + 1}.</span>
                  <input type="text" placeholder={`Player ${i + 1} name`} value={team2Players[i]?.name || ''} onChange={e => updatePlayerName(2, i, e.target.value)}
                    className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm focus:border-green-500 focus:outline-none" />
                  <span className="text-xs text-gray-500">{team2Players[i]?.role || ''}</span>
                </div>
              ))}
            </div>
            <button onClick={() => setStep(4)} className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700">Next → Toss</button>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">🪙 Toss</h3>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Toss Winner</label>
              <div className="flex gap-3">
                <button onClick={() => setTossWinner(team1Name)} className={`flex-1 py-3 rounded-lg font-bold ${tossWinner === team1Name ? 'bg-green-600' : 'bg-gray-700'}`}>{team1Name}</button>
                <button onClick={() => setTossWinner(team2Name)} className={`flex-1 py-3 rounded-lg font-bold ${tossWinner === team2Name ? 'bg-green-600' : 'bg-gray-700'}`}>{team2Name}</button>
              </div>
            </div>
            <div>
              <label className="text-sm text-gray-400 mb-2 block">Decision</label>
              <div className="flex gap-3">
                <button onClick={() => setTossDecision('bat')} className={`flex-1 py-3 rounded-lg font-bold ${tossDecision === 'bat' ? 'bg-green-600' : 'bg-gray-700'}`}>🏏 Bat</button>
                <button onClick={() => setTossDecision('bowl')} className={`flex-1 py-3 rounded-lg font-bold ${tossDecision === 'bowl' ? 'bg-green-600' : 'bg-gray-700'}`}>⚾ Bowl</button>
              </div>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-sm text-gray-300"><strong>{tossWinner}</strong> won the toss and chose to <strong>{tossDecision}</strong> first</p>
              <p className="text-xs text-gray-500 mt-1">Batting first: {tossDecision === 'bat' ? tossWinner : (tossWinner === team1Name ? team2Name : team1Name)}</p>
            </div>
            <button onClick={() => setStep(5)} className="w-full bg-green-600 py-3 rounded-lg font-bold hover:bg-green-700">Next → Select Opening Players</button>
          </div>
        )}

        {step === 5 && (() => {
          const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === team1Name ? team2Name : team1Name);
          return (
          <div className="space-y-4">
            <h3 className="font-bold text-lg">🏏 Select Opening Players</h3>
            <p className="text-sm text-gray-400">Choose opening batsmen and bowler for {battingFirst}</p>
            
            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="font-bold mb-3 text-green-400">Opening Batsmen</h4>
              <div className="space-y-2">
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Striker</label>
                  <select 
                    id="opening-striker"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Select Opening Batsman</option>
                    {(battingFirst === team1Name ? team1Players : team2Players).map(player => (
                      <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm text-gray-400 mb-1 block">Non-Striker</label>
                  <select 
                    id="opening-non-striker"
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none"
                  >
                    <option value="">Select Non-Striker</option>
                    {(battingFirst === team1Name ? team1Players : team2Players).map(player => (
                      <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="bg-gray-800 rounded-xl p-4">
              <h4 className="font-bold mb-3 text-purple-400">Opening Bowler</h4>
              <select 
                id="opening-bowler"
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
              >
                <option value="">Select Opening Bowler</option>
                {(battingFirst === team1Name ? team2Players : team1Players).map(player => (
                  <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
                ))}
              </select>
            </div>

            <button 
              onClick={() => {
                const strikerSelect = document.getElementById('opening-striker') as HTMLSelectElement;
                const nonStrikerSelect = document.getElementById('opening-non-striker') as HTMLSelectElement;
                const bowlerSelect = document.getElementById('opening-bowler') as HTMLSelectElement;

                const strikerId = strikerSelect.value;
                const nonStrikerId = nonStrikerSelect.value;
                const bowlerId = bowlerSelect.value;

                if (!strikerId || !nonStrikerId || !bowlerId) {
                  alert('Please select all opening players');
                  return;
                }

                if (strikerId === nonStrikerId) {
                  alert('Striker and Non-Striker cannot be the same');
                  return;
                }

                // Update the handleStart function to use these selections
                const battingFirst = tossDecision === 'bat' ? tossWinner : (tossWinner === team1Name ? team2Name : team1Name);
                
                const team1Id = league && leagueTeam1Id ? leagueTeam1Id : `t1_${Date.now()}`;
                const team2Id = league && leagueTeam2Id ? leagueTeam2Id : `t2_${Date.now()}`;
                
                const team1: { id: string; name: string; players: Player[] } = { id: team1Id, name: team1Name, players: team1Players };
                const team2: { id: string; name: string; players: Player[] } = { id: team2Id, name: team2Name, players: team2Players };

                const batsmenStats: Record<string, BatsmanStats> = {};
                const bowlersStats: Record<string, BowlerStats> = {};

                const battingTeam = battingFirst === team1Name ? team1 : team2;
                const bowlingTeam = battingFirst === team1Name ? team2 : team1;

                battingTeam.players.forEach(p => {
                  batsmenStats[p.id] = { playerId: p.id, playerName: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
                });
                bowlingTeam.players.forEach(p => {
                  bowlersStats[p.id] = { playerId: p.id, playerName: p.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, extras: 0 };
                });

                const innings1: InningsData = {
                  battingTeamId: battingFirst === team1Name ? team1.id : team2.id,
                  bowlingTeamId: battingFirst === team1Name ? team2.id : team1.id,
                  runs: 0, wickets: 0, overs: 0, balls: 0,
                  extras: { wides: 0, noBalls: 0 },
                  ballEvents: [],
                  batsmenStats,
                  bowlersStats,
                  currentBatsmen: [strikerId, nonStrikerId],
                  currentBowler: bowlerId,
                  isCompleted: false
                };

                const match: Match = {
                  id: `match_${Date.now()}`,
                  userId: user.id,
                  team1, team2, venue, totalOvers,
                  tossWinner, tossDecision, battingFirst,
                  innings: [innings1],
                  currentInnings: 0,
                  status: 'live',
                  createdAt: new Date().toISOString(),
                  leagueId: league?.id
                };

                saveMatch(match);
                onStart(match);
              }}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 shadow-lg"
            >
              🏏 Start Match
            </button>
          </div>
          );
        })()}
      </div>
    </div>
  );
}

// ============= LIVE SCORING SCREEN - COMPLETELY NEW FROM SCRATCH =============
function LiveScoringScreen({ match, onBack, onUpdate }: { match: Match; onBack: () => void; onUpdate: (m: Match) => void }) {
  // ✅ Simple UI state only
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [show2ndInningsSelection, setShow2ndInningsSelection] = useState(false);
  const [inningBreak, setInningBreak] = useState(false);
  const [showMatchComplete, setShowMatchComplete] = useState(false);
  const [newBatsmanPosition, setNewBatsmanPosition] = useState<'striker' | 'nonStriker'>('striker');
  const [pendingBowlerSelect, setPendingBowlerSelect] = useState(false);
  
  // ✅ Direct access - no complex state
  const innings = match.innings?.[match.currentInnings];
  
  if (!innings) {
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">⚠️</div>
          <h2 className="text-xl font-bold">Match Data Error</h2>
          <button onClick={onBack} className="bg-green-600 px-6 py-2 rounded-lg font-bold">Go Back</button>
        </div>
      </div>
    );
  }

  // ✅ FIX: Use current innings to determine batting/bowling team
  const battingTeam = innings.battingTeamId === match.team1.id ? match.team1 : match.team2;
  const bowlingTeam = innings.bowlingTeamId === match.team1.id ? match.team1 : match.team2;
  
  console.log('🏏 Innings:', match.currentInnings + 1);
  console.log('🏏 Team 1:', match.team1.name, '- ID:', match.team1.id);
  console.log('🏏 Team 2:', match.team2.name, '- ID:', match.team2.id);
  console.log('🏏 Batting team ID:', innings.battingTeamId);
  console.log('🏏 Bowling team ID:', innings.bowlingTeamId);
  console.log('🏏 Batting team name:', battingTeam.name);
  console.log('🏏 Bowling team name:', bowlingTeam.name);
  console.log('🏏 Bowling team players:', bowlingTeam.players.map(p => p.name));
  
  const strikerId = innings.currentBatsmen?.[0];
  const nonStrikerId = innings.currentBatsmen?.[1];
  const striker = strikerId ? innings.batsmenStats?.[strikerId] : null;
  const nonStriker = nonStrikerId ? innings.batsmenStats?.[nonStrikerId] : null;
  
  // ✅ FIX: Get bowler with proper null checking
  const bowlerId = innings.currentBowler;
  const currentBowler = bowlerId && innings.bowlersStats ? innings.bowlersStats[bowlerId] : null;
  
  console.log('🔍 Current bowler ID:', bowlerId);
  console.log('🔍 Current bowler data:', currentBowler);
  console.log('🔍 All bowlers stats:', innings.bowlersStats);
  
  const strikerDisplayName = !strikerId ? '⏳ Selecting new batsman...' : (striker?.playerName || 'No batsman');
  const bowlerDisplayName = !bowlerId ? '⏳ Selecting new bowler...' : (currentBowler?.playerName || 'No bowler');

  const firstInnings = match.innings[0];
  const target = match.currentInnings === 1 && firstInnings ? firstInnings.runs + 1 : null;
  const remaining = target !== null ? target - innings.runs : null;
  const ballsRemaining = (match.totalOvers * 6) - (innings.overs * 6 + innings.balls);
  const totalBallsBowled = innings.overs + innings.balls / 6;
  const runRate = totalBallsBowled > 0 ? (innings.runs / totalBallsBowled).toFixed(2) : '0.00';
  const reqRunRate = remaining !== null && ballsRemaining > 0 ? (remaining / (ballsRemaining / 6)).toFixed(2) : null;

  const getTeamName = (teamId: string) => teamId === match.team1.id ? match.team1.name : match.team2.name;

  // ✅ NEW: Process ball - completely rewritten from scratch
  const processBall = (runs: number, isWide: boolean, isNoBall: boolean, isWicket: boolean, wicketType?: string) => {
    // Create deep copy of match
    const newMatch = JSON.parse(JSON.stringify(match)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn) return;
    
    // Store current over/ball before update
    const currentOver = inn.overs;
    const currentBall = inn.balls;

    // Update balls count FIRST (not for wide/no-ball)
    if (!isWide && !isNoBall) {
      inn.balls += 1;
      if (inn.balls === 6) {
        inn.overs += 1;
        inn.balls = 0;
      }
    }

    // Create ball event with correct over/ball
    const ballEvent: BallEvent = {
      id: `ball_${Date.now()}_${Math.random()}`,
      ballNumber: currentOver * 6 + currentBall + (isWide || isNoBall ? 0 : 1),
      over: currentOver,
      ball: currentBall + (isWide || isNoBall ? 0 : 1),
      runs,
      isWide,
      isNoBall,
      isWicket,
      wicketType: wicketType as any,
      batsmanId: inn.currentBatsmen[0],
      bowlerId: inn.currentBowler,
      timestamp: new Date().toISOString()
    };

    // Update innings runs and events
    inn.runs += runs;
    inn.ballEvents.push(ballEvent);

    // Update extras
    if (isWide) inn.extras.wides += runs;
    if (isNoBall) inn.extras.noBalls += runs;

    // Update batsman stats
    const batsmanStat = inn.batsmenStats?.[inn.currentBatsmen[0]];
    if (batsmanStat && !isWide) {
      batsmanStat.runs += runs;
      batsmanStat.balls += 1;
      if (runs === 4) batsmanStat.fours += 1;
      if (runs === 6) batsmanStat.sixes += 1;
    }

    // Update bowler stats
    const bowlerStat = inn.bowlersStats?.[inn.currentBowler];
    if (bowlerStat) {
      bowlerStat.runs += runs;
      if (!isWide && !isNoBall) {
        bowlerStat.balls += 1;
        if (bowlerStat.balls === 6) {
          bowlerStat.overs += 1;
          bowlerStat.balls = 0;
        }
      }
      if (isWide || isNoBall) bowlerStat.extras += runs;
    }

    // Handle wicket
    if (isWicket && !isWide) {
      if (batsmanStat) {
        batsmanStat.isOut = true;
        batsmanStat.dismissal = wicketType || 'out';
      }
      if (bowlerStat) bowlerStat.wickets += 1;
      inn.wickets += 1;

      if (inn.wickets >= 10) {
        inn.isCompleted = true;
        handleInningsEnd(newMatch);
        onUpdate(newMatch);
      } else {
        // Clear striker for new batsman
        inn.currentBatsmen[0] = '';
        setNewBatsmanPosition('striker');
        
        // Check if this was the last ball of the over (ball was 5, now balls is 0 after increment)
        const wasLastBallOfOver = (currentBall === 5);
        if (wasLastBallOfOver) {
          setPendingBowlerSelect(true);
        }
        
        onUpdate(newMatch);
        setShowNewBatsman(true);
      }
      return;
    }

    // Rotate strike on odd runs
    if (!isWide && (runs === 1 || runs === 3)) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
    }

    // End of over
    if (!isWide && !isNoBall && inn.balls === 0 && inn.overs > 0) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
      
      if (inn.overs >= match.totalOvers) {
        inn.isCompleted = true;
        handleInningsEnd(newMatch);
        onUpdate(newMatch);
      } else {
        // Clear bowler for new selection
        inn.currentBowler = '';
        onUpdate(newMatch);
        setShowBowlerSelect(true);
      }
      return;
    }

    // Check if target achieved
    if (target && inn.runs >= target) {
      inn.isCompleted = true;
      handleInningsEnd(newMatch);
    }

    onUpdate(newMatch);
  };

  // ✅ NEW: Handle innings end
  const handleInningsEnd = (newMatch: Match) => {
    if (newMatch.currentInnings === 0) {
      setInningBreak(true);
      onUpdate(newMatch);
    } else {
      const inn1 = newMatch.innings[0];
      const inn2 = newMatch.innings[1];
      let result = '';
      
      if (!inn1 || !inn2) {
        result = 'Match completed';
      } else if (inn2.runs >= inn1.runs + 1) {
        const wicketsLeft = 10 - inn2.wickets;
        result = `${getTeamName(inn2.battingTeamId)} won by ${wicketsLeft} wickets`;
      } else if (inn1.runs > inn2.runs) {
        result = `${getTeamName(inn1.battingTeamId)} won by ${inn1.runs - inn2.runs} runs`;
      } else {
        result = 'Match Tied!';
      }
      
      newMatch.status = 'completed';
      newMatch.result = result;
      
      if (newMatch.leagueId) {
        updateLeagueStandings(newMatch);
      }
      
      setShowMatchComplete(true);
      onUpdate(newMatch);
    }
  };

  // ✅ NEW: Start second innings
  const startSecondInnings = () => {
    const newMatch = JSON.parse(JSON.stringify(match)) as Match;
    const firstInnings = newMatch.innings[0];
    if (!firstInnings) return;
    
    const secondBattingTeamId = firstInnings.bowlingTeamId;
    const secondBowlingTeamId = firstInnings.battingTeamId;
    
    const secondBattingTeam = secondBattingTeamId === newMatch.team1.id ? newMatch.team1 : newMatch.team2;
    const secondBowlingTeam = secondBowlingTeamId === newMatch.team1.id ? newMatch.team1 : newMatch.team2;

    const batsmenStats: Record<string, BatsmanStats> = {};
    const bowlersStats: Record<string, BowlerStats> = {};

    secondBattingTeam.players.forEach((p: Player) => {
      batsmenStats[p.id] = { playerId: p.id, playerName: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    });
    secondBowlingTeam.players.forEach((p: Player) => {
      bowlersStats[p.id] = { playerId: p.id, playerName: p.name, overs: 0, balls: 0, maidens: 0, runs: 0, wickets: 0, extras: 0 };
    });

    const innings2: InningsData = {
      battingTeamId: secondBattingTeamId,
      bowlingTeamId: secondBowlingTeamId,
      runs: 0, wickets: 0, overs: 0, balls: 0,
      extras: { wides: 0, noBalls: 0 },
      ballEvents: [],
      batsmenStats,
      bowlersStats,
      currentBatsmen: ['', ''],
      currentBowler: '',
      isCompleted: false
    };

    newMatch.innings.push(innings2);
    newMatch.currentInnings = 1;
    setInningBreak(false);
    setShow2ndInningsSelection(true);
    onUpdate(newMatch);
  };

  // ✅ NEW: Select new batsman
  const selectNewBatsman = (playerId: string) => {
    const newMatch = JSON.parse(JSON.stringify(match)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    
    if (!inn) return;
    
    // Update batsman based on position
    if (newBatsmanPosition === 'striker') {
      inn.currentBatsmen[0] = playerId;
    } else {
      inn.currentBatsmen[1] = playerId;
    }
    
    setShowNewBatsman(false);
    onUpdate(newMatch);
    
    // Check if we need to select bowler (last ball wicket)
    if (pendingBowlerSelect) {
      setPendingBowlerSelect(false);
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
      inn.currentBowler = '';
      onUpdate(newMatch);
      setShowBowlerSelect(true);
    }
  };

  // ✅ NEW: Select new bowler
  const selectBowler = (playerId: string) => {
    console.log('🎯 Selecting bowler:', playerId);
    const newMatch = JSON.parse(JSON.stringify(match)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    
    if (!inn) {
      console.error('❌ Innings not found');
      return;
    }
    
    // Set current bowler
    inn.currentBowler = playerId;
    console.log('✅ Set currentBowler to:', playerId);
    console.log('✅ Bowler stats:', inn.bowlersStats?.[playerId]);
    
    // Close modal
    setShowBowlerSelect(false);
    
    // Update parent
    onUpdate(newMatch);
    console.log('✅ Match updated with new bowler');
  };

  // ✅ NEW: Handle undo
  const handleUndo = () => {
    const newMatch = JSON.parse(JSON.stringify(match)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn || !inn.ballEvents || inn.ballEvents.length === 0) return;
    
    const lastEvent = inn.ballEvents.pop()!;
    if (!lastEvent) return;
    
    // Reverse innings stats
    inn.runs -= (lastEvent.runs || 0);
    if (!lastEvent.isWide && !lastEvent.isNoBall) {
      inn.balls -= 1;
      if (inn.balls < 0) { inn.overs -= 1; inn.balls = 5; }
    }
    if (lastEvent.isWide) inn.extras.wides -= (lastEvent.runs || 0);
    if (lastEvent.isNoBall) inn.extras.noBalls -= (lastEvent.runs || 0);

    // Reverse batsman stats
    const batsmanStat = inn.batsmenStats?.[lastEvent.batsmanId];
    if (batsmanStat && !lastEvent.isWide) {
      batsmanStat.runs -= (lastEvent.runs || 0);
      batsmanStat.balls -= 1;
      if (lastEvent.runs === 4) batsmanStat.fours -= 1;
      if (lastEvent.runs === 6) batsmanStat.sixes -= 1;
    }

    // Reverse bowler stats
    const bowlerStat = inn.bowlersStats?.[lastEvent.bowlerId];
    if (bowlerStat) {
      bowlerStat.runs -= (lastEvent.runs || 0);
      if (!lastEvent.isWide && !lastEvent.isNoBall) {
        bowlerStat.balls -= 1;
        if (bowlerStat.balls < 0) { bowlerStat.overs -= 1; bowlerStat.balls = 5; }
      }
      if (lastEvent.isWide || lastEvent.isNoBall) bowlerStat.extras -= (lastEvent.runs || 0);
    }

    // Reverse wicket
    if (lastEvent.isWicket && batsmanStat && bowlerStat) {
      batsmanStat.isOut = false;
      batsmanStat.dismissal = undefined;
      bowlerStat.wickets -= 1;
      inn.wickets -= 1;
    }

    onUpdate(newMatch);
  };

  // Match Complete Screen
  if (showMatchComplete || match.status === 'completed') {
    return <MatchSummaryScreen match={match} onBack={onBack} />;
  }

  // Innings break screen
  if (inningBreak) {
    const firstInn = match.innings[0];
    if (!firstInn) {
      return (
        <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
          <button onClick={onBack} className="bg-green-600 px-6 py-2 rounded-lg font-bold">Go Back</button>
        </div>
      );
    }
    return (
      <div className="min-h-screen bg-gray-900 text-white flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <div className="text-5xl">🏏</div>
          <h2 className="text-2xl font-bold">Innings Break</h2>
          <div className="bg-gray-800 rounded-xl p-4">
            <p className="text-lg">{getTeamName(firstInn.battingTeamId)}</p>
            <p className="text-4xl font-bold text-green-400">{firstInn.runs}/{firstInn.wickets}</p>
            <p className="text-gray-400">({firstInn.overs}.{firstInn.balls} overs)</p>
          </div>
          <p className="text-yellow-400 text-lg font-bold">Target: {firstInn.runs + 1}</p>
          <p className="text-gray-300">{getTeamName(firstInn.bowlingTeamId)} needs {firstInn.runs + 1} runs to win</p>
          <button onClick={startSecondInnings} className="bg-green-600 px-8 py-3 rounded-lg font-bold text-lg hover:bg-green-700">
            Start 2nd Innings →
          </button>
        </div>
      </div>
    );
  }

  // 2nd Innings Opening Selection
  if (show2ndInningsSelection) {
    const secondInnings = match.innings[1];
    const secondBattingTeam = secondInnings?.battingTeamId === match.team1.id ? match.team1 : match.team2;
    const secondBowlingTeam = secondInnings?.bowlingTeamId === match.team1.id ? match.team1 : match.team2;
    
    return (
      <div className="min-h-screen bg-gray-900 text-white p-4">
        <div className="text-center mb-6">
          <div className="text-5xl mb-3">🏏</div>
          <h2 className="text-2xl font-bold">2nd Innings - Select Opening Players</h2>
          <p className="text-gray-400 mt-2">Choose opening batsmen and bowler for {secondBattingTeam.name}</p>
        </div>

        <div className="space-y-6">
          {/* Opening Batsmen Selection */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold text-lg mb-3 text-green-400">🏏 Opening Batsmen</h3>
            <div className="space-y-2">
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Striker</label>
                <select 
                  id="2nd-striker"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select Opening Batsman</option>
                  {secondBattingTeam.players.map(player => (
                    <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm text-gray-400 mb-1 block">Non-Striker</label>
                <select 
                  id="2nd-non-striker"
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-green-500 focus:outline-none"
                >
                  <option value="">Select Non-Striker</option>
                  {secondBattingTeam.players.map(player => (
                    <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Opening Bowler Selection */}
          <div className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold text-lg mb-3 text-purple-400">⚾ Opening Bowler</h3>
            <select 
              id="2nd-bowler"
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 focus:border-purple-500 focus:outline-none"
            >
              <option value="">Select Opening Bowler</option>
              {secondBowlingTeam.players.map(player => (
                <option key={player.id} value={player.id}>{player.name} ({player.role})</option>
              ))}
            </select>
          </div>

          {/* Start Button */}
          <button 
            onClick={() => {
              const strikerSelect = document.getElementById('2nd-striker') as HTMLSelectElement;
              const nonStrikerSelect = document.getElementById('2nd-non-striker') as HTMLSelectElement;
              const bowlerSelect = document.getElementById('2nd-bowler') as HTMLSelectElement;

              const strikerId = strikerSelect.value;
              const nonStrikerId = nonStrikerSelect.value;
              const bowlerId = bowlerSelect.value;

              if (!strikerId || !nonStrikerId || !bowlerId) {
                alert('Please select all opening players');
                return;
              }

              if (strikerId === nonStrikerId) {
                alert('Striker and Non-Striker cannot be the same');
                return;
              }

              const newMatch = JSON.parse(JSON.stringify(match)) as Match;
              const inn = newMatch.innings[1];
              
              inn.currentBatsmen = [strikerId, nonStrikerId];
              inn.currentBowler = bowlerId;

              setShow2ndInningsSelection(false);
              onUpdate(newMatch);
            }}
            className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-4 rounded-lg font-bold text-lg hover:from-green-600 hover:to-emerald-700 shadow-lg"
          >
            🏏 Start 2nd Innings
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-gradient-to-b from-gray-900 via-gray-900 to-black text-white overflow-hidden flex flex-col">
      {/* Header - Enhanced */}
      <div className="bg-gradient-to-r from-red-900 via-red-800 to-red-900 px-4 py-3 shadow-lg flex-shrink-0">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="bg-white/10 hover:bg-white/20 p-2 rounded-lg transition-all">
            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div className="text-center">
            <div className="flex items-center gap-2 justify-center mb-1">
              <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse"></div>
              <p className="text-xs text-red-200 font-bold tracking-wider">LIVE</p>
            </div>
            <p className="font-black text-lg text-white uppercase tracking-wide">
              {getTeamName(innings.battingTeamId)} <span className="text-red-300 text-sm">VS</span> {getTeamName(innings.bowlingTeamId)}
            </p>
          </div>
          <button onClick={handleUndo} className="bg-gradient-to-r from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700 px-3 py-2 rounded-lg text-xs font-bold shadow-lg transition-all flex items-center gap-1">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
            </svg>
            <span>Undo</span>
          </button>
        </div>
      </div>

      {/* Score Card - Enhanced */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 px-4 py-3 shadow-xl flex-shrink-0">
        <div className="text-center">
          <div className="inline-block bg-gradient-to-r from-green-600 to-emerald-600 rounded-full px-4 py-1 mb-2 shadow-lg">
            <p className="text-xs text-white font-bold">{getTeamName(innings.battingTeamId)} - Innings {match.currentInnings + 1}</p>
          </div>
          <div className="flex items-center justify-center gap-3 mb-2">
            <span className="text-5xl font-black bg-gradient-to-r from-yellow-400 via-yellow-500 to-yellow-600 bg-clip-text text-transparent drop-shadow-lg">{innings.runs}</span>
            <span className="text-3xl font-bold text-gray-400">/{innings.wickets}</span>
          </div>
          <div className="inline-block bg-gray-700/50 rounded-full px-4 py-1 mb-2">
            <p className="text-sm text-gray-300">
              <span className="font-bold text-white text-lg">{innings.overs}.{innings.balls}</span>
              <span className="text-gray-400"> / {match.totalOvers} overs</span>
            </p>
          </div>
          <div className="flex justify-center gap-2">
            <div className="bg-blue-500/20 border border-blue-500/30 rounded-lg px-3 py-1">
              <span className="text-xs text-blue-300 font-semibold">CRR: {runRate}</span>
            </div>
            {reqRunRate && (
              <div className="bg-yellow-500/20 border border-yellow-500/30 rounded-lg px-3 py-1">
                <span className="text-xs text-yellow-300 font-semibold">RRR: {reqRunRate}</span>
              </div>
            )}
            {remaining !== null && (
              <div className="bg-red-500/20 border border-red-500/30 rounded-lg px-3 py-1">
                <span className="text-xs text-red-300 font-semibold">Need: {remaining} off {ballsRemaining}</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Batsmen Cards - Ultra Compact */}
      <div className="px-3 py-1.5 flex-shrink-0">
        <div className="grid grid-cols-2 gap-2">
          {/* Striker Card with Active Red Circle */}
          <div className={`relative bg-gradient-to-br from-green-900/60 to-green-800/40 rounded-lg p-1.5 border-2 shadow-lg ${!strikerId ? 'border-yellow-500/70 animate-pulse' : striker?.isOut ? 'border-red-700/50 opacity-60' : 'border-green-600/50'}`}>
            {/* Active Red Circle Indicator */}
            {strikerId && !striker?.isOut && (
              <div className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full border-2 border-white shadow-lg animate-pulse"></div>
            )}
            <div className="flex items-center gap-1 mb-0.5">
              <div className="bg-green-500/30 p-0.5 rounded">
                <svg className="w-2.5 h-2.5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <span className="text-[9px] text-green-300 font-bold">STRIKER</span>
              {!strikerId && <span className="text-[9px] text-yellow-400 ml-auto font-bold">NEW</span>}
              {striker?.isOut && strikerId && <span className="text-[9px] text-red-400 ml-auto font-bold">OUT</span>}
            </div>
            <p className="font-bold text-[11px] truncate mb-0.5">{strikerDisplayName}</p>
            {strikerId && (
              <>
                <p className="text-base font-black bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
                  {striker?.runs || 0} 
                  <span className="text-[10px] text-gray-400 font-normal ml-0.5">({striker?.balls || 0})</span>
                </p>
                <div className="flex gap-1 text-[9px] text-gray-300 mt-0.5">
                  <div className="bg-blue-500/20 px-1 py-0.5 rounded">
                    <span className="font-bold text-blue-400">4s:</span> {striker?.fours || 0}
                  </div>
                  <div className="bg-purple-500/20 px-1 py-0.5 rounded">
                    <span className="font-bold text-purple-400">6s:</span> {striker?.sixes || 0}
                  </div>
                </div>
              </>
            )}
          </div>
          
          {/* Non-Striker Card with Swap Icon */}
          <div className="bg-gradient-to-br from-blue-900/60 to-blue-800/40 rounded-lg p-1.5 border-2 border-blue-600/50 shadow-lg relative">
            {/* Swap Icon - Top Right */}
            {strikerId && nonStrikerId && (
              <button
                onClick={() => {
                  const newMatch = JSON.parse(JSON.stringify(match)) as Match;
                  const inn = newMatch.innings[newMatch.currentInnings];
                  if (inn) {
                    inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
                    onUpdate(newMatch);
                  }
                }}
                className="absolute top-1 right-1 bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-600 hover:to-orange-600 p-1 rounded-full shadow-lg transition-all transform hover:scale-110 active:scale-95"
                title="Swap Batsmen"
              >
                <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
              </button>
            )}
            
            <div className="flex items-center gap-1 mb-0.5">
              <div className="bg-blue-500/30 p-0.5 rounded">
                <svg className="w-2.5 h-2.5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <span className="text-[9px] text-blue-300 font-bold">NON-STRIKER</span>
            </div>
            <p className="font-bold text-[11px] truncate mb-0.5 pr-5">{nonStriker?.playerName || 'No batsman'}</p>
            <p className="text-base font-black bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">
              {nonStriker?.runs || 0} 
              <span className="text-[10px] text-gray-400 font-normal ml-0.5">({nonStriker?.balls || 0})</span>
            </p>
            <div className="flex gap-1 text-[9px] text-gray-300 mt-0.5">
              <div className="bg-blue-500/20 px-1 py-0.5 rounded">
                <span className="font-bold text-blue-400">4s:</span> {nonStriker?.fours || 0}
              </div>
              <div className="bg-purple-500/20 px-1 py-0.5 rounded">
                <span className="font-bold text-purple-400">6s:</span> {nonStriker?.sixes || 0}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bowler Card - Compact with Per Ball Stats */}
      <div className="px-3 mb-2 flex-shrink-0">
        <div className={`bg-gradient-to-br from-purple-900/60 to-purple-800/40 rounded-xl p-2 border-2 shadow-lg ${!innings.currentBowler ? 'border-yellow-500/70 animate-pulse' : 'border-purple-600/50'}`}>
          <div className="flex items-center justify-between mb-1">
            <div className="flex-1">
              <div className="flex items-center gap-1 mb-0.5">
                <div className="bg-purple-500/30 p-0.5 rounded">
                  <svg className="w-2.5 h-2.5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                </div>
                <span className="text-[9px] text-purple-300 font-bold">BOWLER</span>
                {!innings.currentBowler && <span className="text-[9px] text-yellow-400 font-bold ml-1">NEW OVER</span>}
              </div>
              <p className="font-bold text-[11px]">{bowlerDisplayName}</p>
            </div>
            {innings.currentBowler && (
              <div className="text-right bg-purple-500/20 rounded-lg px-2 py-1">
                <p className="text-base font-black bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                  {currentBowler?.overs || 0}.{currentBowler?.balls || 0}
                </p>
                <div className="flex gap-1 text-[9px] text-gray-300">
                  <span className="font-bold">{currentBowler?.maidens || 0}M</span>
                  <span className="font-bold">{currentBowler?.runs || 0}R</span>
                  <span className="font-bold text-red-400">{currentBowler?.wickets || 0}W</span>
                </div>
              </div>
            )}
          </div>
          
          {/* Per Over Per Ball Stats */}
          {innings.currentBowler && currentBowler && (
            <div className="bg-black/30 rounded-lg p-1.5 mt-1">
              <div className="grid grid-cols-3 gap-1 text-center">
                <div>
                  <p className="text-[8px] text-gray-400 uppercase">Economy</p>
                  <p className="text-xs font-bold text-cyan-400">
                    {(currentBowler.overs + currentBowler.balls / 6) > 0 
                      ? (currentBowler.runs / (currentBowler.overs + currentBowler.balls / 6)).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase">Per Ball</p>
                  <p className="text-xs font-bold text-yellow-400">
                    {(currentBowler.overs * 6 + currentBowler.balls) > 0
                      ? (currentBowler.runs / (currentBowler.overs * 6 + currentBowler.balls)).toFixed(2)
                      : '0.00'}
                  </p>
                </div>
                <div>
                  <p className="text-[8px] text-gray-400 uppercase">Extras</p>
                  <p className="text-xs font-bold text-orange-400">
                    {currentBowler.extras || 0}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Scoring Buttons - Ultra Compact */}
      <div className="px-3 flex-1 flex flex-col justify-center">
        <div className="grid grid-cols-4 gap-1 mb-1.5">
          {[0, 1, 2, 3].map(r => (
            <button key={r} onClick={() => processBall(r, false, false, false)}
              className="bg-gradient-to-b from-gray-700 to-gray-800 py-2 rounded-lg font-bold text-base hover:from-gray-600 hover:to-gray-700 active:scale-95 transition-all border border-gray-600 shadow-md">
              {r}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-1 mb-1.5">
          <button onClick={() => processBall(4, false, false, false)}
            className="bg-gradient-to-b from-blue-600 to-blue-800 py-2 rounded-lg font-bold text-base hover:from-blue-500 hover:to-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/50">
            4
          </button>
          <button onClick={() => processBall(6, false, false, false)}
            className="bg-gradient-to-b from-green-600 to-green-800 py-2 rounded-lg font-bold text-base hover:from-green-500 hover:to-green-700 active:scale-95 transition-all shadow-lg shadow-green-900/50">
            6
          </button>
          <button onClick={() => processBall(1, true, false, false)}
            className="bg-gradient-to-b from-yellow-600 to-yellow-800 py-2 rounded-lg font-bold text-[10px] hover:from-yellow-500 hover:to-yellow-700 active:scale-95 transition-all shadow-md">
            Wide
          </button>
        </div>
        <div className="grid grid-cols-3 gap-1 mb-1.5">
          <button onClick={() => processBall(1, false, true, false)}
            className="bg-gradient-to-b from-orange-600 to-orange-800 py-2 rounded-lg font-bold text-[10px] hover:from-orange-500 hover:to-orange-700 active:scale-95 transition-all shadow-md">
            No Ball
          </button>
          <button onClick={() => processBall(0, false, false, true, 'bowled')}
            className="bg-gradient-to-b from-red-600 to-red-800 py-2 rounded-lg font-bold text-[10px] hover:from-red-500 hover:to-red-700 active:scale-95 transition-all shadow-lg shadow-red-900/50">
            Wicket
          </button>
          <button onClick={() => processBall(0, false, false, false)}
            className="bg-gradient-to-b from-gray-600 to-gray-800 py-2 rounded-lg font-bold text-[10px] hover:from-gray-500 hover:to-gray-700 active:scale-95 transition-all shadow-md">
            Dot
          </button>
        </div>
        
        {/* Recent Balls - Modern Design */}
        <div className="bg-black/30 rounded-lg p-1.5">
          <p className="text-[8px] text-gray-400 mb-1 uppercase font-bold">This Over</p>
          <div className="flex gap-1 flex-wrap">
            {(innings.ballEvents || [])
              .filter(e => e.over === innings.overs && (innings.balls > 0 ? e.over === innings.overs : e.over === innings.overs - 1))
              .slice(-12)
              .map((e, i) => (
                <div key={i} className={`w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-bold shadow-md ${
                  e.isWicket ? 'bg-gradient-to-br from-red-500 to-red-700 text-white' : 
                  (e.runs || 0) === 4 ? 'bg-gradient-to-br from-blue-500 to-blue-700 text-white' : 
                  (e.runs || 0) === 6 ? 'bg-gradient-to-br from-green-500 to-green-700 text-white' : 
                  e.isWide ? 'bg-gradient-to-br from-yellow-500 to-yellow-700 text-white' : 
                  e.isNoBall ? 'bg-gradient-to-br from-orange-500 to-orange-700 text-white' : 
                  (e.runs || 0) === 0 ? 'bg-gradient-to-br from-gray-600 to-gray-800 text-gray-300' : 
                  'bg-gradient-to-br from-gray-500 to-gray-700 text-white'
                }`}>
                  {e.isWicket ? 'W' : e.isWide ? 'Wd' : e.isNoBall ? 'Nb' : (e.runs ?? 0)}
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Bowler Selection Modal */}
      {showBowlerSelect && (() => {
        // ✅ FIX: Recalculate bowling team inside modal with CORRECT logic
        const modalBowlingTeam = innings.bowlingTeamId === match.team1.id ? match.team1 : match.team2;
        
        console.log('🎯 Modal - Team 1:', match.team1.name, '- ID:', match.team1.id);
        console.log('🎯 Modal - Team 2:', match.team2.name, '- ID:', match.team2.id);
        console.log('🎯 Modal - Bowling team ID:', innings.bowlingTeamId);
        console.log('🎯 Modal - Bowling team name:', modalBowlingTeam.name);
        console.log('🎯 Modal - Bowling team players:', modalBowlingTeam.players.map(p => p.name));
        
        // ✅ FIX: Find last over's bowler to enforce 1 over gap rule
        const lastOverBowlerId = innings.ballEvents
          .filter(e => e.over === innings.overs - 1)
          .map(e => e.bowlerId)[0] || '';
        
        // ✅ Get available bowlers (excluding current and last over's bowler)
        const availableBowlers = modalBowlingTeam.players.filter(p => {
          // Exclude current bowler (if any)
          if (innings.currentBowler && p.id === innings.currentBowler) return false;
          // Exclude last over's bowler (1 over gap rule)
          if (lastOverBowlerId && p.id === lastOverBowlerId) return false;
          return true;
        });
        
        console.log('🎯 Available bowlers:', availableBowlers.map(p => p.name));
        console.log('🚫 Current bowler:', innings.currentBowler);
        console.log('🚫 Last over bowler:', lastOverBowlerId);
        
        return (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 w-full max-w-sm max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">⚾ Select Bowler for Over {innings.overs + 1}</h3>
            {lastOverBowlerId && (
              <p className="text-xs text-yellow-400 mb-2">
                ⚠️ Last over's bowler cannot bowl this over (1 over gap rule)
              </p>
            )}
            <div className="space-y-2">
              {availableBowlers.map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="bowler-select" 
                    id={`bowler-${p.id}`}
                    className="w-5 h-5"
                  />
                  <label htmlFor={`bowler-${p.id}`} className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg text-left flex justify-between items-center cursor-pointer">
                    <span>{p.name}</span>
                    <span className="text-xs text-gray-400">{p.role}</span>
                  </label>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const selectedRadio = document.querySelector('input[name="bowler-select"]:checked') as HTMLInputElement;
                if (selectedRadio) {
                  const bowlerId = selectedRadio.id.replace('bowler-', '');
                  selectBowler(bowlerId);
                } else {
                  alert('Please select a bowler');
                }
              }}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold"
            >
              ✓ Add Bowler
            </button>
          </div>
        </div>
        );
      })()}

      {/* New Batsman Modal */}
      {showNewBatsman && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 w-full max-w-sm max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">
              🏏 Select New Batsman ({newBatsmanPosition === 'striker' ? 'Striker' : 'Non-Striker'})
            </h3>
            <div className="space-y-2">
              {battingTeam.players.filter(p => !innings.batsmenStats?.[p.id]?.isOut && !innings.currentBatsmen.includes(p.id)).map(p => (
                <div key={p.id} className="flex items-center gap-2">
                  <input 
                    type="radio" 
                    name="batsman-select" 
                    id={`batsman-${p.id}`}
                    className="w-5 h-5"
                  />
                  <label htmlFor={`batsman-${p.id}`} className="flex-1 bg-gray-700 hover:bg-gray-600 px-4 py-3 rounded-lg text-left flex justify-between items-center cursor-pointer">
                    <span>{p.name}</span>
                    <span className="text-xs text-gray-400">{p.role}</span>
                  </label>
                </div>
              ))}
            </div>
            <button 
              onClick={() => {
                const selectedRadio = document.querySelector('input[name="batsman-select"]:checked') as HTMLInputElement;
                if (selectedRadio) {
                  const batsmanId = selectedRadio.id.replace('batsman-', '');
                  selectNewBatsman(batsmanId);
                } else {
                  alert('Please select a batsman');
                }
              }}
              className="w-full mt-4 bg-green-600 hover:bg-green-700 py-3 rounded-lg font-bold"
            >
              ✓ Add Batsman
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============= MATCH SUMMARY SCREEN =============
function MatchSummaryScreen({ match, onBack }: { match: Match; onBack: () => void }) {
  const getTeamName = (teamId: string) => teamId === match.team1.id ? match.team1.name : match.team2.name;

  const handleShare = () => {
    const inn1 = match.innings?.[0];
    const inn2 = match.innings?.[1];
    let text = `🏏 Match Summary\n\n`;
    text += `${match.team1.name} vs ${match.team2.name}\n`;
    text += `Venue: ${match.venue}\n\n`;
    if (inn1) text += `${getTeamName(inn1.battingTeamId)}: ${inn1.runs}/${inn1.wickets} (${inn1.overs}.${inn1.balls})\n`;
    if (inn2) text += `${getTeamName(inn2.battingTeamId)}: ${inn2.runs}/${inn2.wickets} (${inn2.overs}.${inn2.balls})\n`;
    if (match.result) text += `\nResult: ${match.result}`;
    text += `\n\nvia CricScore Pro`;

    // Share to Facebook
    const facebookShareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(window.location.href)}&quote=${encodeURIComponent(text)}`;
    window.open(facebookShareUrl, '_blank');
  };

  const handleDownload = async () => {
    try {
      const { exportMatchToPDF } = await import('./exportImport');
      await exportMatchToPDF(match);
      alert('✅ Match summary downloaded to your phone!');
    } catch (err: any) {
      alert('❌ Failed to download: ' + err.message);
    }
  };

  // Determine winning team name for blue color
  const getWinningTeamName = () => {
    if (!match.result) return null;
    if (match.result.includes('won by')) {
      const matchResult = match.result;
      if (matchResult.includes(match.team1.name + ' won')) return match.team1.name;
      if (matchResult.includes(match.team2.name + ' won')) return match.team2.name;
    }
    return null;
  };

  const winningTeam = getWinningTeamName();

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 px-4 py-4 flex items-center justify-between">
        <button onClick={onBack} className="text-white text-xl">←</button>
        <h1 className="font-bold">Match Summary</h1>
        <div className="flex gap-3">
          <button 
            onClick={handleShare} 
            className="group relative bg-gradient-to-br from-blue-500 via-blue-600 to-indigo-700 hover:from-blue-600 hover:via-blue-700 hover:to-indigo-800 text-white w-12 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95"
            title="Share to Social Media"
          >
            <svg className="w-6 h-6 group-hover:rotate-12 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
          </button>
          <button 
            onClick={handleDownload} 
            className="group relative bg-gradient-to-br from-purple-500 via-purple-600 to-pink-700 hover:from-purple-600 hover:via-purple-700 hover:to-pink-800 text-white w-12 h-12 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 flex items-center justify-center transform hover:scale-110 active:scale-95"
            title="Download Match Summary"
          >
            <svg className="w-6 h-6 group-hover:translate-y-1 transition-transform duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
            </svg>
          </button>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {match.result && (
          <div className="bg-gradient-to-r from-yellow-900/50 to-yellow-800/30 rounded-xl p-4 border-2 border-yellow-500/50 text-center">
            <p className="text-yellow-300 font-bold text-xl mb-2">🏆 COMPLETE</p>
            <p className="text-lg">
              {winningTeam ? (
                <>
                  <span className="text-blue-400 font-bold">{winningTeam}</span>
                  <span className="text-yellow-300"> {match.result.replace(winningTeam + ' ', '').replace('won by', 'won by')}</span>
                </>
              ) : (
                <span className="text-yellow-300">{match.result}</span>
              )}
            </p>
          </div>
        )}

        <div className="bg-gray-800 rounded-xl p-4">
          {match.innings && match.innings.map((inn, idx) => (
            <div key={idx} className={`${idx > 0 ? 'mt-3 pt-3 border-t border-gray-700' : ''}`}>
              <div className="flex justify-between items-center">
                <span className="font-bold">{inn ? getTeamName(inn.battingTeamId) : 'Unknown'}</span>
                <span className="text-xl font-bold text-green-400">{inn ? `${inn.runs}/${inn.wickets} (${inn.overs}.${inn.balls})` : '-'}</span>
              </div>
            </div>
          ))}
        </div>

        {match.innings && match.innings.map((inn, idx) => (
          <div key={`bat-${idx}`} className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold text-sm text-green-400 mb-3">🏏 Batting - {inn ? getTeamName(inn.battingTeamId) : 'Unknown'}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-1">Batsman</th>
                  <th className="text-center py-1">R</th>
                  <th className="text-center py-1">B</th>
                  <th className="text-center py-1">4s</th>
                  <th className="text-center py-1">6s</th>
                  <th className="text-center py-1">SR</th>
                </tr>
              </thead>
              <tbody>
                {inn?.batsmenStats && Object.values(inn.batsmenStats).map((b, i) => (
                  <tr key={i} className={`border-b border-gray-700/30 ${b?.isOut ? 'text-gray-400' : 'text-white'}`}>
                    <td className="py-1 text-xs truncate max-w-[100px]">
                      {b?.playerName || 'Unknown'} {b?.isOut && <span className="text-red-400 text-[10px]">({b.dismissal})</span>}
                    </td>
                    <td className="text-center font-bold">{b?.runs || 0}</td>
                    <td className="text-center text-gray-400">{b?.balls || 0}</td>
                    <td className="text-center text-blue-400">{b?.fours || 0}</td>
                    <td className="text-center text-green-400">{b?.sixes || 0}</td>
                    <td className="text-center text-gray-400">{b?.balls && b.balls > 0 ? ((b.runs / b.balls) * 100).toFixed(0) : '0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-2 text-xs text-gray-400">
              Extras: {(inn?.extras?.wides || 0) + (inn?.extras?.noBalls || 0)} (wd {inn?.extras?.wides || 0}, nb {inn?.extras?.noBalls || 0})
            </div>
          </div>
        ))}

        {match.innings && match.innings.map((inn, idx) => (
          <div key={`bowl-${idx}`} className="bg-gray-800 rounded-xl p-4">
            <h3 className="font-bold text-sm text-purple-400 mb-3">⚾ Bowling - {inn ? getTeamName(inn.bowlingTeamId) : 'Unknown'}</h3>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-400 text-xs border-b border-gray-700">
                  <th className="text-left py-1">Bowler</th>
                  <th className="text-center py-1">O</th>
                  <th className="text-center py-1">R</th>
                  <th className="text-center py-1">W</th>
                  <th className="text-center py-1">Econ</th>
                </tr>
              </thead>
              <tbody>
                {inn?.bowlersStats && Object.values(inn.bowlersStats).filter(b => (b.overs || 0) > 0 || (b.balls || 0) > 0 || (b.wickets || 0) > 0).map((b, i) => (
                  <tr key={i} className="border-b border-gray-700/30">
                    <td className="py-1 text-xs truncate max-w-[100px]">{b?.playerName || 'Unknown'}</td>
                    <td className="text-center">{b?.overs || 0}.{b?.balls || 0}</td>
                    <td className="text-center">{b?.runs || 0}</td>
                    <td className="text-center font-bold text-green-400">{b?.wickets || 0}</td>
                    <td className="text-center text-gray-400">{(b && (b.overs + b.balls / 6) > 0) ? (b.runs / (b.overs + b.balls / 6)).toFixed(1) : '0.0'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============= CREATE LEAGUE SCREEN =============
function CreateLeagueScreen({ user, onBack }: { user: User; onBack: () => void }) {
  const [leagueName, setLeagueName] = useState('');
  const [teams, setTeams] = useState<LeagueTeam[]>([]);
  const [editingTeam, setEditingTeam] = useState<number | null>(null);

  const addTeam = () => {
    const name = generateTeamName();
    const roles: Player['role'][] = ['batsman', 'batsman', 'batsman', 'batsman', 'allrounder', 'allrounder', 'wicketkeeper', 'bowler', 'bowler', 'bowler', 'bowler'];
    const players: Player[] = roles.map((role, i) => ({
      id: `lp_${teams.length}_${i}_${Date.now()}`,
      name: generatePlayerName(),
      role
    }));
    
    setTeams([...teams, {
      id: `lt_${Date.now()}_${Math.random()}`,
      name,
      players,
      played: 0, won: 0, lost: 0, tied: 0, points: 0, nrr: 0,
      runsScored: 0, runsConceded: 0, oversPlayed: 0, oversBowled: 0
    }]);
  };

  const updateTeamName = (idx: number, name: string) => {
    const newTeams = [...teams];
    newTeams[idx] = { ...newTeams[idx], name };
    setTeams(newTeams);
  };

  const updatePlayerName = (teamIdx: number, playerIdx: number, name: string) => {
    const newTeams = [...teams];
    newTeams[teamIdx].players[playerIdx] = { ...newTeams[teamIdx].players[playerIdx], name };
    setTeams(newTeams);
  };

  const handleCreate = async () => {
    if (!leagueName) { alert('Enter league name'); return; }
    if (teams.length < 2) { alert('Add at least 2 teams'); return; }

    const league: League = {
      id: `league_${Date.now()}`,
      name: leagueName,
      userId: user.id,
      teams,
      matches: [],
      createdAt: new Date().toISOString()
    };

    await saveLeague(league);
    onBack();
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gradient-to-r from-green-800 to-emerald-900 px-4 py-4 flex items-center gap-3">
        <button onClick={onBack} className="text-white text-xl">←</button>
        <h1 className="text-xl font-bold">Create League</h1>
      </div>

      <div className="p-4 space-y-4">
        <input type="text" placeholder="League Name" value={leagueName} onChange={e => setLeagueName(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg px-4 py-3 focus:border-green-500 focus:outline-none" />
        
        <div className="flex justify-between items-center">
          <h3 className="font-bold">Teams ({teams.length})</h3>
          <button onClick={addTeam} className="bg-green-600 px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700">+ Add Team</button>
        </div>

        {teams.map((team, tIdx) => (
          <div key={team.id} className="bg-gray-800 rounded-xl p-4 border border-gray-700">
            <div className="flex items-center gap-2 mb-2">
              <input type="text" value={team.name} onChange={e => updateTeamName(tIdx, e.target.value)}
                className="flex-1 bg-gray-700 rounded px-3 py-2 font-bold focus:outline-none focus:ring-1 focus:ring-green-500" />
              <button onClick={() => setEditingTeam(editingTeam === tIdx ? null : tIdx)} className="text-xs bg-blue-600 px-2 py-1 rounded">
                {editingTeam === tIdx ? 'Hide' : 'Players'}
              </button>
            </div>
            {editingTeam === tIdx && (
              <div className="space-y-1 mt-2">
                {team.players.map((p, pIdx) => (
                  <div key={p.id} className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-5">{pIdx + 1}</span>
                    <input type="text" value={p.name} onChange={e => updatePlayerName(tIdx, pIdx, e.target.value)}
                      className="flex-1 bg-gray-700 rounded px-2 py-1 text-sm focus:outline-none" />
                    <span className="text-xs text-gray-500">{p.role}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}

        <button onClick={handleCreate} className="w-full bg-gradient-to-r from-green-500 to-emerald-600 py-3 rounded-lg font-bold hover:from-green-600 hover:to-emerald-700">
          Create League 🏆
        </button>
      </div>
    </div>
  );
}

// ============= ADMIN PANEL =============
function AdminPanel({ user, onBack }: { user: User; onBack: () => void }) {
  const [tab, setTab] = useState<'clients' | 'logs'>('clients');
  const [users, setUsers] = useState(getUsers());
  const [firebaseUsers, setFirebaseUsers] = useState<any[]>([]);
  const [syncing, setSyncing] = useState(false);
  const logs = getAdminLogs();
  const allMatches = getMatches();

  // Fetch users from Firebase in real-time
  useEffect(() => {
    const fetchFirebaseUsers = async () => {
      setSyncing(true);
      try {
        const { getAllUsersFromFirebase } = await import('./firebase');
        const fbUsers = await getAllUsersFromFirebase();
        setFirebaseUsers(fbUsers);
        
        // Merge Firebase users with local users
        const localUsers = getUsers();
        const mergedUsers = [...localUsers];
        
        fbUsers.forEach((fbUser: any) => {
          const exists = mergedUsers.find(u => u.id === fbUser.id || u.email === fbUser.email);
          if (!exists) {
            mergedUsers.push(fbUser);
          }
        });
        
        setUsers(mergedUsers);
        console.log('✅ Synced users from Firebase:', fbUsers.length);
      } catch (error) {
        console.warn('⚠️ Failed to sync users from Firebase:', error);
      }
      setSyncing(false);
    };

    fetchFirebaseUsers();
    
    // Refresh every 5 seconds for real-time updates
    const interval = setInterval(fetchFirebaseUsers, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleEditUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const newName = prompt('Enter new name:', targetUser.name);
    if (newName && newName.trim()) {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, name: newName.trim() } : u);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      addAdminLog('Edit User', `Updated user "${targetUser.name}" name to "${newName.trim()}"`);
    }
  };

  const handleEditEmail = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    const newEmail = prompt('Enter new email:', targetUser.email);
    if (newEmail && newEmail.trim()) {
      const updatedUsers = users.map(u => u.id === userId ? { ...u, email: newEmail.trim() } : u);
      setUsers(updatedUsers);
      saveUsers(updatedUsers);
      addAdminLog('Edit User Email', `Updated user "${targetUser.name}" email to "${newEmail.trim()}"`);
    }
  };

  const handleDeleteUser = (userId: string) => {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    if (window.confirm(`Are you sure you want to delete user "${targetUser.name}" (${targetUser.email})?`)) {
      console.log('Admin deleting user:', userId);
      const updatedUsers = users.filter(u => u.id !== userId);
      setUsers([...updatedUsers]);
      saveUsers(updatedUsers);
      addAdminLog('Delete User', `Deleted user "${targetUser.name}" (${targetUser.email})`);
    }
  };

  const handleDeleteMatch = (matchId: string) => {
    if (window.confirm('Are you sure you want to delete this match?')) {
      console.log('Admin deleting match:', matchId);
      deleteMatch(matchId);
      addAdminLog('Delete Match', `Deleted match ${matchId}`);
      setTimeout(() => {
        window.location.reload();
      }, 200);
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      <div className="bg-gradient-to-r from-yellow-800 to-yellow-900 px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <h1 className="text-xl font-bold">⚙️ Admin Panel</h1>
        </div>
        <div className="flex items-center gap-2">
          {syncing && (
            <div className="flex items-center gap-1">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-xs text-green-400">Syncing...</span>
            </div>
          )}
          <span className="text-xs bg-yellow-600 px-2 py-1 rounded">ADMIN</span>
        </div>
      </div>

      <div className="flex border-b border-gray-700">
        <button onClick={() => setTab('clients')} className={`flex-1 py-3 text-sm font-bold ${tab === 'clients' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
          👥 Clients ({users.length})
        </button>
        <button onClick={() => setTab('logs')} className={`flex-1 py-3 text-sm font-bold ${tab === 'logs' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
          📋 Logs
        </button>
      </div>

      <div className="p-4">
        {tab === 'clients' && (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-2 mb-4">
              <div className="bg-blue-900/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{users.length}</p>
                <p className="text-xs text-gray-400">Users</p>
              </div>
              <div className="bg-green-900/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{allMatches.length}</p>
                <p className="text-xs text-gray-400">Matches</p>
              </div>
              <div className="bg-purple-900/30 rounded-lg p-3 text-center">
                <p className="text-2xl font-bold">{getLeagues().length}</p>
                <p className="text-xs text-gray-400">Leagues</p>
              </div>
            </div>

            <h3 className="font-bold">Registered Users</h3>
            {users.map(u => (
              <div key={u.id} className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-gray-400">{u.email}</p>
                    <p className="text-xs text-gray-500">Joined: {new Date(u.createdAt).toLocaleDateString()}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => handleEditUser(u.id)} className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700">Name</button>
                    <button onClick={() => handleEditEmail(u.id)} className="bg-indigo-600 px-2 py-1 rounded text-xs hover:bg-indigo-700">Email</button>
                    <button onClick={() => handleDeleteUser(u.id)} className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700">Del</button>
                  </div>
                </div>
              </div>
            ))}

            <h3 className="font-bold mt-4">All Matches</h3>
            {allMatches.map(m => (
              <div key={m.id} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">{m.team1.name} vs {m.team2.name}</p>
                  <p className="text-xs text-gray-400">{m.status} • {m.venue}</p>
                </div>
                <button onClick={() => handleDeleteMatch(m.id)} className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700">Del</button>
              </div>
            ))}
          </div>
        )}

        {tab === 'logs' && (
          <div className="space-y-2">
            {logs.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No admin logs yet</p>
            ) : (
              logs.map(log => (
                <div key={log.id} className="bg-gray-800 rounded-lg p-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-sm font-medium text-yellow-400">{log.action}</p>
                      <p className="text-xs text-gray-400">{log.target}</p>
                    </div>
                    <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleString()}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ============= LEAGUE STANDINGS UPDATE =============
async function updateLeagueStandings(match: Match) {
  if (!match.leagueId) return;
  const leagues = getLeagues();
  const league = leagues.find(l => l.id === match.leagueId);
  if (!league) return;

  const inn1 = match.innings?.[0];
  const inn2 = match.innings?.[1];
  if (!inn1 || !inn2) return;

  const battingFirstTeamId = inn1.battingTeamId;
  const battingSecondTeamId = inn2.battingTeamId;

  let winnerId = '';
  if ((inn2.runs || 0) > (inn1.runs || 0)) winnerId = battingSecondTeamId;
  else if ((inn1.runs || 0) > (inn2.runs || 0)) winnerId = battingFirstTeamId;

  league.teams = league.teams.map(team => {
    const t = { ...team };
    const isTeam1 = team.id === battingFirstTeamId;
    const isTeam2 = team.id === battingSecondTeamId;

    if (isTeam1 || isTeam2) {
      t.played += 1;
      const myInnings = isTeam1 ? inn1 : inn2;
      const oppInnings = isTeam1 ? inn2 : inn1;
      t.runsScored += (myInnings.runs || 0);
      t.runsConceded += (oppInnings.runs || 0);
      t.oversPlayed += (myInnings.overs || 0) + (myInnings.balls || 0) / 6;
      t.oversBowled += (oppInnings.overs || 0) + (oppInnings.balls || 0) / 6;

      if (winnerId === team.id) {
        t.won += 1;
        t.points += 2;
      } else if (winnerId) {
        t.lost += 1;
      } else {
        // ✅ Match tied - both teams get 1 point
        t.tied += 1;
        t.points += 1;
      }

      if (t.oversBowled > 0 && t.oversPlayed > 0) {
        t.nrr = (t.runsScored / t.oversBowled) - (t.runsConceded / t.oversPlayed);
      }
    }
    return t;
  });

  league.matches.push(match.id);
  await saveLeague(league);
}
