// Google Drive Integration Service
// This service handles saving match data to user's personal Google Drive

// Add type declarations for Google API
declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const GOOGLE_CLIENT_ID = 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const SCOPES = 'https://www.googleapis.com/auth/drive.file';

interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
  createdTime: string;
}

let tokenClient: any = null;
let accessToken: string | null = null;

// Initialize Google API
export function initGoogleAPI(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('Window not available'));
      return;
    }

    // Load Google API scripts
    const script1 = document.createElement('script');
    script1.src = 'https://apis.google.com/js/api.js';
    script1.onload = () => {
      const script2 = document.createElement('script');
      script2.src = 'https://accounts.google.com/gsi/client';
      script2.onload = () => resolve();
      script2.onerror = reject;
      document.head.appendChild(script2);
    };
    script1.onerror = reject;
    document.head.appendChild(script1);
  });
}

// Authenticate with Google
export async function authenticateGoogle(): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!window.google) {
      reject(new Error('Google API not loaded'));
      return;
    }

    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: SCOPES,
      callback: (response: any) => {
        if (response.error) {
          reject(response.error);
          return;
        }
        accessToken = response.access_token;
        resolve(accessToken!);
      },
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

// Upload match data to Google Drive
export async function uploadMatchToDrive(match: any): Promise<string> {
  if (!accessToken) {
    await authenticateGoogle();
  }

  const fileName = `CricScore_Match_${match.team1.name}_vs_${match.team2.name}_${new Date(match.createdAt).toISOString().split('T')[0]}.json`;
  
  const metadata = {
    name: fileName,
    mimeType: 'application/json',
  };

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelimiter = `\r\n--${boundary}--`;

  const multipartRequestBody =
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: application/json\r\n\r\n' +
    JSON.stringify(match) +
    closeDelimiter;

  const response = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': `multipart/related; boundary=${boundary}`,
    },
    body: multipartRequestBody,
  });

  if (!response.ok) {
    throw new Error('Failed to upload to Google Drive');
  }

  const data = await response.json();
  return data.id;
}

// Download match data from Google Drive
export async function downloadMatchFromDrive(fileId: string): Promise<any> {
  if (!accessToken) {
    await authenticateGoogle();
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to download from Google Drive');
  }

  return await response.json();
}

// List all match files in Google Drive
export async function listMatchesFromDrive(): Promise<DriveFile[]> {
  if (!accessToken) {
    await authenticateGoogle();
  }

  const response = await fetch(
    'https://www.googleapis.com/drive/v3/files?q=name contains "CricScore_Match"&fields=files(id,name,mimeType,createdTime)&orderBy=createdTime desc',
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    }
  );

  if (!response.ok) {
    throw new Error('Failed to list files from Google Drive');
  }

  const data = await response.json();
  return data.files || [];
}

// Delete match file from Google Drive
export async function deleteMatchFromDrive(fileId: string): Promise<void> {
  if (!accessToken) {
    await authenticateGoogle();
  }

  const response = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    throw new Error('Failed to delete file from Google Drive');
  }
}

// Export all matches to Google Drive
export async function exportAllMatchesToDrive(): Promise<number> {
  const matches = JSON.parse(localStorage.getItem('cric_matches') || '[]');
  let uploaded = 0;

  for (const match of matches) {
    try {
      await uploadMatchToDrive(match);
      uploaded++;
    } catch (error) {
      console.error('Failed to upload match:', error);
    }
  }

  return uploaded;
}

// Import all matches from Google Drive
export async function importAllMatchesFromDrive(): Promise<number> {
  const files = await listMatchesFromDrive();
  let imported = 0;

  for (const file of files) {
    try {
      const match = await downloadMatchFromDrive(file.id);
      const matches = JSON.parse(localStorage.getItem('cric_matches') || '[]');
      
      // Check if match already exists
      if (!matches.find((m: any) => m.id === match.id)) {
        matches.push(match);
        localStorage.setItem('cric_matches', JSON.stringify(matches));
        imported++;
      }
    } catch (error) {
      console.error('Failed to import match:', error);
    }
  }

  return imported;
}

// Check if Google API is available
export function isGoogleAPIAvailable(): boolean {
  return typeof window !== 'undefined' && !!window.google;
}

// Get access token status
export function isAuthenticated(): boolean {
  return accessToken !== null;
}

// Sign out from Google
export function signOutGoogle(): void {
  if (accessToken && window.google) {
    window.google.accounts.oauth2.revoke(accessToken, () => {
      accessToken = null;
    });
  }
}
