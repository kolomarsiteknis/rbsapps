import React, { useState, useEffect, useMemo } from 'react';
import { 
  Database, 
  RotateCcw, 
  Download, 
  Upload, 
  ShieldCheck, 
  ShieldAlert, 
  AlertTriangle, 
  CheckCircle2, 
  HardDrive, 
  Terminal, 
  FileJson, 
  Copy, 
  Check, 
  Trash2, 
  Search, 
  Sliders, 
  Server, 
  Wifi, 
  WifiOff, 
  FileText, 
  Activity, 
  Clock, 
  ArrowUpRight, 
  RefreshCw, 
  Layers, 
  CheckCircle, 
  Info, 
  X, 
  AlertCircle,
  Eye,
  Lock,
  Sparkles,
  LifeBuoy,
  Wrench
} from 'lucide-react';
import { storageService } from '../services/storageService';
import { initFirestoreSync, toggleFirestoreNetwork, getSyncStatus, SyncStatus } from '../services/firestoreSync';
import { recordUserActivity } from '../utils/activityLogger';
import { AuthUser, Client, DailyReport, Equipment } from '../types';

interface DataRecoveryViewProps {
  authUser: AuthUser | null;
  clients?: Client[];
  reports?: DailyReport[];
  equipments?: Equipment[];
  onRefreshData?: () => void;
  showToast?: (message: string, type?: 'success' | 'warning' | 'info' | 'error') => void;
}

export const DataRecoveryView: React.FC<DataRecoveryViewProps> = ({
  authUser,
  onRefreshData,
  showToast,
}) => {
  // Navigation tabs within Data Recovery view
  const [activeTab, setActiveTab] = useState<'quick' | 'audit' | 'explorer' | 'restore'>('quick');

  // Diagnostics state
  const [diagnostics, setDiagnostics] = useState(() => storageService.getStorageDiagnostics());
  const [isScanning, setIsScanning] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isRepairing, setIsRepairing] = useState(false);

  // Sync state
  const [cloudSyncStatus, setCloudSyncStatus] = useState<SyncStatus>(() => getSyncStatus());
  const [lastSyncTimestamp, setLastSyncTimestamp] = useState<string>(() => new Date().toLocaleTimeString('id-ID'));

  // Last repair result
  const [lastRepairResult, setLastRepairResult] = useState<{
    fixedCount: number;
    repairedKeys: string[];
    details: string[];
    timestamp: string;
  } | null>(null);

  // Raw Explorer state
  const [selectedExplorerKey, setSelectedExplorerKey] = useState<string>('suryaland_reports_v1');
  const [explorerSearchTerm, setExplorerSearchTerm] = useState<string>('');
  const [copiedRawJson, setCopiedRawJson] = useState(false);

  // Restore state
  const [uploadedBackupFile, setUploadedBackupFile] = useState<File | null>(null);
  const [parsedBackupData, setParsedBackupData] = useState<any | null>(null);
  const [backupParseError, setBackupParseError] = useState<string | null>(null);
  const [showRestoreConfirmModal, setShowRestoreConfirmModal] = useState(false);
  const [restoreConfirmationText, setRestoreConfirmationText] = useState('');
  const [isRestoring, setIsRestoring] = useState(false);

  // Single key repair modal / action
  const [selectedKeyForAction, setSelectedKeyForAction] = useState<string | null>(null);

  const notify = (msg: string, type: 'success' | 'warning' | 'info' | 'error' = 'success') => {
    if (showToast) {
      showToast(msg, type);
    } else {
      console.log(`[DataRecovery ${type.toUpperCase()}]:`, msg);
    }
  };

  // Reload diagnostics periodically or after sync events
  const refreshDiagnostics = () => {
    setIsScanning(true);
    setTimeout(() => {
      const diag = storageService.getStorageDiagnostics();
      setDiagnostics(diag);
      setIsScanning(false);
    }, 250);
  };

  useEffect(() => {
    const handleStorageEvent = () => {
      setDiagnostics(storageService.getStorageDiagnostics());
      setLastSyncTimestamp(new Date().toLocaleTimeString('id-ID'));
    };

    window.addEventListener('suryaland_firestore_sync', handleStorageEvent);
    window.addEventListener('suryaland_master_sync', handleStorageEvent);
    window.addEventListener('suryaland_reports_sync', handleStorageEvent);

    return () => {
      window.removeEventListener('suryaland_firestore_sync', handleStorageEvent);
      window.removeEventListener('suryaland_master_sync', handleStorageEvent);
      window.removeEventListener('suryaland_reports_sync', handleStorageEvent);
    };
  }, []);

  // 1. Manually Re-Sync with Cloud
  const handleForceCloudSync = async () => {
    setIsSyncing(true);
    notify('Memulai sinkronisasi ulang penuh ke Cloud Firestore...', 'info');

    try {
      // Re-enable network if was disabled
      await toggleFirestoreNetwork(true);
      setCloudSyncStatus('syncing');

      // Trigger init sync again
      initFirestoreSync();

      // Broadcast storage and firestore sync across the whole app
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new CustomEvent('suryaland_firestore_sync', { detail: { collection: 'all_forced' } }));
        window.dispatchEvent(new CustomEvent('suryaland_master_sync'));
        window.dispatchEvent(new CustomEvent('suryaland_company_staff_sync'));
        window.dispatchEvent(new CustomEvent('suryaland_reports_sync'));
      }

      if (onRefreshData) {
        onRefreshData();
      }

      setTimeout(() => {
        setCloudSyncStatus('connected');
        setLastSyncTimestamp(new Date().toLocaleTimeString('id-ID'));
        setIsSyncing(false);
        refreshDiagnostics();
        notify('Sinkronisasi ulang Cloud Firestore berhasil diselesaikan.', 'success');

        recordUserActivity({
          userId: authUser?.id || 'director-recovery',
          userName: authUser?.displayName || 'Direktur Utama',
          userRole: 'director',
          actionCategory: 'MASTER_DATA',
          actionTitle: 'Sinkronisasi Ulang Cloud Manual',
          actionDescription: 'Direktur mengeksekusi re-sync manual antara browser cache dan Firestore Database.',
          targetEntity: 'Cloud Firestore Database',
        });
      }, 1200);
    } catch (err: any) {
      setIsSyncing(false);
      notify(`Gagal melakukan sinkronisasi: ${err?.message || 'Koneksi terganggu'}`, 'error');
    }
  };

  // 2. Scan & Auto-Repair All Anomalies
  const handleAutoRepair = () => {
    setIsRepairing(true);
    notify('Menganalisis dan memperbaiki anomali memori cache...', 'info');

    setTimeout(() => {
      try {
        const result = storageService.repairAllStorageAnomalies();
        setLastRepairResult(result);
        refreshDiagnostics();

        if (onRefreshData) {
          onRefreshData();
        }

        setIsRepairing(false);
        if (result.fixedCount > 0) {
          notify(`Perbaikan selesai: ${result.fixedCount} anomali pada ${result.repairedKeys.length} kunci berhasil dipulihkan.`, 'success');
        } else {
          notify('Pemeriksaan selesai: Seluruh data lokal dalam kondisi sehat & konsisten.', 'success');
        }

        recordUserActivity({
          userId: authUser?.id || 'director-recovery',
          userName: authUser?.displayName || 'Direktur Utama',
          userRole: 'director',
          actionCategory: 'MASTER_DATA',
          actionTitle: 'Perbaikan Integritas Cache Lokal',
          actionDescription: `Auto-repair dijalankan: ${result.fixedCount} anomali diperbaiki (${result.repairedKeys.join(', ') || 'Nol Anomali'}).`,
          targetEntity: 'LocalStorage Cache',
        });
      } catch (err: any) {
        setIsRepairing(false);
        notify(`Gagal menjalankan perbaikan: ${err?.message || 'Error tidak diketahui'}`, 'error');
      }
    }, 600);
  };

  // 3. Export Full Raw Database Dump
  const handleExportFullDump = () => {
    try {
      const dump = storageService.exportCompleteDatabaseDump();
      const jsonStr = JSON.stringify(dump, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const timeStr = new Date().toTimeString().slice(0, 8).replace(/:/g, '-');
      const filename = `suryaland_full_backup_${dateStr}_${timeStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify(`File cadangan berhasil diunduh (${dump.totalRecords} record dari ${dump.totalCollections} koleksi).`, 'success');

      recordUserActivity({
        userId: authUser?.id || 'director-recovery',
        userName: authUser?.displayName || 'Direktur Utama',
        userRole: 'director',
        actionCategory: 'EXPORT',
        actionTitle: 'Ekspor Cadangan Lengkap (JSON Dump)',
        actionDescription: `Mengunduh dump cadangan lokal: ${filename}`,
        targetEntity: filename,
      });
    } catch (err: any) {
      notify(`Gagal mengekspor data: ${err?.message || 'Kesalahan sistem'}`, 'error');
    }
  };

  // 4. Export Diagnostic Logs Only
  const handleExportDiagnosticLogs = () => {
    try {
      const diagRaw = localStorage.getItem('suryaland_auth_diagnostic_logs_v1');
      const activitiesRaw = localStorage.getItem('suryaland_user_activities_v1');

      const diagnosticPayload = {
        exportedAt: new Date().toISOString(),
        exportedBy: authUser?.displayName || 'Direktur Utama',
        systemDiagnostics: diagnostics,
        authDiagnosticLogs: diagRaw ? JSON.parse(diagRaw) : [],
        recentUserActivities: activitiesRaw ? JSON.parse(activitiesRaw).slice(0, 100) : [],
        clientEnvironment: {
          userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown',
          onlineStatus: typeof navigator !== 'undefined' ? navigator.onLine : false,
          currentUrl: typeof window !== 'undefined' ? window.location.href : '',
        },
      };

      const jsonStr = JSON.stringify(diagnosticPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const dateStr = new Date().toISOString().slice(0, 10);
      const filename = `suryaland_diagnostic_logs_${dateStr}.json`;

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      notify('Log diagnostik & audit berhasil diekspor.', 'success');
    } catch (err: any) {
      notify(`Gagal mengekspor log diagnostik: ${err?.message}`, 'error');
    }
  };

  // 5. Repair Single Storage Key
  const handleRepairSingleKey = (key: string) => {
    const res = storageService.repairSingleStorageKey(key);
    if (res.success) {
      notify(res.message, 'success');
      refreshDiagnostics();
      if (onRefreshData) onRefreshData();
    } else {
      notify(res.message, 'error');
    }
    setSelectedKeyForAction(null);
  };

  // 6. Handle File Upload for Restore
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadedBackupFile(file);
    setBackupParseError(null);
    setParsedBackupData(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        if (!parsed || typeof parsed !== 'object' || !parsed.storageData) {
          throw new Error('Format file tidak valid. Properti "storageData" tidak ditemukan.');
        }
        setParsedBackupData(parsed);
      } catch (err: any) {
        setBackupParseError(err?.message || 'File bukan format JSON yang valid.');
        setParsedBackupData(null);
      }
    };
    reader.onerror = () => {
      setBackupParseError('Gagal membaca file dari disk.');
    };
    reader.readAsText(file);
  };

  // 7. Execute Restore
  const executeRestore = () => {
    if (!parsedBackupData) return;
    setIsRestoring(true);

    setTimeout(() => {
      try {
        const res = storageService.importCompleteDatabaseDump(parsedBackupData);
        setIsRestoring(false);
        setShowRestoreConfirmModal(false);
        setRestoreConfirmationText('');

        if (res.success) {
          notify(res.message, 'success');
          refreshDiagnostics();
          if (onRefreshData) onRefreshData();

          recordUserActivity({
            userId: authUser?.id || 'director-recovery',
            userName: authUser?.displayName || 'Direktur Utama',
            userRole: 'director',
            actionCategory: 'MASTER_DATA',
            actionTitle: 'Pemulihan Database dari Cadangan',
            actionDescription: `Data berhasil dipulihkan dari file ${uploadedBackupFile?.name || 'backup.json'}.`,
            targetEntity: 'LocalStorage Full Restore',
          });
        } else {
          notify(res.message, 'error');
        }
      } catch (err: any) {
        setIsRestoring(false);
        notify(`Gagal memulihkan database: ${err?.message}`, 'error');
      }
    }, 700);
  };

  // Raw Explorer content
  const rawExplorerContent = useMemo(() => {
    if (typeof window === 'undefined') return '';
    try {
      const raw = localStorage.getItem(selectedExplorerKey);
      if (!raw) return '// [Kosong / Key belum tersimpan di localStorage]';
      const parsed = JSON.parse(raw);
      return JSON.stringify(parsed, null, 2);
    } catch {
      return localStorage.getItem(selectedExplorerKey) || '';
    }
  }, [selectedExplorerKey, diagnostics]);

  // Filtered Raw Explorer lines
  const filteredExplorerContent = useMemo(() => {
    if (!explorerSearchTerm.trim()) return rawExplorerContent;
    const term = explorerSearchTerm.toLowerCase();
    const lines = rawExplorerContent.split('\n');
    const matched = lines.filter((l) => l.toLowerCase().includes(term));
    return matched.length > 0 
      ? `// Menampilkan baris yang cocok dengan "${explorerSearchTerm}":\n\n` + matched.join('\n')
      : `// Tidak ada baris yang cocok dengan kata kunci "${explorerSearchTerm}"`;
  }, [rawExplorerContent, explorerSearchTerm]);

  return (
    <div className="space-y-5 animate-in fade-in duration-300">
      {/* 1. TOP EXECUTIVE HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1 shadow-sm">
                <ShieldCheck className="w-3 h-3" />
                Data Recovery & Diagnostics Suite
              </span>
              <span className="text-[11px] text-amber-300 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                Otorisasi Khusus Direktur
              </span>
              <span className="text-slate-500 text-xs">·</span>
              <span className="text-xs text-slate-400 font-mono">
                PT. RBS GROUP Zero Burning
              </span>
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Database className="w-6 h-6 text-amber-400" />
              <span>Pusat Pemulihan Data & Diagnostik Cache</span>
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Modul pemulihan darurat Direktur untuk sinkronisasi ulang cloud, validasi integritas struktur memori lokal, sanitasi anomali cache perangkat, dan ekspor arsip log audit.
            </p>
          </div>

          {/* Quick Metrics & Cloud Indicator */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Storage Quota Card */}
            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 shadow-inner flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                <HardDrive className="w-5 h-5" />
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Penggunaan Memori Lokal
                </div>
                <div className="text-sm font-black text-white flex items-baseline gap-1.5 font-mono">
                  <span>{diagnostics.formattedTotalSize}</span>
                  <span className="text-[11px] text-slate-400">/ ~5 MB ({diagnostics.quotaUsedPercent}%)</span>
                </div>
                <div className="w-28 bg-slate-700 h-1.5 rounded-full overflow-hidden mt-1">
                  <div 
                    className={`h-full transition-all duration-500 ${
                      diagnostics.quotaUsedPercent > 80 ? 'bg-rose-500' : 'bg-emerald-400'
                    }`}
                    style={{ width: `${Math.max(2, diagnostics.quotaUsedPercent)}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Cloud Status Card */}
            <div className="bg-slate-800/80 rounded-2xl p-3 border border-slate-700/80 shadow-inner flex items-center gap-3">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold ${
                cloudSyncStatus === 'connected' 
                  ? 'bg-emerald-500/20 text-emerald-400' 
                  : cloudSyncStatus === 'syncing' 
                  ? 'bg-amber-500/20 text-amber-400 animate-spin' 
                  : 'bg-rose-500/20 text-rose-400'
              }`}>
                {cloudSyncStatus === 'connected' ? (
                  <Wifi className="w-5 h-5" />
                ) : cloudSyncStatus === 'syncing' ? (
                  <RefreshCw className="w-5 h-5" />
                ) : (
                  <WifiOff className="w-5 h-5" />
                )}
              </div>
              <div>
                <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                  Koneksi Cloud Firestore
                </div>
                <div className="text-xs font-black text-white flex items-center gap-1.5">
                  <span className={`w-2 h-2 rounded-full ${
                    cloudSyncStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-rose-400'
                  }`} />
                  <span className="capitalize">{cloudSyncStatus === 'connected' ? 'Terhubung (Online)' : cloudSyncStatus}</span>
                </div>
                <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]" title={diagnostics.firestoreStatus.databaseId}>
                  DB: {diagnostics.firestoreStatus.databaseId.slice(0, 14)}...
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ANOMALY ALERT BANNER (IF ANY ANOMALIES DETECTED) */}
        {diagnostics.totalAnomaliesCount > 0 ? (
          <div className="mt-4 p-3.5 bg-rose-500/15 border-2 border-rose-500/40 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <strong className="text-rose-200 font-black">
                  Terdeteksi {diagnostics.totalAnomaliesCount} potensi inkonsistensi cache lokal!
                </strong>
                <p className="text-rose-300/80 text-[11px] mt-0.5">
                  Terdapat ID ganda, angka invalid (NaN), atau entri null yang dapat mempengaruhi perhitungan dashboard.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleAutoRepair}
              disabled={isRepairing}
              className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer shrink-0 disabled:opacity-50"
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>{isRepairing ? 'Memperbaiki...' : 'Perbaiki Otomatis Sekarang'}</span>
            </button>
          </div>
        ) : (
          <div className="mt-4 p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div className="flex items-center gap-2 text-emerald-300">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>
                <strong>Kondisi Cache Sehat:</strong> Seluruh {diagnostics.totalKeys} kunci penyimpanan lokal terverifikasi valid tanpa anomali.
              </span>
            </div>
            <span className="text-[10px] text-slate-400 font-mono">
              Audit Terakhir: {lastSyncTimestamp}
            </span>
          </div>
        )}
      </div>

      {/* 2. RECOVERY SUB-NAVIGATION TABS */}
      <div className="flex items-center gap-2 overflow-x-auto bg-white p-2 rounded-2xl border border-slate-200 shadow-sm text-xs font-bold">
        <button
          type="button"
          onClick={() => setActiveTab('quick')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'quick'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Sparkles className="w-4 h-4" />
          <span>1. Tindakan Pemulihan Cepat</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'audit'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <CheckCircle className="w-4 h-4" />
          <span>2. Audit Integritas Storage ({diagnostics.totalKeys} Kunci)</span>
          {diagnostics.totalAnomaliesCount > 0 && (
            <span className="bg-rose-500 text-white text-[10px] px-1.5 py-0.2 rounded-full font-black">
              {diagnostics.totalAnomaliesCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('explorer')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'explorer'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Terminal className="w-4 h-4" />
          <span>3. Penjelajah Raw Logs & JSON</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('restore')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition cursor-pointer whitespace-nowrap ${
            activeTab === 'restore'
              ? 'bg-amber-500 text-slate-950 font-black shadow'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>4. Impor & Pulihkan Cadangan</span>
        </button>
      </div>

      {/* 3. SUB-TAB CONTENT */}

      {/* TAB 1: QUICK ACTIONS */}
      {activeTab === 'quick' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* ACTION CARD 1: FORCE CLOUD RE-SYNC */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-sky-500/10 text-sky-600 flex items-center justify-center font-bold mb-3">
                  <RefreshCw className={`w-6 h-6 ${isSyncing ? 'animate-spin' : ''}`} />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-sky-100 text-sky-800 px-2 py-0.5 rounded-full">
                    Koneksi Cloud
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Bi-Directional Sync</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Sinkronisasi Ulang Cloud Manual (Force Cloud Re-Sync)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Menarik seluruh dokumen terbaru dari database Cloud Firestore (Daily Reports, Master Klien, Inventaris, Staff) dan memadukan antrean lokal yang tertunda ke server.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Sync Terakhir: {lastSyncTimestamp}
                </span>
                <button
                  type="button"
                  onClick={handleForceCloudSync}
                  disabled={isSyncing}
                  className="px-4 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Mulai Sinkronisasi Cloud'}</span>
                </button>
              </div>
            </div>

            {/* ACTION CARD 2: AUTO-REPAIR ANOMALIES */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-500/15 text-amber-600 flex items-center justify-center font-bold mb-3">
                  <Wrench className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-800 px-2 py-0.5 rounded-full">
                    Perbaikan Otomatis
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Deep Integrity Scan</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Pindai & Sanitasi Anomali Cache (Auto-Repair)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Secara cerdas mendeteksi dan menghapus record duplikat, memperbaiki nilai numerik invalid (NaN), mereset session token rusak, serta menyelaraskan kredensial staff manajemen.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Anomali: <strong className={diagnostics.totalAnomaliesCount > 0 ? 'text-rose-600' : 'text-emerald-600'}>{diagnostics.totalAnomaliesCount} isu</strong>
                </span>
                <button
                  type="button"
                  onClick={handleAutoRepair}
                  disabled={isRepairing}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-amber-400 font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Wrench className="w-3.5 h-3.5" />
                  <span>{isRepairing ? 'Memperbaiki...' : 'Jalankan Perbaikan Cache'}</span>
                </button>
              </div>
            </div>

            {/* ACTION CARD 3: EXPORT FULL DATABASE DUMP */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center font-bold mb-3">
                  <Download className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                    Cadangan Lengkap
                  </span>
                  <span className="text-xs text-slate-400 font-mono">JSON Database Archive</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Ekspor Cadangan Lengkap (Full Raw JSON Dump)
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Mengemas seluruh tabel database lokal (Laporan Harian, Proyek Klien, Alat Berat, Penugasan, BBM, P2H, Staff) ke dalam satu file JSON untuk pengarsipan aman di komputer Direktur.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Total Ukuran: {diagnostics.formattedTotalSize}
                </span>
                <button
                  type="button"
                  onClick={handleExportFullDump}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Unduh File Cadangan (.json)</span>
                </button>
              </div>
            </div>

            {/* ACTION CARD 4: EXPORT RAW DIAGNOSTIC LOGS */}
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm hover:shadow-md transition space-y-4 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center font-bold mb-3">
                  <FileText className="w-6 h-6" />
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[10px] font-black uppercase tracking-wider bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                    Arsip Diagnostik
                  </span>
                  <span className="text-xs text-slate-400 font-mono">Technical Log Trace</span>
                </div>
                <h3 className="text-base font-black text-slate-900">
                  Ekspor Log Diagnostik & Audit Aktivitas
                </h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Mengekstrak riwayat kegagalan login yang dipulihkan, log timestamp sesi idle, jejak audit GPS pengguna, serta metadata lingkungan browser untuk analisis teknis lebih lanjut.
                </p>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                <span className="text-[11px] text-slate-400 font-mono">
                  Format: Raw JSON Trace
                </span>
                <button
                  type="button"
                  onClick={handleExportDiagnosticLogs}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition flex items-center gap-2 cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Ekspor Log Diagnostik</span>
                </button>
              </div>
            </div>
          </div>

          {/* REPAIR LOG REPORT (IF EXECUTED RECENTLY) */}
          {lastRepairResult && (
            <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-700 flex items-center justify-center font-bold">
                    <CheckCircle2 className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-slate-900">
                      Hasil Eksekusi Perbaikan Cache Terakhir
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Waktu Eksekusi: {new Date(lastRepairResult.timestamp).toLocaleString('id-ID')}
                    </span>
                  </div>
                </div>

                <span className="text-xs font-black px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
                  {lastRepairResult.fixedCount} Tindakan Selesai
                </span>
              </div>

              <div className="space-y-1.5 max-h-48 overflow-y-auto text-xs font-mono">
                {lastRepairResult.details.length > 0 ? (
                  lastRepairResult.details.map((detail, idx) => (
                    <div key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-xl border border-slate-100 text-slate-700">
                      <Check className="w-3.5 h-3.5 text-emerald-600 mt-0.5 shrink-0" />
                      <span>{detail}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-slate-500 italic p-2">
                    Tidak ditemukan anomali pada memori lokal saat pemindaian dilakukan.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AUDIT INTEGRITAS PER KOLEKSI */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-amber-500" />
                <span>Status & Analisis Integritas per Kunci Penyimpanan ({diagnostics.totalKeys} Modul)</span>
              </h3>
              <p className="text-xs text-slate-500">
                Pemeriksaan mendalam terhadap validitas struktur JSON, deteksi duplikasi ID, dan sanitasi angka pada tiap tabel.
              </p>
            </div>

            <button
              type="button"
              onClick={refreshDiagnostics}
              disabled={isScanning}
              className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transition cursor-pointer self-start sm:self-auto"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
              <span>{isScanning ? 'Memindai...' : 'Pindai Ulang'}</span>
            </button>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                  <th className="p-3">Nama Modul & Kunci Storage</th>
                  <th className="p-3 text-center">Kategori</th>
                  <th className="p-3 text-center">Jumlah Data</th>
                  <th className="p-3 text-center">Ukuran Memori</th>
                  <th className="p-3 text-center">Integritas</th>
                  <th className="p-3 text-center">Aksi Perbaikan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {diagnostics.keys.map((item) => (
                  <tr key={item.key} className="hover:bg-slate-50/80 transition">
                    <td className="p-3">
                      <div className="font-bold text-slate-900">{item.label}</div>
                      <div className="font-mono text-[10px] text-slate-400">{item.key}</div>
                      {item.hasAnomalies && (
                        <div className="mt-1 space-y-0.5">
                          {item.anomalyDescriptions.map((desc, dIdx) => (
                            <span key={dIdx} className="inline-block text-[10px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200 mr-1 mb-1">
                              ⚠️ {desc}
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                        item.category === 'master' 
                          ? 'bg-amber-100 text-amber-800' 
                          : item.category === 'operational'
                          ? 'bg-sky-100 text-sky-800'
                          : item.category === 'auth'
                          ? 'bg-purple-100 text-purple-800'
                          : 'bg-slate-100 text-slate-700'
                      }`}>
                        {item.category}
                      </span>
                    </td>
                    <td className="p-3 text-center font-mono font-bold text-slate-800">
                      {item.itemCount} record
                    </td>
                    <td className="p-3 text-center font-mono text-slate-600">
                      {item.formattedSize}
                    </td>
                    <td className="p-3 text-center">
                      {item.hasAnomalies ? (
                        <span className="inline-flex items-center gap-1 bg-rose-100 text-rose-800 px-2.5 py-0.5 rounded-full font-black text-[10px]">
                          <AlertTriangle className="w-3 h-3 text-rose-600" />
                          Anomali
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 bg-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                          <Check className="w-3 h-3 text-emerald-600" />
                          Sehat
                        </span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedExplorerKey(item.key);
                            setActiveTab('explorer');
                          }}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                          title="Lihat isi data JSON pada penjelajah"
                        >
                          <Eye className="w-3 h-3 text-slate-500" />
                          <span>Lihat</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleRepairSingleKey(item.key)}
                          className="px-2.5 py-1 bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1 shadow-2xs"
                          title="Sanitasi dan perbaiki kunci ini secara khusus"
                        >
                          <Wrench className="w-3 h-3" />
                          <span>Perbaiki</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: PENJELAJAH RAW LOGS & JSON EXPLORER */}
      {activeTab === 'explorer' && (
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm sm:text-base font-black text-slate-900 flex items-center gap-2">
                <Terminal className="w-4 h-4 text-amber-500" />
                <span>Penjelajah Raw Logs & JSON Database Lokal</span>
              </h3>
              <p className="text-xs text-slate-500">
                Memeriksa konten mentah string JSON yang tersimpan langsung di browser storage tanpa rekayasa.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(rawExplorerContent);
                  setCopiedRawJson(true);
                  notify('Data mentah JSON berhasil disalin ke clipboard.', 'success');
                  setTimeout(() => setCopiedRawJson(false), 2500);
                }}
                className="px-3 py-1.5 rounded-xl border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs transition flex items-center gap-1.5 cursor-pointer shadow-xs"
              >
                <Copy className="w-3.5 h-3.5 text-slate-500" />
                <span>{copiedRawJson ? 'Tersalin!' : 'Salin JSON'}</span>
              </button>
            </div>
          </div>

          {/* Selector & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-7">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                PILIH KUNCI / TABEL DATABASE UNTUK DITELUSURI:
              </label>
              <select
                value={selectedExplorerKey}
                onChange={(e) => setSelectedExplorerKey(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <optgroup label="Tabel Master & Operasional">
                  {diagnostics.keys.map((k) => (
                    <option key={k.key} value={k.key}>
                      {k.label} ({k.key}) — {k.formattedSize}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="sm:col-span-5">
              <label className="block text-[10px] font-black uppercase tracking-wider text-slate-400 mb-1">
                CARI TEKS / FIELD DALAM JSON:
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Ketik nama operator, nomor SPK, ID..."
                  value={explorerSearchTerm}
                  onChange={(e) => setExplorerSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3 pointer-events-none" />
                {explorerSearchTerm && (
                  <button
                    type="button"
                    onClick={() => setExplorerSearchTerm('')}
                    className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Raw JSON Code Viewer */}
          <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 text-emerald-400 font-mono text-xs overflow-x-auto max-h-[480px] leading-relaxed shadow-inner">
            <pre className="whitespace-pre-wrap">{filteredExplorerContent}</pre>
          </div>
        </div>
      )}

      {/* TAB 4: IMPOR & PULIHKAN CADANGAN */}
      {activeTab === 'restore' && (
        <div className="bg-white rounded-3xl p-5 sm:p-6 border border-slate-200 shadow-sm space-y-5">
          <div className="border-b border-slate-100 pb-3">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Upload className="w-5 h-5 text-amber-500" />
              <span>Pulihkan Database dari File Cadangan (Restore JSON)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Gunakan fitur ini apabila browser dibersihkan secara tidak sengaja atau Anda ingin memulihkan arsip data sebelumnya.
            </p>
          </div>

          {/* Dropzone / File Picker */}
          <div className="border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-3xl p-6 sm:p-8 text-center bg-slate-50/60 hover:bg-amber-50/20 transition cursor-pointer relative">
            <input
              type="file"
              accept=".json,application/json"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-600 flex items-center justify-center font-bold mx-auto">
                <FileJson className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900">
                Pilih atau Tarik File Cadangan (.json) ke Sini
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Hanya file cadangan yang diekspor resmi dari sistem Suryaland / PT. RBS GROUP yang akan diterima.
              </p>
            </div>
          </div>

          {/* PARSED FILE PREVIEW & VALIDATION */}
          {backupParseError && (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-xs text-rose-800 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-600 mt-0.5 shrink-0" />
              <div>
                <strong>Kesalahan Validasi File Cadangan:</strong>
                <p className="text-rose-700 mt-0.5">{backupParseError}</p>
              </div>
            </div>
          )}

          {parsedBackupData && (
            <div className="p-5 bg-amber-50/70 border-2 border-amber-300 rounded-3xl space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/80 pb-2.5">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                  <span className="font-black text-slate-900 text-sm">
                    File Cadangan Terverifikasi Valid
                  </span>
                </div>
                <span className="text-[11px] font-mono text-amber-900 font-bold bg-amber-200/80 px-2.5 py-0.5 rounded-full">
                  {uploadedBackupFile?.name}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Waktu Ekspor</span>
                  <div className="font-bold text-slate-800 mt-0.5">
                    {parsedBackupData.exportedAt ? new Date(parsedBackupData.exportedAt).toLocaleDateString('id-ID') : 'N/A'}
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Total Koleksi</span>
                  <div className="font-bold text-slate-800 mt-0.5 font-mono">
                    {parsedBackupData.totalCollections || Object.keys(parsedBackupData.storageData || {}).length} Koleksi
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Target Database</span>
                  <div className="font-bold text-slate-800 mt-0.5 font-mono truncate" title={parsedBackupData.databaseId}>
                    {parsedBackupData.databaseId ? parsedBackupData.databaseId.slice(0, 12) + '...' : 'Suryaland DB'}
                  </div>
                </div>

                <div className="p-2.5 bg-white rounded-xl border border-amber-200">
                  <span className="text-slate-400 text-[10px] font-bold uppercase">Total Record</span>
                  <div className="font-black text-emerald-700 mt-0.5 font-mono">
                    {parsedBackupData.totalRecords || 'Lengkap'} Record
                  </div>
                </div>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setParsedBackupData(null);
                    setUploadedBackupFile(null);
                  }}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-200 transition cursor-pointer"
                >
                  Batal
                </button>

                <button
                  type="button"
                  onClick={() => setShowRestoreConfirmModal(true)}
                  className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs shadow-lg transition flex items-center gap-2 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>Pulihkan Seluruh Database Sekarang →</span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* CONFIRMATION MODAL BEFORE RESTORE */}
      {showRestoreConfirmModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-md w-full overflow-hidden shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="bg-rose-950 p-5 text-white flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500 text-white flex items-center justify-center font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">
                    Konfirmasi Pemulihan Database
                  </h3>
                  <p className="text-[11px] text-rose-300">
                    Otorisasi Keamanan Direktur Utama
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowRestoreConfirmModal(false)}
                className="p-1.5 text-rose-300 hover:text-white rounded-lg hover:bg-rose-900/60 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 sm:p-6 space-y-4 text-xs">
              <div className="p-3.5 bg-rose-50 rounded-2xl border border-rose-200 text-rose-900 leading-relaxed">
                <p className="font-bold">⚠️ PERINGATAN PENGGANTIAN DATA:</p>
                <p className="mt-1 text-slate-700">
                  Tindakan ini akan menggantikan seluruh tabel penyimpanan lokal saat ini dengan isi file cadangan <strong>{uploadedBackupFile?.name}</strong>.
                </p>
              </div>

              <div>
                <label className="block text-[10px] font-black uppercase tracking-wider text-slate-500 mb-1">
                  Ketik kata <span className="font-mono text-rose-600">PULIHKAN</span> untuk konfirmasi:
                </label>
                <input
                  type="text"
                  placeholder="Ketik PULIHKAN..."
                  value={restoreConfirmationText}
                  onChange={(e) => setRestoreConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 font-bold focus:border-rose-500 focus:outline-none"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRestoreConfirmModal(false)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
                >
                  Batalkan
                </button>

                <button
                  type="button"
                  onClick={executeRestore}
                  disabled={restoreConfirmationText.trim().toUpperCase() !== 'PULIHKAN' || isRestoring}
                  className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 disabled:bg-slate-300 disabled:cursor-not-allowed text-white font-black rounded-xl text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  <span>{isRestoring ? 'Memulihkan Data...' : 'Konfirmasi & Timpa Data'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
