import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager, 
  getFirestore, 
  Firestore,
  collection,
  doc,
  setDoc,
  deleteDoc,
  getDocs,
  onSnapshot,
  writeBatch,
  enableNetwork,
  disableNetwork
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Safe environment variable & config resolution to avoid undefined values
export const config = {
  projectId: (import.meta as any).env?.VITE_FIREBASE_PROJECT_ID || rawConfig?.projectId || 'gen-lang-client-0997069506',
  appId: (import.meta as any).env?.VITE_FIREBASE_APP_ID || rawConfig?.appId || '1:1087063289204:web:65111991e36041a44c9021',
  apiKey: (import.meta as any).env?.VITE_FIREBASE_API_KEY || rawConfig?.apiKey || 'AIzaSyC7xN-qa1NEXGjUx544rvtk3FhwTvMTccE',
  authDomain: (import.meta as any).env?.VITE_FIREBASE_AUTH_DOMAIN || rawConfig?.authDomain || 'gen-lang-client-0997069506.firebaseapp.com',
  firestoreDatabaseId: (import.meta as any).env?.VITE_FIREBASE_FIRESTORE_DATABASE_ID || rawConfig?.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
  storageBucket: (import.meta as any).env?.VITE_FIREBASE_STORAGE_BUCKET || rawConfig?.storageBucket || 'gen-lang-client-0997069506.firebasestorage.app',
  messagingSenderId: (import.meta as any).env?.VITE_FIREBASE_MESSAGING_SENDER_ID || rawConfig?.messagingSenderId || '1087063289204',
};

export let isFirebaseReady = false;
export let firebaseInitError: string | null = null;

// Initialize Firebase App with Try-Catch Protection
let app: FirebaseApp;
try {
  if (getApps().length > 0) {
    app = getApp();
  } else {
    app = initializeApp({
      projectId: config.projectId,
      appId: config.appId,
      apiKey: config.apiKey,
      authDomain: config.authDomain,
      storageBucket: config.storageBucket,
      messagingSenderId: config.messagingSenderId,
    });
  }
} catch (err: any) {
  console.warn('[Firebase Initialization Warning] Falling back to default app container:', err?.message || err);
  firebaseInitError = err?.message || 'Gagal inisialisasi Firebase App.';
  // Fallback app container if needed
  app = getApps().length > 0 ? getApp() : ({} as FirebaseApp);
}

// Database ID specified in firebase-applet-config.json
const dbDatabaseId = config.firestoreDatabaseId && config.firestoreDatabaseId !== '(default)'
  ? config.firestoreDatabaseId
  : undefined;

// Enable Offline Persistence with persistentLocalCache & multi-tab manager
let db: Firestore;
try {
  db = dbDatabaseId
    ? initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      }, dbDatabaseId)
    : initializeFirestore(app, {
        localCache: persistentLocalCache({
          tabManager: persistentMultipleTabManager()
        })
      });
  isFirebaseReady = true;
} catch (cacheErr: any) {
  try {
    db = dbDatabaseId ? getFirestore(app, dbDatabaseId) : getFirestore(app);
    isFirebaseReady = true;
  } catch (fsErr: any) {
    console.warn('[Firestore Initialization Warning] Offline local fallback activated:', fsErr?.message || fsErr);
    firebaseInitError = fsErr?.message || 'Gagal inisialisasi Firestore.';
    db = {} as Firestore;
  }
}

// Clean undefined fields before writing to Firestore
export function cleanForFirestore<T>(data: T): T {
  if (data === null || data === undefined) return data;
  if (Array.isArray(data)) {
    return data.map(cleanForFirestore) as unknown as T;
  }
  if (typeof data === 'object' && !(data instanceof Date)) {
    const cleaned: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
      if (value !== undefined) {
        cleaned[key] = cleanForFirestore(value);
      }
    }
    return cleaned as T;
  }
  return data;
}

export { 
  app, 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  enableNetwork, 
  disableNetwork 
};
