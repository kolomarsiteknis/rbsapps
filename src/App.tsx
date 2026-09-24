/**
 * SURYALAND APPS - Heavy Equipment Land Clearing Plantation Project
 * Zero Burning Method (Metode Tanpa Bakar)
 * PT. SURYALAND GROUP
 */

import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ReportWizard } from './components/ReportWizard';
import { ReportListView } from './components/ReportListView';
import { PdfReportModal } from './components/PdfReportModal';
import { MasterDataView } from './components/MasterDataView';
import { LoginPage } from './components/LoginPage';
import { storageService } from './services/storageService';
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

  const [activeTab, setActiveTab] = useState<'dashboard' | 'wizard' | 'reports' | 'master' | 'official-pdf'>('wizard');
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('ALL');

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedReportIdForModal, setSelectedReportIdForModal] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' } | null>(null);

  // Load initial data
  useEffect(() => {
    loadData();
    if (authUser) {
      // Set initial tab based on role
      if (authUser.role === 'supervisor') {
        setActiveTab('wizard');
      } else {
        setActiveTab('dashboard');
      }
    }
  }, [authUser?.username]);

  const loadData = () => {
    setClients(storageService.getClients());
    setReports(storageService.getReports());
    setEquipments(storageService.getEquipments());
  };

  const showToast = (text: string, type: 'success' | 'info' | 'warning' = 'success') => {
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
      setActiveTab('wizard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Pengawas Lapangan.`);
    } else {
      setActiveTab('dashboard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Direktur (Superadmin).`);
    }
  };

  // Logout handler
  const handleLogout = () => {
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
      showToast(`Laporan ${updated.reportNumber} resmi disetujui Direktur.`);
    }
  };

  const handleDeleteReport = (reportId: string) => {
    storageService.deleteReport(reportId);
    loadData();
    showToast('Laporan berhasil dihapus.', 'info');
  };

  const handleResetData = () => {
    storageService.resetToDefault();
    loadData();
    setSelectedClientId('ALL');
    showToast('Data berhasil di-reset ke data default multi-klien PT. SURYALAND GROUP.');
  };

  const handleOpenPdfModal = (reportId: string) => {
    setSelectedReportIdForModal(reportId);
  };

  // Enforce Access Control when changing tabs
  const handleTabChange = (tab: 'dashboard' | 'wizard' | 'reports' | 'master' | 'official-pdf') => {
    loadData();

    // Check permissions
    if (authUser?.role === 'supervisor') {
      if (tab === 'dashboard' || tab === 'master') {
        showToast('Akses Ditolak: Fitur ini hanya dapat diakses oleh Direktur (Superadmin).', 'warning');
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
        setIsOnline={setIsOnline}
        onResetData={handleResetData}
        clients={clients}
        selectedClientId={selectedClientId}
        setSelectedClientId={setSelectedClientId}
      />

      {/* Floating Alert Toast */}
      {toastMessage && (
        <div className={`fixed bottom-6 right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-semibold border ${
          toastMessage.type === 'warning'
            ? 'bg-amber-950 text-amber-200 border-amber-600'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-slate-200 border-slate-700'
            : 'bg-slate-900 text-white border-emerald-500/50'
        }`}>
          {toastMessage.type === 'warning' ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 pb-16">
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
            initialClientId={selectedClientId !== 'ALL' ? selectedClientId : undefined}
            userRole={authUser.role}
            onNavigateToReports={() => setActiveTab('reports')}
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
            clients={clients}
            selectedClientId={selectedClientId}
            setSelectedClientId={setSelectedClientId}
          />
        )}

        {/* Tab 4: Official PDF Sheet (Standalone Print Layout) */}
        {activeTab === 'official-pdf' && (
          <PdfReportModal
            reports={selectedClientId === 'ALL' ? reports : reports.filter((r) => r.clientId === selectedClientId)}
            isStandaloneView={true}
          />
        )}

        {/* Tab 5: Master Data & Equipment Settings - STRICT: ONLY FOR DIRECTOR */}
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
      </main>

      {/* Modal Popup for PDF Print View */}
      {selectedReportIdForModal && (
        <PdfReportModal
          reports={reports}
          selectedReportId={selectedReportIdForModal}
          onClose={() => setSelectedReportIdForModal(null)}
          isStandaloneView={false}
        />
      )}

      {/* Corporate Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 text-center">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div>
            <strong className="text-slate-300">SURYALAND APPS</strong> • Sistem Pengawasan Proyek Land Clearing (Zero Burning Method)
          </div>
          <div className="text-[11px] text-slate-400">
            Hak Cipta © 2026 PT. SURYALAND GROUP. Masuk sebagai: <span className="text-amber-400 font-bold">{authUser.username}</span> ({authUser.roleTitle})
          </div>
        </div>
      </footer>
    </div>
  );
}
