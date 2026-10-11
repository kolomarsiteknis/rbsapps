import {
  Client,
  Project,
  Block,
  Equipment,
  Worker,
  InventoryItem,
  DailyReport,
  LogisticsTransaction,
  DailyLocationTarget,
  ManagedUser,
  WorkAssignment,
  CompanyProfile,
  CompanyStaff,
} from '../types';

export function createSimulatedFieldPhoto(
  title: string,
  subtitle: string,
  badgeBgColor: string,
  latStr: string,
  lngStr: string,
  timestampStr: string,
  clientNameStr: string
): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="800" height="460" viewBox="0 0 800 460">
    <rect width="800" height="460" fill="#1e293b"/>
    <rect x="20" y="20" width="760" height="420" rx="12" fill="#0f172a" stroke="#334155" stroke-width="2"/>
    <text x="400" y="220" fill="#f8fafc" font-family="sans-serif" font-size="20" font-weight="bold" text-anchor="middle">${title}</text>
    <text x="400" y="250" fill="#94a3b8" font-family="sans-serif" font-size="14" text-anchor="middle">${subtitle}</text>
    <rect x="30" y="380" width="740" height="50" rx="8" fill="rgba(15, 23, 42, 0.85)"/>
    <text x="45" y="410" fill="#fbbf24" font-family="monospace" font-size="12" font-weight="bold">${clientNameStr} • GPS: ${latStr}, ${lngStr} • ${timestampStr}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createGeotaggedPhotoDataUrl(
  location: string,
  activity: string,
  operator: string,
  latStr: string,
  lngStr: string
): string {
  return createSimulatedFieldPhoto(
    activity,
    `${location} • Operator: ${operator}`,
    '#f59e0b',
    latStr,
    lngStr,
    '2026-10-01 10:00 WIB',
    location
  );
}

export const initialClients: Client[] = [
  {
    id: 'client-1',
    name: 'PT. GUDANG',
    fullCompanyName: 'PT. GUDANG KOMODITAS KONDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    location: 'Kec. Kuranji, Tanah Bumbu, Kalsel',
    address: 'Kec. Kuranji, Tanah Bumbu, Kalsel',
    contactPerson: 'Bapak Direktur',
    phone: '081122334455',
    projectName: 'Land Clearing Perkebunan PT. GUDANG',
    totalAreaHa: 500,
    clearedAreaHa: 120,
    status: 'Aktif',
  }
];

export const initialProjects: Project[] = [
  {
    id: 'proj-1',
    clientId: 'client-1',
    name: 'Land Clearing Perkebunan PT. GUDANG',
    location: 'Kec. Kuranji, Tanah Bumbu, Kalsel',
    totalTargetHa: 500,
    startDate: '2026-09-01',
    targetCompletionDate: '2026-12-31',
    method: 'Zero Burning',
  }
];

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

// 26 Lokasi Blok Kerja Resmi PT. GUDANG (No SPK: B/0001/33/GKK/OPS/9/2026)
const BLOCK_CODES_26 = [
  'BLOK I31', 'BLOK I32', 'BLOK I33', 'BLOK I34', 'BLOK I35', 'BLOK I36',
  'BLOK J31', 'BLOK J32', 'BLOK J33', 'BLOK J34', 'BLOK J35', 'BLOK J36',
  'BLOK K31', 'BLOK K32', 'BLOK K33', 'BLOK K34', 'BLOK K35', 'BLOK K36',
  'BLOK L31', 'BLOK L32', 'BLOK L33', 'BLOK L34', 'BLOK L35', 'BLOK L36',
  'BLOK M31', 'BLOK M32'
];

export const initialBlocks: Block[] = BLOCK_CODES_26.map((code, idx) => {
  const slug = code.toLowerCase().replace(/\s+/g, '-');
  const targetArea = (code === 'BLOK M31' || code === 'BLOK M32') ? 10 : 20;
  // Progress realistis (Total target 500 Ha, Total cleared 120 Ha)
  const clearedAreaMap: Record<string, number> = {
    'BLOK I31': 14,
    'BLOK I32': 12,
    'BLOK I33': 10,
    'BLOK I34': 8,
    'BLOK I35': 6,
    'BLOK I36': 4,
    'BLOK J31': 16,
    'BLOK J32': 14,
    'BLOK J33': 11,
    'BLOK J34': 8,
    'BLOK J35': 7,
    'BLOK J36': 5,
    'BLOK K31': 4,
    'BLOK K32': 1,
  };
  const clearedArea = clearedAreaMap[code] ?? 0;
  const status: Block['status'] = clearedArea >= targetArea 
    ? 'Selesai' 
    : clearedArea > 0 
      ? 'Dalam Pengerjaan' 
      : 'Belum Dimulai';

  return {
    id: `blk-${slug.replace('blok-', '')}`,
    projectId: 'proj-1',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    code,
    targetAreaHa: targetArea,
    dailyTargetAreaHa: (code.startsWith('BLOK J') || code.startsWith('BLOK I')) ? 4.0 : 3.5,
    clearedAreaHa: clearedArea,
    status,
    workItems: [
      { id: `${slug}-wi-1`, name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetVolume: targetArea, completedVolume: clearedArea },
      { id: `${slug}-wi-2`, name: 'BATANG KUBUR', unit: 'POHON', targetVolume: Math.round(targetArea * 0.8), completedVolume: Math.round(clearedArea * 0.7) },
      { id: `${slug}-wi-3`, name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', targetVolume: Math.round(targetArea * 0.6), completedVolume: Math.round(clearedArea * 0.5) },
      { id: `${slug}-wi-4`, name: 'MAINROAD', unit: 'm', targetVolume: 250, completedVolume: clearedArea > 5 ? 120 : 0 },
      { id: `${slug}-wi-5`, name: 'COLLECTION ROAD', unit: 'm', targetVolume: 100, completedVolume: clearedArea > 5 ? 50 : 0 },
      { id: `${slug}-wi-6`, name: 'SALURAN PRIMER', unit: 'm³', targetVolume: 50, completedVolume: 0 },
      { id: `${slug}-wi-7`, name: 'SALURAN SEKUNDER', unit: 'm³', targetVolume: 50, completedVolume: 0 },
      { id: `${slug}-wi-8`, name: 'SALURAN TERSIER', unit: 'm³', targetVolume: 50, completedVolume: 0 },
    ],
  };
});

export const initialEquipments: Equipment[] = [
  { id: 'DZ-01', name: 'Bulldozer Caterpillar D6R', type: 'Bulldozer', model: 'D6R', serialNumber: 'D6R-2002', currentHm: 1107, standardFuelRatio: 34.0, status: 'Operasional', operatorName: 'Bowo' },
  { id: 'EXCA-01', name: 'Excavator Komatsu PC200-8', type: 'Excavator', model: 'PC200-8', serialNumber: 'PC200-8-1001', currentHm: 1262, standardFuelRatio: 18.0, status: 'Operasional', operatorName: 'Hendri Gunawan' },
  { id: 'EXCA-02', name: 'Excavator Komatsu PC200-8', type: 'Excavator', model: 'PC200-8', serialNumber: 'PC200-8-1002', currentHm: 950, standardFuelRatio: 18.0, status: 'Operasional', operatorName: 'Agus Santoso' },
  { id: 'eq-1', name: 'Excavator Komatsu PC200-8', type: 'Excavator', model: 'PC200-8', serialNumber: 'PC200-8-1001', currentHm: 1262, standardFuelRatio: 18.0, status: 'Operasional', operatorName: 'Hendri Gunawan' },
  { id: 'eq-2', name: 'Bulldozer Caterpillar D6R', type: 'Bulldozer', model: 'D6R', serialNumber: 'D6R-2002', currentHm: 1100, standardFuelRatio: 34.0, status: 'Operasional', operatorName: 'Bowo' },
  { id: 'eq-3', name: 'Excavator Kobelco SK200-10', type: 'Excavator', model: 'SK200-10', serialNumber: 'SK200-3003', currentHm: 950, standardFuelRatio: 17.5, status: 'Operasional', operatorName: 'Agus Santoso' },
];

export const initialWorkers: Worker[] = [
  { id: 'w-1', name: 'Hendri Gunawan', role: 'Operator', category: 'Operator', phone: '081234567890', status: 'Hadir' },
  { id: 'w-2', name: 'Bowo', role: 'Operator', category: 'Operator', phone: '081234567891', status: 'Hadir' },
  { id: 'w-3', name: 'Jaya', role: 'Mekanik', category: 'Mekanik', phone: '081234567892', status: 'Hadir' },
  { id: 'w-4', name: 'Agus Santoso', role: 'Operator', category: 'Operator', phone: '081234567893', status: 'Hadir' },
];

export const initialInventory: InventoryItem[] = [
  { id: 'inv-1', code: 'BBM-SOL', name: 'Solar Industri B50', category: 'BBM', stockQuantity: 4650, unit: 'Liter', minThreshold: 1000 },
  { id: 'inv-2', code: 'LUB-OLI', name: 'Pelumas & Oli Unit', category: 'Oli', stockQuantity: 0, unit: 'Liter', minThreshold: 100 },
  { id: 'inv-3', code: 'LUB-GRS', name: 'Grease Pelumas', category: 'Grease', stockQuantity: 0, unit: 'Kg', minThreshold: 10 },
  { id: 'inv-4', code: 'PRT-FLT', name: 'Spare Part / Filter Solar', category: 'Spare Part', stockQuantity: 20, unit: 'Pcs', minThreshold: 5 },
];

// Target Harian Resmi (Ritme Kerja) per Lokasi Blok Kerja SPK B/0001/33/GKK/OPS/9/2026
const todayDateString = new Date().toISOString().split('T')[0];

export const initialDailyTargets: DailyLocationTarget[] = [
  {
    id: 'dt-gkk-today-j31',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-j31',
    blockCode: 'BLOK J31',
    date: todayDateString,
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 4.0,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 4.0, calculatedDays: 5 },
      { name: 'BATANG KUBUR', unit: 'POHON', totalVolume: 16, dailyTargetVolume: 3.5, calculatedDays: 5 },
      { name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', totalVolume: 12, dailyTargetVolume: 2.5, calculatedDays: 5 },
      { name: 'MAINROAD', unit: 'm', totalVolume: 250, dailyTargetVolume: 50, calculatedDays: 5 },
    ],
    notes: 'Prioritaskan rintisan jalur underbrushing dan pembuatan parit batas blok.',
    status: 'Terjadwal',
    createdAt: '2026-09-23T16:00:00Z',
  },
  {
    id: 'dt-gkk-today-i33',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-i33',
    blockCode: 'BLOK I33',
    date: todayDateString,
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 4.0,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 4.0, calculatedDays: 5 },
      { name: 'BATANG KUBUR', unit: 'POHON', totalVolume: 15, dailyTargetVolume: 3.0, calculatedDays: 5 },
      { name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', totalVolume: 10, dailyTargetVolume: 2.0, calculatedDays: 5 },
    ],
    notes: 'Patuhi standar Zero Burning Method. Hindari penumpukan kayu dekat tebing.',
    status: 'Terjadwal',
    createdAt: '2026-09-23T16:00:00Z',
  },
  {
    id: 'dt-gkk-2026-09-24-j31',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-j31',
    blockCode: 'BLOK J31',
    date: '2026-09-24',
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 4.0,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 4.0, calculatedDays: 5 },
      { name: 'BATANG KUBUR', unit: 'POHON', totalVolume: 16, dailyTargetVolume: 3.5, calculatedDays: 5 },
      { name: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', totalVolume: 12, dailyTargetVolume: 2.5, calculatedDays: 5 },
    ],
    notes: 'Prioritaskan rintisan jalur underbrushing dan pembuatan parit batas blok.',
    status: 'Terjadwal',
    createdAt: '2026-09-23T16:00:00Z',
  },
  {
    id: 'dt-gkk-2026-09-24-i33',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-i33',
    blockCode: 'BLOK I33',
    date: '2026-09-24',
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 4.0,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 4.0, calculatedDays: 5 },
      { name: 'BATANG KUBUR', unit: 'POHON', totalVolume: 15, dailyTargetVolume: 3.0, calculatedDays: 5 },
    ],
    notes: 'Patuhi standar Zero Burning Method. Hindari penumpukan kayu dekat tebing.',
    status: 'Terjadwal',
    createdAt: '2026-09-23T16:00:00Z',
  },
  {
    id: 'dt-gkk-2026-09-25-i31',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-i31',
    blockCode: 'BLOK I31',
    date: '2026-09-25',
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 4.0,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 4.0, calculatedDays: 5 },
      { name: 'COLLECTION ROAD', unit: 'm', totalVolume: 100, dailyTargetVolume: 25, calculatedDays: 4 },
    ],
    notes: 'Percepat perintisan jalan koleksi.',
    status: 'Terjadwal',
    createdAt: '2026-09-24T16:00:00Z',
  },
  {
    id: 'dt-gkk-2026-09-26-j34',
    clientId: 'client-1',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    clientName: 'PT. GUDANG',
    blockId: 'blk-j34',
    blockCode: 'BLOK J34',
    date: '2026-09-26',
    shift: 'Siang (07:00 - 17:00)',
    dailyTargetAreaHa: 3.5,
    assignmentNumbers: ['001/ST-LC/GKK/IX/2026'],
    itemTargets: [
      { name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', totalVolume: 20, dailyTargetVolume: 3.5, calculatedDays: 6 },
      { name: 'SALURAN PRIMER', unit: 'm³', totalVolume: 50, dailyTargetVolume: 15, calculatedDays: 4 },
    ],
    notes: 'Penggalian saluran primer harus memperhatikan kontur kemiringan air.',
    status: 'Terjadwal',
    createdAt: '2026-09-25T16:00:00Z',
  },
];

export const initialDailyReports: DailyReport[] = [
  {
    id: 'LC-RPT-2026-10-02-001',
    date: '2026-10-02',
    reportNumber: 'LC-RPT/2026/10/02-001',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    projectName: 'Land Clearing Perkebunan PT. GUDANG',
    blockId: 'blk-j31',
    blockCode: 'BLOK J31',
    weather: 'Cerah',
    weatherStartTime: '07.00',
    weatherEndTime: '17.00',
    weatherNotes: 'Cuaca relatif cerah, sempat rintik ringan tidak mengganggu',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'staff-spv-01',
    supervisorName: 'Ahmad Noor',
    physicalProgress: {
      targetAreaHa: 4.0,
      realizedAreaHa: 3.8,
      cumulativeAreaHa: 19.8,
      progressPercentage: 85.0,
      notes: 'Pekerjaan perumpukan mekanis dan pembersihan parit batas blok berjalan lancar.',
      itemProgress: [
        { itemName: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetDailyVolume: 4.0, realizedDailyVolume: 3.8, achievementPercentage: 95.0, notes: 'Target tercapai baik' },
        { itemName: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', targetDailyVolume: 2.5, realizedDailyVolume: 2.5, achievementPercentage: 100.0, notes: 'Rumpukan rapi' },
      ],
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'EXCA-01',
        equipmentName: 'Excavator Komatsu PC200-8',
        type: 'Excavator',
        hmStart: 1256.0,
        hmEnd: 1262.0,
        totalHm: 6.0,
        downtimeWeatherHours: 1.1,
        downtimeWeatherNote: 'Hujan rintik 1.1 jam',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 4.9,
        fuelAddedLiters: 150,
        fuelRatio: 30.6,
        fuelStandardLimit: 18.0,
        isFuelAlert: true,
        previousRemainingFuelLiters: 0,
        fuelConsumptionLiters: 88.2,
        remainingTankLiters: 61.8,
        recommendedRefuelLiters: 88.2,
        fuelAnalysisStatus: 'Tidak Normal (Indikasi Pemborosan)',
        fuelAnalysisNote: 'terjadi indikasi pemborosan seharusnya di tgl 02 Oktober 2026 pengisiannya bukan 150 liter tapi sekitar 88.2liter saja karena masih ada akumulasi total sisa BBM ditangki sejumlah 0 liter \t\tStatus Analisis = tidak normal',
      },
      {
        equipmentId: 'eq-1',
        equipmentName: 'Excavator Komatsu PC200-8',
        type: 'Excavator',
        hmStart: 1256.0,
        hmEnd: 1262.0,
        totalHm: 6.0,
        downtimeWeatherHours: 1.1,
        downtimeWeatherNote: 'Hujan rintik 1.1 jam',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 4.9,
        fuelAddedLiters: 150,
        fuelRatio: 30.6,
        fuelStandardLimit: 18.0,
        isFuelAlert: true,
        previousRemainingFuelLiters: 0,
        fuelConsumptionLiters: 88.2,
        remainingTankLiters: 61.8,
        recommendedRefuelLiters: 88.2,
        fuelAnalysisStatus: 'Tidak Normal (Indikasi Pemborosan)',
        fuelAnalysisNote: 'terjadi indikasi pemborosan seharusnya di tgl 02 Oktober 2026 pengisiannya bukan 150 liter tapi sekitar 88.2liter saja karena masih ada akumulasi total sisa BBM ditangki sejumlah 0 liter \t\tStatus Analisis = tidak normal',
      },
      {
        equipmentId: 'eq-2',
        equipmentName: 'Bulldozer Caterpillar D6R',
        type: 'Bulldozer',
        hmStart: 1100,
        hmEnd: 1107,
        totalHm: 7.0,
        downtimeWeatherHours: 1.0,
        downtimeWeatherNote: 'Cuaca hujan 1 jam',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 6.0,
        fuelAddedLiters: 130,
        fuelRatio: 21.6,
        fuelStandardLimit: 22.0,
        isFuelAlert: false,
        previousRemainingFuelLiters: 0,
        fuelConsumptionLiters: 132.0,
        remainingTankLiters: 0,
        recommendedRefuelLiters: 132.0,
        fuelAnalysisStatus: 'Normal',
        fuelAnalysisNote: 'Normal: Pengisian sesuai kebutuhan jam kerja efektif.',
      },
    ],
    laborAbsences: [
      { workerId: 'w-1', workerName: 'Hendri Gunawan', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-2', workerName: 'Bowo', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-3', workerName: 'Jaya', category: 'Mekanik', role: 'Mekanik', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 4545,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 280,
      fuelTankRemainingLiters: 4265,
      oilEngineLiters: 0,
      oilHydraulicLiters: 0,
      oilTransmissionLiters: 0,
      greaseKg: 1,
      sparePartsUsed: [],
    },
    photos: [],
    supervisorGeneralNotes: 'Pekerjaan land clearing tgl 2 berjalan lancar sesuai SOP.',
    status: 'Disetujui Direktur',
    signatures: {
      supervisor: { name: 'Ahmad Noor', signedAt: '02/10/2026 17:30 WIB', status: 'Signed' },
      siteManager: { name: 'Bambang Sugiarto, S.P.', signedAt: '02/10/2026 18:45 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', signedAt: '02/10/2026 20:00 WIB', status: 'Signed' },
    },
    syncStatus: 'synced',
    createdAt: '2026-10-02T17:30:00Z',
    updatedAt: '2026-10-02T20:00:00Z',
  },
  {
    id: 'LC-RPT-2026-09-24-001',
    date: '2026-09-24',
    reportNumber: 'LC-RPT/2026/09/24-001',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    projectName: 'Land Clearing Perkebunan PT. GUDANG',
    blockId: 'blk-j31',
    blockCode: 'BLOK J31',
    weather: 'Cerah',
    weatherStartTime: '07.00',
    weatherEndTime: '17.00',
    weatherNotes: 'Kondisi cuaca cerah sepanjang hari kerja',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'staff-spv-01',
    supervisorName: 'Ahmad Noor',
    physicalProgress: {
      targetAreaHa: 3.5,
      realizedAreaHa: 3.6,
      cumulativeAreaHa: 16.0,
      progressPercentage: 80.0,
      notes: 'Pekerjaan underbrushing dan perumpukan mekanis berjalan sesuai ritme target.',
      itemProgress: [
        { itemName: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetDailyVolume: 3.5, realizedDailyVolume: 3.6, achievementPercentage: 102.8, notes: 'Target tercapai baik' },
        { itemName: 'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS', unit: 'Ha', targetDailyVolume: 2.0, realizedDailyVolume: 2.0, achievementPercentage: 100.0, notes: 'Rumpukan rapi jarak 8m' },
      ],
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'eq-1',
        equipmentName: 'Excavator Komatsu PC200-8',
        type: 'Excavator',
        hmStart: 1242,
        hmEnd: 1250,
        totalHm: 8.0,
        downtimeWeatherHours: 0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0.5,
        downtimeBreakdownNote: 'Ganti selang oli hidrolik 30 menit',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 7.5,
        fuelAddedLiters: 130,
        fuelRatio: 17.3,
        fuelStandardLimit: 18.0,
        isFuelAlert: false,
      },
      {
        equipmentId: 'eq-2',
        equipmentName: 'Bulldozer Caterpillar D6R',
        type: 'Bulldozer',
        hmStart: 1092,
        hmEnd: 1100,
        totalHm: 8.0,
        downtimeWeatherHours: 0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 8.0,
        fuelAddedLiters: 165,
        fuelRatio: 20.6,
        fuelStandardLimit: 22.0,
        isFuelAlert: false,
      },
    ],
    laborAbsences: [
      { workerId: 'w-1', workerName: 'Hendri Gunawan', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-2', workerName: 'Bowo', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-3', workerName: 'Jaya', category: 'Mekanik', role: 'Mekanik', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 5000,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 295,
      fuelTankRemainingLiters: 4705,
      oilEngineLiters: 0,
      oilHydraulicLiters: 2,
      oilTransmissionLiters: 0,
      greaseKg: 2,
      sparePartsUsed: [],
    },
    photos: [],
    supervisorGeneralNotes: 'Kondisi tanah padat dan aman, operasional berjalan lancar tanpa kendala genangan.',
    status: 'Disetujui Direktur',
    signatures: {
      supervisor: { name: 'Ahmad Noor', signedAt: '24/09/2026 17:30 WIB', status: 'Signed' },
      siteManager: { name: 'Bambang Sugiarto, S.P.', signedAt: '24/09/2026 18:45 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', signedAt: '24/09/2026 20:00 WIB', status: 'Signed' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-24T17:30:00Z',
    updatedAt: '2026-09-24T20:00:00Z',
  },
  {
    id: 'LC-RPT-2026-09-25-002',
    date: '2026-09-25',
    reportNumber: 'LC-RPT/2026/09/25-002',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    projectName: 'Land Clearing Perkebunan PT. GUDANG',
    blockId: 'blk-j32',
    blockCode: 'BLOK J32',
    weather: 'Hujan Lebat',
    weatherStartTime: '13.00',
    weatherEndTime: '14.30',
    weatherNotes: 'Hujan deras siang hari 1.5 jam',
    effectiveWorkShift: '07.00 - 17.00 WIB',
    supervisorId: 'staff-spv-01',
    supervisorName: 'Ahmad Noor',
    physicalProgress: {
      targetAreaHa: 3.5,
      realizedAreaHa: 2.8,
      cumulativeAreaHa: 14.0,
      progressPercentage: 70.0,
      notes: 'Pekerjaan sempat terhenti akibat hujan deras siang hari.',
      itemProgress: [
        { itemName: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetDailyVolume: 3.5, realizedDailyVolume: 2.8, achievementPercentage: 80.0, notes: 'Terhambat cuaca hujan' },
        { itemName: 'SALURAN PRIMER', unit: 'm³', targetDailyVolume: 25, realizedDailyVolume: 20, achievementPercentage: 80.0, notes: 'Galian parit' },
      ],
    },
    equipmentWorkLogs: [
      {
        equipmentId: 'eq-1',
        equipmentName: 'Excavator Komatsu PC200-8',
        type: 'Excavator',
        hmStart: 1250,
        hmEnd: 1256,
        totalHm: 6.0,
        downtimeWeatherHours: 1.5,
        downtimeWeatherNote: 'Downtime cuaca hujan lebat 1.5 jam',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 4.5,
        fuelAddedLiters: 85,
        fuelRatio: 18.8,
        fuelStandardLimit: 18.0,
        isFuelAlert: true,
      },
      {
        equipmentId: 'eq-3',
        equipmentName: 'Excavator Kobelco SK200-10',
        type: 'Excavator',
        hmStart: 944,
        hmEnd: 950,
        totalHm: 6.0,
        downtimeWeatherHours: 1.5,
        downtimeWeatherNote: 'Downtime cuaca hujan lebat 1.5 jam',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 4.5,
        fuelAddedLiters: 75,
        fuelRatio: 16.6,
        fuelStandardLimit: 17.5,
        isFuelAlert: false,
      },
    ],
    laborAbsences: [
      { workerId: 'w-1', workerName: 'Hendri Gunawan', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-4', workerName: 'Agus Santoso', category: 'Operator', role: 'Operator', status: 'Hadir' },
      { workerId: 'w-3', workerName: 'Jaya', category: 'Mekanik', role: 'Mekanik', status: 'Hadir' },
    ],
    logistics: {
      fuelTankInitialLiters: 4705,
      fuelTankInflowLiters: 0,
      fuelTankUsedLiters: 160,
      fuelTankRemainingLiters: 4545,
      oilEngineLiters: 0,
      oilHydraulicLiters: 0,
      oilTransmissionLiters: 0,
      greaseKg: 1,
      sparePartsUsed: [],
    },
    photos: [],
    supervisorGeneralNotes: 'Unit diparkir di tempat tinggi selama hujan untuk mencegah amblas di tanah gambut.',
    status: 'Disetujui Manager',
    signatures: {
      supervisor: { name: 'Ahmad Noor', signedAt: '25/09/2026 17:15 WIB', status: 'Signed' },
      siteManager: { name: 'Bambang Sugiarto, S.P.', signedAt: '25/09/2026 19:10 WIB', status: 'Signed' },
      director: { name: 'Direktur Utama', status: 'Pending' },
    },
    syncStatus: 'synced',
    createdAt: '2026-09-25T17:15:00Z',
    updatedAt: '2026-09-25T19:10:00Z',
  },
];

export const initialLogisticsTransactions: LogisticsTransaction[] = [
  {
    id: 'lt-001',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    date: '2026-09-24',
    timestamp: '24/09/2026 08:00 WIB',
    category: 'BBM',
    itemName: 'Solar Industri B50',
    type: 'in',
    quantity: 5000,
    unit: 'Liter',
    sourceOrStorage: 'Tangki Induk Basecamp',
    referenceNumber: 'DO-PERTAMINA-99812',
    approvalStatus: 'approved',
    submittedByRole: 'supervisor',
    submittedByName: 'Ahmad Noor',
    approvedByDirectorName: 'Direktur Utama',
    approvedByRole: 'director',
    approvedAt: '24/09/2026 09:00 WIB',
    notes: 'Penerimaan Solar B50 resmi dari armada tangki PT. Pertamina Patra Niaga (Driver: Suwandi).',
  },
  {
    id: 'lt-002',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    date: '2026-09-24',
    timestamp: '24/09/2026 08:30 WIB',
    category: 'Oli',
    itemName: 'Pelumas & Oli Unit',
    type: 'in',
    quantity: 600,
    unit: 'Liter',
    sourceOrStorage: 'Gudang Logistik Basecamp',
    referenceNumber: 'DO-LUB-001',
    approvalStatus: 'approved',
    submittedByRole: 'supervisor',
    submittedByName: 'Ahmad Noor',
    approvedByDirectorName: 'Direktur Utama',
    approvedByRole: 'director',
    approvedAt: '24/09/2026 09:10 WIB',
    notes: 'Penerimaan Oli Mesin & Hidrolik.',
  },
  {
    id: 'lt-003',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    date: '2026-09-24',
    timestamp: '24/09/2026 08:45 WIB',
    category: 'Grease',
    itemName: 'Grease Pelumas',
    type: 'in',
    quantity: 45,
    unit: 'Kg',
    sourceOrStorage: 'Gudang Logistik Basecamp',
    referenceNumber: 'DO-GRS-001',
    approvalStatus: 'approved',
    submittedByRole: 'supervisor',
    submittedByName: 'Ahmad Noor',
    approvedByDirectorName: 'Direktur Utama',
    approvedByRole: 'director',
    approvedAt: '24/09/2026 09:15 WIB',
    notes: 'Penerimaan Grease untuk pin & bushing.',
  },
];

export const initialP2HChecklists: any[] = [];
export const initialFuelBowserReceipts: any[] = [];
export const initialSoilIncidents: any[] = [];

export const initialJobTitles: string[] = [
  'Direktur',
  'Manager',
  'Pengawas'
];

export const DEFAULT_SECRET_DEV_ACCOUNTS: ManagedUser[] = [
  {
    id: 'usr-dev-superadmin',
    fullName: 'Super Administrator',
    address: 'Kantor Pusat',
    whatsappNumber: '081100000001',
    email: 'superadmin@suryaland.co.id',
    jobTitle: 'Super Administrator / Direktur Utama',
    userLevel: 'Superadmin',
    username: 'superadmin',
    password: '@Super12345',
    employeeIdNumber: 'DEV-SA-01',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Owner)',
    assignedBlockCodes: ['Akses Semua Blok'],
    status: 'Aktif',
    isSystemHidden: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    notes: 'Akun Rahasia Sistem Developer / Tester / Maintenance',
  },
  {
    id: 'usr-dev-manager',
    fullName: 'Site Manager Operasional',
    address: 'Kantor Lapangan',
    whatsappNumber: '081100000002',
    email: 'manager@suryaland.co.id',
    jobTitle: 'Site Manager Operasional',
    userLevel: 'Site Manager',
    username: 'manager',
    password: '@manager12345',
    employeeIdNumber: 'DEV-MGR-02',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek (Site Manager Operasional)',
    assignedBlockCodes: ['Akses Supervisi Semua Blok'],
    status: 'Aktif',
    isSystemHidden: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    notes: 'Akun Rahasia Sistem Developer / Tester / Maintenance',
  },
  {
    id: 'usr-dev-pengawas',
    fullName: 'Pengawas Lapangan',
    address: 'Basecamp Lapangan',
    whatsappNumber: '081100000003',
    email: 'pengawas@suryaland.co.id',
    jobTitle: 'Mandor / Pengawas Lapangan',
    userLevel: 'Pengawas',
    username: 'pengawas',
    password: '@pengawas12345',
    employeeIdNumber: 'DEV-SUP-03',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek',
    assignedBlockCodes: ['Akses Semua Blok'],
    status: 'Aktif',
    isSystemHidden: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    notes: 'Akun Rahasia Sistem Developer / Tester / Maintenance',
  },
  {
    id: 'usr-dev-klienpt',
    fullName: 'Klien Mitra Proyek',
    address: 'Kantor Klien',
    whatsappNumber: '081100000004',
    email: 'klien@mitraproyek.co.id',
    jobTitle: 'Perwakilan Klien / Pemberi Kerja',
    userLevel: 'Klien',
    username: 'klienpt',
    password: '@klien12345',
    employeeIdNumber: 'DEV-CLI-04',
    assignedClientId: 'all',
    assignedClientName: 'Portal Monitoring Klien',
    assignedBlockCodes: ['Akses Blok Klien'],
    status: 'Aktif',
    isSystemHidden: true,
    createdAt: '2026-01-01T08:00:00.000Z',
    notes: 'Akun Rahasia Sistem Developer / Tester / Maintenance',
  },
];

export const defaultCleanSuperAdminUser: ManagedUser = DEFAULT_SECRET_DEV_ACCOUNTS[0];

export const initialManagedUsers: ManagedUser[] = [];

export const initialWorkAssignments: WorkAssignment[] = [
  {
    id: 'asg-gkk-001',
    assignmentNumber: '001/ST-LC/GKK/IX/2026',
    clientId: 'client-1',
    clientName: 'PT. GUDANG',
    contractNumber: 'B/0001/33/GKK/OPS/9/2026',
    totalAreaHa: 500,
    assignedDate: '2026-09-01',
    startDate: '2026-09-01',
    status: 'Aktif',
    notes: 'Penugasan Tim Kerja Operasional Proyek Land Clearing 500 Ha (26 Blok). Seluruh tim wajib mematuhi SOP Zero Burning Method dan standar K3.',
    siteManagerName: 'Bambang Sugiarto, S.P.',
    siteManagerPhone: '+62 812-3456-7890',
    supervisors: [
      {
        id: 'spv-1',
        name: 'Ahmad Noor',
        phone: '+62 813-1122-3344',
        coverageType: 'CUSTOM',
        assignedBlockIds: [
          'blk-i31', 'blk-i32', 'blk-i33', 'blk-i34', 'blk-i35', 'blk-i36',
          'blk-j31', 'blk-j32', 'blk-j33', 'blk-j34'
        ],
        assignedBlockCodes: [
          'BLOK I31', 'BLOK I32', 'BLOK I33', 'BLOK I34', 'BLOK I35', 'BLOK I36',
          'BLOK J31', 'BLOK J32', 'BLOK J33', 'BLOK J34'
        ],
      },
      {
        id: 'spv-2',
        name: 'Dedi Kurniawan',
        phone: '+62 813-5566-7788',
        coverageType: 'CUSTOM',
        assignedBlockIds: [
          'blk-j35', 'blk-j36', 'blk-k31', 'blk-k32', 'blk-k33', 'blk-k34', 'blk-k35', 'blk-k36',
          'blk-l31', 'blk-l32', 'blk-l33', 'blk-l34', 'blk-l35', 'blk-l36', 'blk-m31', 'blk-m32'
        ],
        assignedBlockCodes: [
          'BLOK J35', 'BLOK J36', 'BLOK K31', 'BLOK K32', 'BLOK K33', 'BLOK K34', 'BLOK K35', 'BLOK K36',
          'BLOK L31', 'BLOK L32', 'BLOK L33', 'BLOK L34', 'BLOK L35', 'BLOK L36', 'BLOK M31', 'BLOK M32'
        ],
      },
    ],
    supportTeam: [
      {
        id: 'sup-1',
        role: 'Operator',
        workerName: 'Hendri Gunawan',
        equipmentId: 'eq-3',
        equipmentName: 'Excavator Kobelco SK200-10 (EX-04)',
      },
      {
        id: 'sup-2',
        role: 'Operator',
        workerName: 'Bowo',
        equipmentId: 'eq-1',
        equipmentName: 'Excavator Komatsu PC200-8 (EX-01)',
      },
      {
        id: 'sup-3',
        role: 'Operator',
        workerName: 'Agus Santoso',
        equipmentId: 'eq-2',
        equipmentName: 'Bulldozer Caterpillar D6R (DZ-02)',
      },
      {
        id: 'sup-4',
        role: 'Mekanik',
        workerName: 'Jaya',
        equipmentName: 'Service Truck Lapangan',
      },
    ],
    createdAt: '2026-09-01T08:00:00.000Z',
  },
];

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
    <path d="M150 36 L224 72 V142 C224 195 150 234 150 234 C150 234 76 195 76 142 V72 Z" fill="url(#shieldGrad)" />
    <path d="M108 142 H192 V168 H108 Z" fill="#0f172a" rx="4" />
    <circle cx="123" cy="155" r="7" fill="#fbbf24" />
    <circle cx="150" cy="155" r="7" fill="#fbbf24" />
    <circle cx="177" cy="155" r="7" fill="#fbbf24" />
    <path d="M124 110 H160 V142 H124 Z" fill="#0f172a" />
    <rect x="130" y="115" width="22" height="15" fill="#38bdf8" rx="2" />
    <path d="M160 120 L188 102 L198 128" fill="none" stroke="#0f172a" stroke-width="6.5" stroke-linecap="round" />
    <rect x="30" y="240" width="240" height="40" rx="12" fill="#090d16" stroke="#f59e0b" stroke-width="2"/>
    <text x="150" y="267" fill="url(#goldGrad)" font-family="system-ui, -apple-system, sans-serif" font-size="22" font-weight="900" letter-spacing="3" text-anchor="middle">${displayShort}</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function createSimulatedSignatureSvg(name: string, roleTitle: string): string {
  const cleanName = name.replace(/^(Ir\.|Dr\.|Drs\.|H\.|Hj\.)\s*/i, '').split(',')[0].trim();
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="300" height="120" viewBox="0 0 300 120">
    <defs>
      <linearGradient id="inkGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1e3a8a"/>
        <stop offset="100%" stop-color="#0f172a"/>
      </linearGradient>
    </defs>
    <path d="M30,85 Q45,25 70,30 T90,95 Q105,40 140,55 T190,80 Q215,60 250,75 Q270,85 240,95 Q200,105 130,100" 
          fill="none" stroke="url(#inkGrad)" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50,60 Q90,65 180,60 T270,68" 
          fill="none" stroke="url(#inkGrad)" stroke-width="2" stroke-linecap="round"/>
    <circle cx="85" cy="45" r="2.5" fill="#1e3a8a" />
    <circle cx="160" cy="48" r="2.5" fill="#1e3a8a" />
    <text x="290" y="112" fill="#64748b" font-family="monospace" font-size="8" text-anchor="end">DIGITALLY VERIFIED</text>
  </svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

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

export const initialCompanyStaff: CompanyStaff[] = [];
