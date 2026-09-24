/**
 * SURYALAND APPS - Heavy Equipment Land Clearing Plantation Project
 * Zero Burning Method (Metode Tanpa Bakar)
 * PT. SURYALAND GROUP
 */

import React, { useState, useEffect } from 'react';
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
import { UserActivityAuditLogView } from './components/UserActivityAuditLogView';
import { UserManagementView } from './components/UserManagementView';
import { TutorialView } from './components/TutorialView';
import { LoginPage } from './components/LoginPage';
import { storageService } from './services/storageService';
import { initFirestoreSync, onSyncStatusChange, toggleFirestoreNetwork, SyncStatus } from './services/firestoreSync';
import { recordUserActivity } from './utils/activityLogger';
import { DailyReport, Equipment, UserRole, Client, AuthUser } from './types';
import { CheckCircle2, AlertCircle, ShieldAlert } from 'lucide-react';

const AUTH_STORAGE_KEY = 'suryaland_auth_user_v1';

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

  const [activeTab, setActiveTab] = useState<TabKey>('wizard');
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

    window.addEventListener('suryaland_firestore_sync', handleFirestoreSync);
    return () => {
      unsubSyncStatus();
      window.removeEventListener('suryaland_firestore_sync', handleFirestoreSync);
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

  // Login handler
  const handleLoginSuccess = (user: AuthUser) => {
    setAuthUser(user);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save auth state', e);
    }

    if (user.role === 'supervisor') {
      const assignedId = (user.assignedClientId && user.assignedClientId !== 'all') ? user.assignedClientId : 'client-1';
      setSelectedClientId(assignedId);
      setActiveTab('wizard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Pengawas Lapangan untuk ${user.assignedClientName || 'proyek penugasan'}.`);
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
      actionDescription: `Pengguna berhasil login ke sistem sebagai ${user.role === 'director' ? 'Direktur (Superadmin)' : 'Pengawas Lapangan'}.`,
      targetEntity: `Sesi ${user.role === 'director' ? 'Direksi' : 'Mobile Pengawas'}`,
    });
  };

  // Logout handler
  const handleLogout = () => {
    if (authUser) {
      recordUserActivity({
        userId: authUser.id,
        userName: authUser.displayName,
        userRole: authUser.role,
        userEmail: authUser.email,
        actionCategory: 'AUTH',
        actionTitle: `Keluar Sesi: ${authUser.displayName}`,
        actionDescription: `Pengguna keluar (logout) dari sistem aplikasi.`,
        targetEntity: `Sesi ${authUser.role === 'director' ? 'Direksi' : 'Pengawas'}`,
      });
    }

    setAuthUser(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
    } catch (e) {
      console.error('Failed to remove auth state', e);
    }
    showToast('Anda telah berhasil keluar dari sistem.', 'info');
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
    if (authUser?.role !== 'director') {
      showToast('Persetujuan dokumen hanya memiliki otorisasi untuk akun Direktur.', 'warning');
      return;
    }
    const directorName = authUser?.displayName || 'Ir. Hendra Wijaya, M.Si';
    const updated = storageService.approveReportByDirector(reportId, directorName);
    if (updated) {
      loadData();
      recordUserActivity({
        userId: authUser?.id,
        userName: directorName,
        userRole: 'director',
        userEmail: authUser?.email,
        actionCategory: 'REPORT',
        actionTitle: `Approval Laporan ${updated.reportNumber}`,
        actionDescription: `Memberikan tanda tangan persetujuan resmi Direktur untuk laporan ${updated.clientName} (Blok ${updated.blockCode}).`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });
      showToast(`Laporan ${updated.reportNumber} resmi disetujui Direktur.`);
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
      if (tab === 'dashboard' || tab === 'master' || tab === 'director-field-monitor' || tab === 'user-activity-log' || tab === 'user-management') {
        showToast('Akses Ditolak: Fitur ini hanya dapat diakses dan diinput oleh Superadmin.', 'warning');
        setActiveTab('wizard');
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
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
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
              onNavigateUserManagement={() => setActiveTab('user-management')}
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

        {/* Tab 7: Audit Hasil Input Pengawas Lapangan (Field Operational Suite Review) - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'director-field-monitor' && (
          authUser.role === 'director' ? (
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
              <h3 className="font-black text-slate-900 text-base">Akses Terbatas Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Audit & Monitoring Hasil Pengawas Lapangan ini khusus untuk akses Direktur.
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

        {/* Tab 9: Master Data & Equipment Settings - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'master' && (
          authUser.role === 'director' ? (
            <MasterDataView />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Master Data Terbatas</h3>
              <p className="text-xs text-slate-600">
                Pengaturan Master Data & Klien hanya dapat diubah oleh Direktur (Superadmin).
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

        {/* Tab 10: User Management (CRUD Pengguna, Proyek & Blok) - STRICT: ONLY FOR SUPERADMIN */}
        {activeTab === 'user-management' && (
          authUser.role === 'director' ? (
            <UserManagementView
              authUser={authUser}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Superadmin</h3>
              <p className="text-xs text-slate-600">
                Fitur Manajemen User (CRUD Data User, Penetapan Proyek & Lokasi Kerja) hanya dapat diakses dan diinput oleh Superadmin.
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

        {/* Tab 11: Superadmin Tutorial & Documentation - STRICT: ONLY FOR SUPERADMIN */}
        {activeTab === 'tutorial' && (
          authUser.role === 'director' ? (
            <TutorialView
              onNavigateTab={(tab) => setActiveTab(tab)}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Superadmin</h3>
              <p className="text-xs text-slate-600">
                Halaman Panduan & Tutorial Penggunaan Fitur Komprehensif ini dikhususkan bagi Akun Superadmin / Direktur.
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
        />
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
