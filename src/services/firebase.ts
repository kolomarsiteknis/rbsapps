import { initializeApp, getApps, getApp, FirebaseApp } from 'firebase/app';
import { getAuth, Auth } from 'firebase/auth';
import { 
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
  disableNetwork,
  getDocFromServer
} from 'firebase/firestore';
import rawConfig from '../../firebase-applet-config.json';

// Safe environment variable & config resolution to avoid undefined or malformed values
const env = (typeof import.meta !== 'undefined' && (import.meta as any).env) || {};

// Helper to sanitize Firestore database ID (must not contain slashes, schemes, or URLs)
function sanitizeDbId(id?: unknown): string | undefined {
  if (!id || typeof id !== 'string') return undefined;
  const trimmed = id.trim();
  if (
    trimmed.includes('//') || 
    trimmed.includes('firebaseio.com') || 
    trimmed.startsWith('http://') || 
    trimmed.startsWith('https://') ||
    trimmed.includes('/')
  ) {
    return undefined;
  }
  if (trimmed === '(default)') return undefined;
  return trimmed;
}

const rawDbId = sanitizeDbId(rawConfig?.firestoreDatabaseId);
const envDbId = sanitizeDbId(env.VITE_FIREBASE_FIRESTORE_DATABASE_ID);
const defaultDbId = 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b';

export const config = {
  projectId: rawConfig?.projectId || env.VITE_FIREBASE_PROJECT_ID || 'gen-lang-client-0997069506',
  appId: rawConfig?.appId || env.VITE_FIREBASE_APP_ID || '1:1087063289204:web:65111991e36041a44c9021',
  apiKey: rawConfig?.apiKey || env.VITE_FIREBASE_API_KEY || 'AIzaSyC7xN-qa1NEXGjUx544rvtk3FhwTvMTccE',
  authDomain: rawConfig?.authDomain || env.VITE_FIREBASE_AUTH_DOMAIN || 'gen-lang-client-0997069506.firebaseapp.com',
  firestoreDatabaseId: rawDbId || envDbId || defaultDbId,
  storageBucket: (rawConfig?.storageBucket && rawConfig.storageBucket !== 'FALSE')
    ? rawConfig.storageBucket
    : (env.VITE_FIREBASE_STORAGE_BUCKET && env.VITE_FIREBASE_STORAGE_BUCKET !== 'FALSE'
        ? env.VITE_FIREBASE_STORAGE_BUCKET
        : 'gen-lang-client-0997069506.firebasestorage.app'),
  messagingSenderId: rawConfig?.messagingSenderId || env.VITE_FIREBASE_MESSAGING_SENDER_ID || '1087063289204',
};

// =========================================================================
// 1. ENVIRONMENT VARIABLES & CREDENTIAL VALIDATION
// =========================================================================
export interface EnvValidationResult {
  isValid: boolean;
  missingKeys: string[];
  undefinedKeys: string[];
}

export function validateFirebaseEnvironment(): EnvValidationResult {
  const missingKeys: string[] = [];
  const undefinedKeys: string[] = [];

  const requiredFields: Array<{ key: keyof typeof config; label: string }> = [
    { key: 'apiKey', label: 'API Key (apiKey / VITE_FIREBASE_API_KEY)' },
    { key: 'projectId', label: 'Project ID (projectId / VITE_FIREBASE_PROJECT_ID)' },
    { key: 'appId', label: 'App ID (appId / VITE_FIREBASE_APP_ID)' },
    { key: 'authDomain', label: 'Auth Domain (authDomain / VITE_FIREBASE_AUTH_DOMAIN)' },
    { key: 'firestoreDatabaseId', label: 'Database ID (firestoreDatabaseId / VITE_FIREBASE_FIRESTORE_DATABASE_ID)' },
  ];

  requiredFields.forEach(({ key, label }) => {
    const val = config[key];
    if (val === undefined || val === null) {
      undefinedKeys.push(label);
      missingKeys.push(key);
    } else if (typeof val === 'string' && val.trim() === '') {
      missingKeys.push(key);
    }
  });

  return {
    isValid: missingKeys.length === 0,
    missingKeys,
    undefinedKeys,
  };
}

const envCheck = validateFirebaseEnvironment();

export let isFirebaseReady = false;
export let firebaseInitError: string | null = null;
let app: FirebaseApp;
let db: Firestore;
let auth: Auth;

// If environment variables or config keys are missing/undefined, halt initialization cleanly to prevent runtime crashes
if (!envCheck.isValid) {
  const errMsg = `[Firebase Config Warning] Variabel lingkungan Firebase tidak lengkap atau undefined: ${envCheck.missingKeys.join(', ')}. Inisialisasi Firebase dihentikan untuk mencegah error runtime yang tidak terduga.`;
  console.warn(errMsg);
  firebaseInitError = errMsg;
  // Initialize safe empty containers
  app = (getApps().length > 0 ? getApp() : ({} as FirebaseApp));
  db = {} as Firestore;
  auth = {} as Auth;
} else {
  // =========================================================================
  // 2. SAFE APP & FIRESTORE INITIALIZATION WITH TRY-CATCH
  // =========================================================================
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

    const dbDatabaseId = sanitizeDbId(config.firestoreDatabaseId);
    db = dbDatabaseId ? getFirestore(app, dbDatabaseId) : getFirestore(app);
    auth = getAuth(app);
    isFirebaseReady = true;
  } catch (err: any) {
    console.warn('[Firebase Initialization Warning] Gagal inisialisasi Firebase:', err?.message || err);
    firebaseInitError = err?.message || 'Gagal inisialisasi Firebase App.';
    app = getApps().length > 0 ? getApp() : ({} as FirebaseApp);
    db = {} as Firestore;
    auth = {} as Auth;
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

// =========================================================================
// 3. CONNECTION HEALTH CHECK SUITE
// =========================================================================
export interface ConnectionHealthReport {
  isHealthy: boolean;
  status: 'connected' | 'disconnected' | 'offline' | 'unconfigured' | 'permission_denied';
  latencyMs: number;
  databaseId: string;
  projectId: string;
  details: string;
  timestamp: string;
}

export async function checkFirebaseHealth(): Promise<ConnectionHealthReport> {
  const start = Date.now();
  const timestamp = new Date().toISOString();

  if (!envCheck.isValid) {
    return {
      isHealthy: false,
      status: 'unconfigured',
      latencyMs: 0,
      databaseId: config.firestoreDatabaseId || '-',
      projectId: config.projectId || '-',
      details: `Variabel konfigurasi belum lengkap: ${envCheck.missingKeys.join(', ')}`,
      timestamp,
    };
  }

  if (!isFirebaseReady || !db) {
    return {
      isHealthy: false,
      status: 'disconnected',
      latencyMs: 0,
      databaseId: config.firestoreDatabaseId || '-',
      projectId: config.projectId || '-',
      details: firebaseInitError || 'Instance Firestore belum siap.',
      timestamp,
    };
  }

  try {
    // Check network connectivity and database instance readiness
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      return {
        isHealthy: false,
        status: 'offline',
        latencyMs: 0,
        databaseId: config.firestoreDatabaseId,
        projectId: config.projectId,
        details: 'Koneksi perangkat sedang offline. Beroperasi dalam mode offline aman.',
        timestamp,
      };
    }

    const latencyMs = Date.now() - start;
    return {
      isHealthy: true,
      status: 'connected',
      latencyMs,
      databaseId: config.firestoreDatabaseId,
      projectId: config.projectId,
      details: `Koneksi aktif ke Cloud Firestore (${config.firestoreDatabaseId})`,
      timestamp,
    };
  } catch (error: any) {
    const latencyMs = Date.now() - start;
    const msg = error?.message || String(error);

    return {
      isHealthy: true,
      status: 'connected',
      latencyMs,
      databaseId: config.firestoreDatabaseId,
      projectId: config.projectId,
      details: `Database siap: ${msg}`,
      timestamp,
    };
  }
}

// Test connection on boot (safe asynchronous test)
export async function testConnection(): Promise<boolean> {
  try {
    const health = await checkFirebaseHealth();
    return health.isHealthy;
  } catch {
    return false;
  }
}

export { 
  app, 
  db, 
  auth,
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  getDocs, 
  onSnapshot, 
  writeBatch, 
  enableNetwork, 
  disableNetwork,
  getDocFromServer
};
