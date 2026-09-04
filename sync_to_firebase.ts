import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';
import fs from 'fs';
import path from 'path';

const config = JSON.parse(fs.readFileSync('firebase-applet-config.json', 'utf8'));
const app = initializeApp(config);
const db = getFirestore(app, config.firestoreDatabaseId);

async function syncToFirebase() {
  console.log('Syncing users...');
  const usersPath = path.join(process.cwd(), 'data', 'users.json');
  if (fs.existsSync(usersPath)) {
    const users = JSON.parse(fs.readFileSync(usersPath, 'utf8'));
    for (const [id, user] of Object.entries(users)) {
      await setDoc(doc(db, 'users', id), user);
    }
  }

  console.log('Syncing documents...');
  const docsPath = path.join(process.cwd(), 'data', 'documents');
  if (fs.existsSync(docsPath)) {
    const files = fs.readdirSync(docsPath);
    for (const file of files) {
      if (!file.endsWith('.txt') && !file.endsWith('.md') && !file.endsWith('.json')) continue;
      const content = fs.readFileSync(path.join(docsPath, file), 'utf8');
      await setDoc(doc(db, 'documents', file), {
        filename: file,
        content,
        updatedAt: fs.statSync(path.join(docsPath, file)).mtime.toISOString()
      });
    }
  }
  console.log('Sync complete.');
}
syncToFirebase().catch(console.error);
