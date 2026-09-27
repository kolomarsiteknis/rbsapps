/**
 * SURYALAND APPS - Heavy Equipment Land Clearing Plantation Project
 * Zero Burning Method (Metode Tanpa Bakar)
 * PT. RBS GROUP
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabKey } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { ReportWizard } from './components/ReportWizard';
import { ReportListView } from './components/ReportListView';
import { PdfReportModal } from './components/PdfReportModal';
import { MasterDataView } from './components/MasterDataView';
import { LogisticsInventoryView } from './components/LogisticsInventoryView';
import { SupervisorToolsView } from './components/SupervisorToolsView';
import { DirectorFieldMonitorView } from './components/DirectorFieldMonitorView';
import { ManagerApprovalView } from './components/ManagerApprovalView';
import { UserActivityAuditLogView } from './components/UserActivityAuditLogView';
import { UserManagementView } from './components/UserManagementView';
import { CompanyProfileView } from './components/CompanyProfileView';
import { CompanyMasterDataView } from './components/CompanyMasterDataView';
import { TutorialView } from './components/TutorialView';
import { LoginPage } from './components/LoginPage';
import { storageService } from './services/storageService';
import { initFirestoreSync, onSyncStatusChange, toggleFirestoreNetwork, SyncStatus } from './services/firestoreSync';
import { recordUserActivity } from './utils/activityLogger';
import { DailyReport, Equipment, UserRole, Client, AuthUser, CompanyProfile, CompanyStaff } from './types';
import { CheckCircle2, AlertCircle, ShieldAlert, Clock, RotateCcw, LogOut } from 'lucide-react';

const AUTH_STORAGE_KEY = 'suryaland_auth_user_v1';
const IDLE_STORAGE_KEY = 'suryaland_last_activity_v1';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const IDLE_WARNING_MS = 28 * 60 * 1000; // Warning displayed at 28 minutes (last 2 minutes)

export default function App() {
  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  });

  // Company Profile & Dynamic Branding State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());
  const [preloadStaffForUserManagement, setPreloadStaffForUserManagement] = useState<CompanyStaff | null>(null);

  // Idle timeout state for shared tablet security
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const [idleNotice, setIdleNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'manager') return 'approval';
        if (u.role === 'director') return 'dashboard';
        return 'wizard';
      }
    } catch {
      // fallback
    }
    return 'wizard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'supervisor' && u.assignedClientId && u.assignedClientId !== 'all') {
          return u.assignedClientId;
        }
      }
    } catch {}
    return 'ALL';
  });

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedReportIdForModal, setSelectedReportIdForModal] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Initialize Firestore dynamic real-time synchronization & offline persistence
  useEffect(() => {
    initFirestoreSync();

    const unsubSyncStatus = onSyncStatusChange((status: SyncStatus) => {
      setIsOnline(status !== 'offline');
    });

    const handleFirestoreSync = () => {
      loadData();
    };

    const handleCompanySync = () => {
      setCompanyProfile(storageService.getCompanyProfile());
    };

    window.addEventListener('suryaland_firestore_sync', handleFirestoreSync);
    window.addEventListener('suryaland_company_profile_sync', handleCompanySync);
    return () => {
      unsubSyncStatus();
      window.removeEventListener('suryaland_firestore_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_company_profile_sync', handleCompanySync);
    };
  }, [authUser?.username]);

  // Load initial data
  useEffect(() => {
    if (authUser) {
      // Set initial tab and enforce client assignment for supervisor
      if (authUser.role === 'supervisor' && authUser.assignedClientId && authUser.assignedClientId !== 'all') {
        setSelectedClientId(authUser.assignedClientId);
        setActiveTab('wizard');
      } else if (authUser.role === 'director') {
        setActiveTab('dashboard');
      }
    }
    loadData();
  }, [authUser?.username, authUser?.assignedClientId]);

  const loadData = () => {
    setClients(storageService.getClients());
    setReports(storageService.getReports(undefined, authUser));
    setEquipments(storageService.getEquipments());
    setCompanyProfile(storageService.getCompanyProfile());
  };

  const handleSetSelectedClientId = (id: string) => {
    // Pengawas HANYA mengawasi 1 Klien PT yang ditugaskan oleh Superadmin
    if (authUser?.role === 'supervisor' && authUser.assignedClientId && authUser.assignedClientId !== 'all') {
      setSelectedClientId(authUser.assignedClientId);
      return;
    }
    setSelectedClientId(id);
  };

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reset idle timer timestamp on active user interaction
  const handleExtendSession = useCallback(() => {
    try {
      localStorage.setItem(IDLE_STORAGE_KEY, Date.now().toString());
    } catch {}
    setIdleWarningSeconds(null);
    showToast('Sesi Anda telah diperpanjang.', 'success');
  }, []);

  // Idle timeout detector for shared tablets in the field (30 minutes inactivity)
  useEffect(() => {
    if (!authUser) {
      setIdleWarningSeconds(null);
      return;
    }

    // Set initial activity timestamp if not yet stored
    try {
      if (!localStorage.getItem(IDLE_STORAGE_KEY)) {
        localStorage.setItem(IDLE_STORAGE_KEY, Date.now().toString());
      }
    } catch {}

    let lastThrottleTime = 0;
    const recordUserActivityEvent = () => {
      // If warning modal is actively displayed, do not reset passively via background mouse moves;
      // requires user to explicitly click "Lanjutkan Sesi"
      if (idleWarningSeconds !== null) return;

      const now = Date.now();
      // Throttle storage writes to once every 3 seconds to preserve tablet CPU and battery
      if (now - lastThrottleTime > 3000) {
        lastThrottleTime = now;
        try {
          localStorage.setItem(IDLE_STORAGE_KEY, now.toString());
        } catch {}
      }
    };

    // Periodic check every 1 second
    const checkIdleInterval = setInterval(() => {
      try {
        const lastActiveStr = localStorage.getItem(IDLE_STORAGE_KEY);
        const lastActive = lastActiveStr ? parseInt(lastActiveStr, 10) : Date.now();
        const elapsed = Date.now() - lastActive;

        if (elapsed >= IDLE_TIMEOUT_MS) {
          // Inactivity limit (30 minutes) reached -> Auto logout immediately
          setIdleWarningSeconds(null);
          handleLogout(true);
        } else if (elapsed >= IDLE_WARNING_MS) {
          // Warning threshold (28 minutes) reached -> Show 2-minute countdown
          const remainingSec = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
          setIdleWarningSeconds(remainingSec);
        } else {
          setIdleWarningSeconds(null);
        }
      } catch (err) {
        console.error('Idle timeout check failed', err);
      }
    }, 1000);

    // Screen wake / tab visibility handler (vital for shared tablets sleeping in the field)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const lastActiveStr = localStorage.getItem(IDLE_STORAGE_KEY);
          if (lastActiveStr) {
            const elapsed = Date.now() - parseInt(lastActiveStr, 10);
            if (elapsed >= IDLE_TIMEOUT_MS) {
              setIdleWarningSeconds(null);
              handleLogout(true);
              return;
            }
          }
          recordUserActivityEvent();
        } catch {}
      }
    };

    // Synchronize across multiple browser tabs on the same tablet
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === IDLE_STORAGE_KEY && e.newValue) {
        setIdleWarningSeconds(null);
      }
    };

    // User interaction events covering touches, gestures, keys, clicks, and scroll
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown', 
      'keydown', 
      'touchstart', 
      'touchmove', 
      'touchend', 
      'scroll', 
      'click'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivityEvent, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(checkIdleInterval);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivityEvent);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [authUser, idleWarningSeconds]);

  // Login handler
  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    setIdleNotice(null);
    setIdleWarningSeconds(null);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
      localStorage.setItem(IDLE_STORAGE_KEY, Date.now().toString());
    } catch (e) {
      console.error('Failed to save auth state', e);
    }

    if (user.role === 'supervisor') {
      const assignedId = (user.assignedClientId && user.assignedClientId !== 'all') ? user.assignedClientId : 'client-1';
      setSelectedClientId(assignedId);
      setActiveTab('wizard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Pengawas Lapangan untuk ${user.assignedClientName || 'proyek penugasan'}.`);
    } else if (user.role === 'manager') {
      setSelectedClientId('ALL');
      setActiveTab('approval');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Manager Operasional.`);
    } else {
      setSelectedClientId('ALL');
      setActiveTab('dashboard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Direktur (Superadmin).`);
    }

    // Auto-record login activity with GPS tag
    recordUserActivity({
      userId: user.id,
      userName: user.displayName,
      userRole: user.role,
      userEmail: user.email,
      actionCategory: 'AUTH',
      actionTitle: `Masuk Sesi: ${user.displayName}`,
      actionDescription: `Pengguna berhasil login ke sistem sebagai ${user.role === 'director' ? 'Direktur (Superadmin)' : user.role === 'manager' ? 'Manager Operasional' : 'Pengawas Lapangan'}.`,
      targetEntity: `Sesi ${user.role === 'director' ? 'Direksi' : user.role === 'manager' ? 'Manajemen Manager' : 'Mobile Pengawas'}`,
    });
  };

  // Logout handler
  const handleLogout = (isIdleTimeout: boolean = false) => {
    if (authUser) {
      recordUserActivity({
        userId: authUser.id,
        userName: authUser.displayName,
        userRole: authUser.role,
        userEmail: authUser.email,
        actionCategory: 'AUTH',
        actionTitle: isIdleTimeout 
          ? `Sesi Berakhir Otomatis (Idle 30 Menit): ${authUser.displayName}` 
          : `Keluar Sesi: ${authUser.displayName}`,
        actionDescription: isIdleTimeout
          ? `Pengguna otomatis logout dari sistem setelah 30 menit tidak ada aktivitas untuk proteksi keamanan tablet bersama.`
          : `Pengguna keluar (logout) dari sistem aplikasi.`,
        targetEntity: `Sesi ${authUser.role === 'director' ? 'Direksi' : authUser.role === 'manager' ? 'Manajemen Manager' : 'Mobile Pengawas'}`,
      });
    }

    setAuthUser(null);
    setIdleWarningSeconds(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(IDLE_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove auth state', e);
    }

    if (isIdleTimeout) {
      setIdleNotice('Sesi Anda telah berakhir secara otomatis setelah 30 menit tidak ada aktivitas. Hal ini diterapkan demi keamanan data proyek pada tablet bersama.');
      showToast('Sesi otomatis berakhir setelah 30 menit tidak ada aktivitas (keamanan tablet bersama).', 'warning');
    } else {
      setIdleNotice(null);
      showToast('Anda telah berhasil keluar dari sistem.', 'info');
    }
  };

  const handleReportSaved = (newReport: DailyReport) => {
    loadData();
    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Pengawas Lapangan',
      userRole: 'supervisor',
      userEmail: authUser?.email,
      actionCategory: 'REPORT',
      actionTitle: `Simpan Laporan ${newReport.reportNumber}`,
      actionDescription: `Menyimpan Laporan Harian untuk ${newReport.clientName} (Blok ${newReport.blockCode}, Progres: ${newReport.physicalProgress?.realizedAreaHa ?? 0} Ha).`,
      targetEntity: newReport.reportNumber,
      clientId: newReport.clientId,
      clientName: newReport.clientName,
      blockCode: newReport.blockCode,
    });
    showToast(`Laporan ${newReport.reportNumber} untuk ${newReport.clientName} berhasil disimpan! (${newReport.syncStatus === 'synced' ? 'Tersinkronisasi Online' : 'Disimpan Lokal Offline'})`);
    setActiveTab('reports');
  };

  const handleApproveReport = (reportId: string) => {
    if (authUser?.role !== 'director' && authUser?.role !== 'manager') {
      showToast('Persetujuan dokumen hanya dapat dilakukan oleh Direktur atau Manager.', 'warning');
      return;
    }
    const isManager = authUser.role === 'manager';
    const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Ir. Hendra Wijaya, M.Si');
    const updated = isManager 
      ? storageService.approveReportByManager(reportId, approverName)
      : storageService.approveReportByDirector(reportId, approverName);

    if (updated) {
      loadData();
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: authUser.role,
        userEmail: authUser?.email,
        actionCategory: 'REPORT',
        actionTitle: `Approval Laporan ${updated.reportNumber}`,
        actionDescription: `Memberikan persetujuan resmi ${isManager ? 'Manager' : 'Direktur'} untuk laporan ${updated.clientName} (Blok ${updated.blockCode}).`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });
      showToast(`Laporan ${updated.reportNumber} resmi disetujui ${isManager ? 'Manager' : 'Direktur'}.`);
    }
  };

  const handleRejectReport = (reportId: string, reason: string) => {
    if (authUser?.role !== 'director' && authUser?.role !== 'manager') {
      showToast('Penolakan dokumen hanya dapat dilakukan oleh Direktur atau Manager.', 'warning');
      return;
    }
    const isManager = authUser.role === 'manager';
    const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Ir. Hendra Wijaya, M.Si');
    const updated = isManager
      ? storageService.rejectReportByManager(reportId, approverName, reason)
      : storageService.rejectReportByDirector(reportId, approverName, reason);

    if (updated) {
      loadData();
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: authUser.role,
        userEmail: authUser?.email,
        actionCategory: 'REPORT',
        actionTitle: `Penolakan Laporan ${updated.reportNumber}`,
        actionDescription: `Menolak laporan ${updated.clientName} (Blok ${updated.blockCode}) dengan catatan alasan: ${reason}.`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });
      showToast(`Laporan ${updated.reportNumber} ditolak ${isManager ? 'Manager' : 'Direktur'}. Catatan diteruskan ke Pengawas.`, 'info');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    const report = storageService.getReportById(reportId);
    if (!report) return;

    if (authUser?.role === 'supervisor') {
      if (!storageService.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        showToast('Akses Ditolak: Anda tidak dapat menghapus laporan di luar penugasan proyek/blok Anda!', 'error');
        return;
      }
    }

    const success = storageService.deleteReport(reportId, authUser);
    if (success) {
      loadData();
      showToast('Laporan berhasil dihapus.', 'info');
    } else {
      showToast('Gagal menghapus laporan: akses tidak diizinkan.', 'error');
    }
  };

  const handleResetData = () => {
    if (authUser?.role !== 'director') {
      showToast('Reset data master hanya dapat dilakukan oleh Direktur (Superadmin).', 'warning');
      return;
    }
    storageService.resetToDefault();
    loadData();
    setSelectedClientId('ALL');
    showToast('Data berhasil di-reset ke data default multi-klien PT. SURYALAND GROUP.');
  };

  const handleOpenPdfModal = (reportId: string) => {
    const report = storageService.getReportById(reportId);
    if (report && authUser?.role === 'supervisor') {
      if (!storageService.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        showToast('Akses Ditolak: Dokumen ini berada di luar penugasan proyek/blok resmi Anda.', 'warning');
        return;
      }
    }
    setSelectedReportIdForModal(reportId);
  };

  // Enforce Access Control when changing tabs
  const handleTabChange = (tab: TabKey) => {
    loadData();

    // Check permissions
    if (authUser?.role === 'supervisor') {
      if (tab === 'dashboard' || tab === 'master' || tab === 'company-profile' || tab === 'director-field-monitor' || tab === 'user-activity-log' || tab === 'user-management' || tab === 'approval' || tab === 'tutorial') {
        showToast('Akses Ditolak: Fitur ini hanya dapat diakses oleh Manajemen / Direksi.', 'warning');
        setActiveTab('wizard');
        return;
      }
    }

    if (authUser?.role === 'manager') {
      if (tab === 'dashboard' || tab === 'master' || tab === 'company-profile' || tab === 'wizard' || tab === 'supervisor-tools' || tab === 'user-management' || tab === 'user-activity-log' || tab === 'tutorial') {
        showToast('Akses Ditolak: Fitur ini tidak termasuk dalam wewenang akun Manager.', 'warning');
        setActiveTab('approval');
        return;
      }
    }

    if (authUser?.role === 'director') {
      if (tab === 'wizard') {
        showToast('Akses Ditolak: Penginputan Laporan Harian adalah wewenang khusus Pengawas Lapangan.', 'warning');
        setActiveTab('reports');
        return;
      }
      if (tab === 'supervisor-tools') {
        showToast('Akses Ditolak: Fitur Cepat Lapangan (P2H, Geotag, K3) khusus Pengawas Lapangan.', 'warning');
        setActiveTab('dashboard');
        return;
      }
    }

    setActiveTab(tab);
  };

  // If user is not logged in, render the Welcome & Login page
  if (!authUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        idleNotice={idleNotice}
        onDismissNotice={() => setIdleNotice(null)}
      />
    );
  }

  const effectiveRole: UserRole = authUser.role;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Global Header & Nav with Auth integration */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        authUser={authUser}
        onLogout={handleLogout}
        userRole={effectiveRole}
        isOnline={isOnline}
        setIsOnline={(online) => {
          setIsOnline(online);
          toggleFirestoreNetwork(online);
        }}
        onResetData={handleResetData}
        clients={clients}
        companyProfile={companyProfile}
        selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
        setSelectedClientId={handleSetSelectedClientId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Floating Alert Toast */}
      {toastMessage && (
        <div className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-semibold border ${
          toastMessage.type === 'error'
            ? 'bg-rose-950 text-rose-200 border-rose-600'
            : toastMessage.type === 'warning'
            ? 'bg-amber-950 text-amber-200 border-amber-600'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-slate-200 border-slate-700'
            : 'bg-slate-900 text-white border-emerald-500/50'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area - with responsive padding to accommodate bottom navigation on mobile */}
      <main className="flex-1 pb-20 lg:pb-10">
        {/* Offline Banner alert if offline mode */}
        {!isOnline && (
          <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs text-center flex items-center justify-center gap-2 shadow-sm">
            <AlertCircle className="w-4 h-4" />
            <span>Mode Lahan (Offline Aktif): Semua data dan foto ber-watermark disimpan secara aman di memori perangkat. Saat terhubung sinyal, klik "Offline Lahan" untuk sinkronisasi.</span>
          </div>
        )}

        {/* Tab 1: Executive Director Dashboard - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'dashboard' && (
          authUser.role === 'director' ? (
            <DashboardView
              reports={reports}
              equipments={equipments}
              onOpenPdfReport={handleOpenPdfModal}
              onNavigateReports={() => setActiveTab('reports')}
              onNavigateLogistics={() => setActiveTab('logistics')}
              onNavigateFieldMonitor={() => setActiveTab('director-field-monitor')}
              onNavigateActivityLog={() => setActiveTab('user-activity-log')}
              onNavigateUserManagement={() => setActiveTab('company-master')}
              onNavigateCompanyProfile={() => setActiveTab('company-master')}
              onApproveReport={handleApproveReport}
              userRole={effectiveRole}
              clients={clients}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              onNavigateMaster={() => setActiveTab('master')}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Terbatas Direktur</h3>
              <p className="text-xs text-slate-600">
                Dashboard Eksekutif hanya dapat diakses oleh Direktur (Superadmin). Silakan gunakan formulir input laporan atau rekap laporan.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Buka Form Laporan Harian
              </button>
            </div>
          )
        )}

        {/* Tab 2: 6-Step Supervisor Wizard */}
        {activeTab === 'wizard' && (
          <ReportWizard
            onReportSaved={handleReportSaved}
            onCancel={() => setActiveTab('reports')}
            isOnline={isOnline}
            initialClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : (selectedClientId !== 'ALL' ? selectedClientId : undefined)}
            userRole={authUser.role}
            authUser={authUser}
            onNavigateToReports={() => setActiveTab('reports')}
            onNavigateToTools={() => setActiveTab('supervisor-tools')}
          />
        )}

        {/* Tab 3: Report List */}
        {activeTab === 'reports' && (
          <ReportListView
            reports={reports}
            onOpenPdf={handleOpenPdfModal}
            onNewReport={() => setActiveTab('wizard')}
            onDeleteReport={handleDeleteReport}
            onApproveReport={handleApproveReport}
            userRole={effectiveRole}
            authUser={authUser}
            clients={clients}
            selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
            setSelectedClientId={handleSetSelectedClientId}
          />
        )}

        {/* Tab 4: Official PDF Sheet (Standalone Print Layout) */}
        {activeTab === 'official-pdf' && (
          <PdfReportModal
            reports={
              authUser.role === 'supervisor'
                ? reports.filter((r) => storageService.canSupervisorAccess(r.clientId, r.blockCode, authUser))
                : (selectedClientId === 'ALL' ? reports : reports.filter((r) => r.clientId === selectedClientId))
            }
            isStandaloneView={true}
            companyProfileProp={companyProfile}
          />
        )}

        {/* Tab 5: Inventaris Logistik Lapangan (BBM Tangki, Pelumas & Spare Part) */}
        {activeTab === 'logistics' && (
          <LogisticsInventoryView
            authUser={authUser}
            clients={clients}
            selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
            onSelectClientId={handleSetSelectedClientId}
            showToast={showToast}
          />
        )}

        {/* Tab 6: Fitur Khusus Pengawas Lapangan (P2H, Geotag Camera, HM Calc, Fuel Bowser, Safety Log) - STRICT: ONLY FOR SUPERVISOR */}
        {activeTab === 'supervisor-tools' && (
          authUser.role === 'supervisor' ? (
            <SupervisorToolsView
              authUser={authUser}
              clients={clients}
              selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
              onSelectClientId={handleSetSelectedClientId}
              showToast={showToast}
              onNavigateToWizard={() => setActiveTab('wizard')}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Pengawas Lapangan</h3>
              <p className="text-xs text-slate-600">
                Fitur Cepat Operasional (P2H, Kamera Geotagging, Kalkulator HM, Penerimaan Solar Keliling, dan Log Insiden Lahan) hanya dikhususkan bagi Pengawas Lapangan.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Dashboard Direktur
              </button>
            </div>
          )
        )}

        {/* Tab 7: Audit Hasil Input Pengawas Lapangan (Field Operational Suite Review) - READ-ONLY FIELD AUDIT FOR DIRECTOR & MANAGER */}
        {activeTab === 'director-field-monitor' && (
          (authUser.role === 'director' || authUser.role === 'manager') ? (
            <DirectorFieldMonitorView
              authUser={authUser}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClientId={setSelectedClientId}
              showToast={showToast}
              onOpenReport={(reportId) => handleOpenPdfModal(reportId)}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Manajemen</h3>
              <p className="text-xs text-slate-600">
                Menu Audit & Monitoring Hasil Pengawas Lapangan ini khusus untuk akses Direktur dan Manager.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab: APPROVAL PEKERJAAN PENGAWAS - KHUSUS MANAGER & DIREKTUR */}
        {activeTab === 'approval' && (
          (authUser.role === 'manager' || authUser.role === 'director') ? (
            <ManagerApprovalView
              authUser={authUser}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClientId={handleSetSelectedClientId}
              onOpenPdfReport={handleOpenPdfModal}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Manager & Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Approval Pekerjaan Pengawas (Verifikasi Laporan Harian, P2H Alat Berat, Mutasi Stok BBM & Insiden K3 Lapangan) hanya dapat diakses oleh akun Manager atau Direktur.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 8: Log Riwayat Aktivitas & Tag Lokasi GPS Pengguna - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'user-activity-log' && (
          authUser.role === 'director' ? (
            <UserActivityAuditLogView
              authUser={authUser}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Terbatas Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Log Riwayat Aktivitas & Tag Lokasi GPS ini khusus untuk audit Direktur.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 2: Master Data Perusahaan (1. Identitas & Logo, 2. Staff & TTD + User Mgmt, 3. Personil Tim Pekerja) */}
        {(activeTab === 'company-master' || activeTab === 'company-profile') && (
          authUser.role === 'director' ? (
            <CompanyMasterDataView
              companyProfile={companyProfile}
              onUpdateCompanyProfile={(updated) => {
                setCompanyProfile(updated);
                storageService.saveCompanyProfile(updated);
                showToast(`Identitas Perusahaan berhasil diperbarui! Logo dan Nama Singkat (${updated.shortName}) otomatis diterapkan.`, 'success');
              }}
              authUser={authUser}
              showToast={showToast}
              clients={clients}
              initialSubTab={activeTab === 'company-profile' ? 'identity' : 'identity'}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Direktur</h3>
              <p className="text-xs text-slate-600">
                Halaman Master Data Perusahaan (Identitas Resmi, Staff TTD & Manajemen User, serta Personil Tim Pekerja) hanya dapat diakses oleh akun Direktur Utama (Superadmin).
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 3: Master Data Proyek (1. Klien, 2. Lokasi & Pekerjaan, 3. Alat Berat & BBM, 4. Penugasan Kerja, 5. Target Harian) */}
        {activeTab === 'master' && (
          authUser.role === 'director' || authUser.role === 'manager' ? (
            <MasterDataView />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Master Data Terbatas</h3>
              <p className="text-xs text-slate-600">
                Pengaturan Master Data Proyek & Klien hanya dapat diakses oleh Manajemen (Direktur / Manager).
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab: User Management (Standalone or redirect to Company Master) */}
        {activeTab === 'user-management' && (
          authUser.role === 'director' ? (
            <CompanyMasterDataView
              companyProfile={companyProfile}
              onUpdateCompanyProfile={(updated) => {
                setCompanyProfile(updated);
                storageService.saveCompanyProfile(updated);
              }}
              authUser={authUser}
              showToast={showToast}
              clients={clients}
              initialSubTab="staff"
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Superadmin</h3>
              <p className="text-xs text-slate-600">
                Fitur Manajemen User hanya dapat diakses oleh Superadmin.
              </p>
            </div>
          )
        )}

        {/* Tab: Tutorial & Documentation */}
        {activeTab === 'tutorial' && (
          <TutorialView
            onNavigateTab={(tab) => setActiveTab(tab)}
          />
        )}
      </main>

      {/* Modal Popup for PDF Print View */}
      {selectedReportIdForModal && (
        <PdfReportModal
          reports={
            authUser.role === 'supervisor'
              ? reports.filter((r) => storageService.canSupervisorAccess(r.clientId, r.blockCode, authUser))
              : reports
          }
          selectedReportId={selectedReportIdForModal}
          onClose={() => setSelectedReportIdForModal(null)}
          isStandaloneView={false}
          companyProfileProp={companyProfile}
        />
      )}

      {/* Idle Timeout Warning Modal (Enhanced Security for Shared Tablets) */}
      {idleWarningSeconds !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-8 h-8 animate-pulse text-amber-400" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Keamanan Tablet Lapangan
              </span>
              <h3 className="text-xl font-black text-white mt-3">
                Sesi Akan Berakhir Otomatis
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tidak ada aktivitas selama 28 menit. Demi menjaga keamanan data operasional pada perangkat tablet bersama, sesi Anda akan otomatis keluar dalam:
              </p>
            </div>

            {/* Live Countdown Display */}
            <div className="py-4 px-6 bg-slate-950/90 border border-amber-500/40 rounded-2xl flex items-center justify-center gap-3 shadow-inner">
              <span className="text-4xl font-mono font-black text-amber-400 tracking-wider">
                {`${Math.floor(idleWarningSeconds / 60).toString().padStart(2, '0')}:${(idleWarningSeconds % 60).toString().padStart(2, '0')}`}
              </span>
              <span className="text-xs text-slate-400 text-left font-medium leading-tight">
                Menit:Detik<br />
                <span className="text-amber-300 font-bold">({idleWarningSeconds} detik)</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Sentuh <strong>"Lanjutkan Sesi"</strong> jika Anda masih menggunakan tablet ini.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleExtendSession}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Lanjutkan Sesi</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogout(true)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 text-center mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-300">SURYALAND APPS</strong> • Sistem Pengawasan Proyek Land Clearing (Zero Burning Method)
          </div>
          <div className="text-[11px] text-slate-400">
            Hak Cipta © 2026 PT. SURYALAND GROUP. Masuk sebagai: <span className="text-amber-400 font-bold">{authUser.username}</span> ({authUser.roleTitle})
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop/laptop) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        userRole={effectiveRole}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
    </div>
  );
}
