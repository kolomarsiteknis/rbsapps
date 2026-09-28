import { Client, Project, Block, Equipment, Worker, InventoryItem, DailyReport, LogisticsTransaction, DailyLocationTarget, ManagedUser, WorkAssignment, CompanyProfile, CompanyStaff } from '../types';

// Helper to generate simulated SVG photographic base64 for initial seed photos
function createSimulatedFieldPhoto(title: string, subtitle: string, color: string, lat: string, lng: string, time: string, clientName: string = 'PT. A'): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="500" viewBox="0 0 800 500">
    <defs>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${color}"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
      <linearGradient id="bannerGrad" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="rgba(15,23,42,0.85)"/>
        <stop offset="100%" stop-color="rgba(10,15,26,0.98)"/>
      </linearGradient>
    </defs>
    <rect width="800" height="500" fill="url(#bgGrad)"/>
    
    <!-- Landscape silhouette -->
    <path d="M0,320 Q200,240 400,280 T800,290 L800,500 L0,500 Z" fill="#1e293b" opacity="0.6"/>
    <path d="M0,360 Q250,290 500,340 T800,330 L800,500 L0,500 Z" fill="#0f172a" opacity="0.8"/>
    
    <!-- Icon or subject -->
    <circle cx="400" cy="180" r="70" fill="rgba(255,255,255,0.08)" stroke="#fbbf24" stroke-width="2"/>
    <text x="400" y="175" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="26" font-weight="bold" text-anchor="middle">🚜 RBS</text>
    <text x="400" y="210" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="600" text-anchor="middle">${title}</text>
    <text x="400" y="235" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">KLIEN: ${clientName} • ${subtitle}</text>
    
    <!-- Watermark Banner -->
    <rect x="0" y="405" width="800" height="95" fill="url(#bannerGrad)"/>
    <rect x="0" y="405" width="800" height="3" fill="#f59e0b"/>
    <text x="24" y="432" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">PT. RBS GROUP • PROYEK KLIEN: ${clientName} (ZERO BURNING)</text>
    <text x="24" y="456" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="12" font-weight="600">LOKASI: ${subtitle}</text>
    <text x="24" y="480" fill="#e2e8f0" font-family="monospace" font-size="11">📍 GPS: ${lat}, ${lng}    🕒 WAKTU: ${time} WIB</text>
    
    <!-- Seal badge -->
    <rect x="650" y="425" width="125" height="24" rx="6" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1.5"/>
    <text x="712" y="441" fill="#34d399" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">✓ GEOTAG VERIFIED</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const initialClients: Client[] = [];

export const initialProjects: Project[] = [];

export const DEFAULT_WORK_ITEMS_CATALOG = [
  { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', defaultTargetVolume: 30 },
  { name: 'BATANG KUBUR', unit: 'POHON', defaultTargetVolume: 25 },
  { name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', defaultTargetVolume: 10 },
  { name: 'MAINROAD', unit: 'm', defaultTargetVolume: 250 },
  { name: 'COLLECTION ROAD', unit: 'm', defaultTargetVolume: 100 },
  { name: 'SALURAN PRIMER', unit: 'm³', defaultTargetVolume: 50 },
  { name: 'SALURAN SEKUNDER', unit: 'm³', defaultTargetVolume: 50 },
  { name: 'SALURAN TERSIER', unit: 'm³', defaultTargetVolume: 50 },
];

export const initialBlocks: Block[] = [];

export const initialEquipments: Equipment[] = [];

export const initialWorkers: Worker[] = [];

export const initialInventory: InventoryItem[] = [
  { id: 'inv-1', code: 'BBM-SOL', name: 'Solar Industri B35', category: 'BBM', stockQuantity: 4734, unit: 'Liter', minThreshold: 1000 },
  { id: 'inv-2', code: 'OLI-ENG', name: 'Oli Mesin Meditran SX 15W-40', category: 'Oli', stockQuantity: 180, unit: 'Liter', minThreshold: 50 },
  { id: 'inv-3', code: 'OLI-HYD', name: 'Oli Hidrolik Turalik 68 ISO', category: 'Oli', stockQuantity: 140, unit: 'Liter', minThreshold: 60 },
  { id: 'inv-4', code: 'OLI-TRM', name: 'Oli Transmisi SAE 90 GL-4', category: 'Oli', stockQuantity: 90, unit: 'Liter', minThreshold: 30 },
  { id: 'inv-5', code: 'GRS-CH', name: 'Grease Chassis EP-2 High Temp', category: 'Grease', stockQuantity: 42, unit: 'Kg', minThreshold: 15 },
  { id: 'inv-6', code: 'PRT-HOS', name: 'Hose Hydraulic Boom 3/4" 4SP', category: 'Spare Part', stockQuantity: 4, unit: 'Pcs', minThreshold: 2 },
  { id: 'inv-7', code: 'PRT-FLT', name: 'Filter Solar Komatsu PC200', category: 'Spare Part', stockQuantity: 8, unit: 'Pcs', minThreshold: 3 },
];

export const initialDailyReports: DailyReport[] = [
  // Report 1: PT. A (24 Sep 2026)
  {
    id: 'LC-RPT/2026/09/24-001',
    reportNumber: 'LC-RPT/2026/09/24-001',
    date: '2026-09-24',
    clientId: 'client-1',
    clientName: 'PT. A',
    contractNumber: '045/SPK-LC/PTA/VI/2026',
    projectName: 'Land Clearing Perkebunan PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB (Luas: 100 Ha)',
    weather: 'Cerah - Hujan Sore',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'w-8',
    supervisorName: 'Budi Santoso',
    physicalProgress: {
      targetAreaHa: 4.0,
      realizedAreaHa: 3.8,
      cumulativeAreaHa: 48.8,
      progressPercentage: 48.8,
      notes: 'Pengerjaan di Blok AB sektor selatan terhambat hujan lebat jam 15.00 WIB.',
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'EX-01',
        equipmentName: 'Exca PC200-8 #01',
        type: 'Excavator PC200-8',
        hmStart: 2150.5,
        hmEnd: 2158.5,
        totalHm: 8.0,
        downtimeWeatherHours: 2.0,
        downtimeWeatherNote: 'Hujan lebat, tanah gambut becek',
        downtimeBreakdownHours: 0.0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0.0,
        downtimeOtherNote: '',
        effectiveWorkHours: 6.0,
        fuelAddedLiters: 102,
        fuelHmAtRefuel: 2158.0,
        fuelRatio: 17.0, // 102 / 6.0 = 17.0 L/HM
        fuelStandardLimit: 18.0,
        isFuelAlert: false,
      },
      {
        equipmentId: 'EX-02',
        equipmentName: 'Exca PC200-8 #02',
        type: 'Excavator PC200-8',
        hmStart: 1840.0,
        hmEnd: 1845.0,
        totalHm: 5.0,
        downtimeWeatherHours: 2.0,
        downtimeWeatherNote: 'Hujan lebat',
        downtimeBreakdownHours: 1.0,
        downtimeBreakdownCategory: 'Selang Pecah',
        downtimeBreakdownNote: 'Ganti hose hydraulic boom 3/4"',
        downtimeOtherHours: 0.0,
        downtimeOtherNote: '',
        effectiveWorkHours: 2.0,
        fuelAddedLiters: 38,
        fuelHmAtRefuel: 1844.5,
        fuelRatio: 19.0, // 38 / 2.0 = 19.0 L/HM -> ALERT (> 18.0)
        fuelStandardLimit: 18.0,
        isFuelAlert: true,
      },
      {
        equipmentId: 'DZ-01',
        equipmentName: 'Dozer D65PX',
        type: 'Dozer D65PX',
        hmStart: 3110.0,
        hmEnd: 3118.0,
        totalHm: 8.0,
        downtimeWeatherHours: 2.0,
        downtimeWeatherNote: 'Hujan lebat',
        downtimeBreakdownHours: 0.0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0.0,
        downtimeOtherNote: '',
        effectiveWorkHours: 6.0,
        fuelAddedLiters: 126,
        fuelHmAtRefuel: 3117.5,
        fuelRatio: 21.0, // 126 / 6.0 = 21.0 L/HM
        fuelStandardLimit: 22.0,
        isFuelAlert: false,
      },
    ],
    laborAbsences: [
      { workerId: 'w-1', workerName: 'Agus Santoso', category: 'Pekerja Utama', role: 'Operator EX-01', status: 'Hadir' },
      { workerId: 'w-2', workerName: 'Rian Hidayat', category: 'Pekerja Utama', role: 'Operator EX-02', status: 'Hadir' },
      { workerId: 'w-3', workerName: 'Bambang Supriyanto', category: 'Pekerja Utama', role: 'Operator DZ-01', status: 'Hadir' },
      { workerId: 'w-4', workerName: 'Dani & Supri (3 Orang)', category: 'Pekerja Utama', role: 'Helper Alat Berat', status: 'Hadir' },
      { workerId: 'w-5', workerName: 'Toni Wijaya', category: 'Maintenance', role: 'Mekanik Alat Berat', status: 'Hadir' },
      { workerId: 'w-6', workerName: 'Doni Saputra', category: 'Maintenance', role: 'Helper Mekanik', status: 'Hadir' },
      { workerId: 'w-7', workerName: 'Joko Prabowo', category: 'Maintenance', role: 'Driver Tangki BBM', status: 'Hadir' },
      { workerId: 'w-8', workerName: 'Budi Santoso', category: 'Pengawas & Pendukung', role: 'Mandor / Pengawas Lapangan', status: 'Hadir' },
      { workerId: 'w-9', workerName: 'Eko Prasetyo', category: 'Pengawas & Pendukung', role: 'Surveyor Field', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 5000,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 266,
      fuelTankRemainingLiters: 4734,
      oilEngineLiters: 0,
      oilHydraulicLiters: 4,
      oilTransmissionLiters: 0,
      greaseKg: 3.5,
      sparePartsUsed: [
        {
          id: 'sp-1',
          partName: 'Hose Hydraulic Boom 3/4" 4SP',
          quantity: 1,
          unit: 'Pcs',
          serviceCategory: 'Perbaikan Kerusakan',
          equipmentId: 'EX-02',
        },
      ],
    },
    photos: [
      {
        id: 'p-1',
        category: 'Hasil Kerja Harian',
        caption: 'Kondisi Hasil Clearing Blok AB (Rabas & Cincang Kayu)',
        dataUrl: createSimulatedFieldPhoto('PROGRES FISIK CLEARING', 'BLOK AB • 3.8 Ha SELESAI', '#15803d', '-0.51234', '101.45678', '24/09/2026 14:15', 'PT. A'),
        gpsCoordinates: { lat: -0.51234, lng: 101.45678 },
        timestamp: '24/09/2026 14:15 WIB',
        blockCode: 'Blok AB',
      },
      {
        id: 'p-2',
        category: 'Kerusakan Alat / Spare Part',
        caption: 'Perbaikan Penggantian Selang Hose Hydraulic EX-02',
        dataUrl: createSimulatedFieldPhoto('PERBAIKAN HOSE BOOM', 'UNIT EX-02 • PENGGANTIAN 3/4"', '#b45309', '-0.51240', '101.45680', '24/09/2026 11:30', 'PT. A'),
        gpsCoordinates: { lat: -0.5124, lng: 101.4568 },
        timestamp: '24/09/2026 11:30 WIB',
        equipmentId: 'EX-02',
        blockCode: 'Blok AB',
      },
    ],
    supervisorGeneralNotes: 'Pengerjaan rabas dan perumpukan mekanis di Blok AB berjalan lancar hingga sore hari pukul 15.00 WIB ketika turun hujan lebat. Penggantian selang hydraulic EX-02 diselesaikan teknisi dalam waktu 1 jam.',
    status: 'Diajukan',
    signatures: {
      supervisor: { name: 'Budi Santoso', signedAt: '2026-09-24 17:30 WIB', status: 'Signed' },
      siteManager: { name: 'Agus Wardhana', signedAt: '2026-09-24 18:05 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', signedAt: undefined, status: 'Pending' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-24T17:30:00Z',
    updatedAt: '2026-09-24T18:05:00Z',
  },

  // Report 2: PT. B (24 Sep 2026)
  {
    id: 'LC-RPT/2026/09/24-002',
    reportNumber: 'LC-RPT/2026/09/24-002',
    date: '2026-09-24',
    clientId: 'client-2',
    clientName: 'PT. B',
    contractNumber: '012/SPK-LC/SSS/VII/2026',
    projectName: 'Land Clearing Perkebunan Sawit PT. B (175 Ha)',
    blockId: 'blk-4',
    blockCode: 'Blok B-01 (Siak)',
    weather: 'Cerah',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'w-11',
    supervisorName: 'Faisal Akbar',
    physicalProgress: {
      targetAreaHa: 3.5,
      realizedAreaHa: 3.6,
      cumulativeAreaHa: 32.5,
      progressPercentage: 40.6,
      notes: 'Lahan tanah mineral cukup keras dan kering, produktivitas optimal.',
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'EX-03',
        equipmentName: 'Exca Hitachi ZX210',
        type: 'Excavator ZX210',
        hmStart: 1612.0,
        hmEnd: 1620.0,
        totalHm: 8.0,
        downtimeWeatherHours: 0.0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0.0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0.5,
        downtimeOtherNote: 'Istirahat',
        effectiveWorkHours: 7.5,
        fuelAddedLiters: 120,
        fuelHmAtRefuel: 1619.5,
        fuelRatio: 16.0,
        fuelStandardLimit: 17.5,
        isFuelAlert: false,
      },
    ],
    laborAbsences: [
      { workerId: 'w-10', workerName: 'Hendri Gunawan', category: 'Pekerja Utama', role: 'Operator EX-03', status: 'Hadir' },
      { workerId: 'w-11', workerName: 'Faisal Akbar', category: 'Pengawas & Pendukung', role: 'Pengawas Wilayah 2', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 3500,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 120,
      fuelTankRemainingLiters: 3380,
      oilEngineLiters: 0,
      oilHydraulicLiters: 0,
      oilTransmissionLiters: 0,
      greaseKg: 1.5,
      sparePartsUsed: [],
    },
    photos: [
      {
        id: 'p-b1',
        category: 'Hasil Kerja Harian',
        caption: 'Pekerjaan Rumpukan Jalur Tanam Blok B-01 Siak',
        dataUrl: createSimulatedFieldPhoto('RUMPUK MEKANIS BLOK B-01', '3.6 Ha • SIAK SRI INDRAPURA', '#047857', '0.78541', '101.99231', '24/09/2026 16:00', 'PT. B'),
        gpsCoordinates: { lat: 0.78541, lng: 101.99231 },
        timestamp: '24/09/2026 16:00 WIB',
        blockCode: 'Blok B-01 (Siak)',
      },
    ],
    supervisorGeneralNotes: 'Situasi lapangan PT. B aman dan kondusif. Cuaca cerah mendukung operasional penuh.',
    status: 'Disetujui Direktur',
    signatures: {
      supervisor: { name: 'Faisal Akbar', signedAt: '2026-09-24 17:00 WIB', status: 'Signed' },
      siteManager: { name: 'H. Rahmat Hidayat', signedAt: '2026-09-24 18:00 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', signedAt: '2026-09-24 20:00 WIB', status: 'Signed' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-24T17:00:00Z',
    updatedAt: '2026-09-24T20:00:00Z',
  },

  // Report 3: PT. D (23 Sep 2026)
  {
    id: 'LC-RPT/2026/09/23-003',
    reportNumber: 'LC-RPT/2026/09/23-003',
    date: '2026-09-23',
    clientId: 'client-3',
    clientName: 'PT. D',
    contractNumber: '088/SPK-LC/RPN/VIII/2026',
    projectName: 'Pembersihan Lahan Sawit PT. D (260 Ha)',
    blockId: 'blk-6',
    blockCode: 'Blok D-Alpha (Inhu)',
    weather: 'Cerah',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'w-8',
    supervisorName: 'Budi Santoso',
    physicalProgress: {
      targetAreaHa: 4.5,
      realizedAreaHa: 4.2,
      cumulativeAreaHa: 18.0,
      progressPercentage: 12.0,
      notes: 'Pembersihan semak belukar dan kayu rebahan berjalan lancar.',
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'DZ-02',
        equipmentName: 'Dozer CAT D6R',
        type: 'Dozer CAT D6R',
        hmStart: 2882.0,
        hmEnd: 2890.0,
        totalHm: 8.0,
        downtimeWeatherHours: 0.0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0.0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0.5,
        downtimeOtherNote: 'Istirahat',
        effectiveWorkHours: 7.5,
        fuelAddedLiters: 165,
        fuelHmAtRefuel: 2889.5,
        fuelRatio: 22.0,
        fuelStandardLimit: 23.0,
        isFuelAlert: false,
      },
    ],
    laborAbsences: [
      { workerId: 'w-8', workerName: 'Budi Santoso', category: 'Pengawas & Pendukung', role: 'Mandor / Pengawas', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 4000,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 165,
      fuelTankRemainingLiters: 3835,
      oilEngineLiters: 0,
      oilHydraulicLiters: 0,
      oilTransmissionLiters: 0,
      greaseKg: 2.0,
      sparePartsUsed: [],
    },
    photos: [
      {
        id: 'p-d1',
        category: 'Hasil Kerja Harian',
        caption: 'Pekerjaan Cincang & Rumpuk Blok D-Alpha Inhu',
        dataUrl: createSimulatedFieldPhoto('CLEARING BLOK D-ALPHA', '4.2 Ha • INDRAGIRI HULU', '#1d4ed8', '-0.33412', '102.12455', '23/09/2026 15:30', 'PT. D'),
        gpsCoordinates: { lat: -0.33412, lng: 102.12455 },
        timestamp: '23/09/2026 15:30 WIB',
        blockCode: 'Blok D-Alpha (Inhu)',
      },
    ],
    supervisorGeneralNotes: 'Pengerjaan di area PT. D berjalan sesuai schedule.',
    status: 'Disetujui Direktur',
    signatures: {
      supervisor: { name: 'Budi Santoso', signedAt: '2026-09-23 17:30 WIB', status: 'Signed' },
      siteManager: { name: 'Bambang Suryono', signedAt: '2026-09-23 18:30 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', signedAt: '2026-09-23 21:00 WIB', status: 'Signed' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-23T17:30:00Z',
    updatedAt: '2026-09-23T21:00:00Z',
  },
];

export const initialLogisticsTransactions: LogisticsTransaction[] = [
  // 1. Stok Masuk BBM Solar (Disetujui Direktur)
  {
    id: 'LOG-IN-2026-001',
    date: '2026-09-22',
    timestamp: '22/09/2026 09:15 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 5000,
    unit: 'Liter',
    type: 'in',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    supplierOrPoNumber: 'PO-SRY/BBM/IX/089',
    deliveryNoteNumber: 'SJ-PTM-882190',
    sourceOrStorage: 'Tangki Utama Basecamp Blok AB (Kapasitas 10.000 L)',
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    approvedByDirectorName: 'Direktur Utama',
    approvedAt: '22/09/2026 11:30 WIB',
    notes: 'Pengiriman tangki supply PT. Pertamina Patra Niaga, tera meteran & segel tangki utuh.',
  },
  // 2. Stok Masuk Pelumas Oli Mesin (Disetujui Direktur)
  {
    id: 'LOG-IN-2026-002',
    date: '2026-09-23',
    timestamp: '23/09/2026 10:00 WIB',
    category: 'Oli',
    itemName: 'Oli Mesin Meditran SX 15W-40',
    quantity: 200,
    unit: 'Liter',
    type: 'in',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    supplierOrPoNumber: 'PO-SRY/LUB/IX/044',
    deliveryNoteNumber: 'SJ-DRM-5512',
    sourceOrStorage: 'Gudang Pelumas Basecamp (Drum 200 L)',
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    approvedByDirectorName: 'Direktur Utama',
    approvedAt: '23/09/2026 13:00 WIB',
    notes: '1 Drum 200 Liter drum segel pabrik untuk jadwal servis 250 HM.',
  },
  // 3. Stok Masuk BBM Solar (MENUNGGU VERIFIKASI / PERSETUJUAN DIREKTUR)
  {
    id: 'LOG-IN-2026-003',
    date: '2026-09-24',
    timestamp: '24/09/2026 08:30 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 2500,
    unit: 'Liter',
    type: 'in',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    supplierOrPoNumber: 'PO-SRY/BBM/IX/095',
    deliveryNoteNumber: 'SJ-PTM-883501',
    sourceOrStorage: 'Tangki Cadangan Mobile Tangki Lapangan',
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'pending',
    notes: 'Penerimaan solar supply suplemen dari distributor lokal, mohon verifikasi & persetujuan Direktur agar masuk saldo stok aktif.',
  },
  // 4. Stok Masuk Grease (MENUNGGU VERIFIKASI DIREKTUR)
  {
    id: 'LOG-IN-2026-004',
    date: '2026-09-24',
    timestamp: '24/09/2026 09:00 WIB',
    category: 'Grease',
    itemName: 'Grease Chassis EP-2 High Temp',
    quantity: 30,
    unit: 'Kg',
    type: 'in',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    supplierOrPoNumber: 'PO-SRY/GRS/IX/021',
    deliveryNoteNumber: 'SJ-SPL-1109',
    sourceOrStorage: 'Gudang Workshop Basecamp',
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'pending',
    notes: '2 ember pail @ 15 Kg grease chassis heavy duty.',
  },
  // 5. Stok Keluar / Pemakaian Lapangan: Solar EX-01 (Input oleh Pengawas saat pengisian)
  {
    id: 'LOG-OUT-2026-001',
    date: '2026-09-24',
    timestamp: '24/09/2026 07:15 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 110,
    unit: 'Liter',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
    equipmentId: 'EX-01',
    equipmentName: 'Excavator Komatsu PC200-8 #01',
    equipmentHmAtUsage: 2166.0,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    notes: 'Pengisian pagi sebelum mulai rabas rintis Blok AB. HM unit: 2166.0 HM.',
  },
  // 6. Stok Keluar / Pemakaian Lapangan: Solar EX-02
  {
    id: 'LOG-OUT-2026-002',
    date: '2026-09-24',
    timestamp: '24/09/2026 07:30 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 95,
    unit: 'Liter',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
    equipmentId: 'EX-02',
    equipmentName: 'Excavator Komatsu PC200-8 #02',
    equipmentHmAtUsage: 1851.5,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    notes: 'Pengisian solar tangki unit di titik kerja Blok AB sektor utara.',
  },
  // 7. Stok Keluar / Pemakaian Lapangan: Solar DZ-01
  {
    id: 'LOG-OUT-2026-003',
    date: '2026-09-24',
    timestamp: '24/09/2026 08:00 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 138,
    unit: 'Liter',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
    equipmentId: 'DZ-01',
    equipmentName: 'Bulldozer Komatsu D65PX',
    equipmentHmAtUsage: 3125.5,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    notes: 'Pengisian solar Dozer perumpukan jalur tanam zero burning.',
  },
  // 8. Stok Keluar / Pemakaian Spare Part: Hose Hydraulic EX-01
  {
    id: 'LOG-OUT-2026-004',
    date: '2026-09-24',
    timestamp: '24/09/2026 14:10 WIB',
    category: 'Spare Part',
    itemName: 'Hose Hydraulic Boom 3/4" 4SP',
    quantity: 1,
    unit: 'Pcs',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Penggantian spare part rusak (Breakdown)',
    equipmentId: 'EX-01',
    equipmentName: 'Excavator Komatsu PC200-8 #01',
    equipmentHmAtUsage: 2162.0,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    notes: 'Selang pecah di lapangan saat mengangkat batang kayu besar. Dipasang oleh Mekanik Doni.',
  },
  // 9. Stok Keluar / Pemakaian Grease: EX-01
  {
    id: 'LOG-OUT-2026-005',
    date: '2026-09-24',
    timestamp: '24/09/2026 17:00 WIB',
    category: 'Grease',
    itemName: 'Grease Chassis EP-2 High Temp',
    quantity: 2.5,
    unit: 'Kg',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Pelumasan pin & bushing (Greasing harian)',
    equipmentId: 'EX-01',
    equipmentName: 'Excavator Komatsu PC200-8 #01',
    equipmentHmAtUsage: 2166.5,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'approved',
    notes: 'Greasing sore hari setelah jam operasional unit selesai pada semua pin bucket & arm.',
  },
  // 10. Stok Keluar: Pengisian Solar Bulldozer (MENUNGGU VERIFIKASI / PERSETUJUAN MANAGER)
  {
    id: 'LOG-OUT-2026-006',
    date: '2026-09-24',
    timestamp: '24/09/2026 14:15 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B35',
    quantity: 125,
    unit: 'Liter',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
    equipmentId: 'DZ-01',
    equipmentName: 'Bulldozer CAT D6R #01',
    equipmentHmAtUsage: 3418.5,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'pending',
    notes: 'Pengisian solar sore armada Bulldozer perataan rintisan. Menunggu verifikasi Manager.',
  },
  // 11. Stok Keluar: Filter Solar Cadangan (MENUNGGU VERIFIKASI / PERSETUJUAN MANAGER)
  {
    id: 'LOG-OUT-2026-007',
    date: '2026-09-24',
    timestamp: '24/09/2026 15:40 WIB',
    category: 'Spare Part',
    itemName: 'Filter Solar Komatsu PC200',
    quantity: 2,
    unit: 'Pcs',
    type: 'out',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockId: 'blk-1',
    blockCode: 'Blok AB',
    purpose: 'Saat perbaikan/perawatan alat (Servis Berkala)',
    equipmentId: 'EX-02',
    equipmentName: 'Excavator Komatsu PC200-8 #02',
    equipmentHmAtUsage: 1855.0,
    submittedByRole: 'supervisor',
    submittedByName: 'Budi Santoso',
    approvalStatus: 'pending',
    notes: 'Penggantian filter solar kotor pada servis 250 HM. Menunggu verifikasi Manager.',
  },
];

export const initialDailyTargets: DailyLocationTarget[] = [];

// Seed Mock Data: Checklist Inspeksi Pra-Operasi (P2H)
export const initialP2HChecklists = [
  {
    id: 'P2H-2026-09-24-EX01',
    date: '2026-09-24',
    time: '06:45',
    equipmentId: 'EX-01',
    equipmentName: 'Excavator Komatsu PC200-8',
    operatorName: 'Agus Triono',
    supervisorName: 'Budi Santoso',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockCode: 'Blok AB',
    hmStart: 2840.5,
    engineOilLevel: 'Baik / Normal',
    radiatorCoolant: 'Baik / Normal',
    hydraulicOilAndPressure: 'Baik / Normal',
    hydraulicHosesAndFittings: 'Perlu Perhatian', // Ada gejala getas di selang arm
    undercarriageAndTracks: 'Baik / Normal',
    fuelLevelAndSeparator: 'Baik / Normal',
    electricalAndLights: 'Baik / Normal',
    safetyAparAndSeatbelt: 'Baik / Normal',
    overallStatus: 'Bersyarat (Pantau)',
    mechanicActionNeeded: false,
    notes: 'Selang hidrolik arm silinder mulai mengeras, pantau tekanan saat tumbang kayu diameter > 40cm.',
    createdAt: '2026-09-24 06:50 WIB',
  },
  {
    id: 'P2H-2026-09-24-DZ01',
    date: '2026-09-24',
    time: '06:50',
    equipmentId: 'DZ-01',
    equipmentName: 'Bulldozer CAT D6R XL',
    operatorName: 'Slamet Riyadi',
    supervisorName: 'Budi Santoso',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockCode: 'Blok AB',
    hmStart: 3120.0,
    engineOilLevel: 'Baik / Normal',
    radiatorCoolant: 'Baik / Normal',
    hydraulicOilAndPressure: 'Baik / Normal',
    hydraulicHosesAndFittings: 'Baik / Normal',
    undercarriageAndTracks: 'Baik / Normal',
    fuelLevelAndSeparator: 'Baik / Normal',
    electricalAndLights: 'Baik / Normal',
    safetyAparAndSeatbelt: 'Baik / Normal',
    overallStatus: 'Layak Operasi',
    mechanicActionNeeded: false,
    notes: 'Unit prima, blade dan ripper siap dorong gulungan kayu stacking.',
    createdAt: '2026-09-24 06:55 WIB',
  },
  {
    id: 'P2H-2026-09-24-EX02',
    date: '2026-09-24',
    time: '07:05',
    equipmentId: 'EX-02',
    equipmentName: 'Excavator Hitachi ZX200-5G',
    operatorName: 'Dedi Kurniawan',
    supervisorName: 'Ahmad Fauzi',
    clientId: 'client-2',
    clientName: 'PT. B',
    blockCode: 'Blok B-01',
    hmStart: 1950.0,
    engineOilLevel: 'Baik / Normal',
    radiatorCoolant: 'Baik / Normal',
    hydraulicOilAndPressure: 'Baik / Normal',
    hydraulicHosesAndFittings: 'Baik / Normal',
    undercarriageAndTracks: 'Baik / Normal',
    fuelLevelAndSeparator: 'Baik / Normal',
    electricalAndLights: 'Baik / Normal',
    safetyAparAndSeatbelt: 'Baik / Normal',
    overallStatus: 'Layak Operasi',
    mechanicActionNeeded: false,
    notes: 'Siap rintis parit batas blok gambut dangkal.',
    createdAt: '2026-09-24 07:10 WIB',
  }
];

// Seed Mock Data: Penerimaan Solar Keliling (Fuel Bowser)
export const initialFuelBowserReceipts = [
  {
    id: 'FBW-2026-09-24-001',
    date: '2026-09-24',
    time: '11:30',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockCode: 'Blok AB',
    bowserTruckId: 'BM 8421 AU (Tangki 5.000 L)',
    sealNumber: 'SGL-B35-88391',
    deliveryDocNumber: 'SJ-BBM/SL/2026/09/24-11',
    equipmentId: 'EX-01',
    equipmentName: 'Excavator Komatsu PC200-8',
    equipmentHmAtRefuel: 2844.5,
    flowmeterStart: 42100,
    flowmeterEnd: 42240,
    totalLitersFilled: 140,
    fuelQualityCheck: 'Jernih (B35 Standar)',
    operatorName: 'Agus Triono',
    bowserDriverName: 'Bambang Irawan',
    supervisorName: 'Budi Santoso',
    notes: 'Pengisian solar jam istirahat siang di titik kumpul rintis sub-blok 11. Segel tangki utuh dan flowmeter terkalibrasi.',
    createdAt: '2026-09-24 11:40 WIB',
  },
  {
    id: 'FBW-2026-09-24-002',
    date: '2026-09-24',
    time: '12:00',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockCode: 'Blok AB',
    bowserTruckId: 'BM 8421 AU (Tangki 5.000 L)',
    sealNumber: 'SGL-B35-88391',
    deliveryDocNumber: 'SJ-BBM/SL/2026/09/24-11',
    equipmentId: 'DZ-01',
    equipmentName: 'Bulldozer CAT D6R XL',
    equipmentHmAtRefuel: 3124.0,
    flowmeterStart: 42240,
    flowmeterEnd: 42390,
    totalLitersFilled: 150,
    fuelQualityCheck: 'Jernih (B35 Standar)',
    operatorName: 'Slamet Riyadi',
    bowserDriverName: 'Bambang Irawan',
    supervisorName: 'Budi Santoso',
    notes: 'Tangki dozer terisi penuh, water trap bersih tidak ada endapan air.',
    createdAt: '2026-09-24 12:15 WIB',
  }
];

// Seed Mock Data: Log Insiden Lapangan & Bahaya Tanah Gambut (K3)
export const initialSoilIncidents = [
  {
    id: 'INC-2026-09-23-01',
    date: '2026-09-23',
    time: '14:20',
    clientId: 'client-1',
    clientName: 'PT. A',
    blockCode: 'Blok AB',
    incidentType: 'Alat Amblas di Tanah Gambut Dalam',
    severity: 'Sedang (Butuh Bantuan Winching)',
    affectedEquipmentId: 'EX-01',
    affectedEquipmentName: 'Excavator Komatsu PC200-8',
    operatorName: 'Agus Triono',
    rescuingEquipmentId: 'DZ-01 (CAT D6R XL)',
    evacuationDurationHours: 1.5,
    soilCondition: 'Tanah Gambut Kedalaman > 2m',
    injuryStatus: 'Zero Accident (Nihil Cidera)',
    actionTaken: 'Alat amblas hingga level track shoe kanan karena kantung gambut lunak tersembunyi. Ditarik perlahan menggunakan sling baja 32mm dibantu dorongan arm bucket dan tahanan dozer DZ-01.',
    preventionNotes: 'Pasang kayu ralas/bantalan gelondongan (matting log) saat melintasi jalur bekas alur air rendahan.',
    resolvedStatus: 'Selesai Dievakuasi',
    supervisorName: 'Budi Santoso',
    createdAt: '2026-09-23 16:30 WIB',
  },
  {
    id: 'INC-2026-09-21-01',
    date: '2026-09-21',
    time: '10:15',
    clientId: 'client-2',
    clientName: 'PT. B',
    blockCode: 'Blok B-01',
    incidentType: 'Pohon Lapuk Roboh / Menimpa Jalur',
    severity: 'Ringan (Tangani Sendiri)',
    affectedEquipmentId: 'EX-02',
    affectedEquipmentName: 'Excavator Hitachi ZX200-5G',
    operatorName: 'Dedi Kurniawan',
    rescuingEquipmentId: '-',
    evacuationDurationHours: 0.5,
    soilCondition: 'Gambut Dangkal / Basah',
    injuryStatus: 'Zero Accident (Nihil Cidera)',
    actionTaken: 'Pohon kempas lapuk tumbang akibat angin kencang menutup akses jalur rintis utama. Operator memotong dan menyingkirkan dahan dengan bucket excavator.',
    preventionNotes: 'Tumbangkan pohon kering lapuk condong di radius 20 meter sebelum alat berat utama melintas.',
    resolvedStatus: 'Selesai Dievakuasi',
    supervisorName: 'Ahmad Fauzi',
    createdAt: '2026-09-21 11:00 WIB',
  }
];

export const initialJobTitles: string[] = [
  'Direktur',
  'Manager',
  'Pengawas'
];

export const initialManagedUsers: ManagedUser[] = [
  {
    id: 'user-usr-01',
    fullName: 'Ir. Baso Suriyadi',
    address: 'Makassar',
    whatsappNumber: '0811420312',
    email: 'basosuriyadi@gmail.com',
    jobTitle: 'Direktur Utama',
    userLevel: 'Superadmin',
    username: 'bosdirektur',
    password: 'bos12345',
    employeeIdNumber: 'RBS-DIR-001',
    signatureUrl: createSimulatedSignatureSvg('Ir. Baso Suriyadi', 'Direktur Utama'),
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Owner)',
    assignedBlockCodes: ['Akses Semua Blok (Tanpa Batas)'],
    status: 'Aktif',
    createdAt: '2026-01-01T08:00:00.000Z',
    notes: 'Akun Resmi Direktur Utama / Owner (Superadmin)',
  },
  {
    id: 'user-usr-03',
    fullName: 'Andi Mujibal',
    address: 'Makassar',
    whatsappNumber: '08222112233',
    email: 'andimujibal@gmail.com',
    jobTitle: 'Site Manager Operasional',
    userLevel: 'Site Manager',
    username: 'andimujibal',
    password: 'andi12345',
    employeeIdNumber: 'RBS-MGR-003',
    signatureUrl: createSimulatedSignatureSvg('Andi Mujibal', 'Site Manager Operasional'),
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Site Manager Operasional)',
    assignedBlockCodes: ['Akses Supervisi Semua Blok'],
    status: 'Aktif',
    createdAt: '2026-08-01T08:00:00.000Z',
    notes: 'Site Manager Operasional (Otorisasi & Approval Pekerjaan Lapangan)',
  },
];

export const initialWorkAssignments: WorkAssignment[] = [];

// Helper to compress uploaded signature images (Data URL) via Canvas so they stay under 50KB for localStorage & Firestore
export function compressSignatureDataUrl(dataUrl: string, maxWidth = 480, maxHeight = 220): Promise<string> {
  return new Promise((resolve) => {
    if (!dataUrl || !dataUrl.startsWith('data:image/') || dataUrl.startsWith('data:image/svg')) {
      resolve(dataUrl);
      return;
    }
    if (typeof document === 'undefined' || typeof Image === 'undefined') {
      resolve(dataUrl);
      return;
    }
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        let width = img.width || maxWidth;
        let height = img.height || maxHeight;

        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }

        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve(dataUrl);
          return;
        }
        // Fill white background for JPEG/photo signatures or keep clean contrast
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', 0.82);
        resolve(compressed.length < dataUrl.length ? compressed : dataUrl);
      } catch {
        resolve(dataUrl);
      }
    };
    img.onerror = () => resolve(dataUrl);
    img.src = dataUrl;
  });
}

// Helper to generate a crisp, scalable Company Logo SVG (Data URL)
export function createDefaultCompanyLogoSvg(shortName: string = 'RBS', officialName: string = 'PT. RBS GROUP'): string {
  const displayShort = shortName || 'RBS';
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="300" viewBox="0 0 300 300">
    <defs>
      <linearGradient id="shieldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#f59e0b"/>
        <stop offset="50%" stop-color="#d97706"/>
        <stop offset="100%" stop-color="#b45309"/>
      </linearGradient>
      <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#090d16"/>
        <stop offset="100%" stop-color="#1e293b"/>
      </linearGradient>
      <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#fbbf24"/>
        <stop offset="100%" stop-color="#f59e0b"/>
      </linearGradient>
    </defs>
    <rect width="300" height="300" rx="52" fill="url(#bgGrad)"/>
    <rect x="8" y="8" width="284" height="284" rx="46" fill="none" stroke="#f59e0b" stroke-width="3.5" stroke-opacity="0.4"/>
    
    <!-- Shield Symbol -->
    <path d="M150 36 L224 72 V142 C224 195 150 234 150 234 C150 234 76 195 76 142 V72 Z" fill="url(#shieldGrad)" />
    
    <!-- Heavy Equipment Silhouette inside shield -->
    <!-- Tractor body & tracks -->
    <path d="M108 142 H192 V168 H108 Z" fill="#0f172a" rx="4" />
    <circle cx="123" cy="155" r="7" fill="#fbbf24" />
    <circle cx="150" cy="155" r="7" fill="#fbbf24" />
    <circle cx="177" cy="155" r="7" fill="#fbbf24" />
    <!-- Cabin -->
    <path d="M124 110 H160 V142 H124 Z" fill="#0f172a" />
    <rect x="130" y="115" width="22" height="15" fill="#38bdf8" rx="2" />
    <!-- Arm / Blade -->
    <path d="M160 120 L188 102 L198 128" fill="none" stroke="#0f172a" stroke-width="6.5" stroke-linecap="round" />
    
    <!-- Company Short Name on Badge -->
    <rect x="30" y="240" width="240" height="40" rx="12" fill="#090d16" stroke="#f59e0b" stroke-width="2"/>
    <text x="150" y="267" fill="url(#goldGrad)" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" letter-spacing="3" text-anchor="middle">${displayShort}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Helper to generate simulated authentic digital signature SVG
export function createSimulatedSignatureSvg(name: string, roleTitle: string): string {
  const cleanName = name.replace(/^(Ir\.|Dr\.|Drs\.|H\.|Hj\.)\s*/i, '').split(',')[0].trim();
  const initial = cleanName.charAt(0) || 'S';
  const rest = cleanName.slice(1) || 'ignature';
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">
    <defs>
      <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <!-- Digital Cursive Stroke Simulation -->
    <path d="M30,85 Q45,25 70,30 T90,95 Q105,40 140,55 T190,80 Q215,60 250,75 Q270,85 240,95 Q200,105 130,100" 
          fill="none" stroke="url(#inkGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50,60 Q90,65 180,60 T270,68" 
          fill="none" stroke="url(#inkGrad)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="85" cy="45" r="2.5" fill="#1e3a8a" />
    <circle cx="160" cy="48" r="2.5" fill="#1e3a8a" />
    
    <!-- Verified Security Tag -->
    <text x="290" y="112" fill="#64748b" font-family="monospace" font-size="8" text-anchor="end">DIGITALLY VERIFIED • ID: ${Math.random().toString(36).substring(2, 8).toUpperCase()}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

// Initial Company Profile (Identitas Resmi Perusahaan)
export const initialCompanyProfile: CompanyProfile = {
  id: 'company_profile_main',
  officialName: 'PT. RBS GROUP',
  shortName: 'RBS',
  tagline: 'Heavy Equipment & Plantation Land Clearing Contractor • Zero Burning Method',
  logoUrl: createDefaultCompanyLogoSvg('RBS', 'PT. RBS GROUP'),
  npwp: '01.234.567.8-216.000',
  nib: '9120304561234',
  phone: '(0761) 554321',
  whatsapp: '0812-7654-3210',
  email: 'corporate@rbsgroup.co.id',
  website: 'https://rbsgroup.co.id',
  headOfficeAddress: 'Jl. Jenderal Sudirman Kav. 88, Gedung RBS Tower Lt. 4, Pekanbaru, Riau 28282',
  siteOfficeAddress: 'Basecamp Operasional Proyek Land Clearing Estate Siak & Pelalawan, Riau',
  bankAccountInfo: 'Bank Mandiri Cabang Pekanbaru: 108-00-1234567-8 a/n PT. RBS GROUP',
  legalNotice: 'Kontraktor Spesialis Land Clearing Perkebunan Berizin Resmi & Ramah Lingkungan Tanpa Bakar',
  updatedAt: '2026-09-01T08:00:00Z',
};

// Initial Company Staff Information with Digital Signatures & Login Credentials
export const initialCompanyStaff: CompanyStaff[] = [
  {
    id: 'staff-1',
    fullName: 'Ir. Baso Suriyadi',
    jobRole: 'Direktur Utama',
    staffLevel: 'Direktur',
    employeeIdNumber: 'RBS-DIR-001',
    email: 'basosuriyadi@gmail.com',
    phone: '0811420312',
    address: 'Makassar',
    signatureUrl: createSimulatedSignatureSvg('Ir. Baso Suriyadi', 'Direktur Utama'),
    status: 'Aktif',
    linkedUserId: 'user-usr-01',
    username: 'bosdirektur',
    password: 'bos12345',
    userLevel: 'Superadmin',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Owner)',
    assignedBlockCodes: ['Akses Semua Blok (Tanpa Batas)'],
    notes: 'Direktur Utama / Owner (Superadmin)',
    createdAt: '2026-01-01T08:00:00Z',
  },
  {
    id: 'staff-3',
    fullName: 'Andi Mujibal',
    jobRole: 'Site Manager Operasional',
    staffLevel: 'Site Manager',
    employeeIdNumber: 'RBS-MGR-003',
    email: 'andimujibal@gmail.com',
    phone: '08222112233',
    address: 'Makassar',
    signatureUrl: createSimulatedSignatureSvg('Andi Mujibal', 'Site Manager Operasional'),
    status: 'Aktif',
    linkedUserId: 'user-usr-03',
    username: 'andimujibal',
    password: 'andi12345',
    userLevel: 'Site Manager',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Site Manager Operasional)',
    assignedBlockCodes: ['Akses Supervisi Semua Blok'],
    notes: 'Site Manager Operasional (Otorisasi & Approval Pekerjaan Lapangan)',
    createdAt: '2026-01-15T08:00:00Z',
  },
];



