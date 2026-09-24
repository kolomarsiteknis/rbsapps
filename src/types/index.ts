export type UserRole = 'supervisor' | 'director' | 'client';

export interface AuthUser {
  username: string;
  displayName: string;
  role: 'supervisor' | 'director';
  roleTitle: string;
  loginTime: string;
}

export type WeatherCondition = 
  | 'Cerah'
  | 'Gerimis'
  | 'Hujan Lebat'
  | 'Banjir'
  | 'Cerah - Hujan Sore';

export type AttendanceStatus = 'Hadir' | 'Izin' | 'Sakit' | 'Alpa';

export type BreakdownCategory = 
  | 'Mesin'
  | 'Hidrolik'
  | 'Undercarriage'
  | 'Selang Pecah'
  | 'Elektrikal'
  | 'Attachment / Bucket'
  | 'Lainnya';

export type EquipmentType = 'Excavator' | 'Bulldozer' | 'Dump Truck' | 'Motor Grader' | 'Vibro Roller';

export type EquipmentStatus = 'Operasional' | 'Breakdown' | 'Standby' | 'Perawatan Rutin';

export interface Client {
  id: string;
  name: string; // e.g. "PT. A", "PT. B", "PT. D"
  fullCompanyName: string; // e.g. "PT. AGRO PERDANA MANDIRI"
  address: string;
  contactPerson: string;
  phone: string;
  contractNumber: string; // e.g. "045/SPK-LC/PTA/VI/2026"
  projectName: string;
  location: string;
  totalAreaHa: number;
  clearedAreaHa: number;
  status: 'Aktif' | 'Selesai' | 'Masa Tenggang';
}

export interface Project {
  id: string;
  clientId: string;
  name: string; // "Land Clearing Perkebunan PT. A"
  location: string; // "Riau / Sumatera"
  method: string; // "Zero Burning Method (Metode Tanpa Bakar)"
  totalTargetHa: number; // 100 Ha
  startDate: string;
  targetCompletionDate: string;
}

export interface Block {
  id: string;
  projectId: string;
  clientId: string;
  code: string; // "Blok AB"
  targetAreaHa: number; // 100 Ha
  dailyTargetAreaHa?: number; // Target harian Land Clearing (Ha) yang ditentukan oleh Direktur (misal: 4.0 Ha)
  clearedAreaHa: number; // current cleared
  status: 'Dalam Pengerjaan' | 'Belum Dimulai' | 'Selesai';
}

// Target Harian Land Clearing (Ha) per hari per lokasi kerja
export interface DailyLocationTarget {
  id: string; // e.g. "DT-2026-09-24-blk-1"
  clientId: string;
  clientName?: string;
  blockId: string;
  blockCode: string;
  date: string; // YYYY-MM-DD
  dailyTargetAreaHa: number; // Target Luas Harian (Ha) misal: 4.0 Ha
  soilType?: 'Tanah Mineral' | 'Tanah Gambut Dangkal' | 'Tanah Gambut Dalam' | 'Rawa / Rendahan';
  vegetationDensity?: 'Rapat / Kayu Besar' | 'Sedang / Semak Belukar' | 'Ringan / Lalang';
  assignedEquipmentCount?: number; // Estimasi armada alat berat
  assignedWorkerCount?: number; // Estimasi tenaga kerja (manpower)
  shift?: 'Siang (07:00 - 17:00)' | 'Malam' | 'Full Shift';
  notes?: string; // Instruksi khusus & arahan Direktur
  status?: 'Terjadwal' | 'Tercapai' | 'Di bawah Target' | 'Tertunda Cuaca';
  actualClearedHa?: number; // Realisasi Luas jika sudah ada laporan harian
  createdBy?: string; // "Direktur / Superadmin"
  createdAt?: string;
}

export interface Equipment {
  id: string; // "EX-01"
  name: string; // "Excavator Komatsu PC200-8"
  type: EquipmentType;
  model: string; // "PC200-8"
  serialNumber: string;
  currentHm: number;
  standardFuelRatio: number; // e.g. 18.0 L/HM
  status: EquipmentStatus;
  operatorName: string;
}

export interface Worker {
  id: string;
  name: string;
  category: 'Pekerja Utama' | 'Maintenance' | 'Pengawas & Pendukung';
  role: string; // e.g. "Operator EX-01", "Mekanik", "Mandor / Pengawas"
  assignedEquipmentId?: string; // Alat Berat yang ditugaskan (pilihan dari master alat berat)
  phone: string;
  status: AttendanceStatus;
  teamName?: string; // e.g. "Tim Operator Alat Berat", "Tim Rintis & Imas", "Tim Mekanik Maintenance", "Tim Land Clearing", "Tim Pengawas & K3"
  assignedClientId?: string; // e.g. "client-1" or "ALL"
  assignedBlockId?: string; // e.g. "blk-1" or "ALL"
}

export interface InventoryItem {
  id: string;
  code: string;
  name: string;
  category: 'BBM' | 'Oli' | 'Grease' | 'Spare Part';
  stockQuantity: number;
  unit: string;
  minThreshold: number;
}

// Logistik Lapangan: Transaksi Stok Masuk & Stok Keluar
export type LogisticsCategory = 'BBM' | 'Oli' | 'Grease' | 'Spare Part';
export type LogisticsTransactionType = 'in' | 'out'; // in = stok masuk, out = stok keluar/pemakaian
export type LogisticsApprovalStatus = 'pending' | 'approved' | 'rejected';
export type LogisticsUsagePurpose = 
  | 'Saat pengisian solar di lapangan (Operasional Rutin)'
  | 'Saat perbaikan/perawatan alat (Servis Berkala)'
  | 'Penggantian spare part rusak (Breakdown)'
  | 'Pelumasan pin & bushing (Greasing harian)'
  | 'Pengisian genset & penerangan basecamp'
  | 'Lainnya';

export interface LogisticsTransaction {
  id: string;
  date: string; // YYYY-MM-DD
  timestamp: string; // HH:mm:ss atau ISO
  category: LogisticsCategory;
  itemName: string;
  quantity: number;
  unit: string;
  type: LogisticsTransactionType;
  clientId?: string;
  clientName?: string;
  blockId?: string;
  blockCode?: string;

  // Inflow (Penerimaan Stok Masuk) fields
  supplierOrPoNumber?: string; // No PO / Supplier
  deliveryNoteNumber?: string; // No Surat Jalan
  sourceOrStorage?: string; // Lokasi penyimpanan (misal Tangki Induk 10.000 L)

  // Outflow (Pemakaian Stok Keluar) fields - Khusus Pengawas di Lapangan
  purpose?: LogisticsUsagePurpose | string;
  equipmentId?: string; // Dropdown alat berat (EX-01, DZ-01, dll)
  equipmentName?: string;
  equipmentHmAtUsage?: number; // HM alat saat pengisian / servis
  
  // Otorisasi & Verifikasi
  submittedByRole: 'supervisor';
  submittedByName: string;
  approvalStatus: LogisticsApprovalStatus; // For 'in': 'pending' (menunggu verifikasi direktur), 'approved', 'rejected'. For 'out': 'approved'
  approvedByDirectorName?: string;
  approvedAt?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface EquipmentWorkLog {
  equipmentId: string;
  equipmentName: string;
  type: string;
  hmStart: number;
  hmEnd: number;
  totalHm: number; // calculated: hmEnd - hmStart
  downtimeWeatherHours: number;
  downtimeWeatherNote: string;
  downtimeBreakdownHours: number;
  downtimeBreakdownCategory?: BreakdownCategory;
  downtimeBreakdownNote: string;
  downtimeOtherHours: number;
  downtimeOtherNote: string;
  effectiveWorkHours: number; // calculated: totalHm - (weather + breakdown + other)
  fuelAddedLiters: number;
  fuelHmAtRefuel?: number;
  fuelRatio: number; // fuelAddedLiters / effectiveWorkHours
  fuelStandardLimit: number;
  isFuelAlert: boolean; // fuelRatio > fuelStandardLimit
}

export interface LaborAbsence {
  workerId: string;
  workerName: string;
  category: 'Pekerja Utama' | 'Maintenance' | 'Pengawas & Pendukung';
  role: string;
  status: AttendanceStatus;
  teamName?: string;
  assignedClientId?: string;
  assignedBlockId?: string;
  notes?: string;
}

export interface SparePartUsage {
  id: string;
  partName: string;
  quantity: number;
  unit: string;
  serviceCategory: 'Perawatan Rutin' | 'Perbaikan Kerusakan';
  equipmentId?: string;
}

export interface LogisticsUsage {
  fuelTankInitialLiters: number; // e.g. 5,000 L
  fuelTankInflowLiters: number;  // e.g. 0 L
  fuelTankUsedLiters: number;    // e.g. 266 L
  fuelTankRemainingLiters: number; // 4,734 L
  oilEngineLiters: number;
  oilHydraulicLiters: number;
  oilTransmissionLiters: number;
  greaseKg: number;
  sparePartsUsed: SparePartUsage[];
}

export interface ReportPhoto {
  id: string;
  category: 'Kondisi Cuaca / Lapangan' | 'Hasil Kerja Harian' | 'Kerusakan Alat / Spare Part' | 'Pengisian BBM';
  caption: string;
  dataUrl: string;
  gpsCoordinates: {
    lat: number;
    lng: number;
  };
  timestamp: string;
  equipmentId?: string;
  blockCode?: string;
}

export interface DailyReport {
  id: string; // e.g. "LC-RPT/2026/09/24-001"
  date: string; // YYYY-MM-DD
  reportNumber: string;
  clientId: string;
  clientName: string;
  contractNumber: string;
  projectName: string;
  blockId: string;
  blockCode: string;
  weather: WeatherCondition;
  effectiveWorkShift: string; // e.g. "07.00 - 17.00 WIB"
  supervisorId: string;
  supervisorName: string;

  // Step 4: Simple Physical Progress
  physicalProgress: {
    targetAreaHa: number; // e.g. 4.00 Ha
    realizedAreaHa: number; // e.g. 3.80 Ha
    cumulativeAreaHa: number; // e.g. 48.80 Ha
    progressPercentage: number; // e.g. 48.80%
    targetDrainageM?: number;
    realizedDrainageM?: number;
    cumulativeDrainageM?: number;
    notes: string;
  };

  // Step 3: Equipment logs
  equipmentWorkLogs: EquipmentWorkLog[];

  // Step 2: Labor absences
  laborAbsences: LaborAbsence[];

  // Step 5: Logistics & Parts
  logistics: LogisticsUsage;

  // Step 6: Photos & Supervisor notes
  photos: ReportPhoto[];
  supervisorGeneralNotes: string;

  // Validation & Approval
  status: 'Draft' | 'Diajukan' | 'Diverifikasi Mandor' | 'Disetujui Direktur' | 'Ditolak Direktur';
  rejectionReason?: string;
  rejectedBy?: string;
  rejectedAt?: string;
  signatures: {
    supervisor: { name: string; signedAt: string; status: 'Signed' | 'Pending' };
    siteManager: { name: string; signedAt?: string; status: 'Signed' | 'Pending' };
    director: { name: string; signedAt?: string; status: 'Signed' | 'Pending' };
  };
  syncStatus: 'synced' | 'pending_sync' | 'offline_draft';
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyFuelTrend {
  weekId: string;
  weekNumber: number;
  weekLabel: string;
  shortLabel: string;
  dateRange: string;
  month: string;
  totalFuelLiters: number;
  totalClearedHa: number;
  fuelRatioPerHa: number;
  benchmarkLimit: number;
  efficiencyVariance: number;
  variancePercent: number;
  totalHm: number;
  status: 'Sangat Efisien' | 'Optimal' | 'Mendekati Batas' | 'Over Benchmark';
  notes: string;
}

