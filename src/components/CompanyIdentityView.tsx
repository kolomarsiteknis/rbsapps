import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Building2, 
  Upload, 
  Trash2, 
  Edit3, 
  Plus, 
  Check, 
  ShieldCheck, 
  AlertCircle, 
  Save, 
  FileText, 
  Phone, 
  Mail, 
  Globe, 
  MapPin, 
  Briefcase, 
  UserCheck, 
  UserPlus, 
  CheckCircle2, 
  RotateCcw, 
  Eye, 
  PenTool, 
  Camera, 
  Search,
  ExternalLink,
  Users,
  ShieldAlert,
  HardHat,
  Hash,
  X
} from 'lucide-react';
import { CompanyIdentity, CompanyStaff, AuthUser, ManagedUserLevel } from '../types';
import { storageService } from '../services/storageService';

interface CompanyIdentityViewProps {
  authUser: AuthUser | null;
  companyIdentity: CompanyIdentity;
  onUpdateCompanyIdentity: (updated: CompanyIdentity) => void;
  showToast: (msg: string, type?: 'success' | 'warning' | 'info') => void;
  onNavigateToUserManagement?: (prefillStaff?: CompanyStaff) => void;
}

export const CompanyIdentityView: React.FC<CompanyIdentityViewProps> = ({
  authUser,
  companyIdentity,
  onUpdateCompanyIdentity,
  showToast,
  onNavigateToUserManagement,
}) => {
  // STRICT ACCESS CONTROL: HANYA DIREKTUR
  const isDirector = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';

  // Sub-tabs
  const [activeSubTab, setActiveSubTab] = useState<'profile' | 'staff'>('profile');

  // Form State: Profil Perusahaan
  const [profileForm, setProfileForm] = useState<CompanyIdentity>(companyIdentity);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [logoPreview, setLogoPreview] = useState<string>(companyIdentity.logoUrl || '/Logo RBS.png');
  const fileInputLogoRef = useRef<HTMLInputElement>(null);

  // Staff State
  const [staffList, setStaffList] = useState<CompanyStaff[]>(() => storageService.getCompanyStaff());
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffRoleFilter, setStaffRoleFilter] = useState('ALL');

  // Staff Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffForm, setStaffForm] = useState<{
    fullName: string;
    employeeId: string;
    jobTitle: string;
    department: string;
    email: string;
    phone: string;
    status: 'Aktif' | 'Nonaktif';
    notes: string;
    signatureUrl: string;
  }>({
    fullName: '',
    employeeId: '',
    jobTitle: 'Pengawas',
    department: 'Operasional Lapangan',
    email: '',
    phone: '',
    status: 'Aktif',
    notes: '',
    signatureUrl: '',
  });

  // Custom Job Title input state
  const [isCustomJobTitle, setIsCustomJobTitle] = useState(false);
  const [customJobTitleValue, setCustomJobTitleValue] = useState('');

  // Signature Pad state inside Staff Modal
  const [showSignaturePad, setShowSignaturePad] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const fileInputTtdRef = useRef<HTMLInputElement>(null);

  // Quick Account Creation confirmation modal
  const [accountCreateTarget, setAccountCreateTarget] = useState<CompanyStaff | null>(null);
  const [generatedAccountData, setGeneratedAccountData] = useState<{
    username: string;
    password: string;
    userLevel: ManagedUserLevel;
  }>({
    username: '',
    password: '',
    userLevel: 'Pengawas',
  });

  // Load staff data on sync
  const reloadStaff = () => {
    setStaffList(storageService.getCompanyStaff());
  };

  useEffect(() => {
    setProfileForm(companyIdentity);
    setLogoPreview(companyIdentity.logoUrl || '/Logo RBS.png');
  }, [companyIdentity]);

  useEffect(() => {
    const handleSync = () => reloadStaff();
    window.addEventListener('suryaland_firestore_sync', handleSync);
    return () => window.removeEventListener('suryaland_firestore_sync', handleSync);
  }, []);

  // Filtered staff
  const filteredStaff = useMemo(() => {
    return staffList.filter((s) => {
      if (staffSearchQuery.trim()) {
        const q = staffSearchQuery.toLowerCase();
        const matchName = s.fullName.toLowerCase().includes(q);
        const matchNik = (s.employeeId || '').toLowerCase().includes(q);
        const matchJob = s.jobTitle.toLowerCase().includes(q);
        const matchDept = (s.department || '').toLowerCase().includes(q);
        const matchEmail = s.email.toLowerCase().includes(q);
        if (!matchName && !matchNik && !matchJob && !matchDept && !matchEmail) {
          return false;
        }
      }
      if (staffRoleFilter !== 'ALL') {
        if (staffRoleFilter === 'hasAccount' && !s.hasUserAccount) return false;
        if (staffRoleFilter === 'noAccount' && s.hasUserAccount) return false;
        if (staffRoleFilter === 'Direktur' && !s.jobTitle.toLowerCase().includes('direktur')) return false;
        if (staffRoleFilter === 'Manager' && !s.jobTitle.toLowerCase().includes('manager')) return false;
        if (staffRoleFilter === 'Pengawas' && !s.jobTitle.toLowerCase().includes('pengawas')) return false;
        if (staffRoleFilter === 'Akuntan' && !s.jobTitle.toLowerCase().includes('akuntan') && !s.jobTitle.toLowerCase().includes('keuangan')) return false;
      }
      return true;
    });
  }, [staffList, staffSearchQuery, staffRoleFilter]);

  // Statistics
  const stats = useMemo(() => {
    const total = staffList.length;
    const withAccount = staffList.filter((s) => s.hasUserAccount).length;
    const withoutAccount = total - withAccount;
    const withSignature = staffList.filter((s) => !!s.signatureUrl).length;
    return { total, withAccount, withoutAccount, withSignature };
  }, [staffList]);

  // Unauthorized view
  if (!isDirector) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-6 sm:p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mx-auto text-rose-500 shadow-sm">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h3 className="font-black text-slate-900 text-xl">Akses Khusus Direktur (Superadmin)</h3>
        <p className="text-xs sm:text-sm text-slate-600 leading-relaxed max-w-md mx-auto">
          Halaman Identitas & Legalitas Perusahaan serta Otorisasi Tanda Tangan Digital Staff merupakan wewenang mutlak Direktur Utama.
        </p>
      </div>
    );
  }

  // Handle Logo Upload
  const handleLogoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (PNG, JPG, SVG, WebP)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setLogoPreview(dataUrl);
      setProfileForm((prev) => ({ ...prev, logoUrl: dataUrl }));
      showToast('Gambar logo berhasil dipilih. Klik "Simpan Identitas Perusahaan" untuk menerapkan ke seluruh aplikasi.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Save Company Profile
  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.shortName.trim() || !profileForm.fullName.trim()) {
      showToast('Nama Singkat dan Nama Lengkap Perusahaan wajib diisi!', 'warning');
      return;
    }

    setIsSavingProfile(true);
    try {
      const updated = storageService.saveCompanyIdentity({
        ...profileForm,
        logoUrl: logoPreview || profileForm.logoUrl || '/Logo RBS.png',
      }, authUser);

      onUpdateCompanyIdentity(updated);
      showToast(`Identitas ${updated.fullName} (${updated.shortName}) dan Logo berhasil disimpan & diterapkan ke seluruh sistem!`, 'success');
    } catch {
      showToast('Gagal menyimpan identitas perusahaan', 'warning');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Signature Canvas Handlers
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
    setIsDrawing(true);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignatureFromCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const dataUrl = canvas.toDataURL('image/png');
    setStaffForm((prev) => ({ ...prev, signatureUrl: dataUrl }));
    setShowSignaturePad(false);
    showToast('Tanda tangan digital berhasil direkam!', 'success');
  };

  // Signature image file upload
  const handleSignatureImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File tanda tangan harus berupa gambar (PNG/JPG)', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setStaffForm((prev) => ({ ...prev, signatureUrl: dataUrl }));
      showToast('Gambar tanda tangan digital berhasil diunggah!', 'success');
    };
    reader.readAsDataURL(file);
  };

  // Open Staff Modal
  const handleOpenAddStaffModal = () => {
    setEditingStaffId(null);
    setIsCustomJobTitle(false);
    setCustomJobTitleValue('');
    setShowSignaturePad(false);
    setStaffForm({
      fullName: '',
      employeeId: `RBS-STF-${String(staffList.length + 1).padStart(3, '0')}`,
      jobTitle: 'Pengawas',
      department: 'Operasional Lapangan',
      email: '',
      phone: '',
      status: 'Aktif',
      notes: '',
      signatureUrl: '',
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaffModal = (staff: CompanyStaff) => {
    setEditingStaffId(staff.id);
    const standardTitles = ['Direktur', 'Manager', 'Manager Operasional', 'Pengawas', 'Akuntan', 'Site Manager'];
    const isCustom = !standardTitles.includes(staff.jobTitle);
    setIsCustomJobTitle(isCustom);
    setCustomJobTitleValue(isCustom ? staff.jobTitle : '');
    setShowSignaturePad(false);
    setStaffForm({
      fullName: staff.fullName,
      employeeId: staff.employeeId || '',
      jobTitle: staff.jobTitle,
      department: staff.department || 'Operasional Lapangan',
      email: staff.email,
      phone: staff.phone,
      status: staff.status,
      notes: staff.notes || '',
      signatureUrl: staff.signatureUrl || '',
    });
    setIsStaffModalOpen(true);
  };

  // Save Staff
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffForm.fullName.trim()) {
      showToast('Nama Lengkap Staff wajib diisi!', 'warning');
      return;
    }

    const finalJobTitle = isCustomJobTitle 
      ? (customJobTitleValue.trim() || 'Staff') 
      : staffForm.jobTitle;

    storageService.saveCompanyStaff({
      id: editingStaffId || undefined,
      fullName: staffForm.fullName.trim(),
      employeeId: staffForm.employeeId.trim(),
      jobTitle: finalJobTitle,
      department: staffForm.department.trim(),
      email: staffForm.email.trim(),
      phone: staffForm.phone.trim(),
      status: staffForm.status,
      notes: staffForm.notes.trim(),
      signatureUrl: staffForm.signatureUrl,
    }, authUser);

    reloadStaff();
    setIsStaffModalOpen(false);
    showToast(`Data staff ${staffForm.fullName} berhasil disimpan!`, 'success');
  };

  // Delete Staff
  const handleDeleteStaff = (staff: CompanyStaff) => {
    if (staff.jobTitle.toLowerCase().includes('direktur') && staffList.filter((s) => s.jobTitle.toLowerCase().includes('direktur')).length <= 1) {
      showToast('Tidak dapat menghapus Direktur Utama satu-satunya dalam sistem.', 'warning');
      return;
    }

    if (confirm(`Apakah Anda yakin ingin menghapus staff "${staff.fullName}" (${staff.jobTitle})?`)) {
      storageService.deleteCompanyStaff(staff.id, authUser);
      reloadStaff();
      showToast(`Staff ${staff.fullName} berhasil dihapus.`, 'info');
    }
  };

  // Prepare Quick Account Creation Modal
  const handleInitiateCreateAccount = (staff: CompanyStaff) => {
    // Determine suggested user level
    let level: ManagedUserLevel = 'Pengawas';
    const lowerJob = staff.jobTitle.toLowerCase();
    if (lowerJob.includes('direktur') || lowerJob.includes('owner') || lowerJob.includes('superadmin')) {
      level = 'Superadmin';
    } else if (lowerJob.includes('manager') || lowerJob.includes('manajer')) {
      level = 'Manager';
    } else {
      level = 'Pengawas';
    }

    // Generate suggested username
    const baseUser = staff.fullName
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '')
      .slice(0, 12);
    const suggestedUsername = baseUser || `user_${staff.jobTitle.toLowerCase()}`;
    const suggestedPassword = `${suggestedUsername}2026`;

    setAccountCreateTarget(staff);
    setGeneratedAccountData({
      username: suggestedUsername,
      password: suggestedPassword,
      userLevel: level,
    });
  };

  // Confirm Quick Account Creation
  const handleConfirmCreateAccount = () => {
    if (!accountCreateTarget) return;

    if (!generatedAccountData.username.trim() || !generatedAccountData.password.trim()) {
      showToast('Username dan Password akun wajib diisi!', 'warning');
      return;
    }

    // Check username uniqueness
    const existingUsers = storageService.getManagedUsers();
    if (existingUsers.some((u) => u.username.toLowerCase() === generatedAccountData.username.trim().toLowerCase())) {
      showToast('Username tersebut sudah digunakan. Silakan buat username unik lainnya.', 'warning');
      return;
    }

    // Determine default client placement
    const clients = storageService.getClients();
    const isSuper = generatedAccountData.userLevel === 'Superadmin';
    const isMgr = generatedAccountData.userLevel === 'Manager';
    const assignedClientId = (isSuper || isMgr) ? 'all' : clients[0]?.id || 'client-1';
    const assignedClientName = isSuper 
      ? 'Semua Proyek (Owner)' 
      : isMgr 
      ? 'Semua Proyek (Manager Operasional)' 
      : clients[0]?.name || 'PT. A';
    const assignedBlockCodes = (isSuper || isMgr) 
      ? ['Akses Semua Blok (Tanpa Batas)'] 
      : ['Blok AB', 'Blok AA'];

    // Create User in ManagedUsers
    const newUser = storageService.saveManagedUser({
      fullName: accountCreateTarget.fullName,
      address: `${companyIdentity.fullName} - ${accountCreateTarget.department || 'Operasional'}`,
      whatsappNumber: accountCreateTarget.phone,
      email: accountCreateTarget.email,
      jobTitle: accountCreateTarget.jobTitle,
      userLevel: generatedAccountData.userLevel,
      username: generatedAccountData.username.trim(),
      password: generatedAccountData.password.trim(),
      assignedClientId,
      assignedClientName,
      assignedBlockCodes,
      status: 'Aktif',
      notes: `Akun dibuat otomatis dari Daftar Staff Resmi Perusahaan (${accountCreateTarget.employeeId || 'Staff'})`,
    }, authUser);

    // Update staff to link user
    storageService.saveCompanyStaff({
      ...accountCreateTarget,
      hasUserAccount: true,
      userId: newUser.id,
    }, authUser);

    reloadStaff();
    setAccountCreateTarget(null);
    showToast(`Akun login berhasil dibuat untuk ${accountCreateTarget.fullName}! Username: ${newUser.username}`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* 1. TOP HEADER BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 text-white rounded-3xl p-5 sm:p-7 shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />
        
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden bg-slate-950 border-2 border-amber-500/50 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
              <img 
                src={logoPreview || '/Logo RBS.png'} 
                alt="Logo Perusahaan" 
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.currentTarget as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1.5">
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                  Otoritas Direksi
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-slate-800 text-slate-300 border border-slate-700">
                  Kredensial & Legalitas
                </span>
                <span className="px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Terhubung ke Manajemen User & PDF
                </span>
              </div>
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black tracking-tight text-white flex items-center gap-2">
                <span>{companyIdentity.fullName || 'PT. RBS GROUP'}</span>
                <span className="text-amber-400 font-mono text-base font-bold">({companyIdentity.shortName || 'RBS'})</span>
              </h1>
              <p className="text-xs sm:text-sm text-slate-300 max-w-2xl mt-1 leading-relaxed">
                Kelola identitas resmi perusahaan, logo aplikasi otomatis, data alamat/kontak legalitas, serta informasi pejabat staff lengkap dengan tanda tangan digital untuk verifikasi cetak dokumen.
              </p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
            {onNavigateToUserManagement && (
              <button
                type="button"
                onClick={() => onNavigateToUserManagement()}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 active:scale-95 text-white font-bold rounded-xl text-xs border border-slate-700 transition cursor-pointer"
              >
                <Users className="w-4 h-4 text-amber-400" />
                <span>Buka Manajemen User</span>
              </button>
            )}
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-slate-400 font-medium">Total Staff Resmi</div>
            <div className="text-xl sm:text-2xl font-black text-white mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-1">Pejabat & Fungsional</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-emerald-400 font-medium flex items-center gap-1.5">
              <UserCheck className="w-3.5 h-3.5" />
              <span>Sudah Punya Akun Login</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-emerald-400 mt-0.5">{stats.withAccount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Bisa Masuk ke Sistem</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-amber-400 font-medium flex items-center gap-1.5">
              <UserPlus className="w-3.5 h-3.5" />
              <span>Belum Dibuatkan Akun</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-amber-400 mt-0.5">{stats.withoutAccount}</div>
            <div className="text-[10px] text-slate-400 mt-1">Siap Dibuatkan Akun</div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-2xl p-3.5">
            <div className="text-[11px] text-sky-400 font-medium flex items-center gap-1.5">
              <PenTool className="w-3.5 h-3.5" />
              <span>Tanda Tangan Digital</span>
            </div>
            <div className="text-xl sm:text-2xl font-black text-sky-400 mt-0.5">{stats.withSignature}</div>
            <div className="text-[10px] text-slate-400 mt-1">Siap di Kop Cetak PDF</div>
          </div>
        </div>
      </div>

      {/* 2. SUB-TAB SWITCHER */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <button
          type="button"
          onClick={() => setActiveSubTab('profile')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeSubTab === 'profile'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Profil & Logo Perusahaan</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveSubTab('staff')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl font-bold text-xs sm:text-sm transition cursor-pointer ${
            activeSubTab === 'staff'
              ? 'bg-amber-500 text-slate-950 shadow-md font-black'
              : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Daftar Staff & TTD Digital ({staffList.length})</span>
        </button>
      </div>

      {/* ======================================================== */}
      {/* SUB-TAB 1: PROFIL & IDENTITAS PERUSAHAAN (CRUD)         */}
      {/* ======================================================== */}
      {activeSubTab === 'profile' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* LEFT 1 COL: LOGO & APP BRAND PREVIEW */}
            <div className="space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-6 shadow-sm border border-slate-200 space-y-5">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-sm uppercase tracking-wide flex items-center gap-2">
                    <Camera className="w-4 h-4 text-amber-500" />
                    <span>Logo Resmi Aplikasi</span>
                  </h3>
                  <span className="text-[10px] bg-amber-50 text-amber-700 font-bold px-2 py-0.5 rounded border border-amber-200">
                    Otomatis Menjadi Logo Apps
                  </span>
                </div>

                {/* Logo Display & Upload Box */}
                <div className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-200 rounded-2xl bg-slate-50 hover:bg-slate-100/80 transition-colors">
                  <div className="w-28 h-28 rounded-2xl overflow-hidden bg-slate-900 border-2 border-amber-500/50 shadow-xl flex items-center justify-center mb-4 relative group">
                    <img 
                      src={logoPreview || '/Logo RBS.png'} 
                      alt="Pratinjau Logo" 
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.currentTarget as HTMLElement).style.display = 'none';
                      }}
                    />
                    <div 
                      onClick={() => fileInputLogoRef.current?.click()}
                      className="absolute inset-0 bg-slate-950/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center text-white cursor-pointer"
                    >
                      <Upload className="w-6 h-6 text-amber-400 mb-1" />
                      <span className="text-[10px] font-bold">Ganti Logo</span>
                    </div>
                  </div>

                  <input 
                    ref={fileInputLogoRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/svg+xml"
                    onChange={handleLogoFileChange}
                    className="hidden"
                  />

                  <button
                    type="button"
                    onClick={() => fileInputLogoRef.current?.click()}
                    className="flex items-center gap-2 px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-sm active:scale-95"
                  >
                    <Upload className="w-3.5 h-3.5 text-amber-400" />
                    <span>Upload Logo Baru</span>
                  </button>

                  <p className="text-[10px] text-slate-500 text-center mt-2.5 leading-relaxed">
                    Format: PNG, JPG, WebP, SVG. Disarankan rasio kotak 1:1 resolusi tajam minimal 512x512 px.
                  </p>
                </div>

                {/* Quick App Header Simulation */}
                <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                  <div className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
                    Simulasi Header Aplikasi
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg overflow-hidden bg-slate-900 border border-amber-500/50 flex items-center justify-center">
                      <img src={logoPreview || '/Logo RBS.png'} alt="sim" className="w-full h-full object-cover" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="text-xs font-black text-white">{profileForm.shortName || 'RBS'}</span>
                        <span className="text-[9px] font-black uppercase px-1 py-0.2 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">APPS</span>
                      </div>
                      <div className="text-[9px] text-slate-400 truncate max-w-[200px]">
                        {profileForm.fullName || 'PT. RBS GROUP'} • {profileForm.tagline || 'Land Clearing'}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT 2 COLS: FORM DATA LENGKAP IDENTITAS */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl p-5 sm:p-7 shadow-sm border border-slate-200 space-y-6">
                <div className="border-b border-slate-100 pb-3">
                  <h3 className="font-black text-slate-900 text-base uppercase tracking-wide flex items-center gap-2">
                    <FileText className="w-5 h-5 text-amber-500" />
                    <span>Informasi Legalitas & Profil Lengkap</span>
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Data di bawah digunakan pada kop surat resmi cetak Berita Acara, dokumen PDF laporan harian, rekap logistik, dan footer sistem.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Singkat */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Singkat Perusahaan (Nama Apps) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: RBS"
                      value={profileForm.shortName}
                      onChange={(e) => setProfileForm({ ...profileForm, shortName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-black text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Otomatis menjadi brand nama aplikasi: <strong>{profileForm.shortName || 'RBS'} APPS</strong>
                    </span>
                  </div>

                  {/* Nama Lengkap */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Nama Lengkap Resmi Perusahaan *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PT. RBS GROUP"
                      value={profileForm.fullName}
                      onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-sm font-bold text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-500 mt-1 block">
                      Tercetak di kop surat dan seluruh dokumen resmi berita acara.
                    </span>
                  </div>

                  {/* Slogan / Tagline */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Slogan / Tagline Operasional
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Land Clearing Heavy Equipment • Zero Burning Method"
                      value={profileForm.tagline}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Bidang Usaha */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Bidang Usaha & Spesialisasi
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Kontraktor Pembukaan Lahan, Heavy Equipment & Perkebunan Kelapa Sawit (Zero Burning Method)"
                      value={profileForm.businessType || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, businessType: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Alamat Kantor */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Alamat Kantor Pusat / Operasional
                    </label>
                    <div className="relative">
                      <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                      <textarea
                        rows={2}
                        placeholder="Contoh: Jl. Soekarno-Hatta No. 88, Pekanbaru - Riau"
                        value={profileForm.address}
                        onChange={(e) => setProfileForm({ ...profileForm, address: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Telepon */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      No. Telepon / WhatsApp Kantor
                    </label>
                    <div className="relative">
                      <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Contoh: (0761) 841290 / 081175218899"
                        value={profileForm.phone}
                        onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Email Resmi Perusahaan
                    </label>
                    <div className="relative">
                      <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="email"
                        placeholder="Contoh: operasional@rbs.co.id"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Website Perusahaan
                    </label>
                    <div className="relative">
                      <Globe className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Contoh: https://rbs.co.id"
                        value={profileForm.website || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>

                  {/* NPWP / NIB */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      No. NPWP / NIB Perusahaan
                    </label>
                    <div className="relative">
                      <Hash className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Contoh: 01.234.567.8-216.000"
                        value={profileForm.taxId || ''}
                        onChange={(e) => setProfileForm({ ...profileForm, taxId: e.target.value })}
                        className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Submit Action Button */}
                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div className="text-xs text-slate-500">
                    Perubahan langsung tersimpan ke Cloud Firestore & sinkron ke seluruh gadget pengguna.
                  </div>
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="flex items-center gap-2 px-6 py-3 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Identitas Perusahaan'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </form>
      )}

      {/* ======================================================== */}
      {/* SUB-TAB 2: DAFTAR INFORMASI STAFF & TTD DIGITAL         */}
      {/* ======================================================== */}
      {activeSubTab === 'staff' && (
        <div className="space-y-6">
          {/* Controls Bar: Search, Filter & Tambah Staff */}
          <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-slate-200 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 items-center gap-3">
              {/* Search */}
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari nama staff, NIK, jabatan, atau divisi..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:outline-none focus:border-amber-500"
                />
                {staffSearchQuery && (
                  <button
                    onClick={() => setStaffSearchQuery('')}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* Filter */}
              <select
                value={staffRoleFilter}
                onChange={(e) => setStaffRoleFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua Jabatan</option>
                <option value="Direktur">Direktur</option>
                <option value="Manager">Manager</option>
                <option value="Pengawas">Pengawas</option>
                <option value="Akuntan">Akuntan</option>
                <option value="noAccount">⚠️ Belum Ada Akun Login</option>
                <option value="hasAccount">✅ Sudah Ada Akun Login</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleOpenAddStaffModal}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Staff Baru</span>
              </button>
            </div>
          </div>

          {/* Quick Notice: Staff integration to User Management */}
          <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-amber-950">
            <div className="flex items-center gap-2.5">
              <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
              <div>
                <strong className="font-black text-amber-900">Integrasi Langsung ke Manajemen User:</strong>
                <span className="ml-1 text-amber-900/90">
                  Staff resmi yang terdaftar di bawah dapat langsung dibuatkan akun login sistem dengan 1-klik tombol "Buatkan Akses Login".
                </span>
              </div>
            </div>
          </div>

          {/* Staff Grid Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredStaff.map((staff) => {
              const isSuper = staff.jobTitle.toLowerCase().includes('direktur');
              const isMgr = staff.jobTitle.toLowerCase().includes('manager');

              return (
                <div 
                  key={staff.id}
                  className="bg-white rounded-3xl p-5 shadow-sm border border-slate-200 hover:shadow-md transition-all flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Top Row: Jabatan & Status Akun */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className={`px-2.5 py-0.5 rounded-md text-[10px] font-black uppercase tracking-wider ${
                            isSuper 
                              ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                              : isMgr 
                              ? 'bg-sky-100 text-sky-800 border border-sky-200' 
                              : 'bg-amber-100 text-amber-800 border border-amber-200'
                          }`}>
                            {staff.jobTitle}
                          </span>
                          {staff.employeeId && (
                            <span className="text-[10px] font-mono text-slate-500 font-semibold">
                              {staff.employeeId}
                            </span>
                          )}
                        </div>
                        <h4 className="font-black text-slate-900 text-base mt-1.5 leading-snug">
                          {staff.fullName}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-medium">
                          {staff.department || 'Operasional'}
                        </div>
                      </div>

                      {/* Status Akun Badge */}
                      {staff.hasUserAccount ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Punya Akun</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                          <AlertCircle className="w-3 h-3 text-amber-600" />
                          <span>Belum Ada Akun</span>
                        </span>
                      )}
                    </div>

                    {/* Contact Info */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-100 text-xs text-slate-600">
                      <div className="flex items-center gap-2 truncate">
                        <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{staff.email || '-'}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span>{staff.phone || '-'}</span>
                      </div>
                      {staff.notes && (
                        <div className="text-[11px] text-slate-500 italic pt-1">
                          "{staff.notes}"
                        </div>
                      )}
                    </div>

                    {/* Digital Signature Preview Box */}
                    <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>TANDA TANGAN DIGITAL:</span>
                        {staff.signatureUrl ? (
                          <span className="text-emerald-600 font-bold flex items-center gap-1">
                            <Check className="w-3 h-3" /> Tersedia
                          </span>
                        ) : (
                          <span className="text-slate-400 italic">Belum Diupload</span>
                        )}
                      </div>

                      <div className="h-16 rounded-xl bg-white border border-slate-200 flex items-center justify-center overflow-hidden p-2">
                        {staff.signatureUrl ? (
                          <img 
                            src={staff.signatureUrl} 
                            alt={`TTD ${staff.fullName}`} 
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <div className="text-[10px] text-slate-400 italic flex items-center gap-1">
                            <PenTool className="w-3 h-3 text-slate-300" />
                            <span>Tidak ada TTD digital</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Actions Footer */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {/* Action 1: Create login account if not yet */}
                    {!staff.hasUserAccount ? (
                      <button
                        type="button"
                        onClick={() => handleInitiateCreateAccount(staff)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-bold rounded-xl text-xs transition cursor-pointer shadow-xs"
                        title="Buatkan akun login sistem untuk staff ini"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>Buatkan Akses Login</span>
                      </button>
                    ) : (
                      <span className="text-[11px] text-emerald-700 font-bold flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Akun Aktif</span>
                      </span>
                    )}

                    {/* Action 2: Edit & Delete buttons */}
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleOpenEditStaffModal(staff)}
                        className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition cursor-pointer"
                        title="Edit Data Staff & TTD"
                      >
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteStaff(staff)}
                        className="p-2 text-rose-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                        title="Hapus Staff"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStaff.length === 0 && (
            <div className="bg-white rounded-3xl p-10 text-center border border-slate-200 space-y-3">
              <Users className="w-12 h-12 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700 text-sm">Tidak Ada Staff Ditemukan</h4>
              <p className="text-xs text-slate-400">
                Silakan ubah filter pencarian atau tambahkan personil staff baru menggunakan tombol di atas.
              </p>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: TAMBAH / EDIT STAFF & TTD DIGITAL                 */}
      {/* ======================================================== */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-xl w-full p-5 sm:p-7 space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingStaffId ? 'Edit Data Staff & TTD Digital' : 'Tambah Staff Resmi Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Lengkapi identitas personil dan sertakan tanda tangan digital resmi.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Lengkap */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ir. Hendra Wijaya, M.Si"
                    value={staffForm.fullName}
                    onChange={(e) => setStaffForm({ ...staffForm, fullName: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* NIK / NIP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIK / NIP Karyawan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: RBS-SPV-008"
                    value={staffForm.employeeId}
                    onChange={(e) => setStaffForm({ ...staffForm, employeeId: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Jabatan Selector */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jabatan Struktural *
                  </label>
                  {!isCustomJobTitle ? (
                    <div className="flex gap-1.5">
                      <select
                        value={staffForm.jobTitle}
                        onChange={(e) => {
                          if (e.target.value === 'CUSTOM') {
                            setIsCustomJobTitle(true);
                          } else {
                            setStaffForm({ ...staffForm, jobTitle: e.target.value });
                          }
                        }}
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                      >
                        <option value="Direktur">Direktur</option>
                        <option value="Manager">Manager</option>
                        <option value="Manager Operasional">Manager Operasional</option>
                        <option value="Site Manager">Site Manager</option>
                        <option value="Pengawas">Pengawas</option>
                        <option value="Akuntan">Akuntan</option>
                        <option value="Kepala Logistik">Kepala Logistik</option>
                        <option value="Safety Officer K3">Safety Officer K3</option>
                        <option value="CUSTOM">+ Tulis Jabatan Baru...</option>
                      </select>
                    </div>
                  ) : (
                    <div className="flex gap-1.5">
                      <input
                        type="text"
                        placeholder="Ketik jabatan baru..."
                        value={customJobTitleValue}
                        onChange={(e) => setCustomJobTitleValue(e.target.value)}
                        className="w-full px-3 py-2 bg-slate-50 border border-amber-400 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => setIsCustomJobTitle(false)}
                        className="px-2 py-1 text-[11px] text-slate-500 hover:text-slate-800"
                        title="Batal custom jabatan"
                      >
                        Batal
                      </button>
                    </div>
                  )}
                </div>

                {/* Departemen */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Divisi / Departemen
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Operasional Lapangan"
                    value={staffForm.department}
                    onChange={(e) => setStaffForm({ ...staffForm, department: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* No Telepon / WA */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. WhatsApp Aktif
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: 081234567890"
                    value={staffForm.phone}
                    onChange={(e) => setStaffForm({ ...staffForm, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Email */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Alamat Email Staff
                  </label>
                  <input
                    type="email"
                    placeholder={`Contoh: nama@${companyIdentity.shortName.toLowerCase() || 'rbs'}.co.id`}
                    value={staffForm.email}
                    onChange={(e) => setStaffForm({ ...staffForm, email: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>

                {/* Catatan Peran */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Tugas & Wewenang
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Bertanggung jawab atas pengawasan pembukaan lahan di estate Kampar."
                    value={staffForm.notes}
                    onChange={(e) => setStaffForm({ ...staffForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* TANDA TANGAN DIGITAL SECTION */}
              <div className="pt-3 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Tanda Tangan Digital Resmi (TTD)
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input 
                      ref={fileInputTtdRef}
                      type="file"
                      accept="image/png,image/jpeg"
                      onChange={handleSignatureImageUpload}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => fileInputTtdRef.current?.click()}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                    >
                      <Upload className="w-3 h-3" />
                      <span>Upload Gambar TTD</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowSignaturePad(!showSignaturePad)}
                      className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-[10px] transition cursor-pointer flex items-center gap-1"
                    >
                      <PenTool className="w-3 h-3" />
                      <span>{showSignaturePad ? 'Tutup Kanvas' : 'Gambar di Layar'}</span>
                    </button>
                  </div>
                </div>

                {/* Canvas Drawing Pad */}
                {showSignaturePad && (
                  <div className="p-3 bg-slate-900 rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex items-center justify-between text-white text-[11px]">
                      <span>Goreskan Tanda Tangan Menggunakan Jari / Mouse:</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-amber-400 hover:text-amber-300 text-[10px] font-bold flex items-center gap-1"
                      >
                        <RotateCcw className="w-3 h-3" /> Hapus Goresan
                      </button>
                    </div>
                    <div className="bg-white rounded-xl overflow-hidden border border-slate-700">
                      <canvas
                        ref={canvasRef}
                        width={460}
                        height={120}
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                        className="w-full h-28 touch-none cursor-crosshair bg-white"
                      />
                    </div>
                    <div className="flex justify-end">
                      <button
                        type="button"
                        onClick={saveSignatureFromCanvas}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black rounded-lg text-xs transition cursor-pointer"
                      >
                        Gunakan Tanda Tangan Ini
                      </button>
                    </div>
                  </div>
                )}

                {/* Current Signature Display */}
                <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 flex items-center justify-between">
                  <div className="h-16 w-48 bg-white rounded-xl border border-slate-200 flex items-center justify-center p-1 overflow-hidden">
                    {staffForm.signatureUrl ? (
                      <img 
                        src={staffForm.signatureUrl} 
                        alt="TTD" 
                        className="max-h-full max-w-full object-contain"
                      />
                    ) : (
                      <span className="text-[10px] text-slate-400 italic">Belum ada TTD</span>
                    )}
                  </div>

                  {staffForm.signatureUrl && (
                    <button
                      type="button"
                      onClick={() => setStaffForm({ ...staffForm, signatureUrl: '' })}
                      className="px-3 py-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg text-xs font-bold transition cursor-pointer flex items-center gap-1"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus TTD</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  {editingStaffId ? 'Simpan Perubahan' : 'Tambah Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL: BUATKAN AKSES LOGIN INSTAN KE MANAJEMEN USER     */}
      {/* ======================================================== */}
      {accountCreateTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl max-w-md w-full p-5 sm:p-6 space-y-4">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold shrink-0">
                <UserPlus className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">
                  Buatkan Akses Login Sistem
                </h3>
                <p className="text-xs text-slate-500">
                  Untuk Staff: <strong className="text-slate-900">{accountCreateTarget.fullName}</strong>
                </p>
              </div>
            </div>

            <div className="space-y-3 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
                <div className="text-[10px] text-slate-400 font-bold uppercase">Jabatan Struktural:</div>
                <div className="font-black text-slate-900">{accountCreateTarget.jobTitle} ({accountCreateTarget.department || 'Operasional'})</div>
                <div className="text-[11px] text-slate-600">{accountCreateTarget.email} • {accountCreateTarget.phone}</div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Level Hak Akses *
                </label>
                <select
                  value={generatedAccountData.userLevel}
                  onChange={(e) => setGeneratedAccountData({ ...generatedAccountData, userLevel: e.target.value as ManagedUserLevel })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none cursor-pointer"
                >
                  <option value="Pengawas">Pengawas (Operasional Lapangan & Input Laporan)</option>
                  <option value="Manager">Manager (Otorisasi & Approval Pekerjaan)</option>
                  <option value="Superadmin">Superadmin (Direktur Utama / Akses Penuh)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Username Login *
                </label>
                <input
                  type="text"
                  required
                  value={generatedAccountData.username}
                  onChange={(e) => setGeneratedAccountData({ ...generatedAccountData, username: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-black text-slate-900 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Password Sementara *
                </label>
                <input
                  type="text"
                  required
                  value={generatedAccountData.password}
                  onChange={(e) => setGeneratedAccountData({ ...generatedAccountData, password: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-mono font-bold text-slate-900 focus:outline-none"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Pengguna dapat mengubah kata sandi ini setelah masuk.
                </span>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setAccountCreateTarget(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmCreateAccount}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                <span>Simpan & Buatkan Akun</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
