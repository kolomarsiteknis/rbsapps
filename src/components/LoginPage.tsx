import React, { useState } from 'react';
import { 
  Lock, 
  User, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Truck,
  ShieldAlert
} from 'lucide-react';
import { AuthUser } from '../types';
import { storageService } from '../services/storageService';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
  idleNotice?: string | null;
  onDismissNotice?: () => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ 
  onLoginSuccess,
  idleNotice,
  onDismissNotice
}) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const companyProfile = storageService.getCompanyProfile();

  // Validate credentials on submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const trimmedUser = username.trim();
    const trimmedPass = password.trim();

    if (!trimmedUser) {
      setErrorMsg('Silakan masukkan username.');
      setIsLoading(false);
      return;
    }

    if (!trimmedPass) {
      setErrorMsg('Silakan masukkan password.');
      setIsLoading(false);
      return;
    }

    setTimeout(() => {
      // 1. Find matching user from managed users (case-insensitive)
      const user = storageService.getManagedUserByUsername(trimmedUser);

      if (user) {
        // Check if user is disabled
        if (user.status === 'Nonaktif') {
          setErrorMsg(`Akun "${user.username}" (${user.fullName}) sedang dinonaktifkan oleh Superadmin.`);
          setIsLoading(false);
          return;
        }

        // Validate password
        if (user.password === trimmedPass) {
          const isSuper = user.userLevel === 'Superadmin' || user.jobTitle.toLowerCase().includes('direktur');
          const isSiteManager = user.userLevel === 'Site Manager' || user.userLevel === 'Manager' || user.jobTitle.toLowerCase().includes('manager');
          const isClient = user.userLevel === 'Klien' || user.jobTitle.toLowerCase().includes('klien');
          const role: 'director' | 'manager' | 'supervisor' | 'client' = isSuper ? 'director' : isSiteManager ? 'manager' : isClient ? 'client' : 'supervisor';

          const authUserObj: AuthUser = {
            id: user.id,
            username: user.username,
            displayName: user.fullName,
            role,
            roleTitle: isSuper
              ? `${user.jobTitle} • Owner (Akses Penuh Semua Proyek)`
              : isSiteManager
              ? `${user.jobTitle} • Site Manager (Akses Approval & Audit Operasional)`
              : isClient
              ? `${user.jobTitle} • ${user.assignedClientName || 'Klien'} (Akses Monitoring Progres Lahan)`
              : `${user.jobTitle} • ${user.assignedClientName || 'Proyek'} (${user.assignedBlockCodes?.join(', ') || 'Semua Blok'})`,
            email: user.email,
            phoneNumber: user.whatsappNumber,
            address: user.address,
            jobTitle: user.jobTitle,
            userLevel: user.userLevel,
            assignedClientId: (isSuper || isSiteManager) ? 'all' : user.assignedClientId,
            assignedClientName: isSuper 
              ? 'Semua Proyek (Owner)' 
              : isSiteManager 
              ? 'Semua Proyek (Site Manager Operasional)' 
              : user.assignedClientName,
            assignedBlockCodes: (isSuper || isSiteManager) ? ['Akses Semua Blok'] : user.assignedBlockCodes,
            loginTime: new Date().toISOString(),
          };

          onLoginSuccess(authUserObj);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Password salah! Silakan periksa kembali kata sandi Anda.');
          setIsLoading(false);
          return;
        }
      }

      // 2. Fallback checks for standard default usernames
      const upperUser = trimmedUser.toUpperCase();
      if (upperUser === 'MANAGER') {
        if (trimmedPass === 'manager123') {
          const userObj: AuthUser = {
            id: 'user-usr-03',
            username: 'MANAGER',
            displayName: 'Bambang Sugiarto, S.P.',
            role: 'manager',
            roleTitle: 'Manager Operasional • Wilayah Riau & Sumatera',
            email: 'bambang.sugiarto@suryaland.co.id',
            phoneNumber: '081388776655',
            userLevel: 'Manager',
            jobTitle: 'Manager Operasional',
            assignedClientId: 'all',
            assignedClientName: 'Semua Proyek (Manager Operasional)',
            assignedBlockCodes: ['Akses Supervisi Semua Blok'],
            loginTime: new Date().toISOString(),
          };
          onLoginSuccess(userObj);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Password salah! Silakan periksa kembali kata sandi Anda.');
          setIsLoading(false);
          return;
        }
      }

      if (upperUser === 'PENGAWAS') {
        if (trimmedPass === 'satu2345') {
          const userObj: AuthUser = {
            id: 'user-usr-02',
            username: 'PENGAWAS',
            displayName: 'Ahmad Rizky Pratama, S.T.',
            role: 'supervisor',
            roleTitle: 'Pengawas Lapangan • PT. A (Blok AB, Blok AA)',
            email: 'pengawas@suryaland.co.id',
            phoneNumber: '081276543210',
            userLevel: 'Pengawas',
            assignedClientId: 'client-1',
            assignedClientName: 'PT. A',
            assignedBlockCodes: ['Blok AB', 'Blok AA'],
            loginTime: new Date().toISOString(),
          };
          onLoginSuccess(userObj);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Password salah! Silakan periksa kembali kata sandi Anda.');
          setIsLoading(false);
          return;
        }
      }

      if (upperUser === 'DIREKTUR' || upperUser === 'SUPERADMIN') {
        if (trimmedPass === 'bos12345') {
          const userObj: AuthUser = {
            username: 'Direktur (Superadmin)',
            displayName: 'Ir. Hendra Wijaya, M.Si',
            role: 'director',
            roleTitle: 'Direktur Utama (Superadmin)',
            email: 'hendra.wijaya@suryaland.co.id',
            loginTime: new Date().toISOString(),
          };
          onLoginSuccess(userObj);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg('Password salah! Silakan periksa kembali kata sandi Anda.');
          setIsLoading(false);
          return;
        }
      }

      setErrorMsg('Username atau password tidak ditemukan. Silakan periksa kembali kredensial Anda.');
      setIsLoading(false);
    }, 200);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 selection:bg-amber-500 selection:text-slate-950 relative overflow-hidden">
      {/* Background Graphic Glow */}
      <div className="absolute inset-0 opacity-10 pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 bg-amber-500 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-emerald-600 rounded-full blur-3xl"></div>
      </div>

      {/* Top Header Bar */}
      <header className="border-b border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 z-10">
        <div className="max-w-5xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20 overflow-hidden shrink-0">
              {companyProfile.logoUrl ? (
                <img 
                  src={companyProfile.logoUrl} 
                  alt={companyProfile.shortName} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <Truck className="w-6 h-6 text-amber-400" />
              )}
            </div>
            <div>
              <div className="font-black text-base text-amber-400 tracking-wider">
                {companyProfile.shortName || 'SURYALAND'} APPS
              </div>
              <div className="text-[11px] text-slate-400 truncate max-w-[280px]">
                {companyProfile.officialName || 'PT. SURYALAND GROUP'} • Land Clearing Heavy Equipment
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Portal Operasional Resmi</span>
          </div>
        </div>
      </header>

      {/* Main Login Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
            {/* Header Text */}
            <div className="mb-6 text-center">
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3">
                <Lock className="w-6 h-6" />
              </div>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Selamat Datang di Portal Proyek
              </h2>
              <p className="text-xs text-slate-400 mt-1.5">
                Sistem Pengawasan Land Clearing (Zero Burning Method).
              </p>
            </div>

            {/* Idle Timeout Security Notice Banner */}
            {idleNotice && (
              <div className="mb-5 p-3.5 bg-amber-950/80 border border-amber-600/80 rounded-xl flex items-start justify-between gap-2.5 text-xs text-amber-200 shadow-md">
                <div className="flex items-start gap-2.5">
                  <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="block font-bold text-amber-300 mb-0.5">Sesi Berakhir Otomatis (Idle Timeout)</strong>
                    <span className="leading-relaxed">{idleNotice}</span>
                  </div>
                </div>
                {onDismissNotice && (
                  <button 
                    type="button" 
                    onClick={onDismissNotice}
                    className="text-amber-400 hover:text-white cursor-pointer font-bold px-1"
                    title="Tutup pesan"
                  >
                    ✕
                  </button>
                )}
              </div>
            )}

            {/* Error Message Banner */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Form Login: 2 Inputan (Username & Password) + Tombol Masuk */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* 1. INPUT USERNAME */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  USERNAME
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <User className="w-4 h-4" />
                  </div>
                  <input
                    type="text"
                    required
                    autoFocus
                    value={username}
                    onChange={(e) => {
                      setUsername(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Masukkan username..."
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                </div>
              </div>

              {/* 2. INPUT PASSWORD */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  PASSWORD
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      setErrorMsg(null);
                    }}
                    placeholder="Masukkan password..."
                    className="w-full pl-10 pr-10 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-sm font-semibold text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-400 hover:text-slate-200 transition cursor-pointer"
                    title={showPassword ? 'Sembunyikan password' : 'Lihat password'}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* TOMBOL MASUK KE SISTEM */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-sm tracking-wider uppercase transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-4 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>MASUK KE SISTEM</span>
                )}
              </button>
            </form>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-900/60 backdrop-blur-md px-6 py-4 text-center z-10">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            PT. SURYALAND GROUP • Heavy Equipment Plantation Land Clearing
          </div>
          <div>
            Hak Cipta © 2026. Hak Akses Terproteksi.
          </div>
        </div>
      </footer>
    </div>
  );
};
