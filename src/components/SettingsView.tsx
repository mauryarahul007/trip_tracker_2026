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
  IconDatabase,
  IconClipboardList,
  IconQrCode,
} from './Icons';
import { SettingsCell } from './common/SettingsCell';
import { SettingsSection } from './common/SettingsSection';
import { SettingsToggleRow } from './common/SettingsSwitch';
import { computeTravelerPassport } from '../utils/travelerPassport';
import { useTripStore } from '../store/tripStore';
import { useDataSaverEnabled, setDataSaverEnabled } from '../hooks/useDataSaverEnabled';
import { useCompactLedgerView, setCompactLedgerView } from '../hooks/useCompactLedgerView';
import { useAuthStore } from '../store/authStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { getAppVersion, WEB_APP_VERSION } from '../utils/appVersion';
import { triggerHaptic } from '../utils/haptics';
import { getCurrencySymbol, formatAmount } from '../utils/currency';
import { calculateSettlements, summarizeSettlement, type SettlementCloseoutSummary } from '../utils/settlement';
import { SuperadminAuthModal } from './SuperadminAuthModal';
import { useHistoryStack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';
import {
  isPassRemindersEnabled,
  setPassRemindersEnabled,
  rescheduleTripPassReminders,
} from '../utils/passReminders';
import { SettingsTripToolsHub } from './settings/SettingsTripToolsHub';
import { SettingsNotificationsScreen } from './settings/SettingsNotificationsScreen';
import { SettingsBackupsMediaHub } from './settings/SettingsBackupsMediaHub';
import { SettingsArchivedTripsScreen } from './settings/SettingsArchivedTripsScreen';
import { SettingsBackupsScreen } from './settings/SettingsBackupsScreen';
import { SettingsStorageDataScreen } from './settings/SettingsStorageDataScreen';
import { SettingsAboutScreen } from './settings/SettingsAboutScreen';
import { SettingsWhatsNewScreen } from './settings/SettingsWhatsNewScreen';
import { prefetchSettingsLeaves, prefetchSettingsLegal } from './settings/prefetchSettingsLeaves';
import { formatBytes } from './settings/formatBytes';
import { getDigestPreference, setDigestPreference } from '../services/notificationDigestApi';
import { getQuietHoursPreference, setQuietHoursPreference, type QuietHoursPreference } from '../services/quietHoursApi';

const SuperAdminBugTracker = lazy(() => import('./SuperAdminBugTracker').then((m) => ({ default: m.SuperAdminBugTracker })));
const SettingsCategoriesScreen = lazy(() => import('./settings/SettingsCategoriesScreen').then((m) => ({ default: m.SettingsCategoriesScreen })));
const SettingsRecycleBinScreen = lazy(() => import('./settings/SettingsRecycleBinScreen').then((m) => ({ default: m.SettingsRecycleBinScreen })));
const SettingsLegalScreen = lazy(() => import('./settings/SettingsLegalScreen').then((m) => ({ default: m.SettingsLegalScreen })));
const BugReportModal = lazy(() => import('./BugReportModal').then((m) => ({ default: m.BugReportModal })));
const FeatureRequestModal = lazy(() => import('./FeatureRequestModal').then((m) => ({ default: m.FeatureRequestModal })));

export type ThemePref = 'light' | 'dark' | 'oled' | 'system';

type SubScreen = null | 'trip-tools' | 'notifications' | 'categories' | 'recycle-bin' | 'backups-media' | 'backups' | 'archived-trips' | 'bug-tracker' | 'report-issue' | 'suggest-feature' | 'storage-data' | 'about' | 'privacy' | 'terms' | 'whats-new';

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
  'notifications': null,
  'categories': null,
  'recycle-bin': null,
  'backups-media': null,
  'storage-data': null,
  'archived-trips': null,
  'backups': null,
  'report-issue': null,
  'suggest-feature': null,
  'bug-tracker': null,
  'about': null,
  'privacy': 'about',
  'terms': 'about',
  'whats-new': 'about',
};

interface SettingsViewProps {
  categories: Category[];
  activeTripExpenses: Expense[];
  /** Summary's Who-owes-who result. When set, close-trip uses it instead of a second calculation. */
  settlementCloseout?: SettlementCloseoutSummary;
  onAddCategory: (name: string, icon: string) => Promise<void>;
  onDeleteCategory: (categoryId: string, replacementCategoryId: string | null) => Promise<void>;
  onExportCsv?: () => void;
  onOpenSplitwiseImport?: () => void;
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
  onOpenCloseout?: () => void;
  onOpenFxRates?: () => void;
  onOpenMediaGallery?: () => void;
  onOpenOfflineSnapshot?: () => void;
  onOpenDocumentVault?: () => void;
  onOpenLiveLocationShare?: () => void;
  onOpenTripWrapped?: () => void;
}

export function SettingsView({
  categories,
  activeTripExpenses,
  settlementCloseout,
  onAddCategory,
  onDeleteCategory,
  onExportCsv,
  onOpenSplitwiseImport,
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
  onOpenCloseout,
  baseCurrency,
  onOpenFxRates,
  onOpenMediaGallery,
  onOpenOfflineSnapshot,
  onOpenDocumentVault,
  onOpenLiveLocationShare,
  onOpenTripWrapped,
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
      case 'notifications':
        return 'Notifications';
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
      case 'whats-new':
        return "What's New";
      case 'privacy':
        return 'Privacy Policy';
      case 'terms':
        return 'Terms of Service';
      case 'report-issue':
        return 'Report a Problem';
      case 'suggest-feature':
        return 'Suggest a Feature';
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
  const isSuperadminRaw = useTripStore((s) => s.isSuperadmin);
  const isTravelerPreview = useTripStore((s) => s.isTravelerPreview);
  const isSuperadmin = isSuperadminRaw && !isTravelerPreview;
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
    if (settlementCloseout) return settlementCloseout;
    if (!activeTrip || !hasActiveTrip || !isTripAdmin) {
      lastSettlementRef.current = EMPTY_SETTLEMENT;
      return EMPTY_SETTLEMENT;
    }
    if (!isSurfaceVisible || subScreen !== null) return lastSettlementRef.current;
    const { balances, transfers } = calculateSettlements(activeTrip, members, activeTripExpenses, activeTripGroups);
    const next = summarizeSettlement(balances, transfers);
    lastSettlementRef.current = next;
    return next;
  }, [settlementCloseout, activeTrip, hasActiveTrip, isTripAdmin, isSurfaceVisible, subScreen, members, activeTripExpenses, activeTripGroups]);

  const handleToggleCloseTrip = () => {
    if (!activeTrip || !isTripAdmin) return;
    triggerHaptic('light');
    if (activeTrip.closed) {
      closeTrip(activeTrip.id, false);
      return;
    }

    if (onRequestConfirm) {
      if (onOpenCloseout && isFeatureEnabled('enableTripCloseout', { tripId: activeTrip.id, userId: userId || undefined })) {
        onOpenCloseout();
        return;
      }
      if (settlementSummary.isFullySettled) {
        onRequestConfirm({
          title: 'Close & Lock Trip',
          message: "All balances are settled! This locks the trip so no new expenses or members can be added. Existing data remains safe and viewable.",
          confirmLabel: 'Close Trip',
          onConfirm: () => closeTrip(activeTrip.id, true),
        });
      } else {
        const formattedAmount = formatAmount(settlementSummary.totalOutstanding, currencySymbol);
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
    ? 'Locked. Reopen to add expenses.'
    : settlementSummary.isFullySettled
    ? 'Balances are settled'
    : `${formatAmount(settlementSummary.totalOutstanding, currencySymbol)} still unsettled`;

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
  const dataSaverOn = useDataSaverEnabled();
  const compactLedgerOn = useCompactLedgerView();
  const isWhatsNewHubEnabled = isFeatureEnabled('enableWhatsNewHub');

  // Settings v2: Search & Clipboard state
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  const [passRemindersOn, setPassRemindersOn] = useState(isPassRemindersEnabled);

  // Cross-trip, Supabase-backed (not a local/per-trip flag like the others
  // in this file) -- see notificationDigestApi.ts. Loaded once per userId.
  const [digestModeOn, setDigestModeOn] = useState(false);
  const [digestModeBusy, setDigestModeBusy] = useState(false);
  useEffect(() => {
    if (!userId) return;
    getDigestPreference(userId).then(setDigestModeOn).catch(() => {});
  }, [userId]);

  const handleToggleDigestMode = (enabled: boolean) => {
    if (!userId || digestModeBusy) return;
    setDigestModeBusy(true);
    setDigestModeOn(enabled);
    triggerHaptic('light');
    setDigestPreference(userId, enabled)
      .catch(() => setDigestModeOn(!enabled))
      .finally(() => setDigestModeBusy(false));
  };

  // Quiet hours -- per-user, cross-trip, backed by quiet_hours_prefs
  // (migration 0092). Distinct from Digest Mode above: this is a time
  // window, not a batching strategy.
  const [quietHours, setQuietHours] = useState<QuietHoursPreference>({ enabled: false, startTime: '22:00', endTime: '07:00', timezone: 'UTC' });
  const [quietHoursBusy, setQuietHoursBusy] = useState(false);
  useEffect(() => {
    if (!userId) return;
    getQuietHoursPreference(userId).then(setQuietHours).catch(() => {});
  }, [userId]);

  const saveQuietHours = (next: QuietHoursPreference) => {
    if (!userId || quietHoursBusy) return;
    const previous = quietHours;
    setQuietHoursBusy(true);
    setQuietHours(next);
    triggerHaptic('light');
    setQuietHoursPreference(userId, next)
      .catch(() => setQuietHours(previous))
      .finally(() => setQuietHoursBusy(false));
  };

  const handleToggleQuietHours = (enabled: boolean) => {
    const tz = quietHours.timezone === 'UTC' ? Intl.DateTimeFormat().resolvedOptions().timeZone : quietHours.timezone;
    saveQuietHours({ ...quietHours, enabled, timezone: tz });
  };

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

  const handleCopyEmail = (e?: React.MouseEvent) => {
    e?.stopPropagation();
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
  const storageBreakdown = React.useMemo(() => {
    const totalUsed = storageEstimate?.used || 0;
    const receiptExpenses = activeTripExpenses.filter((e) => Boolean(e.receiptImage || e.receiptPath));
    const estimatedReceiptBytes = receiptExpenses.length * 120 * 1024;
    const estimatedDbBytes = overlayRender.screen === 'storage-data'
      ? JSON.stringify({ trips, activeTripExpenses, categories }).length * 2
      : (trips.length * 2048) + (activeTripExpenses.length * 512) + (categories.length * 256);
    const estimatedCacheBytes = Math.max(0, totalUsed - estimatedReceiptBytes - estimatedDbBytes);

    const safeTotal = Math.max(totalUsed, estimatedReceiptBytes + estimatedDbBytes + estimatedCacheBytes, 1);
    const mediaPct = Math.min(85, Math.max(8, Math.round((estimatedReceiptBytes / safeTotal) * 100)));
    const dbPct = Math.min(85, Math.max(12, Math.round((estimatedDbBytes / safeTotal) * 100)));
    const cachePct = Math.max(8, 100 - mediaPct - dbPct);

    return {
      receiptCount: receiptExpenses.length,
      receiptBytes: estimatedReceiptBytes,
      dbBytes: estimatedDbBytes,
      cacheBytes: estimatedCacheBytes,
      mediaPct,
      dbPct,
      cachePct,
    };
  }, [overlayRender.screen, storageEstimate?.used, activeTripExpenses, trips, categories]);

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
        showCategories={isFeatureEnabled('enableKeywordTagging')}
        showRecycleBin={isFeatureEnabled('enableRecycleBin')}
        onOpenCategories={() => setSubScreen('categories')}
        onOpenRecycleBin={() => setSubScreen('recycle-bin')}
        onOpenFxRates={isFeatureEnabled('enableCurrencyFx', { tripId: activeTrip.id, userId: userId || undefined }) ? onOpenFxRates : undefined}
        onOpenTripWrapped={isFeatureEnabled('enableTripWrapped', { tripId: activeTrip.id, userId: userId || undefined }) ? onOpenTripWrapped : undefined}
        onExportCsv={onExportCsv}
        onOpenSplitwiseImport={isFeatureEnabled('enableSplitwiseImport', { tripId: activeTrip.id, userId: userId || undefined }) ? onOpenSplitwiseImport : undefined}
      />
    );
  } else if (visibleScreen === 'notifications') {
    overlay = (
      <SettingsNotificationsScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        unreadCount={unreadNotificationCount}
        onOpenInbox={() => {
          triggerHaptic('light');
          openNotificationsPanel();
        }}
        showMute={Boolean(activeTrip)}
        muted={isTripMuted}
        onToggleMute={(muted) => {
          if (activeTrip) setTripMuted(activeTrip.id, muted);
        }}
        showDigest={isFeatureEnabled('enableDigestNotifications')}
        digestOn={digestModeOn}
        onToggleDigest={handleToggleDigestMode}
        showQuiet={isFeatureEnabled('enableQuietHours')}
        quiet={quietHours}
        quietBusy={quietHoursBusy}
        onToggleQuiet={handleToggleQuietHours}
        onQuietStart={(value) => saveQuietHours({ ...quietHours, startTime: value })}
        onQuietEnd={(value) => saveQuietHours({ ...quietHours, endTime: value })}
        showPassReminders
        passRemindersOn={passRemindersOn}
        onTogglePassReminders={handleTogglePassReminders}
      />
    );
  } else if (visibleScreen === 'categories' && isFeatureEnabled('enableKeywordTagging')) {
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
  } else if (visibleScreen === 'recycle-bin' && isFeatureEnabled('enableRecycleBin')) {
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
        onOpenOfflineSnapshot={isFeatureEnabled('enableOfflineSnapshot') ? onOpenOfflineSnapshot : undefined}
        onOpenMediaGallery={onOpenMediaGallery}
        onOpenDocumentVault={isFeatureEnabled('enableDocumentVault') ? onOpenDocumentVault : undefined}
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
  } else if (visibleScreen === 'suggest-feature' && isFeatureEnabled('enableFeatureSuggestions')) {
    overlay = (
      <FeatureRequestModal
        onBack={closeSubScreen}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setSuggestFeatureBackGuard}
      />
    );
  } else if (visibleScreen === 'whats-new') {
    overlay = (
      <SettingsWhatsNewScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        appVersion={appVersion ?? WEB_APP_VERSION}
      />
    );
  } else if (visibleScreen === 'about') {
    overlay = (
      <SettingsAboutScreen
        parentTitle={parentTitle}
        onBack={closeSubScreen}
        appVersion={appVersion ?? WEB_APP_VERSION}
        onOpenPrivacy={() => setSubScreen('privacy')}
        onOpenTerms={() => setSubScreen('terms')}
        onOpenWhatsNew={isWhatsNewHubEnabled ? () => setSubScreen('whats-new') : undefined}
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
  const showCategories = Boolean(hasActiveTrip && activeTrip && isFeatureEnabled('enableKeywordTagging') && matchesSearch('Categories & Tags', 'categories', 'tags', 'keywords'));
  const showRecycleBin = Boolean(hasActiveTrip && activeTrip && isFeatureEnabled('enableRecycleBin') && matchesSearch('Recycle Bin', 'deleted', 'trash', 'restore'));
  const showMute = Boolean(hasActiveTrip && activeTrip && matchesSearch('Mute Trip Alerts', 'mute', 'silence', 'notifications', 'alerts'));
  const showCloseTrip = Boolean(hasActiveTrip && activeTrip && isTripAdmin && matchesSearch(
    activeTrip.closed ? 'Reopen Trip' : 'Close Trip',
    'close', 'reopen', 'lock', 'unlock', 'complete', 'completed', 'completion', 'settled', 'unsettled', 'outstanding', 'balances', 'debts', 'post trip', 'finish', 'archive trip'
  ));
  const showCsvExport = Boolean(hasActiveTrip && activeTrip && onExportCsv && matchesSearch('Excel CSV Export', 'spreadsheet', 'download', 'ledger', 'csv', 'sheets'));
  const showSplitwiseImport = Boolean(hasActiveTrip && activeTrip && onOpenSplitwiseImport && isFeatureEnabled('enableSplitwiseImport', { tripId: activeTrip.id, userId: userId || undefined }) && matchesSearch('Import Splitwise CSV', 'splitwise', 'import', 'csv'));
  const isFxEnabled = isFeatureEnabled('enableCurrencyFx', { tripId: activeTrip?.id, userId: userId || undefined });
  const showFxSearch = Boolean(onOpenFxRates && isFxEnabled && matchesSearch('Multi-Currency FX Engine', 'rates', 'fx', 'forex', 'currency', 'exchange'));
  const isWrappedEnabled = isFeatureEnabled('enableTripWrapped', { tripId: activeTrip?.id, userId: userId || undefined });
  const showWrappedSearch = Boolean(onOpenTripWrapped && isWrappedEnabled && matchesSearch('Trip Wrapped & Highlights', 'wrapped', 'story', 'highlights', 'recap', 'stats', 'infographic'));
  const isSnapshotEnabled = isFeatureEnabled('enableOfflineSnapshot');
  const isAmoledEnabled = isFeatureEnabled('enableAmoledTheme');
  const showSnapshotSearch = Boolean(onOpenOfflineSnapshot && isSnapshotEnabled && matchesSearch('Offline Snapshot (.triptracker)', 'snapshot', 'offline', 'backup', 'triptracker'));
  const showGallerySearch = Boolean(onOpenMediaGallery && matchesSearch('Receipts & Memories Gallery', 'gallery', 'photos', 'receipts', 'memories'));
  const isVaultEnabled = isFeatureEnabled('enableDocumentVault');
  const showVaultSearch = Boolean(onOpenDocumentVault && isVaultEnabled && matchesSearch('Document Vault', 'vault', 'passport', 'visa', 'insurance', 'documents', 'id'));
  const showTripTools = showCategories || showRecycleBin || showFxSearch || showCsvExport || showSplitwiseImport || showWrappedSearch;
  const showGeotag = isFeatureEnabled('enableGeotagging') && matchesSearch('Geotag Expenses', 'gps', 'location', 'place', 'map', 'pin');
  const showLiveLocationShare = Boolean(onOpenLiveLocationShare && matchesSearch('Live Location Share', 'location', 'safety', 'share', 'gps', 'live'));
  const showTripGroup = showInvite || showTripTools || showCloseTrip || showGeotag || showLiveLocationShare;

  const searching = Boolean(searchQuery.trim());
  const showAppearance = matchesSearch('Appearance', 'theme', 'dark', 'light', 'night', 'auto', 'color', 'look');
  const showDataSaver = isFeatureEnabled('enableDataSaverMode') && matchesSearch('Data Saver', 'data', 'saver', 'mobile data', 'low data', 'map', 'battery');
  const showCompactLedger = isFeatureEnabled('enableCompactLedgerView') && matchesSearch('Compact Ledger View', 'compact', 'dense', 'ledger', 'rows', 'density');
  const showNotifications = matchesSearch('Notifications', 'alerts', 'unread', 'bell', 'messages');
  const showDigestMode = isFeatureEnabled('enableDigestNotifications') && matchesSearch('Digest Mode', 'digest', 'daily', 'summary', 'notifications', 'batch');
  const showQuietHours = isFeatureEnabled('enableQuietHours') && matchesSearch('Quiet Hours', 'quiet', 'dnd', 'do not disturb', 'mute', 'sleep', 'night', 'notifications');
  const showPassReminders = matchesSearch('Pass reminders', 'pass', 'flight', 'train', 'departure', 'alert', 'notifications');
  const showInstall = pwaInstallable && matchesSearch('Install App', 'pwa', 'home screen', 'download', 'mobile');
  const notificationControls = showMute || showDigestMode || showQuietHours || showPassReminders;
  const showNotificationsHub = !searching && (showNotifications || notificationControls);
  const showNotificationDetails = searching && (showNotifications || notificationControls);
  const showPreferencesGroup = showAppearance || showCompactLedger || showNotificationsHub || showNotificationDetails;
  const notificationsSubtitle = quietHours.enabled && isFeatureEnabled('enableQuietHours')
    ? `Quiet ${quietHours.startTime}–${quietHours.endTime}`
    : digestModeOn && isFeatureEnabled('enableDigestNotifications')
    ? 'Daily digest'
    : unreadNotificationCount > 0
    ? `${unreadNotificationCount} unread`
    : 'Quiet hours and reminders';

  const showStorageManager = matchesSearch('Storage and Data', 'storage', 'data', 'cache', 'memory', 'disk', 'receipts', 'photos');
  const showArchived = matchesSearch('Archived Trips', 'restore', 'history', 'past trips', 'archive');
  const showBackups = isSuperadmin && matchesSearch('Database Backups', 'export', 'import', 'json', 'snapshot', 'restore');
  const showDemoTrip = Boolean(onLoadDemoTrip && isFeatureEnabled('enableDemoSeeding', { tripId: activeTripId || undefined, userId: userId || undefined }) && matchesSearch('Seed Demo Trip', 'sample', 'test', 'goa', 'demo'));
  const showBackupsMedia = showSnapshotSearch || showGallerySearch || showVaultSearch || showBackups;
  const showDataGroup = showStorageManager || showArchived || showBackupsMedia || showDataSaver;

  const showReportProblem = matchesSearch('Report a Problem', 'bug', 'issue', 'diagnostics', 'broken', 'error');
  const showSuggestFeature = isFeatureEnabled('enableFeatureSuggestions') && matchesSearch('Suggest a Feature', 'feedback', 'idea', 'request');
  const showBugTracker = isSuperadmin && matchesSearch('Superadmin Bug Tracker', 'triage', 'sync', 'cases', 'cockpit');

  const showSignOut = Boolean(onSignOut && matchesSearch('Sign Out', 'logout', 'session', 'disconnect', 'account'));
  const showClearData = Boolean(isSuperadmin && onClearDatabase && matchesSearch('Clear All Data', 'reset', 'wipe', 'delete', 'danger'));
  const showDeleteAccount = Boolean(onDeleteAccount && matchesSearch('Delete Account', 'remove', 'erase', 'danger', 'privacy'));
  const showAccountGroup = showSignOut || showClearData || showDeleteAccount || showInstall;

  const showAbout = matchesSearch('Trip Tracker 2026', 'version', 'about', 'build', 'app', 'privacy', 'terms', 'legal');
  const showHelpAboutGroup = showReportProblem || showSuggestFeature || showBugTracker || showDemoTrip || showAbout;

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
                {isOnline && <span className="settings-avatar-online-dot" title="Online & Connected" />}
              </div>
              <div className="settings-profile-info">
                <div className="settings-profile-name-row">
                  <span className="settings-profile-name">{displayName}</span>
                  {isSuperadmin ? (
                    <span className="settings-persona-badge superadmin">Admin</span>
                  ) : null}
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

              {/* WhatsApp-Style Companion QR Action */}
              <button
                type="button"
                className="settings-qr-companion-btn"
                onClick={() => {
                  triggerHaptic('medium');
                  if (onOpenShareTrip) {
                    onOpenShareTrip();
                  } else {
                    handleCopyEmail();
                  }
                }}
                title={onOpenShareTrip ? "Share active trip QR code" : "Share account ID"}
                aria-label="Share QR code"
              >
                <IconQrCode size={19} />
              </button>
            </div>

            {/* Visual Storage & Sync Hub Card */}
            <div className="settings-sync-hub">
              <div
                className="settings-storage-bar-card"
                onClick={() => {
                  triggerHaptic('light');
                  setSubScreen('storage-data');
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    setSubScreen('storage-data');
                  }
                }}
                title="View local media, cache and backup breakdown"
              >
                <div className="settings-storage-bar-top">
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
                  <IconChevronRight size={13} className="settings-storage-arrow" />
                </div>
                {/* Segmented color visualizer bar */}
                <div className="settings-storage-segmented-bar mini" aria-hidden="true">
                  <div
                    className="storage-seg media"
                    style={{ width: `${storageBreakdown.mediaPct}%` }}
                    title={`Receipts: ${storageBreakdown.mediaPct}%`}
                  />
                  <div
                    className="storage-seg database"
                    style={{ width: `${storageBreakdown.dbPct}%` }}
                    title={`Database: ${storageBreakdown.dbPct}%`}
                  />
                  <div
                    className="storage-seg cache"
                    style={{ width: `${storageBreakdown.cachePct}%` }}
                    title={`Cache: ${storageBreakdown.cachePct}%`}
                  />
                </div>
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
                  <span>{isManualSyncing ? 'Syncing…' : 'Sync'}</span>
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
          {isFeatureEnabled('enableTravelerPassport', { userId: userId || undefined }) && trips.length > 0 && (() => {
            const passport = computeTravelerPassport(trips);
            return (
              <p className="settings-passport-line">
                {passport.trips} {passport.trips === 1 ? 'trip' : 'trips'} · {passport.destinations} {passport.destinations === 1 ? 'destination' : 'destinations'}
              </p>
            );
          })()}
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
                <strong style={{ fontSize: '15px' }}>Superadmin</strong>
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
          <IconSearch size={22} />
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
        <SettingsSection title="This Trip">

          {showInvite && onOpenShareTrip && (
            <SettingsCell
              icon={<IconShare size={18} />}
              iconGlow="teal"
              title="Invite & Share Trip"
              subtitle={
                isFeatureEnabled('enableTripShareLink', { tripId: activeTrip?.id, userId: userId || undefined })
                  ? 'View-only link (no account) or join code'
                  : 'Share join link or QR code with companions'
              }
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
              subtitle={
                isWrappedEnabled && isFxEnabled
                  ? 'Categories, recycle bin, wrapped, and exchange rates'
                  : isWrappedEnabled
                  ? 'Categories, recycle bin, and wrapped'
                  : isFxEnabled
                  ? 'Categories, recycle bin, and exchange rates'
                  : 'Categories, recycle bin, and exports'
              }
              onPointerEnter={prefetchSettingsLeaves}
              onPointerDown={prefetchSettingsLeaves}
              onClick={() => setSubScreen('trip-tools')}
            />
          )}

          {showGeotag && (
            <SettingsToggleRow
              icon={<IconMapPin size={18} />}
              title="Geotag expenses"
              subtitle="Save a place with each expense"
              checked={enableGeotagging}
              onChange={(next) => {
                triggerHaptic('light');
                setEnableGeotagging(next);
              }}
              label="Geotag expenses"
            />
          )}

          {showLiveLocationShare && onOpenLiveLocationShare && (
            <SettingsCell
              icon={<IconMapPin size={18} />}
              title="Live location"
              subtitle="Share your position for 12 hours"
              onClick={onOpenLiveLocationShare}
            />
          )}

            {showCloseTrip && (
              <SettingsCell
                icon={<IconShield size={18} />}
                title={closeTripTitle}
                subtitle={closeTripSubtitle}
                hasDivider={false}
                onClick={handleToggleCloseTrip}
              />
            )}
        </SettingsSection>
        </>
      )}

      {showGeotag && !activeTrip && (
        <SettingsSection title="Expenses">
          <SettingsToggleRow
            icon={<IconMapPin size={18} />}
            title="Geotag expenses"
            subtitle="Save a place with each expense"
            checked={enableGeotagging}
            onChange={(next) => {
              triggerHaptic('light');
              setEnableGeotagging(next);
            }}
            label="Geotag expenses"
          />
        </SettingsSection>
      )}

      {(showAppearance || showCompactLedger) && (
        <SettingsSection title="Appearance">
            {showAppearance && (
              <div className="settings-row-item" style={{ cursor: 'default' }}>
                <div className="settings-row-left">
                  <div className="settings-squircle">
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
                  {isAmoledEnabled && (
                    <button
                      type="button"
                      className={`settings-seg-btn${themePref === 'oled' ? ' active' : ''}`}
                      onClick={() => { triggerHaptic('light'); setThemePref('oled'); }}
                      title="OLED Pure Black"
                      aria-label="OLED Pure Black"
                    >
                      <IconOled size={14} />
                    </button>
                  )}
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

            {showCompactLedger && (
              <SettingsToggleRow
                icon={<IconClipboardList size={18} />}
                title="Compact ledger"
                subtitle="Tighter rows"
                checked={compactLedgerOn}
                onChange={(next) => { triggerHaptic('light'); setCompactLedgerView(next); }}
                label="Compact ledger"
              />
            )}
        </SettingsSection>
      )}

      {(showNotificationsHub || showNotificationDetails) && (
        <SettingsSection title="Notifications">
            {showNotificationsHub && (
              <SettingsCell
                icon={<IconBell size={18} />}
                title="Notifications"
                subtitle={notificationsSubtitle}
                hasDivider={false}
                onClick={() => setSubScreen('notifications')}
              />
            )}

            {showNotificationDetails && showNotifications && (
              <SettingsCell
                icon={<IconBell size={18} />}
                title="Inbox"
                subtitle={unreadNotificationCount > 0 ? `${unreadNotificationCount} unread` : 'All caught up'}
                onClick={() => { triggerHaptic('light'); openNotificationsPanel(); }}
              />
            )}
            {showNotificationDetails && showMute && activeTrip && (
              <SettingsToggleRow
                icon={<IconBell size={18} />}
                title="Mute this trip"
                subtitle="No push alerts for this trip"
                checked={isTripMuted}
                onChange={(next) => setTripMuted(activeTrip.id, next)}
                label="Mute this trip"
              />
            )}
            {showNotificationDetails && showDigestMode && (
              <SettingsToggleRow
                icon={<IconClipboardList size={18} />}
                title="Daily digest"
                subtitle="One summary instead of a push per event"
                checked={digestModeOn}
                onChange={handleToggleDigestMode}
                label="Daily digest"
              />
            )}
            {showNotificationDetails && showQuietHours && (
              <SettingsToggleRow
                icon={<IconMoon size={18} />}
                title="Quiet hours"
                subtitle={quietHours.enabled ? `${quietHours.startTime}–${quietHours.endTime}` : 'Pause push during a window'}
                checked={quietHours.enabled}
                onChange={handleToggleQuietHours}
                label="Quiet hours"
                disabled={quietHoursBusy}
              >
                {quietHours.enabled && (
                  <div className="settings-quiet-times">
                    <input
                      type="time"
                      className="input-field"
                      value={quietHours.startTime}
                      aria-label="Quiet hours start"
                      onChange={(e) => saveQuietHours({ ...quietHours, startTime: e.target.value })}
                    />
                    <span>to</span>
                    <input
                      type="time"
                      className="input-field"
                      value={quietHours.endTime}
                      aria-label="Quiet hours end"
                      onChange={(e) => saveQuietHours({ ...quietHours, endTime: e.target.value })}
                    />
                  </div>
                )}
              </SettingsToggleRow>
            )}
            {showNotificationDetails && showPassReminders && (
              <SettingsToggleRow
                icon={<IconClipboardList size={18} />}
                title="Pass reminders"
                subtitle="24h before departure, 3h for flights and trains"
                checked={passRemindersOn}
                onChange={handleTogglePassReminders}
                label="Pass reminders"
              />
            )}
        </SettingsSection>
      )}

      {/* Data */}
      {showDataGroup && (
        <SettingsSection title="Data">
            {showDataSaver && (
              <SettingsToggleRow
                icon={<IconDatabase size={18} />}
                title="Data saver"
                subtitle="Map stays collapsed"
                checked={dataSaverOn}
                onChange={(next) => { triggerHaptic('light'); setDataSaverEnabled(next); }}
                label="Data saver"
              />
            )}
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
                icon={<IconAlertCircle size={18} />}
                iconGlow="rose"
                title="Report a Problem"
                subtitle="Tell us what went wrong — device details attach automatically"
                onPointerEnter={prefetchSettingsLeaves}
                onPointerDown={prefetchSettingsLeaves}
                onClick={() => setSubScreen('report-issue')}
              />
            )}

            {showSuggestFeature && (
              <SettingsCell
                icon={<IconSparkles size={18} />}
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
                icon={<IconShield size={18} />}
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
                subtitle={`Version ${appVersion ?? WEB_APP_VERSION}`}
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
            {showInstall && (
            <SettingsCell
              icon={<IconSmartphone size={18} />}
              title="Install app"
              subtitle="Add Trip Tracker to your home screen"
              chevron={false}
                onClick={() => {
                  triggerHaptic('light');
                  onInstallApp?.();
                  onClose?.();
                }}
            />
          )}
            {showSignOut && onSignOut && (
              <SettingsCell
                icon={<IconLogOut size={18} />}
                iconGlow="red"
                destructive
                title="Sign Out"
                subtitle="Sign out on this device"
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
            <IconShield size={13} /> Super User Login
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
