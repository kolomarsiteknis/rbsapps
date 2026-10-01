/**
 * RBS APPS - Heavy Equipment Land Clearing Plantation Project
 * Zero Burning Method (Metode Tanpa Bakar)
 * PT. RBS GROUP
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Header, TabKey } from './components/Header';
import { MobileBottomNav } from './components/MobileBottomNav';
import { DashboardView } from './components/DashboardView';
import { ReportWizard } from './components/ReportWizard';
import { ReportListView } from './components/ReportListView';
import { PdfReportModal } from './components/PdfReportModal';
import { MasterDataView } from './components/MasterDataView';
import { LogisticsInventoryView } from './components/LogisticsInventoryView';
import { SupervisorToolsView } from './components/SupervisorToolsView';
import { DirectorFieldMonitorView } from './components/DirectorFieldMonitorView';
import { ManagerApprovalView } from './components/ManagerApprovalView';
import { UserActivityAuditLogView } from './components/UserActivityAuditLogView';
import { UserManagementView } from './components/UserManagementView';
import { CompanyProfileView } from './components/CompanyProfileView';
import { CompanyMasterDataView } from './components/CompanyMasterDataView';
import { TutorialView } from './components/TutorialView';
import { ClientPortalView } from './components/ClientPortalView';
import { DataRecoveryView } from './components/DataRecoveryView';
import { LoginPage } from './components/LoginPage';
import { ErrorBoundary } from './components/ErrorBoundary';
import { storageService } from './services/storageService';
import { initFirestoreSync, onSyncStatusChange, toggleFirestoreNetwork, SyncStatus, getLastSuccessfulSyncTime } from './services/firestoreSync';
import { recordUserActivity } from './utils/activityLogger';
import { DailyReport, Equipment, UserRole, Client, AuthUser, CompanyProfile, CompanyStaff, ManagedUser } from './types';
import { CheckCircle2, AlertCircle, ShieldAlert, Clock, RotateCcw, LogOut } from 'lucide-react';

const AUTH_STORAGE_KEY = 'suryaland_auth_user_v1';
const IDLE_STORAGE_KEY = 'suryaland_last_activity_v1';
const LAST_LOGIN_TIMESTAMP_KEY = 'lastLoginTimestamp';
const SESSION_TOKEN_KEY = 'suryaland_session_token_v1';
const DIAGNOSTIC_LOGS_KEY = 'suryaland_auth_diagnostic_logs_v1';
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes of inactivity
const IDLE_WARNING_MS = 28 * 60 * 1000; // Warning displayed at 28 minutes (last 2 minutes)

export interface AuthDiagnosticLogEntry {
  id: string;
  timestamp: string;
  attemptedUsername: string;
  failureReason: string;
  localDataPresent: boolean;
  localStaffCount: number;
  localManagedUsersCount: number;
  corruptedOrExpiredKeysReset: string[];
  recoveredUserFound: boolean;
  details: string;
}

export interface LoginDiagnosticResult {
  localDataPresent: boolean;
  repairedKeys: string[];
  recoveredUser?: ManagedUser;
  diagnosticEntry?: AuthDiagnosticLogEntry;
}

/**
 * Verifies if the user's `lastLoginTimestamp`, idle activity timestamp, or session token
 * in `localStorage` has become corrupted or expired prematurely, and resets ONLY the problematic key.
 */
export function verifyAndRepairSessionStorage(activeUser?: AuthUser | null): string[] {
  if (typeof window === 'undefined') return [];
  const repairedKeys: string[] = [];
  const now = Date.now();
  const maxFutureSkewMs = 5 * 60 * 1000; // 5 minutes tolerance

  // 1. Check `lastLoginTimestamp` for corruption or premature expiration
  try {
    const rawLastLogin = localStorage.getItem(LAST_LOGIN_TIMESTAMP_KEY);
    if (rawLastLogin !== null) {
      const parsedTs = Number(rawLastLogin);
      const isCorrupted = !rawLastLogin.trim() || Number.isNaN(parsedTs) || parsedTs <= 0 || parsedTs > now + maxFutureSkewMs;
      const loginTimeMs = activeUser?.loginTime ? new Date(activeUser.loginTime).getTime() : null;
      const isPrematurelyExpired =
        Boolean(loginTimeMs && !Number.isNaN(loginTimeMs) && now - loginTimeMs < IDLE_TIMEOUT_MS && parsedTs < loginTimeMs - 1000);

      if (isCorrupted || isPrematurelyExpired) {
        if (activeUser) {
          localStorage.setItem(LAST_LOGIN_TIMESTAMP_KEY, now.toString());
        } else {
          localStorage.removeItem(LAST_LOGIN_TIMESTAMP_KEY);
        }
        repairedKeys.push(LAST_LOGIN_TIMESTAMP_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(LAST_LOGIN_TIMESTAMP_KEY);
      repairedKeys.push(LAST_LOGIN_TIMESTAMP_KEY);
    } catch {}
  }

  // 2. Check `IDLE_STORAGE_KEY` (`suryaland_last_activity_v1`) for corruption or premature expiration
  try {
    const rawIdle = localStorage.getItem(IDLE_STORAGE_KEY);
    if (rawIdle !== null) {
      const parsedIdle = parseInt(rawIdle, 10);
      const isCorrupted = !rawIdle.trim() || Number.isNaN(parsedIdle) || parsedIdle <= 0 || parsedIdle > now + maxFutureSkewMs;
      const loginTimeMs = activeUser?.loginTime ? new Date(activeUser.loginTime).getTime() : null;
      // Premature expiration: user logged in recently (< IDLE_TIMEOUT_MS), but IDLE_STORAGE_KEY holds an old stale timestamp
      const isPrematurelyExpired =
        Boolean(
          loginTimeMs &&
            !Number.isNaN(loginTimeMs) &&
            now - loginTimeMs < IDLE_TIMEOUT_MS &&
            (parsedIdle < loginTimeMs - 5000 || now - parsedIdle >= IDLE_TIMEOUT_MS)
        );

      if (isCorrupted || isPrematurelyExpired) {
        if (activeUser) {
          localStorage.setItem(IDLE_STORAGE_KEY, now.toString());
        } else {
          localStorage.removeItem(IDLE_STORAGE_KEY);
        }
        repairedKeys.push(IDLE_STORAGE_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(IDLE_STORAGE_KEY);
      repairedKeys.push(IDLE_STORAGE_KEY);
    } catch {}
  }

  // 3. Check `SESSION_TOKEN_KEY` (`suryaland_session_token_v1`) for corruption or premature expiration
  try {
    const rawToken = localStorage.getItem(SESSION_TOKEN_KEY);
    if (rawToken !== null) {
      let tokenCorrupted = false;
      let tokenPrematurelyExpired = false;
      try {
        const parsedToken = JSON.parse(rawToken);
        if (
          !parsedToken ||
          typeof parsedToken !== 'object' ||
          typeof parsedToken.username !== 'string' ||
          typeof parsedToken.issuedAt !== 'number' ||
          typeof parsedToken.expiresAt !== 'number' ||
          Number.isNaN(parsedToken.issuedAt) ||
          Number.isNaN(parsedToken.expiresAt) ||
          parsedToken.issuedAt > now + maxFutureSkewMs
        ) {
          tokenCorrupted = true;
        } else if (
          parsedToken.expiresAt <= parsedToken.issuedAt ||
          (activeUser &&
            parsedToken.username.toLowerCase() === activeUser.username.toLowerCase() &&
            now - parsedToken.issuedAt < IDLE_TIMEOUT_MS &&
            parsedToken.expiresAt <= now)
        ) {
          tokenPrematurelyExpired = true;
        }
      } catch {
        tokenCorrupted = true;
      }

      if (tokenCorrupted || tokenPrematurelyExpired) {
        if (activeUser) {
          localStorage.setItem(
            SESSION_TOKEN_KEY,
            JSON.stringify({
              token: `sess_${activeUser.id || activeUser.username}_${now}`,
              username: activeUser.username,
              issuedAt: now,
              expiresAt: now + IDLE_TIMEOUT_MS,
            })
          );
        } else {
          localStorage.removeItem(SESSION_TOKEN_KEY);
        }
        repairedKeys.push(SESSION_TOKEN_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(SESSION_TOKEN_KEY);
      repairedKeys.push(SESSION_TOKEN_KEY);
    } catch {}
  }

  // 4. Check `AUTH_STORAGE_KEY` (`suryaland_auth_user_v1`) for structural corruption
  try {
    const rawAuth = localStorage.getItem(AUTH_STORAGE_KEY);
    if (rawAuth !== null) {
      let authCorrupted = false;
      try {
        const parsedAuth = JSON.parse(rawAuth);
        if (
          !parsedAuth ||
          typeof parsedAuth !== 'object' ||
          !parsedAuth.username ||
          typeof parsedAuth.username !== 'string' ||
          !parsedAuth.role
        ) {
          authCorrupted = true;
        } else if (parsedAuth.loginTime) {
          const loginTs = new Date(parsedAuth.loginTime).getTime();
          if (Number.isNaN(loginTs) || loginTs <= 0 || loginTs > now + maxFutureSkewMs) {
            parsedAuth.loginTime = new Date(now).toISOString();
            localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsedAuth));
            repairedKeys.push(`${AUTH_STORAGE_KEY}.loginTime`);
          }
        }
      } catch {
        authCorrupted = true;
      }

      if (authCorrupted) {
        localStorage.removeItem(AUTH_STORAGE_KEY);
        repairedKeys.push(AUTH_STORAGE_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      repairedKeys.push(AUTH_STORAGE_KEY);
    } catch {}
  }

  return repairedKeys;
}

/**
 * Diagnostic logs helper triggered when login fails despite local data being present.
 * Verifies if `lastLoginTimestamp`, session token, or user sync keys in `localStorage`
 * have become corrupted or expired prematurely, resets ONLY the problematic key(s),
 * and attempts to recover the valid local user record.
 */
export function triggerLoginFailureDiagnostic(
  attemptedUsername: string,
  failureReason: string = 'AUTH_LOOKUP_OR_CREDENTIAL_MISMATCH'
): LoginDiagnosticResult {
  if (typeof window === 'undefined') {
    return { localDataPresent: false, repairedKeys: [] };
  }

  const normUser = (attemptedUsername || '').trim().replace(/^@+/, '').toLowerCase();
  const repairedKeys = verifyAndRepairSessionStorage(null);

  let localStaffCount = 0;
  let localManagedUsersCount = 0;
  let matchedStaffRecord: CompanyStaff | undefined;
  let matchedManagedUserRecord: ManagedUser | undefined;

  // Inspect local `suryaland_company_staff_v1`
  const STAFF_KEY = 'suryaland_company_staff_v1';
  try {
    const rawStaff = localStorage.getItem(STAFF_KEY);
    if (rawStaff !== null) {
      const parsedStaff = JSON.parse(rawStaff);
      if (Array.isArray(parsedStaff)) {
        localStaffCount = parsedStaff.length;
        matchedStaffRecord = parsedStaff.find(
          (s: any) =>
            s &&
            (String(s.username || '').trim().replace(/^@+/, '').toLowerCase() === normUser ||
              String(s.employeeIdNumber || '').trim().toLowerCase() === normUser ||
              String(s.email || '').trim().toLowerCase() === normUser)
        );
      } else {
        localStorage.removeItem(STAFF_KEY);
        repairedKeys.push(STAFF_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(STAFF_KEY);
      repairedKeys.push(STAFF_KEY);
    } catch {}
  }

  // Inspect local `suryaland_managed_users_v1`
  const USERS_KEY = 'suryaland_managed_users_v1';
  try {
    const rawUsers = localStorage.getItem(USERS_KEY);
    if (rawUsers !== null) {
      const parsedUsers = JSON.parse(rawUsers);
      if (Array.isArray(parsedUsers)) {
        localManagedUsersCount = parsedUsers.length;
        matchedManagedUserRecord = parsedUsers.find(
          (u: any) =>
            u &&
            (String(u.username || '').trim().replace(/^@+/, '').toLowerCase() === normUser ||
              String(u.employeeIdNumber || '').trim().toLowerCase() === normUser ||
              String(u.email || '').trim().toLowerCase() === normUser)
        );
      } else {
        localStorage.removeItem(USERS_KEY);
        repairedKeys.push(USERS_KEY);
      }
    }
  } catch {
    try {
      localStorage.removeItem(USERS_KEY);
      repairedKeys.push(USERS_KEY);
    } catch {}
  }

  const localDataPresent = localStaffCount > 0 || localManagedUsersCount > 0;
  if (!localDataPresent) {
    return { localDataPresent: false, repairedKeys };
  }

  // Check if the user exists in local data but was blocked by corrupted/stale deleted IDs keys
  const DELETED_USERS_KEY = 'suryaland_deleted_user_ids_v1';
  const DELETED_STAFF_KEY = 'suryaland_deleted_staff_ids_v1';

  if (matchedStaffRecord || matchedManagedUserRecord) {
    const candidateStaffId = matchedStaffRecord?.id;
    const candidateUserId =
      matchedManagedUserRecord?.id ||
      matchedStaffRecord?.linkedUserId ||
      (candidateStaffId ? `user-usr-${candidateStaffId.replace(/^staff-/, '')}` : undefined);

    try {
      const rawDelUsers = localStorage.getItem(DELETED_USERS_KEY);
      if (rawDelUsers) {
        const parsedDelUsers = JSON.parse(rawDelUsers);
        if (!Array.isArray(parsedDelUsers)) {
          localStorage.removeItem(DELETED_USERS_KEY);
          repairedKeys.push(DELETED_USERS_KEY);
        } else if (candidateUserId && parsedDelUsers.includes(candidateUserId)) {
          const cleaned = parsedDelUsers.filter((id: string) => id !== candidateUserId);
          localStorage.setItem(DELETED_USERS_KEY, JSON.stringify(cleaned));
          repairedKeys.push(`${DELETED_USERS_KEY}[${candidateUserId}]`);
        }
      }
    } catch {
      localStorage.removeItem(DELETED_USERS_KEY);
      repairedKeys.push(DELETED_USERS_KEY);
    }

    try {
      const rawDelStaff = localStorage.getItem(DELETED_STAFF_KEY);
      if (rawDelStaff) {
        const parsedDelStaff = JSON.parse(rawDelStaff);
        if (!Array.isArray(parsedDelStaff)) {
          localStorage.removeItem(DELETED_STAFF_KEY);
          repairedKeys.push(DELETED_STAFF_KEY);
        } else if (candidateStaffId && parsedDelStaff.includes(candidateStaffId)) {
          const cleaned = parsedDelStaff.filter((id: string) => id !== candidateStaffId);
          localStorage.setItem(DELETED_STAFF_KEY, JSON.stringify(cleaned));
          repairedKeys.push(`${DELETED_STAFF_KEY}[${candidateStaffId}]`);
        }
      }
    } catch {
      localStorage.removeItem(DELETED_STAFF_KEY);
      repairedKeys.push(DELETED_STAFF_KEY);
    }

    // Re-sync staff record into ManagedUsers if it was missing or desynchronized
    if (matchedStaffRecord && matchedStaffRecord.username && matchedStaffRecord.password) {
      storageService.saveCompanyStaff(matchedStaffRecord);
      repairedKeys.push('staff_to_managed_user_resync');
    }
  }

  const recoveredUser = storageService.getManagedUserByUsername(normUser);

  const diagnosticEntry: AuthDiagnosticLogEntry = {
    id: `diag-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
    attemptedUsername: normUser,
    failureReason,
    localDataPresent,
    localStaffCount,
    localManagedUsersCount,
    corruptedOrExpiredKeysReset: repairedKeys,
    recoveredUserFound: Boolean(recoveredUser),
    details:
      repairedKeys.length > 0
        ? `Mendeteksi & mereset key bermasalah: ${repairedKeys.join(', ')}. Status pemulihan akun lokal: ${
            recoveredUser ? 'Berhasil dipulihkan' : 'Tidak ditemukan'
          }.`
        : `Data lokal tersedia (Staff: ${localStaffCount}, Users: ${localManagedUsersCount}). Akun @${normUser}: ${
            recoveredUser ? `Ditemukan (Status: ${recoveredUser.status})` : 'Tidak terdaftar di penyimpanan lokal'
          }.`,
  };

  try {
    const rawLogs = localStorage.getItem(DIAGNOSTIC_LOGS_KEY);
    const parsedLogs: AuthDiagnosticLogEntry[] = rawLogs ? JSON.parse(rawLogs) : [];
    const safeLogs = Array.isArray(parsedLogs) ? parsedLogs : [];
    safeLogs.unshift(diagnosticEntry);
    localStorage.setItem(DIAGNOSTIC_LOGS_KEY, JSON.stringify(safeLogs.slice(0, 50)));
  } catch {
    try {
      localStorage.removeItem(DIAGNOSTIC_LOGS_KEY);
    } catch {}
  }

  console.warn('[Auth Diagnostic Helper] Login failure diagnostic triggered:', diagnosticEntry);

  let resolvedRole: UserRole = 'supervisor';
  if (recoveredUser) {
    const jobLower = (recoveredUser.jobTitle || '').toLowerCase();
    const isSuper = recoveredUser.userLevel === 'Superadmin' || jobLower.includes('direktur');
    const isSiteManager =
      recoveredUser.userLevel === 'Site Manager' ||
      recoveredUser.userLevel === 'Manager' ||
      jobLower.includes('manager');
    const isClient = recoveredUser.userLevel === 'Klien' || jobLower.includes('klien');
    resolvedRole = isSuper
      ? 'director'
      : isSiteManager
      ? 'manager'
      : isClient
      ? 'client'
      : 'supervisor';
  }

  recordUserActivity({
    userId: recoveredUser?.id || 'diag-auth-system',
    userName: recoveredUser?.fullName || `@${normUser}`,
    userRole: resolvedRole,
    actionCategory: 'AUTH',
    actionTitle: `Diagnostik Login: @${normUser}`,
    actionDescription: diagnosticEntry.details,
    targetEntity: normUser,
  });

  return {
    localDataPresent,
    repairedKeys,
    recoveredUser,
    diagnosticEntry,
  };
}

function MainApp() {
  // Authentication State
  const [authUser, setAuthUser] = useState<AuthUser | null>(() => {
    try {
      // Verify and repair any corrupted or prematurely expired session/timestamp keys before reading auth state
      verifyAndRepairSessionStorage(null);
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (!saved) return null;
      const parsed: AuthUser = JSON.parse(saved);
      verifyAndRepairSessionStorage(parsed);
      if (parsed && parsed.displayName && parsed.displayName.toLowerCase().includes('hendra wijaya')) {
        const staffList = storageService.getCompanyStaff();
        const directorStaff = staffList.find(
          (s) => s.userLevel === 'Superadmin' || s.staffLevel === 'Direktur' || (s.jobRole || '').toLowerCase().includes('direktur')
        );
        parsed.displayName = directorStaff?.fullName || 'Direktur Utama';
        if (parsed.email && parsed.email.toLowerCase().includes('hendra.wijaya')) {
          parsed.email = directorStaff?.email || 'direktur@suryaland.co.id';
        }
        localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
      }
      return parsed;
    } catch {
      try {
        localStorage.removeItem(AUTH_STORAGE_KEY);
      } catch {}
      return null;
    }
  });

  // Company Profile & Dynamic Branding State
  const [companyProfile, setCompanyProfile] = useState<CompanyProfile>(() => storageService.getCompanyProfile());
  const [preloadStaffForUserManagement, setPreloadStaffForUserManagement] = useState<CompanyStaff | null>(null);
  const [lastSyncTime, setLastSyncTime] = useState<string>(() => getLastSuccessfulSyncTime());

  useEffect(() => {
    const handleSyncUpdate = (e: any) => {
      if (e?.detail?.timeStr) {
        setLastSyncTime(e.detail.timeStr);
      }
    };
    window.addEventListener('suryaland_last_sync_update', handleSyncUpdate);
    return () => window.removeEventListener('suryaland_last_sync_update', handleSyncUpdate);
  }, []);

  // Idle timeout state for shared tablet security
  const [idleWarningSeconds, setIdleWarningSeconds] = useState<number | null>(null);
  const [idleNotice, setIdleNotice] = useState<string | null>(null);

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'client' || u.userLevel === 'Klien') return 'client-portal';
        if (u.role === 'manager') return 'approval';
        if (u.role === 'director') return 'dashboard';
        return 'wizard';
      }
    } catch {
      // fallback
    }
    return 'wizard';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>(() => {
    try {
      const saved = localStorage.getItem(AUTH_STORAGE_KEY);
      if (saved) {
        const u = JSON.parse(saved);
        if (u.role === 'supervisor' && u.assignedClientId && u.assignedClientId !== 'all') {
          return u.assignedClientId;
        }
      }
    } catch {}
    return 'ALL';
  });

  const [reports, setReports] = useState<DailyReport[]>([]);
  const [equipments, setEquipments] = useState<Equipment[]>([]);
  const [selectedReportIdForModal, setSelectedReportIdForModal] = useState<string | null>(null);

  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'info' | 'warning' | 'error' } | null>(null);

  // Initialize Firestore dynamic real-time synchronization & offline persistence
  useEffect(() => {
    initFirestoreSync();

    const unsubSyncStatus = onSyncStatusChange((status: SyncStatus) => {
      setIsOnline(status !== 'offline');
    });

    const handleFirestoreSync = () => {
      loadData();
    };

    const handleCompanySync = () => {
      setCompanyProfile(storageService.getCompanyProfile());
    };

    window.addEventListener('suryaland_firestore_sync', handleFirestoreSync);
    window.addEventListener('suryaland_company_profile_sync', handleCompanySync);
    window.addEventListener('suryaland_reports_sync', handleFirestoreSync);
    window.addEventListener('suryaland_master_sync', handleFirestoreSync);
    window.addEventListener('suryaland_logistics_sync', handleFirestoreSync);
    window.addEventListener('suryaland_users_sync', handleFirestoreSync);
    window.addEventListener('suryaland_company_staff_sync', handleFirestoreSync);
    return () => {
      unsubSyncStatus();
      window.removeEventListener('suryaland_firestore_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_company_profile_sync', handleCompanySync);
      window.removeEventListener('suryaland_reports_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_master_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_logistics_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_users_sync', handleFirestoreSync);
      window.removeEventListener('suryaland_company_staff_sync', handleFirestoreSync);
    };
  }, [authUser?.username]);

  // Load initial data
  useEffect(() => {
    if (authUser) {
      if (authUser.role === 'client' || authUser.userLevel === 'Klien') {
        setSelectedClientId('ALL');
        setActiveTab('client-portal');
      } else if (authUser.role === 'supervisor' && authUser.assignedClientId && authUser.assignedClientId !== 'all') {
        setSelectedClientId(authUser.assignedClientId);
        setActiveTab('wizard');
      } else if (authUser.role === 'director') {
        setActiveTab('dashboard');
      }
    }
    loadData();
  }, [authUser?.username, authUser?.assignedClientId]);

  const loadData = () => {
    setClients(storageService.getClients());
    setReports(storageService.getReports(undefined, authUser));
    setEquipments(storageService.getEquipments());
    setCompanyProfile(storageService.getCompanyProfile());
  };

  const handleSetSelectedClientId = (id: string) => {
    // Pengawas HANYA mengawasi 1 Klien PT yang ditugaskan oleh Superadmin
    if (authUser?.role === 'supervisor' && authUser.assignedClientId && authUser.assignedClientId !== 'all') {
      setSelectedClientId(authUser.assignedClientId);
      return;
    }
    setSelectedClientId(id);
  };

  const showToast = (text: string, type: 'success' | 'info' | 'warning' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Reset idle timer timestamp on active user interaction
  const handleExtendSession = useCallback(() => {
    const now = Date.now();
    try {
      localStorage.setItem(IDLE_STORAGE_KEY, now.toString());
      localStorage.setItem(LAST_LOGIN_TIMESTAMP_KEY, now.toString());
    } catch {}
    setIdleWarningSeconds(null);
    showToast('Sesi Anda telah diperpanjang.', 'success');
  }, []);

  // Idle timeout detector for shared tablets in the field (30 minutes inactivity)
  useEffect(() => {
    if (!authUser) {
      setIdleWarningSeconds(null);
      return;
    }

    // Verify & repair any corrupted or prematurely expired timestamp / session token keys first
    verifyAndRepairSessionStorage(authUser);

    // Set initial activity timestamp if not yet stored
    try {
      if (!localStorage.getItem(IDLE_STORAGE_KEY)) {
        localStorage.setItem(IDLE_STORAGE_KEY, Date.now().toString());
      }
      if (!localStorage.getItem(LAST_LOGIN_TIMESTAMP_KEY)) {
        localStorage.setItem(LAST_LOGIN_TIMESTAMP_KEY, Date.now().toString());
      }
    } catch {}

    let lastThrottleTime = 0;
    const recordUserActivityEvent = () => {
      // If warning modal is actively displayed, do not reset passively via background mouse moves;
      // requires user to explicitly click "Lanjutkan Sesi"
      if (idleWarningSeconds !== null) return;

      const now = Date.now();
      // Throttle storage writes to once every 3 seconds to preserve tablet CPU and battery
      if (now - lastThrottleTime > 3000) {
        lastThrottleTime = now;
        try {
          localStorage.setItem(IDLE_STORAGE_KEY, now.toString());
        } catch {}
      }
    };

    // Periodic check every 1 second
    const checkIdleInterval = setInterval(() => {
      try {
        const lastActiveStr = localStorage.getItem(IDLE_STORAGE_KEY);
        const parsedActive = lastActiveStr ? parseInt(lastActiveStr, 10) : NaN;
        if (Number.isNaN(parsedActive) || parsedActive <= 0) {
          // Corrupted timestamp detected -> repair only the problematic key instead of logging out
          verifyAndRepairSessionStorage(authUser);
          return;
        }
        const elapsed = Date.now() - parsedActive;

        if (elapsed >= IDLE_TIMEOUT_MS) {
          // Verify whether this is a premature expiration (e.g. stale key despite recent loginTime)
          const repaired = verifyAndRepairSessionStorage(authUser);
          if (repaired.includes(IDLE_STORAGE_KEY) || repaired.includes(LAST_LOGIN_TIMESTAMP_KEY)) {
            setIdleWarningSeconds(null);
            return;
          }
          // Inactivity limit (30 minutes) genuinely reached -> Auto logout immediately
          setIdleWarningSeconds(null);
          handleLogout(true);
        } else if (elapsed >= IDLE_WARNING_MS) {
          // Warning threshold (28 minutes) reached -> Show 2-minute countdown
          const remainingSec = Math.max(1, Math.ceil((IDLE_TIMEOUT_MS - elapsed) / 1000));
          setIdleWarningSeconds(remainingSec);
        } else {
          setIdleWarningSeconds(null);
        }
      } catch (err) {
        console.error('Idle timeout check failed', err);
      }
    }, 1000);

    // Screen wake / tab visibility handler (vital for shared tablets sleeping in the field)
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        try {
          const lastActiveStr = localStorage.getItem(IDLE_STORAGE_KEY);
          if (lastActiveStr) {
            const parsedActive = parseInt(lastActiveStr, 10);
            if (Number.isNaN(parsedActive) || parsedActive <= 0) {
              verifyAndRepairSessionStorage(authUser);
              return;
            }
            const elapsed = Date.now() - parsedActive;
            if (elapsed >= IDLE_TIMEOUT_MS) {
              const repaired = verifyAndRepairSessionStorage(authUser);
              if (!repaired.includes(IDLE_STORAGE_KEY)) {
                setIdleWarningSeconds(null);
                handleLogout(true);
                return;
              }
            }
          }
          recordUserActivityEvent();
        } catch {}
      }
    };

    // Synchronize across multiple browser tabs on the same tablet
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === IDLE_STORAGE_KEY && e.newValue) {
        setIdleWarningSeconds(null);
      }
    };

    // User interaction events covering touches, gestures, keys, clicks, and scroll
    const activityEvents: Array<keyof WindowEventMap> = [
      'mousedown', 
      'keydown', 
      'touchstart', 
      'touchmove', 
      'touchend', 
      'scroll', 
      'click'
    ];

    activityEvents.forEach((evt) => {
      window.addEventListener(evt, recordUserActivityEvent, { passive: true });
    });
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      clearInterval(checkIdleInterval);
      activityEvents.forEach((evt) => {
        window.removeEventListener(evt, recordUserActivityEvent);
      });
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [authUser, idleWarningSeconds]);

  // Login handler
  const handleLoginSuccess = (user: AuthUser) => {
    const now = Date.now();
    const freshUser: AuthUser = {
      ...user,
      loginTime: new Date(now).toISOString(),
    };
    setAuthUser(freshUser);
    setIdleNotice(null);
    setIdleWarningSeconds(null);
    try {
      localStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(freshUser));
      localStorage.setItem(IDLE_STORAGE_KEY, now.toString());
      localStorage.setItem(LAST_LOGIN_TIMESTAMP_KEY, now.toString());
      localStorage.setItem(
        SESSION_TOKEN_KEY,
        JSON.stringify({
          token: `sess_${freshUser.id || freshUser.username}_${now}`,
          username: freshUser.username,
          issuedAt: now,
          expiresAt: now + IDLE_TIMEOUT_MS,
        })
      );
    } catch (e) {
      console.error('Failed to save auth state', e);
    }

    if (user.role === 'client' || user.userLevel === 'Klien') {
      setSelectedClientId('ALL');
      setActiveTab('client-portal');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk ke Portal Monitoring Progress & Laporan SPK Klien.`);
    } else if (user.role === 'supervisor') {
      const assignedId = (user.assignedClientId && user.assignedClientId !== 'all') ? user.assignedClientId : 'client-1';
      setSelectedClientId(assignedId);
      setActiveTab('wizard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Pengawas Lapangan untuk ${user.assignedClientName || 'proyek penugasan'}.`);
    } else if (user.role === 'manager') {
      setSelectedClientId('ALL');
      setActiveTab('approval');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Manager Operasional.`);
    } else {
      setSelectedClientId('ALL');
      setActiveTab('dashboard');
      showToast(`Selamat Datang, ${user.displayName}! Anda masuk sebagai Direktur (Superadmin).`);
    }

    // Auto-record login activity with GPS tag
    recordUserActivity({
      userId: user.id,
      userName: user.displayName,
      userRole: user.role,
      userEmail: user.email,
      actionCategory: 'AUTH',
      actionTitle: `Masuk Sesi: ${user.displayName}`,
      actionDescription: `Pengguna berhasil login ke sistem sebagai ${user.role === 'director' ? 'Direktur (Superadmin)' : user.role === 'manager' ? 'Manager Operasional' : user.role === 'client' ? 'Klien (Monitoring Progress & Laporan SPK)' : 'Pengawas Lapangan'}.`,
      targetEntity: `Sesi ${user.role === 'director' ? 'Direksi' : user.role === 'manager' ? 'Manajemen Manager' : user.role === 'client' ? 'Portal Klien SPK' : 'Mobile Pengawas'}`,
    });
  };

  // Logout handler
  const handleLogout = (isIdleTimeout: boolean = false) => {
    if (authUser) {
      recordUserActivity({
        userId: authUser.id,
        userName: authUser.displayName,
        userRole: authUser.role,
        userEmail: authUser.email,
        actionCategory: 'AUTH',
        actionTitle: isIdleTimeout 
          ? `Sesi Berakhir Otomatis (Idle 30 Menit): ${authUser.displayName}` 
          : `Keluar Sesi: ${authUser.displayName}`,
        actionDescription: isIdleTimeout
          ? `Pengguna otomatis logout dari sistem setelah 30 menit tidak ada aktivitas untuk proteksi keamanan tablet bersama.`
          : `Pengguna keluar (logout) dari sistem aplikasi.`,
        targetEntity: `Sesi ${authUser.role === 'director' ? 'Direksi' : authUser.role === 'manager' ? 'Manajemen Manager' : 'Mobile Pengawas'}`,
      });
    }

    setAuthUser(null);
    setIdleWarningSeconds(null);
    try {
      localStorage.removeItem(AUTH_STORAGE_KEY);
      localStorage.removeItem(IDLE_STORAGE_KEY);
      localStorage.removeItem(LAST_LOGIN_TIMESTAMP_KEY);
      localStorage.removeItem(SESSION_TOKEN_KEY);
    } catch (e) {
      console.error('Failed to remove auth state', e);
    }

    if (isIdleTimeout) {
      setIdleNotice('Sesi Anda telah berakhir secara otomatis setelah 30 menit tidak ada aktivitas. Hal ini diterapkan demi keamanan data proyek pada tablet bersama.');
      showToast('Sesi otomatis berakhir setelah 30 menit tidak ada aktivitas (keamanan tablet bersama).', 'warning');
    } else {
      setIdleNotice(null);
      showToast('Anda telah berhasil keluar dari sistem.', 'info');
    }
  };

  const handleReportSaved = (newReport: DailyReport) => {
    loadData();
    recordUserActivity({
      userId: authUser?.id,
      userName: authUser?.displayName || 'Pengawas Lapangan',
      userRole: authUser?.role || 'supervisor',
      userEmail: authUser?.email,
      actionCategory: 'REPORT',
      actionTitle: `Simpan Laporan ${newReport.reportNumber}`,
      actionDescription: `Menyimpan Laporan Harian untuk ${newReport.clientName} (Blok ${newReport.blockCode}, Progres: ${newReport.physicalProgress?.realizedAreaHa ?? 0} Ha).`,
      targetEntity: newReport.reportNumber,
      clientId: newReport.clientId,
      clientName: newReport.clientName,
      blockCode: newReport.blockCode,
    });
    showToast(`Laporan ${newReport.reportNumber} untuk ${newReport.clientName} berhasil disimpan! (${newReport.syncStatus === 'synced' ? 'Tersinkronisasi Online' : 'Disimpan Lokal Offline'})`);
    setActiveTab('reports');
  };

  const handleApproveReport = (reportId: string) => {
    if (authUser?.role !== 'director' && authUser?.role !== 'manager') {
      showToast('Persetujuan dokumen hanya dapat dilakukan oleh Direktur atau Manager.', 'warning');
      return;
    }
    const isManager = authUser.role === 'manager';
    const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Direktur Utama');
    const updated = isManager 
      ? storageService.approveReportByManager(reportId, approverName)
      : storageService.approveReportByDirector(reportId, approverName);

    if (updated) {
      loadData();
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: authUser.role,
        userEmail: authUser?.email,
        actionCategory: 'REPORT',
        actionTitle: `Approval Laporan ${updated.reportNumber}`,
        actionDescription: `Memberikan persetujuan resmi ${isManager ? 'Manager' : 'Direktur'} untuk laporan ${updated.clientName} (Blok ${updated.blockCode}).`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });
      showToast(`Laporan ${updated.reportNumber} resmi disetujui ${isManager ? 'Manager' : 'Direktur'}.`);
    }
  };

  const handleRejectReport = (reportId: string, reason: string) => {
    if (authUser?.role !== 'director' && authUser?.role !== 'manager') {
      showToast('Penolakan dokumen hanya dapat dilakukan oleh Direktur atau Manager.', 'warning');
      return;
    }
    const isManager = authUser.role === 'manager';
    const approverName = authUser?.displayName || (isManager ? 'Bambang Sugiarto, S.P.' : 'Direktur Utama');
    const updated = isManager
      ? storageService.rejectReportByManager(reportId, approverName, reason)
      : storageService.rejectReportByDirector(reportId, approverName, reason);

    if (updated) {
      loadData();
      recordUserActivity({
        userId: authUser?.id,
        userName: approverName,
        userRole: authUser.role,
        userEmail: authUser?.email,
        actionCategory: 'AUTH',
        actionTitle: `Penolakan Laporan ${updated.reportNumber}`,
        actionDescription: `Menolak laporan ${updated.clientName} (Blok ${updated.blockCode}) dengan catatan alasan: ${reason}.`,
        targetEntity: updated.reportNumber,
        clientId: updated.clientId,
        clientName: updated.clientName,
        blockCode: updated.blockCode,
      });
      showToast(`Laporan ${updated.reportNumber} ditolak ${isManager ? 'Manager' : 'Direktur'}. Catatan diteruskan ke Pengawas.`, 'info');
    }
  };

  const handleDeleteReport = (reportId: string) => {
    const report = storageService.getReportById(reportId);
    if (!report) return;

    if (authUser?.role === 'supervisor') {
      if (!storageService.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        showToast('Akses Ditolak: Anda tidak dapat menghapus laporan di luar penugasan proyek/blok Anda!', 'error');
        return;
      }
    }

    const success = storageService.deleteReport(reportId, authUser);
    if (success) {
      loadData();
      showToast('Laporan berhasil dihapus.', 'info');
    } else {
      showToast('Gagal menghapus laporan: akses tidak diizinkan.', 'error');
    }
  };

  const handleResetData = async () => {
    if (authUser?.role !== 'director') {
      showToast('Reset data hanya dapat dilakukan oleh Direktur (Superadmin).', 'warning');
      return;
    }
    showToast('Sedang mereset seluruh database ke kondisi awal standar default (kosongan)...', 'info');
    await storageService.resetToDefault();
    loadData();
    setSelectedClientId('ALL');
    showToast('Database berhasil di-reset total! Akun default tersimpan di database: superadmin (@Super12345), manager (@manager12345), pengawas (@pengawas12345), klienpt (@klien12345). Mengalihkan ke login...', 'info');
    setTimeout(() => {
      handleLogout();
    }, 1500);
  };

  const handleOpenPdfModal = (reportId: string) => {
    const report = storageService.getReportById(reportId);
    if (report && authUser?.role === 'supervisor') {
      if (!storageService.canSupervisorAccess(report.clientId, report.blockCode, authUser)) {
        showToast('Akses Ditolak: Dokumen ini berada di luar penugasan proyek/blok resmi Anda.', 'warning');
        return;
      }
    }
    setSelectedReportIdForModal(reportId);
  };

  // Enforce Access Control when changing tabs
  const handleTabChange = (tab: TabKey) => {
    loadData();

    // Check permissions
    if (authUser?.role === 'client' || authUser?.userLevel === 'Klien') {
      if (tab !== 'client-portal' && tab !== 'reports' && tab !== 'official-pdf') {
        showToast('Akses Ditolak: Akun Klien hanya memiliki hak akses Monitoring Progress & Laporan sesuai SPK.', 'warning');
        setActiveTab('client-portal');
        return;
      }
    }

    if (authUser?.role === 'supervisor') {
      if (tab === 'dashboard' || tab === 'master' || tab === 'company-profile' || tab === 'director-field-monitor' || tab === 'user-activity-log' || tab === 'user-management' || tab === 'approval' || tab === 'client-portal') {
        showToast('Akses Ditolak: Fitur ini hanya dapat diakses oleh Manajemen / Direksi.', 'warning');
        setActiveTab('wizard');
        return;
      }
    }

    if (authUser?.role === 'manager') {
      if (tab === 'dashboard' || tab === 'master' || tab === 'company-profile' || tab === 'wizard' || tab === 'supervisor-tools' || tab === 'user-management' || tab === 'user-activity-log') {
        showToast('Akses Ditolak: Fitur ini tidak termasuk dalam wewenang akun Manager.', 'warning');
        setActiveTab('approval');
        return;
      }
    }

    if (authUser?.role === 'director') {
      if (tab === 'wizard') {
        showToast('Akses Ditolak: Penginputan Laporan Harian adalah wewenang khusus Pengawas Lapangan.', 'warning');
        setActiveTab('reports');
        return;
      }
      if (tab === 'supervisor-tools') {
        showToast('Akses Ditolak: Fitur Cepat Lapangan (P2H, Geotag, K3) khusus Pengawas Lapangan.', 'warning');
        setActiveTab('dashboard');
        return;
      }
    }

    setActiveTab(tab);
  };

  // If user is not logged in, render the Welcome & Login page
  if (!authUser) {
    return (
      <LoginPage 
        onLoginSuccess={handleLoginSuccess}
        onLoginFailureDiagnostic={triggerLoginFailureDiagnostic}
        idleNotice={idleNotice}
        onDismissNotice={() => setIdleNotice(null)}
      />
    );
  }

  const effectiveRole: UserRole = authUser.role;

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900 flex flex-col font-sans selection:bg-amber-400 selection:text-slate-950">
      {/* Global Header & Nav with Auth integration */}
      <Header
        activeTab={activeTab}
        setActiveTab={handleTabChange}
        authUser={authUser}
        onLogout={handleLogout}
        userRole={effectiveRole}
        isOnline={isOnline}
        setIsOnline={(online) => {
          setIsOnline(online);
          toggleFirestoreNetwork(online);
        }}
        onResetData={handleResetData}
        clients={clients}
        companyProfile={companyProfile}
        selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
        setSelectedClientId={handleSetSelectedClientId}
        isSidebarOpen={isSidebarOpen}
        setIsSidebarOpen={setIsSidebarOpen}
      />

      {/* Floating Alert Toast */}
      {toastMessage && (
        <div className={`fixed bottom-20 sm:bottom-6 right-4 sm:right-6 z-50 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 animate-bounce text-xs font-semibold border ${
          toastMessage.type === 'error'
            ? 'bg-rose-950 text-rose-200 border-rose-600'
            : toastMessage.type === 'warning'
            ? 'bg-amber-950 text-amber-200 border-amber-600'
            : toastMessage.type === 'info'
            ? 'bg-slate-900 text-slate-200 border-slate-700'
            : 'bg-slate-900 text-white border-emerald-500/50'
        }`}>
          {toastMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          ) : toastMessage.type === 'warning' ? (
            <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          )}
          <span>{toastMessage.text}</span>
        </div>
      )}

      {/* Main Content Area - with responsive padding to accommodate bottom navigation on mobile */}
      <main className="flex-1 pb-20 lg:pb-10">
        <ErrorBoundary fallbackTitle="Kendala Memuat Modul" fallbackMessage="Terjadi kendala saat memuat data tampilan atau konektivitas database. Sistem mengisolasi error agar aplikasi tetap stabil.">
          {/* Offline Banner alert if offline mode */}
          {!isOnline && (
            <div className="bg-amber-500 text-slate-950 font-bold px-4 py-2 text-xs text-center flex items-center justify-center gap-2 shadow-sm">
              <AlertCircle className="w-4 h-4" />
              <span>Mode Lahan (Offline Aktif): Semua data dan foto ber-watermark disimpan secara aman di memori perangkat. Saat terhubung sinyal, klik "Offline Lahan" untuk sinkronisasi.</span>
            </div>
          )}

        {/* Tab 1: Executive Director Dashboard - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'dashboard' && (
          authUser.role === 'director' ? (
            <DashboardView
              reports={reports}
              equipments={equipments}
              onOpenPdfReport={handleOpenPdfModal}
              onNavigateReports={() => setActiveTab('reports')}
              onNavigateLogistics={() => setActiveTab('logistics')}
              onNavigateFieldMonitor={() => setActiveTab('director-field-monitor')}
              onNavigateActivityLog={() => setActiveTab('user-activity-log')}
              onNavigateUserManagement={() => setActiveTab('company-master')}
              onNavigateCompanyProfile={() => setActiveTab('company-master')}
              onApproveReport={handleApproveReport}
              userRole={effectiveRole}
              clients={clients}
              selectedClientId={selectedClientId}
              setSelectedClientId={setSelectedClientId}
              onNavigateMaster={() => setActiveTab('master')}
              authUser={authUser}
              onRefreshData={loadData}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Terbatas Direktur</h3>
              <p className="text-xs text-slate-600">
                Dashboard Eksekutif hanya dapat diakses oleh Direktur (Superadmin). Silakan gunakan formulir input laporan atau rekap laporan.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Buka Form Laporan Harian
              </button>
            </div>
          )
        )}

        {/* Tab 2: 6-Step Supervisor Wizard */}
        {activeTab === 'wizard' && (
          <ReportWizard
            onReportSaved={handleReportSaved}
            onCancel={() => setActiveTab('reports')}
            isOnline={isOnline}
            initialClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : (selectedClientId !== 'ALL' ? selectedClientId : undefined)}
            userRole={authUser.role}
            authUser={authUser}
            onNavigateToReports={() => setActiveTab('reports')}
            onNavigateToTools={() => setActiveTab('supervisor-tools')}
          />
        )}

        {/* Tab 3: Report List */}
        {activeTab === 'reports' && (
          <ReportListView
            reports={reports}
            onOpenPdf={handleOpenPdfModal}
            onNewReport={() => setActiveTab('wizard')}
            onDeleteReport={handleDeleteReport}
            onApproveReport={handleApproveReport}
            onRejectReport={handleRejectReport}
            userRole={effectiveRole}
            authUser={authUser}
            clients={clients}
            selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
            setSelectedClientId={handleSetSelectedClientId}
          />
        )}

        {/* Tab 4: Official PDF Sheet (Standalone Print Layout) */}
        {activeTab === 'official-pdf' && (
          <PdfReportModal
            reports={
              authUser.role === 'supervisor'
                ? reports.filter((r) => storageService.canSupervisorAccess(r.clientId, r.blockCode, authUser))
                : (selectedClientId === 'ALL' ? reports : reports.filter((r) => r.clientId === selectedClientId))
            }
            isStandaloneView={true}
            companyProfileProp={companyProfile}
          />
        )}

        {/* Tab 5: Inventaris Logistik Lapangan (BBM Tangki, Pelumas & Spare Part) */}
        {activeTab === 'logistics' && (
          <LogisticsInventoryView
            authUser={authUser}
            clients={clients}
            selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
            onSelectClientId={handleSetSelectedClientId}
            showToast={showToast}
          />
        )}

        {/* Tab 6: Fitur Khusus Pengawas Lapangan (P2H, Geotag Camera, HM Calc, Fuel Bowser, Safety Log) - STRICT: ONLY FOR SUPERVISOR */}
        {activeTab === 'supervisor-tools' && (
          authUser.role === 'supervisor' ? (
            <SupervisorToolsView
              authUser={authUser}
              clients={clients}
              selectedClientId={authUser.role === 'supervisor' ? (authUser.assignedClientId || 'client-1') : selectedClientId}
              onSelectClientId={handleSetSelectedClientId}
              showToast={showToast}
              onNavigateToWizard={() => setActiveTab('wizard')}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Pengawas Lapangan</h3>
              <p className="text-xs text-slate-600">
                Fitur Cepat Operasional (P2H, Penerimaan Solar Keliling, dan Log Insiden Lahan) hanya dikhususkan bagi Pengawas Lapangan.
              </p>
              <button
                onClick={() => setActiveTab('dashboard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Dashboard Direktur
              </button>
            </div>
          )
        )}

        {/* Tab 7: Audit Hasil Input Pengawas Lapangan (Field Operational Suite Review) - READ-ONLY FIELD AUDIT FOR DIRECTOR & MANAGER */}
        {activeTab === 'director-field-monitor' && (
          (authUser.role === 'director' || authUser.role === 'manager') ? (
            <DirectorFieldMonitorView
              authUser={authUser}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClientId={setSelectedClientId}
              showToast={showToast}
              onOpenReport={(reportId) => handleOpenPdfModal(reportId)}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Manajemen</h3>
              <p className="text-xs text-slate-600">
                Menu Audit & Monitoring Hasil Pengawas Lapangan ini khusus untuk akses Direktur dan Manager.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab: APPROVAL PEKERJAAN PENGAWAS - KHUSUS MANAGER & DIREKTUR */}
        {activeTab === 'approval' && (
          (authUser.role === 'manager' || authUser.role === 'director') ? (
            <ManagerApprovalView
              authUser={authUser}
              clients={clients}
              selectedClientId={selectedClientId}
              onSelectClientId={handleSetSelectedClientId}
              onOpenPdfReport={handleOpenPdfModal}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Manager & Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Approval Pekerjaan Pengawas (Verifikasi Laporan Harian, P2H Alat Berat, Mutasi Stok BBM & Insiden K3 Lapangan) hanya dapat diakses oleh akun Manager atau Direktur.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 8: Log Riwayat Aktivitas & Tag Lokasi GPS Pengguna - STRICT: ONLY FOR DIRECTOR */}
        {activeTab === 'user-activity-log' && (
          authUser.role === 'director' ? (
            <UserActivityAuditLogView
              authUser={authUser}
              showToast={showToast}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Terbatas Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Log Riwayat Aktivitas & Tag Lokasi GPS ini khusus untuk audit Direktur.
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 2: Master Data Perusahaan (1. Identitas & Logo, 2. Staff, TTD Digital & Kredensial User, 3. Personil Tim pendukung) */}
        {(activeTab === 'company-master' || activeTab === 'company-profile') && (
          authUser.role === 'director' ? (
            <CompanyMasterDataView
              companyProfile={companyProfile}
              onUpdateCompanyProfile={(updated) => {
                setCompanyProfile(updated);
              }}
              authUser={authUser}
              showToast={showToast}
              clients={clients}
              initialSubTab={activeTab === 'company-profile' ? 'identity' : 'identity'}
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Direktur</h3>
              <p className="text-xs text-slate-600">
                Halaman Master Data Perusahaan (Identitas Resmi, Staff TTD & Manajemen Kredensial User, serta Personil Tim pendukung) hanya dapat diakses oleh akun Direktur Utama (Superadmin).
              </p>
              <button
                onClick={() => setActiveTab('wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                Kembali ke Form Laporan
              </button>
            </div>
          )
        )}

        {/* Tab 3: Master Data Proyek (1. Klien, 2. Lokasi & Pekerjaan, 3. Alat Berat & BBM, 4. Penugasan Kerja, 5. Target Harian) */}
        {activeTab === 'master' && (
          authUser.role === 'director' ? (
            <MasterDataView />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Master Data Terbatas</h3>
              <p className="text-xs text-slate-600">
                Pengaturan Master Data Proyek & Klien hanya dapat diakses oleh Direktur (Superadmin).
              </p>
              <button
                onClick={() => setActiveTab(authUser.role === 'manager' ? 'approval' : 'wizard')}
                className="px-4 py-2 bg-amber-500 text-slate-950 font-bold text-xs rounded-xl shadow cursor-pointer"
              >
                {authUser.role === 'manager' ? 'Kembali ke Approval' : 'Kembali ke Form Laporan'}
              </button>
            </div>
          )
        )}

        {/* Tab: User Management (Standalone or redirect to Company Master) */}
        {activeTab === 'user-management' && (
          authUser.role === 'director' ? (
            <CompanyMasterDataView
              companyProfile={companyProfile}
              onUpdateCompanyProfile={(updated) => {
                setCompanyProfile(updated);
                storageService.saveCompanyProfile(updated);
              }}
              authUser={authUser}
              showToast={showToast}
              clients={clients}
              initialSubTab="staff"
            />
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Superadmin</h3>
              <p className="text-xs text-slate-600">
                Fitur Manajemen User hanya dapat diakses oleh Superadmin.
              </p>
            </div>
          )
        )}

        {/* Tab: Portal Akses Klien (Monitoring Progress & Laporan Sesuai SPK) */}
        {activeTab === 'client-portal' && (
          <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6">
            <ClientPortalView
              authUser={authUser}
              clients={clients}
              reports={reports}
              selectedClientId={selectedClientId}
              onSelectClientId={handleSetSelectedClientId}
              onViewPdf={(report) => handleOpenPdfModal(report.id)}
            />
          </div>
        )}

        {/* Tab: Data Recovery & Cache Diagnostics (Directors) */}
        {activeTab === 'data-recovery' && (
          authUser.role === 'director' ? (
            <div className="max-w-7xl mx-auto py-6 px-3 sm:px-6">
              <DataRecoveryView
                authUser={authUser}
                clients={clients}
                reports={reports}
                equipments={equipments}
                onRefreshData={loadData}
                showToast={showToast}
              />
            </div>
          ) : (
            <div className="max-w-xl mx-auto my-12 p-6 bg-white rounded-2xl border border-rose-200 text-center space-y-3 shadow-lg">
              <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
              <h3 className="font-black text-slate-900 text-base">Akses Khusus Direktur</h3>
              <p className="text-xs text-slate-600">
                Menu Data Recovery & Diagnostik Cache hanya dapat diakses oleh akun Direktur.
              </p>
            </div>
          )
        )}

        {/* Tab: Tutorial & Documentation */}
        {activeTab === 'tutorial' && (
          <TutorialView
            onNavigateTab={(tab) => setActiveTab(tab)}
            userRole={authUser?.role}
          />
        )}
        </ErrorBoundary>
      </main>

      {/* Modal Popup for PDF Print View */}
      {selectedReportIdForModal && (
        <PdfReportModal
          reports={
            authUser.role === 'supervisor'
              ? reports.filter((r) => storageService.canSupervisorAccess(r.clientId, r.blockCode, authUser))
              : reports
          }
          selectedReportId={selectedReportIdForModal}
          onClose={() => setSelectedReportIdForModal(null)}
          isStandaloneView={false}
          companyProfileProp={companyProfile}
        />
      )}

      {/* Idle Timeout Warning Modal (Enhanced Security for Shared Tablets) */}
      {idleWarningSeconds !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm">
          <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl text-center space-y-5">
            <div className="relative mx-auto w-16 h-16 rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <Clock className="w-8 h-8 animate-pulse text-amber-400" />
              <span className="absolute -top-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-amber-500"></span>
              </span>
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
                Keamanan Tablet Lapangan
              </span>
              <h3 className="text-xl font-black text-white mt-3">
                Sesi Akan Berakhir Otomatis
              </h3>
              <p className="text-xs text-slate-400 mt-2 leading-relaxed">
                Tidak ada aktivitas selama 28 menit. Demi menjaga keamanan data operasional pada perangkat tablet bersama, sesi Anda akan otomatis keluar dalam:
              </p>
            </div>

            {/* Live Countdown Display */}
            <div className="py-4 px-6 bg-slate-950/90 border border-amber-500/40 rounded-2xl flex items-center justify-center gap-3 shadow-inner">
              <span className="text-4xl font-mono font-black text-amber-400 tracking-wider">
                {`${Math.floor(idleWarningSeconds / 60).toString().padStart(2, '0')}:${(idleWarningSeconds % 60).toString().padStart(2, '0')}`}
              </span>
              <span className="text-xs text-slate-400 text-left font-medium leading-tight">
                Menit:Detik<br />
                <span className="text-amber-300 font-bold">({idleWarningSeconds} detik)</span>
              </span>
            </div>

            <p className="text-[11px] text-slate-400 leading-tight">
              Sentuh <strong>"Lanjutkan Sesi"</strong> jika Anda masih menggunakan tablet ini.
            </p>

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <button
                type="button"
                onClick={handleExtendSession}
                className="flex-1 py-3 px-4 bg-amber-500 hover:bg-amber-400 active:bg-amber-600 text-slate-950 font-black rounded-xl text-sm transition shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <RotateCcw className="w-4 h-4" />
                <span>Lanjutkan Sesi</span>
              </button>
              <button
                type="button"
                onClick={() => handleLogout(true)}
                className="py-3 px-4 bg-slate-800 hover:bg-slate-700 active:bg-slate-850 text-slate-300 hover:text-white font-bold rounded-xl text-sm transition border border-slate-700 flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Keluar Sekarang</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Corporate Footer */}
      <footer className="bg-slate-900 border-t border-slate-800 text-slate-500 text-xs py-4 text-center mb-16 lg:mb-0">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div>
            <strong className="text-slate-300">RBS APPS</strong> • Sistem Pengawasan Proyek Land Clearing (Zero Burning Method)
          </div>
          {/* Sync status monitoring for field supervisors & headquarters */}
          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-1.5 rounded-xl border border-slate-800 text-[11px]" title="Waktu terakhir kali data berhasil di-push ke Cloud Firestore">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="text-slate-400">Terakhir Push ke Firestore:</span>
            <span className="font-mono font-bold text-emerald-300">{lastSyncTime || '-'}</span>
          </div>
          <div className="text-[11px] text-slate-400">
            Hak Cipta © 2026 PT. RBS GROUP. Masuk sebagai: <span className="text-amber-400 font-bold">{authUser.username}</span> ({authUser.roleTitle})
          </div>
        </div>
      </footer>

      {/* Mobile Bottom Navigation Bar (Hidden on desktop/laptop) */}
      <MobileBottomNav
        activeTab={activeTab}
        onSelectTab={handleTabChange}
        userRole={effectiveRole}
        onOpenSidebar={() => setIsSidebarOpen(true)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary 
      fallbackTitle="Kendala Sistem Aplikasi" 
      fallbackMessage="Aplikasi mendeteksi kendala pada koneksi database atau sistem. Silakan coba pulihkan tampilan atau muat ulang halaman."
    >
      <MainApp />
    </ErrorBoundary>
  );
}
