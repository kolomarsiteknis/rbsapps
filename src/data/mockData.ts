import { Client, Project, Block, Equipment, Worker, InventoryItem, DailyReport } from '../types';

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
    <text x="400" y="175" fill="#f59e0b" font-family="system-ui, sans-serif" font-size="26" font-weight="bold" text-anchor="middle">🚜 SURYALAND</text>
    <text x="400" y="210" fill="#ffffff" font-family="system-ui, sans-serif" font-size="18" font-weight="600" text-anchor="middle">${title}</text>
    <text x="400" y="235" fill="#94a3b8" font-family="system-ui, sans-serif" font-size="13" text-anchor="middle">KLIEN: ${clientName} • ${subtitle}</text>
    
    <!-- Watermark Banner -->
    <rect x="0" y="405" width="800" height="95" fill="url(#bannerGrad)"/>
    <rect x="0" y="405" width="800" height="3" fill="#f59e0b"/>
    <text x="24" y="432" fill="#ffffff" font-family="system-ui, sans-serif" font-size="14" font-weight="bold">PT. SURYALAND GROUP • PROYEK KLIEN: ${clientName} (ZERO BURNING)</text>
    <text x="24" y="456" fill="#fbbf24" font-family="system-ui, sans-serif" font-size="12" font-weight="600">LOKASI: ${subtitle}</text>
    <text x="24" y="480" fill="#e2e8f0" font-family="monospace" font-size="11">📍 GPS: ${lat}, ${lng}    🕒 WAKTU: ${time} WIB</text>
    
    <!-- Seal badge -->
    <rect x="650" y="425" width="125" height="24" rx="6" fill="rgba(16,185,129,0.2)" stroke="#10b981" stroke-width="1.5"/>
    <text x="712" y="441" fill="#34d399" font-family="system-ui, sans-serif" font-size="10" font-weight="bold" text-anchor="middle">✓ GEOTAG VERIFIED</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export const initialClients: Client[] = [
  {
    id: 'client-1',
    name: 'PT. A',
    fullCompanyName: 'PT. AGRO PERDANA MANDIRI (PT. A)',
    address: 'Jl. Jenderal Sudirman No. 120, Pekanbaru, Riau',
    contactPerson: 'Ir. Hendra Wijaya, M.Si',
    phone: '+62 812-7654-3210',
    contractNumber: '045/SPK-LC/PTA/VI/2026',
    projectName: 'Land Clearing Perkebunan Sawit PT. A (100 Ha)',
    location: 'Kabupaten Kampar / Pelalawan, Riau',
    totalAreaHa: 100,
    clearedAreaHa: 48.8,
    status: 'Aktif',
  },
  {
    id: 'client-2',
    name: 'PT. B',
    fullCompanyName: 'PT. SAWIT SUMBER SEJAHTERA (PT. B)',
    address: 'Kawasan Industri Pelalawan Blok C-4, Riau',
    contactPerson: 'H. Rahmat Hidayat, ST',
    phone: '+62 811-9876-5432',
    contractNumber: '012/SPK-LC/SSS/VII/2026',
    projectName: 'Land Clearing Perkebunan Sawit PT. B (175 Ha)',
    location: 'Siak Sri Indrapura, Riau',
    totalAreaHa: 175,
    clearedAreaHa: 32.5,
    status: 'Aktif',
  },
  {
    id: 'client-3',
    name: 'PT. D',
    fullCompanyName: 'PT. RIAU PALMA NUSANTARA (PT. D)',
    address: 'Jl. Riau Trade Center No. 15, Pekanbaru',
    contactPerson: 'Bambang Suryono',
    phone: '+62 813-5544-3322',
    contractNumber: '088/SPK-LC/RPN/VIII/2026',
    projectName: 'Pembersihan Lahan Sawit PT. D (260 Ha)',
    location: 'Indragiri Hulu, Riau',
    totalAreaHa: 260,
    clearedAreaHa: 18.0,
    status: 'Aktif',
  },
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    clientId: 'client-1',
    name: 'Land Clearing Perkebunan PT. A',
    location: 'Kabupaten Kampar / Pelalawan, Provinsi Riau',
    method: 'Zero Burning Method (Metode Tanpa Bakar: Rabas, Cincang, Rumpuk Mekanis)',
    totalTargetHa: 100,
    startDate: '2026-08-01',
    targetCompletionDate: '2026-10-31',
  },
  {
    id: 'proj-2',
    clientId: 'client-2',
    name: 'Land Clearing Perkebunan PT. B',
    location: 'Siak Sri Indrapura, Provinsi Riau',
    method: 'Zero Burning Method (Metode Tanpa Bakar)',
    totalTargetHa: 175,
    startDate: '2026-08-15',
    targetCompletionDate: '2026-11-30',
  },
  {
    id: 'proj-3',
    clientId: 'client-3',
    name: 'Pembersihan Lahan Sawit PT. D',
    location: 'Indragiri Hulu, Provinsi Riau',
    method: 'Zero Burning Method (Metode Tanpa Bakar)',
    totalTargetHa: 260,
    startDate: '2026-09-01',
    targetCompletionDate: '2026-12-31',
  },
];

export const initialBlocks: Block[] = [
  // PT. A Blocks
  {
    id: 'blk-1',
    projectId: 'proj-1',
    clientId: 'client-1',
    code: 'Blok AB',
    targetAreaHa: 100,
    clearedAreaHa: 48.8,
    status: 'Dalam Pengerjaan',
    drainageTargetM: 3000,
    drainageDoneM: 1250,
  },
  {
    id: 'blk-2',
    projectId: 'proj-1',
    clientId: 'client-1',
    code: 'Blok AC',
    targetAreaHa: 75,
    clearedAreaHa: 0,
    status: 'Belum Dimulai',
    drainageTargetM: 2000,
    drainageDoneM: 0,
  },
  {
    id: 'blk-3',
    projectId: 'proj-1',
    clientId: 'client-1',
    code: 'Blok AD',
    targetAreaHa: 120,
    clearedAreaHa: 0,
    status: 'Belum Dimulai',
    drainageTargetM: 3500,
    drainageDoneM: 0,
  },
  // PT. B Blocks
  {
    id: 'blk-4',
    projectId: 'proj-2',
    clientId: 'client-2',
    code: 'Blok B-01 (Siak)',
    targetAreaHa: 80,
    clearedAreaHa: 32.5,
    status: 'Dalam Pengerjaan',
    drainageTargetM: 2500,
    drainageDoneM: 800,
  },
  {
    id: 'blk-5',
    projectId: 'proj-2',
    clientId: 'client-2',
    code: 'Blok B-02 (Siak)',
    targetAreaHa: 95,
    clearedAreaHa: 0,
    status: 'Belum Dimulai',
    drainageTargetM: 2800,
    drainageDoneM: 0,
  },
  // PT. D Blocks
  {
    id: 'blk-6',
    projectId: 'proj-3',
    clientId: 'client-3',
    code: 'Blok D-Alpha (Inhu)',
    targetAreaHa: 150,
    clearedAreaHa: 18.0,
    status: 'Dalam Pengerjaan',
    drainageTargetM: 4000,
    drainageDoneM: 500,
  },
];

export const initialEquipments: Equipment[] = [
  {
    id: 'EX-01',
    name: 'Excavator Komatsu PC200-8 #01',
    type: 'Excavator',
    model: 'PC200-8 LC',
    serialNumber: 'KM-PC200-8-98124',
    currentHm: 2158.5,
    standardFuelRatio: 18.0, // Limit Liter/HM
    status: 'Operasional',
    operatorName: 'Agus Santoso',
  },
  {
    id: 'EX-02',
    name: 'Excavator Komatsu PC200-8 #02',
    type: 'Excavator',
    model: 'PC200-8 LC',
    serialNumber: 'KM-PC200-8-98441',
    currentHm: 1845.0,
    standardFuelRatio: 18.0,
    status: 'Operasional',
    operatorName: 'Rian Hidayat',
  },
  {
    id: 'EX-03',
    name: 'Excavator Hitachi ZX210-5G',
    type: 'Excavator',
    model: 'ZX210-5G',
    serialNumber: 'HTC-ZX210-66412',
    currentHm: 1620.0,
    standardFuelRatio: 17.5,
    status: 'Operasional',
    operatorName: 'Hendri Gunawan',
  },
  {
    id: 'DZ-01',
    name: 'Bulldozer Komatsu D65PX',
    type: 'Bulldozer',
    model: 'D65PX-16 Swamp',
    serialNumber: 'KM-D65PX-44219',
    currentHm: 3118.0,
    standardFuelRatio: 22.0,
    status: 'Operasional',
    operatorName: 'Bambang Supriyanto',
  },
  {
    id: 'DZ-02',
    name: 'Bulldozer Caterpillar D6R',
    type: 'Bulldozer',
    model: 'CAT D6R XL',
    serialNumber: 'CAT-D6R-88310',
    currentHm: 2890.0,
    standardFuelRatio: 23.0,
    status: 'Standby',
    operatorName: 'Slamet Riyadi',
  },
  {
    id: 'DT-01',
    name: 'Dump Truck Hino 500 FM260TI',
    type: 'Dump Truck',
    model: 'FM260TI 6x4',
    serialNumber: 'HN-500-33219',
    currentHm: 1420.0,
    standardFuelRatio: 12.0,
    status: 'Operasional',
    operatorName: 'Joko Prabowo',
  },
];

export const initialWorkers: Worker[] = [
  // PT. A (client-1) - Blok AB (blk-1)
  { 
    id: 'w-1', 
    name: 'Agus Santoso', 
    category: 'Pekerja Utama', 
    role: 'Operator EX-01 (Excavator PC200)', 
    phone: '+62 813-1122-3344', 
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-2', 
    name: 'Rian Hidayat', 
    category: 'Pekerja Utama', 
    role: 'Operator EX-02 (Excavator PC200)', 
    phone: '+62 813-2233-4455', 
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-3', 
    name: 'Bambang Supriyanto', 
    category: 'Pekerja Utama', 
    role: 'Operator DZ-01 (Bulldozer D6R)', 
    phone: '+62 813-3344-5566', 
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-4', 
    name: 'Dani & Supri (3 Orang)', 
    category: 'Pekerja Utama', 
    role: 'Helper & Helper Rintis Semak', 
    phone: '+62 813-4455-6677', 
    status: 'Hadir',
    teamName: 'Tim Rintis & Imas Kayu',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-5', 
    name: 'Toni Wijaya', 
    category: 'Maintenance', 
    role: 'Mekanik Alat Berat', 
    phone: '+62 812-5566-7788', 
    status: 'Hadir',
    teamName: 'Tim Mekanik Maintenance',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-6', 
    name: 'Doni Saputra', 
    category: 'Maintenance', 
    role: 'Helper Mekanik & Greaser', 
    phone: '+62 812-6677-8899', 
    status: 'Hadir',
    teamName: 'Tim Mekanik Maintenance',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-7', 
    name: 'Joko Prabowo', 
    category: 'Maintenance', 
    role: 'Driver Tangki BBM & DT-01', 
    phone: '+62 812-7788-9900', 
    status: 'Hadir',
    teamName: 'Tim Mekanik Maintenance',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-8', 
    name: 'Budi Santoso', 
    category: 'Pengawas & Pendukung', 
    role: 'Mandor / Pengawas Lapangan', 
    phone: '+62 811-8899-0011', 
    status: 'Hadir',
    teamName: 'Tim Pengawas & K3',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },
  { 
    id: 'w-9', 
    name: 'Eko Prasetyo', 
    category: 'Pengawas & Pendukung', 
    role: 'Surveyor Field & Pemetaan GPS', 
    phone: '+62 811-9900-1122', 
    status: 'Hadir',
    teamName: 'Tim Pengawas & K3',
    assignedClientId: 'client-1',
    assignedBlockId: 'blk-1'
  },

  // PT. B (client-2) - Blok B-01 Siak (blk-4)
  { 
    id: 'w-10', 
    name: 'Hendri Gunawan', 
    category: 'Pekerja Utama', 
    role: 'Operator EX-03 (Excavator PC200)', 
    phone: '+62 813-9988-7766', 
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-2',
    assignedBlockId: 'blk-4'
  },
  { 
    id: 'w-12', 
    name: 'Yudi Pratama', 
    category: 'Pekerja Utama', 
    role: 'Operator Chainsaw & Rumpuk Kayu', 
    phone: '+62 813-7766-5544', 
    status: 'Hadir',
    teamName: 'Tim Rintis & Imas Kayu',
    assignedClientId: 'client-2',
    assignedBlockId: 'blk-4'
  },
  { 
    id: 'w-13', 
    name: 'Wawan Setiawan', 
    category: 'Maintenance', 
    role: 'Mekanik Lapangan Siak', 
    phone: '+62 812-3344-5577', 
    status: 'Hadir',
    teamName: 'Tim Mekanik Maintenance',
    assignedClientId: 'client-2',
    assignedBlockId: 'blk-4'
  },
  { 
    id: 'w-11', 
    name: 'Faisal Akbar', 
    category: 'Pengawas & Pendukung', 
    role: 'Pengawas Lapangan Wilayah Siak', 
    phone: '+62 811-3322-1100', 
    status: 'Hadir',
    teamName: 'Tim Pengawas & K3',
    assignedClientId: 'client-2',
    assignedBlockId: 'blk-4'
  },

  // PT. D (client-3) - Blok D-Alpha Inhu (blk-6)
  { 
    id: 'w-14', 
    name: 'Dedi Kurniawan', 
    category: 'Pekerja Utama', 
    role: 'Operator Excavator Long Arm (Parit)', 
    phone: '+62 813-8877-6655', 
    status: 'Hadir',
    teamName: 'Tim Drainase & Parit',
    assignedClientId: 'client-3',
    assignedBlockId: 'blk-6'
  },
  { 
    id: 'w-15', 
    name: 'Aris Munandar', 
    category: 'Pengawas & Pendukung', 
    role: 'Pengawas Lapangan Inhu', 
    phone: '+62 811-5566-7788', 
    status: 'Hadir',
    teamName: 'Tim Pengawas & K3',
    assignedClientId: 'client-3',
    assignedBlockId: 'blk-6'
  },
];

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
      targetDrainageM: 200,
      realizedDrainageM: 150,
      cumulativeDrainageM: 1250,
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
      director: { name: 'Ir. Hendra Wijaya, M.Si', signedAt: undefined, status: 'Pending' },
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
      targetDrainageM: 100,
      realizedDrainageM: 120,
      cumulativeDrainageM: 800,
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
      director: { name: 'Ir. Hendra Wijaya, M.Si', signedAt: '2026-09-24 20:00 WIB', status: 'Signed' },
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
      targetDrainageM: 150,
      realizedDrainageM: 140,
      cumulativeDrainageM: 500,
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
      director: { name: 'Ir. Hendra Wijaya, M.Si', signedAt: '2026-09-23 21:00 WIB', status: 'Signed' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-23T17:30:00Z',
    updatedAt: '2026-09-23T21:00:00Z',
  },
];
