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
      <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 w-full max-w-md border border-white/20">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🏏</div>
          <h1 className="text-3xl font-bold text-white">CricScore Pro</h1>
          <p className="text-green-300 mt-1">{isLogin ? 'Welcome Back!' : 'Create Account'}</p>
        </div>
        
        {error && <div className="bg-red-500/20 border border-red-500/50 text-red-200 px-4 py-2 rounded-lg mb-4 text-sm">{error}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)}
              className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400" />
          )}
          <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400" />
          <input type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required
            className="w-full bg-white/10 border border-white/20 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-green-400" />
          <button type="submit" className="w-full bg-gradient-to-r from-green-500 to-emerald-600 text-white font-bold py-3 rounded-lg hover:from-green-600 hover:to-emerald-700 transition-all shadow-lg">
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        
        <div className="mt-6 text-center">
          <button onClick={() => { setIsLogin(!isLogin); setError(''); }} className="text-green-300 hover:text-green-200 text-sm">
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
    return <LiveScoringScreen match={activeMatch} onBack={() => setActiveMatch(null)} onUpdate={async (m) => { setActiveMatch(m); await saveMatch(m); }} />;
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
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 flex">
        {tabs.map((t, i) => (
          <button key={i} onClick={() => setTab(i)} className={`flex-1 py-3 flex flex-col items-center gap-1 transition-all ${tab === i ? 'text-green-400 bg-gray-700/50' : 'text-gray-400'}`}>
            <span className="text-xl">{t.icon}</span>
            <span className="text-xs font-medium">{t.label}</span>
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
    <div className="bg-gray-800 rounded-xl p-4 border border-gray-700 hover:border-green-500/50 transition-all cursor-pointer" onClick={onClick}>
      <div className="flex justify-between items-start">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <span className={`px-2 py-0.5 rounded text-xs font-bold ${match.status === 'live' ? 'bg-red-500 animate-pulse' : match.status === 'completed' ? 'bg-yellow-600' : 'bg-blue-500'}`}>
              {match.status === 'live' ? '● LIVE' : match.status === 'completed' ? '🏆 COMPLETE' : 'UPCOMING'}
            </span>
            <span className="text-xs text-blue-400 font-medium">🏟️ {match.venue}</span>
          </div>
          <div className="space-y-1">
            <div className="flex justify-between">
              <span className={`font-medium ${winningTeam === match.team1.name ? 'text-green-400 font-bold' : losingTeam === match.team1.name ? 'text-red-400' : ''}`}>{match.team1.name}</span>
              <span className="text-green-400 font-mono">{score1}</span>
            </div>
            <div className="flex justify-between">
              <span className={`font-medium ${winningTeam === match.team2.name ? 'text-green-400 font-bold' : losingTeam === match.team2.name ? 'text-red-400' : ''}`}>{match.team2.name}</span>
              <span className="text-green-400 font-mono">{score2}</span>
            </div>
          </div>
          {match.result && (
            <p className="text-xs mt-2 bg-yellow-900/30 px-2 py-1 rounded border border-yellow-700/30">
              {formatResult()}
            </p>
          )}
        </div>
        <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="text-red-400 hover:text-red-300 p-1 ml-2" title="Delete match">
          🗑️
        </button>
      </div>
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
      const bowler = currentInnings.bowlersStats?.[currentInnings.currentBowler];
      if (striker) text += `🏏 ${striker.playerName}: ${striker.runs}(${striker.balls})\n`;
      if (bowler) text += `⚾ ${bowler.playerName}: ${bowler.overs}.${bowler.balls}-${bowler.runs}-${bowler.wickets}\n`;
    }
    text += `\nvia CricScore Pro`;

    if (navigator.share) {
      navigator.share({ title: 'CricScore Pro - Live Match', text }).catch(() => {});
    } else {
      navigator.clipboard.writeText(text);
      alert('Live score card copied! Share on Facebook, WhatsApp, or any social media.');
    }
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
          {liveMatches.map(m => (
            <div key={m.id} className="bg-gray-800 rounded-xl p-4 border border-red-500/30">
              <div className="flex items-center justify-between mb-3">
                <span className="bg-red-500 text-white px-2 py-1 rounded text-xs font-bold animate-pulse">● LIVE</span>
                <div className="flex gap-1">
                  <button onClick={() => handleShare(m)} className="bg-blue-600 px-2 py-1 rounded text-xs hover:bg-blue-700">📤</button>
                  <button onClick={() => setBroadcastMatch(m)} className="bg-purple-600 px-2 py-1 rounded text-xs hover:bg-purple-700">📹</button>
                  <button onClick={() => handleDelete(m.id)} className="bg-red-600 px-2 py-1 rounded text-xs hover:bg-red-700">🗑️</button>
                </div>
              </div>
              <div className="mb-2">
                <p className="font-bold">{m.team1.name} vs {m.team2.name}</p>
                <p className="text-gray-400 text-xs">{m.venue}</p>
              </div>
              <button onClick={() => onOpenMatch(m)} className="w-full bg-green-600 py-2 rounded-lg font-bold hover:bg-green-700 transition-all">
                ▶ Continue Scoring
              </button>
            </div>
          ))}
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

// ============= LIVE SCORING SCREEN - COMPLETELY NEW IMPLEMENTATION =============
function LiveScoringScreen({ match, onBack, onUpdate }: { match: Match; onBack: () => void; onUpdate: (m: Match) => void }) {
  // ✅ SIMPLIFIED: Only UI state, no match data state
  const [showBowlerSelect, setShowBowlerSelect] = useState(false);
  const [showNewBatsman, setShowNewBatsman] = useState(false);
  const [show2ndInningsSelection, setShow2ndInningsSelection] = useState(false);
  const [inningBreak, setInningBreak] = useState(false);
  const [showMatchComplete, setShowMatchComplete] = useState(false);
  const [newBatsmanPosition, setNewBatsmanPosition] = useState<'striker' | 'nonStriker'>('striker');
  const [pendingBowlerSelect, setPendingBowlerSelect] = useState(false);
  
  // ✅ CRITICAL FIX: Use local state for match data to ensure immediate updates
  const [currentMatch, setCurrentMatch] = useState<Match>(match);
  
  // Update local state when match prop changes
  useEffect(() => {
    setCurrentMatch(match);
  }, [match]);

  // ✅ Use local state
  const innings = currentMatch.innings?.[currentMatch.currentInnings];
  
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

  const battingTeam = currentMatch.battingFirst === currentMatch.team1.id ? currentMatch.team1 : currentMatch.team2;
  const bowlingTeam = currentMatch.battingFirst === currentMatch.team1.id ? currentMatch.team2 : currentMatch.team1;
  
  // Get batsman/bowler info - show pending state when modal is open
  const strikerId = innings.currentBatsmen?.[0];
  const nonStrikerId = innings.currentBatsmen?.[1];
  const striker = strikerId ? innings.batsmenStats?.[strikerId] : null;
  const nonStriker = nonStrikerId ? innings.batsmenStats?.[nonStrikerId] : null;
  const currentBowler = innings.currentBowler ? innings.bowlersStats?.[innings.currentBowler] : null;
  
  // When currentBatsmen[0] or currentBowler is empty, show "Selecting..." state
  const strikerDisplayName = !strikerId ? '⏳ Selecting new batsman...' : (striker?.playerName || 'No batsman');
  const bowlerDisplayName = !innings.currentBowler ? '⏳ Selecting new bowler...' : (currentBowler?.playerName || 'No bowler');

  const firstInnings = currentMatch.innings[0];
  const target = currentMatch.currentInnings === 1 && firstInnings ? firstInnings.runs + 1 : null;
  const remaining = target !== null ? target - innings.runs : null;
  const ballsRemaining = (currentMatch.totalOvers * 6) - (innings.overs * 6 + innings.balls);
  const totalBallsBowled = innings.overs + innings.balls / 6;
  const runRate = totalBallsBowled > 0 ? (innings.runs / totalBallsBowled).toFixed(2) : '0.00';
  const reqRunRate = remaining !== null && ballsRemaining > 0 ? (remaining / (ballsRemaining / 6)).toFixed(2) : null;

  const getTeamName = (teamId: string) => teamId === currentMatch.team1.id ? currentMatch.team1.name : currentMatch.team2.name;

  const processBall = (runs: number, isWide: boolean, isNoBall: boolean, isWicket: boolean, wicketType?: string) => {
    const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn) return;
    
    const ballEvent: BallEvent = {
      id: `ball_${Date.now()}_${Math.random()}`,
      ballNumber: inn.overs * 6 + inn.balls + (isWide || isNoBall ? 0 : 1),
      over: inn.overs,
      ball: inn.balls + (isWide || isNoBall ? 0 : 1),
      runs,
      isWide,
      isNoBall,
      isWicket,
      wicketType: wicketType as any,
      batsmanId: inn.currentBatsmen[0],
      bowlerId: inn.currentBowler,
      timestamp: new Date().toISOString()
    };

    inn.runs += runs;
    inn.ballEvents.push(ballEvent);

    if (!isWide && !isNoBall) {
      inn.balls += 1;
      if (inn.balls === 6) {
        inn.overs += 1;
        inn.balls = 0;
      }
    }

    if (isWide) inn.extras.wides += runs;
    if (isNoBall) inn.extras.noBalls += runs;

    const batsmanStat = inn.batsmenStats?.[inn.currentBatsmen[0]];
    if (batsmanStat && !isWide) {
      batsmanStat.runs += runs;
      batsmanStat.balls += 1;
      if (runs === 4) batsmanStat.fours += 1;
      if (runs === 6) batsmanStat.sixes += 1;
    }

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
        setCurrentMatch(newMatch);
        onUpdate(newMatch);
      } else {
        // ✅ FIXED: New batsman always comes at striker position (where outgoing batsman was)
        // No swap needed - just replace the outgoing batsman
        inn.currentBatsmen[0] = '';
        setNewBatsmanPosition('striker');
        
        // Check if this was the last ball of the over
        const wasLastBall = (inn.balls === 0 && inn.overs > 0);
        
        if (wasLastBall) {
          // Last ball - after new batsman is selected, will need to select new bowler
          setPendingBowlerSelect(true);
        }
        
        // ✅ CRITICAL: Update local state immediately
        setCurrentMatch(newMatch);
        // Update parent immediately
        onUpdate(newMatch);
        // Show modal for new batsman selection
        setShowNewBatsman(true);
      }
      return; // Don't call onUpdate again below
    }

    if (!isWide && (runs === 1 || runs === 3)) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
    }

    // End of over - rotate strike and select new bowler
    if (!isWide && !isNoBall && inn.balls === 0 && inn.overs > 0) {
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
      if (inn.overs >= currentMatch.totalOvers) {
        inn.isCompleted = true;
        handleInningsEnd(newMatch);
        setCurrentMatch(newMatch);
        onUpdate(newMatch);
      } else {
        // Clear current bowler so UI shows "Selecting..."
        inn.currentBowler = '';
        // ✅ CRITICAL: Update local state immediately
        setCurrentMatch(newMatch);
        // Update parent immediately
        onUpdate(newMatch);
        // Show modal for new bowler selection
        setShowBowlerSelect(true);
      }
      return; // Don't call onUpdate again below
    }

    if (target && inn.runs >= target) {
      inn.isCompleted = true;
      handleInningsEnd(newMatch);
    }

    setCurrentMatch(newMatch);
    onUpdate(newMatch);
  };

  const handleInningsEnd = (newMatch: Match) => {
    console.log('🏁 Innings ended, current innings:', newMatch.currentInnings);
    
    if (newMatch.currentInnings === 0) {
      console.log('✅ 1st innings completed, showing innings break');
      setInningBreak(true);
      setCurrentMatch(newMatch);
      onUpdate(newMatch);
    } else {
      console.log('✅ 2nd innings completed, match finished');
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
      
      console.log('🏆 Match result:', result);
      newMatch.status = 'completed';
      newMatch.result = result;
      
      if (newMatch.leagueId) {
        updateLeagueStandings(newMatch);
      }
      
      setShowMatchComplete(true);
      setCurrentMatch(newMatch);
      onUpdate(newMatch);
    }
  };

  const startSecondInnings = () => {
    const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
    const firstInnings = newMatch.innings[0];
    if (!firstInnings) return;
    const secondBattingTeamId = firstInnings.bowlingTeamId;
    const secondBowlingTeamId = firstInnings.battingTeamId;
    
    const secondBattingTeam = secondBattingTeamId === newMatch.team1.id ? newMatch.team1 : newMatch.team2;
    const secondBowlingTeam = secondBattingTeamId === newMatch.team1.id ? newMatch.team2 : newMatch.team1;

    const batsmenStats: Record<string, BatsmanStats> = {};
    const bowlersStats: Record<string, BowlerStats> = {};

    secondBattingTeam.players.forEach(p => {
      batsmenStats[p.id] = { playerId: p.id, playerName: p.name, runs: 0, balls: 0, fours: 0, sixes: 0, isOut: false };
    });
    secondBowlingTeam.players.forEach(p => {
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
      currentBatsmen: ['', ''], // Empty - will be selected by user
      currentBowler: '', // Empty - will be selected by user
      isCompleted: false
    };

    newMatch.innings.push(innings2);
    newMatch.currentInnings = 1;
    setInningBreak(false);
    setShow2ndInningsSelection(true); // Show selection screen
    setCurrentMatch(newMatch);
    onUpdate(newMatch);
  };

  const selectNewBatsman = (playerId: string) => {
    console.log('🔄 Selecting new batsman:', playerId, 'Position:', newBatsmanPosition);
    const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn) {
      console.error('❌ Innings not found');
      return;
    }
    
    // Update current batsman based on position
    if (newBatsmanPosition === 'striker') {
      inn.currentBatsmen[0] = playerId;
    } else {
      inn.currentBatsmen[1] = playerId;
    }
    
    console.log('✅ Updated currentBatsmen:', inn.currentBatsmen);
    
    // Close modal
    setShowNewBatsman(false);
    
    // ✅ CRITICAL: Update local state immediately
    setCurrentMatch(newMatch);
    
    // Update parent
    onUpdate(newMatch);
    console.log('✅ Match updated with new batsman');
    
    // ✅ If this was last ball of over, now show bowler selection
    if (pendingBowlerSelect) {
      setPendingBowlerSelect(false);
      // Swap batsmen for new over
      inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
      inn.currentBowler = '';
      setCurrentMatch(newMatch);
      onUpdate(newMatch);
      setShowBowlerSelect(true);
    }
  };

  const selectBowler = (playerId: string) => {
    console.log('🔄 Selecting new bowler:', playerId);
    const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn) {
      console.error('❌ Innings not found');
      return;
    }
    
    // Update current bowler
    inn.currentBowler = playerId;
    console.log('✅ Updated currentBowler:', inn.currentBowler);
    
    // Close modal
    setShowBowlerSelect(false);
    
    // ✅ CRITICAL: Update local state immediately
    setCurrentMatch(newMatch);
    
    // Update parent
    onUpdate(newMatch);
    console.log('✅ Match updated with new bowler');
  };

  const handleUndo = () => {
    const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
    const inn = newMatch.innings[newMatch.currentInnings];
    if (!inn || !inn.ballEvents || inn.ballEvents.length === 0) return;
    
    const lastEvent = inn.ballEvents.pop()!;
    if (!lastEvent) return;
    
    inn.runs -= (lastEvent.runs || 0);
    if (!lastEvent.isWide && !lastEvent.isNoBall) {
      inn.balls -= 1;
      if (inn.balls < 0) { inn.overs -= 1; inn.balls = 5; }
    }
    if (lastEvent.isWide) inn.extras.wides -= (lastEvent.runs || 0);
    if (lastEvent.isNoBall) inn.extras.noBalls -= (lastEvent.runs || 0);

    const batsmanStat = inn.batsmenStats?.[lastEvent.batsmanId];
    if (batsmanStat && !lastEvent.isWide) {
      batsmanStat.runs -= (lastEvent.runs || 0);
      batsmanStat.balls -= 1;
      if (lastEvent.runs === 4) batsmanStat.fours -= 1;
      if (lastEvent.runs === 6) batsmanStat.sixes -= 1;
    }

    const bowlerStat = inn.bowlersStats?.[lastEvent.bowlerId];
    if (bowlerStat) {
      bowlerStat.runs -= (lastEvent.runs || 0);
      if (!lastEvent.isWide && !lastEvent.isNoBall) {
        bowlerStat.balls -= 1;
        if (bowlerStat.balls < 0) { bowlerStat.overs -= 1; bowlerStat.balls = 5; }
      }
      if (lastEvent.isWide || lastEvent.isNoBall) bowlerStat.extras -= (lastEvent.runs || 0);
    }

    if (lastEvent.isWicket && batsmanStat && bowlerStat) {
      batsmanStat.isOut = false;
      batsmanStat.dismissal = undefined;
      bowlerStat.wickets -= 1;
      inn.wickets -= 1;
    }

    setCurrentMatch(newMatch);
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
    const secondBowlingTeam = secondInnings?.battingTeamId === match.team1.id ? match.team2 : match.team1;
    
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
    <div className="min-h-screen bg-gray-900 text-white pb-4">
      {/* Header */}
      <div className="bg-gradient-to-r from-red-900 to-red-800 px-4 py-3">
        <div className="flex items-center justify-between">
          <button onClick={onBack} className="text-white text-xl">←</button>
          <div className="text-center">
            <p className="text-xs text-red-200">LIVE</p>
            <p className="font-bold text-sm">{getTeamName(innings.battingTeamId)} vs {getTeamName(innings.bowlingTeamId)}</p>
          </div>
          <button onClick={handleUndo} className="bg-yellow-600 px-2 py-1 rounded text-xs">↩ Undo</button>
        </div>
      </div>

      {/* Score Card */}
      <div className="bg-gradient-to-b from-gray-800 to-gray-900 px-4 py-4">
        <div className="text-center">
          <p className="text-sm text-gray-400">{getTeamName(innings.battingTeamId)} - Innings {match.currentInnings + 1}</p>
          <div className="flex items-center justify-center gap-2">
            <span className="text-5xl font-bold text-white">{innings.runs}</span>
            <span className="text-3xl text-gray-400">/{innings.wickets}</span>
          </div>
          <p className="text-gray-400 mt-1">Overs: {innings.overs}.{innings.balls} / {match.totalOvers}</p>
          <div className="flex justify-center gap-4 mt-2 text-sm">
            <span className="text-blue-300">CRR: {runRate}</span>
            {reqRunRate && <span className="text-yellow-300">RRR: {reqRunRate}</span>}
            {remaining !== null && <span className="text-red-300">Need: {remaining} off {ballsRemaining}</span>}
          </div>
        </div>
      </div>

      {/* Batsmen Cards */}
      <div className="px-4 py-3">
        <div className="grid grid-cols-2 gap-3">
          <div className={`bg-gradient-to-br from-green-900/50 to-green-800/30 rounded-xl p-3 border ${!strikerId ? 'border-yellow-600/50 animate-pulse' : striker?.isOut ? 'border-red-700/30 opacity-60' : 'border-green-700/30'}`}>
            <div className="flex items-center gap-1 mb-1">
              <span className="text-green-400 text-xs">🏏</span>
              <span className="text-xs text-green-300 font-bold">STRIKER</span>
              {!strikerId && <span className="text-xs text-yellow-400 ml-auto">NEW</span>}
              {striker?.isOut && strikerId && <span className="text-xs text-red-400 ml-auto">OUT</span>}
            </div>
            <p className="font-bold text-sm truncate">{strikerDisplayName}</p>
            {strikerId && (
              <p className="text-2xl font-bold text-green-400">{striker?.runs || 0} <span className="text-sm text-gray-400">({striker?.balls || 0})</span></p>
            )}
            {strikerId && (
              <div className="flex gap-2 text-xs text-gray-400 mt-1">
                <span>4s: {striker?.fours || 0}</span>
                <span>6s: {striker?.sixes || 0}</span>
              </div>
            )}
          </div>
          <div className="bg-gradient-to-br from-blue-900/50 to-blue-800/30 rounded-xl p-3 border border-blue-700/30">
            <div className="flex items-center gap-1 mb-1">
              <span className="text-blue-400 text-xs">🏏</span>
              <span className="text-xs text-blue-300">NON-STRIKER</span>
            </div>
            <p className="font-bold text-sm truncate">{nonStriker?.playerName || 'No batsman'}</p>
            <p className="text-2xl font-bold text-blue-400">{nonStriker?.runs || 0} <span className="text-sm text-gray-400">({nonStriker?.balls || 0})</span></p>
            <div className="flex gap-2 text-xs text-gray-400 mt-1">
              <span>4s: {nonStriker?.fours || 0}</span>
              <span>6s: {nonStriker?.sixes || 0}</span>
            </div>
          </div>
        </div>
        
        {/* Swap Batsmen Button */}
        {strikerId && nonStrikerId && (
          <button
            onClick={() => {
              const newMatch = JSON.parse(JSON.stringify(currentMatch)) as Match;
              const inn = newMatch.innings[newMatch.currentInnings];
              if (inn) {
                inn.currentBatsmen = [inn.currentBatsmen[1], inn.currentBatsmen[0]];
                setCurrentMatch(newMatch);
                onUpdate(newMatch);
              }
            }}
            className="w-full mt-2 bg-gradient-to-r from-yellow-600 to-orange-600 hover:from-yellow-700 hover:to-orange-700 text-white font-bold py-2 rounded-lg flex items-center justify-center gap-2 transition-all"
          >
            <span>🔄</span>
            <span>Swap Batsmen</span>
          </button>
        )}
      </div>

      {/* Bowler Card */}
      <div className="px-4 mb-3">
        <div className={`bg-gradient-to-br from-purple-900/50 to-purple-800/30 rounded-xl p-3 border ${!innings.currentBowler ? 'border-yellow-600/50 animate-pulse' : 'border-purple-700/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-purple-300">⚾ BOWLER {!innings.currentBowler && <span className="text-yellow-400">- NEW OVER</span>}</p>
              <p className="font-bold text-sm">{bowlerDisplayName}</p>
            </div>
            {innings.currentBowler && (
              <div className="text-right">
                <p className="text-lg font-bold text-purple-400">{currentBowler?.overs || 0}.{currentBowler?.balls || 0}-{currentBowler?.maidens || 0}-{currentBowler?.runs || 0}-{currentBowler?.wickets || 0}</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Scoring Buttons */}
      <div className="px-4 space-y-3">
        <p className="text-sm text-gray-400 font-semibold text-center">Score This Ball</p>
        <div className="grid grid-cols-4 gap-2">
          {[0, 1, 2, 3].map(r => (
            <button key={r} onClick={() => processBall(r, false, false, false)}
              className="bg-gradient-to-b from-gray-700 to-gray-800 py-4 rounded-xl font-bold text-xl hover:from-gray-600 hover:to-gray-700 active:scale-95 transition-all border border-gray-600">
              {r}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => processBall(4, false, false, false)}
            className="bg-gradient-to-b from-blue-600 to-blue-800 py-4 rounded-xl font-bold text-xl hover:from-blue-500 hover:to-blue-700 active:scale-95 transition-all shadow-lg shadow-blue-900/50">
            4
          </button>
          <button onClick={() => processBall(6, false, false, false)}
            className="bg-gradient-to-b from-green-600 to-green-800 py-4 rounded-xl font-bold text-xl hover:from-green-500 hover:to-green-700 active:scale-95 transition-all shadow-lg shadow-green-900/50">
            6
          </button>
          <button onClick={() => processBall(1, true, false, false)}
            className="bg-gradient-to-b from-yellow-600 to-yellow-800 py-4 rounded-xl font-bold text-sm hover:from-yellow-500 hover:to-yellow-700 active:scale-95 transition-all">
            Wide
          </button>
        </div>
        <div className="grid grid-cols-3 gap-2">
          <button onClick={() => processBall(1, false, true, false)}
            className="bg-gradient-to-b from-orange-600 to-orange-800 py-4 rounded-xl font-bold text-sm hover:from-orange-500 hover:to-orange-700 active:scale-95 transition-all">
            No Ball
          </button>
          <button onClick={() => processBall(0, false, false, true, 'bowled')}
            className="bg-gradient-to-b from-red-600 to-red-800 py-4 rounded-xl font-bold text-sm hover:from-red-500 hover:to-red-700 active:scale-95 transition-all shadow-lg shadow-red-900/50">
            Wicket
          </button>
          <button onClick={() => processBall(0, false, false, false)}
            className="bg-gradient-to-b from-gray-600 to-gray-800 py-4 rounded-xl font-bold text-sm hover:from-gray-500 hover:to-gray-700 active:scale-95 transition-all">
            Dot
          </button>
        </div>
      </div>

      {/* Recent balls */}
      <div className="px-4 mt-4">
        <p className="text-xs text-gray-400 mb-2">This Over:</p>
        <div className="flex gap-1 flex-wrap">
          {(innings.ballEvents || []).filter(e => e.over === innings.overs && (innings.balls > 0 ? e.over === innings.overs : e.over === innings.overs - 1)).slice(-12).map((e, i) => (
            <span key={i} className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
              e.isWicket ? 'bg-red-600' : (e.runs || 0) === 4 ? 'bg-blue-600' : (e.runs || 0) === 6 ? 'bg-green-600' : e.isWide ? 'bg-yellow-600' : e.isNoBall ? 'bg-orange-600' : (e.runs || 0) === 0 ? 'bg-gray-700' : 'bg-gray-600'
            }`}>
              {e.isWicket ? 'W' : e.isWide ? 'Wd' : e.isNoBall ? 'Nb' : (e.runs ?? 0)}
            </span>
          ))}
        </div>
      </div>

      {/* Bowler Selection Modal */}
      {showBowlerSelect && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-xl p-4 w-full max-w-sm max-h-96 overflow-y-auto">
            <h3 className="font-bold text-lg mb-3">⚾ Select Bowler for Over {innings.overs + 1}</h3>
            <div className="space-y-2">
              {bowlingTeam.players.filter(p => p.id !== innings.currentBowler).map(p => (
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
      )}

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
        <div className="flex gap-2">
          <button 
            onClick={handleShare} 
            className="bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 flex items-center gap-1"
          >
            <span>📤</span>
            <span>Share</span>
          </button>
          <button 
            onClick={handleDownload} 
            className="bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white px-4 py-2 rounded-lg text-sm font-semibold shadow-lg transition-all duration-200 flex items-center gap-1"
          >
            <span>📥</span>
            <span>Download</span>
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
  const logs = getAdminLogs();
  const allMatches = getMatches();

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
        <span className="text-xs bg-yellow-600 px-2 py-1 rounded">ADMIN</span>
      </div>

      <div className="flex border-b border-gray-700">
        <button onClick={() => setTab('clients')} className={`flex-1 py-3 text-sm font-bold ${tab === 'clients' ? 'text-yellow-400 border-b-2 border-yellow-400' : 'text-gray-400'}`}>
          👥 Clients
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
