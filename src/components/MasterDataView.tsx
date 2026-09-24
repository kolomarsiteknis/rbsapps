import React, { useState } from 'react';
import { 
  Truck, 
  Users, 
  Layers, 
  Fuel, 
  Building2, 
  Plus, 
  Check, 
  ShieldCheck, 
  Wrench, 
  AlertTriangle,
  FileCheck,
  Edit2,
  Trash2,
  Phone,
  MapPin,
  FileText,
  Lock,
  Search,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2
} from 'lucide-react';
import { Equipment, Worker, Block, InventoryItem, Client, Project, DailyLocationTarget } from '../types';
import { storageService } from '../services/storageService';

export const MasterDataView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'client' | 'blocks' | 'dailyTargets' | 'equipments' | 'workers' | 'inventory'>('client');
  
  const [clients, setClients] = useState<Client[]>(() => storageService.getClients());
  const [blocks, setBlocks] = useState<Block[]>(() => storageService.getBlocks());
  const [equipments, setEquipments] = useState<Equipment[]>(() => storageService.getEquipments());
  const [workers, setWorkers] = useState<Worker[]>(() => storageService.getWorkers());
  const [inventory, setInventory] = useState<InventoryItem[]>(() => storageService.getInventory());

  const [selectedClientForBlock, setSelectedClientForBlock] = useState<string>('ALL');

  // Client Modal State
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientForm, setClientForm] = useState<Partial<Client>>({
    name: '',
    fullCompanyName: '',
    contractNumber: '',
    projectName: '',
    location: 'Provinsi Riau',
    address: '',
    contactPerson: '',
    phone: '',
    totalAreaHa: 100,
    clearedAreaHa: 0,
    status: 'Aktif',
  });

  // Block Modal State
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockForm, setBlockForm] = useState<Partial<Block>>({
    clientId: clients[0]?.id || 'client-1',
    code: '',
    targetAreaHa: 50,
    dailyTargetAreaHa: 4.0,
    drainageTargetM: 1250,
    status: 'Dalam Pengerjaan',
  });

  // Worker Modal & Filter State (Superadmin Personil & Lokasi Penugasan)
  const [selectedClientForWorker, setSelectedClientForWorker] = useState<string>('ALL');
  const [selectedBlockForWorker, setSelectedBlockForWorker] = useState<string>('ALL');
  const [selectedTeamForWorker, setSelectedTeamForWorker] = useState<string>('ALL');
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState<Partial<Worker>>({
    name: '',
    category: 'Pekerja Utama',
    role: '',
    assignedEquipmentId: '',
    phone: '',
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-1',
    assignedBlockId: 'ALL',
  });

  // Quick update daily target for block by Director
  const handleUpdateDailyTarget = (blockId: string, dailyTargetHa: number) => {
    const blk = blocks.find((b) => b.id === blockId);
    if (blk) {
      blk.dailyTargetAreaHa = dailyTargetHa;
      storageService.saveBlock(blk);
      setBlocks([...storageService.getBlocks()]);
    }
  };

  // Daily Target State & Filters (CRUD Target Harian Ha per Hari per Lokasi Kerja)
  const [dailyTargets, setDailyTargets] = useState<DailyLocationTarget[]>(() => storageService.getDailyTargets());
  const [selectedClientForTarget, setSelectedClientForTarget] = useState<string>('ALL');
  const [selectedBlockForTarget, setSelectedBlockForTarget] = useState<string>('ALL');
  const [selectedDateForTarget, setSelectedDateForTarget] = useState<string>('');
  const [targetSearchQuery, setTargetSearchQuery] = useState<string>('');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<DailyLocationTarget | null>(null);
  const [targetForm, setTargetForm] = useState<Partial<DailyLocationTarget>>({
    clientId: clients[0]?.id || 'client-1',
    blockId: blocks[0]?.id || 'blk-1',
    date: new Date().toISOString().split('T')[0],
    dailyTargetAreaHa: 4.0,
    dailyDrainageTargetM: 100,
    soilType: 'Tanah Mineral',
    vegetationDensity: 'Sedang / Semak Belukar',
    assignedEquipmentCount: 3,
    assignedWorkerCount: 8,
    shift: 'Siang (07:00 - 17:00)',
    notes: '',
    status: 'Terjadwal',
  });

  const handleOpenAddTarget = (presetBlockId?: string, presetClientId?: string) => {
    setEditingTargetId(null);
    const chosenClientId = presetClientId || (selectedClientForTarget !== 'ALL' ? selectedClientForTarget : clients[0]?.id || 'client-1');
    const availableBlocks = blocks.filter((b) => b.clientId === chosenClientId);
    const chosenBlock = presetBlockId 
      ? blocks.find((b) => b.id === presetBlockId) 
      : availableBlocks[0] || blocks[0];

    const todayStr = new Date().toISOString().split('T')[0];

    setTargetForm({
      clientId: chosenBlock?.clientId || chosenClientId,
      blockId: chosenBlock?.id || 'blk-1',
      date: todayStr,
      dailyTargetAreaHa: chosenBlock?.dailyTargetAreaHa || 4.0,
      dailyDrainageTargetM: 100,
      soilType: 'Tanah Mineral',
      vegetationDensity: 'Sedang / Semak Belukar',
      assignedEquipmentCount: 3,
      assignedWorkerCount: 8,
      shift: 'Siang (07:00 - 17:00)',
      notes: '',
      status: 'Terjadwal',
    });
    setIsTargetModalOpen(true);
  };

  const handleOpenEditTarget = (target: DailyLocationTarget) => {
    setEditingTargetId(target.id);
    setTargetForm({ ...target });
    setIsTargetModalOpen(true);
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.clientId || !targetForm.blockId || !targetForm.date) {
      alert('Mohon lengkapi Klien, Lokasi Kerja (Blok), dan Tanggal pelaksanaan target.');
      return;
    }

    const client = clients.find((c) => c.id === targetForm.clientId);
    const block = blocks.find((b) => b.id === targetForm.blockId);

    const targetId = editingTargetId || `TGT-${targetForm.date}-${targetForm.blockId}-${Date.now().toString().slice(-4)}`;

    const saved: DailyLocationTarget = {
      id: targetId,
      clientId: targetForm.clientId,
      clientName: client?.name || 'Klien',
      blockId: targetForm.blockId,
      blockCode: block?.code || 'Blok',
      date: targetForm.date,
      dailyTargetAreaHa: Number(targetForm.dailyTargetAreaHa) || 4.0,
      dailyDrainageTargetM: Number(targetForm.dailyDrainageTargetM) || 0,
      soilType: targetForm.soilType || 'Tanah Mineral',
      vegetationDensity: targetForm.vegetationDensity || 'Sedang / Semak Belukar',
      assignedEquipmentCount: Number(targetForm.assignedEquipmentCount) || 3,
      assignedWorkerCount: Number(targetForm.assignedWorkerCount) || 8,
      shift: targetForm.shift || 'Siang (07:00 - 17:00)',
      notes: targetForm.notes?.trim() || '',
      status: targetForm.status || 'Terjadwal',
      createdBy: 'Direktur / Superadmin',
      createdAt: targetForm.createdAt || `${new Date().toLocaleDateString('id-ID')} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    };

    storageService.saveDailyTarget(saved);
    setDailyTargets([...storageService.getDailyTargets()]);
    setBlocks([...storageService.getBlocks()]);
    setIsTargetModalOpen(false);
    setEditingTargetId(null);
  };

  const handleDeleteTargetConfirm = (target: DailyLocationTarget) => {
    setTargetToDelete(target);
  };

  const executeDeleteTarget = () => {
    if (targetToDelete) {
      storageService.deleteDailyTarget(targetToDelete.id);
      setDailyTargets([...storageService.getDailyTargets()]);
      setTargetToDelete(null);
    }
  };

  const handleInlineUpdateDailyTargetValue = (targetId: string, newHa: number) => {
    const item = dailyTargets.find((t) => t.id === targetId);
    if (item && newHa > 0) {
      item.dailyTargetAreaHa = newHa;
      storageService.saveDailyTarget(item);
      setDailyTargets([...storageService.getDailyTargets()]);
      setBlocks([...storageService.getBlocks()]);
    }
  };

  // Equipment State & Filters (Superadmin CRUD Data Alat Berat & Batas BBM)
  const [isEquipmentModalOpen, setIsEquipmentModalOpen] = useState(false);
  const [editingEquipmentId, setEditingEquipmentId] = useState<string | null>(null);
  const [equipmentTypeFilter, setEquipmentTypeFilter] = useState<string>('ALL');
  const [equipmentStatusFilter, setEquipmentStatusFilter] = useState<string>('ALL');
  const [equipmentSearch, setEquipmentSearch] = useState<string>('');
  const [equipmentToDelete, setEquipmentToDelete] = useState<Equipment | null>(null);
  const [equipmentForm, setEquipmentForm] = useState<Partial<Equipment>>({
    id: '',
    name: '',
    type: 'Excavator',
    model: '',
    serialNumber: '',
    currentHm: 0,
    standardFuelRatio: 18.0,
    status: 'Operasional',
    operatorName: '',
  });

  const handleOpenAddEquipment = () => {
    setEditingEquipmentId(null);
    setEquipmentForm({
      id: '',
      name: '',
      type: 'Excavator',
      model: '',
      serialNumber: '',
      currentHm: 0,
      standardFuelRatio: 18.0,
      status: 'Operasional',
      operatorName: '',
    });
    setIsEquipmentModalOpen(true);
  };

  const handleOpenEditEquipment = (eq: Equipment) => {
    setEditingEquipmentId(eq.id);
    setEquipmentForm({ ...eq });
    setIsEquipmentModalOpen(true);
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipmentForm.id || !equipmentForm.name) {
      alert('Mohon lengkapi Kode Alat dan Nama Unit Alat Berat.');
      return;
    }

    const newEquip: Equipment = {
      id: equipmentForm.id.trim().toUpperCase(),
      name: equipmentForm.name.trim(),
      type: (equipmentForm.type as any) || 'Excavator',
      model: equipmentForm.model?.trim() || equipmentForm.name?.trim() || '',
      serialNumber: equipmentForm.serialNumber?.trim() || '-',
      currentHm: Number(equipmentForm.currentHm) || 0,
      standardFuelRatio: Number(equipmentForm.standardFuelRatio) || 18.0,
      status: (equipmentForm.status as any) || 'Operasional',
      operatorName: equipmentForm.operatorName?.trim() || '-',
    };

    storageService.saveEquipment(newEquip);
    setEquipments([...storageService.getEquipments()]);
    setIsEquipmentModalOpen(false);
    setEditingEquipmentId(null);
  };

  const handleDeleteEquipmentConfirm = (eq: Equipment) => {
    setEquipmentToDelete(eq);
  };

  const executeDeleteEquipment = () => {
    if (equipmentToDelete) {
      storageService.deleteEquipment(equipmentToDelete.id);
      setEquipments([...storageService.getEquipments()]);
      setEquipmentToDelete(null);
    }
  };

  // Quick edit equipment status or fuel limit
  const handleUpdateFuelLimit = (eqId: string, newLimit: number) => {
    const eq = equipments.find((e) => e.id === eqId);
    if (eq) {
      eq.standardFuelRatio = newLimit;
      storageService.saveEquipment(eq);
      setEquipments([...storageService.getEquipments()]);
    }
  };

  const handleUpdateStatus = (eqId: string, status: any) => {
    const eq = equipments.find((e) => e.id === eqId);
    if (eq) {
      eq.status = status;
      storageService.saveEquipment(eq);
      setEquipments([...storageService.getEquipments()]);
    }
  };

  // Save Client (Create or Update)
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.name || !clientForm.fullCompanyName) {
      alert('Mohon isi nama singkat dan nama lengkap perusahaan.');
      return;
    }

    const clientId = editingClientId || `client-${Date.now()}`;
    const newClient: Client = {
      id: clientId,
      name: clientForm.name,
      fullCompanyName: clientForm.fullCompanyName,
      contractNumber: clientForm.contractNumber || `SPK-LC/${clientForm.name.replace(/\s+/g, '')}/2026`,
      projectName: clientForm.projectName || `Land Clearing Perkebunan ${clientForm.name}`,
      location: clientForm.location || 'Provinsi Riau',
      address: clientForm.address || clientForm.location || 'Riau',
      contactPerson: clientForm.contactPerson || 'PIC Lapangan',
      phone: clientForm.phone || '-',
      totalAreaHa: Number(clientForm.totalAreaHa) || 100,
      clearedAreaHa: Number(clientForm.clearedAreaHa) || 0,
      status: (clientForm.status as any) || 'Aktif',
    };

    storageService.saveClient(newClient);

    // If new client, create initial block
    if (!editingClientId) {
      const newBlock: Block = {
        id: `blk-${Date.now()}`,
        projectId: `proj-${clientId}`,
        clientId: clientId,
        code: `Blok 01 (${newClient.name})`,
        targetAreaHa: newClient.totalAreaHa,
        clearedAreaHa: 0,
        status: 'Dalam Pengerjaan',
        drainageTargetM: newClient.totalAreaHa * 25,
        drainageDoneM: 0,
      };
      storageService.saveBlock(newBlock);
    }

    setClients(storageService.getClients());
    setBlocks(storageService.getBlocks());
    setIsClientModalOpen(false);
    setEditingClientId(null);
  };

  // Delete Client
  const handleDeleteClient = (id: string, _name: string) => {
    storageService.deleteClient(id);
    setClients(storageService.getClients());
  };

  // Save Block
  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.code) {
      return;
    }

    const newBlock: Block = {
      id: `blk-${Date.now()}`,
      projectId: `proj-${blockForm.clientId}`,
      clientId: blockForm.clientId || clients[0]?.id || 'client-1',
      code: blockForm.code,
      targetAreaHa: Number(blockForm.targetAreaHa) || 50,
      dailyTargetAreaHa: Number(blockForm.dailyTargetAreaHa) || 4.0,
      clearedAreaHa: 0,
      status: (blockForm.status as any) || 'Dalam Pengerjaan',
      drainageTargetM: Number(blockForm.drainageTargetM) || 1000,
      drainageDoneM: 0,
    };

    storageService.saveBlock(newBlock);
    setBlocks(storageService.getBlocks());
    setIsBlockModalOpen(false);
  };

  // Delete Block
  const handleDeleteBlock = (id: string, _code: string) => {
    storageService.deleteBlock(id);
    setBlocks(storageService.getBlocks());
  };

  // Save Worker (Create or Update)
  const handleSaveWorker = (e: React.FormEvent) => {
    e.preventDefault();
    if (!workerForm.name || !workerForm.role) {
      return;
    }

    const workerId = editingWorkerId || `w-${Date.now()}`;
    const newWorker: Worker = {
      id: workerId,
      name: workerForm.name,
      category: workerForm.category || 'Pekerja Utama',
      role: workerForm.role,
      assignedEquipmentId: workerForm.assignedEquipmentId || undefined,
      phone: workerForm.phone || '-',
      status: (workerForm.status as any) || 'Hadir',
      teamName: workerForm.teamName || 'Tim Operator Alat Berat',
      assignedClientId: workerForm.assignedClientId || 'ALL',
      assignedBlockId: workerForm.assignedBlockId || 'ALL',
    };

    storageService.saveWorker(newWorker);
    setWorkers([...storageService.getWorkers()]);
    setIsWorkerModalOpen(false);
    setEditingWorkerId(null);
  };

  // Edit Worker
  const handleEditWorker = (worker: Worker) => {
    setEditingWorkerId(worker.id);
    setWorkerForm({
      name: worker.name,
      category: worker.category,
      role: worker.role,
      assignedEquipmentId: worker.assignedEquipmentId || '',
      phone: worker.phone,
      status: worker.status,
      teamName: worker.teamName || 'Tim Operator Alat Berat',
      assignedClientId: worker.assignedClientId || 'ALL',
      assignedBlockId: worker.assignedBlockId || 'ALL',
    });
    setIsWorkerModalOpen(true);
  };

  // Delete Worker
  const handleDeleteWorker = (id: string, _name: string) => {
    storageService.deleteWorker(id);
    setWorkers([...storageService.getWorkers()]);
  };

  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Pengaturan Sistem & Master Data
              </span>
              <span className="text-xs text-slate-500 font-mono">PT. SURYALAND GROUP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Master Data Operasional Proyek Land Clearing
            </h2>
            <p className="text-xs text-slate-500">
              Pengaturan daftar klien perkebunan (Multi-Client), blok kerja, alat berat, batas BBM solar, dan personel lapangan.
            </p>
          </div>
        </div>

        {/* Sub-tab navigation */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 text-xs font-bold">
          <button
            onClick={() => setActiveSubTab('client')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'client'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>Daftar Klien Perkebunan ({clients.length} PT)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('blocks')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'blocks'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Lokasi Blok Kerja ({blocks.length} Blok)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('dailyTargets')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'dailyTargets'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>Target Harian (Ha) ({dailyTargets.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('equipments')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'equipments'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>Alat Berat & Batas BBM ({equipments.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('workers')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'workers'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Tim & Personel ({workers.length})</span>
          </button>

          <button
            onClick={() => setActiveSubTab('inventory')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer ${
              activeSubTab === 'inventory'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Fuel className="w-4 h-4" />
            <span>Inventaris Logistik Lapangan</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB: CLIENT MANAGEMENT (MULTI-CLIENT) */}
      {activeSubTab === 'client' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div>
              <h3 className="text-sm font-black text-slate-900 uppercase">
                Daftar Seluruh Klien Perkebunan (PT)
              </h3>
              <p className="text-xs text-slate-500">
                Aplikasi ini mendukung banyak klien sekaligus. Anda dapat menambahkan PT lainnya sebanyak mungkin.
              </p>
            </div>
            <button
              onClick={() => {
                setEditingClientId(null);
                setClientForm({
                  name: '',
                  fullCompanyName: '',
                  contractNumber: '',
                  projectName: '',
                  location: 'Provinsi Riau',
                  address: '',
                  contactPerson: '',
                  phone: '',
                  totalAreaHa: 100,
                  clearedAreaHa: 0,
                  status: 'Aktif',
                });
                setIsClientModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Klien (PT Baru)</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {clients.map((c) => {
              const clientBlocks = blocks.filter((b) => b.clientId === c.id);
              const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(1) : '0';

              return (
                <div
                  key={c.id}
                  className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-base font-black text-slate-900">{c.name}</span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                        {c.status}
                      </span>
                    </div>

                    <div className="text-xs font-bold text-slate-700 leading-tight">
                      {c.fullCompanyName}
                    </div>

                    <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1 text-xs">
                      <div className="flex items-center gap-1.5 text-slate-600 font-mono">
                        <FileText className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">SPK: {c.contractNumber}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.location}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">{c.contactPerson} ({c.phone})</span>
                      </div>
                    </div>
                  </div>

                  {/* Target & Realization */}
                  <div className="space-y-1.5">
                    <div className="flex justify-between items-baseline text-xs">
                      <span className="text-slate-500 font-medium">Progres Fisik Lahan:</span>
                      <span className="font-mono font-bold text-slate-900">
                        {c.clearedAreaHa} / {c.totalAreaHa} Ha ({pct}%)
                      </span>
                    </div>
                    <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                      <div
                        className="bg-amber-500 h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                      />
                    </div>
                    <div className="text-[11px] text-slate-500 flex justify-between pt-1">
                      <span>Total Blok Terdaftar:</span>
                      <strong className="text-slate-800">{clientBlocks.length} Blok</strong>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                    <button
                      onClick={() => {
                        setBlockForm({
                          clientId: c.id,
                          code: '',
                          targetAreaHa: 50,
                          drainageTargetM: 1250,
                          status: 'Dalam Pengerjaan',
                        });
                        setIsBlockModalOpen(true);
                      }}
                      className="text-xs font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Blok</span>
                    </button>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          setEditingClientId(c.id);
                          setClientForm({ ...c });
                          setIsClientModalOpen(true);
                        }}
                        className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 hover:text-slate-900 transition cursor-pointer"
                        title="Edit Data Klien"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>

                      {clients.length > 1 && (
                        <button
                          onClick={() => handleDeleteClient(c.id, c.name)}
                          className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer"
                          title="Hapus Klien"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* SUB-TAB: BLOCKS */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-600">Filter Berdasarkan Klien:</label>
              <select
                value={selectedClientForBlock}
                onChange={(e) => setSelectedClientForBlock(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none"
              >
                <option value="ALL">Semua Klien ({clients.length} PT)</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.fullCompanyName})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setActiveSubTab('dailyTargets');
                  handleOpenAddTarget();
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-100 hover:bg-amber-200 text-amber-950 font-black rounded-xl text-xs border border-amber-300 transition cursor-pointer shadow-xs"
              >
                <Target className="w-4 h-4 text-amber-700" />
                <span>+ Tetapkan Target Harian (Ha)</span>
              </button>

              <button
                onClick={() => {
                  setBlockForm({
                    clientId: selectedClientForBlock !== 'ALL' ? selectedClientForBlock : clients[0]?.id,
                    code: '',
                    targetAreaHa: 50,
                    drainageTargetM: 1250,
                    status: 'Dalam Pengerjaan',
                  });
                  setIsBlockModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Blok Baru</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {blocks
              .filter((b) => selectedClientForBlock === 'ALL' || b.clientId === selectedClientForBlock)
              .map((b) => {
                const ownerClient = clients.find((c) => c.id === b.clientId);
                return (
                  <div key={b.id} className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between">
                      <div>
                        <span className="font-black text-slate-900 text-base">{b.code}</span>
                        {ownerClient && (
                          <div className="text-[11px] text-amber-700 font-bold">
                            Klien: {ownerClient.name}
                          </div>
                        )}
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.status === 'Dalam Pengerjaan'
                            ? 'bg-amber-100 text-amber-900 border border-amber-300'
                            : 'bg-slate-100 text-slate-600'
                        }`}
                      >
                        {b.status}
                      </span>
                    </div>

                    <div className="space-y-1.5 text-xs">
                      <div className="flex justify-between text-slate-600">
                        <span>Target Total Luas:</span>
                        <strong className="font-mono text-slate-900">{b.targetAreaHa} Hektar</strong>
                      </div>

                      {/* TARGET HARIAN LAND CLEARING DITENTUKAN DIREKTUR */}
                      <div className="flex items-center justify-between bg-amber-50/80 p-2 rounded-xl border border-amber-200 text-xs">
                        <div>
                          <span className="font-bold text-amber-950 flex items-center gap-1 text-[11px]">
                            <Lock className="w-3 h-3 text-amber-700" /> Target Harian LC (Ha):
                          </span>
                          <span className="text-[10px] text-amber-700">Terkunci di Form Pengawas</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            step="0.1"
                            value={b.dailyTargetAreaHa ?? 4.0}
                            onChange={(e) => handleUpdateDailyTarget(b.id, parseFloat(e.target.value) || 0)}
                            className="w-16 px-2 py-1 bg-white border border-amber-300 rounded font-mono font-black text-amber-950 text-right text-xs shadow-xs focus:ring-1 focus:ring-amber-500"
                            title="Tentukan target harian untuk lokasi ini (akan terkunci di formulir pelaporan pengawas)"
                          />
                          <span className="font-bold text-amber-900 text-xs">Ha</span>
                        </div>
                      </div>

                      <div className="flex justify-between text-slate-600">
                        <span>Realisasi Saat Ini:</span>
                        <strong className="font-mono text-emerald-700">
                          {b.clearedAreaHa} Ha ({b.targetAreaHa > 0 ? ((b.clearedAreaHa / b.targetAreaHa) * 100).toFixed(1) : 0}%)
                        </strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Target Drainase:</span>
                        <strong className="font-mono text-slate-900">{b.drainageTargetM} Meter</strong>
                      </div>
                      <div className="flex justify-between text-slate-600">
                        <span>Realisasi Drainase:</span>
                        <strong className="font-mono text-blue-700">{b.drainageDoneM} Meter</strong>
                      </div>
                    </div>

                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-emerald-500 h-full rounded-full"
                        style={{ width: `${b.targetAreaHa > 0 ? Math.min(100, (b.clearedAreaHa / b.targetAreaHa) * 100) : 0}%` }}
                      />
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => {
                          setActiveSubTab('dailyTargets');
                          handleOpenAddTarget(b.id, b.clientId);
                        }}
                        className="text-[11px] font-bold text-amber-700 hover:text-amber-950 flex items-center gap-1 cursor-pointer bg-amber-50 hover:bg-amber-100 px-2 py-1 rounded-lg border border-amber-200 transition"
                        title="Buat / Tetapkan Target Harian untuk blok ini"
                      >
                        <Target className="w-3.5 h-3.5 text-amber-600" />
                        <span>+ Target Harian (Ha)</span>
                      </button>

                      <button
                        onClick={() => handleDeleteBlock(b.id, b.code)}
                        className="text-[11px] text-slate-400 hover:text-rose-600 flex items-center gap-1 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                        <span>Hapus Blok</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* SUB-TAB: TARGET HARIAN (HA) PER HARI PER LOKASI KERJA (CRUD SUPERADMIN / DIREKTUR) */}
      {activeSubTab === 'dailyTargets' && (() => {
        const todayDateStr = new Date().toISOString().split('T')[0];

        const filteredTargets = dailyTargets.filter((item) => {
          const matchClient = selectedClientForTarget === 'ALL' || item.clientId === selectedClientForTarget;
          const matchBlock = selectedBlockForTarget === 'ALL' || item.blockId === selectedBlockForTarget;
          const matchDate = !selectedDateForTarget || item.date === selectedDateForTarget;
          const matchSearch =
            !targetSearchQuery ||
            item.blockCode.toLowerCase().includes(targetSearchQuery.toLowerCase()) ||
            (item.clientName && item.clientName.toLowerCase().includes(targetSearchQuery.toLowerCase())) ||
            (item.notes && item.notes.toLowerCase().includes(targetSearchQuery.toLowerCase())) ||
            item.date.includes(targetSearchQuery);
          return matchClient && matchBlock && matchDate && matchSearch;
        });

        const totalTargetTodayHa = dailyTargets
          .filter((t) => t.date === todayDateStr)
          .reduce((acc, t) => acc + (t.dailyTargetAreaHa || 0), 0);

        const avgDailyTargetHa = dailyTargets.length > 0
          ? (dailyTargets.reduce((acc, t) => acc + (t.dailyTargetAreaHa || 0), 0) / dailyTargets.length).toFixed(1)
          : '0.0';

        const totalDrainageTargetM = dailyTargets
          .reduce((acc, t) => acc + (t.dailyDrainageTargetM || 0), 0);

        const uniqueCoveredBlocks = new Set(dailyTargets.map((t) => t.blockId)).size;

        return (
          <div className="space-y-5">
            {/* Top Subheader Card */}
            <div className="bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-transparent p-5 rounded-2xl border border-amber-300 bg-white flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 bg-amber-500 text-slate-950 text-[10px] font-black rounded uppercase tracking-wider flex items-center gap-1">
                    <Lock className="w-3 h-3 text-slate-950" /> Otoritas Direktur
                  </span>
                  <span className="text-xs font-bold text-slate-500">Penetapan Target Ritme Kerja Lapangan</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  Target Harian Land Clearing (Ha) per Lokasi Kerja
                </h3>
                <p className="text-xs text-slate-600 max-w-2xl leading-relaxed">
                  Kelola dan jadwalkan target harian pembersihan lahan (Ha/hari) serta target saluran drainase (Meter/hari) untuk masing-masing blok kerja per hari. Nilai target ini akan <strong>terkunci secara otomatis</strong> pada formulir pelaporan pengawas lapangan guna memastikan disiplin ritme kerja.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAddTarget()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>+ Tetapkan Target Harian Baru</span>
                </button>
              </div>
            </div>

            {/* 5 Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
                <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Jadwal Target</span>
                <strong className="text-xl font-black text-slate-900">{dailyTargets.length} Record</strong>
                <span className="text-[10px] text-slate-400 block mt-0.5">Seluruh Blok & Hari</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
                <span className="text-[10px] font-bold uppercase text-amber-800 block">Target Hari Ini</span>
                <strong className="text-xl font-black text-amber-800">
                  {totalTargetTodayHa.toFixed(1)} Ha
                </strong>
                <span className="text-[10px] text-amber-600 block mt-0.5">Tanggal {todayDateStr}</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-blue-200 shadow-xs bg-blue-50/20">
                <span className="text-[10px] font-bold uppercase text-blue-800 block">Rata-rata Target</span>
                <strong className="text-xl font-black text-blue-800">
                  {avgDailyTargetHa} Ha/Hari
                </strong>
                <span className="text-[10px] text-blue-600 block mt-0.5">Standar Ritme Produksi</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-xs bg-indigo-50/20">
                <span className="text-[10px] font-bold uppercase text-indigo-800 block">Total Target Parit</span>
                <strong className="text-xl font-black text-indigo-800">
                  {totalDrainageTargetM.toLocaleString()} M
                </strong>
                <span className="text-[10px] text-indigo-600 block mt-0.5">Saluran & Drainase</span>
              </div>
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20 col-span-2 sm:col-span-1">
                <span className="text-[10px] font-bold uppercase text-emerald-800 block">Lokasi Tercover</span>
                <strong className="text-xl font-black text-emerald-800">
                  {uniqueCoveredBlocks} / {blocks.length} Blok
                </strong>
                <span className="text-[10px] text-emerald-600 block mt-0.5">Blok Memiliki Jadwal Target</span>
              </div>
            </div>

            {/* Filters & Search Toolbar */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                {/* Search query */}
                <div className="relative flex-1 max-w-sm">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={targetSearchQuery}
                    onChange={(e) => setTargetSearchQuery(e.target.value)}
                    placeholder="Cari kode blok, klien, tanggal, catatan..."
                    className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                  />
                  {targetSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setTargetSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Dropdowns */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* Client Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Klien:</span>
                    <select
                      value={selectedClientForTarget}
                      onChange={(e) => {
                        setSelectedClientForTarget(e.target.value);
                        setSelectedBlockForTarget('ALL');
                      }}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">Semua Klien ({clients.length} PT)</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Block Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Lokasi / Blok:</span>
                    <select
                      value={selectedBlockForTarget}
                      onChange={(e) => setSelectedBlockForTarget(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none"
                    >
                      <option value="ALL">Semua Blok</option>
                      {blocks
                        .filter((b) => selectedClientForTarget === 'ALL' || b.clientId === selectedClientForTarget)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} ({clients.find((c) => c.id === b.clientId)?.name})
                          </option>
                        ))}
                    </select>
                  </div>

                  {/* Date Filter */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-bold">Tanggal:</span>
                    <input
                      type="date"
                      value={selectedDateForTarget}
                      onChange={(e) => setSelectedDateForTarget(e.target.value)}
                      className="px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-xl font-bold text-slate-800 focus:outline-none text-xs"
                    />
                    {selectedDateForTarget ? (
                      <button
                        type="button"
                        onClick={() => setSelectedDateForTarget('')}
                        className="px-2 py-1 bg-slate-200 text-slate-700 font-bold rounded-lg text-[10px] hover:bg-slate-300 cursor-pointer"
                        title="Tampilkan semua tanggal"
                      >
                        Reset Tgl
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setSelectedDateForTarget(todayDateStr)}
                        className="px-2.5 py-1.5 bg-amber-100 text-amber-900 font-bold rounded-xl text-xs hover:bg-amber-200 cursor-pointer border border-amber-300"
                      >
                        Hari Ini
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Targets Table */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900 text-white font-bold uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-3 px-3.5">Tanggal & Hari</th>
                      <th className="py-3 px-3.5">Klien & Lokasi Kerja</th>
                      <th className="py-3 px-3.5 bg-amber-950/40 text-amber-300 border-x border-amber-900/50">
                        Target Luas Harian (Ha)
                      </th>
                      <th className="py-3 px-3.5">Target Drainase</th>
                      <th className="py-3 px-3.5">Kondisi Lahan</th>
                      <th className="py-3 px-3.5">Alokasi Armada & SDM</th>
                      <th className="py-3 px-3.5">Instruksi Khusus Direktur</th>
                      <th className="py-3 px-3.5">Status Target</th>
                      <th className="py-3 px-3.5 text-center">Aksi (CRUD)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredTargets.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="py-10 text-center text-slate-400 bg-slate-50/50">
                          <div className="max-w-md mx-auto space-y-2">
                            <Target className="w-8 h-8 text-slate-300 mx-auto" />
                            <p className="font-bold text-slate-600 text-sm">Tidak Ada Target Harian Ditemukan</p>
                            <p className="text-xs text-slate-400">
                              Tidak ada data target harian yang sesuai filter atau belum ada target yang dibuat untuk tanggal/blok ini.
                            </p>
                            <div className="pt-2">
                              <button
                                type="button"
                                onClick={() => handleOpenAddTarget()}
                                className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow cursor-pointer inline-flex items-center gap-1.5"
                              >
                                <Plus className="w-3.5 h-3.5" />
                                <span>Tetapkan Target Harian Pertama</span>
                              </button>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTargets.map((item) => {
                        const isToday = item.date === todayDateStr;
                        const blockData = blocks.find((b) => b.id === item.blockId);
                        const clientData = clients.find((c) => c.id === item.clientId);

                        return (
                          <tr
                            key={item.id}
                            className={`hover:bg-amber-50/40 transition ${
                              isToday ? 'bg-amber-50/30' : ''
                            }`}
                          >
                            {/* Tanggal & Hari */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span className="font-mono font-bold text-slate-900">{item.date}</span>
                              </div>
                              {isToday ? (
                                <span className="inline-block mt-1 px-1.5 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded border border-emerald-300">
                                  ● Hari Ini
                                </span>
                              ) : (
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  Shift: {item.shift ? item.shift.split(' ')[0] : 'Siang'}
                                </span>
                              )}
                            </td>

                            {/* Klien & Lokasi Kerja */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="font-black text-slate-900 flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded font-mono text-slate-800">
                                  {item.blockCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-amber-800 font-bold mt-1">
                                {item.clientName || clientData?.name || 'Klien'}
                              </div>
                              {blockData && (
                                <span className="text-[10px] text-slate-400 block">
                                  Total Blok: {blockData.targetAreaHa} Ha
                                </span>
                              )}
                            </td>

                            {/* Target Luas Harian (Ha) - FEATURED INLINE EDIT / BADGE */}
                            <td className="py-3 px-3.5 align-top bg-amber-50/50 border-x border-amber-200">
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="number"
                                  step="0.1"
                                  min="0.1"
                                  value={item.dailyTargetAreaHa}
                                  onChange={(e) =>
                                    handleInlineUpdateDailyTargetValue(item.id, parseFloat(e.target.value) || 0)
                                  }
                                  className="w-16 px-2 py-1 bg-white border border-amber-300 rounded-lg text-center font-mono font-black text-amber-950 text-sm shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                                  title="Ubah langsung target harian (Ha)"
                                />
                                <span className="font-black text-amber-950 text-xs">Ha/hari</span>
                              </div>
                              <span className="text-[10px] text-amber-700 block mt-1 font-medium flex items-center gap-1">
                                <Lock className="w-2.5 h-2.5" /> Terkunci di form pengawas
                              </span>
                              {item.actualClearedHa !== undefined && item.actualClearedHa > 0 && (
                                <div className="mt-1 text-[10px] text-emerald-800 font-bold bg-emerald-100/70 px-1.5 py-0.5 rounded">
                                  Realisasi: {item.actualClearedHa} Ha (
                                  {((item.actualClearedHa / item.dailyTargetAreaHa) * 100).toFixed(0)}%)
                                </div>
                              )}
                            </td>

                            {/* Target Drainase */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <span className="font-mono font-bold text-slate-800">
                                {item.dailyDrainageTargetM ? `${item.dailyDrainageTargetM} M` : '-'}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">Parit & Saluran</span>
                            </td>

                            {/* Kondisi Lahan */}
                            <td className="py-3 px-3.5 align-top">
                              <span className="inline-block px-1.5 py-0.5 bg-slate-100 text-slate-700 text-[10px] font-bold rounded">
                                {item.soilType || 'Tanah Mineral'}
                              </span>
                              <span className="text-[10px] text-slate-500 block mt-1">
                                {item.vegetationDensity || 'Sedang / Semak'}
                              </span>
                            </td>

                            {/* Alokasi Armada & SDM */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <div className="flex items-center gap-1 text-slate-800 font-bold">
                                <Truck className="w-3.5 h-3.5 text-slate-500" />
                                <span>{item.assignedEquipmentCount || 3} Unit Alat</span>
                              </div>
                              <div className="flex items-center gap-1 text-slate-500 text-[11px] mt-0.5">
                                <Users className="w-3.5 h-3.5 text-slate-400" />
                                <span>{item.assignedWorkerCount || 8} Personel</span>
                              </div>
                            </td>

                            {/* Instruksi Khusus Direktur */}
                            <td className="py-3 px-3.5 align-top max-w-xs">
                              {item.notes ? (
                                <p className="text-slate-700 italic text-[11px] bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                                  "{item.notes}"
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">- Tidak ada catatan khusus -</span>
                              )}
                            </td>

                            {/* Status Target */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <span
                                className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                  item.status === 'Tercapai'
                                    ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                    : item.status === 'Di bawah Target'
                                    ? 'bg-orange-100 text-orange-800 border-orange-300'
                                    : item.status === 'Tertunda Cuaca'
                                    ? 'bg-slate-100 text-slate-700 border-slate-300'
                                    : 'bg-amber-100 text-amber-900 border-amber-300'
                                }`}
                              >
                                {item.status || 'Terjadwal'}
                              </span>
                            </td>

                            {/* Aksi CRUD */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditTarget(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-600 hover:text-amber-900 rounded-lg transition cursor-pointer border border-slate-200"
                                  title="Edit Target Harian"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteTargetConfirm(item)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer border border-slate-200"
                                  title="Hapus Target Harian"
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
          </div>
        );
      })()}

      {/* SUB-TAB: EQUIPMENTS (CRUD DATA ALAT BERAT & BATAS BBM SUPERADMIN) */}
      {activeSubTab === 'equipments' && (
        <div className="space-y-4">
          {/* Summary Metric Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
              <span className="text-[10px] font-bold uppercase text-slate-500 block">Total Unit Armada</span>
              <strong className="text-xl font-black text-slate-900">{equipments.length} Unit</strong>
              <span className="text-[10px] text-slate-400 block mt-0.5">Seluruh Kategori</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
              <span className="text-[10px] font-bold uppercase text-emerald-700 block">Unit Operasional</span>
              <strong className="text-xl font-black text-emerald-700">
                {equipments.filter((e) => e.status === 'Operasional').length} Unit
              </strong>
              <span className="text-[10px] text-emerald-600 block mt-0.5">Siap Kerja di Lapangan</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-xs bg-amber-50/20">
              <span className="text-[10px] font-bold uppercase text-amber-800 block">Unit Standby</span>
              <strong className="text-xl font-black text-amber-800">
                {equipments.filter((e) => e.status === 'Standby').length} Unit
              </strong>
              <span className="text-[10px] text-amber-700 block mt-0.5">Tersedia Cadangan</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-rose-200 shadow-xs bg-rose-50/20">
              <span className="text-[10px] font-bold uppercase text-rose-700 block">Unit Breakdown</span>
              <strong className="text-xl font-black text-rose-700">
                {equipments.filter((e) => e.status === 'Breakdown').length} Unit
              </strong>
              <span className="text-[10px] text-rose-600 block mt-0.5">Perbaikan / Bengkel</span>
            </div>
            <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs bg-slate-50/50 col-span-2 sm:col-span-1">
              <span className="text-[10px] font-bold uppercase text-amber-700 block flex items-center gap-1">
                <Fuel className="w-3 h-3 text-amber-600" /> Rata Batas BBM
              </span>
              <strong className="text-xl font-mono font-black text-slate-900">
                {(equipments.reduce((acc, e) => acc + (e.standardFuelRatio || 0), 0) / (equipments.length || 1)).toFixed(1)}{' '}
                <span className="text-xs font-bold text-slate-500">L/HM</span>
              </strong>
              <span className="text-[10px] text-slate-500 block mt-0.5">Toleransi Solar Standar</span>
            </div>
          </div>

          {/* Action & Filter Bar */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Truck className="w-5 h-5 text-amber-500" />
                Data Master Alat Berat & Batas Standar Konsumsi BBM (L/HM)
              </h3>
              <p className="text-xs text-slate-500">
                Superadmin berwenang menambah, mengubah, menetapkan batas toleransi rasio BBM, serta menghapus data alat berat.
              </p>
            </div>

            <button
              onClick={handleOpenAddEquipment}
              className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer self-start md:self-auto"
            >
              <Plus className="w-4 h-4" />
              <span>+ Tambah Alat Berat Baru</span>
            </button>
          </div>

          {/* Filters Bar */}
          <div className="bg-white rounded-2xl p-3 border border-slate-200 shadow-xs flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2 flex-1">
              {/* Search */}
              <div className="relative min-w-[200px] flex-1 sm:max-w-xs">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Cari kode, nama alat, operator..."
                  value={equipmentSearch}
                  onChange={(e) => setEquipmentSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              {/* Tipe Filter */}
              <select
                value={equipmentTypeFilter}
                onChange={(e) => setEquipmentTypeFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Jenis Alat</option>
                <option value="Excavator">Excavator</option>
                <option value="Bulldozer">Bulldozer</option>
                <option value="Dump Truck">Dump Truck</option>
                <option value="Motor Grader">Motor Grader</option>
                <option value="Vibro Roller">Vibro Roller</option>
              </select>

              {/* Status Filter */}
              <select
                value={equipmentStatusFilter}
                onChange={(e) => setEquipmentStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Status Unit</option>
                <option value="Operasional">Operasional</option>
                <option value="Standby">Standby</option>
                <option value="Breakdown">Breakdown</option>
                <option value="Perawatan Rutin">Perawatan Rutin</option>
              </select>
            </div>

            <div className="text-[11px] text-slate-500 font-medium">
              Menampilkan {equipments.filter((eq) => {
                const matchType = equipmentTypeFilter === 'ALL' || eq.type === equipmentTypeFilter;
                const matchStatus = equipmentStatusFilter === 'ALL' || eq.status === equipmentStatusFilter;
                const matchSearch =
                  !equipmentSearch ||
                  eq.id.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                  eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                  eq.operatorName?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                  eq.serialNumber?.toLowerCase().includes(equipmentSearch.toLowerCase());
                return matchType && matchStatus && matchSearch;
              }).length} dari {equipments.length} unit
            </div>
          </div>

          {/* Table */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900 text-white uppercase font-black tracking-wider text-[10px]">
                  <tr>
                    <th className="p-3">Kode Alat</th>
                    <th className="p-3">Nama Unit & Model</th>
                    <th className="p-3">Kategori</th>
                    <th className="p-3">Operator Penanggungjawab</th>
                    <th className="p-3 text-right">HM Berjalan</th>
                    <th className="p-3 text-center">Batas Standar Solar (L/HM)</th>
                    <th className="p-3 text-center">Status Unit</th>
                    <th className="p-3 text-center">Aksi (CRUD)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {equipments
                    .filter((eq) => {
                      const matchType = equipmentTypeFilter === 'ALL' || eq.type === equipmentTypeFilter;
                      const matchStatus = equipmentStatusFilter === 'ALL' || eq.status === equipmentStatusFilter;
                      const matchSearch =
                        !equipmentSearch ||
                        eq.id.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                        eq.name.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                        eq.operatorName?.toLowerCase().includes(equipmentSearch.toLowerCase()) ||
                        eq.serialNumber?.toLowerCase().includes(equipmentSearch.toLowerCase());
                      return matchType && matchStatus && matchSearch;
                    })
                    .map((eq) => (
                      <tr key={eq.id} className="hover:bg-slate-50 transition">
                        <td className="p-3 font-mono font-black text-amber-800 bg-amber-50/50">
                          <span className="px-2 py-0.5 rounded bg-amber-100/80 border border-amber-300">
                            {eq.id}
                          </span>
                        </td>
                        <td className="p-3">
                          <div className="font-black text-slate-900">{eq.name}</div>
                          <div className="text-[11px] text-slate-500 font-mono">
                            Model: {eq.model || '-'} • SN: {eq.serialNumber || '-'}
                          </div>
                        </td>
                        <td className="p-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                            {eq.type}
                          </span>
                        </td>
                        <td className="p-3 text-slate-700 font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-slate-900">{eq.operatorName || '-'}</span>
                          </div>
                        </td>
                        <td className="p-3 text-right font-mono font-bold text-slate-800">
                          {eq.currentHm?.toLocaleString() ?? 0} HM
                        </td>
                        <td className="p-3 text-center">
                          <div className="inline-flex items-center gap-1.5 bg-amber-50/80 px-2 py-1 rounded-lg border border-amber-200">
                            <input
                              type="number"
                              step="0.5"
                              value={eq.standardFuelRatio}
                              onChange={(e) => handleUpdateFuelLimit(eq.id, parseFloat(e.target.value) || 18)}
                              className="w-16 px-1.5 py-0.5 text-center font-mono font-black border border-amber-300 rounded bg-white text-xs text-amber-950 focus:ring-1 focus:ring-amber-500"
                              title="Ubah batas rasio solar per HM secara langsung"
                            />
                            <span className="text-amber-900 font-bold text-[10px]">L/HM</span>
                          </div>
                        </td>
                        <td className="p-3 text-center">
                          <select
                            value={eq.status}
                            onChange={(e) => handleUpdateStatus(eq.id, e.target.value)}
                            className={`px-2.5 py-1 rounded-lg text-xs font-bold border ${
                              eq.status === 'Operasional'
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : eq.status === 'Breakdown'
                                ? 'bg-rose-50 text-rose-800 border-rose-300'
                                : eq.status === 'Standby'
                                ? 'bg-amber-50 text-amber-800 border-amber-300'
                                : 'bg-slate-50 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="Operasional">Operasional</option>
                            <option value="Standby">Standby</option>
                            <option value="Breakdown">Breakdown</option>
                            <option value="Perawatan Rutin">Perawatan Rutin</option>
                          </select>
                        </td>
                        <td className="p-3 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              type="button"
                              onClick={() => handleOpenEditEquipment(eq)}
                              className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition cursor-pointer border border-slate-200"
                              title="Edit Seluruh Data Alat Berat & Batas BBM"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteEquipmentConfirm(eq)}
                              className="p-1.5 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-lg transition cursor-pointer border border-rose-200"
                              title="Hapus Unit Alat Berat"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* SUB-TAB: WORKERS */}
      {activeSubTab === 'workers' && (
        <div className="space-y-4">
          {/* Header & Controls: Filter Klien & Tim, Tambah Personil */}
          <div className="bg-white rounded-2xl p-4 shadow-lg border border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h3 className="font-black text-slate-900 text-base flex items-center gap-2">
                <Users className="w-5 h-5 text-amber-500" />
                Daftar Personil, Tim Pekerja & Lokasi Penugasan
              </h3>
              <p className="text-xs text-slate-500">
                Superadmin menentukan tim kerja (Operator, Rintis, Mekanik, Drainase) dan lokasi kerja penugasan (Klien & Blok).
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              {/* Filter Klien */}
              <select
                value={selectedClientForWorker}
                onChange={(e) => {
                  setSelectedClientForWorker(e.target.value);
                  setSelectedBlockForWorker('ALL');
                }}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Klien Penugasan</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Klien: {c.name}
                  </option>
                ))}
              </select>

              {/* Filter Lokasi Kerja (Disamping Dropdown Klien) */}
              <select
                value={selectedBlockForWorker}
                onChange={(e) => setSelectedBlockForWorker(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Lokasi Kerja (Blok)</option>
                {blocks
                  .filter((b) => selectedClientForWorker === 'ALL' || b.clientId === selectedClientForWorker)
                  .map((b) => (
                    <option key={b.id} value={b.id}>
                      Lokasi: {b.code} ({b.targetAreaHa} Ha)
                    </option>
                  ))}
              </select>

              {/* Filter Tim */}
              <select
                value={selectedTeamForWorker}
                onChange={(e) => setSelectedTeamForWorker(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Tim Kerja</option>
                <option value="Tim Operator Alat Berat">Tim Operator Alat Berat</option>
                <option value="Tim Rintis & Imas Kayu">Tim Rintis & Imas Kayu</option>
                <option value="Tim Mekanik Maintenance">Tim Mekanik Maintenance</option>
                <option value="Tim Drainase & Parit">Tim Drainase & Parit</option>
                <option value="Tim Pengawas & K3">Tim Pengawas & K3</option>
              </select>

              {/* Tambah Personil Baru */}
              <button
                type="button"
                onClick={() => {
                  setEditingWorkerId(null);
                  setWorkerForm({
                    name: '',
                    category: 'Pekerja Utama',
                    role: '',
                    assignedEquipmentId: '',
                    phone: '',
                    status: 'Hadir',
                    teamName: selectedTeamForWorker !== 'ALL' ? selectedTeamForWorker : 'Tim Operator Alat Berat',
                    assignedClientId: selectedClientForWorker !== 'ALL' ? selectedClientForWorker : clients[0]?.id || 'client-1',
                    assignedBlockId: selectedBlockForWorker !== 'ALL' ? selectedBlockForWorker : 'ALL',
                  });
                  setIsWorkerModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow transition cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>+ Tambah Personil & Tim</span>
              </button>
            </div>
          </div>

          {/* Grid Workers */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {workers
              .filter((w) => {
                const matchClient = selectedClientForWorker === 'ALL' || w.assignedClientId === selectedClientForWorker || w.assignedClientId === 'ALL';
                const matchBlock = selectedBlockForWorker === 'ALL' || w.assignedBlockId === selectedBlockForWorker || w.assignedBlockId === 'ALL';
                const matchTeam = selectedTeamForWorker === 'ALL' || w.teamName === selectedTeamForWorker;
                return matchClient && matchBlock && matchTeam;
              })
              .map((w) => {
                const clientObj = clients.find((c) => c.id === w.assignedClientId);
                const blockObj = blocks.find((b) => b.id === w.assignedBlockId);

                // Badge colors for teams
                const teamStyle = 
                  w.teamName?.includes('Operator')
                    ? 'bg-amber-100 text-amber-900 border-amber-300'
                    : w.teamName?.includes('Rintis')
                    ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                    : w.teamName?.includes('Mekanik')
                    ? 'bg-cyan-100 text-cyan-900 border-cyan-300'
                    : w.teamName?.includes('Drainase') || w.teamName?.includes('Parit')
                    ? 'bg-blue-100 text-blue-900 border-blue-300'
                    : 'bg-purple-100 text-purple-900 border-purple-300';

                return (
                  <div
                    key={w.id}
                    className="bg-white rounded-2xl p-4 shadow border border-slate-200 flex flex-col justify-between gap-3 hover:border-amber-400 transition"
                  >
                    <div>
                      {/* Category & Status */}
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                          {w.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                          {w.status}
                        </span>
                      </div>

                      {/* Name & Role */}
                      <h4 className="text-base font-black text-slate-900">{w.name}</h4>
                      <p className="text-xs font-semibold text-slate-600 mt-0.5">{w.role}</p>
                      <p className="text-[11px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                        <Phone className="w-3 h-3 text-slate-400" />
                        {w.phone}
                      </p>

                      {/* Tim Pekerja Badge */}
                      <div className="mt-3 pt-2.5 border-t border-slate-100 space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Tim Pekerja:</span>
                          <span className={`px-2 py-0.5 rounded-lg text-[11px] font-bold border ${teamStyle}`}>
                            {w.teamName || 'Tim Lapangan'}
                          </span>
                        </div>

                        {/* Lokasi Penugasan Badge */}
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-500 font-medium">Lokasi Kerja:</span>
                          <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-amber-500" />
                            {w.assignedClientId === 'ALL'
                              ? 'Semua Proyek / BKO'
                              : `${clientObj?.name || 'Klien'} ${w.assignedBlockId && w.assignedBlockId !== 'ALL' ? `• ${blockObj?.code || w.assignedBlockId}` : '(Semua Blok)'}`}
                          </span>
                        </div>

                        {/* Unit Alat Berat Ditugaskan */}
                        {w.assignedEquipmentId && (
                          <div className="flex items-center justify-between text-xs">
                            <span className="text-slate-500 font-medium">Unit Alat Berat:</span>
                            <span className="font-mono font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 text-[11px] flex items-center gap-1">
                              <Truck className="w-3 h-3 text-amber-600" />
                              {w.assignedEquipmentId}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                      <button
                        type="button"
                        onClick={() => handleEditWorker(w)}
                        className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Edit Data Personil & Penugasan"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                        <span>Edit</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteWorker(w.id, w.name)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition text-xs font-bold flex items-center gap-1 cursor-pointer"
                        title="Hapus Personil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Hapus</span>
                      </button>
                    </div>
                  </div>
                );
              })}
          </div>

          {workers.length === 0 && (
            <div className="p-8 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm">
              Belum ada personil terdaftar. Klik "+ Tambah Personil & Tim" untuk mendaftarkan.
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: INVENTORY */}
      {activeSubTab === 'inventory' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white">
            <h3 className="font-bold text-sm">Inventaris Logistik Lapangan (BBM Tangki, Pelumas & Spare Part)</h3>
            <p className="text-xs text-slate-400">Penyimpanan di basecamp lapangan proyek perkebunan.</p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {inventory.map((inv) => (
              <div key={inv.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 text-xs">
                <div className="flex justify-between items-center">
                  <span className="font-mono text-[10px] bg-slate-200 px-1.5 py-0.5 rounded font-bold">
                    {inv.code}
                  </span>
                  <span className="text-[10px] text-slate-500 uppercase">{inv.category}</span>
                </div>
                <div className="font-bold text-slate-900 text-sm">{inv.name}</div>
                <div className="flex justify-between items-center pt-2 border-t border-slate-200 font-mono">
                  <span className="text-slate-500">Stok Tersedia:</span>
                  <span className="text-base font-black text-emerald-800">
                    {inv.stockQuantity.toLocaleString()} {inv.unit}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT KLIEN */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase">
                {editingClientId ? 'Edit Data Klien Perkebunan' : '+ Tambah Klien Perusahaan Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Lengkapi identitas kontrak dan target pembukaan lahan klien.
              </p>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nama Singkat Klien</label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. C atau PT. RPN"
                    value={clientForm.name || ''}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Kontrak / SPK</label>
                  <input
                    type="text"
                    placeholder="Contoh: 019/SPK-LC/CSM/IX/2026"
                    value={clientForm.contractNumber || ''}
                    onChange={(e) => setClientForm({ ...clientForm, contractNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Perusahaan Lengkap</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: PT. CITRA SAWIT MAKMUR"
                  value={clientForm.fullCompanyName || ''}
                  onChange={(e) => setClientForm({ ...clientForm, fullCompanyName: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Luas Kontrak (Ha)</label>
                  <input
                    type="number"
                    required
                    value={clientForm.totalAreaHa || 100}
                    onChange={(e) => setClientForm({ ...clientForm, totalAreaHa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Lokasi Perkebunan</label>
                  <input
                    type="text"
                    placeholder="Contoh: Indragiri Hulu, Riau"
                    value={clientForm.location || ''}
                    onChange={(e) => setClientForm({ ...clientForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kontak Person (PIC)</label>
                  <input
                    type="text"
                    placeholder="Nama PIC Klien"
                    value={clientForm.contactPerson || ''}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. HP / Telepon</label>
                  <input
                    type="text"
                    placeholder="+62 812-..."
                    value={clientForm.phone || ''}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Alamat Kantor Klien</label>
                <input
                  type="text"
                  placeholder="Alamat kantor..."
                  value={clientForm.address || ''}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow cursor-pointer"
                >
                  Simpan Klien
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH BLOK BARU */}
      {isBlockModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase">
                + Tambah Blok Kerja Baru
              </h3>
              <p className="text-xs text-slate-500">
                Masukkan kode blok dan target pembukaan lahan.
              </p>
            </div>

            <form onSubmit={handleSaveBlock} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Pilih Klien Pemilik Lahan</label>
                <select
                  value={blockForm.clientId}
                  onChange={(e) => setBlockForm({ ...blockForm, clientId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-slate-900"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} - {c.fullCompanyName}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Kode / Nama Blok</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Blok B-03 atau Blok AD"
                  value={blockForm.code || ''}
                  onChange={(e) => setBlockForm({ ...blockForm, code: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Total (Ha)</label>
                  <input
                    type="number"
                    required
                    value={blockForm.targetAreaHa || 50}
                    onChange={(e) => setBlockForm({ ...blockForm, targetAreaHa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-amber-900 mb-1 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-600" /> Target Harian (Ha)
                  </label>
                  <input
                    type="number"
                    step="0.1"
                    required
                    value={blockForm.dailyTargetAreaHa ?? 4.0}
                    onChange={(e) => setBlockForm({ ...blockForm, dailyTargetAreaHa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-amber-300 bg-amber-50/50 rounded-lg font-mono font-black text-amber-950"
                  />
                  <span className="text-[10px] text-amber-700 font-medium">Terkunci di Form Pengawas</span>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Parit (M)</label>
                  <input
                    type="number"
                    value={blockForm.drainageTargetM || 1000}
                    onChange={(e) => setBlockForm({ ...blockForm, drainageTargetM: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsBlockModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow cursor-pointer"
                >
                  Simpan Blok
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT PERSONIL & PENUGASAN TIM */}
      {isWorkerModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="border-b border-slate-100 pb-3">
              <h3 className="text-base font-black text-slate-900 uppercase">
                {editingWorkerId ? 'Edit Data Personil & Penugasan' : '+ Tambah Personil & Tim Kerja Baru'}
              </h3>
              <p className="text-xs text-slate-500">
                Superadmin menentukan tim kerja serta lokasi penempatan proyek (Klien & Blok).
              </p>
            </div>

            <form onSubmit={handleSaveWorker} className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Lengkap Personil</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Agus Santoso"
                  value={workerForm.name || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kategori Personil</label>
                  <select
                    value={workerForm.category}
                    onChange={(e) => setWorkerForm({ ...workerForm, category: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-semibold"
                  >
                    <option value="Pekerja Utama">Pekerja Utama</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Pengawas & Pendukung">Pengawas & Pendukung</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">No. HP / WhatsApp</label>
                  <input
                    type="text"
                    placeholder="Contoh: +62 813-1122-3344"
                    value={workerForm.phone || ''}
                    onChange={(e) => setWorkerForm({ ...workerForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Jabatan / Peran di Lapangan</label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Operator EX-01 (Excavator PC200) atau Mekanik Alat Berat"
                  value={workerForm.role || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, role: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-semibold"
                />
              </div>

              {/* DROPDOWN ALAT BERAT */}
              <div>
                <label className="block font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Truck className="w-3.5 h-3.5 text-amber-600" />
                  <span>Alat Berat (Ambil Data dari Data Alat Berat)</span>
                </label>
                <select
                  value={workerForm.assignedEquipmentId || ''}
                  onChange={(e) => setWorkerForm({ ...workerForm, assignedEquipmentId: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold bg-white text-slate-900"
                >
                  <option value="">-- Tidak Ditugaskan ke Unit Alat Berat Tertentu --</option>
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.id} - {eq.name} ({eq.type} • Status: {eq.status})
                    </option>
                  ))}
                </select>
                <p className="text-[10px] text-slate-500 mt-0.5">
                  Pilih unit alat berat dari master data untuk menghubungkan operator dengan alat.
                </p>
              </div>

              {/* TIM PEKERJA */}
              <div className="bg-amber-50/70 p-3 rounded-xl border border-amber-200 space-y-2">
                <label className="block font-bold text-amber-900">
                  Tim Kerja Lapangan (Ditetapkan Superadmin)
                </label>
                <select
                  value={workerForm.teamName}
                  onChange={(e) => setWorkerForm({ ...workerForm, teamName: e.target.value })}
                  className="w-full px-3 py-2 border border-amber-300 bg-white rounded-lg font-bold text-slate-900"
                >
                  <option value="Tim Operator Alat Berat">Tim Operator Alat Berat (Excavator, Dozer, Dump Truck)</option>
                  <option value="Tim Rintis & Imas Kayu">Tim Rintis & Imas Kayu (Chainsaw & Helper)</option>
                  <option value="Tim Mekanik Maintenance">Tim Mekanik Maintenance (Mekanik, Helper & Driver BBM)</option>
                  <option value="Tim Drainase & Parit">Tim Drainase & Parit (Long Arm Excavator & Parit)</option>
                  <option value="Tim Pengawas & K3">Tim Pengawas & K3 (Mandor, Surveyor & Safety)</option>
                </select>
              </div>

              {/* LOKASI PENUGASAN (KLIEN & BLOK) */}
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
                <label className="block font-bold text-slate-800">
                  Penugasan Lokasi Kerja (Klien & Blok Proyek)
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Klien Penugasan</label>
                    <select
                      value={workerForm.assignedClientId || 'ALL'}
                      onChange={(e) => {
                        const newClient = e.target.value;
                        setWorkerForm({
                          ...workerForm,
                          assignedClientId: newClient,
                          assignedBlockId: 'ALL',
                        });
                      }}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg font-bold text-xs"
                    >
                      <option value="ALL">Semua Proyek / BKO Lintas Klien</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} - {c.fullCompanyName}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">Lokasi Blok Kerja</label>
                    <select
                      value={workerForm.assignedBlockId || 'ALL'}
                      onChange={(e) => setWorkerForm({ ...workerForm, assignedBlockId: e.target.value })}
                      className="w-full px-3 py-1.5 border border-slate-300 bg-white rounded-lg font-bold text-xs"
                    >
                      <option value="ALL">Seluruh Blok Kerja Klien</option>
                      {blocks
                        .filter((b) => workerForm.assignedClientId === 'ALL' || b.clientId === workerForm.assignedClientId)
                        .map((b) => (
                          <option key={b.id} value={b.id}>
                            {b.code} ({b.targetAreaHa} Ha)
                          </option>
                        ))}
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsWorkerModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow cursor-pointer"
                >
                  Simpan Personil & Penugasan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT ALAT BERAT & BATAS STANDAR BBM */}
      {isEquipmentModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 bg-amber-50 px-2.5 py-0.5 rounded-full border border-amber-200">
                  Otoritas Superadmin
                </span>
                <h3 className="font-black text-slate-900 text-lg mt-1 flex items-center gap-2">
                  <Truck className="w-5 h-5 text-amber-600" />
                  {editingEquipmentId ? 'Edit Data Alat Berat & Batas BBM' : 'Tambah Unit Alat Berat Baru'}
                </h3>
              </div>
              <button
                onClick={() => setIsEquipmentModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveEquipment} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kode Alat */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Kode Unit Alat <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: EX-06, DZ-03, DT-05"
                    value={equipmentForm.id || ''}
                    disabled={!!editingEquipmentId}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, id: e.target.value.toUpperCase() })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold uppercase disabled:bg-slate-100"
                  />
                  <p className="text-[10px] text-slate-400 mt-0.5">Identitas unik unit alat di lapangan.</p>
                </div>

                {/* Jenis / Tipe Alat */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Jenis / Tipe Alat Berat <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={equipmentForm.type || 'Excavator'}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, type: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white"
                  >
                    <option value="Excavator">Excavator</option>
                    <option value="Bulldozer">Bulldozer</option>
                    <option value="Dump Truck">Dump Truck</option>
                    <option value="Motor Grader">Motor Grader</option>
                    <option value="Vibro Roller">Vibro Roller</option>
                  </select>
                </div>
              </div>

              {/* Nama Unit Lengkap */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Nama Unit & Merk <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Contoh: Excavator Komatsu PC200-8 atau Bulldozer CAT D6G"
                  value={equipmentForm.name || ''}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, name: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-semibold text-slate-900"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Model */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Model / Varian</label>
                  <input
                    type="text"
                    placeholder="Contoh: PC200-8, D85ESS-2"
                    value={equipmentForm.model || ''}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, model: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl"
                  />
                </div>

                {/* Serial Number */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Nomor Seri / Engine SN</label>
                  <input
                    type="text"
                    placeholder="Contoh: KMTPC200-881923"
                    value={equipmentForm.serialNumber || ''}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, serialNumber: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Operator Penanggungjawab */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Operator Penanggungjawab</label>
                  <input
                    type="text"
                    placeholder="Nama Operator Unit"
                    value={equipmentForm.operatorName || ''}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, operatorName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium"
                    list="workers-list"
                  />
                  <datalist id="workers-list">
                    {workers.map((w) => (
                      <option key={w.id} value={w.name}>
                        {w.role} ({w.teamName || 'Tim Lapangan'})
                      </option>
                    ))}
                  </datalist>
                  <span className="text-[10px] text-slate-400">Bisa ketik nama atau pilih dari personil.</span>
                </div>

                {/* HM Berjalan Saat Ini */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">HM Berjalan (Jam Mesin Saat Ini)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="0"
                    value={equipmentForm.currentHm ?? 0}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, currentHm: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Terakumulasi otomatis dari form harian.</span>
                </div>
              </div>

              {/* BATAS STANDAR EFISIENSI BBM (L/HM) - FITUR UTAMA */}
              <div className="bg-gradient-to-r from-amber-50 to-orange-50 p-4 rounded-2xl border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block font-black text-amber-950 text-sm flex items-center gap-1.5">
                    <Fuel className="w-4 h-4 text-amber-600" />
                    Batas Standar Konsumsi BBM (Liter / HM)
                  </label>
                  <span className="text-[11px] font-bold text-amber-800 bg-amber-200/60 px-2 py-0.5 rounded-full border border-amber-300">
                    Ambang Batas Alarm
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    required
                    value={equipmentForm.standardFuelRatio ?? 18.0}
                    onChange={(e) => setEquipmentForm({ ...equipmentForm, standardFuelRatio: parseFloat(e.target.value) || 18 })}
                    className="w-32 px-3 py-2 border-2 border-amber-400 bg-white rounded-xl font-mono font-black text-base text-amber-950 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                  <span className="font-bold text-amber-900 text-xs">Liter per Jam Kerja Mesin (L/HM)</span>
                </div>

                <div className="text-[11px] text-amber-900/90 leading-relaxed bg-amber-100/60 p-2.5 rounded-xl border border-amber-200 flex items-start gap-2 mt-1">
                  <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <strong>Fungsi Kontrol Direktur:</strong> Apabila rasio konsumsi bahan bakar riil pada laporan harian pengawas melampaui angka ini, sistem otomatis memicu <strong>Status Alert Boros BBM (Kuning/Merah)</strong> pada Dashboard Eksekutif.
                  </div>
                </div>
              </div>

              {/* Status Unit */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">Status Operasional Unit</label>
                <select
                  value={equipmentForm.status || 'Operasional'}
                  onChange={(e) => setEquipmentForm({ ...equipmentForm, status: e.target.value as any })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800"
                >
                  <option value="Operasional">Operasional (Alat Aktif Bekerja di Lahan)</option>
                  <option value="Standby">Standby (Tersedia / Siaga di Lokasi)</option>
                  <option value="Breakdown">Breakdown (Rusak / Dalam Perbaikan Bengkel)</option>
                  <option value="Perawatan Rutin">Perawatan Rutin (Ganti Oli / Servis Berkala)</option>
                </select>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsEquipmentModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Simpan Data Alat Berat</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS ALAT BERAT */}
      {equipmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Data Alat Berat?</h3>
                <span className="text-xs text-slate-500">Tindakan ini tidak dapat dibatalkan.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Unit:</span>
                <strong className="font-mono text-slate-900">{equipmentToDelete.id}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Unit:</span>
                <strong className="text-slate-900">{equipmentToDelete.name}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Kategori:</span>
                <span className="text-slate-700">{equipmentToDelete.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Batas Standar BBM:</span>
                <strong className="font-mono text-amber-700">{equipmentToDelete.standardFuelRatio} L/HM</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEquipmentToDelete(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteEquipment}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Unit Alat</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT TARGET HARIAN (HA) PER LOKASI KERJA */}
      {isTargetModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 my-8 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-950" /> Otoritas Direktur
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  {editingTargetId ? 'Edit Target Harian (Ha) Lokasi' : 'Tetapkan Target Harian (Ha) Baru'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsTargetModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveTarget} className="space-y-4 text-xs">
              {/* Row 1: Klien & Blok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Perusahaan Klien <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetForm.clientId || clients[0]?.id}
                    onChange={(e) => {
                      const newClientId = e.target.value;
                      const clientBlks = blocks.filter((b) => b.clientId === newClientId);
                      setTargetForm({
                        ...targetForm,
                        clientId: newClientId,
                        blockId: clientBlks[0]?.id || '',
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800"
                    required
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.fullCompanyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Lokasi Kerja / Blok <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetForm.blockId || ''}
                    onChange={(e) => {
                      const blk = blocks.find((b) => b.id === e.target.value);
                      setTargetForm({
                        ...targetForm,
                        blockId: e.target.value,
                        dailyTargetAreaHa: blk?.dailyTargetAreaHa || targetForm.dailyTargetAreaHa || 4.0,
                      });
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800"
                    required
                  >
                    {blocks
                      .filter((b) => b.clientId === (targetForm.clientId || clients[0]?.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} (Total: {b.targetAreaHa} Ha)
                        </option>
                      ))}
                  </select>
                </div>
              </div>

              {/* Row 2: Tanggal Pelaksanaan & Shift */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Pelaksanaan Target <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="date"
                    value={targetForm.date || ''}
                    onChange={(e) => setTargetForm({ ...targetForm, date: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800"
                    required
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Shift Kerja</label>
                  <select
                    value={targetForm.shift || 'Siang (07:00 - 17:00)'}
                    onChange={(e) => setTargetForm({ ...targetForm, shift: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white text-slate-800"
                  >
                    <option value="Siang (07:00 - 17:00)">Siang (07:00 - 17:00 WIB)</option>
                    <option value="Full Shift">Full Shift (Pagi - Lembur Malam)</option>
                    <option value="Malam">Malam (Khusus Land Clearing Siaga)</option>
                  </select>
                </div>
              </div>

              {/* HIGHLIGHTED: TARGET LUAS HARIAN (HA) & TARGET DRAINASE (M) */}
              <div className="bg-amber-50 p-4 rounded-2xl border-2 border-amber-300 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="font-black text-amber-950 text-sm flex items-center gap-1.5">
                    <Target className="w-4 h-4 text-amber-700" />
                    Penetapan Target Ritme Harian (Ha & Meter)
                  </span>
                  <span className="text-[10px] font-bold text-amber-800 bg-amber-200/80 px-2 py-0.5 rounded-full border border-amber-400">
                    Terkunci di Form Pelaporan
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block font-black text-amber-950 mb-1 text-xs">
                      Target Luas Harian (Hektar / Ha) <span className="text-rose-600">*</span>
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="0.1"
                        min="0.1"
                        placeholder="4.0"
                        value={targetForm.dailyTargetAreaHa ?? 4.0}
                        onChange={(e) =>
                          setTargetForm({
                            ...targetForm,
                            dailyTargetAreaHa: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2.5 bg-white border-2 border-amber-400 rounded-xl font-mono font-black text-amber-950 text-base shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                        required
                      />
                      <span className="absolute right-3 top-2.5 font-black text-amber-900 text-sm">
                        Ha / Hari
                      </span>
                    </div>
                    <span className="text-[10px] text-amber-800 block mt-1">
                      Standar umum: 3.5 - 5.0 Ha per hari per blok tergantung armada.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-700 mb-1 text-xs">
                      Target Drainase / Saluran (Meter)
                    </label>
                    <div className="relative">
                      <input
                        type="number"
                        step="10"
                        min="0"
                        placeholder="100"
                        value={targetForm.dailyDrainageTargetM ?? 100}
                        onChange={(e) =>
                          setTargetForm({
                            ...targetForm,
                            dailyDrainageTargetM: parseFloat(e.target.value) || 0,
                          })
                        }
                        className="w-full px-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 text-sm shadow-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                      />
                      <span className="absolute right-3 top-2.5 font-bold text-slate-600 text-xs">
                        Meter / Hari
                      </span>
                    </div>
                    <span className="text-[10px] text-slate-500 block mt-1">
                      Pembuatan parit batas atau kanal pembuangan air.
                    </span>
                  </div>
                </div>
              </div>

              {/* Row 4: Kondisi Lahan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tipe Kontur / Tanah</label>
                  <select
                    value={targetForm.soilType || 'Tanah Mineral'}
                    onChange={(e) => setTargetForm({ ...targetForm, soilType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white text-slate-800"
                  >
                    <option value="Tanah Mineral">Tanah Mineral (Padat & Kering)</option>
                    <option value="Tanah Gambut Dangkal">Tanah Gambut Dangkal (&lt; 1 Meter)</option>
                    <option value="Tanah Gambut Dalam">Tanah Gambut Dalam (&gt; 2 Meter)</option>
                    <option value="Rawa / Rendahan">Rawa / Daerah Rendahan Berair</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kerapatan Vegetasi Hutan</label>
                  <select
                    value={targetForm.vegetationDensity || 'Sedang / Semak Belukar'}
                    onChange={(e) =>
                      setTargetForm({ ...targetForm, vegetationDensity: e.target.value as any })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-medium bg-white text-slate-800"
                  >
                    <option value="Ringan / Lalang">Ringan (Alang-alang & Belukar Kecil)</option>
                    <option value="Sedang / Semak Belukar">Sedang (Semak Belukar & Kayu Sedang)</option>
                    <option value="Rapat / Kayu Besar">Rapat (Kayu Besar, Tunggul Rapat & Hutan Primer)</option>
                  </select>
                </div>
              </div>

              {/* Row 5: Estimasi Alat Berat & Personel */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alokasi Alat Berat</label>
                  <input
                    type="number"
                    min="1"
                    value={targetForm.assignedEquipmentCount ?? 3}
                    onChange={(e) =>
                      setTargetForm({
                        ...targetForm,
                        assignedEquipmentCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Unit alat siaga.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Alokasi Personel</label>
                  <input
                    type="number"
                    min="1"
                    value={targetForm.assignedWorkerCount ?? 8}
                    onChange={(e) =>
                      setTargetForm({
                        ...targetForm,
                        assignedWorkerCount: parseInt(e.target.value) || 1,
                      })
                    }
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-400">Operator & tim rintis.</span>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Status Target</label>
                  <select
                    value={targetForm.status || 'Terjadwal'}
                    onChange={(e) => setTargetForm({ ...targetForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-800"
                  >
                    <option value="Terjadwal">Terjadwal</option>
                    <option value="Tercapai">Tercapai</option>
                    <option value="Di bawah Target">Di bawah Target</option>
                    <option value="Tertunda Cuaca">Tertunda Cuaca</option>
                  </select>
                </div>
              </div>

              {/* Row 6: Catatan / Arahan Direktur */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  Arahan Khusus & Catatan Direktur untuk Pengawas
                </label>
                <textarea
                  rows={2}
                  placeholder="Contoh: Prioritas pembersihan jalur tanam utama. Perhatikan tunggul kayu besar agar dicincang rapi tanpa bakar. Waspada titik tanah lembek."
                  value={targetForm.notes || ''}
                  onChange={(e) => setTargetForm({ ...targetForm, notes: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-xl focus:ring-1 focus:ring-amber-500 font-medium"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsTargetModalOpen(false)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingTargetId ? 'Simpan Perubahan Target' : 'Tetapkan Target Harian'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS TARGET HARIAN */}
      {targetToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Jadwal Target Harian?</h3>
                <span className="text-xs text-slate-500">Tindakan ini akan menghapus target untuk tanggal ini.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <div className="flex justify-between">
                <span className="text-slate-500">Tanggal Target:</span>
                <strong className="font-mono text-slate-900">{targetToDelete.date}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Blok:</span>
                <strong className="text-slate-900">
                  {targetToDelete.blockCode} ({targetToDelete.clientName})
                </strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Luas:</span>
                <strong className="font-mono text-amber-700">{targetToDelete.dailyTargetAreaHa} Ha / Hari</strong>
              </div>
              {targetToDelete.dailyDrainageTargetM && (
                <div className="flex justify-between">
                  <span className="text-slate-500">Target Drainase:</span>
                  <span className="font-mono text-slate-800">{targetToDelete.dailyDrainageTargetM} M</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTargetToDelete(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteTarget}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Target Harian</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

