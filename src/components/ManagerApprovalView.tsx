import React, { useState } from 'react';
import { 
  ShieldCheck, 
  FileText, 
  Fuel, 
  ClipboardCheck, 
  AlertTriangle, 
  Check, 
  X, 
  XCircle, 
  Clock, 
  Building2, 
  Search, 
  Eye, 
  Printer, 
  Calendar, 
  CheckCircle2, 
  Truck, 
  MapPin, 
  UserCheck, 
  Layers, 
  HardHat, 
  MessageSquare,
  ArrowDownRight,
  ArrowUpRight,
  Filter
} from 'lucide-react';
import { 
  DailyReport, 
  LogisticsTransaction, 
  DailyP2HChecklist, 
  SoilHazardIncident, 
  Client, 
  AuthUser 
} from '../types';
import { storageService } from '../services/storageService';
import { recordUserActivity } from '../utils/activityLogger';

interface ManagerApprovalViewProps {
  authUser: AuthUser | null;
  clients: Client[];
  selectedClientId: string;
  onSelectClientId: (id: string) => void;
  onOpenPdfReport: (reportId: string) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const ManagerApprovalView: React.FC<ManagerApprovalViewProps> = ({
  authUser,
  clients,
  selectedClientId,
  onSelectClientId,
  onOpenPdfReport,
  showToast,
}) => {
  const isManager = authUser?.role === 'manager' || authUser?.userLevel === 'Manager';
  const isDirector = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';
  const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Ir. Hendra Wijaya, M.Si');
  const approverRole: 'manager' | 'director' = isManager ? 'manager' : 'director';

  // Sub-tabs: 'reports' | 'logistics' | 'safety-p2h' | 'history'
  const [activeSubTab, setActiveSubTab] = useState<'reports' | 'logistics' | 'safety-p2h' | 'history'>('reports');

  // Search & Filter
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('pending');

  // Modals state
  const [viewingReport, setViewingReport] = useState<DailyReport | null>(null);
  const [rejectingReportId, setRejectingReportId] = useState<string | null>(null);
  const [reportRejectionReason, setReportRejectionReason] = useState('');

  const [detailLogisticsTx, setDetailLogisticsTx] = useState<LogisticsTransaction | null>(null);
  const [rejectingLogisticsTxId, setRejectingLogisticsTxId] = useState<string | null>(null);
  const [logisticsRejectionReason, setLogisticsRejectionReason] = useState('');

  // Data fetching
  const reports = storageService.getReports(selectedClientId, authUser);
  const logisticsTxs = storageService.getLogisticsTransactions(selectedClientId, authUser);
  const p2hChecklists = storageService.getP2HChecklists(selectedClientId, authUser);
  const soilIncidents = storageService.getSoilIncidents(selectedClientId, authUser);

  // Force re-render state trigger
  const [tick, setTick] = useState(0);
  const reloadAll = () => setTick((prev) => prev + 1);

  // Pending Counts
  const pendingReportsCount = reports.filter((r) => r.status === 'Diajukan' || r.status === 'Draft' || r.status === 'Diverifikasi Mandor').length;
  const pendingLogisticsCount = logisticsTxs.filter((t) => t.approvalStatus === 'pending').length;
  const flaggedP2HCount = p2hChecklists.filter((p) => p.mechanicActionNeeded || p.overallStatus !== 'Layak Operasi').length;
  const activeIncidentsCount = soilIncidents.filter((i) => i.resolvedStatus !== 'Selesai Dievakuasi').length;
  const approvedTotalCount = reports.filter((r) => r.status === 'Disetujui Manager' || r.status === 'Disetujui Direktur').length + 
    logisticsTxs.filter((t) => t.approvalStatus === 'approved').length;

  // Filtered reports
  const filteredReports = reports.filter((r) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = !searchQuery || 
      (r.reportNumber && r.reportNumber.toLowerCase().includes(q)) ||
      (r.blockCode && r.blockCode.toLowerCase().includes(q)) ||
      (r.supervisorName && r.supervisorName.toLowerCase().includes(q)) ||
      (r.clientName && r.clientName.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = r.status === 'Diajukan' || r.status === 'Draft' || r.status === 'Diverifikasi Mandor';
    } else if (statusFilter === 'approved') {
      matchesStatus = r.status === 'Disetujui Manager' || r.status === 'Disetujui Direktur';
    } else if (statusFilter === 'rejected') {
      matchesStatus = r.status === 'Ditolak Manager' || r.status === 'Ditolak Direktur';
    }

    return matchesSearch && matchesStatus;
  });

  // Filtered logistics
  const filteredLogistics = logisticsTxs.filter((t) => {
    const q = (searchQuery || '').toLowerCase();
    const matchesSearch = !searchQuery ||
      (t.itemName && t.itemName.toLowerCase().includes(q)) ||
      (t.equipmentId && t.equipmentId.toLowerCase().includes(q)) ||
      (t.deliveryNoteNumber && t.deliveryNoteNumber.toLowerCase().includes(q)) ||
      (t.submittedByName && t.submittedByName.toLowerCase().includes(q));

    let matchesStatus = true;
    if (statusFilter === 'pending') {
      matchesStatus = t.approvalStatus === 'pending';
    } else if (statusFilter === 'approved') {
      matchesStatus = t.approvalStatus === 'approved';
    } else if (statusFilter === 'rejected') {
      matchesStatus = t.approvalStatus === 'rejected';
    }

    return matchesSearch && matchesStatus;
  });

  // Handler: Approve Daily Report
  const handleApproveReport = (report: DailyReport) => {
    const updated = isManager 
      ? storageService.approveReportByManager(report.id, approverName)
      : storageService.approveReportByDirector(report.id, approverName);

    if (updated) {
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: approverRole,
        actionCategory: 'REPORT',
        actionTitle: `Approval Laporan ${updated.reportNumber}`,
        actionDescription: `${isManager ? 'Manager Operasional' : 'Direktur'} menyetujui secara resmi Laporan Harian ${updated.reportNumber} untuk ${updated.clientName} (Blok ${updated.blockCode}).`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });

      reloadAll();
      showToast(`Laporan ${updated.reportNumber} berhasil disetujui ${isManager ? 'Manager' : 'Direktur'}!`);
      if (viewingReport?.id === report.id) {
        setViewingReport(updated);
      }
    }
  };

  // Handler: Reject Daily Report with reason
  const handleConfirmRejectReport = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingReportId || !reportRejectionReason.trim()) {
      showToast('Mohon isi catatan alasan penolakan secara jelas.', 'warning');
      return;
    }

    const updated = isManager
      ? storageService.rejectReportByManager(rejectingReportId, approverName, reportRejectionReason.trim())
      : storageService.rejectReportByDirector(rejectingReportId, approverName, reportRejectionReason.trim());

    if (updated) {
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: approverRole,
        actionCategory: 'REPORT',
        actionTitle: `Penolakan Laporan ${updated.reportNumber}`,
        actionDescription: `${isManager ? 'Manager Operasional' : 'Direktur'} menolak Laporan Harian ${updated.reportNumber} dengan catatan: "${reportRejectionReason.trim()}".`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });

      reloadAll();
      setRejectingReportId(null);
      setReportRejectionReason('');
      showToast(`Laporan ${updated.reportNumber} ditolak. Catatan penolakan telah diteruskan ke Pengawas.`, 'info');
      if (viewingReport?.id === rejectingReportId) {
        setViewingReport(updated);
      }
    }
  };

  // Handler: Approve Logistics Transaction
  const handleApproveLogistics = (tx: LogisticsTransaction) => {
    let updated: LogisticsTransaction | null = null;
    if (tx.type === 'in') {
      updated = storageService.approveLogisticsInflow(tx.id, approverName, approverRole);
    } else {
      updated = storageService.approveLogisticsOutflow(tx.id, approverName, approverRole);
    }

    if (updated) {
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: approverRole,
        actionCategory: 'LOGISTICS',
        actionTitle: `Approval Logistik: ${updated.itemName}`,
        actionDescription: `${isManager ? 'Manager Operasional' : 'Direktur'} menyetujui mutasi ${updated.type === 'in' ? 'Stok Masuk' : 'Stok Keluar'} ${updated.itemName} (${updated.quantity} ${updated.unit}).`,
        targetEntity: updated.id,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });

      reloadAll();
      showToast(`Mutasi ${updated.type === 'in' ? 'Stok Masuk' : 'Stok Keluar'} ${updated.itemName} resmi disetujui ${isManager ? 'Manager' : 'Direktur'}!`);
      if (detailLogisticsTx?.id === tx.id) {
        setDetailLogisticsTx(updated);
      }
    }
  };

  // Handler: Reject Logistics Transaction with reason
  const handleConfirmRejectLogistics = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingLogisticsTxId || !logisticsRejectionReason.trim()) {
      showToast('Mohon isi catatan alasan penolakan secara jelas.', 'warning');
      return;
    }

    const tx = logisticsTxs.find((t) => t.id === rejectingLogisticsTxId);
    if (!tx) return;

    let updated: LogisticsTransaction | null = null;
    if (tx.type === 'in') {
      updated = storageService.rejectLogisticsInflow(tx.id, approverName, logisticsRejectionReason.trim(), approverRole);
    } else {
      updated = storageService.rejectLogisticsOutflow(tx.id, approverName, logisticsRejectionReason.trim(), approverRole);
    }

    if (updated) {
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: approverRole,
        actionCategory: 'LOGISTICS',
        actionTitle: `Penolakan Logistik: ${updated.itemName}`,
        actionDescription: `${isManager ? 'Manager Operasional' : 'Direktur'} menolak mutasi ${updated.type === 'in' ? 'Stok Masuk' : 'Stok Keluar'} ${updated.itemName} dengan catatan: "${logisticsRejectionReason.trim()}".`,
        targetEntity: updated.id,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });

      reloadAll();
      setRejectingLogisticsTxId(null);
      setLogisticsRejectionReason('');
      showToast(`Mutasi ${updated.type === 'in' ? 'Stok Masuk' : 'Stok Keluar'} ditolak. Catatan telah disimpan.`, 'info');
      if (detailLogisticsTx?.id === tx.id) {
        setDetailLogisticsTx(updated);
      }
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* 1. EXECUTIVE BANNER FOR MANAGER APPROVAL */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/40 text-indigo-300 text-xs font-black uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
              <span>PORTAL OTORISASI &amp; APPROVAL PEKERJAAN PENGAWAS</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <UserCheck className="w-7 h-7 text-amber-400" />
              <span>Approval Pekerjaan Pengawas</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Pusat verifikasi dokumen harian, otorisasi mutasi logistik BBM stok masuk &amp; keluar, evaluasi P2H unit alat berat, serta kontrol mutu pekerjaan lapangan multi-klien.
            </p>
          </div>

          {/* Client PT Selector */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            <div className="bg-slate-950/70 border border-slate-700 rounded-xl px-3 py-2 flex items-center gap-2">
              <Building2 className="w-4 h-4 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-slate-400">Pilih Klien / PT</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => onSelectClientId(e.target.value)}
                  className="bg-transparent text-xs font-black text-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL" className="bg-slate-900 text-white">Semua Portofolio PT (Konsolidasi)</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white">
                      {c.name} — {c.fullCompanyName}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* 2. KPI METRICS CARDS */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          {/* Laporan Menunggu */}
          <div 
            onClick={() => { setActiveSubTab('reports'); setStatusFilter('pending'); }}
            className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 cursor-pointer transition group"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Laporan Diajukan</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5 group-hover:scale-105 transition-transform">{pendingReportsCount}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1">
              <Clock className="w-3 h-3 text-amber-400" /> Butuh Approval
            </div>
          </div>

          {/* Logistik Menunggu */}
          <div 
            onClick={() => { setActiveSubTab('logistics'); setStatusFilter('pending'); }}
            className="bg-slate-950/60 border border-slate-800 hover:border-amber-500/50 rounded-xl p-3 cursor-pointer transition group"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Mutasi Logistik</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5 group-hover:scale-105 transition-transform">{pendingLogisticsCount}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1">
              <Fuel className="w-3 h-3 text-amber-400" /> Masuk &amp; Keluar
            </div>
          </div>

          {/* P2H Butuh Perhatian */}
          <div 
            onClick={() => setActiveSubTab('safety-p2h')}
            className="bg-slate-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-xl p-3 cursor-pointer transition group"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inspeksi P2H</div>
            <div className="text-2xl font-black text-indigo-400 mt-0.5 group-hover:scale-105 transition-transform">{flaggedP2HCount}</div>
            <div className="text-[10px] text-indigo-300/80 mt-0.5 flex items-center gap-1">
              <HardHat className="w-3 h-3 text-indigo-400" /> Perlu Mekanik
            </div>
          </div>

          {/* Insiden K3 Gambut */}
          <div 
            onClick={() => setActiveSubTab('safety-p2h')}
            className="bg-slate-950/60 border border-slate-800 hover:border-rose-500/50 rounded-xl p-3 cursor-pointer transition group"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Insiden K3 / Gambut</div>
            <div className="text-2xl font-black text-rose-400 mt-0.5 group-hover:scale-105 transition-transform">{activeIncidentsCount}</div>
            <div className="text-[10px] text-rose-300/80 mt-0.5 flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-rose-400" /> Hazard Monitor
            </div>
          </div>

          {/* Total Disetujui */}
          <div 
            onClick={() => { setStatusFilter('approved'); }}
            className="bg-slate-950/60 border border-slate-800 hover:border-emerald-500/50 rounded-xl p-3 cursor-pointer transition group"
          >
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Disetujui</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5 group-hover:scale-105 transition-transform">{approvedTotalCount}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Telah Sah
            </div>
          </div>
        </div>
      </div>

      {/* 3. SUB-TAB BAR & CONTROLS */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          {/* Sub Tabs */}
          <div className="flex items-center gap-1 sm:gap-2 overflow-x-auto text-xs font-bold">
            <button
              onClick={() => setActiveSubTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>1. Laporan Harian ({pendingReportsCount})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('logistics')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'logistics'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <Fuel className="w-4 h-4" />
              <span>2. Logistik &amp; BBM ({pendingLogisticsCount})</span>
            </button>

            <button
              onClick={() => setActiveSubTab('safety-p2h')}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
                activeSubTab === 'safety-p2h'
                  ? 'bg-amber-500 text-slate-950 font-black shadow-sm'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              <span>3. Supervisi P2H &amp; K3</span>
            </button>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-bold text-[11px] text-slate-500 uppercase">Status:</span>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="pending">Menunggu Approval</option>
                <option value="approved">Disetujui Sah</option>
                <option value="rejected">Ditolak</option>
                <option value="ALL">Semua Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative w-full max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor dokumen, lokasi blok, alat berat, atau pengawas..."
            className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500"
          />
        </div>
      </div>

      {/* 4. SUB-TAB 1: APPROVAL LAPORAN HARIAN LAND CLEARING */}
      {activeSubTab === 'reports' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-amber-500" />
              <h2 className="font-black text-slate-900 text-sm">
                Daftar Pengajuan Laporan Harian Land Clearing
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total {filteredReports.length} Dokumen
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Dokumen &amp; Tanggal</th>
                  <th className="py-3 px-3.5">Klien &amp; Blok</th>
                  <th className="py-3 px-3.5">Pengawas</th>
                  <th className="py-3 px-3.5 text-center">Progres Fisik</th>
                  <th className="py-3 px-3.5 text-center">Jam Kerja (HM)</th>
                  <th className="py-3 px-3.5 text-center">Konsumsi BBM</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Otorisasi &amp; Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredReports.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      <FileText className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-slate-700">Tidak ada laporan dengan status {statusFilter}.</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Semua laporan yang diajukan telah diproses atau tidak cocok dengan filter.</p>
                    </td>
                  </tr>
                ) : (
                  filteredReports.map((report) => {
                    const totalHm = report.equipmentWorkLogs.reduce((acc, l) => acc + l.effectiveWorkHours, 0);
                    const isPending = report.status === 'Diajukan' || report.status === 'Draft' || report.status === 'Diverifikasi Mandor';
                    const isApproved = report.status === 'Disetujui Manager' || report.status === 'Disetujui Direktur';
                    const isRejected = report.status === 'Ditolak Manager' || report.status === 'Ditolak Direktur';

                    return (
                      <tr key={report.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Dokumen & Tanggal */}
                        <td className="py-3 px-3.5">
                          <div className="font-mono font-bold text-slate-900 text-xs">{report.reportNumber}</div>
                          <div className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
                            <Calendar className="w-3 h-3 text-slate-400" />
                            <span>{report.date}</span>
                          </div>
                        </td>

                        {/* Klien & Blok */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{report.clientName || 'PT. A'}</div>
                          <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-amber-500" />
                            <span>{report.blockCode}</span>
                          </div>
                        </td>

                        {/* Pengawas */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{report.supervisorName}</div>
                          <div className="text-[10px] text-slate-400">Shift: {report.effectiveWorkShift || '07:00 - 17:00'}</div>
                        </td>

                        {/* Progres Fisik */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="font-black font-mono text-emerald-700 text-xs">
                            {report.physicalProgress?.realizedAreaHa?.toFixed(2) ?? '0.00'} Ha
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Target: {report.physicalProgress?.targetAreaHa ?? 4} Ha
                          </div>
                        </td>

                        {/* Jam Kerja HM */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="font-bold font-mono text-slate-800">
                            {totalHm.toFixed(1)} HM
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {report.equipmentWorkLogs.length} Unit Alat
                          </div>
                        </td>

                        {/* Konsumsi BBM */}
                        <td className="py-3 px-3.5 text-center">
                          <div className="font-bold font-mono text-slate-800">
                            {report.logistics?.fuelTankUsedLiters ?? 0} L
                          </div>
                          <div className="text-[10px] text-slate-400">
                            {report.equipmentWorkLogs.some((l) => l.isFuelAlert) ? (
                              <span className="text-rose-600 font-bold">Alert Rasio</span>
                            ) : (
                              <span className="text-emerald-600 font-medium">Normal</span>
                            )}
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {report.status === 'Disetujui Direktur' ? (
                            <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 border border-emerald-300 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <Check className="w-3 h-3 text-emerald-600" />
                              Disetujui Direktur
                            </span>
                          ) : report.status === 'Disetujui Manager' ? (
                            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-800 border border-indigo-300 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <Check className="w-3 h-3 text-indigo-600" />
                              Disetujui Manager
                            </span>
                          ) : report.status === 'Ditolak Manager' ? (
                            <button
                              onClick={() => setViewingReport(report)}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold text-[10px] hover:bg-rose-200 cursor-pointer"
                              title="Klik untuk melihat catatan alasan penolakan"
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Ditolak Manager
                            </button>
                          ) : report.status === 'Ditolak Direktur' ? (
                            <button
                              onClick={() => setViewingReport(report)}
                              className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 border border-rose-300 px-2 py-0.5 rounded-full font-bold text-[10px] hover:bg-rose-200 cursor-pointer"
                              title="Klik untuk melihat catatan alasan penolakan"
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Ditolak Direktur
                            </button>
                          ) : (
                            <span className="inline-flex items-center gap-1 bg-amber-100 text-amber-900 border border-amber-300 px-2 py-0.5 rounded-full font-bold text-[10px]">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              Menunggu Approval
                            </span>
                          )}
                        </td>

                        {/* Otorisasi & Aksi */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {/* Tombol Approval Langsung untuk Manager / Direktur */}
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveReport(report)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                                  title="Setujui Laporan Ini"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingReportId(report.id);
                                    setReportRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                                  title="Tolak Laporan dengan Catatan"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            {/* Tombol Lihat Detail */}
                            <button
                              type="button"
                              onClick={() => setViewingReport(report)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 border border-slate-300 rounded-lg font-bold text-[10px] transition cursor-pointer flex items-center gap-1"
                              title="Lihat Detail Lengkap Laporan"
                            >
                              <Eye className="w-3 h-3" />
                              <span>Detail</span>
                            </button>

                            {/* Tombol Cetak PDF */}
                            <button
                              type="button"
                              onClick={() => onOpenPdfReport(report.id)}
                              className="p-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg shadow-xs transition cursor-pointer"
                              title="Cetak PDF Resmi"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 5. SUB-TAB 2: APPROVAL LOGISTIK & BBM (STOK MASUK & KELUAR) */}
      {activeSubTab === 'logistics' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-4 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Fuel className="w-5 h-5 text-amber-500" />
              <h2 className="font-black text-slate-900 text-sm">
                Otorisasi Mutasi Logistik BBM &amp; Pelumas Lapangan
              </h2>
            </div>
            <span className="text-xs text-slate-500 font-mono">
              Total {filteredLogistics.length} Transaksi Mutasi
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Tanggal &amp; Waktu</th>
                  <th className="py-3 px-3.5 text-center">Tipe Mutasi</th>
                  <th className="py-3 px-3.5">Nama Item / Barang</th>
                  <th className="py-3 px-3.5 text-right">Jumlah</th>
                  <th className="py-3 px-3.5">Unit / Dokumen</th>
                  <th className="py-3 px-3.5">Pelapor</th>
                  <th className="py-3 px-3.5 text-center">Status</th>
                  <th className="py-3 px-3.5 text-center">Otorisasi &amp; Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredLogistics.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="text-center py-10 text-slate-400">
                      <Fuel className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                      <div className="font-bold text-slate-700">Tidak ada transaksi logistik berstatus {statusFilter}.</div>
                      <p className="text-[11px] text-slate-400 mt-0.5">Semua transaksi mutasi stok telah diverifikasi.</p>
                    </td>
                  </tr>
                ) : (
                  filteredLogistics.map((tx) => {
                    const isInflow = tx.type === 'in';
                    const isPending = tx.approvalStatus === 'pending';
                    const isApproved = tx.approvalStatus === 'approved';
                    const isRejected = tx.approvalStatus === 'rejected';

                    return (
                      <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Tanggal & Waktu */}
                        <td className="py-3 px-3.5 font-mono text-slate-700 whitespace-nowrap">
                          <div className="font-bold text-slate-900">{tx.date}</div>
                          <div className="text-[10px] text-slate-400">{tx.timestamp.split(' ')[1] || 'WIB'}</div>
                        </td>

                        {/* Tipe Mutasi */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {isInflow ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ArrowDownRight className="w-3 h-3" />
                              STOK MASUK
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                              <ArrowUpRight className="w-3 h-3" />
                              STOK KELUAR
                            </span>
                          )}
                        </td>

                        {/* Nama Barang */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{tx.itemName}</div>
                          <div className="text-[10px] text-slate-400">{tx.category} • {tx.clientName || 'PT. A'}</div>
                        </td>

                        {/* Jumlah */}
                        <td className="py-3 px-3.5 text-right font-mono font-black text-slate-900">
                          {tx.quantity} <span className="text-[10px] font-normal text-slate-500">{tx.unit}</span>
                        </td>

                        {/* Unit / Dokumen */}
                        <td className="py-3 px-3.5">
                          {isInflow ? (
                            <div>
                              <div className="text-[11px] font-semibold text-slate-700">SJ: {tx.deliveryNoteNumber || '-'}</div>
                              <div className="text-[10px] text-slate-400">PO: {tx.supplierOrPoNumber || '-'}</div>
                            </div>
                          ) : (
                            <div>
                              <div className="font-bold text-amber-800 flex items-center gap-1">
                                <Truck className="w-3 h-3 text-amber-600" />
                                <span>{tx.equipmentId || 'Unit Alat'}</span>
                                {tx.equipmentHmAtUsage ? (
                                  <span className="text-[10px] font-mono text-slate-500 font-normal">({tx.equipmentHmAtUsage} HM)</span>
                                ) : null}
                              </div>
                              <div className="text-[10px] text-slate-500 line-clamp-1">{tx.purpose || 'Operasional Lapangan'}</div>
                            </div>
                          )}
                        </td>

                        {/* Pelapor */}
                        <td className="py-3 px-3.5">
                          <div className="font-semibold text-slate-800">{tx.submittedByName}</div>
                          <div className="text-[10px] text-slate-400">Pengawas Lapangan</div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          {isPending ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                              Menunggu Approval
                            </span>
                          ) : isApproved ? (
                            <div className="inline-flex flex-col items-center">
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                <Check className="w-3 h-3 text-emerald-600" />
                                {tx.approvedByRole === 'manager' ? 'Disetujui Manager' : 'Disetujui Direktur'}
                              </span>
                              <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                                {tx.approvedByDirectorName?.split(' ')[0] || (tx.approvedByRole === 'manager' ? 'Manager' : 'Direktur')}
                              </span>
                            </div>
                          ) : (
                            <button
                              onClick={() => setDetailLogisticsTx(tx)}
                              className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 cursor-pointer"
                              title={tx.rejectionReason || 'Ditolak dengan Catatan'}
                            >
                              <XCircle className="w-3 h-3 text-rose-600" />
                              {tx.approvedByRole === 'manager' ? 'Ditolak Manager' : 'Ditolak'} (Catatan)
                            </button>
                          )}
                        </td>

                        {/* Otorisasi & Aksi */}
                        <td className="py-3 px-3.5 text-center whitespace-nowrap">
                          <div className="inline-flex items-center gap-1.5">
                            {isPending && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleApproveLogistics(tx)}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                                  title="Verifikasi & Setujui Mutasi Logistik"
                                >
                                  <Check className="w-3 h-3" />
                                  <span>Setujui</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setRejectingLogisticsTxId(tx.id);
                                    setLogisticsRejectionReason('');
                                  }}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg font-bold text-[10px] flex items-center gap-1 shadow-xs cursor-pointer transition active:scale-95"
                                  title="Tolak Mutasi dengan Catatan Alasan"
                                >
                                  <X className="w-3 h-3" />
                                  <span>Tolak</span>
                                </button>
                              </>
                            )}

                            <button
                              type="button"
                              onClick={() => setDetailLogisticsTx(tx)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-lg font-bold text-[10px] transition cursor-pointer"
                            >
                              Detail
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 6. SUB-TAB 3: SUPERVISI LAPANGAN P2H & INSIDEN K3 */}
      {activeSubTab === 'safety-p2h' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* P2H Pre-Operation Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                <h3 className="font-black text-slate-900 text-sm">Inspeksi Harian Pra-Operasi Alat (P2H)</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">{p2hChecklists.length} Checklist</span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
              {p2hChecklists.map((p) => {
                const isSafe = p.overallStatus === 'Layak Operasi';
                return (
                  <div key={p.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="font-bold text-slate-900 text-sm flex items-center gap-1.5">
                          <Truck className="w-4 h-4 text-amber-500" />
                          <span>{p.equipmentName} ({p.equipmentId})</span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          Operator: <strong>{p.operatorName}</strong> • Pengawas: <strong>{p.supervisorName}</strong>
                        </div>
                      </div>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase ${
                        isSafe ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {p.overallStatus}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 text-[10px] bg-white p-2 rounded-lg border border-slate-100">
                      <div>Oli Mesin: <span className="font-bold">{p.engineOilLevel}</span></div>
                      <div>Radiator: <span className="font-bold">{p.radiatorCoolant}</span></div>
                      <div>Hidrolik: <span className="font-bold">{p.hydraulicOilAndPressure}</span></div>
                      <div>Track/Undercarriage: <span className="font-bold">{p.undercarriageAndTracks}</span></div>
                    </div>

                    {p.notes && (
                      <p className="text-[11px] text-slate-600 bg-amber-50/70 p-2 rounded border border-amber-100 italic">
                        Catatan: "{p.notes}"
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Insiden K3 & Lahan Gambut Review */}
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-500" />
                <h3 className="font-black text-slate-900 text-sm">Log Insiden Lahan Gambut &amp; Safety K3</h3>
              </div>
              <span className="text-[11px] font-bold text-slate-500 font-mono">{soilIncidents.length} Kejadian</span>
            </div>

            <div className="p-4 space-y-3 flex-1 overflow-y-auto max-h-[500px]">
              {soilIncidents.map((inc) => (
                <div key={inc.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-rose-950 text-sm flex items-center gap-1.5">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>{inc.incidentType}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5">
                        Tanggal: <strong>{inc.date} ({inc.time})</strong> • Unit: <strong>{inc.affectedEquipmentName || '-'}</strong>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-100 text-emerald-800">
                      {inc.resolvedStatus}
                    </span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-100 text-[11px] space-y-1">
                    <div><strong className="text-slate-700">Kondisi Tanah:</strong> {inc.soilCondition}</div>
                    <div><strong className="text-slate-700">Tindakan Evakuasi:</strong> {inc.actionTaken}</div>
                    <div><strong className="text-slate-700">Status Cidera:</strong> {inc.injuryStatus}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: LIHAT DETAIL LAPORAN HARIAN */}
      {viewingReport && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-6 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl overflow-hidden my-auto max-h-[92vh] flex flex-col">
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
                    <span className="font-mono font-bold text-amber-400 text-xs">{viewingReport.reportNumber}</span>
                  </div>
                  <h3 className="font-black text-base text-white">{viewingReport.clientName} — {viewingReport.blockCode}</h3>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingReport(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-5 text-xs">
              {/* Catatan Penolakan Jika Ada */}
              {viewingReport.rejectionReason && (
                <div className="p-4 bg-rose-50 border border-rose-300 rounded-xl space-y-1">
                  <div className="flex items-center gap-2 text-rose-900 font-bold text-sm">
                    <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                    <span>Laporan Ini Berstatus {viewingReport.status}</span>
                  </div>
                  <div className="text-[11px] text-slate-600">
                    Ditolak oleh: <strong>{viewingReport.rejectedBy || 'Manajemen'}</strong> ({viewingReport.rejectedAt || 'WIB'})
                  </div>
                  <p className="p-2.5 bg-white border border-rose-200 rounded-lg text-rose-950 font-semibold italic mt-2">
                    "{viewingReport.rejectionReason}"
                  </p>
                </div>
              )}

              {/* Status Header Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Tanggal &amp; Cuaca</span>
                  <span className="font-bold text-slate-800">{viewingReport.date}</span>
                  <span className="text-[11px] text-slate-600 block">
                    Kondisi: <strong>{viewingReport.weather}</strong>
                    {viewingReport.weatherStartTime && (
                      <span className="text-[10px] text-slate-500 ml-1">
                        ({viewingReport.weatherStartTime} - {viewingReport.weatherEndTime || ''} WIB)
                      </span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Klien &amp; Blok</span>
                  <span className="font-bold text-slate-800">{viewingReport.clientName}</span>
                  <span className="text-[11px] text-amber-700 block font-semibold">{viewingReport.blockCode}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Pengawas Lapangan</span>
                  <span className="font-bold text-slate-800">{viewingReport.supervisorName}</span>
                  <span className="text-[11px] text-slate-500 block">Shift: {viewingReport.effectiveWorkShift || '07:00 - 17:00'}</span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Status Laporan</span>
                  <span className="font-bold text-emerald-700 block text-xs">{viewingReport.status}</span>
                </div>
              </div>

              {/* Capaian Progres Fisik */}
              <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 space-y-2">
                <h4 className="font-black text-amber-950 text-xs uppercase flex items-center gap-1.5">
                  <Layers className="w-4 h-4 text-amber-600" />
                  <span>Capaian Progres Fisik Land Clearing (Metode Tanpa Bakar)</span>
                </h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Target Harian</div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">{viewingReport.physicalProgress?.targetAreaHa ?? 4.0} Ha</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Realisasi Harian</div>
                    <div className="text-base font-black text-emerald-700 font-mono mt-0.5">{viewingReport.physicalProgress?.realizedAreaHa?.toFixed(2) ?? '0.00'} Ha</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Total Kumulatif</div>
                    <div className="text-base font-black text-slate-900 font-mono mt-0.5">{viewingReport.physicalProgress?.cumulativeAreaHa?.toFixed(2) ?? '0.00'} Ha</div>
                  </div>
                  <div className="bg-white p-2.5 rounded-lg border border-amber-200">
                    <div className="text-[10px] text-slate-500 font-bold uppercase">Persentase Blok</div>
                    <div className="text-base font-black text-amber-700 font-mono mt-0.5">{viewingReport.physicalProgress?.progressPercentage?.toFixed(1) ?? '0.0'}%</div>
                  </div>
                </div>

                {/* Rincian Capaian Item Pekerjaan Berdasarkan Target Direktur */}
                {viewingReport.physicalProgress?.itemProgress && viewingReport.physicalProgress.itemProgress.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-amber-200">
                    <span className="text-[10px] font-black uppercase text-amber-900 block mb-1.5">
                      Rincian Capaian Item Kerja (Target Direktur vs Realisasi Pengawas):
                    </span>
                    <div className="overflow-x-auto border border-amber-200 rounded-lg bg-white">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-amber-100/60 uppercase text-[9px] font-black text-amber-950">
                          <tr>
                            <th className="p-2">Item Pekerjaan</th>
                            <th className="p-2 text-center">Target Direktur</th>
                            <th className="p-2 text-center">Realisasi Hari Ini</th>
                            <th className="p-2 text-center">Capaian (%)</th>
                            <th className="p-2">Keterangan / Sektor</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {viewingReport.physicalProgress.itemProgress.map((item, idx) => (
                            <tr key={idx} className="hover:bg-slate-50">
                              <td className="p-2 font-bold text-slate-900">{item.itemName}</td>
                              <td className="p-2 text-center font-mono text-slate-700">{item.targetDailyVolume} {item.unit}</td>
                              <td className="p-2 text-center font-mono font-bold text-emerald-700">{item.realizedDailyVolume} {item.unit}</td>
                              <td className="p-2 text-center font-mono font-black text-amber-700">{item.achievementPercentage}%</td>
                              <td className="p-2 text-slate-500 text-[11px]">{item.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>

              {/* Operasional Unit Alat Berat */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs uppercase flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-slate-600" />
                  <span>Rincian Jam Operasional &amp; Konsumsi BBM Alat Berat</span>
                </h4>
                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 uppercase text-[10px] font-bold text-slate-600">
                      <tr>
                        <th className="p-2">Unit Alat</th>
                        <th className="p-2 text-center">HM Awal - Akhir</th>
                        <th className="p-2 text-center">HM Efektif</th>
                        <th className="p-2 text-center">Downtime</th>
                        <th className="p-2 text-center">Solar (L)</th>
                        <th className="p-2 text-center">Rasio (L/HM)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {viewingReport.equipmentWorkLogs.map((log) => (
                        <tr key={log.equipmentId} className="hover:bg-slate-50">
                          <td className="p-2 font-bold text-slate-900">{log.equipmentName} ({log.equipmentId})</td>
                          <td className="p-2 text-center font-mono">{log.hmStart} - {log.hmEnd}</td>
                          <td className="p-2 text-center font-mono font-bold text-emerald-700">{log.effectiveWorkHours.toFixed(1)} h</td>
                          <td className="p-2 text-center font-mono text-rose-600">{(log.downtimeWeatherHours + log.downtimeBreakdownHours).toFixed(1)} h</td>
                          <td className="p-2 text-center font-mono font-bold">{log.fuelAddedLiters} L</td>
                          <td className="p-2 text-center font-mono font-bold">
                            {log.fuelRatio.toFixed(1)}
                            {log.isFuelAlert && <span className="text-[10px] text-rose-600 ml-1 font-black">!</span>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Catatan Umum Pengawas */}
              {viewingReport.supervisorGeneralNotes && (
                <div className="bg-slate-50 p-3.5 rounded-xl border border-slate-200 space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Catatan Umum Pengawas</span>
                  <p className="text-slate-800 font-medium italic">"{viewingReport.supervisorGeneralNotes}"</p>
                </div>
              )}
            </div>

            {/* Modal Action Footer */}
            <div className="p-4 bg-slate-100 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shrink-0">
              <button
                type="button"
                onClick={() => onOpenPdfReport(viewingReport.id)}
                className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-amber-400 font-bold rounded-xl text-xs shadow transition cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Format PDF Resmi</span>
              </button>

              <div className="flex items-center gap-2">
                {viewingReport.status !== 'Disetujui Direktur' && !(isManager && viewingReport.status === 'Disetujui Manager') && (
                  <>
                    <button
                      type="button"
                      onClick={() => {
                        setRejectingReportId(viewingReport.id);
                        setReportRejectionReason('');
                      }}
                      className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-xs shadow transition cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Tolak Laporan</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleApproveReport(viewingReport)}
                      className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow transition cursor-pointer flex items-center gap-1"
                    >
                      <Check className="w-4 h-4" />
                      <span>Setujui Laporan Ini</span>
                    </button>
                  </>
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

      {/* 8. MODAL: KONFIRMASI PENOLAKAN LAPORAN (Wajib Isi Alasan) */}
      {rejectingReportId && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="border-b border-rose-100 pb-3 flex items-start gap-3">
              <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-rose-900">
                  Konfirmasi Penolakan Laporan Harian
                </h3>
                <p className="text-xs text-slate-500">
                  Sebagai {isManager ? 'Manager Operasional' : 'Direktur'}, berikan catatan alasan penolakan yang wajib diperbaiki oleh Pengawas Lapangan.
                </p>
              </div>
            </div>

            <form onSubmit={handleConfirmRejectReport} className="space-y-3.5 text-xs">
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Catatan / Alasan Penolakan: <span className="text-rose-600">*</span>
                </label>
                <textarea
                  required
                  rows={4}
                  placeholder="Contoh: Realisasi Ha melebihi batas wajar tanpa penjelasan, atau downtime breakdown belum mencantumkan part pengganti..."
                  value={reportRejectionReason}
                  onChange={(e) => setReportRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 border border-rose-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRejectingReportId(null)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer"
                >
                  Kirim Penolakan Laporan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 9. MODAL: KONFIRMASI PENOLAKAN LOGISTIK */}
      {rejectingLogisticsTxId && (() => {
        const tx = logisticsTxs.find((t) => t.id === rejectingLogisticsTxId);
        const isTxIn = tx?.type === 'in';
        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="border-b border-rose-100 pb-3 flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900">
                    Konfirmasi Penolakan {isTxIn ? 'Stok Masuk' : 'Stok Keluar'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sebagai {isManager ? 'Manager Operasional' : 'Direktur'}, berikan catatan alasan penolakan transaksi {tx?.itemName} ({tx?.quantity} {tx?.unit}).
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmRejectLogistics} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Catatan / Alasan Penolakan: <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      isTxIn
                        ? 'Contoh: No Surat Jalan tidak cocok dengan PO pusat, atau volume tera susut...'
                        : 'Contoh: Pemakaian melebihi jam kerja HM alat, atau unit excavator sedang standby...'
                    }
                    value={logisticsRejectionReason}
                    onChange={(e) => setLogisticsRejectionReason(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectingLogisticsTxId(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer"
                  >
                    Tolak {isTxIn ? 'Stok Masuk' : 'Stok Keluar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* 10. MODAL: DETAIL TRANSAKSI LOGISTIK */}
      {detailLogisticsTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${
                  detailLogisticsTx.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'
                }`}>
                  {detailLogisticsTx.type === 'in' ? 'Penerimaan Stok Masuk' : 'Pemakaian Stok Keluar'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">{detailLogisticsTx.itemName}</h3>
              </div>
              <button
                type="button"
                onClick={() => setDetailLogisticsTx(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Tanggal:</span>
                  <div className="font-bold text-slate-800">{detailLogisticsTx.date} ({detailLogisticsTx.timestamp})</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Jumlah:</span>
                  <div className="font-bold text-slate-900 font-mono">{detailLogisticsTx.quantity} {detailLogisticsTx.unit}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Klien &amp; Blok:</span>
                  <div className="font-bold text-slate-800">{detailLogisticsTx.clientName} — {detailLogisticsTx.blockCode}</div>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400">Pelapor:</span>
                  <div className="font-bold text-slate-800">{detailLogisticsTx.submittedByName}</div>
                </div>
              </div>

              {detailLogisticsTx.rejectionReason && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Catatan Penolakan:</span>
                  <p className="text-rose-950 font-medium italic">"{detailLogisticsTx.rejectionReason}"</p>
                </div>
              )}

              {detailLogisticsTx.notes && (
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1">
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Keterangan Lapangan:</span>
                  <p className="text-slate-800 italic">"{detailLogisticsTx.notes}"</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailLogisticsTx(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
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
