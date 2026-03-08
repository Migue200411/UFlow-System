import type { VercelRequest, VercelResponse } from '@vercel/node';
import admin from 'firebase-admin';

// Initialize Firebase Admin (singleton)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    }),
  });
}

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'http://localhost:5173').split(',');

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const origin = req.headers.origin || '';
  if (allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
  }
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Invalid email' });
  }

  try {
    const user = await admin.auth().getUserByEmail(email);
    const providers = user.providerData.map(p => p.providerId);
    const isGoogle = providers.includes('google.com');
    const isPassword = providers.includes('password');

    return res.json({ exists: true, isGoogle, isPassword });
  } catch (err: any) {
    if (err.code === 'auth/user-not-found') {
      return res.json({ exists: false, isGoogle: false, isPassword: false });
    }
    return res.status(500).json({ error: 'Server error' });
  }
}
