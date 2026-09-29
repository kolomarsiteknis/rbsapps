import React, { useState, useRef, useEffect, useMemo } from 'react';
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
  PenTool, 
  Eye, 
  EyeOff,
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  Globe, 
  Sparkles, 
  RefreshCw, 
  KeyRound, 
  X,
  Search, 
  Check,
  HardHat,
  Briefcase,
  Lock,
  Copy,
  Grid,
  List,
  Filter,
  Layers,
  UserCheck,
  FileCheck,
  ShieldCheck,
  Database
} from 'lucide-react';
import { 
  CompanyProfile, 
  CompanyStaff, 
  AuthUser, 
  Worker, 
  Client, 
  Block, 
  ManagedUser, 
  ManagedUserLevel 
} from '../types';
import { storageService } from '../services/storageService';
import { deduplicateStaffList, deduplicateUsersList } from '../services/firestoreSync';
import { createSimulatedSignatureSvg, createDefaultCompanyLogoSvg, compressSignatureDataUrl } from '../data/mockData';
import { recordUserActivity } from '../utils/activityLogger';

interface CompanyMasterDataViewProps {
  companyProfile: CompanyProfile;
  onUpdateCompanyProfile: (profile: CompanyProfile) => void;
  authUser: AuthUser | null;
  showToast: (message: string, type?: 'success' | 'warning' | 'error' | 'info') => void;
  clients: Client[];
  initialSubTab?: 'identity' | 'staff' | 'workers';
}

export const CompanyMasterDataView: React.FC<CompanyMasterDataViewProps> = ({
  companyProfile,
  onUpdateCompanyProfile,
  authUser,
  showToast,
  clients,
  initialSubTab = 'identity',
}) => {
  // Strict Security Check: ONLY Direktur / Superadmin can access Master Data Perusahaan
  const isDirector = authUser?.role === 'director' || authUser?.userLevel === 'Superadmin';

  // Active Sub-Tab (1. Identitas & Logo, 2. Staff, TTD Digital & Kredensial User, 3. Personil Tim pendukung)
  const [activeSubTab, setActiveSubTab] = useState<'identity' | 'staff' | 'workers'>(initialSubTab);

  // Synchronize sub-tab when initialSubTab changes from parent
  useEffect(() => {
    if (initialSubTab) {
      setActiveSubTab(initialSubTab);
    }
  }, [initialSubTab]);

  // =========================================================================
  // 1. IDENTITAS PERUSAHAAN & LOGO APPS STATE
  // =========================================================================
  const [profileForm, setProfileForm] = useState<CompanyProfile>(companyProfile);
  const [isSavingProfile, setIsSavingProfile] = useState(false);

  useEffect(() => {
    setProfileForm(companyProfile);
  }, [companyProfile]);

  const handleProfileChange = (field: keyof CompanyProfile, value: string) => {
    setProfileForm((prev) => {
      const next: CompanyProfile = {
        ...prev,
        [field]: value,
      };
      if (field === 'address' || field === 'headOfficeAddress') {
        next.address = value;
        next.headOfficeAddress = value;
      }
      if (field === 'bankAccount' || field === 'bankAccountInfo') {
        next.bankAccount = value;
        next.bankAccountInfo = value;
      }
      return next;
    });
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showToast('File harus berupa gambar (PNG, JPG, SVG, WebP)', 'error');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (!result) return;

      // Resize / compress via canvas to avoid giant storage payload
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
          showToast('Logo berhasil dimuat! Klik "Simpan Perubahan Identitas Perusahaan" untuk menerapkan ke seluruh sistem.', 'success');
        }
      };
      img.src = result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleResetToDefaultLogo = () => {
    const defaultSvg = createDefaultCompanyLogoSvg(
      profileForm.shortName || 'RBS',
      profileForm.officialName || 'PT. RBS GROUP'
    );
    setProfileForm((prev) => ({
      ...prev,
      logoUrl: defaultSvg,
    }));
    showToast('Logo direset ke format vektor resmi perusahaan.', 'info');
  };

  const handleSaveCompanyProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileForm.shortName.trim()) {
      showToast('Nama Singkat Perusahaan (Nama Apps) wajib diisi.', 'error');
      return;
    }
    if (!profileForm.officialName.trim()) {
      showToast('Nama Resmi Perusahaan wajib diisi.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const resolvedAddress = profileForm.address ?? profileForm.headOfficeAddress ?? '';
      const resolvedBank = profileForm.bankAccount ?? profileForm.bankAccountInfo ?? '';
      const payload: CompanyProfile = {
        ...profileForm,
        shortName: profileForm.shortName.trim().toUpperCase(),
        officialName: profileForm.officialName.trim(),
        address: resolvedAddress,
        headOfficeAddress: resolvedAddress,
        bankAccount: resolvedBank,
        bankAccountInfo: resolvedBank,
        updatedAt: new Date().toISOString(),
      };

      storageService.saveCompanyProfile(payload);
      onUpdateCompanyProfile(payload);

      recordUserActivity({
        userId: authUser?.id,
        userName: authUser?.displayName || 'Direktur',
        userRole: 'director',
        actionCategory: 'MASTER_DATA',
        actionTitle: `Update Identitas Perusahaan: ${payload.shortName}`,
        actionDescription: `Memperbarui identitas perusahaan ${payload.officialName} dan logo resmi aplikasi.`,
        targetEntity: payload.shortName,
      });

      showToast(`Identitas resmi dan logo ${payload.shortName} berhasil disimpan & disinkronkan!`, 'success');
    } catch {
      showToast('Gagal menyimpan profil identitas perusahaan.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // =========================================================================
  // 2. DAFTAR STAFF, KREDENSIAL LOGIN AKUN & TTD DIGITAL RESMI (UNIFIED CRUD)
  // =========================================================================
  const [staffList, setStaffList] = useState<CompanyStaff[]>(() => storageService.getCompanyStaff());
  const [managedUsers, setManagedUsers] = useState<ManagedUser[]>(() => storageService.getManagedUsers());
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [staffFilterLevel, setStaffFilterLevel] = useState<string>('ALL');
  const [staffFilterStatus, setStaffFilterStatus] = useState<string>('ALL');
  const [staffViewMode, setStaffViewMode] = useState<'grid' | 'table'>('grid');
  const [visiblePasswords, setVisiblePasswords] = useState<{ [staffId: string]: boolean }>({});
  const [copiedStaffId, setCopiedStaffId] = useState<string | null>(null);
  const [staffToDelete, setStaffToDelete] = useState<CompanyStaff | null>(null);
  const [workerToDelete, setWorkerToDelete] = useState<Worker | null>(null);

  // Unified Single Modal State
  const [isStaffModalOpen, setIsStaffModalOpen] = useState(false);
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [showModalPassword, setShowModalPassword] = useState(false);

  const [staffFormData, setStaffFormData] = useState<{
    fullName: string;
    jobRole: string;
    employeeIdNumber: string;
    email: string;
    phone: string;
    address: string;
    signatureUrl: string;
    status: 'Aktif' | 'Nonaktif';
    notes: string;
    username: string;
    password: string;
    userLevel: ManagedUserLevel;
    assignedClientId: string;
    assignedClientName: string;
    assignedBlockCodes: string[];
    createdAt?: string;
  }>({
    fullName: '',
    jobRole: 'Pengawas Lapangan',
    employeeIdNumber: '',
    email: '',
    phone: '',
    address: '',
    signatureUrl: '',
    status: 'Aktif',
    notes: '',
    username: '',
    password: '',
    userLevel: 'Pengawas',
    assignedClientId: 'all',
    assignedClientName: 'Semua Proyek',
    assignedBlockCodes: [],
  });

  const [sigMode, setSigMode] = useState<'upload' | 'draw' | 'preset'>('preset');
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawnOnCanvas, setHasDrawnOnCanvas] = useState(false);
  const [isAuditingDuplicates, setIsAuditingDuplicates] = useState(false);

  // Strictly deduplicated staff list guaranteeing 100% active status and 0 duplicates
  const cleanStaffList = useMemo(() => {
    const dedup = deduplicateStaffList(staffList);
    return dedup.cleanList.map((s) => ({ ...s, status: 'Aktif' as const }));
  }, [staffList]);

  const reloadStaffAndUsers = () => {
    setStaffList(storageService.getCompanyStaff());
    setManagedUsers(storageService.getManagedUsers());
  };

  const handleAuditAndDeduplicateAll = async () => {
    setIsAuditingDuplicates(true);
    try {
      const res = await storageService.deduplicateAllDatabase();
      reloadStaffAndUsers();
      setWorkers(storageService.getWorkers());
      showToast(
        `Audit & pembersihan selesai! ${res.totalRemoved} duplikat lokal & ${res.cloudPurgedCount} duplikat cloud dibersihkan. Semua akun staff 100% Aktif & bisa login dimanapun!`,
        'success'
      );
    } catch {
      showToast('Gagal menjalankan audit & pembersihan database.', 'error');
    } finally {
      setIsAuditingDuplicates(false);
    }
  };

  useEffect(() => {
    const handleSync = () => {
      setStaffList(storageService.getCompanyStaff());
      setManagedUsers(storageService.getManagedUsers());
      setWorkers(storageService.getWorkers());
    };
    window.addEventListener('suryaland_company_staff_sync', handleSync);
    window.addEventListener('suryaland_workers_sync', handleSync);
    window.addEventListener('suryaland_firestore_sync', handleSync);
    return () => {
      window.removeEventListener('suryaland_company_staff_sync', handleSync);
      window.removeEventListener('suryaland_workers_sync', handleSync);
      window.removeEventListener('suryaland_firestore_sync', handleSync);
    };
  }, []);

  const resolveStaffUserLevel = (staff: CompanyStaff): ManagedUserLevel => {
    const jobLower = (staff.jobRole || '').toLowerCase();
    if (staff.userLevel === 'Superadmin' || staff.staffLevel === 'Direktur' || jobLower.includes('direktur')) {
      return 'Superadmin';
    }
    if (
      staff.userLevel === 'Site Manager' ||
      staff.userLevel === 'Manager' ||
      staff.staffLevel === 'Site Manager' ||
      staff.staffLevel === 'Manager' ||
      jobLower.includes('site manager') ||
      jobLower.includes('manager')
    ) {
      return 'Site Manager';
    }
    if (staff.userLevel === 'Klien' || staff.staffLevel === 'Klien' || jobLower.includes('klien')) {
      return 'Klien';
    }
    return 'Pengawas';
  };

  // Canvas drawing handlers for signature (scaled accurately for responsive canvas)
  const getCanvasPoint = (
    canvas: HTMLCanvasElement,
    e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>
  ) => {
    const rect = canvas.getBoundingClientRect();
    const scaleX = rect.width > 0 ? canvas.width / rect.width : 1;
    const scaleY = rect.height > 0 ? canvas.height / rect.height : 1;
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    setIsDrawing(true);
    setHasDrawnOnCanvas(true);
    const { x, y } = getCanvasPoint(canvas, e);

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

    const { x, y } = getCanvasPoint(canvas, e);
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
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
    setHasDrawnOnCanvas(false);
    setStaffFormData((prev) => ({ ...prev, signatureUrl: '' }));
  };

  const handleApplyPresetSignature = () => {
    if (!staffFormData.fullName) {
      showToast('Masukkan Nama Lengkap terlebih dahulu untuk membuat TTD otomatis.', 'warning');
      return;
    }
    const sigSvg = createSimulatedSignatureSvg(staffFormData.fullName, staffFormData.jobRole || 'Staff');
    setStaffFormData((prev) => ({ ...prev, signatureUrl: sigSvg }));
    showToast('Tanda tangan digital kaligrafi resmi berhasil digenerate.', 'success');
  };

  const generateRandomPassword = () => {
    const prefixes = ['Surya', 'Lahan', 'Sawit', 'Mandor', 'Proyek', 'Prima', 'Gambut'];
    const pfx = prefixes[Math.floor(Math.random() * prefixes.length)];
    const num = Math.floor(100 + Math.random() * 900);
    const generated = `${pfx}@${num}`;
    setStaffFormData((prev) => ({ ...prev, password: generated }));
    setShowModalPassword(true);
    showToast(`Password baru di-generate: ${generated}`, 'info');
  };

  const handleOpenAddStaff = () => {
    setEditingStaffId(null);
    setShowModalPassword(false);
    setHasDrawnOnCanvas(false);
    setSigMode('preset');
    const defaultEmpId = `EMP-${Date.now().toString().slice(-4)}`;
    setStaffFormData({
      fullName: '',
      jobRole: 'Pengawas Lapangan',
      employeeIdNumber: defaultEmpId,
      email: '',
      phone: '',
      address: '',
      signatureUrl: '',
      status: 'Aktif',
      notes: '',
      username: '',
      password: `user@${Date.now().toString().slice(-4)}`,
      userLevel: 'Pengawas',
      assignedClientId: 'all',
      assignedClientName: 'Semua Proyek',
      assignedBlockCodes: ['Akses Semua Blok'],
    });
    setIsStaffModalOpen(true);
  };

  const handleOpenEditStaff = (staff: CompanyStaff) => {
    setEditingStaffId(staff.id);
    setShowModalPassword(false);
    setHasDrawnOnCanvas(false);
    setSigMode('preset');

    const staffUserLower = (staff.username || '').trim().toLowerCase();
    const staffNameLower = (staff.fullName || '').trim().toLowerCase();
    const matchedUser = managedUsers.find(
      (u) => (staff.linkedUserId && u.id === staff.linkedUserId) ||
             (staffUserLower && u.username && u.username.trim().toLowerCase() === staffUserLower) ||
             (staffNameLower && u.fullName && u.fullName.trim().toLowerCase() === staffNameLower)
    );

    const resolvedLevel = resolveStaffUserLevel(staff);

    setStaffFormData({
      fullName: staff.fullName || '',
      jobRole: staff.jobRole || '',
      employeeIdNumber: staff.employeeIdNumber || matchedUser?.employeeIdNumber || `EMP-${Date.now().toString().slice(-4)}`,
      email: staff.email || matchedUser?.email || '',
      phone: staff.phone || matchedUser?.whatsappNumber || '',
      address: staff.address || matchedUser?.address || '',
      signatureUrl: staff.signatureUrl || matchedUser?.signatureUrl || '',
      status: staff.status || matchedUser?.status || 'Aktif',
      notes: staff.notes || matchedUser?.notes || '',
      username: staff.username || matchedUser?.username || '',
      password: staff.password || matchedUser?.password || '',
      userLevel: resolvedLevel,
      assignedClientId: staff.assignedClientId || matchedUser?.assignedClientId || 'all',
      assignedClientName: staff.assignedClientName || matchedUser?.assignedClientName || 'Semua Proyek',
      assignedBlockCodes: staff.assignedBlockCodes || matchedUser?.assignedBlockCodes || [],
      createdAt: staff.createdAt || matchedUser?.createdAt,
    });
    setIsStaffModalOpen(true);
  };

  const handleToggleStaffStatus = (staff: CompanyStaff) => {
    const nextStatus: 'Aktif' | 'Nonaktif' = staff.status === 'Aktif' ? 'Nonaktif' : 'Aktif';
    const updated: CompanyStaff = {
      ...staff,
      status: nextStatus,
      updatedAt: new Date().toISOString(),
    };
    storageService.saveCompanyStaff(updated);
    reloadStaffAndUsers();
    showToast(`Status akun ${staff.fullName} (@${staff.username}) diubah menjadi ${nextStatus}.`, 'info');
  };

  const handleSaveStaff = (e: React.FormEvent) => {
    e.preventDefault();
    if (!staffFormData.fullName?.trim()) {
      showToast('Nama Lengkap Staff wajib diisi.', 'warning');
      return;
    }
    if (!staffFormData.jobRole?.trim()) {
      showToast('Jabatan Resmi Staff wajib diisi.', 'warning');
      return;
    }
    if (!staffFormData.username?.trim()) {
      showToast('Username login akun wajib diisi.', 'warning');
      return;
    }
    if (!staffFormData.password?.trim()) {
      showToast('Password login akun wajib diisi.', 'warning');
      return;
    }

    const cleanUsername = (staffFormData.username || '').trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
    if (!cleanUsername) {
      showToast('Username harus berupa huruf atau angka valid.', 'error');
      return;
    }

    const cleanNik = (staffFormData.employeeIdNumber || '').trim().toLowerCase();
    const formFullNameLower = (staffFormData.fullName || '').trim().toLowerCase();

    // Check if staff already exists by editingStaffId, or by matching username, employeeIdNumber, or fullName
    const matchedExistingStaff = cleanStaffList.find(
      (s) =>
        (editingStaffId && s.id === editingStaffId) ||
        (cleanUsername && (s.username || '').trim().replace(/^@+/, '').toLowerCase() === cleanUsername) ||
        (cleanNik && s.employeeIdNumber && s.employeeIdNumber.trim().toLowerCase() === cleanNik) ||
        (formFullNameLower && (s.fullName || '').trim().toLowerCase() === formFullNameLower)
    );

    const staffId = editingStaffId || matchedExistingStaff?.id || `staff-${Date.now()}`;
    const existingStaff = matchedExistingStaff || (editingStaffId ? staffList.find((s) => s.id === editingStaffId) : undefined);
    const prevNameLower = (existingStaff?.fullName || '').trim().toLowerCase();
    const prevUserLower = (existingStaff?.username || '').trim().toLowerCase();

    const matchedExistingUser = editingStaffId || matchedExistingStaff
      ? managedUsers.find(
          (u) =>
            (existingStaff?.linkedUserId && u.id === existingStaff.linkedUserId) ||
            u.id === staffId.replace(/^staff-from-/, '') ||
            u.id === `user-usr-${staffId.replace(/^staff-/, '')}` ||
            (prevUserLower && u.username && u.username.trim().toLowerCase() === prevUserLower) ||
            (prevNameLower && u.fullName && u.fullName.trim().toLowerCase() === prevNameLower) ||
            (formFullNameLower && u.fullName && u.fullName.trim().toLowerCase() === formFullNameLower)
        )
      : undefined;

    const linkedUserId = matchedExistingUser?.id || existingStaff?.linkedUserId || `user-usr-${staffId.replace(/^staff-/, '')}`;

    // Duplicate username check (ignore current user being edited)
    const duplicateUser = managedUsers.find(
      (u) =>
        u.username &&
        u.username.trim().toLowerCase() === cleanUsername &&
        u.id !== linkedUserId &&
        (!prevUserLower || u.username.trim().toLowerCase() !== prevUserLower)
    );
    if (duplicateUser) {
      showToast(`Username "${cleanUsername}" sudah digunakan oleh ${duplicateUser.fullName}. Silakan buat username lain.`, 'error');
      return;
    }

    const isSuper = staffFormData.userLevel === 'Superadmin';
    const isSiteMgr = staffFormData.userLevel === 'Site Manager';
    const selectedClient = clients.find((c) => c.id === staffFormData.assignedClientId);
    const assignedClientName = isSuper 
      ? 'Semua Proyek (Owner)' 
      : isSiteMgr 
      ? 'Semua Proyek (Site Manager Operasional)' 
      : (selectedClient ? `${selectedClient.contractNumber ? `${selectedClient.contractNumber} - ` : ''}${selectedClient.name}` : 'Semua Proyek');

    const signatureFinal = staffFormData.signatureUrl || createSimulatedSignatureSvg(staffFormData.fullName, staffFormData.jobRole);

    const payload: CompanyStaff = {
      id: staffId,
      fullName: staffFormData.fullName.trim(),
      jobRole: staffFormData.jobRole.trim(),
      staffLevel: staffFormData.userLevel,
      employeeIdNumber: staffFormData.employeeIdNumber?.trim() || `EMP-${Date.now().toString().slice(-4)}`,
      email: staffFormData.email?.trim() || '',
      phone: staffFormData.phone?.trim() || '',
      address: staffFormData.address?.trim() || '',
      signatureUrl: signatureFinal,
      status: staffFormData.status,
      notes: staffFormData.notes?.trim() || '',
      linkedUserId,
      username: cleanUsername,
      password: staffFormData.password,
      userLevel: staffFormData.userLevel,
      assignedClientId: (isSuper || isSiteMgr) ? 'all' : staffFormData.assignedClientId,
      assignedClientName,
      assignedBlockCodes: (isSuper || isSiteMgr) ? ['Akses Semua Blok (Tanpa Batas)'] : staffFormData.assignedBlockCodes,
      createdAt: staffFormData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    storageService.saveCompanyStaff(payload);
    reloadStaffAndUsers();
    setIsStaffModalOpen(false);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Direktur',
      userRole: 'director',
      actionCategory: 'USER_MANAGEMENT',
      actionTitle: `${editingStaffId ? 'Update' : 'Tambah'} Staff & Akun: ${payload.fullName}`,
      actionDescription: `${editingStaffId ? 'Memperbarui' : 'Menambahkan'} staff ${payload.fullName} (${payload.jobRole}) dengan hak akses ${payload.userLevel}, username @${payload.username}, dan spesimen TTD digital.`,
      targetEntity: payload.fullName,
    });

    showToast(`Staff & Akun ${payload.fullName} (@${payload.username}) berhasil disimpan!`, 'success');
  };

  const handleDeleteStaffClick = (staff: CompanyStaff) => {
    // Buka modal konfirmasi hapus staff (tanpa window.confirm yang diblokir di iframe)
    setStaffToDelete(staff);
  };

  const executeDeleteStaff = () => {
    if (!staffToDelete) return;
    const target = staffToDelete;

    storageService.deleteStaff(target.id, authUser);

    setStaffList((prev) => prev.filter((s) => s.id !== target.id));
    reloadStaffAndUsers();
    setStaffToDelete(null);
    if (editingStaffId === target.id) {
      setIsStaffModalOpen(false);
      setEditingStaffId(null);
    }

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Direktur',
      userRole: 'director',
      actionCategory: 'USER_MANAGEMENT',
      actionTitle: `Hapus Staff & Akun: ${target.fullName}`,
      actionDescription: `Menghapus data staff ${target.fullName} (@${target.username || target.jobRole}) beserta kredensial login & spesimen TTD.`,
      targetEntity: target.fullName,
    });

    showToast(`Data staff & akun ${target.fullName} (@${target.username || target.jobRole}) berhasil dihapus!`, 'success');
  };

  const handleCopyStaffCredentials = async (staff: CompanyStaff) => {
    const textToCopy = `*KREDENSIAL AKSES APLIKASI LAND CLEARING*\n` +
      `Perusahaan: ${companyProfile.officialName} (${companyProfile.shortName})\n\n` +
      `👤 Nama Lengkap: ${staff.fullName}\n` +
      `💳 NIK / NIP: ${staff.employeeIdNumber || '-'}\n` +
      `💼 Jabatan: ${staff.jobRole}\n` +
      `🛡️ Level Hak Akses: ${resolveStaffUserLevel(staff)}\n` +
      `🔑 Username Login: ${staff.username || '-'}\n` +
      `🔒 Password: ${staff.password || '-'}\n` +
      `📍 Penempatan Proyek: ${staff.assignedClientName || 'Semua Proyek'}\n` +
      `✍️ Status TTD Digital: ${staff.signatureUrl ? 'Terdaftar Resmi' : 'Belum Ada'}\n\n` +
      `Gunakan username dan password di atas untuk masuk ke sistem aplikasi ${companyProfile.shortName} APPS.`;

    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(textToCopy);
      } else {
        throw new Error('Clipboard API unavailable');
      }
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = textToCopy;
      textarea.style.position = 'fixed';
      textarea.style.opacity = '0';
      document.body.appendChild(textarea);
      textarea.select();
      try {
        document.execCommand('copy');
      } catch {}
      document.body.removeChild(textarea);
    }

    setCopiedStaffId(staff.id);
    showToast(`Kredensial akun ${staff.fullName} (@${staff.username}) berhasil disalin ke clipboard!`, 'success');
    setTimeout(() => setCopiedStaffId(null), 3000);
  };

  // =========================================================================
  // 3. PERSONIL TIM PENDUKUNG STATE (Operator, Mekanik, Logistik, Pendukung)
  // =========================================================================
  const [workers, setWorkers] = useState<Worker[]>(() => storageService.getWorkers());
  const [workerSearchQuery, setWorkerSearchQuery] = useState('');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('ALL');
  const [selectedClientFilter, setSelectedClientFilter] = useState('ALL');
  const [isClearWorkersModalOpen, setIsClearWorkersModalOpen] = useState(false);

  const executeClearWorkers = () => {
    storageService.clearWorkers();
    setWorkers([]);
    setIsClearWorkersModalOpen(false);
    showToast('Seluruh data Personil Tim Pendukung telah berhasil dikosongkan. Siap untuk pengisian data riil.', 'info');
  };

  const DEFAULT_WORKER_CATEGORIES = ['Operator', 'Mekanik', 'Logistik', 'Pendukung'];
  const [customWorkerCategories, setCustomWorkerCategories] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('SL_CUSTOM_WORKER_CATEGORIES');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [isAddingNewCategory, setIsAddingNewCategory] = useState(false);
  const [newCategoryInput, setNewCategoryInput] = useState('');

  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState<Partial<Worker>>({
    name: '',
    category: 'Operator',
    phone: '',
    status: 'Hadir',
    assignedClientId: 'ALL',
    assignedBlockId: 'ALL',
  });

  const reloadWorkers = () => {
    setWorkers(storageService.getWorkers());
  };

  const handleAddCategory = () => {
    const trimmed = newCategoryInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...customWorkerCategories, trimmed]));
    setCustomWorkerCategories(updated);
    try {
      localStorage.setItem('SL_CUSTOM_WORKER_CATEGORIES', JSON.stringify(updated));
    } catch {}
    setWorkerForm((prev) => ({ ...prev, category: trimmed }));
    setIsAddingNewCategory(false);
    setNewCategoryInput('');
    showToast(`Kategori "${trimmed}" berhasil ditambahkan!`, 'success');
  };

  const handleOpenAddWorker = () => {
    setEditingWorkerId(null);
    setWorkerForm({
      name: '',
      category: 'Operator',
      phone: '',
      status: 'Hadir',
      assignedClientId: 'ALL',
      assignedBlockId: 'ALL',
    });
    setIsAddingNewCategory(false);
    setIsWorkerModalOpen(true);
  };

  const handleOpenEditWorker = (w: Worker) => {
    setEditingWorkerId(w.id);
    setWorkerForm({
      name: w.name,
      category: w.category || 'Operator',
      phone: w.phone || '',
      status: w.status || 'Hadir',
      assignedClientId: w.assignedClientId || 'ALL',
      assignedBlockId: w.assignedBlockId || 'ALL',
    });
    setIsAddingNewCategory(false);
    setIsWorkerModalOpen(true);
  };

  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.name?.trim()) {
      showToast('Nama Lengkap Personil wajib diisi.', 'error');
      return;
    }

    const workerId = editingWorkerId || `w-${Date.now()}`;
    const chosenCategory = workerForm.category || 'Operator';
    const newWorker: Worker = {
      id: workerId,
      name: workerForm.name.trim(),
      category: chosenCategory,
      role: chosenCategory,
      phone: workerForm.phone || '-',
      status: (workerForm.status as any) || 'Hadir',
      teamName: `Tim ${chosenCategory}`,
      assignedClientId: workerForm.assignedClientId || 'ALL',
      assignedBlockId: workerForm.assignedBlockId || 'ALL',
    };

    storageService.saveWorker(newWorker);
    reloadWorkers();
    setIsWorkerModalOpen(false);
    setEditingWorkerId(null);
    setIsAddingNewCategory(false);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Direktur',
      userRole: 'director',
      actionCategory: 'MASTER_DATA',
      actionTitle: `${editingWorkerId ? 'Update' : 'Tambah'} Personil: ${newWorker.name}`,
      actionDescription: `${editingWorkerId ? 'Memperbarui' : 'Menambahkan'} personil ${newWorker.name} (${newWorker.category})`,
      targetEntity: newWorker.name,
    });

    showToast(`Personil ${newWorker.name} (${newWorker.category}) berhasil disimpan!`, 'success');
  };

  const handleDeleteWorkerClick = (w: Worker) => {
    setWorkerToDelete(w);
  };

  const executeDeleteWorker = () => {
    if (!workerToDelete) return;
    const target = workerToDelete;
    storageService.deleteWorker(target.id);
    reloadWorkers();
    setWorkerToDelete(null);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Direktur',
      userRole: 'director',
      actionCategory: 'MASTER_DATA',
      actionTitle: `Hapus Personil: ${target.name}`,
      actionDescription: `Menghapus data personil ${target.name} (${target.category}) dari Tim Pendukung.`,
      targetEntity: target.name,
    });

    showToast(`Personil ${target.name} telah dihapus.`, 'info');
  };

  // Filtered workers list
  const filteredWorkers = useMemo(() => {
    const q = (workerSearchQuery || '').toLowerCase();
    return workers.filter((w) => {
      const matchSearch = (w.name && w.name.toLowerCase().includes(q)) ||
        (w.phone && w.phone.includes(workerSearchQuery)) ||
        (w.category && w.category.toLowerCase().includes(q));
      const matchCat = selectedCategoryFilter === 'ALL' || w.category === selectedCategoryFilter;
      const matchClient = selectedClientFilter === 'ALL' || w.assignedClientId === selectedClientFilter;
      return matchSearch && matchCat && matchClient;
    });
  }, [workers, workerSearchQuery, selectedCategoryFilter, selectedClientFilter]);

  // Guard: Access Denied for non-director
  if (!isDirector) {
    return (
      <div className="max-w-xl mx-auto my-16 p-8 bg-white rounded-3xl border border-rose-200 text-center space-y-4 shadow-xl">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 mx-auto">
          <ShieldAlert className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-slate-900">Akses Ditolak: Khusus Direktur</h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          Modul Master Data Perusahaan memiliki tingkat kerahasiaan tinggi dan hanya dapat diakses oleh akun Direktur Utama (Superadmin).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-6 space-y-6">
      
      {/* TOP BANNER & MAIN SUB-TABS NAVIGATION */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-slate-950 border-2 border-amber-500/50 p-1.5 shadow-2xl flex items-center justify-center shrink-0 overflow-hidden">
              {profileForm.logoUrl ? (
                <img 
                  src={profileForm.logoUrl} 
                  alt={profileForm.shortName} 
                  className="w-full h-full object-contain"
                />
              ) : (
                <span className="text-3xl">🏢</span>
              )}
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Master Data Perusahaan
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">•</span>
                <span className="text-xs text-slate-400 hidden sm:inline">Pengaturan Internal & Personil</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight mt-1">
                Master Data Perusahaan & Personil
              </h1>
              <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                Kelola identitas resmi & logo apps, database staff pengesahan tanda tangan digital (TTD) terpadu manajemen kredensial user, serta personil tim pendukung lapangan.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3 text-xs shrink-0">
            <div className="text-center px-2">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Staff Resmi</span>
              <span className="font-black text-amber-400 text-sm">{staffList.length} Orang</span>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="text-center px-2">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">User Login</span>
              <span className="font-black text-sky-400 text-sm">{managedUsers.length} Akun</span>
            </div>
            <div className="h-6 w-px bg-slate-700"></div>
            <div className="text-center px-2">
              <span className="block text-slate-400 text-[10px] uppercase font-bold">Tim Pendukung</span>
              <span className="font-black text-emerald-400 text-sm">{workers.length} Orang</span>
            </div>
          </div>
        </div>

        {/* 3 SUB-TAB BUTTONS STRICTLY ORDERED AS USER REQUESTED */}
        <div className="mt-8 flex gap-2 border-b border-slate-800 -mb-2 overflow-x-auto pb-1">
          {/* Sub-tab 1: Identitas Perusahaan & Logo Apps */}
          <button
            type="button"
            onClick={() => setActiveSubTab('identity')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'identity'
                ? 'border-amber-400 text-amber-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Identitas Perusahaan & Logo Apps</span>
          </button>

          {/* Sub-tab 2: Staff, Kredensial Akun & TTD Digital (Unified CRUD) */}
          <button
            type="button"
            onClick={() => setActiveSubTab('staff')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'staff'
                ? 'border-amber-400 text-amber-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>2. Staff, TTD Digital & Kredensial User ({staffList.length})</span>
          </button>

          {/* Sub-tab 3: Personil Tim pendukung */}
          <button
            type="button"
            onClick={() => setActiveSubTab('workers')}
            className={`pb-3 px-4 font-bold text-xs flex items-center gap-2 border-b-2 transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'workers'
                ? 'border-amber-400 text-amber-400 font-black'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <HardHat className="w-4 h-4" />
            <span>3. Personil Tim pendukung ({workers.length})</span>
          </button>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* SUB-TAB 1: IDENTITAS PERUSAHAAN & LOGO APPS */}
      {/* ========================================================================= */}
      {activeSubTab === 'identity' && (
        <form onSubmit={handleSaveCompanyProfile} className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            
            {/* LEFT COLUMN: Logo Apps & Live Simulator Box */}
            <div className="lg:col-span-1 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <div className="flex items-center gap-2">
                    <span className="p-1.5 rounded-lg bg-amber-100 text-amber-800">
                      <Sparkles className="w-4 h-4" />
                    </span>
                    <h3 className="text-sm font-black text-slate-900">Logo Aplikasi & Dokumen</h3>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 rounded-2xl border border-dashed border-slate-300 flex flex-col items-center justify-center text-center">
                  <div className="w-28 h-28 rounded-2xl bg-white border border-slate-200 shadow-md p-2 flex items-center justify-center mb-3 overflow-hidden">
                    {profileForm.logoUrl ? (
                      <img 
                        src={profileForm.logoUrl} 
                        alt="Logo Preview" 
                        className="w-full h-full object-contain"
                      />
                    ) : (
                      <span className="text-5xl">🚜</span>
                    )}
                  </div>

                  <span className="text-xs font-bold text-slate-800">
                    {profileForm.shortName || 'RBS'} APPS
                  </span>
                  <span className="text-[10px] text-slate-400 mt-0.5">
                    {profileForm.logoUrl ? 'Logo Kustom Terpasang' : 'Logo Bawaan Standar'}
                  </span>
                </div>

                <div className="flex gap-2">
                  <label className="flex-1 py-2.5 px-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl text-center shadow-xs cursor-pointer flex items-center justify-center gap-1.5 transition">
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
                  Rekomendasi format PNG transparan atau SVG rasio 1:1. Logo otomatis sinkron ke bilah Header, halaman Login, kop Laporan PDF, dan cetak pengesahan.
                </p>
              </div>

              {/* Live Preview Box */}
              <div className="bg-slate-900 rounded-3xl border border-slate-800 p-6 text-white space-y-4 shadow-xs">
                <div className="flex items-center justify-between text-xs text-slate-400 font-bold uppercase tracking-wider">
                  <span>Simulasi Header Aplikasi</span>
                  <span className="text-emerald-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Live
                  </span>
                </div>

                <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-slate-900 border border-amber-500/40 p-1 flex items-center justify-center shrink-0 overflow-hidden">
                    {profileForm.logoUrl ? (
                      <img src={profileForm.logoUrl} alt="Logo" className="w-full h-full object-contain" />
                    ) : (
                      <span>🚜</span>
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="font-black text-white text-sm tracking-wider truncate">
                        {profileForm.shortName || 'RBS'}
                      </span>
                      <span className="text-[9px] font-black uppercase px-1 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        APPS
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-400 truncate block">
                      {profileForm.officialName || 'PT. RBS GROUP'} • Land Clearing
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Official Company Legalities & Identity */}
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-3xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
                <div className="border-b border-slate-100 pb-4">
                  <h3 className="text-base font-black text-slate-900">
                    Informasi Legalitas & Profil Perusahaan
                  </h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Pastikan nama singkat dan legalitas resmi diisi sesuai akta atau nama dagang proyek Anda.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Nama Singkat Perusahaan (Nama Apps) */}
                  <div className="sm:col-span-1 p-3.5 rounded-2xl bg-amber-50/70 border-2 border-amber-300">
                    <label className="block text-xs font-black text-amber-950 uppercase tracking-wider mb-1 flex items-center justify-between">
                      <span>Nama Singkat (Nama Apps) *</span>
                      <span className="text-[10px] text-amber-800 bg-amber-200 px-1.5 py-0.5 rounded font-bold">KUNCI NAMA APPS</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: RBS"
                      value={profileForm.shortName}
                      onChange={(e) => handleProfileChange('shortName', e.target.value.toUpperCase())}
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
                      placeholder="Contoh: PT. RBS GROUP"
                      value={profileForm.officialName}
                      onChange={(e) => handleProfileChange('officialName', e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold text-sm focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <span className="text-[10px] text-slate-400 mt-1 block">
                      Ditampilkan pada kop surat resmi laporan cetak PDF & lembar persetujuan.
                    </span>
                  </div>

                  {/* Slogan */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                      Slogan / Tagline Operasional
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Solusi Kontraktor Land Clearing & Alat Berat Terintegrasi"
                      value={profileForm.tagline || ''}
                      onChange={(e) => handleProfileChange('tagline', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Alamat Kantor Pusat */}
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alamat Kantor Pusat / Operasional</span>
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Alamat lengkap kantor..."
                      value={profileForm.address ?? profileForm.headOfficeAddress ?? ''}
                      onChange={(e) => handleProfileChange('address', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  {/* Kontak & Informasi Legalitas */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5 text-slate-400" />
                      <span>Nomor Telepon / WhatsApp</span>
                    </label>
                    <input
                      type="text"
                      placeholder="0812-xxxx-xxxx"
                      value={profileForm.phone || ''}
                      onChange={(e) => handleProfileChange('phone', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      <span>Alamat Email Resmi</span>
                    </label>
                    <input
                      type="email"
                      placeholder="operational@suryaland.co.id"
                      value={profileForm.email || ''}
                      onChange={(e) => handleProfileChange('email', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5 text-slate-400" />
                      <span>Website Perusahaan</span>
                    </label>
                    <input
                      type="text"
                      placeholder="www.suryaland.co.id"
                      value={profileForm.website || ''}
                      onChange={(e) => handleProfileChange('website', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1.5">
                      <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                      <span>Rekening Bank Operasional</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Bank Mandiri / BCA: 123-xxx-xxxx"
                      value={profileForm.bankAccount ?? profileForm.bankAccountInfo ?? ''}
                      onChange={(e) => handleProfileChange('bankAccount', e.target.value)}
                      className="w-full px-3.5 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                  <button
                    type="submit"
                    disabled={isSavingProfile}
                    className="px-6 py-2.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs shadow-md transition flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{isSavingProfile ? 'Menyimpan...' : 'Simpan Perubahan Identitas Perusahaan'}</span>
                  </button>
                </div>
              </div>
            </div>

          </div>
        </form>
      )}

      {/* ========================================================================= */}
      {/* SUB-TAB 2: DAFTAR STAFF, KREDENSIAL LOGIN & TTD DIGITAL RESMI (UNIFIED CRUD) */}
      {/* ========================================================================= */}
      {activeSubTab === 'staff' && (() => {
        // Filter logic using strictly deduplicated list
        const q = (staffSearchQuery || '').toLowerCase();
        const filteredStaff = cleanStaffList.filter((staff) => {
          const staffLevel = resolveStaffUserLevel(staff);
          const matchSearch =
            !q ||
            (staff.fullName && staff.fullName.toLowerCase().includes(q)) ||
            (staff.employeeIdNumber && staff.employeeIdNumber.toLowerCase().includes(q)) ||
            (staff.username && staff.username.toLowerCase().includes(q)) ||
            (staff.phone && staff.phone.includes(q)) ||
            (staff.email && staff.email.toLowerCase().includes(q)) ||
            (staff.jobRole && staff.jobRole.toLowerCase().includes(q)) ||
            (staffLevel && staffLevel.toLowerCase().includes(q)) ||
            (staff.assignedClientName && staff.assignedClientName.toLowerCase().includes(q));

          const matchLevel = staffFilterLevel === 'ALL' || staffLevel === staffFilterLevel;
          const matchStatus = staffFilterStatus === 'ALL' || staff.status === staffFilterStatus;

          return matchSearch && matchLevel && matchStatus;
        });

        const countSuperadmin = cleanStaffList.filter((s) => resolveStaffUserLevel(s) === 'Superadmin').length;
        const countSiteManager = cleanStaffList.filter((s) => resolveStaffUserLevel(s) === 'Site Manager').length;
        const countPengawas = cleanStaffList.filter((s) => resolveStaffUserLevel(s) === 'Pengawas').length;
        const countKlien = cleanStaffList.filter((s) => resolveStaffUserLevel(s) === 'Klien').length;

        return (
          <div className="space-y-6">
            {/* Header Banner & Stats */}
            <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-xl bg-amber-500 text-slate-950 font-black shadow-xs">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                      <span>Daftar Staff, Kredensial Login & Tanda Tangan Digital Resmi</span>
                      <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-200">
                        1 Modul CRUD Terpadu
                      </span>
                    </h3>
                    <p className="text-xs text-slate-500">
                      Satu modul terintegrasi untuk profil identitas staff, kredensial login akun resmi (Username, Password, Level Hak Akses), dan spesimen tanda tangan digital.
                    </p>
                  </div>
                </div>

                {/* Level Distribution Pills (Interactive Filter Buttons) */}
                <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px] font-bold">
                  <button
                    type="button"
                    onClick={() => setStaffFilterLevel('ALL')}
                    className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      staffFilterLevel === 'ALL'
                        ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                        : 'bg-slate-100 text-slate-700 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    Total Staff: <strong>{cleanStaffList.length}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilterLevel(staffFilterLevel === 'Superadmin' ? 'ALL' : 'Superadmin')}
                    className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      staffFilterLevel === 'Superadmin'
                        ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                        : 'bg-rose-50 text-rose-800 border-rose-200 hover:bg-rose-100'
                    }`}
                  >
                    Superadmin: <strong>{countSuperadmin}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilterLevel(staffFilterLevel === 'Site Manager' ? 'ALL' : 'Site Manager')}
                    className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      staffFilterLevel === 'Site Manager'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-xs'
                        : 'bg-sky-50 text-sky-800 border-sky-200 hover:bg-sky-100'
                    }`}
                  >
                    Site Manager: <strong>{countSiteManager}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilterLevel(staffFilterLevel === 'Pengawas' ? 'ALL' : 'Pengawas')}
                    className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      staffFilterLevel === 'Pengawas'
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                        : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                    }`}
                  >
                    Pengawas: <strong>{countPengawas}</strong>
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffFilterLevel(staffFilterLevel === 'Klien' ? 'ALL' : 'Klien')}
                    className={`px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                      staffFilterLevel === 'Klien'
                        ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs'
                        : 'bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100'
                    }`}
                  >
                    Klien: <strong>{countKlien}</strong>
                  </button>
                </div>
              </div>

              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleAuditAndDeduplicateAll}
                  disabled={isAuditingDuplicates}
                  className="px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 border border-amber-500/40 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer disabled:opacity-50"
                  title="Pindai dan bersihkan duplikat database serta pastikan semua user aktif dan bisa login"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${isAuditingDuplicates ? 'animate-spin' : ''}`} />
                  <span>{isAuditingDuplicates ? 'Membersihkan Duplikat...' : 'Audit & Bersihkan Duplikat Sekarang'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleOpenAddStaff}
                  className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <Plus className="w-4 h-4 stroke-[3]" />
                  <span>+ Tambah Staff & Akun</span>
                </button>
              </div>
            </div>

            {/* Filter and Search Bar */}
            <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col md:flex-row items-center gap-3">
              <div className="relative flex-1 w-full">
                <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari staff (nama lengkap, NIK, username login, telepon/WA, email, jabatan)..."
                  value={staffSearchQuery}
                  onChange={(e) => setStaffSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-8 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 font-medium"
                />
                {staffSearchQuery && (
                  <button
                    type="button"
                    onClick={() => setStaffSearchQuery('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
                    title="Hapus pencarian"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
                {/* Filter Level Hak Akses */}
                <select
                  value={staffFilterLevel}
                  onChange={(e) => setStaffFilterLevel(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Level Hak Akses</option>
                  <option value="Superadmin">Superadmin (Direktur)</option>
                  <option value="Site Manager">Site Manager</option>
                  <option value="Pengawas">Pengawas</option>
                  <option value="Klien">Klien</option>
                </select>

                {/* Filter Status */}
                <select
                  value={staffFilterStatus}
                  onChange={(e) => setStaffFilterStatus(e.target.value)}
                  className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none cursor-pointer"
                >
                  <option value="ALL">Semua Status</option>
                  <option value="Aktif">Aktif</option>
                  <option value="Nonaktif">Nonaktif</option>
                </select>

                {(staffSearchQuery || staffFilterLevel !== 'ALL' || staffFilterStatus !== 'ALL') && (
                  <button
                    type="button"
                    onClick={() => {
                      setStaffSearchQuery('');
                      setStaffFilterLevel('ALL');
                      setStaffFilterStatus('ALL');
                    }}
                    className="px-2.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    title="Reset Filter"
                  >
                    Reset
                  </button>
                )}

                {/* Grid / Table View Switcher */}
                <div className="flex border border-slate-200 rounded-xl overflow-hidden p-0.5 bg-slate-100">
                  <button
                    type="button"
                    onClick={() => setStaffViewMode('grid')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      staffViewMode === 'grid' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'
                    }`}
                    title="Tampilan Grid Card"
                  >
                    <Grid className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setStaffViewMode('table')}
                    className={`p-1.5 rounded-lg transition cursor-pointer ${
                      staffViewMode === 'table' ? 'bg-white text-amber-600 shadow-xs' : 'text-slate-500'
                    }`}
                    title="Tampilan Tabel Matriks"
                  >
                    <List className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            {/* List View: Grid or Table */}
            {staffViewMode === 'grid' ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {filteredStaff.map((staff) => {
                  const isPwdVisible = visiblePasswords[staff.id] || false;
                  const userLevel = resolveStaffUserLevel(staff);
                  const isProtectedRoot = false;

                  const levelBadgeStyle =
                    userLevel === 'Superadmin'
                      ? 'bg-rose-100 text-rose-800 border-rose-300'
                      : userLevel === 'Site Manager'
                      ? 'bg-sky-100 text-sky-800 border-sky-300'
                      : userLevel === 'Pengawas'
                      ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                      : 'bg-amber-100 text-amber-900 border-amber-300';

                  return (
                    <div
                      key={staff.id}
                      className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                    >
                      <div className="space-y-3.5">
                        {/* Header: Level Badge & Action Buttons */}
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-black uppercase tracking-wider border ${levelBadgeStyle}`}>
                              {userLevel}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleToggleStaffStatus(staff)}
                              title="Klik untuk mengubah status Aktif / Nonaktif"
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold transition cursor-pointer border ${
                                staff.status === 'Aktif'
                                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                  : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                              }`}
                            >
                              ● {staff.status}
                            </button>
                          </div>

                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleCopyStaffCredentials(staff)}
                              className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition cursor-pointer"
                              title="Salin Kredensial untuk Dikirim ke WhatsApp"
                            >
                              {copiedStaffId === staff.id ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEditStaff(staff)}
                              className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                              title="Edit Data Staff & Akun"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteStaffClick(staff)}
                              className={`p-1.5 rounded-lg transition cursor-pointer ${
                                isProtectedRoot
                                  ? 'text-slate-300 hover:text-rose-400 hover:bg-rose-50/50'
                                  : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                              }`}
                              title={isProtectedRoot ? 'Akun Direktur Utama Aktif (Diproteksi Sistem)' : 'Hapus Staff & Akun'}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Staff Identity */}
                        <div>
                          <h4 className="text-sm font-black text-slate-900 leading-tight">{staff.fullName}</h4>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs font-bold text-slate-700">{staff.jobRole}</span>
                            <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-1.5 py-0.2 rounded border border-slate-200">
                              NIK: {staff.employeeIdNumber || '-'}
                            </span>
                          </div>
                        </div>

                        {/* Login Credentials Box */}
                        <div className="p-3 bg-gradient-to-br from-slate-50 to-slate-100/70 rounded-2xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold flex items-center gap-1">
                              <KeyRound className="w-3 h-3 text-sky-600" />
                              <span>Username Login:</span>
                            </span>
                            <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                              @{staff.username || '-'}
                            </span>
                          </div>

                          <div className="flex items-center justify-between text-[11px]">
                            <span className="text-slate-500 font-bold flex items-center gap-1">
                              <Lock className="w-3 h-3 text-amber-600" />
                              <span>Password:</span>
                            </span>
                            <div className="flex items-center gap-1">
                              <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                                {isPwdVisible ? (staff.password || '-') : '••••••••'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setVisiblePasswords((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))}
                                className="p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                                title={isPwdVisible ? 'Sembunyikan' : 'Lihat Sandi'}
                              >
                                {isPwdVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="flex items-center justify-between text-[10px] bg-emerald-50 px-2 py-1 rounded-lg border border-emerald-200 text-emerald-800 font-bold">
                            <span className="flex items-center gap-1">
                              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Status Login:</span>
                            </span>
                            <span className="text-emerald-700">Aktif (Siap Login Dimanapun)</span>
                          </div>

                          {/* Penempatan Proyek */}
                          <div className="pt-1.5 border-t border-slate-200/70 text-[10px] text-slate-600 flex items-start gap-1">
                            <MapPin className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                            <span className="font-medium truncate">
                              {staff.assignedClientName || (userLevel === 'Superadmin' || userLevel === 'Site Manager' ? 'Akses Semua Proyek (Supervisi Penuh)' : 'Semua Proyek')}
                            </span>
                          </div>
                        </div>

                        {/* Digital Signature Preview Box */}
                        <div className="p-3 bg-white rounded-2xl border border-slate-200 space-y-1.5">
                          <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
                            <span>Tanda Tangan Digital Resmi</span>
                            <span className={staff.signatureUrl ? 'text-emerald-600' : 'text-slate-400'}>
                              {staff.signatureUrl ? '✓ Terverifikasi' : 'Belum Ada'}
                            </span>
                          </div>
                          <div className="h-16 w-full bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-center p-1 overflow-hidden">
                            {staff.signatureUrl ? (
                              <img
                                src={staff.signatureUrl}
                                alt={`TTD ${staff.fullName}`}
                                className="max-h-full max-w-full object-contain"
                              />
                            ) : (
                              <span className="text-[11px] text-slate-400 italic">Belum ada spesimen TTD</span>
                            )}
                          </div>
                        </div>

                        {/* Contact Info */}
                        <div className="text-[11px] text-slate-500 space-y-1">
                          {staff.phone && (
                            <div className="flex items-center gap-1.5">
                              <Phone className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>{staff.phone}</span>
                            </div>
                          )}
                          {staff.email && (
                            <div className="flex items-center gap-1.5">
                              <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                              <span className="truncate">{staff.email}</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer Actions */}
                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleCopyStaffCredentials(staff)}
                          className="px-2.5 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 border border-sky-200 font-bold text-[10px] rounded-lg flex items-center gap-1 transition cursor-pointer"
                        >
                          {copiedStaffId === staff.id ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedStaffId === staff.id ? 'Tersalin' : 'Salin WA'}</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditStaff(staff)}
                            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-[10px] rounded-lg flex items-center gap-1 transition cursor-pointer"
                          >
                            <Edit3 className="w-3 h-3" />
                            <span>Edit Data</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteStaffClick(staff)}
                            className={`px-2.5 py-1.5 font-bold text-[10px] rounded-lg flex items-center gap-1 transition cursor-pointer border ${
                              isProtectedRoot
                                ? 'bg-slate-50 text-slate-400 border-slate-200 hover:bg-rose-50 hover:text-rose-500'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                            }`}
                            title={isProtectedRoot ? 'Akun Direktur Utama Aktif (Diproteksi)' : 'Hapus Staff & Akun'}
                          >
                            <Trash2 className="w-3 h-3" />
                            <span>Hapus</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Table View */
              <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="py-3 px-4">Nama Lengkap & NIK</th>
                        <th className="py-3 px-4">Jabatan & Level Akses</th>
                        <th className="py-3 px-4">Kredensial Login</th>
                        <th className="py-3 px-4">Penempatan Proyek</th>
                        <th className="py-3 px-4">Spesimen TTD</th>
                        <th className="py-3 px-4">Kontak (WA & Email)</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 text-slate-700">
                      {filteredStaff.map((staff) => {
                        const isPwdVisible = visiblePasswords[staff.id] || false;
                        const userLevel = resolveStaffUserLevel(staff);
                        const isProtectedRoot = false;

                        const levelBadgeStyle =
                          userLevel === 'Superadmin'
                            ? 'bg-rose-100 text-rose-800 border-rose-300'
                            : userLevel === 'Site Manager'
                            ? 'bg-sky-100 text-sky-800 border-sky-300'
                            : userLevel === 'Pengawas'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                            : 'bg-amber-100 text-amber-900 border-amber-300';

                        return (
                          <tr key={staff.id} className="hover:bg-slate-50/80 transition">
                            <td className="py-3 px-4">
                              <div className="font-bold text-slate-900">{staff.fullName}</div>
                              <div className="text-[10px] font-mono text-slate-400">NIK: {staff.employeeIdNumber || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <div className="font-semibold text-slate-800">{staff.jobRole}</div>
                              <span className={`inline-block mt-0.5 px-2 py-0.2 rounded text-[9px] font-black uppercase border ${levelBadgeStyle}`}>
                                {userLevel}
                              </span>
                            </td>
                            <td className="py-3 px-4 font-mono text-[11px]">
                              <div className="font-bold text-slate-900">@{staff.username || '-'}</div>
                              <div className="flex items-center gap-1 text-slate-600">
                                <span>{isPwdVisible ? (staff.password || '-') : '••••••'}</span>
                                <button
                                  type="button"
                                  onClick={() => setVisiblePasswords((prev) => ({ ...prev, [staff.id]: !prev[staff.id] }))}
                                  className="text-slate-400 hover:text-slate-700 cursor-pointer"
                                  title={isPwdVisible ? 'Sembunyikan' : 'Lihat Sandi'}
                                >
                                  {isPwdVisible ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                                </button>
                              </div>
                            </td>
                            <td className="py-3 px-4 text-[11px]">
                              <div className="font-medium text-slate-800">
                                {staff.assignedClientName || (userLevel === 'Superadmin' || userLevel === 'Site Manager' ? 'Akses Semua Proyek' : '-')}
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              {staff.signatureUrl ? (
                                <div className="h-10 w-24 bg-white rounded border border-slate-200 p-0.5 flex items-center justify-center">
                                  <img src={staff.signatureUrl} alt="TTD" className="max-h-full max-w-full object-contain" />
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Belum Ada</span>
                              )}
                            </td>
                            <td className="py-3 px-4 text-[11px]">
                              <div>{staff.phone || '-'}</div>
                              <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{staff.email || '-'}</div>
                            </td>
                            <td className="py-3 px-4">
                              <button
                                type="button"
                                onClick={() => handleToggleStaffStatus(staff)}
                                title="Klik untuk mengubah status Aktif / Nonaktif"
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border flex items-center gap-1 w-fit ${
                                  staff.status === 'Aktif'
                                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                                    : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                                }`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                                <span>{staff.status === 'Aktif' ? 'Aktif (Siap Login)' : staff.status}</span>
                              </button>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <div className="flex items-center justify-end gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleCopyStaffCredentials(staff)}
                                  className="p-1.5 text-slate-400 hover:text-sky-600 hover:bg-sky-50 rounded-lg cursor-pointer transition"
                                  title="Salin Kredensial WA"
                                >
                                  {copiedStaffId === staff.id ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditStaff(staff)}
                                  className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg cursor-pointer transition"
                                  title="Edit Staff & Akun"
                                >
                                  <Edit3 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteStaffClick(staff)}
                                  className={`p-1.5 rounded-lg cursor-pointer transition ${
                                    isProtectedRoot
                                      ? 'text-slate-300 hover:text-rose-400'
                                      : 'text-rose-500 hover:text-rose-700 hover:bg-rose-50'
                                  }`}
                                  title={isProtectedRoot ? 'Akun Direktur Utama Aktif (Diproteksi)' : 'Hapus Staff & Akun'}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {filteredStaff.length === 0 && (
              <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
                <Users className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-bold text-slate-700">Tidak ada data staff yang sesuai filter</h4>
                <p className="text-xs text-slate-400">Silakan ubah kata kunci pencarian atau tambah staff baru.</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ========================================================================= */}
      {/* SUB-TAB 3: PERSONIL TIM PENDUKUNG (Operator, Mekanik, Logistik, Pendukung, Pengawas) */}
      {/* ========================================================================= */}
      {activeSubTab === 'workers' && (
        <div className="space-y-6">
          {/* Header & Button */}
          <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                <HardHat className="w-5 h-5 text-amber-500" />
                <span>Personil Tim pendukung Lapangan</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Operator, Mekanik, Logistik, dan Personil Tim Pendukung Lapangan.
              </p>
            </div>

            <div className="flex items-center gap-2">
              {workers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsClearWorkersModalOpen(true)}
                  className="px-3.5 py-2.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer"
                  title="Hapus / Kosongkan semua data personil tim pendukung untuk input data real baru"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan Personil ({workers.length})</span>
                </button>
              )}
              <button
                type="button"
                onClick={handleOpenAddWorker}
                className="px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-xl shadow-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Personil Baru</span>
              </button>
            </div>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-4 border border-slate-200 shadow-xs flex flex-col sm:flex-row items-center gap-3">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Cari personil berdasarkan nama, kontak telepon, atau kategori..."
                value={workerSearchQuery}
                onChange={(e) => setWorkerSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
              />
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              {/* Category Filter */}
              <select
                value={selectedCategoryFilter}
                onChange={(e) => setSelectedCategoryFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none"
              >
                <option value="ALL">Semua Kategori Personil</option>
                {Array.from(new Set([...DEFAULT_WORKER_CATEGORIES, ...customWorkerCategories])).map((cat) => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>

              {/* Client / SPK Filter */}
              <select
                value={selectedClientFilter}
                onChange={(e) => setSelectedClientFilter(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none max-w-[200px] truncate"
              >
                <option value="ALL">Semua Lokasi SPK</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.contractNumber || 'Tanpa SPK'} - {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Workers Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredWorkers.map((w) => {
              const assignedClient = clients.find((c) => c.id === w.assignedClientId);

              return (
                <div
                  key={w.id}
                  className="bg-white rounded-3xl border border-slate-200 p-5 shadow-xs hover:shadow-md transition flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-100 text-amber-900 border border-amber-200">
                        {w.category || 'Operator'}
                      </span>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditWorker(w)}
                          className="p-1.5 text-slate-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                          title="Edit Personil"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteWorkerClick(w)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                          title="Hapus Personil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    <div>
                      <h4 className="text-sm font-black text-slate-900">{w.name}</h4>
                      <p className="text-xs text-slate-500 mt-0.5">Telepon/WA: {w.phone || '-'}</p>
                    </div>

                    {/* Penugasan Lokasi Kerja SPK */}
                    <div className="p-2.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-1">
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Penugasan SPK / Klien:
                      </span>
                      <div className="text-xs font-bold text-slate-800 truncate">
                        {assignedClient 
                          ? `${assignedClient.contractNumber || 'Tanpa SPK'} - ${assignedClient.name}` 
                          : 'Seluruh Proyek / BKO Lapangan'}
                      </div>
                      {w.assignedBlockId && w.assignedBlockId !== 'ALL' && (
                        <span className="inline-block text-[10px] bg-white border border-slate-200 text-slate-700 font-mono px-1.5 py-0.2 rounded mt-0.5">
                          Blok: {w.assignedBlockId}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px]">
                    <span className="px-2 py-0.5 rounded-full font-bold bg-emerald-50 text-emerald-700">
                      ● {w.status || 'Hadir'}
                    </span>
                    <span className="text-slate-400 text-[10px]">Personil Aktif</span>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredWorkers.length === 0 && (
            <div className="p-12 text-center bg-white rounded-3xl border border-slate-200 space-y-3">
              <HardHat className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-bold text-slate-700">
                {workers.length === 0 ? 'Belum Ada Data Personil Tim Pendukung' : 'Tidak ada personil yang sesuai filter'}
              </h4>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                {workers.length === 0
                  ? 'Data personil tim pendukung (Operator, Mekanik, Logistik, Pendukung) telah dikosongkan. Silakan klik tombol di bawah untuk mulai menginput data personil riil di lapangan.'
                  : 'Silakan ubah kata kunci pencarian atau filter kategori/lokasi SPK.'}
              </p>
              {workers.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddWorker}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Personil Riil Pertama</span>
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL UNIFIED: TAMBAH / EDIT DATA STAFF, KREDENSIAL LOGIN & TTD DIGITAL */}
      {/* ========================================================================= */}
      {isStaffModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 sm:p-7 shadow-2xl space-y-6 my-8 max-h-[90vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-amber-500 text-slate-950 font-black shadow-xs">
                  <Users className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-slate-900 text-base">
                    {editingStaffId ? 'Edit Data Staff & Kredensial Akun' : '+ Tambah Staff & Akun Pengguna Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    1 Modul CRUD: Profil staff, kredensial login akun resmi, serta spesimen tanda tangan digital (TTD).
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsStaffModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-6 text-xs">
              {/* SECTION 1: DATA IDENTITAS & PROFIL STAFF */}
              <div className="p-4 bg-slate-50/80 rounded-2xl border border-slate-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[10px]">1</span>
                    <span>Data Profil & Identitas Staff</span>
                  </span>
                  <span className="text-[10px] text-slate-400 font-bold">* Wajib Diisi</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Nama Lengkap & Gelar *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Bambang Sugiarto, S.P. atau Ahmad Rizky Pratama, S.T."
                      value={staffFormData.fullName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setStaffFormData((prev) => {
                          const updates: any = { ...prev, fullName: val };
                          // Auto suggest username if not edited yet
                          if (!editingStaffId && (!prev.username || prev.username.startsWith('user@'))) {
                            const clean = val
                              .replace(/^(Ir\.|Dr\.|Drs\.|H\.|Hj\.|S\.T\.|S\.P\.|S\.E\.)\s*/i, '')
                              .split(' ')[0]
                              .toLowerCase()
                              .replace(/[^a-z0-9]/g, '');
                            if (clean) updates.username = clean;
                          }
                          return updates;
                        });
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-slate-900 font-bold text-xs focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">NIK / NIP Karyawan *</label>
                    <input
                      type="text"
                      required
                      placeholder="DIR-001 / SUP-003 / MGR-002"
                      value={staffFormData.employeeIdNumber}
                      onChange={(e) => setStaffFormData({ ...staffFormData, employeeIdNumber: e.target.value.toUpperCase() })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Jabatan Resmi di Perusahaan *</label>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: Direktur Utama / Site Manager Operasional / Pengawas Lapangan"
                      value={staffFormData.jobRole}
                      onChange={(e) => setStaffFormData({ ...staffFormData, jobRole: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Phone className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Nomor Telepon / WhatsApp *</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="0812-7654-xxxx"
                      value={staffFormData.phone}
                      onChange={(e) => setStaffFormData({ ...staffFormData, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-sky-600" />
                      <span>Email Resmi Perusahaan *</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="nama@suryaland.co.id"
                      value={staffFormData.email}
                      onChange={(e) => setStaffFormData({ ...staffFormData, email: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-700 mb-1">Alamat Domisili / Basecamp</label>
                    <input
                      type="text"
                      placeholder="Mess Karyawan / Kantor Pekanbaru, Riau"
                      value={staffFormData.address}
                      onChange={(e) => setStaffFormData({ ...staffFormData, address: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 2: KREDENSIAL LOGIN AKUN RESMI (SISTEM AKSES) */}
              <div className="p-4 bg-sky-50/60 rounded-2xl border border-sky-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-sky-200/80 pb-2">
                  <span className="font-black text-sky-950 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-sky-600 text-white flex items-center justify-center font-black text-[10px]">2</span>
                    <span>Kredensial Login Akun Resmi (Sistem Akses)</span>
                  </span>
                  <span className="text-[10px] text-sky-700 font-bold">Akses Login Pengguna</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {/* Level Hak Akses */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1 flex items-center justify-between">
                      <span>Level Hak Akses *</span>
                      <span className="text-[10px] text-sky-700 font-semibold">(4 Pilihan Resmi)</span>
                    </label>
                    <select
                      value={staffFormData.userLevel}
                      onChange={(e) => {
                        const lvl = e.target.value as ManagedUserLevel;
                        setStaffFormData((prev) => ({
                          ...prev,
                          userLevel: lvl,
                          assignedClientId: (lvl === 'Superadmin' || lvl === 'Site Manager') ? 'all' : (clients[0]?.id || 'all'),
                          assignedClientName: (lvl === 'Superadmin')
                            ? 'Semua Proyek (Owner)'
                            : (lvl === 'Site Manager')
                            ? 'Semua Proyek (Site Manager Operasional)'
                            : (clients[0]?.name || 'Semua Proyek'),
                          assignedBlockCodes: (lvl === 'Superadmin' || lvl === 'Site Manager')
                            ? ['Akses Semua Blok (Tanpa Batas)']
                            : [],
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl font-black text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="Superadmin">👑 Superadmin (Direktur / Owner - Akses Penuh)</option>
                      <option value="Site Manager">🛡️ Site Manager (Approval & Supervisi Lapangan)</option>
                      <option value="Pengawas">👷 Pengawas (Input Laporan Harian, P2H & Solar)</option>
                      <option value="Klien">🏢 Klien (Monitoring Progres & Laporan)</option>
                    </select>
                  </div>

                  {/* Status Akun */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Status Keaktifan Akun *</label>
                    <select
                      value={staffFormData.status}
                      onChange={(e) => setStaffFormData({ ...staffFormData, status: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="Aktif">🟢 Aktif (Dapat Login ke Sistem)</option>
                      <option value="Nonaktif">🔴 Nonaktif (Akses Dikunci Sementara)</option>
                    </select>
                  </div>

                  {/* Penugasan Proyek / Klien SPK */}
                  <div className="sm:col-span-2">
                    <label className="block font-bold text-slate-800 mb-1">
                      Penugasan Proyek / Klien SPK *
                    </label>
                    <select
                      value={staffFormData.assignedClientId || 'all'}
                      onChange={(e) => {
                        const val = e.target.value;
                        const foundClient = clients.find((c) => c.id === val);
                        setStaffFormData((prev) => ({
                          ...prev,
                          assignedClientId: val,
                          assignedClientName:
                            val === 'all'
                              ? prev.userLevel === 'Superadmin'
                                ? 'Semua Proyek (Owner)'
                                : prev.userLevel === 'Site Manager'
                                ? 'Semua Proyek (Site Manager Operasional)'
                                : 'Semua Proyek'
                              : foundClient?.name || 'Semua Proyek',
                          assignedBlockCodes:
                            val === 'all'
                              ? ['Akses Semua Blok (Tanpa Batas)']
                              : foundClient?.contractNumber
                              ? [foundClient.contractNumber]
                              : [],
                        }));
                      }}
                      className="w-full px-3.5 py-2.5 bg-white border border-sky-300 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500 cursor-pointer"
                    >
                      <option value="all">🌐 Akses Semua Proyek / Semua Klien SPK</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          🏢 {c.name} {c.contractNumber ? `(SPK: ${c.contractNumber})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Username */}
                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Username Login *</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono font-bold text-slate-400">@</span>
                      <input
                        type="text"
                        required
                        placeholder="username"
                        value={staffFormData.username}
                        onChange={(e) => setStaffFormData({ ...staffFormData, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '') })}
                        className="w-full pl-7 pr-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-800">Password Login *</label>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={generateRandomPassword}
                          className="text-[10px] text-amber-700 font-bold hover:underline cursor-pointer flex items-center gap-0.5"
                        >
                          <Sparkles className="w-3 h-3 text-amber-600" />
                          <span>Acak Sandi</span>
                        </button>
                        <span className="text-slate-300">|</span>
                        <button
                          type="button"
                          onClick={() => setShowModalPassword(!showModalPassword)}
                          className="text-[10px] text-sky-700 font-bold hover:underline cursor-pointer"
                        >
                          {showModalPassword ? 'Tutup' : 'Lihat'}
                        </button>
                      </div>
                    </div>
                    <input
                      type={showModalPassword ? 'text' : 'password'}
                      required
                      placeholder="••••••••"
                      value={staffFormData.password}
                      onChange={(e) => setStaffFormData({ ...staffFormData, password: e.target.value })}
                      className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-sky-500"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: SPESIMEN TANDA TANGAN DIGITAL RESMI (TTD) */}
              <div className="p-4 bg-amber-50/50 rounded-2xl border border-amber-200 space-y-3.5">
                <div className="flex items-center justify-between border-b border-amber-200/80 pb-2">
                  <span className="font-black text-amber-950 text-xs flex items-center gap-1.5">
                    <span className="w-5 h-5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center font-black text-[10px]">3</span>
                    <span>Spesimen Tanda Tangan Digital Resmi (TTD)</span>
                  </span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setSigMode('preset')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        sigMode === 'preset' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Kaligrafi
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode('draw')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        sigMode === 'draw' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Gambar Canvas
                    </button>
                    <button
                      type="button"
                      onClick={() => setSigMode('upload')}
                      className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                        sigMode === 'upload' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      Upload File
                    </button>
                  </div>
                </div>

                {sigMode === 'preset' && (
                  <div className="space-y-2">
                    <button
                      type="button"
                      onClick={handleApplyPresetSignature}
                      className="w-full py-2.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-950 font-black rounded-xl transition cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                    >
                      <Sparkles className="w-4 h-4 text-amber-600" />
                      <span>Buat Tanda Tangan Kaligrafi Resmi Otomatis ({staffFormData.fullName || 'Nama Staff'})</span>
                    </button>
                  </div>
                )}

                {sigMode === 'draw' && (
                  <div className="space-y-2">
                    <div className="border border-slate-300 rounded-xl bg-white overflow-hidden shadow-inner">
                      <canvas
                        ref={canvasRef}
                        width={500}
                        height={130}
                        className="w-full h-28 touch-none cursor-crosshair"
                        onMouseDown={startDrawing}
                        onMouseMove={draw}
                        onMouseUp={stopDrawing}
                        onMouseLeave={stopDrawing}
                        onTouchStart={startDrawing}
                        onTouchMove={draw}
                        onTouchEnd={stopDrawing}
                      />
                    </div>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="text-slate-500">Tandatangan langsung di atas kotak putih menggunakan sentuhan jari atau mouse</span>
                      <button
                        type="button"
                        onClick={clearCanvas}
                        className="text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Hapus Canvas
                      </button>
                    </div>
                  </div>
                )}

                {sigMode === 'upload' && (
                  <div className="space-y-2">
                    <label className="block w-full py-4 bg-white border-2 border-dashed border-slate-300 hover:border-amber-500 rounded-xl text-center cursor-pointer transition">
                      <Upload className="w-5 h-5 mx-auto text-slate-400 mb-1" />
                      <span className="font-bold text-slate-800 text-xs block">Pilih File Tanda Tangan (PNG Transparan / JPG)</span>
                      <span className="text-[10px] text-slate-400">Maksimal 2MB untuk performa optimal offline</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const r = new FileReader();
                          r.onload = async (ev) => {
                            const rawDataUrl = ev.target?.result as string;
                            const compressed = await compressSignatureDataUrl(rawDataUrl);
                            setStaffFormData((prev) => ({ ...prev, signatureUrl: compressed }));
                            showToast('Spesimen tanda tangan berhasil diupload & dioptimalkan.', 'success');
                          };
                          r.readAsDataURL(file);
                          e.target.value = '';
                        }}
                      />
                    </label>
                  </div>
                )}

                {/* Preview TTD Box */}
                {staffFormData.signatureUrl && (
                  <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                        Preview Tanda Tangan Resmi Terpasang:
                      </span>
                      <span className="text-[11px] font-semibold text-slate-700 block">
                        {staffFormData.fullName || 'Staff'} ({staffFormData.jobRole || 'Jabatan'})
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          clearCanvas();
                          setStaffFormData((prev) => ({ ...prev, signatureUrl: '' }));
                          showToast('Spesimen tanda tangan dihapus dari form.', 'success');
                        }}
                        className="mt-1.5 inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 hover:text-rose-700 hover:underline cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus / Reset TTD</span>
                      </button>
                    </div>
                    <div className="h-14 w-40 bg-slate-50 rounded-lg border border-slate-200 p-1 flex items-center justify-center overflow-hidden shrink-0">
                      <img src={staffFormData.signatureUrl} alt="Preview TTD" className="max-h-full max-w-full object-contain" />
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 4: CATATAN TAMBAHAN */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Tambahan (Opsional)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan penugasan, wewenang dokumen, atau keterangan lainnya..."
                  value={staffFormData.notes}
                  onChange={(e) => setStaffFormData({ ...staffFormData, notes: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-slate-800 text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* Modal Actions */}
              <div className="pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
                <div>
                  {editingStaffId && (
                    <button
                      type="button"
                      onClick={() => {
                        const target = staffList.find((s) => s.id === editingStaffId);
                        if (target) {
                          setIsStaffModalOpen(false);
                          handleDeleteStaffClick(target);
                        }
                      }}
                      className="px-4 py-2.5 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white border border-rose-200 font-bold rounded-xl cursor-pointer transition flex items-center gap-1.5 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Hapus Staff Ini</span>
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-3 ml-auto">
                  <button
                    type="button"
                    onClick={() => setIsStaffModalOpen(false)}
                    className="px-5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl cursor-pointer transition text-xs"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-2 text-xs"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Simpan Data Staff & Akun Login</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL 3: TAMBAH / EDIT PERSONIL TIM PENDUKUNG */}
      {/* ========================================================================= */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <span className="p-1.5 rounded-lg bg-amber-100 text-amber-900">
                  <HardHat className="w-4 h-4" />
                </span>
                <h3 className="font-black text-slate-900 text-base">
                  {editingWorkerId ? 'Edit Data Personil Tim Pendukung' : 'Tambah Personil Tim Pendukung'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsWorkerModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-4 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Personil *</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Budi Santoso"
                  value={workerForm.name || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 font-bold focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                />
              </div>

              {/* KATEGORI PERSONIL: Operator, Mekanik, Logistik, Pendukung, + Tambah Kategori */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Kategori Personil *</label>
                  {!isAddingNewCategory && (
                    <button
                      type="button"
                      onClick={() => setIsAddingNewCategory(true)}
                      className="text-[10px] font-bold text-amber-700 hover:text-amber-800 bg-amber-50 px-2 py-0.5 rounded cursor-pointer"
                    >
                      + Tambah kategori baru
                    </button>
                  )}
                </div>

                {!isAddingNewCategory ? (
                  <select
                    value={workerForm.category || 'Operator'}
                    onChange={(e) => {
                      if (e.target.value === '__ADD_NEW__') {
                        setIsAddingNewCategory(true);
                      } else {
                        setWorkerForm({ ...workerForm, category: e.target.value });
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Operator">Operator</option>
                    <option value="Mekanik">Mekanik</option>
                    <option value="Logistik">Logistik</option>
                    <option value="Pendukung">Pendukung</option>
                    {customWorkerCategories
                      .filter((c) => !['Operator', 'Mekanik', 'Logistik', 'Pendukung'].includes(c))
                      .map((c) => (
                        <option key={c} value={c}>{c}</option>
                      ))}
                    <option value="__ADD_NEW__">+ Tambah kategori...</option>
                  </select>
                ) : (
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ketik kategori baru (contoh: Surveyor, Helper)..."
                      value={newCategoryInput}
                      onChange={(e) => setNewCategoryInput(e.target.value)}
                      className="flex-1 px-3 py-2 bg-white border border-amber-400 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddCategory}
                      className="px-3 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl cursor-pointer"
                    >
                      Simpan
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddingNewCategory(false);
                        setNewCategoryInput('');
                      }}
                      className="px-2 py-2 bg-slate-200 text-slate-700 rounded-xl cursor-pointer"
                    >
                      Batal
                    </button>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Penugasan SPK / Klien</label>
                  <select
                    value={workerForm.assignedClientId || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, assignedClientId: e.target.value })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="">Umum / Stand-by Pool</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Kehadiran</label>
                  <select
                    value={workerForm.status || 'Hadir'}
                    onChange={(e) => setWorkerForm({ ...workerForm, status: e.target.value as any })}
                    className="w-full px-3 py-2.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                  >
                    <option value="Hadir">🟢 Hadir / Aktif</option>
                    <option value="Izin">🟡 Izin</option>
                    <option value="Cuti">🔴 Cuti / Off</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nomor Telepon / WA (Opsional)</label>
                <input
                  type="text"
                  placeholder="0812-xxxx-xxxx"
                  value={workerForm.phone || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none text-slate-900 font-medium"
                />
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 font-bold rounded-xl cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-xs cursor-pointer"
                >
                  Simpan Personil
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS DATA STAFF & AKUN USER */}
      {staffToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Hapus Staff & Akun Pengguna
                </h3>
                <p className="text-xs text-rose-600 font-bold mt-0.5">
                  Sub Menu 2: Staff, TTD Digital & Kredensial User
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2.5">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Nama Staff:</span>
                <span className="font-black text-slate-900">{staffToDelete.fullName}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Jabatan:</span>
                <span className="font-bold text-slate-800">{staffToDelete.jobRole}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Username Login:</span>
                <span className="font-mono font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
                  @{staffToDelete.username || '-'}
                </span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Level Akses:</span>
                <span className="font-bold text-slate-800">{staffToDelete.userLevel || staffToDelete.staffLevel}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus data staff ini? Profil identitas, spesimen tanda tangan digital (TTD), serta akun kredensial login (@{staffToDelete.username || staffToDelete.fullName}) akan dihapus permanen.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStaffToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={executeDeleteStaff}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Data Staff</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS PERSONIL TIM PENDUKUNG */}
      {workerToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  Hapus Personil Tim Pendukung
                </h3>
                <p className="text-xs text-rose-600 font-bold mt-0.5">
                  Sub Menu 3: Personil Tim Pendukung
                </p>
              </div>
            </div>

            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Nama Personil:</span>
                <span className="font-black text-slate-900">{workerToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-500 font-medium">Kategori / Peran:</span>
                <span className="font-bold text-slate-800">{workerToDelete.category}</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus personil &ldquo;{workerToDelete.name}&rdquo; dari daftar tim pendukung lapangan?
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWorkerToDelete(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={executeDeleteWorker}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Personil</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI KOSONGKAN PERSONIL TIM PENDUKUNG */}
      {isClearWorkersModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Kosongkan Personil Tim Pendukung?</h3>
                <span className="text-xs text-slate-500">Sub Menu 3: Personil Tim Pendukung</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2 text-amber-950">
              <p className="font-bold">
                Tindakan ini akan menghapus seluruh data pada daftar personil tim pendukung ({workers.length} personil):
              </p>
              <p className="text-[11px] text-amber-900">
                Mencakup personil Operator Alat Berat, Mekanik, Logistik, dan Pendukung Lapangan. Data staff/kredensial login Anda pada Sub Menu 2 tidak akan terpengaruh.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearWorkersModalOpen(false)}
                className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearWorkers}
                className="px-5 py-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Personil</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
