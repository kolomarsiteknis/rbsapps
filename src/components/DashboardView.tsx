import React, { useState } from 'react';
import { 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  Fuel, 
  CheckCircle2, 
  Calendar, 
  ShieldCheck, 
  Printer, 
  Layers, 
  ArrowUpRight, 
  FileText, 
  Check, 
  Camera, 
  ChevronRight,
  Sparkles,
  Building2,
  Plus,
  Droplet,
  Wrench,
  Package,
  ClipboardCheck,
  Activity,
  Users,
  ChevronDown,
  MapPin,
  Bell,
  BellRing,
  Target,
  Sliders,
  Send,
  Share2,
  X,
  Volume2,
  VolumeX,
  AlertCircle,
  Copy,
  CheckCircle,
  ExternalLink,
  RefreshCw,
  Smartphone,
  Info,
  Database,
  LayoutDashboard,
  HardDrive
} from 'lucide-react';
import { DailyReport, Equipment, UserRole, Client, AuthUser } from '../types';
import { storageService } from '../services/storageService';
import { WeeklyFuelRatioChart } from './WeeklyFuelRatioChart';
import { ConnectionHealthCheck } from './ConnectionHealthCheck';
import { DataRecoveryView } from './DataRecoveryView';

interface DashboardViewProps {
  reports: DailyReport[];
  equipments: Equipment[];
  onOpenPdfReport: (reportId: string) => void;
  onOpenWizard?: () => void;
  onNavigateReports?: () => void;
  onNavigateLogistics?: () => void;
  onNavigateFieldMonitor?: () => void;
  onNavigateActivityLog?: () => void;
  onNavigateUserManagement?: () => void;
  onNavigateCompanyProfile?: () => void;
  onApproveReport: (reportId: string) => void;
  userRole: UserRole;
  clients: Client[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
  onNavigateMaster?: () => void;
  authUser?: AuthUser | null;
  onRefreshData?: () => void;
  showToast?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  reports,
  equipments,
  onOpenPdfReport,
  onOpenWizard,
  onNavigateReports,
  onNavigateLogistics,
  onNavigateFieldMonitor,
  onNavigateActivityLog,
  onNavigateUserManagement,
  onNavigateCompanyProfile,
  onApproveReport,
  userRole,
  clients,
  selectedClientId,
  setSelectedClientId,
  onNavigateMaster,
  authUser,
  onRefreshData,
  showToast,
}) => {
  // Sub-menu navigation within Dashboard for Directors
  const [activeDashboardSubMenu, setActiveDashboardSubMenu] = useState<'overview' | 'data-recovery'>('overview');

  const metrics = storageService.getExecutiveDashboardMetrics(selectedClientId);
  const isFiltered = selectedClientId !== 'ALL';
  const activeClient = clients.find((c) => c.id === selectedClientId);
  const fuelTrends = storageService.getWeeklyFuelTrends(selectedClientId);

  // Real-time Logistics & Inventory Snapshot for Director
  const inventory = storageService.getInventory();
  const logisticsTx = storageService.getLogisticsTransactions(selectedClientId);

  // 1. BBM (Solar B50)
  const fuelItem = inventory.find((i) => i.category === 'BBM') || { 
    id: 'inv-1', code: 'BBM-SOL', name: 'Solar Industri B50', category: 'BBM' as const, stockQuantity: 0, unit: 'Liter', minThreshold: 1000 
  };
  const tankCapacityLiters = 10000;
  const fuelTankPercent = fuelItem.stockQuantity > 0 ? Math.min(100, Number(((fuelItem.stockQuantity / tankCapacityLiters) * 100).toFixed(1))) : 0;
  const pendingFuelInflow = logisticsTx
    .filter((t) => t.category === 'BBM' && t.type === 'in' && t.approvalStatus === 'pending')
    .reduce((acc, t) => acc + t.quantity, 0);

  // 2. Pelumas & Oli (Mesin, Hidrolik, Transmisi, Grease)
  const oliItems = inventory.filter((i) => i.category === 'Oli');
  const totalOliLiters = oliItems.reduce((acc, i) => acc + i.stockQuantity, 0);
  const oliEng = inventory.find((i) => i.code === 'OLI-ENG')?.stockQuantity || 0;
  const oliHyd = inventory.find((i) => i.code === 'OLI-HYD')?.stockQuantity || 0;
  const oliTrm = inventory.find((i) => i.code === 'OLI-TRM')?.stockQuantity || 0;
  const greaseItem = inventory.find((i) => i.category === 'Grease') || { 
    id: 'inv-5', code: 'GRS-CH', name: 'Grease Chassis EP-2', category: 'Grease' as const, stockQuantity: 0, unit: 'Kg', minThreshold: 15 
  };
  const pendingLubricantInflow = logisticsTx
    .filter((t) => (t.category === 'Oli' || t.category === 'Grease') && t.type === 'in' && t.approvalStatus === 'pending')
    .reduce((acc, t) => acc + t.quantity, 0);

  // 3. Spare Part Kritis
  const sparePartItems = inventory.filter((i) => i.category === 'Spare Part');
  const totalSpareParts = sparePartItems.reduce((acc, i) => acc + i.stockQuantity, 0);
  const lowStockParts = sparePartItems.filter((i) => i.stockQuantity <= i.minThreshold);

  // Total pending inbound transactions requiring Director approval
  const totalPendingInbound = logisticsTx.filter((t) => t.type === 'in' && t.approvalStatus === 'pending').length;

  // Filter reports to match client selection
  const displayedReports = isFiltered 
    ? reports.filter((r) => r.clientId === selectedClientId)
    : reports;

  // Real-time Manager Verification list for notifications
  const managerVerifiedReports = displayedReports
    .filter((r) => r.status === 'Disetujui Manager' || r.status === 'Ditolak Manager' || r.status === 'Disetujui Direktur' || r.status === 'Ditolak Direktur')
    .sort((a, b) => new Date(b.updatedAt || 0).getTime() - new Date(a.updatedAt || 0).getTime());
  
  const latestManagerVerifications = managerVerifiedReports.slice(0, 5);

  const latestReport = displayedReports[0];
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<any>(null);

  // Calculate cumulative stats
  const targetHa = metrics.targetAreaTotal;
  const currentClearedHa = metrics.cumulativeClearedHa;
  const physicalPercent = Number(metrics.progressPercent.toFixed(1));

  // Fuel Alert equipments
  const alertEquipments = metrics.alertIncidents;

  // ==========================================================
  // FITUR NOTIFIKASI & ALERT TARGET HARIAN OPERASIONAL DIREKTUR
  // ==========================================================
  interface DirectorDailyTargetConfig {
    targetAreaHa: number;
    targetEffectiveHm: number;
    maxDowntimeHours: number;
    alertThresholdPercent: number;
    supervisorWhatsapp: string;
    enableSound: boolean;
  }

  const STORAGE_KEY_DAILY_TARGET_CONFIG = 'rbs_director_daily_target_config';

  const defaultTargetConfig: DirectorDailyTargetConfig = {
    targetAreaHa: 4.0,
    targetEffectiveHm: 8.0,
    maxDowntimeHours: 1.0,
    alertThresholdPercent: 80,
    supervisorWhatsapp: '0812-7654-3210',
    enableSound: false,
  };

  const [targetConfig, setTargetConfig] = useState<DirectorDailyTargetConfig>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY_DAILY_TARGET_CONFIG);
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error('Error loading director target config:', e);
    }
    return defaultTargetConfig;
  });

  const [showTargetConfigModal, setShowTargetConfigModal] = useState(false);
  const [showWhatsappModal, setShowWhatsappModal] = useState(false);
  const [showBlockBreakdownModal, setShowBlockBreakdownModal] = useState(false);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<string[]>([]);
  const [copiedWaText, setCopiedWaText] = useState(false);
  const [tempConfig, setTempConfig] = useState<DirectorDailyTargetConfig>(targetConfig);

  // Targets from storage for active client selection
  const configuredDailyTargets = storageService.getDailyTargets(selectedClientId);
  const evalDate = latestReport?.date || (displayedReports.length > 0 ? displayedReports[0].date : new Date().toISOString().slice(0, 10));
  const matchedTargetForDate = configuredDailyTargets.find(t => t.date === evalDate) || configuredDailyTargets[0];

  const hasClients = clients.length > 0;
  const hasReports = displayedReports.length > 0;

  // Effective Daily Target Luas (Ha)
  const targetHaToday = isFiltered
    ? (matchedTargetForDate?.dailyTargetAreaHa || (activeClient ? targetConfig.targetAreaHa : 0))
    : (configuredDailyTargets.length > 0 
        ? configuredDailyTargets.reduce((acc, t) => acc + (t.dailyTargetAreaHa || 0), 0)
        : (hasClients ? targetConfig.targetAreaHa * clients.length : 0));

  // Actual Luas (Ha) Realized Today
  const actualHaToday = isFiltered
    ? (latestReport?.physicalProgress?.realizedAreaHa || 0)
    : (hasReports ? displayedReports.slice(0, Math.max(1, clients.length)).reduce((acc, r) => acc + (r.physicalProgress?.realizedAreaHa || 0), 0) : 0);

  const haGap = targetHaToday > 0 ? Number((actualHaToday - targetHaToday).toFixed(2)) : 0;
  const haPercent = targetHaToday > 0 ? Number(((actualHaToday / targetHaToday) * 100).toFixed(1)) : 0;

  // Actual Average HM Today
  const actualAvgHm = latestReport?.equipmentWorkLogs?.length 
    ? Number((latestReport.equipmentWorkLogs.reduce((acc, l) => acc + (l.effectiveWorkHours || 0), 0) / latestReport.equipmentWorkLogs.length).toFixed(1))
    : (metrics.totalEffectiveHours > 0 && metrics.equipmentCount > 0 ? Number((metrics.totalEffectiveHours / metrics.equipmentCount).toFixed(1)) : 0);
  const targetHmToday = (hasClients || hasReports || metrics.equipmentCount > 0) ? targetConfig.targetEffectiveHm : 0;
  const hmGap = targetHmToday > 0 ? Number((actualAvgHm - targetHmToday).toFixed(1)) : 0;
  const hmPercent = targetHmToday > 0 ? Math.min(100, Number(((actualAvgHm / targetHmToday) * 100).toFixed(0))) : 0;

  // Downtime Today
  const actualWeatherDowntimeToday = latestReport?.equipmentWorkLogs 
    ? latestReport.equipmentWorkLogs.reduce((acc, l) => acc + (l.downtimeWeatherHours || 0), 0)
    : (metrics.totalWeatherDowntime || 0);
  const actualBreakdownDowntimeToday = latestReport?.equipmentWorkLogs 
    ? latestReport.equipmentWorkLogs.reduce((acc, l) => acc + (l.downtimeBreakdownHours || 0), 0)
    : (metrics.totalBreakdownDowntime || 0);
  const actualDowntimeToday = actualWeatherDowntimeToday + actualBreakdownDowntimeToday;
  const isDowntimeOverLimit = targetConfig.maxDowntimeHours > 0 && actualDowntimeToday > targetConfig.maxDowntimeHours;

  // Evaluated Alert Status
  const isCriticalDeficit = targetHaToday > 0 && haPercent < targetConfig.alertThresholdPercent;
  const isWarningNeedsAttention = !isCriticalDeficit && targetHaToday > 0 && (haPercent < 100 || isDowntimeOverLimit || (targetHmToday > 0 && actualAvgHm < targetHmToday));
  const isOnTrack = !isCriticalDeficit && !isWarningNeedsAttention;

  // Alerts List
  const dailyTargetAlerts: Array<{
    id: string;
    title: string;
    badge: string;
    severity: 'critical' | 'warning' | 'success';
    desc: string;
    recommendation: string;
    timestamp: string;
  }> = [];

  if (targetHaToday > 0) {
    if (haGap < 0) {
      dailyTargetAlerts.push({
        id: 'alert-target-ha',
        title: 'Defisit Pembukaan Lahan Harian',
        badge: isCriticalDeficit ? 'DEFISIT KRITIS' : 'PERHATIAN RITME',
        severity: isCriticalDeficit ? 'critical' : 'warning',
        timestamp: `${evalDate} • Evaluasi Sore`,
        desc: `Realisasi pembukaan lahan hari ini baru mencapai ${actualHaToday.toFixed(1)} Ha dari target ${targetHaToday.toFixed(1)} Ha (Defisit ${Math.abs(haGap).toFixed(1)} Ha / ${(100 - haPercent).toFixed(0)}%). Ritme pembersihan lahan tertinggal.`,
        recommendation: 'Perlu penambahan armada dozer atau perpanjangan jam shift efektif esok hari untuk mengejar ketertinggalan.',
      });
    } else {
      dailyTargetAlerts.push({
        id: 'alert-target-ha-ok',
        title: 'Target Harian Luas Tercapai',
        badge: 'TERCAPAI',
        severity: 'success',
        timestamp: `${evalDate} • Evaluasi Sore`,
        desc: `Realisasi pembukaan lahan mencapai ${actualHaToday.toFixed(1)} Ha melampaui target ${targetHaToday.toFixed(1)} Ha (+${haGap.toFixed(1)} Ha / +${(haPercent - 100).toFixed(0)}%).`,
        recommendation: 'Ritme kerja optimal. Pastikan pasokan solar tangki tetap aman untuk rotasi berikutnya.',
      });
    }
  }

  if (isDowntimeOverLimit && hasReports) {
    dailyTargetAlerts.push({
      id: 'alert-downtime',
      title: 'Downtime Melebihi Batas Toleransi',
      badge: 'DOWNTIME ALERT',
      severity: 'warning',
      timestamp: `${evalDate} • Lahan Gambut`,
      desc: `Total jam mati mencapai ${actualDowntimeToday.toFixed(1)} jam (${actualWeatherDowntimeToday.toFixed(1)}h Cuaca hujan, ${actualBreakdownDowntimeToday.toFixed(1)}h Kendala mekanis). Batas toleransi adalah ${targetConfig.maxDowntimeHours.toFixed(1)} jam.`,
      recommendation: 'Antisipasi hujan lebat sore dengan memajukan jam kerja operator ke pukul 06:30 pagi.',
    });
  }

  if (targetHmToday > 0 && actualAvgHm < targetHmToday && hasReports) {
    dailyTargetAlerts.push({
      id: 'alert-hm',
      title: 'Jam Efektif Alat (HM) Belum Maksimal',
      badge: 'UTILISASI MESIN',
      severity: 'warning',
      timestamp: `${evalDate} • Rata-rata Unit`,
      desc: `Rata-rata jam kerja mesin baru ${actualAvgHm.toFixed(1)} HM/unit (Target: ${targetHmToday.toFixed(1)} HM/unit). Selisih ${Math.abs(hmGap).toFixed(1)} HM/unit.`,
      recommendation: 'Evaluasi jeda istirahat operator dan minimalkan kondisi unit menyala tanpa kerja produktif (idle).',
    });
  }

  if (alertEquipments.length > 0 && hasReports) {
    dailyTargetAlerts.push({
      id: 'alert-fuel',
      title: 'Rasio Konsumsi BBM Melebihi Standar',
      badge: 'BBM OVERLIMIT',
      severity: 'warning',
      timestamp: `${evalDate} • Unit Lapangan`,
      desc: `${alertEquipments.length} unit alat berat (${alertEquipments.map(e => e.equipmentId).join(', ')}) mencatat konsumsi BBM di atas batas toleransi standar proyek.`,
      recommendation: 'Lakukan inspeksi nozel injeksi dan periksa track undercarriage apakah amblas di tanah lunak.',
    });
  }

  const activeAlerts = dailyTargetAlerts.filter(a => !dismissedAlertIds.includes(a.id));
  const unreadAlertsCount = activeAlerts.filter(a => a.severity !== 'success').length;

  const handleSaveTargetConfig = (newCfg: DirectorDailyTargetConfig) => {
    setTargetConfig(newCfg);
    try {
      localStorage.setItem(STORAGE_KEY_DAILY_TARGET_CONFIG, JSON.stringify(newCfg));
    } catch (e) {
      console.error('Error saving director target config:', e);
    }
    setShowTargetConfigModal(false);
  };

  const handleDismissAlert = (id: string) => {
    setDismissedAlertIds(prev => [...prev, id]);
  };

  const handleResetDismissedAlerts = () => {
    setDismissedAlertIds([]);
  };

  const generateWhatsappAlertMessage = () => {
    const clientName = isFiltered && activeClient ? activeClient.name : 'Seluruh Proyek (Konsolidasi)';
    const supervisor = latestReport?.supervisorName || 'Pengawas Lapangan';
    const statusText = isCriticalDeficit 
      ? '🔴 KRITIS (Defisit Pembukaan Lahan)' 
      : (isWarningNeedsAttention ? '🟡 PERHATIAN (Mendekati Target)' : '🟢 TERCAPAI (Target Terpenuhi)');
    
    return `*NOTIFIKASI TARGET HARIAN OPERASIONAL LAND CLEARING*
*PT. RBS GROUP — Land Clearing Heavy Equipment*

Kepada Yth: *${supervisor}*
Proyek     : *${clientName}*
Lokasi     : *${latestReport?.blockCode || 'Blok Operasi'}*
Tanggal    : *${evalDate}*

━━━━━━━━━━━━━━━━━━━━━━━━━━
📊 *STATUS TARGET HARIAN: ${statusText}*
━━━━━━━━━━━━━━━━━━━━━━━━━━
• Target Luas Harian : *${targetHaToday.toFixed(1)} Ha*
• Realisasi Hari Ini : *${actualHaToday.toFixed(1)} Ha* (${haPercent}% Capaian)
• Selisih / Deviasi   : *${haGap >= 0 ? '+' : ''}${haGap.toFixed(1)} Ha*

• Target Jam Alat     : *${targetHmToday.toFixed(1)} HM/Unit*
• Realisasi Rata-rata : *${actualAvgHm.toFixed(1)} HM/Unit* (${hmPercent}%)
• Total Jam Mati (DT) : *${actualDowntimeToday.toFixed(1)} Jam* (Toleransi Maks: ${targetConfig.maxDowntimeHours.toFixed(1)}h)
  └ Cuaca: ${actualWeatherDowntimeToday.toFixed(1)}h | Breakdown: ${actualBreakdownDowntimeToday.toFixed(1)}h

⚠️ *ARAHAN DIREKTUR & INSTRUKSI KERJA:*
${isCriticalDeficit 
  ? '1. Segera lakukan akselerasi pembukaan lahan esok hari untuk menutup defisit luas.\n2. Maksimalkan jam rintis imas dan pastikan semua operator standby tepat waktu (06:30 WIB).\n3. Laporkan segera kendala mekanis/lapangan jika membutuhkan unit alat berat tambahan.'
  : (isWarningNeedsAttention
      ? '1. Pertahankan stabilitas jam kerja efektif alat (HM) agar target tercapai 100%.\n2. Antisipasi cuaca sore dengan memacu produktivitas pagi.\n3. Pantau suplai solar dari tangki basecamp.'
      : '1. Luar biasa, target harian berhasil dicapai dengan baik!\n2. Jaga konsistensi keselamatan kerja (K3) dan kebersihan rumpuk.\n3. Periksa kondisi grease dan oli sebelum rotasi esok.')
}

_Pesan ini dikirim resmi melalui Sistem RBS APPS — Executive Monitoring & Alert_`;
  };

  // Equipment fuel comparison list
  const fuelComparisons = equipments.map((eq) => {
    let latestRatio = 0;
    let isAlert = false;
    let effectiveHm = 0;
    let refuelLiters = 0;

    for (const r of displayedReports) {
      const log = r.equipmentWorkLogs.find((l) => l.equipmentId === eq.id);
      if (log && log.fuelRatio > 0) {
        latestRatio = log.fuelRatio;
        isAlert = log.isFuelAlert;
        effectiveHm = log.effectiveWorkHours;
        refuelLiters = log.fuelAddedLiters;
        break;
      }
    }

    return {
      equipment: eq,
      latestRatio,
      standardLimit: eq.standardFuelRatio,
      isAlert,
      effectiveHm,
      refuelLiters,
    };
  });

  return (
    <div className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 space-y-4 sm:space-y-6">
      {/* 1. CONNECTION HEALTH CHECK BANNER / STATUS */}
      <ConnectionHealthCheck variant="dashboard" />

      {/* 2. SUB-MENU NAVIGATION FOR DIRECTORS (OVERVIEW VS DATA RECOVERY) */}
      <div className="bg-white rounded-2xl p-2 sm:p-2.5 shadow-sm border border-slate-200/90 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveDashboardSubMenu('overview')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeDashboardSubMenu === 'overview'
                ? 'bg-amber-500 text-slate-950 shadow-md shadow-amber-500/20'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-600'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>1. Ringkasan Eksekutif & KPI</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveDashboardSubMenu('data-recovery')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-black transition-all duration-200 cursor-pointer whitespace-nowrap ${
              activeDashboardSubMenu === 'data-recovery'
                ? 'bg-slate-900 text-amber-400 shadow-md shadow-slate-950/20 ring-2 ring-amber-400/40'
                : 'bg-slate-50 hover:bg-slate-100 text-slate-700'
            }`}
          >
            <Database className="w-4 h-4 text-amber-500" />
            <span>2. Data Recovery & Cache Diagnostics</span>
            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-amber-500/20 text-amber-600 border border-amber-500/30">
              Direktur
            </span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-3 text-xs font-medium text-slate-500 px-2">
          {activeDashboardSubMenu === 'overview' ? (
            <button
              type="button"
              onClick={() => setActiveDashboardSubMenu('data-recovery')}
              className="flex items-center gap-1.5 text-xs text-amber-800 hover:text-amber-900 font-bold bg-amber-50 hover:bg-amber-100 px-3 py-1.5 rounded-xl border border-amber-200/80 transition cursor-pointer shadow-2xs"
              title="Periksa integritas cache lokal atau lakukan sinkronisasi ulang"
            >
              <Database className="w-3.5 h-3.5 text-amber-600" />
              <span>Diagnostik & Pemulihan Cache →</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setActiveDashboardSubMenu('overview')}
              className="flex items-center gap-1.5 text-xs text-slate-700 hover:text-slate-900 font-bold bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-xl transition cursor-pointer"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-slate-500" />
              <span>Kembali ke Ringkasan KPI</span>
            </button>
          )}
        </div>
      </div>

      {activeDashboardSubMenu === 'data-recovery' ? (
        <DataRecoveryView
          authUser={authUser || null}
          clients={clients}
          reports={reports}
          equipments={equipments}
          onRefreshData={onRefreshData}
          showToast={showToast}
        />
      ) : (
        <>
          {/* PORTOFOLIO PROYEK KLIEN - DROPDOWN SELECTOR (RESPONSIF UNTUK BANYAK PT) */}
      <section className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200/90 transition-all duration-200 hover:shadow-md space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 text-amber-600 flex items-center justify-center shrink-0">
              <Building2 className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-900 tracking-tight">
                  Portofolio Klien & Proyek Aktif
                </h3>
                <span className="text-[10px] font-black text-amber-700 bg-amber-50 border border-amber-200/60 px-2 py-0.5 rounded-full">
                  {clients.length} PT Terdaftar
                </span>
              </div>
              <p className="text-[11px] text-slate-500">
                Pilih PT dari dropdown untuk memfilter KPI, progres hektar, dan efisiensi BBM.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {selectedClientId !== 'ALL' && (
              <button
                type="button"
                onClick={() => setSelectedClientId('ALL')}
                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all duration-200 cursor-pointer flex items-center gap-1.5"
                title="Beralih ke tampilan Konsolidasi Seluruh Klien"
              >
                <span>🌐 Konsolidasi</span>
              </button>
            )}
            {onNavigateMaster && (
              <button
                type="button"
                onClick={onNavigateMaster}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-amber-700 hover:bg-amber-50 rounded-xl border border-slate-200 hover:border-amber-300 transition-all duration-200 cursor-pointer shadow-2xs"
                title="Kelola daftar Klien, Blok, Alat Berat di Master Data"
              >
                <Plus className="w-3.5 h-3.5 text-amber-600" />
                <span>Kelola & Tambah PT</span>
              </button>
            )}
          </div>
        </div>

        {/* Modern Dropdown & Realtime Project Context Pill */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center pt-1">
          {/* Dropdown Selector Input */}
          <div className="lg:col-span-6 relative">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              PILIH PT / KLIEN:
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-3.5 pointer-events-none text-slate-400">
                <Building2 className="w-4 h-4 text-amber-500" />
              </div>
              <select
                id="client-portfolio-dropdown"
                value={selectedClientId}
                onChange={(e) => setSelectedClientId(e.target.value)}
                className="w-full appearance-none pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/80 border-2 border-slate-200 focus:border-amber-500 focus:bg-white rounded-xl text-xs sm:text-sm font-black text-slate-900 focus:outline-none transition-all duration-200 cursor-pointer shadow-2xs"
                aria-label="Pilih Portofolio PT atau Klien"
              >
                <option value="ALL" className="font-bold py-2">
                  🌐 [KONSOLIDASI] — Seluruh Proyek ({clients.length} Klien / PT Aktif)
                </option>
                <optgroup label="Daftar Klien / PT Perkebunan">
                  {clients.map((c) => {
                    const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(0) : 0;
                    return (
                      <option key={c.id} value={c.id} className="py-2 text-slate-800">
                        🏢 {c.name} — {c.fullCompanyName || c.name} ({c.clearedAreaHa} / {c.totalAreaHa} Ha • {pct}%)
                      </option>
                    );
                  })}
                </optgroup>
              </select>
              <div className="absolute right-3.5 pointer-events-none text-slate-400">
                <ChevronDown className="w-4 h-4 text-slate-500" />
              </div>
            </div>
          </div>

          {/* Quick Context Card */}
          <div className="lg:col-span-6">
            <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
              STATUS PROYEK TERPILIH:
            </label>
            {isFiltered && activeClient ? (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-amber-50/70 border border-amber-200/80 rounded-xl text-xs">
                <div className="flex items-center gap-1.5 font-black text-amber-950">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                  <span className="truncate max-w-[160px]">{activeClient.name}</span>
                </div>
                <span className="text-slate-300">|</span>
                <span className="text-slate-600 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                  <span className="truncate max-w-[130px]">{activeClient.location}</span>
                </span>
                <span className="text-slate-300">|</span>
                <span className="font-mono font-bold text-amber-900 ml-auto">
                  {activeClient.clearedAreaHa} / {activeClient.totalAreaHa} Ha ({activeClient.totalAreaHa > 0 ? ((activeClient.clearedAreaHa / activeClient.totalAreaHa) * 100).toFixed(1) : 0}%)
                </span>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 p-2.5 bg-slate-900 text-white rounded-xl text-xs">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                <span className="font-bold text-amber-300">Konsolidasi Terpadu</span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300">Akumulasi {clients.length} Perusahaan</span>
                <span className="text-slate-500">|</span>
                <span className="font-mono font-bold text-emerald-400 ml-auto">
                  {metrics.cumulativeClearedHa.toFixed(1)} / {metrics.targetAreaTotal} Ha ({physicalPercent}%)
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Top Banner Executive Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1.5">
              <span className="px-2 py-0.5 rounded text-[10px] sm:text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Dashboard Eksekutif
              </span>
              <span className="text-[11px] text-slate-400 font-medium">
                Metode Zero Burning (Tanpa Bakar)
              </span>
            </div>
            <h2 className="text-lg sm:text-2xl font-black text-slate-100 tracking-tight">
              {isFiltered && activeClient 
                ? `PROYEK LAND CLEARING ${activeClient.fullCompanyName}`
                : `KONSOLIDASI SELURUH PROYEK LAND CLEARING (${clients.length} KLIEN)`
              }
            </h2>
            <div className="text-xs text-slate-400 mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5">
              {isFiltered && activeClient ? (
                <>
                  <span>No. Kontrak: <strong className="font-mono text-amber-300">{activeClient.contractNumber}</strong></span>
                  <span className="text-slate-600">·</span>
                  <span>Lokasi: <strong className="text-slate-200">{activeClient.location}</strong></span>
                  <span className="text-slate-600">·</span>
                  <span>Pelaksana: <strong className="text-slate-200">PT. RBS GROUP</strong></span>
                </>
              ) : (
                <>
                  <span>Konsolidasi: <strong className="text-amber-300">{metrics.targetAreaTotal} Ha</strong> di berbagai perkebunan</span>
                  <span className="text-slate-600">·</span>
                  <span>Pelaksana Utama: <strong className="text-slate-200">PT. RBS GROUP</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Quick Director Daily Target Notification Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsNotificationPopoverOpen(!isNotificationPopoverOpen)}
                className={`relative flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-black transition-all duration-200 cursor-pointer shadow-sm active:scale-95 ${
                  unreadAlertsCount > 0
                    ? isCriticalDeficit
                      ? 'bg-rose-500/25 hover:bg-rose-500/35 text-rose-200 border-2 border-rose-500/70 shadow-rose-950/40'
                      : 'bg-amber-500/25 hover:bg-amber-500/35 text-amber-200 border-2 border-amber-500/70 shadow-amber-950/40'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
                title="Pusat Notifikasi & Alert Target Harian Direktur"
              >
                {unreadAlertsCount > 0 ? (
                  <BellRing className={`w-4 h-4 ${isCriticalDeficit ? 'text-rose-400 animate-bounce' : 'text-amber-400 animate-pulse'}`} />
                ) : (
                  <Bell className="w-4 h-4 text-emerald-400" />
                )}
                <span>Notifikasi & Alert Target</span>
                {unreadAlertsCount > 0 ? (
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-black text-white ${
                    isCriticalDeficit ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
                  }`}>
                    {unreadAlertsCount} Alert
                  </span>
                ) : (
                  <span className="flex items-center gap-1 text-[10px] text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-500/40">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    On-Track
                  </span>
                )}
              </button>

              {/* Popover Dropdown Drawer */}
              {isNotificationPopoverOpen && (
                <div className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-slate-900 border-2 border-slate-700 rounded-2xl shadow-2xl z-50 p-4 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center font-bold ${
                        isCriticalDeficit ? 'bg-rose-500 text-white' : 'bg-amber-500 text-slate-950'
                      }`}>
                        <Target className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-xs font-black text-white uppercase tracking-wider">
                          Alert Target Harian
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {evalDate} • {isFiltered && activeClient ? activeClient.name : 'Semua Proyek'}
                        </span>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsNotificationPopoverOpen(false)}
                      className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  {/* Summary Metric Strip */}
                  <div className="grid grid-cols-2 gap-2 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 text-[11px]">
                    <div>
                      <span className="text-slate-400 block text-[10px]">Capaian Luas Hari Ini:</span>
                      <strong className={`font-mono font-bold ${
                        haPercent >= 100 ? 'text-emerald-400' : isCriticalDeficit ? 'text-rose-400' : 'text-amber-400'
                      }`}>
                        {actualHaToday.toFixed(1)} / {targetHaToday.toFixed(1)} Ha ({haPercent}%)
                      </strong>
                    </div>
                    <div>
                      <span className="text-slate-400 block text-[10px]">Selisih Deviasi:</span>
                      <strong className={`font-mono font-bold ${haGap >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {haGap >= 0 ? `+${haGap.toFixed(1)} Ha` : `${haGap.toFixed(1)} Ha`}
                      </strong>
                    </div>
                  </div>

                  {/* Alerts List */}
                  <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
                    {activeAlerts.length === 0 ? (
                      <div className="p-3 bg-slate-950 rounded-xl text-center text-xs text-slate-400">
                        Tidak ada alert tertunda. Semua target operasional berjalan sesuai rencana.
                      </div>
                    ) : (
                      activeAlerts.map((alt) => (
                        <div
                          key={alt.id}
                          className={`p-2.5 rounded-xl border text-xs space-y-1 ${
                            alt.severity === 'critical'
                              ? 'bg-rose-950/40 border-rose-800/80 text-rose-200'
                              : alt.severity === 'warning'
                              ? 'bg-amber-950/40 border-amber-800/80 text-amber-200'
                              : 'bg-emerald-950/40 border-emerald-800/80 text-emerald-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-[11px] flex items-center gap-1.5">
                              {alt.severity === 'critical' ? (
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                              ) : alt.severity === 'warning' ? (
                                <AlertCircle className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <CheckCircle className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              )}
                              <span>{alt.title}</span>
                            </span>
                            <button
                              type="button"
                              onClick={() => handleDismissAlert(alt.id)}
                              className="text-[10px] text-slate-400 hover:text-white cursor-pointer px-1 py-0.5 rounded hover:bg-slate-800"
                              title="Tandai Selesai / Abaikan"
                            >
                              ✕
                            </button>
                          </div>
                          <p className="text-[10px] opacity-90 leading-tight">
                            {alt.desc}
                          </p>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Footer Action Buttons inside Popover */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationPopoverOpen(false);
                        setShowWhatsappModal(true);
                      }}
                      className="flex-1 py-2 px-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer"
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span>Kirim WA Alert</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsNotificationPopoverOpen(false);
                        setShowTargetConfigModal(true);
                      }}
                      className="py-2 px-3 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 transition cursor-pointer border border-slate-700"
                    >
                      <Sliders className="w-3.5 h-3.5 text-amber-400" />
                      <span>Atur Target</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {latestReport && (
              <button
                type="button"
                onClick={() => onOpenPdfReport(latestReport.id)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all duration-200 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan PDF</span>
              </button>
            )}

            {onNavigateReports && (
              <button
                type="button"
                onClick={onNavigateReports}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all duration-200 cursor-pointer"
              >
                <FileText className="w-3.5 h-3.5 text-amber-400" />
                <span>Rekap Laporan</span>
              </button>
            )}

            {onNavigateLogistics && (
              <button
                type="button"
                onClick={onNavigateLogistics}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition-all duration-200 cursor-pointer"
              >
                <Fuel className="w-3.5 h-3.5 text-amber-400" />
                <span>Logistik BBM</span>
              </button>
            )}

            {onNavigateFieldMonitor && (
              <button
                type="button"
                onClick={onNavigateFieldMonitor}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 transition-all duration-200 cursor-pointer"
              >
                <ClipboardCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Audit Hasil Pengawas</span>
              </button>
            )}

            {onNavigateActivityLog && (
              <button
                type="button"
                onClick={onNavigateActivityLog}
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-500/20 hover:bg-sky-500/30 active:scale-95 text-sky-300 font-bold rounded-xl text-xs border border-sky-500/40 transition-all duration-200 cursor-pointer"
              >
                <Activity className="w-3.5 h-3.5 text-sky-400" />
                <span>Log Aktivitas & GPS</span>
              </button>
            )}

            {onNavigateUserManagement && (
              <button
                type="button"
                onClick={onNavigateUserManagement}
                className="flex items-center gap-1.5 px-3 py-2 bg-indigo-500/20 hover:bg-indigo-500/30 active:scale-95 text-indigo-300 font-bold rounded-xl text-xs border border-indigo-500/40 transition-all duration-200 cursor-pointer"
              >
                <Users className="w-3.5 h-3.5 text-indigo-400" />
                <span>Manajemen User</span>
              </button>
            )}

            {onNavigateCompanyProfile && (
              <button
                type="button"
                onClick={onNavigateCompanyProfile}
                className="flex items-center gap-1.5 px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 active:scale-95 text-amber-300 font-bold rounded-xl text-xs border border-amber-500/40 transition-all duration-200 cursor-pointer"
              >
                <Building2 className="w-3.5 h-3.5 text-amber-400" />
                <span>Identitas Perusahaan</span>
              </button>
            )}
          </div>
        </div>

        {/* 4 CORE EXECUTIVE METRICS TILES */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mt-6">
          {/* Card 1: Progres Fisik */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Progres Fisik Lahan</span>
              <TrendingUp className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-white">
                {currentClearedHa.toFixed(1)} <span className="text-sm font-semibold text-slate-400">/ {targetHa} Ha</span>
              </div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5">
                ({physicalPercent}% Selesai)
              </div>
            </div>
            {/* Progress bar */}
            <div className="w-full bg-slate-700 h-2 rounded-full overflow-hidden">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, physicalPercent)}%` }}
              />
            </div>
          </div>

          {/* Card 2: Jam Efektif Kerja */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Jam Efektif Kerja</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.totalEffectiveHours.toFixed(1)} <span className="text-sm font-semibold text-slate-400">Jam (HM)</span>
              </div>
              <div className="text-xs font-bold text-amber-400 mt-0.5">
                ({metrics.effectiveHoursPercentage.toFixed(0)}% Efektivitas Mesin)
              </div>
            </div>
            <div className="text-[11px] text-slate-400 flex justify-between">
              <span>Total Unit Operasi:</span>
              <strong className="text-slate-200">{metrics.operationalEquipmentCount} / {metrics.equipmentCount} Unit</strong>
            </div>
          </div>

          {/* Card 3: Total Downtime */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Total Downtime (Jam Mati)</span>
              <AlertTriangle className="w-4 h-4 text-rose-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-rose-400">
                {metrics.totalDowntime.toFixed(1)} <span className="text-sm font-semibold text-slate-400">Jam</span>
              </div>
              <div className="text-[11px] font-semibold text-slate-300 mt-0.5 flex items-center gap-1.5">
                <span className="text-blue-300">{metrics.totalWeatherDowntime.toFixed(1)}h Cuaca</span>
                <span>•</span>
                <span className="text-rose-400 font-bold">{metrics.totalBreakdownDowntime.toFixed(1)}h Breakdown</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400">
              Pemisahan objektif faktor alam vs kendala mekanis
            </div>
          </div>

          {/* Card 4: Efisiensi BBM */}
          <div className="bg-slate-800/90 border border-slate-700/80 rounded-xl p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between text-slate-400 text-xs font-bold uppercase tracking-wider">
              <span>Efisiensi Konsumsi BBM</span>
              <Fuel className="w-4 h-4 text-amber-400" />
            </div>
            <div className="my-2">
              <div className="text-2xl sm:text-3xl font-black text-white">
                {metrics.avgFuelEfficiency > 0 ? metrics.avgFuelEfficiency.toFixed(1) : '0.0'} <span className="text-sm font-semibold text-slate-400">L / HM</span>
              </div>
              <div className={`text-xs font-bold mt-0.5 flex items-center gap-1 ${
                metrics.avgFuelEfficiency > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}>
                {metrics.avgFuelEfficiency > 0 ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Status Operasi: NORMAL</span>
                  </>
                ) : (
                  <span>Belum ada data operasi</span>
                )}
              </div>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>Batas Standar PC200:</span>
              <span className="font-mono text-slate-200">18.0 L/HM</span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. PUSAT NOTIFIKASI & ALERT TARGET HARIAN OPERASIONAL DIREKTUR */}
      <section className={`rounded-3xl p-5 sm:p-6 border-2 shadow-xl transition-all duration-300 ${
        isCriticalDeficit
          ? 'bg-gradient-to-br from-rose-950/20 via-slate-900 to-slate-950 border-rose-500/80 shadow-rose-950/40 text-white'
          : isWarningNeedsAttention
          ? 'bg-gradient-to-br from-amber-950/20 via-slate-900 to-slate-950 border-amber-500/80 shadow-amber-950/40 text-white'
          : 'bg-gradient-to-br from-emerald-950/20 via-slate-900 to-slate-950 border-emerald-500/80 shadow-emerald-950/40 text-white'
      }`}>
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-800">
          <div className="flex items-start gap-3.5">
            <div className={`p-3 rounded-2xl shadow-lg shrink-0 ${
              isCriticalDeficit
                ? 'bg-rose-500 text-white animate-pulse'
                : isWarningNeedsAttention
                ? 'bg-amber-500 text-slate-950'
                : 'bg-emerald-500 text-slate-950'
            }`}>
              {isCriticalDeficit ? (
                <BellRing className="w-6 h-6 animate-bounce" />
              ) : isWarningNeedsAttention ? (
                <AlertTriangle className="w-6 h-6" />
              ) : (
                <Target className="w-6 h-6" />
              )}
            </div>

            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                  isCriticalDeficit
                    ? 'bg-rose-500 text-white'
                    : isWarningNeedsAttention
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-emerald-500 text-slate-950'
                }`}>
                  Pusat Notifikasi & Alert Target Harian
                </span>
                <span className="text-[11px] text-slate-400 font-mono">
                  {evalDate} • Evaluasi Lapangan Terkini
                </span>
                <span className="text-slate-600">·</span>
                <span className="text-[11px] text-amber-300 font-medium">
                  {isFiltered && activeClient ? activeClient.name : `Konsolidasi ${clients.length} Klien`}
                </span>
              </div>

              <h3 className="text-lg sm:text-xl font-black text-white tracking-tight flex flex-wrap items-center gap-2">
                <span>Evaluasi Realisasi vs Target Harian Land Clearing</span>
                {unreadAlertsCount > 0 && (
                  <span className={`text-xs px-2 py-0.5 rounded-full font-black text-white ${
                    isCriticalDeficit ? 'bg-rose-600 animate-pulse' : 'bg-amber-600'
                  }`}>
                    {unreadAlertsCount} Alert Terdeteksi
                  </span>
                )}
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Monitoring ketat target ritme pembukaan lahan (Ha/hari), efektivitas jam kerja alat berat (HM), dan toleransi jam mati cuaca/breakdown.
              </p>
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            <button
              type="button"
              onClick={() => setShowWhatsappModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition-all active:scale-95 cursor-pointer"
              title="Kirim arahan & notifikasi target ke WhatsApp Pengawas"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Broadcast Alert WA</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setTempConfig(targetConfig);
                setShowTargetConfigModal(true);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Atur target harian & batas toleransi alert"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Atur Target</span>
            </button>

            <button
              type="button"
              onClick={() => setShowBlockBreakdownModal(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-xs border border-slate-700 transition-all active:scale-95 cursor-pointer"
              title="Lihat rincian perbandingan target per blok kerja"
            >
              <FileText className="w-3.5 h-3.5 text-sky-400" />
              <span>Rincian Blok</span>
            </button>
          </div>
        </div>

        {/* 3 COMPARISON KPI GAUGES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3.5 pt-4">
          
          {/* TILE 1: TARGET LUAS (HA) */}
          <div className={`p-4 rounded-2xl border transition-all duration-200 flex flex-col justify-between ${
            isCriticalDeficit
              ? 'bg-rose-950/30 border-rose-800/80 shadow-rose-950/20'
              : haPercent >= 100
              ? 'bg-emerald-950/30 border-emerald-800/80 shadow-emerald-950/20'
              : 'bg-amber-950/30 border-amber-800/80 shadow-amber-950/20'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Target Luas Land Clearing</span>
              <Target className={`w-4 h-4 ${
                haPercent >= 100 ? 'text-emerald-400' : isCriticalDeficit ? 'text-rose-400' : 'text-amber-400'
              }`} />
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {actualHaToday.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {targetHaToday.toFixed(1)} Ha / Hari
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className={`font-black ${
                  haPercent >= 100 ? 'text-emerald-400' : isCriticalDeficit ? 'text-rose-400' : 'text-amber-400'
                }`}>
                  Capaian: {haPercent}%
                </span>
                <span className={`font-mono text-[11px] font-bold px-1.5 py-0.5 rounded ${
                  haGap >= 0 ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900/60 text-rose-300'
                }`}>
                  {haGap >= 0 ? `Surplus +${haGap.toFixed(1)} Ha` : `Defisit ${haGap.toFixed(1)} Ha`}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-800 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    haPercent >= 100 ? 'bg-emerald-500' : isCriticalDeficit ? 'bg-rose-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, haPercent)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0 Ha</span>
                <span>Target: {targetHaToday.toFixed(1)} Ha</span>
              </div>
            </div>
          </div>

          {/* TILE 2: JAM KERJA EFEKTIF (HM) */}
          <div className="p-4 rounded-2xl border bg-slate-800/80 border-slate-700/80 flex flex-col justify-between">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Efektivitas Jam Mesin (HM)</span>
              <Clock className="w-4 h-4 text-amber-400" />
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-black text-white">
                  {actualAvgHm.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / {targetHmToday > 0 ? `${targetHmToday.toFixed(1)} HM / Unit` : '0.0 HM / Unit'}
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className={`font-black ${
                  targetHmToday > 0
                    ? (actualAvgHm >= targetHmToday ? 'text-emerald-400' : 'text-amber-400')
                    : 'text-slate-400'
                }`}>
                  Utilisasi: {hmPercent}%
                </span>
                <span className="font-mono text-[11px] text-slate-400">
                  {targetHmToday > 0
                    ? (actualAvgHm >= targetHmToday ? 'Standar Terpenuhi' : `Kurang ${Math.abs(hmGap).toFixed(1)} HM`)
                    : 'Belum ada jadwal alat'}
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    actualAvgHm >= targetHmToday && targetHmToday > 0 ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                  style={{ width: `${Math.min(100, targetHmToday > 0 ? (actualAvgHm / targetHmToday) * 100 : 0)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Total Unit Operasi: {metrics.operationalEquipmentCount} Unit</span>
                <span>Standar: {targetHmToday.toFixed(1)}h</span>
              </div>
            </div>
          </div>

          {/* TILE 3: DOWNTIME & TOLERANSI JAM MATI */}
          <div className={`p-4 rounded-2xl border flex flex-col justify-between ${
            isDowntimeOverLimit
              ? 'bg-rose-950/30 border-rose-800/80 shadow-rose-950/20'
              : 'bg-slate-800/80 border-slate-700/80'
          }`}>
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase tracking-wider">
              <span>Toleransi Downtime (Jam Mati)</span>
              <AlertTriangle className={`w-4 h-4 ${isDowntimeOverLimit ? 'text-rose-400' : 'text-emerald-400'}`} />
            </div>

            <div className="my-2.5">
              <div className="flex items-baseline gap-2">
                <span className={`text-2xl sm:text-3xl font-black ${
                  isDowntimeOverLimit ? 'text-rose-400' : 'text-white'
                }`}>
                  {actualDowntimeToday.toFixed(1)}
                </span>
                <span className="text-sm font-semibold text-slate-400">
                  / Maks {targetConfig.maxDowntimeHours.toFixed(1)} Jam
                </span>
              </div>
              <div className="flex items-center justify-between mt-1 text-xs">
                <span className={`font-black ${isDowntimeOverLimit ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {isDowntimeOverLimit ? 'Melebihi Toleransi' : 'Dalam Batas Aman'}
                </span>
                <span className="text-[11px] text-slate-400">
                  {actualWeatherDowntimeToday.toFixed(1)}h Cuaca • {actualBreakdownDowntimeToday.toFixed(1)}h Breakdown
                </span>
              </div>
            </div>

            {/* Progress Bar */}
            <div className="space-y-1">
              <div className="w-full bg-slate-700 h-2.5 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isDowntimeOverLimit ? 'bg-rose-500' : 'bg-emerald-500'
                  }`}
                  style={{ width: `${Math.min(100, (actualDowntimeToday / Math.max(1, targetConfig.maxDowntimeHours * 2)) * 100)}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Toleransi Max: {targetConfig.maxDowntimeHours.toFixed(1)}h</span>
                <span>{actualDowntimeToday > targetConfig.maxDowntimeHours ? `+${(actualDowntimeToday - targetConfig.maxDowntimeHours).toFixed(1)}h Over` : 'Aman'}</span>
              </div>
            </div>
          </div>

        </div>

        {/* ACTIVE ALERTS TICKER & ADVICE FEED */}
        <div className="mt-4 pt-4 border-t border-slate-800">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-black text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Daftar Alert & Arahan Tindakan Langsung Direksi:</span>
            </span>
            {dismissedAlertIds.length > 0 && (
              <button
                type="button"
                onClick={handleResetDismissedAlerts}
                className="text-[10px] text-amber-400 hover:underline cursor-pointer"
              >
                Tampilkan Ulang {dismissedAlertIds.length} Alert Tersembunyi
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
            {activeAlerts.map((alt) => (
              <div
                key={alt.id}
                className={`p-3 rounded-2xl border text-xs space-y-1.5 transition-all ${
                  alt.severity === 'critical'
                    ? 'bg-rose-950/40 border-rose-700/80 text-rose-100 shadow-sm'
                    : alt.severity === 'warning'
                    ? 'bg-amber-950/40 border-amber-700/80 text-amber-100 shadow-sm'
                    : 'bg-emerald-950/40 border-emerald-700/80 text-emerald-100 shadow-sm'
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${
                      alt.severity === 'critical'
                        ? 'bg-rose-600 text-white'
                        : alt.severity === 'warning'
                        ? 'bg-amber-600 text-slate-950'
                        : 'bg-emerald-600 text-white'
                    }`}>
                      {alt.badge}
                    </span>
                    <strong className="text-xs font-bold text-white tracking-tight">
                      {alt.title}
                    </strong>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDismissAlert(alt.id)}
                    className="text-[10px] text-slate-400 hover:text-white px-1.5 py-0.5 rounded hover:bg-slate-800 transition cursor-pointer"
                    title="Abaikan Alert"
                  >
                    ✕
                  </button>
                </div>

                <p className="text-[11px] text-slate-300 leading-snug">
                  {alt.desc}
                </p>

                <div className="p-2 rounded-xl bg-slate-950/60 border border-slate-800 flex items-start gap-2 text-[11px] text-amber-300">
                  <Info className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />
                  <div>
                    <span className="font-bold text-slate-200">Rekomendasi Direktur: </span>
                    <span className="text-slate-300">{alt.recommendation}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

      </section>

      {/* PUSAT TINDAKAN PERHATIAN DIREKTUR DAN SISTEM DETEKSI */}
      <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 rounded-2xl p-5 shadow-xl border border-amber-400">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex items-start gap-3.5">
            <div className="p-2.5 bg-slate-950 text-amber-400 rounded-xl font-black shadow shrink-0">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-0.5">
                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-slate-950 text-amber-400">
                  Pusat Tindakan & Eksekutif
                </span>
                <h3 className="text-base font-black text-slate-950 uppercase tracking-tight">
                  Pusat Tindakan Perhatian Direktur dan Sistem Deteksi
                </h3>
              </div>
              <p className="text-xs text-slate-900 font-medium">
                Pusat pengawasan otorisasi dan persetujuan eksekutif untuk laporan kerja lapangan dan penerimaan pasokan logistik.
              </p>

              {/* Status Points */}
              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {totalPendingInbound > 0 ? (
                  <span className="inline-flex items-center gap-1.5 bg-slate-950 text-amber-300 px-3 py-1.5 rounded-xl font-bold">
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                    <span>{totalPendingInbound} Pengiriman Stok Masuk Menunggu Approval Direktur</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-slate-950/80 text-emerald-300 px-3 py-1.5 rounded-xl font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seluruh Pengiriman Stok Masuk Telah Disetujui</span>
                  </span>
                )}

                {displayedReports.filter((r) => r.status !== 'Disetujui Direktur').length > 0 ? (
                  <span className="inline-flex items-center gap-1.5 bg-slate-950 text-amber-300 px-3 py-1.5 rounded-xl font-bold">
                    <FileText className="w-3.5 h-3.5 text-amber-400" />
                    <span>{displayedReports.filter((r) => r.status !== 'Disetujui Direktur').length} Laporan Harian Menunggu Persetujuan</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 bg-slate-950/80 text-emerald-300 px-3 py-1.5 rounded-xl font-bold">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Seluruh Laporan Harian Telah Disetujui</span>
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 self-start lg:self-center shrink-0">
            {totalPendingInbound > 0 && onNavigateLogistics && (
              <button
                onClick={onNavigateLogistics}
                className="px-4 py-2 bg-slate-950 hover:bg-slate-900 text-amber-400 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Verifikasi Otorisasi Sekarang →
              </button>
            )}

            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className="px-4 py-2 bg-slate-900/90 hover:bg-slate-900 text-white font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Otorisasi Laporan Harian →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* SISTEM DETEKSI EFISIENSI BBM: ALERT KONSUMSI DI ATAS BATAS STANDAR */}
      <div className={`rounded-2xl p-4 sm:p-5 shadow-md border-2 transition ${
        alertEquipments.length > 0
          ? 'bg-rose-50 border-rose-300'
          : 'bg-emerald-50/70 border-emerald-300'
      }`}>
        <div className="flex items-start gap-3.5">
          <div className={`p-2 rounded-xl shadow shrink-0 ${
            alertEquipments.length > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
          }`}>
            {alertEquipments.length > 0 ? (
              <AlertTriangle className="w-6 h-6" />
            ) : (
              <CheckCircle2 className="w-6 h-6" />
            )}
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                alertEquipments.length > 0 ? 'bg-rose-600 text-white' : 'bg-emerald-600 text-white'
              }`}>
                Sistem Deteksi
              </span>
              <h3 className={`text-sm sm:text-base font-black uppercase tracking-wide ${
                alertEquipments.length > 0 ? 'text-rose-950' : 'text-emerald-950'
              }`}>
                Sistem Deteksi Efisiensi BBM: Alert Konsumsi Di Atas Batas Standar
              </h3>
              {alertEquipments.length > 0 && (
                <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                  {alertEquipments.length} Unit Melebihi Batas
                </span>
              )}
            </div>

            {alertEquipments.length > 0 ? (
              <>
                <p className="text-xs text-rose-800 mt-1">
                  Terdeteksi unit alat berat yang rasio konsumsi solarnya melebihi standar toleransi proyek:
                </p>

                <div className="mt-2.5 space-y-1.5">
                  {alertEquipments.map((alert, idx) => (
                    <div
                      key={idx}
                      className="p-2.5 bg-white border border-rose-200 rounded-lg text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 font-mono">
                        <strong className="text-rose-700 bg-rose-100 px-2 py-0.5 rounded font-bold">
                          {alert.equipmentId}
                        </strong>
                        {alert.clientName && (
                          <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-[11px] font-bold">
                            Klien: {alert.clientName}
                          </span>
                        )}
                        <span className="font-bold text-slate-900">
                          {alert.fuelRatio.toFixed(1)} Liter/HM
                        </span>
                        <span className="text-slate-500">
                          (&gt; Batas Standar {alert.standardLimit.toFixed(1)} L/HM)
                        </span>
                      </div>
                      <div className="text-slate-600 text-[11px] italic">
                        {alert.note}
                      </div>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <p className="text-xs text-emerald-800 mt-1">
                Kondisi Aman: Seluruh unit alat berat beroperasi secara optimal dan berada dalam batas toleransi standar konsumsi BBM (L/HM).
              </p>
            )}
          </div>
        </div>
      </div>

      {/* NOTIFIKASI VERIFIKASI REAL-TIME (MANAGER OPERASIONAL) */}
      <section className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/95 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-start gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0">
              <Bell className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-slate-950 tracking-tight">
                  Notifikasi Verifikasi Real-Time (Manager Operasional)
                </h3>
                <span className="flex items-center gap-1 text-[10px] font-black text-indigo-700 bg-indigo-50/60 border border-indigo-200/50 px-2 py-0.5 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></span>
                  Live Sync
                </span>
              </div>
              <p className="text-xs text-slate-500">
                Daftar laporan harian terbaru yang disetujui atau ditolak oleh Manager Operasional untuk menjaga transparansi verifikasi.
              </p>
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400 font-mono">
            Tampil {latestManagerVerifications.length} dari {managerVerifiedReports.length} laporan
          </div>
        </div>

        {latestManagerVerifications.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400 bg-slate-50 rounded-xl border border-dashed border-slate-200">
            Belum ada aktivitas verifikasi atau penolakan laporan dari Manager Operasional untuk filter saat ini.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {latestManagerVerifications.map((rpt) => {
              const isApproved = rpt.status === 'Disetujui Manager' || rpt.status === 'Disetujui Direktur';
              const managerName = rpt.signatures?.siteManager?.name || rpt.rejectedBy || 'Bambang Sugiarto, S.P.';
              const actionTime = rpt.signatures?.siteManager?.signedAt || rpt.rejectedAt || '-';

              return (
                <div key={rpt.id} className="py-3.5 first:pt-0 last:pb-0 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                      <span className="font-mono font-bold text-slate-900 select-all text-[11px] bg-slate-100 px-1.5 py-0.5 rounded">
                        {rpt.reportNumber}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="font-bold text-slate-800">
                        {rpt.clientName}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-medium">
                        Blok {rpt.blockCode}
                      </span>
                      <span className="text-slate-300">·</span>
                      <span className="text-slate-500 font-mono">
                        {rpt.date}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] text-slate-500 pt-0.5">
                      <span>Verifikator: <strong className="text-slate-700 font-semibold">{managerName}</strong></span>
                      <span>·</span>
                      <span>Status:</span>
                      <span className={`font-bold uppercase tracking-wide flex items-center gap-1 ${
                        isApproved ? 'text-emerald-600' : 'text-rose-600'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${isApproved ? 'bg-emerald-500' : 'bg-rose-500'}`}></span>
                        {isApproved ? (rpt.status === 'Disetujui Direktur' ? 'Disetujui Manager & Direktur' : 'Disetujui Manager') : 'Ditolak Manager'}
                      </span>
                      <span>·</span>
                      <span className="font-mono text-slate-400">{actionTime}</span>
                    </div>

                    {!isApproved && rpt.rejectionReason && (
                      <div className="mt-2 p-2.5 bg-rose-50/50 border border-rose-100 rounded-lg text-[11px] text-rose-800 font-medium">
                        <span className="font-bold">Alasan Penolakan Manager:</span> "{rpt.rejectionReason}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 self-end md:self-center">
                    <button
                      type="button"
                      onClick={() => onOpenPdfReport(rpt.id)}
                      className="px-3.5 py-2 rounded-xl bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 font-bold border border-slate-200 transition-all active:scale-95 cursor-pointer flex items-center gap-1.5 shadow-2xs"
                    >
                      <FileText className="w-3.5 h-3.5 text-slate-500" />
                      <span>Buka Dokumen PDF</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* 1. DAFTAR PROYEK KLIEN AKTIF (PERBANDINGAN CAPAIAN HA) */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                1. Portofolio Proyek
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Capaian Luasan Realisasi Fisik (Ha)
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Building2 className="w-5 h-5 text-amber-500" />
              Daftar Proyek Klien Aktif (Perbandingan Capaian Ha)
            </h3>
            <p className="text-xs text-slate-500">
              Memantau seluruh proyek klien dalam satu layar pengawasan terpadu PT. RBS GROUP. Klik kartu klien untuk memfilter analisis.
            </p>
          </div>
          {isFiltered && (
            <button
              onClick={() => setSelectedClientId('ALL')}
              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-lg transition cursor-pointer self-start sm:self-auto border border-slate-300"
            >
              Tampilkan Semua Klien (Reset Filter)
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {clients.map((c) => {
            const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(1) : '0';
            const isSelected = selectedClientId === c.id;
            return (
              <div
                key={c.id}
                onClick={() => setSelectedClientId(isSelected ? 'ALL' : c.id)}
                className={`p-4 rounded-xl border transition cursor-pointer flex flex-col justify-between space-y-3 ${
                  isSelected 
                    ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-400/50 shadow-md' 
                    : 'border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 shadow-xs'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-black text-sm text-slate-900 flex items-center gap-1.5">
                      {c.name}
                      {isSelected && (
                        <span className="text-[10px] font-bold bg-amber-500 text-slate-950 px-1.5 py-0.2 rounded">
                          Aktif
                        </span>
                      )}
                    </span>
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-emerald-100 text-emerald-800">
                      {c.status}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 line-clamp-1 font-medium">{c.fullCompanyName}</p>
                  <p className="text-[11px] text-slate-400 font-mono mt-0.5">SPK: {c.contractNumber}</p>
                </div>

                <div>
                  <div className="flex justify-between items-baseline text-xs mb-1">
                    <span className="text-slate-500">Capaian:</span>
                    <strong className="text-slate-900 font-mono">{c.clearedAreaHa} / {c.totalAreaHa} Ha ({pct}%)</strong>
                  </div>
                  <div className="w-full bg-slate-200 h-2 rounded-full overflow-hidden">
                    <div
                      className="bg-amber-500 h-full rounded-full transition-all duration-500"
                      style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                    />
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                  <span>{isSelected ? 'Klik untuk batalkan filter' : 'Pilih & Filter Klien Ini'}</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. REKAPITULASI LAPORAN HARIAN TERBARU (MULTI-KLIEN) */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                2. Rekapitulasi Dokumen
              </span>
              <span className="text-xs text-slate-500 font-semibold">
                Validasi Mandor & Geotag Watermark
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Rekapitulasi Laporan Harian Terbaru {isFiltered && activeClient ? `(${activeClient.name})` : '(Multi-Klien)'}
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen resmi yang telah diverifikasi mandor dengan foto geotag ber-watermark.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-medium">
              Total {displayedReports.length} Dokumen
            </span>
            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-amber-400 text-xs font-bold rounded-xl transition cursor-pointer"
              >
                Lihat Rekap Lengkap →
              </button>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-100/90 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <th className="p-3">No. Laporan</th>
                <th className="p-3">Tanggal</th>
                <th className="p-3">Klien</th>
                <th className="p-3">Blok</th>
                <th className="p-3 text-center">Rata-rata Progres (%)</th>
                <th className="p-3 text-center">Efektif HM</th>
                <th className="p-3 text-center">Downtime (C/B)</th>
                <th className="p-3 text-center">Status BBM</th>
                <th className="p-3 text-center">Approval</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {displayedReports.slice(0, 5).map((report) => {
                const totalDwWeather = report.equipmentWorkLogs.reduce((a, b) => a + b.downtimeWeatherHours, 0);
                const totalDwBreakdown = report.equipmentWorkLogs.reduce((a, b) => a + b.downtimeBreakdownHours, 0);
                const totalEffHm = report.equipmentWorkLogs.reduce((a, b) => a + b.effectiveWorkHours, 0);
                const hasAlert = report.equipmentWorkLogs.some((l) => l.isFuelAlert);
                const isApproved = report.status === 'Disetujui Direktur';
                const items = report.physicalProgress?.itemProgress || [];
                const avgPct = items.length > 0 ? (items.reduce((acc, it) => acc + (it.achievementPercentage || 0), 0) / items.length).toFixed(1) : '0.0';

                return (
                  <tr key={report.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-mono font-bold text-slate-900">
                      {report.reportNumber}
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {report.date}
                    </td>
                    <td className="p-3">
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px]">
                        {report.clientName || 'PT. A'}
                      </span>
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      {report.blockCode}
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-800">
                      {avgPct}%
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {totalEffHm.toFixed(1)} HM
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="text-blue-700">{totalDwWeather.toFixed(1)}h C</span>
                      {' / '}
                      <span className="text-rose-700 font-bold">{totalDwBreakdown.toFixed(1)}h B</span>
                    </td>
                    <td className="p-3 text-center">
                      {hasAlert ? (
                        <span className="bg-rose-100 text-rose-800 px-1.5 py-0.5 rounded font-bold text-[10px]">
                          ALERT
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-mono font-bold">Normal</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Disetujui
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          {report.status}
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        {!isApproved && (userRole === 'director' || userRole === 'client') && (
                          <button
                            onClick={() => onApproveReport(report.id)}
                            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[11px] font-bold shadow transition cursor-pointer"
                            title="Setujui laporan ini sebagai Direktur"
                          >
                            <ShieldCheck className="w-3 h-3" />
                            <span>Setujui</span>
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPdfReport(report.id)}
                          className="flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded text-[11px] font-bold transition cursor-pointer"
                          title="Buka format cetak PDF resmi"
                        >
                          <Printer className="w-3 h-3" />
                          <span>PDF</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 3 & 4. DOWNTIME ANALYSIS & FUEL EFFICIENCY COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. Analisis Jam Mati (Downtime) Cuaca vs Kerusakan */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                  3. Analisis Jam Mati
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Clock className="w-4 h-4 text-rose-500" />
                Analisis Jam Mati (Downtime) Cuaca vs Kerusakan
              </h3>
              <p className="text-xs text-slate-500">
                Memastikan pertanggungjawaban jelas antara faktor alam dan kendala alat berat.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 rounded-xl bg-blue-50/80 border border-blue-200">
              <div className="text-xs font-bold text-blue-900 uppercase">Cuaca Buruk / Hujan</div>
              <div className="text-2xl font-black text-blue-800 my-1 font-mono">
                {metrics.totalWeatherDowntime.toFixed(1)} <span className="text-xs font-bold text-blue-600">Jam</span>
              </div>
              <p className="text-[11px] text-blue-700">
                Pekerjaan dihentikan karena hujan lebat / gambut basah rawan amblas.
              </p>
            </div>

            <div className="p-4 rounded-xl bg-rose-50/80 border border-rose-200">
              <div className="text-xs font-bold text-rose-900 uppercase">Kerusakan Alat (Breakdown)</div>
              <div className="text-2xl font-black text-rose-800 my-1 font-mono">
                {metrics.totalBreakdownDowntime.toFixed(1)} <span className="text-xs font-bold text-rose-600">Jam</span>
              </div>
              <p className="text-[11px] text-rose-700">
                Insiden mekanis (selang hidrolik pecah, perbaikan track, dll).
              </p>
            </div>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
            <div className="font-bold text-slate-800 flex items-center justify-between">
              <span>Rasio Downtime terhadap Total Waktu:</span>
              <span className="font-mono text-slate-900 font-black">
                {metrics.totalDowntime > 0
                  ? ((metrics.totalDowntime / (metrics.totalEffectiveHours + metrics.totalDowntime)) * 100).toFixed(1)
                  : 0}%
              </span>
            </div>
            <p className="text-slate-500 text-[11px]">
              Toleransi target operasional PT. RBS GROUP adalah downtime kerusakan &lt; 5%.
            </p>
          </div>
        </div>

        {/* 4. Monitoring Konsumsi BBM Alat Berat (Liter / HM) */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 border border-amber-200">
                  4. Rasio Unit
                </span>
              </div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Fuel className="w-4 h-4 text-amber-500" />
                Monitoring Konsumsi BBM Alat Berat (Liter / HM)
              </h3>
              <p className="text-xs text-slate-500">
                Deteksi dini potensi kebocoran solar atau ketidakefisienan unit.
              </p>
            </div>
          </div>

          <div className="space-y-2.5">
            {fuelComparisons.slice(0, 4).map((fc) => {
              const isOver = fc.isAlert || (fc.latestRatio > fc.standardLimit);
              return (
                <div
                  key={fc.equipment.id}
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50/60 flex items-center justify-between text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-slate-200 flex items-center justify-center font-bold text-slate-800 shrink-0 font-mono text-[11px]">
                      {fc.equipment.id.split('-')[0]}
                    </div>
                    <div>
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <span>{fc.equipment.name}</span>
                        {isOver && (
                          <span className="text-[10px] bg-rose-100 text-rose-700 px-1.5 py-0.2 rounded font-black">
                            OVER LIMIT
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-500">
                        Operator: {fc.equipment.operatorName} • Total HM: {fc.equipment.currentHm}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className={`font-mono font-bold text-sm ${isOver ? 'text-rose-600' : 'text-slate-900'}`}>
                      {fc.latestRatio.toFixed(1)} <span className="text-xs font-normal text-slate-500">L/HM</span>
                    </div>
                    <div className="text-[10px] text-slate-500">
                      Standar: {fc.standardLimit.toFixed(1)} L/HM
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 5. RINGKASAN KONTROL BAHAN BAKAR (WEEKLY FUEL TRENDS CHART) */}
      <WeeklyFuelRatioChart
        trends={fuelTrends}
        selectedClientId={selectedClientId}
        clientName={activeClient?.name}
      />

      {/* RINGKASAN INVENTARIS LOGISTIK DIREKTUR */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                Ringkasan Inventaris Logistik Direktur
              </span>
              <span className="text-xs font-semibold text-slate-500">
                Pemantauan Cepat Ketersediaan Sumber Daya Lapangan
              </span>
            </div>
            <h3 className="text-base font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-500" />
              Status Stok Utama Logistik (BBM, Pelumas & Spare Part)
            </h3>
            <p className="text-xs text-slate-500">
              Menampilkan volume stok fisik aktif di basecamp untuk menjamin kelancaran operasional armada alat berat tanpa hambatan supply.
            </p>
          </div>

          {onNavigateLogistics && (
            <button
              onClick={onNavigateLogistics}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs transition cursor-pointer self-start sm:self-auto shrink-0 shadow-xs"
            >
              <span>Kelola Logistik Lapangan</span>
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* 3 KARTU STATUS VISUAL UTAMA */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          
          {/* KARTU 1: BBM SOLAR INDUSTRI B50 */}
          <div className="bg-gradient-to-br from-amber-50/60 via-white to-amber-50/20 border-2 border-amber-300/80 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 shadow-xs hover:border-amber-400 transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold shadow-xs">
                    <Fuel className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-amber-950 block tracking-wide">
                      Bahan Bakar Minyak
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Solar Industri B50</h4>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    fuelItem.stockQuantity > 2000
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : fuelItem.stockQuantity > 1000
                      ? 'bg-amber-100 text-amber-800 border-amber-300'
                      : 'bg-rose-100 text-rose-800 border-rose-300'
                  }`}
                >
                  {fuelItem.stockQuantity > 2000 ? 'Stok Aman' : fuelItem.stockQuantity > 1000 ? 'Waspada' : 'Kritis'}
                </span>
              </div>

              {/* Big Metric Display */}
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                  {fuelItem.stockQuantity.toLocaleString()}{' '}
                  <span className="text-sm font-bold text-slate-500">Liter</span>
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                  <span className="text-amber-800 font-bold font-mono">{fuelTankPercent}%</span>
                  <span>dari kapasitas tangki basecamp (10.000 L)</span>
                </div>
              </div>

              {/* Visual Tank Gauge Bar */}
              <div className="mt-2.5 space-y-1">
                <div className="w-full bg-slate-200 h-2.5 rounded-full overflow-hidden p-0.5 border border-slate-300">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      fuelTankPercent >= 25 ? 'bg-amber-500' : 'bg-rose-500'
                    }`}
                    style={{ width: `${fuelTankPercent}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                  <span>0 L</span>
                  <span className="text-amber-900 font-bold">Min: 1.000 L</span>
                  <span>10.000 L</span>
                </div>
              </div>
            </div>

            {/* Quick Details Footer */}
            <div className="pt-2 border-t border-amber-200/60 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Estimasi Ketahanan:</span>
                <strong className="font-mono text-slate-900 font-bold">~12 - 14 Hari Kerja</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Penerimaan Pending:</span>
                {pendingFuelInflow > 0 ? (
                  <strong className="font-mono text-rose-700 font-bold">
                    +{pendingFuelInflow.toLocaleString()} L (Menunggu Persetujuan)
                  </strong>
                ) : (
                  <span className="text-emerald-700 font-semibold flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Seluruh DO Sah
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* KARTU 2: PELUMAS & OLI UNIT (MESIN, HIDROLIK, TRANSMISI, GREASE) */}
          <div className="bg-gradient-to-br from-blue-50/60 via-white to-blue-50/20 border-2 border-blue-300/80 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 shadow-xs hover:border-blue-400 transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold shadow-xs">
                    <Droplet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-blue-950 block tracking-wide">
                      Pelumas & Gemuk
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Oli Drum & Grease EP-2</h4>
                  </div>
                </div>

                <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full border bg-emerald-100 text-emerald-800 border-emerald-300">
                  Tersedia Lengkap
                </span>
              </div>

              {/* Big Metric Display */}
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                  {totalOliLiters.toLocaleString()}{' '}
                  <span className="text-sm font-bold text-slate-500">Liter Oli</span>
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                  <span className="text-emerald-700 font-bold font-mono">+{greaseItem.stockQuantity} Kg</span>
                  <span>Grease Chassis High Temp</span>
                </div>
              </div>

              {/* Rincian Stok Jenis Oli */}
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Oli Mesin 15W-40</span>
                  <strong className="font-mono font-bold text-slate-900">{oliEng} Liter</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Oli Hidrolik 68</span>
                  <strong className="font-mono font-bold text-slate-900">{oliHyd} Liter</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Oli Transmisi 90</span>
                  <strong className="font-mono font-bold text-slate-900">{oliTrm} Liter</strong>
                </div>
                <div className="bg-white p-2 rounded-lg border border-blue-200">
                  <span className="text-[10px] text-slate-500 block">Grease Chassis</span>
                  <strong className="font-mono font-bold text-slate-900">{greaseItem.stockQuantity} Kg</strong>
                </div>
              </div>
            </div>

            {/* Quick Details Footer */}
            <div className="pt-2 border-t border-blue-200/60 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Peruntukan Servis:</span>
                <strong className="text-blue-900 font-bold">Jadwal 250 & 500 HM Unit</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Penyimpanan:</span>
                <span className="text-slate-800 font-medium">Drum Tertutup Workshop Basecamp</span>
              </div>
            </div>
          </div>

          {/* KARTU 3: SPARE PART & KOMPONEN KRITIS */}
          <div className="bg-gradient-to-br from-purple-50/60 via-white to-purple-50/20 border-2 border-purple-300/80 rounded-2xl p-4.5 flex flex-col justify-between space-y-3.5 shadow-xs hover:border-purple-400 transition">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-purple-700 text-white flex items-center justify-center font-bold shadow-xs">
                    <Wrench className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[11px] font-black uppercase text-purple-950 block tracking-wide">
                      Komponen Kritis
                    </span>
                    <h4 className="text-xs font-bold text-slate-700">Suku Cadang Alat Berat</h4>
                  </div>
                </div>

                <span
                  className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full border ${
                    lowStockParts.length === 0
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border-amber-300'
                  }`}
                >
                  {lowStockParts.length === 0 ? 'Ready Stock' : `${lowStockParts.length} Item Menipis`}
                </span>
              </div>

              {/* Big Metric Display */}
              <div className="mt-3">
                <div className="text-3xl font-black text-slate-950 font-mono tracking-tight">
                  {totalSpareParts}{' '}
                  <span className="text-sm font-bold text-slate-500">Pcs Komponen</span>
                </div>
                <div className="text-xs font-semibold text-slate-600 mt-0.5 flex items-center gap-1.5">
                  <span className="text-purple-800 font-bold font-mono">{sparePartItems.length} Jenis Item</span>
                  <span>Tersedia untuk Penggantian Cepat</span>
                </div>
              </div>

              {/* Rincian Spare Part Kritis */}
              <div className="mt-3 space-y-1.5 text-[11px]">
                {sparePartItems.map((item) => (
                  <div
                    key={item.id}
                    className="p-1.5 bg-white rounded-lg border border-purple-200/80 flex items-center justify-between"
                  >
                    <span className="text-slate-800 truncate pr-2 font-medium">{item.name}</span>
                    <span className="font-mono font-bold text-purple-900 bg-purple-50 px-2 py-0.5 rounded shrink-0">
                      {item.stockQuantity} {item.unit}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Quick Details Footer */}
            <div className="pt-2 border-t border-purple-200/60 text-[11px] space-y-1">
              <div className="flex justify-between items-center text-slate-600">
                <span>Fungsi Utama:</span>
                <strong className="text-purple-950 font-bold">Mencegah Breakdown Lama</strong>
              </div>
              <div className="flex justify-between items-center text-slate-600">
                <span>Tim Pemasang:</span>
                <span className="text-slate-800 font-medium">Mekanik Lapangan (Toni & Doni)</span>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* Photo Modal Zoom */}
      {selectedPhotoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl">
            <div className="aspect-video w-full bg-slate-900">
              <img
                src={selectedPhotoModal.dataUrl}
                alt={selectedPhotoModal.caption}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="p-4 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-900">{selectedPhotoModal.caption}</h4>
                <p className="text-xs text-slate-500 font-mono mt-0.5">
                  GPS: {selectedPhotoModal.gpsCoordinates.lat.toFixed(5)}, {selectedPhotoModal.gpsCoordinates.lng.toFixed(5)} • {selectedPhotoModal.timestamp}
                </p>
              </div>
              <button
                onClick={() => setSelectedPhotoModal(null)}
                className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-lg cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
        </>
      )}

      {/* MODAL 1: PENGATURAN TARGET HARIAN & TOLERANSI ALERT */}
      {showTargetConfigModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <Sliders className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    Pengaturan Target Harian & Ambang Batas Alert
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Parameter evaluasi otomatis Direksi PT. RBS GROUP
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowTargetConfigModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSaveTargetConfig(tempConfig);
              }}
              className="p-5 sm:p-6 space-y-4 text-xs"
            >
              {/* Presets */}
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                  PRESET CEPAT OPERASIONAL:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTempConfig(prev => ({
                        ...prev,
                        targetAreaHa: 4.0,
                        targetEffectiveHm: 8.0,
                        maxDowntimeHours: 1.0,
                        alertThresholdPercent: 80,
                      }));
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition cursor-pointer"
                  >
                    <span className="block font-bold text-slate-900 text-[11px]">Normal</span>
                    <span className="text-[10px] text-slate-500">4.0 Ha • 8.0 HM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempConfig(prev => ({
                        ...prev,
                        targetAreaHa: 6.0,
                        targetEffectiveHm: 9.0,
                        maxDowntimeHours: 0.5,
                        alertThresholdPercent: 85,
                      }));
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition cursor-pointer"
                  >
                    <span className="block font-bold text-slate-900 text-[11px]">Akselerasi</span>
                    <span className="text-[10px] text-slate-500">6.0 Ha • 9.0 HM</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setTempConfig(prev => ({
                        ...prev,
                        targetAreaHa: 2.5,
                        targetEffectiveHm: 6.5,
                        maxDowntimeHours: 2.5,
                        alertThresholdPercent: 75,
                      }));
                    }}
                    className="p-2 rounded-xl border border-slate-200 hover:border-amber-400 hover:bg-amber-50/50 text-left transition cursor-pointer"
                  >
                    <span className="block font-bold text-slate-900 text-[11px]">Musim Hujan</span>
                    <span className="text-[10px] text-slate-500">2.5 Ha • 6.5 HM</span>
                  </button>
                </div>
              </div>

              {/* Input Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Pembukaan Lahan (Ha/Hari) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.1"
                      min="0.5"
                      max="50"
                      required
                      value={tempConfig.targetAreaHa}
                      onChange={(e) => setTempConfig({ ...tempConfig, targetAreaHa: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-semibold text-xs">
                      Ha
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Target ritme harian standar lokasi</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Target Jam Efektif (HM/Unit) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="1"
                      max="24"
                      required
                      value={tempConfig.targetEffectiveHm}
                      onChange={(e) => setTempConfig({ ...tempConfig, targetEffectiveHm: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-semibold text-xs">
                      HM
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Standar efektivitas kerja mesin</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Toleransi Downtime Maksimal (Jam) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      max="10"
                      required
                      value={tempConfig.maxDowntimeHours}
                      onChange={(e) => setTempConfig({ ...tempConfig, maxDowntimeHours: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-semibold text-xs">
                      Jam
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Batas jam mati yang dapat ditoleransi</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Ambang Batas Alert Kritis (%) *
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="5"
                      min="50"
                      max="100"
                      required
                      value={tempConfig.alertThresholdPercent}
                      onChange={(e) => setTempConfig({ ...tempConfig, alertThresholdPercent: parseFloat(e.target.value) || 0 })}
                      className="w-full pl-3 pr-10 py-2 border-2 border-slate-200 rounded-xl font-mono font-bold text-slate-900 focus:border-amber-500 focus:outline-none"
                    />
                    <span className="absolute right-3 top-2.5 text-slate-400 font-semibold text-xs">
                      %
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500">Pencapaian di bawah % ini memicu alert merah</span>
                </div>
              </div>

              {/* Supervisor WhatsApp Number */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nomor WhatsApp Pengawas Lapangan
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={tempConfig.supervisorWhatsapp}
                    onChange={(e) => setTempConfig({ ...tempConfig, supervisorWhatsapp: e.target.value })}
                    placeholder="Contoh: 081276543210 atau +62812..."
                    className="w-full pl-3 pr-3 py-2 border-2 border-slate-200 rounded-xl font-mono text-slate-900 focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <span className="text-[10px] text-slate-500">Nomor tujuan untuk pengiriman broadcast alert</span>
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setShowTargetConfigModal(false)}
                  className="px-4 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-100 transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Target & Alert</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: BROADCAST ALERT KE WHATSAPP */}
      {showWhatsappModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-emerald-950 p-5 text-white flex items-center justify-between border-b border-emerald-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    Broadcast Alert Target ke WhatsApp
                  </h3>
                  <p className="text-[11px] text-emerald-300">
                    Instruksi resmi Direksi PT. RBS GROUP langsung ke ponsel pengawas
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowWhatsappModal(false);
                  setCopiedWaText(false);
                }}
                className="p-1.5 text-emerald-300 hover:text-white rounded-lg hover:bg-emerald-900/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  NOMOR TUJUAN PENGAWAS:
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={targetConfig.supervisorWhatsapp}
                    onChange={(e) => setTargetConfig({ ...targetConfig, supervisorWhatsapp: e.target.value })}
                    className="flex-1 px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold"
                  />
                  <span className="text-[11px] text-slate-500">
                    ({latestReport?.supervisorName || 'Pengawas'})
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  PRATINJAU PESAN ALERT OTOMATIS:
                </label>
                <div className="p-3.5 bg-slate-900 text-emerald-300 font-mono text-[11px] rounded-2xl border border-slate-800 max-h-64 overflow-y-auto whitespace-pre-wrap leading-relaxed">
                  {generateWhatsappAlertMessage()}
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(generateWhatsappAlertMessage());
                    setCopiedWaText(true);
                    setTimeout(() => setCopiedWaText(false), 2500);
                  }}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Copy className="w-4 h-4 text-slate-500" />
                  <span>{copiedWaText ? 'Teks Tersalin!' : 'Salin Pesan'}</span>
                </button>

                <a
                  href={`https://wa.me/${targetConfig.supervisorWhatsapp.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(generateWhatsappAlertMessage())}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full sm:flex-1 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-center shadow-md transition flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-4 h-4" />
                  <span>Kirim ke WhatsApp Sekarang →</span>
                </a>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: RINCIAN TARGET PER BLOK KERJA */}
      {showBlockBreakdownModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-slate-900 p-5 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500 text-slate-950 flex items-center justify-center font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-black tracking-tight">
                    Rincian Evaluasi Target Land Clearing per Blok
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Perbandingan target harian, realisasi, dan deviasi tiap lokasi
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowBlockBreakdownModal(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Blok Kerja</th>
                      <th className="py-2.5 px-3">Proyek / Klien</th>
                      <th className="py-2.5 px-3 text-right">Target (Ha)</th>
                      <th className="py-2.5 px-3 text-right">Realisasi (Ha)</th>
                      <th className="py-2.5 px-3 text-right">Deviasi</th>
                      <th className="py-2.5 px-3 text-center">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
                    {configuredDailyTargets.length > 0 ? (
                      configuredDailyTargets.map((item) => {
                        const relatedReport = displayedReports.find(r => r.blockCode === item.blockCode);
                        const actual = relatedReport ? (relatedReport.physicalProgress?.realizedAreaHa || 0) : 0;
                        const target = item.dailyTargetAreaHa || 4.0;
                        const dev = actual - target;
                        const isDone = actual >= target;

                        return (
                          <tr key={item.id} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 font-bold text-slate-900">
                              {item.blockCode}
                            </td>
                            <td className="py-2.5 px-3 text-slate-600">
                              {item.clientName || 'PT. A'}
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold">
                              {target.toFixed(1)} Ha
                            </td>
                            <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                              {actual.toFixed(1)} Ha
                            </td>
                            <td className={`py-2.5 px-3 text-right font-mono font-bold ${
                              dev >= 0 ? 'text-emerald-600' : 'text-rose-600'
                            }`}>
                              {dev >= 0 ? `+${dev.toFixed(1)}` : dev.toFixed(1)} Ha
                            </td>
                            <td className="py-2.5 px-3 text-center">
                              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                isDone 
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
                                  : 'bg-rose-100 text-rose-800 border border-rose-300'
                              }`}>
                                {isDone ? 'Tercapai' : 'Defisit'}
                              </span>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={6} className="py-6 text-center text-slate-400">
                          Belum ada target harian spesifik yang dikonfigurasi. Menggunakan target default sistem ({targetConfig.targetAreaHa} Ha/hari).
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="pt-2 flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowBlockBreakdownModal(false)}
                  className="px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold transition cursor-pointer"
                >
                  Tutup Rincian
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
