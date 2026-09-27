import React, { useState, useMemo } from 'react';
import { 
  ClipboardCheck, 
  ShieldAlert, 
  Camera, 
  Calculator, 
  Fuel, 
  AlertTriangle, 
  CheckCircle2, 
  Clock, 
  MapPin, 
  Building2, 
  Search, 
  Filter, 
  Download, 
  ExternalLink, 
  Eye, 
  Printer, 
  CheckCircle, 
  X, 
  Calendar, 
  Truck, 
  Wrench, 
  HardHat, 
  FileText, 
  Layers, 
  Activity, 
  Maximize2,
  ChevronRight,
  Sparkles,
  Info
} from 'lucide-react';
import { 
  AuthUser, 
  Client, 
  DailyP2HChecklist, 
  FuelBowserReceipt, 
  SoilHazardIncident, 
  FieldGeotagPhoto, 
  HmDiscrepancyLog 
} from '../types';
import { storageService } from '../services/storageService';

interface DirectorFieldMonitorViewProps {
  authUser: AuthUser;
  clients: Client[];
  selectedClientId: string;
  onSelectClientId: (clientId: string) => void;
  showToast: (message: string, type?: 'success' | 'warning' | 'info') => void;
  onOpenReport?: (reportId: string) => void;
}

export const DirectorFieldMonitorView: React.FC<DirectorFieldMonitorViewProps> = ({
  authUser,
  clients,
  selectedClientId,
  onSelectClientId,
  showToast,
  onOpenReport,
}) => {
  // STRICT ACCESS CONTROL: Direktur & Manager Only
  const isAuthorized = authUser?.role === 'director' || authUser?.role === 'manager' || authUser?.userLevel === 'Superadmin' || authUser?.userLevel === 'Manager';
  if (!isAuthorized) {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-black text-slate-900 text-base">Akses Khusus Direktur & Manager</h3>
        <p className="text-xs text-slate-600">
          Halaman Audit & Monitoring Hasil Inputan Fitur Cepat Pengawas hanya dapat diakses oleh akun Direktur dan Manager.
        </p>
      </div>
    );
  }

  // Active Sub-Tab
  type MonitorTab = 'p2h' | 'geotag' | 'hm_calc' | 'fuel_bowser' | 'soil_incidents';
  const [activeTab, setActiveTab] = useState<MonitorTab>('p2h');

  // Search & Filter States
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [dateFilter, setDateFilter] = useState<string>('');

  // Selected Item Modals
  const [selectedP2hDetail, setSelectedP2hDetail] = useState<DailyP2HChecklist | null>(null);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<FieldGeotagPhoto | null>(null);
  const [selectedIncidentDetail, setSelectedIncidentDetail] = useState<SoilHazardIncident | null>(null);
  const [selectedBowserDetail, setSelectedBowserDetail] = useState<FuelBowserReceipt | null>(null);

  // Load Real Data from StorageService
  const p2hList = useMemo(() => storageService.getP2HChecklists(selectedClientId), [selectedClientId]);
  const geotagPhotos = useMemo(() => storageService.getGeotagPhotos(selectedClientId), [selectedClientId]);
  const hmAudits = useMemo(() => storageService.getHmDiscrepancyLogs(selectedClientId), [selectedClientId]);
  const bowserReceipts = useMemo(() => storageService.getFuelBowserReceipts(selectedClientId), [selectedClientId]);
  const soilIncidents = useMemo(() => storageService.getSoilIncidents(selectedClientId), [selectedClientId]);

  // Executive Metric Calculations
  const metrics = useMemo(() => {
    // P2H metrics
    const totalP2h = p2hList.length;
    const readyP2h = p2hList.filter((p) => p.overallStatus === 'Layak Operasi').length;
    const conditionalP2h = p2hList.filter((p) => p.overallStatus === 'Bersyarat (Pantau)').length;
    const stopP2h = p2hList.filter((p) => p.overallStatus === 'Stop Operasi (Butuh Mekanik)').length;
    const readyRate = totalP2h > 0 ? Math.round((readyP2h / totalP2h) * 100) : 100;

    // Photos
    const totalPhotos = geotagPhotos.length;

    // HM Discrepancy
    const totalHmLogs = hmAudits.length;
    const discrepancyCount = hmAudits.filter((h) => h.isDiscrepancy).length;
    const fuelAlertCount = hmAudits.filter((h) => h.isFuelAlert).length;

    // Fuel Bowser
    const totalBowserReceipts = bowserReceipts.length;
    const totalBowserLiters = bowserReceipts.reduce((acc, r) => acc + r.totalLitersFilled, 0);

    // Soil Incidents
    const totalIncidents = soilIncidents.length;
    const totalPullOutHours = soilIncidents.reduce((acc, i) => acc + (i.evacuationDurationHours || 0), 0);
    const zeroAccidentRate = soilIncidents.filter((i) => i.injuryStatus === 'Zero Accident (Nihil Cidera)').length;

    return {
      totalP2h,
      readyP2h,
      conditionalP2h,
      stopP2h,
      readyRate,
      totalPhotos,
      totalHmLogs,
      discrepancyCount,
      fuelAlertCount,
      totalBowserReceipts,
      totalBowserLiters,
      totalIncidents,
      totalPullOutHours,
      zeroAccidentRate,
    };
  }, [p2hList, geotagPhotos, hmAudits, bowserReceipts, soilIncidents]);

  // Filtered lists based on search & filters
  const filteredP2h = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return p2hList.filter((item) => {
      const matchSearch = searchTerm === '' ||
        (item.equipmentId && item.equipmentId.toLowerCase().includes(q)) ||
        (item.operatorName && item.operatorName.toLowerCase().includes(q)) ||
        (item.supervisorName && item.supervisorName.toLowerCase().includes(q)) ||
        (item.blockCode && item.blockCode.toLowerCase().includes(q)) ||
        (item.clientName && item.clientName.toLowerCase().includes(q));
      
      const matchStatus = statusFilter === 'ALL' || item.overallStatus === statusFilter;
      const matchDate = dateFilter === '' || item.date === dateFilter;

      return matchSearch && matchStatus && matchDate;
    });
  }, [p2hList, searchTerm, statusFilter, dateFilter]);

  const filteredPhotos = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return geotagPhotos.filter((p) => {
      const matchSearch = searchTerm === '' ||
        (p.fileName && p.fileName.toLowerCase().includes(q)) ||
        (p.category && p.category.toLowerCase().includes(q)) ||
        (p.blockCode && p.blockCode.toLowerCase().includes(q)) ||
        (p.equipmentId && p.equipmentId.toLowerCase().includes(q)) ||
        (p.clientName && p.clientName.toLowerCase().includes(q));
      
      return matchSearch;
    });
  }, [geotagPhotos, searchTerm]);

  const filteredHmAudits = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return hmAudits.filter((h) => {
      const matchSearch = searchTerm === '' ||
        (h.equipmentId && h.equipmentId.toLowerCase().includes(q)) ||
        (h.equipmentName && h.equipmentName.toLowerCase().includes(q)) ||
        (h.blockCode && h.blockCode.toLowerCase().includes(q)) ||
        (h.clientName && h.clientName.toLowerCase().includes(q));

      const matchStatus = statusFilter === 'ALL' || 
        (statusFilter === 'DISCREPANCY' && h.isDiscrepancy) ||
        (statusFilter === 'MATCHED' && !h.isDiscrepancy) ||
        (statusFilter === 'FUEL_ALERT' && h.isFuelAlert);

      const matchDate = dateFilter === '' || h.date === dateFilter;

      return matchSearch && matchStatus && matchDate;
    });
  }, [hmAudits, searchTerm, statusFilter, dateFilter]);

  const filteredBowser = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return bowserReceipts.filter((b) => {
      const matchSearch = searchTerm === '' ||
        (b.equipmentId && b.equipmentId.toLowerCase().includes(q)) ||
        (b.sealNumber && b.sealNumber.toLowerCase().includes(q)) ||
        (b.deliveryDocNumber && b.deliveryDocNumber.toLowerCase().includes(q)) ||
        (b.bowserDriverName && b.bowserDriverName.toLowerCase().includes(q)) ||
        (b.clientName && b.clientName.toLowerCase().includes(q));

      const matchDate = dateFilter === '' || b.date === dateFilter;

      return matchSearch && matchDate;
    });
  }, [bowserReceipts, searchTerm, dateFilter]);

  const filteredIncidents = useMemo(() => {
    const q = (searchTerm || '').toLowerCase();
    return soilIncidents.filter((inc) => {
      const matchSearch = searchTerm === '' ||
        (inc.incidentType && inc.incidentType.toLowerCase().includes(q)) ||
        (inc.affectedEquipmentId && inc.affectedEquipmentId.toLowerCase().includes(q)) ||
        (inc.soilCondition && inc.soilCondition.toLowerCase().includes(q)) ||
        (inc.blockCode && inc.blockCode.toLowerCase().includes(q)) ||
        (inc.clientName && inc.clientName.toLowerCase().includes(q));

      const matchDate = dateFilter === '' || inc.date === dateFilter;

      return matchSearch && matchDate;
    });
  }, [soilIncidents, searchTerm, dateFilter]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      
      {/* 1. EXECUTIVE HEADER BANNER */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 sm:p-6 shadow-xl border border-slate-800">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="px-2.5 py-1 rounded-md text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 flex items-center gap-1">
                <ShieldAlert className="w-3 h-3" />
                Audit Direktur
              </span>
              <span className="text-xs text-slate-400 font-semibold flex items-center gap-1.5">
                <Activity className="w-3.5 h-3.5 text-emerald-400" />
                Read-Only Field Operational Suite
              </span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-100 tracking-tight">
              Audit Hasil Pengawas Lapangan
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Monitoring langsung data fisik lapangan yang diinput oleh Pengawas: Hasil Inspeksi P2H Pra-Operasi, Galeri Foto Geotagging Berstempel GPS, Audit Pencocokan HM & Konsumsi BBM, Penerimaan Solar Keliling, dan Log K3 Gambut.
            </p>
          </div>

          {/* Quick Client Portfolio Filter */}
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs font-bold text-slate-400">Filter Klien:</span>
            <button
              onClick={() => onSelectClientId('ALL')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                selectedClientId === 'ALL'
                  ? 'bg-amber-500 text-slate-950 shadow-sm'
                  : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
              }`}
            >
              Semua ({clients.length} PT)
            </button>
            {clients.map((c) => (
              <button
                key={c.id}
                onClick={() => onSelectClientId(c.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                  selectedClientId === c.id
                    ? 'bg-amber-500 text-slate-950 shadow-sm'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* 5 EXECUTIVE TILES: QUICK METRICS SUMMARY */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mt-6 pt-5 border-t border-slate-800/90">
          
          {/* Tile 1: Kesiapan Armada P2H */}
          <div 
            onClick={() => setActiveTab('p2h')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'p2h'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Inspeksi P2H</span>
              <Wrench className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">
              {metrics.readyRate}% <span className="text-xs font-medium text-emerald-400">Siap</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.readyP2h} Layak · {metrics.stopP2h} Stop
            </div>
          </div>

          {/* Tile 2: Foto Geotagging */}
          <div 
            onClick={() => setActiveTab('geotag')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'geotag'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Foto Geotag</span>
              <Camera className="w-3.5 h-3.5 text-sky-400" />
            </div>
            <div className="text-xl font-black text-white">
              {metrics.totalPhotos} <span className="text-xs font-medium text-slate-400">Foto</span>
            </div>
            <div className="text-[10px] text-sky-400 mt-0.5">
              Watermark GPS Aktif
            </div>
          </div>

          {/* Tile 3: Audit HM & Jam Kerja */}
          <div 
            onClick={() => setActiveTab('hm_calc')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'hm_calc'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Audit HM & BBM</span>
              <Calculator className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">
              {metrics.discrepancyCount > 0 ? (
                <span className="text-rose-400">{metrics.discrepancyCount} Selisih</span>
              ) : (
                <span className="text-emerald-400">100% Sinkron</span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.fuelAlertCount} Alert BBM &gt; Standar
            </div>
          </div>

          {/* Tile 4: Solar Bowser Keliling */}
          <div 
            onClick={() => setActiveTab('fuel_bowser')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'fuel_bowser'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Solar Keliling</span>
              <Fuel className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">
              {metrics.totalBowserLiters.toLocaleString('id-ID')} <span className="text-xs font-medium text-slate-400">L</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">
              {metrics.totalBowserReceipts} Bukti Pengisian
            </div>
          </div>

          {/* Tile 5: Log Insiden Gambut & K3 */}
          <div 
            onClick={() => setActiveTab('soil_incidents')}
            className={`p-3 rounded-xl border transition-all cursor-pointer ${
              activeTab === 'soil_incidents'
                ? 'bg-amber-500/15 border-amber-500/50 shadow-sm'
                : 'bg-slate-800/80 border-slate-700 hover:bg-slate-800'
            }`}
          >
            <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 mb-1">
              <span>Insiden K3 Gambut</span>
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <div className="text-xl font-black text-white">
              {metrics.totalIncidents} <span className="text-xs font-medium text-slate-400">Kasus</span>
            </div>
            <div className="text-[10px] text-emerald-400 mt-0.5">
              Zero Accident ({metrics.totalPullOutHours} Jam Pull-out)
            </div>
          </div>

        </div>
      </div>

      {/* 2. SUB-NAVIGATION TABS */}
      <div className="bg-white rounded-2xl p-2 shadow-sm border border-slate-200">
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          
          <button
            type="button"
            onClick={() => { setActiveTab('p2h'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'p2h'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Wrench className="w-4 h-4" />
            <span>1. Hasil Inspeksi P2H ({p2hList.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('geotag'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'geotag'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Camera className="w-4 h-4" />
            <span>2. Galeri Geotag Progres ({geotagPhotos.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('hm_calc'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'hm_calc'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>3. Audit HM & Discrepancy ({hmAudits.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('fuel_bowser'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'fuel_bowser'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>4. Solar Bowser Keliling ({bowserReceipts.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('soil_incidents'); setStatusFilter('ALL'); }}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer shrink-0 ${
              activeTab === 'soil_incidents'
                ? 'bg-amber-500 text-slate-950 shadow-sm'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <AlertTriangle className="w-4 h-4" />
            <span>5. Log Insiden K3 Gambut ({soilIncidents.length})</span>
          </button>

        </div>
      </div>

      {/* 3. FILTER & SEARCH TOOLBAR */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={
              activeTab === 'p2h' ? 'Cari unit alat, operator, pengawas, atau blok...' :
              activeTab === 'geotag' ? 'Cari file, kategori progres, blok, unit...' :
              activeTab === 'hm_calc' ? 'Cari unit, catatan breakdown, blok...' :
              activeTab === 'fuel_bowser' ? 'Cari segel, surat jalan, supir bowser...' :
              'Cari insiden, jenis kendala tanah, unit alat...'
            }
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter for P2H */}
          {activeTab === 'p2h' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="ALL">Semua Status Kelayakan</option>
              <option value="Layak Operasi">Layak Operasi</option>
              <option value="Bersyarat (Pantau)">Bersyarat (Pantau)</option>
              <option value="Stop Operasi (Butuh Mekanik)">Stop Operasi (Butuh Mekanik)</option>
            </select>
          )}

          {/* Status Filter for HM Audits */}
          {activeTab === 'hm_calc' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-amber-500/50"
            >
              <option value="ALL">Semua Status HM</option>
              <option value="DISCREPANCY">⚠️ Ada Selisih / Discrepancy</option>
              <option value="MATCHED">✓ Jam Kerja Sinkron</option>
              <option value="FUEL_ALERT">⛽ Konsumsi BBM Melebihi Standar</option>
            </select>
          )}

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <input
              type="date"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              className="text-xs bg-transparent focus:outline-none cursor-pointer"
            />
            {dateFilter && (
              <button
                onClick={() => setDateFilter('')}
                className="text-slate-400 hover:text-slate-600 text-xs ml-1 cursor-pointer"
                title="Reset Tanggal"
              >
                ×
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 1: AUDIT INSPEKSI P2H ALAT BERAT */}
      {/* ========================================================================= */}
      {activeTab === 'p2h' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Wrench className="w-4 h-4 text-amber-500" />
              <span>Daftar Lembar Inspeksi Pra-Operasi (P2H) dari Pengawas</span>
            </h3>
            <span className="text-xs text-slate-500">
              Menampilkan {filteredP2h.length} data inspeksi
            </span>
          </div>

          {filteredP2h.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <CheckCircle className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Tidak ada lembar checklist P2H yang cocok</p>
              <p className="text-xs text-slate-500">Coba ubah filter pencarian atau pilih klien lain.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredP2h.map((p2h) => {
                const isStop = p2h.overallStatus === 'Stop Operasi (Butuh Mekanik)';
                const isConditional = p2h.overallStatus === 'Bersyarat (Pantau)';
                return (
                  <div
                    key={p2h.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md space-y-3.5 flex flex-col justify-between ${
                      isStop 
                        ? 'border-rose-300 bg-rose-50/20' 
                        : isConditional 
                        ? 'border-amber-300 bg-amber-50/20' 
                        : 'border-slate-200'
                    }`}
                  >
                    <div>
                      {/* Top Header */}
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <div>
                          <span className="text-[10px] font-mono font-bold text-slate-400 block">
                            {p2h.id}
                          </span>
                          <h4 className="text-base font-black text-slate-900 leading-tight">
                            {p2h.equipmentId}
                          </h4>
                          <p className="text-xs text-slate-600 font-medium">
                            {p2h.equipmentName}
                          </p>
                        </div>
                        <span
                          className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-wider shrink-0 ${
                            isStop
                              ? 'bg-rose-100 text-rose-700 border border-rose-200'
                              : isConditional
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {p2h.overallStatus}
                        </span>
                      </div>

                      {/* Details Strip */}
                      <div className="grid grid-cols-2 gap-2 p-2.5 bg-slate-50 rounded-xl text-xs text-slate-600 mb-3 border border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block">Klien & Blok</span>
                          <strong className="text-slate-800">{p2h.clientName}</strong> · {p2h.blockCode}
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Waktu Inspeksi</span>
                          <strong className="text-slate-800">{p2h.date}</strong> ({p2h.time} WIB)
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Operator Lapangan</span>
                          <strong className="text-slate-800">{p2h.operatorName}</strong>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block">Pengawas Pemverifikasi</span>
                          <strong className="text-slate-800">{p2h.supervisorName}</strong>
                        </div>
                      </div>

                      {/* 8 Critical Points Micro Matrix */}
                      <div className="space-y-1.5 text-xs">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">
                          Parameter Kritis Inspeksi Pra-Operasi:
                        </span>
                        <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Oli Mesin:</span>
                            <span className={`font-bold ${p2h.engineOilLevel === 'Baik / Normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p2h.engineOilLevel}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Air Radiator:</span>
                            <span className={`font-bold ${p2h.radiatorCoolant === 'Baik / Normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p2h.radiatorCoolant}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Hidrolik:</span>
                            <span className={`font-bold ${p2h.hydraulicOilAndPressure === 'Baik / Normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p2h.hydraulicOilAndPressure}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Selang Hose:</span>
                            <span className={`font-bold ${p2h.hydraulicHosesAndFittings === 'Baik / Normal' ? 'text-emerald-600' : 'text-amber-600'}`}>
                              {p2h.hydraulicHosesAndFittings}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Track / Rantai:</span>
                            <span className={`font-bold ${p2h.undercarriageAndTracks === 'Baik / Normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p2h.undercarriageAndTracks}
                            </span>
                          </div>
                          <div className="flex items-center justify-between p-1.5 rounded-lg bg-slate-50 border border-slate-100">
                            <span className="text-slate-600 truncate">Separator BBM:</span>
                            <span className={`font-bold ${p2h.fuelLevelAndSeparator === 'Baik / Normal' ? 'text-emerald-600' : 'text-rose-600'}`}>
                              {p2h.fuelLevelAndSeparator}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Notes */}
                      {p2h.notes && (
                        <div className="mt-3 p-2.5 rounded-xl bg-slate-100/80 border border-slate-200/80 text-xs text-slate-700">
                          <span className="font-bold text-slate-900 block text-[10px] uppercase">Catatan Pengawas:</span>
                          <p className="italic mt-0.5 line-clamp-2">{p2h.notes}</p>
                        </div>
                      )}
                    </div>

                    {/* Bottom Action */}
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between">
                      <div className="text-[11px] font-mono text-slate-500">
                        HM Start: <strong className="text-slate-900">{p2h.hmStart.toFixed(1)}</strong>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedP2hDetail(p2h)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl transition-all cursor-pointer shadow-xs"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detail Lembar P2H</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 2: GALERI & VERIFIKASI FOTO GEOTAGGING LAPANGAN */}
      {/* ========================================================================= */}
      {activeTab === 'geotag' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Camera className="w-4 h-4 text-sky-500" />
              <span>Galeri Foto Lapangan Ber-Watermark GPS Permanen (Smart Camera)</span>
            </h3>
            <span className="text-xs text-slate-500">
              {filteredPhotos.length} Foto Tercatat
            </span>
          </div>

          {filteredPhotos.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <Camera className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum ada foto geotagging yang tersimpan</p>
              <p className="text-xs text-slate-500">Foto yang diambil pengawas via Fitur Cepat akan langsung muncul di sini.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPhotos.map((photo) => {
                const mapsUrl = `https://www.google.com/maps?q=${photo.lat},${photo.lng}`;
                return (
                  <div
                    key={photo.id}
                    className="bg-white rounded-2xl overflow-hidden border border-slate-200 shadow-sm transition-all hover:shadow-md flex flex-col justify-between group"
                  >
                    <div>
                      {/* Photo Thumbnail */}
                      <div className="relative aspect-video bg-slate-900 overflow-hidden cursor-pointer" onClick={() => setSelectedPhotoPreview(photo)}>
                        <img
                          src={photo.dataUrl}
                          alt={photo.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-black/20" />
                        
                        {/* Overlay Badge */}
                        <div className="absolute top-2 left-2 flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded bg-slate-900/90 text-amber-400 font-bold text-[10px] backdrop-blur-xs border border-slate-700">
                            {photo.blockCode}
                          </span>
                          <span className="px-2 py-0.5 rounded bg-sky-950/90 text-sky-300 font-semibold text-[10px] backdrop-blur-xs border border-sky-800">
                            {photo.category}
                          </span>
                        </div>

                        {/* GPS Watermark Summary Ribbon */}
                        <div className="absolute bottom-2 left-2 right-2 text-white text-[10px] font-mono leading-tight">
                          <div className="flex items-center gap-1 font-bold text-amber-300 truncate">
                            <MapPin className="w-3 h-3 shrink-0" />
                            <span>{photo.lat.toFixed(5)}, {photo.lng.toFixed(5)} (±{photo.accuracy}m)</span>
                          </div>
                          <div className="text-slate-300 text-[9px] mt-0.5 truncate">
                            {photo.timestamp} · {photo.clientName}
                          </div>
                        </div>

                        {/* Maximize Button */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedPhotoPreview(photo);
                          }}
                          className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black/90 text-white rounded-lg backdrop-blur-xs transition-colors cursor-pointer"
                          title="Perbesar Foto"
                        >
                          <Maximize2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Photo Info Content */}
                      <div className="p-4 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <h4 className="text-xs font-black text-slate-900 truncate" title={photo.fileName}>
                            {photo.fileName}
                          </h4>
                          {photo.equipmentId && (
                            <span className="text-[10px] px-1.5 py-0.5 bg-slate-100 text-slate-700 font-bold rounded">
                              {photo.equipmentId}
                            </span>
                          )}
                        </div>

                        {photo.notes && (
                          <p className="text-xs text-slate-600 line-clamp-2 italic bg-slate-50 p-2 rounded-lg border border-slate-100">
                            "{photo.notes}"
                          </p>
                        )}

                        <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1">
                          <span>Pengawas: <strong>{photo.supervisorName || 'Pengawas'}</strong></span>
                          <span>Klien: <strong>{photo.clientName}</strong></span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Action Buttons */}
                    <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-white hover:bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg border border-slate-200 transition-colors"
                        title="Buka titik koordinat di Google Maps Satelit"
                      >
                        <ExternalLink className="w-3 h-3 text-sky-600" />
                        <span>Lihat di Maps</span>
                      </a>

                      <a
                        href={photo.dataUrl}
                        download={`SURYALAND_GEOTAG_${photo.blockCode}_${photo.fileName}`}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-[11px] font-bold rounded-lg transition-all cursor-pointer shadow-xs"
                        title="Download foto original ber-watermark"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh Foto</span>
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 3: AUDIT HM & DISCREPANCY ALERT */}
      {/* ========================================================================= */}
      {activeTab === 'hm_calc' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-amber-500" />
              <span>Audit Sinkronisasi Total HM vs Akumulasi Jam Catatan & Rasio BBM</span>
            </h3>
            <span className="text-xs text-slate-500">
              {filteredHmAudits.length} Log Jam Kerja Teranalisis
            </span>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            {/* Desktop Table View */}
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-3.5">Tanggal & Klien</th>
                    <th className="py-3 px-3">Unit Alat Berat</th>
                    <th className="py-3 px-3">HM Awal - Akhir</th>
                    <th className="py-3 px-3 text-center">Total HM</th>
                    <th className="py-3 px-3">Rincian Jam (Efektif / Cuaca / Breakdown)</th>
                    <th className="py-3 px-3 text-center">Catatan Jam</th>
                    <th className="py-3 px-3 text-center">Status Audit Selisih</th>
                    <th className="py-3 px-3 text-right">Konsumsi BBM</th>
                    <th className="py-3 px-3 text-center">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {filteredHmAudits.length === 0 ? (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        Tidak ada catatan jam kerja alat berat yang sesuai filter.
                      </td>
                    </tr>
                  ) : (
                    filteredHmAudits.map((h) => {
                      return (
                        <tr 
                          key={h.id} 
                          className={`hover:bg-slate-50 transition-colors ${
                            h.isDiscrepancy ? 'bg-rose-50/40' : (h.isFuelAlert ? 'bg-amber-50/40' : '')
                          }`}
                        >
                          <td className="py-3 px-3.5">
                            <strong className="text-slate-900 block">{h.date}</strong>
                            <span className="text-[11px] text-slate-500">{h.clientName} · {h.blockCode}</span>
                          </td>
                          <td className="py-3 px-3">
                            <span className="font-black text-slate-900 block">{h.equipmentId}</span>
                            <span className="text-[11px] text-slate-500">{h.equipmentName}</span>
                          </td>
                          <td className="py-3 px-3 font-mono text-[11px]">
                            {h.hmStart.toFixed(1)} &rarr; {h.hmEnd.toFixed(1)}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-900">
                            {h.totalHm.toFixed(1)} Jam
                          </td>
                          <td className="py-3 px-3 text-[11px] text-slate-600">
                            <span className="text-emerald-700 font-bold">{h.effectiveWorkHours.toFixed(1)} Efektif</span>
                            {h.downtimeWeatherHours > 0 && <span className="text-sky-600 ml-1.5 font-medium">+ {h.downtimeWeatherHours} Cuaca</span>}
                            {h.downtimeBreakdownHours > 0 && <span className="text-rose-600 ml-1.5 font-bold">+ {h.downtimeBreakdownHours} Rusak</span>}
                            {h.downtimeOtherHours > 0 && <span className="text-slate-600 ml-1.5">+ {h.downtimeOtherHours} Lain</span>}
                          </td>
                          <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                            {h.totalLoggedHours.toFixed(1)} Jam
                          </td>
                          <td className="py-3 px-3 text-center">
                            {h.isDiscrepancy ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 border border-rose-200">
                                <AlertTriangle className="w-3 h-3 text-rose-600 shrink-0" />
                                Selisih {h.discrepancyHours > 0 ? `+${h.discrepancyHours}` : h.discrepancyHours} Jam
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                Valid (Cocok)
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <span className="font-mono font-bold text-slate-900 block">
                              {h.fuelAddedLiters} L
                            </span>
                            <span className={`text-[10px] font-mono ${h.isFuelAlert ? 'text-rose-600 font-bold' : 'text-slate-500'}`}>
                              {h.fuelRatio.toFixed(1)} L/HM (Std {h.fuelStandardLimit})
                            </span>
                          </td>
                          <td className="py-3 px-3 text-center">
                            {h.reportId && onOpenReport && (
                              <button
                                type="button"
                                onClick={() => onOpenReport(h.reportId!)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-[10px] rounded-lg transition-colors cursor-pointer"
                              >
                                Lihat Laporan
                              </button>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>

            {/* Mobile Card View */}
            <div className="lg:hidden divide-y divide-slate-200">
              {filteredHmAudits.map((h) => (
                <div key={h.id} className="p-4 space-y-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <strong className="text-sm font-black text-slate-900 block">{h.equipmentId} ({h.equipmentName})</strong>
                      <span className="text-xs text-slate-500">{h.date} · {h.clientName} · {h.blockCode}</span>
                    </div>
                    {h.isDiscrepancy ? (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-rose-100 text-rose-800 shrink-0">
                        Selisih {h.discrepancyHours} Jam
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 shrink-0">
                        Valid
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div>
                      <span className="text-[10px] text-slate-400 block">HM Awal &rarr; Akhir</span>
                      <strong className="font-mono">{h.hmStart} &rarr; {h.hmEnd} ({h.totalHm} Jam)</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Total Jam Catatan</span>
                      <strong className="font-mono">{h.totalLoggedHours} Jam</strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Rasio Konsumsi BBM</span>
                      <span className={`font-mono ${h.isFuelAlert ? 'text-rose-600 font-bold' : 'text-slate-700'}`}>
                        {h.fuelRatio.toFixed(1)} L/HM ({h.fuelAddedLiters} L)
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 block">Pengawas</span>
                      <span className="text-slate-800 font-medium">{h.supervisorName}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 4: AUDIT PENERIMAAN SOLAR KELILING (FUEL BOWSER) */}
      {/* ========================================================================= */}
      {activeTab === 'fuel_bowser' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <Fuel className="w-4 h-4 text-amber-500" />
              <span>Audit Penerimaan Solar Keliling di Blok Lahan (Truk Tangki Bowser)</span>
            </h3>
            <span className="text-xs text-slate-500">
              Total {metrics.totalBowserLiters.toLocaleString('id-ID')} Liter Diterima
            </span>
          </div>

          {filteredBowser.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <Fuel className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Belum ada catatan penerimaan solar keliling</p>
              <p className="text-xs text-slate-500">Data penerimaan bowser lapangan akan tampil otomatis saat diisi pengawas.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBowser.map((b) => (
                <div
                  key={b.id}
                  className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm transition-all hover:shadow-md space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold text-slate-400 block">{b.id}</span>
                        <h4 className="text-sm font-black text-slate-900">{b.equipmentId} ({b.equipmentName})</h4>
                        <span className="text-xs text-slate-500">{b.clientName} · {b.blockCode}</span>
                      </div>
                      <div className="text-right">
                        <span className="text-lg font-black text-amber-600 block">{b.totalLitersFilled} L</span>
                        <span className="text-[10px] text-slate-500 font-mono">HM {b.equipmentHmAtRefuel}</span>
                      </div>
                    </div>

                    <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 text-xs border border-slate-100">
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Truk Tangki:</span>
                        <strong className="text-slate-800">{b.bowserTruckId}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">No. Segel:</span>
                        <strong className="font-mono text-amber-700">{b.sealNumber}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Surat Jalan (SJ):</span>
                        <strong className="font-mono text-slate-800">{b.deliveryDocNumber}</strong>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Flowmeter:</span>
                        <span className="font-mono text-slate-700">{b.flowmeterStart} &rarr; {b.flowmeterEnd}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-slate-500">Kualitas BBM:</span>
                        <span className="font-bold text-emerald-700">{b.fuelQualityCheck}</span>
                      </div>
                    </div>

                    {b.notes && (
                      <p className="text-xs text-slate-600 italic bg-amber-50/40 p-2 rounded-lg border border-amber-100">
                        "{b.notes}"
                      </p>
                    )}
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                    <span>Supir: <strong>{b.bowserDriverName}</strong></span>
                    <span>Pengawas: <strong>{b.supervisorName}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 4. TAB CONTENT 5: LOG INSIDEN TANAH GAMBUT & K3 */}
      {/* ========================================================================= */}
      {activeTab === 'soil_incidents' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
              <span>Log Insiden Tanah Gambut Dalam & Keselamatan Kerja K3 (Safety)</span>
            </h3>
            <span className="text-xs text-slate-500">
              {filteredIncidents.length} Kejadian Tercatat
            </span>
          </div>

          {filteredIncidents.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 shadow-sm space-y-2">
              <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Tidak ada insiden tercatat (Zero Accident)</p>
              <p className="text-xs text-slate-500">Kondisi lahan aman dan operasional berjalan lancar.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredIncidents.map((inc) => {
                const isCritical = inc.severity === 'Kritis (Stop Operasi)';
                return (
                  <div
                    key={inc.id}
                    className={`bg-white rounded-2xl p-5 border shadow-sm transition-all hover:shadow-md space-y-3 ${
                      isCritical ? 'border-rose-300 bg-rose-50/15' : 'border-slate-200'
                    }`}
                  >
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-rose-100 text-rose-800 border border-rose-200">
                            {inc.severity}
                          </span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {inc.injuryStatus}
                          </span>
                          <span className="text-xs font-bold text-slate-400">
                            {inc.date} ({inc.time} WIB)
                          </span>
                        </div>
                        <h4 className="text-base font-black text-slate-900">
                          {inc.incidentType}
                        </h4>
                        <p className="text-xs text-slate-600 mt-0.5">
                          Klien: <strong className="text-slate-800">{inc.clientName}</strong> · Lokasi: <strong>{inc.blockCode}</strong> · Unit Terdampak: <strong className="text-amber-700">{inc.affectedEquipmentId} ({inc.affectedEquipmentName})</strong>
                        </p>
                      </div>

                      <div className="text-left sm:text-right shrink-0">
                        <span className="text-xs text-slate-500 block">Durasi Evakuasi (Pull-Out)</span>
                        <strong className="text-lg font-black text-rose-600">{inc.evacuationDurationHours} Jam</strong>
                        <span className="text-[10px] font-semibold text-emerald-600 block mt-0.5">{inc.resolvedStatus}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl text-xs border border-slate-100">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Tindakan Penanganan di Lahan:
                        </span>
                        <p className="text-slate-700 leading-relaxed">{inc.actionTaken}</p>
                        {inc.rescuingEquipmentId && inc.rescuingEquipmentId !== '-' && (
                          <div className="mt-2 text-[11px] text-slate-600">
                            Unit Penolong: <strong className="text-slate-900">{inc.rescuingEquipmentId}</strong>
                          </div>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                          Kondisi Tanah & Rekomendasi Pencegahan:
                        </span>
                        <p className="font-semibold text-slate-800">{inc.soilCondition}</p>
                        <p className="text-slate-600 mt-1 italic leading-relaxed">"{inc.preventionNotes}"</p>
                      </div>
                    </div>

                    <div className="pt-2 flex items-center justify-between text-[11px] text-slate-500">
                      <span>Operator: <strong>{inc.operatorName || '-'}</strong></span>
                      <span>Pengawas Pelapor: <strong>{inc.supervisorName}</strong></span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ========================================================================= */}
      {/* 5. MODAL DETAIL LEMBAR INSPEKSI P2H */}
      {/* ========================================================================= */}
      {selectedP2hDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="flex items-start justify-between border-b border-slate-200 pb-4">
              <div>
                <span className="text-xs font-bold text-amber-600 uppercase tracking-wider block">
                  LEMBAR AUDIT RESMI P2H ALAT BERAT
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  {selectedP2hDetail.equipmentId} · {selectedP2hDetail.equipmentName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  No: {selectedP2hDetail.id} · Diperiksa: {selectedP2hDetail.createdAt}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedP2hDetail(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-xl hover:bg-slate-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Quick Status Pill */}
            <div className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <span className="text-xs text-slate-500 block">Status Kelayakan Operasi</span>
                <strong className="text-sm font-black text-slate-900">{selectedP2hDetail.overallStatus}</strong>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 block">HM Awal Pra-Operasi</span>
                <strong className="text-sm font-mono font-black text-amber-600">{selectedP2hDetail.hmStart.toFixed(1)}</strong>
              </div>
            </div>

            {/* 8 Critical Points Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-black text-slate-900 uppercase tracking-wider">
                Rincian 8 Parameter Kritis Pra-Operasi:
              </h4>
              <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-200 text-xs">
                {[
                  { label: 'Level Oli Mesin (Engine Oil Level)', val: selectedP2hDetail.engineOilLevel },
                  { label: 'Air Radiator & Coolant Level', val: selectedP2hDetail.radiatorCoolant },
                  { label: 'Level Oli & Tekanan Pompa Hidrolik', val: selectedP2hDetail.hydraulicOilAndPressure },
                  { label: 'Kondisi Selang Hose Hidrolik & Fitting', val: selectedP2hDetail.hydraulicHosesAndFittings },
                  { label: 'Undercarriage, Track Link & Shoes', val: selectedP2hDetail.undercarriageAndTracks },
                  { label: 'Kondisi Bahan Bakar & Water Separator Solar', val: selectedP2hDetail.fuelLevelAndSeparator },
                  { label: 'Sistem Elektrikal, Lampu Kerja & Klakson', val: selectedP2hDetail.electricalAndLights },
                  { label: 'APAR (Alat Pemadam Api) & Sabuk Pengaman', val: selectedP2hDetail.safetyAparAndSeatbelt },
                ].map((item, idx) => (
                  <div key={idx} className="p-2.5 flex items-center justify-between hover:bg-slate-50">
                    <span className="text-slate-700 font-medium">{item.label}</span>
                    <span className={`font-bold px-2 py-0.5 rounded text-[11px] ${
                      item.val === 'Baik / Normal' 
                        ? 'bg-emerald-100 text-emerald-800' 
                        : item.val === 'Perlu Perhatian' 
                        ? 'bg-amber-100 text-amber-800' 
                        : 'bg-rose-100 text-rose-800'
                    }`}>
                      {item.val}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Supervisor Notes */}
            <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 text-xs space-y-1">
              <span className="font-bold text-slate-900 block uppercase">Catatan & Temuan Pengawas:</span>
              <p className="text-slate-700 italic">{selectedP2hDetail.notes || 'Tidak ada catatan khusus.'}</p>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-4 pt-2 text-center text-xs">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Operator Penguji:</span>
                <strong className="text-slate-800 block mt-1">{selectedP2hDetail.operatorName}</strong>
                <span className="text-emerald-600 text-[10px] font-bold">✓ Terverifikasi Lapangan</span>
              </div>
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <span className="text-slate-400 block text-[10px]">Pengawas Pemverifikasi:</span>
                <strong className="text-slate-800 block mt-1">{selectedP2hDetail.supervisorName}</strong>
                <span className="text-emerald-600 text-[10px] font-bold">✓ Disetujui Pra-Operasi</span>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedP2hDetail(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Tutup Lembar P2H
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 6. MODAL PREVIEW FOTO GEOTAGGING BESAR */}
      {/* ========================================================================= */}
      {selectedPhotoPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-slate-900 rounded-3xl max-w-4xl w-full p-4 sm:p-6 shadow-2xl border border-slate-800 space-y-4 max-h-[92vh] overflow-y-auto text-white">
            <div className="flex items-start justify-between border-b border-slate-800 pb-3">
              <div>
                <span className="text-xs font-bold text-amber-400 uppercase tracking-wider block">
                  VERIFIKASI FOTO GEOTAGGING RESMI
                </span>
                <h3 className="text-base font-black text-slate-100">
                  {selectedPhotoPreview.fileName}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {selectedPhotoPreview.clientName} · {selectedPhotoPreview.blockCode} · {selectedPhotoPreview.category}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedPhotoPreview(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative aspect-video max-h-[55vh] bg-black rounded-2xl overflow-hidden flex items-center justify-center border border-slate-800">
              <img
                src={selectedPhotoPreview.dataUrl}
                alt={selectedPhotoPreview.fileName}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/80 p-3.5 rounded-2xl border border-slate-700/80">
              <div>
                <span className="text-slate-400 text-[10px] block">Koordinat GPS Satelit:</span>
                <strong className="text-amber-300 font-mono text-sm">
                  {selectedPhotoPreview.lat.toFixed(6)}, {selectedPhotoPreview.lng.toFixed(6)}
                </strong>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Akurasi: ±{selectedPhotoPreview.accuracy} Meter
                </span>
              </div>
              <div>
                <span className="text-slate-400 text-[10px] block">Waktu Pengambilan & Pengawas:</span>
                <strong className="text-slate-200 block text-xs">{selectedPhotoPreview.timestamp}</strong>
                <span className="text-slate-400 text-[11px] block mt-0.5">
                  Oleh: {selectedPhotoPreview.supervisorName || 'Pengawas'}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <a
                href={`https://www.google.com/maps?q=${selectedPhotoPreview.lat},${selectedPhotoPreview.lng}`}
                target="_blank"
                rel="noreferrer"
                className="flex items-center gap-1.5 px-3 py-2 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-xl transition-all"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Buka Titik di Google Maps Satelit</span>
              </a>

              <div className="flex items-center gap-2">
                <a
                  href={selectedPhotoPreview.dataUrl}
                  download={`SURYALAND_GEOTAG_${selectedPhotoPreview.blockCode}_${selectedPhotoPreview.fileName}`}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 text-xs font-bold rounded-xl transition-all cursor-pointer shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download Foto Asli</span>
                </a>
                <button
                  type="button"
                  onClick={() => setSelectedPhotoPreview(null)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs rounded-xl cursor-pointer"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
