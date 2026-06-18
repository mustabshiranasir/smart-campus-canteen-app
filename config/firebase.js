import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

let privateKey = process.env.FIREBASE_PRIVATE_KEY;
if (privateKey) {
  // Handle escaped newlines in the private key
  privateKey = privateKey.replace(/\\n/g, '\n');
}

const serviceAccount = {
  projectId: process.env.FIREBASE_PROJECT_ID,
  clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
  privateKey: privateKey,
};

try {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  console.log('Firebase initialized successfully');
} catch (error) {
  console.error('Firebase initialization error:', error.message);
}

export const firebaseConfig = {
  apiKey: "AIzaSyBz690Dmj0bopIONwpr9tL7GoWiWgn_gKM",
  authDomain: "smartcanteenapp-1a1b2.firebaseapp.com",
  projectId: "smartcanteenapp-1a1b2",
  storageBucket: "smartcanteenapp-1a1b2.firebasestorage.app",
  messagingSenderId: "788175552104",
  appId: "1:788175552104:web:4a0248682762a86fea85dd",
  measurementId: "G-BNW299935C",
};

export default admin;
