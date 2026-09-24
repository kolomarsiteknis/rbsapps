import { 
  DailyReport, 
  Equipment, 
  Worker, 
  Block, 
  InventoryItem, 
  Client, 
  Project 
} from '../types';
import { 
  initialDailyReports, 
  initialEquipments, 
  initialWorkers, 
  initialBlocks, 
  initialInventory, 
  initialClients, 
  initialProjects 
} from '../data/mockData';

const STORAGE_KEYS = {
  REPORTS: 'suryaland_reports_v1',
  EQUIPMENTS: 'suryaland_equipments_v1',
  WORKERS: 'suryaland_workers_v1',
  BLOCKS: 'suryaland_blocks_v1',
  INVENTORY: 'suryaland_inventory_v1',
  CLIENTS: 'suryaland_clients_v1',
  PROJECTS: 'suryaland_projects_v1',
  DRAFT_REPORT: 'suryaland_report_wizard_draft_v1',
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

  // Update block progress and equipment HM from report
  syncBlockAndEquipments(report: DailyReport): void {
    // 1. Update Block
    const blocks = this.getBlocks();
    const block = blocks.find((b) => b.id === report.blockId || b.code.includes(report.blockCode));
    if (block) {
      block.clearedAreaHa = report.physicalProgress.cumulativeAreaHa;
      block.drainageDoneM = report.physicalProgress.cumulativeDrainageM;
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

  // Reset database to initial seed
  resetToDefault(): void {
    saveToStorage(STORAGE_KEYS.REPORTS, initialDailyReports);
    saveToStorage(STORAGE_KEYS.EQUIPMENTS, initialEquipments);
    saveToStorage(STORAGE_KEYS.WORKERS, initialWorkers);
    saveToStorage(STORAGE_KEYS.BLOCKS, initialBlocks);
    saveToStorage(STORAGE_KEYS.INVENTORY, initialInventory);
    saveToStorage(STORAGE_KEYS.CLIENTS, initialClients);
    saveToStorage(STORAGE_KEYS.PROJECTS, initialProjects);
    this.clearDraft();
  },
};
