import React, { useState, useEffect } from 'react';
import {
  HardHat,
  ShieldAlert,
  AlertTriangle,
  MapPin,
  Calendar,
  Wrench,
  Truck,
  Plus,
  Trash2,
  RefreshCw,
  Search,
  Filter,
  Eye,
  Info,
  ChevronRight,
  ExternalLink,
  Check,
  X,
  Lock,
  ShieldCheck
} from 'lucide-react';
import {
  Equipment,
  Client,
  Block,
  DailyP2HChecklist,
  P2HItemCondition,
  FuelBowserReceipt,
  SoilHazardIncident,
  SoilIncidentType,
  IncidentSeverity,
  AuthUser
} from '../types';
import { storageService } from '../services/storageService';
import { getCurrentGpsLocation, GpsLocationResult } from '../utils/watermark';
import { recordUserActivity } from '../utils/activityLogger';

export interface DeleteTargetInfo {
  type: 'p2h' | 'fuel_bowser' | 'soil_incidents';
  id: string;
  title: string;
  entityName: string;
  categoryBadge: string;
  clientId: string;
  clientName: string;
  blockCode: string;
  date: string;
  time: string;
  creatorOrOperator: string;
  summaryDetails: { label: string; value: string; isBold?: boolean }[];
  warningNote: string;
}

interface SupervisorToolsViewProps {
  authUser: AuthUser | null;
  clients: Client[];
  selectedClientId: string;
  onSelectClientId: (id: string) => void;
  showToast: (text: string, type?: 'success' | 'info' | 'warning') => void;
  onNavigateToWizard?: () => void;
}

export const SupervisorToolsView: React.FC<SupervisorToolsViewProps> = ({
  authUser,
  clients,
  selectedClientId,
  onSelectClientId,
  showToast,
  onNavigateToWizard,
}) => {
  // STRICT ROLE ACCESS CONTROL: Pengawas Lapangan Only
  if (authUser?.role === 'director') {
    return (
      <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
        <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
        <h3 className="font-black text-slate-900 text-base">Akses Khusus Pengawas Lapangan</h3>
        <p className="text-xs text-slate-600">
          Halaman Fitur Cepat (P2H Pra-Operasi, Penerimaan Solar Bowser, dan Log Insiden Lahan) hanya tersedia bagi Pengawas Lapangan.
        </p>
      </div>
    );
  }

  // Active sub-tab
  const [activeSubTab, setActiveSubTab] = useState<'p2h' | 'fuel_bowser' | 'soil_incidents'>('p2h');

  // Master Data
  const [equipments, setEquipments] = useState<Equipment[]>(() => storageService.getEquipments());
  const [blocks, setBlocks] = useState<Block[]>(() => storageService.getBlocks());

  // Strict Assignment Enforcement for Pengawas: exactly 1 assigned client PT, multiple designated blocks
  const isSupervisorRole = authUser?.role === 'supervisor';
  const activeClientId = (isSupervisorRole && authUser?.assignedClientId && authUser.assignedClientId !== 'all')
    ? authUser.assignedClientId
    : (selectedClientId === 'ALL' ? (clients[0]?.id || 'client-1') : selectedClientId);

  const assignedBlockCodes = (isSupervisorRole && authUser?.assignedBlockCodes && authUser.assignedBlockCodes.length > 0 && !authUser.assignedBlockCodes[0].includes('Semua Blok'))
    ? authUser.assignedBlockCodes
    : null;

  // Filter blocks strictly belonging to this client and assigned blocks
  const clientBlocks = blocks.filter((b) => {
    if (b.clientId !== activeClientId) return false;
    if (assignedBlockCodes && !assignedBlockCodes.includes(b.code)) return false;
    return true;
  });

  // Current GPS Info
  const [currentGps, setCurrentGps] = useState<GpsLocationResult>({ lat: -0.51234, lng: 101.45678, accuracy: 4 });
  const [isGpsLoading, setIsGpsLoading] = useState<boolean>(false);

  // Refresh GPS
  const refreshGpsLocation = async () => {
    setIsGpsLoading(true);
    try {
      const loc = await getCurrentGpsLocation();
      setCurrentGps(loc);
      showToast(`Sinyal GPS Akurat: ${loc.lat.toFixed(5)}, ${loc.lng.toFixed(5)} (±${loc.accuracy}m)`, 'info');
    } catch {
      showToast('Menggunakan estimasi koordinat area perkebunan Riau', 'info');
    } finally {
      setIsGpsLoading(false);
    }
  };

  useEffect(() => {
    refreshGpsLocation();
  }, []);

  // Real-time Firestore synchronizer for instant multi-user consistency
  useEffect(() => {
    const handleFirestoreSync = () => {
      setP2hList(loadFilteredP2H());
      setBowserReceipts(loadFilteredBowser());
      setSoilIncidents(loadFilteredIncidents());
    };
    window.addEventListener('suryaland_firestore_sync', handleFirestoreSync);
    return () => {
      window.removeEventListener('suryaland_firestore_sync', handleFirestoreSync);
    };
  }, [activeClientId, assignedBlockCodes]);

  // Security Validation & Deletion Confirmation State
  const [deleteTarget, setDeleteTarget] = useState<DeleteTargetInfo | null>(null);
  const [deleteSecurityInput, setDeleteSecurityInput] = useState<string>('');
  const [deleteAgreedCheckbox, setDeleteAgreedCheckbox] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // =========================================================================
  // 1. P2H INSPEKSI HARIAN ALAT BERAT STATE
  // =========================================================================
  const loadFilteredP2H = () => {
    const raw = storageService.getP2HChecklists(activeClientId);
    return raw.filter((item) => {
      if (item.clientId !== activeClientId) return false;
      if (assignedBlockCodes && !assignedBlockCodes.includes(item.blockCode)) return false;
      return true;
    });
  };

  const [p2hList, setP2hList] = useState<DailyP2HChecklist[]>(() => loadFilteredP2H());
  const [showP2hModal, setShowP2hModal] = useState<boolean>(false);
  const [selectedP2hView, setSelectedP2hView] = useState<DailyP2HChecklist | null>(null);

  // Form P2H
  const [p2hEqId, setP2hEqId] = useState<string>(() => equipments[0]?.id || 'EX-01');
  const [p2hDate, setP2hDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [p2hTime, setP2hTime] = useState<string>('06:45');
  const [p2hBlockCode, setP2hBlockCode] = useState<string>(() => clientBlocks[0]?.code || 'Blok AB');
  const [p2hHmStart, setP2hHmStart] = useState<number>(() => equipments[0]?.currentHm || 2840.5);

  useEffect(() => {
    if (clientBlocks.length > 0 && !clientBlocks.some((b) => b.code === p2hBlockCode)) {
      setP2hBlockCode(clientBlocks[0].code);
    }
  }, [clientBlocks, p2hBlockCode]);

  const [p2hEngineOil, setP2hEngineOil] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hRadiator, setP2hRadiator] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hHydraulicPressure, setP2hHydraulicPressure] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hHydraulicHoses, setP2hHydraulicHoses] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hUndercarriage, setP2hUndercarriage] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hFuelSeparator, setP2hFuelSeparator] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hElectrical, setP2hElectrical] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hSafetyApar, setP2hSafetyApar] = useState<P2HItemCondition>('Baik / Normal');
  const [p2hNotes, setP2hNotes] = useState<string>('');

  // Selected Eq for P2H
  const selectedP2hEq = equipments.find((e) => e.id === p2hEqId);

  // Auto calculate overall status
  const calculateOverallStatus = (): 'Layak Operasi' | 'Bersyarat (Pantau)' | 'Stop Operasi (Butuh Mekanik)' => {
    const conditions = [
      p2hEngineOil,
      p2hRadiator,
      p2hHydraulicPressure,
      p2hHydraulicHoses,
      p2hUndercarriage,
      p2hFuelSeparator,
      p2hElectrical,
      p2hSafetyApar,
    ];
    if (conditions.some((c) => c === 'Rusak / Bahaya')) {
      return 'Stop Operasi (Butuh Mekanik)';
    }
    if (conditions.some((c) => c === 'Perlu Perhatian')) {
      return 'Bersyarat (Pantau)';
    }
    return 'Layak Operasi';
  };

  const handleSaveP2H = () => {
    const activeClient = clients.find((c) => c.id === activeClientId) || clients[0];
    const status = calculateOverallStatus();

    const newP2H: DailyP2HChecklist = {
      id: `P2H-${p2hDate}-${p2hEqId}-${Math.floor(Math.random() * 900 + 100)}`,
      date: p2hDate,
      time: p2hTime,
      equipmentId: p2hEqId,
      equipmentName: selectedP2hEq?.name || p2hEqId,
      operatorName: selectedP2hEq?.operatorName || 'Operator Lapangan',
      supervisorName: authUser?.displayName || 'Pengawas Lapangan',
      clientId: activeClient?.id || 'client-1',
      clientName: activeClient?.name || 'PT. A',
      blockCode: p2hBlockCode,
      hmStart: p2hHmStart,
      engineOilLevel: p2hEngineOil,
      radiatorCoolant: p2hRadiator,
      hydraulicOilAndPressure: p2hHydraulicPressure,
      hydraulicHosesAndFittings: p2hHydraulicHoses,
      undercarriageAndTracks: p2hUndercarriage,
      fuelLevelAndSeparator: p2hFuelSeparator,
      electricalAndLights: p2hElectrical,
      safetyAparAndSeatbelt: p2hSafetyApar,
      overallStatus: status,
      mechanicActionNeeded: status === 'Stop Operasi (Butuh Mekanik)',
      notes: p2hNotes || (status === 'Layak Operasi' ? 'Seluruh parameter pra-operasi dalam batas aman.' : 'Perhatikan rekomendasi inspeksi.'),
      createdAt: `${p2hDate} ${p2hTime} WIB`,
    };

    storageService.saveP2HChecklist(newP2H, authUser);
    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Pengawas Lapangan',
      userRole: 'supervisor',
      userEmail: authUser?.email,
      actionCategory: 'P2H',
      actionTitle: `Simpan Checklist P2H: ${newP2H.equipmentId}`,
      actionDescription: `Inspeksi kelayakan harian alat berat ${newP2H.equipmentName} di ${newP2H.blockCode}. Status: ${status}. HM: ${newP2H.hmStart}.`,
      targetEntity: `${newP2H.equipmentId} (${status})`,
      clientId: newP2H.clientId,
      clientName: newP2H.clientName,
      blockCode: newP2H.blockCode,
      customCoordinates: {
        lat: currentGps.lat,
        lng: currentGps.lng,
        accuracy: currentGps.accuracy,
        locationName: `${newP2H.blockCode}, ${newP2H.clientName}`,
      },
    });

    setP2hList(loadFilteredP2H());
    setShowP2hModal(false);
    showToast(`Checklist P2H ${newP2H.equipmentId} berhasil disimpan! Status: ${status}`, status === 'Stop Operasi (Butuh Mekanik)' ? 'warning' : 'success');
  };

  const requestDeleteP2H = (item: DailyP2HChecklist) => {
    setDeleteSecurityInput('');
    setDeleteAgreedCheckbox(false);
    setDeleteTarget({
      type: 'p2h',
      id: item.id,
      title: 'Lembar Checklist P2H Pra-Operasi',
      entityName: `${item.equipmentId} - ${item.equipmentName}`,
      categoryBadge: '1. P2H Pra-Operasi',
      clientId: item.clientId,
      clientName: item.clientName,
      blockCode: item.blockCode,
      date: item.date,
      time: item.time,
      creatorOrOperator: `Operator: ${item.operatorName} | Pengawas: ${item.supervisorName}`,
      summaryDetails: [
        { label: 'ID Dokumen', value: item.id },
        { label: 'Unit Alat Berat', value: `${item.equipmentId} (${item.equipmentName})`, isBold: true },
        { label: 'Lokasi & Klien', value: `${item.blockCode} • ${item.clientName}` },
        { label: 'HM Awal Unit', value: `${Number(item.hmStart || 0).toFixed(1)} HM` },
        { label: 'Status Kelayakan', value: item.overallStatus, isBold: true },
        { label: 'Waktu Inspeksi', value: `${item.date} ${item.time} WIB` },
      ],
      warningNote: 'Lembar pemeriksaan kelayakan harian alat berat pagi hari ini akan dihapus permanen dari sistem.',
    });
  };


  // =========================================================================
  // 2. FORM CEPAT PENERIMAAN SOLAR KELILING (FUEL BOWSER) STATE
  // =========================================================================
  const loadFilteredBowser = () => {
    const raw = storageService.getFuelBowserReceipts(activeClientId);
    return raw.filter((r) => {
      if (r.clientId !== activeClientId) return false;
      if (assignedBlockCodes && !assignedBlockCodes.includes(r.blockCode)) return false;
      return true;
    });
  };

  const [bowserReceipts, setBowserReceipts] = useState<FuelBowserReceipt[]>(() => loadFilteredBowser());
  const [showBowserModal, setShowBowserModal] = useState<boolean>(false);

  const [bowserTruckId, setBowserTruckId] = useState<string>('BM 8421 AU (Tangki 5.000 L)');
  const [bowserSealNumber, setBowserSealNumber] = useState<string>(`SGL-B50-${Math.floor(Math.random() * 90000 + 10000)}`);
  const [bowserDocNumber, setBowserDocNumber] = useState<string>(`SJ-BBM/SL/${new Date().toISOString().slice(0, 10).replace(/-/g, '/')}-01`);
  const [bowserEqId, setBowserEqId] = useState<string>(() => equipments[0]?.id || 'EX-01');
  const [bowserHmAtRefuel, setBowserHmAtRefuel] = useState<number>(2845.0);
  const [bowserBlockCode, setBowserBlockCode] = useState<string>(() => clientBlocks[0]?.code || 'Blok AB');
  const [bowserFlowmeterStart, setBowserFlowmeterStart] = useState<number>(42240);
  const [bowserFlowmeterEnd, setBowserFlowmeterEnd] = useState<number>(42380);
  const [bowserFuelQuality, setBowserFuelQuality] = useState<'Solar B50' | 'Keruh / Ada Air' | 'Kotor'>('Solar B50');
  const [bowserDriverName, setBowserDriverName] = useState<string>('Bambang Irawan');
  const [bowserNotes, setBowserNotes] = useState<string>('Pengisian solar rintis blok lahan. Segel utuh, flowmeter normal.');

  useEffect(() => {
    if (clientBlocks.length > 0 && !clientBlocks.some((b) => b.code === bowserBlockCode)) {
      setBowserBlockCode(clientBlocks[0].code);
    }
  }, [clientBlocks, bowserBlockCode]);

  const selectedBowserEq = equipments.find((e) => e.id === bowserEqId);
  const calculatedBowserLiters = Math.max(0, bowserFlowmeterEnd - bowserFlowmeterStart);

  const handleSaveBowserReceipt = () => {
    if (calculatedBowserLiters <= 0) {
      alert('Total liter pengisian harus lebih besar dari 0 (Periksa angka flowmeter akhir).');
      return;
    }

    const activeClient = clients.find((c) => c.id === activeClientId) || clients[0];
    const newReceipt: FuelBowserReceipt = {
      id: `FBW-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 900 + 100)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      clientId: activeClient?.id || 'client-1',
      clientName: activeClient?.name || 'PT. A',
      blockCode: bowserBlockCode,
      bowserTruckId,
      sealNumber: bowserSealNumber,
      deliveryDocNumber: bowserDocNumber,
      equipmentId: bowserEqId,
      equipmentName: selectedBowserEq?.name || bowserEqId,
      equipmentHmAtRefuel: bowserHmAtRefuel,
      flowmeterStart: bowserFlowmeterStart,
      flowmeterEnd: bowserFlowmeterEnd,
      totalLitersFilled: calculatedBowserLiters,
      fuelQualityCheck: bowserFuelQuality,
      operatorName: selectedBowserEq?.operatorName || 'Operator',
      bowserDriverName,
      supervisorName: authUser?.displayName || 'Pengawas Lapangan',
      notes: bowserNotes,
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    };

    storageService.saveFuelBowserReceipt(newReceipt, authUser);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Pengawas Lapangan',
      userRole: 'supervisor',
      userEmail: authUser?.email,
      actionCategory: 'FUEL_BOWSER',
      actionTitle: `Penerimaan Solar Bowser: ${newReceipt.totalLitersFilled} L`,
      actionDescription: `Penerimaan BBM solar dari Truk ${newReceipt.bowserTruckId} (Segel: ${newReceipt.sealNumber}) untuk unit ${newReceipt.equipmentId}. Uji Fisik: ${newReceipt.fuelQualityCheck}.`,
      targetEntity: `${newReceipt.bowserTruckId} (${newReceipt.totalLitersFilled} L)`,
      clientId: newReceipt.clientId,
      clientName: newReceipt.clientName,
      blockCode: newReceipt.blockCode,
      customCoordinates: {
        lat: currentGps.lat,
        lng: currentGps.lng,
        accuracy: currentGps.accuracy,
        locationName: `${newReceipt.blockCode}, ${newReceipt.clientName}`,
      },
    });

    setBowserReceipts(loadFilteredBowser());
    setShowBowserModal(false);
    showToast(`Penerimaan solar keliling ${newReceipt.totalLitersFilled} L untuk ${newReceipt.equipmentId} berhasil dicatat & masuk riwayat logistik!`, 'success');
  };

  const requestDeleteBowser = (b: FuelBowserReceipt) => {
    setDeleteSecurityInput('');
    setDeleteAgreedCheckbox(false);
    setDeleteTarget({
      type: 'fuel_bowser',
      id: b.id,
      title: 'Bukti Penerimaan Solar Keliling (Fuel Bowser)',
      entityName: `${b.equipmentId} (${b.equipmentName}) • +${b.totalLitersFilled.toLocaleString()} L`,
      categoryBadge: '2. Penerimaan Solar Keliling',
      clientId: b.clientId,
      clientName: b.clientName,
      blockCode: b.blockCode,
      date: b.date,
      time: b.time,
      creatorOrOperator: `Supir: ${b.bowserDriverName} | Pengawas: ${b.supervisorName}`,
      summaryDetails: [
        { label: 'No. Bukti / ID', value: b.id },
        { label: 'Unit Pengisian', value: `${b.equipmentId} (${b.equipmentName})`, isBold: true },
        { label: 'Volume BBM Terisi', value: `+${b.totalLitersFilled.toLocaleString()} Liter (Solar B50)`, isBold: true },
        { label: 'Truk & No. Segel', value: `${b.bowserTruckId} (Segel: ${b.sealNumber})` },
        { label: 'Flowmeter Tangki', value: `${b.flowmeterStart.toLocaleString()} → ${b.flowmeterEnd.toLocaleString()}` },
        { label: 'Lokasi & Klien', value: `${b.blockCode} • ${b.clientName}` },
        { label: 'Waktu Pengisian', value: `${b.date} ${b.time} WIB` },
      ],
      warningNote: 'Bukti pengisian solar keliling ini akan dibatalkan dan dihapus permanen dari register riwayat logistik lapangan.',
    });
  };

  // =========================================================================
  // 3. LOG INSIDEN LAPANGAN & KONDISI TANAH (SAFETY & SOIL HAZARD LOG) STATE
  // =========================================================================
  const loadFilteredIncidents = () => {
    const raw = storageService.getSoilIncidents(activeClientId);
    return raw.filter((i) => {
      if (i.clientId !== activeClientId) return false;
      if (assignedBlockCodes && !assignedBlockCodes.includes(i.blockCode)) return false;
      return true;
    });
  };

  const [soilIncidents, setSoilIncidents] = useState<SoilHazardIncident[]>(() => loadFilteredIncidents());
  const [showIncidentModal, setShowIncidentModal] = useState<boolean>(false);

  const [incType, setIncType] = useState<SoilIncidentType>('Alat Amblas di Tanah Gambut Dalam');
  const [incSeverity, setIncSeverity] = useState<IncidentSeverity>('Sedang (Butuh Bantuan Winching)');
  const [incEqId, setIncEqId] = useState<string>(() => equipments[0]?.id || 'EX-01');
  const [incBlockCode, setIncBlockCode] = useState<string>(() => clientBlocks[0]?.code || 'Blok AB');
  const [incRescueEq, setIncRescueEq] = useState<string>('DZ-01 (CAT D6R XL)');
  const [incDuration, setIncDuration] = useState<number>(1.5);
  const [incSoilCondition, setIncSoilCondition] = useState<'Tanah Gambut Kedalaman > 2m' | 'Gambut Dangkal / Basah' | 'Tanah Mineral Licin / Berlumpur' | 'Rawa Rendahan'>('Tanah Gambut Kedalaman > 2m');
  const [incInjury, setIncInjury] = useState<'Zero Accident (Nihil Cidera)' | 'P3K Ringan' | 'Perlu Perawatan'>('Zero Accident (Nihil Cidera)');
  const [incAction, setIncAction] = useState<string>('Evakuasi menggunakan sling baja 32mm dibantu tarikan bulldozer dan tumpuan bucket excavator.');
  const [incPrevention, setIncPrevention] = useState<string>('Wajib pasang bantalan kayu ralas (matting) sebelum melintasi kantung gambut lunak.');
  const [incStatus, setIncStatus] = useState<'Selesai Dievakuasi' | 'Dalam Penanganan' | 'Menunggu Bantuan Unit Tambahan'>('Selesai Dievakuasi');

  useEffect(() => {
    if (clientBlocks.length > 0 && !clientBlocks.some((b) => b.code === incBlockCode)) {
      setIncBlockCode(clientBlocks[0].code);
    }
  }, [clientBlocks, incBlockCode]);

  const selectedIncEq = equipments.find((e) => e.id === incEqId);

  const handleSaveIncident = () => {
    const activeClient = clients.find((c) => c.id === activeClientId) || clients[0];
    const newInc: SoilHazardIncident = {
      id: `INC-${new Date().toISOString().split('T')[0]}-${Math.floor(Math.random() * 900 + 100)}`,
      date: new Date().toISOString().split('T')[0],
      time: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      clientId: activeClient?.id || 'client-1',
      clientName: activeClient?.name || 'PT. A',
      blockCode: incBlockCode,
      incidentType: incType,
      severity: incSeverity,
      affectedEquipmentId: incEqId,
      affectedEquipmentName: selectedIncEq?.name || incEqId,
      operatorName: selectedIncEq?.operatorName || 'Operator',
      rescuingEquipmentId: incRescueEq,
      evacuationDurationHours: incDuration,
      soilCondition: incSoilCondition,
      injuryStatus: incInjury,
      actionTaken: incAction,
      preventionNotes: incPrevention,
      resolvedStatus: incStatus,
      supervisorName: authUser?.displayName || 'Pengawas Lapangan',
      createdAt: `${new Date().toISOString().split('T')[0]} ${new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })} WIB`,
    };

    storageService.saveSoilIncident(newInc, authUser);

    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Pengawas Lapangan',
      userRole: 'supervisor',
      userEmail: authUser?.email,
      actionCategory: 'INCIDENT_K3',
      actionTitle: `Lapor Insiden K3 / Tanah: ${newInc.affectedEquipmentId}`,
      actionDescription: `${newInc.incidentType} (${newInc.severity}) pada unit ${newInc.affectedEquipmentName}. Tindakan: ${newInc.actionTaken}`,
      targetEntity: `${newInc.affectedEquipmentId} (${newInc.incidentType})`,
      clientId: newInc.clientId,
      clientName: newInc.clientName,
      blockCode: newInc.blockCode,
      customCoordinates: {
        lat: currentGps.lat,
        lng: currentGps.lng,
        accuracy: currentGps.accuracy,
        locationName: `${newInc.blockCode}, ${newInc.clientName}`,
      },
    });

    setSoilIncidents(loadFilteredIncidents());
    setShowIncidentModal(false);
    showToast(`Log Insiden & Kondisi Tanah ${newInc.incidentType} berhasil dicatat (Durasi Evakuasi: ${newInc.evacuationDurationHours} Jam)!`, 'success');
  };

  const requestDeleteIncident = (inc: SoilHazardIncident) => {
    setDeleteSecurityInput('');
    setDeleteAgreedCheckbox(false);
    setDeleteTarget({
      type: 'soil_incidents',
      id: inc.id,
      title: 'Log Insiden Lapangan & Bahaya Gambut K3',
      entityName: `${inc.incidentType} (${inc.affectedEquipmentId})`,
      categoryBadge: '3. Log Insiden & Gambut K3',
      clientId: inc.clientId,
      clientName: inc.clientName,
      blockCode: inc.blockCode,
      date: inc.date,
      time: inc.time,
      creatorOrOperator: `Operator: ${inc.operatorName} | Pelapor: ${inc.supervisorName}`,
      summaryDetails: [
        { label: 'ID Log Insiden', value: inc.id },
        { label: 'Jenis Insiden', value: inc.incidentType, isBold: true },
        { label: 'Tingkat Bahaya', value: inc.severity, isBold: true },
        { label: 'Unit Terdampak', value: `${inc.affectedEquipmentId} (${inc.affectedEquipmentName})` },
        { label: 'Alat Evakuasi & Durasi', value: `${inc.rescuingEquipmentId || '-'} (${inc.evacuationDurationHours} Jam)` },
        { label: 'Lokasi & Klien', value: `${inc.blockCode} • ${inc.clientName}` },
        { label: 'Kondisi Tanah', value: inc.soilCondition },
      ],
      warningNote: 'Catatan keselamatan kerja dan durasi evakuasi alat amblas ini akan dihapus permanen dari register K3 perusahaan.',
    });
  };

  const cancelDelete = () => {
    setDeleteTarget(null);
    setDeleteSecurityInput('');
    setDeleteAgreedCheckbox(false);
    setIsDeleting(false);
  };

  const executeConfirmedDeletion = () => {
    if (!deleteTarget) return;

    if (!deleteAgreedCheckbox) {
      showToast('Validasi Keamanan: Anda wajib mencentang persetujuan konfirmasi penghapusan.', 'warning');
      return;
    }

    if (deleteSecurityInput.trim().toUpperCase() !== 'HAPUS') {
      showToast('Validasi Keamanan: Ketik kata "HAPUS" dengan benar untuk membuka kunci otorisasi.', 'warning');
      return;
    }

    setIsDeleting(true);

    try {
      const { type, id, entityName, clientId, clientName, blockCode } = deleteTarget;

      if (type === 'p2h') {
        const deleted = storageService.deleteP2HChecklist(id, authUser);
        if (!deleted) {
          const all = storageService.getP2HChecklists();
          const filtered = all.filter((x) => x.id !== id);
          localStorage.setItem('suryaland_p2h_checklists_v1', JSON.stringify(filtered));
        }
        setP2hList(loadFilteredP2H());
        recordUserActivity({
          userId: authUser?.id,
          userName: authUser?.displayName || 'Pengawas Lapangan',
          userRole: authUser?.role || 'supervisor',
          userEmail: authUser?.email,
          actionCategory: 'P2H',
          actionTitle: `Hapus Checklist P2H: ${entityName}`,
          actionDescription: `Menghapus lembar checklist P2H ${id} (${entityName}) di ${blockCode}, ${clientName} setelah validasi keamanan terkonfirmasi.`,
          targetEntity: `${id} (${entityName})`,
          clientId,
          clientName,
          blockCode,
        });
        showToast(`Lembar P2H "${entityName}" berhasil dihapus permanen!`, 'success');
      } else if (type === 'fuel_bowser') {
        const deleted = storageService.deleteFuelBowserReceipt(id, authUser);
        if (!deleted) {
          const all = storageService.getFuelBowserReceipts();
          const filtered = all.filter((x) => x.id !== id);
          localStorage.setItem('suryaland_fuel_bowser_v1', JSON.stringify(filtered));
        }
        setBowserReceipts(loadFilteredBowser());
        recordUserActivity({
          userId: authUser?.id,
          userName: authUser?.displayName || 'Pengawas Lapangan',
          userRole: authUser?.role || 'supervisor',
          userEmail: authUser?.email,
          actionCategory: 'FUEL_BOWSER',
          actionTitle: `Hapus Penerimaan Solar Bowser: ${entityName}`,
          actionDescription: `Menghapus bukti penerimaan solar tangki ${id} (${entityName}) di ${blockCode}, ${clientName} setelah validasi keamanan terkonfirmasi.`,
          targetEntity: `${id} (${entityName})`,
          clientId,
          clientName,
          blockCode,
        });
        showToast(`Bukti penerimaan solar "${entityName}" berhasil dihapus!`, 'success');
      } else if (type === 'soil_incidents') {
        const deleted = storageService.deleteSoilIncident(id, authUser);
        if (!deleted) {
          const all = storageService.getSoilIncidents();
          const filtered = all.filter((x) => x.id !== id);
          localStorage.setItem('suryaland_soil_incidents_v1', JSON.stringify(filtered));
        }
        setSoilIncidents(loadFilteredIncidents());
        recordUserActivity({
          userId: authUser?.id,
          userName: authUser?.displayName || 'Pengawas Lapangan',
          userRole: authUser?.role || 'supervisor',
          userEmail: authUser?.email,
          actionCategory: 'INCIDENT_K3',
          actionTitle: `Hapus Log Insiden K3: ${entityName}`,
          actionDescription: `Menghapus catatan insiden lahan/K3 ${id} (${entityName}) di ${blockCode}, ${clientName} setelah validasi keamanan terkonfirmasi.`,
          targetEntity: `${id} (${entityName})`,
          clientId,
          clientName,
          blockCode,
        });
        showToast(`Log insiden K3 "${entityName}" berhasil dihapus!`, 'success');
      }

      setDeleteTarget(null);
      setDeleteSecurityInput('');
      setDeleteAgreedCheckbox(false);
    } catch (err: any) {
      console.error('Delete execution error:', err);
      showToast(`Gagal menghapus: ${err?.message || 'Terjadi kesalahan sistem'}`, 'warning');
    } finally {
      setIsDeleting(false);
    }
  };

  if (clients.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <HardHat className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Belum Ada Proyek Aktif Terdaftar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Fitur Cepat Pengawas Lapangan memerlukan minimal satu SPK Klien / Blok Kerja terdaftar dalam sistem. Silakan hubungi Direktur atau Administrator untuk menambahkan data SPK baru di menu Master Data.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Banner: Pengawas Lapangan Operational Suite */}
      <div className="bg-slate-900 text-white rounded-2xl p-5 shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-start gap-4">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-black shadow-lg shrink-0">
            <HardHat className="w-8 h-8" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500 text-slate-950">
                Pusat Alat & Lapangan
              </span>
              <span className="text-xs font-semibold text-slate-400">
                PT. RBS GROUP • Zero Burning Method
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Fitur Cepat Pengawas Lapangan (Field Operational Suite)
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Dioptimalkan untuk lahan terpencil: Input cepat, validasi fisik akurat, kamera geotag offline, dan keselamatan K3 gambut.
            </p>
          </div>
        </div>

        {/* Live GPS badge & Client Scope */}
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <div className="flex items-center gap-2 bg-slate-800 border border-slate-700 px-3 py-1.5 rounded-xl text-xs">
            <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <div className="font-mono text-[11px] text-slate-200">
              {currentGps.lat.toFixed(5)}, {currentGps.lng.toFixed(5)} <span className="text-emerald-400 font-bold">(±{currentGps.accuracy}m)</span>
            </div>
            <button
              onClick={refreshGpsLocation}
              disabled={isGpsLoading}
              className="text-slate-400 hover:text-amber-400 transition ml-1"
              title="Perbarui koordinat GPS perangkat"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isGpsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          {onNavigateToWizard && (
            <button
              onClick={onNavigateToWizard}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Input Laporan Harian →</span>
            </button>
          )}
        </div>
      </div>

      {/* Navigation Sub-Tabs: 3 Fitur Utama Pengawas */}
      <div className="flex overflow-x-auto gap-2 p-1.5 bg-slate-200/80 rounded-2xl border border-slate-300">
        <button
          onClick={() => setActiveSubTab('p2h')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'p2h'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Wrench className="w-4 h-4" />
          <span>1. P2H Pra-Operasi ({p2hList.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('fuel_bowser')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'fuel_bowser'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>2. Penerimaan Solar Keliling ({bowserReceipts.length})</span>
        </button>

        <button
          onClick={() => setActiveSubTab('soil_incidents')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer whitespace-nowrap ${
            activeSubTab === 'soil_incidents'
              ? 'bg-amber-500 text-slate-950 shadow-md'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-900'
          }`}
        >
          <AlertTriangle className="w-4 h-4" />
          <span>3. Log Insiden & Gambut K3 ({soilIncidents.length})</span>
        </button>
      </div>

      {/* =========================================================================
          TAB 1: P2H CHECKLIST INSPEKSI PRA-OPERASI
          ========================================================================= */}
      {activeSubTab === 'p2h' && (
        <div className="space-y-6">
          {/* Header Card & Quick Add Button */}
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <Wrench className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Checklist Inspeksi Harian Alat Berat (P2H - Pemeriksaan Pra-Operasi)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                Wajib diisi oleh pengawas bersama operator setiap pagi (06:30 - 07:00 WIB) sebelum kunci kontak dihidupkan. Mencegah kerusakan fatal (*breakdown*) mendadak di tengah lahan yang memicu jam mati tinggi.
              </p>
            </div>

            <button
              onClick={() => {
                setP2hEqId(equipments[0]?.id || 'EX-01');
                setP2hHmStart(equipments[0]?.currentHm || 2840.5);
                setShowP2hModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Isi Lembar P2H Pagi Ini</span>
            </button>
          </div>

          {/* List of Today's P2H Inspections */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-black uppercase text-amber-400">Status Kesiapan Armada Hari Ini</span>
                <span className="text-xs text-slate-400">({p2hList.length} Unit Telah Diinspeksi)</span>
              </div>
              <div className="flex items-center gap-3 text-xs">
                <span className="inline-flex items-center gap-1.5 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span> Layak: {p2hList.filter((p) => p.overallStatus === 'Layak Operasi').length}
                </span>
                <span className="inline-flex items-center gap-1.5 text-amber-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span> Bersyarat: {p2hList.filter((p) => p.overallStatus === 'Bersyarat (Pantau)').length}
                </span>
                <span className="inline-flex items-center gap-1.5 text-rose-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span> Stop: {p2hList.filter((p) => p.overallStatus === 'Stop Operasi (Butuh Mekanik)').length}
                </span>
              </div>
            </div>

            <div className="divide-y divide-slate-200">
              {p2hList.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Belum ada lembar checklist P2H yang disimpan hari ini. Klik "Isi Lembar P2H Pagi Ini" di atas.
                </div>
              ) : (
                p2hList.map((item) => (
                  <div key={item.id} className="p-4 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-black bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded-md">
                          {item.equipmentId}
                        </span>
                        <strong className="text-sm text-slate-900">{item.equipmentName}</strong>
                        <span className="text-xs text-slate-500">
                          (Klien: <strong className="text-slate-700">{item.clientName}</strong> • Lokasi: {item.blockCode})
                        </span>
                        <span className={`px-2.5 py-0.5 rounded text-[10px] font-black uppercase ${
                          item.overallStatus === 'Layak Operasi'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                            : item.overallStatus === 'Bersyarat (Pantau)'
                            ? 'bg-amber-100 text-amber-800 border border-amber-300'
                            : 'bg-rose-100 text-rose-800 border border-rose-300'
                        }`}>
                          {item.overallStatus}
                        </span>
                      </div>

                      {/* 8 Critical Points Quick Badges */}
                      <div className="flex flex-wrap items-center gap-1.5 text-[11px] pt-1 font-mono">
                        <span className={`px-2 py-0.5 rounded ${item.engineOilLevel === 'Baik / Normal' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                          Oli Mesin: {item.engineOilLevel}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${item.radiatorCoolant === 'Baik / Normal' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                          Radiator: {item.radiatorCoolant}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${item.hydraulicHosesAndFittings === 'Baik / Normal' ? 'bg-slate-100 text-slate-700' : 'bg-amber-100 text-amber-800 font-bold'}`}>
                          Selang Hidrolik: {item.hydraulicHosesAndFittings}
                        </span>
                        <span className={`px-2 py-0.5 rounded ${item.undercarriageAndTracks === 'Baik / Normal' ? 'bg-slate-100 text-slate-700' : 'bg-rose-100 text-rose-800 font-bold'}`}>
                          Track Shoe: {item.undercarriageAndTracks}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 italic">
                        Catatan: "{item.notes || '-'}"
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                      <div className="text-right text-[11px] text-slate-500 font-mono">
                        <div>HM Awal: <strong>{Number(item.hmStart || 0).toFixed(1)}</strong></div>
                        <div>Inspeksi: {item.time} WIB ({item.operatorName})</div>
                      </div>

                      <button
                        onClick={() => setSelectedP2hView(item)}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition cursor-pointer"
                      >
                        Detail
                      </button>

                      <button
                        type="button"
                        onClick={() => requestDeleteP2H(item)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={`Hapus lembar P2H ${item.equipmentId}`}
                        aria-label={`Hapus lembar P2H ${item.equipmentId}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}


      {/* =========================================================================
          TAB 2: FORM CEPAT PENERIMAAN SOLAR KELILING (FUEL BOWSER)
          ========================================================================= */}
      {activeSubTab === 'fuel_bowser' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-amber-100 text-amber-900 rounded-lg">
                  <Truck className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Form Cepat Penerimaan Solar Keliling (Fuel Bowser Lapangan)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                Catat penerimaan solar kilat saat truk tangki bowser mengisi alat berat langsung di blok kerja. Rekam nomor segel tangki, meteran flowmeter, dan verifikasi kualitas solar.
              </p>
            </div>

            <button
              onClick={() => {
                setBowserSealNumber(`SGL-B50-${Math.floor(Math.random() * 90000 + 10000)}`);
                setShowBowserModal(true);
              }}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Pengisian Tangki Bowser</span>
            </button>
          </div>

          {/* List of Bowser Refuels */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400">
                Riwayat Pengisian Solar Keliling ({bowserReceipts.length} Transaksi)
              </span>
              <span className="text-xs text-slate-400">
                Total Terisi: {bowserReceipts.reduce((acc, r) => acc + r.totalLitersFilled, 0).toLocaleString()} Liter
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {bowserReceipts.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Belum ada catatan pengisian dari truk tangki bowser.
                </div>
              ) : (
                bowserReceipts.map((b) => (
                  <div key={b.id} className="p-4 hover:bg-slate-50 transition flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-mono text-xs font-bold bg-amber-100 text-amber-900 px-2 py-0.5 rounded">
                          {b.id}
                        </span>
                        <strong className="text-sm text-slate-900">
                          {b.equipmentId} ({b.equipmentName})
                        </strong>
                        <span className="text-xs text-slate-500">
                          • {b.clientName} ({b.blockCode})
                        </span>
                        <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">
                          {b.fuelQualityCheck}
                        </span>
                      </div>

                      <div className="text-xs text-slate-600 flex flex-wrap items-center gap-3 font-mono pt-1">
                        <span>Truk: <strong>{b.bowserTruckId}</strong></span>
                        <span>No. Segel: <strong>{b.sealNumber}</strong></span>
                        <span>Flowmeter: {b.flowmeterStart.toLocaleString()} → {b.flowmeterEnd.toLocaleString()}</span>
                        <span>HM Alat: {b.equipmentHmAtRefuel}</span>
                      </div>

                      <div className="text-xs text-slate-500 italic">
                        "{b.notes}" • Supir: {b.bowserDriverName} | Pengawas: {b.supervisorName}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 self-start lg:self-center">
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-700 font-mono">
                          +{b.totalLitersFilled.toLocaleString()} Liter
                        </div>
                        <div className="text-[11px] text-slate-500 font-mono">
                          {b.date} {b.time} WIB
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => requestDeleteBowser(b)}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                        title={`Hapus bukti penerimaan solar ${b.id}`}
                        aria-label={`Hapus bukti penerimaan solar ${b.id}`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          TAB 3: LOG INSIDEN LAPANGAN & KONDISI TANAH (SAFETY & SOIL HAZARD LOG)
          ========================================================================= */}
      {activeSubTab === 'soil_incidents' && (
        <div className="space-y-6">
          <div className="bg-white rounded-2xl p-5 shadow-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-rose-100 text-rose-900 rounded-lg">
                  <AlertTriangle className="w-4 h-4" />
                </span>
                <h3 className="text-base font-black text-slate-900 uppercase">
                  Log Insiden Lapangan & Kondisi Tanah (Safety & Soil Hazard K3)
                </h3>
              </div>
              <p className="text-xs text-slate-600 mt-1 max-w-3xl">
                Catatan khusus insiden tanah gambut dalam (alat amblas/terperosok), pohon lapuk roboh di jalur rintis, atau luapan banjir tanggul parit. Lengkap dengan pencatatan durasi evakuasi (*pull-out duration*) untuk sinkronisasi jam mati resmi.
              </p>
            </div>

            <button
              onClick={() => setShowIncidentModal(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>Catat Insiden Lapangan</span>
            </button>
          </div>

          {/* List of Incidents */}
          <div className="bg-white rounded-2xl shadow-lg border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
              <span className="text-xs font-black uppercase text-amber-400">
                Daftar Riwayat Insiden & Penanganan Gambut ({soilIncidents.length} Kejadian)
              </span>
              <span className="text-xs text-slate-400">
                Zero Accident Priority • K3 Perkebunan Sawit
              </span>
            </div>

            <div className="divide-y divide-slate-200">
              {soilIncidents.length === 0 ? (
                <div className="p-8 text-center text-slate-500 text-xs">
                  Tidak ada catatan insiden lapangan. Lingkungan kerja aman (*Zero Incident*).
                </div>
              ) : (
                soilIncidents.map((inc) => (
                  <div key={inc.id} className="p-4 hover:bg-slate-50 transition space-y-2">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase ${
                          inc.severity === 'Kritis (Stop Operasi)'
                            ? 'bg-rose-600 text-white'
                            : inc.severity === 'Sedang (Butuh Bantuan Winching)'
                            ? 'bg-amber-500 text-slate-950 font-bold'
                            : 'bg-blue-100 text-blue-800'
                        }`}>
                          {inc.severity}
                        </span>

                        <strong className="text-sm font-black text-slate-900">
                          {inc.incidentType}
                        </strong>

                        <span className="text-xs text-slate-600">
                          ({inc.clientName} • {inc.blockCode})
                        </span>

                        <span className="text-[10px] font-bold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded">
                          {inc.injuryStatus}
                        </span>
                      </div>

                      <div className="flex items-center gap-3">
                        <span className="font-mono text-xs font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                          Evakuasi: {inc.evacuationDurationHours} Jam
                        </span>
                        <span className="text-xs text-slate-500 font-mono">
                          {inc.date} {inc.time} WIB
                        </span>
                        <button
                          type="button"
                          onClick={() => requestDeleteIncident(inc)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title={`Hapus log insiden ${inc.id}`}
                          aria-label={`Hapus log insiden ${inc.id}`}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Incident Details Box */}
                    <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 text-xs space-y-1.5">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono text-[11px] text-slate-700">
                        <div>Unit Terdampak: <strong>{inc.affectedEquipmentId} ({inc.affectedEquipmentName})</strong></div>
                        <div>Alat Penolong: <strong>{inc.rescuingEquipmentId || '-'}</strong></div>
                        <div>Kondisi Tanah: <span className="font-bold text-amber-800">{inc.soilCondition}</span></div>
                      </div>

                      <div className="text-slate-800 pt-1">
                        <strong>Tindakan Evakuasi:</strong> {inc.actionTaken}
                      </div>

                      <div className="text-slate-600 italic">
                        <strong>Langkah Pencegahan K3:</strong> {inc.preventionNotes}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FORM P2H BARU
          ========================================================================= */}
      {showP2hModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-2xl w-full p-6 space-y-4 my-8 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <Wrench className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">Lembar Pemeriksaan Pra-Operasi (P2H)</h3>
                  <p className="text-xs text-slate-500">Pengecekan fisik wajib sebelum mesin dioperasikan jam 07:00 pagi</p>
                </div>
              </div>
              <button
                onClick={() => setShowP2hModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Alat Berat:</label>
                <select
                  value={p2hEqId}
                  onChange={(e) => {
                    const eqId = e.target.value;
                    setP2hEqId(eqId);
                    const eq = equipments.find((m) => m.id === eqId);
                    if (eq) setP2hHmStart(eq.currentHm);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.id} - {eq.name} ({eq.operatorName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">HM Awal Pagi:</label>
                <input
                  type="number"
                  step="0.1"
                  value={p2hHmStart}
                  onChange={(e) => setP2hHmStart(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tanggal & Waktu Inspeksi:</label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    value={p2hDate}
                    onChange={(e) => setP2hDate(e.target.value)}
                    className="w-2/3 px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                  <input
                    type="time"
                    value={p2hTime}
                    onChange={(e) => setP2hTime(e.target.value)}
                    className="w-1/3 px-2 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Lokasi Blok Kerja:</label>
                <select
                  value={p2hBlockCode}
                  onChange={(e) => setP2hBlockCode(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                >
                  {clientBlocks.map((b) => (
                    <option key={b.id} value={b.code}>
                      {b.code} ({b.targetAreaHa} Ha)
                    </option>
                  ))}
                  {clientBlocks.length === 0 && <option value="Blok AB">Blok AB</option>}
                </select>
              </div>
            </div>

            {/* 8 Checkpoints Interactive Radios */}
            <div className="space-y-2.5 pt-2 border-t border-slate-200">
              <h4 className="font-black text-xs uppercase text-slate-800">
                Pemeriksaan 8 Titik Kritis Pra-Operasi:
              </h4>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. Level Oli Mesin */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">1. Level Oli Mesin:</span>
                  <select
                    value={p2hEngineOil}
                    onChange={(e) => setP2hEngineOil(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hEngineOil === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 2. Air Radiator */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">2. Air Radiator / Coolant:</span>
                  <select
                    value={p2hRadiator}
                    onChange={(e) => setP2hRadiator(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hRadiator === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 3. Tekanan Hidrolik */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">3. Oli & Tekanan Hidrolik:</span>
                  <select
                    value={p2hHydraulicPressure}
                    onChange={(e) => setP2hHydraulicPressure(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hHydraulicPressure === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 4. Selang Hidrolik (Hoses) */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">4. Selang Hidrolik & Fitting:</span>
                  <select
                    value={p2hHydraulicHoses}
                    onChange={(e) => setP2hHydraulicHoses(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hHydraulicHoses === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 5. Undercarriage & Track */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">5. Track Shoe, Link, Roller:</span>
                  <select
                    value={p2hUndercarriage}
                    onChange={(e) => setP2hUndercarriage(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hUndercarriage === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 6. Solar & Separator */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">6. Solar & Water Separator:</span>
                  <select
                    value={p2hFuelSeparator}
                    onChange={(e) => setP2hFuelSeparator(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hFuelSeparator === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 7. Elektrikal & Lampu */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">7. Lampu Kerja & Klakson:</span>
                  <select
                    value={p2hElectrical}
                    onChange={(e) => setP2hElectrical(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hElectrical === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>

                {/* 8. APAR & Seatbelt */}
                <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                  <span className="font-bold text-slate-800">8. APAR K3 & Sabuk Pengaman:</span>
                  <select
                    value={p2hSafetyApar}
                    onChange={(e) => setP2hSafetyApar(e.target.value as P2HItemCondition)}
                    className={`px-2 py-1 rounded text-xs font-bold ${
                      p2hSafetyApar === 'Baik / Normal' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                    }`}
                  >
                    <option value="Baik / Normal">Baik / Normal</option>
                    <option value="Perlu Perhatian">Perlu Perhatian</option>
                    <option value="Rusak / Bahaya">Rusak / Bahaya</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Catatan Khusus Pengawas */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Catatan Temuan / Instruksi ke Operator:
              </label>
              <textarea
                rows={2}
                value={p2hNotes}
                onChange={(e) => setP2hNotes(e.target.value)}
                placeholder="e.g. Pantau kebocoran oli di seal arm silinder saat dorong kayu besar."
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowP2hModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveP2H}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Simpan Lembar P2H
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FORM PENERIMAAN SOLAR KELILING (FUEL BOWSER)
          ========================================================================= */}
      {showBowserModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-500 text-slate-950 rounded-xl font-bold">
                  <Truck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">Catat Pengisian Solar Bowser Lapangan</h3>
                  <p className="text-xs text-slate-500">Penerimaan solar langsung di titik kumpul rintis blok</p>
                </div>
              </div>
              <button
                onClick={() => setShowBowserModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Truk Tangki Bowser:</label>
                <input
                  type="text"
                  value={bowserTruckId}
                  onChange={(e) => setBowserTruckId(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">No. Segel Tangki Supplier:</label>
                <input
                  type="text"
                  value={bowserSealNumber}
                  onChange={(e) => setBowserSealNumber(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-amber-800"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Alat Berat Penerima:</label>
                <select
                  value={bowserEqId}
                  onChange={(e) => {
                    const eqId = e.target.value;
                    setBowserEqId(eqId);
                    const eq = equipments.find((m) => m.id === eqId);
                    if (eq) setBowserHmAtRefuel(eq.currentHm);
                  }}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  {equipments.map((eq) => (
                    <option key={eq.id} value={eq.id}>
                      {eq.id} - {eq.name} ({eq.operatorName})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">HM Alat Saat Pengisian:</label>
                <input
                  type="number"
                  step="0.1"
                  value={bowserHmAtRefuel}
                  onChange={(e) => setBowserHmAtRefuel(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flowmeter Awal:</label>
                <input
                  type="number"
                  value={bowserFlowmeterStart}
                  onChange={(e) => setBowserFlowmeterStart(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Flowmeter Akhir:</label>
                <input
                  type="number"
                  value={bowserFlowmeterEnd}
                  onChange={(e) => setBowserFlowmeterEnd(parseInt(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold"
                />
              </div>
            </div>

            {/* Total Liters Display */}
            <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl flex items-center justify-between font-mono">
              <span className="text-xs font-bold text-emerald-950">Total Solar Terisi ke Alat:</span>
              <span className="text-xl font-black text-emerald-800">
                +{calculatedBowserLiters.toLocaleString()} Liter
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Kualitas Solar:</label>
                <select
                  value={bowserFuelQuality}
                  onChange={(e) => setBowserFuelQuality(e.target.value as any)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Solar B50">Solar B50</option>
                  <option value="Keruh / Ada Air">Keruh / Ada Air</option>
                  <option value="Kotor">Kotor</option>
                </select>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Nama Supir Bowser:</label>
                <input
                  type="text"
                  value={bowserDriverName}
                  onChange={(e) => setBowserDriverName(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Catatan Tambahan:</label>
              <input
                type="text"
                value={bowserNotes}
                onChange={(e) => setBowserNotes(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg text-xs"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowBowserModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveBowserReceipt}
                className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Simpan & Sinkronkan ke Logistik
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: FORM CATAT INSIDEN LAPANGAN & GAMBUT K3
          ========================================================================= */}
      {showIncidentModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full p-6 space-y-4 my-8">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-rose-600 text-white rounded-xl font-bold">
                  <AlertTriangle className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="font-black text-base text-slate-900">Catat Insiden & Bahaya Tanah Gambut (K3)</h3>
                  <p className="text-xs text-slate-500">Mendokumentasikan durasi evakuasi untuk dasar jam mati resmi</p>
                </div>
              </div>
              <button
                onClick={() => setShowIncidentModal(false)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Jenis Insiden / Bahaya Lapangan:</label>
                <select
                  value={incType}
                  onChange={(e) => setIncType(e.target.value as SoilIncidentType)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                >
                  <option value="Alat Amblas di Tanah Gambut Dalam">Alat Amblas di Tanah Gambut Dalam</option>
                  <option value="Pohon Lapuk Roboh / Menimpa Jalur">Pohon Lapuk Roboh / Menimpa Jalur</option>
                  <option value="Tanggul Jebol / Luapan Banjir Sungai Batas">Tanggul Jebol / Luapan Banjir Sungai Batas</option>
                  <option value="Senggolan / Insiden Manuver Alat">Senggolan / Insiden Manuver Alat</option>
                  <option value="Percikan Api / Kesiapsiagaan Karhutla">Percikan Api / Kesiapsiagaan Karhutla</option>
                  <option value="Patah Track / Roller Lepas di Lapangan">Patah Track / Roller Lepas di Lapangan</option>
                  <option value="Lainnya">Lainnya</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Tingkat Keparahan:</label>
                  <select
                    value={incSeverity}
                    onChange={(e) => setIncSeverity(e.target.value as IncidentSeverity)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold text-rose-800"
                  >
                    <option value="Ringan (Tangani Sendiri)">Ringan (Tangani Sendiri)</option>
                    <option value="Sedang (Butuh Bantuan Winching)">Sedang (Butuh Bantuan Winching)</option>
                    <option value="Kritis (Stop Operasi)">Kritis (Stop Operasi)</option>
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Kondisi Kontur Tanah:</label>
                  <select
                    value={incSoilCondition}
                    onChange={(e) => setIncSoilCondition(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-medium"
                  >
                    <option value="Tanah Gambut Kedalaman > 2m">Tanah Gambut Kedalaman &gt; 2m</option>
                    <option value="Gambut Dangkal / Basah">Gambut Dangkal / Basah</option>
                    <option value="Tanah Mineral Licin / Berlumpur">Tanah Mineral Licin / Berlumpur</option>
                    <option value="Rawa Rendahan">Rawa Rendahan</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Unit Alat Terdampak:</label>
                  <select
                    value={incEqId}
                    onChange={(e) => setIncEqId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-bold"
                  >
                    {equipments.map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.id} - {eq.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Durasi Evakuasi (*Pull-out* Jam):</label>
                  <input
                    type="number"
                    step="0.5"
                    value={incDuration}
                    onChange={(e) => setIncDuration(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg font-mono font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Unit Alat Berat Penolong / Bantuan Winching:</label>
                <input
                  type="text"
                  placeholder="e.g. DZ-01 (CAT D6R XL) menarik dengan sling baja 32mm"
                  value={incRescueEq}
                  onChange={(e) => setIncRescueEq(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Tindakan Evakuasi Lapangan yang Diambil:</label>
                <textarea
                  rows={2}
                  value={incAction}
                  onChange={(e) => setIncAction(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Langkah Pencegahan K3 Selanjutnya:</label>
                <input
                  type="text"
                  value={incPrevention}
                  onChange={(e) => setIncPrevention(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-300 rounded-lg"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
              <button
                type="button"
                onClick={() => setShowIncidentModal(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleSaveIncident}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white font-black rounded-xl text-xs shadow-md transition cursor-pointer"
              >
                Simpan Log Insiden
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: DETAIL P2H VIEW
          ========================================================================= */}
      {selectedP2hView && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <div>
                <h3 className="font-black text-base text-slate-900">
                  Rincian Lembar P2H: {selectedP2hView.equipmentId}
                </h3>
                <p className="text-xs text-slate-500">
                  {selectedP2hView.equipmentName} • {selectedP2hView.clientName}
                </p>
              </div>
              <button
                onClick={() => setSelectedP2hView(null)}
                className="text-slate-400 hover:text-slate-600 p-1 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-slate-50 rounded-xl space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status Akhir:</span>
                  <span className="font-bold text-slate-900">{selectedP2hView.overallStatus}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">HM Awal:</span>
                  <span className="font-bold text-slate-900">{selectedP2hView.hmStart}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Waktu Inspeksi:</span>
                  <span className="font-bold text-slate-900">{selectedP2hView.date} {selectedP2hView.time} WIB</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Operator:</span>
                  <span className="font-bold text-slate-900">{selectedP2hView.operatorName}</span>
                </div>
              </div>

              <div className="border border-slate-200 rounded-xl divide-y divide-slate-100 text-[11px]">
                <div className="p-2 flex justify-between">
                  <span>Level Oli Mesin</span>
                  <span className="font-bold">{selectedP2hView.engineOilLevel}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Air Radiator / Coolant</span>
                  <span className="font-bold">{selectedP2hView.radiatorCoolant}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Tekanan Hidrolik</span>
                  <span className="font-bold">{selectedP2hView.hydraulicOilAndPressure}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Selang Hidrolik & Fitting</span>
                  <span className="font-bold">{selectedP2hView.hydraulicHosesAndFittings}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Track Link & Shoe Undercarriage</span>
                  <span className="font-bold">{selectedP2hView.undercarriageAndTracks}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>BBM Solar & Water Separator</span>
                  <span className="font-bold">{selectedP2hView.fuelLevelAndSeparator}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>Lampu Kerja & Klakson</span>
                  <span className="font-bold">{selectedP2hView.electricalAndLights}</span>
                </div>
                <div className="p-2 flex justify-between">
                  <span>APAR K3 & Sabuk Pengaman</span>
                  <span className="font-bold">{selectedP2hView.safetyAparAndSeatbelt}</span>
                </div>
              </div>

              <div className="text-slate-700 text-xs italic bg-amber-50 p-2.5 rounded-lg border border-amber-200">
                "{selectedP2hView.notes}"
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedP2hView(null)}
                className="px-4 py-2 bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          MODAL: VALIDASI KEAMANAN & KONFIRMASI PENGHAPUSAN (SECURITY VALIDATION)
          ========================================================================= */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-slate-950/75 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl shadow-2xl border border-rose-200 max-w-lg w-full p-6 space-y-4 my-8 max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between gap-3 pb-3 border-b border-slate-200">
              <div className="flex items-start gap-3">
                <div className="p-3 bg-rose-100 text-rose-700 rounded-2xl shrink-0 border border-rose-200">
                  <ShieldAlert className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-300">
                      Validasi Keamanan
                    </span>
                    <span className="text-[10px] font-bold text-slate-500">
                      {deleteTarget.categoryBadge}
                    </span>
                  </div>
                  <h3 className="text-base font-black text-slate-900 mt-1">
                    Konfirmasi Penghapusan Data Lapangan
                  </h3>
                  <p className="text-xs text-slate-500">
                    Sistem memerlukan validasi otorisasi sebelum mengeksekusi penghapusan permanen.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={cancelDelete}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition cursor-pointer"
                title="Batal & Tutup"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Target Item Details Card */}
            <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black bg-slate-900 text-amber-400 px-2.5 py-0.5 rounded">
                  {deleteTarget.id}
                </span>
                <span className="text-xs text-slate-500 font-mono">
                  {deleteTarget.date} • {deleteTarget.time} WIB
                </span>
              </div>

              <div className="text-sm font-black text-slate-900">
                {deleteTarget.entityName}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                {deleteTarget.summaryDetails.map((detail, idx) => (
                  <div key={idx} className="bg-white p-2.5 rounded-lg border border-slate-200/80">
                    <span className="block text-[10px] text-slate-400 font-bold uppercase">{detail.label}</span>
                    <span className={`text-slate-800 ${detail.isBold ? 'font-black' : 'font-medium'}`}>
                      {detail.value}
                    </span>
                  </div>
                ))}
              </div>

              <div className="text-[11px] text-slate-500 italic pt-0.5">
                {deleteTarget.creatorOrOperator}
              </div>
            </div>

            {/* Warning Callout */}
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs space-y-1.5 text-rose-900">
              <div className="flex items-center gap-2 font-black">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Peringatan Penghapusan Bersifat Permanen!</span>
              </div>
              <p className="text-[11px] text-rose-800 leading-relaxed">
                {deleteTarget.warningNote} Data yang dihapus tidak dapat dipulihkan (*irreversible*) dan otomatis disinkronisasi ke seluruh sistem.
              </p>
            </div>

            {/* Interactive Security Validation Controls */}
            <div className="p-4 bg-slate-100 rounded-xl border border-slate-200 space-y-3">
              <div className="text-xs font-black uppercase text-slate-700 flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-amber-600" />
                <span>Validasi Keamanan &amp; Verifikasi Otorisasi:</span>
              </div>

              {/* Checkbox Confirmation */}
              <label className="flex items-start gap-3 p-3 bg-white hover:bg-amber-50/40 rounded-xl border border-slate-200 cursor-pointer transition select-none">
                <input
                  type="checkbox"
                  checked={deleteAgreedCheckbox}
                  onChange={(e) => setDeleteAgreedCheckbox(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded text-rose-600 focus:ring-rose-500 border-slate-300 cursor-pointer"
                />
                <span className="text-xs text-slate-700 leading-relaxed">
                  Saya telah memeriksa data di atas dan mengonfirmasi bahwa data ini siap dihapus secara permanen dari sistem operasional.
                </span>
              </label>

              {/* Security Keyword Confirmation */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-700">
                  Ketik kata <span className="font-mono font-black text-rose-600 bg-rose-100 px-1.5 py-0.5 rounded">HAPUS</span> pada kotak berikut untuk membuka kunci:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={deleteSecurityInput}
                    onChange={(e) => setDeleteSecurityInput(e.target.value)}
                    placeholder='Ketik "HAPUS"'
                    autoFocus
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl font-mono text-center text-sm font-black tracking-widest uppercase focus:outline-none focus:ring-2 focus:ring-rose-500 focus:border-rose-500 placeholder:normal-case placeholder:font-normal placeholder:tracking-normal placeholder:text-slate-400"
                  />
                  {deleteSecurityInput.trim().toUpperCase() === 'HAPUS' && (
                    <span className="absolute right-3 top-2.5 text-emerald-600 flex items-center gap-1 text-xs font-bold">
                      <Check className="w-4 h-4" />
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-right">
                  {deleteSecurityInput.trim().toUpperCase() === 'HAPUS' ? (
                    <span className="text-emerald-700 font-bold inline-flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5" /> Kunci otorisasi terbuka
                    </span>
                  ) : (
                    <span className="text-slate-400">
                      {deleteSecurityInput ? 'Kata kunci belum sesuai' : 'Menunggu input "HAPUS"'}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={cancelDelete}
                disabled={isDeleting}
                className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition cursor-pointer"
              >
                Batal
              </button>

              <button
                type="button"
                onClick={executeConfirmedDeletion}
                disabled={!deleteAgreedCheckbox || deleteSecurityInput.trim().toUpperCase() !== 'HAPUS' || isDeleting}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black transition ${
                  deleteAgreedCheckbox && deleteSecurityInput.trim().toUpperCase() === 'HAPUS' && !isDeleting
                    ? 'bg-rose-600 hover:bg-rose-700 text-white shadow-lg shadow-rose-600/30 cursor-pointer active:scale-95'
                    : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                }`}
              >
                {isDeleting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengeksekusi Penghapusan...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-4 h-4" />
                    <span>Validasi &amp; Eksekusi Hapus</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
