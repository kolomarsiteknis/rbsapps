import { 
  DailyReport, 
  Equipment, 
  Worker, 
  Block, 
  InventoryItem, 
  Client, 
  Project,
  LogisticsTransaction,
  DailyLocationTarget,
  WeeklyFuelTrend,
  DailyP2HChecklist,
  FuelBowserReceipt,
  SoilHazardIncident,
  FieldGeotagPhoto,
  HmDiscrepancyLog,
  UserActivityLog,
  ActivityActionCategory,
  ManagedUser,
  AuthUser,
  WorkAssignment,
  CompanyProfile,
  CompanyStaff
} from '../types';
import { 
  initialDailyReports, 
  initialEquipments, 
  initialWorkers, 
  initialBlocks, 
  initialInventory, 
  initialClients, 
  initialProjects,
  initialLogisticsTransactions,
  initialDailyTargets,
  initialP2HChecklists,
  initialFuelBowserReceipts,
  initialSoilIncidents,
  initialJobTitles,
  initialManagedUsers,
  initialWorkAssignments,
  initialCompanyProfile,
  initialCompanyStaff,
  createDefaultCompanyLogoSvg,
  compressSignatureDataUrl
} from '../data/mockData';
import { 
  syncDocWrite, 
  syncDocDelete, 
  FIRESTORE_COLLECTIONS,
  initFirestoreSync,
  deduplicateStaffList,
  deduplicateUsersList,
  deduplicateCollectionItems,
  purgeAllCloudDuplicates
} from './firestoreSync';

const STORAGE_KEYS = {
  REPORTS: 'suryaland_reports_v1',
  EQUIPMENTS: 'suryaland_equipments_v1',
  WORKERS: 'suryaland_workers_v1',
  BLOCKS: 'suryaland_blocks_v1',
  INVENTORY: 'suryaland_inventory_v1',
  CLIENTS: 'suryaland_clients_v1',
  PROJECTS: 'suryaland_projects_v1',
  LOGISTICS_TRANSACTIONS: 'suryaland_logistics_transactions_v1',
  DAILY_TARGETS: 'suryaland_daily_targets_v1',
  WORK_ASSIGNMENTS: 'suryaland_work_assignments_v1',
  DRAFT_REPORT: 'suryaland_report_wizard_draft_v1',
  P2H_CHECKLISTS: 'suryaland_p2h_checklists_v1',
  FUEL_BOWSER: 'suryaland_fuel_bowser_v1',
  SOIL_INCIDENTS: 'suryaland_soil_incidents_v1',
  GEOTAG_PHOTOS: 'suryaland_geotag_photos_v1',
  USER_ACTIVITIES: 'suryaland_user_activities_v1',
  MANAGED_USERS: 'suryaland_managed_users_v1',
  JOB_TITLES: 'suryaland_job_titles_v1',
  COMPANY_PROFILE: 'suryaland_company_profile_v1',
  COMPANY_STAFF: 'suryaland_company_staff_v1',
  DELETED_STAFF_IDS: 'suryaland_deleted_staff_ids_v1',
  DELETED_USER_IDS: 'suryaland_deleted_user_ids_v1',
};

function isObsoleteHendraRecord(item: any): boolean {
  if (!item) return false;
  const nameLower = String(item.fullName || item.name || item.displayName || '').trim().toLowerCase();
  const emailLower = String(item.email || '').trim().toLowerCase();
  return nameLower.includes('hendra wijaya') || emailLower.includes('hendra.wijaya');
}

function normalizeUsername(u?: string): string {
  return String(u || '').trim().replace(/^@+/, '').toLowerCase();
}

// Migration & purge flag: Purge dummy data from Master Data Proyek & Personil Tim Pendukung so user can fill real field data
const REAL_DATA_PURGE_FLAG = 'rbs_clean_dummy_master_data_v2026_09';
const USER_SYNC_REPAIR_FLAG = 'rbs_user_sync_repair_v2026_09_28_v2';

if (typeof window !== 'undefined') {
  try {
    if (localStorage.getItem(REAL_DATA_PURGE_FLAG) !== 'done') {
      localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.PROJECTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.BLOCKS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.EQUIPMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.WORK_ASSIGNMENTS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.DAILY_TARGETS, JSON.stringify([]));
      localStorage.setItem(STORAGE_KEYS.WORKERS, JSON.stringify([]));
      localStorage.setItem(REAL_DATA_PURGE_FLAG, 'done');
    }

    // Self-healing repair: unpoison deleted IDs & ensure active staff and managedUsers are 100% synced
    const rawDeletedStaff = localStorage.getItem(STORAGE_KEYS.DELETED_STAFF_IDS);
    const deletedStaffSet = new Set<string>(rawDeletedStaff ? JSON.parse(rawDeletedStaff) : []);

    const rawDeletedUsers = localStorage.getItem(STORAGE_KEYS.DELETED_USER_IDS);
    const deletedUsersSet = new Set<string>(rawDeletedUsers ? JSON.parse(rawDeletedUsers) : []);

    if (localStorage.getItem(USER_SYNC_REPAIR_FLAG) !== 'done') {
      ['staff-1', 'staff-2', 'staff-3'].forEach((id) => deletedStaffSet.delete(id));
      ['user-usr-01', 'user-usr-02', 'user-usr-03', 'user-usr-1', 'user-usr-2', 'user-usr-3'].forEach((id) =>
        deletedUsersSet.delete(id)
      );
      localStorage.setItem(USER_SYNC_REPAIR_FLAG, 'done');
    }

    const rawStaffStr = localStorage.getItem(STORAGE_KEYS.COMPANY_STAFF);
    let currentStaffList: CompanyStaff[] = [];
    if (rawStaffStr) {
      const parsedStaff: CompanyStaff[] = JSON.parse(rawStaffStr);
      if (Array.isArray(parsedStaff)) {
        currentStaffList = parsedStaff.filter((s) => {
          if (isObsoleteHendraRecord(s)) {
            if (s.id) deletedStaffSet.add(s.id);
            return false;
          }
          return true;
        });
      }
    }

    // Ensure initial verified core accounts (Ir. Baso Suriyadi & Andi Mujibal) exist if missing
    for (const initStaff of initialCompanyStaff) {
      const initUserNorm = normalizeUsername(initStaff.username);
      const initNameNorm = initStaff.fullName.trim().toLowerCase();
      const exists = currentStaffList.some(
        (s) =>
          s.id === initStaff.id ||
          normalizeUsername(s.username) === initUserNorm ||
          (s.fullName || '').trim().toLowerCase() === initNameNorm
      );
      if (!exists && !deletedStaffSet.has(initStaff.id)) {
        currentStaffList.push(initStaff);
      }
    }

    // Any staff present in currentStaffList is active -> ensure its ID and linkedUserId are NOT in deleted sets
    currentStaffList.forEach((s) => {
      if (s.id) deletedStaffSet.delete(s.id);
      if (s.linkedUserId) deletedUsersSet.delete(s.linkedUserId);
      const derivedUserId = `user-usr-${(s.id || '').replace(/^staff-/, '')}`;
      deletedUsersSet.delete(derivedUserId);
    });

    const rawUsersStr = localStorage.getItem(STORAGE_KEYS.MANAGED_USERS);
    let currentUsersList: ManagedUser[] = [];
    if (rawUsersStr) {
      const parsedUsers: ManagedUser[] = JSON.parse(rawUsersStr);
      if (Array.isArray(parsedUsers)) {
        currentUsersList = parsedUsers.filter((u) => {
          if (isObsoleteHendraRecord(u)) {
            if (u.id) deletedUsersSet.add(u.id);
            return false;
          }
          return true;
        });
      }
    }

    // Synchronize all staff with credentials into currentUsersList
    currentStaffList.forEach((s) => {
      const cleanU = normalizeUsername(s.username);
      if (!cleanU || !s.password) return;
      const sNameLower = (s.fullName || '').trim().toLowerCase();
      const existingIdx = currentUsersList.findIndex(
        (u) =>
          (s.linkedUserId && u.id === s.linkedUserId) ||
          normalizeUsername(u.username) === cleanU ||
          (sNameLower && (u.fullName || '').trim().toLowerCase() === sNameLower)
      );
      const resolvedUserId =
        (existingIdx >= 0 ? currentUsersList[existingIdx].id : undefined) ||
        s.linkedUserId ||
        `user-usr-${(s.id || '').replace(/^staff-/, '')}`;
      s.linkedUserId = resolvedUserId;
      deletedUsersSet.delete(resolvedUserId);

      const safeSig =
        s.signatureUrl && s.signatureUrl.length > 120000
          ? existingIdx >= 0 &&
            currentUsersList[existingIdx].signatureUrl &&
            currentUsersList[existingIdx].signatureUrl!.length <= 120000
            ? currentUsersList[existingIdx].signatureUrl
            : undefined
          : s.signatureUrl;

      const syncedUser: ManagedUser = {
        id: resolvedUserId,
        fullName: s.fullName.trim(),
        address: s.address || (existingIdx >= 0 ? currentUsersList[existingIdx].address : '') || '-',
        whatsappNumber: s.phone || (existingIdx >= 0 ? currentUsersList[existingIdx].whatsappNumber : '') || '-',
        email: s.email || (existingIdx >= 0 ? currentUsersList[existingIdx].email : '') || '-',
        jobTitle: s.jobRole || (existingIdx >= 0 ? currentUsersList[existingIdx].jobTitle : 'Staff'),
        userLevel: (s.userLevel ||
          (s.staffLevel === 'Direktur'
            ? 'Superadmin'
            : s.staffLevel === 'Site Manager'
            ? 'Site Manager'
            : s.staffLevel === 'Klien'
            ? 'Klien'
            : 'Pengawas')) as any,
        username: cleanU,
        password: s.password,
        signatureUrl: safeSig,
        employeeIdNumber: s.employeeIdNumber,
        assignedClientId: s.assignedClientId || 'all',
        assignedClientName: s.assignedClientName || 'Semua Proyek',
        assignedBlockCodes: s.assignedBlockCodes || ['Akses Semua Blok'],
        status: s.status || 'Aktif',
        createdAt: s.createdAt || new Date().toISOString(),
        updatedAt: s.updatedAt || new Date().toISOString(),
        notes: s.notes || '',
      };

      if (existingIdx >= 0) {
        currentUsersList[existingIdx] = { ...currentUsersList[existingIdx], ...syncedUser };
      } else {
        currentUsersList.push(syncedUser);
      }
    });

    // Deduplicate currentStaffList and ensure all staff are active
    const staffDedup = deduplicateStaffList(currentStaffList);
    currentStaffList = staffDedup.cleanList.map((s) => ({ ...s, status: 'Aktif' }));
    if (staffDedup.removedDocIds.length > 0) {
      staffDedup.removedDocIds.forEach((dupId) => {
        syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, dupId);
      });
    }

    // Deduplicate currentUsersList and ensure all users are active
    const userDedup = deduplicateUsersList(currentUsersList);
    currentUsersList = userDedup.cleanList.map((u) => ({ ...u, status: 'Aktif' }));
    if (userDedup.removedDocIds.length > 0) {
      userDedup.removedDocIds.forEach((dupId) => {
        syncDocDelete(FIRESTORE_COLLECTIONS.USERS, dupId);
      });
    }

    localStorage.setItem(STORAGE_KEYS.DELETED_STAFF_IDS, JSON.stringify(Array.from(deletedStaffSet)));
    localStorage.setItem(STORAGE_KEYS.DELETED_USER_IDS, JSON.stringify(Array.from(deletedUsersSet)));
    localStorage.setItem(STORAGE_KEYS.COMPANY_STAFF, JSON.stringify(currentStaffList));
    localStorage.setItem(STORAGE_KEYS.MANAGED_USERS, JSON.stringify(currentUsersList));

    // Background compression for any existing oversized signature images (> 100KB) so Firestore sync succeeds
    setTimeout(async () => {
      try {
        let staffCompressed = false;
        for (const st of currentStaffList) {
          if (st.signatureUrl && st.signatureUrl.length > 100000) {
            st.signatureUrl = await compressSignatureDataUrl(st.signatureUrl);
            staffCompressed = true;
            syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_STAFF, st);
          }
        }
        if (staffCompressed) {
          localStorage.setItem(STORAGE_KEYS.COMPANY_STAFF, JSON.stringify(currentStaffList));
        }
        for (const usr of currentUsersList) {
          if (usr.signatureUrl && usr.signatureUrl.length > 100000) {
            usr.signatureUrl = await compressSignatureDataUrl(usr.signatureUrl);
          }
          syncDocWrite(FIRESTORE_COLLECTIONS.USERS, usr);
        }
        localStorage.setItem(STORAGE_KEYS.MANAGED_USERS, JSON.stringify(currentUsersList));
      } catch (err) {
        console.warn('Signature optimization notice:', err);
      }
    }, 500);
  } catch (err) {
    console.warn('Initial storage purge notice:', err);
  }
}

// Safe JSON parser helper
function loadFromStorage<T>(key: string, defaultValue: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error loading key ${key} from storage:`, err);
    return defaultValue;
  }
}

function saveToStorage<T>(key: string, value: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (err) {
    console.warn(`Quota notice saving key ${key}, optimizing storage...`, err);
    try {
      if (key !== STORAGE_KEYS.USER_ACTIVITIES) {
        localStorage.removeItem(STORAGE_KEYS.USER_ACTIVITIES);
      }
      if (key === STORAGE_KEYS.MANAGED_USERS && Array.isArray(value)) {
        const slimUsers = (value as any[]).map((u) =>
          u && typeof u.signatureUrl === 'string' && u.signatureUrl.length > 100000
            ? { ...u, signatureUrl: undefined }
            : u
        );
        localStorage.setItem(key, JSON.stringify(slimUsers));
        return;
      }
      localStorage.setItem(key, JSON.stringify(value));
    } catch (retryErr) {
      console.error(`Error saving key ${key} to storage after optimization:`, retryErr);
    }
  }
}

export const storageService = {
  // Helper: Validasi kewenangan pengawas lapangan terhadap Klien & Blok
  canSupervisorAccess(
    clientId?: string, 
    blockCodeOrId?: string, 
    authUser?: AuthUser | null
  ): boolean {
    if (!authUser) return true;
    // Superadmin / Direktur / Manager = Manajemen dengan akses luas ke semua klien
    if (
      authUser.role === 'director' || 
      authUser.role === 'manager' || 
      authUser.userLevel === 'Superadmin' || 
      authUser.userLevel === 'Manager'
    ) {
      return true;
    }

    // Untuk Pengawas:
    // 1. Validasi Klien: Pengawas HANYA bertugas mengawasi 1 Klien PT yang ditugaskan
    if (authUser.assignedClientId && authUser.assignedClientId !== 'all') {
      if (clientId && clientId !== 'ALL' && clientId !== authUser.assignedClientId) {
        return false;
      }
    }

    // 2. Validasi Blok: Pengawas BISA ditugaskan di lebih dari 1 lokasi kerja (blok-blok tugasnya)
    if (
      blockCodeOrId && 
      blockCodeOrId !== 'ALL' && 
      authUser.assignedBlockCodes && 
      authUser.assignedBlockCodes.length > 0 && 
      !authUser.assignedBlockCodes[0].includes('Semua Blok')
    ) {
      const target = (blockCodeOrId || '').trim().toLowerCase();
      const isBlockAllowed = authUser.assignedBlockCodes.some((assignedBlock) => {
        const b = (assignedBlock || '').trim().toLowerCase();
        return target && b ? (target.includes(b) || b.includes(target)) : false;
      });
      if (!isBlockAllowed) {
        return false;
      }
    }

    return true;
  },

  // Helper: Ambil daftar SPK / Klien yang berhak diakses oleh user yang sedang login
  getAuthorizedClientsForUser(authUser?: AuthUser | null): Client[] {
    const allClients = this.getClients();
    if (!authUser) return allClients;

    if (
      authUser.role === 'director' ||
      authUser.role === 'manager' ||
      authUser.userLevel === 'Superadmin' ||
      authUser.userLevel === 'Site Manager' ||
      authUser.userLevel === 'Manager'
    ) {
      return allClients;
    }

    if (authUser.role === 'supervisor' || authUser.userLevel === 'Pengawas') {
      if (authUser.assignedClientId && authUser.assignedClientId !== 'all') {
        return allClients.filter((c) => c.id === authUser.assignedClientId);
      }
      return allClients;
    }

    // Untuk Klien: Hanya berhak mengakses SPK milik mereka sendiri (1 Klien bisa punya banyak SPK)
    if (authUser.role === 'client' || authUser.userLevel === 'Klien') {
      const usernameLower = (authUser.username || '').trim().toLowerCase();
      const rawUsers = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
      const managedUser = rawUsers.find((u) => (u.username || '').trim().toLowerCase() === usernameLower);

      const allowedIds = new Set<string>();
      if (authUser.assignedClientId && authUser.assignedClientId !== 'all') allowedIds.add(authUser.assignedClientId);
      if (authUser.assignedClientIds) authUser.assignedClientIds.forEach((id) => id && id !== 'all' && allowedIds.add(id));
      if (managedUser?.assignedClientId && managedUser.assignedClientId !== 'all') allowedIds.add(managedUser.assignedClientId);
      if (managedUser?.assignedClientIds) managedUser.assignedClientIds.forEach((id) => id && id !== 'all' && allowedIds.add(id));

      const allowedContracts = new Set<string>();
      if (authUser.assignedContractNumbers) {
        authUser.assignedContractNumbers.forEach((cn) => cn && allowedContracts.add(cn.trim().toLowerCase()));
      }
      if (managedUser?.assignedContractNumbers) {
        managedUser.assignedContractNumbers.forEach((cn) => cn && allowedContracts.add(cn.trim().toLowerCase()));
      }

      const directMatches = allClients.filter((c) => {
        if (usernameLower && c.username && c.username.trim().toLowerCase() === usernameLower) return true;
        if (allowedIds.has(c.id)) return true;
        if (c.contractNumber && allowedContracts.has(c.contractNumber.trim().toLowerCase())) return true;
        if (c.linkedUserId && (c.linkedUserId === authUser.id || (managedUser && c.linkedUserId === managedUser.id))) return true;
        return false;
      });

      // Jika klien memiliki lebih dari 1 SPK dengan nama perusahaan yang sama (dan tidak dikunci ke username klien lain)
      const matchedCompanyNames = new Set(
        directMatches.map((c) => (c.fullCompanyName || '').trim().toLowerCase()).filter(Boolean)
      );
      const matchedShortNames = new Set(
        directMatches.map((c) => (c.name || '').trim().toLowerCase()).filter(Boolean)
      );

      return allClients.filter((c) => {
        if (directMatches.some((dm) => dm.id === c.id)) return true;
        const cUserLower = (c.username || '').trim().toLowerCase();
        if (cUserLower && cUserLower !== usernameLower) return false;
        const fullLower = (c.fullCompanyName || '').trim().toLowerCase();
        const shortLower = (c.name || '').trim().toLowerCase();
        if (fullLower && matchedCompanyNames.has(fullLower)) return true;
        if (shortLower && matchedShortNames.has(shortLower)) return true;
        return false;
      });
    }

    return allClients;
  },

  // Reports
  getReports(selectedClientId?: string, authUser?: AuthUser | null): DailyReport[] {
    const all = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);

    // Filter ketat jika pengguna adalah Klien (Hanya bisa melihat laporan sesuai SPK milik mereka)
    if (authUser && (authUser.role === 'client' || authUser.userLevel === 'Klien')) {
      const authorizedClients = this.getAuthorizedClientsForUser(authUser);
      const allowedClientIds = new Set(authorizedClients.map((c) => c.id));
      const allowedContracts = new Set(
        authorizedClients.map((c) => (c.contractNumber || '').trim().toLowerCase()).filter(Boolean)
      );
      if (authUser.assignedContractNumbers) {
        authUser.assignedContractNumbers.forEach((cn) => cn && allowedContracts.add(cn.trim().toLowerCase()));
      }
      if (authUser.assignedClientId && authUser.assignedClientId !== 'all') {
        allowedClientIds.add(authUser.assignedClientId);
      }
      if (authUser.assignedClientIds) {
        authUser.assignedClientIds.forEach((id) => id && id !== 'all' && allowedClientIds.add(id));
      }

      return all.filter((r) => {
        const matchId = allowedClientIds.has(r.clientId);
        const matchContract = r.contractNumber && allowedContracts.has(r.contractNumber.trim().toLowerCase());
        if (!matchId && !matchContract) return false;
        if (selectedClientId && selectedClientId !== 'ALL') {
          return r.clientId === selectedClientId;
        }
        return true;
      });
    }

    // Filter jika pengguna adalah Pengawas
    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return all.filter((r) => {
        // Harus sesuai dengan 1 klien PT yang ditugaskan
        if (allowedClientId && allowedClientId !== 'ALL' && r.clientId !== allowedClientId) {
          return false;
        }
        // Harus sesuai salah satu blok penugasan kerja
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = (b || '').trim().toLowerCase();
            return (r.blockCode && r.blockCode.toLowerCase().includes(bClean)) || (r.blockId && r.blockId.toLowerCase() === bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return all;
    }
    return all.filter((r) => r.clientId === selectedClientId);
  },

  getReportById(id: string): DailyReport | undefined {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    return reports.find((r) => r.id === id);
  },

  saveReport(report: DailyReport, authUser?: AuthUser | null): DailyReport {
    // Isolasi ketat: Klien hanya memiliki akses baca (read-only)
    if (authUser && (authUser.role === 'client' || authUser.userLevel === 'Klien')) {
      throw new Error('Akses Ditolak: Akun Klien hanya memiliki hak akses melihat Monitoring Progress & Laporan (Read-Only).');
    }
    // Isolasi ketat: Pengawas tidak bisa CRUD data di luar penugasan proyek dan blok
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Anda hanya berwenang membuat/mengubah laporan untuk ${authUser.assignedClientName || authUser.assignedClientId} pada lokasi (${authUser.assignedBlockCodes?.join(', ')}). Tidak diizinkan CRUD di luar tugas!`
        );
      }
    }

    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const repNo = (report.reportNumber || '').trim().toLowerCase();
    const existingIndex = reports.findIndex(
      (r) =>
        r.id === report.id ||
        (repNo && (r.reportNumber || '').trim().toLowerCase() === repNo) ||
        (r.clientId === report.clientId && r.blockId === report.blockId && r.date === report.date && (r.effectiveWorkShift || '') === (report.effectiveWorkShift || ''))
    );
    let savedReport: DailyReport;
    const targetId = existingIndex >= 0 ? reports[existingIndex].id : report.id;

    if (existingIndex >= 0) {
      savedReport = {
        ...report,
        id: targetId,
        updatedAt: new Date().toISOString(),
      };
      reports[existingIndex] = savedReport;
    } else {
      savedReport = {
        ...report,
        id: targetId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      reports.unshift(savedReport);
    }

    const { cleanList: dedupReports, removedDocIds: repRemovedIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.REPORTS, reports);
    repRemovedIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.REPORTS, dupId));
    saveToStorage(STORAGE_KEYS.REPORTS, dedupReports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, savedReport);

    // Update block cleared area & equipments current HM
    this.syncBlockAndEquipments(savedReport);

    // Clear saved wizard draft
    this.clearDraft();

    return savedReport;
  },

  deleteReport(id: string, authUser?: AuthUser | null): boolean {
    if (authUser && (authUser.role === 'client' || authUser.userLevel === 'Klien')) {
      return false;
    }
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const target = reports.find((r) => r.id === id);
    if (!target) return false;

    // Isolasi ketat: Pengawas tidak dapat menghapus laporan di luar proyek & blok tugasnya
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = reports.filter((r) => r.id !== id);
    if (filtered.length !== reports.length) {
      saveToStorage(STORAGE_KEYS.REPORTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.REPORTS, id);
      return true;
    }
    return false;
  },

  approveReportByDirector(id: string, directorName: string): DailyReport | null {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const report = reports.find((r) => r.id === id);
    if (!report) return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()} WIB`;

    report.status = 'Disetujui Direktur';
    report.signatures.director = {
      name: directorName,
      signedAt: formatted,
      status: 'Signed',
    };
    report.updatedAt = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, report);
    return report;
  },

  rejectReportByDirector(id: string, directorName: string, reason: string): DailyReport | null {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const report = reports.find((r) => r.id === id);
    if (!report) return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${now.getHours()}:${now.getMinutes()} WIB`;

    report.status = 'Ditolak Direktur';
    report.rejectionReason = reason;
    report.rejectedBy = directorName;
    report.rejectedAt = formatted;
    report.signatures.director = {
      name: directorName,
      signedAt: formatted,
      status: 'Pending',
    };
    report.updatedAt = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, report);
    return report;
  },

  approveReportByManager(id: string, managerName: string): DailyReport | null {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const report = reports.find((r) => r.id === id);
    if (!report) return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    report.status = 'Disetujui Manager';
    report.signatures.siteManager = {
      name: managerName,
      signedAt: formatted,
      status: 'Signed',
    };
    report.rejectionReason = undefined;
    report.updatedAt = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, report);
    return report;
  },

  rejectReportByManager(id: string, managerName: string, reason: string): DailyReport | null {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const report = reports.find((r) => r.id === id);
    if (!report) return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    report.status = 'Ditolak Manager';
    report.rejectionReason = reason;
    report.rejectedBy = managerName;
    report.rejectedAt = formatted;
    report.signatures.siteManager = {
      name: managerName,
      signedAt: formatted,
      status: 'Pending',
    };
    report.updatedAt = new Date().toISOString();

    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, report);
    return report;
  },

  // Update block progress and equipment HM from report
  syncBlockAndEquipments(report: DailyReport): void {
    // 1. Update Block
    const blocks = this.getBlocks();
    const block = blocks.find((b) => b.id === report.blockId || b.code.includes(report.blockCode));
    if (block) {
      block.clearedAreaHa = report.physicalProgress.cumulativeAreaHa;
      if (block.clearedAreaHa >= block.targetAreaHa) {
        block.status = 'Selesai';
      } else {
        block.status = 'Dalam Pengerjaan';
      }
      saveToStorage(STORAGE_KEYS.BLOCKS, blocks);
      syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, block);
    }

    // 2. Update Client progress
    const clients = this.getClients();
    const client = clients.find((c) => c.id === report.clientId);
    if (client) {
      client.clearedAreaHa = report.physicalProgress.cumulativeAreaHa;
      saveToStorage(STORAGE_KEYS.CLIENTS, clients);
      syncDocWrite(FIRESTORE_COLLECTIONS.CLIENTS, client);
    }

    // 3. Update Equipments HM
    const equipments = this.getEquipments();
    let hasEquipUpdate = false;
    report.equipmentWorkLogs.forEach((log) => {
      const eq = equipments.find((e) => e.id === log.equipmentId);
      if (eq) {
        if (log.hmEnd > eq.currentHm) {
          eq.currentHm = log.hmEnd;
          hasEquipUpdate = true;
        }
        if (log.downtimeBreakdownHours > 0) {
          eq.status = 'Breakdown';
        } else {
          eq.status = 'Operasional';
        }
        syncDocWrite(FIRESTORE_COLLECTIONS.EQUIPMENTS, eq);
      }
    });
    if (hasEquipUpdate) {
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, equipments);
    }

    // 4. Update Fuel Inventory
    const inventory = this.getInventory();
    const fuelItem = inventory.find((i) => i.category === 'BBM');
    if (fuelItem && report.logistics.fuelTankUsedLiters > 0) {
      fuelItem.stockQuantity = report.logistics.fuelTankRemainingLiters;
      saveToStorage(STORAGE_KEYS.INVENTORY, inventory);
      syncDocWrite(FIRESTORE_COLLECTIONS.INVENTORY, fuelItem);
    }
  },

  // Equipments
  getEquipments(): Equipment[] {
    return loadFromStorage<Equipment[]>(STORAGE_KEYS.EQUIPMENTS, initialEquipments);
  },

  saveEquipment(equip: Equipment): void {
    const list = this.getEquipments();
    const cleanId = (equip.id || '').trim().toLowerCase();
    const cleanName = (equip.name || '').trim().toLowerCase();
    const cleanSerial = (equip.serialNumber || '').trim().toLowerCase();
    const idx = list.findIndex(
      (e) =>
        e.id === equip.id ||
        (cleanId && (e.id || '').trim().toLowerCase() === cleanId) ||
        (cleanSerial && (e.serialNumber || '').trim().toLowerCase() === cleanSerial) ||
        (cleanName && (e.name || '').trim().toLowerCase() === cleanName)
    );
    const targetId = idx >= 0 ? list[idx].id : equip.id;
    const finalEquip = { ...equip, id: targetId };
    if (idx >= 0) list[idx] = finalEquip;
    else list.push(finalEquip);

    const { cleanList, removedDocIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.EQUIPMENTS, list);
    removedDocIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.EQUIPMENTS, dupId));
    saveToStorage(STORAGE_KEYS.EQUIPMENTS, cleanList);
    syncDocWrite(FIRESTORE_COLLECTIONS.EQUIPMENTS, finalEquip);
  },

  deleteEquipment(equipmentId: string): boolean {
    const list = this.getEquipments();
    const filtered = list.filter((e) => e.id !== equipmentId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.EQUIPMENTS, equipmentId);
      return true;
    }
    return false;
  },

  // Workers
  getWorkers(): Worker[] {
    const raw = loadFromStorage<Worker[]>(STORAGE_KEYS.WORKERS, initialWorkers);
    let changed = false;
    const normalized = raw.map((w) => {
      let cat = w.category;
      if (!cat || cat === 'Pekerja Utama') {
        cat = (w.role?.toLowerCase().includes('operator') || w.teamName?.toLowerCase().includes('operator')) ? 'Operator' : 'Pendukung';
        changed = true;
      } else if (cat === 'Maintenance') {
        cat = (w.role?.toLowerCase().includes('driver') || w.role?.toLowerCase().includes('logistik')) ? 'Logistik' : 'Mekanik';
        changed = true;
      } else if (cat === 'Pengawas & Pendukung') {
        cat = (w.role?.toLowerCase().includes('pengawas') || w.role?.toLowerCase().includes('mandor')) ? 'Pengawas' : 'Pendukung';
        changed = true;
      }
      return { ...w, category: cat };
    });
    if (changed) {
      saveToStorage(STORAGE_KEYS.WORKERS, normalized);
    }
    return normalized;
  },

  saveWorker(worker: Worker): void {
    const list = this.getWorkers();
    const cleanName = (worker.name || '').trim().toLowerCase();
    const cleanCat = (worker.category || '').trim().toLowerCase();
    const idx = list.findIndex(
      (w) =>
        w.id === worker.id ||
        (cleanName && (w.name || '').trim().toLowerCase() === cleanName && (!cleanCat || (w.category || '').trim().toLowerCase() === cleanCat))
    );
    const targetId = idx >= 0 ? list[idx].id : worker.id;
    const finalWorker = { ...worker, id: targetId };
    if (idx >= 0) list[idx] = finalWorker;
    else list.push(finalWorker);

    const { cleanList, removedDocIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.WORKERS, list);
    removedDocIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.WORKERS, dupId));
    saveToStorage(STORAGE_KEYS.WORKERS, cleanList);
    syncDocWrite(FIRESTORE_COLLECTIONS.WORKERS, finalWorker);
  },

  deleteWorker(workerId: string): boolean {
    const list = this.getWorkers();
    const filtered = list.filter((w) => w.id !== workerId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.WORKERS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.WORKERS, workerId);
      return true;
    }
    return false;
  },

  // Blocks
  getBlocks(clientId?: string, authUser?: AuthUser | null): Block[] {
    const raw = loadFromStorage<Block[]>(STORAGE_KEYS.BLOCKS, initialBlocks);
    const standardVolumeMap: Record<string, { targetVolume: number; unit: string }> = {
      'UNDERBRUSHING (SEMAK BELUKAR)': { targetVolume: 30, unit: 'Ha' },
      'BATANG KUBUR': { targetVolume: 25, unit: 'POHON' },
      'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS': { targetVolume: 10, unit: 'Ha' },
      'MAINROAD': { targetVolume: 250, unit: 'm' },
      'COLLECTION ROAD': { targetVolume: 100, unit: 'm' },
      'SALURAN PRIMER': { targetVolume: 50, unit: 'm³' },
      'SALURAN SEKUNDER': { targetVolume: 50, unit: 'm³' },
      'SALURAN TERSIER': { targetVolume: 50, unit: 'm³' },
    };

    // Ensure every block has workItems populated with target volumes
    const all = raw.map((b) => {
      if (b.workItems && Array.isArray(b.workItems) && b.workItems.length > 0) {
        // Fill targetVolume if missing from older storage and normalize units
        const enrichedItems = b.workItems.map((wi) => {
          let unit = wi.unit;
          if (unit === 'HEKTAR' || unit === 'Hektar') unit = 'Ha';
          if (unit === 'METER LARI') unit = 'm';
          if (unit === 'METER KUBIK') unit = 'm³';
          if (wi.targetVolume !== undefined) return { ...wi, unit };
          const matched = standardVolumeMap[wi.name.toUpperCase()];
          return {
            ...wi,
            targetVolume: matched?.targetVolume ?? 10,
            unit: matched?.unit ?? unit,
          };
        });
        return { ...b, workItems: enrichedItems };
      }
      return {
        ...b,
        workItems: [
          { id: `${b.id}-wi-1`, name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetVolume: 30 },
          { id: `${b.id}-wi-2`, name: 'BATANG KUBUR', unit: 'POHON', targetVolume: 25 },
          { id: `${b.id}-wi-3`, name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', targetVolume: 10 },
          { id: `${b.id}-wi-4`, name: 'MAINROAD', unit: 'm', targetVolume: 250 },
          { id: `${b.id}-wi-5`, name: 'COLLECTION ROAD', unit: 'm', targetVolume: 100 },
          { id: `${b.id}-wi-6`, name: 'SALURAN PRIMER', unit: 'm³', targetVolume: 50 },
          { id: `${b.id}-wi-7`, name: 'SALURAN SEKUNDER', unit: 'm³', targetVolume: 50 },
          { id: `${b.id}-wi-8`, name: 'SALURAN TERSIER', unit: 'm³', targetVolume: 50 },
        ],
      };
    });

    // Klien: Hanya blok untuk SPK milik klien yang bersangkutan
    if (authUser && (authUser.role === 'client' || authUser.userLevel === 'Klien')) {
      const authorizedClients = this.getAuthorizedClientsForUser(authUser);
      const allowedClientIds = new Set(authorizedClients.map((c) => c.id));
      if (authUser.assignedClientId && authUser.assignedClientId !== 'all') {
        allowedClientIds.add(authUser.assignedClientId);
      }
      if (authUser.assignedClientIds) {
        authUser.assignedClientIds.forEach((id) => id && id !== 'all' && allowedClientIds.add(id));
      }

      return all.filter((b) => {
        if (!allowedClientIds.has(b.clientId)) return false;
        if (clientId && clientId !== 'ALL') return b.clientId === clientId;
        return true;
      });
    }

    // Pengawas: Hanya blok untuk 1 klien tugasnya dan terbatas pada lokasi kerja (blok-blok) tugasnya
    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : clientId;

      return all.filter((b) => {
        if (allowedClientId && allowedClientId !== 'ALL' && b.clientId !== allowedClientId) {
          return false;
        }
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          return authUser.assignedBlockCodes.some((code) => {
            const clean = (code || '').trim().toLowerCase();
            return (b.code && b.code.toLowerCase().includes(clean)) || (b.code && clean.includes(b.code.toLowerCase()));
          });
        }
        return true;
      });
    }

    if (!clientId || clientId === 'ALL') return all;
    return all.filter((b) => b.clientId === clientId);
  },

  saveBlock(block: Block): Block {
    const list = this.getBlocks();
    const cleanCode = (block.code || '').trim().toLowerCase();
    const idx = list.findIndex(
      (b) =>
        b.id === block.id ||
        (cleanCode && b.clientId === block.clientId && (b.code || '').trim().toLowerCase() === cleanCode)
    );
    const targetId = idx >= 0 ? list[idx].id : block.id;
    const finalBlock = { ...block, id: targetId };
    if (idx >= 0) list[idx] = finalBlock;
    else list.push(finalBlock);

    const { cleanList, removedDocIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.BLOCKS, list);
    removedDocIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.BLOCKS, dupId));
    saveToStorage(STORAGE_KEYS.BLOCKS, cleanList);
    syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, finalBlock);
    return finalBlock;
  },

  deleteBlock(blockId: string): boolean {
    const list = this.getBlocks();
    const filtered = list.filter((b) => b.id !== blockId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.BLOCKS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.BLOCKS, blockId);
      return true;
    }
    return false;
  },

  // Target Harian (Ha) per Hari per Lokasi Kerja (Direktur / Superadmin)
  getDailyTargets(clientId?: string, blockId?: string, date?: string): DailyLocationTarget[] {
    const all = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    return all.filter((item) => {
      if (clientId && clientId !== 'ALL' && item.clientId !== clientId) return false;
      if (blockId && blockId !== 'ALL' && item.blockId !== blockId) return false;
      if (date && item.date !== date) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  getDailyTargetById(id: string): DailyLocationTarget | undefined {
    const all = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    return all.find((t) => t.id === id);
  },

  getDailyTargetForDate(blockId: string, date: string): DailyLocationTarget | undefined {
    const all = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    return all.find((t) => t.blockId === blockId && t.date === date);
  },

  saveDailyTarget(target: DailyLocationTarget): DailyLocationTarget {
    const list = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    const idx = list.findIndex(
      (t) =>
        t.id === target.id ||
        (t.blockId === target.blockId && t.date === target.date && (t.shift || '') === (target.shift || ''))
    );
    const targetId = idx >= 0 ? list[idx].id : target.id;
    const finalTarget = { ...target, id: targetId };

    if (idx >= 0) {
      list[idx] = { ...finalTarget };
    } else {
      list.unshift({ ...finalTarget });
    }

    const { cleanList, removedDocIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.DAILY_TARGETS, list);
    removedDocIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.DAILY_TARGETS, dupId));
    saveToStorage(STORAGE_KEYS.DAILY_TARGETS, cleanList);

    // Sync baseline block.dailyTargetAreaHa if matching block
    const blocks = this.getBlocks();
    const block = blocks.find((b) => b.id === finalTarget.blockId);
    if (block) {
      block.dailyTargetAreaHa = finalTarget.dailyTargetAreaHa;
      saveToStorage(STORAGE_KEYS.BLOCKS, blocks);
      syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, block);
    }

    syncDocWrite(FIRESTORE_COLLECTIONS.DAILY_TARGETS, finalTarget);
    return finalTarget;
  },

  deleteDailyTarget(targetId: string): boolean {
    const list = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    const filtered = list.filter((t) => t.id !== targetId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.DAILY_TARGETS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.DAILY_TARGETS, targetId);
      return true;
    }
    return false;
  },

  // Helper untuk generate Nomor Penugasan standar resmi seperti No Kontrak / SPK
  generateAssignmentNumber(
    client?: Client | null,
    assignedDate?: string,
    existingAssignments: WorkAssignment[] = []
  ): string {
    const dateObj = assignedDate ? new Date(assignedDate) : new Date();
    const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
    const monthNum = isNaN(dateObj.getMonth()) ? new Date().getMonth() + 1 : dateObj.getMonth() + 1;
    const romanMonths = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];
    const romanMonth = romanMonths[monthNum - 1] || 'VIII';

    let clientCode = 'SL';
    if (client?.contractNumber) {
      const parts = client.contractNumber.split('/');
      if (parts.length >= 3) {
        clientCode = parts[2].trim().toUpperCase(); // e.g. "PTA" from "045/SPK-LC/PTA/VI/2026"
      }
    }
    if (!clientCode || clientCode === 'SL') {
      clientCode = client?.name ? client.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase().slice(0, 4) : 'PT';
    }

    // Hitung penugasan yang sudah ada untuk SPK / Klien ini untuk mendapatkan nomor urut
    const matchingCount = existingAssignments.filter(
      (a) => a.clientId === client?.id || (client?.contractNumber && a.contractNumber === client.contractNumber)
    ).length;

    const nextSeq = String(matchingCount + 1).padStart(3, '0');
    return `${nextSeq}/ST-LC/${clientCode}/${romanMonth}/${year}`;
  },

  // Work Assignments (Penugasan Kerja: Personel & Alat Berat per No SPK Klien & Blok Kerja)
  getWorkAssignments(clientId?: string, blockId?: string): WorkAssignment[] {
    const raw = loadFromStorage<WorkAssignment[]>(STORAGE_KEYS.WORK_ASSIGNMENTS, initialWorkAssignments);
    const clients = this.getClients();
    const staffList = this.getCompanyStaff();

    // Pastikan setiap penugasan memiliki assignmentNumber terisi & tersinkronisasi dengan Daftar Staff
    const all = raw.map((asg, idx) => {
      let enriched = { ...asg };
      if (!enriched.assignmentNumber) {
        const client = clients.find((c) => c.id === enriched.clientId);
        enriched.assignmentNumber = this.generateAssignmentNumber(client, enriched.assignedDate, raw.slice(0, idx));
      }

      // Sinkronisasi data Site Manager dengan Daftar Staff (Menu Identitas Perusahaan)
      if (enriched.siteManagerStaffId || enriched.siteManagerName) {
        const matchedSm = staffList.find(
          (s) =>
            (enriched.siteManagerStaffId && s.id === enriched.siteManagerStaffId) ||
            (enriched.siteManagerName && s.fullName && s.fullName.trim().toLowerCase() === enriched.siteManagerName.trim().toLowerCase())
        );
        if (matchedSm) {
          enriched.siteManagerStaffId = matchedSm.id;
          enriched.siteManagerName = matchedSm.fullName;
          enriched.siteManagerPhone = enriched.siteManagerPhone || matchedSm.phone;
        }
      }

      // Sinkronisasi data Pengawas Lapangan dengan Daftar Staff (Menu Identitas Perusahaan)
      if (enriched.supervisors && enriched.supervisors.length > 0) {
        enriched.supervisors = enriched.supervisors.map((spv) => {
          const matchedSpv = staffList.find(
            (s) =>
              (spv.staffId && s.id === spv.staffId) ||
              (spv.name && s.fullName && s.fullName.trim().toLowerCase() === spv.name.trim().toLowerCase())
          );
          if (matchedSpv) {
            return {
              ...spv,
              staffId: matchedSpv.id,
              name: matchedSpv.fullName,
              phone: spv.phone || matchedSpv.phone,
              jobRole: matchedSpv.jobRole,
              employeeIdNumber: matchedSpv.employeeIdNumber,
            };
          }
          return spv;
        });
      }

      return enriched;
    });

    return all.filter((item) => {
      if (clientId && clientId !== 'ALL' && item.clientId !== clientId) return false;
      if (blockId && blockId !== 'ALL' && item.blockId !== 'ALL' && item.blockId !== blockId) return false;
      return true;
    }).sort((a, b) => new Date(b.assignedDate || b.createdAt).getTime() - new Date(a.assignedDate || a.createdAt).getTime());
  },

  getWorkAssignmentById(id: string): WorkAssignment | undefined {
    const all = this.getWorkAssignments();
    return all.find((a) => a.id === id);
  },

  saveWorkAssignment(assignment: WorkAssignment): WorkAssignment {
    const list = this.getWorkAssignments();
    const staffList = this.getCompanyStaff();

    // Pastikan ada assignmentNumber
    let finalAssignment = { ...assignment };
    if (!finalAssignment.assignmentNumber) {
      const client = this.getClientById(finalAssignment.clientId);
      finalAssignment.assignmentNumber = this.generateAssignmentNumber(client, finalAssignment.assignedDate, list);
    }

    const asgNo = (finalAssignment.assignmentNumber || '').trim().toLowerCase();
    const idx = list.findIndex(
      (a) =>
        a.id === finalAssignment.id ||
        (asgNo && (a.assignmentNumber || '').trim().toLowerCase() === asgNo) ||
        (a.clientId === finalAssignment.clientId && a.assignedDate === finalAssignment.assignedDate && a.siteManagerStaffId === finalAssignment.siteManagerStaffId)
    );
    const targetId = idx >= 0 ? list[idx].id : finalAssignment.id;
    finalAssignment = { ...finalAssignment, id: targetId };

    // 1. Hubungkan & sinkronkan Site Manager dengan Daftar Staff (Identitas Perusahaan)
    if (finalAssignment.siteManagerStaffId || finalAssignment.siteManagerName) {
      const matchedSm = staffList.find(
        (s) =>
          (finalAssignment.siteManagerStaffId && s.id === finalAssignment.siteManagerStaffId) ||
          (finalAssignment.siteManagerName &&
            s.fullName &&
            s.fullName.trim().toLowerCase() === finalAssignment.siteManagerName.trim().toLowerCase())
      );
      if (matchedSm) {
        finalAssignment.siteManagerStaffId = matchedSm.id;
        finalAssignment.siteManagerName = matchedSm.fullName;
        finalAssignment.siteManagerPhone = finalAssignment.siteManagerPhone?.trim() || matchedSm.phone;

        // Jika nomor telepon Site Manager diubah pada form penugasan, update juga di Daftar Staff
        if (finalAssignment.siteManagerPhone && finalAssignment.siteManagerPhone !== matchedSm.phone) {
          this.saveCompanyStaff({
            ...matchedSm,
            phone: finalAssignment.siteManagerPhone,
          });
        }
      }
    }

    // 2. Hubungkan & sinkronkan Pengawas Lapangan dengan Daftar Staff (Identitas Perusahaan)
    if (finalAssignment.supervisors && finalAssignment.supervisors.length > 0) {
      finalAssignment.supervisors = finalAssignment.supervisors.map((spv) => {
        const matchedSpv = this.getCompanyStaff().find(
          (s) =>
            (spv.staffId && s.id === spv.staffId) ||
            (spv.name && s.fullName && s.fullName.trim().toLowerCase() === spv.name.trim().toLowerCase())
        );
        if (matchedSpv) {
          const syncedPhone = spv.phone?.trim() || matchedSpv.phone;
          const syncedBlockCodes =
            spv.coverageType === 'ALL'
              ? ['Akses Semua Blok (Tanpa Batas)']
              : spv.assignedBlockCodes && spv.assignedBlockCodes.length > 0
              ? spv.assignedBlockCodes
              : matchedSpv.assignedBlockCodes;

          // Update penempatan proyek SPK, cakupan blok, dan no WA pada Daftar Staff & Akun Login Pengawas
          this.saveCompanyStaff({
            ...matchedSpv,
            phone: syncedPhone,
            assignedClientId: finalAssignment.clientId,
            assignedClientName: finalAssignment.clientName,
            assignedBlockCodes: syncedBlockCodes,
          });

          return {
            ...spv,
            staffId: matchedSpv.id,
            name: matchedSpv.fullName,
            phone: syncedPhone,
            jobRole: matchedSpv.jobRole,
            employeeIdNumber: matchedSpv.employeeIdNumber,
          };
        }
        return spv;
      });
    }

    if (idx >= 0) {
      list[idx] = finalAssignment;
    } else {
      list.unshift(finalAssignment);
    }
    const { cleanList: dedupAssignments, removedDocIds: asgRemovedIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, list);
    asgRemovedIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, dupId));
    saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, dedupAssignments);

    // 3. Sync to Worker records (Tim Pendukung)
    const workers = this.getWorkers();
    let workersChanged = false;
    if (finalAssignment.supportTeam && finalAssignment.supportTeam.length > 0) {
      finalAssignment.supportTeam.forEach((sup) => {
        const wIdx = workers.findIndex(
          (w) =>
            (sup.workerId && w.id === sup.workerId) ||
            (sup.workerName && w.name.trim().toLowerCase() === sup.workerName.trim().toLowerCase())
        );
        if (wIdx >= 0) {
          workers[wIdx].assignedClientId = finalAssignment.clientId;
          if (sup.equipmentId) {
            workers[wIdx].assignedEquipmentId = sup.equipmentId;
          }
          syncDocWrite(FIRESTORE_COLLECTIONS.WORKERS, workers[wIdx]);
          workersChanged = true;
        }
      });
    } else if (finalAssignment.workerId) {
      const wIdx = workers.findIndex((w) => w.id === finalAssignment.workerId);
      if (wIdx >= 0) {
        workers[wIdx].assignedClientId = finalAssignment.clientId;
        workers[wIdx].assignedBlockId = finalAssignment.blockId;
        if (finalAssignment.equipmentId) {
          workers[wIdx].assignedEquipmentId = finalAssignment.equipmentId;
        }
        syncDocWrite(FIRESTORE_COLLECTIONS.WORKERS, workers[wIdx]);
        workersChanged = true;
      }
    }
    if (workersChanged) {
      saveToStorage(STORAGE_KEYS.WORKERS, workers);
    }

    syncDocWrite(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, finalAssignment);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
    }
    return finalAssignment;
  },

  deleteWorkAssignment(id: string): boolean {
    const list = loadFromStorage<WorkAssignment[]>(STORAGE_KEYS.WORK_ASSIGNMENTS, initialWorkAssignments);
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, id);
      return true;
    }
    return false;
  },

  // Inventory
  getInventory(): InventoryItem[] {
    return loadFromStorage<InventoryItem[]>(STORAGE_KEYS.INVENTORY, initialInventory);
  },

  saveInventory(item: InventoryItem): void {
    const list = this.getInventory();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) list[idx] = item;
    else list.push(item);
    saveToStorage(STORAGE_KEYS.INVENTORY, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.INVENTORY, item);
  },

  // Clients & Projects CRUD
  getClients(): Client[] {
    const rawClients = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const rawUsers = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);

    return rawClients.map((c) => {
      const cUserLower = (c.username || '').trim().toLowerCase();
      const matchedUser = rawUsers.find(
        (u) =>
          u.userLevel === 'Klien' &&
          ((c.linkedUserId && u.id === c.linkedUserId) ||
            (cUserLower && u.username && u.username.trim().toLowerCase() === cUserLower) ||
            u.assignedClientId === c.id ||
            (u.assignedClientIds && u.assignedClientIds.includes(c.id)) ||
            (c.contractNumber && u.assignedContractNumbers && u.assignedContractNumbers.includes(c.contractNumber)))
      );

      if (matchedUser) {
        return {
          ...c,
          username: c.username || matchedUser.username,
          password: c.password || matchedUser.password,
          userLevel: 'Klien',
          linkedUserId: c.linkedUserId || matchedUser.id,
        };
      }
      return {
        ...c,
        userLevel: c.username ? 'Klien' : c.userLevel,
      };
    });
  },

  getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  },

  saveClient(client: Client): Client {
    const list = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const cleanContract = (client.contractNumber || '').trim().toLowerCase();
    const cleanName = (client.name || '').trim().toLowerCase();
    const idx = list.findIndex(
      (c) =>
        c.id === client.id ||
        (cleanContract && (c.contractNumber || '').trim().toLowerCase() === cleanContract) ||
        (cleanName && (c.name || '').trim().toLowerCase() === cleanName)
    );
    const targetId = idx >= 0 ? list[idx].id : client.id;
    const payload: Client = {
      ...client,
      id: targetId,
      userLevel: 'Klien',
    };

    if (idx >= 0) {
      list[idx] = payload;
    } else {
      list.push(payload);
    }

    // Auto-synchronize Kredensial Login Akun Resmi Klien (1 Klien bisa punya banyak SPK dalam 1 akun akses)
    if (payload.username && payload.password) {
      const cleanUsername = payload.username.trim().toLowerCase();
      const cleanPassword = payload.password;
      const users = this.getManagedUsers();

      // Cari akun Klien yang sudah ada dengan username ini atau linkedUserId ini
      const existingUser = users.find(
        (u) =>
          (payload.linkedUserId && u.id === payload.linkedUserId) ||
          (u.username && u.username.trim().toLowerCase() === cleanUsername)
      );

      const userId = existingUser?.id || payload.linkedUserId || `user-klien-${Date.now()}`;
      payload.linkedUserId = userId;

      // Kumpulkan seluruh SPK (Client record) yang dimiliki oleh akun Klien ini
      // (Baik yang memiliki username sama, linkedUserId sama, atau perusahaan yang sama dengan username ini)
      const matchingSpkClients = list.filter((c) => {
        if (c.id === payload.id) return true;
        if (c.username && c.username.trim().toLowerCase() === cleanUsername) return true;
        if (c.linkedUserId && c.linkedUserId === userId) return true;
        if (existingUser?.assignedClientIds && existingUser.assignedClientIds.includes(c.id)) return true;
        if (existingUser?.assignedClientId === c.id) return true;
        return false;
      });

      // Pastikan semua SPK milik akun klien ini tersinkronisasi kredensialnya
      matchingSpkClients.forEach((mc) => {
        const mIdx = list.findIndex((item) => item.id === mc.id);
        if (mIdx >= 0) {
          list[mIdx] = {
            ...list[mIdx],
            username: cleanUsername,
            password: cleanPassword,
            userLevel: 'Klien',
            linkedUserId: userId,
          };
          syncDocWrite(FIRESTORE_COLLECTIONS.CLIENTS, list[mIdx]);
        }
      });

      const allAssignedClientIds = Array.from(new Set(matchingSpkClients.map((c) => c.id)));
      const allAssignedContractNumbers = Array.from(
        new Set(matchingSpkClients.map((c) => c.contractNumber).filter(Boolean))
      );

      const allBlocks = loadFromStorage<Block[]>(STORAGE_KEYS.BLOCKS, initialBlocks);
      const clientBlockCodes = allBlocks
        .filter((b) => allAssignedClientIds.includes(b.clientId))
        .map((b) => b.code);

      const userPayload: ManagedUser = {
        id: userId,
        fullName: payload.contactPerson
          ? `${payload.contactPerson} (${payload.name})`
          : `${payload.fullCompanyName || payload.name}`,
        address: payload.address || payload.location || existingUser?.address || '-',
        whatsappNumber: payload.phone || existingUser?.whatsappNumber || '-',
        email: payload.email || existingUser?.email || '-',
        jobTitle: 'Klien / Pemilik Proyek (Monitoring Progress & Laporan)',
        userLevel: 'Klien', // Terkunci otomatis di Klien
        username: cleanUsername,
        password: cleanPassword,
        signatureUrl: existingUser?.signatureUrl,
        employeeIdNumber: existingUser?.employeeIdNumber || `KLN-${String(allAssignedClientIds.length).padStart(3, '0')}`,
        assignedClientId: allAssignedClientIds[0] || payload.id,
        assignedClientIds: allAssignedClientIds,
        assignedContractNumbers: allAssignedContractNumbers,
        assignedClientName:
          allAssignedContractNumbers.length > 1
            ? `${payload.name} - ${payload.fullCompanyName} (${allAssignedContractNumbers.length} SPK)`
            : `${payload.name} - ${payload.fullCompanyName}`,
        assignedBlockCodes:
          clientBlockCodes.length > 0
            ? clientBlockCodes
            : existingUser?.assignedBlockCodes && existingUser.assignedBlockCodes.length > 0
            ? existingUser.assignedBlockCodes
            : ['Blok Sesuai SPK Klien'],
        status: 'Aktif',
        createdAt: existingUser?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: `Akun Resmi Klien (${allAssignedContractNumbers.join(', ')}) • Level Akses Terkunci: Klien (Monitoring Progress & Laporan)`,
      };

      this.saveManagedUser(userPayload);
    }

    const { cleanList: dedupClients, removedDocIds: clientRemovedIds } = deduplicateCollectionItems(FIRESTORE_COLLECTIONS.CLIENTS, list);
    clientRemovedIds.forEach((dupId) => syncDocDelete(FIRESTORE_COLLECTIONS.CLIENTS, dupId));
    saveToStorage(STORAGE_KEYS.CLIENTS, dedupClients);
    syncDocWrite(FIRESTORE_COLLECTIONS.CLIENTS, payload);

    // Also auto-create a project if not existing
    const projects = this.getProjects();
    if (!projects.some((p) => p.clientId === payload.id)) {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        clientId: payload.id,
        name: payload.projectName || `Land Clearing ${payload.name}`,
        location: payload.location || payload.address || 'Riau',
        method: 'Zero Burning Method (Metode Tanpa Bakar)',
        totalTargetHa: payload.totalAreaHa || 100,
        startDate: new Date().toISOString().slice(0, 10),
        targetCompletionDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      };
      projects.push(newProj);
      saveToStorage(STORAGE_KEYS.PROJECTS, projects);
      syncDocWrite(FIRESTORE_COLLECTIONS.PROJECTS, newProj);
    }

    return payload;
  },

  deleteClient(clientId: string): boolean {
    const list = this.getClients();
    const filtered = list.filter((c) => c.id !== clientId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.CLIENTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.CLIENTS, clientId);
      return true;
    }
    return false;
  },

  getProjects(): Project[] {
    return loadFromStorage<Project[]>(STORAGE_KEYS.PROJECTS, initialProjects);
  },

  saveProject(project: Project): Project {
    const list = this.getProjects();
    const idx = list.findIndex((p) => p.id === project.id);
    if (idx >= 0) list[idx] = project;
    else list.push(project);
    saveToStorage(STORAGE_KEYS.PROJECTS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.PROJECTS, project);
    return project;
  },

  // Draft Wizard persistence
  getDraft(): Partial<DailyReport> | null {
    return loadFromStorage<Partial<DailyReport> | null>(STORAGE_KEYS.DRAFT_REPORT, null);
  },

  saveDraft(draft: Partial<DailyReport>): void {
    saveToStorage(STORAGE_KEYS.DRAFT_REPORT, draft);
  },

  clearDraft(): void {
    try {
      localStorage.removeItem(STORAGE_KEYS.DRAFT_REPORT);
    } catch {
      // ignore
    }
  },

  // Multi-Client Dashboard Aggregation Engine
  getExecutiveDashboardMetrics(selectedClientId?: string) {
    const allReports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const allBlocks = this.getBlocks();
    const equipments = this.getEquipments();
    const clients = this.getClients();

    const isFiltered = selectedClientId && selectedClientId !== 'ALL';
    const activeClient = isFiltered ? clients.find((c) => c.id === selectedClientId) : null;

    const reports = isFiltered ? allReports.filter((r) => r.clientId === selectedClientId) : allReports;
    const blocks = isFiltered ? allBlocks.filter((b) => b.clientId === selectedClientId) : allBlocks;

    // Target vs Realized Physical Area
    const targetAreaTotal = blocks.length > 0 
      ? blocks.reduce((acc, b) => acc + b.targetAreaHa, 0)
      : (activeClient?.totalAreaHa || 100);

    const cumulativeClearedHa = blocks.length > 0
      ? blocks.reduce((acc, b) => acc + b.clearedAreaHa, 0)
      : (reports[0]?.physicalProgress.cumulativeAreaHa || 0);

    const progressPercent = targetAreaTotal > 0 ? (cumulativeClearedHa / targetAreaTotal) * 100 : 0;

    // Total Effective Hours & Downtime across reports
    let totalEffectiveHours = 0;
    let totalWeatherDowntime = 0;
    let totalBreakdownDowntime = 0;
    let totalOtherDowntime = 0;
    let totalFuelConsumed = 0;
    let totalFuelHours = 0;

    const alertIncidents: Array<{
      date: string;
      clientName?: string;
      equipmentId: string;
      fuelRatio: number;
      standardLimit: number;
      note?: string;
    }> = [];

    reports.forEach((rep) => {
      rep.equipmentWorkLogs.forEach((log) => {
        totalEffectiveHours += log.effectiveWorkHours;
        totalWeatherDowntime += log.downtimeWeatherHours;
        totalBreakdownDowntime += log.downtimeBreakdownHours;
        totalOtherDowntime += log.downtimeOtherHours;

        if (log.effectiveWorkHours > 0 && log.fuelAddedLiters > 0) {
          totalFuelConsumed += log.fuelAddedLiters;
          totalFuelHours += log.effectiveWorkHours;
        }

        if (log.isFuelAlert) {
          alertIncidents.push({
            date: rep.date,
            clientName: rep.clientName,
            equipmentId: log.equipmentId,
            fuelRatio: log.fuelRatio,
            standardLimit: log.fuelStandardLimit,
            note: log.downtimeBreakdownNote || `Konsumsi BBM ${log.fuelRatio.toFixed(1)} L/HM melebihi standar ${log.fuelStandardLimit.toFixed(1)} L/HM`,
          });
        }
      });
    });

    const totalOperatingHours = totalEffectiveHours + totalWeatherDowntime + totalBreakdownDowntime + totalOtherDowntime;
    const effectiveHoursPercentage = totalOperatingHours > 0 ? (totalEffectiveHours / totalOperatingHours) * 100 : 0;
    const avgFuelEfficiency = totalFuelHours > 0 ? totalFuelConsumed / totalFuelHours : 17.2;

    return {
      activeClient,
      totalClients: clients.length,
      targetAreaTotal,
      cumulativeClearedHa,
      progressPercent,
      totalEffectiveHours,
      totalWeatherDowntime,
      totalBreakdownDowntime,
      totalOtherDowntime,
      totalDowntime: totalWeatherDowntime + totalBreakdownDowntime + totalOtherDowntime,
      effectiveHoursPercentage,
      avgFuelEfficiency,
      alertIncidents,
      equipmentCount: equipments.length,
      operationalEquipmentCount: equipments.filter((e) => e.status === 'Operasional').length,
    };
  },

  // Tren Rasio Konsumsi BBM (Liter/Ha) Mingguan untuk Dashboard Eksekutif Direktur
  getWeeklyFuelTrends(selectedClientId?: string): WeeklyFuelTrend[] {
    const allReports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const isFiltered = selectedClientId && selectedClientId !== 'ALL';
    const reports = isFiltered ? allReports.filter((r) => r.clientId === selectedClientId) : allReports;

    // Current week reports (e.g. 19-25 Sep 2026)
    let currentWeekRealizedHa = 0;
    let currentWeekFuelLiters = 0;
    let currentWeekHm = 0;

    reports.forEach((rep) => {
      if (rep.physicalProgress?.realizedAreaHa) {
        currentWeekRealizedHa += rep.physicalProgress.realizedAreaHa;
      }
      if (rep.logistics?.fuelTankUsedLiters) {
        currentWeekFuelLiters += rep.logistics.fuelTankUsedLiters;
      } else {
        rep.equipmentWorkLogs?.forEach((log) => {
          if (log.fuelAddedLiters) currentWeekFuelLiters += log.fuelAddedLiters;
        });
      }
      rep.equipmentWorkLogs?.forEach((log) => {
        if (log.effectiveWorkHours) currentWeekHm += log.effectiveWorkHours;
      });
    });

    // Default benchmark Direktur untuk metode Zero Burning mekanis (L/Ha)
    const defaultBenchmark = selectedClientId === 'client-3' ? 440 : (selectedClientId === 'client-2' ? 410 : 420);

    const baseWeeks = [
      {
        weekId: 'W31',
        weekNumber: 1,
        weekLabel: 'Minggu 1 (01 - 07 Ags)',
        shortLabel: 'W1 Ags',
        dateRange: '01 Ags - 07 Ags 2026',
        month: 'Agustus 2026',
        client1: { ha: 18.2, fuel: 7280, hm: 364, notes: 'Rabas rintisan awal semak belukar' },
        client2: null,
        client3: null,
      },
      {
        weekId: 'W32',
        weekNumber: 2,
        weekLabel: 'Minggu 2 (08 - 14 Ags)',
        shortLabel: 'W2 Ags',
        dateRange: '08 Ags - 14 Ags 2026',
        month: 'Agustus 2026',
        client1: { ha: 22.0, fuel: 8910, hm: 440, notes: 'Lahan datar, imas & perumpukan mekanis normal' },
        client2: null,
        client3: null,
      },
      {
        weekId: 'W33',
        weekNumber: 3,
        weekLabel: 'Minggu 3 (15 - 21 Ags)',
        shortLabel: 'W3 Ags',
        dateRange: '15 Ags - 21 Ags 2026',
        month: 'Agustus 2026',
        client1: { ha: 24.5, fuel: 9800, hm: 490, notes: 'Produktivitas puncak, jalur tanam rapi' },
        client2: { ha: 12.0, fuel: 4920, hm: 240, notes: 'Mobilisasi unit dan pembersihan perbatasan Siak' },
        client3: null,
      },
      {
        weekId: 'W34',
        weekNumber: 4,
        weekLabel: 'Minggu 4 (22 - 28 Ags)',
        shortLabel: 'W4 Ags',
        dateRange: '22 Ags - 28 Ags 2026',
        month: 'Agustus 2026',
        client1: { ha: 20.0, fuel: 8500, hm: 410, notes: 'Hujan rintik sore, tanah sedikit lembek' },
        client2: { ha: 18.5, fuel: 7490, hm: 370, notes: 'Rabas kayu semak tanah mineral kering' },
        client3: null,
      },
      {
        weekId: 'W35',
        weekNumber: 5,
        weekLabel: 'Minggu 5 (29 Ags - 04 Sep)',
        shortLabel: 'W5 Sep',
        dateRange: '29 Ags - 04 Sep 2026',
        month: 'September 2026',
        client1: { ha: 23.5, fuel: 9280, hm: 470, notes: 'Penyelesaian jalur rintisan sekunder, ritme efisien' },
        client2: { ha: 21.0, fuel: 8400, hm: 420, notes: 'Pembentukan rumpukan mekanis zero burning' },
        client3: { ha: 14.0, fuel: 6160, hm: 280, notes: 'Mulai rintisan Inhu, tanah gambut dangkal' },
      },
      {
        weekId: 'W36',
        weekNumber: 6,
        weekLabel: 'Minggu 6 (05 - 11 Sep)',
        shortLabel: 'W6 Sep',
        dateRange: '05 Sep - 11 Sep 2026',
        month: 'September 2026',
        client1: { ha: 25.0, fuel: 9950, hm: 500, notes: 'Kombinasi optimal unit excavator & dozer' },
        client2: { ha: 22.5, fuel: 8880, hm: 450, notes: 'Pembersihan tunggul kayu sedang' },
        client3: { ha: 18.0, fuel: 7740, hm: 360, notes: 'Pemotongan kayu lapuk & perataan jalur' },
      },
      {
        weekId: 'W37',
        weekNumber: 7,
        weekLabel: 'Minggu 7 (12 - 18 Sep)',
        shortLabel: 'W7 Sep',
        dateRange: '12 Sep - 18 Sep 2026',
        month: 'September 2026',
        client1: { ha: 21.0, fuel: 9135, hm: 420, notes: 'Hujan lebat 3 hari, traksi dozer berat (Rasio naik)' },
        client2: { ha: 19.0, fuel: 7980, hm: 380, notes: 'Perataan dan pembersihan jalur rintis penghubung' },
        client3: { ha: 16.5, fuel: 7425, hm: 330, notes: 'Kondisi gambut berair, konsumsi solar meningkat' },
      },
      {
        weekId: 'W38',
        weekNumber: 8,
        weekLabel: 'Minggu 8 (19 - 25 Sep)',
        shortLabel: 'W8 Sep (Aktif)',
        dateRange: '19 Sep - 25 Sep 2026',
        month: 'September 2026',
        client1: { 
          ha: 19.0 + (isFiltered && selectedClientId === 'client-1' ? currentWeekRealizedHa : 3.8), 
          fuel: 7500 + (isFiltered && selectedClientId === 'client-1' ? currentWeekFuelLiters : 266), 
          hm: 380 + (isFiltered && selectedClientId === 'client-1' ? currentWeekHm : 20.5), 
          notes: 'Progres minggu berjalan Blok AB, rasio hemat terkendali' 
        },
        client2: { 
          ha: 17.0 + (isFiltered && selectedClientId === 'client-2' ? currentWeekRealizedHa : 3.6), 
          fuel: 6700 + (isFiltered && selectedClientId === 'client-2' ? currentWeekFuelLiters : 120), 
          hm: 340 + (isFiltered && selectedClientId === 'client-2' ? currentWeekHm : 7.5), 
          notes: 'Cuaca mendukung, produktivitas tinggi di Siak' 
        },
        client3: { 
          ha: 14.5 + (isFiltered && selectedClientId === 'client-3' ? currentWeekRealizedHa : 4.2), 
          fuel: 6300 + (isFiltered && selectedClientId === 'client-3' ? currentWeekFuelLiters : 165), 
          hm: 290 + (isFiltered && selectedClientId === 'client-3' ? currentWeekHm : 7.5), 
          notes: 'Rumpuk mekanis blok D-Alpha Inhu berjalan sesuai jadwal' 
        },
      },
    ];

    return baseWeeks
      .map((w) => {
        let totalHa = 0;
        let totalFuel = 0;
        let totalHm = 0;
        let note = '';

        if (selectedClientId === 'client-1') {
          if (!w.client1) return null;
          totalHa = w.client1.ha;
          totalFuel = w.client1.fuel;
          totalHm = w.client1.hm;
          note = w.client1.notes;
        } else if (selectedClientId === 'client-2') {
          if (!w.client2) return null;
          totalHa = w.client2.ha;
          totalFuel = w.client2.fuel;
          totalHm = w.client2.hm;
          note = w.client2.notes;
        } else if (selectedClientId === 'client-3') {
          if (!w.client3) return null;
          totalHa = w.client3.ha;
          totalFuel = w.client3.fuel;
          totalHm = w.client3.hm;
          note = w.client3.notes;
        } else {
          // Consolidated ("ALL")
          if (w.client1) { totalHa += w.client1.ha; totalFuel += w.client1.fuel; totalHm += w.client1.hm; }
          if (w.client2) { totalHa += w.client2.ha; totalFuel += w.client2.fuel; totalHm += w.client2.hm; }
          if (w.client3) { totalHa += w.client3.ha; totalFuel += w.client3.fuel; totalHm += w.client3.hm; }
          note = w.weekNumber === 8 
            ? 'Konsolidasi 3 klien aktif di Riau. Realisasi minggu berjalan stabil.'
            : (w.weekNumber === 7 ? 'Penurunan efisiensi akibat cuaca ekstrem di Riau' : 'Operasional mekanis terkendali di bawah batas');
        }

        if (totalHa === 0) return null;

        const fuelRatioPerHa = Number((totalFuel / totalHa).toFixed(1));
        const efficiencyVariance = Number((fuelRatioPerHa - defaultBenchmark).toFixed(1));
        const variancePercent = Number(((efficiencyVariance / defaultBenchmark) * 100).toFixed(1));

        let status: 'Sangat Efisien' | 'Optimal' | 'Mendekati Batas' | 'Over Benchmark' = 'Optimal';
        if (fuelRatioPerHa < defaultBenchmark - 15) status = 'Sangat Efisien';
        else if (fuelRatioPerHa <= defaultBenchmark) status = 'Optimal';
        else if (fuelRatioPerHa <= defaultBenchmark + 10) status = 'Mendekati Batas';
        else status = 'Over Benchmark';

        return {
          weekId: w.weekId,
          weekNumber: w.weekNumber,
          weekLabel: w.weekLabel,
          shortLabel: w.shortLabel,
          dateRange: w.dateRange,
          month: w.month,
          totalFuelLiters: Math.round(totalFuel),
          totalClearedHa: Number(totalHa.toFixed(1)),
          fuelRatioPerHa,
          benchmarkLimit: defaultBenchmark,
          efficiencyVariance,
          variancePercent,
          totalHm: Math.round(totalHm),
          status,
          notes: note,
        };
      })
      .filter((item): item is WeeklyFuelTrend => item !== null);
  },

  // Logistics Inventory & Transactions
  getLogisticsTransactions(selectedClientId?: string, authUser?: AuthUser | null): LogisticsTransaction[] {
    const list = loadFromStorage<LogisticsTransaction[]>(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, initialLogisticsTransactions);

    // Pengawas: Hanya transaksi untuk 1 klien tugasnya dan blok-blok tugasnya
    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return list.filter((t) => {
        if (allowedClientId && allowedClientId !== 'ALL' && t.clientId && t.clientId !== allowedClientId && t.clientId !== 'ALL') {
          return false;
        }
        if (
          t.blockCode &&
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = b.trim().toLowerCase();
            return t.blockCode?.toLowerCase().includes(bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((t) => !t.clientId || t.clientId === selectedClientId || t.clientId === 'ALL');
  },

  saveLogisticsTransaction(tx: LogisticsTransaction, authUser?: AuthUser | null): LogisticsTransaction {
    // Isolasi ketat: Pengawas tidak dapat CRUD logistik di luar penugasan proyek
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(tx.clientId, tx.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Transaksi logistik hanya dapat dicatat untuk proyek ${authUser.assignedClientName || authUser.assignedClientId} di lokasi (${authUser.assignedBlockCodes?.join(', ')})!`
        );
      }
    }

    const list = this.getLogisticsTransactions();
    const idx = list.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.LOGISTICS, tx);

    // If it is an outflow (pemakaian langsung diinput oleh pengawas), update inventory stock
    if (tx.type === 'out') {
      const invList = this.getInventory();
      const txNameLower = (tx.itemName || '').trim().toLowerCase();
      const match = invList.find((i) => (i.name && txNameLower && i.name.trim().toLowerCase() === txNameLower) || i.category === tx.category);
      if (match) {
        match.stockQuantity = Math.max(0, match.stockQuantity - tx.quantity);
        this.saveInventory(match);
      }
    }

    return tx;
  },

  approveLogisticsInflow(txId: string, approverName: string, approverRole: 'director' | 'manager' = 'director'): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'in') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    tx.approvalStatus = 'approved';
    tx.approvedByDirectorName = approverName;
    tx.approvedByRole = approverRole;
    tx.approvedAt = formatted;
    tx.rejectionReason = undefined;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.LOGISTICS, tx);

    // Add to actual inventory stock once verified & approved
    const invList = this.getInventory();
    const txNameLower = (tx.itemName || '').trim().toLowerCase();
    const match = invList.find((i) => (i.name && txNameLower && i.name.trim().toLowerCase() === txNameLower) || i.category === tx.category);
    if (match) {
      match.stockQuantity = match.stockQuantity + tx.quantity;
      this.saveInventory(match);
    }

    return tx;
  },

  rejectLogisticsInflow(txId: string, approverName: string, rejectionReason: string, approverRole: 'director' | 'manager' = 'director'): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'in') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    tx.approvalStatus = 'rejected';
    tx.approvedByDirectorName = approverName;
    tx.approvedByRole = approverRole;
    tx.approvedAt = formatted;
    tx.rejectionReason = rejectionReason;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.LOGISTICS, tx);
    return tx;
  },

  approveLogisticsOutflow(txId: string, approverName: string, approverRole: 'director' | 'manager' = 'manager'): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'out') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const wasPending = tx.approvalStatus === 'pending' || tx.approvalStatus === 'rejected';
    tx.approvalStatus = 'approved';
    tx.approvedByDirectorName = approverName;
    tx.approvedByRole = approverRole;
    tx.approvedAt = formatted;
    tx.rejectionReason = undefined;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.LOGISTICS, tx);

    // If it was previously pending or rejected and inventory wasn't deducted yet:
    if (wasPending) {
      const invList = this.getInventory();
      const txNameLower = (tx.itemName || '').trim().toLowerCase();
      const match = invList.find((i) => (i.name && txNameLower && i.name.trim().toLowerCase() === txNameLower) || i.category === tx.category);
      if (match) {
        match.stockQuantity = Math.max(0, match.stockQuantity - tx.quantity);
        this.saveInventory(match);
      }
    }

    return tx;
  },

  rejectLogisticsOutflow(txId: string, approverName: string, rejectionReason: string, approverRole: 'director' | 'manager' = 'manager'): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'out') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const wasApproved = tx.approvalStatus === 'approved';
    tx.approvalStatus = 'rejected';
    tx.approvedByDirectorName = approverName;
    tx.approvedByRole = approverRole;
    tx.approvedAt = formatted;
    tx.rejectionReason = rejectionReason;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.LOGISTICS, tx);

    // If it was already approved and deducted from inventory, restore the stock!
    if (wasApproved) {
      const invList = this.getInventory();
      const txNameLower = (tx.itemName || '').trim().toLowerCase();
      const match = invList.find((i) => (i.name && txNameLower && i.name.trim().toLowerCase() === txNameLower) || i.category === tx.category);
      if (match) {
        match.stockQuantity = match.stockQuantity + tx.quantity;
        this.saveInventory(match);
      }
    }

    return tx;
  },

  deleteLogisticsTransaction(txId: string, authUser?: AuthUser | null): boolean {
    const list = this.getLogisticsTransactions();
    const target = list.find((t) => t.id === txId);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((t) => t.id !== txId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.LOGISTICS, txId);
      return true;
    }
    return false;
  },

  // 1. P2H Checklists (Pemeriksaan Pra-Operasi)
  getP2HChecklists(selectedClientId?: string, authUser?: AuthUser | null): DailyP2HChecklist[] {
    const list = loadFromStorage<DailyP2HChecklist[]>(STORAGE_KEYS.P2H_CHECKLISTS, initialP2HChecklists as unknown as DailyP2HChecklist[]);

    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return list.filter((item) => {
        if (allowedClientId && allowedClientId !== 'ALL' && item.clientId !== allowedClientId) {
          return false;
        }
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = b.trim().toLowerCase();
            return item.blockCode.toLowerCase().includes(bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveP2HChecklist(item: DailyP2HChecklist, authUser?: AuthUser | null): DailyP2HChecklist {
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(item.clientId, item.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: P2H hanya dapat dicatat untuk penugasan ${authUser.assignedClientName || item.clientId} di lokasi tugas Anda!`
        );
      }
    }

    const list = this.getP2HChecklists();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.P2H, item);
    return item;
  },

  deleteP2HChecklist(id: string, authUser?: AuthUser | null): boolean {
    const list = loadFromStorage<DailyP2HChecklist[]>(STORAGE_KEYS.P2H_CHECKLISTS, initialP2HChecklists as unknown as DailyP2HChecklist[]);
    const target = list.find((i) => i.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      const isClientMatch = !authUser.assignedClientId || authUser.assignedClientId === 'all' || authUser.assignedClientId === target.clientId;
      if (!isClientMatch && !this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((i) => i.id !== id);
    saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.P2H, id);
    return true;
  },

  // 4. Fuel Bowser Field Receipts
  getFuelBowserReceipts(selectedClientId?: string, authUser?: AuthUser | null): FuelBowserReceipt[] {
    const list = loadFromStorage<FuelBowserReceipt[]>(STORAGE_KEYS.FUEL_BOWSER, initialFuelBowserReceipts as unknown as FuelBowserReceipt[]);

    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return list.filter((item) => {
        if (allowedClientId && allowedClientId !== 'ALL' && item.clientId !== allowedClientId) {
          return false;
        }
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = b.trim().toLowerCase();
            return item.blockCode.toLowerCase().includes(bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveFuelBowserReceipt(receipt: FuelBowserReceipt, authUser?: AuthUser | null): FuelBowserReceipt {
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(receipt.clientId, receipt.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Penerimaan solar bowser hanya untuk penugasan ${authUser.assignedClientName || receipt.clientId} di lokasi tugas Anda!`
        );
      }
    }

    const list = this.getFuelBowserReceipts();
    const idx = list.findIndex((r) => r.id === receipt.id);
    if (idx >= 0) {
      list[idx] = receipt;
    } else {
      list.unshift(receipt);
    }
    saveToStorage(STORAGE_KEYS.FUEL_BOWSER, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.BOWSER, receipt);

    // Also auto-record into Logistics Transaction Outflow so fuel tracking is unified
    const logisticsTx: LogisticsTransaction = {
      id: `TX-${receipt.id}`,
      date: receipt.date,
      timestamp: `${receipt.time}:00`,
      category: 'BBM',
      itemName: 'Solar Industri B50',
      quantity: receipt.totalLitersFilled,
      unit: 'Liter',
      type: 'out',
      clientId: receipt.clientId,
      clientName: receipt.clientName,
      blockCode: receipt.blockCode,
      purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
      equipmentId: receipt.equipmentId,
      equipmentName: receipt.equipmentName,
      equipmentHmAtUsage: receipt.equipmentHmAtRefuel,
      submittedByRole: 'supervisor',
      submittedByName: receipt.supervisorName,
      approvalStatus: 'approved',
      notes: `Pengisian dari Truk Bowser ${receipt.bowserTruckId}. Segel: ${receipt.sealNumber}. Flowmeter: ${receipt.flowmeterStart} - ${receipt.flowmeterEnd}. Supir: ${receipt.bowserDriverName}`,
    };
    this.saveLogisticsTransaction(logisticsTx, authUser);

    return receipt;
  },

  deleteFuelBowserReceipt(id: string, authUser?: AuthUser | null): boolean {
    const list = loadFromStorage<FuelBowserReceipt[]>(STORAGE_KEYS.FUEL_BOWSER, initialFuelBowserReceipts as unknown as FuelBowserReceipt[]);
    const target = list.find((r) => r.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      const isClientMatch = !authUser.assignedClientId || authUser.assignedClientId === 'all' || authUser.assignedClientId === target.clientId;
      if (!isClientMatch && !this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((r) => r.id !== id);
    saveToStorage(STORAGE_KEYS.FUEL_BOWSER, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.BOWSER, id);
    return true;
  },

  // 5. Soil & Safety Hazard Incidents
  getSoilIncidents(selectedClientId?: string, authUser?: AuthUser | null): SoilHazardIncident[] {
    const list = loadFromStorage<SoilHazardIncident[]>(STORAGE_KEYS.SOIL_INCIDENTS, initialSoilIncidents as unknown as SoilHazardIncident[]);

    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return list.filter((item) => {
        if (allowedClientId && allowedClientId !== 'ALL' && item.clientId !== allowedClientId) {
          return false;
        }
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = b.trim().toLowerCase();
            return item.blockCode.toLowerCase().includes(bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveSoilIncident(incident: SoilHazardIncident, authUser?: AuthUser | null): SoilHazardIncident {
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(incident.clientId, incident.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Insiden lahan hanya untuk penugasan ${authUser.assignedClientName || incident.clientId} di lokasi tugas Anda!`
        );
      }
    }

    const list = this.getSoilIncidents();
    const idx = list.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      list[idx] = incident;
    } else {
      list.unshift(incident);
    }
    saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.SOIL, incident);
    return incident;
  },

  deleteSoilIncident(id: string, authUser?: AuthUser | null): boolean {
    const list = loadFromStorage<SoilHazardIncident[]>(STORAGE_KEYS.SOIL_INCIDENTS, initialSoilIncidents as unknown as SoilHazardIncident[]);
    const target = list.find((i) => i.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      const isClientMatch = !authUser.assignedClientId || authUser.assignedClientId === 'all' || authUser.assignedClientId === target.clientId;
      if (!isClientMatch && !this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((i) => i.id !== id);
    saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.SOIL, id);
    return true;
  },

  // 2. Geotag Photos Management
  getGeotagPhotos(selectedClientId?: string, authUser?: AuthUser | null): FieldGeotagPhoto[] {
    const defaultSeed: FieldGeotagPhoto[] = [
      {
        id: 'seed-geo-1',
        fileName: 'Stacking_SubBlok_12_ZeroBurning.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1578328819058-b69f3a3b0f6b?auto=format&fit=crop&w=800&q=80',
        lat: -0.51234,
        lng: 101.45678,
        accuracy: 3.5,
        timestamp: '24/09/2026 09:15:20 WIB',
        category: 'Progres Tumbang-Cincang (Stacking)',
        blockCode: 'Blok AB',
        equipmentId: 'EX-01',
        clientId: 'client-1',
        clientName: 'PT. A',
        supervisorName: 'Budi Santoso',
        notes: 'Perumpukan batang kayu cincang sejajar kontur tanah sesuai SOP Zero Burning.',
      },
      {
        id: 'seed-geo-2',
        fileName: 'Parit_Batas_Air_Siak.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1581094288338-2314dddb7ece?auto=format&fit=crop&w=800&q=80',
        lat: -0.51345,
        lng: 101.45789,
        accuracy: 2.8,
        timestamp: '24/09/2026 10:45:10 WIB',
        category: 'Pembuatan Parit Batas (Trenching)',
        blockCode: 'Blok AB',
        equipmentId: 'EX-01',
        clientId: 'client-1',
        clientName: 'PT. A',
        supervisorName: 'Budi Santoso',
        notes: 'Parit batas blok lebar 2 meter kedalaman 1.5 meter untuk isolasi air & batas rintis.',
      },
      {
        id: 'seed-geo-3',
        fileName: 'Clearing_Perbatasan_Pelalawan.jpg',
        dataUrl: 'https://images.unsplash.com/photo-1508873696983-2df5293cb32b?auto=format&fit=crop&w=800&q=80',
        lat: 0.12345,
        lng: 102.12345,
        accuracy: 4.1,
        timestamp: '24/09/2026 11:20:00 WIB',
        category: 'Rabas & Pembersihan Semak',
        blockCode: 'Blok B-01',
        equipmentId: 'EX-02',
        clientId: 'client-2',
        clientName: 'PT. B',
        supervisorName: 'Ahmad Fauzi',
        notes: 'Pembersihan semak belukar tanah mineral sebelum perumpukan mekanik.',
      },
    ];

    const stored = loadFromStorage<FieldGeotagPhoto[]>(STORAGE_KEYS.GEOTAG_PHOTOS, defaultSeed);

    // Also include photos from daily reports that have GPS coordinates
    const reports = this.getReports(selectedClientId, authUser);
    const reportPhotos: FieldGeotagPhoto[] = [];
    reports.forEach((rep) => {
      rep.photos?.forEach((p, idx) => {
        reportPhotos.push({
          id: `rep-photo-${rep.id}-${idx}`,
          fileName: `${rep.reportNumber}_${p.category.replace(/\s+/g, '_')}.jpg`,
          dataUrl: p.dataUrl,
          lat: p.gpsCoordinates?.lat || -0.51234,
          lng: p.gpsCoordinates?.lng || 101.45678,
          accuracy: 4.0,
          timestamp: p.timestamp || rep.date,
          category: p.category,
          blockCode: p.blockCode || rep.blockCode,
          equipmentId: p.equipmentId,
          clientId: rep.clientId,
          clientName: rep.clientName,
          supervisorName: rep.signatures?.supervisor?.name || 'Pengawas Lapangan',
          notes: p.caption,
        });
      });
    });

    const combined = [...stored];
    reportPhotos.forEach((rp) => {
      if (!combined.some((c) => c.id === rp.id)) {
        combined.push(rp);
      }
    });

    if (authUser && authUser.role === 'supervisor') {
      const allowedClientId = authUser.assignedClientId && authUser.assignedClientId !== 'all'
        ? authUser.assignedClientId
        : selectedClientId;

      return combined.filter((p) => {
        if (allowedClientId && allowedClientId !== 'ALL' && p.clientId !== allowedClientId) {
          return false;
        }
        if (
          authUser.assignedBlockCodes &&
          authUser.assignedBlockCodes.length > 0 &&
          !authUser.assignedBlockCodes[0].includes('Semua Blok')
        ) {
          const isAllowedBlock = authUser.assignedBlockCodes.some((b) => {
            const bClean = (b || '').trim().toLowerCase();
            return p.blockCode && p.blockCode.toLowerCase().includes(bClean);
          });
          if (!isAllowedBlock) return false;
        }
        return true;
      });
    }

    if (!selectedClientId || selectedClientId === 'ALL') {
      return combined;
    }
    return combined.filter((p) => p.clientId === selectedClientId);
  },

  saveGeotagPhoto(photo: FieldGeotagPhoto, authUser?: AuthUser | null): FieldGeotagPhoto {
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(photo.clientId, photo.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Foto geotag hanya dapat disimpan untuk proyek ${authUser.assignedClientName || photo.clientId} di lokasi tugas Anda!`
        );
      }
    }

    const list = loadFromStorage<FieldGeotagPhoto[]>(STORAGE_KEYS.GEOTAG_PHOTOS, []);
    const idx = list.findIndex((p) => p.id === photo.id);
    if (idx >= 0) {
      list[idx] = photo;
    } else {
      list.unshift(photo);
    }
    saveToStorage(STORAGE_KEYS.GEOTAG_PHOTOS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.GEOTAG, photo);
    return photo;
  },

  deleteGeotagPhoto(id: string, authUser?: AuthUser | null): boolean {
    const list = loadFromStorage<FieldGeotagPhoto[]>(STORAGE_KEYS.GEOTAG_PHOTOS, []);
    const target = list.find((p) => p.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.GEOTAG_PHOTOS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.GEOTAG, id);
      return true;
    }
    return false;
  },

  // 3. HM Discrepancy & Verification Logs from Daily Reports
  getHmDiscrepancyLogs(selectedClientId?: string): HmDiscrepancyLog[] {
    const reports = this.getReports(selectedClientId);
    const logs: HmDiscrepancyLog[] = [];

    reports.forEach((rep) => {
      rep.equipmentWorkLogs?.forEach((log, idx) => {
        const totalLogged = Number((log.effectiveWorkHours + log.downtimeWeatherHours + log.downtimeBreakdownHours + log.downtimeOtherHours).toFixed(1));
        const disc = Number((log.totalHm - totalLogged).toFixed(1));
        const isDisc = Math.abs(disc) >= 0.2;

        logs.push({
          id: `hm-disc-${rep.id}-${log.equipmentId}-${idx}`,
          date: rep.date,
          reportId: rep.id,
          reportNumber: rep.reportNumber,
          clientId: rep.clientId,
          clientName: rep.clientName,
          blockCode: rep.blockCode,
          equipmentId: log.equipmentId,
          equipmentName: log.equipmentName || log.type,
          hmStart: log.hmStart,
          hmEnd: log.hmEnd,
          totalHm: log.totalHm,
          effectiveWorkHours: log.effectiveWorkHours,
          downtimeWeatherHours: log.downtimeWeatherHours,
          downtimeBreakdownHours: log.downtimeBreakdownHours,
          downtimeOtherHours: log.downtimeOtherHours,
          totalLoggedHours: totalLogged,
          discrepancyHours: disc,
          isDiscrepancy: isDisc,
          fuelAddedLiters: log.fuelAddedLiters,
          fuelRatio: log.fuelRatio,
          fuelStandardLimit: log.fuelStandardLimit,
          isFuelAlert: log.isFuelAlert,
          notes: log.downtimeBreakdownNote || log.downtimeWeatherNote || '',
          supervisorName: rep.signatures?.supervisor?.name || 'Pengawas Lapangan',
        });
      });
    });

    // Sort newest date first
    return logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  },

  // 4. User Activity Log & GPS Location History
  getUserActivities(): UserActivityLog[] {
    const defaultActivities: UserActivityLog[] = [
      {
        id: 'act-001',
        timestamp: new Date(Date.now() - 1000 * 60 * 18).toISOString(),
        formattedTime: '24/09/2026, 13:45:20 WIB',
        userId: 'spv-01',
        userName: 'Budi Santoso',
        userRole: 'supervisor',
        userEmail: 'pengawas.riau@suryaland.co.id',
        actionCategory: 'P2H',
        actionTitle: 'Checklist P2H Pra-Operasi Disimpan',
        actionDescription: 'Melakukan inspeksi kelayakan harian Excavator EX-01 (Komatsu PC200). Status: Layak Operasi. HM Awal: 3.420,5.',
        targetEntity: 'EX-01 (Komatsu PC200)',
        clientId: 'client-1',
        clientName: 'PT. A',
        blockCode: 'Blok AB',
        gpsTag: {
          lat: -0.51234,
          lng: 101.45678,
          accuracy: 2.8,
          locationName: 'Blok AB, Estate Siak (Dayun, Riau)',
          mapsUrl: 'https://www.google.com/maps?q=-0.51234,101.45678',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 14',
          isOnline: true,
        },
      },
      {
        id: 'act-002',
        timestamp: new Date(Date.now() - 1000 * 60 * 42).toISOString(),
        formattedTime: '24/09/2026, 13:21:10 WIB',
        userId: 'spv-01',
        userName: 'Budi Santoso',
        userRole: 'supervisor',
        userEmail: 'pengawas.riau@suryaland.co.id',
        actionCategory: 'CAMERA_GEOTAG',
        actionTitle: 'Upload Foto Geotagging GPS Progres',
        actionDescription: 'Mengambil & memberi cap watermark GPS foto progres Stacking/Perumpukan kayu kontur tanah di Sub-Blok 12.',
        targetEntity: 'Stacking_SubBlok_12_ZeroBurning.jpg',
        clientId: 'client-1',
        clientName: 'PT. A',
        blockCode: 'Blok AB',
        gpsTag: {
          lat: -0.51238,
          lng: 101.45670,
          accuracy: 3.2,
          locationName: 'Sub-Blok 12, Estate Siak (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=-0.51238,101.45670',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 14',
          isOnline: true,
        },
      },
      {
        id: 'act-003',
        timestamp: new Date(Date.now() - 1000 * 60 * 75).toISOString(),
        formattedTime: '24/09/2026, 12:48:05 WIB',
        userId: 'spv-02',
        userName: 'Ahmad Fauzi',
        userRole: 'supervisor',
        userEmail: 'ahmad.fauzi@suryaland.co.id',
        actionCategory: 'FUEL_BOWSER',
        actionTitle: 'Penerimaan Solar Bowser Keliling Dicatat',
        actionDescription: 'Mencatat pengisian solar dari Truk Bowser B 9821 TPA (Supir: Rahmat Santoso). Total: 1.200 Liter, Segel: S-7721, Status BBM: B50 Jernih/Lolos Uji Visual.',
        targetEntity: 'B 9821 TPA (1.200 L)',
        clientId: 'client-2',
        clientName: 'PT. B',
        blockCode: 'Blok B-01',
        gpsTag: {
          lat: 0.12345,
          lng: 102.12345,
          accuracy: 4.1,
          locationName: 'Pangkalan Solar Blok B-01, Estate Pelalawan (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=0.12345,102.12345',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 13',
          isOnline: true,
        },
      },
      {
        id: 'act-004',
        timestamp: new Date(Date.now() - 1000 * 60 * 110).toISOString(),
        formattedTime: '24/09/2026, 12:13:30 WIB',
        userId: 'spv-02',
        userName: 'Ahmad Fauzi',
        userRole: 'supervisor',
        userEmail: 'ahmad.fauzi@suryaland.co.id',
        actionCategory: 'SOIL_INCIDENT',
        actionTitle: 'Pencatatan Insiden K3 Tanah Gambut',
        actionDescription: 'Merekam insiden alat berat amblas kedalaman 1,8 meter pada rintis parit. Evakuasi bantuan unit Dozer D65P penarik kabel seling. Nihil korban cidera (Zero Accident).',
        targetEntity: 'Insiden Amblas EX-02',
        clientId: 'client-2',
        clientName: 'PT. B',
        blockCode: 'Blok B-01',
        gpsTag: {
          lat: 0.12401,
          lng: 102.12410,
          accuracy: 3.5,
          locationName: 'Area Gambut Rawang, Blok B-01 Pelalawan (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=0.12401,102.12410',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 13',
          isOnline: true,
        },
      },
      {
        id: 'act-005',
        timestamp: new Date(Date.now() - 1000 * 60 * 155).toISOString(),
        formattedTime: '24/09/2026, 11:28:45 WIB',
        userId: 'spv-01',
        userName: 'Budi Santoso',
        userRole: 'supervisor',
        userEmail: 'pengawas.riau@suryaland.co.id',
        actionCategory: 'REPORT',
        actionTitle: 'Submit Laporan Harian #SRL-2026-001',
        actionDescription: 'Menyimpan dan mengunggah Laporan Harian Progres Land Clearing PT. A (Progres 3.5 Ha, 4 Unit Alat Berat Beroperasi, Pemakaian BBM 650 Liter).',
        targetEntity: 'Laporan #SRL-2026-001',
        clientId: 'client-1',
        clientName: 'PT. A',
        blockCode: 'Blok AB',
        gpsTag: {
          lat: -0.51234,
          lng: 101.45678,
          accuracy: 3.0,
          locationName: 'Posko Lapangan Blok AB Siak (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=-0.51234,101.45678',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 14',
          isOnline: true,
        },
      },
      {
        id: 'act-006',
        timestamp: new Date(Date.now() - 1000 * 60 * 205).toISOString(),
        formattedTime: '24/09/2026, 10:38:12 WIB',
        userId: 'dir-01',
        userName: 'Direktur Utama',
        userRole: 'director',
        userEmail: 'direktur@rbsgroup.co.id',
        actionCategory: 'REPORT',
        actionTitle: 'Approval Digital Dokumen Laporan',
        actionDescription: 'Memberikan tanda tangan digital persetujuan Direktur untuk Laporan Harian #SRL-2026-001 PT. A.',
        targetEntity: 'Approval Laporan #SRL-2026-001',
        clientId: 'client-1',
        clientName: 'PT. A',
        blockCode: 'Blok AB',
        gpsTag: {
          lat: 0.50707,
          lng: 101.44778,
          accuracy: 5.0,
          locationName: 'Kantor Pusat PT. Suryaland, Pekanbaru (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=0.50707,101.44778',
        },
        deviceInfo: {
          deviceType: 'Desktop',
          browser: 'Chrome / Windows 11 Pro',
          isOnline: true,
        },
      },
      {
        id: 'act-007',
        timestamp: new Date(Date.now() - 1000 * 60 * 270).toISOString(),
        formattedTime: '24/09/2026, 09:33:00 WIB',
        userId: 'spv-01',
        userName: 'Budi Santoso',
        userRole: 'supervisor',
        userEmail: 'pengawas.riau@suryaland.co.id',
        actionCategory: 'AUTH',
        actionTitle: 'Masuk Sesi Pengawas Lapangan',
        actionDescription: 'Pengawas berhasil login ke sistem di lokasi proyek Siak dengan sinyal 4G stabil.',
        targetEntity: 'Sesi Mobile Pengawas',
        clientId: 'client-1',
        clientName: 'PT. A',
        blockCode: 'Blok AB',
        gpsTag: {
          lat: -0.51234,
          lng: 101.45678,
          accuracy: 3.5,
          locationName: 'Camp Pekerja Blok AB, Siak (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=-0.51234,101.45678',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 14',
          isOnline: true,
        },
      },
      {
        id: 'act-008',
        timestamp: new Date(Date.now() - 1000 * 60 * 330).toISOString(),
        formattedTime: '24/09/2026, 08:33:14 WIB',
        userId: 'spv-02',
        userName: 'Ahmad Fauzi',
        userRole: 'supervisor',
        userEmail: 'ahmad.fauzi@suryaland.co.id',
        actionCategory: 'AUTH',
        actionTitle: 'Masuk Sesi Pengawas Lapangan',
        actionDescription: 'Pengawas berhasil login ke sistem di estate Pelalawan.',
        targetEntity: 'Sesi Mobile Pengawas',
        clientId: 'client-2',
        clientName: 'PT. B',
        blockCode: 'Blok B-01',
        gpsTag: {
          lat: 0.12345,
          lng: 102.12345,
          accuracy: 4.0,
          locationName: 'Divisi 1 Pelalawan Estate (Riau)',
          mapsUrl: 'https://www.google.com/maps?q=0.12345,102.12345',
        },
        deviceInfo: {
          deviceType: 'Mobile',
          browser: 'Chrome Mobile / Android 13',
          isOnline: true,
        },
      }
    ];

    return loadFromStorage<UserActivityLog[]>(STORAGE_KEYS.USER_ACTIVITIES, defaultActivities);
  },

  logUserActivity(activity: Partial<UserActivityLog>): UserActivityLog {
    const list = this.getUserActivities();

    const now = new Date();
    const formatted = `${now.toLocaleDateString('id-ID', { day: '2-digit', month: '2-digit', year: 'numeric' })}, ${now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', second: '2-digit' })} WIB`;

    const userAgent = typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown';
    let deviceType: 'Mobile' | 'Tablet' | 'Desktop' = 'Desktop';
    if (/Android|iPhone|iPod/i.test(userAgent)) deviceType = 'Mobile';
    else if (/iPad|Tablet/i.test(userAgent)) deviceType = 'Tablet';

    let browserName = 'Browser Web';
    if (/Chrome/i.test(userAgent) && !/Edge|OPR/i.test(userAgent)) browserName = 'Google Chrome';
    else if (/Safari/i.test(userAgent) && !/Chrome/i.test(userAgent)) browserName = 'Apple Safari';
    else if (/Firefox/i.test(userAgent)) browserName = 'Mozilla Firefox';
    else if (/Edge/i.test(userAgent)) browserName = 'Microsoft Edge';

    const defaultLat = activity.userRole === 'director' ? 0.50707 : -0.51234;
    const defaultLng = activity.userRole === 'director' ? 101.44778 : 101.45678;
    const defaultLocName = activity.userRole === 'director' ? 'Kantor Direksi Pekanbaru' : (activity.blockCode ? `Blok ${activity.blockCode} Riau` : 'Estate Operasional Riau');

    const fullEntry: UserActivityLog = {
      id: `act-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: now.toISOString(),
      formattedTime: formatted,
      userId: activity.userId || 'usr-anonymous',
      userName: activity.userName || 'Pengguna Aplikasi',
      userRole: activity.userRole || 'supervisor',
      userEmail: activity.userEmail,
      actionCategory: activity.actionCategory || 'NAVIGATION',
      actionTitle: activity.actionTitle || 'Aktivitas Pengguna',
      actionDescription: activity.actionDescription || 'Melakukan interaksi pada aplikasi.',
      targetEntity: activity.targetEntity,
      clientId: activity.clientId,
      clientName: activity.clientName,
      blockCode: activity.blockCode,
      gpsTag: activity.gpsTag || {
        lat: defaultLat,
        lng: defaultLng,
        accuracy: 3.5,
        locationName: defaultLocName,
        mapsUrl: `https://www.google.com/maps?q=${defaultLat},${defaultLng}`,
      },
      deviceInfo: activity.deviceInfo || {
        deviceType,
        browser: `${browserName} (${typeof navigator !== 'undefined' && navigator.onLine ? 'Online' : 'Offline'})`,
        isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
      },
    };

    list.unshift(fullEntry);

    // Keep last 300 logs
    const trimmed = list.slice(0, 300);
    saveToStorage(STORAGE_KEYS.USER_ACTIVITIES, trimmed);
    syncDocWrite(FIRESTORE_COLLECTIONS.ACTIVITIES, fullEntry);
    return fullEntry;
  },

  clearUserActivities(): void {
    saveToStorage(STORAGE_KEYS.USER_ACTIVITIES, []);
  },

  // ==========================================
  // MANAJEMEN USER & JABATAN (CRUD SUPERADMIN)
  // ==========================================
  getManagedUsers(): ManagedUser[] {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    const deletedStaffIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_STAFF_IDS, []);
    const hasStored = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.MANAGED_USERS) !== null;
    let raw = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
    if (!Array.isArray(raw) || (!hasStored && raw.length === 0)) {
      raw = initialManagedUsers.filter((u) => !deletedIds.includes(u.id) && !isObsoleteHendraRecord(u));
      saveToStorage(STORAGE_KEYS.MANAGED_USERS, raw);
    } else {
      raw = raw.filter((u) => {
        if (!u || isObsoleteHendraRecord(u) || deletedIds.includes(u.id)) {
          if (u && u.id) syncDocDelete(FIRESTORE_COLLECTIONS.USERS, u.id);
          return false;
        }
        return true;
      });
    }

    // Merge active CompanyStaff credentials so Staff & ManagedUsers are NEVER out of sync
    const rawStaff = loadFromStorage<CompanyStaff[]>(STORAGE_KEYS.COMPANY_STAFF, initialCompanyStaff);
    const validStaff = Array.isArray(rawStaff)
      ? rawStaff.filter((s) => s && !isObsoleteHendraRecord(s) && !deletedStaffIds.includes(s.id))
      : [];

    const activeStaffUserIds = new Set<string>();
    const activeStaffUsernames = new Set<string>();
    let usersListChanged = false;

    validStaff.forEach((staff) => {
      const cleanU = normalizeUsername(staff.username);
      if (!cleanU || !staff.password) return;
      activeStaffUsernames.add(cleanU);

      const staffNameLower = (staff.fullName || '').trim().toLowerCase();
      const staffEmpLower = (staff.employeeIdNumber || '').trim().toLowerCase();
      const idx = raw.findIndex(
        (u) =>
          (staff.linkedUserId && u.id === staff.linkedUserId) ||
          normalizeUsername(u.username) === cleanU ||
          (staffEmpLower && u.employeeIdNumber && u.employeeIdNumber.trim().toLowerCase() === staffEmpLower) ||
          (staffNameLower && (u.fullName || '').trim().toLowerCase() === staffNameLower)
      );

      const resolvedUserId =
        (idx >= 0 ? raw[idx].id : undefined) ||
        staff.linkedUserId ||
        `user-usr-${(staff.id || '').replace(/^staff-/, '')}`;
      activeStaffUserIds.add(resolvedUserId);

      const staffJobLower = (staff.jobRole || '').toLowerCase();
      const resolvedLevel: ManagedUser['userLevel'] =
        staff.userLevel === 'Superadmin' || staff.staffLevel === 'Direktur' || staff.staffLevel === 'Superadmin' || staffJobLower.includes('direktur') || staffJobLower.includes('owner') || staffJobLower.includes('superadmin')
          ? 'Superadmin'
          : staff.userLevel === 'Site Manager' || staff.staffLevel === 'Site Manager' || staff.staffLevel === 'Manager' || staffJobLower.includes('manager')
          ? 'Site Manager'
          : staff.userLevel === 'Klien' || staff.staffLevel === 'Klien' || staffJobLower.includes('klien')
          ? 'Klien'
          : 'Pengawas';

      const safeSig =
        staff.signatureUrl && staff.signatureUrl.length > 120000
          ? idx >= 0 && raw[idx].signatureUrl && raw[idx].signatureUrl!.length <= 120000
            ? raw[idx].signatureUrl
            : undefined
          : staff.signatureUrl;

      if (idx >= 0) {
        const existing = raw[idx];
        if (
          normalizeUsername(existing.username) !== cleanU ||
          existing.password !== staff.password ||
          existing.status !== 'Aktif' ||
          existing.userLevel !== resolvedLevel ||
          existing.fullName !== staff.fullName
        ) {
          raw[idx] = {
            ...existing,
            fullName: staff.fullName.trim(),
            address: staff.address || existing.address || '-',
            whatsappNumber: staff.phone || existing.whatsappNumber || '-',
            email: staff.email || existing.email || '-',
            jobTitle: staff.jobRole || existing.jobTitle || 'Staff',
            userLevel: resolvedLevel,
            username: cleanU,
            password: staff.password,
            signatureUrl: safeSig || existing.signatureUrl,
            employeeIdNumber: staff.employeeIdNumber || existing.employeeIdNumber,
            assignedClientId: staff.assignedClientId || existing.assignedClientId || 'all',
            assignedClientName: staff.assignedClientName || existing.assignedClientName || 'Semua Proyek',
            assignedBlockCodes: staff.assignedBlockCodes || existing.assignedBlockCodes || ['Akses Semua Blok'],
            status: 'Aktif', // Guarantee active user status
          };
          usersListChanged = true;
        }
      } else {
        const constructed: ManagedUser = {
          id: resolvedUserId,
          fullName: staff.fullName.trim(),
          address: staff.address || '-',
          whatsappNumber: staff.phone || '-',
          email: staff.email || '-',
          jobTitle: staff.jobRole || 'Staff',
          userLevel: resolvedLevel,
          username: cleanU,
          password: staff.password,
          signatureUrl: safeSig,
          employeeIdNumber: staff.employeeIdNumber,
          assignedClientId: staff.assignedClientId || 'all',
          assignedClientName: staff.assignedClientName || 'Semua Proyek',
          assignedBlockCodes: staff.assignedBlockCodes || ['Akses Semua Blok'],
          status: 'Aktif', // Guarantee active user status
          createdAt: staff.createdAt || new Date().toISOString(),
          updatedAt: staff.updatedAt || new Date().toISOString(),
          notes: staff.notes || '',
        };
        raw.push(constructed);
        usersListChanged = true;
      }
    });

    const filteredUsers = raw.filter(
      (u) =>
        activeStaffUserIds.has(u.id) ||
        activeStaffUsernames.has(normalizeUsername(u.username)) ||
        !deletedIds.includes(u.id)
    );

    // Apply strict deduplication engine
    const { cleanList, removedDocIds } = deduplicateUsersList(filteredUsers);
    if (removedDocIds.length > 0) {
      removedDocIds.forEach((dupId) => {
        syncDocDelete(FIRESTORE_COLLECTIONS.USERS, dupId);
      });
      usersListChanged = true;
    }

    if (usersListChanged || cleanList.length !== raw.length) {
      saveToStorage(STORAGE_KEYS.MANAGED_USERS, cleanList);
    }

    // Normalisasi: Direktur / Superadmin & Site Manager (All accounts Active)
    return cleanList.map((u) => {
      const jobLower = (u.jobTitle || '').toLowerCase();
      const normU: ManagedUser = {
        ...u,
        status: 'Aktif', // Guarantee active status
        username: normalizeUsername(u.username) || u.username,
      };

      if (normU.userLevel === 'Superadmin' || jobLower.includes('direktur')) {
        return {
          ...normU,
          assignedClientId: 'all',
          assignedClientName: 'Semua Proyek (Owner)',
          assignedBlockCodes:
            normU.assignedBlockCodes && normU.assignedBlockCodes.length > 0 && !normU.assignedBlockCodes.includes('Blok AB')
              ? normU.assignedBlockCodes
              : ['Akses Semua Blok (Tanpa Batas)'],
        };
      }
      if (normU.userLevel === 'Site Manager' || normU.userLevel === 'Manager' || jobLower.includes('manager')) {
        return {
          ...normU,
          assignedClientId: normU.assignedClientId || 'all',
          assignedClientName: normU.assignedClientName || 'Semua Proyek (Site Manager Operasional)',
          assignedBlockCodes:
            normU.assignedBlockCodes && normU.assignedBlockCodes.length > 0 && !normU.assignedBlockCodes.includes('Blok AB')
              ? normU.assignedBlockCodes
              : ['Akses Supervisi Semua Blok'],
        };
      }
      return normU;
    });
  },

  getManagedUserById(id: string): ManagedUser | undefined {
    return this.getManagedUsers().find((u) => u.id === id);
  },

  getManagedUserByUsername(username: string): ManagedUser | undefined {
    const trimmed = normalizeUsername(username);
    if (!trimmed) return undefined;

    // 1. Cari dari daftar ManagedUsers (cocokkan username, NIK/NIP, atau email)
    const users = this.getManagedUsers();
    let existing = users.find(
      (u) =>
        normalizeUsername(u.username) === trimmed ||
        (u.employeeIdNumber && u.employeeIdNumber.trim().toLowerCase() === trimmed) ||
        (u.email && u.email.trim().toLowerCase() === trimmed)
    );

    // 2. Cek langsung ke CompanyStaff jika ada update kredensial terbaru di Submenu 2
    const staffList = this.getCompanyStaff();
    const staffMatch = staffList.find(
      (s) =>
        normalizeUsername(s.username) === trimmed ||
        (s.employeeIdNumber && s.employeeIdNumber.trim().toLowerCase() === trimmed) ||
        (s.email && s.email.trim().toLowerCase() === trimmed)
    );
    if (staffMatch && staffMatch.password) {
      const staffMatchJobLower = (staffMatch.jobRole || '').toLowerCase();
      const resolvedLevel: ManagedUser['userLevel'] =
        staffMatch.userLevel === 'Superadmin' || staffMatch.staffLevel === 'Direktur' || staffMatch.staffLevel === 'Superadmin' || staffMatchJobLower.includes('direktur') || staffMatchJobLower.includes('owner') || staffMatchJobLower.includes('superadmin')
          ? 'Superadmin'
          : staffMatch.userLevel === 'Site Manager' || staffMatch.staffLevel === 'Site Manager' || staffMatch.staffLevel === 'Manager' || staffMatchJobLower.includes('manager')
          ? 'Site Manager'
          : staffMatch.userLevel === 'Klien' || staffMatch.staffLevel === 'Klien' || staffMatchJobLower.includes('klien')
          ? 'Klien'
          : 'Pengawas';

      existing = {
        ...(existing || {}),
        id: existing?.id || staffMatch.linkedUserId || `user-usr-${staffMatch.id.replace(/^staff-/, '')}`,
        fullName: staffMatch.fullName.trim(),
        address: staffMatch.address || existing?.address || '-',
        whatsappNumber: staffMatch.phone || existing?.whatsappNumber || '-',
        email: staffMatch.email || existing?.email || '-',
        jobTitle: staffMatch.jobRole || existing?.jobTitle || 'Staff',
        userLevel: resolvedLevel,
        username: normalizeUsername(staffMatch.username) || trimmed,
        password: staffMatch.password,
        signatureUrl: staffMatch.signatureUrl || existing?.signatureUrl,
        employeeIdNumber: staffMatch.employeeIdNumber || existing?.employeeIdNumber,
        assignedClientId: staffMatch.assignedClientId || existing?.assignedClientId || 'all',
        assignedClientName: staffMatch.assignedClientName || existing?.assignedClientName || 'Semua Proyek',
        assignedBlockCodes: staffMatch.assignedBlockCodes || existing?.assignedBlockCodes || ['Akses Semua Blok'],
        status: 'Aktif',
        createdAt: staffMatch.createdAt || existing?.createdAt || new Date().toISOString(),
        notes: staffMatch.notes || existing?.notes || '',
      };
    }

    const allClients = loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
    const matchingClients = allClients.filter(
      (c) =>
        (c.username && normalizeUsername(c.username) === trimmed) ||
        (c.email && c.email.trim().toLowerCase() === trimmed) ||
        (existing &&
          existing.userLevel === 'Klien' &&
          (c.id === existing.assignedClientId ||
            (existing.assignedClientIds && existing.assignedClientIds.includes(c.id)) ||
            (c.linkedUserId && c.linkedUserId === existing.id)))
    );

    if (existing) {
      if (existing.userLevel === 'Klien' && matchingClients.length > 0) {
        const clientIds = Array.from(
          new Set([
            ...(existing.assignedClientIds || []),
            ...(existing.assignedClientId && existing.assignedClientId !== 'all' ? [existing.assignedClientId] : []),
            ...matchingClients.map((c) => c.id),
          ])
        );
        const contractNumbers = Array.from(
          new Set([
            ...(existing.assignedContractNumbers || []),
            ...matchingClients.map((c) => c.contractNumber).filter(Boolean),
          ])
        );
        return {
          ...existing,
          status: 'Aktif',
          assignedClientId: clientIds[0] || existing.assignedClientId,
          assignedClientIds: clientIds,
          assignedContractNumbers: contractNumbers,
        };
      }
      return { ...existing, status: 'Aktif' };
    }

    // Fallback: jika kredensial tersimpan pada data Client (Master Data Proyek -> 1. Daftar Klien)
    if (matchingClients.length > 0) {
      const primaryClient = matchingClients[0];
      const clientIds = Array.from(new Set(matchingClients.map((c) => c.id)));
      const contractNumbers = Array.from(new Set(matchingClients.map((c) => c.contractNumber).filter(Boolean)));
      const constructedUser: ManagedUser = {
        id: primaryClient.linkedUserId || `user-klien-${primaryClient.id}`,
        fullName: primaryClient.contactPerson
          ? `${primaryClient.contactPerson} (${primaryClient.name})`
          : `${primaryClient.fullCompanyName || primaryClient.name}`,
        address: primaryClient.address || primaryClient.location || '-',
        whatsappNumber: primaryClient.phone || '-',
        email: primaryClient.email || '-',
        jobTitle: 'Klien / Pemilik Proyek (Monitoring Progress & Laporan)',
        userLevel: 'Klien',
        username: trimmed,
        password: primaryClient.password || 'Klien2026!',
        assignedClientId: primaryClient.id,
        assignedClientIds: clientIds,
        assignedContractNumbers: contractNumbers,
        assignedClientName:
          contractNumbers.length > 1
            ? `${primaryClient.name} - ${primaryClient.fullCompanyName} (${contractNumbers.length} SPK)`
            : `${primaryClient.name} - ${primaryClient.fullCompanyName}`,
        assignedBlockCodes: ['Blok Sesuai SPK Klien'],
        status: 'Aktif',
        createdAt: new Date().toISOString(),
        notes: `Akun Resmi Klien (${contractNumbers.join(', ')})`,
      };
      return this.saveManagedUser(constructedUser);
    }

    return undefined;
  },

  saveManagedUser(user: ManagedUser): ManagedUser {
    const cleanUser: ManagedUser = {
      ...user,
      status: 'Aktif', // Guarantee active user status
      username: normalizeUsername(user.username) || user.username.trim(),
    };
    const list = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers).filter(
      (u) => !isObsoleteHendraRecord(u)
    );

    const normUsername = cleanUser.username;
    const normEmp = (cleanUser.employeeIdNumber || '').trim().toLowerCase();
    const normName = (cleanUser.fullName || '').trim().toLowerCase();

    // Find existing by id, username, employeeIdNumber, or fullName
    const idx = list.findIndex(
      (u) =>
        u.id === cleanUser.id ||
        (normUsername && normalizeUsername(u.username) === normUsername) ||
        (normEmp && u.employeeIdNumber && u.employeeIdNumber.trim().toLowerCase() === normEmp) ||
        (normName && (u.fullName || '').trim().toLowerCase() === normName)
    );

    const jobLower = (cleanUser.jobTitle || '').toLowerCase();
    const isSuper = cleanUser.userLevel === 'Superadmin' || jobLower.includes('direktur');
    const isManager =
      cleanUser.userLevel === 'Site Manager' || cleanUser.userLevel === 'Manager' || jobLower.includes('manager');

    const safeSignatureUrl =
      cleanUser.signatureUrl && cleanUser.signatureUrl.length > 120000 ? undefined : cleanUser.signatureUrl;

    const targetId = idx >= 0 ? list[idx].id : cleanUser.id;

    const normalizedUser: ManagedUser = isSuper
      ? {
          ...cleanUser,
          id: targetId,
          status: 'Aktif',
          signatureUrl: safeSignatureUrl,
          assignedClientId: 'all',
          assignedClientName: 'Semua Proyek (Owner)',
          assignedBlockCodes: ['Akses Semua Blok (Tanpa Batas)'],
        }
      : isManager
      ? {
          ...cleanUser,
          id: targetId,
          status: 'Aktif',
          signatureUrl: safeSignatureUrl,
          assignedClientId: cleanUser.assignedClientId || 'all',
          assignedClientName: cleanUser.assignedClientName || 'Semua Proyek (Site Manager Operasional)',
          assignedBlockCodes: ['Akses Supervisi Semua Blok'],
        }
      : {
          ...cleanUser,
          id: targetId,
          status: 'Aktif',
          signatureUrl: safeSignatureUrl,
        };

    if (idx >= 0) {
      list[idx] = {
        ...list[idx],
        ...normalizedUser,
        id: targetId,
        updatedAt: new Date().toISOString(),
      };
    } else {
      list.unshift({
        ...normalizedUser,
        createdAt: normalizedUser.createdAt || new Date().toISOString(),
      });
    }

    // Deduplicate entire list to ensure no duplicate entries remain
    const { cleanList, removedDocIds } = deduplicateUsersList(list);
    removedDocIds.forEach((dupId) => {
      syncDocDelete(FIRESTORE_COLLECTIONS.USERS, dupId);
    });

    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    if (deletedIds.includes(normalizedUser.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_USER_IDS, deletedIds.filter((id) => id !== normalizedUser.id));
    }
    saveToStorage(STORAGE_KEYS.MANAGED_USERS, cleanList);
    syncDocWrite(FIRESTORE_COLLECTIONS.USERS, normalizedUser);

    // Sync any new block codes to client's block list if not Superadmin
    if (
      !isSuper &&
      normalizedUser.assignedClientId &&
      normalizedUser.assignedClientId !== 'all' &&
      normalizedUser.assignedBlockCodes &&
      normalizedUser.assignedBlockCodes.length > 0
    ) {
      const assignedCId = normalizedUser.assignedClientId;
      normalizedUser.assignedBlockCodes.forEach((bCode) => {
        this.addBlockCodeToClient(assignedCId, bCode);
      });
    }

    return normalizedUser;
  },

  deleteManagedUser(userId: string, _currentAuthUser?: AuthUser | null): boolean {
    const deletedIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_USER_IDS, []);
    if (!deletedIds.includes(userId)) {
      saveToStorage(STORAGE_KEYS.DELETED_USER_IDS, [...deletedIds, userId]);
    }

    const list = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
    const filtered = list.filter((u) => u.id !== userId);
    saveToStorage(STORAGE_KEYS.MANAGED_USERS, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.USERS, userId);
    return true;
  },

  getJobTitles(): string[] {
    const titles = loadFromStorage<string[]>(STORAGE_KEYS.JOB_TITLES, initialJobTitles);
    // Ensure default core titles exist
    const set = new Set([...initialJobTitles, ...titles]);
    return Array.from(set);
  },

  saveJobTitle(newTitle: string): string[] {
    const trimmed = newTitle.trim();
    if (!trimmed) return this.getJobTitles();
    const current = this.getJobTitles();
    if (!current.some((t) => t && t.toLowerCase() === trimmed.toLowerCase())) {
      const updated = [...current, trimmed];
      saveToStorage(STORAGE_KEYS.JOB_TITLES, updated);
      syncDocWrite(FIRESTORE_COLLECTIONS.JOB_TITLES, { 
        id: `job-${encodeURIComponent(trimmed.toLowerCase().replace(/\s+/g, '-'))}`, 
        title: trimmed 
      });
      return updated;
    }
    return current;
  },

  // Helper untuk menambah kode blok baru ke klien jika belum terdaftar
  addBlockCodeToClient(clientId: string, blockCode: string): Block | undefined {
    const trimmedCode = blockCode.trim();
    if (!trimmedCode) return undefined;

    const allBlocks = this.getBlocks();
    const existing = allBlocks.find(
      (b) => b.clientId === clientId && b.code && b.code.toLowerCase() === trimmedCode.toLowerCase()
    );
    if (existing) return existing;

    // Cari project ID terkait klien
    const projects = this.getProjects().filter((p) => p.clientId === clientId);
    const projId = projects.length > 0 ? projects[0].id : `proj-${clientId}`;

    const newBlock: Block = {
      id: `blk-custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      projectId: projId,
      clientId: clientId,
      code: trimmedCode,
      targetAreaHa: 50,
      dailyTargetAreaHa: 3.5,
      clearedAreaHa: 0,
      status: 'Dalam Pengerjaan',
    };

    allBlocks.push(newBlock);
    saveToStorage(STORAGE_KEYS.BLOCKS, allBlocks);
    syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, newBlock);
    return newBlock;
  },

  // ==========================================
  // IDENTITAS RESMI PERUSAHAAN & BRANDING
  // ==========================================
  getCompanyProfile(): CompanyProfile {
    const profile = loadFromStorage<CompanyProfile>(STORAGE_KEYS.COMPANY_PROFILE, initialCompanyProfile);
    if (profile.officialName?.includes('SURYALAND') || profile.shortName === 'SURYALAND') {
      const migrated: CompanyProfile = {
        ...profile,
        officialName: 'PT. RBS GROUP',
        shortName: 'RBS',
        logoUrl: createDefaultCompanyLogoSvg('RBS', 'PT. RBS GROUP'),
        email: profile.email?.replace(/suryaland\.co\.id/g, 'rbsgroup.co.id') || 'corporate@rbsgroup.co.id',
        website: profile.website?.replace(/suryaland\.co\.id/g, 'rbsgroup.co.id') || 'https://rbsgroup.co.id',
        bankAccountInfo: profile.bankAccountInfo?.replace(/SURYALAND/g, 'RBS') || 'Bank Mandiri Cabang Pekanbaru: 108-00-1234567-8 a/n PT. RBS GROUP',
        headOfficeAddress: profile.headOfficeAddress?.replace(/Surya Graha/g, 'RBS Tower') || profile.headOfficeAddress,
        updatedAt: new Date().toISOString(),
      };
      saveToStorage(STORAGE_KEYS.COMPANY_PROFILE, migrated);
      syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_PROFILE, { ...migrated, id: 'main_profile' });
      return migrated;
    }
    return profile;
  },

  updateCompanyProfile(updates: Partial<CompanyProfile>): CompanyProfile {
    const current = this.getCompanyProfile();
    const updated: CompanyProfile = {
      ...current,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    saveToStorage(STORAGE_KEYS.COMPANY_PROFILE, updated);
    syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_PROFILE, { ...updated, id: 'main_profile' });
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('rbs_company_profile_sync', { detail: updated }));
      window.dispatchEvent(new CustomEvent('suryaland_company_profile_sync', { detail: updated }));
    }
    return updated;
  },

  saveCompanyProfile(profile: CompanyProfile): CompanyProfile {
    return this.updateCompanyProfile(profile);
  },

  // ==========================================
  // INFORMASI STAFF PERUSAHAAN & TTD DIGITAL
  // ==========================================
  getCompanyStaff(): CompanyStaff[] {
    const deletedStaffIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_STAFF_IDS, []);
    const hasStoredStaff = typeof window !== 'undefined' && localStorage.getItem(STORAGE_KEYS.COMPANY_STAFF) !== null;
    let rawStaff = loadFromStorage<CompanyStaff[]>(STORAGE_KEYS.COMPANY_STAFF, initialCompanyStaff);
    if (!Array.isArray(rawStaff) || (!hasStoredStaff && rawStaff.length === 0)) {
      rawStaff = initialCompanyStaff.filter((s) => !deletedStaffIds.includes(s.id) && !isObsoleteHendraRecord(s));
      saveToStorage(STORAGE_KEYS.COMPANY_STAFF, rawStaff);
    } else {
      rawStaff = rawStaff.filter((s) => {
        if (isObsoleteHendraRecord(s)) {
          syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, s.id);
          return false;
        }
        return !deletedStaffIds.includes(s.id);
      });
    }

    // Apply strict deduplication engine on staff
    const { cleanList, removedDocIds } = deduplicateStaffList(rawStaff);
    let staffListChanged = false;
    if (removedDocIds.length > 0) {
      removedDocIds.forEach((dupId) => {
        syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, dupId);
      });
      staffListChanged = true;
    }

    const rawUsers = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
    const users = Array.isArray(rawUsers) ? rawUsers.filter((u) => !isObsoleteHendraRecord(u)) : [];

    // Enrich staff with corresponding managed user credentials if not already set & guarantee active status
    const enrichedStaff = cleanList.map((staff) => {
      const staffUserLower = normalizeUsername(staff.username);
      const staffEmpLower = (staff.employeeIdNumber || '').trim().toLowerCase();
      const staffNameLower = (staff.fullName || '').trim().toLowerCase();
      const matchedUser = users.find(
        (u) =>
          (staff.linkedUserId && u.id === staff.linkedUserId) ||
          (staffUserLower && normalizeUsername(u.username) === staffUserLower) ||
          (staffEmpLower && u.employeeIdNumber && u.employeeIdNumber.trim().toLowerCase() === staffEmpLower) ||
          (staffNameLower && u.fullName && u.fullName.trim().toLowerCase() === staffNameLower)
      );

      if (matchedUser) {
        return {
          ...staff,
          status: 'Aktif' as const, // Guarantee active status
          username: normalizeUsername(staff.username || matchedUser.username),
          password: staff.password || matchedUser.password,
          userLevel: staff.userLevel || matchedUser.userLevel,
          address: staff.address || matchedUser.address,
          signatureUrl: staff.signatureUrl || matchedUser.signatureUrl,
          employeeIdNumber: staff.employeeIdNumber || matchedUser.employeeIdNumber || '',
          linkedUserId: matchedUser.id,
          assignedClientId: staff.assignedClientId || matchedUser.assignedClientId,
          assignedClientName: staff.assignedClientName || matchedUser.assignedClientName,
          assignedBlockCodes: staff.assignedBlockCodes || matchedUser.assignedBlockCodes,
        };
      }
      return {
        ...staff,
        status: 'Aktif' as const,
        username: staff.username ? normalizeUsername(staff.username) : staff.username,
      };
    });

    if (staffListChanged || cleanList.length !== rawStaff.length) {
      saveToStorage(STORAGE_KEYS.COMPANY_STAFF, enrichedStaff);
    }

    return enrichedStaff;
  },

  getStaffById(id: string): CompanyStaff | undefined {
    const staffList = this.getCompanyStaff();
    return staffList.find((s) => s.id === id);
  },

  saveCompanyStaff(staff: CompanyStaff): CompanyStaff {
    const deletedStaffIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_STAFF_IDS, []);
    if (deletedStaffIds.includes(staff.id)) {
      saveToStorage(STORAGE_KEYS.DELETED_STAFF_IDS, deletedStaffIds.filter((id) => id !== staff.id));
    }

    const staffList = this.getCompanyStaff();
    const cleanUser = normalizeUsername(staff.username);
    const staffEmpLower = (staff.employeeIdNumber || '').trim().toLowerCase();
    const staffNameLower = (staff.fullName || '').trim().toLowerCase();

    // Check by id, username, employeeIdNumber, or fullName to avoid duplicate staff records
    const existingIndex = staffList.findIndex(
      (s) =>
        s.id === staff.id ||
        (cleanUser && normalizeUsername(s.username) === cleanUser) ||
        (staffEmpLower && s.employeeIdNumber && s.employeeIdNumber.trim().toLowerCase() === staffEmpLower) ||
        (staffNameLower && (s.fullName || '').trim().toLowerCase() === staffNameLower)
    );

    const previousStaff = existingIndex >= 0 ? staffList[existingIndex] : undefined;
    const resolvedStaffId = previousStaff?.id || staff.id;
    const cleanPass = staff.password || previousStaff?.password;

    const payload: CompanyStaff = {
      ...previousStaff,
      ...staff,
      id: resolvedStaffId,
      status: 'Aktif', // Guarantee active status
      username: cleanUser || staff.username,
      password: cleanPass,
      updatedAt: new Date().toISOString(),
    };

    // Auto-synchronize to ManagedUser if credentials (username & password) exist
    if (payload.username && payload.password) {
      const users = this.getManagedUsers();
      const payloadUserLower = normalizeUsername(payload.username);
      const payloadNameLower = (payload.fullName || '').trim().toLowerCase();
      const prevUserLower = normalizeUsername(previousStaff?.username);
      const prevNameLower = (previousStaff?.fullName || '').trim().toLowerCase();

      const existingUser = users.find(
        (u) =>
          (payload.linkedUserId && u.id === payload.linkedUserId) ||
          (previousStaff?.linkedUserId && u.id === previousStaff.linkedUserId) ||
          (prevUserLower && normalizeUsername(u.username) === prevUserLower) ||
          (prevNameLower && u.fullName && u.fullName.trim().toLowerCase() === prevNameLower) ||
          (payloadUserLower && normalizeUsername(u.username) === payloadUserLower) ||
          (payloadNameLower && u.fullName && u.fullName.trim().toLowerCase() === payloadNameLower)
      );
      const userId =
        existingUser?.id ||
        payload.linkedUserId ||
        previousStaff?.linkedUserId ||
        `user-usr-${payload.id.replace(/^staff-/, '')}`;
      payload.linkedUserId = userId;

      const payloadJobLower = (payload.jobRole || '').toLowerCase();
      const resolvedLevel: ManagedUser['userLevel'] =
        payload.userLevel === 'Superadmin' || payload.staffLevel === 'Direktur' || payload.staffLevel === 'Superadmin' || payloadJobLower.includes('direktur') || payloadJobLower.includes('owner') || payloadJobLower.includes('superadmin')
          ? 'Superadmin'
          : payload.userLevel === 'Site Manager' || payload.staffLevel === 'Site Manager' || payload.staffLevel === 'Manager' || payloadJobLower.includes('manager')
          ? 'Site Manager'
          : payload.userLevel === 'Klien' || payload.staffLevel === 'Klien' || payloadJobLower.includes('klien')
          ? 'Klien'
          : 'Pengawas';

      const userPayload: ManagedUser = {
        id: userId,
        fullName: payload.fullName.trim(),
        address: payload.address?.trim() || '',
        whatsappNumber: payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        jobTitle: payload.jobRole.trim(),
        userLevel: resolvedLevel,
        username: payloadUserLower,
        password: payload.password,
        signatureUrl:
          payload.signatureUrl && payload.signatureUrl.length <= 100000 ? payload.signatureUrl : undefined,
        employeeIdNumber: payload.employeeIdNumber,
        assignedClientId: payload.assignedClientId || 'all',
        assignedClientName: payload.assignedClientName || 'Semua Proyek',
        assignedBlockCodes: payload.assignedBlockCodes || ['Akses Semua Blok'],
        status: 'Aktif',
        notes: payload.notes,
        createdAt: existingUser?.createdAt || payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveManagedUser(userPayload);
    }

    let rawList: CompanyStaff[];
    if (existingIndex >= 0) {
      rawList = [...staffList];
      rawList[existingIndex] = payload;
    } else {
      rawList = [payload, ...staffList];
    }

    // Deduplicate entire staff list
    const { cleanList: updatedList, removedDocIds } = deduplicateStaffList(rawList);
    removedDocIds.forEach((dupId) => {
      syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, dupId);
    });

    saveToStorage(STORAGE_KEYS.COMPANY_STAFF, updatedList);

    if (payload.signatureUrl && payload.signatureUrl.length > 100000) {
      compressSignatureDataUrl(payload.signatureUrl).then((compressedSig) => {
        const compressedPayload: CompanyStaff = { ...payload, signatureUrl: compressedSig };
        const currentList = loadFromStorage<CompanyStaff[]>(STORAGE_KEYS.COMPANY_STAFF, []);
        const idx = currentList.findIndex((s) => s.id === compressedPayload.id);
        if (idx >= 0) {
          currentList[idx] = compressedPayload;
          saveToStorage(STORAGE_KEYS.COMPANY_STAFF, currentList);
        }
        syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_STAFF, compressedPayload);
      });
    } else {
      syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_STAFF, payload);
    }

    // Sinkronkan juga perubahan Nama / Telepon / Jabatan Staff ke Penugasan Kerja (Menu 4) yang terhubung
    const rawAssignments = loadFromStorage<WorkAssignment[]>(STORAGE_KEYS.WORK_ASSIGNMENTS, initialWorkAssignments);
    if (Array.isArray(rawAssignments) && rawAssignments.length > 0) {
      const oldNameLower = (previousStaff?.fullName || '').trim().toLowerCase();
      const newNameLower = (payload.fullName || '').trim().toLowerCase();
      let assignmentsChanged = false;

      const syncedAssignments = rawAssignments.map((asg) => {
        let updatedAsg = { ...asg };
        let asgModified = false;

        // Cek apakah staff ini adalah Site Manager pada penugasan ini
        const asgSmLower = (updatedAsg.siteManagerName || '').trim().toLowerCase();
        if (
          updatedAsg.siteManagerStaffId === payload.id ||
          (asgSmLower && (asgSmLower === oldNameLower || asgSmLower === newNameLower))
        ) {
          updatedAsg.siteManagerStaffId = payload.id;
          updatedAsg.siteManagerName = payload.fullName;
          updatedAsg.siteManagerPhone = payload.phone || updatedAsg.siteManagerPhone;
          if (updatedAsg.staffLevel === 'Site Manager') {
            updatedAsg.staffName = payload.fullName;
          }
          asgModified = true;
        }

        // Cek apakah staff ini ada di daftar Pengawas Lapangan pada penugasan ini
        if (updatedAsg.supervisors && updatedAsg.supervisors.length > 0) {
          updatedAsg.supervisors = updatedAsg.supervisors.map((spv) => {
            const spvNameLower = (spv.name || '').trim().toLowerCase();
            if (
              spv.staffId === payload.id ||
              (spvNameLower && (spvNameLower === oldNameLower || spvNameLower === newNameLower))
            ) {
              asgModified = true;
              return {
                ...spv,
                staffId: payload.id,
                name: payload.fullName,
                phone: payload.phone || spv.phone,
                jobRole: payload.jobRole,
                employeeIdNumber: payload.employeeIdNumber,
              };
            }
            return spv;
          });
        }

        if (asgModified) {
          assignmentsChanged = true;
          syncDocWrite(FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS, updatedAsg);
        }
        return updatedAsg;
      });

      if (assignmentsChanged) {
        saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, syncedAssignments);
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
        }
      }
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync', { detail: payload }));
    }
    return payload;
  },

  // Menghapus data staff beserta akun & TTD digital secara tuntas
  deleteStaff(id: string, _currentAuthUser?: AuthUser | null): boolean {
    const staffList = this.getCompanyStaff();
    const rawStoredStaff = loadFromStorage<CompanyStaff[]>(STORAGE_KEYS.COMPANY_STAFF, []);
    const target =
      staffList.find((s) => s.id === id) ||
      rawStoredStaff.find((s) => s.id === id) ||
      initialCompanyStaff.find((s) => s.id === id);

    if (target) {
      // Also delete linked ManagedUser account if exists
      if (target.linkedUserId) {
        this.deleteManagedUser(target.linkedUserId);
      }
      if (target.username) {
        const u = this.getManagedUserByUsername(target.username);
        if (u) this.deleteManagedUser(u.id);
      }
      const fullNameLower = (target.fullName || '').trim().toLowerCase();
      if (fullNameLower) {
        const matchingUsers = this.getManagedUsers().filter(
          (u) => (u.fullName || '').trim().toLowerCase() === fullNameLower
        );
        matchingUsers.forEach((u) => this.deleteManagedUser(u.id));
      }
    }

    // Record deleted staff ID so it will not be re-seeded from initialCompanyStaff or Firestore
    const deletedStaffIds = loadFromStorage<string[]>(STORAGE_KEYS.DELETED_STAFF_IDS, []);
    if (!deletedStaffIds.includes(id)) {
      saveToStorage(STORAGE_KEYS.DELETED_STAFF_IDS, [...deletedStaffIds, id]);
    }

    const filtered = staffList.filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEYS.COMPANY_STAFF, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync', { detail: { deletedId: id } }));
    }
    return true;
  },

  deleteCompanyStaff(id: string, currentAuthUser?: AuthUser | null): boolean {
    return this.deleteStaff(id, currentAuthUser);
  },

  // Clear all data in Master Data Proyek (Clients, Blocks, Equipments, Work Assignments, Daily Targets)
  clearMasterProjectData(): void {
    saveToStorage(STORAGE_KEYS.CLIENTS, []);
    saveToStorage(STORAGE_KEYS.PROJECTS, []);
    saveToStorage(STORAGE_KEYS.BLOCKS, []);
    saveToStorage(STORAGE_KEYS.EQUIPMENTS, []);
    saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, []);
    saveToStorage(STORAGE_KEYS.DAILY_TARGETS, []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_master' } }));
    }
  },

  // Clear sub menu 3 (Personil Tim pendukung: Operator, Mekanik, Logistik, Pendukung)
  // Clear sub menu 3 (Personil Tim pendukung: Operator, Mekanik, Logistik, Pendukung)
  clearWorkers(): void {
    saveToStorage(STORAGE_KEYS.WORKERS, []);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_workers_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'workers' } }));
    }
  },

  // =========================================================================
  // DATA RECOVERY & CACHE DIAGNOSTICS SUITE (FOR DIRECTORS)
  // =========================================================================

  getStorageDiagnostics(): {
    totalKeys: number;
    totalBytes: number;
    formattedTotalSize: string;
    estimatedQuotaBytes: number;
    quotaUsedPercent: number;
    totalAnomaliesCount: number;
    keys: Array<{
      key: string;
      label: string;
      category: 'master' | 'operational' | 'system' | 'auth';
      rawBytes: number;
      formattedSize: string;
      itemCount: number;
      isJsonValid: boolean;
      hasAnomalies: boolean;
      anomalyDescriptions: string[];
    }>;
    firestoreStatus: {
      databaseId: string;
      projectId: string;
      isReady: boolean;
    };
  } {
    if (typeof window === 'undefined') {
      return {
        totalKeys: 0,
        totalBytes: 0,
        formattedTotalSize: '0 KB',
        estimatedQuotaBytes: 5242880,
        quotaUsedPercent: 0,
        totalAnomaliesCount: 0,
        keys: [],
        firestoreStatus: {
          databaseId: 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
          projectId: 'gen-lang-client-0997069506',
          isReady: false,
        },
      };
    }

    const trackedKeys: Array<{
      key: string;
      label: string;
      category: 'master' | 'operational' | 'system' | 'auth';
    }> = [
      { key: STORAGE_KEYS.REPORTS, label: 'Laporan Harian Land Clearing', category: 'operational' },
      { key: STORAGE_KEYS.CLIENTS, label: 'Master Klien & SPK Perkebunan', category: 'master' },
      { key: STORAGE_KEYS.BLOCKS, label: 'Master Blok & Lokasi Kerja', category: 'master' },
      { key: STORAGE_KEYS.EQUIPMENTS, label: 'Master Alat Berat & Rasio BBM', category: 'master' },
      { key: STORAGE_KEYS.WORK_ASSIGNMENTS, label: 'Master Penugasan Kerja Lapangan', category: 'master' },
      { key: STORAGE_KEYS.DAILY_TARGETS, label: 'Master Target Ritme Harian', category: 'master' },
      { key: STORAGE_KEYS.WORKERS, label: 'Master Personil Tim Pendukung', category: 'master' },
      { key: STORAGE_KEYS.INVENTORY, label: 'Inventaris Logistik & Solar B50', category: 'operational' },
      { key: STORAGE_KEYS.LOGISTICS_TRANSACTIONS, label: 'Transaksi Masuk/Keluar Logistik', category: 'operational' },
      { key: STORAGE_KEYS.P2H_CHECKLISTS, label: 'P2H Pra-Operasi Harian Alat', category: 'operational' },
      { key: STORAGE_KEYS.FUEL_BOWSER, label: 'Penerimaan Solar Bowser Keliling', category: 'operational' },
      { key: STORAGE_KEYS.SOIL_INCIDENTS, label: 'Log Bahaya & Insiden Gambut K3', category: 'operational' },
      { key: STORAGE_KEYS.GEOTAG_PHOTOS, label: 'Foto Bukti Geotag & Watermark', category: 'operational' },
      { key: STORAGE_KEYS.COMPANY_STAFF, label: 'Staff Manajemen & TTD Resmi', category: 'master' },
      { key: STORAGE_KEYS.MANAGED_USERS, label: 'Akun Pengguna Sistem & Kredensial', category: 'master' },
      { key: STORAGE_KEYS.COMPANY_PROFILE, label: 'Profil Perusahaan & Logo Resmi', category: 'master' },
      { key: STORAGE_KEYS.USER_ACTIVITIES, label: 'Log Riwayat Audit Aktivitas & GPS', category: 'system' },
      { key: 'suryaland_auth_diagnostic_logs_v1', label: 'Log Diagnostik Autentikasi Sesi', category: 'system' },
      { key: 'suryaland_auth_user_v1', label: 'Sesi Akun Pengguna Aktif', category: 'auth' },
      { key: 'suryaland_session_token_v1', label: 'Token Sesi Terotentikasi', category: 'auth' },
      { key: 'lastLoginTimestamp', label: 'Timestamp Waktu Login Terakhir', category: 'auth' },
      { key: 'suryaland_last_activity_v1', label: 'Timestamp Aktivitas Sesi (Idle)', category: 'auth' },
      { key: STORAGE_KEYS.DELETED_STAFF_IDS, label: 'Indeks ID Staff Terhapus', category: 'system' },
      { key: STORAGE_KEYS.DELETED_USER_IDS, label: 'Indeks ID Pengguna Terhapus', category: 'system' },
    ];

    let totalBytes = 0;
    let totalAnomaliesCount = 0;

    const keyDiagnostics = trackedKeys.map(({ key, label, category }) => {
      const raw = localStorage.getItem(key);
      const rawBytes = raw ? new Blob([raw]).size : 0;
      totalBytes += rawBytes;

      let isJsonValid = true;
      let itemCount = 0;
      const anomalyDescriptions: string[] = [];

      if (raw !== null) {
        try {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            itemCount = parsed.length;
            // Check for null or undefined entries
            const nullCount = parsed.filter((x) => x === null || x === undefined).length;
            if (nullCount > 0) {
              anomalyDescriptions.push(`${nullCount} entri kosong (null) terdeteksi.`);
            }

            // Check duplicate IDs
            const idMap = new Map<string, number>();
            let dupeCount = 0;
            parsed.forEach((item) => {
              if (item && item.id) {
                const count = idMap.get(item.id) || 0;
                idMap.set(item.id, count + 1);
                if (count === 1) dupeCount++;
              }
            });
            if (dupeCount > 0) {
              anomalyDescriptions.push(`${dupeCount} ID duplikat ditemukan dalam daftar.`);
            }

            // Check NaN in critical numeric fields
            let nanCount = 0;
            parsed.forEach((item) => {
              if (item && typeof item === 'object') {
                Object.values(item).forEach((v) => {
                  if (typeof v === 'number' && Number.isNaN(v)) nanCount++;
                });
              }
            });
            if (nanCount > 0) {
              anomalyDescriptions.push(`${nanCount} nilai angka invalid (NaN) terdeteksi.`);
            }
          } else if (typeof parsed === 'object' && parsed !== null) {
            itemCount = 1;
            let nanCount = 0;
            Object.values(parsed).forEach((v) => {
              if (typeof v === 'number' && Number.isNaN(v)) nanCount++;
            });
            if (nanCount > 0) {
              anomalyDescriptions.push(`${nanCount} nilai angka invalid (NaN) terdeteksi.`);
            }
          } else {
            itemCount = 1;
          }
        } catch {
          // If raw is a plain timestamp number or string
          const parsedNum = Number(raw);
          if (key === 'lastLoginTimestamp' || key === 'suryaland_last_activity_v1') {
            if (Number.isNaN(parsedNum) || parsedNum <= 0 || parsedNum > Date.now() + 300000) {
              isJsonValid = false;
              anomalyDescriptions.push('Timestamp kedaluwarsa prematur atau format angka rusak.');
            } else {
              itemCount = 1;
            }
          } else {
            isJsonValid = false;
            anomalyDescriptions.push('Format JSON rusak (SyntaxError / Corrupted String).');
          }
        }
      }

      const hasAnomalies = anomalyDescriptions.length > 0 || !isJsonValid;
      if (hasAnomalies) {
        totalAnomaliesCount += anomalyDescriptions.length || 1;
      }

      return {
        key,
        label,
        category,
        rawBytes,
        formattedSize: rawBytes > 1048576 
          ? `${(rawBytes / 1048576).toFixed(2)} MB` 
          : `${(rawBytes / 1024).toFixed(1)} KB`,
        itemCount,
        isJsonValid,
        hasAnomalies,
        anomalyDescriptions,
      };
    });

    const estimatedQuotaBytes = 5 * 1024 * 1024; // 5 MB standard localStorage quota
    const quotaUsedPercent = Math.min(100, Number(((totalBytes / estimatedQuotaBytes) * 100).toFixed(2)));

    return {
      totalKeys: keyDiagnostics.length,
      totalBytes,
      formattedTotalSize: totalBytes > 1048576 
        ? `${(totalBytes / 1048576).toFixed(2)} MB` 
        : `${(totalBytes / 1024).toFixed(1)} KB`,
      estimatedQuotaBytes,
      quotaUsedPercent,
      totalAnomaliesCount,
      keys: keyDiagnostics,
      firestoreStatus: {
        databaseId: 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
        projectId: 'gen-lang-client-0997069506',
        isReady: typeof window !== 'undefined' && navigator.onLine,
      },
    };
  },

  repairAllStorageAnomalies(): {
    fixedCount: number;
    repairedKeys: string[];
    details: string[];
    timestamp: string;
  } {
    if (typeof window === 'undefined') {
      return { fixedCount: 0, repairedKeys: [], details: [], timestamp: new Date().toISOString() };
    }

    const repairedKeys: string[] = [];
    const details: string[] = [];
    let fixedCount = 0;

    // 1. Sanitize & Deduplicate all array storage collections
    const arrayKeys = [
      STORAGE_KEYS.REPORTS,
      STORAGE_KEYS.CLIENTS,
      STORAGE_KEYS.BLOCKS,
      STORAGE_KEYS.EQUIPMENTS,
      STORAGE_KEYS.WORK_ASSIGNMENTS,
      STORAGE_KEYS.DAILY_TARGETS,
      STORAGE_KEYS.WORKERS,
      STORAGE_KEYS.INVENTORY,
      STORAGE_KEYS.LOGISTICS_TRANSACTIONS,
      STORAGE_KEYS.P2H_CHECKLISTS,
      STORAGE_KEYS.FUEL_BOWSER,
      STORAGE_KEYS.SOIL_INCIDENTS,
      STORAGE_KEYS.GEOTAG_PHOTOS,
      STORAGE_KEYS.COMPANY_STAFF,
      STORAGE_KEYS.MANAGED_USERS,
      STORAGE_KEYS.DELETED_STAFF_IDS,
      STORAGE_KEYS.DELETED_USER_IDS,
    ];

    for (const key of arrayKeys) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          let parsed: any;
          try {
            parsed = JSON.parse(raw);
          } catch {
            localStorage.setItem(key, JSON.stringify([]));
            repairedKeys.push(key);
            details.push(`Mereset key rusak [${key}] ke array kosong yang valid.`);
            fixedCount++;
            continue;
          }

          if (Array.isArray(parsed)) {
            let keyModified = false;
            // Filter out null/undefined
            const nonNull = parsed.filter((it) => it !== null && it !== undefined);
            if (nonNull.length !== parsed.length) {
              keyModified = true;
              fixedCount += parsed.length - nonNull.length;
              details.push(`Menghapus ${parsed.length - nonNull.length} entri null pada [${key}].`);
            }

            // Deduplicate by item ID if items have IDs
            const seenIds = new Set<string>();
            const deduplicated: any[] = [];
            for (const item of nonNull) {
              if (item && item.id) {
                if (seenIds.has(item.id)) {
                  keyModified = true;
                  fixedCount++;
                  continue;
                }
                seenIds.add(item.id);
              }

              // Sanitize NaN in object properties
              if (item && typeof item === 'object') {
                for (const prop of Object.keys(item)) {
                  if (typeof item[prop] === 'number' && Number.isNaN(item[prop])) {
                    item[prop] = 0;
                    keyModified = true;
                    fixedCount++;
                  }
                }
              }
              deduplicated.push(item);
            }

            if (keyModified) {
              localStorage.setItem(key, JSON.stringify(deduplicated));
              if (!repairedKeys.includes(key)) repairedKeys.push(key);
              details.push(`Deduplikasi & sanitasi angka sukses pada [${key}].`);
            }
          }
        }
      } catch (err) {
        console.warn(`Error repairing array key ${key}:`, err);
      }
    }

    // 2. Repair Session & Idle timestamps
    const now = Date.now();
    try {
      const rawLastLogin = localStorage.getItem('lastLoginTimestamp');
      if (rawLastLogin !== null) {
        const ts = Number(rawLastLogin);
        if (Number.isNaN(ts) || ts <= 0 || ts > now + 300000) {
          localStorage.setItem('lastLoginTimestamp', now.toString());
          repairedKeys.push('lastLoginTimestamp');
          details.push('Memperbaiki timestamp lastLoginTimestamp yang kedaluwarsa/rusak.');
          fixedCount++;
        }
      }

      const rawLastActivity = localStorage.getItem('suryaland_last_activity_v1');
      if (rawLastActivity !== null) {
        const act = parseInt(rawLastActivity, 10);
        if (Number.isNaN(act) || act <= 0 || act > now + 300000) {
          localStorage.setItem('suryaland_last_activity_v1', now.toString());
          repairedKeys.push('suryaland_last_activity_v1');
          details.push('Memperbaiki timestamp idle suryaland_last_activity_v1.');
          fixedCount++;
        }
      }

      const rawToken = localStorage.getItem('suryaland_session_token_v1');
      if (rawToken !== null) {
        try {
          const tok = JSON.parse(rawToken);
          if (!tok || typeof tok !== 'object' || !tok.username) {
            localStorage.removeItem('suryaland_session_token_v1');
            repairedKeys.push('suryaland_session_token_v1');
            details.push('Menghapus token sesi yang rusak.');
            fixedCount++;
          }
        } catch {
          localStorage.removeItem('suryaland_session_token_v1');
          repairedKeys.push('suryaland_session_token_v1');
          details.push('Mereset token sesi tidak valid.');
          fixedCount++;
        }
      }
    } catch (err) {
      console.warn('Session repair error:', err);
    }

    // 3. Re-sync companyStaff to managedUsers
    try {
      const staffList = this.getCompanyStaff();
      let usersList = this.getManagedUsers();
      let staffResynced = false;

      staffList.forEach((st) => {
        if (!st.username || !st.password) return;
        const norm = normalizeUsername(st.username);
        const existingIdx = usersList.findIndex((u) => normalizeUsername(u.username) === norm);
        if (existingIdx === -1) {
          usersList.push({
            id: st.linkedUserId || `user-usr-${(st.id || '').replace(/^staff-/, '')}`,
            username: norm,
            password: st.password,
            fullName: st.fullName,
            address: st.address || '',
            whatsappNumber: st.phone || '',
            jobTitle: st.jobRole || 'Staff',
            userLevel: (st.userLevel as any) || 'Pengawas',
            email: st.email || '',
            status: st.status || 'Aktif',
            employeeIdNumber: st.employeeIdNumber || '',
            assignedClientId: st.assignedClientId,
            assignedClientName: st.assignedClientName,
            assignedBlockCodes: st.assignedBlockCodes,
            createdAt: st.createdAt || new Date().toISOString(),
          });
          staffResynced = true;
          fixedCount++;
        }
      });

      if (staffResynced) {
        localStorage.setItem(STORAGE_KEYS.MANAGED_USERS, JSON.stringify(usersList));
        repairedKeys.push('staff_to_users_resync');
        details.push('Sinkronisasi akun login dari daftar Staff Manajemen berhasil.');
      }
    } catch (err) {
      console.warn('Staff user resync notice:', err);
    }

    // 4. Dispatch synchronization events to refresh UI
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_repaired' } }));
      window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_reports_sync'));
    }

    const result = {
      fixedCount,
      repairedKeys,
      details,
      timestamp: new Date().toISOString(),
    };

    return result;
  },

  repairSingleStorageKey(targetKey: string): { success: boolean; message: string } {
    if (typeof window === 'undefined') return { success: false, message: 'Window tidak tersedia' };
    try {
      const raw = localStorage.getItem(targetKey);
      if (raw === null) {
        return { success: true, message: `Key ${targetKey} kosong, tidak ada perbaikan yang diperlukan.` };
      }

      let parsed: any;
      try {
        parsed = JSON.parse(raw);
      } catch {
        localStorage.setItem(targetKey, JSON.stringify([]));
        window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: targetKey } }));
        return { success: true, message: `Key ${targetKey} yang rusak berhasil direset ke format valid.` };
      }

      if (Array.isArray(parsed)) {
        const seen = new Set<string>();
        const sanitized: any[] = [];
        for (const it of parsed) {
          if (!it) continue;
          if (it.id) {
            if (seen.has(it.id)) continue;
            seen.add(it.id);
          }
          if (typeof it === 'object') {
            for (const p of Object.keys(it)) {
              if (typeof it[p] === 'number' && Number.isNaN(it[p])) {
                it[p] = 0;
              }
            }
          }
          sanitized.push(it);
        }
        localStorage.setItem(targetKey, JSON.stringify(sanitized));
        window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: targetKey } }));
        return { success: true, message: `Daftar ${targetKey} berhasil disanitasi (${sanitized.length} data valid).` };
      }

      return { success: true, message: `Struktur data pada ${targetKey} sudah dalam kondisi normal.` };
    } catch (e: any) {
      return { success: false, message: e?.message || 'Gagal memperbaiki key' };
    }
  },

  exportCompleteDatabaseDump(): {
    appName: string;
    exportedAt: string;
    databaseId: string;
    appletId: string;
    totalCollections: number;
    totalRecords: number;
    storageData: Record<string, any>;
  } {
    const collectionsToExport = Object.values(STORAGE_KEYS);
    const dumpData: Record<string, any> = {};
    let totalRecords = 0;

    for (const key of collectionsToExport) {
      try {
        const raw = localStorage.getItem(key);
        if (raw !== null) {
          try {
            const parsed = JSON.parse(raw);
            dumpData[key] = parsed;
            if (Array.isArray(parsed)) totalRecords += parsed.length;
            else totalRecords += 1;
          } catch {
            dumpData[key] = raw;
          }
        }
      } catch (err) {
        console.warn(`Export dump notice for key ${key}:`, err);
      }
    }

    // Include diagnostic logs and audit logs
    try {
      const diagRaw = localStorage.getItem('suryaland_auth_diagnostic_logs_v1');
      if (diagRaw) dumpData['suryaland_auth_diagnostic_logs_v1'] = JSON.parse(diagRaw);
    } catch {}

    return {
      appName: 'Suryaland / PT. RBS GROUP Land Clearing Executive Database',
      exportedAt: new Date().toISOString(),
      databaseId: 'ai-studio-suryalandapps-620aaec9-a67b-4df9-82c6-3c7cbc90551b',
      appletId: '9124ebcf-25d8-430e-bb46-d7d118bbffe3',
      totalCollections: Object.keys(dumpData).length,
      totalRecords,
      storageData: dumpData,
    };
  },

  importCompleteDatabaseDump(dump: any): { success: boolean; importedKeys: string[]; message: string } {
    if (!dump || typeof dump !== 'object' || !dump.storageData) {
      return {
        success: false,
        importedKeys: [],
        message: 'File cadangan tidak valid: properti "storageData" tidak ditemukan.',
      };
    }

    const importedKeys: string[] = [];
    try {
      for (const [key, value] of Object.entries(dump.storageData)) {
        if (!key.startsWith('suryaland_') && key !== 'lastLoginTimestamp') continue;
        if (value !== undefined) {
          localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value));
          importedKeys.push(key);
        }
      }

      // Dispatch synchronization events
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_restored' } }));
        window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
        window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
        window.dispatchEvent(new CustomEvent('suryaland_reports_sync'));
      }

      return {
        success: true,
        importedKeys,
        message: `Berhasil memulihkan ${importedKeys.length} koleksi data ke penyimpanan lokal.`,
      };
    } catch (err: any) {
      return {
        success: false,
        importedKeys,
        message: `Gagal memulihkan cadangan: ${err?.message || 'Kesalahan I/O memori'}`,
      };
    }
  },

  // Full-Database Universal Deduplication Engine (Local & Firestore Cloud)
  async deduplicateAllDatabase(): Promise<{
    totalRemoved: number;
    details: Record<string, number>;
    cloudPurgedCount: number;
  }> {
    let totalRemoved = 0;
    const details: Record<string, number> = {};

    const collectionsToDeduplicate: Array<{ storageKey: string; firestoreName: string }> = [
      { storageKey: STORAGE_KEYS.COMPANY_STAFF, firestoreName: FIRESTORE_COLLECTIONS.COMPANY_STAFF },
      { storageKey: STORAGE_KEYS.MANAGED_USERS, firestoreName: FIRESTORE_COLLECTIONS.USERS },
      { storageKey: STORAGE_KEYS.CLIENTS, firestoreName: FIRESTORE_COLLECTIONS.CLIENTS },
      { storageKey: STORAGE_KEYS.BLOCKS, firestoreName: FIRESTORE_COLLECTIONS.BLOCKS },
      { storageKey: STORAGE_KEYS.EQUIPMENTS, firestoreName: FIRESTORE_COLLECTIONS.EQUIPMENTS },
      { storageKey: STORAGE_KEYS.WORKERS, firestoreName: FIRESTORE_COLLECTIONS.WORKERS },
      { storageKey: STORAGE_KEYS.DAILY_TARGETS, firestoreName: FIRESTORE_COLLECTIONS.DAILY_TARGETS },
      { storageKey: STORAGE_KEYS.WORK_ASSIGNMENTS, firestoreName: FIRESTORE_COLLECTIONS.WORK_ASSIGNMENTS },
      { storageKey: STORAGE_KEYS.REPORTS, firestoreName: FIRESTORE_COLLECTIONS.REPORTS },
      { storageKey: STORAGE_KEYS.INVENTORY, firestoreName: FIRESTORE_COLLECTIONS.INVENTORY },
      { storageKey: STORAGE_KEYS.P2H_CHECKLISTS, firestoreName: FIRESTORE_COLLECTIONS.P2H },
      { storageKey: STORAGE_KEYS.FUEL_BOWSER, firestoreName: FIRESTORE_COLLECTIONS.BOWSER },
      { storageKey: STORAGE_KEYS.SOIL_INCIDENTS, firestoreName: FIRESTORE_COLLECTIONS.SOIL },
    ];

    for (const col of collectionsToDeduplicate) {
      try {
        const raw = localStorage.getItem(col.storageKey);
        if (raw) {
          const list = JSON.parse(raw);
          if (Array.isArray(list) && list.length > 0) {
            const { cleanList, removedDocIds } = deduplicateCollectionItems(col.firestoreName, list);
            if (removedDocIds.length > 0) {
              totalRemoved += removedDocIds.length;
              details[col.storageKey] = removedDocIds.length;
              removedDocIds.forEach((dupId) => {
                syncDocDelete(col.firestoreName, dupId);
              });
              saveToStorage(col.storageKey, cleanList);
            }
          }
        }
      } catch (err) {
        console.warn(`Deduplicate notice on ${col.storageKey}:`, err);
      }
    }

    // Run full cloud Firestore purge
    let cloudPurgedCount = 0;
    try {
      const cloudRes = await purgeAllCloudDuplicates();
      cloudPurgedCount = cloudRes.purgedCount;
    } catch (err) {
      console.warn('Cloud purge notice:', err);
    }

    // Refresh staff & users to guarantee 100% active status
    this.getCompanyStaff();
    this.getManagedUsers();

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
      window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_deduplicated' } }));
    }

    return { totalRemoved, details, cloudPurgedCount };
  },

  // Reset database to initial seed
  resetToDefault(): void {
    saveToStorage(STORAGE_KEYS.DELETED_STAFF_IDS, []);
    saveToStorage(STORAGE_KEYS.DELETED_USER_IDS, []);
    saveToStorage(STORAGE_KEYS.REPORTS, initialDailyReports);
    saveToStorage(STORAGE_KEYS.EQUIPMENTS, initialEquipments);
    saveToStorage(STORAGE_KEYS.WORKERS, initialWorkers);
    saveToStorage(STORAGE_KEYS.BLOCKS, initialBlocks);
    saveToStorage(STORAGE_KEYS.INVENTORY, initialInventory);
    saveToStorage(STORAGE_KEYS.CLIENTS, initialClients);
    saveToStorage(STORAGE_KEYS.PROJECTS, initialProjects);
    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, initialLogisticsTransactions);
    saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, initialP2HChecklists);
    saveToStorage(STORAGE_KEYS.FUEL_BOWSER, initialFuelBowserReceipts);
    saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, initialSoilIncidents);
    saveToStorage(STORAGE_KEYS.USER_ACTIVITIES, this.getUserActivities());
    saveToStorage(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
    saveToStorage(STORAGE_KEYS.JOB_TITLES, initialJobTitles);
    saveToStorage(STORAGE_KEYS.COMPANY_PROFILE, initialCompanyProfile);
    saveToStorage(STORAGE_KEYS.COMPANY_STAFF, initialCompanyStaff);
    saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, initialWorkAssignments);
    saveToStorage(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    this.clearDraft();
  },
};
