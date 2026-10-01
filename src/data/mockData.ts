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

export const initialInventory: InventoryItem[] = [];

export const initialDailyReports: DailyReport[] = [];

export const initialLogisticsTransactions: LogisticsTransaction[] = [];

export const initialDailyTargets: DailyLocationTarget[] = [];

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

export const initialWorkAssignments: WorkAssignment[] = [];

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
