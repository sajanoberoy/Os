import { initializeApp } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const config = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));
try {
  const app = initializeApp({ projectId: config.projectId });
  console.log('App initialized');
  const db = getFirestore(app, config.firestoreDatabaseId);
  db.collection('test').limit(1).get().then(() => console.log('Success')).catch(e => console.error('Error:', e));
} catch(e) { console.error('Init Error:', e); }
