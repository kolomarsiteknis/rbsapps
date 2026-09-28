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
  isFirebaseReady
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

export async function toggleFirestoreNetwork(goOnline: boolean): Promise<void> {
  try {
    if (goOnline) {
      await enableNetwork(db);
      setSyncStatus('connected');
    } else {
      await disableNetwork(db);
      setSyncStatus('offline');
    }
  } catch (err) {
    console.warn('[Firestore] Network toggle notice:', err);
    setSyncStatus(goOnline ? 'connected' : 'offline');
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
  } catch (err) {
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
  } catch (err) {
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

// Initialize Firestore listeners & initial seeding
export function initFirestoreSync() {
  if (isInitialized || !isFirebaseReady || !db) return;
  isInitialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setSyncStatus('connected'));
    window.addEventListener('offline', () => setSyncStatus('offline'));
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

  // Helper to attach real-time listener to a collection
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
          items.push(d.data() as T);
        });
        const finalList = transformList ? transformList(items) : items;
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
        }
      }, (error) => {
        console.warn(`[Firestore] Snapshot error on ${colName}:`, error.message);
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

    // Merge with local users so locally saved accounts are never lost if cloud write was delayed
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.USERS);
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      if (Array.isArray(localList) && localList.length > 0) {
        const mergedMap = new Map<string, any>();
        validCloudDocs.forEach((d) => mergedMap.set(d.id, d));
        localList.forEach((loc) => {
          if (!loc || !loc.id || isObsoleteHendraRecord(loc) || deletedUserIds.includes(loc.id)) return;
          const cloudItem = mergedMap.get(loc.id);
          if (!cloudItem) {
            mergedMap.set(loc.id, loc);
            syncDocWrite(FIRESTORE_COLLECTIONS.USERS, loc);
          } else {
            const locTime = loc.updatedAt ? new Date(loc.updatedAt).getTime() : 0;
            const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
            if (locTime > cloudTime) {
              mergedMap.set(loc.id, { ...cloudItem, ...loc });
            }
          }
        });
        return Array.from(mergedMap.values());
      }
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

    // Merge with local staff so locally saved staff & signatures are never overwritten by older cloud state
    try {
      const localRaw = localStorage.getItem(LOCAL_STORAGE_KEYS.COMPANY_STAFF);
      const localList: any[] = localRaw ? JSON.parse(localRaw) : [];
      if (Array.isArray(localList) && localList.length > 0) {
        const mergedMap = new Map<string, any>();
        validCloudDocs.forEach((d) => mergedMap.set(d.id, d));
        localList.forEach((loc) => {
          if (!loc || !loc.id || isObsoleteHendraRecord(loc) || deletedStaffIds.includes(loc.id)) return;
          const cloudItem = mergedMap.get(loc.id);
          if (!cloudItem) {
            mergedMap.set(loc.id, loc);
          } else {
            const locTime = loc.updatedAt ? new Date(loc.updatedAt).getTime() : 0;
            const cloudTime = cloudItem.updatedAt ? new Date(cloudItem.updatedAt).getTime() : 0;
            if (locTime >= cloudTime) {
              mergedMap.set(loc.id, {
                ...cloudItem,
                ...loc,
                signatureUrl: loc.signatureUrl || cloudItem.signatureUrl,
              });
            }
          }
        });
        return Array.from(mergedMap.values());
      }
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
