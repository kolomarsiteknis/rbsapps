import React, { useState, useMemo, useEffect } from 'react';
import { 
  Printer, 
  Download, 
  X, 
  FileText, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Filter, 
  Building2, 
  Fuel, 
  Droplet, 
  Wrench, 
  Package,
  Calendar,
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  ShieldCheck
} from 'lucide-react';
import { 
  LogisticsTransaction, 
  InventoryItem, 
  Client, 
  Block, 
  Equipment, 
  LogisticsCategory,
  CompanyProfile,
  CompanyStaff
} from '../types';
import { storageService } from '../services/storageService';

interface LogisticsPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  transactions: LogisticsTransaction[];
  inventory: InventoryItem[];
  clients: Client[];
  blocks: Block[];
  equipments: Equipment[];
  selectedClientId: string;
  initialMode?: 'all' | 'in' | 'out';
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
}

export const LogisticsPrintModal: React.FC<LogisticsPrintModalProps> = ({
  isOpen,
  onClose,
  transactions,
  inventory,
  clients,
  blocks,
  equipments,
  selectedClientId,
  initialMode = 'all',
  showToast,
}) => {
  const [reportType, setReportType] = useState<'all' | 'in' | 'out'>(initialMode);
  const [categoryFilter, setCategoryFilter] = useState<'ALL' | LogisticsCategory>('ALL');
  const [clientFilter, setClientFilter] = useState<string>(selectedClientId || 'ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'approved' | 'pending' | 'rejected'>('ALL');
  
  // Date range filters (default to current month)
  const todayStr = new Date().toISOString().slice(0, 10);
  const [startDate, setStartDate] = useState<string>('2026-09-01');
  const [endDate, setEndDate] = useState<string>(todayStr);

  const companyProfile: CompanyProfile = storageService.getCompanyProfile();
  const companyStaff: CompanyStaff[] = storageService.getCompanyStaff();

  const supervisorStaff = companyStaff.find(
    (s) => s.staffLevel === 'Pengawas' || (s.jobRole || '').toLowerCase().includes('pengawas') || (s.jobRole || '').toLowerCase().includes('logistik')
  );
  const directorStaff = companyStaff.find(
    (s) => s.staffLevel === 'Direktur' || (s.jobRole || '').toLowerCase().includes('direktur')
  );

  // Sync mode and client when modal opens
  useEffect(() => {
    if (isOpen) {
      setReportType(initialMode);
      setClientFilter(selectedClientId || 'ALL');
    }
  }, [isOpen, initialMode, selectedClientId]);

  // Filtered transactions (Hook must be called unconditionally before any early return)
  const filteredList = useMemo(() => {
    return transactions.filter((t) => {
      // Type
      if (reportType !== 'all' && t.type !== reportType) return false;
      // Category
      if (categoryFilter !== 'ALL' && t.category !== categoryFilter) return false;
      // Client
      if (clientFilter !== 'ALL' && t.clientId && t.clientId !== 'ALL' && t.clientId !== clientFilter) return false;
      // Status
      if (statusFilter !== 'ALL' && t.approvalStatus !== statusFilter) return false;
      // Date range
      if (startDate && t.date < startDate) return false;
      if (endDate && t.date > endDate) return false;
      return true;
    }).sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [transactions, reportType, categoryFilter, clientFilter, statusFilter, startDate, endDate]);

  // Statistics calculation for the current view
  const stats = useMemo(() => {
    const totalInflowSolar = filteredList
      .filter((t) => t.type === 'in' && t.category === 'BBM' && t.approvalStatus === 'approved')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalOutflowSolar = filteredList
      .filter((t) => t.type === 'out' && t.category === 'BBM')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalInflowOli = filteredList
      .filter((t) => t.type === 'in' && t.category === 'Oli' && t.approvalStatus === 'approved')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalOutflowOli = filteredList
      .filter((t) => t.type === 'out' && t.category === 'Oli')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalInflowGrease = filteredList
      .filter((t) => t.type === 'in' && t.category === 'Grease' && t.approvalStatus === 'approved')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalOutflowGrease = filteredList
      .filter((t) => t.type === 'out' && t.category === 'Grease')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalInflowParts = filteredList
      .filter((t) => t.type === 'in' && t.category === 'Spare Part' && t.approvalStatus === 'approved')
      .reduce((acc, t) => acc + t.quantity, 0);

    const totalOutflowParts = filteredList
      .filter((t) => t.type === 'out' && t.category === 'Spare Part')
      .reduce((acc, t) => acc + t.quantity, 0);

    const pendingCount = filteredList.filter((t) => t.type === 'in' && t.approvalStatus === 'pending').length;

    return {
      totalInflowSolar,
      totalOutflowSolar,
      totalInflowOli,
      totalOutflowOli,
      totalInflowGrease,
      totalOutflowGrease,
      totalInflowParts,
      totalOutflowParts,
      pendingCount,
    };
  }, [filteredList]);

  // Current physical stock from inventory
  const currentFuel = inventory.find((i) => i.category === 'BBM')?.stockQuantity || 0;
  const currentOli = inventory.filter((i) => i.category === 'Oli').reduce((acc, i) => acc + i.stockQuantity, 0);
  const currentGrease = inventory.find((i) => i.category === 'Grease')?.stockQuantity || 0;
  const currentParts = inventory.filter((i) => i.category === 'Spare Part').reduce((acc, i) => acc + i.stockQuantity, 0);

  // Active client label
  const activeClientName = clientFilter === 'ALL' 
    ? 'Seluruh Klien (Konsolidasi Proyek)' 
    : clients.find((c) => c.id === clientFilter)?.name || 'Klien Proyek';

  // Format currency or numbers
  const formatNum = (n: number) => n.toLocaleString('id-ID');

  // Trigger browser print
  const handlePrint = () => {
    window.print();
  };

  // Export CSV generator
  const handleExportCsv = () => {
    try {
      let headers: string[] = [];
      let rows: string[][] = [];
      let filename = 'Laporan_Logistik_Suryaland.csv';

      if (reportType === 'in') {
        filename = `Laporan_Stok_Masuk_Logistik_${startDate}_sd_${endDate}.csv`;
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
          'Pengawas Lapangan',
          'Status Otorisasi Direktur',
          'Diverifikasi Oleh',
          'Waktu Otorisasi',
          'Catatan / Alasan'
        ];
        rows = filteredList.map((t, idx) => [
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
      } else if (reportType === 'out') {
        filename = `Laporan_Stok_Keluar_Pemakaian_${startDate}_sd_${endDate}.csv`;
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
        rows = filteredList.map((t, idx) => [
          String(idx + 1),
          t.id,
          t.date,
          t.timestamp || '',
          t.category,
          `"${t.itemName.replace(/"/g, '""')}"`,
          String(t.quantity),
          t.unit,
          `"${(t.equipmentId || '')} - ${(t.equipmentName || '')}".replace(/"/g, '""')`,
          t.equipmentHmAtUsage !== undefined ? String(t.equipmentHmAtUsage) : '-',
          `"${(t.purpose || '').replace(/"/g, '""')}"`,
          `"${(t.clientName || '').replace(/"/g, '""')}"`,
          `"${(t.blockCode || '').replace(/"/g, '""')}"`,
          `"${(t.submittedByName || '').replace(/"/g, '""')}"`,
          `"${(t.notes || '').replace(/"/g, '""')}"`
        ]);
      } else {
        filename = `Rekap_Mutasi_Stok_Logistik_${startDate}_sd_${endDate}.csv`;
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
          'Keperluan / Status PO',
          'Klien',
          'Blok Kerja',
          'Pengawas Lapangan',
          'Status Verifikasi',
          'Catatan'
        ];
        rows = filteredList.map((t, idx) => [
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

      // Add UTF-8 BOM so Excel opens it with proper encoding
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

      showToast(`Berhasil mengeksport ${filteredList.length} baris data ke file ${filename}`, 'success');
    } catch (err) {
      console.error('Failed to export CSV:', err);
      showToast('Gagal melakukan eksport data CSV.', 'warning');
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      {/* Container */}
      <div className="bg-white w-full max-w-5xl rounded-2xl shadow-2xl border border-slate-300 flex flex-col max-h-[94vh] overflow-hidden">
        
        {/* NON-PRINTABLE TOP TOOLBAR / CONTROLS */}
        <div className="p-4 bg-slate-900 text-white flex flex-col md:flex-row md:items-center justify-between gap-3 border-b border-slate-800 print:hidden">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold shadow">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight text-white flex items-center gap-2">
                <span>Cetak & Eksport Laporan Logistik Lapangan</span>
                <span className="text-[10px] uppercase font-bold bg-amber-400 text-slate-950 px-2 py-0.5 rounded">
                  Format Resmi
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Pilih format laporan (Stok Masuk, Stok Keluar, atau Rekapitulasi) lalu cetak PDF atau unduh file CSV.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black rounded-xl shadow transition cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak / Simpan PDF</span>
            </button>

            <button
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Eksport (.CSV / Excel)</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition cursor-pointer"
              title="Tutup Modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* NON-PRINTABLE FILTER CONTROLS */}
        <div className="bg-slate-100 p-3 sm:p-4 border-b border-slate-200 text-xs flex flex-wrap items-center justify-between gap-3 print:hidden">
          {/* Format / Type Buttons */}
          <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300 shadow-2xs">
            <button
              onClick={() => setReportType('all')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'all'
                  ? 'bg-slate-900 text-amber-400 font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Rekap Mutasi (Semua)</span>
            </button>
            <button
              onClick={() => setReportType('in')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'in'
                  ? 'bg-emerald-700 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowDownRight className="w-3.5 h-3.5" />
              <span>Laporan Stok Masuk</span>
            </button>
            <button
              onClick={() => setReportType('out')}
              className={`px-3 py-1.5 rounded-lg font-bold transition flex items-center gap-1.5 cursor-pointer ${
                reportType === 'out'
                  ? 'bg-amber-600 text-white font-black shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
              <span>Laporan Stok Keluar</span>
            </button>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Category Filter */}
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value as any)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
            >
              <option value="ALL">Semua Kategori</option>
              <option value="BBM">BBM Solar</option>
              <option value="Oli">Pelumas & Oli</option>
              <option value="Grease">Grease EP-2</option>
              <option value="Spare Part">Spare Part</option>
            </select>

            {/* Client Filter */}
            <select
              value={clientFilter}
              onChange={(e) => setClientFilter(e.target.value)}
              className="px-2.5 py-1.5 border border-slate-300 rounded-lg font-bold text-slate-800 bg-white"
            >
              <option value="ALL">Semua Klien</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            {/* Date Range */}
            <div className="flex items-center gap-1.5 bg-white px-2 py-1 border border-slate-300 rounded-lg">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-[11px] font-mono focus:outline-none"
              />
              <span className="text-slate-400 font-bold">s/d</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-[11px] font-mono focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* PRINTABLE REPORT PREVIEW CONTAINER */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-8 bg-slate-50 print:bg-white print:p-0 print:overflow-visible">
          {/* A4 Paper styled container */}
          <div className="bg-white max-w-4xl mx-auto p-6 sm:p-10 rounded-xl shadow-lg border border-slate-200 print:shadow-none print:border-none print:p-0 text-slate-900 font-sans space-y-6">
            
            {/* 1. KOP SURAT RESMI PERUSAHAAN */}
            <div className="border-b-2 border-slate-900 pb-4">
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2.5 mb-1">
                    <div className="w-10 h-10 bg-slate-950 rounded-xl p-1 flex items-center justify-center border border-slate-800 shrink-0 overflow-hidden">
                      {companyProfile.logoUrl ? (
                        <img 
                          src={companyProfile.logoUrl} 
                          alt="Logo" 
                          className="w-full h-full object-contain"
                        />
                      ) : (
                        <span className="text-amber-400 font-black text-sm">{companyProfile.shortName.slice(0, 3)}</span>
                      )}
                    </div>
                    <div>
                      <h1 className="text-xl sm:text-2xl font-black text-slate-950 tracking-tight leading-none uppercase">
                        {companyProfile.officialName || 'PT. RBS GROUP'}
                      </h1>
                      <span className="text-[11px] font-bold text-amber-700 uppercase tracking-widest block mt-0.5">
                        {companyProfile.tagline || 'Kontraktor Land Clearing, Heavy Equipment & Perkebunan'}
                      </span>
                    </div>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-tight">
                    Kantor: {companyProfile.headOfficeAddress} | Telp: {companyProfile.phone} | Email: {companyProfile.email}
                  </p>
                </div>

                <div className="text-right text-[11px] text-slate-500 font-mono hidden sm:block">
                  <div>No. Dokumen: <strong className="text-slate-900 font-bold">{companyProfile.shortName || 'SRY'}-LOG/{startDate.replace(/-/g, '')}</strong></div>
                  <div>Tanggal Cetak: <strong className="text-slate-900">{todayStr}</strong></div>
                  <div>Halaman: <strong>1 / 1</strong></div>
                </div>
              </div>
            </div>

            {/* 2. JUDUL DOKUMEN LAPORAN */}
            <div className="text-center py-2 border-b border-slate-200">
              <h2 className="text-lg sm:text-xl font-black text-slate-950 uppercase tracking-wide">
                {reportType === 'in' 
                  ? 'LAPORAN RESMI STOK MASUK (PENERIMAAN LOGISTIK LAPANGAN)'
                  : reportType === 'out'
                  ? 'LAPORAN RESMI STOK KELUAR (PEMAKAIAN UNIT ALAT BERAT)'
                  : 'REKAPITULASI RESMI MUTASI & SALDO INVENTARIS LOGISTIK'
                }
              </h2>
              <div className="text-xs text-slate-600 mt-1 flex flex-wrap items-center justify-center gap-3">
                <span>Periode: <strong className="font-mono text-slate-900 font-bold">{startDate} s/d {endDate}</strong></span>
                <span>•</span>
                <span>Portofolio: <strong className="text-slate-900 font-bold">{activeClientName}</strong></span>
                <span>•</span>
                <span>Kategori: <strong className="text-slate-900 font-bold">{categoryFilter === 'ALL' ? 'Semua Kategori' : categoryFilter}</strong></span>
              </div>
            </div>

            {/* 3. EXECUTIVE LOGISTICS SUMMARY TILES */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs">
              {/* Solar Tile */}
              <div className="p-2.5 bg-white rounded-lg border border-amber-200">
                <div className="flex items-center justify-between text-amber-900 font-bold text-[11px] uppercase">
                  <span>BBM Solar B35</span>
                  <Fuel className="w-3.5 h-3.5 text-amber-600" />
                </div>
                <div className="text-base font-black text-slate-900 mt-1 font-mono">
                  {formatNum(currentFuel)} <span className="text-[10px] font-bold text-slate-500">L (Stok Aktif)</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 font-mono">
                  <div className="text-emerald-700">Masuk: +{formatNum(stats.totalInflowSolar)} L</div>
                  <div className="text-amber-800">Pakai: -{formatNum(stats.totalOutflowSolar)} L</div>
                </div>
              </div>

              {/* Pelumas & Oli Tile */}
              <div className="p-2.5 bg-white rounded-lg border border-blue-200">
                <div className="flex items-center justify-between text-blue-900 font-bold text-[11px] uppercase">
                  <span>Pelumas & Oli</span>
                  <Droplet className="w-3.5 h-3.5 text-blue-600" />
                </div>
                <div className="text-base font-black text-slate-900 mt-1 font-mono">
                  {formatNum(currentOli)} <span className="text-[10px] font-bold text-slate-500">L (Stok Drum)</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 font-mono">
                  <div className="text-emerald-700">Masuk: +{formatNum(stats.totalInflowOli)} L</div>
                  <div className="text-blue-800">Pakai: -{formatNum(stats.totalOutflowOli)} L</div>
                </div>
              </div>

              {/* Grease Tile */}
              <div className="p-2.5 bg-white rounded-lg border border-emerald-200">
                <div className="flex items-center justify-between text-emerald-900 font-bold text-[11px] uppercase">
                  <span>Grease EP-2</span>
                  <Package className="w-3.5 h-3.5 text-emerald-600" />
                </div>
                <div className="text-base font-black text-slate-900 mt-1 font-mono">
                  {formatNum(currentGrease)} <span className="text-[10px] font-bold text-slate-500">Kg (Workshop)</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 font-mono">
                  <div className="text-emerald-700">Masuk: +{formatNum(stats.totalInflowGrease)} Kg</div>
                  <div className="text-emerald-800">Pakai: -{formatNum(stats.totalOutflowGrease)} Kg</div>
                </div>
              </div>

              {/* Spare Part Tile */}
              <div className="p-2.5 bg-white rounded-lg border border-purple-200">
                <div className="flex items-center justify-between text-purple-900 font-bold text-[11px] uppercase">
                  <span>Spare Part Kritis</span>
                  <Wrench className="w-3.5 h-3.5 text-purple-600" />
                </div>
                <div className="text-base font-black text-slate-900 mt-1 font-mono">
                  {formatNum(currentParts)} <span className="text-[10px] font-bold text-slate-500">Pcs (Ready)</span>
                </div>
                <div className="text-[10px] text-slate-600 mt-1 space-y-0.5 font-mono">
                  <div className="text-emerald-700">Masuk: +{formatNum(stats.totalInflowParts)} Pcs</div>
                  <div className="text-purple-800">Terpasang: -{formatNum(stats.totalOutflowParts)} Pcs</div>
                </div>
              </div>
            </div>

            {/* 4. DETAIL TABEL DATA TRANSAKSI */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                  Tabel Rincian Riwayat Transaksi ({filteredList.length} Transaksi)
                </span>
                <span className="text-slate-500 text-[11px]">
                  Diurutkan berdasarkan tanggal terbaru
                </span>
              </div>

              <div className="border border-slate-300 rounded-lg overflow-hidden">
                <table className="w-full text-left text-[11px]">
                  <thead className="bg-slate-100 text-slate-800 uppercase font-black tracking-wider text-[10px] border-b border-slate-300">
                    {reportType === 'in' ? (
                      <tr>
                        <th className="p-2 text-center w-8">No</th>
                        <th className="p-2">Tanggal / Waktu</th>
                        <th className="p-2">Item Barang</th>
                        <th className="p-2 text-right">Jumlah Masuk</th>
                        <th className="p-2">No. SJ & PO</th>
                        <th className="p-2">Tempat Penyimpanan</th>
                        <th className="p-2">Pengawas Penerima</th>
                        <th className="p-2 text-center">Status Verifikasi Direktur</th>
                      </tr>
                    ) : reportType === 'out' ? (
                      <tr>
                        <th className="p-2 text-center w-8">No</th>
                        <th className="p-2">Tanggal / Waktu</th>
                        <th className="p-2">Item Barang</th>
                        <th className="p-2 text-right">Jumlah Pakai</th>
                        <th className="p-2">Unit Alat Berat</th>
                        <th className="p-2">HM Alat</th>
                        <th className="p-2">Keperluan / Kegunaan</th>
                        <th className="p-2">Pengawas Lapangan</th>
                      </tr>
                    ) : (
                      <tr>
                        <th className="p-2 text-center w-8">No</th>
                        <th className="p-2">Tanggal</th>
                        <th className="p-2 text-center">Tipe</th>
                        <th className="p-2">Item Barang</th>
                        <th className="p-2 text-right">Jumlah</th>
                        <th className="p-2">Tujuan / Alat / Simpan</th>
                        <th className="p-2">Keterangan / Dokumen</th>
                        <th className="p-2 text-center">Status</th>
                      </tr>
                    )}
                  </thead>
                  <tbody className="divide-y divide-slate-200">
                    {filteredList.length === 0 ? (
                      <tr>
                        <td colSpan={8} className="p-6 text-center text-slate-400 italic">
                          Tidak ada transaksi logistik yang sesuai dengan kriteria filter.
                        </td>
                      </tr>
                    ) : (
                      filteredList.map((t, idx) => {
                        if (reportType === 'in') {
                          return (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 whitespace-nowrap">
                                <span className="font-bold text-slate-900">{t.date}</span>
                                <span className="text-[10px] text-slate-500 block">{t.timestamp || ''}</span>
                              </td>
                              <td className="p-2">
                                <span className="font-bold text-slate-900">{t.itemName}</span>
                                <span className="text-[10px] text-slate-500 block">Kategori: {t.category}</span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-emerald-800 whitespace-nowrap">
                                +{t.quantity.toLocaleString()} {t.unit}
                              </td>
                              <td className="p-2 font-mono text-[10px]">
                                <div className="text-slate-800 font-bold">SJ: {t.deliveryNoteNumber || '-'}</div>
                                <div className="text-slate-500">PO: {t.supplierOrPoNumber || '-'}</div>
                              </td>
                              <td className="p-2 text-slate-700 text-[10px]">
                                {t.sourceOrStorage || 'Gudang Basecamp'}
                              </td>
                              <td className="p-2 text-slate-800 font-medium">
                                {t.submittedByName || 'Pengawas'}
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                {t.approvalStatus === 'approved' ? (
                                  <span className="inline-block px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded font-bold text-[10px]">
                                    Disetujui Direktur
                                  </span>
                                ) : t.approvalStatus === 'pending' ? (
                                  <span className="inline-block px-2 py-0.5 bg-amber-100 text-amber-800 rounded font-bold text-[10px]">
                                    Menunggu Approval
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 bg-rose-100 text-rose-800 rounded font-bold text-[10px]">
                                    Ditolak
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        } else if (reportType === 'out') {
                          return (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 whitespace-nowrap">
                                <span className="font-bold text-slate-900">{t.date}</span>
                                <span className="text-[10px] text-slate-500 block">{t.timestamp || ''}</span>
                              </td>
                              <td className="p-2">
                                <span className="font-bold text-slate-900">{t.itemName}</span>
                                <span className="text-[10px] text-slate-500 block">Kategori: {t.category}</span>
                              </td>
                              <td className="p-2 text-right font-mono font-bold text-amber-900 whitespace-nowrap">
                                -{t.quantity.toLocaleString()} {t.unit}
                              </td>
                              <td className="p-2">
                                <span className="font-mono font-bold text-slate-900 bg-slate-100 px-1.5 py-0.5 rounded">
                                  {t.equipmentId || '-'}
                                </span>
                                <span className="text-[10px] text-slate-600 block mt-0.5">
                                  {t.equipmentName || ''}
                                </span>
                              </td>
                              <td className="p-2 font-mono font-bold text-slate-800">
                                {t.equipmentHmAtUsage !== undefined ? `${t.equipmentHmAtUsage} HM` : '-'}
                              </td>
                              <td className="p-2 text-slate-700 text-[10px]">
                                <div className="font-semibold text-slate-900">{t.purpose}</div>
                                {t.notes && <div className="text-slate-500 italic mt-0.5">{t.notes}</div>}
                              </td>
                              <td className="p-2 text-slate-800 font-medium">
                                {t.submittedByName || 'Pengawas'}
                              </td>
                            </tr>
                          );
                        } else {
                          // All combined
                          const isIn = t.type === 'in';
                          return (
                            <tr key={t.id} className="hover:bg-slate-50">
                              <td className="p-2 text-center text-slate-500 font-mono">{idx + 1}</td>
                              <td className="p-2 whitespace-nowrap font-mono">
                                <span className="font-bold text-slate-900">{t.date}</span>
                              </td>
                              <td className="p-2 text-center whitespace-nowrap">
                                <span
                                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-black ${
                                    isIn
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : 'bg-amber-100 text-amber-900'
                                  }`}
                                >
                                  {isIn ? 'MASUK' : 'KELUAR'}
                                </span>
                              </td>
                              <td className="p-2">
                                <span className="font-bold text-slate-900">{t.itemName}</span>
                                <span className="text-[10px] text-slate-500 block">{t.category}</span>
                              </td>
                              <td
                                className={`p-2 text-right font-mono font-bold whitespace-nowrap ${
                                  isIn ? 'text-emerald-700' : 'text-amber-800'
                                }`}
                              >
                                {isIn ? `+${t.quantity}` : `-${t.quantity}`} {t.unit}
                              </td>
                              <td className="p-2 text-[10px]">
                                {isIn ? (
                                  <span className="text-slate-700">{t.sourceOrStorage || 'Gudang'}</span>
                                ) : (
                                  <span className="font-bold font-mono text-slate-900">
                                    {t.equipmentId} ({t.equipmentHmAtUsage || 0} HM)
                                  </span>
                                )}
                              </td>
                              <td className="p-2 text-[10px] text-slate-600">
                                {isIn ? (
                                  <span>SJ: {t.deliveryNoteNumber || '-'}</span>
                                ) : (
                                  <span>{t.purpose}</span>
                                )}
                              </td>
                              <td className="p-2 text-center whitespace-nowrap text-[10px]">
                                {isIn ? (
                                  t.approvalStatus === 'approved' ? (
                                    <span className="text-emerald-700 font-bold">Sah Direktur</span>
                                  ) : t.approvalStatus === 'pending' ? (
                                    <span className="text-amber-700 font-bold">Pending</span>
                                  ) : (
                                    <span className="text-rose-700 font-bold">Ditolak</span>
                                  )
                                ) : (
                                  <span className="text-slate-600">Terpakai</span>
                                )}
                              </td>
                            </tr>
                          );
                        }
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 5. LEMBAR TANDA TANGAN RESMI */}
            <div className="pt-6 border-t border-slate-300 grid grid-cols-2 gap-8 text-xs text-center">
              <div>
                <p className="text-slate-500 text-[11px]">Dibuat & Dicatat di Lapangan Oleh,</p>
                <p className="font-bold text-slate-800 mt-0.5">Pengawas / Penanggung Jawab Logistik</p>
                
                <div className="h-16 flex items-center justify-center">
                  {supervisorStaff?.signatureUrl ? (
                    <img 
                      src={supervisorStaff.signatureUrl} 
                      alt="TTD Pengawas" 
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="border-b border-dashed border-slate-400 w-36" />
                  )}
                </div>
                
                <p className="font-black text-slate-900 underline font-mono text-xs uppercase">
                  {supervisorStaff?.fullName || 'BUDI SANTOSO'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {supervisorStaff?.jobRole || 'Supervisor Lapangan'} {companyProfile.officialName || 'PT. RBS GROUP'}
                </p>
              </div>

              <div>
                <p className="text-slate-500 text-[11px]">Diverifikasi & Disetujui Resmi Oleh,</p>
                <p className="font-bold text-slate-800 mt-0.5">Direktur Operasional & Alat Berat</p>
                
                <div className="h-16 flex items-center justify-center relative">
                  <div className="absolute inset-0 flex items-center justify-center opacity-80 pointer-events-none">
                    <div className="border-2 border-emerald-600 text-emerald-800 font-black text-[9px] uppercase px-2 py-0.5 rounded rotate-[-6deg] bg-emerald-50/70 shadow-2xs">
                      VERIFIED & APPROVED
                    </div>
                  </div>
                  {directorStaff?.signatureUrl ? (
                    <img 
                      src={directorStaff.signatureUrl} 
                      alt="TTD Direktur" 
                      className="max-h-14 max-w-full object-contain"
                    />
                  ) : (
                    <div className="border-b border-dashed border-slate-400 w-36" />
                  )}
                </div>
                
                <p className="font-black text-slate-900 underline font-mono text-xs uppercase">
                  {directorStaff?.fullName || 'DIREKTUR UTAMA'}
                </p>
                <p className="text-[10px] text-slate-500">
                  {directorStaff?.jobRole || 'Direktur Utama'} {companyProfile.officialName || 'PT. RBS GROUP'}
                </p>
              </div>
            </div>

            {/* Document Footer Note */}
            <div className="text-[10px] text-slate-400 text-center border-t border-slate-100 pt-3">
              Dokumen ini dihasilkan secara otomatis oleh {companyProfile.shortName || 'RBS'} APPS — Sistem Pelaporan Land Clearing & Inventaris Logistik Lapangan {companyProfile.officialName || 'PT. RBS GROUP'}. Seluruh catatan bersifat sah dan teraudit.
            </div>

          </div>
        </div>

      </div>
    </div>
  );
};
