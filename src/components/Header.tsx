import React, { useState } from 'react';
import { 
  FileText, 
  LayoutDashboard, 
  Database, 
  Wifi, 
  WifiOff, 
  RotateCcw, 
  PlusCircle, 
  Printer, 
  Building2,
  LogOut,
  HardHat,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { UserRole, Client, AuthUser } from '../types';

interface HeaderProps {
  activeTab: 'dashboard' | 'wizard' | 'reports' | 'master' | 'official-pdf';
  setActiveTab: (tab: 'dashboard' | 'wizard' | 'reports' | 'master' | 'official-pdf') => void;
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
}) => {
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  const activeClientObj = clients.find((c) => c.id === selectedClientId);
  const isSupervisor = authUser?.role === 'supervisor';
  const isDirector = authUser?.role === 'director';

  return (
    <header className="bg-slate-900 text-white border-b border-slate-800 sticky top-0 z-40 shadow-lg">
      {/* Top Banner */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between py-2.5 border-b border-slate-800 gap-2.5">
          {/* Logo & Subtitle */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-md shrink-0">
              <span className="text-xl">🚜</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-wider text-amber-400">SURYALAND APPS</h1>
              </div>
              <p className="text-xs text-slate-400">
                PT. SURYALAND GROUP • Pengawasan Proyek Land Clearing Multi-Klien
              </p>
            </div>
          </div>

          {/* Client Filter Selector & Controls */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Global Client Filter Selector */}
            <div className="flex items-center bg-slate-800 border border-amber-500/40 rounded-lg px-2 py-1 gap-1.5 shadow-xs">
              <Building2 className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <div className="flex flex-col">
                <span className="text-[9px] text-slate-400 uppercase font-bold leading-none">Pilih Klien:</span>
                <select
                  value={selectedClientId}
                  onChange={(e) => {
                    if (e.target.value === 'ADD_NEW') {
                      if (isDirector) {
                        setActiveTab('master');
                      }
                    } else {
                      setSelectedClientId(e.target.value);
                    }
                  }}
                  className="bg-transparent text-xs font-bold text-amber-300 focus:outline-none cursor-pointer pr-1"
                >
                  <option value="ALL" className="bg-slate-900 text-white font-bold">
                    Semua Klien (Konsolidasi Multi-Client)
                  </option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id} className="bg-slate-900 text-white font-medium">
                      {c.name} ({c.fullCompanyName.slice(0, 24)}...)
                    </option>
                  ))}
                  {isDirector && (
                    <option value="ADD_NEW" className="bg-slate-900 text-amber-400 font-bold">
                      + Tambah Klien Baru...
                    </option>
                  )}
                </select>
              </div>
            </div>

            {/* Offline/Online toggle */}
            <button
              onClick={() => setIsOnline(!isOnline)}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-semibold transition-colors border ${
                isOnline
                  ? 'bg-emerald-950/70 border-emerald-700 text-emerald-300 hover:bg-emerald-900/80'
                  : 'bg-amber-950/70 border-amber-700 text-amber-300 hover:bg-amber-900/80'
              }`}
              title="Klik untuk simulasi mode offline lapangan"
            >
              {isOnline ? <Wifi className="w-3.5 h-3.5" /> : <WifiOff className="w-3.5 h-3.5" />}
              <span>{isOnline ? 'Online' : 'Offline Lahan'}</span>
              {pendingSyncCount > 0 && (
                <span className="ml-1 bg-amber-500 text-slate-950 text-[10px] font-black px-1.5 py-0.2 rounded-full">
                  {pendingSyncCount}
                </span>
              )}
            </button>

            {/* Reset mock data */}
            <button
              type="button"
              onClick={() => setShowResetConfirm(true)}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition cursor-pointer"
              title="Reset data ke default"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>

            {/* Logged in User Profile & Logout Button */}
            {authUser && (
              <div className="flex items-center gap-2 pl-2 border-l border-slate-700">
                {/* Role Profile Badge */}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800 border border-slate-700 text-xs">
                  {isSupervisor ? (
                    <HardHat className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                  ) : (
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                  )}
                  <div className="flex flex-col text-left">
                    <span className="text-[11px] font-black leading-none text-slate-200">
                      {authUser.username}
                    </span>
                    <span className="text-[9px] text-slate-400 font-medium">
                      {isSupervisor ? 'Pengawas Lapangan' : 'Superadmin'}
                    </span>
                  </div>
                </div>

                {/* Logout Button */}
                <button
                  type="button"
                  onClick={() => setShowLogoutConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 active:bg-rose-700 text-white font-bold text-xs shadow-md transition cursor-pointer"
                  title="Keluar dari sistem & kembali ke halaman login"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Logout</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Navigation Tabs - Strict Role-Based Access Control */}
        <div className="flex items-center justify-between overflow-x-auto py-2">
          <nav className="flex space-x-1 sm:space-x-2">
            {/* 1. Dashboard Direktur - ONLY for Direktur / Superadmin */}
            {isDirector && (
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'dashboard'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <LayoutDashboard className="w-3.5 h-3.5" />
                <span>Dashboard {selectedClientId !== 'ALL' && activeClientObj ? `(${activeClientObj.name})` : 'Multi-Klien'}</span>
              </button>
            )}

            {/* 2. Form Laporan Harian (Wizard) - Accessible to both, primary for Pengawas */}
            <button
              onClick={() => setActiveTab('wizard')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'wizard'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <PlusCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>Input Laporan Harian</span>
            </button>

            {/* 3. Rekapitulasi Laporan - Accessible to both */}
            <button
              onClick={() => setActiveTab('reports')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'reports'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Rekap Laporan</span>
            </button>

            {/* 4. Format Cetak PDF Resmi - Accessible to both */}
            <button
              onClick={() => setActiveTab('official-pdf')}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                activeTab === 'official-pdf'
                  ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              <Printer className="w-3.5 h-3.5 text-amber-400" />
              <span>Format Cetak PDF Resmi</span>
            </button>

            {/* 5. Master Data & Klien - ONLY for Direktur / Superadmin */}
            {isDirector && (
              <button
                onClick={() => setActiveTab('master')}
                className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                  activeTab === 'master'
                    ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                    : 'text-slate-300 hover:text-white hover:bg-slate-800'
                }`}
              >
                <Database className="w-3.5 h-3.5" />
                <span>Master Data & Klien ({clients.length} PT)</span>
              </button>
            )}
          </nav>

          {/* Current Active Client Tag */}
          <div className="hidden md:flex items-center gap-2 text-xs">
            <span className="text-slate-400">Aktif:</span>
            <span className="font-bold text-amber-400 bg-slate-800 px-2.5 py-1 rounded-md border border-slate-700">
              {selectedClientId === 'ALL' ? `Konsolidasi ${clients.length} Klien` : activeClientObj?.fullCompanyName || 'Klien'}
            </span>
          </div>
        </div>
      </div>

      {/* IN-APP MODAL: KONFIRMASI LOGOUT */}
      {showLogoutConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
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

      {/* IN-APP MODAL: RESET DATA */}
      {showResetConfirm && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white text-slate-900 rounded-2xl p-6 max-w-sm w-full shadow-2xl space-y-4 border border-slate-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <RotateCcw className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h3 className="text-base font-black text-slate-900">
                Reset Data Perusahaan?
              </h3>
              <p className="text-xs text-slate-600">
                Semua data akan dikembalikan ke sampel awal default PT. SURYALAND.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowResetConfirm(false)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 text-xs font-bold hover:bg-slate-100 transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowResetConfirm(false);
                  onResetData();
                }}
                className="w-full px-4 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
              >
                Reset Sekarang
              </button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

