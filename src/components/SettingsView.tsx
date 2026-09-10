import React, { useState, useEffect, useLayoutEffect, useRef, lazy, Suspense } from 'react';
import type { Category, Expense, Trip } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import {
  IconArchive,
  IconDownload,
  IconMoon,
  IconSun,
  IconOled,
  IconSmartphone,
  IconSparkles,
  IconLogOut,
  IconAlertCircle,
  IconChevronRight,
  IconMapPin,
  IconShield,
  IconShare,
  IconRefresh,
  IconSearch,
  IconPieChart,
  IconSettings,
  IconBell,
} from './Icons';
import { SettingsCell } from './common/SettingsCell';
import { SettingsSection } from './common/SettingsSection';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { getAppVersion, WEB_APP_VERSION } from '../utils/appVersion';
import { triggerHaptic } from '../utils/haptics';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { calculateSettlements } from '../utils/settlement';
import { SuperadminAuthModal } from './SuperadminAuthModal';
import { useHistoryStack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import {
  isPassRemindersEnabled,
  setPassRemindersEnabled,
  rescheduleTripPassReminders,
} from '../utils/passReminders';
import { SettingsTripToolsHub } from './settings/SettingsTripToolsHub';
import { SettingsBackupsMediaHub } from './settings/SettingsBackupsMediaHub';
import { SettingsArchivedTripsScreen } from './settings/SettingsArchivedTripsScreen';
import { SettingsBackupsScreen } from './settings/SettingsBackupsScreen';
import { SettingsStorageDataScreen } from './settings/SettingsStorageDataScreen';
import { SettingsAboutScreen } from './settings/SettingsAboutScreen';
import { prefetchSettingsLeaves, prefetchSettingsLegal } from './settings/prefetchSettingsLeaves';
import { formatBytes } from './settings/formatBytes';

const SuperAdminBugTracker = lazy(() => import('./SuperAdminBugTracker').then((m) => ({ default: m.SuperAdminBugTracker })));
const SettingsCategoriesScreen = lazy(() => import('./settings/SettingsCategoriesScreen').then((m) => ({ default: m.SettingsCategoriesScreen })));
const SettingsRecycleBinScreen = lazy(() => import('./settings/SettingsRecycleBinScreen').then((m) => ({ default: m.SettingsRecycleBinScreen })));
const SettingsLegalScreen = lazy(() => import('./settings/SettingsLegalScreen').then((m) => ({ default: m.SettingsLegalScreen })));
const BugReportModal = lazy(() => import('./BugReportModal').then((m) => ({ default: m.BugReportModal })));
const FeatureRequestModal = lazy(() => import('./FeatureRequestModal').then((m) => ({ default: m.FeatureRequestModal })));
const SettingsMyReportsScreen = lazy(() => import('./settings/SettingsMyReportsScreen').then((m) => ({ default: m.SettingsMyReportsScreen })));

export type ThemePref = 'light' | 'dark' | 'oled' | 'system';

type SubScreen = null | 'trip-tools' | 'categories' | 'recycle-bin' | 'backups-media' | 'backups' | 'archived-trips' | 'bug-tracker' | 'report-issue' | 'suggest-feature' | 'my-reports' | 'storage-data' | 'about' | 'privacy' | 'terms';

const EMPTY_SETTLEMENT = {
  isFullySettled: true,
  totalOutstanding: 0,
  transferCount: 0,
  unsettledMemberCount: 0,
};

const OVERLAY_MS = 280;

const SETTINGS_LEAF_FALLBACK = (
  <div className="skeleton" style={{ height: '200px', borderRadius: '14px' }} />
);

const DEFAULT_PARENT_MAP: Record<string, SubScreen> = {
  'trip-tools': null,
  'categories': null,
  'recycle-bin': null,
  'backups-media': null,
  'storage-data': null,
  'archived-trips': null,
  'backups': null,
  'report-issue': null,
  'suggest-feature': null,
  'my-reports': null,
  'bug-tracker': null,
  'about': null,
  'privacy': 'about',
  'terms': 'about',
};

interface SettingsViewProps {
  categories: Category[];
  activeTripExpenses: Expense[];
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv?: () => void;
  isAdmin?: boolean;

  // Global settings properties
  themePref: ThemePref;
  setThemePref: (v: ThemePref) => void;
  onExportJson?: () => void;
  showImportArea?: boolean;
  setShowImportArea?: (v: boolean) => void;
  importJson?: string;
  setImportJson?: (v: string) => void;
  importStatus?: 'idle' | 'pending' | 'success' | 'error';
  importErrorMessage?: string | null;
  onImport?: (jsonOverride?: string) => void;
  onClearDatabase?: () => void;
  onLoadDemoTrip?: () => void;
  archivedTrips?: Trip[];
  onRestoreTrip?: (trip: Trip) => void;
  onDeleteTrip?: (trip: Trip) => void;
  userEmail?: string | null;
  crossTripBalances?: Record<string, number>;
  onSignOut?: () => void;
  onDeleteAccount?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
  onOpenSuperadminPortal?: () => void;
  onOpenOpsBugs?: () => void;

  // Context
  hasActiveTrip?: boolean;
  /** False when the in-trip Settings tab is mounted but hidden (other tab active). */
  isSurfaceVisible?: boolean;
  initialSubScreen?: SubScreen;
  baseCurrency?: string;
  onClose?: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onOpenShareTrip?: () => void;
  onNavigateToBalances?: () => void;
  onOpenFxRates?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenOfflineSnapshot?: () => void;
}

export function SettingsView({
  categories,
  activeTripExpenses,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  isAdmin = true,
  themePref,
  setThemePref,
  onExportJson,
  showImportArea = false,
  setShowImportArea,
  importJson = '',
  setImportJson,
  importStatus = 'idle',
  importErrorMessage,
  onImport,
  onClearDatabase,
  onLoadDemoTrip,
  archivedTrips = [],
  onRestoreTrip,
  onDeleteTrip,
  userEmail,
  crossTripBalances,
  onSignOut,
  onDeleteAccount,
  pwaInstallable = false,
  onInstallApp,
  onOpenSuperadminPortal,
  onOpenOpsBugs,
  hasActiveTrip = true,
  isSurfaceVisible = true,
  initialSubScreen = null,
  onClose,
  onRequestConfirm,
  onOpenShareTrip,
  onNavigateToBalances,
  baseCurrency,
  onOpenFxRates,
  onOpenMediaGallery,
  onOpenOfflineSnapshot,
}: SettingsViewProps) {
  const [screenStack, setScreenStack] = useState<SubScreen[]>(() => (initialSubScreen ? [initialSubScreen] : []));
  const subScreen = screenStack.length > 0 ? screenStack[screenStack.length - 1] : null;
  const navDirectionRef = useRef<'forward' | 'back'>('forward');
  const [overlayRender, setOverlayRender] = useState<{ screen: SubScreen; dir: 'in' | 'back' | 'out' }>(() => ({
    screen: initialSubScreen,
    dir: 'in',
  }));
  const overlayRenderRef = useRef(overlayRender);
  overlayRenderRef.current = overlayRender;

  useEffect(() => {
    if (initialSubScreen) {
      setScreenStack([initialSubScreen]);
    }
  }, [initialSubScreen]);

  const pushScreen = (screen: SubScreen) => {
    triggerHaptic('light');
    navDirectionRef.current = 'forward';
    setScreenStack((prev) => [...prev, screen]);
  };

  const popScreen = () => {
    triggerHaptic('light');
    navDirectionRef.current = 'back';
    setScreenStack((prev) => {
      if (prev.length > 1) {
        return prev.slice(0, prev.length - 1);
      }
      const current = prev[0] ?? null;
      const fallback = current ? DEFAULT_PARENT_MAP[current] ?? null : null;
      return fallback ? [fallback] : [];
    });
  };

  const setSubScreen = (target: SubScreen) => {
    if (target === null) {
      popScreen();
    } else {
      pushScreen(target);
    }
  };

  useLayoutEffect(() => {
    const reduce = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const current = overlayRenderRef.current;

    if (subScreen !== null) {
      if (current.screen === subScreen && current.dir !== 'out') return;
      setOverlayRender({
        screen: subScreen,
        dir: navDirectionRef.current === 'back' ? 'back' : 'in',
      });
      return;
    }

    if (!current.screen || current.dir === 'out') return;
    if (reduce) {
      setOverlayRender({ screen: null, dir: 'in' });
      return;
    }

    setOverlayRender({ screen: current.screen, dir: 'out' });
    const t = window.setTimeout(() => setOverlayRender({ screen: null, dir: 'in' }), OVERLAY_MS);
    return () => window.clearTimeout(t);
  }, [subScreen]);

  const getScreenTitle = (screen: SubScreen): string => {
    switch (screen) {
      case 'trip-tools':
        return 'Trip Tools';
      case 'backups-media':
        return 'Backups & Media';
      case 'storage-data':
        return 'Storage & Data';
      case 'categories':
        return 'Categories';
      case 'recycle-bin':
        return 'Recycle Bin';
      case 'archived-trips':
        return 'Archived Trips';
      case 'backups':
        return 'Backups';
      case 'about':
        return 'About';
      case 'privacy':
        return 'Privacy Policy';
      case 'terms':
        return 'Terms of Service';
      case 'report-issue':
        return 'Report a Problem';
      case 'suggest-feature':
        return 'Suggest a Feature';
      case 'my-reports':
        return 'My reports';
      case 'bug-tracker':
        return 'Bug Tracker';
      default:
        return 'Settings';
    }
  };

  const getParentTitle = (): string => {
    if (screenStack.length > 1) {
      return getScreenTitle(screenStack[screenStack.length - 2]);
    }
    if (subScreen && DEFAULT_PARENT_MAP[subScreen] !== undefined) {
      return getScreenTitle(DEFAULT_PARENT_MAP[subScreen]);
    }
    return 'Settings';
  };

  // Store data
  const userId = useTripStore((s) => s.userId);
  const members = useTripStore((s) => s.members);
  const userDisplayName = useTripStore((s) => s.userDisplayName);
  const deletedExpenses = useTripStore((s) => s.deletedExpenses);
  const fetchDeletedExpenses = useTripStore((s) => s.fetchDeletedExpenses);
  const restoreExpense = useTripStore((s) => s.restoreExpense);
  const permanentlyDeleteExpense = useTripStore((s) => s.permanentlyDeleteExpense);
  const emptyRecycleBin = useTripStore((s) => s.emptyRecycleBin);
  const updateCategoryKeywords = useTripStore((s) => s.updateCategoryKeywords);
  const resetCategoryKeywords = useTripStore((s) => s.resetCategoryKeywords);
  const enableGeotagging = useTripStore((s) => s.enableGeotagging);
  const setEnableGeotagging = useTripStore((s) => s.setEnableGeotagging);
  const closeTrip = useTripStore((s) => s.closeTrip);
  const setTripMuted = useTripStore((s) => s.setTripMuted);

  // Superadmin & Feature Flag state
  const isSuperadmin = useTripStore((s) => s.isSuperadmin);
  const isFeatureEnabled = useTripStore((s) => s.isFeatureEnabled);
  const refreshTrips = useTripStore((s) => s.refreshTrips);
  const trips = useTripStore((s) => s.trips);
  const activeTripId = useTripStore((s) => s.activeTripId);
  const activeTrip = trips.find((t) => t.id === activeTripId);
  const isTripMuted = useTripStore((s) => (activeTripId ? s.isTripMuted(activeTripId) : false));
  const tripDeletedExpenses = React.useMemo(
    () => (activeTripId ? deletedExpenses.filter((e) => e.tripId === activeTripId) : []),
    [deletedExpenses, activeTripId]
  );

  // Determine if current user can manage/close the active trip
  const isTripAdmin = Boolean(
    isAdmin ||
    isSuperadmin ||
    !userId ||
    !activeTrip?.ownerId ||
    activeTrip.ownerId === userId ||
    (userId && Boolean(activeTrip.adminMemberIds?.length) && Boolean(activeTrip.memberIds?.some((mid) => members[mid]?.linkedUserId === userId && activeTrip.adminMemberIds?.includes(mid))))
  );

  const currencySymbol = getCurrencySymbol(activeTrip?.baseCurrency || baseCurrency || 'INR');

  // Groups and Settlement calculation for active trip
  const groups = useTripStore((s) => s.groups);
  const activeTripGroups = React.useMemo(() => {
    return activeTrip ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean) : [];
  }, [activeTrip, groups]);

  const lastSettlementRef = useRef(EMPTY_SETTLEMENT);
  const settlementSummary = React.useMemo(() => {
    if (!activeTrip || !hasActiveTrip || !isTripAdmin) {
      lastSettlementRef.current = EMPTY_SETTLEMENT;
      return EMPTY_SETTLEMENT;
    }
    if (!isSurfaceVisible || subScreen !== null) return lastSettlementRef.current;
    const { balances, transfers } = calculateSettlements(activeTrip, members, activeTripExpenses, activeTripGroups);
    const totalOutstanding = transfers.reduce((sum, t) => sum + t.amount, 0);
    const isFullySettled = transfers.length === 0 || totalOutstanding < 0.01;
    const unsettledMemberCount = balances.filter((b) => Math.abs(b.balance) >= 0.01).length;
    const next = {
      isFullySettled,
      totalOutstanding,
      transferCount: transfers.length,
      unsettledMemberCount,
    };
    lastSettlementRef.current = next;
    return next;
  }, [activeTrip, hasActiveTrip, isTripAdmin, isSurfaceVisible, subScreen, members, activeTripExpenses, activeTripGroups]);

  const handleToggleCloseTrip = () => {
    if (!activeTrip || !isTripAdmin) return;
    triggerHaptic('light');
    if (activeTrip.closed) {
      closeTrip(activeTrip.id, false);
      return;
    }

    if (onRequestConfirm) {
      if (settlementSummary.isFullySettled) {
        onRequestConfirm({
          title: 'Close & Lock Trip',
          message: "All balances are settled! This locks the trip so no new expenses or members can be added. Existing data remains safe and viewable.",
          confirmLabel: 'Close Trip',
          onConfirm: () => closeTrip(activeTrip.id, true),
        });
      } else {
        const formattedAmount = `${currencySymbol}${settlementSummary.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
        const memberCountText = `${settlementSummary.unsettledMemberCount} member${settlementSummary.unsettledMemberCount === 1 ? '' : 's'}`;

        if (onNavigateToBalances) {
          onRequestConfirm({
            title: 'Outstanding Balances Remain',
            message: `There is still ${formattedAmount} in unsettled balances across ${memberCountText}. We recommend reviewing and settling debts before closing. You can review balances now, or lock the trip if already settled off-app.`,
            confirmLabel: 'Review & Settle',
            onConfirm: () => onNavigateToBalances(),
            tertiaryLabel: 'Close & Lock Anyway',
            onTertiary: () => closeTrip(activeTrip.id, true),
          });
        } else {
          onRequestConfirm({
            title: 'Close Trip with Unsettled Balances',
            message: `There is still ${formattedAmount} in unsettled balances across ${memberCountText}. Are you sure you want to lock this trip?`,
            confirmLabel: 'Close & Lock Anyway',
            danger: true,
            onConfirm: () => closeTrip(activeTrip.id, true),
          });
        }
      }
    } else {
      closeTrip(activeTrip.id, true);
    }
  };

  const closeTripTitle = activeTrip?.closed ? 'Reopen Trip' : 'Close Trip';
  const closeTripSubtitle = activeTrip?.closed
    ? 'Currently locked — reopen to allow new expenses/members'
    : settlementSummary.isFullySettled
    ? 'All balances settled — lock trip against new edits'
    : `⚠️ ${currencySymbol}${settlementSummary.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 2 })} unsettled (${settlementSummary.unsettledMemberCount} ${settlementSummary.unsettledMemberCount === 1 ? 'member' : 'members'})`;

  const closeTripBadgeText = activeTrip?.closed
    ? 'LOCKED'
    : settlementSummary.isFullySettled
    ? 'SETTLED'
    : 'UNSETTLED';

  const flightStatusText = activeTrip?.closed
    ? '🔒 CLOSED'
    : settlementSummary.isFullySettled
    ? '🟢 ACTIVE · SETTLED'
    : '⚠️ ACTIVE · UNSETTLED';

  const flightStatusBg = activeTrip?.closed
    ? 'rgba(239, 68, 68, 0.15)'
    : settlementSummary.isFullySettled
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(245, 158, 11, 0.15)';

  const flightStatusColor = activeTrip?.closed
    ? '#EF4444'
    : settlementSummary.isFullySettled
    ? '#10B981'
    : '#F59E0B';

  const flightStatusBorder = activeTrip?.closed
    ? 'rgba(239, 68, 68, 0.3)'
    : settlementSummary.isFullySettled
    ? 'rgba(16, 185, 129, 0.3)'
    : 'rgba(245, 158, 11, 0.3)';

  // User avatar & cloud sync state
  const userAvatarUrl = useAuthStore((s) => s.session?.user.user_metadata?.avatar_url as string | undefined);
  const [isManualSyncing, setIsManualSyncing] = useState(false);
  const [syncFeedback, setSyncFeedback] = useState<string | null>(null);

  const handleManualSync = async () => {
    if (isManualSyncing) return;
    setIsManualSyncing(true);
    triggerHaptic('light');
    try {
      await refreshTrips(true);
      triggerHaptic('success');
      setSyncFeedback('Synced just now');
      setTimeout(() => setSyncFeedback(null), 3000);
    } catch {
      setSyncFeedback('Sync failed');
      setTimeout(() => setSyncFeedback(null), 3000);
    } finally {
      setIsManualSyncing(false);
    }
  };

  const [isSuperadminModalOpen, setIsSuperadminModalOpen] = useState(false);
  const unreadNotificationCount = useNotificationsStore((s) => s.unreadCount);
  const openNotificationsPanel = useNotificationsStore((s) => s.openPanel);

  // Settings v2: Search & Clipboard state
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [passRemindersOn, setPassRemindersOn] = useState(isPassRemindersEnabled);

  const handleTogglePassReminders = (enabled: boolean) => {
    setPassRemindersEnabled(enabled);
    setPassRemindersOn(enabled);
    triggerHaptic('light');
    if (enabled && activeTrip) {
      void rescheduleTripPassReminders(activeTrip.passes, activeTrip.name);
    }
  };

  // Temporary Cache Storage Purge state
  const [tempCacheCleared, setTempCacheCleared] = useState(false);

  const handleClearTempCache = async () => {
    triggerHaptic('light');
    try {
      if (typeof window !== 'undefined' && 'caches' in window) {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
      }
      if (navigator.storage && navigator.storage.estimate) {
        const est = await navigator.storage.estimate();
        setStorageEstimate({ used: est.usage || 0, quota: est.quota || 0 });
      }
      setTempCacheCleared(true);
      triggerHaptic('success');
      setTimeout(() => setTempCacheCleared(false), 3000);
    } catch {
      setTempCacheCleared(true);
      setTimeout(() => setTempCacheCleared(false), 2000);
    }
  };

  const handleCopyEmail = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (userEmail) {
      navigator.clipboard?.writeText(userEmail);
      setCopyFeedback('Copied!');
      triggerHaptic('light');
      setTimeout(() => setCopyFeedback(null), 2000);
    }
  };

  // Report a Problem registers a guard here while it has unsubmitted text,
  // so a hardware/browser back-press can intercept with "go back or submit
  // first" instead of silently discarding what was typed. null (the
  // default, and every other subscreen) means back just closes normally.
  const reportIssueBackGuardRef = useRef<(() => void) | null>(null);
  const setReportIssueBackGuard = (guard: (() => void) | null) => {
    reportIssueBackGuardRef.current = guard;
  };

  // Same back-guard pattern for Suggest a Feature.
  const suggestFeatureBackGuardRef = useRef<(() => void) | null>(null);
  const setSuggestFeatureBackGuard = (guard: (() => void) | null) => {
    suggestFeatureBackGuardRef.current = guard;
  };

  // Import Backup: hidden file input triggered by the "Choose Backup File"
  // button. Restores immediately on selection (jsonOverride bypasses the
  // setImportJson/importJson state round-trip, which wouldn't have
  // committed yet if we called onImport() right after setImportJson() in
  // the same tick) -- no separate submit button to miss for this path.
  const importFileInputRef = useRef<HTMLInputElement>(null);
  const [importFileError, setImportFileError] = useState<string | null>(null);
  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportFileError(null);
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result || '');
      setImportJson?.(text);
      onImport?.(text);
    };
    reader.onerror = () => {
      setImportFileError('Could not read that file.');
    };
    reader.readAsText(file);
  };

  // Shared by both the hardware/browser back button and the Escape key, so
  // a report/feature draft with unsent text gets the same "confirm before
  // discarding" guard no matter how the user tries to leave the subscreen.
  const closeSubScreen = () => {
    if (subScreen === 'report-issue' && reportIssueBackGuardRef.current) {
      reportIssueBackGuardRef.current();
      return;
    }
    if (subScreen === 'suggest-feature' && suggestFeatureBackGuardRef.current) {
      suggestFeatureBackGuardRef.current();
      return;
    }
    setSubScreen(null);
  };

  // One history owner for drill-downs (useHistoryStack). Do not also
  // register useHistoryBack(subScreen) -- that double-pushed and made
  // browser/Android back skip a screen.
  useHistoryStack(screenStack.length, closeSubScreen);
  useEscapeKey(subScreen !== null, closeSubScreen);

  // Register Superadmin Auth modal into browser history stack
  // (owned by SuperadminAuthModal itself — do not double-register here)

  // Connectivity and disk storage
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; quota: number } | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // Partitioned Storage breakdown (Receipts vs Database vs System Cache).
  // JSON.stringify of every trip is skipped until Storage & Data is open.
  const storageBreakdown = React.useMemo(() => {
    if (overlayRender.screen !== 'storage-data') {
      return {
        receiptCount: 0,
        receiptBytes: 0,
        dbBytes: 0,
        cacheBytes: 0,
        mediaPct: 5,
        dbPct: 5,
        cachePct: 90,
      };
    }
    const totalUsed = storageEstimate?.used || 0;
    // Estimate image receipts footprint: count expenses with receipts
    const receiptExpenses = activeTripExpenses.filter((e) => Boolean(e.receiptImage || e.receiptPath));
    const estimatedReceiptBytes = receiptExpenses.length * 120 * 1024;
    // Database json footprint
    const cleanTripsForEstimate = trips.map((t) => ({
      ...t,
      passes: t.passes?.map((p) => (p.attachmentUrl?.startsWith('data:') ? { ...p, attachmentUrl: 'idb:pdf' } : p)),
    }));
    const estimatedDbBytes = JSON.stringify({ trips: cleanTripsForEstimate, activeTripExpenses, categories }).length * 2;
    // Remainder is cache and assets
    const estimatedCacheBytes = Math.max(0, totalUsed - estimatedReceiptBytes - estimatedDbBytes);

    const safeTotal = Math.max(totalUsed, estimatedReceiptBytes + estimatedDbBytes + estimatedCacheBytes, 1);
    const mediaPct = Math.min(85, Math.max(5, Math.round((estimatedReceiptBytes / safeTotal) * 100)));
    const dbPct = Math.min(85, Math.max(5, Math.round((estimatedDbBytes / safeTotal) * 100)));
    const cachePct = Math.max(5, 100 - mediaPct - dbPct);

    return {
      receiptCount: receiptExpenses.length,
      receiptBytes: estimatedReceiptBytes,
      dbBytes: estimatedDbBytes,
      cacheBytes: estimatedCacheBytes,
      mediaPct,
      dbPct,
      cachePct,
    };
  }, [overlayRender.screen, storageEstimate, activeTripExpenses, trips, categories]);

  useEffect(() => {
    getAppVersion().then(setAppVersion);
  }, []);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    if (navigator.storage && navigator.storage.estimate) {
      navigator.storage.estimate().then((estimate) => {
        setStorageEstimate({
          used: estimate.usage || 0,
          quota: estimate.quota || 0,
        });
      });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const displayName = userDisplayName || userEmail?.split('@')[0] || 'Traveler';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const themeLabel =
    themePref === 'light' ? 'Light' : themePref === 'dark' ? 'Night flight' : themePref === 'oled' ? 'OLED Pure Black' : 'System default';

  const navRootRef = useRef<HTMLDivElement>(null);
  const savedHomeScrollRef = useRef(0);
  const overlayWasOpenRef = useRef(false);

  useLayoutEffect(() => {
    const root = navRootRef.current;
    if (!root) return;
    const scrollParent = root.closest('.tab-pane, .modal-sheet.settings-drawer') as HTMLElement | null;
    if (!scrollParent) return;

    const overlayOpen = subScreen !== null;
    if (overlayOpen && !overlayWasOpenRef.current) {
      savedHomeScrollRef.current = scrollParent.scrollTop;
      overlayWasOpenRef.current = true;
      scrollParent.scrollTop = 0;
      return;
    }
    if (overlayOpen && overlayWasOpenRef.current) {
      scrollParent.scrollTop = 0;
      return;
    }
    if (!overlayOpen && overlayWasOpenRef.current) {
      overlayWasOpenRef.current = false;
      scrollParent.scrollTop = savedHomeScrollRef.current;
    }
  }, [subScreen]);

  const parentTitle = getParentTitle();
  const visibleScreen = overlayRender.screen;
  let overlay: React.ReactNode = null;
  if (visibleScreen === 'trip-tools' && activeTrip) {
    overlay = (
      <SettingsTripToolsHub
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        activeTrip={activeTrip}
        categories={categories}
        deletedCount={tripDeletedExpenses.length}
        isTripMuted={isTripMuted}
        showCategories={isSuperadmin || isFeatureEnabled('enableKeywordTagging')}
        showRecycleBin={isSuperadmin || isFeatureEnabled('enableRecycleBin')}
        onOpenCategories={() => setSubScreen('categories')}
        onOpenRecycleBin={() => setSubScreen('recycle-bin')}
        onToggleMute={(muted) => setTripMuted(activeTrip.id, muted)}
        onOpenFxRates={onOpenFxRates}
        onExportCsv={onExportCsv}
      />
    );
  } else if (visibleScreen === 'categories') {
    overlay = (
      <SettingsCategoriesScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        categories={categories}
        activeTripExpenses={activeTripExpenses}
        isAdmin={isAdmin}
        onAddCategory={onAddCategory}
        onDeleteCategory={onDeleteCategory}
        updateCategoryKeywords={updateCategoryKeywords}
        resetCategoryKeywords={resetCategoryKeywords}
        onRequestConfirm={onRequestConfirm}
      />
    );
  } else if (visibleScreen === 'recycle-bin') {
    overlay = (
      <SettingsRecycleBinScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        deletedExpenses={tripDeletedExpenses}
        fetchDeletedExpenses={fetchDeletedExpenses}
        restoreExpense={restoreExpense}
        permanentlyDeleteExpense={permanentlyDeleteExpense}
        emptyRecycleBin={emptyRecycleBin}
        onRequestConfirm={onRequestConfirm}
      />
    );
  } else if (visibleScreen === 'backups-media') {
    overlay = (
      <SettingsBackupsMediaHub
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        isSuperadmin={isSuperadmin}
        onOpenOfflineSnapshot={onOpenOfflineSnapshot}
        onOpenMediaGallery={onOpenMediaGallery}
        onOpenBackups={() => setSubScreen('backups')}
      />
    );
  } else if (visibleScreen === 'archived-trips') {
    overlay = (
      <SettingsArchivedTripsScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        archivedTrips={archivedTrips}
        userId={userId}
        members={members}
        onRestoreTrip={onRestoreTrip}
        onDeleteTrip={onDeleteTrip}
      />
    );
  } else if (visibleScreen === 'backups') {
    overlay = (
      <SettingsBackupsScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        storageEstimate={storageEstimate}
        onExportJson={onExportJson}
        showImportArea={showImportArea}
        setShowImportArea={setShowImportArea}
        importFileInputRef={importFileInputRef}
        handleImportFileChange={handleImportFileChange}
        importStatus={importStatus}
        importJson={importJson}
        importFileError={importFileError}
        setImportJson={setImportJson}
        onImport={onImport}
        importErrorMessage={importErrorMessage}
      />
    );
  } else if (visibleScreen === 'storage-data') {
    overlay = (
      <SettingsStorageDataScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        storageEstimate={storageEstimate}
        storageBreakdown={storageBreakdown}
        tripCount={trips.length}
        tempCacheCleared={tempCacheCleared}
        onClearTempCache={handleClearTempCache}
        onExportJson={onExportJson}
        onOpenBackups={() => setSubScreen('backups')}
      />
    );
  } else if (visibleScreen === 'bug-tracker') {

    overlay = (
      <div className="settings-container">
        <SuperAdminBugTracker onBack={closeSubScreen} isAdmin={isSuperadmin} onRequestConfirm={onRequestConfirm} />
      </div>
    );
  } else if (visibleScreen === 'report-issue') {
    overlay = (
      <BugReportModal
        onBack={closeSubScreen}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setReportIssueBackGuard}
        activeTripInfo={{ id: activeTripId, name: activeTrip?.name || null }}
      />
    );
  } else if (visibleScreen === 'suggest-feature') {
    overlay = (
      <FeatureRequestModal
        onBack={closeSubScreen}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setSuggestFeatureBackGuard}
      />
    );
  } else if (visibleScreen === 'my-reports') {
    overlay = (
      <SettingsMyReportsScreen parentTitle={parentTitle} onBack={closeSubScreen} />
    );
  } else if (visibleScreen === 'about') {
    overlay = (
      <SettingsAboutScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        appVersion={appVersion ?? WEB_APP_VERSION}
        onOpenPrivacy={() => setSubScreen('privacy')}
        onOpenTerms={() => setSubScreen('terms')}
      />
    );
  } else if (visibleScreen === 'privacy' || visibleScreen === 'terms') {
    overlay = (
      <SettingsLegalScreen
        kind={visibleScreen}
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        onNavigate={(target) => pushScreen(target)}
      />
    );
  }

  // -------------------------------------------------------------------------
  // Main Settings Screen (WhatsApp Inset Grouped Layout)
  // -------------------------------------------------------------------------

  const matchesSearch = (text: string, ...keywords: string[]) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase().trim();
    return text.toLowerCase().includes(q) || keywords.some((k) => k.toLowerCase().includes(q));
  };

  const showInvite = Boolean(hasActiveTrip && activeTrip && onOpenShareTrip && matchesSearch('Invite & Share Trip', 'invite', 'share', 'qr', 'join'));
  const showCategories = Boolean(hasActiveTrip && activeTrip && (isSuperadmin || isFeatureEnabled('enableKeywordTagging')) && matchesSearch('Categories & Tags', 'categories', 'tags', 'keywords'));
  const showRecycleBin = Boolean(hasActiveTrip && activeTrip && (isSuperadmin || isFeatureEnabled('enableRecycleBin')) && matchesSearch('Recycle Bin', 'deleted', 'trash', 'restore'));
  const showMute = Boolean(hasActiveTrip && activeTrip && matchesSearch('Mute Trip Alerts', 'mute', 'silence', 'notifications', 'alerts'));
  const showCloseTrip = Boolean(hasActiveTrip && activeTrip && isTripAdmin && matchesSearch(
    activeTrip.closed ? 'Reopen Trip' : 'Close Trip',
    'close', 'reopen', 'lock', 'unlock', 'complete', 'completed', 'completion', 'settled', 'unsettled', 'outstanding', 'balances', 'debts', 'post trip', 'finish', 'archive trip'
  ));
  const showCsvExport = Boolean(hasActiveTrip && activeTrip && onExportCsv && matchesSearch('Excel CSV Export', 'spreadsheet', 'download', 'ledger', 'csv', 'sheets'));
  const showFxSearch = Boolean(onOpenFxRates && matchesSearch('Multi-Currency FX Engine', 'rates', 'fx', 'forex', 'currency', 'exchange'));
  const showTripStatus = Boolean(hasActiveTrip && activeTrip && !searchQuery.trim());
  const showSnapshotSearch = Boolean(onOpenOfflineSnapshot && matchesSearch('Offline Snapshot (.triptracker)', 'snapshot', 'offline', 'backup', 'triptracker'));
  const showGallerySearch = Boolean(onOpenMediaGallery && matchesSearch('Receipts & Memories Gallery', 'gallery', 'photos', 'receipts', 'memories'));
  const showTripTools = showCategories || showRecycleBin || showMute || showFxSearch || showCsvExport;
  const showTripGroup = showTripStatus || showInvite || showTripTools || showCloseTrip;

  const showAppearance = matchesSearch('Appearance', 'theme', 'dark', 'light', 'night', 'auto', 'color', 'look');
  const showNotifications = matchesSearch('Notifications', 'alerts', 'unread', 'bell', 'messages');
  const showPassReminders = matchesSearch('Pass reminders', 'pass', 'flight', 'train', 'departure', 'alert');
  const showGeotag = (isSuperadmin || isFeatureEnabled('enableGeotagging')) && matchesSearch('Geotag Expenses', 'gps', 'location', 'place', 'map', 'pin');
  const showInstall = pwaInstallable && matchesSearch('Install App', 'pwa', 'home screen', 'download', 'mobile');
  const showPreferencesGroup = showAppearance || showNotifications || showPassReminders || showGeotag || showInstall;

  const showStorageManager = matchesSearch('Storage and Data', 'storage', 'data', 'cache', 'memory', 'disk', 'receipts', 'photos');
  const showArchived = matchesSearch('Archived Trips', 'restore', 'history', 'past trips', 'archive');
  const showBackups = isSuperadmin && matchesSearch('Database Backups', 'export', 'import', 'json', 'snapshot', 'restore');
  const showDemoTrip = Boolean(onLoadDemoTrip && matchesSearch('Seed Demo Trip', 'sample', 'test', 'goa', 'demo'));
  const showBackupsMedia = showSnapshotSearch || showGallerySearch || showBackups;
  const showDataGroup = showStorageManager || showArchived || showBackupsMedia;

  const showReportProblem = matchesSearch('Report a Problem', 'bug', 'issue', 'diagnostics', 'broken', 'error');
  const showMyReports = Boolean(userEmail) && matchesSearch('My reports', 'ticket', 'BUG-', 'status', 'filed');
  const showSuggestFeature = isFeatureEnabled('enableFeatureSuggestions') && matchesSearch('Suggest a Feature', 'feedback', 'idea', 'request');
  const showBugTracker = isSuperadmin && matchesSearch('Superadmin Bug Tracker', 'triage', 'sync', 'cases', 'cockpit');

  const showSignOut = Boolean(onSignOut && matchesSearch('Sign Out', 'logout', 'session', 'disconnect', 'account'));
  const showClearData = Boolean(isSuperadmin && onClearDatabase && matchesSearch('Clear All Data', 'reset', 'wipe', 'delete', 'danger'));
  const showDeleteAccount = Boolean(onDeleteAccount && matchesSearch('Delete Account', 'remove', 'erase', 'danger', 'privacy'));
  const showAccountGroup = showSignOut || showClearData || showDeleteAccount;

  const showAbout = matchesSearch('Trip Tracker 2026', 'version', 'about', 'build', 'app', 'privacy', 'terms', 'legal');
  const showHelpAboutGroup = showReportProblem || showMyReports || showSuggestFeature || showBugTracker || showDemoTrip || showAbout;

  const hasAnyResults = showTripGroup || showPreferencesGroup || showDataGroup || showHelpAboutGroup || showAccountGroup;

  return (
    <div
      ref={navRootRef}
      className={`settings-nav-root${overlayRender.screen ? ' has-overlay' : ''}${overlayRender.dir === 'out' ? ' is-exiting' : ''}`}
    >
      <div
        className="settings-home-layer settings-container"
        aria-hidden={overlayRender.screen !== null && overlayRender.dir !== 'out'}
        inert={overlayRender.screen !== null && overlayRender.dir !== 'out'}
      >
      {/* Spotlight Search Header */}
      <div className="settings-search-bar-wrap">
        <span className="settings-search-icon" aria-hidden="true">
          <IconSearch size={15} />
        </span>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search settings, tools & preferences…"
          className="settings-search-input"
          aria-label="Search settings"
        />
        {searchQuery && (
              <button
                type="button"
            className="settings-search-clear-btn"
                onClick={() => {
                  triggerHaptic('light');
              setSearchQuery('');
            }}
            aria-label="Clear search"
            title="Clear search"
          >
            ✕
          </button>
        )}
                  </div>

      {/* Profile & Cloud Sync Hub (Hidden when actively searching) */}
      {!searchQuery && (
        <>
          <div className="settings-profile-hero">
            <div className="settings-profile-top">
              <div className="settings-avatar-wrap">
                {userAvatarUrl ? (
                  <img
                    src={userAvatarUrl}
                    alt=""
                    referrerPolicy="no-referrer"
                    loading="lazy"
                    decoding="async"
                    className="settings-avatar-img"
                    width={48}
                    height={48}
                  />
                ) : (
                  <div className="settings-avatar-circle">{initialLetter}</div>
                )}
                {isOnline && <span className="settings-avatar-online-dot" title="Online &amp; Connected" />}
                  </div>
              <div className="settings-profile-info">
                <div className="settings-profile-name-row">
                  <span className="settings-profile-name">{displayName}</span>
                  {isSuperadmin ? (
                    <span className="settings-persona-badge superadmin">🛡️ ADMIN</span>
                  ) : (
                    <span className="settings-persona-badge traveler">✈️ TRAVELER</span>
                  )}
                </div>
                <div
                  className="settings-profile-email"
                  onClick={handleCopyEmail}
                  title="Click to copy email / account ID"
                >
                  <span>{userEmail || 'Local Guest Account'}</span>
                  {copyFeedback && (
                    <span style={{ fontSize: '10px', color: 'var(--color-success)', fontWeight: 700 }}>
                      · {copyFeedback}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <div className="settings-sync-hub">
              <div className="settings-sync-status">
                <span
                  className={`settings-status-dot${isOnline ? ' online' : ' offline'}`}
                  aria-hidden="true"
                />
                <span className="settings-sync-state-text">
                  {isOnline ? (syncFeedback || 'Cloud Synced') : 'Offline Mode'}
                </span>
                {storageEstimate && (
                  <>
                    <span className="settings-sync-divider">·</span>
                    <span className="settings-storage-text">{formatBytes(storageEstimate.used)} used</span>
                  </>
                )}
              </div>
              {isOnline && (
              <button
                type="button"
                  className="settings-sync-now-btn"
                  onClick={handleManualSync}
                  disabled={isManualSyncing}
                  title="Sync latest data with cloud"
                  aria-label="Sync latest data with cloud"
                >
                  <IconRefresh size={13} className={isManualSyncing ? 'icon-spin' : ''} />
                  <span>{isManualSyncing ? 'Syncing…' : 'Sync Now'}</span>
                </button>
              )}
                  </div>
                  </div>
          {crossTripBalances && Object.keys(crossTripBalances).length > 0 && (
            <p style={{ marginTop: '10px', display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              {Object.entries(crossTripBalances).map(([currency, net]) => (
                <span
                  key={currency}
                  className={`home-balance-chip ${net > 0 ? 'owed-to-me' : 'i-owe'}`}
                  title={net > 0 ? "Net you're owed across trips in this currency" : 'Net you owe across trips in this currency'}
                >
                  {net > 0 ? 'Owed to you across all trips:' : 'You owe across all trips:'} {formatAmount(Math.abs(net), getCurrencySymbol(currency))}
                </span>
              ))}
            </p>
          )}
          <div className="settings-hero-perf" aria-hidden="true" />
        </>
      )}

      {/* Superadmin Active Hero Cockpit Card */}
      {isSuperadmin && !searchQuery && (
        <div
          onClick={() => onOpenSuperadminPortal?.()}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '14px 18px',
            borderRadius: '16px',
            background: 'linear-gradient(135deg, #2F6FED, #17B6A6)',
            color: '#FFFFFF',
            cursor: 'pointer',
            boxShadow: '0 6px 20px -4px rgba(47, 111, 237, 0.35)',
            marginBottom: '14px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #10B981, #059669)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#fff',
              }}
            >
              <IconShield size={20} />
                  </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                <strong style={{ fontSize: '15px' }}>⚡ Superadmin Cockpit</strong>
                <span style={{ fontSize: '10px', background: '#10B981', color: '#fff', padding: '1px 6px', borderRadius: '10px', fontWeight: 700 }}>ACTIVE</span>
                  </div>
              <span style={{ fontSize: '12px', color: '#92A2AE' }}>Feature Flags, Global Analytics &amp; Admin Tools</span>
                </div>
                </div>
          <IconChevronRight size={18} style={{ color: '#17B6A6' }} />
        </div>
      )}

      {/* Empty Search Fallback */}
      {searchQuery && !hasAnyResults && (
        <div className="settings-empty-search">
          <span style={{ fontSize: '28px' }}>🔍</span>
          <strong style={{ color: 'var(--text-primary)' }}>No settings found for "{searchQuery}"</strong>
          <span style={{ fontSize: '12px' }}>Try searching for "dark", "backup", "csv", or "notifications"</span>
            <button
              type="button"
            className="settings-subscreen-back-link"
            style={{ marginTop: '8px' }}
            onClick={() => setSearchQuery('')}
          >
            Clear Search
            </button>
        </div>
      )}

      {/* This Trip — concrete rows on the home screen */}
      {showTripGroup && activeTrip && (
        <>
          {showTripStatus && (
            <div className="settings-trip-hero">
              <div className="settings-trip-hero-top">
                <div className="settings-trip-hero-title">
                  <span>🌴</span> {activeTrip.name}
                </div>
                <button
                  type="button"
                  className="settings-trip-hero-status"
                  onClick={handleToggleCloseTrip}
                  disabled={!isTripAdmin}
                  title={isTripAdmin ? (activeTrip.closed ? 'Click to reopen trip' : 'Click to close and lock trip') : undefined}
                  style={{
                    background: flightStatusBg,
                    color: flightStatusColor,
                    border: `1px solid ${flightStatusBorder}`,
                    cursor: isTripAdmin ? 'pointer' : 'default',
                  }}
                  aria-label={activeTrip.closed ? 'Trip is closed. Click to reopen.' : 'Trip is active. Click to close.'}
                >
                  <span>{flightStatusText}</span>
                </button>
              </div>
              <div className="settings-trip-hero-stats">
                <div className="settings-trip-hero-stat">
                  <span className={`settings-trip-hero-stat-value ${settlementSummary.isFullySettled ? 'ok' : 'warn'}`}>
                    {settlementSummary.isFullySettled
                      ? 'Settled'
                      : `${currencySymbol}${settlementSummary.totalOutstanding.toLocaleString(undefined, { maximumFractionDigits: 0 })}`}
                  </span>
                  <span className="settings-trip-hero-stat-label">
                    {settlementSummary.isFullySettled ? 'Balances' : 'Unsettled'}
                  </span>
                </div>
                <div className="settings-trip-hero-stat">
                  <span className="settings-trip-hero-stat-value">{activeTrip.memberIds?.length ?? Object.keys(members).length}</span>
                  <span className="settings-trip-hero-stat-label">{(activeTrip.memberIds?.length ?? Object.keys(members).length) === 1 ? 'Member' : 'Members'}</span>
                </div>
                <div className="settings-trip-hero-stat">
                  <span className="settings-trip-hero-stat-value">{activeTripExpenses.length}</span>
                  <span className="settings-trip-hero-stat-label">{activeTripExpenses.length === 1 ? 'Expense' : 'Expenses'}</span>
                </div>
              </div>
            </div>
          )}

        <SettingsSection title="This Trip">

          {showInvite && onOpenShareTrip && (
            <SettingsCell
              icon={<IconShare size={18} />}
              iconGlow="teal"
              title="Invite & Share Trip"
              subtitle="Share join link or QR code with companions"
                onClick={() => {
                  triggerHaptic('light');
                onOpenShareTrip();
              }}
            />
          )}

          {showTripTools && (
            <SettingsCell
              icon={<IconSettings size={18} />}
              iconGlow="purple"
              title="Trip Tools"
              subtitle="Categories, recycle bin, alerts & FX rates"
              onPointerEnter={prefetchSettingsLeaves}
              onPointerDown={prefetchSettingsLeaves}
              onClick={() => setSubScreen('trip-tools')}
            />
          )}

            {showCloseTrip && (
              <SettingsCell
                icon={<IconShield size={18} />}
                iconGlow={activeTrip.closed ? 'slate' : 'emerald'}
                title={closeTripTitle}
                subtitle={closeTripSubtitle}
                badge={closeTripBadgeText}
                hasDivider={false}
                onClick={handleToggleCloseTrip}
              />
            )}
        </SettingsSection>
        </>
      )}

      {/* Preferences */}
      {showPreferencesGroup && (
        <SettingsSection title="Preferences">
            {showAppearance && (
              <div className="settings-row-item" style={{ cursor: 'default' }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-orange-glow">
                    {themePref === 'oled' ? <IconOled size={18} /> : themePref === 'dark' ? <IconMoon size={18} /> : themePref === 'light' ? <IconSun size={18} /> : <IconSmartphone size={18} />}
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Appearance</span>
                    <span className="settings-row-subtitle">{themeLabel}</span>
                  </div>
                </div>
                <div className="settings-segmented-theme" role="group" aria-label="Theme preference">
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'light' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('light'); }}
                    title="Light mode"
                    aria-label="Light mode"
                  >
                    <IconSun size={14} />
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'dark' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('dark'); }}
                    title="Night mode"
                    aria-label="Night mode"
                  >
                    <IconMoon size={14} />
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'oled' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('oled'); }}
                    title="OLED Pure Black"
                    aria-label="OLED Pure Black"
                  >
                    <IconOled size={14} />
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'system' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('system'); }}
                    title="System default"
                    aria-label="System default"
                  >
                    <IconSmartphone size={14} />
                  </button>
                </div>
              </div>
            )}

            {showNotifications && (
              <button type="button" className="settings-row-item" onClick={() => { triggerHaptic('light'); openNotificationsPanel(); }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-teal-glow">
                    <IconBell size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Notifications</span>
                    <span className="settings-row-subtitle">{unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ fontWeight: 600 }}>
                    {unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'Quiet'}
                  </span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

          {showPassReminders && (
            <div className="settings-row-item" style={{ cursor: 'default' }}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-amber-glow">
                  <span style={{ fontSize: '18px' }}>🎫</span>
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Pass reminders</span>
                  <span className="settings-row-subtitle">Alert 24h (and 3h for flights/trains) before departure</span>
                </div>
              </div>
              <div className="settings-row-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="settings-badge-pill" style={{ fontWeight: 600, fontSize: '10px' }}>
                  {passRemindersOn ? 'ON' : 'OFF'}
                </span>
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={passRemindersOn}
                    onChange={(e) => handleTogglePassReminders(e.target.checked)}
                    aria-label="Pass reminders"
                    style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: passRemindersOn ? '#17B6A6' : 'var(--border-color)',
                      transition: '0.2s ease',
                      borderRadius: 'var(--border-radius-pill)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: passRemindersOn ? '23px' : '3px',
                        bottom: '3px',
                        backgroundColor: 'white',
                        transition: '0.2s ease',
                        borderRadius: '50%',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                      }}
                    />
                  </span>
                </label>
              </div>
            </div>
          )}

            {showGeotag && (
              <div className="settings-row-item" style={{ cursor: 'default' }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-emerald-glow">
                    <IconMapPin size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Geotag Expenses</span>
                    <span className="settings-row-subtitle">Attach GPS coordinates &amp; place names</span>
                  </div>
                </div>
                <div className="settings-row-right" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span className="settings-badge-pill" style={{ fontWeight: 600, fontSize: '10px' }}>
                    {enableGeotagging ? 'ACTIVE' : 'OFF'}
                  </span>
                  <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={enableGeotagging}
                      onChange={(e) => {
                        triggerHaptic('light');
                        setEnableGeotagging(e.target.checked);
                      }}
                      aria-label="Geotag Expenses"
                      style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                    />
                    <span
                      style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: enableGeotagging ? '#17B6A6' : 'var(--border-color)',
                        transition: '0.2s ease',
                        borderRadius: 'var(--border-radius-pill)',
                      }}
                    >
                      <span
                        style={{
                          position: 'absolute',
                          height: '18px',
                          width: '18px',
                          left: enableGeotagging ? '23px' : '3px',
                          bottom: '3px',
                          backgroundColor: 'white',
                          transition: '0.2s ease',
                          borderRadius: '50%',
                          boxShadow: '0 1px 3px rgba(0,0,0,0.25)',
                        }}
                      />
                    </span>
                  </label>
                </div>
              </div>
            )}

            {showInstall && (
            <SettingsCell
              icon={<IconSmartphone size={18} />}
              iconGlow="teal"
              title="Install App"
              subtitle="Add Trip Tracker to your device home screen"
              chevron={false}
              hasDivider={false}
                onClick={() => {
                  triggerHaptic('light');
                  onInstallApp?.();
                  onClose?.();
                }}
            />
          )}
        </SettingsSection>
      )}

      {/* Data */}
      {showDataGroup && (
        <SettingsSection title="Data">
            {showStorageManager && (
              <SettingsCell
                icon={<IconPieChart size={18} />}
                iconGlow="amber"
                title="Storage and Data"
                subtitle="Receipts media, ledgers & cache visualizer"
                badge={storageEstimate ? formatBytes(storageEstimate.used) : 'Local'}
                onClick={() => setSubScreen('storage-data')}
              />
            )}

            {showArchived && (
              <SettingsCell
                icon={<IconArchive size={18} />}
                iconGlow="slate"
                title="Archived Trips"
                subtitle={archivedTrips.length === 0 ? 'No archived trips' : `${archivedTrips.length} archived trip${archivedTrips.length === 1 ? '' : 's'}`}
                badge={archivedTrips.length > 0 ? archivedTrips.length : undefined}
                onClick={() => setSubScreen('archived-trips')}
              />
            )}

          {showBackupsMedia && (
            <SettingsCell
              icon={<IconDownload size={18} />}
              iconGlow="indigo"
              title="Backups & Media"
              subtitle="Offline snapshot, receipts gallery & JSON export"
              hasDivider={false}
              onClick={() => setSubScreen('backups-media')}
            />
          )}
        </SettingsSection>
      )}

      {/* Help & About */}
      {showHelpAboutGroup && (
        <SettingsSection title="Help & About">
            {showReportProblem && (
              <SettingsCell
                icon={<span>🐞</span>}
                iconGlow="rose"
                title="Report a Problem"
                subtitle="Tell us what went wrong — device details attach automatically"
                onPointerEnter={prefetchSettingsLeaves}
                onPointerDown={prefetchSettingsLeaves}
                onClick={() => setSubScreen('report-issue')}
              />
            )}

            {showMyReports && (
              <SettingsCell
                icon={<span>🎫</span>}
                iconGlow="slate"
                title="My reports"
                subtitle="Open, in progress, or resolved — with your BUG-xxx id"
                onPointerEnter={prefetchSettingsLeaves}
                onPointerDown={prefetchSettingsLeaves}
                onClick={() => setSubScreen('my-reports')}
              />
            )}

            {showSuggestFeature && (
              <SettingsCell
                icon={<span>✨</span>}
                iconGlow="teal"
                title="Suggest a Feature"
                subtitle="Tell us what would make this app better"
                onPointerEnter={prefetchSettingsLeaves}
                onPointerDown={prefetchSettingsLeaves}
                onClick={() => setSubScreen('suggest-feature')}
              />
            )}

            {showDemoTrip && onLoadDemoTrip && (
              <SettingsCell
                icon={<IconSparkles size={18} />}
                iconGlow="emerald"
                title="Seed Demo Trip"
                subtitle="Try the app with a sample trip, expenses & splits"
                onClick={() => {
                  onRequestConfirm?.({
                    title: 'Seed Demo Data',
                    message: 'Populate a sample trip ("Road Trip to Goa ☀️") with test members, geotagged route, and split transactions?',
                    confirmLabel: 'Load Demo Trip',
                    onConfirm: () => {
                      onLoadDemoTrip();
                      onClose?.();
                    },
                  });
                }}
              />
            )}

            {showBugTracker && (
              <SettingsCell
                icon={<span>🛡️</span>}
                iconGlow="amber"
                title="Superadmin Bug Tracker"
                subtitle="Manage, triage & live-sync bugs"
                onClick={() => {
                  if (onOpenOpsBugs) {
                    onOpenOpsBugs();
                    onClose?.();
                    return;
                  }
                  setSubScreen('bug-tracker');
                }}
              />
            )}

            {showAbout && (
              <SettingsCell
                icon={<IconSmartphone size={18} />}
                iconGlow="slate"
                title="About & Legal"
                subtitle={`Version ${appVersion ?? WEB_APP_VERSION} · Privacy & Terms`}
                badge="STABLE"
                hasDivider={false}
                onPointerEnter={prefetchSettingsLegal}
                onPointerDown={prefetchSettingsLegal}
                onClick={() => setSubScreen('about')}
              />
            )}
        </SettingsSection>
      )}

      {/* Account */}
      {showAccountGroup && (
        <SettingsSection title="Account">
            {showSignOut && onSignOut && (
              <SettingsCell
                icon={<IconLogOut size={18} />}
                iconGlow="red"
                destructive
                title="Sign Out"
                subtitle="Disconnect active session from Supabase"
                chevron={false}
                onClick={() => {
                  if (!isOnline) {
                    onRequestConfirm?.({
                      title: 'You are offline',
                      message: 'Sign out needs a network connection. Reconnect and try again.',
                      confirmLabel: 'OK',
                      onConfirm: () => {},
                    });
                    return;
                  }
                  onRequestConfirm?.({
                    title: 'Sign Out',
                    message: 'Sign out of your account on this device?',
                    confirmLabel: 'Sign Out',
                    onConfirm: () => {
                      onSignOut();
                      onClose?.();
                    },
                  });
                }}
              />
            )}

            {showClearData && onClearDatabase && (
              <SettingsCell
                icon={<IconAlertCircle size={18} />}
                iconGlow="red"
                destructive
                title="Clear All Data"
                subtitle="Wipe all local trips and reset storage"
                chevron={false}
                onClick={onClearDatabase}
              />
            )}

            {showDeleteAccount && onDeleteAccount && (
              <SettingsCell
                icon={<IconAlertCircle size={18} />}
                iconGlow="red"
                destructive
                hasDivider={false}
                title="Delete Account"
                subtitle="Permanently delete your account and owned trips"
                chevron={false}
                onClick={() => {
                  if (!isOnline) {
                    onRequestConfirm?.({
                      title: 'You are offline',
                      message: 'Deleting your account needs a network connection. Reconnect and try again.',
                      confirmLabel: 'OK',
                      onConfirm: () => {},
                    });
                    return;
                  }
                  onDeleteAccount();
                }}
              />
            )}
        </SettingsSection>
      )}

      {/* Pro Tips buried — keyboard shortcuts remain discoverable via Cmd+K / help */}

      {/* Superadmin Access Link at bottom */}
      {!isSuperadmin && (
        <div style={{ textAlign: 'center', marginTop: '20px', marginBottom: '8px' }}>
          <button
            type="button"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              fontSize: '12px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '6px 12px',
              borderRadius: '8px',
            }}
            onClick={() => {
              triggerHaptic('light');
              setIsSuperadminModalOpen(true);
            }}
          >
            <IconShield size={13} /> ⚡ Super User Login
          </button>
        </div>
      )}

      </div>
      {overlayRender.screen ? (
        <div className={`settings-overlay-panel dir-${overlayRender.dir}`} key={overlayRender.screen}>
          <Suspense fallback={SETTINGS_LEAF_FALLBACK}>{overlay}</Suspense>
        </div>
      ) : null}
      {isSuperadminModalOpen ? (
        <SuperadminAuthModal
          isOpen={isSuperadminModalOpen}
          onClose={() => setIsSuperadminModalOpen(false)}
          onSuccess={() => setIsSuperadminModalOpen(false)}
        />
      ) : null}
    </div>
  );
}
