import React, { useState, useRef, useEffect } from 'react';
import { 
  Building2, 
  Users, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  ShieldAlert, 
  Edit3, 
  Trash2, 
  Plus, 
  FileText, 
  PenTool, 
  Eye, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Globe, 
  Sparkles, 
  Camera, 
  RefreshCw, 
  KeyRound, 
  X,
  Search,
  Check
} from 'lucide-react';
import { CompanyProfile, CompanyStaff, AuthUser } from '../types';
import { storageService } from '../services/storageService';
import { createDefaultCompanyLogoSvg, createSimulatedSignatureSvg } from '../data/mockData';
import { recordUserActivity } from '../utils/activityLogger';

interface CompanyProfileViewProps {
  companyProfile: CompanyProfile;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  authUser: AuthUser | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  onNavigateToUserManagement?: (staffPreload?: CompanyStaff) => void;
}

export const CompanyProfileView: React.FC<CompanyProfileViewProps> = ({
  companyProfile,
  onUpdateCompanyProfile,
  authUser,
  showToast,
  onNavigateToUserManagement,
}) => {
  // Strict Security Check: ONLY Direktur / Superadmin can access
  const isDirector = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';

  const [activeSection, setActiveSection] = useState<'identity' | 'staff'>('identity');

  // Company Profile Form State
  const [profileForm, setProfileForm] = useState<CompanyProfile>(companyProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  // Staff Management State
  const [staffList, setStaffList] = useState<CompanyStaff[]>(() => storageService.getCompanyStaff());
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilterRole, setStaffFilterRole] = useState('ALL');

  // Modal State for Staff Add/Edit
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [staffFormData, setStaffFormData] = useState<Partial<CompanyStaff>>({
    fullName: '',
    jobRole: 'Pengawas Lapangan',
    staffLevel: 'Pengawas',
    employeeIdNumber: '',
    email: '',
    phone: '',
    signatureUrl: '',
    status: 'Aktif',
    notes: '',
  });

  // Signature Input Mode: 'upload' | 'draw' | 'preset'
  const [sigMode, setSigMode] = useState<'upload' | 'draw' | 'preset'>('upload');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);

  // Keep profileForm in sync if companyProfile changes externally
  useEffect(() => {
    setProfileForm(companyProfile);
  }, [companyProfile]);

  // Guard: Access Denied for non-director
  if (!isDirector) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Ditolak: Khusus Direktur</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Halaman Identitas Resmi Perusahaan dan Database Staff Tanda Tangan Digital memiliki tingkat kerahasiaan tinggi dan hanya dapat diakses oleh akun Direktur Utama (Superadmin).
        </p>
      </div>
    );
  }

  // Reload staff
  const reloadStaff = () => {
    setStaffList(storageService.getCompanyStaff());
  };

  // Handle Logo Upload (Compress and convert to base64 Data URL)
  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('Format file tidak didukung. Harap upload gambar (PNG, JPG, SVG, WebP).', 'warning');
      return;
    }

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (!result) return;

      // Resize / compress via canvas to avoid giant payload
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > height && width > maxDim) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else if (height > maxDim) {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/png', 0.9);
          setProfileForm((prev) => ({ ...prev, logoUrl: compressedDataUrl }));
          showToast('Logo perusahaan berhasil diunggah! Logo ini otomatis diterapkan ke seluruh aplikasi.', 'success');
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
  };

  // Reset logo to generated SVG
  const handleResetToDefaultLogo = () => {
    const newSvg = createDefaultCompanyLogoSvg(profileForm.shortName || 'SURYALAND', profileForm.officialName || 'PT. SURYALAND GROUP');
    setProfileForm((prev) => ({ ...prev, logoUrl: newSvg }));
    showToast('Logo dikembalikan ke format logo resmi vektor.', 'info');
  };

  // Save Company Profile Changes
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.officialName.trim()) {
      showToast('Nama Resmi Perusahaan wajib diisi.', 'warning');
      return;
    }
    if (!profileForm.shortName.trim()) {
      showToast('Nama Singkat Perusahaan wajib diisi (contoh: RBS, SURYALAND).', 'warning');
      return;
    }

    setIsSavingProfile(true);
    setTimeout(() => {
      const saved = storageService.updateCompanyProfile(profileForm);
      onUpdateCompanyProfile(saved);
      setIsSavingProfile(false);

      recordUserActivity({
        userId: authUser?.id,
        userName: authUser?.displayName || 'Direktur',
        userRole: 'director',
        actionCategory: 'MASTER_DATA',
        actionTitle: `Ubah Identitas Perusahaan: ${saved.shortName}`,
        actionDescription: `Memperbarui identitas resmi ${saved.officialName} (Nama Apps: ${saved.shortName}). Logo & Kop Surat otomatis disinkronkan.`,
        targetEntity: saved.shortName,
      });

      showToast(`Identitas Perusahaan berhasil diperbarui! Nama Apps disetel ke "${saved.shortName}".`, 'success');
    }, 400);
  };

  // Handle Open Staff Modal
  const handleOpenStaffModal = (staff?: CompanyStaff) => {
    if (staff) {
      setEditingStaffId(staff.id);
      setStaffFormData({ ...staff });
      setSigMode(staff.signatureUrl ? 'upload' : 'preset');
    } else {
      setEditingStaffId(null);
      setStaffFormData({
        fullName: '',
        jobRole: 'Pengawas Lapangan',
        staffLevel: 'Pengawas',
        employeeIdNumber: `EMP-${Math.floor(100 + Math.random() * 900)}`,
        email: '',
        phone: '',
        signatureUrl: '',
        status: 'Aktif',
        notes: '',
      });
      setSigMode('upload');
    }
    setHasDrawnOnCanvas(false);
    setIsStaffModalOpen(true);
  };

  // Handle Signature Image Upload (from file)
  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (evt) => {
      const result = evt.target?.result as string;
      if (!result) return;
      setStaffFormData((prev) => ({ ...prev, signatureUrl: result }));
      showToast('Tanda tangan digital berhasil diupload.', 'info');
    };
    reader.readAsDataURL(file);
  };

  // Canvas drawing handlers for finger/touch signatures
  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnOnCanvas(true);
    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#0f172a';
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = 'touches' in e ? e.touches[0].clientX - rect.left : e.clientX - rect.left;
    const y = 'touches' in e ? e.touches[0].clientY - rect.top : e.clientY - rect.top;

    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    setIsDrawing(false);
    const canvas = canvasRef.current;
    if (canvas) {
      const dataUrl = canvas.toDataURL('image/png');
      setStaffFormData((prev) => ({ ...prev, signatureUrl: dataUrl }));
    }
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setHasDrawnOnCanvas(false);
      setStaffFormData((prev) => ({ ...prev, signatureUrl: '' }));
    }
  };

  // Apply simulated signature preset
  const handleApplyPresetSignature = () => {
    if (!staffFormData.fullName) {
      showToast('Masukkan Nama Lengkap terlebih dahulu untuk membuat TTD otomatis.', 'warning');
      return;
    }
    const sigSvg = createSimulatedSignatureSvg(staffFormData.fullName, staffFormData.jobRole || 'Staff');
    setStaffFormData((prev) => ({ ...prev, signatureUrl: sigSvg }));
    showToast('Tanda tangan digital kaligrafi resmi berhasil digenerate.', 'success');
  };

  // Save Staff Data
  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.fullName?.trim()) {
      showToast('Nama Lengkap Staff wajib diisi.', 'warning');
      return;
    }
    if (!staffFormData.jobRole?.trim()) {
      showToast('Jabatan / Role Staff wajib diisi.', 'warning');
      return;
    }

    const payload: CompanyStaff = {
      id: editingStaffId || `staff-${Date.now()}`,
      fullName: staffFormData.fullName.trim(),
      jobRole: staffFormData.jobRole.trim(),
      staffLevel: (staffFormData.staffLevel as any) || 'Pengawas',
      employeeIdNumber: staffFormData.employeeIdNumber?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      email: staffFormData.email?.trim() || '',
      phone: staffFormData.phone?.trim() || '',
      signatureUrl: staffFormData.signatureUrl || createSimulatedSignatureSvg(staffFormData.fullName, staffFormData.jobRole),
      status: staffFormData.status || 'Aktif',
      notes: staffFormData.notes?.trim() || '',
      linkedUserId: staffFormData.linkedUserId,
      createdAt: staffFormData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveCompanyStaff(payload);
    reloadStaff();
    setIsStaffModalOpen(false);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Direktur',
      userRole: 'director',
      actionCategory: 'MASTER_DATA',
      actionTitle: `${editingStaffId ? 'Update' : 'Tambah'} Staff: ${payload.fullName}`,
      actionDescription: `${editingStaffId ? 'Memperbarui' : 'Menambahkan'} data staff ${payload.fullName} (${payload.jobRole}) dengan Tanda Tangan Digital.`,
      targetEntity: payload.fullName,
    });

    showToast(`Staff ${payload.fullName} (${payload.jobRole}) berhasil disimpan!`, 'success');
  };

  // Delete Staff
  const handleDeleteStaff = (staff: CompanyStaff) => {
    if (confirm(`Apakah Anda yakin ingin menghapus data staff "${staff.fullName}" (${staff.jobRole})?`)) {
      storageService.deleteCompanyStaff(staff.id);
      reloadStaff();
      showToast(`Data staff ${staff.fullName} telah dihapus.`, 'info');
    }
  };

  // Filtered staff list
  const filteredStaff = staffList.filter((s) => {
    const matchesSearch = s.fullName.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
      s.jobRole.toLowerCase().includes(staffSearchQuery.toLowerCase()) ||
      s.employeeIdNumber.toLowerCase().includes(staffSearchQuery.toLowerCase());
    const matchesRole = staffFilterRole === 'ALL' || s.staffLevel === staffFilterRole;
    return matchesSearch && matchesRole;
  });

  // Check login account status for each staff
  const managedUsers = storageService.getManagedUsers();

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            {/* Live Logo Avatar */}
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border-2 border-amber-500/50 p-1.5 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
              {profileForm.logoUrl ? (
                <img 
                  src={profileForm.logoUrl} 
                  alt={profileForm.shortName} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-3xl">🚜</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Akses Khusus Direktur
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                <span className="text-xs text-slate-400 hidden sm:inline">Pengaturan Inti & Legalitas</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Identitas Resmi & Informasi Staff Perusahaan
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Kelola identitas resmi, logo perusahaan (otomatis menjadi Logo & Nama Apps), serta daftar staff pengesahan laporan lengkap dengan Tanda Tangan Digital (TTD).
              </p>
            </div>
          </div>

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-xs shrink-0">
            <div className="text-center px-2">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Nama Apps</span>
              <span className="font-black text-amber-400 text-sm tracking-wider">{companyProfile.shortName}</span>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="text-center px-2">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Total Staff</span>
              <span className="font-black text-white text-sm">{staffList.length} Orang</span>
            </div>
          </div>
        </div>

        {/* Section Navigation Tabs */}
        <div className="mt-8 flex gap-2 border-b border-slate-800 -mb-2">
          <button
            type="button"
            onClick={() => setActiveSection('identity')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeSection === 'identity'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Identitas Perusahaan & Logo Apps</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('staff')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer ${
              activeSection === 'staff'
                ? 'border-amber-400 text-amber-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Informasi Staff & TTD Digital ({staffList.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SECTION 1: IDENTITAS PERUSAHAAN & LOGO APPS */}
      {/* ========================================================================= */}
      {activeSection === 'identity' && (
        <form onSubmit={handleSaveProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Logo Preview & Brand Sync Indicator */}
            <div className="lg:col-span-1 space-y-6">
              {/* Logo Card */}
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    Logo Perusahaan
                  </h3>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800">
                    Otomatis Jadi Logo Apps
                  </span>
                </div>

                {/* Big Preview Box */}
                <div className="aspect-square w-full rounded-2xl bg-slate-900 border-2 border-dashed border-slate-300 p-6 flex flex-col items-center justify-center text-center relative group overflow-hidden shadow-inner">
                  {profileForm.logoUrl ? (
                    <img 
                      src={profileForm.logoUrl} 
                      alt="Logo Apps" 
                      className="max-h-full max-w-full object-contain drop-shadow-md"
                    />
                  ) : (
                    <div className="text-slate-400 space-y-2">
                      <Camera className="w-12 h-12 mx-auto text-slate-500" />
                      <span className="text-xs block">Belum ada logo terunggah</span>
                    </div>
                  )}

                  <div className="absolute inset-0 bg-slate-950/70 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-4 text-white">
                    <label className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer flex items-center gap-1.5">
                      <Upload className="w-3.5 h-3.5" />
                      <span>Ganti Logo</span>
                      <input 
                        type="file" 
                        accept="image/*" 
                        onChange={handleLogoUpload} 
                        className="hidden" 
                      />
                    </label>
                    <button
                      type="button"
                      onClick={handleResetToDefaultLogo}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] rounded-lg border border-slate-700 cursor-pointer"
                    >
                      Reset Logo Vektor
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl text-center shadow cursor-pointer flex items-center justify-center gap-1.5 transition">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload Logo Baru</span>
                    <input 
                      type="file" 
                      accept="image/*" 
                      onChange={handleLogoUpload} 
                      className="hidden" 
                    />
                  </label>
                  <button
                    type="button"
                    onClick={handleResetToDefaultLogo}
                    className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl border border-slate-300 transition cursor-pointer"
                    title="Reset ke Logo Bawaan"
                  >
                    <RefreshCw className="w-4 h-4" />
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Rekomendasi: Gambar PNG transparan atau SVG rasio 1:1. Logo ini otomatis tampil pada Header Aplikasi, Layar Login, Kop Surat Laporan PDF, dan Dokumen Pengesahan.
                </p>
              </div>

              {/* Dynamic Live Preview Box */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 text-white space-y-4 shadow-sm">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>Simulasi Tampilan Header</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> Live
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0">
                    {profileForm.logoUrl ? (
                      <img src={profileForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span>🚜</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-white text-sm tracking-wider truncate">
                        {profileForm.shortName || 'SURYALAND'}
                      </span>
                      <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        APPS
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {profileForm.officialName || 'PT. SURYALAND GROUP'} • Land Clearing
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Form Data Identitas Resmi */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-sm space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900">
                    Informasi Legalitas & Branding Perusahaan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pastikan nama singkat dan nama resmi diisi sesuai akta atau nama dagang proyek Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Singkat Perusahaan (Otomatis Jadi Nama Apps) */}
                  <div className="sm:col-span-1 p-3.5 rounded-2xl bg-amber-50/70 border-2 border-amber-300">
                    <label className="block text-xs font-black text-amber-950 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Nama Singkat (Nama Apps) *</span>
                      <span className="text-[10px] text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded font-bold">KUNCI NAMA APPS</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: RBS atau SURYALAND"
                      value={profileForm.shortName}
                      onChange={(e) => setProfileForm({ ...profileForm, shortName: e.target.value.toUpperCase() })}
                      className="w-full px-3.5 py-2.5 bg-white border border-amber-300 rounded-xl font-black text-slate-900 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-amber-900 mt-1 block">
                      Nama ini otomatis menjadi judul aplikasi di bilah atas, kop laporan, dan watermarking.
                    </span>
                  </div>

                  {/* Nama Resmi Perusahaan */}
                  <div className="sm:col-span-1">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nama Resmi Perusahaan (PT/CV) *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: PT. RIAU BARA SAMUDRA"
                      value={profileForm.officialName}
                      onChange={(e) => setProfileForm({ ...profileForm, officialName: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Nama lengkap perusahaan untuk lembar pengesahan dan dokumen hukum.
                    </span>
                  </div>

                  {/* Tagline / Slogan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Slogan / Bidang Pekerjaan
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Heavy Equipment & Plantation Land Clearing Contractor • Zero Burning Method"
                      value={profileForm.tagline}
                      onChange={(e) => setProfileForm({ ...profileForm, tagline: e.target.value })}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Nomor NPWP */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nomor NPWP Perusahaan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="01.234.567.8-216.000"
                      value={profileForm.npwp}
                      onChange={(e) => setProfileForm({ ...profileForm, npwp: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Nomor NIB */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Nomor Induk Berusaha (NIB)
                    </label>
                    <input
                      type="text"
                      placeholder="9120304561234"
                      value={profileForm.nib}
                      onChange={(e) => setProfileForm({ ...profileForm, nib: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Telepon */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Telepon Kantor</span>
                    </label>
                    <input
                      type="text"
                      placeholder="(0761) 554321"
                      value={profileForm.phone}
                      onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* WhatsApp */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      WhatsApp Operasional
                    </label>
                    <input
                      type="text"
                      placeholder="0812-7654-3210"
                      value={profileForm.whatsapp}
                      onChange={(e) => setProfileForm({ ...profileForm, whatsapp: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Email */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Email Resmi</span>
                    </label>
                    <input
                      type="email"
                      placeholder="corporate@suryaland.co.id"
                      value={profileForm.email}
                      onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Website */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Website Perusahaan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="https://suryaland.co.id"
                      value={profileForm.website || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, website: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Alamat Kantor Pusat */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alamat Kantor Pusat (Kop Surat)</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Jl. Jenderal Sudirman Kav. 88, Gedung Surya Graha Lt. 4, Pekanbaru, Riau"
                      value={profileForm.headOfficeAddress}
                      onChange={(e) => setProfileForm({ ...profileForm, headOfficeAddress: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  {/* Alamat Site Office Lapangan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Alamat Basecamp & Kantor Site Proyek
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Basecamp Proyek Land Clearing Estate Siak & Pelalawan, Riau"
                      value={profileForm.siteOfficeAddress}
                      onChange={(e) => setProfileForm({ ...profileForm, siteOfficeAddress: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 resize-none"
                    />
                  </div>

                  {/* Rekening Bank */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Informasi Rekening Bank Resmi
                    </label>
                    <input
                      type="text"
                      placeholder="Bank Mandiri Cabang Pekanbaru: 108-00-1234567-8 a/n PT. SURYALAND GROUP"
                      value={profileForm.bankAccountInfo || ''}
                      onChange={(e) => setProfileForm({ ...profileForm, bankAccountInfo: e.target.value })}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-3 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider transition shadow-lg shadow-amber-500/20 flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSavingProfile ? (
                      <div className="w-4 h-4 border-2 border-slate-950 border-t-transparent rounded-full animate-spin"></div>
                    ) : (
                      <Check className="w-4 h-4" />
                    )}
                    <span>Simpan Identitas & Terapkan Branding</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SECTION 2: DAFTAR INFORMASI STAFF & TTD DIGITAL */}
      {/* ========================================================================= */}
      {activeSection === 'staff' && (
        <div className="space-y-6">
          {/* Controls Bar */}
          <div className="bg-white rounded-3xl border border-slate-200 p-4 sm:p-6 shadow-sm flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
            <div className="flex flex-1 items-center gap-3">
              <div className="relative flex-1 max-w-md">
                <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Cari staff (Nama, Jabatan, NIP)..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              <select
                value={staffFilterRole}
                onChange={(e) => setStaffFilterRole(e.target.value)}
                className="bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 px-3 py-2 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500"
              >
                <option value="ALL">Semua Jabatan</option>
                <option value="Direktur">Direktur</option>
                <option value="Manager">Manager</option>
                <option value="Pengawas">Pengawas</option>
                <option value="Akuntan">Akuntan</option>
                <option value="Staff">Staff Lainnya</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => handleOpenStaffModal()}
              className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-amber-500/20 transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Tambah Staff Baru</span>
            </button>
          </div>

          {/* Integration Banner to User Management */}
          <div className="bg-gradient-to-r from-blue-950 to-slate-900 border border-blue-800 rounded-2xl p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-300 shrink-0">
                <KeyRound className="w-5 h-5" />
              </div>
              <div>
                <strong className="block text-xs font-bold text-blue-200">
                  Integrasi Otomatis dengan Manajemen User
                </strong>
                <p className="text-[11px] text-slate-300">
                  Daftar staff di bawah ini dapat langsung digunakan di halaman <strong>"Manajemen User"</strong> untuk membuatkan username dan password akses sistem dengan 1-klik.
                </p>
              </div>
            </div>

            {onNavigateToUserManagement && (
              <button
                type="button"
                onClick={() => onNavigateToUserManagement()}
                className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs rounded-xl transition shrink-0 cursor-pointer shadow-sm"
              >
                Buka Manajemen User →
              </button>
            )}
          </div>

          {/* Staff Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStaff.map((staff) => {
              // Check if linked user exists
              const linkedUser = managedUsers.find(
                (u) => u.fullName.toLowerCase() === staff.fullName.toLowerCase() || u.id === staff.linkedUserId
              );

              return (
                <div
                  key={staff.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    {/* Header info */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                          staff.staffLevel === 'Direktur'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : staff.staffLevel === 'Manager'
                            ? 'bg-blue-100 text-blue-900 border border-blue-300'
                            : staff.staffLevel === 'Akuntan'
                            ? 'bg-purple-100 text-purple-900 border border-purple-300'
                            : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                        }`}>
                          {staff.jobRole}
                        </span>
                        <h4 className="text-sm font-black text-slate-900 mt-1.5">
                          {staff.fullName}
                        </h4>
                        <span className="text-[11px] text-slate-500 font-mono">
                          NIP: {staff.employeeIdNumber}
                        </span>
                      </div>

                      <span className={`w-2 h-2 rounded-full ${staff.status === 'Aktif' ? 'bg-emerald-500' : 'bg-slate-300'}`} title={staff.status} />
                    </div>

                    {/* Contact info */}
                    <div className="space-y-1 text-xs text-slate-600 pt-1 border-t border-slate-100">
                      {staff.phone && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{staff.phone}</span>
                        </div>
                      )}
                      {staff.email && (
                        <div className="flex items-center gap-1.5 text-[11px]">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{staff.email}</span>
                        </div>
                      )}
                    </div>

                    {/* TTD Digital Preview Box */}
                    <div className="mt-3 p-2.5 rounded-2xl bg-slate-50 border border-slate-200">
                      <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 mb-1">
                        <span>Tanda Tangan Digital:</span>
                        <span className="text-emerald-700 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sah
                        </span>
                      </div>
                      <div className="h-16 w-full rounded-xl bg-white border border-slate-200/80 flex items-center justify-center p-1 overflow-hidden">
                        {staff.signatureUrl ? (
                          <img 
                            src={staff.signatureUrl} 
                            alt={`TTD ${staff.fullName}`} 
                            className="max-h-full max-w-full object-contain"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">Belum ada scan TTD</span>
                        )}
                      </div>
                    </div>

                    {/* Login Account Indicator */}
                    <div className="pt-2">
                      {linkedUser ? (
                        <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11px] text-emerald-800 font-semibold">
                          <div className="flex items-center gap-1.5">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                            <span>Akun Login: <strong>{linkedUser.username}</strong></span>
                          </div>
                          <span className="text-[10px] px-1.5 py-0.2 bg-emerald-200/60 rounded font-mono">
                            {linkedUser.userLevel}
                          </span>
                        </div>
                      ) : (
                        <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between gap-2 text-[11px] text-amber-900">
                          <span>Belum dibuatkan akun login</span>
                          {onNavigateToUserManagement && (
                            <button
                              type="button"
                              onClick={() => onNavigateToUserManagement(staff)}
                              className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[10px] rounded-lg shadow-xs transition cursor-pointer shrink-0"
                            >
                              + Buat Akun
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenStaffModal(staff)}
                      className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-xl transition cursor-pointer"
                      title="Edit Staff"
                    >
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteStaff(staff)}
                      className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition cursor-pointer"
                      title="Hapus Staff"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredStaff.length === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <Users className="w-12 h-12 text-slate-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Tidak ada staff ditemukan</h4>
              <p className="text-xs text-slate-500">Coba ubah kata kunci pencarian atau filter jabatan.</p>
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: TAMBAH / EDIT STAFF DENGAN TTD DIGITAL */}
      {/* ========================================================================= */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm overflow-y-auto">
          <div className="bg-white rounded-3xl border border-slate-300 max-w-xl w-full p-6 sm:p-8 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {editingStaffId ? 'Edit Informasi Staff & TTD' : 'Tambah Staff Perusahaan Baru'}
                </h3>
                <p className="text-xs text-slate-500">
                  Informasi staff ini digunakan pada lembar pengesahan dan pembuatan akun login.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {/* Nama Lengkap & Gelar */}
                <div className="sm:col-span-2">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Nama Lengkap & Gelar *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Ir. Hendra Wijaya, M.Si"
                    value={staffFormData.fullName || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, fullName: e.target.value })}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Jabatan / Role */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Jabatan Resmi *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: Direktur Utama / Pengawas Lapangan"
                    value={staffFormData.jobRole || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, jobRole: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Level Jabatan (Kategori Akses) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Kategori Staff
                  </label>
                  <select
                    value={staffFormData.staffLevel || 'Pengawas'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, staffLevel: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Direktur">Direktur (Superadmin)</option>
                    <option value="Manager">Manager Operasional</option>
                    <option value="Pengawas">Pengawas Lapangan</option>
                    <option value="Akuntan">Akuntan & Finance</option>
                    <option value="Staff">Staff / Mandor Pendukung</option>
                  </select>
                </div>

                {/* NIK / NIP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    NIP / NIK Karyawan
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: DIR-001 / SUP-004"
                    value={staffFormData.employeeIdNumber || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, employeeIdNumber: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Karyawan
                  </label>
                  <select
                    value={staffFormData.status || 'Aktif'}
                    onChange={(e) => setStaffFormData({ ...staffFormData, status: e.target.value as any })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Aktif">Aktif Bekerja</option>
                    <option value="Nonaktif">Nonaktif</option>
                  </select>
                </div>

                {/* No WhatsApp / HP */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    No. HP / WhatsApp
                  </label>
                  <input
                    type="text"
                    placeholder="0812-7654-xxxx"
                    value={staffFormData.phone || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Staff
                  </label>
                  <input
                    type="email"
                    placeholder="nama@suryaland.co.id"
                    value={staffFormData.email || ''}
                    onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  />
                </div>
              </div>

              {/* TANDA TANGAN DIGITAL SECTION */}
              <div className="pt-2 border-t border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <PenTool className="w-3.5 h-3.5 text-amber-500" />
                    <span>Tanda Tangan Digital (TTD) *</span>
                  </label>

                  {/* Mode switcher */}
                  <div className="flex bg-slate-100 p-0.5 rounded-lg text-[10px] font-bold">
                    <button
                      type="button"
                      onClick={() => setSigMode('upload')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${sigMode === 'upload' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Upload File
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode('draw')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${sigMode === 'draw' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Tanda Tangan Layar
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode('preset')}
                      className={`px-2 py-1 rounded-md transition cursor-pointer ${sigMode === 'preset' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500'}`}
                    >
                      Otomatis
                    </button>
                  </div>
                </div>

                {/* Option 1: Upload File TTD */}
                {sigMode === 'upload' && (
                  <div className="space-y-2">
                    <div className="flex gap-2">
                      <label className="flex-1 py-3 px-4 bg-slate-50 hover:bg-slate-100 border-2 border-dashed border-slate-300 rounded-xl text-center text-xs font-bold text-slate-700 cursor-pointer flex items-center justify-center gap-2 transition">
                        <Upload className="w-4 h-4 text-amber-500" />
                        <span>Pilih Gambar Scan TTD (PNG / JPG)</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSignatureUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                )}

                {/* Option 2: Canvas Drawing (Touch / Stylus / Mouse) */}
                {sigMode === 'draw' && (
                  <div className="space-y-2">
                    <div className="relative border-2 border-slate-300 rounded-2xl bg-white overflow-hidden shadow-inner">
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
                        className="w-full h-28 touch-none cursor-crosshair"
                      />
                      <div className="absolute top-2 right-2 flex gap-1">
                        <button
                          type="button"
                          onClick={clearCanvas}
                          className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-[10px] font-bold cursor-pointer"
                        >
                          Hapus Coretan
                        </button>
                      </div>
                      <span className="absolute bottom-1 left-2 text-[9px] text-slate-400 pointer-events-none">
                        Tanda tangani langsung di atas bidang ini (dukung layar sentuh tablet)
                      </span>
                    </div>
                  </div>
                )}

                {/* Option 3: Generate Automatic Cursive Signature */}
                {sigMode === 'preset' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleApplyPresetSignature}
                      className="w-full py-2.5 px-3 bg-amber-50 hover:bg-amber-100 border border-amber-300 rounded-xl text-amber-900 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer transition"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Generate TTD Digital Berdasarkan Nama ({staffFormData.fullName || 'Nama Staff'})</span>
                    </button>
                  </div>
                )}

                {/* Signature Preview */}
                {staffFormData.signatureUrl && (
                  <div className="mt-2.5 p-2 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase">Preview TTD:</span>
                      <div className="h-10 w-28 bg-white border border-slate-300 rounded p-1 flex items-center justify-center">
                        <img 
                          src={staffFormData.signatureUrl} 
                          alt="Preview TTD" 
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setStaffFormData({ ...staffFormData, signatureUrl: '' })}
                      className="text-xs text-rose-600 hover:text-rose-800 font-bold cursor-pointer"
                    >
                      Hapus TTD
                    </button>
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsStaffModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-xs uppercase tracking-wider shadow-md shadow-amber-500/20 cursor-pointer"
                >
                  {editingStaffId ? 'Simpan Perubahan' : 'Tambahkan Staff'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
