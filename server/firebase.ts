import { initializeApp, getApps, FirebaseApp } from 'firebase/app';
import { 
  getFirestore, 
  Firestore,
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where 
} from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

// Production configuration fallback
const DEFAULT_FIREBASE_CONFIG = {
  projectId: 'reflecting-electron-8dx1j',
  appId: '1:790590122308:web:75096a480e71318d844f11',
  apiKey: 'AIzaSyCMmzNbpQgQVQZnMZhf64JLfcJxdtG1Qe8',
  authDomain: 'reflecting-electron-8dx1j.firebaseapp.com',
  firestoreDatabaseId: 'ai-studio-campusai-9a981865-cf6b-406e-b790-0d9f6688030f',
  storageBucket: 'reflecting-electron-8dx1j.firebasestorage.app',
  messagingSenderId: '790590122308',
  measurementId: '',
  recaptchaSiteKey: ''
};

let config = DEFAULT_FIREBASE_CONFIG;
const potentialConfigPaths = [
  path.join(process.cwd(), 'firebase-applet-config.json'),
  path.resolve('./firebase-applet-config.json'),
  path.resolve('firebase-applet-config.json'),
];

for (const p of potentialConfigPaths) {
  try {
    if (fs.existsSync(p)) {
      const fileData = JSON.parse(fs.readFileSync(p, 'utf8'));
      if (fileData && fileData.projectId) {
        config = fileData;
        console.log(`[Firebase] Loaded configuration from: ${p}`);
        break;
      }
    }
  } catch (e) {
    // Continue checking other potential paths
  }
}

let app: FirebaseApp;
if (getApps().length > 0) {
  app = getApps()[0];
} else {
  app = initializeApp(config);
}

const firestoreDbId = config.firestoreDatabaseId || 'ai-studio-campusai-9a981865-cf6b-406e-b790-0d9f6688030f';
const db: Firestore = getFirestore(app, firestoreDbId);

console.log(`[Firebase] Firestore initialized successfully (Database ID: ${firestoreDbId}).`);

export { 
  db, 
  app, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  collection, 
  query, 
  where 
};
