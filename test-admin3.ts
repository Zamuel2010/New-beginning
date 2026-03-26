import 'dotenv/config';
import admin from 'firebase-admin';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp({
  projectId: firebaseConfig.projectId
});

async function test() {
  try {
    // Just try to get a user by email, or verify a fake token to see if it throws PERMISSION_DENIED or invalid token
    await admin.auth().verifyIdToken('fake-token');
  } catch (e: any) {
    console.error('Error:', e.message);
  }
}

test();
