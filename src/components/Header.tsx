import React, { useState, useEffect } from 'react';
import { 
  Menu,
  X,
  FileText, 
  LayoutDashboard, 
  Database, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  PlusCircle, 
  Printer, 
  LogOut,
  HardHat,
  ShieldCheck,
  AlertTriangle,
  Fuel,
  ChevronDown,
  Building2,
  Check,
  Wrench,
  Layers,
  Sparkles,
  ClipboardCheck,
  Activity,
  Users,
  Lock,
  BookOpen
} from 'lucide-react';
import { UserRole, Client, AuthUser, CompanyProfile } from '../types';
import { ConnectionHealthCheck } from './ConnectionHealthCheck';
import { PWAInstallButton } from './PWAInstallButton';
import { getLastSuccessfulSyncTime } from '../services/firestoreSync';

export type TabKey = 
  | 'dashboard' 
  | 'company-master'
  | 'master'
  | 'company-profile'
  | 'director-field-monitor'
  | 'logistics'
  | 'reports' 
  | 'official-pdf' 
  | 'user-management'
  | 'user-activity-log'
  | 'tutorial'
  | 'wizard' 
  | 'supervisor-tools'
  | 'approval'
  | 'data-recovery'
  | 'client-portal'
  | 'posts';

interface HeaderProps {
  activeTab: TabKey;
  setActiveTab: (tab: TabKey) => void;
  authUser: AuthUser | null;
  onLogout: () => void;
  userRole?: UserRole;
  setUserRole?: (role: UserRole) => void;
  isOnline: boolean;
  setIsOnline: (online: boolean) => void;
  onResetData: () => void;
  pendingSyncCount?: number;
  selectedClientId: string;
  setSelectedClientId: (clientId: string) => void;
  clients: Client[];
  companyProfile?: CompanyProfile;
  isSidebarOpen?: boolean;
  setIsSidebarOpen?: (open: boolean) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  authUser,
  onLogout,
  isOnline,
  setIsOnline,
  onResetData,
  pendingSyncCount = 0,
  selectedClientId,
  setSelectedClientId,
  clients,
  companyProfile,
  isSidebarOpen: externalIsSidebarOpen,
  setIsSidebarOpen: externalSetIsSidebarOpen,
}) => {
  // Local state for sidebar if not controlled externally
  const [internalIsSidebarOpen, setInternalIsSidebarOpen] = useState<boolean>(false);
  const isSidebarOpen = externalIsSidebarOpen !== undefined ? externalIsSidebarOpen : internalIsSidebarOpen;
  const setIsSidebarOpen = externalSetIsSidebarOpen || setInternalIsSidebarOpen;

  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);
  const [resetConfirmationInput, setResetConfirmationInput] = useState<string>('');
  const [resetUnderstandChecked, setResetUnderstandChecked] = useState<boolean>(false);
  const [isResetting, setIsResetting] = useState<boolean>(false);

  const activeClientObj = clients.find((c) => c.id === selectedClientId);
  const isSupervisor = authUser?.role === 'supervisor';
  const isDirector = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';
  const isManager = authUser?.role === 'manager' || authUser?.userLevel === 'Manager' || authUser?.userLevel === 'Site Manager';
  const isClient = authUser?.role === 'client' || authUser?.userLevel === 'Klien';

  // Close sidebar on Escape key or route change
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsSidebarOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [setIsSidebarOpen]);

  // Prevent background scrolling when sidebar drawer is open on mobile
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isSidebarOpen]);

  const handleSelectTab = (tab: TabKey) => {
    setActiveTab(tab);
    setIsSidebarOpen(false);
  };

  // Nav item list configurations strictly ordered as requested by user
  const navItems = isClient
    ? [
        {
          key: 'client-portal' as TabKey,
          label: 'Monitoring & Laporan SPK',
          subtitle: 'Progres Fisik & Laporan Sesuai SPK Anda',
          icon: LayoutDashboard,
          visible: true,
        },
        {
          key: 'reports' as TabKey,
          label: 'Arsip Laporan Harian',
          subtitle: 'Daftar Laporan Harian Sesuai SPK',
          icon: FileText,
          visible: true,
        },
        {
          key: 'official-pdf' as TabKey,
          label: 'Cetak PDF Resmi',
          subtitle: 'Dokumen Laporan Resmi Klien',
          icon: Printer,
          visible: true,
        },
      ]
    : isDirector
    ? [
        {
          key: 'dashboard' as TabKey,
          label: 'Dashboard',
          subtitle: 'Analisis & KPI Eksekutif',
          icon: LayoutDashboard,
          visible: true,
        },
        {
          key: 'company-master' as TabKey,
          label: 'Master Data Perusahaan',
          subtitle: 'Profil, Logo, Staff TTD & Tim Pendukung',
          icon: Building2,
          visible: true,
        },
        {
          key: 'master' as TabKey,
          label: 'Master Data Proyek',
          subtitle: 'Klien, Lokasi, Unit, Penugasan & Target',
          icon: Database,
          visible: true,
        },
        {
          key: 'director-field-monitor' as TabKey,
          label: 'Audit Pengawas',
          subtitle: 'P2H, HM, Solar & K3',
          icon: ClipboardCheck,
          visible: true,
        },
        {
          key: 'approval' as TabKey,
          label: 'Approval Pengawas',
          subtitle: 'Verifikasi & Otorisasi Pekerjaan',
          icon: ShieldCheck,
          visible: true,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik & BBM',
          subtitle: 'Stok Tangki Solar & Spare Part',
          icon: Fuel,
          visible: true,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap Laporan',
          subtitle: 'Arsip & Otorisasi Land Clearing',
          icon: FileText,
          visible: true,
        },
        {
          key: 'official-pdf' as TabKey,
          label: 'Cetak Pdf',
          subtitle: 'Format Dokumen Resmi Cetak',
          icon: Printer,
          visible: true,
        },
        {
          key: 'user-activity-log' as TabKey,
          label: 'Log Aktivitas & GPS',
          subtitle: 'Audit Pengguna, Lokasi & Sesi',
          icon: Activity,
          visible: true,
        },
        {
          key: 'posts' as TabKey,
          label: 'Papan Memo / Posts',
          subtitle: 'Pengumuman & Uji Validasi Zod',
          icon: FileText,
          visible: true,
        },
        {
          key: 'tutorial' as TabKey,
          label: 'Tutorial',
          subtitle: 'Panduan Modul, Fitur & SOP',
          icon: BookOpen,
          visible: true,
        },
      ]
    : isManager
    ? [
        {
          key: 'approval' as TabKey,
          label: 'Approval Pengawas',
          subtitle: 'Verifikasi & Otorisasi Lapangan',
          icon: ShieldCheck,
          visible: true,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap Laporan',
          subtitle: 'Rekap Laporan Harian Land Clearing',
          icon: FileText,
          visible: true,
        },
        {
          key: 'director-field-monitor' as TabKey,
          label: 'Audit Pengawas',
          subtitle: 'Review P2H, HM, Solar & K3',
          icon: ClipboardCheck,
          visible: true,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik & BBM',
          subtitle: 'Verifikasi Stok Masuk & Keluar',
          icon: Fuel,
          visible: true,
        },
        {
          key: 'official-pdf' as TabKey,
          label: 'Cetak Pdf',
          subtitle: 'Format Dokumen Resmi Cetak',
          icon: Printer,
          visible: true,
        },
        {
          key: 'posts' as TabKey,
          label: 'Papan Memo / Posts',
          subtitle: 'Pengumuman & Uji Validasi Zod',
          icon: FileText,
          visible: true,
        },
        {
          key: 'tutorial' as TabKey,
          label: 'Tutorial',
          subtitle: 'Panduan Fitur & SOP',
          icon: BookOpen,
          visible: true,
        },
      ]
    : [
        {
          key: 'wizard' as TabKey,
          label: 'Input Laporan',
          subtitle: 'Form 6-Langkah Lapangan',
          icon: PlusCircle,
          visible: true,
        },
        {
          key: 'supervisor-tools' as TabKey,
          label: 'Fitur Cepat',
          subtitle: 'P2H, Solar & Log K3',
          icon: HardHat,
          visible: true,
        },
        {
          key: 'logistics' as TabKey,
          label: 'Logistik & BBM',
          subtitle: 'Stok Tangki Solar & Spare Part',
          icon: Fuel,
          visible: true,
        },
        {
          key: 'reports' as TabKey,
          label: 'Rekap Laporan',
          subtitle: 'Arsip & Status Laporan',
          icon: FileText,
          visible: true,
        },
        {
          key: 'official-pdf' as TabKey,
          label: 'Cetak Pdf',
          subtitle: 'Format Resmi Direktur & Klien',
          icon: Printer,
          visible: true,
        },
        {
          key: 'posts' as TabKey,
          label: 'Papan Memo / Posts',
          subtitle: 'Pengumuman Lapangan & Memo',
          icon: FileText,
          visible: true,
        },
        {
          key: 'tutorial' as TabKey,
          label: 'Tutorial',
          subtitle: 'Panduan Pengawas Lapangan',
          icon: BookOpen,
          visible: true,
        },
      ];

  return (
    <>
      {/* MAIN TOP NAVIGATION BAR */}
      <header className="bg-slate-900/95 backdrop-blur-md text-white border-b border-slate-800/90 sticky top-0 z-40 transition-colors duration-200">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16 gap-2">
            
            {/* LEFT: Hamburger Toggle & Brand Identity */}
            <div className="flex items-center gap-2.5 sm:gap-3">
              {/* Prominent Hamburger Button to Open Hidden Menu Drawer */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                className="flex items-center gap-2 px-3 py-1.5 -ml-1 rounded-xl bg-slate-800/90 hover:bg-slate-700 text-slate-200 hover:text-amber-400 border border-slate-700/80 transition-all duration-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-amber-500/50 cursor-pointer shadow-xs"
                title="Buka Menu Tersembunyi (Sidebar)"
                aria-label="Toggle Navigation Sidebar"
              >
                <Menu className="w-5 h-5 text-amber-400 shrink-0" />
                <span className="text-xs font-black tracking-wide hidden sm:inline text-amber-400">
                  MENU
                </span>
              </button>

              {/* Logo & Brand Name */}
              <button
                type="button"
                onClick={() => handleSelectTab(isClient ? 'client-portal' : isDirector ? 'dashboard' : isManager ? 'approval' : 'wizard')}
                className="flex items-center gap-2.5 text-left group cursor-pointer focus:outline-none"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 group-hover:scale-105 transition-transform duration-200 shrink-0 overflow-hidden">
                  {companyProfile?.logoUrl ? (
                    <img 
                      src={companyProfile.logoUrl} 
                      alt={companyProfile.shortName || 'Logo'} 
                      className="w-full h-full object-contain"
                    />
                  ) : (
                    <span className="text-base sm:text-lg">🚜</span>
                  )}
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center gap-1.5 leading-none">
                    <span className="text-sm sm:text-base font-black tracking-wider text-white group-hover:text-amber-400 transition-colors duration-200">
                      {companyProfile?.shortName || 'RBS'}
                    </span>
                    <span className="text-[10px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                      APPS
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-medium hidden sm:inline tracking-tight mt-0.5 truncate max-w-[200px]">
                    {companyProfile?.officialName || 'PT. RBS GROUP'} • Land Clearing
                  </span>
                </div>
              </button>
            </div>



            {/* RIGHT: Quick Action & Sidebar Menu Trigger */}
            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              {/* PWA Install Button */}
              <PWAInstallButton variant="header" />

              {/* User Profile & Direct Action Button */}
              {authUser && (
                <div className="flex items-center gap-1.5 pl-1.5 border-l border-slate-800">
                  {/* Quick Tutorial Access Button (Hidden for Client) */}
                  {!isClient && (
                    <button
                      type="button"
                      onClick={() => handleSelectTab('tutorial')}
                      className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-200 cursor-pointer border ${
                        activeTab === 'tutorial'
                          ? 'bg-amber-500 text-slate-950 border-amber-400'
                          : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white border-slate-700/80'
                      }`}
                      title="Buka Buku Panduan / Tutorial Penggunaan Modul"
                    >
                      <BookOpen className="w-3.5 h-3.5 text-amber-400" />
                      <span className="hidden sm:inline">Panduan</span>
                    </button>
                  )}

                  {/* Role Avatar Chip / Menu Button */}
                  <button
                    type="button"
                    onClick={() => setIsSidebarOpen(true)}
                    className="flex items-center gap-1.5 p-1.5 sm:px-2.5 sm:py-1.5 rounded-lg bg-slate-800/90 hover:bg-slate-700/90 border border-slate-700/80 text-xs font-bold transition-all duration-200 cursor-pointer text-slate-200 shadow-xs"
                    title="Buka Menu Pengguna & Status Sistem Lengkap"
                  >
                    <div className="w-5 h-5 rounded-md bg-slate-700 flex items-center justify-center text-slate-200 font-bold shrink-0">
                      {isSupervisor ? (
                        <HardHat className="w-3.5 h-3.5 text-amber-400" />
                      ) : isManager ? (
                        <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                      ) : (
                        <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      )}
                    </div>
                    <span className="hidden sm:inline text-xs font-bold truncate max-w-[90px]">
                      {authUser.username}
                    </span>
                  </button>
                </div>
              )}
            </div>

          </div>
        </div>
      </header>

      {/* SIDEBAR TERSEMBUNYI (HIDDEN OFF-CANVAS DRAWER MENU) */}
      <div 
        className={`fixed inset-0 z-50 transition-all duration-300 ${
          isSidebarOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        aria-hidden={!isSidebarOpen}
      >
        {/* Backdrop Overlay with Blur */}
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className={`absolute inset-0 bg-slate-950/70 backdrop-blur-xs transition-opacity duration-300 ${
            isSidebarOpen ? 'opacity-100' : 'opacity-0'
          }`}
        />

        {/* Slide-out Drawer Panel */}
        <aside 
          className={`absolute top-0 bottom-0 left-0 w-80 max-w-[85vw] bg-slate-900 border-r border-slate-800/90 shadow-2xl flex flex-col justify-between z-10 transition-transform duration-300 ease-out transform ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          {/* Top Section */}
          <div className="flex flex-col flex-1 overflow-y-auto no-scrollbar">
            {/* Drawer Header */}
            <div className="p-4 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center text-slate-950 font-black shadow-md shadow-amber-500/20 overflow-hidden">
                  {companyProfile?.logoUrl ? (
                    <img src={companyProfile.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                  ) : (
                    <span className="text-lg">🚜</span>
                  )}
                </div>
                <div>
                  <div className="text-sm font-black text-amber-400 tracking-wider">
                    {companyProfile?.shortName || 'RBS'} APPS
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium truncate max-w-[170px]">
                    {companyProfile?.officialName || 'PT. RBS GROUP'}
                  </div>
                </div>
              </div>

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsSidebarOpen(false)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-all duration-200 active:scale-90 cursor-pointer"
                title="Tutup Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* User Profile Card */}
            {authUser && (
              <div className="p-4 mx-3 my-3 rounded-xl bg-slate-800/60 border border-slate-700/60">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-700 border border-slate-600 flex items-center justify-center font-black text-white shrink-0">
                    {isSupervisor ? (
                      <HardHat className="w-5 h-5 text-amber-400" />
                    ) : isManager ? (
                      <ShieldCheck className="w-5 h-5 text-sky-400" />
                    ) : (
                      <ShieldCheck className="w-5 h-5 text-emerald-400" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-bold text-white truncate">
                      {authUser.displayName || authUser.username}
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium mt-0.5">
                      {isClient
                        ? 'Klien (Monitoring Progress & Laporan)'
                        : isSupervisor
                        ? 'Pengawas Lapangan'
                        : isManager
                        ? 'Manager Operasional'
                        : 'Direktur (Superadmin)'}
                    </div>
                    <div className="text-[9px] text-emerald-400 flex items-center gap-1 mt-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                      <span>Sesi Aktif</span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Navigation Menu List */}
            <div className="px-3 py-3 border-t border-slate-800/80">
              <div className="px-3 pb-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Menu Utama
              </div>
              <div className="space-y-1">
                {navItems
                  .filter((item) => item.visible)
                  .map((item) => {
                    const Icon = item.icon;
                    const isActive = activeTab === item.key || (item.key === 'company-master' && activeTab === 'company-profile');
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() => handleSelectTab(item.key)}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all duration-200 cursor-pointer text-left group ${
                          isActive
                            ? 'bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/20 translate-x-1'
                            : 'text-slate-300 hover:text-white hover:bg-slate-800/80 hover:translate-x-1'
                        }`}
                      >
                        <div className={`p-1.5 rounded-lg transition-colors ${
                          isActive 
                            ? 'bg-slate-950/20 text-slate-950' 
                            : 'bg-slate-800 text-amber-400 group-hover:bg-amber-500 group-hover:text-slate-950'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="font-bold text-xs truncate">{item.label}</div>
                          <div className={`text-[10px] truncate ${isActive ? 'text-slate-900/80' : 'text-slate-400'}`}>
                            {item.subtitle}
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>
            </div>

            {/* Status Sistem & Database (Indikator Koneksi Firestore) - Tepat di Bawah Menu Tutorial */}
            <div className="px-3 py-3 border-t border-slate-800/80 space-y-2.5">
              <div className="px-3 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Status Sistem &amp; Database
              </div>

              {/* PWA Install Button */}
              <PWAInstallButton variant="sidebar" />

              {/* Connection Health Check Indicator */}
              <ConnectionHealthCheck variant="dashboard" className="!p-2.5 !bg-slate-950/90 !border-slate-800" />
            </div>
          </div>

          {/* Bottom Drawer Actions: Online/Offline & Reset & Logout */}
          <div className="p-4 border-t border-slate-800 space-y-2 bg-slate-950/40">
            {/* Online/Offline Toggle */}
            <button
              type="button"
              onClick={() => setIsOnline(!isOnline)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 border cursor-pointer ${
                isOnline
                  ? 'bg-emerald-950/50 border-emerald-800 text-emerald-300 hover:bg-emerald-900/50'
                  : 'bg-amber-950/50 border-amber-800 text-amber-300 hover:bg-amber-900/50'
              }`}
            >
              <div className="flex items-center gap-2">
                {isOnline ? <Wifi className="w-4 h-4 text-emerald-400" /> : <WifiOff className="w-4 h-4 text-amber-400" />}
                <span>{isOnline ? 'Mode Online (Terhubung)' : 'Mode Offline Lahan'}</span>
              </div>
              {pendingSyncCount > 0 ? (
                <span className="bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.5 rounded-full">
                  {pendingSyncCount} pending
                </span>
              ) : (
                <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`}></span>
              )}
            </button>

            {/* Reset Data Button: Khusus Direktur / Superadmin */}
            {isDirector && (
              <button
                type="button"
                onClick={() => {
                  setIsSidebarOpen(false);
                  setShowResetConfirm(true);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-all duration-200 cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Data ke Standar Default</span>
              </button>
            )}

            {/* Logout Button */}
            <button
              type="button"
              onClick={() => {
                setIsSidebarOpen(false);
                setShowLogoutConfirm(true);
              }}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-600/90 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-md transition-all duration-200 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Keluar dari Akun</span>
            </button>

            <div className="text-[10px] text-center text-slate-400 pt-1">
              Versi 2.4 • Zero Burning Method
            </div>
          </div>
        </aside>
      </div>

      {/* IN-APP MODAL: KONFIRMASI LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Konfirmasi Keluar (Logout)
              </h3>
              <p className="text-xs text-slate-600">
                Apakah Anda yakin ingin keluar dari akun <strong className="text-slate-900 font-bold">{authUser?.username}</strong>? Anda akan dialihkan kembali ke halaman login.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowLogoutConfirm(false)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowLogoutConfirm(false);
                  onLogout();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white text-xs font-black shadow-md transition cursor-pointer"
              >
                Ya, Logout
              </button>
            </div>
          </div>
        </div>
      )}

      {/* IN-APP MODAL: RESET DATA KE STANDAR DEFAULT DENGAN VALIDASI PENGAMAN */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4 border border-rose-200 animate-in fade-in zoom-in-95 duration-200 my-auto">
            <div className="w-12 h-12 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-inner">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-slate-900">
                Reset Data ke Standar Default
              </h3>
              <p className="text-xs font-semibold text-rose-700 uppercase tracking-wider">
                Konfirmasi Pembersihan Database Total
              </p>
            </div>

            <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 text-xs text-slate-800 space-y-2">
              <p className="font-bold text-rose-950">
                Tindakan ini akan <span className="underline decoration-rose-500">MENGHAPUS SEMUA DATA INPUTAN</span> di semua halaman akses:
              </p>
              <ul className="list-disc list-inside text-[11px] text-slate-700 space-y-1">
                <li><strong>Akses Direktur</strong>: Master Klien, Blok, Alat Berat, Tenaga Kerja, Inventori, Target Harian.</li>
                <li><strong>Akses Pengawas</strong>: Seluruh Laporan Harian, Logistik BBM, Foto Lapangan.</li>
                <li><strong>Akses Manager & Klien</strong>: Approval Laporan & Portal Monitoring.</li>
              </ul>
              <div className="pt-2 border-t border-rose-200/80 text-[11px]">
                Seluruh database dibersihkan total seperti <strong>kondisi awal baru di-install (kosongan)</strong>.
              </div>
            </div>

            {/* Secret default developer/maintenance accounts info box */}
            <div className="bg-slate-900 text-white p-3.5 rounded-xl text-xs space-y-2 shadow-sm">
              <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wide flex items-center justify-between">
                <span>Akun Default Rahasia (Dev / Tester / Maintenance):</span>
                <span className="text-[9px] bg-slate-800 text-slate-300 px-1.5 py-0.5 rounded border border-slate-700">Tidak tampil di UI Direktur</span>
              </div>
              <div className="grid grid-cols-2 gap-1.5 text-[11px] font-mono">
                <div className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[9px]">1. Superadmin (Direktur):</span>
                  <div className="text-amber-300 font-bold">superadmin</div>
                  <div className="text-slate-400 text-[10px]">Pass: <span className="text-emerald-300 font-bold">@Super12345</span></div>
                </div>
                <div className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[9px]">2. Site Manager:</span>
                  <div className="text-amber-300 font-bold">manager</div>
                  <div className="text-slate-400 text-[10px]">Pass: <span className="text-emerald-300 font-bold">@manager12345</span></div>
                </div>
                <div className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[9px]">3. Pengawas Lapangan:</span>
                  <div className="text-amber-300 font-bold">pengawas</div>
                  <div className="text-slate-400 text-[10px]">Pass: <span className="text-emerald-300 font-bold">@pengawas12345</span></div>
                </div>
                <div className="bg-slate-800/90 p-1.5 rounded-lg border border-slate-700">
                  <span className="text-slate-400 block text-[9px]">4. Klien Mitra:</span>
                  <div className="text-amber-300 font-bold">klienpt</div>
                  <div className="text-slate-400 text-[10px]">Pass: <span className="text-emerald-300 font-bold">@klien12345</span></div>
                </div>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                *Akun tersimpan aman di database untuk kebutuhan testing & maintenance pengembang.
              </p>
            </div>

            {/* Validasi Konfirmasi Pengaman */}
            <div className="space-y-3 pt-1">
              <label className="flex items-start gap-2.5 cursor-pointer bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                <input
                  type="checkbox"
                  checked={resetUnderstandChecked}
                  onChange={(e) => setResetUnderstandChecked(e.target.checked)}
                  className="mt-0.5 rounded text-rose-600 focus:ring-rose-500 w-4 h-4 cursor-pointer"
                />
                <span className="text-[11px] text-slate-700 font-medium leading-tight">
                  Saya paham seluruh data laporan dan master data proyek akan <strong>dihapus permanen</strong>.
                </span>
              </label>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-700 flex justify-between">
                  <span>Ketik kata <strong className="text-rose-600 font-mono">RESET</strong> untuk konfirmasi:</span>
                  {resetConfirmationInput.trim().toUpperCase() === 'RESET' && (
                    <span className="text-emerald-600 font-bold flex items-center gap-0.5 text-[10px]">
                      <Check className="w-3 h-3" /> Valid
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  placeholder="Ketik RESET di sini..."
                  value={resetConfirmationInput}
                  onChange={(e) => setResetConfirmationInput(e.target.value)}
                  disabled={isResetting}
                  className="w-full px-3 py-2 border-2 border-slate-300 focus:border-rose-500 rounded-xl text-xs font-mono font-bold uppercase tracking-wider text-slate-900 focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                disabled={isResetting}
                onClick={() => {
                  setShowResetConfirm(false);
                  setResetConfirmationInput('');
                  setResetUnderstandChecked(false);
                }}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer disabled:opacity-50"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={
                  !resetUnderstandChecked || 
                  resetConfirmationInput.trim().toUpperCase() !== 'RESET' || 
                  isResetting
                }
                onClick={async () => {
                  setIsResetting(true);
                  try {
                    await onResetData();
                  } finally {
                    setIsResetting(false);
                    setShowResetConfirm(false);
                    setResetConfirmationInput('');
                    setResetUnderstandChecked(false);
                  }
                }}
                className={`w-full px-4 py-2.5 rounded-xl text-xs font-black shadow-md transition flex items-center justify-center gap-1.5 ${
                  resetUnderstandChecked && resetConfirmationInput.trim().toUpperCase() === 'RESET' && !isResetting
                    ? 'bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white cursor-pointer shadow-rose-600/30'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                }`}
              >
                {isResetting ? (
                  <>
                    <RotateCcw className="w-3.5 h-3.5 animate-spin" />
                    <span>Mereset Data...</span>
                  </>
                ) : (
                  <span>Hapus & Reset Data</span>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
