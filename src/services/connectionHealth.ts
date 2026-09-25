import { doc, getDocFromServer } from 'firebase/firestore';
import { db, config } from './firebase';

export type HealthStatus = 'checking' | 'connected' | 'error';

export interface HealthCheckState {
  status: HealthStatus;
  latencyMs: number | null;
  testedAt: string | null;
  errorMessage: string | null;
  errorCode: string | null;
  errorDetails: string | null;
  projectId: string;
  databaseId: string;
  isOffline: boolean;
}

let currentState: HealthCheckState = {
  status: 'checking',
  latencyMs: null,
  testedAt: null,
  errorMessage: null,
  errorCode: null,
  errorDetails: null,
  projectId: config.projectId || 'gen-lang-client-0997069506',
  databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
};

const listeners = new Set<(state: HealthCheckState) => void>();

export function getHealthCheckState(): HealthCheckState {
  return currentState;
}

export function onHealthCheckChange(callback: (state: HealthCheckState) => void): () => void {
  listeners.add(callback);
  callback(currentState);
  return () => {
    listeners.delete(callback);
  };
}

function notifyListeners() {
  listeners.forEach((fn) => fn(currentState));
}

/**
 * Perform a live ping / connection check to Google Cloud Firestore server
 */
export async function runConnectionHealthCheck(): Promise<HealthCheckState> {
  const startTime = performance.now();
  const timeoutMs = 8000;
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;

  currentState = {
    ...currentState,
    status: 'checking',
    isOffline,
  };
  notifyListeners();

  // If navigator is strictly offline
  if (isOffline) {
    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'Perangkat Offline (Tidak ada jaringan internet)',
      errorCode: 'NETWORK_OFFLINE',
      errorDetails: 'Browser mendeteksi navigator.onLine bernilai false. Silakan periksa koneksi Wi-Fi atau data seluler Anda.',
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: true,
    };
    notifyListeners();
    return currentState;
  }

  try {
    // Attempt direct server fetch (bypassing client cache)
    const testDocRef = doc(db, '_connection_health', 'ping');
    
    let timerId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutErr = new Error('Network Timeout: Respon database melebihi batas waktu (8000ms).');
        (timeoutErr as any).code = 'deadline-exceeded';
        reject(timeoutErr);
      }, timeoutMs);
    });

    // Race against timeout
    await Promise.race([
      getDocFromServer(testDocRef),
      timeoutPromise
    ]);
    if (timerId) clearTimeout(timerId);

    const latency = Math.round(performance.now() - startTime);

    currentState = {
      status: 'connected',
      latencyMs: latency,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: null,
      errorCode: null,
      errorDetails: null,
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: false,
    };
    notifyListeners();
    return currentState;
  } catch (error: any) {
    const rawMsg = error?.message || String(error);
    const rawCode = error?.code || 'UNKNOWN_ERROR';
    let friendlyMsg = rawMsg;
    let code = rawCode;

    if (rawMsg.includes('the client is offline') || rawMsg.includes('Failed to get document because the client is offline')) {
      friendlyMsg = 'Klien Offline / Tidak dapat menghubungi server Firestore';
      code = 'CLIENT_OFFLINE';
    } else if (rawMsg.includes('API key not valid') || rawCode === 'auth/invalid-api-key') {
      friendlyMsg = 'API Key Invalid: Kredensial Firebase API Key tidak valid';
      code = 'API_KEY_INVALID';
    } else if (rawMsg.includes('permission-denied') || rawCode === 'permission-denied') {
      friendlyMsg = 'Permission Denied: Aturan keamanan Firestore menolak akses baca';
      code = 'PERMISSION_DENIED';
    } else if (rawMsg.includes('Network Timeout') || rawCode === 'deadline-exceeded') {
      friendlyMsg = 'Network Timeout: Batas waktu koneksi Firestore terlampaui (8000ms)';
      code = 'NETWORK_TIMEOUT';
    } else if (rawMsg.includes('Quota exceeded')) {
      friendlyMsg = 'Quota Exceeded: Batas kuota gratis Firebase harian tercapai';
      code = 'RESOURCE_EXHAUSTED';
    }

    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: friendlyMsg,
      errorCode: code,
      errorDetails: rawMsg,
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
    notifyListeners();
    return currentState;
  }
}

/**
 * Useful for development verification or interactive debugging
 */
export function simulateHealthCheckState(type: 'apiKey' | 'permission' | 'timeout' | 'offline') {
  if (type === 'apiKey') {
    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'API Key Invalid: Kredensial Firebase API Key tidak valid atau telah kedaluwarsa',
      errorCode: 'API_KEY_INVALID',
      errorDetails: 'FirebaseError: [auth/invalid-api-key] Your API key is invalid, please check you have copied it correctly.',
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: false,
    };
  } else if (type === 'permission') {
    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'Permission Denied: Aturan keamanan Firestore menolak akses baca dokumen',
      errorCode: 'PERMISSION_DENIED',
      errorDetails: 'FirebaseError: Missing or insufficient permissions. Verify firestore.rules for collection read access.',
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: false,
    };
  } else if (type === 'timeout') {
    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'Network Timeout: Batas waktu koneksi Firestore terlampaui (8000ms)',
      errorCode: 'NETWORK_TIMEOUT',
      errorDetails: 'DeadlineExceededError: No response received from server within 8000ms window.',
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: false,
    };
  } else if (type === 'offline') {
    currentState = {
      status: 'error',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      errorMessage: 'Perangkat Offline (Tidak ada jaringan internet)',
      errorCode: 'NETWORK_OFFLINE',
      errorDetails: 'Browser mendeteksi kehilangan koneksi jaringan seluler/Wi-Fi.',
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: true,
    };
  }
  notifyListeners();
}

// Auto-run on module import and bind window online/offline listeners
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    runConnectionHealthCheck();
  });
  window.addEventListener('offline', () => {
    currentState = {
      ...currentState,
      status: 'error',
      errorMessage: 'Perangkat Offline (Tidak ada jaringan internet)',
      errorCode: 'NETWORK_OFFLINE',
      errorDetails: 'Browser mendeteksi kehilangan koneksi jaringan.',
      isOffline: true,
      testedAt: new Date().toLocaleTimeString('id-ID'),
    };
    notifyListeners();
  });

  // Run initial test
  setTimeout(() => {
    runConnectionHealthCheck();
  }, 100);
}
