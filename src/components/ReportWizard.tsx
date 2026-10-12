import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { 
  CheckCircle2, 
  ChevronRight, 
  ChevronLeft, 
  Camera, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  Save, 
  Send, 
  Clock, 
  Calendar, 
  Layers, 
  Users, 
  Fuel, 
  Wrench, 
  MapPin, 
  CloudRain, 
  Sun, 
  Check, 
  Sparkles,
  Plus,
  Building2,
  HardHat,
  ShieldCheck,
  UserPlus,
  Info,
  Search,
  Lock,
  Target
} from 'lucide-react';
import { sanitizeInput } from '../utils/sanitizer';
import { 
  DailyReport, 
  WeatherCondition, 
  EquipmentWorkLog, 
  LaborAbsence, 
  ReportPhoto, 
  SparePartUsage, 
  Equipment, 
  Worker, 
  Block, 
  BreakdownCategory,
  Client,
  UserRole,
  AuthUser,
  DailyLocationTarget,
  BlockWorkItem
} from '../types';
import { storageService } from '../services/storageService';
import { isDirectorLevel } from '../utils/auth';
import { applyWatermark, getCurrentGpsLocation } from '../utils/watermark';

interface ReportWizardProps {
  onReportSaved: (newReport: DailyReport) => void;
  onCancel?: () => void;
  isOnline: boolean;
  initialClientId?: string;
  userRole?: UserRole;
  authUser?: AuthUser | null;
  onNavigateToReports?: () => void;
  onNavigateToTools?: () => void;
}

const STEPS = [
  { id: 1, title: 'Info & Cuaca', icon: Calendar, desc: 'Proyek, Blok, Cuaca' },
  { id: 2, title: 'Presensi Tim', icon: Users, desc: 'Operator & Mekanik' },
  { id: 3, title: 'Alat & Downtime', icon: Clock, desc: 'HM & Jam Mati' },
  { id: 4, title: 'Hasil Kerja', icon: Layers, desc: 'Luas Lahan (Ha)' },
  { id: 5, title: 'Logistik & BBM', icon: Fuel, desc: 'Solar, Oli & Part' },
  { id: 6, title: 'Foto & Submit', icon: Camera, desc: 'Watermark GPS' },
];

export const formatIndoDate = (dateStr: string): string => {
  if (!dateStr) return '';
  const parts = dateStr.split('-');
  if (parts.length === 3 && parts[0].length === 4) {
    const day = parseInt(parts[2], 10);
    const month = parseInt(parts[1], 10);
    const year = parts[0];
    return `${day}-${month}-${year}`;
  }
  return dateStr;
};

export const ReportWizard: React.FC<ReportWizardProps> = ({
  onReportSaved,
  onCancel,
  isOnline,
  initialClientId,
  userRole,
  authUser,
  onNavigateToReports,
  onNavigateToTools,
}) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [clients, setClients] = useState<Client[]>(() => storageService.getClients());

  const isSupervisor = userRole === 'supervisor' || authUser?.role === 'supervisor';
  const effectiveClientId = (isSupervisor && authUser?.assignedClientId && authUser.assignedClientId !== 'all')
    ? authUser.assignedClientId
    : (initialClientId && initialClientId !== 'ALL' ? initialClientId : (storageService.getClients()[0]?.id || 'client-1'));

  const assignedBlockCodes = (isSupervisor && authUser?.assignedBlockCodes && authUser.assignedBlockCodes.length > 0 && !authUser.assignedBlockCodes.some(c => (c || '').toLowerCase().includes('semua blok')))
    ? authUser.assignedBlockCodes
    : null;

  const [selectedClientId, setSelectedClientId] = useState<string>(effectiveClientId);

  // Form State
  const initialDate = new Date().toISOString().split('T')[0];
  const [date, setDate] = useState<string>(initialDate);

  const [allBlocks, setAllBlocks] = useState<Block[]>(() => storageService.getBlocks(undefined, authUser));
  const [equipments, setEquipments] = useState<Equipment[]>(() => storageService.getEquipments());
  const [allWorkers, setAllWorkers] = useState<Worker[]>(() => storageService.getWorkers());

  // Filter blocks for selected client and supervisor assigned blocks using storageService
  const clientBlocks = useMemo(() => storageService.getBlocks(selectedClientId, authUser), [selectedClientId, authUser]);

  const [reportNumber, setReportNumber] = useState<string>(
    `LC-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, '/')}-00${Math.floor(Math.random() * 80 + 10)}`
  );

  // Sync selectedClientId whenever authUser changes
  useEffect(() => {
    if (isSupervisor && authUser?.assignedClientId && authUser.assignedClientId !== 'all') {
      setSelectedClientId(authUser.assignedClientId);
    }
  }, [authUser?.assignedClientId, isSupervisor]);

  // Sinkronisasi data alat berat dari modul Master Data Proyek secara reaktif saat client, tanggal, atau update master data berubah
  useEffect(() => {
    const freshEquips = storageService.getEquipments();
    setEquipments(freshEquips);
    const handleMasterUpdate = () => {
      setEquipments(storageService.getEquipments());
    };
    window.addEventListener('master-data-updated', handleMasterUpdate);
    window.addEventListener('storage', handleMasterUpdate);
    return () => {
      window.removeEventListener('master-data-updated', handleMasterUpdate);
      window.removeEventListener('storage', handleMasterUpdate);
    };
  }, [selectedClientId, date]);

  const [selectedBlockId, setSelectedBlockId] = useState<string>(() => {
    const initBlocks = storageService.getBlocks(effectiveClientId, authUser);
    return initBlocks[0]?.id || 'blk-1';
  });
  const [weather, setWeather] = useState<WeatherCondition>('Cerah');
  const [weatherStartTime, setWeatherStartTime] = useState<string>('08.00');
  const [weatherEndTime, setWeatherEndTime] = useState<string>('14.15');
  const [weatherNotes, setWeatherNotes] = useState<string>('');
  const [workShift, setWorkShift] = useState<string>('07.00 - 17.00 WIB');
  const [supervisorName, setSupervisorName] = useState<string>(() => authUser?.displayName || 'Budi Santoso');

  // Keep selectedBlockId aligned when client changes
  useEffect(() => {
    if (clientBlocks.length > 0 && !clientBlocks.some((b) => b.id === selectedBlockId)) {
      setSelectedBlockId(clientBlocks[0].id);
    }
  }, [selectedClientId]);

  // Quick modal to add new client or block on-site
  const [showQuickAddClient, setShowQuickAddClient] = useState<boolean>(false);
  const [newClientShortName, setNewClientShortName] = useState<string>('');
  const [newClientFullName, setNewClientFullName] = useState<string>('');
  const [newClientContract, setNewClientContract] = useState<string>('');
  const [newClientAreaHa, setNewClientAreaHa] = useState<number>(100);
  const [newClientLocation, setNewClientLocation] = useState<string>('Provinsi Riau');

  const [showQuickAddBlock, setShowQuickAddBlock] = useState<boolean>(false);
  const [newBlockCode, setNewBlockCode] = useState<string>('');
  const [newBlockTargetHa, setNewBlockTargetHa] = useState<number>(50);

  // Step 2: Presensi Tim & Penugasan Lokasi (Ditentukan Superadmin)
  const [laborFilterScope, setLaborFilterScope] = useState<'assigned_only' | 'all'>('assigned_only');
  const [laborFilterTeam, setLaborFilterTeam] = useState<string>('ALL');
  const [laborSearchQuery, setLaborSearchQuery] = useState<string>('');
  const [showAddBkoModal, setShowAddBkoModal] = useState<boolean>(false);

  const [laborList, setLaborList] = useState<LaborAbsence[]>(() => {
    return allWorkers.map((w) => ({
      workerId: w.id,
      workerName: w.name,
      category: w.category,
      role: w.role,
      status: 'Hadir',
      teamName: w.teamName || 'Tim Operator Alat Berat',
      assignedClientId: w.assignedClientId || 'ALL',
      assignedBlockId: w.assignedBlockId || 'ALL',
      notes: '',
    }));
  });

  // Sinkronisasi data personil jika master data diubah oleh Superadmin di MasterDataView
  useEffect(() => {
    const latestWorkers = storageService.getWorkers();
    setAllWorkers(latestWorkers);
    setLaborList((prev) => {
      const prevMap = new Map(prev.map((item) => [item.workerId, item]));

      return latestWorkers.map((w) => {
        const existing = prevMap.get(w.id);
        return {
          workerId: w.id,
          workerName: w.name,
          category: w.category,
          role: w.role,
          status: existing ? existing.status : 'Hadir',
          teamName: w.teamName || 'Tim Operator Alat Berat',
          assignedClientId: w.assignedClientId || 'ALL',
          assignedBlockId: w.assignedBlockId || 'ALL',
          notes: existing ? existing.notes : '',
        };
      });
    });
  }, [selectedClientId, selectedBlockId, currentStep]);

  // Helper to fetch previous remaining fuel in unit tank from earlier daily reports
  const getPreviousRemainingFuelForEquipment = useCallback(
    (equipmentId: string, targetDate: string, clientId?: string, equipmentName?: string): number => {
      try {
        // Ambil semua laporan tersimpan untuk memastikan riwayat fisik alat terdeteksi
        const allReports = storageService.getReports();

        // Normalisasi tanggal ke timestamp (awal hari) agar tidak ada kesalahan komparasi string
        const parseDateToTime = (dStr: string): number => {
          if (!dStr) return 0;
          const clean = dStr.split('T')[0].trim();
          if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(clean)) {
            const parts = clean.split(/[\/-]/);
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
          return new Date(clean).getTime() || 0;
        };

        const targetTime = parseDateToTime(targetDate);

        // Filter: Hanya laporan dengan tanggal SEBELUM targetDate
        // Query database terurut: TERBARU ke TERLAMA (Descending: b.time - a.time)
        // Memastikan query TIDAK TERBALIK sehingga hari kemarin (e.g. tgl 2) diambil pertama kali
        const earlierReports = allReports
          .filter((r) => {
            const rTime = parseDateToTime(r.date);
            return rTime > 0 && targetTime > 0 && rTime < targetTime;
          })
          .sort((a, b) => {
            const timeDiff = parseDateToTime(b.date) - parseDateToTime(a.date);
            if (timeDiff !== 0) return timeDiff;
            return (b.createdAt || '').localeCompare(a.createdAt || '');
          });

        // Helper pencocokan unit alat berat secara presisi & ketat (mencegah salah pencocokan kategori alat & nomor unit)
        const isMatchEquipment = (logEqId: string, logEqName?: string): boolean => {
          if (!logEqId || !equipmentId) return false;
          const cleanLog = logEqId.trim().toUpperCase();
          const cleanTarget = equipmentId.trim().toUpperCase();

          // 1. Pencocokan langsung (case insensitive)
          if (cleanLog === cleanTarget) return true;

          // 2. Pemetaan alias unit resmi yang valid secara fisik (misal EXCA-01 dengan eq-1)
          const EXACT_ALIASES: Record<string, string[]> = {
            'EXCA-01': ['EQ-1'],
            'EQ-1': ['EXCA-01'],
            'DZ-01': ['EQ-2'],
            'EQ-2': ['DZ-01'],
            'EXCA-02': ['EQ-3'],
            'EQ-3': ['EXCA-02'],
          };
          if (EXACT_ALIASES[cleanTarget]?.includes(cleanLog)) return true;

          // Ekstraksi nomor unit (misal EXCA-01 -> 1, EXCA-02 -> 2)
          const extractUnitNumber = (s: string): number | null => {
            const m = s.match(/\d+/);
            return m ? parseInt(m[0], 10) : null;
          };

          const logNum = extractUnitNumber(cleanLog);
          const targetNum = extractUnitNumber(cleanTarget);

          // 3. ATURAN KETAT: Jika nomor unit berbeda (misal 1 vs 2), MUTLAK TIDAK BOLEH COCOK meskipun model/nama sama
          if (logNum !== null && targetNum !== null && logNum !== targetNum) {
            return false;
          }

          // 4. Validasi kategori alat: Ekskavator tidak boleh pernah cocok dengan Bulldozer
          const isLogExca = cleanLog.includes('EXCA') || cleanLog.includes('EX-');
          const isTargetExca = cleanTarget.includes('EXCA') || cleanTarget.includes('EX-');
          const isLogBull = cleanLog.includes('DZ') || cleanLog.includes('BULL');
          const isTargetBull = cleanTarget.includes('DZ') || cleanTarget.includes('BULL');

          if (isLogExca !== isTargetExca) return false;
          if (isLogBull !== isTargetBull) return false;

          // Jika nomor unit sama atau tidak ada nomor unit, verifikasi kecocokan
          if (logNum !== null && targetNum !== null && logNum === targetNum) {
            return (isLogExca === isTargetExca) && (isLogBull === isTargetBull);
          }

          return false;
        };

        for (const r of earlierReports) {
          const match = r.equipmentWorkLogs?.find((l) => isMatchEquipment(l.equipmentId, l.equipmentName));
          if (match) {
            const prevTankYesterday = Number(match.previousRemainingFuelLiters) || 0;
            const addedYesterday = Number(match.fuelAddedLiters) || 0;
            const effHoursYesterday = Number(match.effectiveWorkHours) || 0;
            const stdLimitYesterday = Number(match.fuelStandardLimit) || 18.0;

            const consYesterday = match.fuelConsumptionLiters !== undefined && match.fuelConsumptionLiters !== null
              ? Number(match.fuelConsumptionLiters)
              : Number((effHoursYesterday * stdLimitYesterday).toFixed(1));

            // Logika lapangan resmi:
            // Sisa BBM ditangki = (Sisa Kemarin + Pengisian) - Konsumsi Hari Ini
            const calculatedRemaining = Number((prevTankYesterday + addedYesterday - consYesterday).toFixed(1));

            // Jika match.remainingTankLiters valid (> 0), prioritaskan
            if (typeof match.remainingTankLiters === 'number' && !isNaN(match.remainingTankLiters) && match.remainingTankLiters > 0) {
              return match.remainingTankLiters;
            }

            // Jika hasil perhitungan formula fisik > 0, gunakan hasil ini
            if (calculatedRemaining > 0) {
              return calculatedRemaining;
            }

            if (typeof match.remainingTankLiters === 'number' && !isNaN(match.remainingTankLiters)) {
              return Math.max(0, match.remainingTankLiters);
            }

            return Math.max(0, calculatedRemaining);
          }
        }
      } catch (err) {
        console.error('Error fetching previous remaining fuel:', err);
      }
      return 0;
    },
    []
  );

  const getPreviousCumulativeVolumeForWorkItem = useCallback(
    (itemName: string, targetDate: string, blockId: string, clientId?: string): number => {
      try {
        const allReports = storageService.getReports(clientId && clientId !== 'ALL' ? clientId : undefined);
        const parseDateToTime = (dStr: string): number => {
          if (!dStr) return 0;
          const clean = dStr.split('T')[0].trim();
          if (/^\d{1,2}[\/-]\d{1,2}[\/-]\d{4}/.test(clean)) {
            const parts = clean.split(/[\/-]/);
            return new Date(Number(parts[2]), Number(parts[1]) - 1, Number(parts[0])).getTime();
          }
          return new Date(clean).getTime() || 0;
        };
        const targetTime = parseDateToTime(targetDate);
        const earlierReports = allReports.filter((r) => {
          const rTime = parseDateToTime(r.date);
          return r.blockId === blockId && rTime > 0 && targetTime > 0 && rTime < targetTime;
        });
        let total = 0;
        earlierReports.forEach((r) => {
          const match = r.physicalProgress?.itemProgress?.find((it: any) => it.itemName === itemName);
          if (match) {
            total += Number(match.realizedDailyVolume) || 0;
          }
        });
        return total;
      } catch {}
      return 0;
    },
    []
  );

  // Step 3 & 5: Equipment Work Logs & Fuel Analytics
  const [equipmentLogs, setEquipmentLogs] = useState<EquipmentWorkLog[]>(() => {
    const savedEquips = storageService.getEquipments();
    const initDate = date;
    return savedEquips.map((eq) => {
      const prevTankInitial = getPreviousRemainingFuelForEquipment(eq.id, initDate, effectiveClientId, eq.name);
      const stdLimitInitial = eq.standardFuelRatio || 18.0;
      return {
        equipmentId: eq.id,
        equipmentName: eq.name,
        type: eq.type,
        hmStart: eq.currentHm || 0,
        hmEnd: eq.currentHm || 0,
        totalHm: 0,
        downtimeWeatherHours: 0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: 0,
        fuelAddedLiters: 0,
        fuelHmAtRefuel: eq.currentHm || 0,
        fuelRatio: 0,
        fuelStandardLimit: stdLimitInitial,
        isFuelAlert: false,
        previousRemainingFuelLiters: prevTankInitial,
        fuelConsumptionLiters: 0,
        remainingTankLiters: prevTankInitial,
        recommendedRefuelLiters: 0,
        fuelAnalysisStatus: 'Normal',
        fuelAnalysisNote: 'Normal: Pengisian sesuai kebutuhan jam kerja efektif.',
      };
    });
  });

  // Sinkronisasi otomatis equipmentLogs dari Master Data Proyek saat equipments atau date berubah
  useEffect(() => {
    if (equipments && equipments.length > 0) {
      setEquipmentLogs((prev) => {
        const existingMap = new Map(prev.map((l) => [l.equipmentId, l]));
        return equipments.map((eq) => {
          if (existingMap.has(eq.id)) {
            const existing = existingMap.get(eq.id)!;
            const prevTankVal = getPreviousRemainingFuelForEquipment(eq.id, date, selectedClientId, eq.name);
            return {
              ...existing,
              equipmentName: eq.name,
              type: eq.type,
              fuelStandardLimit: eq.standardFuelRatio || existing.fuelStandardLimit || 18.0,
              previousRemainingFuelLiters: prevTankVal,
            };
          }
          const prevTankInitial = getPreviousRemainingFuelForEquipment(eq.id, date, selectedClientId, eq.name);
          const stdLimitInitial = eq.standardFuelRatio || 18.0;
          return {
            equipmentId: eq.id,
            equipmentName: eq.name,
            type: eq.type,
            hmStart: eq.currentHm || 0,
            hmEnd: eq.currentHm || 0,
            totalHm: 0,
            downtimeWeatherHours: 0,
            downtimeWeatherNote: '',
            downtimeBreakdownHours: 0,
            downtimeBreakdownNote: '',
            downtimeOtherHours: 0,
            downtimeOtherNote: '',
            effectiveWorkHours: 0,
            fuelAddedLiters: 0,
            fuelHmAtRefuel: eq.currentHm || 0,
            fuelRatio: 0,
            fuelStandardLimit: stdLimitInitial,
            isFuelAlert: false,
            previousRemainingFuelLiters: prevTankInitial,
            fuelConsumptionLiters: 0,
            remainingTankLiters: prevTankInitial,
            recommendedRefuelLiters: 0,
            fuelAnalysisStatus: 'Normal',
            fuelAnalysisNote: 'Normal: Pengisian sesuai kebutuhan jam kerja efektif.',
          };
        });
      });
    }
  }, [equipments, date, selectedClientId, getPreviousRemainingFuelForEquipment]);

  // Step 4: Capaian Hasil Kerja Berdasarkan Target Harian Direktur (Master Data Proyek -> Submenu Target Harian)
  interface WorkItemProgressEntry {
    id: string;
    name: string;
    unit: string;
    targetDailyVolume: number;
    totalVolume?: number;
    realizedDailyVolume: number;
    notes?: string;
  }

  const [directorTarget, setDirectorTarget] = useState<DailyLocationTarget | undefined>(undefined);
  const [workItemEntries, setWorkItemEntries] = useState<WorkItemProgressEntry[]>([]);
  const [targetAreaHa, setTargetAreaHa] = useState<number>(4.0);
  const [realizedAreaHa, setRealizedAreaHa] = useState<number>(0);
  const [progressNotes, setProgressNotes] = useState<string>('');
  const [itemRawInputs, setItemRawInputs] = useState<Record<string, string>>({});

  // Sinkronisasi data dari SPK terpilih, Blok terpilih, dan Target Harian yang ditetapkan Direktur
  useEffect(() => {
    setItemRawInputs({});
    // 1. Ambil target harian dari Direktur untuk Blok & SPK pada tanggal laporan
    const targetForDate = storageService.getDailyTargetForDate(selectedBlockId, date);
    const targetForBlock = targetForDate || storageService.getDailyTargets(selectedClientId, selectedBlockId)[0];
    setDirectorTarget(targetForBlock);

    // 2. Set targetAreaHa pokok dari Target Harian Direktur (atau konfigurasi blok)
    const block = allBlocks.find((b) => b.id === selectedBlockId);
    const resolvedTargetHa = targetForBlock?.dailyTargetAreaHa ?? block?.dailyTargetAreaHa ?? 4.0;
    setTargetAreaHa(resolvedTargetHa);

    // 3. Bangun daftar item kerja yang bersumber dari Target Harian Direktur / Blok SPK terpilih
    let initialItems: WorkItemProgressEntry[] = [];
    if (targetForBlock?.itemTargets && targetForBlock.itemTargets.length > 0) {
      initialItems = targetForBlock.itemTargets.map((it, idx) => ({
        id: it.id || `target-it-${idx}`,
        name: it.name,
        unit: it.unit || 'Ha',
        targetDailyVolume: it.dailyTargetVolume,
        totalVolume: it.totalVolume,
        realizedDailyVolume: 0,
        notes: '',
      }));
    } else if (block?.workItems && block.workItems.length > 0) {
      initialItems = block.workItems.map((wi) => ({
        id: wi.id,
        name: wi.name,
        unit: wi.unit || 'Ha',
        targetDailyVolume: wi.unit.toUpperCase() === 'HA' ? resolvedTargetHa : (wi.targetVolume ? Number((wi.targetVolume / 25).toFixed(1)) : 10),
        totalVolume: wi.targetVolume,
        realizedDailyVolume: 0,
        notes: '',
      }));
    } else {
      initialItems = [
        { id: 'wi-1', name: 'UNDERBRUSHING (SEMAK BELUKAR)', unit: 'Ha', targetDailyVolume: resolvedTargetHa, totalVolume: block?.targetAreaHa || 100, realizedDailyVolume: 0, notes: '' },
        { id: 'wi-2', name: 'BATANG KUBUR (Penebangan / Pemotongan)', unit: 'POHON', targetDailyVolume: 25, totalVolume: 250, realizedDailyVolume: 0, notes: '' },
        { id: 'wi-3', name: 'MECHANICAL STACKING / RUMPUK MEKANIS', unit: 'Ha', targetDailyVolume: Number((resolvedTargetHa * 0.75).toFixed(1)), totalVolume: block?.targetAreaHa || 100, realizedDailyVolume: 0, notes: '' },
        { id: 'wi-4', name: 'MAINROAD & COLLECTION ROAD', unit: 'm', targetDailyVolume: 150, totalVolume: 1500, realizedDailyVolume: 0, notes: '' },
      ];
    }

    setWorkItemEntries(initialItems);
  }, [selectedClientId, selectedBlockId, date, allBlocks]);

  // Live synchronization of previous remaining fuel for equipments based on date, client & step
  useEffect(() => {
    setEquipmentLogs((prev) =>
      prev.map((log) => {
        const prevFuelVal = getPreviousRemainingFuelForEquipment(log.equipmentId, date, selectedClientId, log.equipmentName);
        const eqMaster = equipments.find((e) => e.id === log.equipmentId || e.name === log.equipmentName);
        const stdLimitVal = log.fuelStandardLimit || eqMaster?.standardFuelRatio || 18.0;
        const effHoursVal = Number(log.effectiveWorkHours) || 0;
        const consVal = Number((effHoursVal * stdLimitVal).toFixed(1));
        const recVal = Math.max(0, Number((consVal - prevFuelVal).toFixed(1)));
        const addedVal = Number(log.fuelAddedLiters) || 0;
        const remVal = Number((prevFuelVal + addedVal - consVal).toFixed(1));
        const ratioVal = effHoursVal > 0 && addedVal > 0 ? Number((addedVal / effHoursVal).toFixed(2)) : 0;

        // Real-time validation for fuel waste / abnormal refuels:
        // 1. Refuel exceeds ideal recommendation (cons - prevFuel)
        // 2. Refuel done when unit has 0 effective work hours
        // 3. Refuel ratio per HM exceeds standard limit
        const isWastefulVal = addedVal > recVal && (prevFuelVal > 0 || consVal > 0);
        const isZeroHmRefuelVal = effHoursVal === 0 && addedVal > 0;
        const isHighRatioVal = effHoursVal > 0 && ratioVal > stdLimitVal;
        const isAlertVal = isWastefulVal || isZeroHmRefuelVal || isHighRatioVal;

        const formattedDateVal = formatIndoDate(date);
        return {
          ...log,
          previousRemainingFuelLiters: prevFuelVal,
          fuelStandardLimit: stdLimitVal,
          fuelConsumptionLiters: consVal,
          recommendedRefuelLiters: recVal,
          remainingTankLiters: remVal,
          fuelRatio: ratioVal,
          isFuelAlert: isAlertVal,
          fuelAnalysisStatus: isAlertVal ? 'Tidak Normal (Indikasi Pemborosan)' : 'Normal',
          fuelAnalysisNote: isAlertVal
            ? `terjadi indikasi pemborosan seharusnya di tgl ${formattedDateVal} pengisiannya bukan ${addedVal} liter tapi sekitar ${recVal}liter saja karena masih ada akumulasi total sisa BBM ditangki sejumlah ${prevFuelVal} liter \t\tStatus Analisis = tidak normal`
            : `Normal: Pengisian ${addedVal} Liter sesuai kebutuhan jam kerja efektif. Status Analisis = normal`,
        };
      })
    );
  }, [date, selectedClientId, currentStep, getPreviousRemainingFuelForEquipment, equipments]);

  const handleItemRealizationChange = (itemId: string, val: number) => {
    setWorkItemEntries((prev) => {
      const next = prev.map((item) => (item.id === itemId ? { ...item, realizedDailyVolume: val } : item));
      
      // Hitung otomatis realizedAreaHa berdasarkan capaian item
      const haItems = next.filter((it) => it.unit.toUpperCase() === 'HA');
      if (haItems.length > 0) {
        const primaryHa = haItems[0]?.realizedDailyVolume || 0;
        setRealizedAreaHa(Number(primaryHa.toFixed(2)));
      } else {
        const avgPct = next.reduce((sum, it) => sum + (it.targetDailyVolume > 0 ? (it.realizedDailyVolume / it.targetDailyVolume) : 0), 0) / (next.length || 1);
        setRealizedAreaHa(Number((avgPct * targetAreaHa).toFixed(2)));
      }
      return next;
    });
  };

  const handleItemNotesChange = (itemId: string, note: string) => {
    setWorkItemEntries((prev) =>
      prev.map((item) => (item.id === itemId ? { ...item, notes: note } : item))
    );
  };

  // Step 5: Logistics & Parts
  const [tankInitial, setTankInitial] = useState<number>(() => {
    const inv = storageService.getInventory();
    const bbm = inv.find((i) => i.category === 'BBM');
    return bbm ? bbm.stockQuantity : 0;
  });
  const [tankInflow, setTankInflow] = useState<number>(0);
  const [oilEngine, setOilEngine] = useState<number>(0);
  const [oilHydraulic, setOilHydraulic] = useState<number>(0);
  const [oilTransmission, setOilTransmission] = useState<number>(0);
  const [greaseKg, setGreaseKg] = useState<number>(0);
  const [spareParts, setSpareParts] = useState<SparePartUsage[]>([]);
  const [newPartName, setNewPartName] = useState<string>('');
  const [newPartQty, setNewPartQty] = useState<number>(1);
  const [newPartUnit, setNewPartUnit] = useState<string>('Pcs');
  const [newPartCategory, setNewPartCategory] = useState<'Perawatan Rutin' | 'Perbaikan Kerusakan'>('Perawatan Rutin');
  const [newPartEquip, setNewPartEquip] = useState<string>('EX-01');

  // Step 6: Photos & Watermark
  const [photos, setPhotos] = useState<ReportPhoto[]>([]);
  const [supervisorGeneralNotes, setSupervisorGeneralNotes] = useState<string>(
    'Semua pekerjaan land clearing metode zero burning (tanpa bakar) terlaksana dengan baik sesuai SOP ramah lingkungan.'
  );
  const [isProcessingPhoto, setIsProcessingPhoto] = useState<boolean>(false);
  const [photoCategory, setPhotoCategory] = useState<ReportPhoto['category']>('Hasil Kerja Harian');
  const [photoCaption, setPhotoCaption] = useState<string>('Kondisi pembersihan lahan Blok AB sore hari');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Recalculate totals
  const totalFuelUsed = equipmentLogs.reduce((acc, l) => acc + (Number(l.fuelAddedLiters) || 0), 0);
  const tankRemaining = tankInitial + tankInflow - totalFuelUsed;

  const selectedClient = clients.find((c) => c.id === selectedClientId) || clients[0];
  const activeBlock = useMemo(() => {
    // Look in clientBlocks first, it's scoped to the selected client.
    const block = clientBlocks.find((b) => b.id === selectedBlockId);
    if (block) return block;

    // Fallback to allBlocks.
    return allBlocks.find((b) => b.id === selectedBlockId) || null;
  }, [allBlocks, selectedBlockId, clientBlocks]);
  const cumulativeAreaCalc = (activeBlock ? activeBlock.clearedAreaHa : 48.8) + (realizedAreaHa || 0);

  const averagePercentage = workItemEntries.length > 0
    ? Number((workItemEntries.reduce((acc, item) => {
        const targetVol = item.targetDailyVolume || 0;
        const realVol = item.realizedDailyVolume || 0;
        const pct = targetVol > 0 ? (realVol / targetVol) * 100 : 0;
        return acc + pct;
      }, 0) / workItemEntries.length).toFixed(1))
    : 0;

  const primaryHaItem = workItemEntries.find((it) => it.unit.toUpperCase() === 'HA');
  const primaryHaName = primaryHaItem ? primaryHaItem.name : "Lahan Utama";

  // Personil yang ditugaskan di lokasi kerja ini (berdasarkan Klien & Blok yang dipilih di Langkah 1)
  const locationWorkers = laborList.filter((item) => {
    const matchesWorkerClient = item.assignedClientId === selectedClientId || item.assignedClientId === 'ALL';
    const isBlockMatch = item.assignedBlockId === selectedBlockId || item.assignedBlockId === 'ALL' || !item.assignedBlockId;
    return matchesWorkerClient && isBlockMatch;
  });

  const baseLaborScopeList = (laborFilterScope === 'all' || locationWorkers.length === 0) ? laborList : locationWorkers;

  const activeAttendanceList = baseLaborScopeList.filter((item) => {
    if (laborFilterTeam !== 'ALL' && item.teamName !== laborFilterTeam) return false;
    if (laborSearchQuery.trim()) {
      const q = laborSearchQuery.toLowerCase();
      return (
        (item.workerName && item.workerName.toLowerCase().includes(q)) ||
        (item.role ? item.role.toLowerCase().includes(q) : false) ||
        (item.teamName && item.teamName.toLowerCase().includes(q))
      );
    }
    return true;
  });

  const statsHadir = baseLaborScopeList.filter((l) => l.status === 'Hadir').length;
  const statsIzin = baseLaborScopeList.filter((l) => l.status === 'Izin').length;
  const statsSakit = baseLaborScopeList.filter((l) => l.status === 'Sakit').length;
  const statsAlpa = baseLaborScopeList.filter((l) => l.status === 'Alpa').length;

  const handleQuickAddClient = () => {
    if (isSupervisor) {
      alert('Akses Ditolak: Pengawas dilarang menambah klien baru. Penempatan proyek klien ditetapkan oleh Superadmin di Manajemen User.');
      return;
    }
    if (!newClientShortName || !newClientFullName) {
      return;
    }
    const newClient: Client = {
      id: `client-${Date.now()}`,
      name: newClientShortName,
      fullCompanyName: newClientFullName,
      contractNumber: newClientContract || `SPK-LC/${newClientShortName.replace(/\s+/g, '')}/2026`,
      projectName: `Land Clearing Perkebunan ${newClientShortName}`,
      location: newClientLocation,
      address: newClientLocation,
      contactPerson: 'PIC Lapangan',
      phone: '-',
      totalAreaHa: newClientAreaHa,
      clearedAreaHa: 0,
      status: 'Aktif',
    };
    storageService.saveClient(newClient);
    const updatedClients = storageService.getClients();
    setClients(updatedClients);
    setSelectedClientId(newClient.id);

    // Also auto add a primary block for this new client
    const newBlock: Block = {
      id: `blk-${Date.now()}`,
      projectId: `proj-${newClient.id}`,
      clientId: newClient.id,
      code: `Blok 01 (${newClient.name})`,
      targetAreaHa: newClientAreaHa,
      clearedAreaHa: 0,
      status: 'Dalam Pengerjaan',
    };
    storageService.saveBlock(newBlock);
    const updatedBlocks = storageService.getBlocks();
    setAllBlocks(updatedBlocks);
    setSelectedBlockId(newBlock.id);

    setShowQuickAddClient(false);
    setNewClientShortName('');
    setNewClientFullName('');
    setNewClientContract('');
  };

  const handleQuickAddBlock = () => {
    if (isSupervisor) {
      alert('Akses Ditolak: Pengawas dilarang menambah blok baru. Penambahan blok kerja operasional hanya dapat ditentukan oleh Superadmin.');
      return;
    }
    if (!newBlockCode) {
      return;
    }
    const newBlock: Block = {
      id: `blk-${Date.now()}`,
      projectId: `proj-${selectedClientId}`,
      clientId: selectedClientId,
      code: newBlockCode,
      targetAreaHa: newBlockTargetHa,
      clearedAreaHa: 0,
      status: 'Dalam Pengerjaan',
    };
    storageService.saveBlock(newBlock);
    const updated = storageService.getBlocks();
    setAllBlocks(updated);
    setSelectedBlockId(newBlock.id);
    setShowQuickAddBlock(false);
    setNewBlockCode('');
  };

  // Recalculate equipment log row when inputs change
  const updateEquipmentRow = (index: number, updates: Partial<EquipmentWorkLog>) => {
    setEquipmentLogs((prev) => {
      const next = [...prev];
      const row = { ...next[index], ...updates };

      // 1. Calculate Total HM Buka
      const hmStart = Number(row.hmStart) || 0;
      const hmEnd = Number(row.hmEnd) || 0;
      row.totalHm = Math.max(0, Number((hmEnd - hmStart).toFixed(1)));

      // 2. Calculate Effective Hours (Jam Efektif - Submenu 3)
      const dwWeather = Number(row.downtimeWeatherHours) || 0;
      const dwBreak = Number(row.downtimeBreakdownHours) || 0;
      const dwOther = Number(row.downtimeOtherHours) || 0;
      const totalDowntimeVal = dwWeather + dwBreak + dwOther;
      row.effectiveWorkHours = Math.max(0, Number((row.totalHm - totalDowntimeVal).toFixed(1)));

      // 3. Batas Standar (L/HM) dari Master Data Proyek
      const eqMaster = equipments.find((e) => e.id === row.equipmentId || e.name === row.equipmentName);
      if (eqMaster?.standardFuelRatio && updates.fuelStandardLimit === undefined && !row.fuelStandardLimit) {
        row.fuelStandardLimit = eqMaster.standardFuelRatio;
      }
      const unitStdLimit = Number(row.fuelStandardLimit) || 18.0;

      // 4. Konsumsi Hari ini (Liter) = Jam Efektif * Batas Standar
      row.fuelConsumptionLiters = Number((row.effectiveWorkHours * unitStdLimit).toFixed(1));

      // 5. Sisa BBM di tangki kemarin (Sisa Awal Tangki)
      let unitPrevTank = Number(row.previousRemainingFuelLiters) || 0;
      if (unitPrevTank === 0) {
        unitPrevTank = getPreviousRemainingFuelForEquipment(row.equipmentId, date, selectedClientId, row.equipmentName);
      }
      row.previousRemainingFuelLiters = unitPrevTank;

      // 6. Pengisian Hari ini (Liter)
      const fuelAddedVal = Number(row.fuelAddedLiters) || 0;

      // 7. Rekomendasi pengisian seharusnya = Math.max(0, Konsumsi - Sisa Kemarin)
      row.recommendedRefuelLiters = Math.max(0, Number((row.fuelConsumptionLiters - unitPrevTank).toFixed(1)));

      // 8. Sisa BBM di tangki unit hari ini = Sisa Kemarin + Pengisian - Konsumsi
      row.remainingTankLiters = Number((unitPrevTank + fuelAddedVal - row.fuelConsumptionLiters).toFixed(1));

      // 9. Calculate Fuel Ratio (L/HM)
      if (row.effectiveWorkHours > 0 && fuelAddedVal > 0) {
        row.fuelRatio = Number((fuelAddedVal / row.effectiveWorkHours).toFixed(2));
      } else {
        row.fuelRatio = 0;
      }

      // 10. Status Analisis Real-Time
      // Indikasi pemborosan apabila:
      // a. Pengisian (fuelAddedVal) melebihi rekomendasi kebutuhan riil (Konsumsi - Sisa Kemarin)
      // b. Pengisian dilakukan saat jam kerja efektif 0 HM
      // c. Rasio pengisian per HM melebihi batas standar efisiensi proyek
      const isWastefulVal = fuelAddedVal > row.recommendedRefuelLiters && (unitPrevTank > 0 || row.fuelConsumptionLiters > 0);
      const isZeroHmRefuelVal = row.effectiveWorkHours === 0 && fuelAddedVal > 0;
      const isHighRatioVal = row.effectiveWorkHours > 0 && row.fuelRatio > unitStdLimit;
      const isAlertVal = isWastefulVal || isZeroHmRefuelVal || isHighRatioVal;

      row.isFuelAlert = isAlertVal;
      row.fuelAnalysisStatus = isAlertVal ? 'Tidak Normal (Indikasi Pemborosan)' : 'Normal';
      const formattedDateStr = formatIndoDate(date);
      if (isAlertVal) {
        row.fuelAnalysisNote = `terjadi indikasi pemborosan seharusnya di tgl ${formattedDateStr} pengisiannya bukan ${fuelAddedVal} liter tapi sekitar ${row.recommendedRefuelLiters}liter saja karena masih ada akumulasi total sisa BBM ditangki sejumlah ${unitPrevTank} liter \t\tStatus Analisis = tidak normal`;
      } else {
        row.fuelAnalysisNote = `Normal: Pengisian ${fuelAddedVal} Liter sesuai kebutuhan jam kerja efektif (${row.effectiveWorkHours} Jam × ${unitStdLimit} L/HM = ${row.fuelConsumptionLiters} L). Sisa BBM di tangki ${row.remainingTankLiters} Liter. Status Analisis = normal`;
      }

      next[index] = row;
      return next;
    });
  };

  const addEquipmentToLog = (eqId: string) => {
    const eq = equipments.find((e) => e.id === eqId);
    if (!eq || equipmentLogs.some((l) => l.equipmentId === eqId)) return;
    const prevTankAdded = getPreviousRemainingFuelForEquipment(eq.id, date, selectedClientId, eq.name);
    const stdLimitAdded = eq.standardFuelRatio || 18.0;
    const defaultEffVal = 8.0;
    const consAdded = Number((defaultEffVal * stdLimitAdded).toFixed(1));
    const recAdded = Math.max(0, Number((consAdded - prevTankAdded).toFixed(1)));
    const initialAddVal = recAdded > 0 ? recAdded : 100;

    setEquipmentLogs((prev) => [
      ...prev,
      {
        equipmentId: eq.id,
        equipmentName: eq.name,
        type: eq.type + ' ' + eq.model,
        hmStart: eq.currentHm,
        hmEnd: eq.currentHm + 8.0,
        totalHm: 8.0,
        downtimeWeatherHours: 0,
        downtimeWeatherNote: '',
        downtimeBreakdownHours: 0,
        downtimeBreakdownNote: '',
        downtimeOtherHours: 0,
        downtimeOtherNote: '',
        effectiveWorkHours: defaultEffVal,
        fuelAddedLiters: initialAddVal,
        fuelHmAtRefuel: eq.currentHm + 8.0,
        fuelRatio: Number((initialAddVal / defaultEffVal).toFixed(2)),
        fuelStandardLimit: stdLimitAdded,
        isFuelAlert: false,
        previousRemainingFuelLiters: prevTankAdded,
        fuelConsumptionLiters: consAdded,
        recommendedRefuelLiters: recAdded,
        remainingTankLiters: Number((prevTankAdded + initialAddVal - consAdded).toFixed(1)),
        fuelAnalysisStatus: 'Normal',
        fuelAnalysisNote: 'Normal: Pengisian sesuai kebutuhan jam kerja efektif.',
      },
    ]);
  };

  const [wizardDeleteConfirm, setWizardDeleteConfirm] = useState<{
    title: string;
    description: string;
    onConfirm: () => void;
  } | null>(null);

  const removeEquipmentFromLog = (index: number) => {
    setWizardDeleteConfirm({
      title: 'Hapus Unit Alat Berat?',
      description: 'Apakah Anda yakin ingin menghapus unit alat berat ini dari draf laporan harian?',
      onConfirm: () => {
        setEquipmentLogs((prev) => prev.filter((_, i) => i !== index));
      },
    });
  };

  // Quick attend all for active scope and team
  const markAllPresent = () => {
    const targetIds = new Set(activeAttendanceList.map((w) => w.workerId));
    setLaborList((prev) =>
      prev.map((item) => {
        if (targetIds.has(item.workerId)) {
          return { ...item, status: 'Hadir' };
        }
        return item;
      })
    );
  };

  // Photo Upload with GPS & Date Watermarking
  const handlePhotoSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setIsProcessingPhoto(true);
    try {
      const blockCode = activeBlock?.code || 'Blok AB';
      const clientName = selectedClient?.name || 'PT. A';
      const newItems: ReportPhoto[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const watermarked = await applyWatermark(file, {
          blockCode,
          category: photoCategory,
          companyName: 'PT. RBS GROUP',
          clientName: clientName,
        });

        newItems.push({
          id: `p-${Date.now()}-${i}`,
          category: photoCategory,
          caption: photoCaption || `Foto Lapangan ${photoCategory} (${file.name || `File ${i + 1}`})`,
          dataUrl: watermarked.dataUrl,
          gpsCoordinates: {
            lat: watermarked.lat,
            lng: watermarked.lng,
          },
          timestamp: watermarked.timestamp,
          blockCode,
        });
      }

      setPhotos((prev) => [...prev, ...newItems]);
      setPhotoCaption('');
    } catch (err) {
      console.error('Failed to watermark photo:', err);
      alert('Gagal memproses watermark foto. Silakan coba lagi.');
    } finally {
      setIsProcessingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSimulateAddPhoto = async () => {
    setIsProcessingPhoto(true);
    try {
      const blockCode = activeBlock?.code || 'Blok AB';
      const gps = await getCurrentGpsLocation();

      // Create synthetic canvas for simulation
      const c = document.createElement('canvas');
      c.width = 800;
      c.height = 500;
      const ctx = c.getContext('2d');
      if (ctx) {
        ctx.fillStyle = photoCategory === 'Kerusakan Alat / Spare Part' ? '#7f1d1d' : '#14532d';
        ctx.fillRect(0, 0, 800, 500);
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 24px sans-serif';
        ctx.fillText(`FOTO DOKUMENTASI ${photoCategory.toUpperCase()}`, 40, 240);
      }
      const rawDataUrl = c.toDataURL('image/jpeg');

      const watermarked = await applyWatermark(rawDataUrl, {
        blockCode,
        category: photoCategory,
        customCoordinates: gps,
      });

      setPhotos((prev) => [
        ...prev,
        {
          id: `p-${Date.now()}`,
          category: photoCategory,
          caption: photoCaption || `Dokumentasi Lapangan ${photoCategory}`,
          dataUrl: watermarked.dataUrl,
          gpsCoordinates: gps,
          timestamp: watermarked.timestamp,
          blockCode,
        },
      ]);
    } catch (err) {
      console.error('Error simulating photo:', err);
    } finally {
      setIsProcessingPhoto(false);
    }
  };

  const removePhoto = (id: string) => {
    setWizardDeleteConfirm({
      title: 'Hapus Foto Lampiran?',
      description: 'Apakah Anda yakin ingin menghapus foto terlampir ini dari draf laporan harian?',
      onConfirm: () => {
        setPhotos((prev) => prev.filter((p) => p.id !== id));
      },
    });
  };

  const addSparePartItem = () => {
    if (!newPartName) return;
    setSpareParts((prev) => [
      ...prev,
      {
        id: `sp-${Date.now()}`,
        partName: newPartName,
        quantity: newPartQty,
        unit: newPartUnit,
        serviceCategory: newPartCategory,
        equipmentId: newPartEquip,
      },
    ]);
    setNewPartName('');
    setNewPartQty(1);
  };

  const removeSparePartItem = (id: string) => {
    setWizardDeleteConfirm({
      title: 'Hapus Pemakaian Suku Cadang?',
      description: 'Apakah Anda yakin ingin menghapus pemakaian spare part / suku cadang ini?',
      onConfirm: () => {
        setSpareParts((prev) => prev.filter((sp) => sp.id !== id));
      },
    });
  };

  // Submit Handler
  const handleSubmitReport = async (asDraft: boolean = false) => {
    // Strict RBAC check for Pengawas: can only report for assigned client & assigned blocks
    if (isSupervisor) {
      if (selectedClient && authUser?.assignedClientId && authUser.assignedClientId !== 'all') {
        if (selectedClient.id !== authUser.assignedClientId) {
          alert('Akses Ditolak: Anda tidak memiliki wewenang untuk membuat laporan di luar penugasan proyek PT Anda!');
          return;
        }
      }
      if (assignedBlockCodes && assignedBlockCodes.length > 0) {
        const isMatched = activeBlock && assignedBlockCodes.some(b => {
          const clean = (b || '').trim().toLowerCase();
          const activeCode = (activeBlock.code || '').trim().toLowerCase();
          return clean && activeCode && (activeCode.includes(clean) || clean.includes(activeCode));
        });
        if (!isMatched) {
          alert(`Akses Ditolak: Anda hanya ditugaskan pada lokasi kerja (${assignedBlockCodes.join(', ')}). Tidak berwenang membuat laporan untuk ${activeBlock?.code || 'blok ini'}!`);
          return;
        }
      }
    }

    const reportId = crypto.randomUUID(); // Unique ID for every new report

    const newReport: DailyReport = {
      id: reportId,
      reportNumber,
      date,
      clientId: selectedClient ? selectedClient.id : 'client-1',
      clientName: selectedClient ? selectedClient.name : 'PT. A',
      contractNumber: selectedClient ? selectedClient.contractNumber : '045/SPK-LC/PTA/VI/2026',
      projectName: selectedClient ? selectedClient.projectName : 'Land Clearing Perkebunan PT. A',
      blockId: selectedBlockId,
      blockCode: activeBlock ? activeBlock.code : 'Blok Utama',
      weather,
      weatherStartTime: weatherStartTime.trim() || undefined,
      weatherEndTime: weatherEndTime.trim() || undefined,
      weatherNotes: sanitizeInput(weatherNotes),
      effectiveWorkShift: workShift,
      supervisorId: 'w-8',
      supervisorName,
      physicalProgress: {
        targetAreaHa,
        realizedAreaHa,
        cumulativeAreaHa: Number(cumulativeAreaCalc.toFixed(2)),
        progressPercentage: Number(((cumulativeAreaCalc / (activeBlock?.targetAreaHa || 100)) * 100).toFixed(2)),
        notes: sanitizeInput(progressNotes),
        directorTargetId: directorTarget?.id,
        directorNotes: directorTarget?.notes,
        itemProgress: workItemEntries.map((it) => ({
          itemName: it.name,
          unit: it.unit,
          targetDailyVolume: it.targetDailyVolume,
          realizedDailyVolume: it.realizedDailyVolume,
          achievementPercentage: it.targetDailyVolume > 0
            ? Number(((it.realizedDailyVolume / it.targetDailyVolume) * 100).toFixed(1))
            : 100,
          notes: sanitizeInput(it.notes || ''),
        })),
      },
      equipmentWorkLogs: equipmentLogs,
      laborAbsences: laborList,
      logistics: {
        fuelTankInitialLiters: tankInitial,
        fuelTankInflowLiters: tankInflow,
        fuelTankUsedLiters: totalFuelUsed,
        fuelTankRemainingLiters: tankRemaining,
        oilEngineLiters: oilEngine,
        oilHydraulicLiters: oilHydraulic,
        oilTransmissionLiters: oilTransmission,
        greaseKg,
        sparePartsUsed: spareParts,
      },
      photos,
      supervisorGeneralNotes: sanitizeInput(supervisorGeneralNotes),
      status: asDraft ? 'Draft' : 'Diajukan',
      signatures: {
        supervisor: {
          name: supervisorName,
          signedAt: `${date} 17:30 WIB`,
          status: 'Signed',
        },
        siteManager: { name: 'Bambang Sugiarto, S.P.', status: 'Pending' },
        director: {
          name: storageService.getCompanyStaff().find((s) => s.userLevel === 'Superadmin' || s.staffLevel === 'Direktur' || (s.jobRole || '').toLowerCase().includes('direktur'))?.fullName || 'Direktur Utama',
          status: 'Pending',
        },
      },
      syncStatus: isOnline ? 'synced' : 'offline_draft',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      const savedReport = await storageService.saveReport(newReport);
      onReportSaved(savedReport);
    } catch (error) {
      console.error('Failed to save report:', error);
      // Assuming showToast is available in scope or needs to be handled
      // showToast('Gagal menyimpan laporan. Silakan coba lagi.', 'error');
    } finally {
      resetForm();
    }
  };

  const resetForm = () => {
    setCurrentStep(1);
    setReportNumber(`LC-RPT/${new Date().toISOString().slice(0, 10).replace(/-/g, '/')}-00${Math.floor(Math.random() * 80 + 10)}`);
    setDate(new Date().toISOString().split('T')[0]);
    setWeather('Cerah');
    setWeatherStartTime('08.00');
    setWeatherEndTime('14.15');
    setWeatherNotes('');
    setWorkShift('07.00 - 17.00 WIB');
    setSupervisorName(authUser?.displayName || 'Budi Santoso');
    
    const savedEquipsReset = storageService.getEquipments();
    const currentDateReset = new Date().toISOString().split('T')[0];
    setEquipmentLogs(savedEquipsReset.map((eq) => {
        const prevTankReset = getPreviousRemainingFuelForEquipment(eq.id, currentDateReset, effectiveClientId, eq.name);
        const stdLimitReset = eq.standardFuelRatio || 18.0;
        return {
            equipmentId: eq.id,
            equipmentName: eq.name,
            type: eq.type,
            hmStart: eq.currentHm || 0,
            hmEnd: eq.currentHm || 0,
            totalHm: 0,
            downtimeWeatherHours: 0,
            downtimeWeatherNote: '',
            downtimeBreakdownHours: 0,
            downtimeBreakdownNote: '',
            downtimeOtherHours: 0,
            downtimeOtherNote: '',
            effectiveWorkHours: 0,
            fuelAddedLiters: 0,
            fuelHmAtRefuel: eq.currentHm || 0,
            fuelRatio: 0,
            fuelStandardLimit: stdLimitReset,
            isFuelAlert: false,
            previousRemainingFuelLiters: prevTankReset,
            fuelConsumptionLiters: 0,
            remainingTankLiters: prevTankReset,
            recommendedRefuelLiters: 0,
            fuelAnalysisStatus: 'Normal',
            fuelAnalysisNote: 'Normal: Pengisian sesuai kebutuhan jam kerja efektif.',
        };
    }));
    setLaborList(allWorkers.map((w) => ({
      workerId: w.id,
      workerName: w.name,
      category: w.category,
      role: w.role,
      status: 'Hadir',
      teamName: w.teamName || 'Tim Operator Alat Berat',
      assignedClientId: w.assignedClientId || 'ALL',
      assignedBlockId: w.assignedBlockId || 'ALL',
      notes: '',
    })));
    setPhotos([]);
    setSpareParts([]);
    setSupervisorGeneralNotes('Semua pekerjaan land clearing metode zero burning (tanpa bakar) terlaksana dengan baik sesuai SOP ramah lingkungan.');
  };

  if (userRole === 'director') {
    return (
      <div className="max-w-3xl mx-auto py-12 px-4">
        <div className="bg-white rounded-2xl p-8 border border-slate-200 shadow-xl text-center space-y-4">
          <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-full flex items-center justify-center mx-auto">
            <ShieldCheck className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-black text-slate-900">
            Akses Input Khusus Pengawas Lapangan
          </h2>
          <p className="text-sm text-slate-600 max-w-lg mx-auto leading-relaxed">
            Sesuai Standard Operating Procedure (SOP) PT. RBS GROUP, Direktur tidak melakukan penginputan Laporan Harian Operasional Proyek. Penginputan dilakukan secara langsung di lapangan oleh Pengawas Lapangan.
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Sebagai Direktur, Anda berwenang melakukan pengawasan, verifikasi, serta menyetujui atau menolak laporan melalui menu <strong>Rekap Laporan</strong>.
          </p>
          <div className="pt-4 flex justify-center gap-3">
            {onNavigateToReports && (
              <button
                type="button"
                onClick={onNavigateToReports}
                className="px-6 py-3 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition cursor-pointer flex items-center gap-2"
              >
                <ChevronRight className="w-4 h-4" />
                <span>Buka Menu Rekapitulasi Laporan</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (clients.length === 0) {
    return (
      <div className="max-w-xl mx-auto py-12 px-4 sm:px-6">
        <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center space-y-4 shadow-sm">
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 flex items-center justify-center mx-auto">
            <AlertTriangle className="w-6 h-6 animate-pulse" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-900">Belum Ada Proyek Aktif Terdaftar</h3>
            <p className="text-xs text-slate-500 leading-relaxed">
              Formulir Laporan Harian Pengawas memerlukan minimal satu SPK Klien / Blok Kerja terdaftar dalam sistem. Silakan hubungi Direktur atau Administrator untuk menambahkan data SPK baru di menu Master Data.
            </p>
          </div>
          <div className="pt-2 flex justify-center gap-3">
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-4 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition cursor-pointer"
              >
                Kembali ke Halaman Utama
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto py-6 px-3 sm:px-6">
      {/* Wizard Header & Stepper */}
      <div className="bg-slate-900 text-white rounded-2xl p-4 sm:p-6 shadow-xl border border-slate-800 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider bg-amber-500 text-slate-950">
                Formulir Pengawas Lapangan
              </span>
              <span className="text-xs text-slate-400 font-mono">{reportNumber}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-slate-100 mt-1">
              Laporan Harian Operasional Proyek
            </h2>
            <p className="text-xs text-slate-400">
              Metode Zero Burning (Tanpa Bakar)
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onNavigateToTools && userRole === 'supervisor' && (
              <button
                type="button"
                onClick={onNavigateToTools}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 rounded-lg shadow-sm transition-all duration-200 cursor-pointer"
                title="Buka Fitur Cepat Pengawas: P2H, Solar Keliling & Log K3"
              >
                <HardHat className="w-3.5 h-3.5" />
                <span>Fitur Cepat</span>
              </button>
            )}
            <button
              type="button"
              onClick={() => handleSubmitReport(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg border border-slate-700 transition"
              title="Simpan sementara di penyimpanan HP/laptop"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan Draft</span>
            </button>
            {onCancel && (
              <button
                type="button"
                onClick={onCancel}
                className="px-3 py-1.5 text-xs font-semibold text-slate-400 hover:text-white rounded-lg"
              >
                Batal
              </button>
            )}
          </div>
        </div>

        {/* Stepper Navigation */}
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mt-4">
          {STEPS.map((step) => {
            const Icon = step.icon;
            const isDone = currentStep > step.id;
            const isCurrent = currentStep === step.id;

            return (
              <button
                key={step.id}
                type="button"
                onClick={() => setCurrentStep(step.id)}
                className={`flex flex-col items-center text-center p-2 rounded-xl transition border ${
                  isCurrent
                    ? 'bg-amber-500 text-slate-950 border-amber-400 font-bold shadow-md'
                    : isDone
                    ? 'bg-slate-800 text-emerald-400 border-emerald-500/40 font-medium hover:bg-slate-700'
                    : 'bg-slate-800/50 text-slate-400 border-slate-800 hover:bg-slate-800'
                }`}
              >
                <div className="flex items-center gap-1">
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="text-xs">{step.id}</span>
                  {isDone && <Check className="w-3 h-3 text-emerald-400" />}
                </div>
                <span className="text-[11px] font-semibold mt-1 truncate max-w-full">{step.title}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* FORM BODY CONTAINER */}
      <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        
        {/* ========================================================================= */}
        {/* LANGKAH 1: INFORMASI PROYEK & CUACA */}
        {/* ========================================================================= */}
        {currentStep === 1 && (
          <div className="p-6 space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-amber-500" />
                Langkah 1: Informasi Proyek & Cuaca Lapangan
              </h3>
              <p className="text-xs text-slate-500">
                Pilih tanggal kerja, blok penugasan, serta kondisi cuaca real-time di area perkebunan.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Multi-Client Selection Card */}
              <div className="col-span-1 sm:col-span-2 p-3.5 bg-amber-50/80 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black text-amber-950 uppercase tracking-wider flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-amber-600" />
                    {isSupervisor ? 'Penempatan Proyek Klien (Terkunci Sesuai Tugas)' : 'Pilih Klien (Perusahaan Pemilik Lahan)'}
                  </label>
                  {!isSupervisor && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddClient(true)}
                      className="text-xs font-bold text-amber-800 hover:text-amber-950 underline flex items-center gap-1 cursor-pointer"
                    >
                      + Tambah PT Klien Baru
                    </button>
                  )}
                </div>

                {isSupervisor ? (
                  <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-amber-400">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-800 flex items-center justify-center shrink-0">
                        <Lock className="w-4 h-4 text-amber-600" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {selectedClient?.name} — {selectedClient?.fullCompanyName}
                        </div>
                        <div className="text-[11px] text-slate-500 font-medium">
                          Terkunci otomatis: Pengawas hanya bertugas mengawasi 1 Klien PT ini.
                        </div>
                      </div>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300">
                      Penugasan Superadmin
                    </span>
                  </div>
                ) : (
                  <select
                    value={selectedClientId}
                    onChange={(e) => {
                      const newClientId = e.target.value;
                      const matchingBlocks = allBlocks.filter((b) => b.clientId === newClientId);
                      setSelectedClientId(newClientId);
                      if (matchingBlocks.length > 0) {
                        setSelectedBlockId(matchingBlocks[0].id);
                      } else {
                        setSelectedBlockId('');
                      }
                    }}
                    className="w-full px-3 py-2 bg-white border border-amber-400 rounded-lg text-sm font-bold text-slate-900 focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  >
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} - {c.fullCompanyName} (SPK: {c.contractNumber})
                      </option>
                    ))}
                  </select>
                )}

                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-700 pt-1">
                  <div>Proyek: <strong className="text-slate-900">{selectedClient?.projectName}</strong></div>
                  <div>No. SPK: <strong className="font-mono text-slate-900">{selectedClient?.contractNumber}</strong></div>
                  <div>Lokasi: <strong className="text-slate-900">{selectedClient?.location || selectedClient?.address}</strong></div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Tanggal Laporan
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nomor Laporan Dokumen
                </label>
                <input
                  type="text"
                  value={reportNumber}
                  onChange={(e) => setReportNumber(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-800 bg-slate-50 focus:outline-none"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Lokasi Kerja (Pilih Blok {selectedClient?.name})
                  </label>
                  {!isSupervisor && (
                    <button
                      type="button"
                      onClick={() => setShowQuickAddBlock(true)}
                      className="text-[11px] font-bold text-blue-600 hover:text-blue-800 underline cursor-pointer"
                    >
                      + Tambah Blok
                    </button>
                  )}
                </div>
                <select
                  value={selectedBlockId}
                  onChange={(e) => setSelectedBlockId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-semibold focus:ring-2 focus:ring-amber-500 focus:outline-none"
                >
                  {clientBlocks.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.code} (Target Total: {b.targetAreaHa} Ha | Sudah Selesai: {b.clearedAreaHa} Ha)
                    </option>
                  ))}
                  {clientBlocks.length === 0 && (
                    <option value="" disabled>Belum ada blok terdaftar untuk {selectedClient?.name}</option>
                  )}
                </select>
                {isSupervisor && assignedBlockCodes && (
                  <div className="text-[10px] text-amber-800 font-bold mt-1 flex items-center gap-1">
                    <span>📍 Blok Penugasan Resmi:</span>
                    <span className="font-mono bg-amber-100 px-1.5 py-0.2 rounded">{assignedBlockCodes.join(', ')}</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Pengawas Lapangan (Mandor)
                </label>
                <input
                  type="text"
                  value={supervisorName}
                  onChange={(e) => setSupervisorName(e.target.value)}
                  readOnly={isSupervisor}
                  className={`w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:outline-none ${
                    isSupervisor ? 'bg-slate-100 text-slate-800 font-bold cursor-not-allowed' : 'focus:ring-2 focus:ring-amber-500'
                  }`}
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Shift / Jam Efektif Kerja
                </label>
                <input
                  type="text"
                  value={workShift}
                  onChange={(e) => setWorkShift(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm font-medium focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  placeholder="07.00 - 17.00 WIB"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Metode Pekerjaan Land Clearing
                </label>
                <div className="p-2.5 bg-emerald-50 border border-emerald-300 rounded-lg text-xs space-y-0.5">
                  <div className="font-bold text-emerald-900">Zero Burning Method (Tanpa Bakar)</div>
                  <div className="text-emerald-700">Rabas semak, potong cincang kayu, perumpukan jalur mekanis ramah lingkungan.</div>
                </div>
              </div>
            </div>

            {/* Modal Quick Add Client */}
            {showQuickAddClient && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    + Tambah Klien Perkebunan Baru
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">Nama Singkat Klien (Contoh: PT. C, PT. E)</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. C"
                        value={newClientShortName}
                        onChange={(e) => setNewClientShortName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">Nama Perusahaan Lengkap</label>
                      <input
                        type="text"
                        placeholder="Contoh: PT. CITRA SAWIT MAKMUR"
                        value={newClientFullName}
                        onChange={(e) => setNewClientFullName(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">Nomor Kontrak / SPK</label>
                      <input
                        type="text"
                        placeholder="Contoh: 019/SPK-LC/CSM/IX/2026"
                        value={newClientContract}
                        onChange={(e) => setNewClientContract(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5">Target Luas (Ha)</label>
                        <input
                          type="number"
                          value={newClientAreaHa}
                          onChange={(e) => setNewClientAreaHa(parseFloat(e.target.value) || 0)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                        />
                      </div>
                      <div>
                        <label className="block font-bold text-slate-700 mb-0.5">Lokasi Perkebunan</label>
                        <input
                          type="text"
                          value={newClientLocation}
                          onChange={(e) => setNewClientLocation(e.target.value)}
                          className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddClient(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddClient}
                      className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow"
                    >
                      Simpan Klien Baru
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Modal Quick Add Block */}
            {showQuickAddBlock && (
              <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-3">
                  <h4 className="text-sm font-black text-slate-900 uppercase tracking-wide">
                    + Tambah Blok Kerja untuk {selectedClient?.name}
                  </h4>
                  <div className="space-y-2 text-xs">
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">Kode / Nama Blok</label>
                      <input
                        type="text"
                        placeholder="Contoh: Blok B-03 atau Blok AF"
                        value={newBlockCode}
                        onChange={(e) => setNewBlockCode(e.target.value)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-bold"
                      />
                    </div>
                    <div>
                      <label className="block font-bold text-slate-700 mb-0.5">Target Luas Blok (Ha)</label>
                      <input
                        type="number"
                        value={newBlockTargetHa}
                        onChange={(e) => setNewBlockTargetHa(parseFloat(e.target.value) || 0)}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-xs font-mono font-bold"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setShowQuickAddBlock(false)}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold"
                    >
                      Batal
                    </button>
                    <button
                      type="button"
                      onClick={handleQuickAddBlock}
                      className="px-4 py-1.5 text-xs bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg shadow"
                    >
                      Simpan Blok
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Cuaca Selection & Rentang Jam Operasional Cuaca */}
            <div className="bg-slate-50/80 border border-slate-200 rounded-2xl p-4 sm:p-5 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1 border-b border-slate-200/80 pb-3">
                <div>
                  <label className="block text-xs font-black text-slate-800 uppercase tracking-wider">
                    Kondisi Cuaca Hari Ini & Jam Terjadi
                  </label>
                  <p className="text-[11px] text-slate-500">
                    Pilih kondisi cuaca utama dan masukkan rentang waktu jam mulai s/d selesai agar rincian downtime & efisiensi kerja lebih jelas.
                  </p>
                </div>
                {weatherStartTime && weatherEndTime && (
                  <span className="self-start sm:self-auto px-2.5 py-1 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg text-[11px] font-bold">
                    {weather} ({weatherStartTime} - {weatherEndTime} WIB)
                  </span>
                )}
              </div>

              {/* 1. Grid Pilihan Kondisi Cuaca */}
              <div>
                <span className="block text-[11px] font-bold text-slate-600 mb-2">1. Pilih Status Kondisi Cuaca:</span>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                  {(['Cerah', 'Gerimis', 'Hujan Lebat', 'Banjir', 'Cerah - Hujan Sore'] as WeatherCondition[]).map((w) => {
                    const isSelected = weather === w;
                    return (
                      <button
                        key={w}
                        type="button"
                        onClick={() => setWeather(w)}
                        className={`p-3 rounded-xl border text-center font-bold text-xs flex flex-col items-center justify-center gap-1.5 transition cursor-pointer ${
                          isSelected
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-md ring-2 ring-amber-300'
                            : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {w === 'Cerah' ? (
                          <Sun className="w-5 h-5 text-amber-600" />
                        ) : (
                          <CloudRain className="w-5 h-5 text-blue-600" />
                        )}
                        <span>{w}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* 2. Input Manual Rentang Waktu (Mulai Jam - Sampai Jam) */}
              <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
                <span className="block text-[11px] font-bold text-slate-700">2. Input Manual Jam Cuaca:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Mulai Jam</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={weatherStartTime}
                        onChange={(e) => setWeatherStartTime(e.target.value)}
                        placeholder="Contoh: 08.00"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">WIB</span>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-amber-600" />
                      <span>Sampai Jam</span>
                    </label>
                    <div className="relative">
                      <input
                        type="text"
                        value={weatherEndTime}
                        onChange={(e) => setWeatherEndTime(e.target.value)}
                        placeholder="Contoh: 14.15"
                        className="w-full px-3 py-2 text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 focus:bg-white text-slate-900"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] text-slate-400 font-bold">WIB</span>
                    </div>
                  </div>
                </div>

                {/* Tombol Preset Cepat */}
                <div className="flex flex-wrap items-center gap-1.5 pt-1">
                  <span className="text-[10px] text-slate-500 font-semibold mr-1">Preset Cepat:</span>
                  {[
                    { label: '08.00 - 14.15', start: '08.00', end: '14.15' },
                    { label: '07.00 - 12.00', start: '07.00', end: '12.00' },
                    { label: '13.00 - 17.00', start: '13.00', end: '17.00' },
                    { label: '07.00 - 17.00 (Shift Penuh)', start: '07.00', end: '17.00' },
                  ].map((p) => (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => {
                        setWeatherStartTime(p.start);
                        setWeatherEndTime(p.end);
                      }}
                      className="px-2.5 py-1 bg-slate-100 hover:bg-amber-100 hover:text-amber-900 text-slate-700 rounded-lg text-[10px] font-bold transition border border-slate-200 cursor-pointer"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>

                {/* Catatan Tambahan Cuaca (Opsional) */}
                <div className="pt-2 border-t border-slate-100">
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">
                    Catatan Rincian Cuaca / Perubahan Lapangan (Opsional):
                  </label>
                  <input
                    type="text"
                    value={weatherNotes}
                    onChange={(e) => setWeatherNotes(e.target.value)}
                    placeholder="Contoh: Cerah berawan di pagi hari, mulai 14.30 gerimis ringan di Blok AA"
                    className="w-full px-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-amber-500/50 text-slate-800"
                  />
                </div>

                {/* Live Preview Summary Box */}
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2.5">
                  <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-800">
                    <p className="font-bold text-amber-950">
                      Rangkuman Cuaca: <span className="underline">{weather}</span> {weatherStartTime && weatherEndTime ? `mulai jam ${weatherStartTime} sampai jam ${weatherEndTime} WIB` : '(rentang jam belum diisi)'}
                    </p>
                    {weatherNotes ? (
                      <p className="text-[11px] text-slate-600 mt-0.5 italic">
                        "{weatherNotes}"
                      </p>
                    ) : (
                      <p className="text-[10px] text-slate-500 mt-0.5">
                        Keterangan detail rentang waktu cuaca ini akan tercetak otomatis pada Laporan Harian resmi & PDF.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 2: ABSENSI TIM & PERSONEL */}
        {/* ========================================================================= */}
        {currentStep === 2 && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header & Mark All Present */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-3">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-amber-500" />
                  Langkah 2: Absensi Presensi Tim & Tenaga Kerja
                </h3>
                <p className="text-xs text-slate-500">
                  Data personil bersumber dari master data. Pengawas menandai absensi kehadiran personil sesuai lokasi kerja dan tim yang ditetapkan Superadmin.
                </p>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  type="button"
                  onClick={markAllPresent}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black shadow transition cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Tandai Semua Hadir ({activeAttendanceList.length})</span>
                </button>
              </div>
            </div>

            {/* Banner Lokasi Kerja & Rekap Presensi */}
            <div className="bg-slate-900 text-white p-4 sm:p-5 rounded-2xl shadow-xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-black bg-amber-500 text-slate-950 uppercase tracking-wider">
                    Lokasi Penugasan
                  </span>
                  <span className="text-sm text-white font-bold flex items-center gap-1.5">
                    <MapPin className="w-4 h-4 text-amber-400" />
                    {selectedClient?.name} — {activeBlock?.code}
                  </span>
                </div>
              </div>

              {/* Status Kehadiran Quick Badges */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div className="px-3 py-1.5 bg-emerald-950/60 border border-emerald-600/40 rounded-xl text-center">
                  <div className="text-[10px] text-emerald-300 uppercase font-bold">Hadir</div>
                  <div className="font-mono text-emerald-400 font-black text-base">{statsHadir}</div>
                </div>
                <div className="px-3 py-1.5 bg-amber-950/60 border border-amber-600/40 rounded-xl text-center">
                  <div className="text-[10px] text-amber-300 uppercase font-bold">Izin</div>
                  <div className="font-mono text-amber-400 font-black text-base">{statsIzin}</div>
                </div>
                <div className="px-3 py-1.5 bg-blue-950/60 border border-blue-600/40 rounded-xl text-center">
                  <div className="text-[10px] text-blue-300 uppercase font-bold">Sakit</div>
                  <div className="font-mono text-blue-400 font-black text-base">{statsSakit}</div>
                </div>
                <div className="px-3 py-1.5 bg-rose-950/60 border border-rose-600/40 rounded-xl text-center">
                  <div className="text-[10px] text-rose-300 uppercase font-bold">Alpa</div>
                  <div className="font-mono text-rose-400 font-black text-base">{statsAlpa}</div>
                </div>
              </div>
            </div>

            {/* Filter & Search Control Bar */}
            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
              {/* Filter Lingkup Lokasi */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-slate-600">Lingkup Personel:</span>
                <div className="inline-flex rounded-xl p-1 bg-slate-200/80">

                  <button
                    type="button"
                    onClick={() => setLaborFilterScope('all')}
                    className={`px-3 py-1 text-xs font-bold rounded-lg transition cursor-pointer ${
                      laborFilterScope === 'all'
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Semua Personil ({laborList.length})
                  </button>
                </div>
              </div>

              {/* Tim Kerja & Search Input */}
              <div className="flex flex-wrap items-center gap-2 flex-1 justify-end">
                {/* Search box */}
                <div className="relative min-w-[190px] max-w-xs flex-1">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={laborSearchQuery}
                    onChange={(e) => setLaborSearchQuery(e.target.value)}
                    placeholder="Cari nama / peran personil..."
                    className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500 placeholder:text-slate-400"
                  />
                  {laborSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setLaborSearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      ✕
                    </button>
                  )}
                </div>

                {/* Filter Tim */}
                <select
                  value={laborFilterTeam}
                  onChange={(e) => setLaborFilterTeam(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-amber-500"
                >
                  <option value="ALL">Semua Tim</option>
                  <option value="Tim Operator Alat Berat">Tim Operator Alat Berat</option>
                  <option value="Tim Rintis & Imas Kayu">Tim Rintis & Imas Kayu</option>
                  <option value="Tim Mekanik Maintenance">Tim Mekanik Maintenance</option>
                  <option value="Tim Pengawas & K3">Tim Pengawas & K3</option>
                </select>

                <button
                  type="button"
                  onClick={() => setShowAddBkoModal(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm transition cursor-pointer"
                  title="Tambah personil BKO dari tim/lokasi lain ke hari ini"
                >
                  <UserPlus className="w-3.5 h-3.5 text-amber-400" />
                  <span>+ Personil BKO</span>
                </button>
              </div>
            </div>

            {/* If no workers found in assigned location */}
            {activeAttendanceList.length === 0 && (
              <div className="p-8 text-center bg-amber-50/70 border border-amber-200 rounded-2xl space-y-3">
                <AlertTriangle className="w-8 h-8 text-amber-600 mx-auto" />
                <h4 className="font-bold text-slate-900 text-sm">
                  {laborSearchQuery
                    ? `Tidak ditemukan personil dengan kata kunci "${laborSearchQuery}"`
                    : `Tidak ada personil yang khusus ditugaskan di ${activeBlock?.code}`}
                </h4>
                <p className="text-xs text-slate-600 max-w-md mx-auto">
                  {laborSearchQuery
                    ? 'Coba gunakan kata kunci pencarian nama atau jabatan lainnya.'
                    : 'Superadmin belum mengalokasikan personil ke blok ini di Master Data. Anda dapat beralih ke "Semua Personil" atau menambahkan personil BKO.'}
                </p>
                <div className="flex justify-center gap-2 pt-1">
                  {laborSearchQuery ? (
                    <button
                      type="button"
                      onClick={() => setLaborSearchQuery('')}
                      className="px-4 py-2 bg-slate-800 text-white text-xs font-bold rounded-xl shadow cursor-pointer"
                    >
                      Hapus Pencarian
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setLaborFilterScope('all')}
                      className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-xl shadow cursor-pointer"
                    >
                      Tampilkan Semua Personil Perusahaan
                    </button>
                  )}
                </div>
              </div>
            )}

            {/* List Grouped by Team */}
            {Array.from(
              new Set(
                activeAttendanceList
                  .filter((item) => laborFilterTeam === 'ALL' || item.teamName === laborFilterTeam)
                  .map((item) => item.teamName || 'Tim Lapangan')
              )
            ).map((teamName) => {
              const teamMembers = activeAttendanceList.filter(
                (item) =>
                  (item.teamName || 'Tim Lapangan') === teamName &&
                  (laborFilterTeam === 'ALL' || item.teamName === laborFilterTeam)
              );

              if (teamMembers.length === 0) return null;

              // Team styling & icon
              const teamHeaderColor = teamName.includes('Operator')
                ? 'bg-amber-50 text-amber-900 border-amber-200'
                : teamName.includes('Rintis')
                ? 'bg-emerald-50 text-emerald-900 border-emerald-200'
                : teamName.includes('Mekanik')
                ? 'bg-cyan-50 text-cyan-900 border-cyan-200'
                : 'bg-purple-50 text-purple-900 border-purple-200';

              return (
                <div key={teamName} className="space-y-3">
                  <div className={`flex items-center justify-between px-3.5 py-2 rounded-xl border font-bold text-xs ${teamHeaderColor}`}>
                    <div className="flex items-center gap-2">
                      <HardHat className="w-4 h-4" />
                      <span>{teamName}</span>
                    </div>
                    <span className="text-[11px] font-mono font-bold opacity-80">
                      {teamMembers.length} Personel
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {teamMembers.map((worker) => {
                      const idx = laborList.findIndex((l) => l.workerId === worker.workerId);
                      const isAssignedDirectly =
                        (worker.assignedClientId === selectedClientId || worker.assignedClientId === 'ALL') &&
                        (worker.assignedBlockId === selectedBlockId || worker.assignedBlockId === 'ALL' || !worker.assignedBlockId);

                      const homeClient = clients.find((c) => c.id === worker.assignedClientId);
                      const homeBlock = allBlocks.find((b) => b.id === worker.assignedBlockId);

                      return (
                        <div
                          key={worker.workerId}
                          className="p-3.5 bg-white border border-slate-200 rounded-2xl shadow-xs flex flex-col justify-between gap-2.5 hover:border-slate-300 transition"
                        >
                          <div>
                            {/* Top info: Name, Role & Location Badge */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <h5 className="font-bold text-sm text-slate-900">{worker.workerName}</h5>
                                <p className="text-xs text-slate-500 font-medium">{worker.role}</p>
                              </div>

                              <span className={`text-[10px] uppercase font-bold px-1.5 py-0.5 rounded border ${
                                (worker.category || '').toUpperCase().includes('OPERATOR')
                                  ? 'bg-amber-100 text-amber-950 border-amber-300'
                                  : (worker.category || '').toUpperCase().includes('MEKANIK')
                                  ? 'bg-cyan-100 text-cyan-950 border-cyan-300'
                                  : (worker.category || '').toUpperCase().includes('LOGISTIK')
                                  ? 'bg-blue-100 text-blue-950 border-blue-300'
                                  : (worker.category || '').toUpperCase().includes('PENGAWAS')
                                  ? 'bg-purple-100 text-purple-950 border-purple-300'
                                  : 'bg-emerald-100 text-emerald-950 border-emerald-300'
                              }`}>
                                {worker.category || 'Operator'}
                              </span>
                            </div>

                            {/* Penugasan Badge */}
                            <div className="mt-2">
                              {isAssignedDirectly ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                                  <MapPin className="w-3 h-3 text-emerald-600" />
                                  <span>Ditugaskan di {activeBlock?.code}</span>
                                </span>
                              ) : worker.assignedClientId === 'ALL' ? (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-800 bg-indigo-50 px-2 py-0.5 rounded-md border border-indigo-200">
                                  <ShieldCheck className="w-3 h-3 text-indigo-600" />
                                  <span>Personil Lintas Proyek (BKO)</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  <span>BKO: {homeClient?.name || 'Klien Lain'} {homeBlock ? `• ${homeBlock.code}` : ''}</span>
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Attendance Status Buttons */}
                          <div className="space-y-2 pt-2 border-t border-slate-100">
                            <div className="flex items-center gap-1">
                              {(['Hadir', 'Izin', 'Sakit', 'Alpa'] as const).map((st) => (
                                <button
                                  key={st}
                                  type="button"
                                  onClick={() => {
                                    setLaborList((prev) => {
                                      const next = [...prev];
                                      if (idx !== -1) {
                                        next[idx].status = st;
                                      }
                                      return next;
                                    });
                                  }}
                                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                                    worker.status === st
                                      ? st === 'Hadir'
                                        ? 'bg-emerald-600 text-white shadow-xs'
                                        : st === 'Izin'
                                        ? 'bg-amber-500 text-slate-950 shadow-xs'
                                        : st === 'Sakit'
                                        ? 'bg-blue-600 text-white shadow-xs'
                                        : 'bg-rose-600 text-white shadow-xs'
                                      : 'bg-slate-50 text-slate-600 border border-slate-200 hover:bg-slate-100'
                                  }`}
                                >
                                  {st}
                                </button>
                              ))}
                            </div>

                            {/* Notes Input for task or status detail */}
                            <div className="space-y-1.5">
                              <input
                                type="text"
                                placeholder="Catatan tugas / aktivitas hari ini..."
                                value={worker.notes || ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setLaborList((prev) => {
                                    const next = [...prev];
                                    if (idx !== -1) {
                                      next[idx].notes = val;
                                    }
                                    return next;
                                  });
                                }}
                                className="w-full text-xs px-2.5 py-1.5 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 transition placeholder:text-slate-400"
                              />

                              {/* Quick Task Preset Chips */}
                              <div className="flex flex-wrap gap-1">
                                {['🚜 Operator Unit', '🔧 Mekanik Servis', '🌲 Rintis Batas', '🪵 Cincang Rumpuk', '🏥 Izin/Sakit'].map((tag) => (
                                  <button
                                    key={tag}
                                    type="button"
                                    onClick={() => {
                                      setLaborList((prev) => {
                                        const next = [...prev];
                                        if (idx !== -1) {
                                          next[idx].notes = tag;
                                          if (tag.includes('Izin')) next[idx].status = 'Izin';
                                          else if (tag.includes('Sakit')) next[idx].status = 'Sakit';
                                          else next[idx].status = 'Hadir';
                                        }
                                        return next;
                                      });
                                    }}
                                    className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition font-medium cursor-pointer"
                                  >
                                    {tag}
                                  </button>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 3: OPERASIONAL ALAT & PENCATATAN DOWNTIME */}
        {/* ========================================================================= */}
        {currentStep === 3 && (
          <div className="p-6 space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-amber-500" />
                  Langkah 3: Jam Kerja Alat Berat & Pencatatan Downtime (Jam Mati)
                </h3>
                <p className="text-xs text-slate-500">
                  Catat Hour Meter (HM) awal & akhir, jam mati akibat cuaca atau breakdown kerusakan teknis.
                </p>
              </div>

              {/* Add equipment button */}
              <div className="flex items-center gap-1">
                <span className="text-xs text-slate-500 font-medium">Tambah Alat:</span>
                <select
                  onChange={(e) => {
                    if (e.target.value) {
                      addEquipmentToLog(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  className="text-xs font-bold bg-slate-100 border border-slate-300 rounded-lg px-2.5 py-1.5 focus:outline-none"
                  defaultValue=""
                >
                  <option value="" disabled>+ Pilih Unit</option>
                  {equipments
                    .filter((eq) => !equipmentLogs.some((l) => l.equipmentId === eq.id))
                    .map((eq) => (
                      <option key={eq.id} value={eq.id}>
                        {eq.id} - {eq.name}
                      </option>
                    ))}
                </select>
              </div>
            </div>

            {/* Equipment Log Cards */}
            <div className="space-y-4">
              {equipmentLogs.map((log, index) => (
                <div
                  key={log.equipmentId}
                  className="p-4 rounded-xl border border-slate-300 bg-slate-50/60 shadow-sm space-y-4"
                >
                  {/* Card Title Bar */}
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 bg-amber-500 text-slate-950 font-black rounded text-xs">
                        {log.equipmentId}
                      </span>
                      <span className="font-bold text-slate-900 text-sm">{log.equipmentName}</span>
                      <span className="text-xs text-slate-500 hidden sm:inline">({log.type})</span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-emerald-100 text-emerald-900 px-2 py-0.5 rounded">
                        Jam Efektif: {log.effectiveWorkHours.toFixed(1)} HM
                      </span>
                      <button
                        type="button"
                        onClick={() => removeEquipmentFromLog(index)}
                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition"
                        title="Hapus unit dari laporan hari ini"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* 1. Hour Meter (HM) inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        HM Awal Mesin
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={log.hmStart}
                        onChange={(e) => updateEquipmentRow(index, { hmStart: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        HM Akhir Mesin
                      </label>
                      <input
                        type="number"
                        step="0.1"
                        value={log.hmEnd}
                        onChange={(e) => updateEquipmentRow(index, { hmEnd: parseFloat(e.target.value) || 0 })}
                        className="w-full px-3 py-1.5 border border-slate-300 rounded-lg text-sm font-mono font-bold bg-white"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                        Total HM Buka Mesin (Auto)
                      </label>
                      <div className="px-3 py-1.5 bg-slate-200/80 border border-slate-300 rounded-lg text-sm font-mono font-bold text-slate-900">
                        {log.totalHm.toFixed(1)} HM
                      </div>
                    </div>
                  </div>

                  {/* 2. Downtime Cuaca & Breakdown */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-2 border-t border-slate-200">
                    {/* Cuaca Downtime */}
                    <div className="bg-blue-50/70 p-3 rounded-lg border border-blue-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-blue-900 flex items-center gap-1">
                          <CloudRain className="w-3.5 h-3.5 text-blue-600" />
                          a. Downtime Cuaca
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-blue-800 uppercase">Durasi (Jam)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={log.downtimeWeatherHours}
                            onChange={(e) =>
                              updateEquipmentRow(index, { downtimeWeatherHours: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 bg-white border border-blue-300 rounded text-xs font-mono font-bold"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-blue-800 uppercase">Keterangan Cuaca</label>
                          <input
                            type="text"
                            value={log.downtimeWeatherNote}
                            onChange={(e) => updateEquipmentRow(index, { downtimeWeatherNote: e.target.value })}
                            placeholder="Contoh: Hujan lebat, tanah becek"
                            className="w-full px-2 py-1 bg-white border border-blue-300 rounded text-xs"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Breakdown Downtime */}
                    <div className="bg-rose-50/70 p-3 rounded-lg border border-rose-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-rose-900 flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                          b. Downtime Breakdown (Kerusakan Alat)
                        </span>
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        <div className="col-span-1">
                          <label className="text-[10px] font-bold text-rose-800 uppercase">Durasi (Jam)</label>
                          <input
                            type="number"
                            step="0.5"
                            value={log.downtimeBreakdownHours}
                            onChange={(e) =>
                              updateEquipmentRow(index, { downtimeBreakdownHours: parseFloat(e.target.value) || 0 })
                            }
                            className="w-full px-2 py-1 bg-white border border-rose-300 rounded text-xs font-mono font-bold text-rose-900"
                          />
                        </div>
                        <div className="col-span-2">
                          <label className="text-[10px] font-bold text-rose-800 uppercase">Jenis Kerusakan</label>
                          <select
                            value={log.downtimeBreakdownCategory || 'Lainnya'}
                            onChange={(e) =>
                              updateEquipmentRow(index, {
                                downtimeBreakdownCategory: e.target.value as BreakdownCategory,
                              })
                            }
                            className="w-full px-2 py-1 bg-white border border-rose-300 rounded text-xs font-medium"
                          >
                            <option value="Mesin">Mesin / Engine</option>
                            <option value="Hidrolik">Hidrolik Pompa/Valve</option>
                            <option value="Selang Pecah">Selang Pecah (Hose)</option>
                            <option value="Undercarriage">Undercarriage / Track</option>
                            <option value="Elektrikal">Elektrikal / Aki</option>
                            <option value="Lainnya">Lainnya</option>
                          </select>
                        </div>
                      </div>
                      <div>
                        <input
                          type="text"
                          value={log.downtimeBreakdownNote}
                          onChange={(e) => updateEquipmentRow(index, { downtimeBreakdownNote: e.target.value })}
                          placeholder="Keterangan perbaikan (misal: Ganti hose hydraulic boom 3/4)"
                          className="w-full px-2 py-1 bg-white border border-rose-300 rounded text-xs"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 3. Effective calculation footer & Discrepancy Alert */}
                  {(() => {
                    const totalDowntime = Number((log.downtimeWeatherHours + log.downtimeBreakdownHours + log.downtimeOtherHours).toFixed(1));
                    const isHmReversed = log.hmEnd < log.hmStart;
                    const isDowntimeExceeded = totalDowntime > log.totalHm;

                    return (
                      <div className="space-y-2 pt-2 border-t border-slate-200">
                        <div className="flex flex-wrap items-center justify-between text-xs text-slate-600">
                          <div>
                            Rumus: <strong>Jam Buka ({log.totalHm} HM) - Downtime ({totalDowntime} Jam)</strong>
                          </div>
                          <div className="font-bold text-slate-900 flex items-center gap-2">
                            <span>Jam Kerja Efektif:</span>
                            <span className="text-emerald-700 text-sm font-black font-mono">{log.effectiveWorkHours.toFixed(1)} HM</span>
                          </div>
                        </div>

                        {/* DISCREPANCY ALERT BADGE */}
                        {isHmReversed ? (
                          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-xs text-rose-900 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>ALERT DISKREPANSI: HM Akhir ({log.hmEnd}) lebih kecil dari HM Awal ({log.hmStart})! Periksa kembali inputan meteran alat!</span>
                          </div>
                        ) : isDowntimeExceeded ? (
                          <div className="p-2.5 bg-rose-50 border border-rose-300 rounded-lg flex items-center gap-2 text-xs text-rose-900 font-bold">
                            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                            <span>ALERT DISKREPANSI: Total Jam Mati ({totalDowntime} Jam) melebihi putaran fisik HM ({log.totalHm} HM)! Jam efektif diset 0.</span>
                          </div>
                        ) : log.totalHm > 0 ? (
                          <div className="p-2 bg-emerald-50 border border-emerald-200 rounded-lg flex items-center justify-between text-[11px] text-emerald-900">
                            <span className="flex items-center gap-1.5 font-bold">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Validasi Jam Kerja: Sinkron Sempurna ({log.effectiveWorkHours} Jam Efektif + {totalDowntime} Jam Mati = {log.totalHm} HM)</span>
                            </span>
                            <span className="font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                              ✓ 100% Valid
                            </span>
                          </div>
                        ) : null}
                      </div>
                    );
                  })()}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 4: HASIL KERJA HARIAN (CAPAIAN TARGET HARIAN DIREKTUR) */}
        {/* ========================================================================= */}
        {currentStep === 4 && (
          <div className="p-4 sm:p-6 space-y-6">
            {/* Header Title */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-200 pb-3 gap-2">
              <div>
                <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Target className="w-5 h-5 text-amber-500" />
                  Langkah 4: Hasil Kerja Harian (Capaian Target Harian Direktur)
                </h3>
                <p className="text-xs text-slate-500">
                  Target harian dan daftar item kerja ditarik otomatis dari penetapan Direktur (Master Data Proyek &rarr; Submenu Target Harian). Pengawas menginput capaian realisasi hasil kerja harian di lapangan.
                </p>
              </div>

              <span className="self-start sm:self-auto inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 text-amber-900 border border-amber-300 rounded-xl text-xs font-black">
                <Lock className="w-3.5 h-3.5 text-amber-700" />
                Target Direktur Terkunci
              </span>
            </div>

            {/* Banner Informasi SPK, Blok & Target Harian Direktur */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 text-white rounded-2xl p-4 sm:p-5 shadow-sm border border-slate-700 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-700/80 pb-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded bg-amber-500 text-slate-950">
                      SPK TERPILIH
                    </span>
                    <span className="font-mono font-bold text-amber-300 text-xs">
                      {selectedClient?.contractNumber || "045/SPK-LC/PTA/VI/2026"}
                    </span>
                  </div>
                  <h4 className="text-base font-black text-white">
                    {selectedClient?.name || "PT. A"} · {activeBlock?.code || "Blok Utama"}
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    Proyek: {selectedClient?.projectName || "Land Clearing Perkebunan"} · Luas Total Blok: {activeBlock?.targetAreaHa || 100} Ha
                  </p>
                </div>

                <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-center bg-slate-800/80 px-4 py-2.5 rounded-xl border border-slate-700 shrink-0">
                  <span className="text-[10px] uppercase font-bold text-amber-400">Persentase Pencapaian</span>
                  <div className="text-2xl font-black font-mono text-white">
                    {averagePercentage.toFixed(1)} <span className="text-xs font-bold text-amber-400">%</span>
                  </div>
                  <span className="text-[10px] text-slate-400">
                    Rata-rata Capaian Kerja
                  </span>
                </div>
              </div>

              {/* Arahan / Catatan Khusus Direktur jika ada */}
              {directorTarget?.notes && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 flex items-start gap-2 text-xs">
                  <Info className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-amber-300 font-bold block text-[11px] uppercase">
                      Instruksi &amp; Arahan Khusus Direktur:
                    </strong>
                    <p className="text-slate-200 text-xs mt-0.5 italic">
                      "{directorTarget.notes}"
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* DAFTAR CAPAIAN ITEM PEKERJAAN (TARGET DIREKTUR vs REALISASI PENGAWAS) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-black uppercase tracking-wider text-slate-900 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-amber-600" />
                    <span>Daftar Item Pekerjaan &amp; Capaian Lapangan Hari Ini</span>
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Input hasil kerja harian pengawas pada masing-masing item pekerjaan yang ditentukan oleh Direktur di bawah ini:
                  </p>
                </div>
                <span className="text-xs font-bold text-slate-600 bg-slate-100 px-2.5 py-1 rounded-lg">
                  {workItemEntries.length} Item Pekerjaan
                </span>
              </div>

              <div className="grid grid-cols-1 gap-3">
                {workItemEntries.map((item, idx) => {
                  const targetVol = item.targetDailyVolume;
                  const realVol = item.realizedDailyVolume || 0;
                  const pct = targetVol > 0 ? Number(((realVol / targetVol) * 100).toFixed(1)) : 100;
                  const isAchieved = pct >= 100;
                  const isNear = pct >= 80 && pct < 100;

                  return (
                    <div
                      key={item.id}
                      className="bg-white border-2 border-slate-200 hover:border-amber-300 rounded-2xl p-4 transition-all shadow-xs space-y-3"
                    >
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
                        <div className="flex items-center gap-2">
                          <span className="w-6 h-6 rounded-lg bg-amber-500 text-slate-950 font-black text-xs flex items-center justify-center shrink-0">
                            {idx + 1}
                          </span>
                          <div>
                            <h5 className="font-black text-slate-900 text-xs sm:text-sm">
                              {item.name}
                            </h5>
                            <span className="text-[10px] text-slate-500 font-medium">
                              Satuan Ukur: <strong>{item.unit}</strong> {item.totalVolume ? `· Total Volume SPK: ${item.totalVolume} ${item.unit}` : ""}
                            </span>
                          </div>
                        </div>

                        {/* Status Capaian Badge */}
                        <div className="flex items-center gap-2 self-start sm:self-auto">
                          <span
                            className={`px-2.5 py-1 rounded-xl text-[11px] font-black flex items-center gap-1 ${
                              isAchieved
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-300"
                                : isNear
                                ? "bg-amber-100 text-amber-800 border border-amber-300"
                                : realVol > 0
                                ? "bg-rose-100 text-rose-800 border border-rose-300"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {isAchieved ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Clock className="w-3.5 h-3.5 text-amber-600" />
                            )}
                            <span>{realVol > 0 ? `${pct}% Capaian` : "Belum Diisi"}</span>
                          </span>
                        </div>
                      </div>

                      {/* Inputs Row: Target Direktur (Read-only) vs Realisasi Pengawas (Editable) */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
                        {/* 1. Target Harian Direktur (Terkunci) */}
                        <div className="bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                          <div className="flex items-center justify-between mb-1">
                            <label className="text-[10px] font-bold text-slate-600 uppercase">
                              Target Harian Direktur
                            </label>
                            <span className="text-[9px] font-bold text-amber-900 bg-amber-100 px-1 py-0.2 rounded border border-amber-200">
                              Terkunci
                            </span>
                          </div>
                          <div className="text-base font-black font-mono text-slate-800">
                            {targetVol} <span className="text-xs font-bold text-slate-500">{item.unit}/hari</span>
                          </div>
                          <p className="text-[9px] text-slate-400 mt-0.5">
                            Otoritas Direktur (Master Target Harian)
                          </p>
                        </div>

                        {/* 2. Input Realisasi Pengawas Hari Ini */}
                        <div className="bg-emerald-50/70 p-2.5 rounded-xl border-2 border-emerald-400 ring-2 ring-emerald-200">
                          <label className="block text-[10px] font-black text-emerald-950 uppercase mb-1">
                            Realisasi Lapangan Hari Ini <span className="text-rose-500">*</span>
                          </label>
                          <div className="relative">
                            <input
                              type="number"
                              step="any"
                              min="0"
                              value={itemRawInputs[item.id] !== undefined ? itemRawInputs[item.id] : (item.realizedDailyVolume || "")}
                              onChange={(e) => {
                                const rawVal = e.target.value;
                                setItemRawInputs((prev) => ({ ...prev, [item.id]: rawVal }));
                                handleItemRealizationChange(item.id, parseFloat(rawVal) || 0);
                              }}
                              placeholder="0.00"
                              className="w-full px-3 py-1.5 bg-white border border-emerald-500 rounded-lg text-base font-mono font-black text-emerald-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                            />
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[11px] font-black text-emerald-800">
                              {item.unit}
                            </span>
                          </div>
                          <p className="text-[9px] text-emerald-800 mt-0.5 font-semibold">
                            Input capaian aktual fisik hari ini
                          </p>
                        </div>

                        {/* 3. Catatan / Lokasi Sektor Spesifik */}
                        <div>
                          <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                            Keterangan / Sektor Pekerjaan
                          </label>
                          <input
                            type="text"
                            value={item.notes || ""}
                            onChange={(e) => handleItemNotesChange(item.id, e.target.value)}
                            placeholder="Contoh: Sektor Barat dekat batas kanal"
                            className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-amber-500"
                          />
                        </div>
                      </div>

                      {/* Mini Progress Bar */}
                      <div className="space-y-1 pt-1">
                        <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden border border-slate-200">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              isAchieved
                                ? "bg-emerald-600"
                                : isNear
                                ? "bg-amber-500"
                                : "bg-rose-500"
                            }`}
                            style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* RINGKASAN AKUMULASI CAPAIAN & PROGRES KESELURUHAN BLOK */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Card 1: Rangkuman Realisasi Hari Ini */}
              <div className="p-4 bg-emerald-50/70 border border-emerald-300 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-emerald-950 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Rekap Capaian Terhadap Target Direktur</span>
                  </span>
                  <span className="text-xs bg-emerald-200 text-emerald-900 font-bold px-2 py-0.5 rounded">
                    Hari Ini
                  </span>
                </div>

                <div className="pt-1">
                  <div className="bg-white p-4 rounded-xl border border-emerald-200 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] font-bold text-slate-500 uppercase block">Rasio Ketercapaian Rata-Rata</span>
                      <div className="text-3xl font-black font-mono text-emerald-800 mt-1">
                        {averagePercentage.toFixed(1)}%
                      </div>
                    </div>
                    <span className={`px-3 py-1.5 rounded-lg text-xs font-black ${averagePercentage >= 100 ? "bg-emerald-100 text-emerald-800 border border-emerald-300" : "bg-amber-100 text-amber-800 border border-amber-300"}`}>
                      {averagePercentage >= 100 ? "✓ Semua Target Item Terpenuhi" : "Perlu Peningkatan Ritme"}
                    </span>
                  </div>
                </div>
              </div>

              {/* Card 2: Akumulasi Progres per Item Kerja */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-slate-900">
                    Akumulasi Progres per Item Kerja: {activeBlock?.code || "Blok Utama"}
                  </span>
                  <span className="text-[10px] bg-slate-200 text-slate-800 font-bold px-2 py-0.5 rounded">
                    Berdasarkan Karakter Lahan
                  </span>
                </div>

                <div className="space-y-3 pt-1">
                  {workItemEntries.map((item) => {
                    const prevVal = getPreviousCumulativeVolumeForWorkItem(item.name, date, selectedBlockId, selectedClientId);
                    const todayVal = item.realizedDailyVolume || 0;
                    const totalCum = prevVal + todayVal;
                    const totalTarget = item.totalVolume || (item.targetDailyVolume * 25);
                    const pctCum = totalTarget > 0 ? Number(((totalCum / totalTarget) * 100).toFixed(1)) : 100;

                    return (
                      <div key={item.id} className="bg-white p-2.5 rounded-xl border border-slate-200 space-y-1.5">
                        <div className="flex justify-between items-center text-xs">
                          <strong className="text-slate-800 font-black text-[11px] truncate block max-w-[180px]" title={item.name}>
                            {item.name}
                          </strong>
                          <span className="font-mono text-slate-500 text-[10px]">
                            {totalCum.toFixed(1)} / {totalTarget.toFixed(0)} {item.unit} ({pctCum}%)
                          </span>
                        </div>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden border border-slate-200">
                          <div
                            className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                            style={{ width: `${Math.min(100, pctCum)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Field Notes for Progress */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Catatan Capaian Fisik Pengawas
              </label>
              <textarea
                rows={3}
                value={progressNotes}
                onChange={(e) => setProgressNotes(e.target.value)}
                placeholder="Misal: Sektor selatan terhambat hujan lebat jam 15.00 WIB..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 5: LAPORAN LOGISTIK & PEMELIHARAAN */}
        {/* ========================================================================= */}
        {currentStep === 5 && (
          <div className="p-6 space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Fuel className="w-5 h-5 text-amber-500" />
                Langkah 5: Laporan Logistik, BBM Solar, Oli & Spare Part
              </h3>
              <p className="text-xs text-slate-500">
                Pencatatan pengisian BBM ke alat, monitoring rasio konsumsi (Liter/HM), serta pemakaian oli & spare part.
              </p>
            </div>

            {/* A. Tangki BBM & Alert Analisis */}
            <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-950 flex items-center gap-1.5">
                  <Fuel className="w-4 h-4 text-amber-600" />
                  A. Bahan Bakar Solar Industri (Stok Tangki & Pengisian)
                </h4>
                <span className="text-xs text-amber-800 font-mono">
                  Sisa Tangki: <strong>{tankRemaining} Liter</strong>
                </span>
              </div>

              {/* Tangki master numbers */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Total Terpakai Hari Ini</label>
                  <div className="px-2.5 py-1.5 bg-slate-200/80 border border-slate-300 rounded-lg text-xs font-mono font-bold text-amber-900">
                    {totalFuelUsed} Liter
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-700 uppercase">Sisa Stok Tangki Lapangan</label>
                  <div className="px-2.5 py-1.5 bg-emerald-100 border border-emerald-300 rounded-lg text-xs font-mono font-bold text-emerald-900">
                    {tankRemaining} Liter
                  </div>
                </div>
              </div>

              {/* Pengisian BBM Per Alat Table with Live Ratio & Field Fuel Flow Analytics */}
              <div className="overflow-x-auto">
                <table className="w-full border-collapse border border-amber-200 text-xs bg-white rounded-lg overflow-hidden">
                  <thead>
                    <tr className="bg-amber-100/80 text-amber-950 font-bold border-b border-amber-300">
                      <th className="p-2.5 text-left border-r border-amber-200">Kode Alat</th>
                      <th className="p-2.5 text-center border-r border-amber-200">
                        Jam Efektif
                        <span className="block text-[9px] text-amber-800 font-normal">(Submenu 3 Alat)</span>
                      </th>
                      <th className="p-2.5 text-center border-r border-amber-200 bg-amber-200/50">
                        Sisa BBM Kemarin (Liter)
                        <span className="block text-[9px] text-amber-900 font-normal">(Hari Sebelumnya)</span>
                      </th>
                      <th className="p-2.5 text-center border-r border-amber-200">
                        Pengisian/Hari ini (Liter)
                        <span className="block text-[9px] text-amber-800 font-normal">(Input Pengawas)</span>
                      </th>
                      <th className="p-2.5 text-center border-r border-amber-200">
                        Konsumsi/Hari ini (Liter)
                        <span className="block text-[9px] text-amber-800 font-normal">(Jam Efektif × Batas Std)</span>
                      </th>
                      <th className="p-2.5 text-center border-r border-amber-200">
                        Batas Standar (telah ditentukan)
                        <span className="block text-[9px] text-amber-800 font-normal">(Master Data Proyek)</span>
                      </th>
                      <th className="p-2.5 text-center border-r border-amber-200">
                        Sisa BBM ditangki
                        <span className="block text-[9px] text-amber-800 font-normal">(Kemarin + Isi - Konsumsi)</span>
                      </th>
                      <th className="p-2.5 text-center">Status Analisis</th>
                    </tr>
                  </thead>
                  <tbody>
                    {equipmentLogs.map((log, idx) => {
                      const rowIsAbnormal = log.isFuelAlert || log.fuelAnalysisStatus?.toLowerCase().includes('tidak normal');
                      const rowPrevTank = Number(log.previousRemainingFuelLiters) || 0;
                      const rowStdLimit = Number(log.fuelStandardLimit) || 18;
                      const rowEffHours = Number(log.effectiveWorkHours) || 0;
                      const rowCons = log.fuelConsumptionLiters !== undefined 
                        ? log.fuelConsumptionLiters 
                        : Number((rowEffHours * rowStdLimit).toFixed(1));
                      const rowRec = log.recommendedRefuelLiters !== undefined 
                        ? log.recommendedRefuelLiters 
                        : Math.max(0, Number((rowCons - rowPrevTank).toFixed(1)));
                      // Logika lapangan resmi: Sisa BBM ditangki = (Kemarin + Isi) - Konsumsi
                      const rowRem = Number((rowPrevTank + (Number(log.fuelAddedLiters) || 0) - rowCons).toFixed(1));

                      return (
                        <tr 
                          key={log.equipmentId} 
                          className={rowIsAbnormal ? 'bg-rose-50/80 hover:bg-rose-100/60 transition-colors' : 'hover:bg-slate-50 transition-colors'}
                        >
                          {/* 1. Kode Alat */}
                          <td className="p-2.5 font-bold font-mono text-slate-900 border-b border-r border-slate-200">
                            <div className="font-black text-amber-950 text-sm">{log.equipmentId}</div>
                            <div className="text-[10px] text-slate-500 font-sans font-normal">{log.type}</div>
                          </td>

                          {/* 2. Jam Efektif (ambil dari Submenu 3) */}
                          <td className="p-2.5 text-center font-mono font-black text-slate-900 border-b border-r border-slate-200">
                            <span className="inline-block px-2.5 py-1 bg-emerald-100/90 text-emerald-950 rounded-md font-mono font-bold text-xs border border-emerald-200">
                              {rowEffHours}
                            </span>
                          </td>

                          {/* 3. Sisa BBM Hari Sebelumnya (Liter) */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 border-b border-r border-slate-200 bg-amber-50/50">
                            <span className="inline-block px-2 py-1 bg-amber-100 text-amber-950 rounded-md font-mono font-black text-xs border border-amber-300">
                              {rowPrevTank} L
                            </span>
                          </td>

                          {/* 4. Pengisian/Hari ini (Liter) */}
                          <td className="p-2.5 text-center border-b border-r border-slate-200">
                            <div className="inline-flex flex-col items-center gap-1">
                              <input
                                type="number"
                                step="1"
                                min="0"
                                value={log.fuelAddedLiters}
                                onChange={(e) =>
                                  updateEquipmentRow(idx, { fuelAddedLiters: parseFloat(e.target.value) || 0 })
                                }
                                className={`w-24 px-2 py-1.5 border-2 rounded-lg text-center font-mono font-black text-xs shadow-xs focus:outline-none ${
                                  rowIsAbnormal
                                    ? 'border-rose-400 bg-rose-50/90 text-rose-950 focus:ring-2 focus:ring-rose-500'
                                    : 'border-slate-300 bg-white text-slate-900 focus:ring-2 focus:ring-amber-500'
                                }`}
                              />
                              {rowIsAbnormal && (
                                <button
                                  type="button"
                                  onClick={() => updateEquipmentRow(idx, { fuelAddedLiters: rowRec })}
                                  className="text-[9px] font-bold text-rose-700 bg-rose-100 hover:bg-rose-200 px-1.5 py-0.5 rounded border border-rose-300 transition cursor-pointer"
                                  title="Gunakan rekomendasi kebutuhan pengisian"
                                >
                                  Saran: ~{rowRec} L
                                </button>
                              )}
                            </div>
                          </td>

                          {/* 5. Konsumsi/Hari ini (Liter) = Jam Efektif * Batas Standar */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-900 border-b border-r border-slate-200">
                            <span className="font-black text-amber-950 text-xs">{rowCons}</span>
                            <span className="block text-[9px] text-slate-400 font-sans font-normal">
                              ({rowEffHours} × {rowStdLimit})
                            </span>
                          </td>

                          {/* 6. Batas Standar (telah ditentukan) */}
                          <td className="p-2.5 text-center font-mono font-bold text-slate-700 border-b border-r border-slate-200">
                            <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-800 border border-slate-200 text-xs">
                              {rowStdLimit}
                            </span>
                          </td>

                          {/* 7. Sisa BBM ditangki (Liter) */}
                          <td className="p-2.5 text-center font-mono font-bold border-b border-r border-slate-200">
                            <span className={`inline-block px-2.5 py-1 rounded-md text-xs font-mono font-black ${
                              rowRem < 0
                                ? 'bg-rose-100 text-rose-900 border border-rose-300'
                                : 'bg-blue-50 text-blue-950 border border-blue-200'
                            }`}>
                              {rowRem}
                            </span>
                          </td>

                          {/* 8. Status Analisis */}
                          <td className="p-2.5 text-center border-b border-slate-200">
                            {rowIsAbnormal ? (
                              <span className="inline-flex items-center gap-1 font-black text-rose-700 bg-rose-100 px-2.5 py-1 rounded-md text-[11px] border border-rose-300 shadow-xs uppercase tracking-tight">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                                tidak normal
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 font-bold text-emerald-800 bg-emerald-100 px-2.5 py-1 rounded-md text-[11px] border border-emerald-300 uppercase tracking-tight">
                                <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                normal
                              </span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Alert Indikasi Pemborosan BBM Lapangan Sesuai Alur Analisis */}
              {equipmentLogs.filter((l) => l.isFuelAlert || l.fuelAnalysisStatus?.toLowerCase().includes('tidak normal')).map((alertLog) => {
                const alertPrevTank = Number(alertLog.previousRemainingFuelLiters) || 0;
                const alertStdLimit = Number(alertLog.fuelStandardLimit) || 18;
                const alertEffHours = Number(alertLog.effectiveWorkHours) || 0;
                const alertCons = alertLog.fuelConsumptionLiters !== undefined 
                  ? alertLog.fuelConsumptionLiters 
                  : Number((alertEffHours * alertStdLimit).toFixed(1));
                const alertRec = alertLog.recommendedRefuelLiters !== undefined 
                  ? alertLog.recommendedRefuelLiters 
                  : Math.max(0, Number((alertCons - alertPrevTank).toFixed(1)));
                const alertExcess = Number(((Number(alertLog.fuelAddedLiters) || 0) - alertRec).toFixed(1));

                return (
                  <div 
                    key={alertLog.equipmentId} 
                    className="p-4 bg-rose-50/90 border-2 border-rose-300 rounded-xl space-y-2.5 text-xs shadow-xs"
                  >
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 border-b border-rose-200 pb-2">
                      <span className="font-black text-rose-950 flex items-center gap-2 text-xs">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        Indikasi Pemborosan Bahan Bakar: Unit {alertLog.equipmentId} ({alertLog.type})
                      </span>
                      <span className="px-2.5 py-0.5 bg-rose-200 text-rose-900 rounded font-black text-[11px] border border-rose-300 uppercase w-fit">
                        Status Analisis = tidak normal
                      </span>
                    </div>

                    <p className="text-rose-900 font-medium leading-relaxed">
                      terjadi indikasi pemborosan seharusnya di tgl <strong>{formatIndoDate(date)}</strong> pengisiannya bukan <strong>{alertLog.fuelAddedLiters} liter</strong> tapi sekitar <strong>{alertRec}liter</strong> saja karena masih ada akumulasi total sisa BBM ditangki sejumlah <strong>{alertPrevTank} liter</strong>. &nbsp;
                      <span className="font-bold text-rose-950 font-mono">Status Analisis = tidak normal</span>
                    </p>

                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => {
                          const targetIdx = equipmentLogs.findIndex((e) => e.equipmentId === alertLog.equipmentId);
                          if (targetIdx >= 0) {
                            updateEquipmentRow(targetIdx, { fuelAddedLiters: alertRec });
                          }
                        }}
                        className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 active:scale-95 text-slate-950 font-black rounded-lg text-xs transition shadow-sm cursor-pointer"
                      >
                        ✓ Sesuaikan Pengisian Menjadi {alertRec} Liter Saja
                      </button>
                      <span className="text-[11px] text-rose-700 italic">
                        *Klik tombol ini untuk menerapkan pengisian ideal sesuai kebutuhan jam kerja efektif.
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* B. Oli & Grease */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                B. Laporan Pemakaian Oli & Grease (Pelumas)
              </h4>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Oli Mesin (Liter)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={oilEngine}
                    onChange={(e) => setOilEngine(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Oli Hidrolik (Liter)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={oilHydraulic}
                    onChange={(e) => setOilHydraulic(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Oli Transmisi (Liter)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={oilTransmission}
                    onChange={(e) => setOilTransmission(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-600 uppercase">Grease / Gemuk (Kg)</label>
                  <input
                    type="number"
                    step="0.5"
                    value={greaseKg}
                    onChange={(e) => setGreaseKg(parseFloat(e.target.value) || 0)}
                    className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-mono font-bold"
                  />
                </div>
              </div>
            </div>

            {/* C. Spare Parts */}
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
              <h4 className="text-xs font-black uppercase tracking-wider text-slate-800">
                C. Laporan Pergantian Spare Part & Service
              </h4>

              {/* Add form */}
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2">
                <input
                  type="text"
                  placeholder="Nama Spare Part (misal: Hose Hydraulic 3/4)"
                  value={newPartName}
                  onChange={(e) => setNewPartName(e.target.value)}
                  className="col-span-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <input
                  type="number"
                  placeholder="Jumlah"
                  value={newPartQty}
                  onChange={(e) => setNewPartQty(parseInt(e.target.value) || 1)}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs"
                />
                <select
                  value={newPartCategory}
                  onChange={(e) => setNewPartCategory(e.target.value as any)}
                  className="px-2 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium"
                >
                  <option value="Perawatan Rutin">Perawatan Rutin</option>
                  <option value="Perbaikan Kerusakan">Perbaikan Kerusakan</option>
                </select>
                <button
                  type="button"
                  onClick={addSparePartItem}
                  className="flex items-center justify-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tambah Part</span>
                </button>
              </div>

              {/* Spare parts list */}
              {spareParts.length > 0 && (
                <div className="space-y-1.5 pt-2">
                  {spareParts.map((sp) => (
                    <div
                      key={sp.id}
                      className="flex items-center justify-between p-2 bg-white border border-slate-200 rounded-lg text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900">{sp.partName}</span>
                        <span className="text-slate-500 font-mono">({sp.quantity} {sp.unit})</span>
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-[10px] text-slate-700">
                          {sp.serviceCategory}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeSparePartItem(sp.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* LANGKAH 6: DOKUMENTASI FOTO BER-WATERMARK & CATATAN */}
        {/* ========================================================================= */}
        {currentStep === 6 && (
          <div className="p-6 space-y-6">
            <div className="border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Camera className="w-5 h-5 text-amber-500" />
                Langkah 6: Dokumentasi Foto Lapangan Ber-Watermark Otomatis & Catatan
              </h3>
              <p className="text-xs text-slate-500">
                Semua foto yang diunggah akan otomatis ditempeli watermark GPS koordinat, tanggal, jam, dan nama blok.
              </p>
            </div>

            {/* Photo Capture & Upload Box */}
            <div className="p-4 bg-slate-900 text-white rounded-xl space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Kategori Foto
                  </label>
                  <select
                    value={photoCategory}
                    onChange={(e) => setPhotoCategory(e.target.value as any)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs font-semibold text-white focus:outline-none"
                  >
                    <option value="Kondisi Cuaca / Lapangan">1. Kondisi Cuaca / Lapangan (Wajib)</option>
                    <option value="Hasil Kerja Harian">2. Hasil Kerja Harian Blok (Wajib)</option>
                    <option value="Kerusakan Alat / Spare Part">3. Kerusakan Alat / Spare Part</option>
                    <option value="Pengisian BBM">4. Pengisian BBM Solar</option>
                  </select>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-[11px] font-bold text-slate-300 uppercase mb-1">
                    Keterangan Foto (Caption)
                  </label>
                  <input
                    type="text"
                    value={photoCaption}
                    onChange={(e) => setPhotoCaption(e.target.value)}
                    placeholder="Misal: Kondisi hasil clearing Blok AB sektor selatan"
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Upload or Camera triggers */}
              <div className="flex flex-wrap items-center gap-3 pt-2">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  ref={fileInputRef}
                  onChange={handlePhotoSelected}
                  className="hidden"
                />

                <button
                  type="button"
                  disabled={isProcessingPhoto}
                  onClick={() => fileInputRef.current?.click()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-xl text-xs shadow-md transition disabled:opacity-50 cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  <span>Ambil Foto / Batch Unggah (Multi-Foto)</span>
                </button>

                <button
                  type="button"
                  disabled={isProcessingPhoto}
                  onClick={handleSimulateAddPhoto}
                  className="flex items-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs border border-slate-700 transition"
                  title="Generate simulasi foto ter-watermark untuk demo testing"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  <span>Simulasi Foto Lapangan</span>
                </button>

                {isProcessingPhoto && (
                  <span className="text-xs text-amber-400 animate-pulse font-medium">
                    Sedang menempelkan watermark GPS & waktu...
                  </span>
                )}
              </div>
            </div>

            {/* Gallery of Uploaded Photos */}
            {photos.length > 0 ? (
              <div className="space-y-2">
                <h4 className="text-xs font-black uppercase tracking-wider text-slate-700">
                  Foto Terlampir ({photos.length} Foto Ber-Watermark Otentik)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {photos.map((p) => (
                    <div
                      key={p.id}
                      className="border border-slate-300 rounded-xl overflow-hidden bg-white shadow-sm group relative"
                    >
                      <div className="aspect-video w-full bg-slate-950 relative overflow-hidden">
                        <img src={p.dataUrl} alt={p.caption} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => removePhoto(p.id)}
                          className="absolute top-2 right-2 p-1.5 bg-rose-600/90 text-white rounded-lg opacity-90 hover:opacity-100 transition shadow"
                          title="Hapus foto"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="p-2.5 text-xs">
                        <div className="font-bold text-slate-900">{p.caption}</div>
                        <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex justify-between">
                          <span>GPS: {p.gpsCoordinates ? `${Number(p.gpsCoordinates.lat || 0).toFixed(5)}, ${Number(p.gpsCoordinates.lng || 0).toFixed(5)}` : '-'}</span>
                          <span>{p.timestamp}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="p-6 text-center border-2 border-dashed border-slate-300 rounded-xl bg-slate-50 text-slate-500 text-xs">
                Belum ada foto yang diunggah. Ambil foto menggunakan kamera ponsel atau pilih gambar dari galeri.
              </div>
            )}

            {/* General Supervisor Notes */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                Catatan Khusus Pengawas (Situasi Non-Teknis & Kendala Lapangan)
              </label>
              <textarea
                rows={3}
                value={supervisorGeneralNotes}
                onChange={(e) => setSupervisorGeneralNotes(e.target.value)}
                placeholder="Tuliskan catatan khusus situasi lahan, keamanan, kendala suplay solar, atau interaksi dengan masyarakat sekitar..."
                className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-amber-500 focus:outline-none"
              />
            </div>
          </div>
        )}

        {/* Wizard Footer Navigation Controls */}
        <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3">
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={() => setCurrentStep((prev) => prev - 1)}
                className="flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-slate-100 text-slate-700 font-bold rounded-xl border border-slate-300 text-xs transition"
              >
                <ChevronLeft className="w-4 h-4" />
                <span>Sebelumnya</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleSubmitReport(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition"
            >
              <Save className="w-4 h-4" />
              <span>Simpan Draft</span>
            </button>

            {currentStep < 6 ? (
              <button
                type="button"
                onClick={() => {
                  if (currentStep === 1 && !activeBlock) {
                    alert('Peringatan: Lokasi Kerja (Blok) belum dipilih atau belum tersedia untuk klien ini. Harap pilih blok yang valid terlebih dahulu!');
                    return;
                  }
                  setCurrentStep((prev) => prev + 1);
                }}
                className="flex items-center gap-1.5 px-5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition"
              >
                <span>Lanjut ke Langkah {currentStep + 1}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                type="button"
                onClick={() => handleSubmitReport(false)}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-lg transition"
              >
                <Send className="w-4 h-4" />
                <span>Kirim Laporan Resmi</span>
              </button>
            )}
          </div>
        </div>

      </div>

      {/* MODAL: TAMBAH PERSONIL BKO / BANTUAN LAPANGAN */}
      {showAddBkoModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4 my-8">
            <div className="border-b border-slate-100 pb-3 flex items-start justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900 uppercase flex items-center gap-2">
                  <UserPlus className="w-5 h-5 text-amber-500" />
                  + Tambah Personil BKO ke Lokasi Ini
                </h3>
                <p className="text-xs text-slate-500">
                  Tugaskan personil dari basecamp lain atau tim cadangan untuk membantu pengerjaan di {activeBlock?.code}.
                </p>
              </div>
            </div>

            <div className="max-h-80 overflow-y-auto space-y-2 pr-1">
              {allWorkers
                .filter((w) => !locationWorkers.some((lw) => lw.workerId === w.id))
                .map((w) => {
                  const clientObj = clients.find((c) => c.id === w.assignedClientId);
                  const blockObj = allBlocks.find((b) => b.id === w.assignedBlockId);

                  return (
                    <div
                      key={w.id}
                      className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs"
                    >
                      <div className="space-y-0.5">
                        <div className="font-bold text-slate-900 text-sm">{w.name}</div>
                        <div className="text-slate-600 font-medium">{w.role} • {w.teamName || 'Tim Lapangan'}</div>
                        <div className="text-[11px] text-slate-400">
                          Penugasan Utama: {clientObj?.name || 'Lintas Proyek'} {blockObj ? `• ${blockObj.code}` : ''}
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          // Add/assign to current location
                          setLaborList((prev) => {
                            const next = [...prev];
                            const idx = next.findIndex((l) => l.workerId === w.id);
                            if (idx !== -1) {
                              next[idx].assignedClientId = selectedClientId;
                              next[idx].assignedBlockId = selectedBlockId;
                              next[idx].status = 'Hadir';
                              next[idx].notes = 'Personil BKO Lapangan (Bantuan)';
                            } else {
                              next.push({
                                workerId: w.id,
                                workerName: w.name,
                                category: w.category,
                                role: w.role,
                                status: 'Hadir',
                                teamName: w.teamName || 'Tim Lapangan',
                                assignedClientId: selectedClientId,
                                assignedBlockId: selectedBlockId,
                                notes: 'Personil BKO Lapangan (Bantuan)',
                              });
                            }
                            return next;
                          });
                          setShowAddBkoModal(false);
                        }}
                        className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg shrink-0 cursor-pointer shadow-xs"
                      >
                        + Pilih BKO
                      </button>
                    </div>
                  );
                })}

              {allWorkers.filter((w) => !locationWorkers.some((lw) => lw.workerId === w.id)).length === 0 && (
                <div className="p-6 text-center text-slate-500 text-xs">
                  Semua personil perusahaan sudah terdaftar di lokasi ini.
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setShowAddBkoModal(false)}
                className="px-4 py-2 text-xs text-slate-600 hover:bg-slate-100 rounded-lg font-bold cursor-pointer"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
      {/* MODAL: KONFIRMASI HAPUS ELEMENT DRAF */}
      {wizardDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-7 shadow-2xl border border-rose-100 space-y-5 animate-in zoom-in-95 duration-200">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-rose-100 border border-rose-200 flex items-center justify-center text-rose-600 shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900 leading-tight">
                  {wizardDeleteConfirm.title}
                </h3>
                <p className="text-xs text-rose-600 font-bold mt-0.5">
                  Konfirmasi Hapus Draf Form Laporan
                </p>
              </div>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              {wizardDeleteConfirm.description}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setWizardDeleteConfirm(null)}
                className="px-4 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 font-bold text-xs transition cursor-pointer"
              >
                Batalkan
              </button>
              <button
                type="button"
                onClick={() => {
                  wizardDeleteConfirm.onConfirm();
                  setWizardDeleteConfirm(null);
                }}
                className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-black text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Ya, Hapus</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
