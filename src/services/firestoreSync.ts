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
  disableNetwork
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
  initialManagedUsers
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
  if (!item || !item.id) return;
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
  if (!id) return;
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

// Initialize Firestore listeners & initial seeding
export function initFirestoreSync() {
  if (isInitialized) return;
  isInitialized = true;

  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => setSyncStatus('connected'));
    window.addEventListener('offline', () => setSyncStatus('offline'));
  }

  // Setup initial seeding in the background
  const runInitialSeed = async () => {
    try {
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.REPORTS, initialDailyReports);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.EQUIPMENTS, initialEquipments);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.WORKERS, initialWorkers);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.BLOCKS, initialBlocks);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.INVENTORY, initialInventory);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.CLIENTS, initialClients);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.PROJECTS, initialProjects);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.LOGISTICS, initialLogisticsTransactions);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.P2H, initialP2HChecklists);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.BOWSER, initialFuelBowserReceipts);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.SOIL, initialSoilIncidents);
      await seedCollectionIfEmpty(FIRESTORE_COLLECTIONS.USERS, initialManagedUsers);
      
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
        if (!snapshot.empty) {
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
  attachSync(FIRESTORE_COLLECTIONS.USERS, LOCAL_STORAGE_KEYS.USERS);
  attachSync(FIRESTORE_COLLECTIONS.ACTIVITIES, LOCAL_STORAGE_KEYS.ACTIVITIES);
  
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
