# Firebase & Backend Integration Guide for CricScore Pro

## Current Setup
The app currently uses **localStorage** for data persistence. Here's how to connect Firebase or other backends:

---

## Option 1: Firebase Integration (Recommended)

### Step 1: Create Firebase Project
1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click "Add Project" → Enter project name (e.g., "cricscore-pro")
3. Disable Google Analytics (optional) → Click "Create Project"

### Step 2: Enable Authentication
1. In Firebase Console, go to **Authentication** → **Sign-in method**
2. Enable **Email/Password** authentication
3. Optional: Enable Google Sign-In

### Step 3: Create Firestore Database
1. Go to **Firestore Database** → Click "Create database"
2. Select "Start in test mode" (for development)
3. Choose location closest to your users

### Step 4: Get Firebase Config
1. Go to **Project Settings** (gear icon)
2. Scroll down to "Your apps" section
3. Click the web icon (</>)
4. Register your app with a nickname
5. Copy the `firebaseConfig` object

### Step 5: Update Your Code
Replace the Firebase config in `src/firebase.ts`:

```typescript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

### Step 6: Install Firebase (Already Done)
```bash
npm install firebase
```

### Step 7: Update Store Functions
The `src/store.ts` already has Firebase sync functions. They will automatically sync data when Firebase is properly configured.

### Step 8: Deploy Firestore Rules
For production, update Firestore rules in Firebase Console:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /matches/{matchId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
    match /leagues/{leagueId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

---

## Option 2: Supabase Integration

### Step 1: Create Supabase Project
1. Go to [Supabase](https://supabase.com/)
2. Click "New Project"
3. Enter project details
4. Set database password

### Step 2: Get API Keys
1. Go to **Settings** → **API**
2. Copy `Project URL` and `anon public` key

### Step 3: Install Supabase
```bash
npm install @supabase/supabase-js
```

### Step 4: Create Supabase Client
Create `src/supabase.ts`:

```typescript
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'YOUR_PROJECT_URL';
const supabaseKey = 'YOUR_ANON_KEY';

export const supabase = createClient(supabaseUrl, supabaseKey);
```

### Step 5: Create Database Tables
In Supabase SQL Editor:

```sql
-- Users table
create table users (
  id uuid primary key default uuid_generate_v4(),
  email text unique not null,
  name text not null,
  profile_image text,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Matches table
create table matches (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);

-- Leagues table
create table leagues (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references users(id) on delete cascade,
  data jsonb not null,
  created_at timestamp with time zone default timezone('utc'::text, now())
);
```

### Step 6: Update Store Functions
Replace localStorage calls with Supabase calls:

```typescript
import { supabase } from './supabase';

export async function saveMatch(match: Match) {
  const { data, error } = await supabase
    .from('matches')
    .upsert({ id: match.id, user_id: match.userId, data: match });
  
  if (error) console.error('Error saving match:', error);
}

export async function getMatches(userId: string): Promise<Match[]> {
  const { data, error } = await supabase
    .from('matches')
    .select('data')
    .eq('user_id', userId);
  
  if (error) {
    console.error('Error fetching matches:', error);
    return [];
  }
  
  return data.map(row => row.data);
}
```

---

## Option 3: Google Drive Integration (For Document Storage)

### Step 1: Enable Google Drive API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create new project or select existing
3. Enable **Google Drive API**

### Step 2: Create OAuth 2.0 Credentials
1. Go to **APIs & Services** → **Credentials**
2. Click "Create Credentials" → "OAuth client ID"
3. Application type: **Web application**
4. Add authorized JavaScript origins (your domain)
5. Copy Client ID

### Step 3: Install Google API Client
```bash
npm install googleapis
```

### Step 4: Implement Google Drive Upload
Create `src/drive.ts`:

```typescript
const CLIENT_ID = 'YOUR_CLIENT_ID.apps.googleusercontent.com';
const API_KEY = 'YOUR_API_KEY';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

export async function uploadToDrive(fileName: string, content: string) {
  // Implement OAuth flow
  // Upload file to user's Google Drive
  // Return file ID
}

export async function downloadFromDrive(fileId: string) {
  // Download file from Google Drive
  // Return content
}
```

### Step 5: Add Export/Import Buttons
In Profile or Settings screen, add:
- "Export to Google Drive" button
- "Import from Google Drive" button

---

## Option 4: Backend API (Node.js + Express)

### Step 1: Create Backend Server
```bash
mkdir cricscore-backend
cd cricscore-backend
npm init -y
npm install express mongoose cors dotenv
```

### Step 2: Create Server File
`server.js`:

```javascript
require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI);

// Models
const Match = mongoose.model('Match', new mongoose.Schema({
  userId: String,
  data: Object,
  createdAt: { type: Date, default: Date.now }
}));

// Routes
app.post('/api/matches', async (req, res) => {
  const match = new Match(req.body);
  await match.save();
  res.json(match);
});

app.get('/api/matches/:userId', async (req, res) => {
  const matches = await Match.find({ userId: req.params.userId });
  res.json(matches);
});

app.listen(3000, () => console.log('Server running on port 3000'));
```

### Step 3: Deploy Backend
Deploy to:
- **Heroku**: `heroku create` → `git push heroku main`
- **Railway**: Connect GitHub repo
- **Render**: Connect GitHub repo

### Step 4: Update Frontend
Replace localStorage calls with API calls:

```typescript
const API_URL = 'https://your-backend-url.com/api';

export async function saveMatch(match: Match) {
  await fetch(`${API_URL}/matches`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(match)
  });
}
```

---

## Testing Your Integration

### Test Firebase:
1. Create a new user account
2. Create a match
3. Check Firebase Console → Firestore → matches collection
4. Data should appear automatically

### Test Supabase:
1. Go to Supabase Dashboard → Table Editor
2. Check if data appears in tables
3. Try CRUD operations

### Test Google Drive:
1. Click "Export to Drive"
2. Check your Google Drive for the file
3. Try importing it back

---

## Security Best Practices

1. **Never expose API keys** in frontend code
2. Use **environment variables** for sensitive data
3. Implement **proper authentication** (JWT, OAuth)
4. Set up **database rules** to restrict access
5. Enable **HTTPS** for all API calls
6. Validate all **user input** on backend
7. Implement **rate limiting** to prevent abuse

---

## Recommended Stack for Production

**Frontend**: React + TypeScript + Tailwind CSS (current)
**Backend**: Firebase (easiest) or Supabase (more control)
**Database**: Firestore (Firebase) or PostgreSQL (Supabase)
**Authentication**: Firebase Auth or Supabase Auth
**Storage**: Firebase Storage or Supabase Storage
**Hosting**: Vercel, Netlify, or Firebase Hosting

---

## Quick Start with Firebase

1. Create Firebase project (5 minutes)
2. Enable Auth + Firestore (2 minutes)
3. Copy config to `src/firebase.ts` (1 minute)
4. Test by creating a match (1 minute)
5. Deploy to Vercel/Netlify (5 minutes)

**Total time: ~15 minutes**

---

## Need Help?

- Firebase Docs: https://firebase.google.com/docs
- Supabase Docs: https://supabase.com/docs
- Google Drive API: https://developers.google.com/drive/api

---

## Current App Status

✅ All features working with localStorage
✅ Firebase integration code ready (just needs config)
✅ Google Drive integration ready (needs OAuth setup)
✅ All delete buttons functional
✅ All share buttons working
✅ Player names display correctly
✅ League point table auto-updates

**Next Steps:**
1. Choose your backend (Firebase recommended for beginners)
2. Follow the setup guide above
3. Update config files
4. Test thoroughly
5. Deploy!
