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
  Building2
} from 'lucide-react';
import { DailyReport, UserRole, Client, Block } from '../types';
import { storageService } from '../services/storageService';

interface ReportListViewProps {
  reports: DailyReport[];
  onOpenPdf: (reportId: string) => void;
  onNewReport: () => void;
  onDeleteReport: (reportId: string) => void;
  onApproveReport: (reportId: string) => void;
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
  userRole,
  clients,
  selectedClientId,
  setSelectedClientId,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterBlock, setFilterBlock] = useState('ALL');
  const [filterAlertOnly, setFilterAlertOnly] = useState(false);
  const [filterStatus, setFilterStatus] = useState('ALL');

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
      'Drainase (M)',
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
        r.physicalProgress.realizedDrainageM,
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

            <button
              onClick={onNewReport}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Input Laporan Baru</span>
            </button>
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
              <option value="Disetujui Direktur">Disetujui Direktur</option>
              <option value="Diajukan">Diajukan (Menunggu Approval)</option>
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

      {/* Reports Table Card */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-xs">
            <thead>
              <tr className="bg-slate-900 text-white font-bold text-left">
                <th className="p-3.5">Nomor Laporan</th>
                <th className="p-3.5">Tanggal</th>
                <th className="p-3.5">Klien</th>
                <th className="p-3.5">Blok Kerja</th>
                <th className="p-3.5 text-center">Cuaca</th>
                <th className="p-3.5 text-center">Capaian Ha</th>
                <th className="p-3.5 text-center">Drainase (M)</th>
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
                  <tr key={report.id} className="hover:bg-amber-50/30 transition">
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
                    <td className="p-3 text-center font-mono text-blue-700">
                      {report.physicalProgress.realizedDrainageM} M
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
                      <div className="flex items-center justify-center gap-1">
                        {/* Approval button */}
                        {!isApproved && (userRole === 'director' || userRole === 'client') && (
                          <button
                            onClick={() => onApproveReport(report.id)}
                            className="p-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow transition cursor-pointer"
                            title="Setujui Laporan sebagai Direktur"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                          </button>
                        )}

                        {/* PDF print */}
                        <button
                          onClick={() => onOpenPdf(report.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg transition cursor-pointer"
                          title="Buka Format Cetak PDF Resmi"
                        >
                          <Printer className="w-3.5 h-3.5" />
                        </button>

                        {/* Delete report */}
                        {(userRole === 'director' || userRole === 'supervisor') && (
                          <button
                            onClick={() => {
                              onDeleteReport(report.id);
                            }}
                            className="p-1.5 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                            title="Hapus Laporan"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
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
    </div>
  );
};
