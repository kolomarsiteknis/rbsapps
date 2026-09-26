import React, { useState, useMemo } from 'react';
import { 
  ShieldAlert, 
  Activity, 
  MapPin, 
  Search, 
  Filter, 
  Calendar, 
  Download, 
  Printer, 
  ExternalLink, 
  Eye, 
  Smartphone, 
  Monitor, 
  Clock, 
  User, 
  CheckCircle2, 
  AlertTriangle, 
  RefreshCw, 
  Trash2, 
  ChevronRight, 
  Compass, 
  Layers, 
  Wifi, 
  FileText, 
  Wrench, 
  Camera, 
  Fuel, 
  Check, 
  Copy,
  Info,
  X
} from 'lucide-react';
import { AuthUser, UserActivityLog, ActivityActionCategory, UserRole } from '../types';
import { storageService } from '../services/storageService';

interface UserActivityAuditLogViewProps {
  authUser: AuthUser;
  showToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
}

export const UserActivityAuditLogView: React.FC<UserActivityAuditLogViewProps> = ({
  authUser,
  showToast,
}) => {
  // STRICT ACCESS CONTROL: Only Director
  if (authUser?.role !== 'director') {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-black text-slate-900 text-base">Akses Khusus Direktur / Superadmin</h3>
        <p className="text-xs text-slate-600">
          Menu Log Riwayat Aktivitas & Tag Lokasi GPS Pengguna hanya memiliki otorisasi akses untuk Direktur.
        </p>
      </div>
    );
  }

  // State management
  const [logs, setLogs] = useState<UserActivityLog[]>(() => storageService.getUserActivities());
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [selectedUserFilter, setSelectedUserFilter] = useState<string>('ALL');
  const [selectedRoleFilter, setSelectedRoleFilter] = useState<string>('ALL');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');
  const [selectedDateFilter, setSelectedDateFilter] = useState<string>('');
  const [activeViewMode, setActiveViewMode] = useState<'table' | 'timeline' | 'map'>('table');
  const [selectedDetailLog, setSelectedDetailLog] = useState<UserActivityLog | null>(null);
  const [isCopied, setIsCopied] = useState<boolean>(false);

  // Reload logs
  const handleRefresh = () => {
    const updated = storageService.getUserActivities();
    setLogs(updated);
    showToast('Log aktivitas pengguna berhasil diperbarui.', 'info');
  };

  // Clear logs confirmation
  const handleClearLogs = () => {
    if (window.confirm('PERINGATAN: Apakah Anda yakin ingin mengosongkan seluruh riwayat log aktivitas pengguna? Tindakan ini tidak dapat dibatalkan.')) {
      storageService.clearUserActivities();
      setLogs([]);
      showToast('Seluruh riwayat log aktivitas telah dibersihkan.', 'warning');
    }
  };

  // Filtered logs
  const filteredLogs = useMemo(() => {
    return logs.filter((item) => {
      const matchSearch = searchTerm === '' ||
        item.userName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.actionTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.actionDescription.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.targetEntity && item.targetEntity.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.gpsTag && item.gpsTag.locationName.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (item.userEmail && item.userEmail.toLowerCase().includes(searchTerm.toLowerCase()));

      const matchUser = selectedUserFilter === 'ALL' || item.userName === selectedUserFilter;
      const matchRole = selectedRoleFilter === 'ALL' || item.userRole === selectedRoleFilter;
      const matchCategory = selectedCategoryFilter === 'ALL' || item.actionCategory === selectedCategoryFilter;
      
      const matchDate = selectedDateFilter === '' || item.timestamp.startsWith(selectedDateFilter);

      return matchSearch && matchUser && matchRole && matchCategory && matchDate;
    });
  }, [logs, searchTerm, selectedUserFilter, selectedRoleFilter, selectedCategoryFilter, selectedDateFilter]);

  // Executive Metrics
  const metrics = useMemo(() => {
    const total = logs.length;
    const supervisorActions = logs.filter((l) => l.userRole === 'supervisor').length;
    const directorActions = logs.filter((l) => l.userRole === 'director').length;
    const gpsTagged = logs.filter((l) => l.gpsTag && l.gpsTag.accuracy <= 10).length;
    const uniqueUsers = Array.from(new Set(logs.map((l) => l.userName))).length;

    return {
      total,
      supervisorActions,
      directorActions,
      gpsTagged,
      uniqueUsers,
    };
  }, [logs]);

  // Get Unique Users for Dropdown
  const uniqueUsersList = useMemo(() => {
    return Array.from(new Set(logs.map((l) => l.userName)));
  }, [logs]);

  // Category Badge Helper
  const getCategoryBadge = (category: ActivityActionCategory) => {
    switch (category) {
      case 'AUTH':
        return { label: 'Autentikasi / Sesi', color: 'bg-indigo-100 text-indigo-700 border-indigo-200' };
      case 'REPORT':
        return { label: 'Laporan Harian', color: 'bg-amber-100 text-amber-800 border-amber-200' };
      case 'P2H':
        return { label: 'Inspeksi P2H', color: 'bg-blue-100 text-blue-800 border-blue-200' };
      case 'CAMERA_GEOTAG':
        return { label: 'Geotag Foto GPS', color: 'bg-emerald-100 text-emerald-800 border-emerald-200' };
      case 'HM_CALCULATOR':
        return { label: 'Audit HM Alat', color: 'bg-purple-100 text-purple-800 border-purple-200' };
      case 'FUEL_BOWSER':
        return { label: 'Solar Bowser', color: 'bg-orange-100 text-orange-800 border-orange-200' };
      case 'SOIL_INCIDENT':
        return { label: 'Insiden Gambut', color: 'bg-rose-100 text-rose-800 border-rose-200' };
      case 'LOGISTICS':
        return { label: 'Logistik BBM', color: 'bg-cyan-100 text-cyan-800 border-cyan-200' };
      case 'MASTER_DATA':
        return { label: 'Master Data', color: 'bg-slate-100 text-slate-800 border-slate-200' };
      case 'NAVIGATION':
        return { label: 'Akses Navigasi', color: 'bg-zinc-100 text-zinc-700 border-zinc-200' };
      case 'EXPORT':
        return { label: 'Export / Cetak', color: 'bg-teal-100 text-teal-800 border-teal-200' };
      default:
        return { label: category, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  // Export CSV
  const handleExportCSV = () => {
    if (filteredLogs.length === 0) {
      showToast('Tidak ada data log untuk diekspor.', 'warning');
      return;
    }

    const headers = [
      'ID Log',
      'Waktu & Tanggal',
      'Nama Pengguna',
      'Role',
      'Email',
      'Kategori',
      'Judul Aksi',
      'Deskripsi Aktivitas',
      'Target Entitas',
      'Klien',
      'Blok',
      'Latitude',
      'Longitude',
      'Akurasi (Meter)',
      'Lokasi GPS',
      'Tipe Perangkat',
      'Browser',
      'Status Jaringan'
    ];

    const rows = filteredLogs.map((item) => [
      `"${item.id}"`,
      `"${item.formattedTime}"`,
      `"${item.userName}"`,
      `"${item.userRole === 'director' ? 'Direktur' : 'Pengawas Lapangan'}"`,
      `"${item.userEmail || ''}"`,
      `"${item.actionCategory}"`,
      `"${item.actionTitle.replace(/"/g, '""')}"`,
      `"${item.actionDescription.replace(/"/g, '""')}"`,
      `"${item.targetEntity || ''}"`,
      `"${item.clientName || ''}"`,
      `"${item.blockCode || ''}"`,
      item.gpsTag?.lat || '',
      item.gpsTag?.lng || '',
      item.gpsTag?.accuracy || '',
      `"${item.gpsTag?.locationName || ''}"`,
      `"${item.deviceInfo.deviceType}"`,
      `"${item.deviceInfo.browser}"`,
      `"${item.deviceInfo.isOnline ? 'Online' : 'Offline'}"`
    ]);

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `SURYALAND_USER_ACTIVITY_LOG_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    showToast(`Berhasil mengekspor ${filteredLogs.length} data log aktivitas ke CSV.`, 'success');
  };

  // Copy JSON of single log
  const handleCopyJson = (log: UserActivityLog) => {
    navigator.clipboard.writeText(JSON.stringify(log, null, 2));
    setIsCopied(true);
    showToast('Salinan data JSON berhasil disalin ke clipboard.', 'info');
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-rose-500 text-white flex items-center gap-1 shadow-sm">
                <ShieldAlert className="w-3 h-3" />
                Khusus Direktur (Superadmin)
              </span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-sky-400 animate-spin-slow" />
                Real-Time GPS Location Tracking Audit
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Log Riwayat Aktivitas & Tag Lokasi GPS Pengguna
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-3xl leading-relaxed">
              Audit trail forensik terhadap seluruh interaksi pengawas lapangan dan staf saat mengoperasikan aplikasi, dilengkapi perekaman koordinat satelit GPS presisi, riwayat input P2H, unggahan foto progres, laporan harian, serta tipe perangkat.
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleRefresh}
              className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 active:scale-95 text-slate-200 rounded-xl text-xs font-bold transition-all border border-slate-700 cursor-pointer shadow-xs"
              title="Perbarui log aktivitas terbaru"
            >
              <RefreshCw className="w-3.5 h-3.5 text-sky-400" />
              <span>Refresh Log</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm"
              title="Unduh log riwayat ke format CSV/Excel"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>

            <button
              onClick={handleClearLogs}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-950/60 hover:bg-rose-900 text-rose-300 rounded-xl text-xs font-bold transition-all border border-rose-800/60 cursor-pointer"
              title="Bersihkan riwayat log"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Bersihkan</span>
            </button>
          </div>
        </div>

        {/* 4 EXECUTIVE KPI SUMMARY TILES */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/90">
          
          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Total Interaksi</span>
              <Activity className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-2xl font-black text-white">
              {metrics.total}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Terekam di sistem lokal & cloud
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Aksi Pengawas Lapangan</span>
              <User className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-2xl font-black text-amber-400">
              {metrics.supervisorActions}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Dari {metrics.uniqueUsers} pengguna terdaftar
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Koordinat GPS Akurat</span>
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <div className="text-2xl font-black text-emerald-400">
              {metrics.gpsTagged}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Akurasi satelit tinggi (≤10 meter)
            </div>
          </div>

          <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700">
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Aksi Direktur</span>
              <ShieldAlert className="w-3.5 h-3.5 text-purple-400" />
            </div>
            <div className="text-2xl font-black text-purple-300">
              {metrics.directorActions}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              Approval & monitoring direksi
            </div>
          </div>

        </div>
      </div>

      {/* 2. VIEW MODE TOGGLE & FILTER TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 space-y-3">
        
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          
          {/* Search bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama pengawas, aksi, lokasi GPS, target alat, atau email..."
              className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* View mode switcher */}
          <div className="flex items-center bg-slate-100 p-1 rounded-xl shrink-0">
            <button
              type="button"
              onClick={() => setActiveViewMode('table')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'table'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tabel Rinci
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('timeline')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'timeline'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Kronologi Feed
            </button>
            <button
              type="button"
              onClick={() => setActiveViewMode('map')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeViewMode === 'map'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Sebaran Peta GPS
            </button>
          </div>

        </div>

        {/* Filters Strip */}
        <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100">
          
          {/* User Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400">Pengguna:</span>
            <select
              value={selectedUserFilter}
              onChange={(e) => setSelectedUserFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Pengguna ({uniqueUsersList.length})</option>
              {uniqueUsersList.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

          {/* Role Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400">Role:</span>
            <select
              value={selectedRoleFilter}
              onChange={(e) => setSelectedRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Role</option>
              <option value="supervisor">Pengawas Lapangan</option>
              <option value="director">Direktur</option>
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-bold text-slate-400">Kategori:</span>
            <select
              value={selectedCategoryFilter}
              onChange={(e) => setSelectedCategoryFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
            >
              <option value="ALL">Semua Kategori Aktivitas</option>
              <option value="AUTH">Login / Sesi Masuk</option>
              <option value="REPORT">Laporan Harian Lapangan</option>
              <option value="P2H">Inspeksi Pra-Operasi P2H</option>
              <option value="CAMERA_GEOTAG">Foto Geotagging Progres</option>
              <option value="FUEL_BOWSER">Penerimaan Solar Bowser</option>
              <option value="SOIL_INCIDENT">Insiden Gambut & K3</option>
              <option value="HM_CALCULATOR">Audit Discrepancy HM</option>
              <option value="LOGISTICS">Logistik & Stok BBM</option>
              <option value="MASTER_DATA">Master Data Klien/Alat</option>
              <option value="NAVIGATION">Akses Menu Fitur</option>
            </select>
          </div>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-slate-50 border border-slate-200 rounded-lg ml-auto">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={selectedDateFilter}
              onChange={(e) => setSelectedDateFilter(e.target.value)}
              className="text-xs bg-transparent focus:outline-none cursor-pointer"
            />
            {selectedDateFilter && (
              <button
                onClick={() => setSelectedDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer"
                title="Reset Tanggal"
              >
                ×
              </button>
            )}
          </div>

        </div>

      </div>

      {/* ========================================================================= */}
      {/* 3. VIEW MODE 1: TABEL AUDIT RINCI */}
      {/* ========================================================================= */}
      {activeViewMode === 'table' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-500" />
              <span>Daftar Catatan Aktivitas & Tag Lokasi GPS ({filteredLogs.length} Entri)</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              Diurutkan dari aktivitas terbaru
            </span>
          </div>

          {filteredLogs.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <CheckCircle2 className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Tidak ada log aktivitas yang cocok dengan filter</p>
              <p className="text-xs text-slate-500">Silakan ubah kata kunci pencarian atau reset filter di atas.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Waktu & Tanggal</th>
                    <th className="py-3 px-3">Pengguna</th>
                    <th className="py-3 px-3">Kategori & Tindakan</th>
                    <th className="py-3 px-3">Tag Lokasi GPS Lapangan</th>
                    <th className="py-3 px-3">Detail Deskripsi Aktivitas</th>
                    <th className="py-3 px-3">Perangkat</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredLogs.map((item) => {
                    const badge = getCategoryBadge(item.actionCategory);
                    const isDirector = item.userRole === 'director';
                    return (
                      <tr 
                        key={item.id}
                        className="hover:bg-slate-50/80 transition-colors"
                      >
                        {/* 1. Time */}
                        <td className="py-3 px-3.5 whitespace-nowrap">
                          <strong className="text-slate-900 block font-mono text-[11px]">
                            {item.formattedTime.split(',')[1] || item.formattedTime}
                          </strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {item.formattedTime.split(',')[0]}
                          </span>
                        </td>

                        {/* 2. User */}
                        <td className="py-3 px-3">
                          <div className="flex items-center gap-2">
                            <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                              isDirector ? 'bg-purple-600' : 'bg-amber-600'
                            }`}>
                              {item.userName.charAt(0)}
                            </div>
                            <div>
                              <strong className="text-slate-900 block leading-tight">
                                {item.userName}
                              </strong>
                              <span className={`inline-block px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider ${
                                isDirector ? 'bg-purple-100 text-purple-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {isDirector ? 'Direktur' : 'Pengawas'}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* 3. Action & Category */}
                        <td className="py-3 px-3">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wider border mb-1 ${badge.color}`}>
                            {badge.label}
                          </span>
                          <strong className="text-slate-900 block text-xs leading-tight">
                            {item.actionTitle}
                          </strong>
                          {item.targetEntity && (
                            <span className="text-[10px] font-mono text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded inline-block mt-0.5">
                              {item.targetEntity}
                            </span>
                          )}
                        </td>

                        {/* 4. GPS Location Tag */}
                        <td className="py-3 px-3">
                          {item.gpsTag ? (
                            <div className="space-y-0.5">
                              <a
                                href={item.gpsTag.mapsUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 font-mono font-bold text-sky-700 hover:text-sky-900 hover:underline text-[11px]"
                                title="Klik untuk membuka titik koordinat di Google Maps"
                              >
                                <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                                <span>{item.gpsTag.lat.toFixed(5)}, {item.gpsTag.lng.toFixed(5)}</span>
                                <ExternalLink className="w-2.5 h-2.5 opacity-60" />
                              </a>
                              <div className="text-[10px] text-slate-600 leading-tight">
                                {item.gpsTag.locationName}
                              </div>
                              <span className="inline-block text-[9px] px-1 py-0.2 rounded bg-emerald-50 text-emerald-700 font-semibold border border-emerald-200">
                                Akurasi ±{item.gpsTag.accuracy}m
                              </span>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic text-[11px]">N/A (Tanpa Tag)</span>
                          )}
                        </td>

                        {/* 5. Details */}
                        <td className="py-3 px-3 max-w-xs">
                          <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                            {item.actionDescription}
                          </p>
                          {(item.clientName || item.blockCode) && (
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              {item.clientName} {item.blockCode ? `· ${item.blockCode}` : ''}
                            </div>
                          )}
                        </td>

                        {/* 6. Device & Network */}
                        <td className="py-3 px-3 whitespace-nowrap">
                          <div className="flex items-center gap-1 text-[11px] font-medium text-slate-700">
                            {item.deviceInfo.deviceType === 'Mobile' ? (
                              <Smartphone className="w-3.5 h-3.5 text-amber-500" />
                            ) : (
                              <Monitor className="w-3.5 h-3.5 text-slate-500" />
                            )}
                            <span>{item.deviceInfo.deviceType}</span>
                          </div>
                          <div className="text-[9px] text-slate-400 truncate max-w-[120px]" title={item.deviceInfo.browser}>
                            {item.deviceInfo.browser}
                          </div>
                          <span className={`inline-flex items-center gap-1 text-[9px] font-bold ${
                            item.deviceInfo.isOnline ? 'text-emerald-600' : 'text-slate-400'
                          }`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${item.deviceInfo.isOnline ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                            {item.deviceInfo.isOnline ? 'Online' : 'Offline'}
                          </span>
                        </td>

                        {/* 7. Action Button */}
                        <td className="py-3 px-3 text-center whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => setSelectedDetailLog(item)}
                            className="p-1.5 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            title="Lihat rincian lengkap log"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW MODE 2: KRONOLOGI FEED (TIMELINE VIEW) */}
      {/* ========================================================================= */}
      {activeViewMode === 'timeline' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              <span>Kronologi Alur Aktivitas Pengguna Terkini</span>
            </h3>
            <span className="text-[11px] text-slate-500">
              {filteredLogs.length} Kejadian Tercatat
            </span>
          </div>

          <div className="relative pl-6 space-y-6 before:content-[''] before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
            {filteredLogs.map((item) => {
              const badge = getCategoryBadge(item.actionCategory);
              const isDirector = item.userRole === 'director';
              return (
                <div key={item.id} className="relative group">
                  {/* Pin Dot */}
                  <div className={`absolute -left-6 top-1.5 w-4 h-4 rounded-full border-2 border-white shadow-xs ${
                    isDirector ? 'bg-purple-600' : 'bg-amber-500'
                  }`} />

                  {/* Card Content */}
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 hover:bg-white transition-all space-y-2">
                    
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider border ${badge.color}`}>
                          {badge.label}
                        </span>
                        <h4 className="text-sm font-black text-slate-900">
                          {item.actionTitle}
                        </h4>
                      </div>
                      <span className="text-[11px] font-mono font-semibold text-slate-500">
                        {item.formattedTime}
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed">
                      {item.actionDescription}
                    </p>

                    {/* Metadata strip */}
                    <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-200/60 text-xs">
                      <div className="flex items-center gap-1.5 font-bold text-slate-800">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <span>{item.userName}</span>
                        <span className="text-[10px] text-slate-400 font-normal">({item.userRole})</span>
                      </div>

                      {item.gpsTag && (
                        <a
                          href={item.gpsTag.mapsUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-2 py-0.5 rounded-md bg-sky-50 text-sky-800 font-medium text-[11px] border border-sky-200 hover:underline"
                        >
                          <MapPin className="w-3 h-3 text-sky-600 shrink-0" />
                          <span>{item.gpsTag.locationName}</span>
                          <span className="text-sky-600 font-mono text-[10px] font-bold">({item.gpsTag.lat.toFixed(4)}, {item.gpsTag.lng.toFixed(4)})</span>
                        </a>
                      )}

                      {item.targetEntity && (
                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-[10px]">
                          Target: {item.targetEntity}
                        </span>
                      )}

                      <button
                        type="button"
                        onClick={() => setSelectedDetailLog(item)}
                        className="ml-auto text-[11px] font-bold text-amber-600 hover:text-amber-700 flex items-center gap-1 cursor-pointer"
                      >
                        <span>Rincian</span>
                        <ChevronRight className="w-3 h-3" />
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 3. VIEW MODE 3: SEBARAN PETA GPS (LOCATION OVERVIEW) */}
      {/* ========================================================================= */}
      {activeViewMode === 'map' && (
        <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm space-y-6">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-500" />
              <span>Peta Sebaran Titik Koordinat Aktivitas Pengawas & Direksi</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Visualisasi stempel lokasi satelit GPS yang tersimpan saat pengguna melakukan login, checklist P2H, foto geotagging, dan input laporan.
            </p>
          </div>

          {/* Grid of Geotagged Locations */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredLogs.filter((l) => l.gpsTag).map((l) => (
              <div
                key={l.id}
                className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-white hover:shadow-md transition-all space-y-3 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-wider bg-slate-200 text-slate-800">
                      {l.userRole === 'director' ? 'Kantor Direksi' : 'Lahan Proyek'}
                    </span>
                    <span className="text-[10px] font-mono text-slate-400">
                      {l.formattedTime}
                    </span>
                  </div>

                  <h4 className="text-sm font-black text-slate-900 leading-tight">
                    {l.gpsTag?.locationName}
                  </h4>
                  <p className="text-xs text-slate-600 mt-1 line-clamp-2">
                    {l.actionDescription}
                  </p>
                </div>

                <div className="pt-3 border-t border-slate-200 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Pengguna:</span>
                    <strong className="text-slate-800">{l.userName}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs font-mono">
                    <span className="text-slate-500">Koordinat:</span>
                    <strong className="text-sky-700">{l.gpsTag?.lat.toFixed(5)}, {l.gpsTag?.lng.toFixed(5)}</strong>
                  </div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">Akurasi GPS:</span>
                    <span className="text-emerald-700 font-bold">±{l.gpsTag?.accuracy} meter</span>
                  </div>

                  <a
                    href={l.gpsTag?.mapsUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
                    <span>Buka Titik di Google Maps</span>
                  </a>
                </div>
              </div>
            ))}
          </div>

        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. MODAL DETAIL RINCIAN LOG */}
      {/* ========================================================================= */}
      {selectedDetailLog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 space-y-5">
            
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-mono text-slate-400 block font-bold">
                  {selectedDetailLog.id}
                </span>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {selectedDetailLog.actionTitle}
                </h3>
              </div>
              <button
                onClick={() => setSelectedDetailLog(null)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content Details */}
            <div className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-100">
                <div>
                  <span className="text-[10px] text-slate-400 block">Waktu Tercatat</span>
                  <strong className="text-slate-800 font-mono">{selectedDetailLog.formattedTime}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Kategori Aksi</span>
                  <span className="font-bold text-amber-800">{selectedDetailLog.actionCategory}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Nama Pengguna</span>
                  <strong className="text-slate-900">{selectedDetailLog.userName}</strong> ({selectedDetailLog.userRole})
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 block">Email Pengguna</span>
                  <span className="text-slate-700 font-mono">{selectedDetailLog.userEmail || '-'}</span>
                </div>
              </div>

              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  Deskripsi Lengkap Interaksi:
                </span>
                <p className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 text-slate-800 leading-relaxed font-medium">
                  {selectedDetailLog.actionDescription}
                </p>
              </div>

              {selectedDetailLog.gpsTag && (
                <div className="p-3 bg-sky-50/60 rounded-xl border border-sky-100 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-sky-900 uppercase tracking-wider flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-sky-600" />
                      <span>Tag Lokasi Satelit GPS</span>
                    </span>
                    <a
                      href={selectedDetailLog.gpsTag.mapsUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[11px] font-bold text-sky-700 hover:underline flex items-center gap-1"
                    >
                      <span>Google Maps</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                  <div className="text-slate-800 font-semibold">
                    {selectedDetailLog.gpsTag.locationName}
                  </div>
                  <div className="flex items-center gap-4 text-slate-600 font-mono text-[11px]">
                    <span>Lat: <strong>{selectedDetailLog.gpsTag.lat}</strong></span>
                    <span>Lng: <strong>{selectedDetailLog.gpsTag.lng}</strong></span>
                    <span>Akurasi: <strong>±{selectedDetailLog.gpsTag.accuracy}m</strong></span>
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-1">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                  Informasi Perangkat & Jaringan:
                </span>
                <div className="text-slate-700">
                  Tipe Perangkat: <strong>{selectedDetailLog.deviceInfo.deviceType}</strong>
                </div>
                <div className="text-slate-700 font-mono text-[11px] truncate">
                  User Agent: {selectedDetailLog.deviceInfo.browser}
                </div>
                <div className="text-slate-700">
                  Konektivitas: <strong>{selectedDetailLog.deviceInfo.isOnline ? 'Online (Terkoneksi Internet)' : 'Offline (Tersimpan Lokal)'}</strong>
                </div>
              </div>

            </div>

            {/* Bottom Actions */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => handleCopyJson(selectedDetailLog)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold rounded-lg transition-colors cursor-pointer"
              >
                {isCopied ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{isCopied ? 'Tersalin' : 'Salin JSON'}</span>
              </button>

              <button
                type="button"
                onClick={() => setSelectedDetailLog(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer"
              >
                Tutup Rincian
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
