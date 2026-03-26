import 'dotenv/config';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

admin.initializeApp(); // Don't pass projectId, let ADC figure it out

const db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);

async function test() {
  try {
    const snapshot = await db.collection('users').limit(1).get();
    console.log('Success! Found', snapshot.size, 'users.');
  } catch (e) {
    console.error('Error:', e);
  }
}

test();
