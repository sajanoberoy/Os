import { initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
try {
  const app = initializeApp({ projectId: config.projectId });
  const auth = getAuth(app);
  auth.createCustomToken('backend-server').then(token => console.log('Token:', token)).catch(e => console.error('Error:', e));
} catch(e) { console.error('Init Error:', e); }
