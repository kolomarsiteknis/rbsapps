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
  Plus
} from 'lucide-react';
import { DailyReport, Equipment, UserRole, Client } from '../types';
import { storageService } from '../services/storageService';
import { WeeklyFuelRatioChart } from './WeeklyFuelRatioChart';

interface DashboardViewProps {
  reports: DailyReport[];
  equipments: Equipment[];
  onOpenPdfReport: (reportId: string) => void;
  onOpenWizard?: () => void;
  onNavigateReports?: () => void;
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
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* MULTI-CLIENT SELECTION TABS */}
      <div className="bg-white rounded-2xl p-4 shadow-md border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-amber-500" />
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                Portofolio Proyek Klien (Multi-Client)
              </h3>
              <p className="text-xs text-slate-500">
                Pilih klien untuk memfilter analisis dan progres kerja secara independen:
              </p>
            </div>
          </div>
          {onNavigateMaster && (
            <button
              onClick={onNavigateMaster}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-lg border border-slate-300 transition"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Kelola & Tambah Klien</span>
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 pt-3">
          {/* All Clients Tab */}
          <button
            onClick={() => setSelectedClientId('ALL')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
              selectedClientId === 'ALL'
                ? 'bg-slate-900 text-amber-400 border-slate-900 shadow-md ring-2 ring-amber-400/30 font-black'
                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Semua Klien (Konsolidasi {clients.length} PT)</span>
          </button>

          {/* Client Specific Tabs */}
          {clients.map((c) => {
            const isSelected = selectedClientId === c.id;
            const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(0) : 0;
            return (
              <button
                key={c.id}
                onClick={() => setSelectedClientId(c.id)}
                className={`px-3.5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 border cursor-pointer ${
                  isSelected
                    ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300 font-black'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <span>{c.name}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded font-mono ${isSelected ? 'bg-slate-950 text-amber-300' : 'bg-slate-200 text-slate-700'}`}>
                  {c.clearedAreaHa}/{c.totalAreaHa} Ha ({pct}%)
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Top Banner Executive Header */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Dashboard Eksekutif Direktur & Klien
              </span>
              <span className="text-xs text-slate-400 font-medium">
                Metode Zero Burning (Rabas, Cincang, Rumpuk Mekanis)
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              {isFiltered && activeClient 
                ? `PROYEK LAND CLEARING ${activeClient.fullCompanyName}`
                : `KONSOLIDASI SELURUH PROYEK LAND CLEARING (${clients.length} KLIEN AKTIF)`
              }
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              {isFiltered && activeClient ? (
                <>
                  No. Kontrak: <span className="font-mono text-amber-300 font-bold">{activeClient.contractNumber}</span> • Lokasi: <strong className="text-slate-200">{activeClient.location}</strong> • Pelaksana: <strong className="text-slate-200">PT. SURYALAND GROUP</strong>
                </>
              ) : (
                <>
                  Konsolidasi Total: <strong className="text-amber-300">{metrics.targetAreaTotal} Ha</strong> di berbagai perkebunan Riau • Pelaksana Utama: <strong className="text-slate-200">PT. SURYALAND GROUP</strong>
                </>
              )}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {latestReport && (
              <button
                onClick={() => onOpenPdfReport(latestReport.id)}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Laporan PDF Resmi</span>
              </button>
            )}

            {onNavigateReports && (
              <button
                onClick={onNavigateReports}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold rounded-xl text-xs border border-slate-700 transition cursor-pointer"
              >
                <FileText className="w-4 h-4 text-amber-400" />
                <span>Rekap Laporan & Otorisasi</span>
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

      {/* MULTI-CLIENT PORTFOLIO CARDS (DISPLAYED WHEN "ALL CLIENTS" IS SELECTED) */}
      {!isFiltered && (
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide flex items-center gap-2">
                <Building2 className="w-4 h-4 text-amber-500" />
                Daftar Proyek Klien Aktif (Perbandingan Capaian Ha)
              </h3>
              <p className="text-xs text-slate-500">
                Memantau seluruh proyek klien dalam satu layar pengawasan terpadu PT. SURYALAND GROUP.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {clients.map((c) => {
              const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(1) : '0';
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedClientId(c.id)}
                  className="p-4 rounded-xl border border-slate-200 hover:border-amber-400 bg-slate-50/70 hover:bg-amber-50/30 transition cursor-pointer flex flex-col justify-between space-y-3"
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-black text-sm text-slate-900">{c.name}</span>
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
                        className="bg-amber-500 h-full rounded-full"
                        style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t border-slate-200 flex items-center justify-between text-[11px] text-amber-700 font-bold">
                    <span>Lihat Detail Dashboard</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GRAFIK TREN RASIO KONSUMSI BBM (LITER/HA) MINGGUAN DENGAN RECHARTS */}
      <WeeklyFuelRatioChart
        trends={fuelTrends}
        selectedClientId={selectedClientId}
        clientName={activeClient?.name}
      />

      {/* PROMINENT FUEL EFFICIENCY ALERT */}
      {alertEquipments.length > 0 && (
        <div className="bg-rose-50 border-2 border-rose-300 rounded-2xl p-4 sm:p-5 shadow-md">
          <div className="flex items-start gap-3.5">
            <div className="p-2 bg-rose-600 text-white rounded-xl shadow shrink-0">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-sm sm:text-base font-black text-rose-950 uppercase tracking-wide">
                  Sistem Deteksi Efisiensi BBM: Alert Konsumsi Di Atas Batas Standar
                </h3>
                <span className="bg-rose-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded">
                  Perhatian Direktur
                </span>
              </div>
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
            </div>
          </div>
        </div>
      )}

      {/* DOWNTIME ANALYSIS & FUEL EFFICIENCY COMPARISON */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Downtime Breakdown Analysis */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
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

        {/* Efisiensi BBM Unit Alat Berat */}
        <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
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

      {/* TABEL LAPORAN HARIAN TERBARU */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 sm:p-5 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              Rekapitulasi Laporan Harian Terbaru {isFiltered && activeClient ? `(${activeClient.name})` : '(Multi-Klien)'}
            </h3>
            <p className="text-xs text-slate-500">
              Dokumen resmi yang telah diverifikasi mandor dengan foto geotag ber-watermark.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">
              Total {displayedReports.length} Dokumen
            </span>
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
              {displayedReports.map((report) => {
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
