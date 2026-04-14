import type { FirebaseOptions } from 'firebase/app';

const fallbackFirebaseConfig = {
  projectId: 'studio-8590208484-ff9b4',
  appId: '1:148239293127:web:0c2090441273d2ff61fce2',
  apiKey: 'AIzaSyDt1YFSLOMdwDPQLUPE8tfTxrHYpObuXwE',
  authDomain: 'studio-8590208484-ff9b4.firebaseapp.com',
  measurementId: '',
  messagingSenderId: '148239293127',
} satisfies FirebaseOptions;

const measurementId =
  process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID ?? fallbackFirebaseConfig.measurementId;

export const firebaseConfig: FirebaseOptions = {
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? fallbackFirebaseConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID ?? fallbackFirebaseConfig.appId,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY ?? fallbackFirebaseConfig.apiKey,
  authDomain:
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? fallbackFirebaseConfig.authDomain,
  messagingSenderId:
    process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ??
    fallbackFirebaseConfig.messagingSenderId,
  ...(measurementId ? {measurementId} : {}),
};
