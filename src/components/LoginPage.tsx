import React, { useState, useEffect } from 'react';
import { 
  Lock, 
  UserCheck, 
  Eye, 
  EyeOff, 
  AlertCircle,
  Truck,
  HardHat,
  ShieldCheck,
  Building2,
  Layers,
  Sparkles,
  KeyRound,
  Users,
  Crown
} from 'lucide-react';
import { AuthUser, ManagedUser } from '../types';
import { storageService } from '../services/storageService';

interface LoginPageProps {
  onLoginSuccess: (user: AuthUser) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  // Load registered users from storage
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>([]);
  const [selectedUsername, setSelectedUsername] = useState<string>('PENGAWAS');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const list = storageService.getManagedUsers();
    setManagedUsers(list);
    if (list.length > 0) {
      // Default to PENGAWAS or first user
      const defaultUser = list.find((u) => u.username === 'PENGAWAS') || list[0];
      setSelectedUsername(defaultUser.username);
    }
  }, []);

  // Currently selected managed user object
  const currentSelectedUser = managedUsers.find(
    (u) => u.username.toLowerCase() === selectedUsername.toLowerCase()
  );

  // Validate credentials on submit
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    const trimmedPass = password.trim();

    setTimeout(() => {
      // Find matching user from managed users
      const user = storageService.getManagedUserByUsername(selectedUsername);

      if (user) {
        // Check if user is disabled
        if (user.status === 'Nonaktif') {
          setErrorMsg(`Akun "${user.username}" (${user.fullName}) sedang dinonaktifkan oleh Superadmin.`);
          setIsLoading(false);
          return;
        }

        // Validate password
        if (user.password === trimmedPass) {
          const isSuper = user.userLevel === 'Superadmin';
          const authUserObj: AuthUser = {
            id: user.id,
            username: user.username,
            displayName: user.fullName,
            role: isSuper ? 'director' : 'supervisor',
            roleTitle: isSuper
              ? `${user.jobTitle} • Owner (Semua Proyek & Blok)`
              : `${user.jobTitle} • ${user.assignedClientName} (${user.assignedBlockCodes.join(', ')})`,
            email: user.email,
            phoneNumber: user.whatsappNumber,
            address: user.address,
            jobTitle: user.jobTitle,
            userLevel: user.userLevel,
            assignedClientId: isSuper ? 'all' : user.assignedClientId,
            assignedClientName: isSuper ? 'Semua Proyek (Owner)' : user.assignedClientName,
            assignedBlockCodes: isSuper ? ['Akses Semua Blok (Tanpa Batas)'] : user.assignedBlockCodes,
            loginTime: new Date().toISOString(),
          };

          onLoginSuccess(authUserObj);
          setIsLoading(false);
          return;
        } else {
          setErrorMsg(`Password salah untuk akun ${user.username}!`);
          setIsLoading(false);
          return;
        }
      }

      // Hardcoded fallback checks for PENGAWAS and DIREKTUR
      if (selectedUsername === 'PENGAWAS') {
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
          setErrorMsg('Password salah! Password untuk PENGAWAS adalah: satu2345');
          setIsLoading(false);
          return;
        }
      }

      if (selectedUsername === 'DIREKTUR') {
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
          setErrorMsg('Password salah! Password untuk Direktur (Superadmin) adalah: bos12345');
          setIsLoading(false);
          return;
        }
      }

      setErrorMsg('Pengguna tidak ditemukan atau kata sandi tidak cocok.');
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
            <div className="w-10 h-10 rounded-xl bg-amber-500 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-amber-500/20">
              <Truck className="w-6 h-6 text-slate-950" />
            </div>
            <div>
              <div className="font-black text-base text-amber-400 tracking-wider">
                SURYALAND APPS
              </div>
              <div className="text-[11px] text-slate-400">
                PT. SURYALAND GROUP • Land Clearing Heavy Equipment
              </div>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            <span>Portal Operasional Resmi</span>
          </div>
        </div>
      </header>

      {/* Main Welcome & Login Content */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 z-10 my-4">
        <div className="w-full max-w-md">
          {/* Welcome Card */}
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

            {/* Error Message Banner */}
            {errorMsg && (
              <div className="mb-5 p-3.5 bg-rose-950/80 border border-rose-800/80 rounded-xl flex items-start gap-2.5 text-xs text-rose-200">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div className="font-medium">{errorMsg}</div>
              </div>
            )}

            {/* Form Login: Dropdown User + Password Input */}
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* DROPDOWN PILIH USER */}
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                  <span>PILIH USER TERDAFTAR</span>
                  <span className="text-[10px] text-amber-400 font-bold lowercase">
                    {managedUsers.length} pengguna aktif
                  </span>
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-amber-400">
                    {currentSelectedUser?.userLevel === 'Superadmin' || selectedUsername === 'DIREKTUR' ? (
                      <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    ) : (
                      <HardHat className="w-4 h-4 text-amber-400" />
                    )}
                  </div>
                  <select
                    value={selectedUsername}
                    onChange={(e) => {
                      setSelectedUsername(e.target.value);
                      setErrorMsg(null);
                      setPassword('');
                    }}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-950/90 border border-slate-700 rounded-xl text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition cursor-pointer"
                  >
                    {managedUsers.length > 0 ? (
                      managedUsers.map((u) => {
                        const isSuper = u.userLevel === 'Superadmin';
                        return (
                          <option key={u.id} value={u.username} className="bg-slate-900 text-white font-bold py-1">
                            {isSuper
                              ? `👑 [Superadmin / Owner] ${u.fullName} — ${u.jobTitle} (Semua Proyek)`
                              : `🚜 [Pengawas] ${u.fullName} — ${u.assignedClientName}`}
                          </option>
                        );
                      })
                    ) : (
                      <>
                        <option value="PENGAWAS" className="bg-slate-900 text-white font-bold py-1">
                          USER : PENGAWAS
                        </option>
                        <option value="DIREKTUR" className="bg-slate-900 text-white font-bold py-1">
                          USER : Direktur (Superadmin)
                        </option>
                      </>
                    )}
                  </select>
                </div>

                {/* User Detail pill info */}
                {currentSelectedUser && (
                  <div className="mt-2 p-2.5 rounded-xl bg-slate-950/70 border border-slate-800/90 text-[11px] text-slate-300 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400">Tingkat Hak Akses:</span>
                      <strong className={currentSelectedUser.userLevel === 'Superadmin' ? 'text-amber-400 font-black flex items-center gap-1' : 'text-sky-300 font-bold'}>
                        {currentSelectedUser.userLevel === 'Superadmin' && <Crown className="w-3 h-3 text-amber-400" />}
                        {currentSelectedUser.userLevel} ({currentSelectedUser.jobTitle})
                      </strong>
                    </div>

                    {currentSelectedUser.userLevel === 'Superadmin' ? (
                      <div className="pt-1.5 border-t border-slate-800/80 flex items-center justify-between">
                        <span className="text-slate-400">Cakupan Wilayah Proyek:</span>
                        <span className="text-amber-300 font-bold flex items-center gap-1">
                          <Sparkles className="w-3 h-3 text-amber-400" />
                          Semua Proyek &amp; Blok (Owner Tanpa Batas)
                        </span>
                      </div>
                    ) : (
                      <>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Penempatan Proyek:</span>
                          <strong className="text-white">
                            {currentSelectedUser.assignedClientName}
                          </strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-slate-400">Lokasi Blok Kerja:</span>
                          <span className="text-indigo-300 font-semibold">
                            {currentSelectedUser.assignedBlockCodes.join(', ')}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* INPUT PASSWORD */}
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
                    autoFocus
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ketik password akun Anda..."
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

              {/* TOMBOL LOGIN */}
              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-sm tracking-wider uppercase transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer mt-3 disabled:opacity-50"
              >
                {isLoading ? (
                  <div className="w-5 h-5 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                ) : (
                  <span>MASUK KE SISTEM</span>
                )}
              </button>
            </form>

            {/* Quick Reference Box */}
            <div className="mt-6 p-3.5 rounded-xl border border-slate-800 bg-slate-950/50 space-y-2 text-xs">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 border-b border-slate-800 pb-1 flex items-center justify-between">
                <span>Klik Cepat Kredensial Demo:</span>
                <span className="text-amber-400">Autofill</span>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">PENGAWAS (Ahmad Rizky)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUsername('PENGAWAS');
                    setPassword('satu2345');
                    setErrorMsg(null);
                  }}
                  className="font-mono text-amber-400 hover:underline cursor-pointer font-bold"
                  title="Klik untuk mengisi otomatis"
                >
                  satu2345
                </button>
              </div>
              <div className="flex items-center justify-between text-[11px]">
                <span className="text-slate-300 font-medium">SUPERADMIN (Ir. Hendra)</span>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedUsername('DIREKTUR');
                    setPassword('bos12345');
                    setErrorMsg(null);
                  }}
                  className="font-mono text-emerald-400 hover:underline cursor-pointer font-bold"
                  title="Klik untuk mengisi otomatis"
                >
                  bos12345
                </button>
              </div>
            </div>
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
