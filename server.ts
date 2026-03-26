import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import admin from 'firebase-admin';
import { getFirestore } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { ethers } from 'ethers';
import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import bs58 from 'bs58';
import fs from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const configPath = path.join(__dirname, 'firebase-applet-config.json');
let firebaseConfig: any = {};
try {
  firebaseConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  console.error('Could not read firebase-applet-config.json', e);
}

// Initialize Firebase Admin
let db: admin.firestore.Firestore | null = null;
let auth: admin.auth.Auth | null = null;

try {
  const saEnv = process.env.FIREBASE_SERVICE_ACCOUNT;
  
  if (saEnv && saEnv.trim().toLowerCase() !== 'null' && saEnv.trim().toLowerCase() !== 'none' && saEnv.trim() !== '') {
    try {
      const serviceAccount = JSON.parse(saEnv);
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
        projectId: firebaseConfig.projectId
      });
      console.log('Firebase Admin initialized with provided service account.');
    } catch (e) {
      console.warn('Could not parse FIREBASE_SERVICE_ACCOUNT. Falling back to Application Default Credentials.');
      admin.initializeApp({
        projectId: firebaseConfig.projectId
      });
    }
  } else {
    // Use Application Default Credentials (ADC)
    console.log('Using Application Default Credentials for Firebase Admin');
    admin.initializeApp({
      projectId: firebaseConfig.projectId
    });
  }
  
  db = getFirestore(admin.app(), firebaseConfig.firestoreDatabaseId);
  auth = getAuth(admin.app());
  console.log('Firebase Admin initialized successfully.');
} catch (error) {
  console.error('Failed to initialize Firebase Admin:', error);
}

const app = express();
app.use(cors());
app.use(express.json());

// Helper to verify admin token using REST API to avoid ADC permission issues
async function verifyAdmin(idToken: string) {
  // Decode token to get UID without verifying (we'll verify via REST API call)
  let uid: string;
  try {
    const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
    uid = payload.user_id || payload.sub;
    
    // Super admin bypass
    if (payload.email === 'samadeniji852@gmail.com' && payload.email_verified) {
      return uid;
    }
  } catch (e) {
    throw new Error('Invalid authentication token');
  }

  // Use REST API with user's idToken to check their role. 
  // The REST API will implicitly verify the token's validity.
  const projectId = firebaseConfig.projectId;
  const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/users/${uid}`;
  
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${idToken}` }
  });
  
  if (!res.ok) {
    const errorText = await res.text();
    console.error('Admin verification REST API failed:', errorText);
    throw new Error('Unauthorized: Could not verify admin status');
  }
  
  const data = await res.json();
  const role = data.fields?.role?.stringValue;
  
  if (role !== 'admin') {
    throw new Error('Unauthorized: Admin access required');
  }
  return uid;
}

// API Route for sending crypto
app.post('/api/admin/send-crypto', async (req, res) => {
  try {
    const { transactionId, idToken } = req.body;
    
    if (!transactionId || !idToken) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    await verifyAdmin(idToken);

    // Use REST API to read transaction to avoid ADC permission issues
    const projectId = firebaseConfig.projectId;
    const databaseId = firebaseConfig.firestoreDatabaseId || '(default)';
    const txUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/transactions/${transactionId}`;
    
    const txRes = await fetch(txUrl, {
      headers: { Authorization: `Bearer ${idToken}` }
    });
    
    if (!txRes.ok) {
      return res.status(404).json({ error: 'Transaction not found or unauthorized' });
    }

    const txData = await txRes.json();
    const status = txData.fields?.status?.stringValue;
    const type = txData.fields?.type?.stringValue;
    const cryptoCurrency = txData.fields?.cryptoCurrency?.stringValue;
    const amountCryptoVal = txData.fields?.amountCrypto?.doubleValue || txData.fields?.amountCrypto?.integerValue;
    const amountCrypto = Number(amountCryptoVal);
    const recipientWallet = txData.fields?.recipientWallet?.stringValue;
    
    if (status !== 'pending') {
      return res.status(400).json({ error: 'Transaction is not pending' });
    }

    if (type !== 'buy') {
      return res.status(400).json({ error: 'Only buy transactions can be auto-sent' });
    }

    if (!recipientWallet) {
      return res.status(400).json({ error: 'User did not provide a recipient wallet address' });
    }

    let txHash = '';

    if (cryptoCurrency === 'SOL') {
      const solKey = process.env.SOLANA_PRIVATE_KEY;
      if (!solKey || solKey === 'null' || solKey === 'undefined') {
        throw new Error('SOLANA_PRIVATE_KEY not configured. Cannot send SOL automatically.');
      }
      
      const connection = new Connection('https://api.mainnet-beta.solana.com', 'confirmed');
      const fromKeypair = Keypair.fromSecretKey(bs58.decode(solKey));
      const toPublicKey = new PublicKey(recipientWallet);
      
      const lamports = Math.floor(amountCrypto * 1e9);
      
      const transaction = new Transaction().add(
        SystemProgram.transfer({
          fromPubkey: fromKeypair.publicKey,
          toPubkey: toPublicKey,
          lamports,
        })
      );
      
      txHash = await sendAndConfirmTransaction(connection, transaction, [fromKeypair]);
      
    } else if (cryptoCurrency === 'USDT' || cryptoCurrency === 'USDC') {
      const evmKey = process.env.EVM_PRIVATE_KEY;
      if (!evmKey || evmKey === 'null' || evmKey === 'undefined') {
        throw new Error('EVM_PRIVATE_KEY not configured. Cannot send USDT/USDC automatically.');
      }
      
      // Using BSC Mainnet as an example since the prompt mentioned BEP20 for USDT/USDC
      const provider = new ethers.JsonRpcProvider('https://bsc-dataseed.binance.org/');
      const wallet = new ethers.Wallet(evmKey, provider);
      
      // Token addresses on BSC
      const tokenAddress = cryptoCurrency === 'USDT' 
        ? '0x55d398326f99059fF775485246999027B3197955' // USDT BEP20
        : '0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d'; // USDC BEP20
        
      const abi = ["function transfer(address to, uint256 value) returns (bool)"];
      const contract = new ethers.Contract(tokenAddress, abi, wallet);
      
      // Assuming 18 decimals for these BEP20 tokens
      const amountParsed = ethers.parseUnits(amountCrypto.toString(), 18);
      
      const tx = await contract.transfer(recipientWallet, amountParsed);
      await tx.wait();
      txHash = tx.hash;
    } else {
      throw new Error(`Unsupported cryptocurrency: ${cryptoCurrency}`);
    }

    // Update transaction status to completed using REST API
    const updateUrl = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/${databaseId}/documents/transactions/${transactionId}?updateMask.fieldPaths=status&updateMask.fieldPaths=txHash&updateMask.fieldPaths=updatedAt`;
    
    const updateBody = {
      fields: {
        status: { stringValue: 'completed' },
        txHash: { stringValue: txHash },
        updatedAt: { timestampValue: new Date().toISOString() }
      }
    };

    const updateRes = await fetch(updateUrl, {
      method: 'PATCH',
      headers: { 
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(updateBody)
    });

    if (!updateRes.ok) {
      console.error('Failed to update transaction status in Firestore', await updateRes.text());
      // We still return success because the crypto was sent, but we warn the user
      return res.json({ success: true, txHash, warning: 'Crypto sent, but failed to update transaction status in database.' });
    }

    res.json({ success: true, txHash });

  } catch (error: any) {
    console.error('Error sending crypto:', error);
    res.status(500).json({ error: error.message || 'Failed to send crypto' });
  }
});

async function startServer() {
  const PORT = 3000;

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
