import { doc, getDocFromServer } from 'firebase/firestore';
import { db, config, isFirebaseReady, firebaseInitError } from './firebase';

export type HealthStatus = 'checking' | 'connected' | 'error';
export type SignalQuality = 'good' | 'poor' | 'offline';

export interface SignalNotification {
  id: number;
  quality: SignalQuality;
  title: string;
  message: string;
  latencyMs: number | null;
  timestamp: string;
}

export interface HealthCheckState {
  status: HealthStatus;
  signalQuality: SignalQuality;
  signalLabel: string;
  latencyMs: number | null;
  testedAt: string | null;
  pingCount: number;
  autoPingIntervalSec: number;
  isAutoPingActive: boolean;
  lastPingHeartbeat: number;
  lastNotification: SignalNotification | null;
  errorMessage: string | null;
  errorCode: string | null;
  errorDetails: string | null;
  projectId: string;
  databaseId: string;
  isOffline: boolean;
}

const GOOD_SIGNAL_THRESHOLD_MS = 600;
const AUTO_PING_INTERVAL_MS = 5000; // Ping otomatis setiap 5 detik

let currentState: HealthCheckState = {
  status: 'checking',
  signalQuality: typeof navigator !== 'undefined' && !navigator.onLine ? 'offline' : 'good',
  signalLabel: typeof navigator !== 'undefined' && !navigator.onLine ? 'Sinyal Terputus' : 'Sinyal Baik',
  latencyMs: null,
  testedAt: null,
  pingCount: 0,
  autoPingIntervalSec: 5,
  isAutoPingActive: true,
  lastPingHeartbeat: Date.now(),
  lastNotification: null,
  errorMessage: null,
  errorCode: null,
  errorDetails: null,
  projectId: config.projectId || 'gen-lang-client-0997069506',
  databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
  isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
};

let isPingingInProgress = false;
let simulationPauseUntil = 0;
let hasShownInitialNotification = false;

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

function buildSignalNotification(
  quality: SignalQuality,
  latencyMs: number | null,
  customMessage?: string
): SignalNotification {
  const nowStr = new Date().toLocaleTimeString('id-ID');
  if (quality === 'good') {
    return {
      id: Date.now(),
      quality: 'good',
      title: 'Sinyal Baik • Database Connected',
      message:
        customMessage ||
        `Koneksi jaringan & database sangat stabil (${latencyMs ?? 45}ms). Ping otomatis tiap 5 detik aktif menjaga konektivitas.`,
      latencyMs,
      timestamp: nowStr,
    };
  }
  if (quality === 'poor') {
    return {
      id: Date.now(),
      quality: 'poor',
      title: 'Peringatan: Sinyal Buruk / Lemah',
      message:
        customMessage ||
        `Terdeteksi latensi jaringan tinggi (${latencyMs ? `${latencyMs}ms` : 'Lambat'}). Sistem terus melakukan ping otomatis tiap 5 detik untuk menjaga koneksi database.`,
      latencyMs,
      timestamp: nowStr,
    };
  }
  return {
    id: Date.now(),
    quality: 'offline',
    title: 'Peringatan: Sinyal Buruk / Koneksi Terputus',
    message:
      customMessage ||
      'Koneksi ke server database terputus atau perangkat offline. Sistem akan mencoba menyambung ulang otomatis setiap 5 detik.',
    latencyMs: null,
    timestamp: nowStr,
  };
}

function evaluateBrowserNetworkSlow(): boolean {
  if (typeof navigator === 'undefined') return false;
  const conn = (navigator as any).connection || (navigator as any).mozConnection || (navigator as any).webkitConnection;
  if (!conn) return false;
  if (conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g') return true;
  if (typeof conn.rtt === 'number' && conn.rtt > 650) return true;
  if (typeof conn.downlink === 'number' && conn.downlink > 0 && conn.downlink < 0.4) return true;
  return false;
}

/**
 * Perform a live ping / connection check to Google Cloud Firestore server.
 * Runs automatically every 5 seconds in the background (silent = true) to maintain connectivity.
 */
export async function runConnectionHealthCheck(options?: { silent?: boolean; forceNotification?: boolean }): Promise<HealthCheckState> {
  const silent = options?.silent ?? false;
  const forceNotification = options?.forceNotification ?? false;

  // Skip automatic silent ping if user is currently inspecting a simulated state
  if (silent && Date.now() < simulationPauseUntil) {
    return currentState;
  }
  if (!silent) {
    simulationPauseUntil = 0;
  }

  if (isPingingInProgress) {
    return currentState;
  }
  isPingingInProgress = true;

  const startTime = performance.now();
  const timeoutMs = 4500;
  const isOffline = typeof navigator !== 'undefined' ? !navigator.onLine : false;
  const prevQuality = currentState.signalQuality;
  const prevStatus = currentState.status;

  if (!silent) {
    currentState = {
      ...currentState,
      status: 'checking',
      isOffline,
    };
    notifyListeners();
  }

  try {
    // 1. Check if browser reports strictly offline
    if (isOffline) {
      const nextNotification =
        prevQuality !== 'offline' || forceNotification || !hasShownInitialNotification
          ? buildSignalNotification('offline', null, 'Perangkat kehilangan sinyal internet (Offline). Ping otomatis tiap 5 detik siaga menyambungkan ulang.')
          : currentState.lastNotification;
      hasShownInitialNotification = true;

      currentState = {
        ...currentState,
        status: 'error',
        signalQuality: 'offline',
        signalLabel: 'Sinyal Buruk (Offline)',
        latencyMs: null,
        testedAt: new Date().toLocaleTimeString('id-ID'),
        pingCount: currentState.pingCount + 1,
        lastPingHeartbeat: Date.now(),
        lastNotification: nextNotification,
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

    // 2. Check if Firebase initialization failed
    if (!isFirebaseReady || firebaseInitError || !db || (!(db as any).app && (db as any).type !== 'firestore')) {
      currentState = {
        ...currentState,
        status: 'error',
        signalQuality: 'offline',
        signalLabel: 'Sinyal Terputus',
        latencyMs: null,
        testedAt: new Date().toLocaleTimeString('id-ID'),
        pingCount: currentState.pingCount + 1,
        lastPingHeartbeat: Date.now(),
        errorMessage: 'Inisialisasi Firebase Database Gagal',
        errorCode: 'INIT_FAILED',
        errorDetails: firebaseInitError || 'Kredensial atau inisialisasi koneksi Cloud Firestore belum siap.',
        projectId: config.projectId || 'gen-lang-client-0997069506',
        databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
        isOffline: false,
      };
      notifyListeners();
      return currentState;
    }

    // 3. Direct server ping (bypasses local cache to verify real network + keep connection warm)
    const testDocRef = doc(db, '_connection_health', 'ping');

    let timerId: any;
    const timeoutPromise = new Promise<never>((_, reject) => {
      timerId = setTimeout(() => {
        const timeoutErr = new Error('Network Timeout: Respon database melebihi batas waktu (4500ms).');
        (timeoutErr as any).code = 'deadline-exceeded';
        reject(timeoutErr);
      }, timeoutMs);
    });

    await Promise.race([getDocFromServer(testDocRef), timeoutPromise]);
    if (timerId) clearTimeout(timerId);

    const latency = Math.max(1, Math.round(performance.now() - startTime));
    const isSlowConn = latency > GOOD_SIGNAL_THRESHOLD_MS || evaluateBrowserNetworkSlow();
    const nextQuality: SignalQuality = isSlowConn ? 'poor' : 'good';
    const nextLabel = nextQuality === 'good' ? 'Sinyal Baik' : 'Sinyal Buruk';

    let nextNotification = currentState.lastNotification;
    if (!hasShownInitialNotification || prevQuality !== nextQuality || prevStatus === 'error' || forceNotification) {
      nextNotification = buildSignalNotification(nextQuality, latency);
      hasShownInitialNotification = true;
    }

    currentState = {
      ...currentState,
      status: 'connected',
      signalQuality: nextQuality,
      signalLabel: nextLabel,
      latencyMs: latency,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      pingCount: currentState.pingCount + 1,
      lastPingHeartbeat: Date.now(),
      lastNotification: nextNotification,
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
      friendlyMsg = 'Klien Offline / Sinyal Buruk: Tidak dapat menghubungi server Firestore';
      code = 'CLIENT_OFFLINE';
    } else if (rawMsg.includes('API key not valid') || rawCode === 'auth/invalid-api-key') {
      friendlyMsg = 'API Key Invalid: Kredensial Firebase API Key tidak valid';
      code = 'API_KEY_INVALID';
    } else if (rawMsg.includes('permission-denied') || rawCode === 'permission-denied') {
      friendlyMsg = 'Permission Denied: Aturan keamanan Firestore menolak akses baca';
      code = 'PERMISSION_DENIED';
    } else if (rawMsg.includes('Network Timeout') || rawCode === 'deadline-exceeded') {
      friendlyMsg = 'Sinyal Buruk / Network Timeout: Respon server lambat (>4.5 detik)';
      code = 'NETWORK_TIMEOUT';
    } else if (rawMsg.includes('Quota exceeded')) {
      friendlyMsg = 'Quota Exceeded: Batas kuota gratis Firebase harian tercapai';
      code = 'RESOURCE_EXHAUSTED';
    }

    // If it was a timeout, treat as poor/offline signal and notify
    const isTimeout = code === 'NETWORK_TIMEOUT' || code === 'CLIENT_OFFLINE';
    const nextQuality: SignalQuality = isTimeout ? 'poor' : 'offline';
    const nextNotification =
      prevQuality !== nextQuality || prevStatus !== 'error' || forceNotification || !hasShownInitialNotification
        ? buildSignalNotification(nextQuality, null, friendlyMsg)
        : currentState.lastNotification;
    hasShownInitialNotification = true;

    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: nextQuality,
      signalLabel: 'Sinyal Buruk',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      pingCount: currentState.pingCount + 1,
      lastPingHeartbeat: Date.now(),
      lastNotification: nextNotification,
      errorMessage: friendlyMsg,
      errorCode: code,
      errorDetails: rawMsg,
      projectId: config.projectId || 'gen-lang-client-0997069506',
      databaseId: config.firestoreDatabaseId || 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      isOffline: typeof navigator !== 'undefined' ? !navigator.onLine : false,
    };
    notifyListeners();
    return currentState;
  } finally {
    isPingingInProgress = false;
  }
}

/**
 * Dismiss the current signal notification banner
 */
export function dismissSignalNotification() {
  currentState = {
    ...currentState,
    lastNotification: null,
  };
  notifyListeners();
}

/**
 * Simulate Good Signal or Poor Signal to preview Header notifications
 */
export function simulateSignalQuality(quality: 'good' | 'poor') {
  simulationPauseUntil = Date.now() + 15000; // Pause background overwrite for 15s
  const simulatedLatency = quality === 'good' ? Math.floor(45 + Math.random() * 60) : Math.floor(850 + Math.random() * 600);
  const notification = buildSignalNotification(quality, simulatedLatency);

  currentState = {
    ...currentState,
    status: 'connected',
    signalQuality: quality,
    signalLabel: quality === 'good' ? 'Sinyal Baik' : 'Sinyal Buruk',
    latencyMs: simulatedLatency,
    testedAt: new Date().toLocaleTimeString('id-ID'),
    pingCount: currentState.pingCount + 1,
    lastPingHeartbeat: Date.now(),
    lastNotification: notification,
    errorMessage: null,
    errorCode: null,
    errorDetails: null,
    isOffline: false,
  };
  notifyListeners();
}

/**
 * Useful for development verification or interactive debugging
 */
export function simulateHealthCheckState(type: 'apiKey' | 'permission' | 'timeout' | 'offline') {
  simulationPauseUntil = Date.now() + 15000;
  if (type === 'apiKey') {
    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: 'offline',
      signalLabel: 'Sinyal Terputus',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      lastNotification: buildSignalNotification('offline', null, 'API Key Invalid: Kredensial Firebase API Key tidak valid.'),
      errorMessage: 'API Key Invalid: Kredensial Firebase API Key tidak valid atau telah kedaluwarsa',
      errorCode: 'API_KEY_INVALID',
      errorDetails: 'FirebaseError: [auth/invalid-api-key] Your API key is invalid, please check you have copied it correctly.',
      isOffline: false,
    };
  } else if (type === 'permission') {
    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: 'offline',
      signalLabel: 'Sinyal Terputus',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      lastNotification: buildSignalNotification('offline', null, 'Permission Denied: Aturan keamanan Firestore menolak akses baca.'),
      errorMessage: 'Permission Denied: Aturan keamanan Firestore menolak akses baca dokumen',
      errorCode: 'PERMISSION_DENIED',
      errorDetails: 'FirebaseError: Missing or insufficient permissions. Verify firestore.rules for collection read access.',
      isOffline: false,
    };
  } else if (type === 'timeout') {
    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: 'poor',
      signalLabel: 'Sinyal Buruk',
      latencyMs: 4800,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      lastNotification: buildSignalNotification('poor', 4800, 'Sinyal Buruk: Respon jaringan sangat lambat / Network Timeout.'),
      errorMessage: 'Network Timeout: Batas waktu koneksi Firestore terlampaui',
      errorCode: 'NETWORK_TIMEOUT',
      errorDetails: 'DeadlineExceededError: No response received from server within timeout window.',
      isOffline: false,
    };
  } else if (type === 'offline') {
    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: 'offline',
      signalLabel: 'Sinyal Buruk (Offline)',
      latencyMs: null,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      lastNotification: buildSignalNotification('offline', null, 'Sinyal Buruk / Terputus: Perangkat tidak terhubung ke internet.'),
      errorMessage: 'Perangkat Offline (Tidak ada jaringan internet)',
      errorCode: 'NETWORK_OFFLINE',
      errorDetails: 'Browser mendeteksi kehilangan koneksi jaringan seluler/Wi-Fi.',
      isOffline: true,
    };
  }
  notifyListeners();
}

// Auto-run on module import, bind window online/offline listeners, and start 5-second background auto-ping
if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    simulationPauseUntil = 0;
    runConnectionHealthCheck({ silent: false, forceNotification: true });
  });

  window.addEventListener('offline', () => {
    currentState = {
      ...currentState,
      status: 'error',
      signalQuality: 'offline',
      signalLabel: 'Sinyal Buruk (Offline)',
      latencyMs: null,
      errorMessage: 'Perangkat Offline (Tidak ada jaringan internet)',
      errorCode: 'NETWORK_OFFLINE',
      errorDetails: 'Browser mendeteksi kehilangan koneksi jaringan.',
      isOffline: true,
      testedAt: new Date().toLocaleTimeString('id-ID'),
      lastNotification: buildSignalNotification(
        'offline',
        null,
        'Peringatan Sinyal Buruk: Jaringan internet perangkat terputus. Ping otomatis tiap 5 detik akan menyambungkan kembali saat sinyal pulih.'
      ),
    };
    notifyListeners();
  });

  // Run initial test immediately
  setTimeout(() => {
    runConnectionHealthCheck({ silent: false });
  }, 100);

  // Background Auto-Ping every 5 seconds (5000ms) to maintain Firestore connectivity & monitor signal quality
  setInterval(() => {
    runConnectionHealthCheck({ silent: true });
  }, AUTO_PING_INTERVAL_MS);
}
