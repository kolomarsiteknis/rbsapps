import React, { useState, useMemo, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  ShieldCheck, 
  ShieldAlert, 
  KeyRound, 
  Eye, 
  EyeOff, 
  Edit3, 
  Trash2, 
  CheckCircle2, 
  Phone, 
  Mail, 
  MapPin, 
  Briefcase, 
  Copy, 
  Check, 
  Sparkles, 
  MessageSquare,
  Lock,
  Grid,
  List
} from 'lucide-react';
import { ManagedUser, ManagedUserLevel, AuthUser, CompanyStaff } from '../types';
import { storageService } from '../services/storageService';
import { recordUserActivity } from '../utils/activityLogger';

interface UserManagementViewProps {
  authUser: AuthUser | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  preloadStaff?: CompanyStaff | null;
  onClearPreloadStaff?: () => void;
}

export const UserManagementView: React.FC<UserManagementViewProps> = ({
  authUser,
  showToast,
  preloadStaff,
  onClearPreloadStaff,
}) => {
  // Strict Role Check: Superadmin ONLY
  const isSuperadmin = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';

  // Master Data State (Hanya User dan Master Jabatan)
  const [users, setUsers] = useState<ManagedUser[]>(() => storageService.getManagedUsers());
  const [jobTitles, setJobTitles] = useState<string[]>(() => storageService.getJobTitles());
  const [companyStaff, setCompanyStaff] = useState<CompanyStaff[]>(() => storageService.getCompanyStaff());

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterLevel, setFilterLevel] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');

  // Password Visibility Toggle for user cards
  const [visiblePasswords, setVisiblePasswords] = useState<{ [userId: string]: boolean }>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Modal State for CRUD
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);

  // Form State (Fokus murni pada data akun dan identitas user)
  const [formData, setFormData] = useState<{
    fullName: string;
    address: string;
    whatsappNumber: string;
    email: string;
    jobTitle: string;
    userLevel: ManagedUserLevel;
    username: string;
    password: string;
    status: 'Aktif' | 'Nonaktif';
    notes: string;
  }>({
    fullName: '',
    address: '',
    whatsappNumber: '',
    email: '',
    jobTitle: 'Pengawas',
    userLevel: 'Pengawas',
    username: '',
    password: '',
    status: 'Aktif',
    notes: '',
  });

  // Inline "Tambah Jabatan Baru" state
  const [isAddingNewJobTitle, setIsAddingNewJobTitle] = useState(false);
  const [customJobTitleInput, setCustomJobTitleInput] = useState('');

  // Password visibility in modal form
  const [showModalPassword, setShowModalPassword] = useState(false);
  const [formErrors, setFormErrors] = useState<{ [field: string]: string }>({});

  // Refresh helper
  const reloadData = () => {
    setUsers(storageService.getManagedUsers());
    setJobTitles(storageService.getJobTitles());
    setCompanyStaff(storageService.getCompanyStaff());
  };

  // Helper: auto-fill user credentials from Company Staff
  const handleSelectStaffToFill = (staff: CompanyStaff) => {
    let suggestedLevel: ManagedUserLevel = 'Pengawas';
    if (staff.staffLevel === 'Direktur' || staff.jobRole.toLowerCase().includes('direktur')) {
      suggestedLevel = 'Superadmin';
    } else if (staff.staffLevel === 'Manager' || staff.jobRole.toLowerCase().includes('manager')) {
      suggestedLevel = 'Manager';
    }

    const cleanUsername = staff.fullName
      .replace(/^(Ir\.|Dr\.|Drs\.|H\.|Hj\.)\s*/i, '')
      .split(' ')[0]
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    setFormData((prev) => ({
      ...prev,
      fullName: staff.fullName,
      email: staff.email || prev.email,
      whatsappNumber: staff.phone || prev.whatsappNumber,
      jobTitle: staff.jobRole,
      userLevel: suggestedLevel,
      username: prev.username || `${cleanUsername}2026`,
      password: prev.password || 'satu2345',
      status: staff.status || 'Aktif',
    }));
    showToast(`Data staff "${staff.fullName}" (${staff.jobRole}) berhasil diisikan.`, 'info');
  };

  // Auto handle preloadStaff from Company Profile view
  useEffect(() => {
    if (preloadStaff) {
      setEditingUserId(null);
      handleSelectStaffToFill(preloadStaff);
      setIsModalOpen(true);
      if (onClearPreloadStaff) onClearPreloadStaff();
    }
  }, [preloadStaff]);

  // Guard: If not superadmin, render access denied
  if (!isSuperadmin) {
    return (
      <div className="max-w-2xl mx-auto my-12 p-8 bg-slate-900 border border-rose-500/40 rounded-2xl text-center shadow-2xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center mx-auto mb-4 text-rose-400">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white mb-2">Akses Ditolak: Khusus Superadmin</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto mb-6">
          Modul Manajemen User ini hanya dapat diakses, dilihat, dan dikelola oleh akun dengan tingkat hak akses <strong>Superadmin (Direktur / Superadmin)</strong>.
        </p>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-800 text-xs text-amber-400 border border-slate-700">
          <Lock className="w-4 h-4" />
          <span>Hubungi Direktur Utama untuk mendapatkan hak akses pengelolaan user.</span>
        </div>
      </div>
    );
  }

  // Filtered Users List
  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // Search
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = user.fullName.toLowerCase().includes(q);
        const matchUser = user.username.toLowerCase().includes(q);
        const matchEmail = user.email.toLowerCase().includes(q);
        const matchWa = user.whatsappNumber.toLowerCase().includes(q);
        const matchJob = user.jobTitle.toLowerCase().includes(q);
        if (!matchName && !matchUser && !matchEmail && !matchWa && !matchJob) {
          return false;
        }
      }

      // Filter Level
      if (filterLevel !== 'ALL' && user.userLevel !== filterLevel) {
        return false;
      }

      // Filter Status
      if (filterStatus !== 'ALL' && user.status !== filterStatus) {
        return false;
      }

      return true;
    });
  }, [users, searchQuery, filterLevel, filterStatus]);

  // Statistics
  const stats = useMemo(() => {
    const total = users.length;
    const superadmins = users.filter((u) => u.userLevel === 'Superadmin').length;
    const managers = users.filter((u) => u.userLevel === 'Manager').length;
    const supervisors = users.filter((u) => u.userLevel === 'Pengawas').length;
    const active = users.filter((u) => u.status === 'Aktif').length;
    return { total, superadmins, managers, supervisors, active };
  }, [users]);

  // Toggle Card Password View
  const togglePasswordVisibility = (userId: string) => {
    setVisiblePasswords((prev) => ({ ...prev, [userId]: !prev[userId] }));
  };

  // Copy to clipboard helper
  const copyToClipboard = (text: string, id: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedId(id);
      showToast(`${label} berhasil disalin ke clipboard!`, 'info');
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingUserId(null);
    setFormData({
      fullName: '',
      address: '',
      whatsappNumber: '',
      email: '',
      jobTitle: 'Pengawas',
      userLevel: 'Pengawas',
      username: '',
      password: '',
      status: 'Aktif',
      notes: '',
    });
    setIsAddingNewJobTitle(false);
    setCustomJobTitleInput('');
    setShowModalPassword(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (user: ManagedUser) => {
    setEditingUserId(user.id);
    setFormData({
      fullName: user.fullName,
      address: user.address,
      whatsappNumber: user.whatsappNumber,
      email: user.email,
      jobTitle: user.jobTitle,
      userLevel: user.userLevel,
      username: user.username,
      password: user.password,
      status: user.status,
      notes: user.notes || '',
    });
    setIsAddingNewJobTitle(false);
    setCustomJobTitleInput('');
    setShowModalPassword(false);
    setFormErrors({});
    setIsModalOpen(true);
  };

  // Generate Strong Password Helper
  const handleGeneratePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
    let res = '';
    for (let i = 0; i < 8; i++) {
      res += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormData((prev) => ({ ...prev, password: res }));
    setShowModalPassword(true);
    showToast('Password otomatis berhasil di-generate!', 'info');
  };

  // Save new custom job title
  const handleSaveCustomJobTitle = () => {
    const trimmed = customJobTitleInput.trim();
    if (!trimmed) {
      showToast('Nama jabatan baru tidak boleh kosong!', 'warning');
      return;
    }
    const updated = storageService.saveJobTitle(trimmed);
    setJobTitles(updated);
    setFormData((prev) => ({ ...prev, jobTitle: trimmed }));
    setIsAddingNewJobTitle(false);
    setCustomJobTitleInput('');
    showToast(`Jabatan "${trimmed}" berhasil ditambahkan ke master opsi!`, 'success');
  };

  // Form Validation & Submit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    const errors: { [field: string]: string } = {};

    // 1. Nama Lengkap
    if (!formData.fullName.trim()) {
      errors.fullName = 'Nama lengkap wajib diisi.';
    }

    // 2. Alamat
    if (!formData.address.trim()) {
      errors.address = 'Alamat lengkap wajib diisi.';
    }

    // 3. No WA Aktif
    const cleanWa = formData.whatsappNumber.replace(/\D/g, '');
    if (!cleanWa || cleanWa.length < 9) {
      errors.whatsappNumber = 'No WhatsApp aktif minimal 9 digit angka (misal: 0812xxxx).';
    }

    // 4. Email Aktif
    if (!formData.email.trim() || !formData.email.includes('@')) {
      errors.email = 'Format email aktif tidak valid.';
    }

    // 5. Jabatan
    if (!formData.jobTitle.trim()) {
      errors.jobTitle = 'Jabatan harus dipilih atau ditambahkan.';
    }

    // 6. Username
    const cleanUsername = formData.username.trim();
    if (!cleanUsername || cleanUsername.length < 3) {
      errors.username = 'Username minimal 3 karakter tanpa spasi.';
    } else {
      // Check uniqueness
      const existingUser = users.find(
        (u) => u.username.toLowerCase() === cleanUsername.toLowerCase() && u.id !== editingUserId
      );
      if (existingUser) {
        errors.username = `Username "${cleanUsername}" sudah digunakan oleh ${existingUser.fullName}.`;
      }
    }

    // 7. Password
    if (!formData.password.trim() || formData.password.length < 5) {
      errors.password = 'Password minimal 5 karakter.';
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      showToast('Mohon periksa kembali kolom formulir yang belum lengkap.', 'warning');
      return;
    }

    if (editingUserId) {
      // Update existing user
      const existing = users.find((u) => u.id === editingUserId);
      const updatedUser: ManagedUser = {
        id: editingUserId,
        fullName: formData.fullName.trim(),
        address: formData.address.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        email: formData.email.trim(),
        jobTitle: formData.jobTitle.trim(),
        userLevel: formData.userLevel,
        username: formData.username.trim(),
        password: formData.password.trim(),
        assignedClientId: existing?.assignedClientId || 'all',
        assignedClientName: existing?.assignedClientName || '-',
        assignedBlockCodes: existing?.assignedBlockCodes || [],
        status: formData.status,
        createdAt: existing?.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        notes: formData.notes.trim(),
      };

      storageService.saveManagedUser(updatedUser);

      recordUserActivity({
        userId: authUser?.id,
        userName: authUser?.displayName || 'Superadmin',
        userRole: 'director',
        userEmail: authUser?.email,
        actionCategory: 'USER_MANAGEMENT',
        actionTitle: `Ubah Data User: ${updatedUser.fullName}`,
        actionDescription: `Mengupdate profil dan kredensial pengguna ${updatedUser.username} (${updatedUser.jobTitle} - Level: ${updatedUser.userLevel}).`,
        targetEntity: `${updatedUser.username} (${updatedUser.userLevel})`,
      });

      showToast(`Data pengguna "${updatedUser.fullName}" berhasil diperbarui!`, 'success');
    } else {
      // Create new user
      const newUser: ManagedUser = {
        id: `user-usr-${Date.now()}`,
        fullName: formData.fullName.trim(),
        address: formData.address.trim(),
        whatsappNumber: formData.whatsappNumber.trim(),
        email: formData.email.trim(),
        jobTitle: formData.jobTitle.trim(),
        userLevel: formData.userLevel,
        username: formData.username.trim(),
        password: formData.password.trim(),
        assignedClientId: 'all',
        assignedClientName: '-',
        assignedBlockCodes: [],
        status: formData.status,
        createdAt: new Date().toISOString(),
        notes: formData.notes.trim(),
      };

      storageService.saveManagedUser(newUser);

      recordUserActivity({
        userId: authUser?.id,
        userName: authUser?.displayName || 'Superadmin',
        userRole: 'director',
        userEmail: authUser?.email,
        actionCategory: 'USER_MANAGEMENT',
        actionTitle: `Tambah User Baru: ${newUser.fullName}`,
        actionDescription: `Mendaftarkan akun pengguna baru ${newUser.username} (Level: ${newUser.userLevel}, Jabatan: ${newUser.jobTitle}).`,
        targetEntity: `${newUser.username} (${newUser.userLevel})`,
      });

      showToast(`Pengguna baru "${newUser.fullName}" (${newUser.username}) berhasil ditambahkan!`, 'success');
    }

    reloadData();
    setIsModalOpen(false);
  };

  // Toggle User Status (Aktif / Nonaktif)
  const handleToggleStatus = (user: ManagedUser) => {
    // Prevent deactivating own active logged-in superadmin account
    if (authUser && authUser.username === user.username) {
      showToast('Tidak dapat menonaktifkan akun yang sedang aktif digunakan saat ini.', 'warning');
      return;
    }

    const newStatus = user.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated: ManagedUser = {
      ...user,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    };

    storageService.saveManagedUser(updated);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Superadmin',
      userRole: 'director',
      userEmail: authUser?.email,
      actionCategory: 'USER_MANAGEMENT',
      actionTitle: `Ubah Status User: ${user.fullName} -> ${newStatus}`,
      actionDescription: `Status akun ${user.username} diubah menjadi ${newStatus}.`,
      targetEntity: `${user.username} (${newStatus})`,
    });

    reloadData();
    showToast(`Status pengguna "${user.fullName}" berhasil diubah menjadi ${newStatus}.`, 'info');
  };

  // Delete User
  const handleDeleteUser = (user: ManagedUser) => {
    // Protection: Cannot delete own account
    if (authUser && authUser.username === user.username) {
      showToast('Tidak dapat menghapus akun Anda sendiri yang sedang aktif digunakan.', 'error');
      return;
    }

    // Protection: Superadmin primary check
    if (user.username === 'DIREKTUR' && users.filter((u) => u.userLevel === 'Superadmin').length <= 1) {
      showToast('Tidak dapat menghapus satu-satunya akun Superadmin Utama.', 'error');
      return;
    }

    if (!window.confirm(`Apakah Anda yakin ingin menghapus pengguna "${user.fullName}" (${user.username}) secara permanen? Tindakan ini tidak dapat dibatalkan.`)) {
      return;
    }

    const success = storageService.deleteManagedUser(user.id);
    if (success) {
      recordUserActivity({
        userId: authUser?.id,
        userName: authUser?.displayName || 'Superadmin',
        userRole: 'director',
        userEmail: authUser?.email,
        actionCategory: 'USER_MANAGEMENT',
        actionTitle: `Hapus User: ${user.fullName}`,
        actionDescription: `Menghapus akun pengguna ${user.username} (${user.userLevel}) dari sistem.`,
        targetEntity: `${user.username}`,
      });

      reloadData();
      showToast(`Pengguna "${user.fullName}" berhasil dihapus dari sistem.`, 'success');
    } else {
      showToast('Gagal menghapus pengguna.', 'error');
    }
  };

  return (
    <div className="space-y-6 pb-16">
      {/* SUPERADMIN TOP EXECUTIVE BANNER */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 border border-indigo-500/30 rounded-2xl p-5 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-56 h-56 bg-amber-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-black uppercase tracking-wider mb-2.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>MODUL EKSKLUSIF SUPERADMIN • OTORISASI SISTEM</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-amber-400" />
              <span>Manajemen User</span>
            </h1>
            <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-2xl">
              Pusat CRUD data pengguna resmi sistem: profil identitas lengkap, nomor WhatsApp, email, jabatan, level hak akses, dan kredensial login akun.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={handleOpenCreateModal}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 active:scale-95 text-slate-950 font-black rounded-xl text-xs sm:text-sm shadow-lg shadow-amber-500/25 transition-all cursor-pointer"
            >
              <UserPlus className="w-4 h-4 text-slate-950" />
              <span>+ Tambah Pengguna Baru</span>
            </button>
          </div>
        </div>

        {/* METRICS ROW */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mt-5 pt-5 border-t border-slate-800/80">
          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total User</div>
            <div className="text-2xl font-black text-white mt-0.5">{stats.total}</div>
            <div className="text-[10px] text-slate-400 mt-0.5 flex items-center gap-1">
              <Users className="w-3 h-3 text-amber-400" /> Terdaftar di Sistem
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Superadmin</div>
            <div className="text-2xl font-black text-amber-400 mt-0.5">{stats.superadmins}</div>
            <div className="text-[10px] text-amber-300/80 mt-0.5 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-amber-400" /> Otorisasi Penuh
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Manager</div>
            <div className="text-2xl font-black text-indigo-400 mt-0.5">{stats.managers}</div>
            <div className="text-[10px] text-indigo-300/80 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-indigo-400" /> Approval &amp; Audit
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Pengawas</div>
            <div className="text-2xl font-black text-sky-400 mt-0.5">{stats.supervisors}</div>
            <div className="text-[10px] text-sky-300/80 mt-0.5 flex items-center gap-1">
              <Briefcase className="w-3 h-3 text-sky-400" /> Lapangan
            </div>
          </div>

          <div className="bg-slate-950/60 border border-slate-800 rounded-xl p-3">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Status Aktif</div>
            <div className="text-2xl font-black text-emerald-400 mt-0.5">{stats.active}</div>
            <div className="text-[10px] text-emerald-300/80 mt-0.5 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Akun Aktif
            </div>
          </div>
        </div>
      </div>

      {/* FILTER & SEARCH CONTROL BAR */}
      <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
          {/* Search Box */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari nama, WA, username, email..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs cursor-pointer font-bold"
              >
                ✕
              </button>
            )}
          </div>

          {/* Quick Filters & View Mode */}
          <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto justify-between sm:justify-end">
            {/* Level Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-bold text-[11px] text-slate-500 uppercase">Level:</span>
              <select
                value={filterLevel}
                onChange={(e) => setFilterLevel(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua Level</option>
                <option value="Superadmin">Superadmin</option>
                <option value="Manager">Manager</option>
                <option value="Pengawas">Pengawas</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5 text-xs text-slate-600">
              <span className="font-bold text-[11px] text-slate-500 uppercase">Status:</span>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="ALL">Semua</option>
                <option value="Aktif">Aktif</option>
                <option value="Nonaktif">Nonaktif</option>
              </select>
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center border border-slate-200 rounded-xl p-0.5 bg-slate-100">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Grid Kartu"
              >
                <Grid className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg transition cursor-pointer ${
                  viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Tampilan Tabel"
              >
                <List className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>

        {/* Active Filter summary */}
        <div className="text-[11px] text-slate-500 flex items-center justify-between border-t border-slate-100 pt-2">
          <span>
            Menampilkan <strong>{filteredUsers.length}</strong> dari <strong>{users.length}</strong> total pengguna terdaftar.
          </span>
          {(searchQuery || filterLevel !== 'ALL' || filterStatus !== 'ALL') && (
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setFilterLevel('ALL');
                setFilterStatus('ALL');
              }}
              className="text-amber-600 hover:underline font-bold cursor-pointer"
            >
              Reset Filter
            </button>
          )}
        </div>
      </div>

      {/* USER LIST: GRID VIEW */}
      {viewMode === 'grid' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-4">
          {filteredUsers.length === 0 ? (
            <div className="col-span-full bg-white rounded-2xl border border-slate-200 p-8 text-center text-slate-500">
              <Users className="w-12 h-12 text-slate-300 mx-auto mb-2" />
              <div className="font-bold text-slate-800 text-sm">Tidak ada pengguna yang cocok</div>
              <p className="text-xs text-slate-400 mt-1">Coba sesuaikan kata kunci pencarian atau reset filter.</p>
            </div>
          ) : (
            filteredUsers.map((user) => {
              const isPwdVisible = visiblePasswords[user.id] || false;
              const isSuper = user.userLevel === 'Superadmin';
              const isCurrentLoggedIn = authUser?.username === user.username;

              return (
                <div
                  key={user.id}
                  className={`bg-white rounded-2xl border transition-all duration-200 overflow-hidden shadow-xs hover:shadow-md flex flex-col justify-between ${
                    user.status === 'Aktif'
                      ? isSuper
                        ? 'border-amber-200/90 ring-1 ring-amber-500/10'
                        : 'border-slate-200'
                      : 'border-slate-200 opacity-75 bg-slate-50'
                  }`}
                >
                  {/* Card Top Section */}
                  <div className="p-4 sm:p-5 space-y-3.5 flex-1">
                    {/* Header Row: Level Badge & Status */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider ${
                            user.userLevel === 'Superadmin'
                              ? 'bg-amber-500/15 text-amber-700 border border-amber-500/30'
                              : user.userLevel === 'Manager'
                              ? 'bg-indigo-500/15 text-indigo-700 border border-indigo-500/30'
                              : 'bg-sky-500/15 text-sky-700 border border-sky-500/30'
                          }`}
                        >
                          {user.userLevel === 'Superadmin' ? (
                            <ShieldCheck className="w-3 h-3 text-amber-600" />
                          ) : user.userLevel === 'Manager' ? (
                            <CheckCircle2 className="w-3 h-3 text-indigo-600" />
                          ) : (
                            <Briefcase className="w-3 h-3 text-sky-600" />
                          )}
                          <span>Level: {user.userLevel}</span>
                        </span>

                        <span className="px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 text-[11px] font-bold border border-slate-200">
                          {user.jobTitle}
                        </span>

                        {isCurrentLoggedIn && (
                          <span className="px-1.5 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 text-emerald-800 border border-emerald-300">
                            Anda
                          </span>
                        )}
                      </div>

                      {/* Status Badge */}
                      <button
                        type="button"
                        onClick={() => handleToggleStatus(user)}
                        title="Klik untuk mengubah status aktif/nonaktif"
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          user.status === 'Aktif'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                            : 'bg-rose-50 text-rose-700 border border-rose-200 hover:bg-rose-100'
                        }`}
                      >
                        <span
                          className={`w-1.5 h-1.5 rounded-full ${
                            user.status === 'Aktif' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                          }`}
                        ></span>
                        <span>{user.status}</span>
                      </button>
                    </div>

                    {/* User Identity Info */}
                    <div>
                      <h3 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
                        <span>{user.fullName}</span>
                      </h3>
                      <div className="flex items-center gap-3 text-xs text-slate-500 mt-1">
                        <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-slate-700 font-bold text-[11px]">
                          @{user.username}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          Didaftarkan: {new Date(user.createdAt).toLocaleDateString('id-ID')}
                        </span>
                      </div>
                    </div>

                    {/* Kredensial Login Box (Superadmin View) */}
                    <div className="p-2.5 rounded-xl bg-slate-900 text-slate-200 border border-slate-800 text-xs space-y-1.5">
                      <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-wider text-slate-400">
                        <span className="flex items-center gap-1">
                          <KeyRound className="w-3 h-3 text-amber-400" />
                          <span>Kredensial Login Sistem</span>
                        </span>
                        <button
                          type="button"
                          onClick={() =>
                            copyToClipboard(
                              `Username: ${user.username}\nPassword: ${user.password}`,
                              user.id,
                              'Kredensial Akun'
                            )
                          }
                          className="text-amber-400 hover:underline text-[10px] flex items-center gap-1 cursor-pointer font-bold"
                        >
                          {copiedId === user.id ? <Check className="w-2.5 h-2.5" /> : <Copy className="w-2.5 h-2.5" />}
                          <span>Salin</span>
                        </button>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div>
                          <span className="text-slate-400 text-[10px]">User:</span>{' '}
                          <strong className="text-white font-mono">{user.username}</strong>
                        </div>
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-slate-400 text-[10px]">Pass:</span>{' '}
                            <strong className="text-amber-300 font-mono">
                              {isPwdVisible ? user.password : '••••••••'}
                            </strong>
                          </div>
                          <button
                            type="button"
                            onClick={() => togglePasswordVisibility(user.id)}
                            className="text-slate-400 hover:text-slate-200 p-0.5 cursor-pointer"
                            title={isPwdVisible ? 'Sembunyikan password' : 'Lihat password'}
                          >
                            {isPwdVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Contact Info: No WA Aktif & Email */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                      {/* WhatsApp */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-[9px] uppercase font-bold text-slate-400">No WA Aktif</div>
                            <div className="font-mono font-bold text-slate-800 text-[11px] truncate">
                              {user.whatsappNumber}
                            </div>
                          </div>
                        </div>
                        <a
                          href={`https://wa.me/${user.whatsappNumber.replace(/\D/g, '').replace(/^0/, '62')}`}
                          target="_blank"
                          rel="noreferrer"
                          className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                          title="Buka Chat WhatsApp"
                        >
                          <MessageSquare className="w-2.5 h-2.5" />
                          <span>WA</span>
                        </a>
                      </div>

                      {/* Email */}
                      <div className="flex items-center justify-between p-2 rounded-xl bg-slate-50 border border-slate-200 overflow-hidden">
                        <div className="flex items-center gap-1.5 overflow-hidden">
                          <Mail className="w-3.5 h-3.5 text-sky-600 shrink-0" />
                          <div className="truncate">
                            <div className="text-[9px] uppercase font-bold text-slate-400">Email Aktif</div>
                            <div className="font-medium text-slate-800 text-[11px] truncate" title={user.email}>
                              {user.email}
                            </div>
                          </div>
                        </div>
                        <a
                          href={`mailto:${user.email}`}
                          className="px-2 py-1 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-[10px] font-bold flex items-center gap-1 shrink-0 cursor-pointer shadow-xs"
                          title="Kirim Email"
                        >
                          <span>Kirim</span>
                        </a>
                      </div>
                    </div>

                    {/* Alamat Lengkap */}
                    <div className="text-xs text-slate-600 flex items-start gap-1.5 bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                      <span className="text-[11px] leading-relaxed line-clamp-2">{user.address}</span>
                    </div>

                    {/* Catatan Tambahan jika ada */}
                    {user.notes && (
                      <div className="text-[11px] text-slate-500 italic bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                        Catatan: {user.notes}
                      </div>
                    )}
                  </div>

                  {/* Card Bottom Actions */}
                  <div className="bg-slate-50 border-t border-slate-200 px-4 py-2.5 flex items-center justify-between gap-2">
                    <div className="text-[10px] text-slate-400">ID: {user.id.slice(-8)}</div>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => handleOpenEditModal(user)}
                        className="flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-lg text-xs border border-slate-300 transition cursor-pointer"
                        title="Ubah Data Pengguna"
                      >
                        <Edit3 className="w-3 h-3 text-amber-600" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleDeleteUser(user)}
                        disabled={isCurrentLoggedIn}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                        title={
                          isCurrentLoggedIn
                            ? 'Tidak dapat menghapus akun sendiri'
                            : 'Hapus Pengguna Permanen'
                        }
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* USER LIST: TABLE VIEW */
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-3.5">Pengguna</th>
                  <th className="py-3 px-3.5">Level & Jabatan</th>
                  <th className="py-3 px-3.5">Kredensial Login</th>
                  <th className="py-3 px-3.5">Kontak WA & Email</th>
                  <th className="py-3 px-3.5 text-center">Status Akun</th>
                  <th className="py-3 px-3.5 text-right">Aksi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-slate-400">
                      Tidak ada data pengguna ditemukan.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isSuper = user.userLevel === 'Superadmin';
                    const isCurrentLoggedIn = authUser?.username === user.username;
                    const isPwdVisible = visiblePasswords[user.id] || false;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Pengguna */}
                        <td className="py-3 px-3.5">
                          <div className="font-bold text-slate-900">{user.fullName}</div>
                          <div className="text-[11px] text-slate-500 font-mono">@{user.username}</div>
                          <div className="text-[10px] text-slate-400 line-clamp-1 max-w-xs">{user.address}</div>
                        </td>

                        {/* Level & Jabatan */}
                        <td className="py-3 px-3.5">
                          <div className="flex flex-col gap-1 items-start">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${
                                user.userLevel === 'Superadmin'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                  : user.userLevel === 'Manager'
                                  ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                                  : 'bg-sky-100 text-sky-800 border border-sky-300'
                              }`}
                            >
                              {user.userLevel}
                            </span>
                            <span className="text-[11px] font-semibold text-slate-700">{user.jobTitle}</span>
                          </div>
                        </td>

                        {/* Kredensial */}
                        <td className="py-3 px-3.5">
                          <div className="bg-slate-100 p-1.5 rounded-lg border border-slate-200 font-mono text-[11px] space-y-0.5 w-36">
                            <div className="text-slate-600 flex justify-between">
                              <span className="text-[9px] uppercase text-slate-400">User:</span>
                              <strong className="text-slate-800">{user.username}</strong>
                            </div>
                            <div className="text-slate-600 flex items-center justify-between">
                              <span className="text-[9px] uppercase text-slate-400">Pass:</span>
                              <span className="text-amber-700 font-bold">
                                {isPwdVisible ? user.password : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => togglePasswordVisibility(user.id)}
                                className="text-slate-400 hover:text-slate-700"
                              >
                                {isPwdVisible ? <EyeOff className="w-2.5 h-2.5" /> : <Eye className="w-2.5 h-2.5" />}
                              </button>
                            </div>
                          </div>
                        </td>

                        {/* Kontak WA & Email */}
                        <td className="py-3 px-3.5">
                          <div className="space-y-1">
                            <a
                              href={`https://wa.me/${user.whatsappNumber.replace(/\D/g, '').replace(/^0/, '62')}`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1 text-emerald-700 hover:underline font-mono font-bold text-[11px]"
                            >
                              <Phone className="w-3 h-3 text-emerald-600" />
                              <span>{user.whatsappNumber}</span>
                            </a>
                            <a
                              href={`mailto:${user.email}`}
                              className="flex items-center gap-1 text-sky-700 hover:underline text-[11px]"
                            >
                              <Mail className="w-3 h-3 text-sky-600" />
                              <span>{user.email}</span>
                            </a>
                          </div>
                        </td>

                        {/* Status */}
                        <td className="py-3 px-3.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleToggleStatus(user)}
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold cursor-pointer transition ${
                              user.status === 'Aktif'
                                ? 'bg-emerald-100 text-emerald-800 border border-emerald-300 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200'
                            }`}
                          >
                            {user.status}
                          </button>
                        </td>

                        {/* Aksi */}
                        <td className="py-3 px-3.5 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(user)}
                              className="p-1.5 text-slate-600 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Edit Data"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteUser(user)}
                              disabled={isCurrentLoggedIn}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer disabled:opacity-30"
                              title="Hapus"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL FORM: TAMBAH / EDIT USER (CRUD MODAL)                              */}
      {/* ========================================================================= */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/70 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl w-full max-w-xl my-6 overflow-hidden flex flex-col max-h-[90vh]">
            {/* Modal Header */}
            <div className="px-5 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <UserPlus className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-black text-white">
                    {editingUserId ? 'Edit Data Pengguna' : 'Tambah Pengguna Baru'}
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Input data identitas lengkap, jabatan, hak akses, dan kredensial login akun.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg text-lg cursor-pointer font-bold"
              >
                ✕
              </button>
            </div>

            {/* Modal Form Content */}
            <form onSubmit={handleSubmitForm} className="p-5 overflow-y-auto flex-1 space-y-4 text-xs">
              {/* Alert Notification */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 text-xs flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Otorisasi Pengguna:</strong> Data pengguna tersimpan di database dan akun dapat langsung digunakan untuk login sesuai hak aksesnya.
                </div>
              </div>

              {/* Quick Fill from Company Staff */}
              {companyStaff.length > 0 && !editingUserId && (
                <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <label className="text-[11px] font-black text-blue-900 uppercase tracking-wide flex items-center gap-1.5">
                      <Users className="w-3.5 h-3.5 text-blue-600" />
                      <span>Pilih dari Informasi Staff Perusahaan (Isi Otomatis):</span>
                    </label>
                    <span className="text-[10px] text-blue-600 font-semibold">{companyStaff.length} Staff Terdaftar</span>
                  </div>
                  <select
                    onChange={(e) => {
                      const selected = companyStaff.find((s) => s.id === e.target.value);
                      if (selected) {
                        handleSelectStaffToFill(selected);
                      }
                    }}
                    defaultValue=""
                    className="w-full px-3 py-2 bg-white border border-blue-300 rounded-lg text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="" disabled>-- Klik untuk memilih data staff perusahaan --</option>
                    {companyStaff.map((st) => (
                      <option key={st.id} value={st.id}>
                        {st.fullName} — {st.jobRole} ({st.employeeIdNumber})
                      </option>
                    ))}
                  </select>
                  <span className="text-[10px] text-blue-700 block">
                    Memilih staff akan otomatis mengisi Nama, Jabatan, Level Akses, No WA, dan Email.
                  </span>
                </div>
              )}

              {/* 1. NAMA LENGKAP */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nama Lengkap <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Ahmad Rizky Pratama, S.T."
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {formErrors.fullName && (
                  <div className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.fullName}</div>
                )}
              </div>

              {/* 2. ALAMAT */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Alamat Lengkap <span className="text-rose-500">*</span>
                </label>
                <textarea
                  required
                  rows={2}
                  placeholder="Contoh: Mess Karyawan Camp 1, Perkebunan Kampar, Riau"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                />
                {formErrors.address && (
                  <div className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.address}</div>
                )}
              </div>

              {/* DUA KOLOM: NO WA AKTIF & EMAIL AKTIF */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* 3. NO WA AKTIF */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>
                      No. WA Aktif <span className="text-rose-500">*</span>
                    </span>
                    <span className="text-[10px] text-emerald-600 font-bold">WhatsApp Resmi</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      placeholder="Contoh: 081276543210"
                      value={formData.whatsappNumber}
                      onChange={(e) => setFormData({ ...formData, whatsappNumber: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  {formErrors.whatsappNumber && (
                    <div className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.whatsappNumber}</div>
                  )}
                </div>

                {/* 4. EMAIL AKTIF */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email Aktif <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      placeholder="Contoh: nama@suryaland.co.id"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                    />
                  </div>
                  {formErrors.email && (
                    <div className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.email}</div>
                  )}
                </div>
              </div>

              {/* DUA KOLOM: JABATAN & LEVEL USER */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                {/* 5. JABATAN */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>
                      Jabatan <span className="text-rose-500">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewJobTitle(!isAddingNewJobTitle)}
                      className="text-[10px] text-amber-600 hover:underline font-bold cursor-pointer"
                    >
                      {isAddingNewJobTitle ? '✕ Tutup Tambah' : '+ Tambah Jabatan'}
                    </button>
                  </label>

                  {!isAddingNewJobTitle ? (
                    <select
                      value={formData.jobTitle}
                      onChange={(e) => {
                        if (e.target.value === '__ADD_NEW__') {
                          setIsAddingNewJobTitle(true);
                        } else {
                          setFormData({ ...formData, jobTitle: e.target.value });
                        }
                      }}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                    >
                      {jobTitles.map((title) => (
                        <option key={title} value={title}>
                          {title}
                        </option>
                      ))}
                      <option value="__ADD_NEW__" className="text-amber-700 font-black">
                        + Tambah Jabatan Baru...
                      </option>
                    </select>
                  ) : (
                    <div className="space-y-1.5">
                      <div className="flex gap-1.5">
                        <input
                          type="text"
                          placeholder="Ketik nama jabatan baru..."
                          value={customJobTitleInput}
                          onChange={(e) => setCustomJobTitleInput(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 bg-white border border-amber-400 rounded-lg text-xs font-medium text-slate-900 focus:outline-none"
                        />
                        <button
                          type="button"
                          onClick={handleSaveCustomJobTitle}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs cursor-pointer shrink-0"
                        >
                          Simpan
                        </button>
                      </div>
                      <div className="text-[10px] text-slate-500">Contoh: Site Manager, Asisten Afdeling, Mandor</div>
                    </div>
                  )}
                  {formErrors.jobTitle && (
                    <div className="text-[11px] text-rose-600 mt-1 font-medium">{formErrors.jobTitle}</div>
                  )}
                </div>

                {/* 6. LEVEL USER */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Level User <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.userLevel}
                    onChange={(e) => {
                      const newLvl = e.target.value as ManagedUserLevel;
                      setFormData((prev) => ({
                        ...prev,
                        userLevel: newLvl,
                        jobTitle: newLvl === 'Superadmin' && prev.jobTitle === 'Pengawas' ? 'Direktur' : newLvl === 'Manager' && prev.jobTitle === 'Pengawas' ? 'Manager Operasional' : prev.jobTitle,
                      }));
                    }}
                    className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Superadmin">👑 Superadmin (Akses Penuh Seluruh Sistem)</option>
                    <option value="Manager">🏢 Manager (Akses Approval, Rekap, Audit &amp; Logistik)</option>
                    <option value="Pengawas">🚜 Pengawas (Akses Form &amp; Operasional Lapangan)</option>
                  </select>
                </div>
              </div>

              {/* DUA KOLOM: USERNAME & PASSWORD */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3 bg-slate-900 text-white rounded-xl border border-slate-800">
                {/* 7. USERNAME */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1">
                    Username Login <span className="text-amber-400">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: ahmad_pengawas"
                    value={formData.username}
                    onChange={(e) => setFormData({ ...formData, username: e.target.value.replace(/\s+/g, '') })}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                  {formErrors.username && (
                    <div className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.username}</div>
                  )}
                </div>

                {/* 8. PASSWORD */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1 flex items-center justify-between">
                    <span>
                      Password <span className="text-amber-400">*</span>
                    </span>
                    <button
                      type="button"
                      onClick={handleGeneratePassword}
                      className="text-[10px] text-amber-400 hover:underline flex items-center gap-1 cursor-pointer font-bold"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Generate</span>
                    </button>
                  </label>
                  <div className="relative">
                    <input
                      type={showModalPassword ? 'text' : 'password'}
                      required
                      placeholder="Password pengguna..."
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="w-full pl-3 pr-9 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowModalPassword(!showModalPassword)}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showModalPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                  {formErrors.password && (
                    <div className="text-[11px] text-rose-400 mt-1 font-medium">{formErrors.password}</div>
                  )}
                </div>
              </div>

              {/* STATUS USER & CATATAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status Akun
                  </label>
                  <select
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value as 'Aktif' | 'Nonaktif' })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Dapat Login & Mengisi Data)</option>
                    <option value="Nonaktif">Nonaktif (Akses Sementara Ditangguhkan)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Catatan Tambahan (Opsional)
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Koordinator Alat Berat Wilayah Kampar"
                    value={formData.notes}
                    onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* Modal Footer Buttons */}
              <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-xl text-xs shadow-md shadow-amber-500/20 transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingUserId ? 'Simpan Perubahan User' : 'Daftarkan Pengguna'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
