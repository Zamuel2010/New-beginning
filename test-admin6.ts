import 'dotenv/config';
import fs from 'fs';

const firebaseConfig = JSON.parse(fs.readFileSync('./firebase-applet-config.json', 'utf8'));

async function test() {
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const transactionId = 'some-tx-id';
  const idToken = 'fake-token';

  const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/transactions/${transactionId}?updateMask.fieldPaths=status&updateMask.fieldPaths=txHash&updateMask.fieldPaths=updatedAt`;
  
  console.log('Update URL:', updateUrl);
}

test();
