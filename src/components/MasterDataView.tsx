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
  Mail,
  MapPin,
  FileText,
  Lock,
  Search,
  Target,
  Calendar,
  TrendingUp,
  CheckCircle2,
  CheckSquare,
  Square,
  ListChecks,
  ClipboardList,
  Briefcase,
  UserCheck,
  HardHat,
  Key,
  Clock,
  Eye,
  EyeOff,
  Info,
  UserPlus,
  X
} from 'lucide-react';
import { 
  Equipment, 
  Worker, 
  Block, 
  Client, 
  Project, 
  DailyLocationTarget, 
  DailyItemRitmeTarget, 
  BlockWorkItem, 
  WorkAssignment, 
  CompanyStaff,
  StaffSupervisorAssignment,
  SupportTeamMemberAssignment
} from '../types';
import { storageService } from '../services/storageService';
import { DEFAULT_WORK_ITEMS_CATALOG } from '../data/mockData';

export const MasterDataView: React.FC = () => {
  const [activeSubTab, setActiveSubTab] = useState<'client' | 'blocks' | 'equipments' | 'assignments' | 'targets'>('client');
  
  const [clients, setClients] = useState<Client[]>(() => storageService.getClients());
  const [blocks, setBlocks] = useState<Block[]>(() => storageService.getBlocks());
  const [equipments, setEquipments] = useState<Equipment[]>(() => storageService.getEquipments());
  const [workers, setWorkers] = useState<Worker[]>(() => storageService.getWorkers());
  const [workAssignments, setWorkAssignments] = useState<WorkAssignment[]>(() => storageService.getWorkAssignments());
  const [companyStaffList, setCompanyStaffList] = useState<CompanyStaff[]>(() => storageService.getCompanyStaff());

  // Real-time synchronization listener for master data & company staff
  React.useEffect(() => {
    const handleSync = () => {
      setClients(storageService.getClients());
      setBlocks(storageService.getBlocks());
      setEquipments(storageService.getEquipments());
      setWorkers(storageService.getWorkers());
      setWorkAssignments(storageService.getWorkAssignments());
      setDailyTargets(storageService.getDailyTargets());
      setCompanyStaffList(storageService.getCompanyStaff());
    };
    window.addEventListener('suryaland_master_sync', handleSync);
    window.addEventListener('suryaland_company_staff_sync', handleSync);
    window.addEventListener('suryaland_firestore_sync', handleSync);
    return () => {
      window.removeEventListener('suryaland_master_sync', handleSync);
      window.removeEventListener('suryaland_company_staff_sync', handleSync);
      window.removeEventListener('suryaland_firestore_sync', handleSync);
    };
  }, []);

  const [selectedClientForBlock, setSelectedClientForBlock] = useState<string>('ALL');

  // Client Modal & Filter State (SPK is Primary Key: 1 PT can have multiple SPKs with different blocks)
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [editingClientId, setEditingClientId] = useState<string | null>(null);
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');
  const [isClearMasterModalOpen, setIsClearMasterModalOpen] = useState(false);

  const executeClearAllMasterData = () => {
    storageService.clearMasterProjectData();
    setClients([]);
    setBlocks([]);
    setEquipments([]);
    setWorkAssignments([]);
    setDailyTargets([]);
    setIsClearMasterModalOpen(false);
  };
  const [showClientPassword, setShowClientPassword] = useState<boolean>(false);
  const [visibleClientCardPasswords, setVisibleClientCardPasswords] = useState<Record<string, boolean>>({});
  const [clientToDelete, setClientToDelete] = useState<Client | null>(null);
  const [blockToDelete, setBlockToDelete] = useState<Block | null>(null);
  const [clientForm, setClientForm] = useState<{
    name: string;
    fullCompanyName: string;
    contractNumber: string;
    projectName?: string;
    location: string;
    address: string;
    contactPerson: string;
    phone: string;
    email: string;
    totalAreaInput: string;
    clearedAreaHa?: number;
    status: 'Aktif' | 'Selesai' | 'Masa Tenggang';
    username: string;
    password: string;
    userLevel: 'Klien';
    linkedUserId?: string;
  }>({
    name: '',
    fullCompanyName: '',
    contractNumber: '',
    projectName: '',
    location: '',
    address: '',
    contactPerson: '',
    phone: '',
    email: '',
    totalAreaInput: '',
    clearedAreaHa: 0,
    status: 'Aktif',
    username: '',
    password: '',
    userLevel: 'Klien',
    linkedUserId: undefined,
  });

  // Modal Dynamic Blocks list for "+ Tambah Klien Perusahaan Baru" & "Edit Klien"
  const [modalBlocks, setModalBlocks] = useState<Array<{ id?: string; code: string; targetAreaHa: string; status?: string }>>([
    { code: '', targetAreaHa: '' },
  ]);

  // Filtered clients by search query (SPK, Nama PT, Lokasi, PIC, Email)
  const filteredClients = clients.filter((c) => {
    if (!clientSearchQuery.trim()) return true;
    const q = clientSearchQuery.toLowerCase();
    return (
      c.contractNumber?.toLowerCase().includes(q) ||
      c.name?.toLowerCase().includes(q) ||
      c.fullCompanyName?.toLowerCase().includes(q) ||
      c.location?.toLowerCase().includes(q) ||
      c.contactPerson?.toLowerCase().includes(q) ||
      (c.email && c.email.toLowerCase().includes(q))
    );
  });

  // Block Modal State (Daftar Lokasi & Item Pekerjaan)
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [blockSearchQuery, setBlockSearchQuery] = useState<string>('');
  const [blockForm, setBlockForm] = useState<{
    clientId: string;
    code: string;
    targetAreaInput: string;
    dailyTargetAreaHa?: number;
    status: 'Dalam Pengerjaan' | 'Belum Dimulai' | 'Selesai';
    workItems: BlockWorkItem[];
    selectedExistingBlockId: string;
    customItemName: string;
    customItemVolume: string;
    customItemUnit: string;
  }>({
    clientId: clients[0]?.id || '',
    code: '',
    targetAreaInput: '',
    status: 'Dalam Pengerjaan',
    workItems: DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => ({
      id: `wi-std-${idx + 1}`,
      name: item.name,
      unit: item.unit === 'HEKTAR' ? 'Ha' : item.unit,
      targetVolume: item.defaultTargetVolume,
    })),
    selectedExistingBlockId: '__CUSTOM__',
    customItemName: '',
    customItemVolume: '10',
    customItemUnit: 'Ha',
  });

  // State to hold user input string drafts for work item volumes (allows decimals like "25,7" smoothly)
  const [itemVolumeDrafts, setItemVolumeDrafts] = useState<Record<string, string>>({});

  // Filtered blocks based on selected client and search query
  const filteredBlocks = blocks
    .filter((b) => selectedClientForBlock === 'ALL' || b.clientId === selectedClientForBlock)
    .filter((b) => {
      if (!blockSearchQuery.trim()) return true;
      const q = (blockSearchQuery || '').toLowerCase();
      const ownerClient = clients.find((c) => c.id === b.clientId);
      const matchCode = (b.code && b.code.toLowerCase().includes(q)) || false;
      const matchClientName = ownerClient?.name?.toLowerCase().includes(q) || false;
      const matchClientFull = ownerClient?.fullCompanyName?.toLowerCase().includes(q) || false;
      const matchSpk = ownerClient?.contractNumber?.toLowerCase().includes(q) || false;
      const matchWorkItem = b.workItems?.some((wi) => wi.name && wi.name.toLowerCase().includes(q)) || false;
      return matchCode || matchClientName || matchClientFull || matchSpk || matchWorkItem;
    });


  // Daily Target State & Filters (CRUD Target Harian Ha per Hari per Lokasi Kerja)
  const [dailyTargets, setDailyTargets] = useState<DailyLocationTarget[]>(() => storageService.getDailyTargets());
  const [selectedClientForTarget, setSelectedClientForTarget] = useState<string>('ALL');
  const [selectedBlockForTarget, setSelectedBlockForTarget] = useState<string>('ALL');
  const [selectedDateForTarget, setSelectedDateForTarget] = useState<string>('');
  const [targetSearchQuery, setTargetSearchQuery] = useState<string>('');
  const [isTargetModalOpen, setIsTargetModalOpen] = useState(false);
  const [editingTargetId, setEditingTargetId] = useState<string | null>(null);
  const [targetToDelete, setTargetToDelete] = useState<DailyLocationTarget | null>(null);

  // Helper to fetch target info from "Target Harian Land Clearing (Ha) per Lokasi Kerja"
  const getBlockDailyTargetInfo = (blockId?: string) => {
    if (!blockId) return null;
    const blockTargets = dailyTargets.filter((t) => t.blockId === blockId);
    if (blockTargets.length === 0) return null;
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTarget = blockTargets.find((t) => t.date === todayStr);
    if (todayTarget) return todayTarget;
    return [...blockTargets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
  };

  const handleOpenAddBlock = (presetClientId?: string) => {
    if (clients.length === 0) {
      alert('Belum ada data Klien / SPK. Silakan tambahkan Klien terlebih dahulu pada sub menu 1 sebelum menambahkan blok kerja.');
      setActiveSubTab('client');
      return;
    }
    setEditingBlockId(null);
    const targetClientId = presetClientId || (selectedClientForBlock !== 'ALL' ? selectedClientForBlock : clients[0]?.id || '');
    const standardItems: BlockWorkItem[] = DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => ({
      id: `wi-std-${idx + 1}`,
      name: item.name,
      unit: item.unit === 'HEKTAR' ? 'Ha' : item.unit,
      targetVolume: item.defaultTargetVolume,
    }));

    const clientBlocks = blocks.filter((b) => b.clientId === targetClientId);
    const firstBlock = clientBlocks[0];
    const initialItems = firstBlock?.workItems && firstBlock.workItems.length > 0 
      ? firstBlock.workItems.map(wi => ({ ...wi, unit: wi.unit === 'HEKTAR' ? 'Ha' : wi.unit }))
      : standardItems;

    const initialDrafts: Record<string, string> = {};
    initialItems.forEach(wi => {
      initialDrafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
    });
    setItemVolumeDrafts(initialDrafts);

    setBlockForm({
      clientId: targetClientId,
      code: firstBlock ? firstBlock.code : '',
      targetAreaInput: firstBlock && firstBlock.targetAreaHa ? String(firstBlock.targetAreaHa).replace('.', ',') : '',
      dailyTargetAreaHa: 4.0,
      status: 'Dalam Pengerjaan',
      workItems: initialItems,
      selectedExistingBlockId: firstBlock ? firstBlock.id : '__CUSTOM__',
      customItemName: '',
      customItemVolume: '10',
      customItemUnit: 'Ha',
    });
    setIsBlockModalOpen(true);
  };

  const handleBlockFormClientChange = (newClientId: string) => {
    const clientBlocks = blocks.filter((b) => b.clientId === newClientId);
    const firstBlock = clientBlocks[0];
    const standardItems: BlockWorkItem[] = DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => ({
      id: `wi-std-${idx + 1}`,
      name: item.name,
      unit: item.unit === 'HEKTAR' ? 'Ha' : item.unit,
      targetVolume: item.defaultTargetVolume,
    }));

    if (firstBlock) {
      const items = (firstBlock.workItems && firstBlock.workItems.length > 0)
        ? firstBlock.workItems.map(wi => ({ ...wi, unit: wi.unit === 'HEKTAR' ? 'Ha' : wi.unit }))
        : standardItems;
      const drafts: Record<string, string> = {};
      items.forEach(wi => {
        drafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
      });
      setItemVolumeDrafts(drafts);

      setBlockForm((prev) => ({
        ...prev,
        clientId: newClientId,
        selectedExistingBlockId: firstBlock.id,
        code: firstBlock.code,
        targetAreaInput: firstBlock.targetAreaHa !== undefined ? String(firstBlock.targetAreaHa).replace('.', ',') : '',
        status: firstBlock.status,
        workItems: items,
      }));
    } else {
      const drafts: Record<string, string> = {};
      standardItems.forEach(wi => {
        drafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
      });
      setItemVolumeDrafts(drafts);

      setBlockForm((prev) => ({
        ...prev,
        clientId: newClientId,
        selectedExistingBlockId: '__CUSTOM__',
        code: '',
        targetAreaInput: '',
        status: 'Dalam Pengerjaan',
        workItems: standardItems,
      }));
    }
  };

  const handleBlockSelectChange = (blockIdOrCustom: string) => {
    if (blockIdOrCustom === '__CUSTOM__') {
      setBlockForm((prev) => ({
        ...prev,
        selectedExistingBlockId: '__CUSTOM__',
        code: '',
        targetAreaInput: '',
      }));
    } else {
      const selected = blocks.find((b) => b.id === blockIdOrCustom);
      if (selected) {
        if (editingBlockId) {
          setEditingBlockId(selected.id);
        }
        const standardItems: BlockWorkItem[] = DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => ({
          id: `wi-std-${idx + 1}`,
          name: item.name,
          unit: item.unit === 'HEKTAR' || item.unit === 'Hektar' ? 'Ha' : item.unit,
          targetVolume: item.defaultTargetVolume,
        }));
        const items = (selected.workItems && selected.workItems.length > 0)
          ? selected.workItems.map((wi) => {
              let unit = wi.unit;
              if (unit === 'HEKTAR' || unit === 'Hektar') unit = 'Ha';
              if (unit === 'METER LARI') unit = 'm';
              if (unit === 'METER KUBIK') unit = 'm³';
              return { ...wi, unit };
            })
          : standardItems;
        const drafts: Record<string, string> = {};
        items.forEach((wi) => {
          drafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
        });
        setItemVolumeDrafts(drafts);
        setBlockForm((prev) => ({
          ...prev,
          selectedExistingBlockId: selected.id,
          code: selected.code,
          targetAreaInput: selected.targetAreaHa !== undefined ? String(selected.targetAreaHa).replace('.', ',') : '35,5',
          status: selected.status,
          workItems: items,
        }));
      }
    }
  };

  const handleOpenEditBlock = (b: Block) => {
    setEditingBlockId(b.id);
    const targetInfo = getBlockDailyTargetInfo(b.id);
    const standardVolumeMap: Record<string, number> = {
      'UNDERBRUSHING (SEMAK BELUKAR)': 30,
      'BATANG KUBUR': 25,
      'MECHANICAL STACKING / PRUNNING RUMPUK MEKANIS': 10,
      'MAINROAD': 250,
      'COLLECTION ROAD': 100,
      'SALURAN PRIMER': 50,
      'SALURAN SEKUNDER': 50,
      'SALURAN TERSIER': 50,
    };
    const items: BlockWorkItem[] = (b.workItems && b.workItems.length > 0)
      ? b.workItems.map((wi) => {
          let unit = wi.unit;
          if (unit === 'HEKTAR' || unit === 'Hektar') unit = 'Ha';
          if (unit === 'METER LARI') unit = 'm';
          if (unit === 'METER KUBIK') unit = 'm³';
          return {
            ...wi,
            unit,
            targetVolume: wi.targetVolume !== undefined ? wi.targetVolume : (standardVolumeMap[wi.name.toUpperCase()] ?? 10),
          };
        })
      : DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => ({
          id: `wi-std-${idx + 1}`,
          name: item.name,
          unit: item.unit === 'HEKTAR' ? 'Ha' : item.unit,
          targetVolume: item.defaultTargetVolume,
        }));

    const drafts: Record<string, string> = {};
    items.forEach((wi) => {
      drafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
    });
    setItemVolumeDrafts(drafts);

    setBlockForm({
      clientId: b.clientId,
      code: b.code,
      targetAreaInput: b.targetAreaHa !== undefined ? String(b.targetAreaHa).replace('.', ',') : '35,5',
      dailyTargetAreaHa: targetInfo ? targetInfo.dailyTargetAreaHa : (b.dailyTargetAreaHa ?? 4.0),
      status: b.status,
      workItems: items,
      selectedExistingBlockId: b.id,
      customItemName: '',
      customItemVolume: '10',
      customItemUnit: 'Ha',
    });
    setIsBlockModalOpen(true);
  };

  // Toggle standard work item for blockForm
  const handleToggleWorkItem = (stdItem: { name: string; unit: string; defaultTargetVolume?: number }) => {
    const unitName = stdItem.unit === 'HEKTAR' ? 'Ha' : stdItem.unit;
    const exists = blockForm.workItems.some((wi) => wi.name.toUpperCase() === stdItem.name.toUpperCase());
    if (exists) {
      setBlockForm({
        ...blockForm,
        workItems: blockForm.workItems.filter((wi) => wi.name.toUpperCase() !== stdItem.name.toUpperCase()),
      });
    } else {
      const draftVal = itemVolumeDrafts[stdItem.name.toUpperCase()];
      const parsedDraft = draftVal ? parseFloat(draftVal.replace(',', '.')) : NaN;
      const targetVol = !isNaN(parsedDraft) ? parsedDraft : (stdItem.defaultTargetVolume ?? 10);
      
      setItemVolumeDrafts((prev) => ({
        ...prev,
        [stdItem.name.toUpperCase()]: draftVal || String(targetVol).replace('.', ','),
      }));

      setBlockForm({
        ...blockForm,
        workItems: [
          ...blockForm.workItems,
          {
            id: `wi-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            name: stdItem.name,
            unit: unitName,
            targetVolume: targetVol,
          },
        ],
      });
    }
  };

  // Update target volume for a specific work item (supports decimal values like 25,7 or 25.7)
  const handleUpdateItemVolume = (itemName: string, rawVal: string) => {
    const key = itemName.toUpperCase();
    setItemVolumeDrafts((prev) => ({ ...prev, [key]: rawVal }));
    const parsed = parseFloat(rawVal.replace(',', '.'));
    setBlockForm((prev) => ({
      ...prev,
      workItems: prev.workItems.map((wi) =>
        wi.name.toUpperCase() === key
          ? { ...wi, targetVolume: isNaN(parsed) ? 0 : parsed }
          : wi
      ),
    }));
  };

  // Add custom work item to blockForm
  const handleAddCustomWorkItem = () => {
    if (!blockForm.customItemName?.trim()) {
      alert('Mohon masukkan nama item pekerjaan yang ingin ditambahkan.');
      return;
    }
    const cleanVolumeStr = (blockForm.customItemVolume || '10').trim();
    const rawVol = parseFloat(cleanVolumeStr.replace(',', '.'));
    let unitName = blockForm.customItemUnit.trim();
    if (unitName === 'HEKTAR' || unitName === 'Hektar') unitName = 'Ha';
    if (unitName === 'METER LARI') unitName = 'm';
    if (unitName === 'METER KUBIK') unitName = 'm³';
    const newItemName = blockForm.customItemName.trim().toUpperCase();
    const newItem: BlockWorkItem = {
      id: `wi-custom-${Date.now()}`,
      name: newItemName,
      unit: unitName,
      targetVolume: isNaN(rawVol) ? 10 : rawVol,
    };
    setItemVolumeDrafts((prev) => ({
      ...prev,
      [newItemName]: cleanVolumeStr,
    }));
    setBlockForm({
      ...blockForm,
      workItems: [...blockForm.workItems, newItem],
      customItemName: '',
      customItemVolume: '10',
    });
  };

  // Remove work item from blockForm
  const handleRemoveWorkItem = (id: string) => {
    setBlockForm({
      ...blockForm,
      workItems: blockForm.workItems.filter((wi) => wi.id !== id),
    });
  };

  // Select all 8 standard items
  const handleSelectAllStandardItems = () => {
    const standardItems: BlockWorkItem[] = DEFAULT_WORK_ITEMS_CATALOG.map((item, idx) => {
      const existing = blockForm.workItems.find((wi) => wi.name.toUpperCase() === item.name.toUpperCase());
      const unitName = item.unit === 'HEKTAR' ? 'Ha' : item.unit;
      return {
        id: existing?.id || `wi-std-${idx + 1}`,
        name: item.name,
        unit: unitName,
        targetVolume: existing?.targetVolume !== undefined ? existing.targetVolume : item.defaultTargetVolume,
      };
    });
    const customItems = blockForm.workItems.filter(
      (wi) => !DEFAULT_WORK_ITEMS_CATALOG.some((std) => std.name.toUpperCase() === wi.name.toUpperCase())
    );
    const drafts: Record<string, string> = { ...itemVolumeDrafts };
    [...standardItems, ...customItems].forEach((wi) => {
      if (!drafts[wi.name.toUpperCase()]) {
        drafts[wi.name.toUpperCase()] = wi.targetVolume !== undefined ? String(wi.targetVolume).replace('.', ',') : '10';
      }
    });
    setItemVolumeDrafts(drafts);
    setBlockForm({
      ...blockForm,
      workItems: [...standardItems, ...customItems],
    });
  };

  // Clear all work items
  const handleClearAllWorkItems = () => {
    setBlockForm({
      ...blockForm,
      workItems: [],
    });
  };
  const [targetItemRitmes, setTargetItemRitmes] = useState<DailyItemRitmeTarget[]>([]);
  const [viewingTargetDetail, setViewingTargetDetail] = useState<DailyLocationTarget | null>(null);

  const [targetForm, setTargetForm] = useState<Partial<DailyLocationTarget>>({
    clientId: clients[0]?.id || '',
    blockId: blocks[0]?.id || '',
    date: new Date().toISOString().split('T')[0],
    dailyTargetAreaHa: 4.0,
    shift: 'Siang (07:00 - 17:00)',
    notes: '',
    status: 'Terjadwal',
    assignmentNumbers: [],
    assignedPersonnel: [],
    itemTargets: [],
  });

  const handleOpenAddTarget = (presetBlockId?: string, presetClientId?: string) => {
    if (clients.length === 0) {
      alert('Belum ada data Klien / SPK. Silakan tambahkan Klien terlebih dahulu pada sub menu 1 sebelum menetapkan target harian.');
      setActiveSubTab('client');
      return;
    }
    setEditingTargetId(null);
    const chosenClientId = presetClientId || (selectedClientForTarget !== 'ALL' ? selectedClientForTarget : clients[0]?.id || '');
    const availableBlocks = blocks.filter((b) => b.clientId === chosenClientId);
    const chosenBlock = presetBlockId 
      ? blocks.find((b) => b.id === presetBlockId) 
      : availableBlocks[0] || blocks[0];

    const todayStr = new Date().toISOString().split('T')[0];
    const clientObj = clients.find((c) => c.id === chosenClientId);

    // Ambil item pekerjaan lengkap dengan jumlah satuannya dari menu 2. LOKASI & PEKERJAAN
    const blockItems = (chosenBlock?.workItems && chosenBlock.workItems.length > 0)
      ? chosenBlock.workItems
      : DEFAULT_WORK_ITEMS_CATALOG;

    // Inisialisasi ritme target harian per item pekerjaan
    const initialRitmes: DailyItemRitmeTarget[] = blockItems.map((wi, idx) => {
      const vol = (wi as any).targetVolume !== undefined ? (wi as any).targetVolume : (wi as any).defaultTargetVolume || 10;
      let defTarget = 5;
      if (wi.name.toUpperCase().includes('BATANG KUBUR')) {
        defTarget = 10;
      } else if (wi.name.toUpperCase().includes('MAINROAD')) {
        defTarget = 50;
      } else if (wi.name.toUpperCase().includes('COLLECTION')) {
        defTarget = 25;
      } else if (wi.name.toUpperCase().includes('SALURAN')) {
        defTarget = 15;
      } else if (wi.name.toUpperCase().includes('UNDERBRUSHING')) {
        defTarget = 6;
      } else {
        defTarget = vol > 10 ? Math.ceil(vol / 4) : 2;
      }
      const days = defTarget > 0 ? Math.ceil(vol / defTarget) : 0;
      return {
        id: (wi as any).id || `it-${idx + 1}`,
        name: wi.name,
        unit: wi.unit,
        totalVolume: vol,
        dailyTargetVolume: defTarget,
        calculatedDays: days,
      };
    });
    setTargetItemRitmes(initialRitmes);

    // Otomatis panggil No Penugasan & Personel dari Menu 4 yang sesuai SPK dan Blok ini
    const { asgNumbers, personnel } = getPersonnelForBlockFromAssignments(chosenClientId, chosenBlock?.id);

    setTargetForm({
      clientId: chosenBlock?.clientId || chosenClientId || '',
      clientName: clientObj?.name || '',
      contractNumber: clientObj?.contractNumber || '',
      blockId: chosenBlock?.id || '',
      blockCode: chosenBlock?.code || '',
      date: todayStr,
      dailyTargetAreaHa: chosenBlock?.dailyTargetAreaHa || 4.0,
      shift: 'Siang (07:00 - 17:00)',
      notes: '',
      status: 'Terjadwal',
      assignmentNumbers: asgNumbers,
      assignedPersonnel: personnel,
      itemTargets: initialRitmes,
      assignedEquipmentCount: personnel.filter((a) => a.equipmentId).length || 0,
      assignedWorkerCount: personnel.length || 0,
    });
    setIsTargetModalOpen(true);
  };

  const handleOpenEditTarget = (target: DailyLocationTarget) => {
    setEditingTargetId(target.id);
    const chosenBlock = blocks.find((b) => b.id === target.blockId);
    const clientObj = clients.find((c) => c.id === target.clientId);

    let itemsToSet: DailyItemRitmeTarget[] = [];
    if (target.itemTargets && target.itemTargets.length > 0) {
      itemsToSet = target.itemTargets;
    } else {
      const blockItems = (chosenBlock?.workItems && chosenBlock.workItems.length > 0)
        ? chosenBlock.workItems
        : DEFAULT_WORK_ITEMS_CATALOG;
      itemsToSet = blockItems.map((wi, idx) => {
        const vol = (wi as any).targetVolume !== undefined ? (wi as any).targetVolume : (wi as any).defaultTargetVolume || 10;
        const defTarget = wi.name.toUpperCase().includes('BATANG KUBUR') ? 10 : (vol > 10 ? Math.ceil(vol / 4) : 2);
        return {
          id: (wi as any).id || `it-${idx + 1}`,
          name: wi.name,
          unit: wi.unit,
          totalVolume: vol,
          dailyTargetVolume: defTarget,
          calculatedDays: defTarget > 0 ? Math.ceil(vol / defTarget) : 0,
        };
      });
    }
    setTargetItemRitmes(itemsToSet);

    // Otomatis sinkronkan penugasan terbaru dari Menu 4
    const { asgNumbers, personnel } = getPersonnelForBlockFromAssignments(target.clientId, target.blockId);

    setTargetForm({
      ...target,
      contractNumber: target.contractNumber || clientObj?.contractNumber || 'Tanpa SPK',
      assignmentNumbers: asgNumbers.length > 0 ? asgNumbers : (target.assignmentNumbers || []),
      assignedPersonnel: personnel.length > 0 ? personnel : (target.assignedPersonnel || []),
      itemTargets: itemsToSet,
    });
    setIsTargetModalOpen(true);
  };

  // Handler dropdown pilihan No Kontrak/SPK Klien pada form target
  const handleTargetFormClientChange = (newClientId: string) => {
    const clientObj = clients.find((c) => c.id === newClientId);
    const clientBlks = blocks.filter((b) => b.clientId === newClientId);
    const chosenBlock = clientBlks[0] || blocks[0];

    const blockItems = (chosenBlock?.workItems && chosenBlock.workItems.length > 0)
      ? chosenBlock.workItems
      : DEFAULT_WORK_ITEMS_CATALOG;

    const newRitmes: DailyItemRitmeTarget[] = blockItems.map((wi, idx) => {
      const vol = (wi as any).targetVolume !== undefined ? (wi as any).targetVolume : (wi as any).defaultTargetVolume || 10;
      const defTarget = wi.name.toUpperCase().includes('BATANG KUBUR') ? 10 : (vol > 10 ? Math.ceil(vol / 4) : 2);
      return {
        id: (wi as any).id || `it-${idx + 1}`,
        name: wi.name,
        unit: wi.unit,
        totalVolume: vol,
        dailyTargetVolume: defTarget,
        calculatedDays: defTarget > 0 ? Math.ceil(vol / defTarget) : 0,
      };
    });
    setTargetItemRitmes(newRitmes);

    const { asgNumbers, personnel } = getPersonnelForBlockFromAssignments(newClientId, chosenBlock?.id);

    setTargetForm((prev) => ({
      ...prev,
      clientId: newClientId,
      clientName: clientObj?.name || 'Klien',
      contractNumber: clientObj?.contractNumber || 'Tanpa SPK',
      blockId: chosenBlock?.id || '',
      blockCode: chosenBlock?.code || 'Blok',
      dailyTargetAreaHa: chosenBlock?.dailyTargetAreaHa || prev.dailyTargetAreaHa || 4.0,
      assignmentNumbers: asgNumbers,
      assignedPersonnel: personnel,
      itemTargets: newRitmes,
      assignedEquipmentCount: personnel.filter((a) => a.equipmentId).length || 3,
      assignedWorkerCount: personnel.length || 8,
    }));
  };

  // Handler dropdown pilihan Lokasi Kerja / Blok pada form target
  const handleTargetFormBlockChange = (newBlockId: string) => {
    const chosenBlock = blocks.find((b) => b.id === newBlockId);
    const blockItems = (chosenBlock?.workItems && chosenBlock.workItems.length > 0)
      ? chosenBlock.workItems
      : DEFAULT_WORK_ITEMS_CATALOG;

    const newRitmes: DailyItemRitmeTarget[] = blockItems.map((wi, idx) => {
      const vol = (wi as any).targetVolume !== undefined ? (wi as any).targetVolume : (wi as any).defaultTargetVolume || 10;
      const defTarget = wi.name.toUpperCase().includes('BATANG KUBUR') ? 10 : (vol > 10 ? Math.ceil(vol / 4) : 2);
      return {
        id: (wi as any).id || `it-${idx + 1}`,
        name: wi.name,
        unit: wi.unit,
        totalVolume: vol,
        dailyTargetVolume: defTarget,
        calculatedDays: defTarget > 0 ? Math.ceil(vol / defTarget) : 0,
      };
    });
    setTargetItemRitmes(newRitmes);

    const { asgNumbers, personnel } = getPersonnelForBlockFromAssignments(targetForm.clientId || '', newBlockId);

    setTargetForm((prev) => ({
      ...prev,
      blockId: newBlockId,
      blockCode: chosenBlock?.code || 'Blok',
      dailyTargetAreaHa: chosenBlock?.dailyTargetAreaHa || prev.dailyTargetAreaHa || 4.0,
      assignmentNumbers: asgNumbers,
      assignedPersonnel: personnel,
      itemTargets: newRitmes,
      assignedEquipmentCount: personnel.filter((a) => a.equipmentId).length || 3,
      assignedWorkerCount: personnel.length || 8,
    }));
  };

  // Handler input manual target ritme harian untuk suatu item pekerjaan
  const handleItemRitmeTargetChange = (itemName: string, rawVal: string) => {
    const val = parseFloat(rawVal.replace(',', '.')) || 0;
    setTargetItemRitmes((prev) =>
      prev.map((item) => {
        if (item.name.toUpperCase() === itemName.toUpperCase()) {
          const days = (val > 0 && item.totalVolume > 0) ? Math.ceil(item.totalVolume / val) : 0;
          return {
            ...item,
            dailyTargetVolume: val,
            calculatedDays: days,
          };
        }
        return item;
      })
    );
  };

  const handleSaveTarget = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetForm.clientId || !targetForm.blockId || !targetForm.date) {
      alert('Mohon lengkapi No. Kontrak/SPK Klien, Lokasi Kerja (Blok), dan Tanggal pelaksanaan target.');
      return;
    }

    const client = clients.find((c) => c.id === targetForm.clientId);
    const block = blocks.find((b) => b.id === targetForm.blockId);

    const targetId = editingTargetId || `TGT-${targetForm.date}-${targetForm.blockId}-${Date.now().toString().slice(-4)}`;

    const { asgNumbers, personnel } = getPersonnelForBlockFromAssignments(targetForm.clientId || '', targetForm.blockId);

    const saved: DailyLocationTarget = {
      id: targetId,
      clientId: targetForm.clientId,
      clientName: client?.name || 'Klien',
      contractNumber: client?.contractNumber || 'Tanpa SPK',
      blockId: targetForm.blockId,
      blockCode: block?.code || 'Blok',
      date: targetForm.date,
      dailyTargetAreaHa: Number(targetForm.dailyTargetAreaHa) || 4.0,
      assignmentNumbers: asgNumbers.length > 0 ? asgNumbers : (targetForm.assignmentNumbers || []),
      assignedPersonnel: personnel.length > 0 ? personnel : (targetForm.assignedPersonnel || []),
      itemTargets: targetItemRitmes,
      assignedEquipmentCount: personnel.filter((a) => a.equipmentId).length || targetForm.assignedEquipmentCount || 3,
      assignedWorkerCount: personnel.length || targetForm.assignedWorkerCount || 8,
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
  const DEFAULT_EQUIPMENT_TYPES = ['Excavator', 'Bulldozer', 'Dump Truck', 'Motor Grader', 'Vibro Roller'];
  const [customEquipmentTypes, setCustomEquipmentTypes] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('SL_CUSTOM_EQUIPMENT_TYPES');
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });
  const [isAddingNewEquipmentType, setIsAddingNewEquipmentType] = useState<boolean>(false);
  const [newEquipmentTypeInput, setNewEquipmentTypeInput] = useState<string>('');

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
    setIsAddingNewEquipmentType(false);
    setNewEquipmentTypeInput('');
    setIsEquipmentModalOpen(true);
  };

  const handleOpenEditEquipment = (eq: Equipment) => {
    setEditingEquipmentId(eq.id);
    setEquipmentForm({ ...eq });
    setIsAddingNewEquipmentType(false);
    setNewEquipmentTypeInput('');
    setIsEquipmentModalOpen(true);
  };

  const handleAddEquipmentType = () => {
    const trimmed = newEquipmentTypeInput.trim();
    if (!trimmed) return;
    const updated = Array.from(new Set([...customEquipmentTypes, trimmed]));
    setCustomEquipmentTypes(updated);
    try {
      localStorage.setItem('SL_CUSTOM_EQUIPMENT_TYPES', JSON.stringify(updated));
    } catch {}
    setEquipmentForm((prev) => ({ ...prev, type: trimmed as any }));
    setIsAddingNewEquipmentType(false);
    setNewEquipmentTypeInput('');
  };

  const handleSaveEquipment = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = (equipmentForm.id || '').trim().toUpperCase();
    const cleanName = (equipmentForm.name || '').trim();

    if (!cleanId || !cleanName) {
      alert('Mohon lengkapi Kode Alat dan Nama Unit Alat Berat.');
      return;
    }

    // Cek apakah Kode Alat sudah digunakan unit lain saat menambah data baru
    if (!editingEquipmentId) {
      const currentEquipments = storageService.getEquipments();
      const isDuplicate = currentEquipments.some((eq) => (eq.id || '').trim().toUpperCase() === cleanId);
      if (isDuplicate) {
        alert(`Kode Alat "${cleanId}" sudah terdaftar di sistem. Gunakan kode alat unik lain (misal: ${cleanId}-02) agar data tidak tertimpa.`);
        return;
      }
    }

    const newEquip: Equipment = {
      id: cleanId,
      name: cleanName,
      type: (equipmentForm.type as any) || 'Excavator',
      model: equipmentForm.model?.trim() || cleanName,
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

  // Work Assignment State & Filters (Superadmin Modul 4. Penugasan Kerja)
  const [isAssignmentModalOpen, setIsAssignmentModalOpen] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<string | null>(null);
  const [assignmentToDelete, setAssignmentToDelete] = useState<WorkAssignment | null>(null);
  const [viewingAssignmentDetail, setViewingAssignmentDetail] = useState<WorkAssignment | null>(null);

  const [assignmentSearch, setAssignmentSearch] = useState<string>('');
  const [assignmentClientFilter, setAssignmentClientFilter] = useState<string>('ALL');
  const [assignmentCategoryFilter, setAssignmentCategoryFilter] = useState<string>('ALL');
  const [assignmentStatusFilter, setAssignmentStatusFilter] = useState<string>('ALL');
  const [manualWorkerInputMode, setManualWorkerInputMode] = useState<Record<string, boolean>>({});

  interface AssignmentFormState {
    id?: string;
    assignmentNumber: string;
    clientId: string;
    assignedDate: string; // Tanggal Mulai Penugasan *
    status: 'Aktif' | 'Standby' | 'Selesai' | 'BKO / Bantuan';
    notes: string; // Catatan / Instruksi Kerja (Opsional)

    // A. TIM STAFF (bekerja diseluruh blok kerja SPK terpilih)
    siteManagerStaffId?: string;
    siteManagerName: string;
    siteManagerPhone: string;
    supervisors: StaffSupervisorAssignment[];

    // B. TIM PENDUKUNG (bekerja diseluruh blok kerja SPK terpilih)
    supportTeam: SupportTeamMemberAssignment[];
  }

  const [assignmentForm, setAssignmentForm] = useState<AssignmentFormState>(() => {
    return {
      assignmentNumber: '001/ST-LC/GKK/IX/2026',
      clientId: 'client-gudang',
      assignedDate: '2026-09-01',
      status: 'Aktif',
      notes: 'Penugasan Tim Kerja Operasional Proyek Land Clearing 460 Ha. Seluruh tim wajib mematuhi SOP Zero Burning Method dan standar K3.',
      siteManagerName: 'Bambang Sugiarto, S.P.',
      siteManagerPhone: '+62 812-3456-7890',
      supervisors: [
        {
          id: 'spv-1',
          name: 'Ahmad Noor',
          phone: '+62 813-1122-3344',
          coverageType: 'CUSTOM',
          assignedBlockIds: ['blk-i33', 'blk-j31', 'blk-j34'],
          assignedBlockCodes: ['BLOK I33', 'BLOK J31', 'BLOK J34'],
        },
        {
          id: 'spv-2',
          name: 'Dedi Kurniawan',
          phone: '+62 813-5566-7788',
          coverageType: 'CUSTOM',
          assignedBlockIds: ['blk-j35', 'blk-j36'],
          assignedBlockCodes: ['BLOK J35', 'BLOK J36'],
        },
      ],
      supportTeam: [
        {
          id: 'sup-1',
          role: 'Operator',
          workerName: 'Hendri Gunawan',
          equipmentId: 'EX-04',
          equipmentName: 'Excavator Kobelco SK200-10',
        },
        {
          id: 'sup-2',
          role: 'Operator',
          workerName: 'Agus Santoso',
          equipmentId: 'EX-01',
          equipmentName: 'Excavator Komatsu PC200-8',
        },
        {
          id: 'sup-3',
          role: 'Operator',
          workerName: 'Rian Hidayat',
          equipmentId: 'EX-02',
          equipmentName: 'Excavator Komatsu PC200-8',
        },
        {
          id: 'sup-4',
          role: 'Operator',
          workerName: 'Bambang Supriyanto',
          equipmentId: 'DZ-02',
          equipmentName: 'Bulldozer CAT D6R',
        },
        {
          id: 'sup-5',
          role: 'Mekanik',
          workerName: 'Anton',
          notes: 'Maintenance & Service Unit',
        },
        {
          id: 'sup-6',
          role: 'Logistik',
          workerName: 'Bowo',
          notes: 'BBM & Sparepart',
        },
        {
          id: 'sup-7',
          role: 'Pendukung',
          workerName: 'Jaya',
          notes: 'Helper & Rintis Jalur',
        },
      ],
    };
  });

  // Helper untuk mengekstrak seluruh personil & alat berat untuk suatu blok dari data Penugasan Kerja
  const getPersonnelForBlockFromAssignments = (targetClientId: string, targetBlockId?: string) => {
    const matchingAssignments = workAssignments.filter(
      (a) => a.clientId === targetClientId && a.status === 'Aktif'
    );
    const asgNumbers = Array.from(new Set(matchingAssignments.map((a) => a.assignmentNumber).filter(Boolean)));
    const personnel: Array<{
      workerId: string;
      workerName: string;
      workerCategory: string;
      equipmentId?: string;
      equipmentName?: string;
      assignmentNumber: string;
    }> = [];

    matchingAssignments.forEach((asg) => {
      // 1. Site Manager
      if (asg.siteManagerName) {
        personnel.push({
          workerId: `sm-${asg.id}`,
          workerName: asg.siteManagerName,
          workerCategory: 'Site Manager',
          assignmentNumber: asg.assignmentNumber,
        });
      }

      // 2. Pengawas
      if (asg.supervisors && asg.supervisors.length > 0) {
        asg.supervisors.forEach((spv, sIdx) => {
          const covers = spv.coverageType === 'ALL' || !targetBlockId || targetBlockId === 'ALL' || spv.assignedBlockIds?.includes(targetBlockId);
          if (covers) {
            personnel.push({
              workerId: spv.id || `spv-${asg.id}-${sIdx}`,
              workerName: spv.name,
              workerCategory: 'Pengawas',
              assignmentNumber: asg.assignmentNumber,
            });
          }
        });
      }

      // 3. Tim Pendukung (bekerja diseluruh blok kerja SPK)
      if (asg.supportTeam && asg.supportTeam.length > 0) {
        asg.supportTeam.forEach((sup, supIdx) => {
          personnel.push({
            workerId: sup.workerId || `sup-${asg.id}-${supIdx}`,
            workerName: sup.workerName,
            workerCategory: sup.role,
            equipmentId: sup.equipmentId,
            equipmentName: sup.equipmentName,
            assignmentNumber: asg.assignmentNumber,
          });
        });
      }

      // 4. Fallback legacy
      if (asg.workerName && (!asg.supportTeam || asg.supportTeam.length === 0)) {
        if (asg.blockId === 'ALL' || !targetBlockId || targetBlockId === 'ALL' || asg.blockId === targetBlockId) {
          personnel.push({
            workerId: asg.workerId || `w-${asg.id}`,
            workerName: asg.workerName,
            workerCategory: asg.workerCategory || 'Operator',
            equipmentId: asg.equipmentId,
            equipmentName: asg.equipmentName,
            assignmentNumber: asg.assignmentNumber,
          });
        }
      }
    });

    return { asgNumbers, personnel };
  };

  const handleOpenAddAssignment = () => {
    if (clients.length === 0) {
      alert('Belum ada data Klien / SPK. Silakan tambahkan Klien terlebih dahulu pada sub menu 1 sebelum membuat penugasan kerja.');
      setActiveSubTab('client');
      return;
    }
    setEditingAssignmentId(null);
    setManualWorkerInputMode({});
    const currentStaffList = storageService.getCompanyStaff();
    setCompanyStaffList(currentStaffList);
    setWorkers(storageService.getWorkers());
    setEquipments(storageService.getEquipments());

    const initialClientId = clients[0]?.id || '';
    const targetClient = clients.find((c) => c.id === initialClientId) || clients[0];
    const todayStr = new Date().toISOString().slice(0, 10);
    const generatedNo = storageService.generateAssignmentNumber(targetClient, todayStr, workAssignments);
    const availableBlocks = blocks.filter((b) => b.clientId === initialClientId);

    const defaultSmStaff =
      currentStaffList.find(
        (s) =>
          s.status === 'Aktif' &&
          (s.userLevel === 'Site Manager' ||
            s.staffLevel === 'Site Manager' ||
            (s.jobRole || '').toLowerCase().includes('site manager'))
      ) || null;

    setAssignmentForm({
      assignmentNumber: generatedNo,
      clientId: initialClientId,
      assignedDate: todayStr,
      status: 'Aktif',
      notes: '',
      siteManagerStaffId: defaultSmStaff?.id || undefined,
      siteManagerName: defaultSmStaff?.fullName || '',
      siteManagerPhone: defaultSmStaff?.phone || '',
      supervisors: [
        {
          id: `spv-${Date.now()}-1`,
          staffId: undefined,
          name: '',
          phone: '',
          coverageType: 'ALL',
          assignedBlockIds: availableBlocks.map((b) => b.id),
          assignedBlockCodes: availableBlocks.map((b) => b.code),
        },
      ],
      supportTeam: [],
    });
    setIsAssignmentModalOpen(true);
  };

  const handleOpenEditAssignment = (asg: WorkAssignment) => {
    setEditingAssignmentId(asg.id);
    setManualWorkerInputMode({});
    const currentStaffList = storageService.getCompanyStaff();
    setCompanyStaffList(currentStaffList);
    setWorkers(storageService.getWorkers());
    setEquipments(storageService.getEquipments());
    const clientBlocks = blocks.filter((b) => b.clientId === asg.clientId);

    const matchedSm = currentStaffList.find(
      (s) =>
        (asg.siteManagerStaffId && s.id === asg.siteManagerStaffId) ||
        (asg.siteManagerName && s.fullName.trim().toLowerCase() === asg.siteManagerName.trim().toLowerCase())
    );

    let sups: StaffSupervisorAssignment[] = [];
    if (asg.supervisors && asg.supervisors.length > 0) {
      sups = asg.supervisors.map((spv) => {
        const matchedSpv = currentStaffList.find(
          (s) =>
            (spv.staffId && s.id === spv.staffId) ||
            (spv.name && s.fullName.trim().toLowerCase() === spv.name.trim().toLowerCase())
        );
        if (matchedSpv) {
          return {
            ...spv,
            staffId: matchedSpv.id,
            name: matchedSpv.fullName,
            phone: spv.phone || matchedSpv.phone,
            jobRole: matchedSpv.jobRole,
            employeeIdNumber: matchedSpv.employeeIdNumber,
          };
        }
        return spv;
      });
    } else {
      const fallbackSpvName = asg.staffName || '';
      const matchedFallbackSpv = currentStaffList.find(
        (s) => s.fullName.trim().toLowerCase() === fallbackSpvName.trim().toLowerCase()
      );
      sups = [
        {
          id: `spv-${asg.id}-1`,
          staffId: matchedFallbackSpv?.id,
          name: matchedFallbackSpv?.fullName || fallbackSpvName,
          phone: matchedFallbackSpv?.phone || '',
          jobRole: matchedFallbackSpv?.jobRole,
          employeeIdNumber: matchedFallbackSpv?.employeeIdNumber,
          coverageType: asg.blockId === 'ALL' ? 'ALL' : 'CUSTOM',
          assignedBlockIds: asg.blockId === 'ALL' ? clientBlocks.map((b) => b.id) : (asg.blockId ? [asg.blockId] : []),
          assignedBlockCodes: asg.blockId === 'ALL' ? clientBlocks.map((b) => b.code) : (asg.blockCode ? [asg.blockCode] : []),
        },
      ];
    }

    let supTeam: SupportTeamMemberAssignment[] = [];
    if (asg.supportTeam && asg.supportTeam.length > 0) {
      supTeam = asg.supportTeam;
    } else if (asg.workerName) {
      supTeam = [
        {
          id: `sup-${asg.id}-1`,
          role: asg.workerCategory || 'Operator',
          workerId: asg.workerId,
          workerName: asg.workerName,
          equipmentId: asg.equipmentId,
          equipmentName: asg.equipmentName,
        },
      ];
    } else {
      supTeam = [];
    }

    setAssignmentForm({
      id: asg.id,
      assignmentNumber: asg.assignmentNumber,
      clientId: asg.clientId,
      assignedDate: asg.assignedDate || new Date().toISOString().slice(0, 10),
      status: asg.status,
      notes: asg.notes || '',
      siteManagerStaffId: matchedSm?.id || asg.siteManagerStaffId,
      siteManagerName: matchedSm?.fullName || asg.siteManagerName || (asg.staffLevel === 'Site Manager' ? asg.staffName || '' : ''),
      siteManagerPhone: asg.siteManagerPhone || matchedSm?.phone || '',
      supervisors: sups,
      supportTeam: supTeam,
    });
    setIsAssignmentModalOpen(true);
  };

  const handleAssignmentClientChange = (newClientId: string) => {
    const targetClient = clients.find((c) => c.id === newClientId);
    const newAssignedDate = assignmentForm.assignedDate || new Date().toISOString().slice(0, 10);
    const newAsgNo = storageService.generateAssignmentNumber(targetClient, newAssignedDate, workAssignments);
    const newBlocks = blocks.filter((b) => b.clientId === newClientId);

    if (newClientId === 'client-gudang') {
      setAssignmentForm((prev) => ({
        ...prev,
        clientId: newClientId,
        assignmentNumber: newAsgNo,
        siteManagerName: 'Bambang Sugiarto, S.P.',
        siteManagerPhone: '+62 812-3456-7890',
        supervisors: [
          {
            id: 'spv-1',
            name: 'Ahmad Noor',
            phone: '+62 813-1122-3344',
            coverageType: 'CUSTOM',
            assignedBlockIds: ['blk-i33', 'blk-j31', 'blk-j34'],
            assignedBlockCodes: ['BLOK I33', 'BLOK J31', 'BLOK J34'],
          },
          {
            id: 'spv-2',
            name: 'Dedi Kurniawan',
            phone: '+62 813-5566-7788',
            coverageType: 'CUSTOM',
            assignedBlockIds: ['blk-j35', 'blk-j36'],
            assignedBlockCodes: ['BLOK J35', 'BLOK J36'],
          },
        ],
        supportTeam: [
          {
            id: 'sup-1',
            role: 'Operator',
            workerName: 'Hendri Gunawan',
            equipmentId: 'EX-04',
            equipmentName: 'Excavator Kobelco SK200-10',
          },
          {
            id: 'sup-2',
            role: 'Operator',
            workerName: 'Agus Santoso',
            equipmentId: 'EX-01',
            equipmentName: 'Excavator Komatsu PC200-8',
          },
          {
            id: 'sup-3',
            role: 'Operator',
            workerName: 'Rian Hidayat',
            equipmentId: 'EX-02',
            equipmentName: 'Excavator Komatsu PC200-8',
          },
          {
            id: 'sup-4',
            role: 'Operator',
            workerName: 'Bambang Supriyanto',
            equipmentId: 'DZ-02',
            equipmentName: 'Bulldozer CAT D6R',
          },
          {
            id: 'sup-5',
            role: 'Mekanik',
            workerName: 'Anton',
            notes: 'Maintenance & Service Unit',
          },
          {
            id: 'sup-6',
            role: 'Logistik',
            workerName: 'Bowo',
            notes: 'BBM & Sparepart',
          },
          {
            id: 'sup-7',
            role: 'Pendukung',
            workerName: 'Jaya',
            notes: 'Helper & Rintis Jalur',
          },
        ],
      }));
    } else {
      setAssignmentForm((prev) => ({
        ...prev,
        clientId: newClientId,
        assignmentNumber: newAsgNo,
        supervisors: prev.supervisors.map((spv) => ({
          ...spv,
          assignedBlockIds: spv.coverageType === 'ALL' ? newBlocks.map((b) => b.id) : [],
          assignedBlockCodes: spv.coverageType === 'ALL' ? newBlocks.map((b) => b.code) : [],
        })),
      }));
    }
  };

  // Handler pilih Site Manager dari Daftar Staff (Menu Identitas Perusahaan)
  const handleSiteManagerSelect = (selectedValue: string) => {
    const foundStaff = companyStaffList.find(
      (s) =>
        s.fullName.trim().toLowerCase() === (selectedValue || '').trim().toLowerCase() ||
        s.id === selectedValue
    );
    setAssignmentForm((prev) => ({
      ...prev,
      siteManagerStaffId: foundStaff?.id,
      siteManagerName: foundStaff ? foundStaff.fullName : selectedValue,
      siteManagerPhone: foundStaff ? (foundStaff.phone || '') : (selectedValue ? prev.siteManagerPhone : ''),
    }));
  };

  // Supervisor helpers
  const handleAddSupervisor = () => {
    const clientBlocks = blocks.filter((b) => b.clientId === assignmentForm.clientId);
    const newSpv: StaffSupervisorAssignment = {
      id: `spv-${Date.now()}`,
      staffId: undefined,
      name: '',
      phone: '',
      coverageType: 'ALL',
      assignedBlockIds: clientBlocks.map((b) => b.id),
      assignedBlockCodes: clientBlocks.map((b) => b.code),
    };
    setAssignmentForm((prev) => ({
      ...prev,
      supervisors: [...prev.supervisors, newSpv],
    }));
  };

  const handleRemoveSupervisor = (index: number) => {
    if (assignmentForm.supervisors.length <= 1) {
      alert('Minimal harus ada 1 Pengawas Lapangan.');
      return;
    }
    setAssignmentForm((prev) => ({
      ...prev,
      supervisors: prev.supervisors.filter((_, i) => i !== index),
    }));
  };

  const handleSupervisorChange = (index: number, field: keyof StaffSupervisorAssignment, value: any) => {
    setAssignmentForm((prev) => {
      const nextSups = [...prev.supervisors];
      const cur = { ...nextSups[index] };
      if (field === 'coverageType') {
        cur.coverageType = value;
        if (value === 'ALL') {
          const clientBlocks = blocks.filter((b) => b.clientId === prev.clientId);
          cur.assignedBlockIds = clientBlocks.map((b) => b.id);
          cur.assignedBlockCodes = clientBlocks.map((b) => b.code);
        }
      } else if (field === 'name') {
        const foundStaff = companyStaffList.find(
          (s) =>
            s.fullName?.trim().toLowerCase() === (value || '').trim().toLowerCase() ||
            s.id === value
        );
        if (foundStaff) {
          cur.staffId = foundStaff.id;
          cur.name = foundStaff.fullName;
          cur.phone = foundStaff.phone || '';
          cur.jobRole = foundStaff.jobRole;
          cur.employeeIdNumber = foundStaff.employeeIdNumber;
        } else if (!value) {
          cur.staffId = undefined;
          cur.name = '';
          cur.phone = '';
          cur.jobRole = undefined;
          cur.employeeIdNumber = undefined;
        } else {
          cur.name = value;
          const foundWorker = workers.find((w) => w.name.toLowerCase() === (value || '').toLowerCase());
          if (foundWorker?.phone) {
            cur.phone = foundWorker.phone;
          }
        }
      } else {
        (cur as any)[field] = value;
      }
      nextSups[index] = cur;
      return { ...prev, supervisors: nextSups };
    });
  };

  const handleToggleSupervisorBlock = (spvIndex: number, blockId: string, blockCode: string) => {
    setAssignmentForm((prev) => {
      const nextSups = [...prev.supervisors];
      const cur = { ...nextSups[spvIndex] };
      const ids = [...(cur.assignedBlockIds || [])];
      const codes = [...(cur.assignedBlockCodes || [])];
      const existsIdx = ids.indexOf(blockId);
      if (existsIdx >= 0) {
        ids.splice(existsIdx, 1);
        codes.splice(existsIdx, 1);
      } else {
        ids.push(blockId);
        codes.push(blockCode);
      }
      cur.assignedBlockIds = ids;
      cur.assignedBlockCodes = codes;
      nextSups[spvIndex] = cur;
      return { ...prev, supervisors: nextSups };
    });
  };

  // Support Team helpers
  const handleAddSupportMember = () => {
    const newMember: SupportTeamMemberAssignment = {
      id: `sup-${Date.now()}`,
      role: 'Operator',
      workerName: '',
      equipmentId: '',
      equipmentName: '',
      notes: '',
    };
    setAssignmentForm((prev) => ({
      ...prev,
      supportTeam: [...prev.supportTeam, newMember],
    }));
  };

  const handleRemoveSupportMember = (index: number) => {
    if (assignmentForm.supportTeam.length <= 1) {
      alert('Minimal harus ada 1 personil dalam Tim Pendukung.');
      return;
    }
    setAssignmentForm((prev) => ({
      ...prev,
      supportTeam: prev.supportTeam.filter((_, i) => i !== index),
    }));
  };

  const handleSupportMemberChange = (index: number, field: keyof SupportTeamMemberAssignment, value: any) => {
    setAssignmentForm((prev) => {
      const nextTeam = [...prev.supportTeam];
      const cur = { ...nextTeam[index], [field]: value };
      if (field === 'role' && value !== 'Operator') {
        cur.equipmentId = undefined;
        cur.equipmentName = undefined;
      }
      if (field === 'workerName') {
        const foundWorker = workers.find((w) => w.name.toLowerCase() === (value || '').toLowerCase());
        if (foundWorker) {
          cur.workerId = foundWorker.id;
          cur.phone = foundWorker.phone;
          // If operator and no equipment chosen yet, try to auto-select from equipment or worker
          if (cur.role === 'Operator' && !cur.equipmentId) {
            if (foundWorker.assignedEquipmentId) {
              const eq = equipments.find((e) => e.id === foundWorker.assignedEquipmentId);
              if (eq) {
                cur.equipmentId = eq.id;
                cur.equipmentName = eq.name;
              }
            } else {
              const eq = equipments.find((e) => e.operatorName && e.operatorName.toLowerCase() === foundWorker.name.toLowerCase());
              if (eq) {
                cur.equipmentId = eq.id;
                cur.equipmentName = eq.name;
              }
            }
          }
        }
      }
      if (field === 'equipmentId') {
        const foundEq = equipments.find((e) => e.id === value);
        if (foundEq) {
          cur.equipmentName = foundEq.name;
          // If workerName is empty and foundEq has operatorName, auto-fill operator from module 3 workers
          if (!cur.workerName && foundEq.operatorName) {
            const opWorker = workers.find((w) => w.name.toLowerCase() === foundEq.operatorName.toLowerCase());
            if (opWorker) {
              cur.workerName = opWorker.name;
              cur.workerId = opWorker.id;
              cur.phone = opWorker.phone;
            } else {
              cur.workerName = foundEq.operatorName;
            }
          }
        } else {
          cur.equipmentName = undefined;
        }
      }
      nextTeam[index] = cur;
      return { ...prev, supportTeam: nextTeam };
    });
  };

  const handleSaveAssignment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!assignmentForm.clientId) {
      alert('Mohon pilih Klien & Nomor SPK.');
      return;
    }
    if (!assignmentForm.siteManagerName?.trim()) {
      alert('Mohon isi nama Site Manager.');
      return;
    }
    if (assignmentForm.supervisors.length === 0 || !assignmentForm.supervisors[0].name?.trim()) {
      alert('Mohon isi minimal 1 Pengawas Lapangan.');
      return;
    }
    if (assignmentForm.supportTeam.length === 0) {
      alert('Mohon tambahkan minimal 1 personil Tim Pendukung.');
      return;
    }

    const selectedClient = clients.find((c) => c.id === assignmentForm.clientId) || clients[0];
    const finalAssignmentNo = assignmentForm.assignmentNumber?.trim() || storageService.generateAssignmentNumber(selectedClient, assignmentForm.assignedDate, workAssignments);
    const assignmentId = editingAssignmentId || `asg-${Date.now()}`;

    const firstOperator = assignmentForm.supportTeam.find((s) => s.role === 'Operator');
    const firstSupervisor = assignmentForm.supervisors[0];

    const newAsg: WorkAssignment = {
      id: assignmentId,
      assignmentNumber: finalAssignmentNo,
      clientId: selectedClient?.id || 'client-1',
      clientName: selectedClient?.name || 'Klien',
      contractNumber: selectedClient?.contractNumber || 'Tanpa SPK',
      totalAreaHa: selectedClient?.totalAreaHa || 460,
      assignedDate: assignmentForm.assignedDate,
      status: assignmentForm.status,
      notes: assignmentForm.notes?.trim() || undefined,
      createdAt: editingAssignmentId 
        ? (workAssignments.find((a) => a.id === editingAssignmentId)?.createdAt || new Date().toISOString()) 
        : new Date().toISOString(),

      siteManagerStaffId: assignmentForm.siteManagerStaffId,
      siteManagerName: assignmentForm.siteManagerName.trim(),
      siteManagerPhone: assignmentForm.siteManagerPhone.trim() || undefined,
      supervisors: assignmentForm.supervisors,
      supportTeam: assignmentForm.supportTeam,

      staffId: assignmentForm.siteManagerStaffId,
      staffName: assignmentForm.siteManagerName || firstSupervisor?.name,
      staffLevel: 'Site Manager',
      workerName: `${firstOperator?.workerName || 'Tim Pendukung'} dkk (${assignmentForm.supportTeam.length} Personil)`,
      workerCategory: 'Operator & Tim Pendukung',
      equipmentId: firstOperator?.equipmentId,
      equipmentName: firstOperator?.equipmentName,
      blockId: 'ALL',
      blockCode: 'Seluruh Blok Kerja SPK Terpilih',
    };

    storageService.saveWorkAssignment(newAsg);
    setWorkAssignments([...storageService.getWorkAssignments()]);
    setCompanyStaffList([...storageService.getCompanyStaff()]);
    setWorkers([...storageService.getWorkers()]);
    setIsAssignmentModalOpen(false);
    setEditingAssignmentId(null);
  };

  const handleDeleteAssignmentConfirm = (asg: WorkAssignment) => {
    setAssignmentToDelete(asg);
  };

  const executeDeleteAssignment = () => {
    if (assignmentToDelete) {
      storageService.deleteWorkAssignment(assignmentToDelete.id);
      setWorkAssignments([...storageService.getWorkAssignments()]);
      setWorkers([...storageService.getWorkers()]);
      setAssignmentToDelete(null);
    }
  };

  // Open Add Client Modal
  const handleOpenAddClient = () => {
    setEditingClientId(null);
    setShowClientPassword(false);
    setClientForm({
      contractNumber: '',
      name: '',
      fullCompanyName: '',
      totalAreaInput: '',
      location: '',
      contactPerson: '',
      phone: '',
      email: '',
      address: '',
      status: 'Aktif',
      clearedAreaHa: 0,
      username: '',
      password: '',
      userLevel: 'Klien',
      linkedUserId: undefined,
    });
    setModalBlocks([
      { code: '', targetAreaHa: '' },
    ]);
    setIsClientModalOpen(true);
  };

  // Open Edit Client Modal
  const handleOpenEditClient = (c: Client) => {
    setEditingClientId(c.id);
    setShowClientPassword(false);
    const clientBlocks = blocks.filter((b) => b.clientId === c.id);
    setClientForm({
      contractNumber: c.contractNumber || '',
      name: c.name || '',
      fullCompanyName: c.fullCompanyName || '',
      totalAreaInput: c.totalAreaHa !== undefined ? String(c.totalAreaHa).replace('.', ',') : '',
      location: c.location || '',
      contactPerson: c.contactPerson || '',
      phone: c.phone || '',
      email: c.email || '',
      address: c.address || '',
      projectName: c.projectName || '',
      status: c.status || 'Aktif',
      clearedAreaHa: c.clearedAreaHa || 0,
      username: c.username || '',
      password: c.password || '',
      userLevel: 'Klien',
      linkedUserId: c.linkedUserId,
    });

    if (clientBlocks.length > 0) {
      setModalBlocks(
        clientBlocks.map((b) => ({
          id: b.id,
          code: b.code,
          targetAreaHa: b.targetAreaHa !== undefined ? String(b.targetAreaHa).replace('.', ',') : '',
          status: b.status,
        }))
      );
    } else {
      setModalBlocks([
        { code: 'BLOK AA', targetAreaHa: '' },
        { code: 'BLOK AB', targetAreaHa: '' },
        { code: 'BLOK AC', targetAreaHa: '' },
        { code: 'BLOK AD', targetAreaHa: '' },
      ]);
    }
    setIsClientModalOpen(true);
  };

  // Modal Dynamic Blocks Handlers
  const handleAddModalBlock = (presetCode?: string) => {
    let nextCode = presetCode;
    if (!nextCode) {
      const letters = ['AA', 'AB', 'AC', 'AD', 'AE', 'AF', 'AG', 'AH', 'AI', 'AJ', 'AK', 'AL', 'BA', 'BB', 'BC', 'BD'];
      const currentCodes = new Set(modalBlocks.map((b) => b.code.trim().toUpperCase()));
      const available = letters.find((l) => !currentCodes.has(`BLOK ${l}`));
      nextCode = available ? `BLOK ${available}` : `BLOK ${modalBlocks.length + 1}`;
    }
    setModalBlocks((prev) => [
      ...prev,
      { code: nextCode!, targetAreaHa: '' }
    ]);
  };

  const handleRemoveModalBlock = (index: number) => {
    if (modalBlocks.length <= 1) {
      return;
    }
    setModalBlocks((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateModalBlock = (index: number, field: 'code' | 'targetAreaHa', value: string) => {
    setModalBlocks((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  // Save Client (Create or Update)
  const handleSaveClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientForm.contractNumber?.trim()) {
      return;
    }
    if (!clientForm.name?.trim() || !clientForm.fullCompanyName?.trim()) {
      return;
    }

    // Parsing manual luas kontrak with comma/dot decimal support (e.g. 110,3)
    const rawArea = String(clientForm.totalAreaInput || '').trim().replace(',', '.');
    const parsedArea = parseFloat(rawArea) || 0;

    const cleanUsername = (clientForm.username || '').trim().toLowerCase();
    const cleanPassword = (clientForm.password || '').trim() || 'klien123';

    const clientId = editingClientId || `client-${Date.now()}`;

    // Sync blocks for this client and SPK first so saveClient can include block codes in the Klien user account
    const currentStoredBlocks = storageService.getBlocks().filter((b) => b.clientId === clientId);
    const currentStoredBlockIds = new Set(currentStoredBlocks.map((b) => b.id));

    const validBlocks = modalBlocks
      .map((mb) => ({ ...mb, code: mb.code.trim() }))
      .filter((mb) => mb.code.length > 0);

    const blocksToSave = validBlocks.length > 0 
      ? validBlocks 
      : [{ code: 'BLOK AA', targetAreaHa: String(parsedArea) }];

    const keptBlockIds = new Set<string>();

    blocksToSave.forEach((mb, idx) => {
      const rawBlockArea = String(mb.targetAreaHa || '').trim().replace(',', '.');
      const blockArea = parseFloat(rawBlockArea) || (parsedArea > 0 ? Number((parsedArea / blocksToSave.length).toFixed(1)) : 50);

      if (mb.id && currentStoredBlockIds.has(mb.id)) {
        const existing = currentStoredBlocks.find((b) => b.id === mb.id);
        if (existing) {
          existing.code = mb.code;
          existing.targetAreaHa = blockArea;
          storageService.saveBlock(existing);
          keptBlockIds.add(existing.id);
        }
      } else {
        const newBlock: Block = {
          id: `blk-${Date.now()}-${idx}`,
          projectId: `proj-${clientId}`,
          clientId: clientId,
          code: mb.code,
          targetAreaHa: blockArea,
          dailyTargetAreaHa: 4.0,
          clearedAreaHa: 0,
          status: 'Dalam Pengerjaan',
        };
        storageService.saveBlock(newBlock);
        keptBlockIds.add(newBlock.id);
      }
    });

    // Delete blocks removed during edit
    if (editingClientId) {
      currentStoredBlocks.forEach((oldBlock) => {
        if (!keptBlockIds.has(oldBlock.id)) {
          storageService.deleteBlock(oldBlock.id);
        }
      });
    }

    const newClient: Client = {
      id: clientId,
      name: clientForm.name.trim(),
      fullCompanyName: clientForm.fullCompanyName.trim(),
      contractNumber: clientForm.contractNumber.trim(),
      projectName: clientForm.projectName || `Land Clearing Perkebunan ${clientForm.name.trim()}`,
      location: clientForm.location?.trim() || 'Provinsi Riau',
      address: clientForm.address?.trim() || 'Riau',
      contactPerson: clientForm.contactPerson?.trim() || 'PIC Lapangan',
      phone: clientForm.phone?.trim() || '-',
      email: clientForm.email?.trim() || '',
      totalAreaHa: parsedArea,
      clearedAreaHa: Number(clientForm.clearedAreaHa) || 0,
      status: clientForm.status || 'Aktif',
      username: cleanUsername || undefined,
      password: cleanUsername ? cleanPassword : undefined,
      userLevel: 'Klien',
      linkedUserId: clientForm.linkedUserId,
    };

    storageService.saveClient(newClient);

    setClients(storageService.getClients());
    setBlocks(storageService.getBlocks());
    setIsClientModalOpen(false);
    setEditingClientId(null);
  };

  // Delete Client
  const handleDeleteClient = (id: string, name: string) => {
    const c = clients.find((client) => client.id === id);
    if (c) {
      setClientToDelete(c);
    } else {
      setClientToDelete({ id, name } as any);
    }
  };

  const executeDeleteClient = () => {
    if (clientToDelete) {
      storageService.deleteClient(clientToDelete.id);
      setClients(storageService.getClients());
      setClientToDelete(null);
    }
  };

  // Save Block & Work Items (Create or Update)
  const handleSaveBlock = (e: React.FormEvent) => {
    e.preventDefault();
    if (!blockForm.code?.trim()) {
      alert('Mohon isi nama / kode Lokasi Blok Kerja.');
      return;
    }
    if (!blockForm.clientId) {
      alert('Mohon pilih No Kontrak/SPK Klien.');
      return;
    }

    const rawArea = String(blockForm.targetAreaInput || '').trim().replace(',', '.');
    const parsedArea = parseFloat(rawArea) || 0;
    const targetClientId = blockForm.clientId;
    const blockCode = blockForm.code.trim();

    const cleanedWorkItems: BlockWorkItem[] = blockForm.workItems.map((wi) => {
      let unit = wi.unit;
      if (unit === 'HEKTAR' || unit === 'Hektar') unit = 'Ha';
      if (unit === 'METER LARI') unit = 'm';
      if (unit === 'METER KUBIK') unit = 'm³';
      let targetVol = wi.targetVolume;
      const draft = itemVolumeDrafts[wi.name.toUpperCase()];
      if (draft !== undefined) {
        const parsed = parseFloat(draft.replace(',', '.'));
        if (!isNaN(parsed)) targetVol = parsed;
      }
      return {
        ...wi,
        unit,
        targetVolume: targetVol !== undefined ? targetVol : 0,
      };
    });

    if (editingBlockId) {
      const existing = blocks.find((b) => b.id === editingBlockId);
      const updatedBlock: Block = {
        id: editingBlockId,
        projectId: existing?.projectId || `proj-${targetClientId}`,
        clientId: targetClientId,
        code: blockCode,
        targetAreaHa: parsedArea || existing?.targetAreaHa || 50,
        dailyTargetAreaHa: existing?.dailyTargetAreaHa ?? blockForm.dailyTargetAreaHa ?? 4.0,
        clearedAreaHa: existing?.clearedAreaHa || 0,
        status: blockForm.status,
        workItems: cleanedWorkItems,
      };
      storageService.saveBlock(updatedBlock);
    } else {
      const isExistingBlockSelected = blockForm.selectedExistingBlockId && blockForm.selectedExistingBlockId !== '__CUSTOM__';
      const existingSameBlock = isExistingBlockSelected
        ? blocks.find((b) => b.id === blockForm.selectedExistingBlockId)
        : blocks.find(
            (b) => b.clientId === targetClientId && b.code.trim().toUpperCase() === blockCode.toUpperCase()
          );

      if (existingSameBlock) {
        const updatedBlock: Block = {
          ...existingSameBlock,
          code: blockCode,
          targetAreaHa: parsedArea || existingSameBlock.targetAreaHa,
          status: blockForm.status,
          workItems: cleanedWorkItems,
        };
        storageService.saveBlock(updatedBlock);
      } else {
        const newBlock: Block = {
          id: `blk-${Date.now()}`,
          projectId: `proj-${targetClientId}`,
          clientId: targetClientId,
          code: blockCode,
          targetAreaHa: parsedArea || 50,
          dailyTargetAreaHa: blockForm.dailyTargetAreaHa || 4.0,
          clearedAreaHa: 0,
          status: blockForm.status,
          workItems: cleanedWorkItems,
        };
        storageService.saveBlock(newBlock);
      }
    }

    setBlocks(storageService.getBlocks());
    setIsBlockModalOpen(false);
    setEditingBlockId(null);
  };

  // Delete Block
  const handleDeleteBlock = (id: string, code: string) => {
    const b = blocks.find((block) => block.id === id);
    if (b) {
      setBlockToDelete(b);
    } else {
      setBlockToDelete({ id, code } as any);
    }
  };

  const executeDeleteBlock = () => {
    if (blockToDelete) {
      storageService.deleteBlock(blockToDelete.id);
      setBlocks(storageService.getBlocks());
      setBlockToDelete(null);
    }
  };


  return (
    <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Master Data Proyek
              </span>
              <span className="text-xs text-slate-500 font-mono">PT. RBS GROUP</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
              Master Data Proyek Land Clearing
            </h2>
            <p className="text-xs text-slate-500">
              Pengaturan daftar klien perkebunan (Multi-Client), lokasi & pekerjaan, alat berat & batas BBM, penugasan kerja, dan target harian.
            </p>
          </div>

          {(clients.length > 0 || blocks.length > 0 || equipments.length > 0 || workAssignments.length > 0 || dailyTargets.length > 0) && (
            <button
              type="button"
              onClick={() => setIsClearMasterModalOpen(true)}
              className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 font-bold text-xs rounded-xl border border-rose-200 flex items-center gap-1.5 transition cursor-pointer self-start sm:self-center shrink-0 shadow-xs"
              title="Hapus / Kosongkan semua data inputan Master Data Proyek untuk pengisian data riil lapangan baru"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Kosongkan Semua Data Master Proyek</span>
            </button>
          )}
        </div>

        {/* Sub-tab navigation: Master Data Proyek (1. Klien, 2. Lokasi & Pekerjaan, 3. Alat Berat & BBM, 4. Penugasan Kerja, 5. Target Harian) */}
        <div className="flex items-center gap-2 overflow-x-auto pt-4 text-xs font-bold">
          {/* 1. DAFTAR KLIEN */}
          <button
            onClick={() => setActiveSubTab('client')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'client'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Building2 className="w-4 h-4" />
            <span>1. Daftar Klien ({clients.length})</span>
          </button>

          {/* 2. LOKASI & PEKERJAAN */}
          <button
            onClick={() => setActiveSubTab('blocks')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'blocks'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>2. Lokasi & Pekerjaan ({blocks.length})</span>
          </button>

          {/* 3. ALAT BERAT & BATAS BBM */}
          <button
            onClick={() => setActiveSubTab('equipments')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'equipments'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Truck className="w-4 h-4" />
            <span>3. Alat Berat & Batas BBM ({equipments.length})</span>
          </button>

          {/* 4. PENUGASAN KERJA */}
          <button
            onClick={() => setActiveSubTab('assignments')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'assignments'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <ClipboardList className="w-4 h-4" />
            <span>4. Penugasan Kerja ({workAssignments.length})</span>
          </button>

          {/* 5. TARGET HARIAN */}
          <button
            onClick={() => setActiveSubTab('targets')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl transition cursor-pointer whitespace-nowrap ${
              activeSubTab === 'targets'
                ? 'bg-amber-500 text-slate-950 shadow font-black'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
            }`}
          >
            <Target className="w-4 h-4" />
            <span>5. Target Harian ({dailyTargets.length})</span>
          </button>
        </div>
      </div>

      {/* SUB-TAB: CLIENT MANAGEMENT (MULTI-CLIENT & MULTI-SPK) */}
      {activeSubTab === 'client' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    1. DAFTAR KLIEN ({clients.length} SPK TERDAFTAR)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Klien dikunci (di-lock) berdasarkan <strong>Nomor Kontrak / SPK</strong>. 1 Klien PT bisa memiliki banyak SPK dengan lokasi blok kerja yang berbeda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleOpenAddClient}
                className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Tambah Klien Perusahaan Baru</span>
              </button>
            </div>

            {/* Filter & Search Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="relative w-full sm:w-96">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  placeholder="Cari berdasarkan Nomor SPK, Nama PT, atau Lokasi..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>
              <div className="text-xs font-bold text-slate-500">
                Menampilkan {filteredClients.length} dari {clients.length} SPK Klien
              </div>
            </div>
          </div>

          {filteredClients.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-3">
              <Building2 className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-black text-slate-800 text-sm">
                {clients.length === 0 ? 'Belum Ada Data Klien / SPK' : 'Tidak Ada Data Klien yang Cocok'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {clients.length === 0 
                  ? 'Data master klien telah dikosongkan. Silakan klik tombol di bawah untuk mulai menginput data riil SPK & Klien di lapangan.' 
                  : `Tidak ada data klien yang cocok dengan pencarian "${clientSearchQuery}".`}
              </p>
              {clients.length === 0 && (
                <button
                  type="button"
                  onClick={handleOpenAddClient}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Klien Perusahaan Baru</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredClients.map((c) => {
                const clientBlocks = blocks.filter((b) => b.clientId === c.id);
                const pct = c.totalAreaHa > 0 ? ((c.clearedAreaHa / c.totalAreaHa) * 100).toFixed(1) : '0';

                return (
                  <div
                    key={c.id}
                    className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between space-y-4 hover:border-amber-400 transition"
                  >
                    <div className="space-y-3">
                      {/* HIGHLIGHTED SPK HEADER (YANG DISOROT: KLIEN DI-LOCK BERDASARKAN SPK) */}
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-400 p-3 rounded-xl shadow-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase rounded tracking-wider shadow-2xs flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            LOCKED SPK (PRIMARY KEY)
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 border border-emerald-300">
                            {c.status}
                          </span>
                        </div>
                        <div className="font-mono font-black text-slate-950 text-sm tracking-wide break-all">
                          {c.contractNumber}
                        </div>
                        <p className="text-[10px] text-amber-900 font-semibold leading-tight">
                          🔒 Klien dikunci pada SPK ini • 1 PT bisa memiliki banyak SPK & lokasi blok kerja berbeda
                        </p>
                      </div>

                      {/* Client Short Name & Full Company Name */}
                      <div>
                        <div className="text-lg font-black text-slate-900">
                          {c.name}
                        </div>
                        <div className="text-xs font-bold text-slate-700 leading-snug">
                          {c.fullCompanyName}
                        </div>
                      </div>

                      {/* Detail Kontrak & Kontak Lapangan */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between text-slate-700">
                          <span className="font-medium text-slate-500">Luas Kontrak:</span>
                          <strong className="font-mono text-slate-950 text-xs">
                            {c.totalAreaHa ? c.totalAreaHa.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) : '0'} Ha
                          </strong>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-medium leading-tight">{c.location}</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-medium leading-tight">{c.contactPerson} ({c.phone})</span>
                        </div>
                        <div className="flex items-start gap-1.5 text-slate-600">
                          <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                          <span className="text-[11px] font-mono leading-tight">{c.email || 'Email belum diatur'}</span>
                        </div>
                        {c.address && (
                          <div className="flex items-start gap-1.5 text-slate-600 pt-1 border-t border-slate-200/60">
                            <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="text-[10px] text-slate-500 leading-tight truncate">{c.address}</span>
                          </div>
                        )}
                      </div>

                      {/* LOKASI BLOK KERJA (TAMBAH MANUAL, BISA BANYAK BLOK) */}
                      <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-800 flex items-center gap-1.5 uppercase text-[11px]">
                            <Layers className="w-3.5 h-3.5 text-amber-600" />
                            Lokasi Blok Kerja ({clientBlocks.length} Blok)
                          </span>
                          <button
                            type="button"
                            onClick={() => handleOpenAddBlock(c.id)}
                            className="text-[10px] font-black text-blue-600 hover:text-blue-800 hover:underline flex items-center gap-0.5 cursor-pointer"
                          >
                            <Plus className="w-3 h-3" />
                            <span>Tambah Blok</span>
                          </button>
                        </div>

                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto pr-0.5">
                          {clientBlocks.length > 0 ? (
                            clientBlocks.map((b) => (
                              <span
                                key={b.id}
                                className={`px-2 py-1 rounded-md text-[10px] font-bold border flex items-center gap-1 ${
                                  b.status === 'Selesai'
                                    ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                    : 'bg-white text-slate-800 border-slate-300 shadow-2xs'
                                }`}
                                title={`${b.code}: Target ${b.targetAreaHa} Ha (${b.status})`}
                              >
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                                <strong>{b.code}</strong>
                                {b.targetAreaHa ? <span className="text-slate-500 font-normal">({b.targetAreaHa} Ha)</span> : null}
                                {b.status === 'Selesai' && <Check className="w-2.5 h-2.5 text-emerald-600" />}
                              </span>
                            ))
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Belum ada blok kerja, klik Tambah Blok</span>
                          )}
                        </div>
                      </div>

                      {/* KREDENSIAL LOGIN AKUN RESMI KLIEN (SISTEM AKSES) */}
                      <div className="p-3 bg-teal-50/70 rounded-xl border border-teal-200 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-teal-950 flex items-center gap-1.5 uppercase text-[10px] tracking-wider">
                            <Key className="w-3.5 h-3.5 text-teal-600" />
                            Kredensial Login Akun Resmi
                          </span>
                          <span className="px-2 py-0.5 bg-teal-600 text-white rounded text-[9px] font-black uppercase flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            Level: Klien
                          </span>
                        </div>
                        {c.username ? (
                          <div className="space-y-1 pt-1">
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Username Login:</span>
                              <span className="font-mono font-black text-slate-900 bg-white px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                {c.username}
                              </span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-slate-500 text-[11px]">Password Login:</span>
                              <div className="flex items-center gap-1">
                                <span className="font-mono font-bold text-slate-800 bg-white px-2 py-0.5 rounded border border-teal-200 text-[11px]">
                                  {visibleClientCardPasswords[c.id] ? (c.password || '••••••') : '••••••••'}
                                </span>
                                <button
                                  type="button"
                                  onClick={() =>
                                    setVisibleClientCardPasswords((prev) => ({
                                      ...prev,
                                      [c.id]: !prev[c.id],
                                    }))
                                  }
                                  className="p-1 text-slate-500 hover:text-teal-700 cursor-pointer"
                                  title="Lihat / Sembunyikan Password"
                                >
                                  {visibleClientCardPasswords[c.id] ? (
                                    <EyeOff className="w-3.5 h-3.5" />
                                  ) : (
                                    <Eye className="w-3.5 h-3.5" />
                                  )}
                                </button>
                              </div>
                            </div>
                            <div className="text-[10px] text-teal-800 font-semibold pt-0.5 flex items-center justify-between">
                              <span>🔒 Hak Akses: Monitoring Progress &amp; Laporan</span>
                              {clients.filter(
                                (other) =>
                                  other.username &&
                                  c.username &&
                                  other.username.toLowerCase() === c.username.toLowerCase()
                              ).length > 1 && (
                                <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 rounded font-black text-[9px]">
                                  {
                                    clients.filter(
                                      (other) =>
                                        other.username &&
                                        c.username &&
                                        other.username.toLowerCase() === c.username.toLowerCase()
                                    ).length
                                  }{' '}
                                  SPK Terhubung
                                </span>
                              )}
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-center justify-between pt-1">
                            <span className="text-[11px] text-slate-500 italic">
                              Belum ada kredensial login diatur
                            </span>
                            <button
                              type="button"
                              onClick={() => handleOpenEditClient(c)}
                              className="text-[10px] font-black text-teal-700 hover:underline cursor-pointer"
                            >
                              + Atur Akun Login
                            </button>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Target & Realization Progress */}
                    <div className="space-y-3 pt-2">
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
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenAddBlock(c.id)}
                          className="text-xs font-bold text-blue-600 hover:text-blue-800 underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3 h-3" />
                          <span>+ Tambah Blok</span>
                        </button>

                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleOpenEditClient(c)}
                            className="px-2.5 py-1.5 hover:bg-slate-100 rounded-lg text-slate-700 hover:text-slate-950 font-bold text-xs transition cursor-pointer flex items-center gap-1 border border-slate-200"
                            title="Edit Data Klien & Blok"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-amber-600" />
                            <span>Edit</span>
                          </button>

                          {clients.length > 1 && (
                            <button
                              type="button"
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
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB: DAFTAR LOKASI & ITEM PEKERJAAN */}
      {activeSubTab === 'blocks' && (
        <div className="space-y-4">
          <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <Layers className="w-5 h-5 text-amber-600" />
                  <h3 className="text-base font-black text-slate-900 uppercase">
                    2. LOKASI & PEKERJAAN ({blocks.length} BLOK TERDAFTAR)
                  </h3>
                </div>
                <p className="text-xs text-slate-600 mt-1">
                  Konfigurasi lokasi blok kerja berdasarkan SPK klien beserta daftar item pekerjaan teknis. <strong>Logika: Dalam 1 blok bisa mengerjakan banyak item pekerjaan.</strong>
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleOpenAddBlock()}
                  className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Daftar Lokasi & Item Pekerjaan</span>
                </button>
              </div>
            </div>

            {/* Filter & Search Bar */}
            <div className="pt-2 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3">
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <label className="text-xs font-bold text-slate-600 whitespace-nowrap">Filter SPK / Klien:</label>
                  <select
                    value={selectedClientForBlock}
                    onChange={(e) => setSelectedClientForBlock(e.target.value)}
                    className="w-full sm:w-80 px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="ALL">Semua No Kontrak / SPK ({clients.length} Kontrak)</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="relative w-full sm:w-72">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    placeholder="Cari Blok, Item Pekerjaan, SPK..."
                    value={blockSearchQuery}
                    onChange={(e) => setBlockSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="text-xs font-bold text-slate-500 shrink-0 self-end sm:self-auto">
                Menampilkan {filteredBlocks.length} dari {blocks.length} Lokasi Blok
              </div>
            </div>
          </div>

          {filteredBlocks.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 text-sm space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="font-black text-slate-800 text-sm">
                {blocks.length === 0 ? 'Belum Ada Data Lokasi & Pekerjaan Blok' : 'Tidak Ada Data Blok yang Cocok'}
              </h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                {blocks.length === 0
                  ? 'Data master blok kerja telah dikosongkan. Silakan klik tombol di bawah untuk mulai menambahkan blok kerja riil di lapangan.'
                  : `Tidak ada data lokasi blok kerja yang cocok dengan filter / pencarian "${blockSearchQuery}".`}
              </p>
              {blocks.length === 0 && (
                <button
                  type="button"
                  onClick={() => handleOpenAddBlock()}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tambah Lokasi Blok Baru</span>
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredBlocks.map((b) => {
                const ownerClient = clients.find((c) => c.id === b.clientId);
                const targetInfo = getBlockDailyTargetInfo(b.id);
                const targetHa = targetInfo ? targetInfo.dailyTargetAreaHa : (b.dailyTargetAreaHa ?? 4.0);
                const pct = b.targetAreaHa > 0 ? ((b.clearedAreaHa / b.targetAreaHa) * 100).toFixed(1) : '0';
                const activeWorkItems = (b.workItems && b.workItems.length > 0) ? b.workItems : DEFAULT_WORK_ITEMS_CATALOG;

                return (
                  <div
                    key={b.id}
                    className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col justify-between space-y-4 hover:border-amber-400 transition"
                  >
                    <div className="space-y-3">
                      {/* NO KONTRAK/SPK & IDENTITAS KLIEN */}
                      <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-transparent border-2 border-amber-400 p-3 rounded-xl shadow-xs space-y-1">
                        <div className="flex items-center justify-between gap-1">
                          <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black text-[9px] uppercase rounded tracking-wider shadow-2xs flex items-center gap-1">
                            <Lock className="w-2.5 h-2.5" />
                            NO KONTRAK / SPK
                          </span>
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                              b.status === 'Dalam Pengerjaan'
                                ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                : b.status === 'Selesai'
                                ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {b.status}
                          </span>
                        </div>
                        <div className="font-mono font-black text-slate-950 text-sm tracking-wide break-all">
                          {ownerClient?.contractNumber || '045/SPK-LC/PTA/VI/2026'}
                        </div>
                        <div className="text-xs font-black text-slate-800">
                          {ownerClient?.fullCompanyName || (ownerClient ? `${ownerClient.name} (Klien)` : 'PT. AGRO PERDANA MANDIRI (PT. A)')}
                        </div>
                      </div>

                      {/* Lokasi Blok Kerja */}
                      <div className="p-3 bg-amber-50/70 rounded-xl border border-amber-200/90 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider">
                            Lokasi Blok Kerja :
                          </span>
                          <div className="text-base font-black text-slate-900">
                            {b.code} <span className="text-amber-700 font-mono text-sm">({b.targetAreaHa.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} HA)</span>
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-[10px] font-bold text-slate-500">Target LC:</span>
                          <div className="font-mono font-bold text-amber-950 text-xs">
                            {targetHa.toFixed(1)} Ha/hari
                          </div>
                        </div>
                      </div>

                      {/* DAFTAR PEKERJAAN (1 BLOK BANYAK ITEM PEKERJAAN) */}
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-black text-slate-900 uppercase tracking-wide flex items-center gap-1.5 text-[11px]">
                            <ListChecks className="w-3.5 h-3.5 text-amber-600" />
                            DAFTAR PEKERJAAN ({activeWorkItems.length} ITEM):
                          </span>
                          <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-full border border-amber-200">
                            1 Blok Banyak Pekerjaan
                          </span>
                        </div>

                        <div className="space-y-1.5 max-h-60 overflow-y-auto pr-1">
                          {activeWorkItems.map((wi, idx) => {
                            const vol = (wi as any).targetVolume !== undefined ? (wi as any).targetVolume : (wi as any).defaultTargetVolume;
                            let unitLabel = wi.unit;
                            if (unitLabel === 'HEKTAR' || unitLabel === 'Hektar') unitLabel = 'Ha';
                            if (unitLabel === 'METER LARI') unitLabel = 'm';
                            if (unitLabel === 'METER KUBIK') unitLabel = 'm³';
                            const volFormatted = vol !== undefined ? String(vol).replace('.', ',') : '';
                            const volLabel = volFormatted ? `${volFormatted} ${unitLabel}` : unitLabel;
                            return (
                              <div
                                key={(wi as any).id || wi.name || idx}
                                className="flex items-center justify-between bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 text-xs shadow-2xs gap-2"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span className="w-5 h-5 rounded-full bg-amber-100 text-amber-950 font-mono font-black text-[10px] flex items-center justify-center shrink-0">
                                    {idx + 1}
                                  </span>
                                  <span className="font-black text-slate-900 text-[11px] leading-tight break-words">
                                    {wi.name}
                                  </span>
                                </div>
                                <span className="px-2 py-0.5 rounded bg-amber-50 text-amber-950 font-mono font-black text-[10px] tracking-wide uppercase shrink-0 border border-amber-300 shadow-2xs whitespace-nowrap">
                                  {volLabel}
                                </span>
                              </div>
                            );
                          })}
                        </div>

                        {/* + ITEM PEKERJAAN (BISA DITAMBAHKAN) */}
                        <button
                          type="button"
                          onClick={() => handleOpenEditBlock(b)}
                          className="w-full py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-950 font-black text-[10px] rounded-lg border border-dashed border-amber-400 hover:border-amber-500 transition cursor-pointer flex items-center justify-center gap-1.5 mt-2 shadow-2xs uppercase"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          <span>+ ITEM PEKERJAAN (BISA DITAMBAHKAN)</span>
                        </button>
                      </div>
                    </div>

                    {/* Progress Realisasi */}
                    <div className="space-y-2 pt-1">
                      <div className="flex justify-between items-baseline text-xs">
                        <span className="text-slate-500 font-medium">Realisasi Fisik:</span>
                        <span className="font-mono font-bold text-slate-900">
                          {b.clearedAreaHa} / {b.targetAreaHa} Ha ({pct}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                        <div
                          className="bg-emerald-500 h-full rounded-full transition-all duration-500"
                          style={{ width: `${Math.min(100, parseFloat(pct))}%` }}
                        />
                      </div>

                      {/* Card Action Buttons */}
                      <div className="flex items-center justify-between pt-3 border-t border-slate-100">
                        <button
                          type="button"
                          onClick={() => handleOpenEditBlock(b)}
                          className="text-xs font-black text-amber-700 hover:text-amber-900 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-amber-600" />
                          <span>+ Item Pekerjaan</span>
                        </button>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenEditBlock(b)}
                            className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 transition cursor-pointer flex items-center gap-1"
                            title="Edit Lokasi & Item Pekerjaan"
                          >
                            <Edit2 className="w-3 h-3 text-amber-600" />
                            <span>Edit</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleDeleteBlock(b.id, b.code)}
                            className="p-1.5 hover:bg-rose-50 rounded-lg text-slate-400 hover:text-rose-600 transition cursor-pointer border border-transparent hover:border-rose-200"
                            title="Hapus Lokasi Blok"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* SUB-TAB 4: PENUGASAN KERJA (TIM STAFF & TIM PENDUKUNG PER SPK KLIEN) */}
      {activeSubTab === 'assignments' && (() => {
        const filteredAssignments = workAssignments.filter((asg) => {
          const matchClient = assignmentClientFilter === 'ALL' || asg.clientId === assignmentClientFilter;
          const matchStatus = assignmentStatusFilter === 'ALL' || asg.status === assignmentStatusFilter;
          const matchCategory = assignmentCategoryFilter === 'ALL' || 
            (asg.supportTeam && asg.supportTeam.some((m) => m.role.toLowerCase() === assignmentCategoryFilter.toLowerCase())) ||
            (asg.workerCategory && asg.workerCategory.toLowerCase() === assignmentCategoryFilter.toLowerCase());
          
          const q = (assignmentSearch || '').trim().toLowerCase();
          if (!q) return matchClient && matchCategory && matchStatus;

          const matchSearch =
            (asg.assignmentNumber && asg.assignmentNumber.toLowerCase().includes(q)) ||
            (asg.contractNumber && asg.contractNumber.toLowerCase().includes(q)) ||
            (asg.clientName && asg.clientName.toLowerCase().includes(q)) ||
            (asg.siteManagerName && asg.siteManagerName.toLowerCase().includes(q)) ||
            (asg.supervisors && asg.supervisors.some((s) => 
              s.name.toLowerCase().includes(q) || 
              s.assignedBlockCodes?.some((b) => b.toLowerCase().includes(q))
            )) ||
            (asg.supportTeam && asg.supportTeam.some((m) => 
              m.workerName.toLowerCase().includes(q) || 
              m.role.toLowerCase().includes(q) || 
              (m.equipmentName && m.equipmentName.toLowerCase().includes(q))
            )) ||
            (asg.notes && asg.notes.toLowerCase().includes(q)) ||
            (asg.staffName && asg.staffName.toLowerCase().includes(q)) ||
            (asg.workerName && asg.workerName.toLowerCase().includes(q));

          return matchClient && matchCategory && matchStatus && matchSearch;
        });

        // Metrics calculations
        const totalAssignments = workAssignments.length;
        const activeAssignments = workAssignments.filter((a) => a.status === 'Aktif').length;
        const activeAsgs = workAssignments.filter((a) => a.status === 'Aktif');

        let totalActiveStaffAndSupervisors = 0;
        let totalActiveSupportPersonnel = 0;
        let totalActiveEquipments = 0;

        activeAsgs.forEach((a) => {
          if (a.siteManagerName) totalActiveStaffAndSupervisors += 1;
          if (a.supervisors && a.supervisors.length > 0) {
            totalActiveStaffAndSupervisors += a.supervisors.length;
          } else if (a.staffName && !a.siteManagerName) {
            totalActiveStaffAndSupervisors += 1;
          }

          if (a.supportTeam && a.supportTeam.length > 0) {
            totalActiveSupportPersonnel += a.supportTeam.length;
            totalActiveEquipments += a.supportTeam.filter((s) => s.role === 'Operator' && (s.equipmentId || s.equipmentName)).length;
          } else if (a.workerName) {
            totalActiveSupportPersonnel += 1;
            if (a.equipmentId) totalActiveEquipments += 1;
          }
        });

        return (
          <div className="space-y-4">
            {/* Header Card Sub-Tab 4 */}
            <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-200 space-y-4">
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <ClipboardList className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      4. PENUGASAN KERJA ({workAssignments.length} DATA SPK)
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-1 max-w-2xl">
                    Matriks penugasan Tim Staff (Site Manager &amp; Pengawas Blok Kerja) serta Tim Pendukung (Operator Alat Berat, Mekanik, Logistik, Pendukung) per No. Kontrak/SPK Klien untuk seluruh blok kerja proyek.
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    type="button"
                    onClick={handleOpenAddAssignment}
                    className="flex items-center gap-1.5 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Penugasan Kerja Baru</span>
                  </button>
                </div>
              </div>

              {/* Quick Metrics Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100">
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">Total Penugasan SPK</span>
                  <div className="text-xl font-black text-slate-900 mt-0.5">{totalAssignments}</div>
                  <span className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-1">
                    <ClipboardList className="w-3 h-3 text-amber-600" /> Seluruh Riwayat SPK
                  </span>
                </div>

                <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wider block">Penugasan Aktif</span>
                  <div className="text-xl font-black text-amber-950 mt-0.5">{activeAssignments}</div>
                  <span className="text-[10px] text-amber-700 mt-0.5 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Operasional Lapangan
                  </span>
                </div>

                <div className="bg-indigo-50/70 border border-indigo-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider block">Tim Staff &amp; Pengawas</span>
                  <div className="text-xl font-black text-indigo-950 mt-0.5">{totalActiveStaffAndSupervisors}</div>
                  <span className="text-[10px] text-indigo-700 mt-0.5 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-indigo-600" /> Site Manager &amp; Pengawas
                  </span>
                </div>

                <div className="bg-emerald-50/70 border border-emerald-200 rounded-xl p-3">
                  <span className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider block">Tim Pendukung &amp; Alat Berat</span>
                  <div className="text-xl font-black text-emerald-950 mt-0.5">{totalActiveSupportPersonnel} Org / {totalActiveEquipments} Unit</div>
                  <span className="text-[10px] text-emerald-700 mt-0.5 flex items-center gap-1">
                    <Truck className="w-3 h-3 text-emerald-600" /> Operator, Mekanik &amp; Logistik
                  </span>
                </div>
              </div>

              {/* Filters & Search Control */}
              <div className="flex flex-col sm:flex-row flex-wrap items-center justify-between gap-2.5 pt-3 border-t border-slate-100">
                <div className="flex flex-wrap items-center gap-2 flex-1 w-full sm:w-auto">
                  {/* Search box */}
                  <div className="relative min-w-[220px] flex-1 sm:max-w-xs">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Cari Site Manager, pengawas, operator, alat, SPK..."
                      value={assignmentSearch}
                      onChange={(e) => setAssignmentSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-amber-500"
                    />
                  </div>

                  {/* Klien / SPK Filter */}
                  <select
                    value={assignmentClientFilter}
                    onChange={(e) => setAssignmentClientFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Klien SPK</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} ({c.contractNumber || 'Tanpa SPK'})
                      </option>
                    ))}
                  </select>

                  {/* Kategori Tim Pendukung Filter */}
                  <select
                    value={assignmentCategoryFilter}
                    onChange={(e) => setAssignmentCategoryFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Peran Tim Pendukung</option>
                    <option value="Operator">Operator Alat Berat</option>
                    <option value="Mekanik">Mekanik</option>
                    <option value="Logistik">Logistik</option>
                    <option value="Pendukung">Pendukung</option>
                  </select>

                  {/* Status Penugasan Filter */}
                  <select
                    value={assignmentStatusFilter}
                    onChange={(e) => setAssignmentStatusFilter(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 cursor-pointer"
                  >
                    <option value="ALL">Semua Status</option>
                    <option value="Aktif">Aktif</option>
                    <option value="Standby">Standby</option>
                    <option value="BKO / Bantuan">BKO / Bantuan</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>

                <div className="flex items-center gap-2 text-xs font-bold text-slate-500">
                  <span>Menampilkan {filteredAssignments.length} dari {workAssignments.length} penugasan SPK</span>
                  {(assignmentSearch || assignmentClientFilter !== 'ALL' || assignmentCategoryFilter !== 'ALL' || assignmentStatusFilter !== 'ALL') && (
                    <button
                      type="button"
                      onClick={() => {
                        setAssignmentSearch('');
                        setAssignmentClientFilter('ALL');
                        setAssignmentCategoryFilter('ALL');
                        setAssignmentStatusFilter('ALL');
                      }}
                      className="text-amber-700 hover:underline cursor-pointer"
                    >
                      Reset Filter
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Assignments Table View */}
            {filteredAssignments.length === 0 ? (
              <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
                <ClipboardList className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="font-black text-slate-800 text-sm">Tidak Ada Data Penugasan Kerja</h4>
                <p className="text-xs text-slate-500 max-w-md mx-auto">
                  Belum ada penugasan Tim Staff dan Tim Pendukung yang cocok dengan kriteria filter saat ini.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddAssignment}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition"
                >
                  + Tambah Penugasan Baru
                </button>
              </div>
            ) : (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-slate-900 text-white uppercase text-[10px] tracking-wider">
                      <tr>
                        <th className="py-3 px-3.5 text-center w-12">No</th>
                        <th className="py-3 px-3.5 whitespace-nowrap">No. Penugasan (Key)</th>
                        <th className="py-3 px-3.5">Klien &amp; No. SPK / Kontrak</th>
                        <th className="py-3 px-3.5 min-w-[240px]">Tim Staff (Seluruh Blok SPK)</th>
                        <th className="py-3 px-3.5 min-w-[280px]">Tim Pendukung (Operator, Alat, Mekanik)</th>
                        <th className="py-3 px-3.5 text-center whitespace-nowrap">Status &amp; Mulai</th>
                        <th className="py-3 px-3.5 text-right w-28">Aksi</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {filteredAssignments.map((asg, idx) => {
                        const hasSupervisors = asg.supervisors && asg.supervisors.length > 0;
                        const hasSupport = asg.supportTeam && asg.supportTeam.length > 0;
                        const opCount = hasSupport ? asg.supportTeam!.filter((s) => s.role === 'Operator').length : (asg.workerCategory === 'Operator' ? 1 : 0);

                        return (
                          <tr key={asg.id} className="hover:bg-amber-50/20 transition align-top">
                            {/* No */}
                            <td className="py-3.5 px-3.5 text-center font-mono font-bold text-slate-400">
                              {idx + 1}
                            </td>

                            {/* NO PENUGASAN (KEY RESMI) */}
                            <td className="py-3.5 px-3.5 whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 bg-gradient-to-r from-amber-50 to-amber-100 border border-amber-300 rounded-lg font-mono font-black text-amber-950 text-xs shadow-2xs flex items-center gap-1">
                                  <Lock className="w-3 h-3 text-amber-700" />
                                  <span>{asg.assignmentNumber}</span>
                                </span>
                              </div>
                              <span className="text-[10px] text-slate-400 block mt-1 font-medium">
                                🔑 Key Penugasan Resmi
                              </span>
                            </td>

                            {/* KLIEN & NO SPK */}
                            <td className="py-3.5 px-3.5">
                              <div className="space-y-1">
                                <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                  <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                  <span>{asg.clientName}</span>
                                </div>
                                <div className="font-mono text-slate-700 text-[11px] font-semibold">
                                  No SPK: <span className="font-bold text-slate-900">{asg.contractNumber}</span>
                                </div>
                                <div className="flex items-center gap-1.5 pt-0.5">
                                  <span className="px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 font-bold text-[10px] border border-emerald-200">
                                    Luas: {asg.totalAreaHa || 460} Ha
                                  </span>
                                </div>
                              </div>
                            </td>

                            {/* TIM STAFF (Site Manager & Pengawas) */}
                            <td className="py-3.5 px-3.5">
                              <div className="space-y-2">
                                {/* Site Manager */}
                                <div className="bg-indigo-50/70 border border-indigo-200 rounded-lg p-2 text-xs">
                                  <div className="flex items-center gap-1.5 text-indigo-950 font-black">
                                    <ShieldCheck className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                    <span>Site Manager:</span>
                                    <span className="text-slate-900 font-bold">{asg.siteManagerName || asg.staffName || '-'}</span>
                                  </div>
                                  {asg.siteManagerPhone && (
                                    <div className="text-[10px] text-indigo-700 mt-0.5 pl-5">
                                      📱 {asg.siteManagerPhone}
                                    </div>
                                  )}
                                </div>

                                {/* Pengawas Lapangan */}
                                <div className="space-y-1">
                                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                                    Pengawas Lapangan:
                                  </span>
                                  {hasSupervisors ? (
                                    <div className="space-y-1.5">
                                      {asg.supervisors!.map((spv, sIdx) => (
                                        <div key={spv.id || sIdx} className="bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-[11px]">
                                          <div className="font-bold text-slate-800 flex items-center justify-between">
                                            <span>• {spv.name}</span>
                                            {spv.phone && <span className="text-[10px] text-slate-400 font-normal">{spv.phone}</span>}
                                          </div>
                                          <div className="text-[10px] mt-0.5">
                                            {spv.coverageType === 'ALL' ? (
                                              <span className="inline-block px-1.5 py-0.2 rounded bg-amber-100 text-amber-900 font-bold">
                                                Mengawasi: Seluruh Blok SPK
                                              </span>
                                            ) : (
                                              <span className="text-slate-600">
                                                Mengawasi: <strong className="text-amber-900">{spv.assignedBlockCodes && spv.assignedBlockCodes.length > 0 ? spv.assignedBlockCodes.join(', ') : 'Belum memilih blok'}</strong>
                                              </span>
                                            )}
                                          </div>
                                        </div>
                                      ))}
                                    </div>
                                  ) : (
                                    <div className="text-[11px] text-slate-600 font-medium">
                                      {asg.staffName ? `${asg.staffName} (${asg.staffLevel || 'Pengawas'})` : '-'}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </td>

                            {/* TIM PENDUKUNG (Operator, Alat Berat, Mekanik, Logistik, Pendukung) */}
                            <td className="py-3.5 px-3.5">
                              {hasSupport ? (
                                <div className="space-y-2">
                                  {/* Operator & Unit Alat Berat */}
                                  <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                      <span className="text-[10px] font-bold text-amber-800 uppercase tracking-wide">
                                        Operator &amp; Alat Berat ({opCount}):
                                      </span>
                                    </div>
                                    <div className="space-y-1">
                                      {asg.supportTeam!.filter((s) => s.role === 'Operator').map((op, opIdx) => (
                                        <div key={op.id || opIdx} className="flex items-center justify-between gap-2 p-1.5 rounded-lg bg-amber-50/60 border border-amber-200 text-[11px]">
                                          <span className="font-bold text-slate-900">{op.workerName}</span>
                                          <span className="px-1.5 py-0.5 rounded bg-amber-200 text-amber-950 font-black text-[10px] font-mono whitespace-nowrap">
                                            {op.equipmentName || op.equipmentId || 'Alat Berat'}
                                          </span>
                                        </div>
                                      ))}
                                    </div>
                                  </div>

                                  {/* Mekanik, Logistik, Pendukung */}
                                  {asg.supportTeam!.filter((s) => s.role !== 'Operator').length > 0 && (
                                    <div className="pt-1 border-t border-slate-100 flex flex-wrap gap-1 text-[10px]">
                                      {asg.supportTeam!.filter((s) => s.role !== 'Operator').map((mem, mIdx) => (
                                        <span key={mem.id || mIdx} className="px-2 py-0.5 rounded-md bg-slate-100 border border-slate-200 text-slate-800 font-medium">
                                          <strong className="text-slate-900">{mem.role}:</strong> {mem.workerName}
                                        </span>
                                      ))}
                                    </div>
                                  )}

                                  <div className="text-[10px] text-slate-500 font-medium">
                                    Total Personil: <strong className="text-slate-800">{asg.supportTeam!.length} Orang</strong> (Bekerja diseluruh blok SPK)
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="font-bold text-slate-900 text-xs">{asg.workerName || '-'}</div>
                                  {asg.equipmentName && (
                                    <div className="text-[11px] text-amber-900 font-medium">
                                      Unit: {asg.equipmentName}
                                    </div>
                                  )}
                                  <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                    {asg.workerCategory || 'Personil'}
                                  </span>
                                </div>
                              )}
                            </td>

                            {/* TANGGAL & STATUS */}
                            <td className="py-3.5 px-3.5 text-center whitespace-nowrap">
                              <div className="space-y-1.5">
                                <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  asg.status === 'Aktif'
                                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                    : asg.status === 'Standby'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-300'
                                    : asg.status === 'BKO / Bantuan'
                                    ? 'bg-sky-100 text-sky-800 border border-sky-300'
                                    : 'bg-slate-100 text-slate-600 border border-slate-300'
                                }`}>
                                  {asg.status}
                                </span>
                                <div className="text-[10px] text-slate-500 font-mono">
                                  Mulai: <strong className="text-slate-700">{asg.assignedDate}</strong>
                                </div>
                              </div>
                            </td>

                            {/* AKSI */}
                            <td className="py-3.5 px-3.5 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingAssignmentDetail(asg)}
                                  className="p-1.5 bg-slate-100 hover:bg-sky-100 text-slate-700 hover:text-sky-900 rounded-lg transition cursor-pointer"
                                  title="Lihat Detail Surat Penugasan"
                                >
                                  <Eye className="w-3.5 h-3.5 text-sky-700" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleOpenEditAssignment(asg)}
                                  className="p-1.5 bg-slate-100 hover:bg-amber-100 text-slate-700 hover:text-amber-900 rounded-lg transition cursor-pointer"
                                  title="Edit Penugasan Kerja"
                                >
                                  <Edit2 className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteAssignmentConfirm(asg)}
                                  className="p-1.5 bg-slate-100 hover:bg-rose-100 text-slate-400 hover:text-rose-600 rounded-lg transition cursor-pointer"
                                  title="Hapus Penugasan Kerja"
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
          </div>
        );
      })()}

      {/* SUB-TAB: TARGET HARIAN (HA) PER HARI PER LOKASI KERJA (CRUD SUPERADMIN / DIREKTUR) */}
      {activeSubTab === 'targets' && (() => {
        const todayDateStr = new Date().toISOString().split('T')[0];

        const filteredTargets = dailyTargets.filter((item) => {
          const matchClient = selectedClientForTarget === 'ALL' || item.clientId === selectedClientForTarget;
          const matchBlock = selectedBlockForTarget === 'ALL' || item.blockId === selectedBlockForTarget;
          const matchDate = !selectedDateForTarget || item.date === selectedDateForTarget;
          const q = (targetSearchQuery || '').toLowerCase();
          const matchSearch =
            !targetSearchQuery ||
            (item.blockCode && item.blockCode.toLowerCase().includes(q)) ||
            (item.clientName && item.clientName.toLowerCase().includes(q)) ||
            (item.notes && item.notes.toLowerCase().includes(q)) ||
            item.date.includes(targetSearchQuery);
          return matchClient && matchBlock && matchDate && matchSearch;
        });

        const totalTargetTodayHa = dailyTargets
          .filter((t) => t.date === todayDateStr)
          .reduce((acc, t) => acc + (t.dailyTargetAreaHa || 0), 0);

        const avgDailyTargetHa = dailyTargets.length > 0
          ? (dailyTargets.reduce((acc, t) => acc + (t.dailyTargetAreaHa || 0), 0) / dailyTargets.length).toFixed(1)
          : '0.0';

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
                  Kelola dan jadwalkan target harian pembersihan lahan (Ha/hari) untuk masing-masing blok kerja per hari. Nilai target ini akan <strong>terkunci secara otomatis</strong> pada formulir pelaporan pengawas lapangan guna memastikan disiplin ritme kerja.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => handleOpenAddTarget()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Tetapkan Target Baru</span>
                </button>
              </div>
            </div>

            {/* 4 Summary Metric Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
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
              <div className="bg-white p-3.5 rounded-xl border border-emerald-200 shadow-xs bg-emerald-50/20">
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
                      <th className="py-3 px-3.5">Tanggal & Shift</th>
                      <th className="py-3 px-3.5">No. SPK & Klien</th>
                      <th className="py-3 px-3.5">Lokasi Blok Kerja</th>
                      <th className="py-3 px-3.5">No. Penugasan (Key)</th>
                      <th className="py-3 px-3.5">Item Pekerjaan & Ritme Harian</th>
                      <th className="py-3 px-3.5">Alokasi Personel & Alat Berat</th>
                      <th className="py-3 px-3.5">Arahan Khusus Direktur</th>
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
                            {/* 1. Tanggal & Shift */}
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
                                <span className="text-[10px] text-slate-500 block mt-0.5 font-medium">
                                  {item.shift ? item.shift.split(' ')[0] : 'Siang'}
                                </span>
                              )}
                            </td>

                            {/* 2. No. SPK & Klien */}
                            <td className="py-3 px-3.5 align-top">
                              <div className="font-mono font-bold text-amber-900 text-[11px]">
                                {item.contractNumber || clientData?.contractNumber || 'Tanpa SPK'}
                              </div>
                              <div className="text-[11px] text-slate-800 font-bold mt-0.5">
                                {item.clientName || clientData?.name || 'Klien'}
                              </div>
                              {clientData?.fullCompanyName && (
                                <span className="text-[10px] text-slate-400 block truncate max-w-[150px]">
                                  {clientData.fullCompanyName}
                                </span>
                              )}
                            </td>

                            {/* 3. Lokasi Blok Kerja */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <div className="flex items-center gap-1.5">
                                <span className="px-2 py-0.5 bg-slate-100 border border-slate-300 rounded-md font-mono font-black text-slate-900">
                                  {item.blockCode}
                                </span>
                              </div>
                              {blockData && (
                                <span className="text-[10px] text-slate-500 block mt-1">
                                  Total: <strong className="text-slate-800">{blockData.targetAreaHa} Ha</strong>
                                </span>
                              )}
                            </td>

                            {/* 4. No. Penugasan (Key) */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              {item.assignmentNumbers && item.assignmentNumbers.length > 0 ? (
                                <div className="flex flex-col gap-1">
                                  {item.assignmentNumbers.map((asgNo) => (
                                    <span
                                      key={asgNo}
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-950 border border-blue-200 font-mono font-bold text-[10px] rounded shadow-2xs"
                                    >
                                      <Key className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                      <span>{asgNo}</span>
                                    </span>
                                  ))}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">Belum ada</span>
                              )}
                            </td>

                            {/* 5. Item Pekerjaan & Ritme Harian */}
                            <td className="py-3 px-3.5 align-top min-w-[210px]">
                              {item.itemTargets && item.itemTargets.length > 0 ? (
                                <div className="space-y-1.5">
                                  {item.itemTargets.slice(0, 3).map((ritme, rIdx) => {
                                    const ritmeUnit = (ritme.unit === 'HEKTAR' || ritme.unit === 'Hektar') ? 'Ha' : ritme.unit;
                                    const formattedVol = String(ritme.totalVolume).replace('.', ',');
                                    const formattedDaily = String(ritme.dailyTargetVolume).replace('.', ',');
                                    return (
                                      <div key={rIdx} className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg p-1.5 flex flex-col gap-0.5">
                                        <div className="flex items-center justify-between gap-1">
                                          <span className="font-black text-slate-900 truncate">{ritme.name}</span>
                                          <span className="text-slate-500 font-bold font-mono text-[9px] bg-white px-1 py-0.2 rounded border border-slate-200">
                                            {formattedVol} {ritmeUnit}
                                          </span>
                                        </div>
                                        <div className="flex items-center justify-between text-amber-950 font-bold text-[10px] pt-0.5 border-t border-slate-100">
                                          <span>Ritme: {formattedDaily} {ritmeUnit}/hr</span>
                                          <span className="text-amber-700 bg-amber-100/70 px-1 py-0.2 rounded font-black">
                                            {ritme.calculatedDays} Hari
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {item.itemTargets.length > 3 && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingTargetDetail(item)}
                                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer block mt-1"
                                    >
                                      +{item.itemTargets.length - 3} item lainnya (Lihat Detail)
                                    </button>
                                  )}
                                </div>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">- Belum ada ritme item -</span>
                              )}
                            </td>

                            {/* 6. Alokasi Personel & Alat Berat */}
                            <td className="py-3 px-3.5 align-top min-w-[180px]">
                              <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
                                <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  <Users className="w-3 h-3 text-slate-600" />
                                  <span>{item.assignedWorkerCount || 0} SDM</span>
                                </div>
                                <div className="flex items-center gap-1 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                                  <Truck className="w-3 h-3 text-slate-600" />
                                  <span>{item.assignedEquipmentCount || 0} Alat</span>
                                </div>
                              </div>
                              {item.assignedPersonnel && item.assignedPersonnel.length > 0 && (
                                <div className="mt-1.5 space-y-1">
                                  {item.assignedPersonnel.slice(0, 2).map((p, pIdx) => (
                                    <div key={pIdx} className="text-[10px] text-slate-700 truncate">
                                      <span className="font-bold text-slate-900">• {p.workerName}</span> ({p.workerCategory})
                                      {p.equipmentName && (
                                        <span className="text-amber-800 font-medium block pl-2 text-[9px]">
                                          🚜 {p.equipmentName}
                                        </span>
                                      )}
                                    </div>
                                  ))}
                                  {item.assignedPersonnel.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() => setViewingTargetDetail(item)}
                                      className="text-[9px] text-blue-600 hover:text-blue-800 font-bold underline cursor-pointer block"
                                    >
                                      +{item.assignedPersonnel.length - 2} personel lainnya...
                                    </button>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* 7. Instruksi Khusus Direktur */}
                            <td className="py-3 px-3.5 align-top max-w-xs">
                              {item.notes ? (
                                <p className="text-slate-700 italic text-[11px] bg-amber-50/50 p-2 rounded-lg border border-amber-100">
                                  "{item.notes}"
                                </p>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">- Tidak ada catatan khusus -</span>
                              )}
                            </td>

                            {/* 8. Status Target */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap">
                              <span
                                className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold border ${
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

                            {/* 9. Aksi CRUD */}
                            <td className="py-3 px-3.5 align-top whitespace-nowrap text-center">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setViewingTargetDetail(item)}
                                  className="p-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 hover:text-blue-900 rounded-lg transition cursor-pointer border border-blue-200"
                                  title="Lihat Detail Target Harian"
                                >
                                  <Eye className="w-3.5 h-3.5" />
                                </button>
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
              <span>Tambah Alat Berat Baru</span>
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
                {DEFAULT_EQUIPMENT_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
                {customEquipmentTypes
                  .filter((t) => !DEFAULT_EQUIPMENT_TYPES.includes(t))
                  .map((t) => (
                    <option key={t} value={t}>
                      {t} (Kustom)
                    </option>
                  ))}
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
                const q = (equipmentSearch || '').toLowerCase();
                const matchSearch =
                  !equipmentSearch ||
                  (eq.id && eq.id.toLowerCase().includes(q)) ||
                  (eq.name && eq.name.toLowerCase().includes(q)) ||
                  eq.operatorName?.toLowerCase().includes(q) ||
                  eq.serialNumber?.toLowerCase().includes(q);
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
                      const q = (equipmentSearch || '').toLowerCase();
                      const matchSearch =
                        !equipmentSearch ||
                        (eq.id && eq.id.toLowerCase().includes(q)) ||
                        (eq.name && eq.name.toLowerCase().includes(q)) ||
                        eq.operatorName?.toLowerCase().includes(q) ||
                        eq.serialNumber?.toLowerCase().includes(q);
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
                  {equipments.filter((eq) => {
                    const matchType = equipmentTypeFilter === 'ALL' || eq.type === equipmentTypeFilter;
                    const matchStatus = equipmentStatusFilter === 'ALL' || eq.status === equipmentStatusFilter;
                    const q = (equipmentSearch || '').toLowerCase();
                    const matchSearch =
                      !equipmentSearch ||
                      (eq.id && eq.id.toLowerCase().includes(q)) ||
                      (eq.name && eq.name.toLowerCase().includes(q)) ||
                      eq.operatorName?.toLowerCase().includes(q) ||
                      eq.serialNumber?.toLowerCase().includes(q);
                    return matchType && matchStatus && matchSearch;
                  }).length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-12 text-center text-slate-500 bg-slate-50/50">
                        <div className="max-w-md mx-auto space-y-3">
                          <Truck className="w-10 h-10 text-slate-300 mx-auto" />
                          <h4 className="font-black text-slate-800 text-sm">
                            {equipments.length === 0 ? 'Belum Ada Data Alat Berat' : 'Tidak Ada Alat Berat yang Sesuai Filter'}
                          </h4>
                          <p className="text-xs text-slate-500">
                            {equipments.length === 0
                              ? 'Data master unit alat berat telah dikosongkan. Silakan klik tombol di bawah untuk mulai menambahkan unit alat berat riil.'
                              : 'Silakan ubah kata kunci pencarian atau filter kategori/status unit.'}
                          </p>
                          {equipments.length === 0 && (
                            <button
                              type="button"
                              onClick={handleOpenAddEquipment}
                              className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs cursor-pointer shadow-xs transition inline-flex items-center gap-1.5"
                            >
                              <Plus className="w-4 h-4" />
                              <span>Tambah Unit Alat Berat Baru</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT KLIEN */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-auto max-h-[92vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-amber-600" />
                  {editingClientId ? 'Edit Data Klien Perkebunan' : '+ Tambah Klien Perusahaan Baru'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Lengkapi identitas SPK, profil klien perkebunan, dan daftar lokasi blok kerja.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsClientModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 text-lg font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveClient} className="space-y-4 text-xs">
              {/* 1. NOMOR KONTRAK / SPK (YANG DISOROT - KLIEN DI-LOCK BERDASARKAN SPK) */}
              <div className="bg-gradient-to-r from-amber-500/20 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 p-4 rounded-xl space-y-2 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                  <label className="flex items-center gap-1.5 font-black text-slate-950 text-xs uppercase tracking-wide">
                    <FileText className="w-4 h-4 text-amber-700" />
                    Nomor Kontrak / SPK <span className="text-rose-600">*</span>
                  </label>
                </div>

                <input
                  type="text"
                  required
                  placeholder="Contoh: 019/SPK-LC/CSM/IX/2026 atau 045/SPK-LC/PTA/VI/2026"
                  value={clientForm.contractNumber}
                  onChange={(e) => setClientForm({ ...clientForm, contractNumber: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-400 rounded-lg font-mono font-black text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 placeholder:text-slate-400 shadow-inner"
                />

                <div className="flex items-start gap-1.5 text-[11px] text-amber-950 font-medium leading-tight">
                  <Lock className="w-3.5 h-3.5 text-amber-700 shrink-0 mt-0.5" />
                  <span>
                    <strong>PENTING:</strong> Klien dikunci berdasarkan Nomor SPK ini. 1 Klien PT bisa memiliki banyak SPK dengan lokasi blok kerja yang berbeda-beda.
                  </span>
                </div>
              </div>

              {/* 2 & 3. NAMA SINGKAT KLIEN & NAMA PERUSAHAAN LENGKAP */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nama Singkat Klien <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. CSM atau PT. A"
                    value={clientForm.name}
                    onChange={(e) => setClientForm({ ...clientForm, name: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nama Perusahaan Lengkap <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Contoh: PT. CITRA SAWIT MAKMUR"
                    value={clientForm.fullCompanyName}
                    onChange={(e) => setClientForm({ ...clientForm, fullCompanyName: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 4 & 5. LUAS KONTRAK (HA) [MANUAL & DESIMAL MISAL 110,3, HILANGKAN PANAH ATAS BAWAH] & LOKASI PERKEBUNAN */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Luas Kontrak (Ha) <span className="text-rose-600">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      required
                      placeholder="Contoh: 110,3 atau 175"
                      value={clientForm.totalAreaInput}
                      onChange={(e) => setClientForm({ ...clientForm, totalAreaInput: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono font-bold text-sm text-slate-900 no-spinners focus:outline-none focus:border-amber-500 pr-10"
                    />
                    <span className="absolute right-3 top-2.5 text-xs font-black text-slate-400 pointer-events-none">
                      Ha
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">
                    Pengisian manual, bisa masukkan angka desimal misal <strong>110,3</strong> (panah atas-bawah telah dihilangkan).
                  </p>
                </div>

                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Lokasi Perkebunan:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Kebun Kelapa Sawit Estate Siak, Kec. Kandis, Riau"
                    value={clientForm.location}
                    onChange={(e) => setClientForm({ ...clientForm, location: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 6 & 7. PIC PERWAKILAN KLIEN & NO. HP / TELEPON */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Nama PIC / Perwakilan Klien:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: Ir. H. Budi Prasetyo (Estate Manager)"
                    value={clientForm.contactPerson}
                    onChange={(e) => setClientForm({ ...clientForm, contactPerson: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    No. HP / Telepon:
                  </label>
                  <input
                    type="text"
                    placeholder="Contoh: +62 812-3456-7890"
                    value={clientForm.phone}
                    onChange={(e) => setClientForm({ ...clientForm, phone: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-mono text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              {/* 8 & STATUS. EMAIL & STATUS KONTRAK */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    EMAIL:
                  </label>
                  <input
                    type="email"
                    placeholder="Contoh: estate.manager@citrasawit.co.id"
                    value={clientForm.email}
                    onChange={(e) => setClientForm({ ...clientForm, email: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-800 mb-1">
                    Status Kontrak:
                  </label>
                  <select
                    value={clientForm.status}
                    onChange={(e) => setClientForm({ ...clientForm, status: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg font-bold text-sm text-slate-900 focus:outline-none focus:border-amber-500 cursor-pointer"
                  >
                    <option value="Aktif">Aktif (Sedang Berjalan)</option>
                    <option value="Masa Tenggang">Masa Tenggang</option>
                    <option value="Selesai">Selesai</option>
                  </select>
                </div>
              </div>

              {/* 9. ALAMAT KANTOR */}
              <div>
                <label className="block font-bold text-slate-800 mb-1">
                  Alamat Kantor:
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Gedung Menara Palma Lt. 12, Jl. HR Rasuna Said, Jakarta Selatan"
                  value={clientForm.address}
                  onChange={(e) => setClientForm({ ...clientForm, address: e.target.value })}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* 10. LOKASI BLOK KERJA: TAMBAH MANUAL, BISA BANYAK BLOK */}
              <div className="bg-slate-50 border-2 border-slate-300 rounded-xl p-4 space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 pb-2.5 border-b border-slate-200">
                  <div>
                    <div className="flex items-center gap-2">
                      <Layers className="w-4 h-4 text-amber-600" />
                      <h4 className="font-black text-slate-900 text-xs uppercase tracking-wide">
                        LOKASI BLOK KERJA: TAMBAH MANUAL, BISA BANYAK BLOK
                      </h4>
                    </div>
                    <p className="text-[11px] text-slate-600 mt-0.5">
                      Tambahkan blok kerja untuk SPK ini (contoh: <strong>BLOK AA</strong>, <strong>BLOK AB</strong>, <strong>BLOK AC</strong>, <strong>BLOK AD</strong>). 1 SPK dapat menampung banyak blok kerja berbeda.
                    </p>
                  </div>
                  <span className="text-[11px] font-black text-slate-800 bg-white px-2.5 py-1 rounded-full border border-slate-300 shrink-0 self-start sm:self-auto shadow-2xs">
                    {modalBlocks.length} Blok Ditambahkan
                  </span>
                </div>

                {/* Preset Shortcut Buttons */}
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className="text-[11px] font-bold text-slate-500">Shortcut Tambah Cepat:</span>
                  {['BLOK AA', 'BLOK AB', 'BLOK AC', 'BLOK AD', 'BLOK AE', 'BLOK AF'].map((preset) => {
                    const isAlreadyAdded = modalBlocks.some((mb) => mb.code.trim().toUpperCase() === preset);
                    return (
                      <button
                        key={preset}
                        type="button"
                        disabled={isAlreadyAdded}
                        onClick={() => handleAddModalBlock(preset)}
                        className={`text-[10px] font-black px-2.5 py-1 rounded-lg border transition cursor-pointer ${
                          isAlreadyAdded
                            ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                            : 'bg-white hover:bg-amber-100 text-slate-800 border-slate-300 hover:border-amber-400 shadow-2xs'
                        }`}
                      >
                        + {preset} {isAlreadyAdded && '✓'}
                      </button>
                    );
                  })}
                </div>

                {/* List of Dynamic Block Inputs */}
                <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                  {modalBlocks.map((blk, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2 bg-white p-2.5 rounded-lg border border-slate-300 shadow-2xs"
                    >
                      <span className="w-6 h-6 rounded-full bg-slate-100 font-mono text-[10px] font-black text-slate-700 flex items-center justify-center shrink-0 border border-slate-200">
                        {idx + 1}
                      </span>
                      <div className="flex-1">
                        <input
                          type="text"
                          required
                          placeholder="Kode Blok (misal: BLOK AA)"
                          value={blk.code}
                          onChange={(e) => handleUpdateModalBlock(idx, 'code', e.target.value.toUpperCase())}
                          className="w-full px-2.5 py-1.5 border border-slate-300 rounded font-black text-xs text-slate-900 uppercase focus:outline-none focus:border-amber-500"
                        />
                      </div>
                      <div className="w-36">
                        <div className="relative">
                          <input
                            type="text"
                            inputMode="decimal"
                            placeholder="Target Ha (opsional)"
                            value={blk.targetAreaHa}
                            onChange={(e) => handleUpdateModalBlock(idx, 'targetAreaHa', e.target.value)}
                            className="w-full px-2 py-1.5 border border-slate-300 rounded font-mono font-bold text-xs text-slate-800 no-spinners focus:outline-none focus:border-amber-500 pr-7"
                          />
                          <span className="absolute right-2 top-2 text-[10px] font-bold text-slate-400 pointer-events-none">
                            Ha
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveModalBlock(idx)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition cursor-pointer"
                        title="Hapus Baris Blok"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>

                {/* + Tambah Blok Button */}
                <button
                  type="button"
                  onClick={() => handleAddModalBlock()}
                  className="w-full py-2.5 bg-white hover:bg-amber-50 border-2 border-dashed border-amber-400 hover:border-amber-500 text-slate-950 font-black rounded-lg text-xs flex items-center justify-center gap-1.5 transition cursor-pointer shadow-2xs"
                >
                  <Plus className="w-4 h-4 text-amber-600" />
                  <span>+ Tambah Blok</span>
                </button>
              </div>

              {/* 11. KREDENSIAL LOGIN AKUN RESMI (SISTEM AKSES) - OTOMATIS TERLOCK DI KLIEN */}
              <div className="bg-gradient-to-br from-teal-50 via-emerald-50/50 to-slate-50 border-2 border-teal-400 rounded-xl p-4 space-y-3.5 shadow-xs">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-teal-200">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-teal-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                      <Key className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="font-black text-slate-950 text-xs uppercase tracking-wide">
                        Kredensial Login Akun Resmi (Sistem Akses)
                      </h4>
                      <p className="text-[11px] text-teal-900 font-medium">
                        Akun otomatis terbuat saat data klien disimpan • 1 akun Klien bisa memiliki banyak SPK
                      </p>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 bg-teal-600 text-white font-black text-[10px] uppercase rounded-full tracking-wider flex items-center gap-1 shrink-0 self-start sm:self-auto shadow-2xs">
                    <Lock className="w-3 h-3" />
                    Auto-Lock: Klien
                  </span>
                </div>

                {/* Pilihan Cepat Gabung ke Akun Klien yang Sudah Ada (Multi-SPK dalam 1 Akun) */}
                {clients.some((c) => c.username) && (
                  <div className="bg-white/90 border border-teal-200 rounded-lg p-3 space-y-1.5">
                    <label className="block font-black text-teal-950 text-[11px] uppercase tracking-wide">
                      🔗 Opsi Multi-SPK: Gunakan Akun Klien yang Sudah Ada (Opsional)
                    </label>
                    <p className="text-[10px] text-slate-600">
                      Jika klien ini sudah punya akun sebelumnya dan ingin menambahkan SPK baru ke dalam 1 akun akses yang sama, pilih akun di bawah atau ketik Username Login yang sama:
                    </p>
                    <select
                      value=""
                      onChange={(e) => {
                        const chosenId = e.target.value;
                        if (!chosenId) return;
                        const existingClient = clients.find((c) => c.id === chosenId);
                        if (existingClient) {
                          setClientForm((prev) => ({
                            ...prev,
                            name: prev.name || existingClient.name,
                            fullCompanyName: prev.fullCompanyName || existingClient.fullCompanyName,
                            contactPerson: prev.contactPerson || existingClient.contactPerson,
                            phone: prev.phone || existingClient.phone,
                            email: prev.email || existingClient.email || '',
                            address: prev.address || existingClient.address,
                            username: existingClient.username || prev.username,
                            password: existingClient.password || prev.password,
                            userLevel: 'Klien',
                            linkedUserId: existingClient.linkedUserId,
                          }));
                        }
                      }}
                      className="w-full px-3 py-2 bg-teal-50/50 border border-teal-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-teal-600 cursor-pointer"
                    >
                      <option value="">-- Buat Akun Klien Baru / Ketik Manual di Bawah --</option>
                      {Array.from(
                        new Map(
                          clients
                            .filter((c) => c.username)
                            .map((c) => [c.username!.trim().toLowerCase(), c])
                        ).values()
                      ).map((c) => {
                        const spkCount = clients.filter(
                          (item) =>
                            item.username &&
                            c.username &&
                            item.username.trim().toLowerCase() === c.username.trim().toLowerCase()
                        ).length;
                        return (
                          <option key={c.id} value={c.id}>
                            Gabung ke Akun @{c.username} — {c.name} ({c.fullCompanyName}) [{spkCount} SPK Aktif]
                          </option>
                        );
                      })}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Username Login */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-900 text-xs">
                        Username Login <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const base = (clientForm.name || clientForm.fullCompanyName || 'klien')
                            .toLowerCase()
                            .replace(/^pt\.?\s*/i, '')
                            .replace(/[^a-z0-9]/g, '')
                            .slice(0, 12);
                          setClientForm({
                            ...clientForm,
                            username: `klien.${base || 'spk'}`,
                            password: clientForm.password || 'klien123',
                          });
                        }}
                        className="text-[10px] font-black text-teal-700 hover:text-teal-900 underline cursor-pointer"
                      >
                        ⚡ Buat Otomatis dari Nama PT
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder="Contoh: klien.pta atau klien.csm"
                      value={clientForm.username}
                      onChange={(e) =>
                        setClientForm({
                          ...clientForm,
                          username: e.target.value.replace(/\s+/g, '').toLowerCase(),
                        })
                      }
                      className="w-full px-3 py-2 bg-white border-2 border-teal-300 rounded-lg font-mono font-black text-sm text-slate-950 focus:outline-none focus:border-teal-600"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">
                      Gunakan username yang sama jika 1 Klien memiliki beberapa Nomor SPK.
                    </p>
                  </div>

                  {/* Password Login */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="font-bold text-slate-900 text-xs">
                        Password Login <span className="text-rose-600">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setClientForm({
                            ...clientForm,
                            password: `Klien${Math.floor(1000 + Math.random() * 9000)}!`,
                          });
                          setShowClientPassword(true);
                        }}
                        className="text-[10px] font-black text-teal-700 hover:text-teal-900 underline cursor-pointer"
                      >
                        🔑 Generate Password
                      </button>
                    </div>
                    <div className="relative">
                      <input
                        type={showClientPassword ? 'text' : 'password'}
                        required
                        placeholder="Masukkan password login klien..."
                        value={clientForm.password}
                        onChange={(e) => setClientForm({ ...clientForm, password: e.target.value })}
                        className="w-full px-3 py-2 pr-9 bg-white border-2 border-teal-300 rounded-lg font-mono font-bold text-sm text-slate-950 focus:outline-none focus:border-teal-600"
                      />
                      <button
                        type="button"
                        onClick={() => setShowClientPassword(!showClientPassword)}
                        className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-700 cursor-pointer"
                        title={showClientPassword ? 'Sembunyikan Password' : 'Tampilkan Password'}
                      >
                        {showClientPassword ? (
                          <EyeOff className="w-4 h-4" />
                        ) : (
                          <Eye className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-500 mt-1">
                      Password untuk login ke Portal Monitoring Klien.
                    </p>
                  </div>
                </div>

                {/* Level Hak Akses (Otomatis Terkunci di Klien) */}
                <div>
                  <label className="block font-bold text-slate-900 text-xs mb-1">
                    Level Hak Akses Sistem (Otomatis Ter-Lock):
                  </label>
                  <div className="w-full px-3.5 py-2.5 bg-teal-950 text-white border-2 border-teal-600 rounded-lg flex items-center justify-between gap-2 shadow-inner select-none">
                    <div className="flex items-center gap-2">
                      <Lock className="w-4 h-4 text-teal-400 shrink-0" />
                      <span className="font-black text-xs sm:text-sm tracking-wide text-teal-300">
                        Klien (Monitoring Progress &amp; Laporan)
                      </span>
                    </div>
                    <span className="px-2 py-0.5 bg-teal-500/20 border border-teal-400/40 text-teal-200 rounded text-[10px] font-bold uppercase shrink-0">
                      Terkunci Otomatis
                    </span>
                  </div>
                  <p className="text-[10px] text-teal-900 font-semibold mt-1.5 leading-relaxed">
                    🔒 Hak akses akun ini dikunci khusus sebagai <strong>Klien (Monitoring Progress &amp; Laporan)</strong>. Klien hanya dapat melihat progress fisik &amp; laporan harian sesuai SPK milik akun ini dan tidak memiliki akses ke SPK klien lain.
                  </p>
                </div>
              </div>

              {/* Form Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>{editingClientId ? 'Simpan Perubahan Klien' : 'Simpan Klien Perusahaan Baru'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: TAMBAH / EDIT DAFTAR LOKASI & ITEM PEKERJAAN */}
      {isBlockModalOpen && (() => {
        const targetInfoForModal = getBlockDailyTargetInfo(editingBlockId || undefined);
        const selectedClientInModal = clients.find((c) => c.id === blockForm.clientId);
        const availableBlocksForClient = blocks.filter((b) => b.clientId === blockForm.clientId);
        const customItemsInForm = blockForm.workItems.filter(
          (wi) => !DEFAULT_WORK_ITEMS_CATALOG.some((std) => std.name.toUpperCase() === wi.name.toUpperCase())
        );
        // Aturan: di modul "Edit Lokasi & Item Pekerjaan" (atau bila blok diambil dari data klien),
        // hanya memilih lokasi blok dan tidak boleh edit kode/nama blok serta tidak boleh edit Luas Blok,
        // tetapi BOLEH memilih status pengerjaan.
        const isBlockLocked = Boolean(editingBlockId || blockForm.selectedExistingBlockId !== '__CUSTOM__');

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-2xl p-5 sm:p-6 max-w-2xl w-full shadow-2xl space-y-4 my-6 max-h-[92vh] overflow-y-auto border border-slate-200">
              <div className="border-b border-slate-100 pb-3 flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <Layers className="w-5 h-5 text-amber-600" />
                    <h3 className="text-base font-black text-slate-900 uppercase">
                      {editingBlockId ? 'Edit Lokasi & Item Pekerjaan' : 'Tambah Daftar Lokasi & Item Pekerjaan'}
                    </h3>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {editingBlockId 
                      ? 'Pilih lokasi blok, tentukan status pengerjaan, dan atur rincian item pekerjaan (kode & luas blok terkunci).' 
                      : 'Modul konfigurasi lokasi blok kerja berdasarkan SPK klien beserta daftar item pekerjaan teknis.'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setIsBlockModalOpen(false);
                    setEditingBlockId(null);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveBlock} className="space-y-4 text-xs">
                {/* 1. NO KONTRAK / SPK (PILIHAN DROPDOWN: NOMOR SPK - NAMA SINGKAT KLIEN) */}
                <div className="bg-gradient-to-r from-amber-500/15 via-amber-500/10 to-amber-500/5 border-2 border-amber-400 p-4 rounded-xl space-y-2.5 shadow-2xs">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="flex items-center gap-1.5 font-black text-slate-950 text-xs uppercase tracking-wide">
                      <FileText className="w-4 h-4 text-amber-700" />
                      NO KONTRAK / SPK <span className="text-rose-600">*</span>
                    </label>
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950 flex items-center gap-1 shadow-2xs self-start sm:self-auto">
                      <Lock className="w-3 h-3" />
                      AMBIL DATA DARI DAFTAR KLIEN PERKEBUNAN
                    </span>
                  </div>

                  <select
                    required
                    value={blockForm.clientId}
                    onChange={(e) => handleBlockFormClientChange(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border-2 border-amber-400 rounded-lg font-mono font-black text-slate-950 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-inner"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.contractNumber || 'Tanpa SPK'} - {c.name}
                      </option>
                    ))}
                  </select>

                  {selectedClientInModal && (
                    <div className="p-3 bg-white/90 rounded-lg border border-amber-300 text-xs text-slate-800 space-y-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span>{selectedClientInModal.fullCompanyName} ({selectedClientInModal.name})</span>
                      </div>
                      <div className="text-[11px] text-slate-600 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{selectedClientInModal.location} • Luas Kontrak: {selectedClientInModal.totalAreaHa} Ha</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. LOKASI BLOK KERJA (PILIHAN DROPDOWN DARI DAFTAR KLIEN PERKEBUNAN) */}
                <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
                    <label className="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wide">
                      <Layers className="w-4 h-4 text-amber-600" />
                      Lokasi Blok Kerja <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div>
                    <select
                      value={blockForm.selectedExistingBlockId}
                      onChange={(e) => handleBlockSelectChange(e.target.value)}
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-lg font-black text-slate-900 text-xs focus:outline-none focus:border-amber-500 cursor-pointer shadow-2xs"
                    >
                      {availableBlocksForClient.map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} ({b.targetAreaHa ? `${b.targetAreaHa.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} HA` : 'Luas belum diatur'})
                        </option>
                      ))}
                      {!editingBlockId && (
                        <option value="__CUSTOM__">
                          + Input Blok Baru Manual (Custom)
                        </option>
                      )}
                    </select>
                  </div>

                  {/* Input Rincian Blok & Luas (Ha) Manual Desimal Tanpa Panah Atas Bawah */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                    {/* KODE / NAMA BLOK (TERKUNCI DI MODUL EDIT) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 text-[11px]">
                          Kode / Nama Blok: <span className="text-rose-600">*</span>
                        </label>
                        {isBlockLocked && (
                          <span className="text-[9px] font-black text-slate-500 flex items-center gap-0.5 bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-300">
                            <Lock className="w-2.5 h-2.5 text-slate-600" />
                            Terkunci
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          required
                          readOnly={isBlockLocked}
                          disabled={isBlockLocked}
                          placeholder="Contoh: BLOK AZ"
                          value={blockForm.code}
                          onChange={(e) => setBlockForm({ ...blockForm, code: e.target.value.toUpperCase() })}
                          className={`w-full px-3 py-2 rounded-lg font-black text-xs uppercase ${
                            isBlockLocked
                              ? 'bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed select-none shadow-inner pr-8'
                              : 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500'
                          }`}
                        />
                        {isBlockLocked && (
                          <Lock className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                        )}
                      </div>
                      {isBlockLocked && (
                        <p className="text-[10px] text-slate-500 font-medium mt-1">
                          🔒 Tidak boleh edit kode/nama blok
                        </p>
                      )}
                    </div>

                    {/* LUAS BLOK (HA) (TERKUNCI DI MODUL EDIT) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 text-[11px]">
                          Luas Blok (Ha): <span className="text-rose-600">*</span>
                        </label>
                        {isBlockLocked && (
                          <span className="text-[9px] font-black text-slate-500 flex items-center gap-0.5 bg-slate-200/80 px-1.5 py-0.5 rounded border border-slate-300">
                            <Lock className="w-2.5 h-2.5 text-slate-600" />
                            Terkunci
                          </span>
                        )}
                      </div>
                      <div className="relative">
                        <input
                          type="text"
                          inputMode="decimal"
                          required
                          readOnly={isBlockLocked}
                          disabled={isBlockLocked}
                          placeholder="Contoh: 35,5"
                          value={blockForm.targetAreaInput}
                          onChange={(e) => setBlockForm({ ...blockForm, targetAreaInput: e.target.value })}
                          className={`w-full px-3 py-2 rounded-lg font-mono font-bold text-xs no-spinners pr-12 ${
                            isBlockLocked
                              ? 'bg-slate-100 border border-slate-300 text-slate-700 cursor-not-allowed select-none shadow-inner'
                              : 'bg-white border border-slate-300 text-slate-900 focus:outline-none focus:border-amber-500'
                          }`}
                        />
                        <span className="absolute right-2.5 top-2 text-[10px] font-black text-slate-400 pointer-events-none flex items-center gap-1">
                          {isBlockLocked && <Lock className="w-2.5 h-2.5 text-slate-400" />}
                          HA
                        </span>
                      </div>
                      {isBlockLocked && (
                        <p className="text-[10px] text-slate-500 font-medium mt-1">
                          🔒 Tidak boleh edit Luas Blok
                        </p>
                      )}
                    </div>

                    {/* STATUS PENGERJAAN (BOLEH MEMILIH STATUS PENGERJAAN) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block font-bold text-slate-700 text-[11px]">
                          Status Pengerjaan:
                        </label>
                      </div>
                      <select
                        value={blockForm.status}
                        onChange={(e) => setBlockForm({ ...blockForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border-2 border-amber-400 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value="Dalam Pengerjaan">Dalam Pengerjaan</option>
                        <option value="Belum Dimulai">Belum Dimulai</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. PILIH ITEM PEKERJAAN: LOGIKANYA DALAM 1 BLOK BISA MENGERJAKAN BANYAK ITEM PEKERJAAN */}
                <div className="bg-slate-50 border border-slate-300 p-4 rounded-xl space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-2.5">
                    <div>
                      <div className="flex items-center gap-1.5 font-black text-slate-900 text-xs uppercase tracking-wide">
                        <ListChecks className="w-4 h-4 text-amber-600" />
                        <span>PILIH ITEM PEKERJAAN:</span>
                        <span className="text-rose-600">*</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        type="button"
                        onClick={handleSelectAllStandardItems}
                        className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[10px] rounded-lg shadow-2xs transition cursor-pointer"
                      >
                        Pilih Semua 8 Item
                      </button>
                      <button
                        type="button"
                        onClick={handleClearAllWorkItems}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-600 font-bold text-[10px] rounded-lg border border-slate-300 transition cursor-pointer"
                      >
                        Hapus Pilihan
                      </button>
                    </div>
                  </div>

                  {/* DAFTAR 8 ITEM PEKERJAAN STANDAR DENGAN TARGET VOLUME DAN SATUAN */}
                  <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
                    {DEFAULT_WORK_ITEMS_CATALOG.map((std, idx) => {
                      const activeItem = blockForm.workItems.find((wi) => wi.name.toUpperCase() === std.name.toUpperCase());
                      const isChecked = !!activeItem;
                      const draftVal = itemVolumeDrafts[std.name.toUpperCase()];
                      const currentVolume = draftVal !== undefined 
                        ? draftVal 
                        : (activeItem?.targetVolume !== undefined 
                            ? String(activeItem.targetVolume).replace('.', ',') 
                            : String(std.defaultTargetVolume ?? 0).replace('.', ','));
                      const unitDisplay = (std.unit === 'HEKTAR' || std.unit === 'Hektar') ? 'Ha' : std.unit;

                      return (
                        <div
                          key={idx}
                          className={`p-3 rounded-xl border transition flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                            isChecked
                              ? 'bg-amber-50/90 border-amber-400 shadow-2xs'
                              : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300'
                          }`}
                        >
                          {/* Item Checkbox, Index & Full Name */}
                          <div
                            className="flex items-start sm:items-center gap-2.5 min-w-0 flex-1 cursor-pointer select-none"
                            onClick={() => handleToggleWorkItem(std)}
                          >
                            <div className={`w-5 h-5 rounded flex items-center justify-center border transition shrink-0 mt-0.5 sm:mt-0 ${
                              isChecked ? 'bg-amber-500 border-amber-600 text-slate-950 shadow-2xs' : 'border-slate-300 bg-white'
                            }`}>
                              {isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                            </div>
                            <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-800 font-mono text-[10px] font-black flex items-center justify-center shrink-0 border border-slate-200 mt-0.5 sm:mt-0">
                              {idx + 1}
                            </span>
                            <div className="min-w-0 flex-1">
                              <span className={`text-xs font-black block leading-snug break-words ${isChecked ? 'text-slate-950' : 'text-slate-600'}`}>
                                {std.name}
                              </span>
                              {isChecked && (
                                <span className="text-[10px] text-amber-900 font-bold block mt-0.5 font-mono">
                                  {idx + 1}. {std.name} {currentVolume} {unitDisplay}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Input Target Volume & Satuan (Mendukung Desimal Contoh: 25,7 Ha) */}
                          <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0 pl-7 sm:pl-0" onClick={(e) => e.stopPropagation()}>
                            <span className="text-[10px] font-bold text-slate-500 whitespace-nowrap">Volume:</span>
                            <div className="relative">
                              <input
                                type="text"
                                inputMode="decimal"
                                placeholder="0"
                                value={currentVolume}
                                onChange={(e) => {
                                  if (!isChecked) {
                                    handleToggleWorkItem(std);
                                  }
                                  handleUpdateItemVolume(std.name, e.target.value);
                                }}
                                className={`w-24 px-2.5 py-1 text-center font-mono font-black text-xs rounded-lg border no-spinners transition ${
                                  isChecked
                                    ? 'bg-white border-amber-400 text-slate-950 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-inner'
                                    : 'bg-slate-100 border-slate-200 text-slate-400'
                                }`}
                              />
                            </div>
                            <span className={`px-2.5 py-1 rounded-lg text-[10px] font-mono font-black tracking-wider uppercase border shrink-0 ${
                              isChecked
                                ? 'bg-amber-200 text-amber-950 border-amber-400 shadow-2xs'
                                : 'bg-slate-100 text-slate-400 border-slate-200'
                            }`}>
                              {unitDisplay}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ITEM PEKERJAAN TAMBAHAN (CUSTOM) JIKA SUDAH ADA */}
                  {customItemsInForm.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t border-slate-200">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        Item Pekerjaan Tambahan ({customItemsInForm.length}):
                      </span>
                      <div className="space-y-1.5">
                        {customItemsInForm.map((ci) => {
                          const ciDraft = itemVolumeDrafts[ci.name.toUpperCase()];
                          const ciVolume = ciDraft !== undefined 
                            ? ciDraft 
                            : (ci.targetVolume !== undefined ? String(ci.targetVolume).replace('.', ',') : '10');
                          const ciUnitDisplay = (ci.unit === 'HEKTAR' || ci.unit === 'Hektar') ? 'Ha' : (ci.unit === 'METER LARI' ? 'm' : (ci.unit === 'METER KUBIK' ? 'm³' : ci.unit));
                          return (
                            <div
                              key={ci.id}
                              className="flex flex-col sm:flex-row sm:items-center justify-between bg-emerald-50 border border-emerald-300 p-2.5 rounded-xl text-xs gap-2"
                            >
                              <div className="flex items-center gap-2 min-w-0 flex-1">
                                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                                <div className="min-w-0 flex-1">
                                  <span className="font-black text-emerald-950 text-xs break-words block">{ci.name}</span>
                                  <span className="text-[10px] text-emerald-800 font-mono font-bold block">
                                    {ci.name} {ciVolume} {ciUnitDisplay}
                                  </span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1.5 self-end sm:self-auto shrink-0">
                                <span className="text-[10px] font-bold text-slate-500">Volume:</span>
                                <input
                                  type="text"
                                  inputMode="decimal"
                                  placeholder="0"
                                  value={ciVolume}
                                  onChange={(e) => handleUpdateItemVolume(ci.name, e.target.value)}
                                  className="w-24 px-2 py-1 text-center font-mono font-black text-xs rounded-lg border border-emerald-400 bg-white text-emerald-950 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-inner no-spinners"
                                />
                                <span className="px-2 py-1 rounded-lg bg-emerald-200 text-emerald-950 font-mono font-black text-[10px] border border-emerald-400 uppercase">
                                  {ciUnitDisplay}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => handleRemoveWorkItem(ci.id)}
                                  className="text-slate-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded cursor-pointer"
                                  title="Hapus item tambahan"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* + ITEM PEKERJAAN (BISA DITAMBAHKAN) */}
                  <div className="p-3.5 bg-white rounded-xl border-2 border-dashed border-amber-400 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-black text-amber-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                        <Plus className="w-3.5 h-3.5 text-amber-600" />
                        + ITEM PEKERJAAN (BISA DITAMBAHKAN)
                      </span>
                      <span className="text-[10px] text-slate-500 font-medium">Bisa tentukan volume desimal (contoh: 25,7) & satuan sendiri</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-12 gap-2">
                      <div className="sm:col-span-6">
                        <input
                          type="text"
                          placeholder="Nama item pekerjaan baru (misal: BRIDGING JEMBATAN)"
                          value={blockForm.customItemName}
                          onChange={(e) => setBlockForm({ ...blockForm, customItemName: e.target.value })}
                          className="w-full px-3 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-900 focus:outline-none focus:border-amber-500 uppercase"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddCustomWorkItem();
                            }
                          }}
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Volume (contoh: 25,7)"
                          value={blockForm.customItemVolume}
                          onChange={(e) => setBlockForm({ ...blockForm, customItemVolume: e.target.value })}
                          className="w-full px-2.5 py-2 border border-slate-300 rounded-lg text-xs font-mono font-bold text-center text-slate-900 focus:outline-none focus:border-amber-500 no-spinners"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <select
                          value={blockForm.customItemUnit}
                          onChange={(e) => setBlockForm({ ...blockForm, customItemUnit: e.target.value })}
                          className="w-full px-2 py-2 border border-slate-300 rounded-lg text-xs font-bold text-slate-800 bg-slate-50 cursor-pointer"
                        >
                          <option value="Ha">Ha</option>
                          <option value="POHON">POHON</option>
                          <option value="m">m</option>
                          <option value="m³">m³</option>
                          <option value="UNIT">UNIT</option>
                          <option value="TITIK">TITIK</option>
                          <option value="BATANG">BATANG</option>
                        </select>
                      </div>

                      <div className="sm:col-span-2">
                        <button
                          type="button"
                          onClick={handleAddCustomWorkItem}
                          className="w-full py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-lg transition cursor-pointer shadow-xs flex items-center justify-center gap-1"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Tambah</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Summary Terpilih */}
                  <div className="flex items-center justify-between text-[11px] pt-1 text-slate-600 font-bold">
                    <span>Total Item Pekerjaan Aktif pada Blok Ini:</span>
                    <span className="font-mono text-amber-950 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                      {blockForm.workItems.length} Item Terpilih
                    </span>
                  </div>
                </div>

                {/* INFORMASI TARGET HARIAN LC (HA) - HANYA MENAMPILKAN INFORMASI */}
                {targetInfoForModal && (
                  <div className="bg-amber-50/70 border border-amber-200 rounded-xl p-2.5 flex items-center justify-between text-xs">
                    <span className="font-bold text-amber-950 flex items-center gap-1.5 text-[11px]">
                      <Target className="w-3.5 h-3.5 text-amber-600" />
                      Target Harian LC (Informasi):
                    </span>
                    <span className="font-mono font-black text-amber-900 text-xs">
                      {targetInfoForModal.dailyTargetAreaHa.toFixed(1)} Ha / Hari (Jadwal: {targetInfoForModal.date})
                    </span>
                  </div>
                )}

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setIsBlockModalOpen(false);
                      setEditingBlockId(null);
                    }}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingBlockId ? 'Simpan Perubahan Lokasi & Item' : 'Simpan Daftar Lokasi & Item Pekerjaan'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}



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
                    className={`w-full px-3 py-2 border rounded-xl font-mono font-bold uppercase disabled:bg-slate-100 ${
                      !editingEquipmentId && equipmentForm.id && equipments.some((eq) => (eq.id || '').trim().toUpperCase() === (equipmentForm.id || '').trim().toUpperCase())
                        ? 'border-rose-500 bg-rose-50/50 text-rose-900 focus:ring-rose-500'
                        : 'border-slate-300'
                    }`}
                  />
                  {!editingEquipmentId && equipmentForm.id && equipments.some((eq) => (eq.id || '').trim().toUpperCase() === (equipmentForm.id || '').trim().toUpperCase()) ? (
                    <p className="text-[10px] text-rose-600 font-bold mt-0.5 flex items-center gap-1">
                      ⚠️ Kode &quot;{(equipmentForm.id || '').trim().toUpperCase()}&quot; sudah digunakan unit lain. Gunakan kode unik agar data tidak tertimpa!
                    </p>
                  ) : (
                    <p className="text-[10px] text-slate-400 mt-0.5">Identitas unik unit alat di lapangan.</p>
                  )}
                </div>

                {/* Jenis / Tipe Alat Berat - Bisa tambah jenis baru */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block font-bold text-slate-700">
                      Jenis / Tipe Alat Berat <span className="text-rose-500">*</span>
                    </label>
                    {!isAddingNewEquipmentType && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsAddingNewEquipmentType(true);
                          setNewEquipmentTypeInput('');
                        }}
                        className="text-[10px] font-bold text-amber-700 hover:text-amber-900 hover:underline cursor-pointer"
                      >
                        + Tambah Tipe Baru
                      </button>
                    )}
                  </div>

                  <select
                    value={isAddingNewEquipmentType ? '__NEW__' : (equipmentForm.type || 'Excavator')}
                    onChange={(e) => {
                      if (e.target.value === '__NEW__') {
                        setIsAddingNewEquipmentType(true);
                        setNewEquipmentTypeInput('');
                      } else {
                        setIsAddingNewEquipmentType(false);
                        setEquipmentForm({ ...equipmentForm, type: e.target.value as any });
                      }
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer"
                  >
                    {DEFAULT_EQUIPMENT_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t}
                      </option>
                    ))}
                    {customEquipmentTypes
                      .filter((t) => !DEFAULT_EQUIPMENT_TYPES.includes(t))
                      .map((t) => (
                        <option key={t} value={t}>
                          {t} (Kustom)
                        </option>
                      ))}
                    <option value="__NEW__">+ Tambah Tipe Baru</option>
                  </select>

                  {/* Input Tambah Tipe Alat Baru */}
                  {isAddingNewEquipmentType && (
                    <div className="mt-2 p-2 bg-amber-50 rounded-lg border border-amber-300 space-y-1.5">
                      <label className="block text-[10px] font-bold text-amber-900 uppercase">
                        + Tambah Jenis / Tipe Alat Baru:
                      </label>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="text"
                          placeholder="Ketik tipe alat baru (misal: Wheel Loader, Backhoe)..."
                          value={newEquipmentTypeInput}
                          onChange={(e) => setNewEquipmentTypeInput(e.target.value)}
                          className="flex-1 px-2.5 py-1.5 border border-slate-300 rounded-md text-xs font-bold text-slate-900 bg-white focus:outline-none focus:border-amber-500"
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              handleAddEquipmentType();
                            }
                          }}
                        />
                        <button
                          type="button"
                          onClick={handleAddEquipmentType}
                          className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs rounded-md shadow-2xs transition cursor-pointer"
                        >
                          Tambah
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setIsAddingNewEquipmentType(false);
                            setNewEquipmentTypeInput('');
                          }}
                          className="px-2 py-1.5 text-slate-500 hover:text-slate-700 text-xs font-bold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    </div>
                  )}
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

              {/* HM Berjalan Saat Ini (Operator Penanggungjawab Dihapus Sesuai Permintaan) */}
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
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-4 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div>
                <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950 inline-flex items-center gap-1">
                  <Lock className="w-3 h-3 text-slate-950" /> Otoritas Direktur
                </span>
                <h3 className="text-lg font-black text-slate-900 mt-1 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-600" />
                  {editingTargetId ? 'Edit Target Harian & Ritme Item' : 'Penetapan Target Harian & Ritme Item'}
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

            {/* Modal Scrollable Form Body */}
            <form onSubmit={handleSaveTarget} className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Row 1: Dropdown NO KONTRAK/SPK & Lokasi Kerja / Blok */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-amber-50/40 p-3.5 rounded-2xl border border-amber-200">
                {/* 1. NO KONTRAK/SPK : PILIHAN DROPDOWN (NOMOR SPK - Nama Singkat Klien) */}
                <div>
                  <label className="block font-black text-amber-950 mb-1">
                    1. No. Kontrak / SPK & Nama Klien <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetForm.clientId || clients[0]?.id}
                    onChange={(e) => handleTargetFormClientChange(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    {clients.map((c) => {
                      const spk = c.contractNumber || 'Tanpa SPK';
                      return (
                        <option key={c.id} value={c.id}>
                          {spk} - {c.name}
                        </option>
                      );
                    })}
                  </select>
                </div>

                {/* 2. Lokasi Kerja / Blok: Dropdown pilihan blok */}
                <div>
                  <label className="block font-black text-amber-950 mb-1">
                    2. Lokasi Kerja / Blok <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={targetForm.blockId || ''}
                    onChange={(e) => handleTargetFormBlockChange(e.target.value)}
                    className="w-full px-3 py-2 border-2 border-amber-300 rounded-xl font-bold bg-white text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    required
                  >
                    {blocks
                      .filter((b) => b.clientId === (targetForm.clientId || clients[0]?.id))
                      .map((b) => (
                        <option key={b.id} value={b.id}>
                          {b.code} (Luas Total: {b.targetAreaHa} Ha)
                        </option>
                      ))}
                  </select>
                  <span className="text-[10px] text-amber-800 font-medium block mt-1">
                    Item pekerjaan & penugasan akan disesuaikan otomatis
                  </span>
                </div>
              </div>

              {/* Tanggal Pelaksanaan & Shift Kerja */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Tanggal Mulai Pelaksanaan Target <span className="text-rose-500">*</span>
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

              {/* 3. ITEM PEKERJAAN LENGKAP & INPUTAN MANUAL PENETAPAN TARGET RITME HARIAN */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                      <ListChecks className="w-4 h-4 text-amber-600" />
                      3. Daftar Item Pekerjaan & Penetapan Target Ritme Harian
                    </h4>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Otomatis memuat kuantitas dari Menu "2. LOKASI & PEKERJAAN" elemen "DAFTAR PEKERJAAN". Masukkan angka target ritme harian untuk menghitung estimasi jumlah hari.
                    </p>
                  </div>
                  <span className="px-2 py-0.5 bg-slate-200 text-slate-700 font-bold text-[10px] rounded-full">
                    {targetItemRitmes.length} Item
                  </span>
                </div>

                <div className="space-y-3">
                  {targetItemRitmes.map((ritme, idx) => (
                    <div
                      key={ritme.id || idx}
                      className="bg-white border border-slate-200 rounded-xl p-3 shadow-2xs space-y-2 hover:border-amber-300 transition"
                    >
                      {/* Baris 1: Nama Item Pekerjaan & Volume Satuan dari Menu 2 */}
                      <div className="flex flex-wrap items-center justify-between gap-1 border-b border-slate-100 pb-1.5">
                        <div className="flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-amber-500 shrink-0"></span>
                          <span className="font-black text-slate-900 text-xs tracking-wide">
                            {ritme.name}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-800 font-mono font-bold text-[11px] rounded-lg">
                          Jumlah Satuan: <strong className="text-amber-800 font-black">{String(ritme.totalVolume).replace('.', ',')} {(ritme.unit === 'HEKTAR' || ritme.unit === 'Hektar') ? 'Ha' : ritme.unit}</strong>
                        </span>
                      </div>

                      {/* Baris 2: Inputan manual "Penetapan Target Ritme Harian" & Kalkulasi otomatis Jumlah Hari */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 items-center pt-1">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-700 mb-1">
                            Penetapan Target Ritme Harian ({ritme.unit}/hari):
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0.1"
                              placeholder="Contoh: 10"
                              value={ritme.dailyTargetVolume || ''}
                              onChange={(e) => handleItemRitmeTargetChange(ritme.name, e.target.value)}
                              className="w-full px-3 py-1.5 bg-amber-50/30 border border-amber-300 rounded-lg font-mono font-black text-slate-900 text-xs focus:ring-2 focus:ring-amber-500 focus:outline-none"
                            />
                            <span className="absolute right-2.5 top-1.5 text-[10px] font-bold text-slate-500">
                              {ritme.unit}/hari
                            </span>
                          </div>
                        </div>

                        {/* Menampilkan Jumlah Hari (Hasil kalkulasi otomatis) */}
                        <div className="bg-amber-50/60 border border-amber-200 rounded-lg p-2 flex flex-col justify-center">
                          <span className="text-[10px] font-bold text-amber-900 uppercase">
                            Hasil Kalkulasi Estimasi Waktu:
                          </span>
                          <div className="flex items-center gap-2 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                            <span className="font-mono font-black text-amber-950 text-sm">
                              {ritme.calculatedDays > 0 ? `${ritme.calculatedDays} Hari` : '-'}
                            </span>
                            {ritme.dailyTargetVolume > 0 && ritme.totalVolume > 0 && (
                              <span className="text-[10px] text-slate-500 font-medium">
                                ({ritme.totalVolume} ÷ {ritme.dailyTargetVolume} = {ritme.calculatedDays} hari)
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* 4. OTOMATIS MENAMPILKAN DAFTAR ALOKASI PERSONEL & ALAT BERAT */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    4. Daftar Alokasi Personel & Alat Berat Terjadwal
                  </span>
                  <span className="text-[10px] font-bold text-slate-600 bg-slate-200/80 px-2 py-0.5 rounded-full">
                    {targetForm.assignedPersonnel?.length || 0} Personel
                  </span>
                </div>

                {targetForm.assignedPersonnel && targetForm.assignedPersonnel.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-44 overflow-y-auto pr-1">
                    {targetForm.assignedPersonnel.map((p, idx) => {
                      const isOperator = (p.workerCategory || '').toLowerCase().includes('operator');
                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{p.workerName}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isOperator
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.workerCategory}
                            </span>
                          </div>

                          {/* Jika dia operator akan tampil juga Alat Beratnya */}
                          {isOperator && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-amber-900 font-bold bg-amber-50/50 px-2 py-1 rounded-lg">
                              <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>Alat: {p.equipmentName || p.equipmentId || 'Unit Terjadwal'}</span>
                            </div>
                          )}

                          {p.assignmentNumber && (
                            <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                              Ref No. Penugasan: {p.assignmentNumber}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Belum ada personel yang ditugaskan ke blok ini di menu "5. Penugasan Kerja".
                  </div>
                )}
              </div>

              {/* 5. ELEMEN STATUS TARGET */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  5. Status Target <span className="text-rose-500">*</span>
                </label>
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

              {/* 6. ELEMEN ARAHAN KHUSUS & CATATAN DIREKTUR UNTUK PENGAWAS */}
              <div>
                <label className="block font-bold text-slate-700 mb-1">
                  6. Arahan Khusus & Catatan Direktur untuk Pengawas
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
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 shrink-0">
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

      {/* MODAL: DETAIL SPESIFIKASI TARGET HARIAN & RITME KERJA */}
      {viewingTargetDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col p-6 shadow-2xl border border-slate-200 my-4 space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-blue-50 border border-blue-200 flex items-center justify-center text-blue-700">
                  <Eye className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-lg font-black text-slate-900">Detail Target Harian & Ritme Kerja</h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        viewingTargetDetail.status === 'Tercapai'
                          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                          : viewingTargetDetail.status === 'Di bawah Target'
                          ? 'bg-orange-100 text-orange-800 border-orange-300'
                          : viewingTargetDetail.status === 'Tertunda Cuaca'
                          ? 'bg-slate-100 text-slate-700 border-slate-300'
                          : 'bg-amber-100 text-amber-900 border-amber-300'
                      }`}
                    >
                      ● {viewingTargetDetail.status || 'Terjadwal'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Spesifikasi lengkap target operasional, item ritme pekerjaan, dan alokasi tim lapangan.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingTargetDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 font-bold transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="space-y-4 text-xs overflow-y-auto pr-1">
              {/* Row 1: Informasi Kontrak, Blok, Tanggal, Shift & Key No Penugasan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">No. Kontrak / SPK</span>
                  <strong className="font-mono text-amber-950 text-xs block mt-0.5">
                    {viewingTargetDetail.contractNumber || 'Tanpa SPK'}
                  </strong>
                  <span className="text-[11px] text-slate-800 font-bold mt-0.5 block">
                    {viewingTargetDetail.clientName}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Lokasi Blok Kerja</span>
                  <div className="flex items-center gap-1 mt-0.5">
                    <span className="px-2 py-0.5 bg-white border border-slate-300 rounded font-mono font-black text-slate-900 text-xs">
                      {viewingTargetDetail.blockCode}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {blocks.find((b) => b.id === viewingTargetDetail.blockId)?.targetAreaHa
                      ? `Total Luas: ${blocks.find((b) => b.id === viewingTargetDetail.blockId)?.targetAreaHa} Ha`
                      : ''}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">Tanggal & Shift</span>
                  <div className="flex items-center gap-1 text-slate-900 font-bold text-xs mt-0.5">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>{viewingTargetDetail.date}</span>
                  </div>
                  <span className="text-[10px] text-slate-500 block mt-0.5">
                    {viewingTargetDetail.shift || 'Siang (07:00 - 17:00)'}
                  </span>
                </div>

                <div>
                  <span className="text-[10px] text-slate-500 font-bold uppercase block">No. Penugasan (Key)</span>
                  <div className="mt-1 flex flex-wrap gap-1">
                    {viewingTargetDetail.assignmentNumbers && viewingTargetDetail.assignmentNumbers.length > 0 ? (
                      viewingTargetDetail.assignmentNumbers.map((asgNo) => (
                        <span
                          key={asgNo}
                          className="px-2 py-0.5 bg-blue-50 border border-blue-200 text-blue-950 font-mono font-bold text-[10px] rounded inline-flex items-center gap-1 shadow-2xs"
                        >
                          <Key className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                          <span>{asgNo}</span>
                        </span>
                      ))
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">- Belum ada -</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Row 2: Tabel Rincian Item Pekerjaan & Ritme Harian */}
              <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-2xs">
                <div className="p-3 bg-amber-50/60 border-b border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ListChecks className="w-4 h-4 text-amber-700" />
                    <span className="font-black text-amber-950 text-xs uppercase tracking-wide">
                      Rincian Penetapan Target Ritme Item Pekerjaan
                    </span>
                  </div>
                  <span className="px-2 py-0.5 bg-white border border-amber-300 text-amber-900 font-bold text-[10px] rounded-full">
                    {viewingTargetDetail.itemTargets?.length || 0} Item Ditetapkan
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-100 text-slate-700 font-bold text-[10px] uppercase border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3">No</th>
                        <th className="py-2.5 px-3">Nama Item Pekerjaan</th>
                        <th className="py-2.5 px-3">Volume Satuan (Menu 2)</th>
                        <th className="py-2.5 px-3 bg-amber-100/50 text-amber-950">Target Ritme Harian</th>
                        <th className="py-2.5 px-3 bg-amber-200/50 text-amber-950">Estimasi Jumlah Hari</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {viewingTargetDetail.itemTargets && viewingTargetDetail.itemTargets.length > 0 ? (
                        viewingTargetDetail.itemTargets.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50 transition">
                            <td className="py-2.5 px-3 text-slate-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-bold text-slate-900">{item.name}</td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-700">
                              {String(item.totalVolume).replace('.', ',')} {(item.unit === 'HEKTAR' || item.unit === 'Hektar') ? 'Ha' : item.unit}
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-amber-950 bg-amber-50/30">
                              {String(item.dailyTargetVolume).replace('.', ',')} {(item.unit === 'HEKTAR' || item.unit === 'Hektar') ? 'Ha' : item.unit} / hari
                            </td>
                            <td className="py-2.5 px-3 font-mono font-black text-amber-900 bg-amber-100/30">
                              {item.calculatedDays > 0 ? `${item.calculatedDays} Hari` : '-'}
                              {item.dailyTargetVolume > 0 && item.totalVolume > 0 && (
                                <span className="text-[10px] text-slate-400 font-normal block">
                                  ({String(item.totalVolume).replace('.', ',')} ÷ {String(item.dailyTargetVolume).replace('.', ',')})
                                </span>
                              )}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400 italic">
                            Tidak ada item ritme tersimpan untuk target ini.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Row 3: Alokasi Personel & Alat Berat Terjadwal */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                    <Users className="w-4 h-4 text-slate-700" />
                    Daftar Alokasi Personel & Alat Berat Terjadwal (Menu 5)
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] rounded-full">
                      {viewingTargetDetail.assignedWorkerCount || viewingTargetDetail.assignedPersonnel?.length || 0} Personel
                    </span>
                    <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 font-bold text-[10px] rounded-full">
                      {viewingTargetDetail.assignedEquipmentCount || 0} Unit Alat
                    </span>
                  </div>
                </div>

                {viewingTargetDetail.assignedPersonnel && viewingTargetDetail.assignedPersonnel.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {viewingTargetDetail.assignedPersonnel.map((p, idx) => {
                      const isOperator = (p.workerCategory || '').toLowerCase().includes('operator');
                      return (
                        <div
                          key={idx}
                          className="p-2.5 bg-white border border-slate-200 rounded-xl flex flex-col justify-between shadow-2xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-900 text-xs">{p.workerName}</span>
                            <span
                              className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                isOperator
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : 'bg-slate-100 text-slate-700'
                              }`}
                            >
                              {p.workerCategory}
                            </span>
                          </div>

                          {isOperator && (
                            <div className="mt-1.5 pt-1.5 border-t border-slate-100 flex items-center gap-1.5 text-xs text-amber-900 font-bold bg-amber-50/50 px-2 py-1 rounded-lg">
                              <Truck className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                              <span>Alat: {p.equipmentName || p.equipmentId || 'Unit Terjadwal'}</span>
                            </div>
                          )}

                          {p.assignmentNumber && (
                            <span className="text-[9px] font-mono text-slate-400 mt-1 block">
                              Ref Penugasan: {p.assignmentNumber}
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="p-3 bg-white border border-slate-200 rounded-xl text-center text-slate-400 text-xs">
                    Belum ada personel yang dialokasikan ke blok ini di menu Penugasan Kerja.
                  </div>
                )}
              </div>

              {/* Row 4: Arahan Khusus & Catatan Direktur */}
              <div className="bg-amber-50/40 border border-amber-200 rounded-2xl p-3.5 space-y-1">
                <span className="text-[10px] font-black text-amber-950 uppercase tracking-wide block">
                  Arahan Khusus & Catatan Direktur untuk Pengawas:
                </span>
                <p className="text-slate-800 text-xs font-medium italic bg-white p-2.5 rounded-xl border border-amber-200/60">
                  {viewingTargetDetail.notes ? `"${viewingTargetDetail.notes}"` : '- Tidak ada catatan khusus untuk target ini -'}
                </p>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100 shrink-0">
              <span className="text-[10px] text-slate-400">
                Dibuat oleh: {viewingTargetDetail.createdBy || 'Direktur / Superadmin'} • {viewingTargetDetail.createdAt || ''}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setViewingTargetDetail(null)}
                  className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold transition cursor-pointer"
                >
                  Tutup
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const targetToEdit = viewingTargetDetail;
                    setViewingTargetDetail(null);
                    handleOpenEditTarget(targetToEdit);
                  }}
                  className="px-4 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Target Ini</span>
                </button>
              </div>
            </div>
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

      {/* MODAL: TAMBAH / EDIT PENUGASAN KERJA (OPERASIONAL LAPANGAN) */}
      {isAssignmentModalOpen && (() => {
        const selectedClient = clients.find((c) => c.id === assignmentForm.clientId) || clients[0];
        const availableBlocks = blocks.filter((b) => b.clientId === assignmentForm.clientId);

        return (
          <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
            <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-3xl w-full shadow-2xl space-y-5 my-auto max-h-[94vh] overflow-y-auto border border-slate-200">
              {/* Modal Header */}
              <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
                <div>
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                    <ClipboardList className="w-3 h-3 text-amber-700" />
                    <span>Modul 4 • Penugasan Kerja Operasional</span>
                  </div>
                  <h3 className="text-base sm:text-lg font-black text-slate-900 uppercase flex items-center gap-2">
                    {editingAssignmentId ? 'Edit Data Penugasan Kerja' : '+ Tambah Penugasan Kerja Baru'}
                  </h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Alokasikan Tim Staff (Site Manager &amp; Pengawas Blok) serta Tim Pendukung (Operator, Alat Berat, Mekanik, Logistik) per SPK Klien.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsAssignmentModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer shrink-0"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleSaveAssignment} className="space-y-5 text-xs">
                {/* 1. DATA KLIEN & NOMOR PENUGASAN */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <label className="font-black text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Building2 className="w-4 h-4 text-amber-600" />
                      <span>1. Klien &amp; Nomor Penugasan Kerja (SPK)</span>
                      <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Pilih Klien & SPK */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Pilih Klien &amp; No. SPK <span className="text-rose-600">*</span>
                      </label>
                      <select
                        required
                        value={assignmentForm.clientId}
                        onChange={(e) => handleAssignmentClientChange(e.target.value)}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        {clients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name} - No SPK: {c.contractNumber || 'Tanpa SPK'} ({c.totalAreaHa || 460} Ha)
                          </option>
                        ))}
                      </select>
                      <p className="text-[10px] text-slate-500 mt-1">
                        * Contoh: KLIEN PT. GUDANG = PT. GUGUS KOMODITAS KONDANG NO SPK B/0001/33/GKK/9/2026
                      </p>
                    </div>

                    {/* Nomor Penugasan (Otomatis dibuat standar SPK) */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1 flex items-center justify-between">
                        <span>Nomor Penugasan (Key Resmi) <span className="text-rose-600">*</span></span>
                        <span className="text-[10px] text-amber-800 font-bold bg-amber-100 px-1.5 py-0.2 rounded">Otomatis / Standar SPK</span>
                      </label>
                      <div className="relative">
                        <Lock className="w-3.5 h-3.5 text-amber-700 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                          type="text"
                          required
                          value={assignmentForm.assignmentNumber}
                          onChange={(e) => setAssignmentForm({ ...assignmentForm, assignmentNumber: e.target.value })}
                          className="w-full pl-8 pr-3 py-2 bg-white border-2 border-amber-400 rounded-xl font-mono font-black text-slate-900 text-xs focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                          placeholder="e.g. 001/ST-LC/GKK/IX/2026"
                        />
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1">
                        Digunakan sebagai nomor referensi resmi penugasan kerja lapangan.
                      </p>
                    </div>
                  </div>

                  {/* Info Ringkas Klien Terpilih */}
                  {selectedClient && (
                    <div className="p-2.5 bg-amber-50/70 border border-amber-200 rounded-xl text-slate-700 flex flex-wrap items-center justify-between gap-2 text-[11px]">
                      <div className="flex items-center gap-1.5 font-bold text-slate-900">
                        <Building2 className="w-3.5 h-3.5 text-amber-700 shrink-0" />
                        <span>{selectedClient.fullCompanyName || selectedClient.name}</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span>📍 {selectedClient.location || 'Provinsi Riau'}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900 font-bold border border-emerald-300">
                          Luas Kontrak: {selectedClient.totalAreaHa || 460} Ha
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                {/* 2. JADWAL & STATUS PENUGASAN */}
                <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <label className="font-black text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-amber-600" />
                      <span>2. Jadwal &amp; Status Penugasan</span>
                      <span className="text-rose-600">*</span>
                    </label>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    {/* Tanggal Mulai Penugasan * */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Tanggal Mulai Penugasan <span className="text-rose-600">*</span>
                      </label>
                      <input
                        type="date"
                        required
                        value={assignmentForm.assignedDate}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, assignedDate: e.target.value })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 shadow-2xs"
                      />
                    </div>

                    {/* Status Penugasan */}
                    <div>
                      <label className="block font-bold text-slate-700 mb-1">
                        Status Penugasan <span className="text-rose-600">*</span>
                      </label>
                      <select
                        value={assignmentForm.status}
                        onChange={(e) => setAssignmentForm({ ...assignmentForm, status: e.target.value as any })}
                        className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500 cursor-pointer shadow-2xs"
                      >
                        <option value="Aktif">Aktif (Bertugas di Lokasi)</option>
                        <option value="Standby">Standby (Siaga)</option>
                        <option value="BKO / Bantuan">BKO / Bantuan Sementara</option>
                        <option value="Selesai">Selesai</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* 3. PENUGASAN TIM KERJA (ALUR OPERASIONAL LAPANGAN) */}
                <div className="space-y-4">
                  <div className="p-3 bg-amber-500/10 border border-amber-300 rounded-2xl flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                    <div className="text-[11px] text-amber-950 font-medium">
                      <strong>Ketentuan Penugasan Tim Kerja Operasional:</strong> Tim Staff dan Tim Pendukung ditugaskan mengawal seluruh blok kerja pada SPK terpilih. Pengawas dapat mengawasi seluruh blok atau dibagi per blok tertentu.
                    </div>
                  </div>

                  {/* A. TIM STAFF (Bekerja diseluruh blok kerja SPK terpilih) */}
                  {(() => {
                    // Kelompokkan Daftar Staff dari Menu Identitas Perusahaan
                    const siteManagerStaffOptions = companyStaffList.filter(
                      (s) =>
                        s.userLevel === 'Site Manager' ||
                        s.staffLevel === 'Site Manager' ||
                        (s.jobRole || '').toLowerCase().includes('manager')
                    );
                    const otherStaffForSiteManager = companyStaffList.filter(
                      (s) =>
                        s.userLevel !== 'Klien' &&
                        s.staffLevel !== 'Klien' &&
                        !siteManagerStaffOptions.some((sm) => sm.id === s.id)
                    );

                    const supervisorStaffOptions = companyStaffList.filter(
                      (s) =>
                        s.userLevel === 'Pengawas' ||
                        s.staffLevel === 'Pengawas' ||
                        (s.jobRole || '').toLowerCase().includes('pengawas') ||
                        (s.jobRole || '').toLowerCase().includes('mandor') ||
                        (s.jobRole || '').toLowerCase().includes('supervisor')
                    );
                    const otherStaffForSupervisor = companyStaffList.filter(
                      (s) =>
                        s.userLevel !== 'Klien' &&
                        s.staffLevel !== 'Klien' &&
                        !supervisorStaffOptions.some((sp) => sp.id === s.id)
                    );

                    const selectedSmStaff = companyStaffList.find(
                      (s) =>
                        (assignmentForm.siteManagerStaffId && s.id === assignmentForm.siteManagerStaffId) ||
                        (assignmentForm.siteManagerName &&
                          s.fullName.trim().toLowerCase() === assignmentForm.siteManagerName.trim().toLowerCase())
                    );

                    return (
                      <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-indigo-100 pb-2">
                          <div>
                            <span className="font-black text-indigo-950 text-xs uppercase tracking-wide flex items-center gap-1.5">
                              <ShieldCheck className="w-4 h-4 text-indigo-600" />
                              <span>A. Tim Staff (Bekerja di Seluruh Blok SPK Terpilih)</span>
                            </span>
                            <p className="text-[11px] text-indigo-700 mt-0.5">
                              Site Manager penanggung jawab teknis &amp; pengawas lapangan per blok kerja (Terhubung otomatis dengan Daftar Staff di Menu Identitas Perusahaan).
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddSupervisor}
                            className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] transition cursor-pointer self-start sm:self-auto shadow-xs"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Tambah Pengawas</span>
                          </button>
                        </div>

                        {/* Site Manager Field (Dropdown dari Daftar Staff - Menu Identitas Perusahaan) */}
                        <div className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs space-y-2">
                          <div className="flex items-center justify-between">
                            <label className="font-black text-indigo-950 text-xs flex items-center gap-1.5">
                              <ShieldCheck className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Site Manager <span className="text-rose-600">*</span></span>
                            </label>
                            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                              Penanggung Jawab Seluruh Blok SPK
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                            <div>
                              <div className="flex items-center justify-between mb-1">
                                <label className="block text-[11px] font-bold text-slate-700">
                                  Nama Lengkap Site Manager <span className="text-rose-600">*</span>
                                </label>
                                <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                  🔗 Daftar Staff
                                </span>
                              </div>
                              <select
                                required
                                value={assignmentForm.siteManagerName || ''}
                                onChange={(e) => handleSiteManagerSelect(e.target.value)}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                              >
                                <option value="">-- Pilih Site Manager (Dari Daftar Staff) --</option>

                                {/* Jika nama tersimpan belum ada di Daftar Staff, tetap tampilkan agar tidak hilang */}
                                {assignmentForm.siteManagerName &&
                                  !companyStaffList.some(
                                    (s) => s.fullName.trim().toLowerCase() === assignmentForm.siteManagerName.trim().toLowerCase()
                                  ) && (
                                    <option value={assignmentForm.siteManagerName}>
                                      {assignmentForm.siteManagerName} (Tercatat Saat Ini)
                                    </option>
                                  )}

                                {siteManagerStaffOptions.length > 0 && (
                                  <optgroup label={`Daftar Staff — Site Manager (${siteManagerStaffOptions.length} Staff)`}>
                                    {siteManagerStaffOptions.map((s) => (
                                      <option key={s.id} value={s.fullName}>
                                        {s.fullName} — {s.jobRole} ({s.employeeIdNumber})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}

                                {otherStaffForSiteManager.length > 0 && (
                                  <optgroup label={`Daftar Staff Perusahaan Lainnya (${otherStaffForSiteManager.length} Staff)`}>
                                    {otherStaffForSiteManager.map((s) => (
                                      <option key={s.id} value={s.fullName}>
                                        {s.fullName} — {s.jobRole} ({s.employeeIdNumber})
                                      </option>
                                    ))}
                                  </optgroup>
                                )}
                              </select>
                              {selectedSmStaff && (
                                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-indigo-700 font-semibold">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                  <span>
                                    Terhubung: <strong>{selectedSmStaff.employeeIdNumber}</strong> • {selectedSmStaff.jobRole}
                                    {selectedSmStaff.username ? ` (@${selectedSmStaff.username})` : ''}
                                  </span>
                                </div>
                              )}
                            </div>

                            <div>
                              <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                No. Telepon / WhatsApp
                              </label>
                              <input
                                type="text"
                                placeholder="Otomatis terisi dari Daftar Staff..."
                                value={assignmentForm.siteManagerPhone}
                                onChange={(e) => setAssignmentForm({ ...assignmentForm, siteManagerPhone: e.target.value })}
                                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                              />
                              <span className="text-[9px] text-slate-400 mt-0.5 block">
                                Otomatis terisi saat memilih Site Manager &amp; tersinkronisasi dengan Daftar Staff.
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Supervisors Section (Dropdown dari Daftar Staff - Menu Identitas Perusahaan) */}
                        <div className="space-y-3">
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 text-xs">
                              Daftar Pengawas Lapangan ({assignmentForm.supervisors.length} Personil):
                            </span>
                            <span className="text-[10px] text-slate-500 italic">
                              (Bisa 1 pengawas untuk seluruh blok, atau beberapa pengawas per blok kerja)
                            </span>
                          </div>

                          {assignmentForm.supervisors.map((spv, spvIdx) => {
                            const selectedSpvStaff = companyStaffList.find(
                              (s) =>
                                (spv.staffId && s.id === spv.staffId) ||
                                (spv.name && s.fullName.trim().toLowerCase() === spv.name.trim().toLowerCase())
                            );

                            return (
                              <div key={spv.id || spvIdx} className="bg-white p-3.5 rounded-xl border border-indigo-200 shadow-2xs space-y-3">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                                  <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-800 flex items-center justify-center font-black text-[10px]">
                                      {spvIdx + 1}
                                    </span>
                                    <span>Pengawas Lapangan #{spvIdx + 1}</span>
                                    {spv.name && (
                                      <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-200">
                                        {spv.name}
                                      </span>
                                    )}
                                  </span>
                                  {assignmentForm.supervisors.length > 1 && (
                                    <button
                                      type="button"
                                      onClick={() => handleRemoveSupervisor(spvIdx)}
                                      className="text-rose-500 hover:text-rose-700 p-1 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                      title="Hapus Pengawas Ini"
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                    </button>
                                  )}
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <div className="flex items-center justify-between mb-1">
                                      <label className="block text-[11px] font-bold text-slate-700">
                                        Nama Pengawas <span className="text-rose-600">*</span>
                                      </label>
                                      <span className="text-[9px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.2 rounded border border-indigo-100">
                                        🔗 Daftar Staff
                                      </span>
                                    </div>
                                    <select
                                      required
                                      value={spv.name || ''}
                                      onChange={(e) => handleSupervisorChange(spvIdx, 'name', e.target.value)}
                                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500 cursor-pointer"
                                    >
                                      <option value="">-- Pilih Pengawas Lapangan (Dari Daftar Staff) --</option>

                                      {/* Jika nama pengawas saat ini belum ada di Daftar Staff, tetap tampilkan agar tidak hilang */}
                                      {spv.name &&
                                        !companyStaffList.some(
                                          (s) => s.fullName.trim().toLowerCase() === spv.name.trim().toLowerCase()
                                        ) && (
                                          <option value={spv.name}>
                                            {spv.name} (Tercatat Saat Ini)
                                          </option>
                                        )}

                                      {supervisorStaffOptions.length > 0 && (
                                        <optgroup label={`Daftar Staff — Pengawas Lapangan (${supervisorStaffOptions.length} Staff)`}>
                                          {supervisorStaffOptions.map((s) => {
                                            const isChosenElsewhere = assignmentForm.supervisors.some(
                                              (other, idx) =>
                                                idx !== spvIdx &&
                                                other.name &&
                                                other.name.trim().toLowerCase() === s.fullName.trim().toLowerCase()
                                            );
                                            return (
                                              <option key={s.id} value={s.fullName} disabled={isChosenElsewhere}>
                                                {s.fullName} — {s.jobRole} ({s.employeeIdNumber})
                                                {isChosenElsewhere ? ' [Sudah Dipilih]' : ''}
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      )}

                                      {otherStaffForSupervisor.length > 0 && (
                                        <optgroup label={`Daftar Staff Perusahaan Lainnya (${otherStaffForSupervisor.length} Staff)`}>
                                          {otherStaffForSupervisor.map((s) => {
                                            const isChosenElsewhere = assignmentForm.supervisors.some(
                                              (other, idx) =>
                                                idx !== spvIdx &&
                                                other.name &&
                                                other.name.trim().toLowerCase() === s.fullName.trim().toLowerCase()
                                            );
                                            return (
                                              <option key={s.id} value={s.fullName} disabled={isChosenElsewhere}>
                                                {s.fullName} — {s.jobRole} ({s.employeeIdNumber})
                                                {isChosenElsewhere ? ' [Sudah Dipilih]' : ''}
                                              </option>
                                            );
                                          })}
                                        </optgroup>
                                      )}
                                    </select>
                                    {selectedSpvStaff && (
                                      <div className="mt-1 flex flex-wrap items-center gap-1.5 text-[10px] text-indigo-700 font-semibold">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                        <span>
                                          Terhubung: <strong>{selectedSpvStaff.employeeIdNumber}</strong> • {selectedSpvStaff.jobRole}
                                          {selectedSpvStaff.username ? ` (@${selectedSpvStaff.username})` : ''}
                                        </span>
                                      </div>
                                    )}
                                  </div>

                                  <div>
                                    <label className="block text-[11px] font-bold text-slate-700 mb-1">
                                      No. Telepon / WhatsApp
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Otomatis terisi dari Daftar Staff..."
                                      value={spv.phone || ''}
                                      onChange={(e) => handleSupervisorChange(spvIdx, 'phone', e.target.value)}
                                      className="w-full px-3 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:bg-white focus:border-indigo-500"
                                    />
                                    <span className="text-[9px] text-slate-400 mt-0.5 block">
                                      Otomatis terisi saat memilih Pengawas &amp; tersinkronisasi dengan Daftar Staff.
                                    </span>
                                  </div>
                                </div>

                                {/* Cakupan Blok Pengawasan */}
                                <div className="pt-2 border-t border-slate-100 space-y-2">
                                  <label className="block text-[11px] font-bold text-slate-700">
                                    Cakupan Wilayah Pengawasan Blok Kerja:
                                  </label>

                                  <div className="flex flex-wrap items-center gap-4 text-xs">
                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-800">
                                      <input
                                        type="radio"
                                        name={`spv-coverage-${spvIdx}`}
                                        checked={spv.coverageType === 'ALL'}
                                        onChange={() => handleSupervisorChange(spvIdx, 'coverageType', 'ALL')}
                                        className="text-amber-500 focus:ring-amber-400"
                                      />
                                      <span>Mengawasi Seluruh Blok Kerja SPK Terpilih</span>
                                    </label>

                                    <label className="flex items-center gap-1.5 font-bold cursor-pointer text-slate-800">
                                      <input
                                        type="radio"
                                        name={`spv-coverage-${spvIdx}`}
                                        checked={spv.coverageType === 'CUSTOM'}
                                        onChange={() => handleSupervisorChange(spvIdx, 'coverageType', 'CUSTOM')}
                                        className="text-amber-500 focus:ring-amber-400"
                                      />
                                      <span>Pilih Blok Tertentu Yang Diawasi</span>
                                    </label>
                                  </div>

                                  {/* Block Multi-Checkboxes if CUSTOM */}
                                  {spv.coverageType === 'CUSTOM' && (
                                    <div className="mt-2 p-2.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
                                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                                        Pilih Blok Kerja Yang Diawasi (Centang Blok):
                                      </span>
                                      {availableBlocks.length === 0 ? (
                                        <div className="text-slate-400 text-xs italic">
                                          Belum ada data blok kerja untuk klien SPK ini.
                                        </div>
                                      ) : (
                                        <div className="flex flex-wrap gap-2">
                                          {availableBlocks.map((blk) => {
                                            const isSelected = spv.assignedBlockIds?.includes(blk.id);
                                            return (
                                              <button
                                                key={blk.id}
                                                type="button"
                                                onClick={() => handleToggleSupervisorBlock(spvIdx, blk.id, blk.code)}
                                                className={`px-3 py-1.5 rounded-lg font-bold text-xs transition cursor-pointer flex items-center gap-1.5 border ${
                                                  isSelected
                                                    ? 'bg-amber-500 text-slate-950 border-amber-600 shadow-2xs font-black'
                                                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                                                }`}
                                              >
                                                <span>{isSelected ? '✓' : '+'}</span>
                                                <span>{blk.code} ({blk.targetAreaHa || 0} Ha)</span>
                                              </button>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}

                  {/* B. TIM PENDUKUNG (Bekerja diseluruh blok kerja SPK terpilih) */}
                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-300 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200 pb-2">
                      <div>
                        <span className="font-black text-slate-900 text-xs uppercase tracking-wide flex items-center gap-1.5">
                          <Users className="w-4 h-4 text-amber-600" />
                          <span>B. Tim Pendukung (Bekerja di Seluruh Blok SPK Terpilih)</span>
                        </span>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Operator alat berat, unit armada alat, teknisi mekanik, logistik, dan tim pendukung lapangan.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleAddSupportMember}
                        className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-[11px] transition cursor-pointer self-start sm:self-auto shadow-xs"
                      >
                        <UserPlus className="w-3.5 h-3.5" />
                        <span>+ Tambah Tim Pendukung</span>
                      </button>
                    </div>

                    {/* Member rows list */}
                    <div className="space-y-2.5">
                      {assignmentForm.supportTeam.map((mem, memIdx) => {
                        const isMemOperator = mem.role === 'Operator';
                        const rowKey = mem.id || `sup-${memIdx}`;
                        const isManual = !!manualWorkerInputMode[rowKey];

                        // Filter workers from Module 3 (workers) matching current role
                        const matchingRoleWorkers = workers.filter((w) => {
                          const cat = (w.category || '').toLowerCase();
                          const role = (w.role || '').toLowerCase();
                          const targetRole = mem.role.toLowerCase();
                          return cat === targetRole || role.includes(targetRole);
                        });
                        const otherRoleWorkers = workers.filter((w) => !matchingRoleWorkers.some((m) => m.id === w.id));

                        return (
                          <div key={mem.id || memIdx} className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                                <span className="w-4 h-4 rounded-full bg-amber-100 text-amber-900 flex items-center justify-center font-black text-[9px]">
                                  {memIdx + 1}
                                </span>
                                <span>Personil #{memIdx + 1}</span>
                                {mem.workerName && (
                                  <span className="text-[10px] font-bold text-amber-900 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">
                                    {mem.workerName}
                                  </span>
                                )}
                              </span>
                              {assignmentForm.supportTeam.length > 1 && (
                                <button
                                  type="button"
                                  onClick={() => handleRemoveSupportMember(memIdx)}
                                  className="text-rose-400 hover:text-rose-600 p-1 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                                  title="Hapus Personil Ini"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-end">
                              {/* Peran */}
                              <div className="sm:col-span-3">
                                <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                  Peran / Kategori
                                </label>
                                <select
                                  value={mem.role}
                                  onChange={(e) => handleSupportMemberChange(memIdx, 'role', e.target.value)}
                                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer"
                                >
                                  <option value="Operator">Operator</option>
                                  <option value="Mekanik">Mekanik</option>
                                  <option value="Logistik">Logistik</option>
                                  <option value="Pendukung">Pendukung</option>
                                </select>
                              </div>

                              {/* Nama Personil: Dropdown dari Modul 3. Personil Tim Pendukung */}
                              <div className="sm:col-span-4">
                                <div className="flex items-center justify-between mb-1">
                                  <label className="block text-[10px] font-bold text-slate-600">
                                    Nama Personil <span className="text-rose-600">*</span>
                                  </label>
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setManualWorkerInputMode((prev) => ({
                                        ...prev,
                                        [rowKey]: !prev[rowKey],
                                      }));
                                    }}
                                    className="text-[9px] text-amber-700 hover:text-amber-900 font-bold hover:underline cursor-pointer"
                                    title="Klik untuk beralih antara dropdown dari master personil atau ketik manual"
                                  >
                                    {isManual ? '← Dari Daftar' : '+ Ketik Manual'}
                                  </button>
                                </div>

                                {isManual ? (
                                  <input
                                    type="text"
                                    required
                                    placeholder="Ketik nama personil..."
                                    value={mem.workerName}
                                    onChange={(e) => handleSupportMemberChange(memIdx, 'workerName', e.target.value)}
                                    className="w-full px-2.5 py-1.5 bg-amber-50/40 border border-amber-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                                  />
                                ) : (
                                  <select
                                    required
                                    value={mem.workerName || ''}
                                    onChange={(e) => {
                                      if (e.target.value === '__MANUAL__') {
                                        setManualWorkerInputMode((prev) => ({ ...prev, [rowKey]: true }));
                                      } else {
                                        handleSupportMemberChange(memIdx, 'workerName', e.target.value);
                                      }
                                    }}
                                    className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500 cursor-pointer"
                                  >
                                    <option value="">-- Pilih Personil ({mem.role}) --</option>

                                    {/* Jika personil saat ini belum terdaftar di modul 3, tetap tampilkan agar tidak hilang */}
                                    {mem.workerName && !workers.some((w) => w.name.toLowerCase() === mem.workerName.toLowerCase()) && (
                                      <option value={mem.workerName}>
                                        {mem.workerName} (Tercatat Saat Ini)
                                      </option>
                                    )}

                                    {/* Personil sesuai kategori/peran */}
                                    {matchingRoleWorkers.length > 0 && (
                                      <optgroup label={`Personil Kategori ${mem.role} (${matchingRoleWorkers.length} Orang)`}>
                                        {matchingRoleWorkers.map((w) => (
                                          <option key={w.id} value={w.name}>
                                            {w.name} {w.assignedEquipmentId ? `• Alat: ${w.assignedEquipmentId}` : ''}
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}

                                    {/* Personil kategori lainnya */}
                                    {otherRoleWorkers.length > 0 && (
                                      <optgroup label={`Personil Kategori Lainnya (${otherRoleWorkers.length} Orang)`}>
                                        {otherRoleWorkers.map((w) => (
                                          <option key={w.id} value={w.name}>
                                            {w.name} ({w.category || w.role || 'Staff'})
                                          </option>
                                        ))}
                                      </optgroup>
                                    )}

                                    <option value="__MANUAL__">+ Ketik Nama Personil Lainnya (Manual)...</option>
                                  </select>
                                )}
                              </div>

                              {/* Alat Berat (Jika Operator) atau Catatan Tugas (Jika selain Operator) */}
                              <div className="sm:col-span-5">
                                {isMemOperator ? (
                                  <div>
                                    <label className="block text-[10px] font-bold text-amber-900 mb-1 flex items-center justify-between">
                                      <span>Alat Berat Yang Ditugaskan <span className="text-rose-600">*</span></span>
                                      {mem.equipmentId && (
                                        <span className="font-mono text-[9px] bg-amber-200 text-amber-950 px-1 rounded font-black">
                                          {mem.equipmentId}
                                        </span>
                                      )}
                                    </label>
                                    <select
                                      required={isMemOperator}
                                      value={mem.equipmentId || ''}
                                      onChange={(e) => handleSupportMemberChange(memIdx, 'equipmentId', e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-amber-50/50 border border-amber-300 rounded-lg font-bold text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-1 focus:ring-amber-500 cursor-pointer"
                                    >
                                      <option value="">-- Pilih Alat Berat --</option>
                                      {equipments.map((eq) => (
                                        <option key={eq.id} value={eq.id}>
                                          {eq.id} - {eq.name} ({eq.type})
                                        </option>
                                      ))}
                                    </select>
                                  </div>
                                ) : (
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                                      Catatan Tugas / Spesialisasi
                                    </label>
                                    <input
                                      type="text"
                                      placeholder="Contoh: Maintenance Unit / BBM & Sparepart"
                                      value={mem.notes || ''}
                                      onChange={(e) => handleSupportMemberChange(memIdx, 'notes', e.target.value)}
                                      className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-lg text-xs text-slate-900 focus:outline-none focus:bg-white focus:border-amber-500"
                                    />
                                  </div>
                                )}
                              </div>
                            </div>
                            {/* Time-Slice Allocation: Effective Date Range */}
                            <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2 mt-2">
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                                  Mulai Tanggal Berlaku (Time-Slice Start)
                                </label>
                                <input
                                  type="date"
                                  value={mem.startDate || ''}
                                  onChange={(e) => handleSupportMemberChange(memIdx, 'startDate', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                                />
                              </div>
                              <div>
                                <label className="block text-[9px] font-bold text-slate-500 mb-0.5">
                                  Sampai Tanggal (Time-Slice End, Opsional)
                                </label>
                                <input
                                  type="date"
                                  value={mem.endDate || ''}
                                  onChange={(e) => handleSupportMemberChange(memIdx, 'endDate', e.target.value)}
                                  className="w-full px-2.5 py-1 bg-slate-50 border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:bg-white focus:border-amber-500"
                                />
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* 4. CATATAN / INSTRUKSI KERJA (OPSIONAL) */}
                <div>
                  <label className="block font-bold text-slate-700 mb-1">
                    Catatan / Instruksi Kerja (Opsional):
                  </label>
                  <textarea
                    rows={2}
                    placeholder="Contoh: Seluruh tim wajib mematuhi SOP Zero Burning Method dan standar K3..."
                    value={assignmentForm.notes}
                    onChange={(e) => setAssignmentForm({ ...assignmentForm, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:bg-white focus:ring-2 focus:ring-amber-500"
                  />
                </div>

                {/* Form Buttons */}
                <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAssignmentModalOpen(false)}
                    className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
                  >
                    Batal
                  </button>
                  <button
                    type="submit"
                    className="px-6 py-2.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
                  >
                    <Check className="w-4 h-4" />
                    <span>{editingAssignmentId ? 'Simpan Perubahan Penugasan' : 'Simpan Data Penugasan Kerja'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        );
      })()}

      {/* MODAL: DETAIL PENUGASAN KERJA OPERASIONAL (SURAT PERINTAH PENUGASAN RESMI) */}
      {viewingAssignmentDetail && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl p-5 sm:p-7 max-w-2xl w-full shadow-2xl space-y-5 my-auto max-h-[94vh] overflow-y-auto border border-slate-200">
            {/* Modal Header */}
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider mb-1">
                  <ClipboardList className="w-3 h-3 text-amber-700" />
                  <span>Surat Tugas Resmi • Penugasan Kerja Operasional</span>
                </div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <span>{viewingAssignmentDetail.assignmentNumber}</span>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                    viewingAssignmentDetail.status === 'Aktif'
                      ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                  }`}>
                    {viewingAssignmentDetail.status}
                  </span>
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Tanggal Mulai Penugasan: <strong>{viewingAssignmentDetail.assignedDate}</strong>
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingAssignmentDetail(null)}
                className="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-500 font-bold transition cursor-pointer shrink-0"
              >
                ✕
              </button>
            </div>

            {/* Client & SPK Banner */}
            <div className="p-3.5 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-300 rounded-2xl flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black uppercase text-amber-900 tracking-wider flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-700" />
                  KLIEN &amp; NOMOR SPK KONTRAK
                </span>
                <div className="font-black text-slate-950 text-sm">
                  {viewingAssignmentDetail.clientName}
                </div>
                <div className="font-mono text-xs text-slate-700 font-bold">
                  No SPK: {viewingAssignmentDetail.contractNumber}
                </div>
              </div>
              <div className="px-3 py-1.5 rounded-xl bg-white border border-amber-300 text-right shadow-2xs">
                <span className="text-[10px] text-slate-500 font-bold block">Luas Kontrak</span>
                <span className="text-base font-black text-emerald-800">{viewingAssignmentDetail.totalAreaHa || 460} Ha</span>
              </div>
            </div>

            {/* A. Tim Staff Detail */}
            <div className="bg-indigo-50/50 p-4 rounded-2xl border border-indigo-200 space-y-3 text-xs">
              <div className="font-black text-indigo-950 uppercase tracking-wide flex items-center gap-1.5 border-b border-indigo-100 pb-2">
                <ShieldCheck className="w-4 h-4 text-indigo-600" />
                <span>A. Tim Staff (Bekerja di Seluruh Blok SPK)</span>
              </div>

              {/* Site Manager */}
              <div className="bg-white p-3 rounded-xl border border-indigo-200 flex items-center justify-between gap-2">
                <div>
                  <span className="text-[10px] font-bold text-slate-500 block uppercase">Site Manager:</span>
                  <span className="font-black text-slate-900 text-sm">{viewingAssignmentDetail.siteManagerName || viewingAssignmentDetail.staffName || '-'}</span>
                </div>
                {viewingAssignmentDetail.siteManagerPhone && (
                  <span className="text-xs text-indigo-700 font-mono font-bold bg-indigo-50 px-2.5 py-1 rounded-lg border border-indigo-200">
                    📱 {viewingAssignmentDetail.siteManagerPhone}
                  </span>
                )}
              </div>

              {/* Supervisors */}
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Pengawas Lapangan:
                </span>
                {viewingAssignmentDetail.supervisors && viewingAssignmentDetail.supervisors.length > 0 ? (
                  <div className="space-y-2">
                    {viewingAssignmentDetail.supervisors.map((spv, sIdx) => (
                      <div key={spv.id || sIdx} className="bg-white p-3 rounded-xl border border-indigo-200 space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-black text-slate-900 text-xs">
                            {sIdx + 1}. {spv.name}
                          </span>
                          {spv.phone && (
                            <span className="text-[10px] text-slate-500 font-mono">{spv.phone}</span>
                          )}
                        </div>
                        <div className="text-[11px] text-slate-600">
                          {spv.coverageType === 'ALL' ? (
                            <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-900 font-bold inline-block">
                              Mengawasi Seluruh Blok SPK Terpilih
                            </span>
                          ) : (
                            <div className="flex flex-wrap items-center gap-1 mt-0.5">
                              <span className="text-slate-500 font-medium">Mengawasi:</span>
                              {spv.assignedBlockCodes && spv.assignedBlockCodes.length > 0 ? (
                                spv.assignedBlockCodes.map((code) => (
                                  <span key={code} className="px-1.5 py-0.2 rounded bg-amber-100 text-amber-950 font-bold text-[10px] border border-amber-300">
                                    {code}
                                  </span>
                                ))
                              ) : (
                                <span className="text-slate-400 italic">Belum ditentukan</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500 italic">Tidak ada rincian pengawas.</div>
                )}
              </div>
            </div>

            {/* B. Tim Pendukung Detail */}
            <div className="bg-slate-50 p-4 rounded-2xl border border-slate-300 space-y-3 text-xs">
              <div className="font-black text-slate-900 uppercase tracking-wide flex items-center justify-between border-b border-slate-200 pb-2">
                <span className="flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-amber-600" />
                  <span>B. Tim Pendukung (Bekerja di Seluruh Blok SPK)</span>
                </span>
                <span className="text-[10px] font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded-full border border-amber-300">
                  {viewingAssignmentDetail.supportTeam ? viewingAssignmentDetail.supportTeam.length : 0} Personil
                </span>
              </div>

              {viewingAssignmentDetail.supportTeam && viewingAssignmentDetail.supportTeam.length > 0 ? (
                <div className="space-y-2">
                  {/* Operator */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-amber-900 uppercase tracking-wider block">
                      Operator &amp; Alat Berat:
                    </span>
                    <div className="space-y-1.5">
                      {viewingAssignmentDetail.supportTeam.filter((s) => s.role === 'Operator').map((op, oIdx) => (
                        <div key={op.id || oIdx} className="bg-white p-2.5 rounded-xl border border-slate-200 flex items-center justify-between gap-2">
                          <span className="font-black text-slate-900 text-xs">
                            {oIdx + 1}. {op.workerName}
                          </span>
                          <span className="px-2 py-1 rounded-lg bg-amber-200 text-amber-950 font-black font-mono text-[10px]">
                            {op.equipmentName || op.equipmentId || 'Unit Alat'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Mekanik, Logistik, Pendukung */}
                  {viewingAssignmentDetail.supportTeam.filter((s) => s.role !== 'Operator').length > 0 && (
                    <div className="pt-2 border-t border-slate-200 space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-600 uppercase tracking-wider block">
                        Personil Teknis &amp; Pendukung:
                      </span>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {viewingAssignmentDetail.supportTeam.filter((s) => s.role !== 'Operator').map((sup, sIdx) => (
                          <div key={sup.id || sIdx} className="bg-white p-2 rounded-lg border border-slate-200 text-[11px]">
                            <div className="font-bold text-slate-900">
                              <span className="text-amber-800 font-black">{sup.role}:</span> {sup.workerName}
                            </div>
                            {sup.notes && <div className="text-[10px] text-slate-500 mt-0.5">{sup.notes}</div>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="text-slate-500 italic">Tidak ada rincian tim pendukung.</div>
              )}
            </div>

            {/* Catatan / Instruksi Kerja */}
            {viewingAssignmentDetail.notes && (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs">
                <span className="font-bold text-amber-900 block mb-0.5">Catatan / Instruksi Kerja:</span>
                <p className="text-slate-700 italic">{viewingAssignmentDetail.notes}</p>
              </div>
            )}

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setViewingAssignmentDetail(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Tutup
              </button>
              <button
                type="button"
                onClick={() => {
                  const target = viewingAssignmentDetail;
                  setViewingAssignmentDetail(null);
                  handleOpenEditAssignment(target);
                }}
                className="px-5 py-2 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-1.5"
              >
                <Edit2 className="w-3.5 h-3.5" />
                <span>Edit Penugasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS PENUGASAN KERJA */}
      {assignmentToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Penugasan Kerja?</h3>
                <span className="text-xs text-slate-500">Tindakan ini akan mencabut alokasi penugasan.</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Personel:</span>
                <strong className="text-slate-900">{assignmentToDelete.workerName} ({assignmentToDelete.workerCategory})</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Unit Alat:</span>
                <strong className="text-slate-900">{assignmentToDelete.equipmentId ? `${assignmentToDelete.equipmentId} - ${assignmentToDelete.equipmentName}` : 'Supervisi (Tanpa Unit)'}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">No. SPK & Klien:</span>
                <span className="font-mono text-slate-800">{assignmentToDelete.contractNumber} ({assignmentToDelete.clientName})</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Lokasi Blok:</span>
                <strong className="text-amber-800">{assignmentToDelete.blockCode}</strong>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAssignmentToDelete(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteAssignment}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Penugasan</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS KLIEN */}
      {clientToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Data Klien?</h3>
                <span className="text-xs text-rose-600 font-bold">Sub Menu 1: Daftar Klien</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Nama Klien / PT:</span>
                <strong className="text-slate-900">{clientToDelete.name} ({clientToDelete.fullCompanyName || '-'})</strong>
              </div>
              {clientToDelete.contractNumber && (
                <div className="flex justify-between">
                  <span className="text-slate-500">No. Kontrak SPK:</span>
                  <span className="font-mono text-slate-800">{clientToDelete.contractNumber}</span>
                </div>
              )}
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus Klien &ldquo;{clientToDelete.name}&rdquo;? Tindakan ini akan menghapus seluruh data SPK, kontrak, dan lokasi blok yang terhubung. Tindakan ini tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteClient}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Klien</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI HAPUS LOKASI BLOK KERJA */}
      {blockToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-rose-100 space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Hapus Lokasi Blok Kerja?</h3>
                <span className="text-xs text-rose-600 font-bold">Sub Menu 2: Lokasi &amp; Pekerjaan</span>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Kode Blok:</span>
                <strong className="text-slate-900">{blockToDelete.code}</strong>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Target Luas:</span>
                <span className="font-mono text-slate-800">{blockToDelete.targetAreaHa || 0} Ha</span>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Apakah Anda yakin ingin menghapus Lokasi Blok Kerja &ldquo;{blockToDelete.code}&rdquo;? Tindakan ini akan menghapus data blok bersangkutan dan tidak dapat dibatalkan.
            </p>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setBlockToDelete(null)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeDeleteBlock}
                className="px-4 py-2 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow cursor-pointer transition flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus Blok</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: KONFIRMASI KOSONGKAN SEMUA DATA MASTER PROYEK */}
      {isClearMasterModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center gap-3 text-rose-600">
              <div className="p-3 bg-rose-50 rounded-2xl border border-rose-200">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-black text-slate-900 text-base">Kosongkan Semua Data Master Proyek?</h3>
                <span className="text-xs text-slate-500">Persiapan Pengisian Data Real Lapangan</span>
              </div>
            </div>

            <div className="p-4 bg-amber-50 rounded-2xl border border-amber-200 text-xs space-y-2 text-amber-950">
              <p className="font-bold">
                Tindakan ini akan mengosongkan seluruh data pada menu Master Data Proyek dan seluruh sub-sub menunya:
              </p>
              <ul className="list-disc list-inside space-y-1 text-[11px] font-medium text-amber-900">
                <li>1. Data Klien / SPK ({clients.length} terdaftar)</li>
                <li>2. Data Lokasi &amp; Pekerjaan Blok ({blocks.length} terdaftar)</li>
                <li>3. Data Unit Alat Berat &amp; Batas BBM ({equipments.length} terdaftar)</li>
                <li>4. Data Penugasan Kerja ({workAssignments.length} terdaftar)</li>
                <li>5. Data Target Harian ({dailyTargets.length} terdaftar)</li>
              </ul>
              <p className="text-[11px] pt-1 border-t border-amber-200 text-slate-600 italic">
                Setelah dikosongkan, Anda dapat langsung menginput data riil di lapangan satu per satu tanpa terganggu data dummy.
              </p>
            </div>

            <div className="flex justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsClearMasterModalOpen(false)}
                className="px-4 py-2.5 text-xs text-slate-600 hover:bg-slate-100 rounded-xl font-bold cursor-pointer transition"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={executeClearAllMasterData}
                className="px-5 py-2.5 text-xs bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl shadow-md cursor-pointer transition flex items-center gap-2"
              >
                <Trash2 className="w-4 h-4" />
                <span>Ya, Kosongkan Semua Data Proyek</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

