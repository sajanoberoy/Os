import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
try {
  const app = initializeApp({ projectId: config.projectId });
  const db = getFirestore(app);
  db.collection('test').limit(1).get().then(() => console.log('Admin SDK works!')).catch(e => console.error('Admin SDK Error:', e.message));
} catch(e) { console.error('Init Error:', e); }
