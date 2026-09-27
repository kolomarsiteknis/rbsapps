export type UserRole = 'supervisor' | 'director' | 'manager' | 'client';

export type ManagedUserLevel = 'Superadmin' | 'Site Manager' | 'Pengawas' | 'Klien' | 'Manager';

export interface ManagedUser {
  id: string;
  fullName: string;          // nama lengkap
  address: string;           // alamat
  whatsappNumber: string;    // no WA aktif
  email: string;             // Email aktif
  jobTitle: string;          // Jabatan: Direktur, Manager, Pengawas, atau custom jabatan baru
  userLevel: ManagedUserLevel; // Level User: Superadmin, Site Manager, Pengawas, Klien
  username: string;          // Username untuk login
  password: string;          // Password
  signatureUrl?: string;     // Spesimen Tanda Tangan Digital
  employeeIdNumber?: string; // NIK / NIP Karyawan
  assignedClientId?: string;  // Penempatan Proyek (hanya boleh satu klien)
  assignedClientName?: string;
  assignedBlockCodes?: string[]; // Penempatan Lokasi Kerja (bisa lebih dari satu blok / bisa nambah blok)
  status: 'Aktif' | 'Nonaktif';
  createdAt: string;
  updatedAt?: string;
  notes?: string;
}

export interface AuthUser {
  id?: string;
  username: string;
  displayName: string;
  role: UserRole;
  roleTitle: string;
  email?: string;
  loginTime: string;
  phoneNumber?: string;
  address?: string;
  jobTitle?: string;
  userLevel?: ManagedUserLevel;
  assignedClientId?: string;
  assignedClientName?: string;
  assignedBlockCodes?: string[];
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

export type EquipmentType = 'Excavator' | 'Bulldozer' | 'Dump Truck' | 'Motor Grader' | 'Vibro Roller' | (string & {});

export type EquipmentStatus = 'Operasional' | 'Breakdown' | 'Standby' | 'Perawatan Rutin';

export interface Client {
  id: string;
  name: string; // e.g. "PT. A", "PT. B", "PT. D"
  fullCompanyName: string; // e.g. "PT. AGRO PERDANA MANDIRI"
  address: string;
  contactPerson: string;
  phone: string;
  email?: string; // EMAIL PIC / Perusahaan
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

export interface BlockWorkItem {
  id: string;
  name: string; // e.g. "UNDERBRUSHING (SEMAK BELUKAR)", "BATANG KUBUR", "MAINROAD"
  unit: string; // e.g. "HEKTAR", "POHON", "METER LARI", "METER KUBIK"
  targetVolume?: number; // target kuantitas/volume opsional
  completedVolume?: number; // realisasi kuantitas
  notes?: string;
}

export interface Block {
  id: string;
  projectId: string;
  clientId: string;
  code: string; // "Blok AB" atau "BLOK AZ"
  targetAreaHa: number; // 100 Ha atau 35.5 Ha
  dailyTargetAreaHa?: number; // Target harian Land Clearing (Ha) yang ditentukan oleh Direktur (misal: 4.0 Ha)
  clearedAreaHa: number; // current cleared
  status: 'Dalam Pengerjaan' | 'Belum Dimulai' | 'Selesai';
  workItems?: BlockWorkItem[]; // Daftar Item Pekerjaan yang ditugaskan pada blok ini
}

// Target Harian Land Clearing (Ha) per hari per lokasi kerja
export interface DailyItemRitmeTarget {
  id?: string;
  name: string;
  unit: string;
  totalVolume: number;
  dailyTargetVolume: number;
  calculatedDays: number;
}

export interface DailyLocationTarget {
  id: string; // e.g. "DT-2026-09-24-blk-1"
  clientId: string;
  clientName?: string;
  contractNumber?: string; // e.g. "045/SPK-LC/PTA/VI/2026"
  blockId: string;
  blockCode: string;
  date: string; // YYYY-MM-DD
  dailyTargetAreaHa: number; // Target Luas Harian (Ha) misal: 4.0 Ha
  assignmentNumbers?: string[]; // Daftar No Penugasan terkait SPK & Blok ini
  itemTargets?: DailyItemRitmeTarget[]; // Target ritme harian untuk masing-masing item pekerjaan
  assignedPersonnel?: Array<{
    workerId: string;
    workerName: string;
    workerCategory: string;
    equipmentId?: string;
    equipmentName?: string;
    assignmentNumber?: string;
  }>;
  soilType?: string;
  vegetationDensity?: string;
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
  category: 'Operator' | 'Mekanik' | 'Logistik' | 'Pendukung' | 'Pengawas' | string;
  role?: string; // e.g. "Operator EX-01", "Mekanik", "Mandor / Pengawas"
  assignedEquipmentId?: string; // Alat Berat yang ditugaskan (pilihan dari master alat berat)
  phone: string;
  status: AttendanceStatus;
  teamName?: string; // e.g. "Tim Operator Alat Berat", "Tim Rintis & Imas", "Tim Mekanik Maintenance", "Tim Land Clearing", "Tim Pengawas & K3"
  assignedClientId?: string; // e.g. "client-1" or "ALL"
  assignedBlockId?: string; // e.g. "blk-1" or "ALL"
}

export interface WorkAssignment {
  id: string; // e.g. "ASG-001"
  assignmentNumber: string; // e.g. "001/ST-LC/PTA/VI/2026" - Standar penomoran seperti SPK
  // 1. Data Staff dari Master Data Perusahaan
  staffId?: string;
  staffLevel?: string; // Direktur, Manager, Pengawas, Akuntan, Staff
  staffName?: string;
  // 2. Data Personel Tim pendukung Lapangan
  workerId: string;
  workerName: string;
  workerCategory: string; // Operator, Mekanik, Logistik, Pendukung (Pengawas & Site Manager dikecualikan)
  equipmentId?: string; // Kode Unit Alat, e.g. "EX-01"
  equipmentType?: string; // "Excavator"
  equipmentName?: string; // "Excavator Komatsu PC200-8"
  equipmentModel?: string; // "PC200-8"
  clientId: string; // "client-1"
  clientName: string; // "PT. A"
  contractNumber: string; // "045/SPK-LC/PTA/VI/2026"
  blockId: string; // "ALL" or specific block id
  blockCode: string; // "Seluruh Blok Kerja pada SPK Terpilih" or "BLOK AG (80 Ha)"
  status: 'Aktif' | 'Standby' | 'Selesai' | 'BKO / Bantuan';
  assignedDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string;
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
  approvalStatus: LogisticsApprovalStatus; // For 'in' & 'out': 'pending', 'approved', 'rejected'
  approvedByDirectorName?: string;
  approvedByRole?: 'director' | 'manager';
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
  category: string;
  role?: string;
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
  status: 'Draft' | 'Diajukan' | 'Diverifikasi Mandor' | 'Disetujui Manager' | 'Disetujui Direktur' | 'Ditolak Manager' | 'Ditolak Direktur';
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

// 1. Checklist Inspeksi Harian Alat Berat (P2H - Pemeriksaan Pra-Operasi)
export type P2HItemCondition = 'Baik / Normal' | 'Perlu Perhatian' | 'Rusak / Bahaya';

export interface DailyP2HChecklist {
  id: string; // e.g. "P2H-2026-09-24-EX01"
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  equipmentId: string;
  equipmentName: string;
  operatorName: string;
  supervisorName: string;
  clientId: string;
  clientName: string;
  blockCode: string;
  hmStart: number;
  
  // 8 Critical Pre-Operational Points
  engineOilLevel: P2HItemCondition;
  radiatorCoolant: P2HItemCondition;
  hydraulicOilAndPressure: P2HItemCondition;
  hydraulicHosesAndFittings: P2HItemCondition; // Deteksi dini selang retak/bocor
  undercarriageAndTracks: P2HItemCondition; // Track shoe, link, roller
  fuelLevelAndSeparator: P2HItemCondition;
  electricalAndLights: P2HItemCondition;
  safetyAparAndSeatbelt: P2HItemCondition;
  
  overallStatus: 'Layak Operasi' | 'Bersyarat (Pantau)' | 'Stop Operasi (Butuh Mekanik)';
  mechanicActionNeeded: boolean;
  notes?: string;
  createdAt: string;
}

// 4. Form Cepat Penerimaan Solar Keliling (Fuel Bowser / Tangki Lapangan)
export interface FuelBowserReceipt {
  id: string; // e.g. "FBW-2026-09-24-001"
  date: string;
  time: string;
  clientId: string;
  clientName: string;
  blockCode: string;
  bowserTruckId: string; // e.g. "BM 8421 AU (Tangki 5.000 L)"
  sealNumber: string; // No segel tangki supplier
  deliveryDocNumber: string; // No Surat Jalan
  equipmentId: string; // Unit yang diisi (e.g. EX-01)
  equipmentName: string;
  equipmentHmAtRefuel: number;
  flowmeterStart: number;
  flowmeterEnd: number;
  totalLitersFilled: number; // calculated: flowmeterEnd - flowmeterStart
  fuelQualityCheck: 'Jernih (B35 Standar)' | 'Keruh / Ada Air' | 'Kotor';
  operatorName: string;
  bowserDriverName: string;
  supervisorName: string;
  photoUrl?: string;
  notes?: string;
  createdAt: string;
}

// 5. Log Insiden Lapangan & Kondisi Tanah (Safety & Soil Hazard Log)
export type SoilIncidentType = 
  | 'Alat Amblas di Tanah Gambut Dalam'
  | 'Pohon Lapuk Roboh / Menimpa Jalur'
  | 'Tanggul Jebol / Luapan Banjir Sungai Batas'
  | 'Senggolan / Insiden Manuver Alat'
  | 'Percikan Api / Kesiapsiagaan Karhutla'
  | 'Patah Track / Roller Lepas di Lapangan'
  | 'Lainnya';

export type IncidentSeverity = 'Ringan (Tangani Sendiri)' | 'Sedang (Butuh Bantuan Winching)' | 'Kritis (Stop Operasi)';

export interface SoilHazardIncident {
  id: string; // e.g. "INC-2026-09-24-01"
  date: string;
  time: string;
  clientId: string;
  clientName: string;
  blockCode: string;
  incidentType: SoilIncidentType;
  severity: IncidentSeverity;
  affectedEquipmentId?: string;
  affectedEquipmentName?: string;
  operatorName?: string;
  rescuingEquipmentId?: string; // Alat penolong (misal DZ-01 menarik EX-01)
  evacuationDurationHours: number; // Pull-out duration (Jam)
  soilCondition: 'Tanah Gambut Kedalaman > 2m' | 'Gambut Dangkal / Basah' | 'Tanah Mineral Licin / Berlumpur' | 'Rawa Rendahan';
  injuryStatus: 'Zero Accident (Nihil Cidera)' | 'P3K Ringan' | 'Perlu Perawatan';
  actionTaken: string;
  preventionNotes: string;
  photoUrl?: string;
  resolvedStatus: 'Selesai Dievakuasi' | 'Dalam Penanganan' | 'Menunggu Bantuan Unit Tambahan';
  supervisorName: string;
  createdAt: string;
}

// 2. Foto Geotagging Progres Lapangan
export interface FieldGeotagPhoto {
  id: string;
  fileName: string;
  dataUrl: string;
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: string;
  category: string;
  blockCode: string;
  equipmentId?: string;
  clientId?: string;
  clientName: string;
  supervisorName?: string;
  notes?: string;
}

// 3. Log Discrepancy & Perhitungan HM Alat Berat
export interface HmDiscrepancyLog {
  id: string;
  date: string;
  reportId?: string;
  reportNumber?: string;
  clientId: string;
  clientName: string;
  blockCode: string;
  equipmentId: string;
  equipmentName: string;
  hmStart: number;
  hmEnd: number;
  totalHm: number;
  effectiveWorkHours: number;
  downtimeWeatherHours: number;
  downtimeBreakdownHours: number;
  downtimeOtherHours: number;
  totalLoggedHours: number;
  discrepancyHours: number; // totalHm - totalLoggedHours
  isDiscrepancy: boolean;
  fuelAddedLiters: number;
  fuelRatio: number;
  fuelStandardLimit: number;
  isFuelAlert: boolean;
  notes?: string;
  supervisorName: string;
}

// 4. Log Riwayat Aktivitas Pengguna & Geotag Lokasi GPS
export type ActivityActionCategory = 
  | 'AUTH'          // Login, Logout, Ganti Sesi
  | 'USER_MANAGEMENT' // CRUD User, Ganti Password, Hak Akses, Penempatan Proyek
  | 'REPORT'        // Input Laporan Baru, Edit Laporan, Approval Laporan
  | 'P2H'           // Simpan Checklist Inspeksi P2H
  | 'CAMERA_GEOTAG' // Ambil / Upload Foto Geotagging
  | 'HM_CALCULATOR' // Hitung / Verifikasi Discrepancy HM
  | 'FUEL_BOWSER'   // Catat Penerimaan Solar Bowser
  | 'SOIL_INCIDENT' // Catat Insiden Lahan Gambut
  | 'INCIDENT_K3'   // Insiden Keselamatan Kerja & Lahan Gambut
  | 'LOGISTICS'     // Update Stok Solar, Transaksi BBM
  | 'MASTER_DATA'   // Tambah / Ubah Klien, Alat Berat, Operator
  | 'NAVIGATION'    // Akses Halaman / Fitur
  | 'EXPORT';       // Cetak PDF / Export Data

export interface UserActivityLog {
  id: string;
  timestamp: string;          // ISO string
  formattedTime: string;      // Formatted "24/09/2026 14:20:15 WIB"
  userId: string;
  userName: string;
  userRole: UserRole;
  userEmail?: string;
  actionCategory: ActivityActionCategory;
  actionTitle: string;
  actionDescription: string;
  targetEntity?: string;
  clientId?: string;
  clientName?: string;
  blockCode?: string;
  gpsTag?: {
    lat: number;
    lng: number;
    accuracy: number;         // meter
    locationName: string;     // e.g. "Blok AB, Estate Siak (Riau)"
    mapsUrl: string;
  };
  deviceInfo: {
    deviceType: 'Mobile' | 'Tablet' | 'Desktop';
    browser: string;
    isOnline: boolean;
  };
}

// Identitas Perusahaan & Branding Aplikasi
export interface CompanyProfile {
  id: string;
  officialName: string;       // Nama Resmi: PT. SURYALAND GROUP atau PT. RIAU BARA SAMUDRA (RBS)
  shortName: string;          // Nama Singkat / Singkatan: SURYALAND atau RBS (Otomatis jadi Nama Apps)
  tagline: string;            // Slogan / Motto Perusahaan
  logoUrl: string;            // Image Logo Perusahaan (Otomatis jadi Logo Apps & Kop Surat)
  npwp: string;               // Nomor Pokok Wajib Pajak
  nib: string;                // Nomor Induk Berusaha
  phone: string;              // Telepon Kantor
  whatsapp: string;           // No WA Operasional
  email: string;              // Email Resmi Perusahaan
  website?: string;           // Website Resmi
  headOfficeAddress: string;  // Alamat Kantor Pusat
  address?: string;           // Alias Alamat Kantor
  siteOfficeAddress: string;  // Alamat Basecamp / Site Operasional
  bankAccountInfo?: string;   // Rekening Bank Perusahaan
  bankAccount?: string;       // Alias Rekening Bank
  legalNotice?: string;       // Catatan Legalitas / SOP
  updatedAt: string;
}

// Informasi Staff Perusahaan dengan TTD Digital & Kredensial Login
export interface CompanyStaff {
  id: string;
  fullName: string;           // Nama Lengkap & Gelar
  jobRole: string;            // Jabatan: Direktur, Site Manager, Pengawas, Klien, Akuntan, atau custom
  staffLevel?: 'Direktur' | 'Site Manager' | 'Pengawas' | 'Klien' | 'Akuntan' | 'Staff' | string;
  employeeIdNumber: string;   // NIK / NIP Karyawan
  email: string;              // Email Staff
  phone: string;              // No HP / WA
  address?: string;           // Alamat Domisili / Kantor
  signatureUrl?: string;      // Image Tanda Tangan Digital (Data URL)
  status: 'Aktif' | 'Nonaktif';
  notes?: string;
  linkedUserId?: string;      // ID Akun Login jika sudah dibuatkan di Manajemen User
  // Kredensial Akun Login Resmi Sistem:
  username?: string;          // Username untuk login
  password?: string;          // Password login
  userLevel?: ManagedUserLevel; // Level Hak Akses: Superadmin, Site Manager, Pengawas, Klien
  assignedClientId?: string;  // Penempatan Klien Proyek (khusus Pengawas / Klien)
  assignedClientName?: string;
  assignedBlockCodes?: string[];
  createdAt: string;
  updatedAt?: string;
}


