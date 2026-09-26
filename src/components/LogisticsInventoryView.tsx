import React, { useState } from 'react';
import { 
  Fuel, 
  Droplet, 
  Wrench, 
  Package, 
  Plus, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Search, 
  FileText, 
  ShieldCheck, 
  Truck, 
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  Info,
  Check,
  X,
  Printer, 
  Download,
  Lock
} from 'lucide-react';
import { 
  LogisticsTransaction, 
  InventoryItem, 
  Equipment, 
  Client, 
  Block, 
  AuthUser,
  LogisticsCategory,
  LogisticsUsagePurpose
} from '../types';
import { storageService } from '../services/storageService';
import { LogisticsPrintModal } from './LogisticsPrintModal';

interface LogisticsInventoryViewProps {
  authUser: AuthUser | null;
  clients: Client[];
  selectedClientId: string;
  onSelectClientId?: (id: string) => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warning' | 'error') => void;
}

export const LogisticsInventoryView: React.FC<LogisticsInventoryViewProps> = ({
  authUser,
  clients,
  selectedClientId,
  showToast,
}) => {
  const isDirector = authUser?.role === 'director';
  const isManager = authUser?.role === 'manager' || authUser?.userLevel === 'Manager';
  const isSupervisor = authUser?.role === 'supervisor';
  const canAuthorizeLogistics = isDirector || isManager;
  const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Ir. Hendra Wijaya, M.Si');
  const approverRole: 'director' | 'manager' = isManager ? 'manager' : 'director';

  const effectiveClientId = (isSupervisor && authUser?.assignedClientId && authUser.assignedClientId !== 'all')
    ? authUser.assignedClientId
    : selectedClientId;

  // Data states
  const [inventory, setInventory] = useState<InventoryItem[]>(() => storageService.getInventory());
  const [transactions, setTransactions] = useState<LogisticsTransaction[]>(() => 
    storageService.getLogisticsTransactions(effectiveClientId, authUser)
  );
  const [equipments] = useState<Equipment[]>(() => storageService.getEquipments());
  const [blocks] = useState<Block[]>(() => storageService.getBlocks(undefined, authUser));

  // Filters
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | LogisticsCategory>('ALL');
  const [typeFilter, setTypeFilter] = useState<'ALL' | 'in' | 'out'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'pending' | 'approved' | 'rejected'>('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Modals state
  const [isInflowModalOpen, setIsInflowModalOpen] = useState(false);
  const [isOutflowModalOpen, setIsOutflowModalOpen] = useState(false);
  
  // Rejection modal state
  const [rejectingTxId, setRejectingTxId] = useState<string | null>(null);
  const [rejectionReasonInput, setRejectionReasonInput] = useState('');

  // View details modal
  const [detailTx, setDetailTx] = useState<LogisticsTransaction | null>(null);

  // Print & Export modal states
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printModalInitialMode, setPrintModalInitialMode] = useState<'all' | 'in' | 'out'>('all');

  const openPrintModal = (mode: 'all' | 'in' | 'out' = 'all') => {
    setPrintModalInitialMode(mode);
    setIsPrintModalOpen(true);
  };

  const assignedBlockCodes = (isSupervisor && authUser?.assignedBlockCodes && authUser.assignedBlockCodes.length > 0 && !authUser.assignedBlockCodes[0].includes('Semua Blok'))
    ? authUser.assignedBlockCodes
    : null;

  const validSupervisorBlocks = blocks.filter((b) => {
    if (b.clientId !== effectiveClientId) return false;
    if (assignedBlockCodes && !assignedBlockCodes.includes(b.code)) return false;
    return true;
  });

  const initialBlockId = validSupervisorBlocks[0]?.id || blocks.find((b) => b.clientId === effectiveClientId)?.id || blocks[0]?.id || 'blk-1';

  // Inflow form state (Penerimaan Stok Masuk - Di-input Pengawas, Disetujui Direktur)
  const [inflowForm, setInflowForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'BBM' as LogisticsCategory,
    itemName: 'Solar Industri B35',
    quantity: 5000,
    unit: 'Liter',
    clientId: effectiveClientId !== 'ALL' ? effectiveClientId : (clients[0]?.id || 'client-1'),
    blockId: initialBlockId,
    supplierOrPoNumber: '',
    deliveryNoteNumber: '',
    sourceOrStorage: 'Tangki Utama Basecamp (Kapasitas 10.000 L)',
    notes: '',
  });

  // Outflow form state (Pemakaian Stok Keluar - HANYA PENGAWAS)
  const [outflowForm, setOutflowForm] = useState({
    date: new Date().toISOString().slice(0, 10),
    category: 'BBM' as LogisticsCategory,
    itemName: 'Solar Industri B35',
    quantity: 100,
    unit: 'Liter',
    clientId: effectiveClientId !== 'ALL' ? effectiveClientId : (clients[0]?.id || 'client-1'),
    blockId: initialBlockId,
    equipmentId: equipments[0]?.id || 'EX-01',
    equipmentHmAtUsage: equipments[0]?.currentHm || 2150.0,
    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)' as LogisticsUsagePurpose,
    notes: '',
  });

  const reloadData = () => {
    setInventory(storageService.getInventory());
    setTransactions(storageService.getLogisticsTransactions(effectiveClientId, authUser));
  };

  // Predefined catalog items based on category
  const getCatalogItems = (category: LogisticsCategory) => {
    switch (category) {
      case 'BBM':
        return [{ name: 'Solar Industri B35', unit: 'Liter' }];
      case 'Oli':
        return [
          { name: 'Oli Mesin Meditran SX 15W-40', unit: 'Liter' },
          { name: 'Oli Hidrolik Turalik 68 ISO', unit: 'Liter' },
          { name: 'Oli Transmisi SAE 90 GL-4', unit: 'Liter' },
        ];
      case 'Grease':
        return [{ name: 'Grease Chassis EP-2 High Temp', unit: 'Kg' }];
      case 'Spare Part':
        return [
          { name: 'Hose Hydraulic Boom 3/4" 4SP', unit: 'Pcs' },
          { name: 'Filter Solar Komatsu PC200', unit: 'Pcs' },
          { name: 'Filter Oli Mesin', unit: 'Pcs' },
          { name: 'Tooth Bucket PC200', unit: 'Pcs' },
          { name: 'Cutting Edge Bulldozer D65', unit: 'Pcs' },
        ];
      default:
        return [{ name: 'Solar Industri B35', unit: 'Liter' }];
    }
  };

  // Handle Submit Inflow (Stok Masuk - Pengawas)
  const handleSubmitInflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inflowForm.itemName || inflowForm.quantity <= 0) {
      showToast('Mohon lengkapi nama barang dan jumlah stok masuk yang valid.', 'warning');
      return;
    }

    const clientObj = clients.find((c) => c.id === inflowForm.clientId);
    const blockObj = blocks.find((b) => b.id === inflowForm.blockId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newTx: LogisticsTransaction = {
      id: `LOG-IN-${Date.now()}`,
      date: inflowForm.date,
      timestamp: `${inflowForm.date.split('-').reverse().join('/')} ${timeStr}`,
      category: inflowForm.category,
      itemName: inflowForm.itemName,
      quantity: Number(inflowForm.quantity),
      unit: inflowForm.unit,
      type: 'in',
      clientId: inflowForm.clientId,
      clientName: clientObj?.name || 'PT. A',
      blockId: inflowForm.blockId,
      blockCode: blockObj?.code || 'Blok AB',
      supplierOrPoNumber: inflowForm.supplierOrPoNumber || `PO-SRY/LOG/${Date.now().toString().slice(-4)}`,
      deliveryNoteNumber: inflowForm.deliveryNoteNumber || `SJ-${Date.now().toString().slice(-6)}`,
      sourceOrStorage: inflowForm.sourceOrStorage,
      submittedByRole: 'supervisor',
      submittedByName: authUser?.displayName || 'Budi Santoso',
      approvalStatus: 'pending', // Menunggu persetujuan Direktur!
      notes: inflowForm.notes,
    };

    storageService.saveLogisticsTransaction(newTx, authUser);
    reloadData();
    setIsInflowModalOpen(false);
    showToast(`Penerimaan stok masuk ${newTx.itemName} (${newTx.quantity} ${newTx.unit}) berhasil diajukan! Menunggu verifikasi & persetujuan Direktur.`);
  };

  // Handle Submit Outflow (Stok Keluar / Pemakaian - HANYA PENGAWAS)
  const handleSubmitOutflow = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isSupervisor) {
      showToast('Akses Ditolak: Hanya Pengawas Lapangan yang berwenang mencatat pemakaian alat berat.', 'warning');
      return;
    }

    if (!outflowForm.itemName || outflowForm.quantity <= 0) {
      showToast('Mohon lengkapi nama barang dan jumlah pemakaian.', 'warning');
      return;
    }

    const eqObj = equipments.find((eq) => eq.id === outflowForm.equipmentId);
    const clientObj = clients.find((c) => c.id === outflowForm.clientId);
    const blockObj = blocks.find((b) => b.id === outflowForm.blockId);
    const now = new Date();
    const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} WIB`;

    const newTx: LogisticsTransaction = {
      id: `LOG-OUT-${Date.now()}`,
      date: outflowForm.date,
      timestamp: `${outflowForm.date.split('-').reverse().join('/')} ${timeStr}`,
      category: outflowForm.category,
      itemName: outflowForm.itemName,
      quantity: Number(outflowForm.quantity),
      unit: outflowForm.unit,
      type: 'out',
      clientId: outflowForm.clientId,
      clientName: clientObj?.name || 'PT. A',
      blockId: outflowForm.blockId,
      blockCode: blockObj?.code || 'Blok AB',
      purpose: outflowForm.purpose,
      equipmentId: outflowForm.equipmentId,
      equipmentName: eqObj ? `${eqObj.name} (${eqObj.id})` : outflowForm.equipmentId,
      equipmentHmAtUsage: Number(outflowForm.equipmentHmAtUsage) || (eqObj?.currentHm || 0),
      submittedByRole: 'supervisor',
      submittedByName: authUser?.displayName || 'Budi Santoso',
      approvalStatus: 'approved', // Langsung tercatat karena pengawas berada di titik fisik
      notes: outflowForm.notes,
    };

    storageService.saveLogisticsTransaction(newTx, authUser);
    reloadData();
    setIsOutflowModalOpen(false);
    showToast(`Pemakaian ${newTx.quantity} ${newTx.unit} ${newTx.itemName} untuk ${newTx.equipmentId} berhasil dicatat di lapangan!`);
  };

  // Manager & Director Approval Handler (Inflow & Outflow)
  const handleApproveTransaction = (tx: LogisticsTransaction) => {
    if (!canAuthorizeLogistics) {
      showToast('Otorisasi Ditolak: Hanya Manager atau Direktur yang dapat memverifikasi & menyetujui mutasi stok.', 'warning');
      return;
    }

    if (tx.type === 'in') {
      const updated = storageService.approveLogisticsInflow(tx.id, approverName, approverRole);
      if (updated) {
        reloadData();
        showToast(`Stok Masuk ${updated.itemName} (${updated.quantity} ${updated.unit}) resmi disetujui ${isManager ? 'Manager' : 'Direktur'} dan ditambahkan ke saldo aktif!`);
      }
    } else {
      const updated = storageService.approveLogisticsOutflow(tx.id, approverName, approverRole);
      if (updated) {
        reloadData();
        showToast(`Pemakaian Stok Keluar ${updated.itemName} (${updated.quantity} ${updated.unit}) untuk unit ${updated.equipmentId || 'alat'} resmi disetujui ${isManager ? 'Manager' : 'Direktur'}!`);
      }
    }
  };

  // Manager & Director Rejection Handler (Inflow & Outflow with mandatory notes)
  const handleConfirmReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTxId) return;

    if (!rejectionReasonInput.trim()) {
      showToast('Mohon masukkan catatan keterangan penolakan secara jelas.', 'warning');
      return;
    }

    const tx = transactions.find((t) => t.id === rejectingTxId);
    if (!tx) return;

    if (tx.type === 'in') {
      const updated = storageService.rejectLogisticsInflow(rejectingTxId, approverName, rejectionReasonInput.trim(), approverRole);
      if (updated) {
        reloadData();
        setRejectingTxId(null);
        setRejectionReasonInput('');
        showToast(`Penerimaan stok masuk ditolak ${isManager ? 'Manager' : 'Direktur'}. Catatan penolakan diteruskan ke Pengawas.`, 'info');
      }
    } else {
      const updated = storageService.rejectLogisticsOutflow(rejectingTxId, approverName, rejectionReasonInput.trim(), approverRole);
      if (updated) {
        reloadData();
        setRejectingTxId(null);
        setRejectionReasonInput('');
        showToast(`Pemakaian stok keluar ditolak ${isManager ? 'Manager' : 'Direktur'}. Stok dikembalikan ke saldo inventaris.`, 'info');
      }
    }
  };

  // Compute pending inflow count
  const pendingInflowCount = transactions.filter((t) => t.type === 'in' && t.approvalStatus === 'pending').length;

  // Filtered transactions
  const filteredTransactions = transactions.filter((t) => {
    const matchCategory = categoryFilter === 'ALL' || t.category === categoryFilter;
    const matchType = typeFilter === 'ALL' || t.type === typeFilter;
    const matchStatus = statusFilter === 'ALL' || t.approvalStatus === statusFilter;
    const matchSearch = 
      !searchQuery ||
      t.itemName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (t.equipmentId && t.equipmentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.equipmentName && t.equipmentName.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.deliveryNoteNumber && t.deliveryNoteNumber.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (t.submittedByName && t.submittedByName.toLowerCase().includes(searchQuery.toLowerCase()));

    return matchCategory && matchType && matchStatus && matchSearch;
  });

  // Handler to export CSV
  const handleExportCsv = (mode: 'all' | 'in' | 'out') => {
    try {
      const todayStr = new Date().toISOString().slice(0, 10);
      let targetList = transactions;
      if (mode === 'in') {
        targetList = transactions.filter((t) => t.type === 'in');
      } else if (mode === 'out') {
        targetList = transactions.filter((t) => t.type === 'out');
      }

      let filename = `Laporan_Mutasi_Stok_Logistik_RBS_${todayStr}.csv`;
      let headers: string[] = [];
      let rows: string[][] = [];

      if (mode === 'in') {
        filename = `Laporan_Stok_Masuk_Logistik_RBS_${todayStr}.csv`;
        headers = [
          'No',
          'ID Transaksi',
          'Tanggal',
          'Waktu',
          'Kategori',
          'Nama Barang',
          'Jumlah Masuk',
          'Satuan',
          'Lokasi Penyimpanan',
          'No Surat Jalan (SJ)',
          'No PO Supplier',
          'Klien',
          'Blok Kerja',
          'Pengawas Penerima',
          'Status Otorisasi Direktur',
          'Diverifikasi Oleh',
          'Waktu Otorisasi',
          'Catatan / Alasan'
        ];
        rows = targetList.map((t, idx) => [
          String(idx + 1),
          t.id,
          t.date,
          t.timestamp || '',
          t.category,
          `"${t.itemName.replace(/"/g, '""')}"`,
          String(t.quantity),
          t.unit,
          `"${(t.sourceOrStorage || '').replace(/"/g, '""')}"`,
          `"${(t.deliveryNoteNumber || '').replace(/"/g, '""')}"`,
          `"${(t.supplierOrPoNumber || '').replace(/"/g, '""')}"`,
          `"${(t.clientName || '').replace(/"/g, '""')}"`,
          `"${(t.blockCode || '').replace(/"/g, '""')}"`,
          `"${(t.submittedByName || '').replace(/"/g, '""')}"`,
          t.approvalStatus === 'approved' ? 'Disetujui Direktur' : t.approvalStatus === 'pending' ? 'Menunggu Approval' : 'Ditolak',
          `"${(t.approvedByDirectorName || '').replace(/"/g, '""')}"`,
          `"${(t.approvedAt || '').replace(/"/g, '""')}"`,
          `"${(t.rejectionReason || t.notes || '').replace(/"/g, '""')}"`
        ]);
      } else if (mode === 'out') {
        filename = `Laporan_Stok_Keluar_Pemakaian_RBS_${todayStr}.csv`;
        headers = [
          'No',
          'ID Transaksi',
          'Tanggal',
          'Waktu',
          'Kategori',
          'Nama Barang',
          'Jumlah Keluar',
          'Satuan',
          'Unit Alat Berat',
          'HM Unit Saat Pemakaian',
          'Kegunaan / Keperluan',
          'Klien',
          'Blok Kerja',
          'Pengawas Lapangan',
          'Catatan'
        ];
        rows = targetList.map((t, idx) => [
          String(idx + 1),
          t.id,
          t.date,
          t.timestamp || '',
          t.category,
          `"${t.itemName.replace(/"/g, '""')}"`,
          String(t.quantity),
          t.unit,
          `"${(t.equipmentId || '')} ${(t.equipmentName || '')}".replace(/"/g, '""')`,
          t.equipmentHmAtUsage !== undefined ? String(t.equipmentHmAtUsage) : '-',
          `"${(t.purpose || '').replace(/"/g, '""')}"`,
          `"${(t.clientName || '').replace(/"/g, '""')}"`,
          `"${(t.blockCode || '').replace(/"/g, '""')}"`,
          `"${(t.submittedByName || '').replace(/"/g, '""')}"`,
          `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);
      } else {
        filename = `Rekap_Mutasi_Stok_Logistik_RBS_${todayStr}.csv`;
        headers = [
          'No',
          'ID Transaksi',
          'Tanggal',
          'Waktu',
          'Tipe Mutasi',
          'Kategori',
          'Nama Barang',
          'Jumlah',
          'Satuan',
          'Alat Berat / Tempat Simpan',
          'HM Unit / No SJ',
          'Keperluan / Info PO',
          'Klien',
          'Blok Kerja',
          'Petugas Lapangan',
          'Status Verifikasi',
          'Catatan'
        ];
        rows = targetList.map((t, idx) => [
          String(idx + 1),
          t.id,
          t.date,
          t.timestamp || '',
          t.type === 'in' ? 'Stok Masuk (Penerimaan)' : 'Stok Keluar (Pemakaian)',
          t.category,
          `"${t.itemName.replace(/"/g, '""')}"`,
          String(t.quantity),
          t.unit,
          `"${(t.type === 'out' ? `${t.equipmentId || ''} ${t.equipmentName || ''}` : t.sourceOrStorage || '').replace(/"/g, '""')}"`,
          t.type === 'out' ? (t.equipmentHmAtUsage !== undefined ? String(t.equipmentHmAtUsage) : '-') : `"${(t.deliveryNoteNumber || '').replace(/"/g, '""')}"`,
          `"${(t.type === 'out' ? t.purpose || '' : t.supplierOrPoNumber || '').replace(/"/g, '""')}"`,
          `"${(t.clientName || '').replace(/"/g, '""')}"`,
          `"${(t.blockCode || '').replace(/"/g, '""')}"`,
          `"${(t.submittedByName || '').replace(/"/g, '""')}"`,
          t.type === 'in' 
            ? (t.approvalStatus === 'approved' ? 'Disetujui Direktur' : t.approvalStatus === 'pending' ? 'Menunggu Approval' : 'Ditolak') 
            : 'Pemakaian Sah Lapangan',
          `"${(t.notes || t.rejectionReason || '').replace(/"/g, '""')}"`
        ]);
      }

      const csvContent = '\uFEFF' + [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      showToast(`Berhasil mengeksport ${targetList.length} baris data ke file ${filename}`, 'success');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      showToast('Gagal melakukan eksport data CSV.', 'warning');
    }
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Logistik Lapangan & Basecamp
              </span>
              <span className="text-xs text-slate-500 font-mono">PT. RBS GROUP</span>
              {pendingInflowCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 animate-pulse">
                  {pendingInflowCount} Menunggu Approval Direktur
                </span>
              )}
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Inventaris Logistik Lapangan (BBM Tangki, Pelumas & Spare Part)
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Pencatatan real-time penerimaan stok masuk oleh Pengawas, verifikasi & persetujuan Direktur, serta pencatatan pemakaian harian unit alat berat di titik lokasi kerja.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Input Stok Masuk (Bisa oleh Pengawas) */}
            <button
              onClick={() => {
                const catalog = getCatalogItems('BBM');
                setInflowForm({
                  date: new Date().toISOString().slice(0, 10),
                  category: 'BBM',
                  itemName: catalog[0].name,
                  quantity: 5000,
                  unit: catalog[0].unit,
                  clientId: effectiveClientId !== 'ALL' ? effectiveClientId : (clients[0]?.id || 'client-1'),
                  blockId: initialBlockId,
                  supplierOrPoNumber: '',
                  deliveryNoteNumber: '',
                  sourceOrStorage: 'Tangki Utama Basecamp (Kapasitas 10.000 L)',
                  notes: '',
                });
                setIsInflowModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <ArrowDownRight className="w-4 h-4" />
              <span>+ Input Stok Masuk (Penerimaan)</span>
            </button>

            {/* Input Pemakaian / Stok Keluar (HANYA PENGAWAS) */}
            {isSupervisor ? (
              <button
                onClick={() => {
                  const catalog = getCatalogItems('BBM');
                  setOutflowForm({
                    date: new Date().toISOString().slice(0, 10),
                    category: 'BBM',
                    itemName: catalog[0].name,
                    quantity: 110,
                    unit: catalog[0].unit,
                    clientId: effectiveClientId !== 'ALL' ? effectiveClientId : (clients[0]?.id || 'client-1'),
                    blockId: initialBlockId,
                    equipmentId: equipments[0]?.id || 'EX-01',
                    equipmentHmAtUsage: equipments[0]?.currentHm || 2150.0,
                    purpose: 'Saat pengisian solar di lapangan (Operasional Rutin)',
                    notes: '',
                  });
                  setIsOutflowModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <ArrowUpRight className="w-4 h-4" />
                <span>+ Catat Pemakaian Lapangan (Pengawas)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2 px-3.5 py-2 bg-amber-50 text-amber-900 text-xs rounded-xl border border-amber-200 shadow-2xs">
                <Info className="w-4 h-4 text-amber-600 shrink-0" />
                <div>
                  <span className="font-bold">Otorisasi Khusus Pengawas:</span> Pemakaian BBM & spare part dicatat Pengawas langsung di blok kerja secara real-time.
                </div>
              </div>
            )}

            {/* Tombol Cetak Dokumen Laporan Logistik */}
            <button
              onClick={() => openPrintModal('all')}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-amber-400 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              title="Buka Pratinjau Cetak Laporan Resmi Logistik & Save as PDF"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Laporan Logistik</span>
            </button>

            {/* Tombol Eksport Laporan Masuk CSV */}
            <button
              onClick={() => handleExportCsv('in')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
              title="Unduh Laporan Penerimaan Stok Masuk ke File Excel/CSV"
            >
              <Download className="w-4 h-4 text-emerald-600" />
              <span>Eksport Laporan Masuk (.CSV)</span>
            </button>

            {/* Tombol Eksport Laporan Keluar CSV */}
            <button
              onClick={() => handleExportCsv('out')}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 font-bold rounded-xl text-xs shadow-2xs transition cursor-pointer"
              title="Unduh Laporan Pemakaian Stok Keluar ke File Excel/CSV"
            >
              <Download className="w-4 h-4 text-amber-600" />
              <span>Eksport Laporan Keluar (.CSV)</span>
            </button>
          </div>
        </div>

        {/* Realtime Stock Summary Cards */}
        <div className="grid grid-cols-2 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-4">
          {/* Solar Card */}
          {(() => {
            const solItem = inventory.find((i) => i.category === 'BBM') || { stockQuantity: 4734, unit: 'Liter' };
            const pendingSol = transactions
              .filter((t) => t.category === 'BBM' && t.type === 'in' && t.approvalStatus === 'pending')
              .reduce((acc, t) => acc + t.quantity, 0);

            return (
              <div className="bg-amber-50/60 border border-amber-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 uppercase flex items-center gap-1">
                    <Fuel className="w-3.5 h-3.5 text-amber-600" />
                    Stok Tangki Solar B35
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-amber-200/70 text-amber-900 px-1.5 py-0.5 rounded">
                    Aktif Basecamp
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {solItem.stockQuantity.toLocaleString()} <span className="text-xs font-bold text-slate-500">Liter</span>
                </div>
                {pendingSol > 0 ? (
                  <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-600" />
                    <span>+{pendingSol.toLocaleString()} L menunggu approval Direktur</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Saldo stok fisik terverifikasi</div>
                )}
              </div>
            );
          })()}

          {/* Oli Mesin & Hidrolik Card */}
          {(() => {
            const oliEng = inventory.find((i) => i.code === 'OLI-ENG')?.stockQuantity || 180;
            const oliHyd = inventory.find((i) => i.code === 'OLI-HYD')?.stockQuantity || 140;

            return (
              <div className="bg-blue-50/60 border border-blue-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-blue-900 uppercase flex items-center gap-1">
                    <Droplet className="w-3.5 h-3.5 text-blue-600" />
                    Pelumas & Oli Unit
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-blue-200/70 text-blue-900 px-1.5 py-0.5 rounded">
                    Gudang Drum
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {(oliEng + oliHyd).toLocaleString()} <span className="text-xs font-bold text-slate-500">Liter</span>
                </div>
                <div className="text-[11px] text-slate-600 flex justify-between font-mono">
                  <span>Mesin: {oliEng} L</span>
                  <span>Hidrolik: {oliHyd} L</span>
                </div>
              </div>
            );
          })()}

          {/* Grease Card */}
          {(() => {
            const grsItem = inventory.find((i) => i.category === 'Grease') || { stockQuantity: 42, unit: 'Kg' };
            const pendingGrs = transactions
              .filter((t) => t.category === 'Grease' && t.type === 'in' && t.approvalStatus === 'pending')
              .reduce((acc, t) => acc + t.quantity, 0);

            return (
              <div className="bg-emerald-50/60 border border-emerald-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-900 uppercase flex items-center gap-1">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    Grease Chassis EP-2
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-emerald-200/70 text-emerald-900 px-1.5 py-0.5 rounded">
                    Workshop
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {grsItem.stockQuantity.toLocaleString()} <span className="text-xs font-bold text-slate-500">Kg</span>
                </div>
                {pendingGrs > 0 ? (
                  <div className="text-[11px] text-rose-700 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3 text-rose-600" />
                    <span>+{pendingGrs} Kg menunggu approval</span>
                  </div>
                ) : (
                  <div className="text-[11px] text-slate-500">Pelumasan pin & bushing</div>
                )}
              </div>
            );
          })()}

          {/* Spare Parts Card */}
          {(() => {
            const totalParts = inventory
              .filter((i) => i.category === 'Spare Part')
              .reduce((acc, i) => acc + i.stockQuantity, 0);

            return (
              <div className="bg-purple-50/60 border border-purple-200 rounded-xl p-3.5 space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-purple-900 uppercase flex items-center gap-1">
                    <Wrench className="w-3.5 h-3.5 text-purple-600" />
                    Spare Part Kritis
                  </span>
                  <span className="text-[10px] font-mono font-bold bg-purple-200/70 text-purple-900 px-1.5 py-0.5 rounded">
                    Ready Stock
                  </span>
                </div>
                <div className="text-2xl font-black text-slate-900 font-mono">
                  {totalParts} <span className="text-xs font-bold text-slate-500">Pcs Item</span>
                </div>
                <div className="text-[11px] text-slate-500">Hose hydraulic & filter alat</div>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="font-bold text-slate-700 flex items-center gap-1 mr-1">
            <Filter className="w-3.5 h-3.5 text-slate-400" />
            Filter Log:
          </span>

          {/* Filter Tipe Transaksi */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-slate-50 text-xs focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Jenis Transaksi</option>
            <option value="in">Stok Masuk (Penerimaan)</option>
            <option value="out">Stok Keluar (Pemakaian)</option>
          </select>

          {/* Filter Kategori */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-slate-50 text-xs focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Kategori Logistik</option>
            <option value="BBM">BBM Solar Industri</option>
            <option value="Oli">Pelumas & Oli Unit</option>
            <option value="Grease">Grease Pelumas</option>
            <option value="Spare Part">Spare Part Alat Berat</option>
          </select>

          {/* Filter Status Approval */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="px-3 py-1.5 border border-slate-300 rounded-xl font-bold text-slate-800 bg-slate-50 text-xs focus:ring-1 focus:ring-amber-500"
          >
            <option value="ALL">Semua Status Approval</option>
            <option value="pending">Menunggu Verifikasi Direktur</option>
            <option value="approved">Disetujui / Sah</option>
            <option value="rejected">Ditolak Direktur</option>
          </select>
        </div>

        {/* Search Bar */}
        <div className="relative w-full md:w-64">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input
            type="text"
            placeholder="Cari barang, no SJ, alat..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-xl bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500"
          />
        </div>
      </div>

      {/* Log History Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-sm flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400" />
              Laporan Log History Stok Masuk & Stok Keluar Logistik
            </h3>
            <p className="text-xs text-slate-400">
              Menampilkan {filteredTransactions.length} riwayat mutasi barang di proyek perkebunan.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => openPrintModal('in')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700/80 hover:bg-emerald-600 text-white text-[11px] font-bold rounded-lg transition cursor-pointer"
              title="Cetak Khusus Format Laporan Stok Masuk"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lap. Masuk</span>
            </button>

            <button
              onClick={() => openPrintModal('out')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-amber-600/90 hover:bg-amber-500 text-slate-950 text-[11px] font-bold rounded-lg transition cursor-pointer"
              title="Cetak Khusus Format Laporan Stok Keluar"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Cetak Lap. Keluar</span>
            </button>

            <button
              onClick={() => handleExportCsv(typeFilter === 'in' ? 'in' : typeFilter === 'out' ? 'out' : 'all')}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-[11px] font-bold rounded-lg transition cursor-pointer"
              title="Unduh data tabel saat ini ke CSV"
            >
              <Download className="w-3.5 h-3.5 text-amber-400" />
              <span>Eksport CSV</span>
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3">Waktu & Tanggal</th>
                <th className="p-3 text-center">Tipe Mutasi</th>
                <th className="p-3">Item / Barang</th>
                <th className="p-3 text-right">Jumlah</th>
                <th className="p-3">Unit Alat / Kegunaan</th>
                <th className="p-3">Pengawas Lapangan</th>
                <th className="p-3 text-center">Status & Verifikasi Direktur</th>
                <th className="p-3 text-center">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 text-xs">
                    Tidak ada riwayat logistik yang cocok dengan filter yang dipilih.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => {
                  const isInflow = tx.type === 'in';
                  const isPending = tx.approvalStatus === 'pending';
                  const isApproved = tx.approvalStatus === 'approved';
                  const isRejected = tx.approvalStatus === 'rejected';

                  return (
                    <tr key={tx.id} className="hover:bg-slate-50/80 transition">
                      {/* Tanggal & Waktu */}
                      <td className="p-3 font-mono text-slate-700 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{tx.date}</div>
                        <div className="text-[10px] text-slate-400">{tx.timestamp.split(' ')[1] || 'WIB'}</div>
                      </td>

                      {/* Tipe Mutasi */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {isInflow ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <ArrowDownRight className="w-3 h-3" />
                            STOK MASUK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <ArrowUpRight className="w-3 h-3" />
                            STOK KELUAR
                          </span>
                        )}
                      </td>

                      {/* Nama Barang & Kategori */}
                      <td className="p-3">
                        <div className="font-bold text-slate-900">{tx.itemName}</div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Kat: {tx.category} • {tx.blockCode || 'Blok AB'}
                        </div>
                      </td>

                      {/* Jumlah */}
                      <td className="p-3 text-right font-mono whitespace-nowrap">
                        <span className={`font-black text-sm ${isInflow ? 'text-emerald-700' : 'text-slate-900'}`}>
                          {isInflow ? `+${tx.quantity.toLocaleString()}` : `-${tx.quantity.toLocaleString()}`}
                        </span>
                        <span className="text-[11px] text-slate-500 font-semibold ml-1">{tx.unit}</span>
                      </td>

                      {/* Unit Alat / Kegunaan */}
                      <td className="p-3 text-slate-700">
                        {isInflow ? (
                          <div>
                            <div className="font-semibold text-slate-800">
                              SJ: {tx.deliveryNoteNumber || '-'}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono">
                              PO: {tx.supplierOrPoNumber || '-'}
                            </div>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-amber-800 flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-600" />
                              {tx.equipmentId || 'Unit Operasional'}
                              {tx.equipmentHmAtUsage ? (
                                <span className="text-[10px] font-mono text-slate-500">
                                  ({tx.equipmentHmAtUsage} HM)
                                </span>
                              ) : null}
                            </div>
                            <div className="text-[10px] text-slate-500 line-clamp-1">
                              {tx.purpose || 'Operasional Lapangan'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Pengawas */}
                      <td className="p-3 text-slate-700 whitespace-nowrap">
                        <div className="font-bold text-slate-900">{tx.submittedByName}</div>
                        <div className="text-[10px] text-slate-400">Pengawas Lapangan</div>
                      </td>

                      {/* Status & Verifikasi Manajemen */}
                      <td className="p-3 text-center whitespace-nowrap">
                        {isPending ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600 animate-spin" />
                            Menunggu Approval
                          </span>
                        ) : isApproved ? (
                          <div className="inline-flex flex-col items-center">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                              <ShieldCheck className="w-3 h-3 text-emerald-600" />
                              {tx.approvedByRole === 'manager' ? 'Disetujui Manager' : 'Disetujui Direktur'}
                            </span>
                            <span className="text-[9px] text-slate-400 font-mono mt-0.5">
                              {tx.approvedByDirectorName?.split(' ')[0] || (tx.approvedByRole === 'manager' ? 'Manager' : 'Direktur')}
                            </span>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDetailTx(tx)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300 hover:bg-rose-200 cursor-pointer"
                            title={tx.rejectionReason || 'Ditolak dengan Catatan'}
                          >
                            <XCircle className="w-3 h-3 text-rose-600" />
                            {tx.approvedByRole === 'manager' ? 'Ditolak Manager' : 'Ditolak'} (Catatan)
                          </button>
                        )}
                      </td>

                      {/* Aksi */}
                      <td className="p-3 text-center whitespace-nowrap">
                        <div className="inline-flex items-center gap-1.5">
                          {/* Otorisasi Manajemen (Manager & Direktur) untuk Stok Masuk & Stok Keluar */}
                          {canAuthorizeLogistics && isPending && (
                            <>
                              <button
                                onClick={() => handleApproveTransaction(tx)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Verifikasi & Setujui transaksi mutasi stok ini"
                              >
                                <Check className="w-3 h-3" />
                                <span>Setujui</span>
                              </button>
                              <button
                                onClick={() => {
                                  setRejectingTxId(tx.id);
                                  setRejectionReasonInput('');
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-500 text-white rounded-lg text-[10px] font-bold shadow-xs transition flex items-center gap-1 cursor-pointer"
                                title="Tolak dengan catatan alasan"
                              >
                                <X className="w-3 h-3" />
                                <span>Tolak</span>
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => setDetailTx(tx)}
                            className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[10px] font-bold border border-slate-300 transition cursor-pointer"
                          >
                            Detail
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

      {/* MODAL 1: INPUT STOK MASUK (Penerimaan) */}
      {isInflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                  Penerimaan Logistik Lapangan
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  + Input Penerimaan Stok Masuk
                </h3>
                <p className="text-xs text-slate-500">
                  Data stok masuk di-input oleh Pengawas Lapangan dan diverifikasi oleh Direktur.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsInflowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitInflow} className="space-y-3.5 text-xs">
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 flex items-start gap-2 text-blue-900 text-[11px]">
                <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Alur Verifikasi Direktur:</strong> Data stok masuk di-input oleh Pengawas Lapangan dan berstatus <em>"Menunggu Approval Direktur"</em>. Saldo stok aktif baru bertambah setelah disetujui resmi oleh Direktur.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Barang</label>
                  <select
                    value={inflowForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as LogisticsCategory;
                      const catalog = getCatalogItems(cat);
                      setInflowForm({
                        ...inflowForm,
                        category: cat,
                        itemName: catalog[0].name,
                        unit: catalog[0].unit,
                        quantity: cat === 'BBM' ? 5000 : cat === 'Oli' ? 200 : cat === 'Grease' ? 30 : 2,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                  >
                    <option value="BBM">BBM Solar Industri</option>
                    <option value="Oli">Pelumas & Oli Unit</option>
                    <option value="Grease">Grease Pelumas</option>
                    <option value="Spare Part">Spare Part Alat Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Penerimaan</label>
                  <input
                    type="date"
                    required
                    value={inflowForm.date}
                    onChange={(e) => setInflowForm({ ...inflowForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang / Spesifikasi</label>
                <input
                  type="text"
                  required
                  list="catalog-inflow-options"
                  value={inflowForm.itemName}
                  onChange={(e) => setInflowForm({ ...inflowForm, itemName: e.target.value })}
                  placeholder="Contoh: Solar Industri B35"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm"
                />
                <datalist id="catalog-inflow-options">
                  {getCatalogItems(inflowForm.category).map((c, i) => (
                    <option key={i} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Diterima</label>
                  <input
                    type="number"
                    min="1"
                    step="any"
                    required
                    value={inflowForm.quantity}
                    onChange={(e) => setInflowForm({ ...inflowForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={inflowForm.unit}
                    onChange={(e) => setInflowForm({ ...inflowForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. Surat Jalan (SJ)</label>
                  <input
                    type="text"
                    placeholder="Contoh: SJ-PTM-883501"
                    value={inflowForm.deliveryNoteNumber}
                    onChange={(e) => setInflowForm({ ...inflowForm, deliveryNoteNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. PO / Kontrak Supplier</label>
                  <input
                    type="text"
                    placeholder="Contoh: PO-SRY/BBM/IX/095"
                    value={inflowForm.supplierOrPoNumber}
                    onChange={(e) => setInflowForm({ ...inflowForm, supplierOrPoNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Klien Proyek</span>
                    {isSupervisor && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </label>
                  {isSupervisor ? (
                    <div className="w-full px-3 py-2 border border-amber-300 rounded-lg font-bold bg-amber-50 text-slate-900 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{clients.find((c) => c.id === inflowForm.clientId)?.name || authUser?.assignedClientName || 'PT. A'}</span>
                    </div>
                  ) : (
                    <select
                      value={inflowForm.clientId}
                      onChange={(e) => setInflowForm({ ...inflowForm, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {c.fullCompanyName}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Lokasi Kerja / Blok</span>
                    {isSupervisor && assignedBlockCodes && (
                      <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">
                        Tugas Resmi
                      </span>
                    )}
                  </label>
                  <select
                    value={inflowForm.blockId}
                    onChange={(e) => setInflowForm({ ...inflowForm, blockId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white"
                  >
                    {blocks
                      .filter((b) => {
                        if (b.clientId !== inflowForm.clientId) return false;
                        if (isSupervisor && assignedBlockCodes && !assignedBlockCodes.includes(b.code)) return false;
                        return true;
                      })
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Penyimpanan di Lapangan</label>
                <input
                  type="text"
                  placeholder="Contoh: Tangki Utama Basecamp (Kapasitas 10.000 L)"
                  value={inflowForm.sourceOrStorage}
                  onChange={(e) => setInflowForm({ ...inflowForm, sourceOrStorage: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Pengawas (Kondisi Segel / Tera)</label>
                <textarea
                  rows={2}
                  placeholder="Catatan kondisi penerimaan, segel tangki, tera meteran, atau kelengkapan dokumen..."
                  value={inflowForm.notes}
                  onChange={(e) => setInflowForm({ ...inflowForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              {/* Info Notice */}
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Prosedur Kontrol Otorisasi:</strong> Data stok masuk ini berstatus <span className="underline font-bold">Menunggu Persetujuan Direktur</span>. Saldo fisik aktif di basecamp baru akan bertambah setelah diverifikasi dan disetujui Direktur.
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsInflowModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl shadow cursor-pointer"
                >
                  Ajukan Stok Masuk
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: INPUT PEMAKAIAN / STOK KELUAR (HANYA PENGAWAS) */}
      {isOutflowModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-900 bg-amber-100 px-2 py-0.5 rounded">
                  Otorisasi: Khusus Pengawas Lapangan
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  + Catat Pemakaian Lapangan (Stok Keluar)
                </h3>
                <p className="text-xs text-slate-500">
                  Dicatat langsung di titik unit (Blok kerja) saat pengisian solar atau perbaikan alat berlangsung.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsOutflowModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitOutflow} className="space-y-3.5 text-xs">
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2 text-amber-900 text-[11px]">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <p>
                  <strong>Pencatatan Lapangan Real-Time:</strong> Pengawas berada langsung di titik lokasi kerja (Blok) saat pengisian BBM atau perbaikan alat berlangsung, sehingga data yang dimasukkan bersifat real-time dan dicocokkan langsung dengan Hour Meter (HM) alat berat.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Barang</label>
                  <select
                    value={outflowForm.category}
                    onChange={(e) => {
                      const cat = e.target.value as LogisticsCategory;
                      const catalog = getCatalogItems(cat);
                      setOutflowForm({
                        ...outflowForm,
                        category: cat,
                        itemName: catalog[0].name,
                        unit: catalog[0].unit,
                        quantity: cat === 'BBM' ? 100 : cat === 'Oli' ? 20 : cat === 'Grease' ? 2 : 1,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                  >
                    <option value="BBM">BBM Solar Industri</option>
                    <option value="Oli">Pelumas & Oli Unit</option>
                    <option value="Grease">Grease Pelumas</option>
                    <option value="Spare Part">Spare Part Alat Berat</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tanggal Transaksi</label>
                  <input
                    type="date"
                    required
                    value={outflowForm.date}
                    onChange={(e) => setOutflowForm({ ...outflowForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Barang / Logistik</label>
                <input
                  type="text"
                  required
                  list="catalog-outflow-options"
                  value={outflowForm.itemName}
                  onChange={(e) => setOutflowForm({ ...outflowForm, itemName: e.target.value })}
                  placeholder="Contoh: Solar Industri B35"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm"
                />
                <datalist id="catalog-outflow-options">
                  {getCatalogItems(outflowForm.category).map((c, i) => (
                    <option key={i} value={c.name} />
                  ))}
                </datalist>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Jumlah Terpakai</label>
                  <input
                    type="number"
                    min="0.1"
                    step="any"
                    required
                    value={outflowForm.quantity}
                    onChange={(e) => setOutflowForm({ ...outflowForm, quantity: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-black text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Satuan</label>
                  <input
                    type="text"
                    required
                    value={outflowForm.unit}
                    onChange={(e) => setOutflowForm({ ...outflowForm, unit: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold"
                  />
                </div>
              </div>

              {/* DROPDOWN ALAT BERAT & HOUR METER (HM) */}
              <div className="p-3.5 bg-amber-50/70 border border-amber-300 rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                    <Truck className="w-4 h-4 text-amber-600" />
                    Pilihan Unit Alat Berat (Tercocokkan ke Lapangan)
                  </span>
                  <span className="text-[10px] font-mono text-amber-800 font-bold">Real-time HM</span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Pilih Alat Berat:
                    </label>
                    <select
                      value={outflowForm.equipmentId}
                      onChange={(e) => {
                        const eq = equipments.find((x) => x.id === e.target.value);
                        setOutflowForm({
                          ...outflowForm,
                          equipmentId: e.target.value,
                          equipmentHmAtUsage: eq?.currentHm || 2000,
                        });
                      }}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg font-bold bg-white text-slate-900"
                    >
                      {equipments.map((eq) => (
                        <option key={eq.id} value={eq.id}>
                          {eq.id} — {eq.name} ({eq.status})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                      Hour Meter (HM) Saat Transaksi:
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      required
                      value={outflowForm.equipmentHmAtUsage}
                      onChange={(e) => setOutflowForm({ ...outflowForm, equipmentHmAtUsage: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-2 border border-amber-300 rounded-lg font-mono font-black text-slate-900 bg-white"
                    />
                  </div>
                </div>
              </div>

              {/* KEGUNAAN PEMAKAIAN (Dropdown Alasan) */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Pemberitahuan Kegunaan / Keperluan Transaksi:
                </label>
                <select
                  value={outflowForm.purpose}
                  onChange={(e) => setOutflowForm({ ...outflowForm, purpose: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white text-slate-900"
                >
                  <option value="Saat pengisian solar di lapangan (Operasional Rutin)">
                    Saat pengisian solar di lapangan (Operasional Rutin)
                  </option>
                  <option value="Saat perbaikan/perawatan alat (Servis Berkala)">
                    Saat perbaikan/perawatan alat (Servis Berkala)
                  </option>
                  <option value="Penggantian spare part rusak (Breakdown)">
                    Penggantian spare part rusak (Breakdown)
                  </option>
                  <option value="Pelumasan pin & bushing (Greasing harian)">
                    Pelumasan pin & bushing (Greasing harian)
                  </option>
                  <option value="Pengisian genset & penerangan basecamp">
                    Pengisian genset & penerangan basecamp
                  </option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Klien Proyek</span>
                    {isSupervisor && (
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                        <Lock className="w-2.5 h-2.5" /> Terkunci
                      </span>
                    )}
                  </label>
                  {isSupervisor ? (
                    <div className="w-full px-3 py-2 border border-amber-300 rounded-lg font-bold bg-amber-50 text-slate-900 text-xs flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                      <span className="truncate">{clients.find((c) => c.id === outflowForm.clientId)?.name || authUser?.assignedClientName || 'PT. A'}</span>
                    </div>
                  ) : (
                    <select
                      value={outflowForm.clientId}
                      onChange={(e) => setOutflowForm({ ...outflowForm, clientId: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white"
                    >
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                    <span>Lokasi Blok Kerja</span>
                    {isSupervisor && assignedBlockCodes && (
                      <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100 px-1.5 py-0.5 rounded">
                        Tugas Resmi
                      </span>
                    )}
                  </label>
                  <select
                    value={outflowForm.blockId}
                    onChange={(e) => setOutflowForm({ ...outflowForm, blockId: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold bg-white"
                  >
                    {blocks
                      .filter((b) => {
                        if (b.clientId !== outflowForm.clientId) return false;
                        if (isSupervisor && assignedBlockCodes && !assignedBlockCodes.includes(b.code)) return false;
                        return true;
                      })
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code}
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Catatan Keterangan Lapangan</label>
                <textarea
                  rows={2}
                  placeholder="Keterangan kondisi alat, posisi unit di blok, atau mekanik yang menangani..."
                  value={outflowForm.notes}
                  onChange={(e) => setOutflowForm({ ...outflowForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsOutflowModalOpen(false)}
                  className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow cursor-pointer"
                >
                  Simpan Pemakaian Unit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: PENOLAKAN DENGAN CATATAN (OTORISASI MANAGER & DIREKTUR) */}
      {rejectingTxId && (() => {
        const targetTx = transactions.find((t) => t.id === rejectingTxId);
        const isTargetIn = targetTx?.type === 'in';

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
              <div className="border-b border-rose-100 pb-3 flex items-start gap-3">
                <div className="p-2 bg-rose-100 rounded-xl text-rose-700">
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="text-base font-black text-rose-900">
                    Konfirmasi Penolakan {isTargetIn ? 'Stok Masuk' : 'Stok Keluar'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sebagai {isManager ? 'Manager Operasional' : 'Direktur'}, berikan catatan alasan penolakan mutasi {targetTx?.itemName} ({targetTx?.quantity} {targetTx?.unit}) yang wajib dibaca oleh Pengawas Lapangan.
                  </p>
                </div>
              </div>

              <form onSubmit={handleConfirmReject} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Catatan / Alasan Penolakan {isManager ? 'Manager' : 'Direktur'}: <span className="text-rose-600">*</span>
                  </label>
                  <textarea
                    required
                    rows={4}
                    placeholder={
                      isTargetIn
                        ? 'Contoh: No Surat Jalan tidak cocok dengan PO supplier pusat, atau tera volume tangki susut melebihi toleransi...'
                        : 'Contoh: Pemakaian tidak wajar melebihi jam kerja HM alat, atau unit excavator tersebut sedang standby di posko...'
                    }
                    value={rejectionReasonInput}
                    onChange={(e) => setRejectionReasonInput(e.target.value)}
                    className="w-full px-3 py-2 border border-rose-300 rounded-xl font-medium focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setRejectingTxId(null)}
                    className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer"
                  >
                    Tolak {isTargetIn ? 'Stok Masuk' : 'Stok Keluar'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL 4: DETAIL TRANSAKSI */}
      {detailTx && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3 flex justify-between items-center">
              <div>
                <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${detailTx.type === 'in' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-900'}`}>
                  {detailTx.type === 'in' ? 'STOK MASUK (Penerimaan)' : 'STOK KELUAR (Pemakaian)'}
                </span>
                <h3 className="text-base font-black text-slate-900 mt-1">
                  {detailTx.itemName} ({detailTx.quantity} {detailTx.unit})
                </h3>
                <p className="text-xs text-slate-500 font-mono">ID: {detailTx.id} • {detailTx.timestamp}</p>
              </div>
              <button
                type="button"
                onClick={() => setDetailTx(null)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="grid grid-cols-2 gap-2 bg-slate-50 p-3 rounded-xl">
                <div>
                  <span className="text-slate-500 block">Klien & Lokasi:</span>
                  <strong className="text-slate-900">{detailTx.clientName || 'PT. A'} ({detailTx.blockCode || 'Blok AB'})</strong>
                </div>
                <div>
                  <span className="text-slate-500 block">Pengawas Pelapor:</span>
                  <strong className="text-slate-900">{detailTx.submittedByName}</strong>
                </div>
              </div>

              {detailTx.type === 'in' ? (
                <div className="space-y-1.5 p-3 bg-slate-50 rounded-xl">
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. Surat Jalan:</span>
                    <strong className="font-mono">{detailTx.deliveryNoteNumber || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">No. PO Supplier:</span>
                    <strong className="font-mono">{detailTx.supplierOrPoNumber || '-'}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Lokasi Simpan:</span>
                    <span>{detailTx.sourceOrStorage || '-'}</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-1.5 p-3 bg-amber-50/60 rounded-xl border border-amber-200">
                  <div className="flex justify-between">
                    <span className="text-slate-600">Unit Alat Berat:</span>
                    <strong className="text-amber-900 font-mono">{detailTx.equipmentName || detailTx.equipmentId}</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Hour Meter (HM):</span>
                    <strong className="text-slate-900 font-mono">{detailTx.equipmentHmAtUsage || '-'} HM</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-600">Pemberitahuan Kegunaan:</span>
                    <span className="font-semibold text-slate-800">{detailTx.purpose}</span>
                  </div>
                </div>
              )}

              {/* Status Otorisasi */}
              <div className="p-3 bg-slate-100 rounded-xl">
                <span className="text-slate-500 block mb-1">Status Verifikasi Direktur:</span>
                {detailTx.approvalStatus === 'approved' ? (
                  <div className="text-emerald-700 font-bold flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-emerald-600" />
                    <span>Disetujui oleh {detailTx.approvedByDirectorName || 'Direktur'} ({detailTx.approvedAt || 'Sah'})</span>
                  </div>
                ) : detailTx.approvalStatus === 'pending' ? (
                  <div className="text-amber-800 font-bold flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Menunggu Verifikasi & Persetujuan Direktur</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="text-rose-700 font-bold flex items-center gap-1.5">
                      <XCircle className="w-4 h-4 text-rose-600" />
                      <span>Ditolak oleh {detailTx.approvedByDirectorName || 'Direktur'} ({detailTx.approvedAt})</span>
                    </div>
                    {detailTx.rejectionReason && (
                      <div className="p-2 bg-rose-50 border border-rose-200 rounded-lg text-rose-900 text-[11px] font-medium">
                        <strong>Catatan Penolakan:</strong> "{detailTx.rejectionReason}"
                      </div>
                    )}
                  </div>
                )}
              </div>

              {detailTx.notes && (
                <div className="text-slate-600">
                  <span className="text-slate-400 block font-medium">Catatan:</span>
                  <p className="italic bg-slate-50 p-2.5 rounded-lg border border-slate-200">{detailTx.notes}</p>
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailTx(null)}
                className="px-5 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Logistics Official Print & Export Modal */}
      {isPrintModalOpen && (
        <LogisticsPrintModal
          isOpen={isPrintModalOpen}
          onClose={() => setIsPrintModalOpen(false)}
          transactions={transactions}
          inventory={inventory}
          clients={clients}
          blocks={blocks}
          equipments={equipments}
          selectedClientId={selectedClientId}
          initialMode={printModalInitialMode}
          showToast={showToast}
        />
      )}
    </div>
  );
};
