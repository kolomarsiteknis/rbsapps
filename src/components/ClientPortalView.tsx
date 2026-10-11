import React, { useState, useMemo } from 'react';
import {
  DailyReport,
  Client,
  Block,
  AuthUser,
} from '../types';
import { storageService } from '../services/storageService';
import {
  Building2,
  FileText,
  Lock,
  CheckCircle2,
  MapPin,
  Calendar,
  Search,
  Eye,
  Printer,
  Layers,
  ShieldCheck,
  TrendingUp,
  Clock,
  CloudRain,
  Sun,
  Truck,
  Camera,
  ChevronDown,
  ChevronUp,
  Filter,
  Award,
  FolderKanban,
  ExternalLink,
} from 'lucide-react';

interface ClientPortalViewProps {
  authUser: AuthUser | null;
  clients: Client[];
  reports: DailyReport[];
  selectedClientId: string;
  onSelectClientId: (clientId: string) => void;
  onViewPdf: (report: DailyReport) => void;
}

export const ClientPortalView: React.FC<ClientPortalViewProps> = ({
  authUser,
  clients,
  reports,
  selectedClientId,
  onSelectClientId,
  onViewPdf,
}) => {
  const [selectedSpkFilter, setSelectedSpkFilter] = useState<string>('ALL');
  const [selectedBlockFilter, setSelectedBlockFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [expandedReportId, setExpandedReportId] = useState<string | null>(null);
  const [previewClientUsername, setPreviewClientUsername] = useState<string>('ALL');

  const isClientRole = authUser?.role === 'client' || authUser?.userLevel === 'Klien';

  // Ambil daftar SPK yang berhak diakses oleh akun yang sedang login
  const authorizedClients = useMemo(() => {
    if (isClientRole) {
      return storageService.getAuthorizedClientsForUser(authUser);
    }
    // Jika Direktur/Manager membuka halaman ini untuk pratinjau:
    if (previewClientUsername !== 'ALL') {
      return clients.filter(
        (c) => (c.username || '').trim().toLowerCase() === previewClientUsername.trim().toLowerCase()
      );
    }
    if (selectedClientId && selectedClientId !== 'ALL') {
      const targetClient = clients.find((c) => c.id === selectedClientId);
      if (targetClient) {
        // Tampilkan juga semua SPK yang satu akun username atau satu perusahaan dengan klien terpilih
        const targetUser = (targetClient.username || '').trim().toLowerCase();
        const targetCompany = (targetClient.fullCompanyName || '').trim().toLowerCase();
        return clients.filter((c) => {
          if (c.id === targetClient.id) return true;
          if (targetUser && (c.username || '').trim().toLowerCase() === targetUser) return true;
          if (targetCompany && (c.fullCompanyName || '').trim().toLowerCase() === targetCompany) return true;
          return false;
        });
      }
    }
    return clients;
  }, [authUser, isClientRole, clients, selectedClientId, previewClientUsername]);

  const authorizedClientIds = useMemo(
    () => new Set(authorizedClients.map((c) => c.id)),
    [authorizedClients]
  );

  const authorizedContracts = useMemo(
    () =>
      new Set(
        authorizedClients
          .map((c) => (c.contractNumber || '').trim().toLowerCase())
          .filter(Boolean)
      ),
    [authorizedClients]
  );

  // Semua blok kerja yang berada di bawah SPK milik klien ini
  const authorizedBlocks = useMemo(() => {
    const allBlocks = storageService.getBlocks('ALL', isClientRole ? authUser : null);
    return allBlocks.filter((b) => authorizedClientIds.has(b.clientId));
  }, [authorizedClientIds, authUser, isClientRole]);

  // Semua laporan harian yang berada di bawah SPK milik klien ini (Isolasi Ketat SPK)
  const authorizedReports = useMemo(() => {
    return reports.filter((r) => {
      const matchId = authorizedClientIds.has(r.clientId);
      const matchContract =
        r.contractNumber && authorizedContracts.has(r.contractNumber.trim().toLowerCase());
      return matchId || matchContract;
    });
  }, [reports, authorizedClientIds, authorizedContracts]);

  // Filter laporan berdasarkan pilihan SPK, Blok, Tanggal, dan Kata Kunci
  const filteredReports = useMemo(() => {
    return authorizedReports
      .filter((r) => {
        if (selectedSpkFilter !== 'ALL' && r.clientId !== selectedSpkFilter) {
          const targetSpk = authorizedClients.find((c) => c.id === selectedSpkFilter);
          if (!targetSpk || r.contractNumber !== targetSpk.contractNumber) {
            return false;
          }
        }
        if (selectedBlockFilter !== 'ALL') {
          const matchBlock =
            r.blockId === selectedBlockFilter ||
            (r.blockCode && r.blockCode.toLowerCase().includes(selectedBlockFilter.toLowerCase()));
          if (!matchBlock) return false;
        }
        if (dateFilter && r.date !== dateFilter) return false;
        if (searchQuery.trim()) {
          const q = searchQuery.trim().toLowerCase();
          const matchText =
            (r.reportNumber && r.reportNumber.toLowerCase().includes(q)) ||
            (r.contractNumber && r.contractNumber.toLowerCase().includes(q)) ||
            (r.clientName && r.clientName.toLowerCase().includes(q)) ||
            (r.projectName && r.projectName.toLowerCase().includes(q)) ||
            (r.blockCode && r.blockCode.toLowerCase().includes(q)) ||
            (r.supervisorName && r.supervisorName.toLowerCase().includes(q)) ||
            (r.physicalProgress?.notes && r.physicalProgress.notes.toLowerCase().includes(q));
          if (!matchText) return false;
        }
        return true;
      })
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [authorizedReports, authorizedClients, selectedSpkFilter, selectedBlockFilter, dateFilter, searchQuery]);

  // Kalkulasi agregat progress untuk SPK yang sedang dipilih (atau seluruh SPK milik Klien)
  const activeSpkClients = useMemo(() => {
    if (selectedSpkFilter === 'ALL') return authorizedClients;
    return authorizedClients.filter((c) => c.id === selectedSpkFilter);
  }, [authorizedClients, selectedSpkFilter]);

  const summaryMetrics = useMemo(() => {
    const activeIds = new Set(activeSpkClients.map((c) => c.id));
    const relevantBlocks = authorizedBlocks.filter((b) => activeIds.has(b.clientId));

    const totalContractHa = activeSpkClients.reduce((acc, c) => acc + (c.totalAreaHa || 0), 0);
    const totalTargetHa =
      totalContractHa > 0
        ? totalContractHa
        : relevantBlocks.reduce((acc, b) => acc + (b.targetAreaHa || 0), 0);

    const totalClearedHa =
      relevantBlocks.length > 0
        ? relevantBlocks.reduce((acc, b) => acc + (b.clearedAreaHa || 0), 0)
        : activeSpkClients.reduce((acc, c) => acc + (c.clearedAreaHa || 0), 0);

    const overallPct = totalTargetHa > 0 ? Math.min(100, (totalClearedHa / totalTargetHa) * 100) : 0;

    const completedBlocks = relevantBlocks.filter((b) => b.status === 'Selesai').length;
    const verifiedReports = filteredReports.filter(
      (r) => r.status === 'Disetujui Direktur' || r.status === 'Disetujui Manager'
    ).length;

    return {
      totalSpkCount: authorizedClients.length,
      activeSpkCount: activeSpkClients.length,
      totalTargetHa,
      totalClearedHa,
      overallPct,
      totalBlocks: relevantBlocks.length,
      completedBlocks,
      totalReports: filteredReports.length,
      verifiedReports,
    };
  }, [activeSpkClients, authorizedClients, authorizedBlocks, filteredReports]);

  // Daftar akun username unik klien (untuk fitur pratinjau oleh Direktur)
  const uniqueClientAccounts = useMemo(() => {
    const map = new Map<string, { username: string; companyName: string; spkCount: number }>();
    clients.forEach((c) => {
      if (c.username) {
        const key = c.username.trim().toLowerCase();
        const existing = map.get(key);
        if (existing) {
          existing.spkCount += 1;
        } else {
          map.set(key, {
            username: c.username.trim(),
            companyName: `${c.name} - ${c.fullCompanyName}`,
            spkCount: 1,
          });
        }
      }
    });
    return Array.from(map.values());
  }, [clients]);

  const primaryClientInfo = authorizedClients[0];

  return (
    <div className="space-y-6 pb-12">
      {/* BANNER UTAMA PORTAL KLIEN (TERKUNCI SESUAI SPK) */}
      <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-teal-950 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-teal-500/30 relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-teal-500 text-slate-950 shadow-sm">
                <Lock className="w-3.5 h-3.5" />
                Level Hak Akses Terkunci: Klien (Monitoring Progress &amp; Laporan)
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-slate-800/90 text-teal-300 border border-teal-500/30">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                Isolasi Data Per Nomor SPK • Read-Only
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
              <Building2 className="w-6 h-6 text-teal-400 shrink-0" />
              <span>
                {primaryClientInfo
                  ? `${primaryClientInfo.fullCompanyName} (${primaryClientInfo.name})`
                  : authUser?.assignedClientName || authUser?.displayName || 'Portal Monitoring Klien'}
              </span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Halaman resmi pemantauan progres fisik pembukaan lahan (<em>Zero Burning Method</em>) dan arsip laporan harian lapangan. Akun Anda memiliki akses ke{' '}
              <strong className="text-teal-300 font-black">
                {authorizedClients.length} Kontrak SPK
              </strong>{' '}
              yang terdaftar pada perusahaan Anda dan terkunci dari SPK milik klien lain.
            </p>
          </div>

          {/* Box Info Akun Klien */}
          <div className="bg-slate-950/80 border border-teal-500/30 rounded-xl p-4 min-w-[260px] space-y-2 shrink-0">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Identitas Akun Akses
              </span>
              <span className="px-2 py-0.5 bg-teal-500/20 text-teal-300 border border-teal-500/40 rounded text-[10px] font-black">
                @{authUser?.username || primaryClientInfo?.username || 'klien'}
              </span>
            </div>
            <div className="text-xs space-y-1">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">PIC / Pengguna:</span>
                <strong className="text-white truncate max-w-[160px]">
                  {authUser?.displayName || primaryClientInfo?.contactPerson || '-'}
                </strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Otoritas Sistem:</span>
                <strong className="text-teal-400 font-bold">Lihat Laporan &amp; PDF</strong>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Total SPK Terhubung:</span>
                <strong className="text-amber-400 font-mono">
                  {authorizedClients.length} Kontrak SPK
                </strong>
              </div>
            </div>
          </div>
        </div>

        {/* Jika Direktur/Manager sedang membuka halaman ini, tampilkan bar pratinjau akun klien */}
        {!isClientRole && (
          <div className="mt-4 pt-3 border-t border-slate-800/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-amber-300 font-semibold">
              <Eye className="w-4 h-4 shrink-0" />
              <span>
                Mode Pratinjau Manajemen: Anda dapat memilih akun Klien tertentu untuk melihat simulasi tampilan multi-SPK mereka.
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-slate-400 font-bold whitespace-nowrap">Filter Akun Klien:</span>
              <select
                value={previewClientUsername}
                onChange={(e) => {
                  setPreviewClientUsername(e.target.value);
                  setSelectedSpkFilter('ALL');
                  setSelectedBlockFilter('ALL');
                }}
                className="px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs font-bold text-white focus:outline-none focus:border-teal-400"
              >
                <option value="ALL">Sesuai Filter Klien Header ({authorizedClients.length} SPK)</option>
                {uniqueClientAccounts.map((acc) => (
                  <option key={acc.username} value={acc.username}>
                    @{acc.username} — {acc.companyName} ({acc.spkCount} SPK)
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* 4 KARTU RINGKASAN EKSEKUTIF MULTI-SPK KLIEN */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Jumlah SPK Klien */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Kontrak SPK Milik Anda
            </span>
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <FolderKanban className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900">
              {summaryMetrics.totalSpkCount} <span className="text-sm font-bold text-slate-500">SPK</span>
            </div>
            <p className="text-[11px] text-teal-700 font-bold mt-0.5">
              {selectedSpkFilter === 'ALL'
                ? `Menampilkan gabungan ${summaryMetrics.totalSpkCount} SPK`
                : 'Menampilkan 1 SPK terpilih'}
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">
            🔒 1 Akun Klien dapat memantau banyak SPK
          </div>
        </div>

        {/* Card 2: Total Progres Fisik Lahan */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Progres Fisik Lahan (Ha)
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="flex items-baseline justify-between">
              <div className="text-2xl font-black text-slate-900">
                {summaryMetrics.overallPct.toFixed(1)}%
              </div>
              <span className="text-xs font-mono font-bold text-emerald-700">
                {summaryMetrics.totalClearedHa.toFixed(1)} / {summaryMetrics.totalTargetHa.toFixed(1)} Ha
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mt-1.5">
              <div
                className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                style={{ width: `${summaryMetrics.overallPct}%` }}
              />
            </div>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">
            Akumulasi realisasi pembersihan lahan SPK
          </div>
        </div>

        {/* Card 3: Lokasi Blok Kerja */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Lokasi Blok Kerja SPK
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-center text-amber-700">
              <Layers className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900">
              {summaryMetrics.totalBlocks} <span className="text-sm font-bold text-slate-500">Blok</span>
            </div>
            <p className="text-[11px] text-amber-800 font-bold mt-0.5">
              {summaryMetrics.completedBlocks} Blok Selesai •{' '}
              {Math.max(0, summaryMetrics.totalBlocks - summaryMetrics.completedBlocks)} Dalam Pengerjaan
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">
            Terdaftar resmi pada SPK perusahaan Anda
          </div>
        </div>

        {/* Card 4: Total Laporan Harian */}
        <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-sm flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-500">
              Laporan Harian SPK
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
              <FileText className="w-4 h-4" />
            </div>
          </div>
          <div className="my-2">
            <div className="text-2xl font-black text-slate-900">
              {summaryMetrics.totalReports}{' '}
              <span className="text-sm font-bold text-slate-500">Laporan</span>
            </div>
            <p className="text-[11px] text-blue-700 font-bold mt-0.5">
              {summaryMetrics.verifiedReports} Laporan Telah Diverifikasi
            </p>
          </div>
          <div className="text-[10px] text-slate-400 font-medium border-t border-slate-100 pt-2">
            Tersedia cetak PDF ber-watermark GPS
          </div>
        </div>
      </div>

      {/* BAGIAN 1: DAFTAR KONTRAK SPK MILIK KLIEN (MULTI-SPK MONITORING) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <FolderKanban className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-black text-slate-900 uppercase">
                1. Monitoring Progress Per Nomor SPK ({authorizedClients.length} Kontrak SPK)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Klik pada salah satu kartu SPK di bawah untuk memfilter laporan khusus SPK tersebut, atau pilih{' '}
              <strong>Semua SPK</strong> untuk memantau seluruh kontrak Anda sekaligus.
            </p>
          </div>

          {authorizedClients.length > 1 && (
            <button
              type="button"
              onClick={() => {
                setSelectedSpkFilter('ALL');
                setSelectedBlockFilter('ALL');
                onSelectClientId('ALL');
              }}
              className={`px-3.5 py-2 rounded-xl text-xs font-black transition cursor-pointer shrink-0 flex items-center gap-1.5 ${
                selectedSpkFilter === 'ALL'
                  ? 'bg-teal-600 text-white shadow-sm'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700'
              }`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Tampilkan Semua SPK ({authorizedClients.length})</span>
            </button>
          )}
        </div>

        {authorizedClients.length === 0 ? (
          <div className="p-10 text-center bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-black text-slate-800 text-sm">
              Belum Ada Data SPK yang Terhubung ke Akun Ini
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Silakan hubungi Direktur / Administrator untuk memastikan Nomor Kontrak / SPK perusahaan Anda telah didaftarkan pada menu Master Data Proyek &rarr; 1. Daftar Klien.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {authorizedClients.map((spk, idx) => {
              const spkBlocks = authorizedBlocks.filter((b) => b.clientId === spk.id);
              const spkReports = authorizedReports.filter(
                (r) => r.clientId === spk.id || (r.contractNumber && r.contractNumber === spk.contractNumber)
              );
              const targetHa =
                spk.totalAreaHa && spk.totalAreaHa > 0
                  ? spk.totalAreaHa
                  : (spkBlocks.length > 0
                      ? spkBlocks.reduce((acc, b) => acc + (b.targetAreaHa || 0), 0)
                      : 0);
              const clearedHa =
                spkBlocks.length > 0
                  ? spkBlocks.reduce((acc, b) => acc + (b.clearedAreaHa || 0), 0)
                  : spk.clearedAreaHa || 0;
              const pct = targetHa > 0 ? Math.min(100, (clearedHa / targetHa) * 100) : 0;
              const isSelected = selectedSpkFilter === spk.id;

              return (
                <div
                  key={spk.id}
                  onClick={() => {
                    const nextFilter = isSelected && authorizedClients.length > 1 ? 'ALL' : spk.id;
                    setSelectedSpkFilter(nextFilter);
                    setSelectedBlockFilter('ALL');
                    onSelectClientId(nextFilter);
                  }}
                  className={`rounded-2xl p-4 border-2 transition cursor-pointer flex flex-col justify-between space-y-3 ${
                    isSelected
                      ? 'border-teal-600 bg-teal-50/30 shadow-md'
                      : 'border-slate-200 bg-white hover:border-teal-400 hover:shadow-sm'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header Nomor SPK */}
                    <div className="bg-gradient-to-r from-teal-500/15 via-teal-500/5 to-transparent border border-teal-300 p-2.5 rounded-xl">
                      <div className="flex items-center justify-between gap-1 mb-1">
                        <span className="px-2 py-0.5 bg-teal-600 text-white font-black text-[9px] uppercase rounded tracking-wider flex items-center gap-1">
                          <Lock className="w-2.5 h-2.5" />
                          SPK #{idx + 1} RESMI KLIEN
                        </span>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            spk.status === 'Aktif'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : 'bg-slate-100 text-slate-700 border border-slate-300'
                          }`}
                        >
                          {spk.status}
                        </span>
                      </div>
                      <div className="font-mono font-black text-slate-950 text-xs sm:text-sm break-all">
                        {spk.contractNumber}
                      </div>
                    </div>

                    {/* Nama Proyek & Lokasi */}
                    <div>
                      <div className="text-sm font-black text-slate-900 leading-snug">
                        {spk.projectName || `Proyek Land Clearing ${spk.name}`}
                      </div>
                      <div className="text-[11px] font-bold text-slate-600 mt-0.5">
                        {spk.fullCompanyName} ({spk.name})
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                        <span className="truncate">{spk.location}</span>
                      </div>
                    </div>

                    {/* Daftar Blok Kerja pada SPK ini */}
                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-black text-slate-700 uppercase">
                        <span>Blok Kerja ({spkBlocks.length} Lokasi):</span>
                        <span className="text-teal-700">{spkReports.length} Laporan Harian</span>
                      </div>
                      {spkBlocks.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                          {spkBlocks.map((b) => (
                            <span
                              key={b.id}
                              className="px-2 py-0.5 bg-white border border-slate-300 rounded text-[10px] font-bold text-slate-800"
                            >
                              {b.code} ({b.clearedAreaHa}/{b.targetAreaHa} Ha)
                            </span>
                          ))}
                        </div>
                      ) : (
                        <div className="text-[10px] text-slate-400 italic">
                          Blok kerja mengikuti kontrak SPK ({spk.totalAreaHa} Ha)
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Progress Bar SPK */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-500 font-bold">Capaian Fisik SPK:</span>
                      <span className="font-mono font-black text-slate-900">
                        {clearedHa.toFixed(1)} / {targetHa.toFixed(1)} Ha ({pct.toFixed(1)}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-teal-600 h-full rounded-full transition-all duration-500"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] font-bold text-teal-700">
                        {isSelected ? '● Sedang Difilter' : 'Klik untuk fokus SPK ini'}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        PIC: {spk.contactPerson}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* BAGIAN 2: DAFTAR LAPORAN HARIAN SESUAI SPK KLIEN (READ-ONLY) */}
      <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <FileText className="w-5 h-5 text-teal-600" />
              <h3 className="text-base font-black text-slate-900 uppercase">
                2. Arsip Laporan Harian Lapangan Sesuai SPK ({filteredReports.length} Laporan)
              </h3>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Anda dapat melihat rincian pelaksanaan pekerjaan harian, jam kerja alat berat, dokumentasi foto GPS, serta mengunduh / mencetak dokumen PDF resmi.
            </p>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Filter SPK (jika punya > 1 SPK) */}
            <select
              value={selectedSpkFilter}
              onChange={(e) => {
                setSelectedSpkFilter(e.target.value);
                setSelectedBlockFilter('ALL');
                onSelectClientId(e.target.value);
              }}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">Semua SPK Milik Anda ({authorizedClients.length} SPK)</option>
              {authorizedClients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.contractNumber} ({c.name})
                </option>
              ))}
            </select>

            {/* Filter Blok */}
            <select
              value={selectedBlockFilter}
              onChange={(e) => setSelectedBlockFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
            >
              <option value="ALL">Semua Lokasi Blok</option>
              {authorizedBlocks
                .filter((b) => selectedSpkFilter === 'ALL' || b.clientId === selectedSpkFilter)
                .map((b) => (
                  <option key={b.id} value={b.code}>
                    {b.code}
                  </option>
                ))}
            </select>

            {/* Filter Tanggal */}
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-teal-500"
            />

            {/* Pencarian */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari No. Laporan, SPK, Blok..."
                className="pl-8 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:border-teal-500 w-48 sm:w-56"
              />
            </div>

            {(selectedSpkFilter !== 'ALL' || selectedBlockFilter !== 'ALL' || dateFilter || searchQuery) && (
              <button
                type="button"
                onClick={() => {
                  setSelectedSpkFilter('ALL');
                  setSelectedBlockFilter('ALL');
                  setDateFilter('');
                  setSearchQuery('');
                  onSelectClientId('ALL');
                }}
                className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold cursor-pointer"
              >
                Reset
              </button>
            )}
          </div>
        </div>

        {/* List Laporan */}
        {filteredReports.length === 0 ? (
          <div className="p-12 text-center bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
            <FileText className="w-10 h-10 text-slate-300 mx-auto" />
            <h4 className="font-black text-slate-800 text-sm">
              Belum Ada Laporan Harian untuk Kriteria SPK Ini
            </h4>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Laporan harian yang diinput oleh pengawas lapangan untuk Nomor SPK Anda akan otomatis tampil di halaman ini secara real-time.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredReports.map((report) => {
              const isExpanded = expandedReportId === report.id;
              const ownerSpk = authorizedClients.find((c) => c.id === report.clientId);
              const totalEffectiveHm = report.equipmentWorkLogs.reduce(
                (acc, l) => acc + (l.effectiveWorkHours || 0),
                0
              );

              return (
                <div
                  key={report.id}
                  className="rounded-2xl border border-slate-200 bg-white hover:border-teal-400 transition shadow-xs overflow-hidden"
                >
                  {/* Baris Utama Laporan */}
                  <div className="p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-2 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="px-2.5 py-1 bg-teal-50 text-teal-900 border border-teal-300 rounded-lg font-mono font-black text-xs flex items-center gap-1">
                          <Lock className="w-3 h-3 text-teal-700" />
                          SPK: {report.contractNumber || ownerSpk?.contractNumber || '-'}
                        </span>
                        <span className="px-2.5 py-1 bg-slate-100 text-slate-800 rounded-lg font-mono font-bold text-xs">
                          #{report.reportNumber}
                        </span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[11px] font-black ${
                            report.status === 'Disetujui Direktur'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : report.status === 'Disetujui Manager'
                              ? 'bg-blue-100 text-blue-800 border border-blue-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {report.status}
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600">
                        <span className="font-black text-slate-900 text-sm">
                          {report.projectName || ownerSpk?.projectName || report.clientName}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-slate-800">
                          <Calendar className="w-3.5 h-3.5 text-teal-600" />
                          {report.date}
                        </span>
                        <span className="flex items-center gap-1 font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          <Layers className="w-3.5 h-3.5 text-amber-600" />
                          {report.blockCode}
                        </span>
                        <span className="flex items-center gap-1">
                          <Sun className="w-3.5 h-3.5 text-amber-500" />
                          Cuaca: <strong>{report.weather}</strong>
                        </span>
                        <span>
                          Pengawas: <strong>{report.supervisorName}</strong>
                        </span>
                      </div>

                      {/* Ringkasan Angka Cepat */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-2">
                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Rata-rata Progres
                          </span>
                          <strong className="text-xs sm:text-sm font-black text-emerald-700 font-mono">
                            {(report.physicalProgress?.itemProgress && report.physicalProgress.itemProgress.length > 0
                              ? (report.physicalProgress.itemProgress.reduce((a, b) => a + (b.achievementPercentage || 0), 0) / report.physicalProgress.itemProgress.length).toFixed(1)
                              : '0.0')}%
                          </strong>
                          <span className="text-[10px] text-slate-400 block">
                            {report.physicalProgress?.itemProgress?.length || 0} Item Kerja
                          </span>
                        </div>

                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Kumulatif Blok
                          </span>
                          <strong className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                            {report.physicalProgress.cumulativeAreaHa} Ha (
                            {report.physicalProgress.progressPercentage.toFixed(1)}%)
                          </strong>
                        </div>

                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Operasional Alat Berat
                          </span>
                          <strong className="text-xs sm:text-sm font-black text-slate-900 font-mono">
                            {report.equipmentWorkLogs.length} Unit ({totalEffectiveHm.toFixed(1)} HM)
                          </strong>
                        </div>

                        <div className="bg-slate-50 px-3 py-2 rounded-xl border border-slate-200">
                          <span className="text-[10px] font-bold text-slate-500 uppercase block">
                            Dokumentasi GPS
                          </span>
                          <strong className="text-xs sm:text-sm font-black text-teal-700 font-mono">
                            {report.photos?.length || 0} Foto Watermark
                          </strong>
                        </div>
                      </div>
                    </div>

                    {/* Tombol Aksi Klien (Hanya Lihat Detail & Cetak PDF — Tanpa Edit/Hapus) */}
                    <div className="flex sm:flex-row lg:flex-col items-stretch sm:items-center justify-end gap-2 shrink-0 border-t lg:border-t-0 pt-3 lg:pt-0 border-slate-100">
                      <button
                        type="button"
                        onClick={() => onViewPdf(report)}
                        className="px-4 py-2.5 bg-teal-600 hover:bg-teal-500 text-white font-black rounded-xl text-xs shadow-sm transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Printer className="w-4 h-4" />
                        <span>Lihat &amp; Cetak PDF Resmi</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedReportId(isExpanded ? null : report.id)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-xl text-xs transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-teal-700" />
                        <span>{isExpanded ? 'Tutup Rincian' : 'Rincian Laporan'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-3.5 h-3.5" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5" />
                        )}
                      </button>
                    </div>
                  </div>

                  {/* Panel Rincian Laporan (Read-Only) */}
                  {isExpanded && (
                    <div className="bg-slate-50 border-t border-slate-200 p-4 sm:p-5 space-y-4 text-xs">
                      {/* Catatan Progres Lapangan */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200">
                        <span className="text-[10px] font-black uppercase text-slate-500 block mb-1">
                          Catatan &amp; Evaluasi Progres Harian Lapangan:
                        </span>
                        <p className="text-slate-800 font-medium leading-relaxed">
                          {report.physicalProgress.notes || 'Pekerjaan berjalan sesuai prosedur Zero Burning Method.'}
                        </p>
                      </div>

                      {/* Realisasi Item Pekerjaan */}
                      {report.physicalProgress.itemProgress && report.physicalProgress.itemProgress.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-700 block">
                            Rincian Realisasi Item Pekerjaan ({report.physicalProgress.itemProgress.length} Item):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                            {report.physicalProgress.itemProgress.map((wi, idx) => (
                              <div
                                key={idx}
                                className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-2"
                              >
                                <span className="font-bold text-slate-800">{wi.itemName}</span>
                                <span className="px-2 py-0.5 bg-teal-100 text-teal-900 rounded font-mono font-black text-[11px]">
                                  {wi.realizedDailyVolume} / {wi.targetDailyVolume} {wi.unit}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Tabel Jam Kerja Alat Berat */}
                      {report.equipmentWorkLogs && report.equipmentWorkLogs.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-700 block">
                            Log Operasional Unit Alat Berat:
                          </span>
                          <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-slate-100 text-slate-700 text-[10px] uppercase">
                                  <th className="py-2 px-3">Unit Alat Berat</th>
                                  <th className="py-2 px-3">HM Awal &rarr; Akhir</th>
                                  <th className="py-2 px-3">Jam Efektif</th>
                                  <th className="py-2 px-3">Downtime Cuaca</th>
                                  <th className="py-2 px-3">Downtime Teknis</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-slate-100">
                                {report.equipmentWorkLogs.map((eq, i) => (
                                  <tr key={i}>
                                    <td className="py-2 px-3 font-bold text-slate-900">
                                      {eq.equipmentName} ({eq.equipmentId})
                                    </td>
                                    <td className="py-2 px-3 font-mono">
                                      {eq.hmStart} &rarr; {eq.hmEnd} ({eq.totalHm} HM)
                                    </td>
                                    <td className="py-2 px-3 font-mono font-black text-emerald-700">
                                      {eq.effectiveWorkHours} Jam
                                    </td>
                                    <td className="py-2 px-3 font-mono text-slate-600">
                                      {eq.downtimeWeatherHours} Jam
                                    </td>
                                    <td className="py-2 px-3 font-mono text-slate-600">
                                      {eq.downtimeBreakdownHours} Jam
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Dokumentasi Foto Ber-Watermark GPS */}
                      {report.photos && report.photos.length > 0 && (
                        <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                          <span className="text-[10px] font-black uppercase text-slate-700 flex items-center gap-1.5">
                            <Camera className="w-3.5 h-3.5 text-teal-600" />
                            Dokumentasi Foto Lapangan Ber-Watermark GPS ({report.photos.length} Foto):
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                            {report.photos.map((photo) => (
                              <div
                                key={photo.id}
                                className="rounded-xl overflow-hidden border border-slate-200 bg-slate-900 text-white"
                              >
                                <img
                                  src={photo.dataUrl}
                                  alt={photo.caption}
                                  className="w-full h-40 object-cover"
                                />
                                <div className="p-2.5 space-y-1 text-[11px]">
                                  <div className="font-bold text-white">{photo.caption}</div>
                                  <div className="font-mono text-[10px] text-teal-300">
                                    📍 GPS: {photo.gpsCoordinates.lat.toFixed(5)},{' '}
                                    {photo.gpsCoordinates.lng.toFixed(5)}
                                  </div>
                                  <div className="text-[10px] text-slate-400">{photo.timestamp}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
