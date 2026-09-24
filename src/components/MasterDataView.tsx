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
  FileText
} from 'lucide-react';
import { Equipment, Worker, Block, InventoryItem, Client, Project } from '../types';
import { storageService } from '../services/storageService';

export const MasterDataView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'client' | 'blocks' | 'equipments' | 'workers' | 'inventory'>('client');
  
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
    drainageTargetM: 1250,
    status: 'Dalam Pengerjaan',
  });

  // Worker Modal & Filter State (Superadmin Personil & Lokasi Penugasan)
  const [selectedClientForWorker, setSelectedClientForWorker] = useState<string>('ALL');
  const [selectedTeamForWorker, setSelectedTeamForWorker] = useState<string>('ALL');
  const [isWorkerModalOpen, setIsWorkerModalOpen] = useState(false);
  const [editingWorkerId, setEditingWorkerId] = useState<string | null>(null);
  const [workerForm, setWorkerForm] = useState<Partial<Worker>>({
    name: '',
    category: 'Pekerja Utama',
    role: '',
    phone: '',
    status: 'Hadir',
    teamName: 'Tim Operator Alat Berat',
    assignedClientId: 'client-1',
    assignedBlockId: 'ALL',
  });

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
                        <span>Target Luas Lahan:</span>
                        <strong className="font-mono text-slate-900">{b.targetAreaHa} Hektar</strong>
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

                    <div className="flex justify-end pt-2 border-t border-slate-100">
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

      {/* SUB-TAB: EQUIPMENTS */}
      {activeSubTab === 'equipments' && (
        <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
          <div className="p-4 bg-slate-900 text-white flex justify-between items-center">
            <div>
              <h3 className="font-bold text-sm">Daftar Alat Berat & Batas Standar Efisiensi Solar</h3>
              <p className="text-xs text-slate-400">Jika konsumsi &gt; batas standar, sistem otomatis memicu alert merah untuk Direktur.</p>
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-100 text-slate-700 uppercase font-black tracking-wider text-[11px] border-b border-slate-200">
                <tr className="border-b border-slate-200">
                  <th className="p-3">Kode Alat</th>
                  <th className="p-3">Nama Unit & Model</th>
                  <th className="p-3">Operator Penanggungjawab</th>
                  <th className="p-3 text-right">HM Berjalan</th>
                  <th className="p-3 text-center">Batas Standar Solar (L/HM)</th>
                  <th className="p-3 text-center">Status Unit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {equipments.map((eq) => (
                  <tr key={eq.id} className="hover:bg-slate-50 transition">
                    <td className="p-3 font-mono font-bold text-amber-700 bg-amber-50/50">
                      {eq.id}
                    </td>
                    <td className="p-3 font-bold text-slate-800">
                      <div>{eq.name}</div>
                      <div className="text-[11px] text-slate-400 font-mono">SN: {eq.serialNumber}</div>
                    </td>
                    <td className="p-3 text-slate-700 font-medium">
                      {eq.operatorName}
                    </td>
                    <td className="p-3 text-right font-mono font-bold">
                      {eq.currentHm.toLocaleString()} HM
                    </td>
                    <td className="p-3 text-center">
                      <div className="inline-flex items-center gap-1.5">
                        <input
                          type="number"
                          step="0.5"
                          value={eq.standardFuelRatio}
                          onChange={(e) => handleUpdateFuelLimit(eq.id, parseFloat(e.target.value) || 18)}
                          className="w-16 px-2 py-1 text-center font-mono font-black border border-slate-300 rounded text-xs focus:ring-2 focus:ring-amber-500"
                        />
                        <span className="text-slate-500 text-[10px]">L/HM</span>
                      </div>
                    </td>
                    <td className="p-3 text-center">
                      <select
                        value={eq.status}
                        onChange={(e) => handleUpdateStatus(eq.id, e.target.value)}
                        className={`px-2 py-1 rounded-lg text-xs font-bold border ${
                          eq.status === 'Operasional'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : eq.status === 'Breakdown'
                            ? 'bg-rose-50 text-rose-800 border-rose-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}
                      >
                        <option value="Operasional">Operasional</option>
                        <option value="Standby">Standby</option>
                        <option value="Breakdown">Breakdown</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
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
                onChange={(e) => setSelectedClientForWorker(e.target.value)}
                className="px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
              >
                <option value="ALL">Semua Klien Penugasan</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    Klien: {c.name}
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
                    phone: '',
                    status: 'Hadir',
                    teamName: selectedTeamForWorker !== 'ALL' ? selectedTeamForWorker : 'Tim Operator Alat Berat',
                    assignedClientId: selectedClientForWorker !== 'ALL' ? selectedClientForWorker : clients[0]?.id || 'client-1',
                    assignedBlockId: 'ALL',
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
                const matchTeam = selectedTeamForWorker === 'ALL' || w.teamName === selectedTeamForWorker;
                return matchClient && matchTeam;
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

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Luas (Ha)</label>
                  <input
                    type="number"
                    required
                    value={blockForm.targetAreaHa || 50}
                    onChange={(e) => setBlockForm({ ...blockForm, targetAreaHa: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Target Saluran / Parit (M)</label>
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
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs"
                />
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
    </div>
  );
};
