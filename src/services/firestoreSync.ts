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
  initialCompanyStaff
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

// Write or update a document in Firestore (with offline queuing)
export async function syncDocWrite<T extends { id: string }>(
  collectionName: string, 
  item: T
): Promise<void> {
  if (!item || !item.id || !isFirebaseReady || !db) return;
  try {
    const cleaned = cleanForFirestore(item);
    const docRef = doc(db, collectionName, String(item.id));
    await setDoc(docRef, cleaned, { merge: true });
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.WRITE, `${collectionName}/${item.id}`);
    }
    console.warn(`[Firestore Offline Queue] Warning writing to ${collectionName}/${item.id}:`, err);
  }
}

// Delete a document from Firestore
export async function syncDocDelete(
  collectionName: string, 
  id: string
): Promise<void> {
  if (!id || !isFirebaseReady || !db) return;
  try {
    const docRef = doc(db, collectionName, String(id));
    await deleteDoc(docRef);
  } catch (err: any) {
    if (err?.code === 'permission-denied') {
      handleFirestoreError(err, OperationType.DELETE, `${collectionName}/${id}`);
    }
    console.warn(`[Firestore Offline Queue] Warning deleting from ${collectionName}/${id}:`, err);
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

    // Check if item already exists by id, username, employeeIdNumber, or fullName
    let targetIdx = -1;
    if (normId && idMap.has(normId)) {
      targetIdx = idMap.get(normId)!;
    } else if (normU && userMap.has(normU)) {
      targetIdx = userMap.get(normU)!;
    } else if (normEmp && empIdMap.has(normEmp)) {
      targetIdx = empIdMap.get(normEmp)!;
    } else if (normName && nameMap.has(normName)) {
      targetIdx = nameMap.get(normName)!;
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
    } else if (normEmp && empIdMap.has(normEmp)) {
      targetIdx = empIdMap.get(normEmp)!;
    } else if (normName && nameMap.has(normName)) {
      targetIdx = nameMap.get(normName)!;
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

  // Setup initial seeding & one-time cleanup of dummy data in the background
  const runInitialSeed = async () => {
    try {
      // Purge dummy collections in Firestore so user can enter real field data
      const FIRESTORE_PURGE_FLAG = 'rbs_firestore_master_purged_v2026_09';
      if (typeof window !== 'undefined' && localStorage.getItem(FIRESTORE_PURGE_FLAG) !== 'done') {
        const collectionsToWipe = [
          FIRESTORE_COLLECTIONS.CLIENTS,
          FIRESTORE_COLLECTIONS.BLOCKS,
          FIRESTORE_COLLECTIONS.EQUIPMENTS,
          FIRESTORE_COLLECTIONS.WORKERS,
          FIRESTORE_COLLECTIONS.PROJECTS,
          FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS,
          FIRESTORE_COLLECTIONS.DAILY_TARGETS,
        ];
        for (const colName of collectionsToWipe) {
          try {
            const colRef = collection(db, colName);
            const snap = await getDocs(colRef);
            if (!snap.empty) {
              const batch = writeBatch(db);
              snap.forEach((d) => batch.delete(d.ref));
              await batch.commit();
            }
          } catch (err) {
            console.warn(`[Firestore Purge] Notice on ${colName}:`, err);
          }
        }
        localStorage.setItem(FIRESTORE_PURGE_FLAG, 'done');
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

      // Run automatic background cloud deduplication pass to ensure 0 duplicate documents exist in Firestore
      await purgeAllCloudDuplicates();

      const deletedUserIds = getDeletedIdsFromStorage('suryaland_deleted_user_ids_v1');
      const deletedStaffIds = getDeletedIdsFromStorage('suryaland_deleted_staff_ids_v1');

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
        // Do not overwrite localStorage with an empty array when Firestore collection is empty/unseeded
        if (snapshot.empty) {
          return;
        }
        const items: T[] = [];
        snapshot.forEach((d) => {
          items.push({ ...(d.data() as T), id: (d.data() as any)?.id || d.id });
        });

        // Run universal collection deduplication
        const { cleanList, removedDocIds } = deduplicateCollectionItems(colName, items);

        // Delete any duplicate documents found in the Firestore cloud snapshot
        if (removedDocIds.length > 0) {
          removedDocIds.forEach((dupId) => {
            syncDocDelete(colName, dupId);
          });
        }

        const finalList = transformList ? transformList(cleanList as T[]) : (cleanList as T[]);
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
  attachSync(FIRESTORE_COLLECTIONS.REPORTS, LOCAL_STORAGE_KEYS.REPORTS);
  attachSync(FIRESTORE_COLLECTIONS.EQUIPMENTS, LOCAL_STORAGE_KEYS.EQUIPMENTS);
  attachSync(FIRESTORE_COLLECTIONS.WORKERS, LOCAL_STORAGE_KEYS.WORKERS);
  attachSync(FIRESTORE_COLLECTIONS.BLOCKS, LOCAL_STORAGE_KEYS.BLOCKS);
  attachSync(FIRESTORE_COLLECTIONS.CLIENTS, LOCAL_STORAGE_KEYS.CLIENTS);
  attachSync(FIRESTORE_COLLECTIONS.PROJECTS, LOCAL_STORAGE_KEYS.PROJECTS);
  attachSync(FIRESTORE_COLLECTIONS.INVENTORY, LOCAL_STORAGE_KEYS.INVENTORY);
  attachSync(FIRESTORE_COLLECTIONS.LOGISTICS, LOCAL_STORAGE_KEYS.LOGISTICS);
  attachSync(FIRESTORE_COLLECTIONS.P2H, LOCAL_STORAGE_KEYS.P2H);
  attachSync(FIRESTORE_COLLECTIONS.BOWSER, LOCAL_STORAGE_KEYS.BOWSER);
  attachSync(FIRESTORE_COLLECTIONS.SOIL, LOCAL_STORAGE_KEYS.SOIL);
  attachSync(FIRESTORE_COLLECTIONS.GEOTAG, LOCAL_STORAGE_KEYS.GEOTAG);
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
  attachSync(FIRESTORE_COLLECTIONS.ACTIVITIES, LOCAL_STORAGE_KEYS.ACTIVITIES);
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
  attachSync(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, LOCAL_STORAGE_KEYS.WORK_ASSIGNMENTS);
  attachSync(FIRESTORE_COLLECTIONS.DAILY_TARGETS, LOCAL_STORAGE_KEYS.DAILY_TARGETS);

  // Company Profile single doc listener
  try {
    const profileDocRef = doc(db, FIRESTORE_COLLECTIONS.COMPANY_PROFILE, 'main_profile');
    onSnapshot(profileDocRef, (snap) => {
      if (snap.exists()) {
        try {
          localStorage.setItem(LOCAL_STORAGE_KEYS.COMPANY_PROFILE, JSON.stringify(snap.data()));
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
