import 'dotenv/config';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function test() {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const uid = 'some-uid';
  const idToken = 'fake-token';

  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
  console.log('URL:', url);
  
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${idToken}`
    }
  });
  
  const data = await res.json();
  console.log('Response:', data);
}

test();
