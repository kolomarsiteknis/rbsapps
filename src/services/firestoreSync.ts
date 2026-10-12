import { 
  db, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  getDocs, 
  cleanForFirestore,
  writeBatch,
  enableNetwork,
  disableNetwork,
  isFirebaseReady,
  auth,
  getDocFromServer
} from './firebase';
import { 
  initialDailyReports, 
  initialEquipments, 
  initialWorkers, 
  initialBlocks, 
  initialInventory, 
  initialClients, 
  initialProjects,
  initialLogisticsTransactions,
  initialP2HChecklists,
  initialFuelBowserReceipts,
  initialSoilIncidents,
  initialJobTitles,
  initialManagedUsers,
  initialCompanyStaff,
  initialWorkAssignments,
  initialDailyTargets,
  initialCompanyProfile,
  defaultCleanSuperAdminUser,
  DEFAULT_SECRET_DEV_ACCOUNTS
} from '../data/mockData';

export const FIRESTORE_COLLECTIONS = {
  REPORTS: 'dailyReports',
  EQUIPMENTS: 'equipments',
  WORKERS: 'workers',
  BLOCKS: 'blocks',
  CLIENTS: 'clients',
  PROJECTS: 'projects',
  INVENTORY: 'inventory',
  LOGISTICS: 'logisticsTransactions',
  P2H: 'p2hChecklists',
  BOWSER: 'fuelBowserReceipts',
  SOIL: 'soilIncidents',
  GEOTAG: 'geotagPhotos',
  USERS: 'managedUsers',
  JOB_TITLES: 'jobTitles',
  ACTIVITIES: 'userActivities',
  COMPANY_PROFILE: 'companyProfile',
  COMPANY_STAFF: 'companyStaff',
  WORK_ASSIGNMENTS: 'workAssignments',
  DAILY_TARGETS: 'dailyTargets',
} as const;

export const LOCAL_STORAGE_KEYS = {
  REPORTS: 'suryaland_reports_v1',
  EQUIPMENTS: 'suryaland_equipments_v1',
  WORKERS: 'suryaland_workers_v1',
  BLOCKS: 'suryaland_blocks_v1',
  INVENTORY: 'suryaland_inventory_v1',
  CLIENTS: 'suryaland_clients_v1',
  PROJECTS: 'suryaland_projects_v1',
  LOGISTICS: 'suryaland_logistics_transactions_v1',
  P2H: 'suryaland_p2h_checklists_v1',
  BOWSER: 'suryaland_fuel_bowser_v1',
  SOIL: 'suryaland_soil_incidents_v1',
  GEOTAG: 'suryaland_geotag_photos_v1',
  USERS: 'suryaland_managed_users_v1',
  JOB_TITLES: 'suryaland_job_titles_v1',
  ACTIVITIES: 'suryaland_user_activities_v1',
  COMPANY_PROFILE: 'suryaland_company_profile_v1',
  COMPANY_STAFF: 'suryaland_company_staff_v1',
  WORK_ASSIGNMENTS: 'suryaland_work_assignments_v1',
  DAILY_TARGETS: 'suryaland_daily_targets_v1',
} as const;

export const CLEAN_INSTALL_FLAG_KEY = 'suryaland_clean_install_mode_v1';
export const LAST_SYNC_TIME_KEY = 'suryaland_last_firestore_sync_time_v1';

const cleanInstallModeActive = typeof window !== 'undefined' && localStorage.getItem(CLEAN_INSTALL_FLAG_KEY) === 'true';

// Live in-memory store representing real-time Firebase Cloud Firestore collections
const firestoreMemoryStore: Record<string, any[]> = {
  [FIRESTORE_COLLECTIONS.REPORTS]: cleanInstallModeActive ? [] : [...initialDailyReports],
  [FIRESTORE_COLLECTIONS.EQUIPMENTS]: cleanInstallModeActive ? [] : [...initialEquipments],
  [FIRESTORE_COLLECTIONS.WORKERS]: cleanInstallModeActive ? [] : [...initialWorkers],
  [FIRESTORE_COLLECTIONS.BLOCKS]: cleanInstallModeActive ? [] : [...initialBlocks],
  [FIRESTORE_COLLECTIONS.CLIENTS]: cleanInstallModeActive ? [] : [...initialClients],
  [FIRESTORE_COLLECTIONS.PROJECTS]: cleanInstallModeActive ? [] : [...initialProjects],
  [FIRESTORE_COLLECTIONS.INVENTORY]: cleanInstallModeActive ? [] : [...initialInventory],
  [FIRESTORE_COLLECTIONS.LOGISTICS]: cleanInstallModeActive ? [] : [...initialLogisticsTransactions],
  [FIRESTORE_COLLECTIONS.P2H]: cleanInstallModeActive ? [] : [...initialP2HChecklists],
  [FIRESTORE_COLLECTIONS.BOWSER]: cleanInstallModeActive ? [] : [...initialFuelBowserReceipts],
  [FIRESTORE_COLLECTIONS.SOIL]: cleanInstallModeActive ? [] : [...initialSoilIncidents],
  [FIRESTORE_COLLECTIONS.GEOTAG]: [],
  [FIRESTORE_COLLECTIONS.USERS]: cleanInstallModeActive ? [...DEFAULT_SECRET_DEV_ACCOUNTS] : [...initialManagedUsers],
  [FIRESTORE_COLLECTIONS.JOB_TITLES]: initialJobTitles.map((t, idx) => ({ id: `job-${idx + 1}`, title: t })),
  [FIRESTORE_COLLECTIONS.ACTIVITIES]: [],
  [FIRESTORE_COLLECTIONS.COMPANY_STAFF]: cleanInstallModeActive ? [] : [...initialCompanyStaff],
  [FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS]: [],
  [FIRESTORE_COLLECTIONS.DAILY_TARGETS]: [],
};
let firestoreCompanyProfile: any = null;
const loadedCollections = new Set<string>();

export function getLiveCollection<T>(colName: string): T[] {
  return (firestoreMemoryStore[colName] || []) as T[];
}

export function setLiveCollection<T>(colName: string, items: T[]): void {
  firestoreMemoryStore[colName] = items;
  loadedCollections.add(colName);
}

export function getLiveCompanyProfile(): any {
  return firestoreCompanyProfile;
}

export function setLiveCompanyProfile(profile: any): void {
  firestoreCompanyProfile = profile;
}

export function isCollectionLoaded(colName: string): boolean {
  return loadedCollections.has(colName);
}

export function recordLastSuccessfulSync() {
  if (typeof window === 'undefined') return;
  const nowStr = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  try {
    localStorage.setItem(LAST_SYNC_TIME_KEY, nowStr);
    window.dispatchEvent(new CustomEvent('suryaland_last_sync_update', { detail: { timeStr: nowStr } }));
  } catch {}
}

export function getLastSuccessfulSyncTime(): string {
  if (typeof window === 'undefined') return '-';
  return localStorage.getItem(LAST_SYNC_TIME_KEY) || '-';
}

export type SyncStatus = 'connected' | 'offline' | 'syncing';

let currentStatus: SyncStatus = typeof navigator !== 'undefined' && navigator.onLine ? 'connected' : 'offline';
const statusListeners = new Set<(status: SyncStatus) => void>();

export function setSyncStatus(status: SyncStatus) {
  currentStatus = status;
  statusListeners.forEach((fn) => fn(status));
}

export function getSyncStatus(): SyncStatus {
  return currentStatus;
}

export function onSyncStatusChange(callback: (status: SyncStatus) => void): () => void {
  statusListeners.add(callback);
  callback(currentStatus);
  return () => {
    statusListeners.delete(callback);
  };
}

let isNetworkDisabled = false;

export async function toggleFirestoreNetwork(goOnline: boolean): Promise<void> {
  if (!isFirebaseReady || !db) return;
  try {
    if (goOnline) {
      if (isNetworkDisabled) {
        await enableNetwork(db);
        isNetworkDisabled = false;
      }
      setSyncStatus('connected');
    } else {
      if (!isNetworkDisabled) {
        await disableNetwork(db);
        isNetworkDisabled = true;
      }
      setSyncStatus('offline');
    }
  } catch (err) {
    console.warn('[Firestore] Network toggle notice:', err);
    setSyncStatus(goOnline ? 'connected' : 'offline');
  }
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth?.currentUser?.uid,
      email: auth?.currentUser?.email,
      emailVerified: auth?.currentUser?.emailVerified,
      isAnonymous: auth?.currentUser?.isAnonymous,
      tenantId: auth?.currentUser?.tenantId,
      providerInfo: auth?.currentUser?.providerData?.map((provider) => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Actively ensure connection to Firestore is live & responsive
export async function ensureFirestoreConnected(): Promise<boolean> {
  if (!isFirebaseReady || !db) return false;
  try {
    await enableNetwork(db);
    const testDoc = doc(db, '_connection_health', 'ping');
    await getDocFromServer(testDoc);
    setSyncStatus('connected');
    return true;
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.GET, '_connection_health/ping');
    }
    return false;
  }
}

// Track if initial sync setup has run
let isInitialized = false;

// Write or update a document directly in Firebase Firestore
export async function syncDocWrite<T extends { id: string }>(
  collectionName: string, 
  item: T
): Promise<void> {
  if (!item || !item.id || !isFirebaseReady || !db) return;
  try {
    const cleaned = cleanForFirestore(item);
    const docRef = doc(db, collectionName, String(item.id));
    await setDoc(docRef, cleaned, { merge: true });

    // Update live memory store immediately
    const currentList = firestoreMemoryStore[collectionName] || [];
    const idx = currentList.findIndex((i: any) => i && i.id === item.id);
    if (idx >= 0) {
      currentList[idx] = { ...currentList[idx], ...cleaned };
    } else {
      currentList.unshift(cleaned);
    }
    firestoreMemoryStore[collectionName] = currentList;
    loadedCollections.add(collectionName);

    recordLastSuccessfulSync();
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
    }
    console.warn(`[Firestore Database Write Warning] ${collectionName}/${item.id}:`, err);
  }
}

// Delete a document directly from Firebase Firestore
export async function syncDocDelete(
  collectionName: string, 
  id: string
): Promise<void> {
  if (!id || !isFirebaseReady || !db) return;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);

    // Update live memory store immediately
    const currentList = firestoreMemoryStore[collectionName] || [];
    firestoreMemoryStore[collectionName] = currentList.filter((i: any) => i && i.id !== id);
    loadedCollections.add(collectionName);

    recordLastSuccessfulSync();
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
    console.warn(`[Firestore Database Delete Warning] ${collectionName}/${id}:`, err);
  }
}

// Seed initial mock data if Firestore is empty
async function seedCollectionIfEmpty(
  collectionName: string, 
  initialItems: Array<{ id: string }>
) {
  if (!isFirebaseReady || !db) return;
  try {
    const colRef = collection(db, collectionName);
    const snap = await getDocs(colRef);
    if (snap.empty && initialItems.length > 0) {
      console.log(`[Firestore Seeding] Seeding ${initialItems.length} initial items to ${collectionName}...`);
      const batch = writeBatch(db);
      for (const item of initialItems) {
        if (!item.id) continue;
        const cleaned = cleanForFirestore(item);
        const docRef = doc(db, collectionName, String(item.id));
        batch.set(docRef, cleaned, { merge: true });
      }
      await batch.commit();
      console.log(`[Firestore Seeding] Successfully seeded ${collectionName}.`);
    }
  } catch (err) {
    console.warn(`[Firestore Seeding] Skip seeding for ${collectionName}:`, err);
  }
}

function getDeletedIdsFromStorage(key: string): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function isObsoleteHendraRecord(item: any): boolean {
  if (!item) return false;
  const nameLower = String(item.fullName || item.name || '').trim().toLowerCase();
  const emailLower = String(item.email || '').trim().toLowerCase();
  return nameLower.includes('hendra wijaya') || emailLower.includes('hendra.wijaya');
}

// Normalization and Deduplication Engine to prevent duplicate content/database
function normalizeKey(str?: string): string {
  return String(str || '')
    .trim()
    .replace(/^@+/, '')
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export interface DeduplicationResult<T> {
  cleanList: T[];
  removedDocIds: string[];
}

export function deduplicateStaffList(list: any[]): DeduplicationResult<any> {
  const cleanList: any[] = [];
  const removedDocIds: string[] = [];
  const deletedStaffIds = getDeletedIdsFromStorage('suryaland_deleted_staff_ids_v1');

  // Multi-index tracking
  const userMap = new Map<string, number>();
  const empIdMap = new Map<string, number>();
  const nameMap = new Map<string, number>();
  const idMap = new Map<string, number>();

  list.forEach((item) => {
    if (!item) return;
    if (isObsoleteHendraRecord(item)) {
      if (item.id) removedDocIds.push(item.id);
      return;
    }
    if (item.id && deletedStaffIds.includes(item.id)) {
      removedDocIds.push(item.id);
      return;
    }

    const normU = normalizeKey(item.username);
    const normEmp = normalizeKey(item.employeeIdNumber);
    const normName = normalizeKey(item.fullName || item.name);
    const normId = String(item.id || '').trim();

    // Check if item already exists strictly by id or exact username
    let targetIdx = -1;
    if (normId && idMap.has(normId)) {
      targetIdx = idMap.get(normId)!;
    } else if (normU && userMap.has(normU)) {
      targetIdx = userMap.get(normU)!;
    }

    if (targetIdx >= 0) {
      // Merge with existing record (preferring record with password, signature, newer updatedAt)
      const existing = cleanList[targetIdx];
      if (item.id && item.id !== existing.id) {
        removedDocIds.push(item.id);
      }
      cleanList[targetIdx] = {
        ...existing,
        ...item,
        id: existing.id || item.id,
        fullName: existing.fullName || item.fullName || item.name,
        username: existing.username || item.username,
        password: existing.password || item.password,
        signatureUrl: existing.signatureUrl || item.signatureUrl,
        employeeIdNumber: existing.employeeIdNumber || item.employeeIdNumber,
        status: 'Aktif', // Guarantee active user
        updatedAt: new Date().toISOString(),
      };
    } else {
      const idx = cleanList.length;
      const cleanItem = {
        ...item,
        status: item.status || 'Aktif',
      };
      cleanList.push(cleanItem);
      if (normId) idMap.set(normId, idx);
      if (normU) userMap.set(normU, idx);
      if (normEmp) empIdMap.set(normEmp, idx);
      if (normName) nameMap.set(normName, idx);
    }
  });

  return { cleanList, removedDocIds };
}

export function deduplicateUsersList(list: any[]): DeduplicationResult<any> {
  const cleanList: any[] = [];
  const removedDocIds: string[] = [];
  const deletedUserIds = getDeletedIdsFromStorage('suryaland_deleted_user_ids_v1');

  const userMap = new Map<string, number>();
  const empIdMap = new Map<string, number>();
  const nameMap = new Map<string, number>();
  const idMap = new Map<string, number>();

  list.forEach((item) => {
    if (!item) return;
    if (isObsoleteHendraRecord(item)) {
      if (item.id) removedDocIds.push(item.id);
      return;
    }
    if (item.id && deletedUserIds.includes(item.id)) {
      removedDocIds.push(item.id);
      return;
    }

    const normU = normalizeKey(item.username);
    const normEmp = normalizeKey(item.employeeIdNumber);
    const normName = normalizeKey(item.fullName || item.displayName);
    const normId = String(item.id || '').trim();

    let targetIdx = -1;
    if (normId && idMap.has(normId)) {
      targetIdx = idMap.get(normId)!;
    } else if (normU && userMap.has(normU)) {
      targetIdx = userMap.get(normU)!;
    }

    if (targetIdx >= 0) {
      const existing = cleanList[targetIdx];
      if (item.id && item.id !== existing.id) {
        removedDocIds.push(item.id);
      }
      cleanList[targetIdx] = {
        ...existing,
        ...item,
        id: existing.id || item.id,
        fullName: existing.fullName || item.fullName,
        username: existing.username || item.username,
        password: existing.password || item.password,
        signatureUrl: existing.signatureUrl || item.signatureUrl,
        employeeIdNumber: existing.employeeIdNumber || item.employeeIdNumber,
        status: 'Aktif', // Guarantee active user
        updatedAt: new Date().toISOString(),
      };
    } else {
      const idx = cleanList.length;
      const cleanItem = {
        ...item,
        status: item.status || 'Aktif',
      };
      cleanList.push(cleanItem);
      if (normId) idMap.set(normId, idx);
      if (normU) userMap.set(normU, idx);
      if (normEmp) empIdMap.set(normEmp, idx);
      if (normName) nameMap.set(normName, idx);
    }
  });

  return { cleanList, removedDocIds };
}

export function deduplicateCollectionItems(collectionName: string, items: any[]): DeduplicationResult<any> {
  if (collectionName === FIRESTORE_COLLECTIONS.COMPANY_STAFF) {
    return deduplicateStaffList(items);
  }
  if (collectionName === FIRESTORE_COLLECTIONS.USERS) {
    return deduplicateUsersList(items);
  }

  const cleanList: any[] = [];
  const removedDocIds: string[] = [];
  const keyMap = new Map<string, number>();

  const getDeduplicationKey = (item: any): string => {
    if (!item) return '';
    const normId = String(item.id || '').trim();

    switch (collectionName) {
      case FIRESTORE_COLLECTIONS.CLIENTS:
        return (
          normalizeKey(item.contractNumber) ||
          normalizeKey(item.name) ||
          normId
        );
      case FIRESTORE_COLLECTIONS.BLOCKS:
        return `${String(item.clientId || '').trim()}__${normalizeKey(item.code)}`;
      case FIRESTORE_COLLECTIONS.EQUIPMENTS:
        return normalizeKey(item.code) || normId;
      case FIRESTORE_COLLECTIONS.WORKERS:
        return `${normalizeKey(item.name)}__${normalizeKey(item.category)}`;
      case FIRESTORE_COLLECTIONS.DAILY_TARGETS:
        return `${String(item.blockId || '').trim()}__${String(item.date || '').trim()}__${normalizeKey(item.shift)}`;
      case FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS:
        return (
          normalizeKey(item.assignmentNumber) ||
          `${String(item.clientId || '').trim()}__${String(item.assignedDate || '').trim()}` ||
          normId
        );
      case FIRESTORE_COLLECTIONS.REPORTS:
        return (
          normalizeKey(item.reportNumber) ||
          `${String(item.clientId || '').trim()}__${String(item.blockId || '').trim()}__${String(item.date || '').trim()}__${normalizeKey(item.shift)}` ||
          normId
        );
      case FIRESTORE_COLLECTIONS.INVENTORY:
        return (
          normalizeKey(item.itemCode) ||
          `${normalizeKey(item.category)}__${normalizeKey(item.name)}` ||
          normId
        );
      case FIRESTORE_COLLECTIONS.P2H:
        return `${String(item.equipmentId || '').trim()}__${String(item.date || '').trim()}__${normalizeKey(item.shift)}`;
      case FIRESTORE_COLLECTIONS.BOWSER:
        return (
          normalizeKey(item.receiptNumber) ||
          `${String(item.date || '').trim()}__${String(item.equipmentId || '').trim()}__${String(item.time || '').trim()}` ||
          normId
        );
      case FIRESTORE_COLLECTIONS.SOIL:
        return `${String(item.date || '').trim()}__${String(item.clientId || '').trim()}__${normalizeKey(item.blockCode)}__${String(item.affectedEquipmentId || '').trim()}`;
      default:
        return normId;
    }
  };

  items.forEach((item) => {
    if (!item) return;
    const key = getDeduplicationKey(item);
    if (!key) {
      if (item.id) cleanList.push(item);
      return;
    }

    if (keyMap.has(key)) {
      const existingIdx = keyMap.get(key)!;
      const existing = cleanList[existingIdx];
      if (item.id && item.id !== existing.id) {
        removedDocIds.push(item.id);
      }
      // Merge newer details
      cleanList[existingIdx] = {
        ...existing,
        ...item,
        id: existing.id || item.id,
      };
    } else {
      keyMap.set(key, cleanList.length);
      cleanList.push(item);
    }
  });

  return { cleanList, removedDocIds };
}

// Purge all cloud duplicates across all Firestore collections
export async function purgeAllCloudDuplicates(): Promise<{ purgedCount: number; details: Record<string, number> }> {
  if (!isFirebaseReady || !db) {
    return { purgedCount: 0, details: {} };
  }

  let totalPurged = 0;
  const details: Record<string, number> = {};

  const collectionsToCheck = [
    FIRESTORE_COLLECTIONS.COMPANY_STAFF,
    FIRESTORE_COLLECTIONS.USERS,
    FIRESTORE_COLLECTIONS.CLIENTS,
    FIRESTORE_COLLECTIONS.BLOCKS,
    FIRESTORE_COLLECTIONS.EQUIPMENTS,
    FIRESTORE_COLLECTIONS.WORKERS,
    FIRESTORE_COLLECTIONS.DAILY_TARGETS,
    FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS,
    FIRESTORE_COLLECTIONS.REPORTS,
    FIRESTORE_COLLECTIONS.INVENTORY,
    FIRESTORE_COLLECTIONS.P2H,
    FIRESTORE_COLLECTIONS.BOWSER,
    FIRESTORE_COLLECTIONS.SOIL,
  ];

  for (const colName of collectionsToCheck) {
    try {
      const colRef = collection(db, colName);
      const snap = await getDocs(colRef);
      if (snap.empty) continue;

      const items: any[] = [];
      snap.forEach((d) => {
        items.push({ ...d.data(), id: d.id });
      });

      const { removedDocIds } = deduplicateCollectionItems(colName, items);
      if (removedDocIds.length > 0) {
        const batch = writeBatch(db);
        removedDocIds.forEach((docId) => {
          const docRef = doc(db, colName, docId);
          batch.delete(docRef);
        });
        await batch.commit();
        totalPurged += removedDocIds.length;
        details[colName] = removedDocIds.length;
        console.log(`[Firestore Deduplication] Cleaned ${removedDocIds.length} duplicate docs from ${colName}.`);
      }
    } catch (err) {
      console.warn(`[Firestore Deduplication] Notice cleaning duplicates from ${colName}:`, err);
    }
  }

  return { purgedCount: totalPurged, details };
}

export function isCleanInstallMode(): boolean {
  if (typeof window === 'undefined') return false;
  return localStorage.getItem(CLEAN_INSTALL_FLAG_KEY) === 'true';
}

// Reset all data across all user access pages to fresh clean install state
export async function resetAllDataToCleanDefault(): Promise<{ success: boolean; clearedCount: number }> {
  let clearedCount = 0;

  // 1. Mark clean install mode flag in local storage
  if (typeof window !== 'undefined') {
    localStorage.setItem(CLEAN_INSTALL_FLAG_KEY, 'true');
  }

  // 2. Wipe all collections in Firestore
  if (isFirebaseReady && db) {
    const collectionsToClear = [
      FIRESTORE_COLLECTIONS.REPORTS,
      FIRESTORE_COLLECTIONS.EQUIPMENTS,
      FIRESTORE_COLLECTIONS.WORKERS,
      FIRESTORE_COLLECTIONS.BLOCKS,
      FIRESTORE_COLLECTIONS.CLIENTS,
      FIRESTORE_COLLECTIONS.PROJECTS,
      FIRESTORE_COLLECTIONS.INVENTORY,
      FIRESTORE_COLLECTIONS.LOGISTICS,
      FIRESTORE_COLLECTIONS.P2H,
      FIRESTORE_COLLECTIONS.BOWSER,
      FIRESTORE_COLLECTIONS.SOIL,
      FIRESTORE_COLLECTIONS.GEOTAG,
      FIRESTORE_COLLECTIONS.COMPANY_STAFF,
      FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS,
      FIRESTORE_COLLECTIONS.DAILY_TARGETS,
      FIRESTORE_COLLECTIONS.ACTIVITIES,
    ];

    for (const colName of collectionsToClear) {
      try {
        const colRef = collection(db, colName);
        const snap = await getDocs(colRef);
        if (!snap.empty) {
          const batch = writeBatch(db);
          snap.docs.forEach((d) => {
            batch.delete(d.ref);
            clearedCount++;
          });
          await batch.commit();
        }
      } catch (err) {
        console.warn(`[Reset Clean Install] Notice clearing Firestore ${colName}:`, err);
      }
    }

    // Set default secret developer accounts (superadmin, manager, pengawas, klienpt) in USERS collection
    try {
      const usersColRef = collection(db, FIRESTORE_COLLECTIONS.USERS);
      const userSnap = await getDocs(usersColRef);
      if (!userSnap.empty) {
        const batch = writeBatch(db);
        userSnap.docs.forEach((d) => batch.delete(d.ref));
        await batch.commit();
      }
      for (const acc of DEFAULT_SECRET_DEV_ACCOUNTS) {
        await setDoc(doc(db, FIRESTORE_COLLECTIONS.USERS, acc.id), cleanForFirestore(acc));
      }
    } catch (err) {
      console.warn('[Reset Clean Install] Notice saving default secret dev accounts to Firestore:', err);
    }
  }

  // 3. Clear in-memory live store
  Object.keys(firestoreMemoryStore).forEach((key) => {
    firestoreMemoryStore[key] = [];
  });
  firestoreMemoryStore[FIRESTORE_COLLECTIONS.USERS] = [...DEFAULT_SECRET_DEV_ACCOUNTS];

  // 4. Clear all local storage keys
  if (typeof window !== 'undefined') {
    Object.values(LOCAL_STORAGE_KEYS).forEach((k) => {
      localStorage.removeItem(k);
    });
    localStorage.setItem(LOCAL_STORAGE_KEYS.USERS, JSON.stringify(DEFAULT_SECRET_DEV_ACCOUNTS));
    localStorage.setItem('suryaland_deleted_staff_ids_v1', JSON.stringify([]));
    localStorage.setItem('suryaland_deleted_user_ids_v1', JSON.stringify([]));
    localStorage.removeItem('suryaland_active_report_draft');

    // Dispatch global refresh events
    window.dispatchEvent(new CustomEvent('suryaland_reports_sync', { detail: { reports: [] } }));
    window.dispatchEvent(new CustomEvent('suryaland_clients_sync'));
    window.dispatchEvent(new CustomEvent('suryaland_master_sync', { detail: { reset: true } }));
    window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
    window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_clean_reset' } }));
  }

  return { success: true, clearedCount };
}

// Initialize Firestore listeners & initial seeding
export function initFirestoreSync() {
  if (isInitialized || !isFirebaseReady || !db) return;
  isInitialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      toggleFirestoreNetwork(true);
      setSyncStatus('connected');
    });
    window.addEventListener('offline', () => setSyncStatus('offline'));
    window.addEventListener('focus', () => {
      toggleFirestoreNetwork(true);
    });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        toggleFirestoreNetwork(true);
      }
    });
  }

  // Setup initial seeding & one-time cleanup in the background
  const runInitialSeed = async () => {
    try {
      if (isCleanInstallMode()) {
        // Clean install mode is active: do not auto-seed demo mock data
        return;
      }
      // Actively purge obsolete "Ir. Hendra Wijaya, M.Si" records from Firestore companyStaff & managedUsers
      for (const colName of [FIRESTORE_COLLECTIONS.COMPANY_STAFF, FIRESTORE_COLLECTIONS.USERS]) {
        try {
          const colRef = collection(db, colName);
          const snap = await getDocs(colRef);
          if (!snap.empty) {
            for (const docSnap of snap.docs) {
              const data = docSnap.data();
              if (isObsoleteHendraRecord(data)) {
                await deleteDoc(docSnap.ref);
              }
            }
          }
        } catch (err) {
          console.warn(`[Firestore Cleanup] Notice cleaning ${colName}:`, err);
        }
      }

      const deletedUserIds = getDeletedIdsFromStorage('suryaland_deleted_user_ids_v1');
      const deletedStaffIds = getDeletedIdsFromStorage('suryaland_deleted_staff_ids_v1');

      // Seed all primary master collections if Firestore is empty
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.CLIENTS, initialClients);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.BLOCKS, initialBlocks);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.EQUIPMENTS, initialEquipments);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.WORKERS, initialWorkers);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.PROJECTS, initialProjects);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, initialWorkAssignments);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.DAILY_TARGETS, initialDailyTargets);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.REPORTS, initialDailyReports);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.INVENTORY, initialInventory);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.P2H, initialP2HChecklists);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.BOWSER, initialFuelBowserReceipts);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.SOIL, initialSoilIncidents);
      await seedCollectionIfEmpty(
        FIRESTORE_COLLECTIONS.USERS,
        initialManagedUsers.filter((u) => !deletedUserIds.includes(u.id) && !isObsoleteHendraRecord(u))
      );
      await seedCollectionIfEmpty(
        FIRESTORE_COLLECTIONS.COMPANY_STAFF,
        initialCompanyStaff.filter((s) => !deletedStaffIds.includes(s.id) && !isObsoleteHendraRecord(s))
      );

      // Seed company profile single document if missing
      try {
        const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.COMPANY_PROFILE, 'main_profile');
        const profileSnap = await getDocFromServer(profileDocRef);
        if (!profileSnap.exists()) {
          await setDoc(profileDocRef, cleanForFirestore({ ...initialCompanyProfile, id: 'main_profile' }));
        }
      } catch {}

      // Push any locally saved active staff & users to Firestore so cloud is always up to date
      if (typeof window !== 'undefined') {
        try {
          const localStaffRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_STAFF);
          if (localStaffRaw) {
            const localStaffList = JSON.parse(localStaffRaw);
            if (Array.isArray(localStaffList)) {
              for (const st of localStaffList) {
                if (st && st.id && !isObsoleteHendraRecord(st) && !deletedStaffIds.includes(st.id)) {
                  const safeItem =
                    st.signatureUrl && st.signatureUrl.length > 700000
                      ? { ...st, signatureUrl: undefined }
                      : st;
                  await syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_STAFF, safeItem);
                }
              }
            }
          }
          const localUsersRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
          if (localUsersRaw) {
            const localUsersList = JSON.parse(localUsersRaw);
            if (Array.isArray(localUsersList)) {
              for (const usr of localUsersList) {
                if (usr && usr.id && !isObsoleteHendraRecord(usr) && !deletedUserIds.includes(usr.id)) {
                  const safeUsr =
                    usr.signatureUrl && usr.signatureUrl.length > 150000
                      ? { ...usr, signatureUrl: undefined }
                      : usr;
                  await syncDocWrite(FIRESTORE_COLLECTIONS.USERS, safeUsr);
                }
              }
            }
          }
        } catch (syncErr) {
          console.warn('[Firestore] Local staff/users push notice:', syncErr);
        }
      }
      
      // Seed job titles
      const jobTitlesItems = initialJobTitles.map((t, idx) => ({ id: `job-${idx + 1}`, title: t }));
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.JOB_TITLES, jobTitlesItems);
    } catch (e) {
      console.warn('[Firestore] Initial seeding background notice:', e);
    }
  };
  runInitialSeed();

  // Helper to attach real-time listener to a collection with automatic deduplication
  const attachSync = <T extends { id: string }>(
    colName: string, 
    storageKey: string,
    transformList?: (docs: T[]) => T[]
  ) => {
    try {
      const colRef = collection(db, colName);
      onSnapshot(colRef, (snapshot) => {
        if (snapshot.empty) {
          firestoreMemoryStore[colName] = [];
          loadedCollections.add(colName);
          try {
            localStorage.setItem(storageKey, JSON.stringify([]));
          } catch {}
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('suryaland_firestore_sync', { 
                detail: { collection: colName, count: 0 } 
              })
            );
            if (colName === FIRESTORE_COLLECTIONS.REPORTS) {
              window.dispatchEvent(new CustomEvent('suryaland_reports_sync', { detail: { reports: [] } }));
            } else if (
              colName === FIRESTORE_COLLECTIONS.EQUIPMENTS ||
              colName === FIRESTORE_COLLECTIONS.CLIENTS ||
              colName === FIRESTORE_COLLECTIONS.BLOCKS ||
              colName === FIRESTORE_COLLECTIONS.DAILY_TARGETS ||
              colName === FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS
            ) {
              window.dispatchEvent(new CustomEvent('suryaland_master_sync', { detail: { collection: colName } }));
            }
          }
          return;
        }
        const items: T[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as T), id: (d.data() as any)?.id || d.id });
        });

        // Deduplicate in memory by ID only (never delete cloud docs in snapshot)
        const cleanList = items.filter(
          (item, idx, self) => item && item.id && idx === self.findIndex((t) => t.id === item.id)
        );

        const finalList = transformList ? transformList(cleanList as T[]) : (cleanList as T[]);
        
        // Save directly into the live in-memory store mirroring Firebase Firestore
        firestoreMemoryStore[colName] = finalList;
        loadedCollections.add(colName);

        try {
          localStorage.setItem(storageKey, JSON.stringify(finalList));
        } catch {
          // local storage quota or error
        }
        // Notify components across the application
        if (typeof window !== 'undefined') {
          window.dispatchEvent(
            new CustomEvent('suryaland_firestore_sync', { 
              detail: { collection: colName, count: finalList.length } 
            })
          );

          // Real-time component dispatch for live updates across field & headquarters
          if (colName === FIRESTORE_COLLECTIONS.REPORTS) {
            window.dispatchEvent(new CustomEvent('suryaland_reports_sync', { detail: { reports: finalList } }));
          } else if (colName === FIRESTORE_COLLECTIONS.COMPANY_STAFF) {
            window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync', { detail: { staff: finalList } }));
          } else if (colName === FIRESTORE_COLLECTIONS.USERS) {
            window.dispatchEvent(new CustomEvent('suryaland_users_sync', { detail: { users: finalList } }));
          } else if (colName === FIRESTORE_COLLECTIONS.WORKERS) {
            window.dispatchEvent(new CustomEvent('suryaland_workers_sync', { detail: { workers: finalList } }));
          } else if (
            colName === FIRESTORE_COLLECTIONS.EQUIPMENTS ||
            colName === FIRESTORE_COLLECTIONS.CLIENTS ||
            colName === FIRESTORE_COLLECTIONS.BLOCKS ||
            colName === FIRESTORE_COLLECTIONS.DAILY_TARGETS ||
            colName === FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS
          ) {
            window.dispatchEvent(new CustomEvent('suryaland_master_sync', { detail: { collection: colName } }));
          } else if (
            colName === FIRESTORE_COLLECTIONS.INVENTORY ||
            colName === FIRESTORE_COLLECTIONS.LOGISTICS
          ) {
            window.dispatchEvent(new CustomEvent('suryaland_logistics_sync', { detail: { collection: colName } }));
          }
        }
      }, (error) => {
        if (error.code === 'permission-denied') {
          handleFirestoreError(error, OperationType.GET, colName);
        }
        console.warn(`[Firestore] Snapshot notice on ${colName}:`, error.message);
      });
    } catch (err) {
      console.warn(`[Firestore] Listener setup error for ${colName}:`, err);
    }
  };

  // Attach real-time listeners for dynamic multi-user sync
  attachSync<any>(FIRESTORE_COLLECTIONS.REPORTS, LOCAL_STORAGE_KEYS.REPORTS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_report_ids_v1');
    const valid = docs.filter((d) => !deletedIds.includes(d.id));
    return [...valid].sort((a, b) => {
      const timeB = new Date(b.date || b.createdAt || 0).getTime();
      const timeA = new Date(a.date || a.createdAt || 0).getTime();
      if (timeB !== timeA) return timeB - timeA;
      return (b.reportNumber || '').localeCompare(a.reportNumber || '');
    });
  });
  attachSync(FIRESTORE_COLLECTIONS.EQUIPMENTS, LOCAL_STORAGE_KEYS.EQUIPMENTS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_equipment_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.WORKERS, LOCAL_STORAGE_KEYS.WORKERS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_worker_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.BLOCKS, LOCAL_STORAGE_KEYS.BLOCKS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_block_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.CLIENTS, LOCAL_STORAGE_KEYS.CLIENTS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_client_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.PROJECTS, LOCAL_STORAGE_KEYS.PROJECTS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_project_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.INVENTORY, LOCAL_STORAGE_KEYS.INVENTORY, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_inventory_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.LOGISTICS, LOCAL_STORAGE_KEYS.LOGISTICS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_logistics_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.P2H, LOCAL_STORAGE_KEYS.P2H, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_p2h_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.BOWSER, LOCAL_STORAGE_KEYS.BOWSER, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_bowser_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.SOIL, LOCAL_STORAGE_KEYS.SOIL, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_soil_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.GEOTAG, LOCAL_STORAGE_KEYS.GEOTAG, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_geotag_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync<any>(FIRESTORE_COLLECTIONS.USERS, LOCAL_STORAGE_KEYS.USERS, (docs) => {
    const deletedUserIds = getDeletedIdsFromStorage('suryaland_deleted_user_ids_v1');
    const validCloudDocs = docs.filter((d) => {
      if (isObsoleteHendraRecord(d)) {
        syncDocDelete(FIRESTORE_COLLECTIONS.USERS, d.id);
        return false;
      }
      return !deletedUserIds.includes(d.id);
    });

    // Merge with local users with smart deduplication
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const combined = [...validCloudDocs, ...(Array.isArray(localList) ? localList : [])];
      const { cleanList } = deduplicateUsersList(combined);
      return cleanList;
    } catch {}
    return validCloudDocs;
  });
  attachSync<any>(FIRESTORE_COLLECTIONS.ACTIVITIES, LOCAL_STORAGE_KEYS.ACTIVITIES, (docs) => {
    return [...docs].sort((a, b) => new Date(b.timestamp || 0).getTime() - new Date(a.timestamp || 0).getTime());
  });
  attachSync<any>(FIRESTORE_COLLECTIONS.COMPANY_STAFF, LOCAL_STORAGE_KEYS.COMPANY_STAFF, (docs) => {
    const deletedStaffIds = getDeletedIdsFromStorage('suryaland_deleted_staff_ids_v1');
    const validCloudDocs = docs.filter((d) => {
      if (isObsoleteHendraRecord(d)) {
        syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, d.id);
        return false;
      }
      return !deletedStaffIds.includes(d.id);
    });

    // Merge with local staff with smart deduplication
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_STAFF);
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      const combined = [...validCloudDocs, ...(Array.isArray(localList) ? localList : [])];
      const { cleanList } = deduplicateStaffList(combined);
      return cleanList;
    } catch {}
    return validCloudDocs;
  });
  attachSync(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, LOCAL_STORAGE_KEYS.WORK_ASSIGNMENTS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_assignment_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });
  attachSync(FIRESTORE_COLLECTIONS.DAILY_TARGETS, LOCAL_STORAGE_KEYS.DAILY_TARGETS, (docs) => {
    const deletedIds = getDeletedIdsFromStorage('suryaland_deleted_target_ids_v1');
    return docs.filter((d) => !deletedIds.includes(d.id));
  });

  // Company Profile single doc listener
  try {
    const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.COMPANY_PROFILE, 'main_profile');
    onSnapshot(profileDocRef, (snap) => {
      if (snap.exists()) {
        const profileData = snap.data();
        firestoreCompanyProfile = profileData;
        try {
          const localRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_PROFILE);
          if (localRaw) {
            const localProfile = JSON.parse(localRaw);
            const localTime = new Date(localProfile.updatedAt || 0).getTime();
            const cloudTime = new Date(profileData.updatedAt || 0).getTime();
            if (localTime > cloudTime) {
              return; // Keep newer local profile data
            }
          }

          localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(profileData));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('suryaland_firestore_sync', { detail: { collection: FIRESTORE_COLLECTIONS.COMPANY_PROFILE } })
            );
          }
        } catch {}
      }
    });
  } catch (err) {
    console.warn('[Firestore] Company Profile sync warning:', err);
  }
  
  // Job titles listener (string array format in localStorage)
  try {
    const jobTitlesRef = collection(db, FIRESTORE_COLLECTIONS.JOB_TITLES);
    onSnapshot(jobTitlesRef, (snapshot) => {
      if (!snapshot.empty) {
        const titles: string[] = [];
        snapshot.forEach((d) => {
          const data = d.data() as { title?: string; id?: string };
          if (data.title) titles.push(data.title);
        });
        if (titles.length > 0) {
          localStorage.setItem(LOCAL_STORAGE_KEYS.JOB_TITLES, JSON.stringify(titles));
          if (typeof window !== 'undefined') {
            window.dispatchEvent(
              new CustomEvent('suryaland_firestore_sync', { detail: { collection: FIRESTORE_COLLECTIONS.JOB_TITLES } })
            );
          }
        }
      }
    });
  } catch (err) {
    console.warn('[Firestore] Job titles sync error:', err);
  }
}
