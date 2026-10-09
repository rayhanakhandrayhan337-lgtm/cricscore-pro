# 📁 Google Drive Data Storage Guide
# 📁 Google Drive এ ডেটা সংরক্ষণ গাইড

---

## ✅ কিভাবে কাজ করে / How It Works

আপনার অ্যাপে এখন Google Drive integration আছে। Users তাদের match data তাদের personal Google Drive এ save করতে পারবেন।

---

## 🔧 Setup Steps / সেটআপ ধাপসমূহ

### Step 1: Google Cloud Console এ যান
1. https://console.cloud.google.com/ এ যান
2. নতুন project তৈরি করুন অথবা existing project select করুন
3. Project name: "CricScore Pro" (যেকোনো নাম দিন)

### Step 2: Google Drive API Enable করুন
1. Left menu → **APIs & Services** → **Library**
2. Search box এ "Google Drive API" লিখুন
3. **Google Drive API** এ click করুন
4. **Enable** button এ click করুন

### Step 3: OAuth Consent Screen Setup করুন
1. Left menu → **APIs & Services** → **OAuth consent screen**
2. **User Type** select করুন: **External** (public users এর জন্য)
3. **Create** button এ click করুন
4. App information পূরণ করুন:
   - **App name**: CricScore Pro
   - **User support email**: আপনার email
   - **Developer contact information**: আপনার email
5. **Save and Continue** click করুন
6. **Scopes** page এ **Add or Remove Scopes** click করুন
7. Search করুন: `../auth/drive.file`
8. Select করুন: `../auth/drive.file`
9. **Update** click করুন
10. **Save and Continue** click করুন
11. **Test users** section এ আপনার email add করুন (testing এর জন্য)
12. **Save and Continue** click করুন
13. **Back to Dashboard** click করুন

### Step 4: OAuth Credentials তৈরি করুন
1. Left menu → **APIs & Services** → **Credentials**
2. **+ CREATE CREDENTIALS** → **OAuth client ID** click করুন
3. **Application type**: **Web application** select করুন
4. **Name**: "CricScore Pro Web"
5. **Authorized JavaScript origins** এ add করুন:
   ```
   http://localhost:5173
   http://localhost:3000
   https://your-domain.com (production এ deploy করার পর)
   ```
6. **Authorized redirect URIs** এ add করুন:
   ```
   http://localhost:5173
   ```
7. **Create** button এ click করুন
8. **Client ID** copy করুন (এটা খুব গুরুত্বপূর্ণ!)

### Step 5: Code এ Client ID যোগ করুন
`src/drive.ts` file open করুন এবং এই line খুঁজুন:

```typescript
const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
```

এটাকে আপনার actual Client ID দিয়ে replace করুন:

```typescript
const GOOGLE_CLIENT_ID = '123456789-abcdefg.apps.googleusercontent.com'; // আপনার Client ID
```

### Step 6: Test করুন
1. App run করুন: `npm run dev`
2. Login করুন
3. Profile screen এ যান (avatar এ click করুন)
4. **☁️ Google Drive Backup** section এ যান
5. **📤 Export All Matches to Drive** button এ click করুন
6. Google sign in window আসবে
7. আপনার Google account select করুন
8. Permission দিন
9. Matches Google Drive এ save হবে!

---

## 📊 কি Save হয় / What Gets Saved

### Export করলে যা হয়:
- সব matches JSON format এ save হয়
- File name: `CricScore_Match_Team1_vs_Team2_Date.json`
- Example: `CricScore_Match_Mumbai_vs_Chennai_2026-01-15.json`
- আপনার Google Drive এ save হয়
- শুধু আপনি access করতে পারবেন

### Import করলে যা হয়:
- Google Drive থেকে সব CricScore files খোঁজে
- প্রতিটি file download করে
- Local storage এ merge করে
- Duplicate matches skip করে

---

## 🎯 ব্যবহার করার নিয়ম / How to Use

### Matches Export করুন:
1. Profile screen এ যান
2. **📤 Export All Matches to Drive** click করুন
3. Google sign in করুন (প্রথম বার)
4. সব matches automatically save হবে
5. Success message দেখাবে

### Matches Import করুন:
1. Profile screen এ যান
2. **📥 Import Matches from Drive** click করুন
3. Google Drive থেকে সব matches download হবে
4. Local storage এ merge হবে
5. Success message দেখাবে

---

## 🔒 Security / নিরাপত্তা

### কি নিরাপদ?
✅ শুধু আপনার app এর files access করে  
✅ শুধু `CricScore_Match_*` files দেখে  
✅ অন্য Google Drive files access করে না  
✅ User এর permission ছাড়া কিছু করে না  
✅ Google এর secure OAuth ব্যবহার করে  

### কি নিরাপদ নয়?
❌ Client ID publicly expose করবেন না
❌ API keys GitHub এ commit করবেন না
❌ Production এ environment variables ব্যবহার করুন

---

## 🌐 Production এ Deploy করার পর

### Domain যোগ করুন:
1. Google Cloud Console এ যান
2. **APIs & Services** → **Credentials**
3. আপনার OAuth client এ click করুন
4. **Authorized JavaScript origins** এ add করুন:
   ```
   https://your-domain.com
   https://www.your-domain.com
   ```
5. **Save** click করুন

### Environment Variables ব্যবহার করুন:
Production এ Client ID hardcode করবেন না। Environment variable ব্যবহার করুন:

```typescript
// .env file তৈরি করুন
VITE_GOOGLE_CLIENT_ID=your-client-id-here

// drive.ts এ ব্যবহার করুন
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID;
```

---

## 🐛 Troubleshooting / সমস্যা সমাধান

### সমস্যা: "Google API not loaded"
**সমাধান:**
- Internet connection check করুন
- Browser cache clear করুন
- Page refresh করুন

### সমস্যা: "Popup blocked"
**সমাধান:**
- Browser settings এ popup allow করুন
- Address bar এ popup blocker icon এ click করুন
- "Always allow" select করুন

### সমস্যা: "Access denied"
**সমাধান:**
- Google Cloud Console এ যান
- OAuth consent screen check করুন
- Test users এ আপনার email add আছে কিনা দেখুন
- App এখনো "Testing" mode এ আছে কিনা দেখুন

### সমস্যা: Export হচ্ছে না
**সমাধান:**
- Browser console খুলুন (F12)
- Error message দেখুন
- Client ID ঠিক আছে কিনা check করুন
- Authorized origins ঠিক আছে কিনা check করুন

---

## 📋 Quick Checklist / দ্রুত চেকলিস্ট

### Setup এর জন্য:
- [ ] Google Cloud project তৈরি করেছেন
- [ ] Google Drive API enable করেছেন
- [ ] OAuth consent screen setup করেছেন
- [ ] OAuth credentials তৈরি করেছেন
- [ ] Client ID copy করেছেন
- [ ] `src/drive.ts` এ Client ID যোগ করেছেন
- [ ] Authorized origins add করেছেন
- [ ] Test করেছেন

### Production এর জন্য:
- [ ] Production domain add করেছেন
- [ ] Environment variables ব্যবহার করছেন
- [ ] OAuth consent screen "Production" করেছেন
- [ ] Google verification এর জন্য submit করেছেন (যদি লাগে)

---

## 🎉 সব প্রস্তুত!

এখন আপনার users:
✅ তাদের matches Google Drive এ save করতে পারবে
✅ অন্য device থেকে matches import করতে পারবে
✅ Data backup রাখতে পারবে
✅ Share করতে পারবে

---

## 📞 সাহায্য দরকার?

### Documentation:
- Google Drive API: https://developers.google.com/drive/api
- OAuth 2.0: https://developers.google.com/identity/protocols/oauth2
- Google Cloud Console: https://console.cloud.google.com/

### Common Issues:
- https://developers.google.com/drive/api/v3/handle-errors
- https://developers.google.com/identity/protocols/oauth2/web-server

---

**Status:** ✅ Ready to Setup  
**Difficulty:** Medium (30 minutes)  
**Cost:** Free
