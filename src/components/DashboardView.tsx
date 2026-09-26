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
  MapPin
} from 'lucide-react';
import { DailyReport, Equipment, UserRole, Client } from '../types';
import { storageService } from '../services/storageService';
import { WeeklyFuelRatioChart } from './WeeklyFuelRatioChart';
import { ConnectionHealthCheck } from './ConnectionHealthCheck';

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
}) => {
  const metrics = storageService.getExecutiveDashboardMetrics(selectedClientId);
  const isFiltered = selectedClientId !== 'ALL';
  const activeClient = clients.find((c) => c.id === selectedClientId);
  const fuelTrends = storageService.getWeeklyFuelTrends(selectedClientId);

  // Real-time Logistics & Inventory Snapshot for Director
  const inventory = storageService.getInventory();
  const logisticsTx = storageService.getLogisticsTransactions(selectedClientId);

  // 1. BBM (Solar B35)
  const fuelItem = inventory.find((i) => i.category === 'BBM') || { 
    id: 'inv-1', code: 'BBM-SOL', name: 'Solar Industri B35', category: 'BBM' as const, stockQuantity: 4734, unit: 'Liter', minThreshold: 1000 
  };
  const tankCapacityLiters = 10000;
  const fuelTankPercent = Math.min(100, Number(((fuelItem.stockQuantity / tankCapacityLiters) * 100).toFixed(1)));
  const pendingFuelInflow = logisticsTx
    .filter((t) => t.category === 'BBM' && t.type === 'in' && t.approvalStatus === 'pending')
    .reduce((acc, t) => acc + t.quantity, 0);

  // 2. Pelumas & Oli (Mesin, Hidrolik, Transmisi, Grease)
  const oliItems = inventory.filter((i) => i.category === 'Oli');
  const totalOliLiters = oliItems.reduce((acc, i) => acc + i.stockQuantity, 0);
  const oliEng = inventory.find((i) => i.code === 'OLI-ENG')?.stockQuantity || 180;
  const oliHyd = inventory.find((i) => i.code === 'OLI-HYD')?.stockQuantity || 140;
  const oliTrm = inventory.find((i) => i.code === 'OLI-TRM')?.stockQuantity || 90;
  const greaseItem = inventory.find((i) => i.category === 'Grease') || { 
    id: 'inv-5', code: 'GRS-CH', name: 'Grease Chassis EP-2', category: 'Grease' as const, stockQuantity: 42, unit: 'Kg', minThreshold: 15 
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

  const latestReport = displayedReports[0];
  const [selectedPhotoModal, setSelectedPhotoModal] = useState<any>(null);

  // Calculate cumulative stats
  const targetHa = metrics.targetAreaTotal;
  const currentClearedHa = metrics.cumulativeClearedHa;
  const physicalPercent = Number(metrics.progressPercent.toFixed(1));

  // Fuel Alert equipments
  const alertEquipments = metrics.alertIncidents;

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
                  <span>Pelaksana: <strong className="text-slate-200">PT. SURYALAND GROUP</strong></span>
                </>
              ) : (
                <>
                  <span>Konsolidasi: <strong className="text-amber-300">{metrics.targetAreaTotal} Ha</strong> di berbagai perkebunan</span>
                  <span className="text-slate-600">·</span>
                  <span>Pelaksana Utama: <strong className="text-slate-200">PT. SURYALAND GROUP</strong></span>
                </>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
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
                {metrics.avgFuelEfficiency.toFixed(1)} <span className="text-sm font-semibold text-slate-400">L / HM</span>
              </div>
              <div className="text-xs font-bold text-emerald-400 mt-0.5 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Status Operasi: NORMAL</span>
              </div>
            </div>
            <div className="text-[10px] text-slate-400 flex justify-between">
              <span>Batas Standar PC200:</span>
              <span className="font-mono text-slate-200">18.0 L/HM</span>
            </div>
          </div>
        </div>
      </div>

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
              Memantau seluruh proyek klien dalam satu layar pengawasan terpadu PT. SURYALAND GROUP. Klik kartu klien untuk memfilter analisis.
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
                <th className="p-3 text-center">Capaian Ha</th>
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
                      {report.physicalProgress.realizedAreaHa.toFixed(2)} Ha
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
              Toleransi target operasional PT. SURYALAND GROUP adalah downtime kerusakan &lt; 5%.
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
          
          {/* KARTU 1: BBM SOLAR INDUSTRI B35 */}
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
                    <h4 className="text-xs font-bold text-slate-700">Solar Industri B35</h4>
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
    </div>
  );
};
