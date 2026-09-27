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
  initialCompanyStaff
} from '../data/mockData';
import { 
  syncDocWrite, 
  syncDocDelete, 
  FIRESTORE_COLLECTIONS,
  initFirestoreSync
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
};

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
    console.error(`Error saving key ${key} to storage:`, err);
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

  // Reports
  getReports(selectedClientId?: string, authUser?: AuthUser | null): DailyReport[] {
    const all = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);

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
    // Isolasi ketat: Pengawas tidak bisa CRUD data di luar penugasan proyek dan blok
    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        throw new Error(
          `Akses Ditolak: Anda hanya berwenang membuat/mengubah laporan untuk ${authUser.assignedClientName || authUser.assignedClientId} pada lokasi (${authUser.assignedBlockCodes?.join(', ')}). Tidak diizinkan CRUD di luar tugas!`
        );
      }
    }

    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const existingIndex = reports.findIndex((r) => r.id === report.id);
    let savedReport: DailyReport;

    if (existingIndex >= 0) {
      savedReport = {
        ...report,
        updatedAt: new Date().toISOString(),
      };
      reports[existingIndex] = savedReport;
    } else {
      savedReport = {
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      reports.unshift(savedReport);
    }

    saveToStorage(STORAGE_KEYS.REPORTS, reports);
    syncDocWrite(FIRESTORE_COLLECTIONS.REPORTS, savedReport);

    // Update block cleared area & equipments current HM
    this.syncBlockAndEquipments(savedReport);

    // Clear saved wizard draft
    this.clearDraft();

    return savedReport;
  },

  deleteReport(id: string, authUser?: AuthUser | null): boolean {
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
    const idx = list.findIndex((e) => e.id === equip.id);
    if (idx >= 0) list[idx] = equip;
    else list.push(equip);
    saveToStorage(STORAGE_KEYS.EQUIPMENTS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.EQUIPMENTS, equip);
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
    const idx = list.findIndex((w) => w.id === worker.id);
    if (idx >= 0) list[idx] = worker;
    else list.push(worker);
    saveToStorage(STORAGE_KEYS.WORKERS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.WORKERS, worker);
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
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx >= 0) list[idx] = block;
    else list.push(block);
    saveToStorage(STORAGE_KEYS.BLOCKS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, block);
    return block;
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
    const idx = list.findIndex((t) => t.id === target.id);
    if (idx >= 0) {
      list[idx] = { ...target };
    } else {
      list.unshift({ ...target });
    }
    saveToStorage(STORAGE_KEYS.DAILY_TARGETS, list);

    // Sync baseline block.dailyTargetAreaHa if matching block
    const blocks = this.getBlocks();
    const block = blocks.find((b) => b.id === target.blockId);
    if (block) {
      block.dailyTargetAreaHa = target.dailyTargetAreaHa;
      saveToStorage(STORAGE_KEYS.BLOCKS, blocks);
      syncDocWrite(FIRESTORE_COLLECTIONS.BLOCKS, block);
    }

    return target;
  },

  deleteDailyTarget(targetId: string): boolean {
    const list = loadFromStorage<DailyLocationTarget[]>(STORAGE_KEYS.DAILY_TARGETS, initialDailyTargets);
    const filtered = list.filter((t) => t.id !== targetId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.DAILY_TARGETS, filtered);
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

    // Pastikan setiap penugasan memiliki assignmentNumber terisi
    const all = raw.map((asg, idx) => {
      if (asg.assignmentNumber) return asg;
      const client = clients.find((c) => c.id === asg.clientId);
      const generated = this.generateAssignmentNumber(client, asg.assignedDate, raw.slice(0, idx));
      return { ...asg, assignmentNumber: generated };
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
    const idx = list.findIndex((a) => a.id === assignment.id);
    
    // Pastikan ada assignmentNumber
    let finalAssignment = { ...assignment };
    if (!finalAssignment.assignmentNumber) {
      const client = this.getClientById(finalAssignment.clientId);
      finalAssignment.assignmentNumber = this.generateAssignmentNumber(client, finalAssignment.assignedDate, list);
    }

    if (idx >= 0) {
      list[idx] = finalAssignment;
    } else {
      list.unshift(finalAssignment);
    }
    saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, list);

    // Sync to Worker record
    if (finalAssignment.workerId) {
      const workers = this.getWorkers();
      const wIdx = workers.findIndex((w) => w.id === finalAssignment.workerId);
      if (wIdx >= 0) {
        workers[wIdx].assignedClientId = finalAssignment.clientId;
        workers[wIdx].assignedBlockId = finalAssignment.blockId;
        if (finalAssignment.equipmentId) {
          workers[wIdx].assignedEquipmentId = finalAssignment.equipmentId;
        }
        this.saveWorker(workers[wIdx]);
      }
    }

    return finalAssignment;
  },

  deleteWorkAssignment(id: string): boolean {
    const list = loadFromStorage<WorkAssignment[]>(STORAGE_KEYS.WORK_ASSIGNMENTS, initialWorkAssignments);
    const filtered = list.filter((a) => a.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.WORK_ASSIGNMENTS, filtered);
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
    return loadFromStorage<Client[]>(STORAGE_KEYS.CLIENTS, initialClients);
  },

  getClientById(id: string): Client | undefined {
    return this.getClients().find((c) => c.id === id);
  },

  saveClient(client: Client): Client {
    const list = this.getClients();
    const idx = list.findIndex((c) => c.id === client.id);
    if (idx >= 0) {
      list[idx] = client;
    } else {
      list.push(client);
    }
    saveToStorage(STORAGE_KEYS.CLIENTS, list);
    syncDocWrite(FIRESTORE_COLLECTIONS.CLIENTS, client);

    // Also auto-create a project if not existing
    const projects = this.getProjects();
    if (!projects.some((p) => p.clientId === client.id)) {
      const newProj: Project = {
        id: `proj-${Date.now()}`,
        clientId: client.id,
        name: client.projectName || `Land Clearing ${client.name}`,
        location: client.location || client.address || 'Riau',
        method: 'Zero Burning Method (Metode Tanpa Bakar)',
        totalTargetHa: client.totalAreaHa || 100,
        startDate: new Date().toISOString().slice(0, 10),
        targetCompletionDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      };
      projects.push(newProj);
      saveToStorage(STORAGE_KEYS.PROJECTS, projects);
      syncDocWrite(FIRESTORE_COLLECTIONS.PROJECTS, newProj);
    }

    return client;
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
    const list = this.getP2HChecklists();
    const target = list.find((i) => i.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.P2H, id);
      return true;
    }
    return false;
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
      itemName: 'Solar Industri B35',
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
    const list = this.getFuelBowserReceipts();
    const target = list.find((r) => r.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.FUEL_BOWSER, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.BOWSER, id);
      return true;
    }
    return false;
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
    const list = this.getSoilIncidents();
    const target = list.find((i) => i.id === id);
    if (!target) return false;

    if (authUser && authUser.role === 'supervisor') {
      if (!this.canSupervisorAccess(target.clientId, target.blockCode, authUser)) {
        return false;
      }
    }

    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.SOIL, id);
      return true;
    }
    return false;
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
        actionDescription: 'Mencatat pengisian solar dari Truk Bowser B 9821 TPA (Supir: Rahmat Santoso). Total: 1.200 Liter, Segel: S-7721, Status BBM: B35 Jernih/Lolos Uji Visual.',
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
        userName: 'Ir. Hendra Wijaya, M.Si',
        userRole: 'director',
        userEmail: 'direktur@suryaland.co.id',
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
    const raw = loadFromStorage<ManagedUser[]>(STORAGE_KEYS.MANAGED_USERS, initialManagedUsers);
    // Normalisasi: Direktur / Superadmin adalah Owner tanpa batasan penempatan proyek
    return raw.map((u) => {
      const jobLower = (u.jobTitle || '').toLowerCase();
      if (u.userLevel === 'Superadmin' || jobLower.includes('direktur')) {
        return {
          ...u,
          assignedClientId: 'all',
          assignedClientName: 'Semua Proyek (Owner)',
          assignedBlockCodes: u.assignedBlockCodes && u.assignedBlockCodes.length > 0 && !u.assignedBlockCodes.includes('Blok AB')
            ? u.assignedBlockCodes
            : ['Akses Semua Blok (Tanpa Batas)'],
        };
      }
      if (u.userLevel === 'Manager' || jobLower.includes('manager')) {
        return {
          ...u,
          assignedClientId: u.assignedClientId || 'all',
          assignedClientName: u.assignedClientName || 'Semua Proyek (Manager Operasional)',
          assignedBlockCodes: u.assignedBlockCodes && u.assignedBlockCodes.length > 0 && !u.assignedBlockCodes.includes('Blok AB')
            ? u.assignedBlockCodes
            : ['Akses Supervisi Semua Blok'],
        };
      }
      return u;
    });
  },

  getManagedUserById(id: string): ManagedUser | undefined {
    return this.getManagedUsers().find((u) => u.id === id);
  },

  getManagedUserByUsername(username: string): ManagedUser | undefined {
    const trimmed = (username || '').trim().toLowerCase();
    return this.getManagedUsers().find((u) => (u.username || '').trim().toLowerCase() === trimmed);
  },

  saveManagedUser(user: ManagedUser): ManagedUser {
    const list = this.getManagedUsers();
    const idx = list.findIndex((u) => u.id === user.id);

    // If Superadmin / Direktur: Owner tanpa batasan penempatan proyek
    const jobLower = (user.jobTitle || '').toLowerCase();
    const isSuper = user.userLevel === 'Superadmin' || jobLower.includes('direktur');
    const isManager = user.userLevel === 'Manager' || jobLower.includes('manager');
    const normalizedUser: ManagedUser = isSuper
      ? {
          ...user,
          assignedClientId: 'all',
          assignedClientName: 'Semua Proyek (Owner)',
          assignedBlockCodes: ['Akses Semua Blok (Tanpa Batas)'],
        }
      : isManager
      ? {
          ...user,
          assignedClientId: user.assignedClientId || 'all',
          assignedClientName: user.assignedClientName || 'Semua Proyek (Manager Operasional)',
          assignedBlockCodes: ['Akses Supervisi Semua Blok'],
        }
      : user;

    if (idx >= 0) {
      list[idx] = {
        ...normalizedUser,
        updatedAt: new Date().toISOString(),
      };
    } else {
      list.unshift({
        ...normalizedUser,
        createdAt: normalizedUser.createdAt || new Date().toISOString(),
      });
    }

    saveToStorage(STORAGE_KEYS.MANAGED_USERS, list);
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

  deleteManagedUser(userId: string): boolean {
    const list = this.getManagedUsers();
    const filtered = list.filter((u) => u.id !== userId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.MANAGED_USERS, filtered);
      syncDocDelete(FIRESTORE_COLLECTIONS.USERS, userId);
      return true;
    }
    return false;
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
    return loadFromStorage<CompanyProfile>(STORAGE_KEYS.COMPANY_PROFILE, initialCompanyProfile);
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
    const rawStaff = loadFromStorage<CompanyStaff[]>(STORAGE_KEYS.COMPANY_STAFF, initialCompanyStaff);
    const users = this.getManagedUsers();

    // Enrich staff with corresponding managed user credentials if not already set
    return rawStaff.map((staff) => {
      const staffUserLower = (staff.username || '').trim().toLowerCase();
      const staffNameLower = (staff.fullName || '').trim().toLowerCase();
      const matchedUser = users.find(
        (u) => (staff.linkedUserId && u.id === staff.linkedUserId) ||
               (staffUserLower && u.username && u.username.trim().toLowerCase() === staffUserLower) ||
               (staffNameLower && u.fullName && u.fullName.trim().toLowerCase() === staffNameLower)
      );

      if (matchedUser) {
        return {
          ...staff,
          username: staff.username || matchedUser.username,
          password: staff.password || matchedUser.password,
          userLevel: staff.userLevel || matchedUser.userLevel,
          address: staff.address || matchedUser.address,
          signatureUrl: staff.signatureUrl || matchedUser.signatureUrl,
          employeeIdNumber: staff.employeeIdNumber || matchedUser.employeeIdNumber || staff.employeeIdNumber,
          linkedUserId: matchedUser.id,
          assignedClientId: staff.assignedClientId || matchedUser.assignedClientId,
          assignedClientName: staff.assignedClientName || matchedUser.assignedClientName,
          assignedBlockCodes: staff.assignedBlockCodes || matchedUser.assignedBlockCodes,
        };
      }
      return staff;
    });
  },

  getStaffById(id: string): CompanyStaff | undefined {
    const staffList = this.getCompanyStaff();
    return staffList.find((s) => s.id === id);
  },

  saveCompanyStaff(staff: CompanyStaff): CompanyStaff {
    const staffList = this.getCompanyStaff();
    const existingIndex = staffList.findIndex((s) => s.id === staff.id);
    let updatedList: CompanyStaff[];
    const payload: CompanyStaff = {
      ...staff,
      updatedAt: new Date().toISOString(),
    };

    // Auto-synchronize to ManagedUser if credentials (username & password) exist
    if (payload.username && payload.password) {
      const users = this.getManagedUsers();
      const payloadUserLower = payload.username.trim().toLowerCase();
      const payloadNameLower = (payload.fullName || '').trim().toLowerCase();
      const existingUser = users.find(
        (u) => (payload.linkedUserId && u.id === payload.linkedUserId) ||
               (payloadUserLower && u.username && u.username.trim().toLowerCase() === payloadUserLower) ||
               (payloadNameLower && u.fullName && u.fullName.trim().toLowerCase() === payloadNameLower)
      );
      const userId = payload.linkedUserId || existingUser?.id || `user-usr-${payload.id.replace(/^staff-/, '')}`;
      payload.linkedUserId = userId;

      const userPayload: ManagedUser = {
        id: userId,
        fullName: payload.fullName.trim(),
        address: payload.address?.trim() || '',
        whatsappNumber: payload.phone?.trim() || '',
        email: payload.email?.trim() || '',
        jobTitle: payload.jobRole.trim(),
        userLevel: payload.userLevel || 'Pengawas',
        username: payload.username.trim().toLowerCase(),
        password: payload.password,
        signatureUrl: payload.signatureUrl,
        employeeIdNumber: payload.employeeIdNumber,
        assignedClientId: payload.assignedClientId,
        assignedClientName: payload.assignedClientName,
        assignedBlockCodes: payload.assignedBlockCodes,
        status: payload.status,
        notes: payload.notes,
        createdAt: existingUser?.createdAt || payload.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      this.saveManagedUser(userPayload);
    }

    if (existingIndex >= 0) {
      updatedList = [...staffList];
      updatedList[existingIndex] = payload;
    } else {
      updatedList = [payload, ...staffList];
    }

    saveToStorage(STORAGE_KEYS.COMPANY_STAFF, updatedList);
    syncDocWrite(FIRESTORE_COLLECTIONS.COMPANY_STAFF, payload);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync', { detail: payload }));
    }
    return payload;
  },

  deleteCompanyStaff(id: string): boolean {
    const staffList = this.getCompanyStaff();
    const target = staffList.find((s) => s.id === id);
    if (!target) return false;

    // Also delete linked ManagedUser account if exists
    if (target.linkedUserId) {
      this.deleteManagedUser(target.linkedUserId);
    } else if (target.username) {
      const u = this.getManagedUserByUsername(target.username);
      if (u) this.deleteManagedUser(u.id);
    }

    const filtered = staffList.filter((s) => s.id !== id);
    saveToStorage(STORAGE_KEYS.COMPANY_STAFF, filtered);
    syncDocDelete(FIRESTORE_COLLECTIONS.COMPANY_STAFF, id);
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync', { detail: { deletedId: id } }));
    }
    return true;
  },

  // Reset database to initial seed
  resetToDefault(): void {
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
