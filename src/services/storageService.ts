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
  SoilHazardIncident
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
  initialSoilIncidents
} from '../data/mockData';

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
  DRAFT_REPORT: 'suryaland_report_wizard_draft_v1',
  P2H_CHECKLISTS: 'suryaland_p2h_checklists_v1',
  FUEL_BOWSER: 'suryaland_fuel_bowser_v1',
  SOIL_INCIDENTS: 'suryaland_soil_incidents_v1',
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
  // Reports
  getReports(selectedClientId?: string): DailyReport[] {
    const all = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    if (!selectedClientId || selectedClientId === 'ALL') {
      return all;
    }
    return all.filter((r) => r.clientId === selectedClientId);
  },

  getReportById(id: string): DailyReport | undefined {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    return reports.find((r) => r.id === id);
  },

  saveReport(report: DailyReport): DailyReport {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const existingIndex = reports.findIndex((r) => r.id === report.id);

    if (existingIndex >= 0) {
      reports[existingIndex] = {
        ...report,
        updatedAt: new Date().toISOString(),
      };
    } else {
      reports.unshift({
        ...report,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }

    saveToStorage(STORAGE_KEYS.REPORTS, reports);

    // Update block cleared area & equipments current HM
    this.syncBlockAndEquipments(report);

    // Clear saved wizard draft
    this.clearDraft();

    return report;
  },

  deleteReport(id: string): boolean {
    const reports = loadFromStorage<DailyReport[]>(STORAGE_KEYS.REPORTS, initialDailyReports);
    const filtered = reports.filter((r) => r.id !== id);
    if (filtered.length !== reports.length) {
      saveToStorage(STORAGE_KEYS.REPORTS, filtered);
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
    }

    // 2. Update Client progress
    const clients = this.getClients();
    const client = clients.find((c) => c.id === report.clientId);
    if (client) {
      client.clearedAreaHa = report.physicalProgress.cumulativeAreaHa;
      saveToStorage(STORAGE_KEYS.CLIENTS, clients);
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
  },

  deleteEquipment(equipmentId: string): boolean {
    const list = this.getEquipments();
    const filtered = list.filter((e) => e.id !== equipmentId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.EQUIPMENTS, filtered);
      return true;
    }
    return false;
  },

  // Workers
  getWorkers(): Worker[] {
    return loadFromStorage<Worker[]>(STORAGE_KEYS.WORKERS, initialWorkers);
  },

  saveWorker(worker: Worker): void {
    const list = this.getWorkers();
    const idx = list.findIndex((w) => w.id === worker.id);
    if (idx >= 0) list[idx] = worker;
    else list.push(worker);
    saveToStorage(STORAGE_KEYS.WORKERS, list);
  },

  deleteWorker(workerId: string): boolean {
    const list = this.getWorkers();
    const filtered = list.filter((w) => w.id !== workerId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.WORKERS, filtered);
      return true;
    }
    return false;
  },

  // Blocks
  getBlocks(clientId?: string): Block[] {
    const all = loadFromStorage<Block[]>(STORAGE_KEYS.BLOCKS, initialBlocks);
    if (!clientId || clientId === 'ALL') return all;
    return all.filter((b) => b.clientId === clientId);
  },

  saveBlock(block: Block): Block {
    const list = this.getBlocks();
    const idx = list.findIndex((b) => b.id === block.id);
    if (idx >= 0) list[idx] = block;
    else list.push(block);
    saveToStorage(STORAGE_KEYS.BLOCKS, list);
    return block;
  },

  deleteBlock(blockId: string): boolean {
    const list = this.getBlocks();
    const filtered = list.filter((b) => b.id !== blockId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.BLOCKS, filtered);
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

    // Also auto-create a project if not existing
    const projects = this.getProjects();
    if (!projects.some((p) => p.clientId === client.id)) {
      projects.push({
        id: `proj-${Date.now()}`,
        clientId: client.id,
        name: client.projectName || `Land Clearing ${client.name}`,
        location: client.location || client.address || 'Riau',
        method: 'Zero Burning Method (Metode Tanpa Bakar)',
        totalTargetHa: client.totalAreaHa || 100,
        startDate: new Date().toISOString().slice(0, 10),
        targetCompletionDate: new Date(Date.now() + 90 * 86400000).toISOString().slice(0, 10),
      });
      saveToStorage(STORAGE_KEYS.PROJECTS, projects);
    }

    return client;
  },

  deleteClient(clientId: string): boolean {
    const list = this.getClients();
    const filtered = list.filter((c) => c.id !== clientId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.CLIENTS, filtered);
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
  getLogisticsTransactions(selectedClientId?: string): LogisticsTransaction[] {
    const list = loadFromStorage<LogisticsTransaction[]>(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, initialLogisticsTransactions);
    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((t) => !t.clientId || t.clientId === selectedClientId || t.clientId === 'ALL');
  },

  saveLogisticsTransaction(tx: LogisticsTransaction): LogisticsTransaction {
    const list = this.getLogisticsTransactions();
    const idx = list.findIndex((t) => t.id === tx.id);
    if (idx >= 0) {
      list[idx] = tx;
    } else {
      list.unshift(tx);
    }
    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);

    // If it is an outflow (pemakaian langsung diinput oleh pengawas), update inventory stock
    if (tx.type === 'out') {
      const invList = this.getInventory();
      const match = invList.find((i) => i.name.toLowerCase() === tx.itemName.toLowerCase() || i.category === tx.category);
      if (match) {
        match.stockQuantity = Math.max(0, match.stockQuantity - tx.quantity);
        this.saveInventory(match);
      }
    }

    return tx;
  },

  approveLogisticsInflow(txId: string, directorName: string): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'in') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    tx.approvalStatus = 'approved';
    tx.approvedByDirectorName = directorName;
    tx.approvedAt = formatted;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);

    // Add to actual inventory stock once Director approves
    const invList = this.getInventory();
    const match = invList.find((i) => i.name.toLowerCase() === tx.itemName.toLowerCase() || i.category === tx.category);
    if (match) {
      match.stockQuantity = match.stockQuantity + tx.quantity;
      this.saveInventory(match);
    }

    return tx;
  },

  rejectLogisticsInflow(txId: string, directorName: string, rejectionReason: string): LogisticsTransaction | null {
    const list = this.getLogisticsTransactions();
    const tx = list.find((t) => t.id === txId);
    if (!tx || tx.type !== 'in') return null;

    const now = new Date();
    const formatted = `${now.getDate()}/${now.getMonth() + 1}/${now.getFullYear()} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    tx.approvalStatus = 'rejected';
    tx.approvedByDirectorName = directorName;
    tx.approvedAt = formatted;
    tx.rejectionReason = rejectionReason;

    saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, list);
    return tx;
  },

  deleteLogisticsTransaction(txId: string): boolean {
    const list = this.getLogisticsTransactions();
    const filtered = list.filter((t) => t.id !== txId);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.LOGISTICS_TRANSACTIONS, filtered);
      return true;
    }
    return false;
  },

  // 1. P2H Checklists (Pemeriksaan Pra-Operasi)
  getP2HChecklists(selectedClientId?: string): DailyP2HChecklist[] {
    const list = loadFromStorage<DailyP2HChecklist[]>(STORAGE_KEYS.P2H_CHECKLISTS, initialP2HChecklists as unknown as DailyP2HChecklist[]);
    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveP2HChecklist(item: DailyP2HChecklist): DailyP2HChecklist {
    const list = this.getP2HChecklists();
    const idx = list.findIndex((i) => i.id === item.id);
    if (idx >= 0) {
      list[idx] = item;
    } else {
      list.unshift(item);
    }
    saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, list);
    return item;
  },

  deleteP2HChecklist(id: string): boolean {
    const list = this.getP2HChecklists();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.P2H_CHECKLISTS, filtered);
      return true;
    }
    return false;
  },

  // 4. Fuel Bowser Field Receipts
  getFuelBowserReceipts(selectedClientId?: string): FuelBowserReceipt[] {
    const list = loadFromStorage<FuelBowserReceipt[]>(STORAGE_KEYS.FUEL_BOWSER, initialFuelBowserReceipts as unknown as FuelBowserReceipt[]);
    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveFuelBowserReceipt(receipt: FuelBowserReceipt): FuelBowserReceipt {
    const list = this.getFuelBowserReceipts();
    const idx = list.findIndex((r) => r.id === receipt.id);
    if (idx >= 0) {
      list[idx] = receipt;
    } else {
      list.unshift(receipt);
    }
    saveToStorage(STORAGE_KEYS.FUEL_BOWSER, list);

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
    this.saveLogisticsTransaction(logisticsTx);

    return receipt;
  },

  deleteFuelBowserReceipt(id: string): boolean {
    const list = this.getFuelBowserReceipts();
    const filtered = list.filter((r) => r.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.FUEL_BOWSER, filtered);
      return true;
    }
    return false;
  },

  // 5. Soil & Safety Hazard Incidents
  getSoilIncidents(selectedClientId?: string): SoilHazardIncident[] {
    const list = loadFromStorage<SoilHazardIncident[]>(STORAGE_KEYS.SOIL_INCIDENTS, initialSoilIncidents as unknown as SoilHazardIncident[]);
    if (!selectedClientId || selectedClientId === 'ALL') {
      return list;
    }
    return list.filter((item) => item.clientId === selectedClientId);
  },

  saveSoilIncident(incident: SoilHazardIncident): SoilHazardIncident {
    const list = this.getSoilIncidents();
    const idx = list.findIndex((i) => i.id === incident.id);
    if (idx >= 0) {
      list[idx] = incident;
    } else {
      list.unshift(incident);
    }
    saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, list);
    return incident;
  },

  deleteSoilIncident(id: string): boolean {
    const list = this.getSoilIncidents();
    const filtered = list.filter((i) => i.id !== id);
    if (filtered.length !== list.length) {
      saveToStorage(STORAGE_KEYS.SOIL_INCIDENTS, filtered);
      return true;
    }
    return false;
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
    this.clearDraft();
  },
};
