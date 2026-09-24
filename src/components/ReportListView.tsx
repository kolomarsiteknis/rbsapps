import React, { useState } from 'react';
import { 
  FileText, 
  Search, 
  Filter, 
  Download, 
  Printer, 
  Check, 
  AlertTriangle, 
  Trash2, 
  Plus, 
  Calendar, 
  MapPin, 
  ShieldCheck,
  Eye,
  Building2,
  X,
  XCircle,
  Clock,
  Truck,
  Fuel,
  Camera
} from 'lucide-react';
import { DailyReport, UserRole, Client, Block } from '../types';
import { storageService } from '../services/storageService';

interface ReportListViewProps {
  reports: DailyReport[];
  onOpenPdf: (reportId: string) => void;
  onNewReport: () => void;
  onDeleteReport: (reportId: string) => void;
  onApproveReport: (reportId: string) => void;
  onRejectReport?: (reportId: string, reason: string) => void;
  userRole: UserRole;
  clients: Client[];
  selectedClientId: string;
  setSelectedClientId: (id: string) => void;
}

export const ReportListView: React.FC<ReportListViewProps> = ({
  reports,
  onOpenPdf,
  onNewReport,
  onDeleteReport,
  onApproveReport,
  onRejectReport,
  userRole,
  clients,
  selectedClientId,
  setSelectedClientId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlock, setFilterBlock] = useState('ALL');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

  // Modal View Detail State (Ikon Mata)
  const [viewingReport, setViewingReport] = useState<DailyReport | null>(null);
  const [isRejectInputOpen, setIsRejectInputOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');

  const isDirector = userRole === 'director';
  const isSupervisor = userRole === 'supervisor';

  const allBlocks = storageService.getBlocks();
  const availableBlocks = selectedClientId === 'ALL'
    ? allBlocks
    : allBlocks.filter((b) => b.clientId === selectedClientId);

  // Filter logic
  const filteredReports = reports.filter((r) => {
    const matchesClient = selectedClientId === 'ALL' || r.clientId === selectedClientId;
    const matchesSearch =
      r.reportNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.blockCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (r.clientName && r.clientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
      r.supervisorName.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesBlock = filterBlock === 'ALL' || r.blockCode.includes(filterBlock) || r.blockId === filterBlock;
    const matchesStatus = filterStatus === 'ALL' || r.status === filterStatus;
    const hasAlert = r.equipmentWorkLogs.some((l) => l.isFuelAlert);
    const matchesAlert = !filterAlertOnly || hasAlert;

    return matchesClient && matchesSearch && matchesBlock && matchesStatus && matchesAlert;
  });

  // Export to Excel / CSV with BOM
  const handleExportCsv = () => {
    const headers = [
      'No. Dokumen',
      'Tanggal',
      'Klien',
      'Lokasi Blok',
      'Cuaca',
      'Pengawas',
      'Target Ha',
      'Realisasi Ha',
      'Kumulatif Ha',
      'Capaian %',
      'Total Jam Efektif (HM)',
      'Downtime Cuaca (Jam)',
      'Downtime Breakdown (Jam)',
      'BBM Terpakai (L)',
      'Status Efisiensi BBM',
      'Status Laporan',
    ];

    const rows = filteredReports.map((r) => {
      const totalEffHm = r.equipmentWorkLogs.reduce((acc, l) => acc + l.effectiveWorkHours, 0);
      const totalDwWeather = r.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeWeatherHours, 0);
      const totalDwBreakdown = r.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeBreakdownHours, 0);
      const hasAlert = r.equipmentWorkLogs.some((l) => l.isFuelAlert);

      return [
        `"${r.reportNumber}"`,
        `"${r.date}"`,
        `"${r.clientName || 'PT. A'}"`,
        `"${r.blockCode}"`,
        `"${r.weather}"`,
        `"${r.supervisorName}"`,
        r.physicalProgress.targetAreaHa,
        r.physicalProgress.realizedAreaHa,
        r.physicalProgress.cumulativeAreaHa,
        r.physicalProgress.progressPercentage,
        totalEffHm.toFixed(1),
        totalDwWeather.toFixed(1),
        totalDwBreakdown.toFixed(1),
        r.logistics.fuelTankUsedLiters,
        hasAlert ? 'ALERT (> Std)' : 'NORMAL',
        `"${r.status}"`,
      ].join(';');
    });

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Rekap_Laporan_SURYALAND_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Top action bar */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Data Transaksi Operasional
              </span>
              <span className="text-xs text-slate-500 font-mono">Total {filteredReports.length} Dokumen</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Rekapitulasi Laporan Harian Land Clearing
            </h2>
            <p className="text-xs text-slate-500">
              Daftar seluruh laporan pengawasan, absensi tim, operasional alat berat, dan konsumsi logistik BBM multi-klien.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
              title="Unduh format spreadsheet CSV kompatibel Excel"
            >
              <Download className="w-4 h-4" />
              <span>Ekspor Excel (CSV)</span>
            </button>

            {/* Tombol Input Laporan Harian: HANYA UNTUK PENGAWAS (Direktur tidak boleh input) */}
            {isSupervisor ? (
              <button
                onClick={onNewReport}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Input Laporan Baru</span>
              </button>
            ) : (
              <div className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 text-xs rounded-xl font-bold border border-slate-200">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Mode Direktur: Otorisasi & Verifikasi</span>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 mt-4">
          {/* Client Filter */}
          <div className="relative">
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Filter Klien</label>
            <div className="flex items-center bg-slate-50 border border-slate-300 rounded-xl px-2.5 py-1.5 gap-1.5">
              <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  setFilterBlock('ALL');
                }}
                className="w-full bg-transparent text-xs font-bold text-slate-800 focus:outline-none"
              >
                <option value="ALL">Semua Klien ({clients.length} PT)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.totalAreaHa} Ha)
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Search box */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Pencarian</label>
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                placeholder="No. dok, mandor, blok..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>

          {/* Block filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Blok Lokasi</label>
            <select
              value={filterBlock}
              onChange={(e) => setFilterBlock(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Semua Blok</option>
              {availableBlocks.map((b) => (
                <option key={b.id} value={b.code}>
                  {b.code} ({b.targetAreaHa} Ha)
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status Persetujuan</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none"
            >
              <option value="ALL">Semua Status</option>
              <option value="Diajukan">Diajukan</option>
              <option value="Disetujui Direktur">Disetujui Direktur</option>
              <option value="Ditolak Direktur">Ditolak Direktur</option>
              <option value="Draft">Draft Lapangan</option>
            </select>
          </div>

          {/* Alert only toggle */}
          <div className="flex items-end">
            <button
              onClick={() => setFilterAlertOnly(!filterAlertOnly)}
              className={`w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition border cursor-pointer ${
                filterAlertOnly
                  ? 'bg-rose-600 text-white border-rose-600 shadow'
                  : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span>Hanya Alert BBM</span>
            </button>
          </div>
        </div>
      </div>

      {/* Reports Table Card (Desktop) & Cards List (Mobile) */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        
        {/* MOBILE VIEW: Responsive Cards (md:hidden) */}
        <div className="md:hidden divide-y divide-slate-100">
          {filteredReports.map((report) => {
            const totalEffHm = report.equipmentWorkLogs.reduce((acc, l) => acc + l.effectiveWorkHours, 0);
            const totalDwWeather = report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeWeatherHours, 0);
            const totalDwBreakdown = report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeBreakdownHours, 0);
            const hasAlert = report.equipmentWorkLogs.some((l) => l.isFuelAlert);
            const isApproved = report.status === 'Disetujui Direktur';

            return (
              <div key={report.id} className="p-4 space-y-2.5 hover:bg-slate-50/70 transition-colors duration-200">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-slate-900 block">
                      {report.reportNumber}
                    </span>
                    <div className="text-[11px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                      <span>{report.date}</span>
                      <span>·</span>
                      <span className="font-semibold text-amber-600">{report.clientName || 'PT. A'}</span>
                      <span>·</span>
                      <span>{report.blockCode}</span>
                    </div>
                  </div>
                  {/* Status Badge */}
                  <div>
                    {isApproved ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        <Check className="w-3 h-3 text-emerald-600" />
                        Disetujui
                      </span>
                    ) : report.status === 'Ditolak Direktur' ? (
                      <span className="bg-rose-50 text-rose-700 border border-rose-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        Ditolak
                      </span>
                    ) : report.status === 'Diajukan' ? (
                      <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        Diajukan
                      </span>
                    ) : (
                      <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-bold text-[10px]">
                        Draft
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Metrics Grid */}
                <div className="grid grid-cols-3 gap-2 py-2 px-3 bg-slate-50/80 rounded-xl border border-slate-100 text-center">
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Realisasi</div>
                    <div className="text-xs font-bold font-mono text-emerald-700">
                      {report.physicalProgress.realizedAreaHa.toFixed(2)} Ha
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Jam Kerja</div>
                    <div className="text-xs font-bold font-mono text-slate-800">
                      {totalEffHm.toFixed(1)} HM
                    </div>
                  </div>
                  <div>
                    <div className="text-[10px] text-slate-400 font-medium">Downtime</div>
                    <div className="text-xs font-bold font-mono text-rose-600">
                      {(totalDwWeather + totalDwBreakdown).toFixed(1)}h
                    </div>
                  </div>
                </div>

                {/* Actions & Alerts */}
                <div className="flex items-center justify-between pt-1">
                  <div>
                    {hasAlert ? (
                      <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black text-[10px] flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-rose-600" />
                        Alert BBM
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 font-medium">Cuaca: {report.weather}</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* 1. LIHAT */}
                    <button
                      type="button"
                      onClick={() => {
                        setViewingReport(report);
                        setIsRejectInputOpen(false);
                        setRejectionReason('');
                      }}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-all duration-200 cursor-pointer"
                      title="Lihat Detail Laporan"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Detail</span>
                    </button>

                    {/* 2. CETAK */}
                    <button
                      type="button"
                      onClick={() => onOpenPdf(report.id)}
                      className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 rounded-lg shadow-xs transition-all duration-200 cursor-pointer"
                      title="Cetak PDF Resmi"
                    >
                      <Printer className="w-3.5 h-3.5" />
                    </button>

                    {/* 3. HAPUS */}
                    <button
                      type="button"
                      onClick={() => {
                        if (window.confirm(`Hapus dokumen laporan ${report.reportNumber}?`)) {
                          onDeleteReport(report.id);
                        }
                      }}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-all duration-200 cursor-pointer"
                      title="Hapus Laporan"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}

          {filteredReports.length === 0 && (
            <div className="p-8 text-center text-slate-400 space-y-2">
              <FileText className="w-8 h-8 text-slate-300 mx-auto" />
              <p className="font-semibold text-slate-600 text-xs">Tidak ada laporan yang sesuai filter.</p>
            </div>
          )}
        </div>

        {/* DESKTOP VIEW: Full Data Table (hidden on mobile, block on md+) */}
        <div className="hidden md:block overflow-x-auto scrollbar-none">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-left">
                <th className="p-3.5">Nomor Laporan</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Klien</th>
                <th className="p-3.5">Blok Kerja</th>
                <th className="p-3.5 text-center">Cuaca</th>
                <th className="p-3.5 text-center">Capaian Ha</th>
                <th className="p-3.5 text-center">Jam Efektif</th>
                <th className="p-3.5 text-center">Downtime</th>
                <th className="p-3.5 text-center">Status BBM</th>
                <th className="p-3.5 text-center">Status</th>
                <th className="p-3.5 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredReports.map((report) => {
                const totalEffHm = report.equipmentWorkLogs.reduce((acc, l) => acc + l.effectiveWorkHours, 0);
                const totalDwWeather = report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeWeatherHours, 0);
                const totalDwBreakdown = report.equipmentWorkLogs.reduce((acc, l) => acc + l.downtimeBreakdownHours, 0);
                const hasAlert = report.equipmentWorkLogs.some((l) => l.isFuelAlert);
                const isApproved = report.status === 'Disetujui Direktur';

                return (
                  <tr key={report.id} className="hover:bg-amber-50/30 transition-colors duration-150">
                    <td className="p-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                      {report.reportNumber}
                    </td>
                    <td className="p-3 text-slate-600 whitespace-nowrap">
                      {report.date}
                    </td>
                    <td className="p-3">
                      <span className="bg-amber-100 text-amber-900 font-bold px-2 py-0.5 rounded text-[11px] whitespace-nowrap">
                        {report.clientName || 'PT. A'}
                      </span>
                    </td>
                    <td className="p-3 font-semibold text-slate-800">
                      {report.blockCode}
                    </td>
                    <td className="p-3 text-center">
                      <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px] font-medium">
                        {report.weather}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-emerald-700">
                      {report.physicalProgress.realizedAreaHa.toFixed(2)} Ha
                    </td>
                    <td className="p-3 text-center font-mono font-bold">
                      {totalEffHm.toFixed(1)} HM
                    </td>
                    <td className="p-3 text-center font-mono">
                      <span className="text-blue-700 font-semibold">{totalDwWeather.toFixed(1)}h C</span>
                      {' / '}
                      <span className="text-rose-600 font-bold">{totalDwBreakdown.toFixed(1)}h B</span>
                    </td>
                    <td className="p-3 text-center">
                      {hasAlert ? (
                        <span className="bg-rose-100 text-rose-800 px-2 py-0.5 rounded font-black text-[10px]">
                          ALERT
                        </span>
                      ) : (
                        <span className="text-emerald-700 font-mono font-bold">Normal</span>
                      )}
                    </td>
                    <td className="p-3 text-center whitespace-nowrap">
                      {isApproved ? (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Disetujui
                        </span>
                      ) : report.status === 'Ditolak Direktur' ? (
                        <button
                          onClick={() => {
                            setViewingReport(report);
                            setIsRejectInputOpen(false);
                          }}
                          className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold text-[10px] hover:bg-rose-200 cursor-pointer"
                          title="Klik untuk melihat catatan keterangan penolakan Direktur"
                        >
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Ditolak Direktur
                        </button>
                      ) : report.status === 'Diajukan' ? (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          Diajukan
                        </span>
                      ) : (
                        <span className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold text-[10px]">
                          Draft
                        </span>
                      )}
                    </td>

                    {/* KOLOM AKSI: 3 TOMBOL (Lihat, Cetak, Hapus) */}
                    <td className="p-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        {/* 1. LIHAT (Ikon Mata) */}
                        <button
                          onClick={() => {
                            setViewingReport(report);
                            setIsRejectInputOpen(false);
                            setRejectionReason('');
                          }}
                          className="p-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-lg shadow-xs transition-all duration-200 cursor-pointer"
                          title="1. Lihat Detail Laporan (Verifikasi / Approval)"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>

                        {/* 2. CETAK (Ikon Print) */}
                        <button
                          onClick={() => onOpenPdf(report.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-amber-400 rounded-lg shadow-xs transition-all duration-200 cursor-pointer"
                          title="2. Cetak Format PDF Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* 3. HAPUS (Ikon Trash) */}
                        <button
                          onClick={() => {
                            if (window.confirm(`Hapus dokumen laporan ${report.reportNumber}?`)) {
                              onDeleteReport(report.id);
                            }
                          }}
                          className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 active:scale-95 rounded-lg transition-all duration-200 cursor-pointer"
                          title="3. Hapus Laporan"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}

              {filteredReports.length === 0 && (
                <tr>
                  <td colSpan={12} className="p-8 text-center text-slate-400">
                    <div className="max-w-xs mx-auto space-y-2">
                      <FileText className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="font-semibold text-slate-600">Tidak ada laporan yang sesuai kriteria filter.</p>
                      <button
                        onClick={() => {
                          setSearchTerm('');
                          setFilterBlock('ALL');
                          setSelectedClientId('ALL');
                          setFilterStatus('ALL');
                          setFilterAlertOnly(false);
                        }}
                        className="text-amber-600 text-xs font-bold underline cursor-pointer"
                      >
                        Reset Filter
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL LIHAT DETAIL LAPORAN (Ikon Mata) */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header Modal */}
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500 text-slate-950 rounded-xl">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-slate-800 px-2 py-0.5 rounded">
                      Dokumen Laporan Harian
                    </span>
                    <span className="font-mono font-bold text-amber-400 text-xs">
                      {viewingReport.reportNumber}
                    </span>
                  </div>
                  <h3 className="font-black text-base text-white">
                    {viewingReport.clientName || 'PT. A'} — {viewingReport.blockCode}
                  </h3>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingReport(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Modal Body (Scrollable) */}
            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Notifikasi Jika Ditolak Direktur */}
              {viewingReport.status === 'Ditolak Direktur' && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-rose-800 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Laporan Ini Berstatus Ditolak oleh Direktur</span>
                  </div>
                  <div className="text-slate-700 space-y-1 pl-7">
                    <div className="text-[11px] text-slate-500 font-medium">
                      Ditolak oleh: <strong>{viewingReport.rejectedBy || 'Direktur'}</strong> ({viewingReport.rejectedAt || 'WIB'})
                    </div>
                    <div className="p-3 bg-white border border-rose-200 rounded-lg text-rose-950 font-semibold italic">
                      Catatan Penolakan: "{viewingReport.rejectionReason || 'Mohon cek kembali sinkronisasi data fisik dan jam alat berat.'}"
                    </div>
                  </div>
                </div>
              )}

              {/* Status Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal & Cuaca</span>
                  <span className="font-bold text-slate-800">{viewingReport.date}</span>
                  <span className="text-[11px] text-slate-500 block">Kondisi: {viewingReport.weather}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Klien & Blok</span>
                  <span className="font-bold text-slate-800">{viewingReport.clientName}</span>
                  <span className="text-[11px] text-amber-700 block font-semibold">{viewingReport.blockCode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pengawas Lapangan</span>
                  <span className="font-bold text-slate-800">{viewingReport.supervisorName}</span>
                  <span className="text-[11px] text-slate-500 block">Shift: {(viewingReport as any).shiftTime || (viewingReport as any).shift || '07:00 - 17:00'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Approval</span>
                  <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[10px] mt-0.5 ${
                    viewingReport.status === 'Disetujui Direktur'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : viewingReport.status === 'Ditolak Direktur'
                      ? 'bg-rose-100 text-rose-800 border border-rose-300'
                      : 'bg-amber-100 text-amber-900 border border-amber-300'
                  }`}>
                    {viewingReport.status}
                  </span>
                </div>
              </div>

              {/* 1. Capaian Fisik Land Clearing */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <span className="w-2 h-2 rounded-full bg-amber-500"></span>
                  1. Capaian Fisik Land Clearing (Metode Tanpa Bakar / Zero Burning)
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  <div className="p-3 bg-amber-50/70 border border-amber-200 rounded-xl">
                    <span className="text-[10px] font-bold text-amber-900 block">Target Harian (Ha)</span>
                    <div className="text-lg font-black font-mono text-amber-950">
                      {viewingReport.physicalProgress.targetAreaHa.toFixed(2)} Ha
                    </div>
                  </div>
                  <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl">
                    <span className="text-[10px] font-bold text-emerald-900 block">Realisasi Hari Ini (Ha)</span>
                    <div className="text-lg font-black font-mono text-emerald-700">
                      {viewingReport.physicalProgress.realizedAreaHa.toFixed(2)} Ha
                    </div>
                  </div>
                  <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl">
                    <span className="text-[10px] font-bold text-blue-900 block">Kumulatif Blok (Ha)</span>
                    <div className="text-lg font-black font-mono text-blue-800">
                      {viewingReport.physicalProgress.cumulativeAreaHa.toFixed(2)} Ha
                    </div>
                  </div>
                  <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                    <span className="text-[10px] font-bold text-indigo-900 block">Progres Terbuka Blok</span>
                    <div className="text-lg font-black font-mono text-indigo-700">
                      {viewingReport.physicalProgress.progressPercentage.toFixed(1)}%
                    </div>
                  </div>
                </div>
                {viewingReport.physicalProgress.notes && (
                  <p className="text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                    <strong>Catatan Lapangan:</strong> {viewingReport.physicalProgress.notes}
                  </p>
                )}
              </div>

              {/* 2. Operasional Alat Berat & Downtime */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                  2. Log Operasional Alat Berat & Downtime (Cuaca vs Breakdown)
                </h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase">
                      <tr>
                        <th className="p-2.5">ID Alat</th>
                        <th className="p-2.5">Operator</th>
                        <th className="p-2.5 text-right">HM Awal</th>
                        <th className="p-2.5 text-right">HM Akhir</th>
                        <th className="p-2.5 text-right">Total HM</th>
                        <th className="p-2.5 text-center">Cuaca</th>
                        <th className="p-2.5 text-center">Breakdown</th>
                        <th className="p-2.5 text-right">Jam Efektif</th>
                        <th className="p-2.5 text-right">BBM (L)</th>
                        <th className="p-2.5 text-center">Rasio BBM</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingReport.equipmentWorkLogs.map((eq, i) => (
                        <tr key={i} className="hover:bg-slate-50">
                          <td className="p-2.5 font-bold text-slate-900 font-mono">{eq.equipmentId}</td>
                          <td className="p-2.5 text-slate-700">{(eq as any).operatorName || eq.equipmentName || '-'}</td>
                          <td className="p-2.5 text-right font-mono">{eq.hmStart.toFixed(1)}</td>
                          <td className="p-2.5 text-right font-mono">{eq.hmEnd.toFixed(1)}</td>
                          <td className="p-2.5 text-right font-mono font-bold">{eq.totalHm.toFixed(1)}</td>
                          <td className="p-2.5 text-center font-mono text-blue-700">{eq.downtimeWeatherHours.toFixed(1)}h</td>
                          <td className="p-2.5 text-center font-mono text-rose-700 font-bold">{eq.downtimeBreakdownHours.toFixed(1)}h</td>
                          <td className="p-2.5 text-right font-mono font-black text-emerald-700">{eq.effectiveWorkHours.toFixed(1)} HM</td>
                          <td className="p-2.5 text-right font-mono">{eq.fuelAddedLiters} L</td>
                          <td className="p-2.5 text-center font-mono">
                            {eq.isFuelAlert ? (
                              <span className="px-1.5 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                {eq.fuelRatio.toFixed(1)} L/HM!
                              </span>
                            ) : (
                              <span className="text-slate-700">{eq.fuelRatio.toFixed(1)} L/HM</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* 3. Logistik BBM & Oli */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                  3. Mutasi Logistik BBM Solar & Oli di Lapangan
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center">
                  <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200">
                    <span className="text-[10px] text-slate-500 block">Stok Awal Tangki</span>
                    <strong className="text-sm font-mono">{viewingReport.logistics.fuelTankInitialLiters} L</strong>
                  </div>
                  <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200">
                    <span className="text-[10px] text-emerald-800 block">Stok Masuk (+Inflow)</span>
                    <strong className="text-sm font-mono text-emerald-700">+{viewingReport.logistics.fuelTankInflowLiters || 0} L</strong>
                  </div>
                  <div className="p-2.5 bg-amber-50 rounded-xl border border-amber-200">
                    <span className="text-[10px] text-amber-900 block">Terpakai Alat (-Outflow)</span>
                    <strong className="text-sm font-mono text-amber-800">-{viewingReport.logistics.fuelTankUsedLiters} L</strong>
                  </div>
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-200">
                    <span className="text-[10px] text-blue-900 block">Sisa Akhir Tangki</span>
                    <strong className="text-sm font-mono text-blue-900">{viewingReport.logistics.fuelTankRemainingLiters} L</strong>
                  </div>
                </div>
              </div>

              {/* 4. Dokumentasi Foto Watermark */}
              {viewingReport.photos && viewingReport.photos.length > 0 && (
                <div className="space-y-2">
                  <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5 border-b border-slate-200 pb-1">
                    <Camera className="w-3.5 h-3.5 text-amber-600" />
                    4. Dokumentasi Foto Lapangan Ber-Watermark GPS ({viewingReport.photos.length} Foto)
                  </h4>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {viewingReport.photos.map((photo, i) => (
                      <div key={i} className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50">
                        <img
                          src={photo.dataUrl}
                          alt={photo.caption}
                          className="w-full h-32 object-cover"
                        />
                        <div className="p-2 text-[10px] text-slate-600">
                          <strong className="block text-slate-900">{photo.caption}</strong>
                          <span className="font-mono text-slate-400">
                            {photo.gpsCoordinates?.lat ? `${photo.gpsCoordinates.lat.toFixed(5)}, ${photo.gpsCoordinates.lng.toFixed(5)}` : '-'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tanda Tangan & Lembar Persetujuan */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <h4 className="font-black text-slate-800 uppercase tracking-wider text-[11px]">
                  Lembar Pengesahan Dokumen
                </h4>
                <div className="grid grid-cols-3 gap-3 text-center">
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Pengawas Lapangan</span>
                    <strong className="text-xs text-slate-900 block mt-1">{viewingReport.signatures.supervisor.name}</strong>
                    <span className="text-[10px] text-emerald-600 font-bold block">✓ Signed</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Site Manager</span>
                    <strong className="text-xs text-slate-900 block mt-1">{viewingReport.signatures.siteManager.name}</strong>
                    <span className="text-[10px] text-emerald-600 font-bold block">✓ Signed</span>
                  </div>
                  <div className="p-2.5 bg-white rounded-lg border border-slate-200">
                    <span className="text-[10px] text-slate-400 block">Direktur Proyek</span>
                    <strong className="text-xs text-slate-900 block mt-1">{viewingReport.signatures.director.name}</strong>
                    <span className={`text-[10px] font-bold block ${
                      viewingReport.status === 'Disetujui Direktur'
                        ? 'text-emerald-600'
                        : viewingReport.status === 'Ditolak Direktur'
                        ? 'text-rose-600'
                        : 'text-amber-600'
                    }`}>
                      {viewingReport.status === 'Disetujui Direktur' ? '✓ Signed' : viewingReport.status === 'Ditolak Direktur' ? '✗ Ditolak' : '⏳ Pending'}
                    </span>
                  </div>
                </div>
              </div>

              {/* INPUT FORM PENOLAKAN OLEH DIREKTUR JIKA DIBUKA */}
              {isRejectInputOpen && (
                <div className="p-4 bg-rose-50 border-2 border-rose-300 rounded-xl space-y-3">
                  <div className="flex items-center gap-2 text-rose-900 font-black text-xs">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span>Konfirmasi Penolakan Laporan (Wajib Beri Catatan Alasan)</span>
                  </div>
                  <p className="text-[11px] text-slate-600">
                    Sebagai Direktur, berikan catatan koreksi yang jelas kepada Pengawas mengenai alasan laporan ini ditolak.
                  </p>
                  <textarea
                    required
                    rows={3}
                    placeholder="Contoh: Realisasi Ha melebihi batas wajar tanpa penjelasan, atau downtime breakdown belum dilengkapi data nomor unit pengganti..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full p-2.5 bg-white border border-rose-300 rounded-lg text-xs font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setIsRejectInputOpen(false)}
                      className="px-3 py-1.5 text-slate-600 hover:bg-slate-200 rounded-lg font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (!rejectionReason.trim()) {
                          alert('Mohon tuliskan catatan keterangan penolakan terlebih dahulu.');
                          return;
                        }
                        if (onRejectReport) {
                          onRejectReport(viewingReport.id, rejectionReason.trim());
                          setViewingReport({
                            ...viewingReport,
                            status: 'Ditolak Direktur',
                            rejectionReason: rejectionReason.trim(),
                            rejectedBy: 'Ir. Hendra Wijaya, M.Si',
                            rejectedAt: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()} WIB`,
                          });
                          setIsRejectInputOpen(false);
                        }
                      }}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-black shadow"
                    >
                      Kirim Penolakan Laporan
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer: BAGIAN AKHIR UNTUK MENYETUJUI ATAU MENOLAK */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => onOpenPdf(viewingReport.id)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs shadow transition cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Cetak Format PDF Resmi</span>
                </button>
              </div>

              {/* ACTION BUTTONS UNTUK DIREKTUR (Menyetujui atau Menolak) */}
              <div className="flex items-center gap-2">
                {isDirector && viewingReport.status !== 'Disetujui Direktur' && (
                  <>
                    {/* Tombol Tolak */}
                    <button
                      type="button"
                      onClick={() => setIsRejectInputOpen(true)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer"
                    >
                      <XCircle className="w-4 h-4" />
                      <span>Tolak Laporan</span>
                    </button>

                    {/* Tombol Setujui */}
                    <button
                      type="button"
                      onClick={() => {
                        onApproveReport(viewingReport.id);
                        setViewingReport({
                          ...viewingReport,
                          status: 'Disetujui Direktur',
                          signatures: {
                            ...viewingReport.signatures,
                            director: {
                              name: 'Ir. Hendra Wijaya, M.Si',
                              signedAt: `${new Date().getDate()}/${new Date().getMonth() + 1}/${new Date().getFullYear()} WIB`,
                              status: 'Signed',
                            },
                          },
                        });
                      }}
                      className="flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow transition cursor-pointer"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      <span>Setujui Laporan Ini</span>
                    </button>
                  </>
                )}

                {viewingReport.status === 'Disetujui Direktur' && (
                  <div className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-100 text-emerald-800 rounded-xl text-xs font-bold border border-emerald-300">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Laporan Resmi Disetujui</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={() => setViewingReport(null)}
                  className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
