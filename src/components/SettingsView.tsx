import React, { useState, useEffect, useRef, lazy, Suspense } from 'react';
import type { Category, Expense, Trip } from '../types';
import type { ConfirmRequest } from './ConfirmDialog';
import {
  IconTag,
  IconTrash,
  IconArchive,
  IconDownload,
  IconUpload,
  IconFileSpreadsheet,
  IconMoon,
  IconSun,
  IconSmartphone,
  IconDatabase,
  IconSparkles,
  IconLogOut,
  IconAlertCircle,
  IconCheckCircle,
  IconChevronRight,
  IconChevronLeft,
  IconMapPin,
  IconShield,
  IconBell,
  IconShare,
  IconRefresh,
  IconSearch,
  IconQrCode,
  IconVibrate,
  IconPieChart,
  IconCheck,
  IconCopy,
} from './Icons';
// TripJourneyMap pulls in maplibre-gl (~1.5MB minified) -- code-split so it
// doesn't load unless the user opens the "Trip Map" subscreen.
const TripJourneyMap = lazy(() =>
  import('./TripJourneyMap').then((m) => ({ default: m.TripJourneyMap }))
);
import { CategoryIcon } from './CategoryIcon';
import { useTripStore } from '../store/tripStore';
import { useAuthStore } from '../store/authStore';
import { useNotificationsStore } from '../store/notificationsStore';
import { formatDateRange } from '../utils/dateRange';
import { getCategoryKeywords } from '../utils/categoryHelper';
import { getAppVersion } from '../utils/appVersion';
import { triggerHaptic, getHapticPreference, setHapticPreference, type HapticPreference } from '../utils/haptics';
import { getCurrencySymbol } from '../utils/currency';
import { calculateSettlements } from '../utils/settlement';
import { getQrCodeUrl } from '../utils/upiLinks';
import { BugReportModal } from './BugReportModal';
import { FeatureRequestModal } from './FeatureRequestModal';
import { SuperadminAuthModal } from './SuperadminAuthModal';

// Superadmin-only, reached only via the gated "Superadmin Console" row
// below -- code-split so its ~700 lines don't ship in every traveler's
// bundle.
const SuperAdminBugTracker = lazy(() => import('./SuperAdminBugTracker').then((m) => ({ default: m.SuperAdminBugTracker })));
import { useHistoryBack } from '../utils/useHistoryBack';
import { useEscapeKey } from '../utils/useEscapeKey';

export type ThemePref = 'light' | 'dark' | 'system';

type SubScreen = null | 'trip-tools' | 'categories' | 'recycle-bin' | 'appearance' | 'backups' | 'archived-trips' | 'bug-tracker' | 'report-issue' | 'suggest-feature' | 'trip-map' | 'storage-data';


const RECYCLE_BIN_WINDOW_MS = 24 * 60 * 60 * 1000;

function formatTimeLeft(deletedAt: number): string {
  const msLeft = deletedAt + RECYCLE_BIN_WINDOW_MS - Date.now();
  if (msLeft <= 0) return 'purging soon';
  const hoursLeft = Math.floor(msLeft / (60 * 60 * 1000));
  if (hoursLeft < 1) return '<1h left';
  return `${hoursLeft}h left`;
}

const CATEGORY_ICON_PRESETS = [
  '🍔', '🏨', '✈️', '🎟️', '🛍️', '📦', '🚗', '⛽', '🎬', '🍺', '💊', '🎁', '🧾', '🏥', '🎓', '🐾', '🎵', '🚕',
  '🏖️', '🗺️', '🧳', '🚆', '🚢', '🚌', '🎫', '🍽️', '☕', '🏔️', '🏛️', '📸', '🛂', '💱',
];

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
  onSignOut?: () => void;
  pwaInstallable?: boolean;
  onInstallApp?: () => void;
  onOpenSuperadminPortal?: () => void;

  // Context
  hasActiveTrip?: boolean;
  initialSubScreen?: SubScreen;
  baseCurrency?: string;
  onClose?: () => void;
  onRequestConfirm?: (req: ConfirmRequest) => void;
  onOpenShareTrip?: () => void;
  onOpenTripWrapped?: () => void;
  onNavigateToBalances?: () => void;
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
  onSignOut,
  pwaInstallable = false,
  onInstallApp,
  onOpenSuperadminPortal,
  hasActiveTrip = true,
  initialSubScreen = null,
  onClose,
  onRequestConfirm,
  onOpenShareTrip,
  onOpenTripWrapped,
  onNavigateToBalances,
  baseCurrency,
}: SettingsViewProps) {
  const [subScreen, setSubScreen] = useState<SubScreen>(initialSubScreen);

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

  // Determine if current user can manage/close the active trip
  const isTripAdmin = Boolean(
    isAdmin ||
    isSuperadmin ||
    !userId ||
    !activeTrip?.ownerId ||
    activeTrip.ownerId === userId ||
    (userId && activeTrip.adminMemberIds && activeTrip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && activeTrip.adminMemberIds?.includes(mid)))
  );

  const currencySymbol = getCurrencySymbol(activeTrip?.baseCurrency || baseCurrency || 'INR');

  // Groups and Settlement calculation for active trip
  const groups = useTripStore((s) => s.groups);
  const activeTripGroups = React.useMemo(() => {
    return activeTrip ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean) : [];
  }, [activeTrip, groups]);

  const settlementSummary = React.useMemo(() => {
    if (!activeTrip) return { isFullySettled: true, totalOutstanding: 0, transferCount: 0, unsettledMemberCount: 0 };
    const { balances, transfers } = calculateSettlements(activeTrip, members, activeTripExpenses, activeTripGroups);
    const totalOutstanding = transfers.reduce((sum, t) => sum + t.amount, 0);
    const isFullySettled = transfers.length === 0 || totalOutstanding < 0.01;
    const unsettledMemberCount = balances.filter((b) => Math.abs(b.balance) >= 0.01).length;
    return {
      isFullySettled,
      totalOutstanding,
      transferCount: transfers.length,
      unsettledMemberCount,
    };
  }, [activeTrip, members, activeTripExpenses, activeTripGroups]);

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

  const closeTripBadgeBg = activeTrip?.closed
    ? 'rgba(239, 68, 68, 0.15)'
    : settlementSummary.isFullySettled
    ? 'rgba(16, 185, 129, 0.15)'
    : 'rgba(245, 158, 11, 0.15)';

  const closeTripBadgeColor = activeTrip?.closed
    ? '#EF4444'
    : settlementSummary.isFullySettled
    ? '#10B981'
    : '#F59E0B';

  const closeTripSquircleClass = activeTrip?.closed
    ? 'squircle-teal-glow'
    : settlementSummary.isFullySettled
    ? 'squircle-teal-glow'
    : 'squircle-amber-glow';

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

  // Category keyword states
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);
  const [newKeywordInput, setNewKeywordInput] = useState('');
  const [coachmarkResetStatus, setCoachmarkResetStatus] = useState<string | null>(null);

  // Settings v2: Search & Clipboard state
  const [searchQuery, setSearchQuery] = useState('');
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // WhatsApp-inspired Tactile Haptic Preference state
  const [hapticPref, setHapticPrefState] = useState<HapticPreference>(getHapticPreference);

  const handleSetHapticPref = (pref: HapticPreference) => {
    setHapticPreference(pref);
    setHapticPrefState(pref);
    triggerHaptic('medium');
  };

  // WhatsApp Profile QR Code modal state
  const [isQrModalOpen, setIsQrModalOpen] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState<string | null>(null);

  // WhatsApp Profile Status tagline state with preset suggestions
  const STATUS_PRESETS = [
    'Exploring Tokyo 🗼',
    'Beach mode activated 🏖️',
    'Mountain trekking 🏔️',
    'Road trip vibes 🚗',
    'Food safari 🍜',
    'Backpacking mode 🎒',
  ];

  const [statusTagline, setStatusTagline] = useState<string>(() => {
    try {
      return localStorage.getItem('tt_traveler_status_tagline') || 'Exploring the world with friends 🎒';
    } catch {
      return 'Exploring the world with friends 🎒';
    }
  });
  const [isEditingStatus, setIsEditingStatus] = useState(false);
  const [statusDraft, setStatusDraft] = useState(statusTagline);

  const handleSaveStatus = () => {
    const trimmed = statusDraft.trim() || 'Ready for adventure ✈️';
    try {
      localStorage.setItem('tt_traveler_status_tagline', trimmed);
    } catch {}
    setStatusTagline(trimmed);
    setIsEditingStatus(false);
    triggerHaptic('success');
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

  // Shareable Trip & Profile Link
  const tripInviteLink = React.useMemo(() => {
    if (typeof window === 'undefined') return '';
    const base = import.meta.env.BASE_URL.endsWith('/') ? import.meta.env.BASE_URL : `${import.meta.env.BASE_URL}/`;
    if (activeTrip?.joinCode) {
      return `${window.location.origin}${base}join/${activeTrip.joinCode}`;
    }
    if (activeTrip) {
      return `${window.location.origin}${base}?trip=${activeTrip.id}`;
    }
    return `${window.location.origin}${base}`;
  }, [activeTrip]);

  const handleCopyInviteLink = async () => {
    if (!tripInviteLink) return;
    try {
      await navigator.clipboard.writeText(tripInviteLink);
      setCopiedInvite('Copied!');
      triggerHaptic('success');
      setTimeout(() => setCopiedInvite(null), 2000);
    } catch {}
  };

  const handleShareInviteLink = async () => {
    if (!tripInviteLink) return;
    triggerHaptic('light');
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share({
          title: `Join ${activeTrip?.name || 'Trip'} on Trip Tracker`,
          text: `Join our expedition "${activeTrip?.name || 'Trip'}" to track expenses together!`,
          url: tripInviteLink,
        });
        return;
      } catch {}
    }
    handleCopyInviteLink();
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

  const handleResetCoachmarks = () => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('tt_flight_add_tooltip_dismissed_v1');
      }
    } catch {}
    window.dispatchEvent(new CustomEvent('tt:reset-coachmarks'));
    triggerHaptic('success');
    setCoachmarkResetStatus('✓ Reactivated');
    setTimeout(() => setCoachmarkResetStatus(null), 2500);
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
    setExpandedCategoryId(null);
  };

  // Register sub-screen drill-downs into browser history stack (WhatsApp hierarchical navigation)
  useHistoryBack(subScreen !== null, closeSubScreen);
  useEscapeKey(subScreen !== null, closeSubScreen);

  // Register expanded category auto-tags drawer into browser history stack
  useHistoryBack(expandedCategoryId !== null, () => {
    setExpandedCategoryId(null);
  });
  useEscapeKey(expandedCategoryId !== null, () => setExpandedCategoryId(null));

  // Register WhatsApp QR Code modal into browser history stack
  useHistoryBack(isQrModalOpen, () => setIsQrModalOpen(false));
  useEscapeKey(isQrModalOpen, () => setIsQrModalOpen(false));

  // Connectivity and disk storage
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [storageEstimate, setStorageEstimate] = useState<{ used: number; quota: number } | null>(null);
  const [appVersion, setAppVersion] = useState<string | null>(null);

  // Partitioned Storage breakdown (Receipts vs Database vs System Cache)
  const storageBreakdown = React.useMemo(() => {
    const totalUsed = storageEstimate?.used || 0;
    // Estimate image receipts footprint: count expenses with receipts
    const receiptExpenses = activeTripExpenses.filter((e) => Boolean(e.receiptImage || e.receiptPath));
    const estimatedReceiptBytes = receiptExpenses.length * 120 * 1024;
    // Database json footprint
    const estimatedDbBytes = JSON.stringify({ trips, activeTripExpenses, categories }).length * 2;
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
  }, [storageEstimate, activeTripExpenses, trips, categories]);

  useEffect(() => {
    fetchDeletedExpenses();
  }, [fetchDeletedExpenses]);

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

  // Category form states
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryIcon, setNewCategoryIcon] = useState('');
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [mergeTargetId, setMergeTargetId] = useState('');

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) return;
    await onAddCategory(newCategoryName.trim(), newCategoryIcon.trim() || '🏷️');
    setNewCategoryName('');
    setNewCategoryIcon('');
  };

  const handleDeleteCategoryTrigger = (cat: Category) => {
    const affectedCount = activeTripExpenses.filter((e) => e.category === cat.id).length;
    if (affectedCount > 0) {
      const otherCats = categories.filter((c) => c.id !== cat.id);
      setMergeTargetId(otherCats[0]?.id || '');
      setCategoryToDelete(cat);
    } else {
      onRequestConfirm?.({
        title: 'Delete category',
        message: `Are you sure you want to delete the category "${cat.name}"?`,
        confirmLabel: 'Delete',
        danger: true,
        onConfirm: () => onDeleteCategory(cat.id, null),
      });
    }
  };

  const handleConfirmMergeDelete = () => {
    if (!categoryToDelete) return;
    onDeleteCategory(categoryToDelete.id, mergeTargetId || null);
    setCategoryToDelete(null);
  };

  const affectedExpensesCount = categoryToDelete
    ? activeTripExpenses.filter((e) => e.category === categoryToDelete.id).length
    : 0;

  const displayName = userDisplayName || userEmail?.split('@')[0] || 'Traveler';
  const initialLetter = displayName.charAt(0).toUpperCase();

  const themeLabel =
    themePref === 'light' ? 'Light' : themePref === 'dark' ? 'Night flight' : 'System default';

  // -------------------------------------------------------------------------
  // Sub-screens
  // -------------------------------------------------------------------------

  if (subScreen === 'categories') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Categories &amp; Tags</h3>
        <p className="settings-subscreen-subtitle">
          Tap any category to view and edit its smart auto-tagging keywords &amp; brands.
        </p>

        <div className="settings-group">
          <div className="settings-group-card" style={{ padding: '4px 0' }}>
            {categories.map((cat) => {
              const dataset = getCategoryKeywords(cat);
              const allKeywords = [...dataset.brands, ...dataset.items];
              const isExpanded = expandedCategoryId === cat.id;

              return (
                <div
                  key={cat.id}
                  style={{
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '12px 16px',
                      cursor: 'pointer',
                      background: isExpanded ? 'rgba(47,111,237,0.04)' : 'transparent',
                      transition: 'background 0.15s ease',
                    }}
                    onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px', minWidth: 0, flex: 1 }}>
                      <CategoryIcon categoryId={cat.id} fallbackEmoji={cat.icon} size={18} />
                      <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                        <span style={{ color: 'var(--text-primary)', fontWeight: 500, fontSize: '14.5px' }}>{cat.name}</span>
                        <span style={{ fontSize: '11.5px', color: 'var(--text-muted)' }}>
                          {allKeywords.length} auto-tag keywords {cat.keywords ? '• Custom' : ''}
                        </span>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }} onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: '4px 10px', fontSize: '11.5px' }}
                        onClick={() => setExpandedCategoryId(isExpanded ? null : cat.id)}
                      >
                        {isExpanded ? 'Close Tags' : 'Edit Tags'}
                      </button>
                      {cat.isCustom && isAdmin && (
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: '4px 8px', fontSize: '11.5px', color: 'var(--color-danger)', borderColor: 'rgba(225,29,72,0.18)' }}
                          onClick={() => handleDeleteCategoryTrigger(cat)}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expanded Keyword Chips & Add form */}
                  {isExpanded && (
                    <div className="fade-in" style={{ padding: '12px 16px 16px 16px', background: 'rgba(15,23,42,0.02)', borderTop: '1px dashed var(--border-color)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                        <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                          Auto-tagging Keywords &amp; Brands ({allKeywords.length}):
                        </span>
                        {cat.keywords && (
                          <button
                            type="button"
                            style={{ background: 'transparent', border: 'none', color: 'var(--primary-accent)', fontSize: '11.5px', fontWeight: 600, cursor: 'pointer', padding: '2px 4px' }}
                            onClick={() => resetCategoryKeywords(cat.id)}
                          >
                            Reset to Defaults
                          </button>
                        )}
                      </div>

                      {/* Tag Chips Tray */}
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '160px', overflowY: 'auto', padding: '6px 2px', marginBottom: '10px' }}>
                        {allKeywords.map((kw) => (
                          <span
                            key={kw}
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '12px',
                              fontSize: '11.5px',
                              background: 'var(--bg-surface)',
                              border: '1px solid var(--border-color)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {kw}
                            <button
                              type="button"
                              className="dismiss-glyph-btn"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: 'var(--text-muted)',
                                cursor: 'pointer',
                                fontSize: '12px',
                                lineHeight: 1,
                              }}
                              onClick={() => {
                                const updated = allKeywords.filter((k) => k !== kw);
                                updateCategoryKeywords(cat.id, updated);
                              }}
                              title={`Remove "${kw}"`}
                              aria-label={`Remove "${kw}"`}
                            >
                              &times;
                            </button>
                          </span>
                        ))}
                      </div>

                      {/* Add new keyword form */}
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          const val = newKeywordInput.trim().toLowerCase();
                          if (!val || allKeywords.includes(val)) return;
                          updateCategoryKeywords(cat.id, [...allKeywords, val]);
                          setNewKeywordInput('');
                        }}
                        style={{ display: 'flex', gap: '8px' }}
                      >
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Add new keyword or brand (e.g. dosa, uber, petrol)..."
                          aria-label={`Add keyword for ${cat.name}`}
                          style={{ flex: 1, fontSize: '12px', height: '34px' }}
                          value={newKeywordInput}
                          onChange={(e) => setNewKeywordInput(e.target.value)}
                        />
                        <button type="submit" className="gradient-btn" style={{ padding: '0 14px', fontSize: '12px', height: '34px' }}>
                          Add Tag
                        </button>
                      </form>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {isAdmin ? (
          <div className="settings-group">
            <h4 className="settings-group-title">Add Custom Category</h4>
            <div className="settings-group-card" style={{ padding: '16px' }}>
              <form onSubmit={handleAddSubmit} style={{ display: 'flex', gap: '8px' }}>
                <div
                  style={{ position: 'relative' }}
                  onBlur={(e) => {
                    if (!e.currentTarget.contains(e.relatedTarget as Node)) setShowIconPicker(false);
                  }}
                >
                  <input
                    type="text"
                    className="input-field"
                    style={{ width: '52px', height: '44px', textAlign: 'center', fontSize: '19px', padding: '0' }}
                    placeholder="🏷️"
                    maxLength={4}
                    value={newCategoryIcon}
                    onChange={(e) => setNewCategoryIcon(e.target.value)}
                    onFocus={() => setShowIconPicker(true)}
                    aria-label="Category emoji icon"
                    title="Pick an emoji"
                  />
                  {showIconPicker && (
                    <div
                      style={{
                        position: 'absolute',
                        top: 'calc(100% + 6px)',
                        left: 0,
                        zIndex: 20,
                        width: '204px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        gap: '6px',
                        padding: '10px',
                        background: 'var(--bg-surface)',
                        border: '1px solid var(--border-color)',
                        borderRadius: 'var(--border-radius-md)',
                        boxShadow: '0 10px 25px -5px rgba(28,42,56,0.2)',
                      }}
                    >
                      {CATEGORY_ICON_PRESETS.map((icon) => (
                        <button
                          key={icon}
                          type="button"
                          onClick={() => {
                            setNewCategoryIcon(icon);
                            setShowIconPicker(false);
                          }}
                          style={{
                            width: '32px',
                            height: '32px',
                            fontSize: '16px',
                            lineHeight: 1,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            borderRadius: 'var(--border-radius-sm)',
                            cursor: 'pointer',
                            transition: 'var(--transition-smooth)',
                            border: newCategoryIcon === icon ? '2px solid var(--primary-accent)' : '1.5px solid transparent',
                            background: newCategoryIcon === icon ? 'rgba(47,111,237,0.10)' : 'var(--bg-surface-hover)',
                          }}
                        >
                          {icon}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <input
                  type="text"
                  required
                  className="input-field"
                  style={{ flex: 1 }}
                  placeholder="Category name"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                />
                <button type="submit" className="gradient-btn" style={{ padding: '10px 16px' }}>
                  Add
                </button>
              </form>
            </div>
          </div>
        ) : (
          <p style={{ fontSize: '12px', color: 'var(--text-secondary)', padding: '0 8px' }}>Only trip admins can add categories.</p>
        )}

        {/* Merge & Delete Category Dialog */}
        {categoryToDelete && (
          <div className="modal-overlay" onClick={() => setCategoryToDelete(null)}>
            <div className="glass-card fade-in" style={{ width: '100%', maxWidth: '400px', background: 'var(--bg-surface)', border: '1px solid var(--border-color)' }} onClick={(e) => e.stopPropagation()}>
              <h3 style={{ fontSize: '17px', marginBottom: '10px' }}>Merge and Delete Category</h3>
              <p style={{ fontSize: '13.5px', color: 'var(--text-secondary)', marginBottom: '16px', lineHeight: '1.5' }}>
                The category <strong>"{categoryToDelete.name}"</strong> is currently used in <strong>{affectedExpensesCount}</strong> expense{affectedExpensesCount === 1 ? '' : 's'}. Select a replacement category to merge these expenses into:
              </p>

              <div className="form-group" style={{ marginBottom: '20px' }}>
                <label className="form-label" htmlFor="merge-target-category">Replacement Category</label>
                <select
                  id="merge-target-category"
                  className="input-field select-field"
                  value={mergeTargetId}
                  onChange={(e) => setMergeTargetId(e.target.value)}
                  style={{ height: '40px' }}
                >
                  {categories
                    .filter((c) => c.id !== categoryToDelete.id)
                    .map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '12px' }}>
                <button type="button" className="secondary-btn" style={{ flex: 1 }} onClick={() => setCategoryToDelete(null)}>
                  Cancel
                </button>
                <button type="button" className="gradient-btn" style={{ flex: 1, background: 'var(--color-danger)' }} onClick={handleConfirmMergeDelete}>
                  Merge &amp; Delete
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (subScreen === 'recycle-bin') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
          {deletedExpenses.length > 0 && (
            <button
              type="button"
              className="settings-subscreen-action-btn danger"
              onClick={() => {
                onRequestConfirm?.({
                  title: 'Empty Recycle Bin',
                  message: 'Permanently delete all expenses in the recycle bin? This cannot be undone.',
                  confirmLabel: 'Empty Bin',
                  danger: true,
                  onConfirm: () => emptyRecycleBin(),
                });
              }}
            >
              Empty Bin
            </button>
          )}
        </div>
        <h3 className="settings-subscreen-main-title">Recycle Bin</h3>
        <p className="settings-subscreen-subtitle">
          Soft-deleted expenses can be restored back to your trip or permanently removed.
        </p>

        <div className="settings-group">
          <div className="settings-group-card">
            {deletedExpenses.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                Recycle Bin is currently empty.
              </div>
            ) : (
              deletedExpenses.map((exp) => (
                <div
                  key={exp.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{exp.title}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>
                      <span>{exp.currency} {exp.amount.toFixed(2)}</span> &middot; {exp.deletedAt ? formatTimeLeft(exp.deletedAt) : ''}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => restoreExpense(exp.id)}
                      title="Restore expense"
                    >
                      <IconArchive size={13} className="icon-sm" /> Restore
                    </button>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 8px', fontSize: '12px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                      onClick={() => {
                        onRequestConfirm?.({
                          title: 'Delete permanently',
                          message: `Permanently delete "${exp.title}"? This cannot be undone.`,
                          confirmLabel: 'Delete',
                          danger: true,
                          onConfirm: () => permanentlyDeleteExpense(exp.id),
                        });
                      }}
                      title="Permanently delete now"
                      aria-label="Permanently delete"
                    >
                      <IconTrash size={13} className="icon-sm" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'appearance') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Appearance</h3>
        <p className="settings-subscreen-subtitle">
          Customize the theme palette and visual appearance for your device.
        </p>

        <div className="settings-group">
          <h4 className="settings-group-title">Theme Palette</h4>
          <div className="settings-group-card">
            {(
              [
                { value: 'light', label: 'Light', desc: 'Editorial warm canvas & crisp typography' },
                { value: 'dark', label: 'Night flight', desc: 'Deep obsidian backdrop with emerald luminescence' },
                { value: 'system', label: 'System default', desc: 'Matches your OS dark/light mode preference' },
              ] as { value: ThemePref; label: string; desc: string }[]
            ).map((opt) => (
              <button
                key={opt.value}
                type="button"
                className="settings-row-item"
                onClick={() => setThemePref(opt.value)}
              >
                <div className="settings-row-left">
                  <div
                    className={`settings-squircle ${
                      opt.value === 'dark'
                        ? 'squircle-indigo'
                        : opt.value === 'light'
                        ? 'squircle-amber'
                        : 'squircle-teal'
                    }`}
                  >
                    {opt.value === 'dark' ? (
                      <IconMoon size={18} />
                    ) : opt.value === 'light' ? (
                      <IconSun size={18} />
                    ) : (
                      <IconSparkles size={18} />
                    )}
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">{opt.label}</span>
                    <span className="settings-row-subtitle">{opt.desc}</span>
                  </div>
                </div>
                {themePref === opt.value && (
                  <span style={{ color: 'var(--primary-accent)', display: 'flex', alignItems: 'center' }}>
                    <IconCheckCircle size={18} />
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'trip-map') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Trip Map</h3>
        <p className="settings-subscreen-subtitle">Where the money went, plotted on the map.</p>
        <Suspense
          fallback={
            <div className="glass-card" style={{ height: '320px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
              Loading map...
            </div>
          }
        >
          <TripJourneyMap expenses={activeTripExpenses} categories={categories} baseCurrency={baseCurrency || ''} />
        </Suspense>
      </div>
    );
  }

  if (subScreen === 'archived-trips') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Archived Trips</h3>
        <p className="settings-subscreen-subtitle">
          Past trips you've archived. You can restore them anytime or permanently delete them.
        </p>

        <div className="settings-group">
          <div className="settings-group-card">
            {archivedTrips.length === 0 ? (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: '13.5px' }}>
                No archived trips. Archive a trip from the Trips list to tuck it away without deleting it.
              </div>
            ) : (
              archivedTrips.map((trip) => (
                <div
                  key={trip.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '12px 16px',
                    borderBottom: '1px solid var(--border-color-subtle, rgba(15,23,42,0.06))',
                  }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{trip.name}</div>
                    <div style={{ fontSize: '11.5px', color: 'var(--text-secondary)' }}>{formatDateRange(trip.startDate, trip.endDate)}</div>
                  </div>
                  <div style={{ display: 'flex', gap: '6px', flexShrink: 0 }}>
                    <button
                      type="button"
                      className="secondary-btn"
                      style={{ padding: '6px 10px', fontSize: '12px' }}
                      onClick={() => onRestoreTrip?.(trip)}
                    >
                      <IconArchive size={13} className="icon-sm" /> Restore
                    </button>
                    {(!trip.ownerId || !userId || trip.ownerId === userId || Boolean(trip.adminMemberIds && trip.memberIds.some((mid) => members[mid]?.linkedUserId === userId && trip.adminMemberIds?.includes(mid)))) && (
                      <button
                        type="button"
                        className="secondary-btn"
                        style={{ padding: '6px', color: 'var(--color-danger)', borderColor: 'rgba(184,69,46,0.2)' }}
                        aria-label="Delete trip permanently"
                        title="Delete trip permanently"
                        onClick={() => onDeleteTrip?.(trip)}
                      >
                        <IconTrash size={13} className="icon-sm" />
                      </button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'backups') {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button type="button" className="settings-subscreen-back-link" onClick={() => setSubScreen(null)}>
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Database &amp; Backups</h3>
        <p className="settings-subscreen-subtitle">
          Manage your local database, sync storage, and export JSON or CSV backups.
        </p>

        {/* Disk usage */}
        {storageEstimate && (
          <div className="settings-group">
            <h4 className="settings-group-title">Storage Consumption</h4>
            <div className="settings-group-card" style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Local Disk Usage:</span>
                <span style={{ fontWeight: 600 }}>
                  {formatBytes(storageEstimate.used)} of {formatBytes(storageEstimate.quota)}
                </span>
              </div>
              <div style={{ width: '100%', height: '5px', background: 'rgba(15,23,42,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${Math.min(100, (storageEstimate.used / storageEstimate.quota) * 100)}%`,
                    height: '100%',
                    background: 'var(--primary-accent)',
                  }}
                />
              </div>
            </div>
          </div>
        )}

        {/* JSON Backup Export & Import */}
        <div className="settings-group">
          <h4 className="settings-group-title">JSON Snapshot</h4>
          <div className="settings-group-card" style={{ padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
              Export your local database to keep as a cold offline backup or restore onto another device.
            </p>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                type="button"
                className="gradient-btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={onExportJson}
              >
                <IconDownload size={15} className="icon-sm" /> Export Backup
              </button>
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '10px', fontSize: '13px' }}
                onClick={() => setShowImportArea?.(!showImportArea)}
              >
                <IconUpload size={15} className="icon-sm" /> Import Backup
              </button>
            </div>

            {showImportArea && (
              <div className="fade-in" style={{ marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <input
                  ref={importFileInputRef}
                  type="file"
                  accept="application/json,.json"
                  onChange={handleImportFileChange}
                  style={{ display: 'none' }}
                />
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '10px' }}
                  disabled={importStatus === 'pending'}
                  onClick={() => importFileInputRef.current?.click()}
                >
                  <IconUpload size={15} className="icon-sm" /> {importStatus === 'pending' ? 'Restoring...' : 'Choose Backup File...'}
                </button>
                {importJson && (
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', margin: 0 }}>
                    Loaded {formatBytes(new Blob([importJson]).size)} of backup data. Review and restore below.
                  </p>
                )}
                {importFileError && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', margin: 0 }}>{importFileError}</p>
                )}
                <details>
                  <summary style={{ fontSize: '12px', color: 'var(--text-secondary)', cursor: 'pointer' }}>Or paste JSON manually</summary>
                  <textarea
                    className="input-field"
                    rows={4}
                    placeholder="Paste backup JSON string here..."
                    aria-label="Backup JSON data"
                    style={{ fontFamily: 'var(--font-family-mono)', fontSize: '12px', marginTop: '8px' }}
                    value={importJson}
                    onChange={(e) => setImportJson?.(e.target.value)}
                  />
                </details>
                <button
                  type="button"
                  className="gradient-btn"
                  style={{ padding: '8px' }}
                  disabled={!importJson || importStatus === 'pending'}
                  onClick={() => onImport?.()}
                >
                  {importStatus === 'pending' ? 'Restoring...' : 'Restore Snapshot'}
                </button>

                {importStatus === 'success' && (
                  <p style={{ color: 'var(--color-success-text)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconCheckCircle size={15} className="icon-sm" /> Database restored successfully!
                  </p>
                )}
                {importStatus === 'error' && (
                  <p style={{ color: 'var(--color-danger)', fontSize: '13px', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', margin: 0 }}>
                    <IconAlertCircle size={15} className="icon-sm" /> {importErrorMessage || 'Invalid database snapshot format.'}
                  </p>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'storage-data') {
    const totalUsedStr = storageEstimate ? formatBytes(storageEstimate.used) : '0 B';
    const quotaStr = storageEstimate ? formatBytes(storageEstimate.quota) : '50 GB';
    const percentUsed = storageEstimate && storageEstimate.quota > 0
      ? ((storageEstimate.used / storageEstimate.quota) * 100).toFixed(2)
      : '0.01';

    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button
            type="button"
            className="settings-subscreen-back-link"
            onClick={() => {
              triggerHaptic('light');
              setSubScreen(null);
            }}
            aria-label="Back to Settings"
          >
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Storage and Data</h3>
        <p className="settings-subscreen-subtitle">
          Manage local media receipts, trip ledgers, offline cache, and backup exports.
        </p>

        {/* Partitioned Storage Visualizer Card */}
        <div className="settings-group">
          <h4 className="settings-group-title">Storage Usage</h4>
          <div className="settings-group-card" style={{ padding: '16px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
              <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--text-primary)' }}>
                {totalUsedStr} used
              </span>
              <span style={{ fontSize: '12px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-secondary)' }}>
                {quotaStr} total ({percentUsed}%)
              </span>
            </div>

            {/* Segmented Bar */}
            <div className="settings-storage-segmented-bar" role="progressbar" aria-valuenow={Number(percentUsed)} aria-valuemin={0} aria-valuemax={100}>
              <div
                className="storage-seg media"
                style={{ width: `${storageBreakdown.mediaPct}%` }}
                title={`Receipt Photos: ${storageBreakdown.mediaPct}%`}
              />
              <div
                className="storage-seg database"
                style={{ width: `${storageBreakdown.dbPct}%` }}
                title={`Trips & Ledgers: ${storageBreakdown.dbPct}%`}
              />
              <div
                className="storage-seg cache"
                style={{ width: `${storageBreakdown.cachePct}%` }}
                title={`Offline Cache: ${storageBreakdown.cachePct}%`}
              />
            </div>

            {/* Legend & Breakdown */}
            <div className="settings-storage-legend-card" style={{ background: 'transparent', border: 'none', padding: '6px 0 0' }}>
              <div className="settings-storage-legend-row">
                <div className="settings-storage-legend-left">
                  <span className="settings-storage-color-dot media" />
                  <span>Receipt Photos &amp; Attachments</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {storageBreakdown.receiptCount} {storageBreakdown.receiptCount === 1 ? 'receipt' : 'receipts'}
                  </span>
                  <span className="settings-storage-val-badge">
                    {formatBytes(storageBreakdown.receiptBytes)}
                  </span>
                </div>
              </div>

              <div className="settings-storage-legend-row">
                <div className="settings-storage-legend-left">
                  <span className="settings-storage-color-dot database" />
                  <span>Trip Ledgers &amp; Categories</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                    {trips.length} {trips.length === 1 ? 'trip' : 'trips'}
                  </span>
                  <span className="settings-storage-val-badge">
                    {formatBytes(storageBreakdown.dbBytes)}
                  </span>
                </div>
              </div>

              <div className="settings-storage-legend-row">
                <div className="settings-storage-legend-left">
                  <span className="settings-storage-color-dot cache" />
                  <span>App Shell, Icons &amp; Offline Cache</span>
                </div>
                <span className="settings-storage-val-badge">
                  {formatBytes(storageBreakdown.cacheBytes)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Storage Optimization Actions */}
        <div className="settings-group">
          <h4 className="settings-group-title">Manage &amp; Free Up Space</h4>
          <div className="settings-group-card">
            <button
              type="button"
              className="settings-row-item"
              onClick={handleClearTempCache}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-amber-glow">
                  <IconTrash size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Free Up Cache Storage</span>
                  <span className="settings-row-subtitle">
                    {tempCacheCleared ? 'Temporary cache cleared!' : 'Purge temporary web caches and unpinned tiles'}
                  </span>
                </div>
              </div>
              <div className="settings-row-right">
                <span
                  className="settings-badge-pill"
                  style={{
                    color: tempCacheCleared ? 'var(--color-success)' : 'var(--primary-accent)',
                    fontWeight: 600,
                  }}
                >
                  {tempCacheCleared ? '✓ Cleared' : 'Free Up'}
                </span>
              </div>
            </button>

            {onExportJson && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onExportJson();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-emerald-glow">
                    <IconDownload size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Export Full Offline Backup</span>
                    <span className="settings-row-subtitle">Download JSON database snapshot for safe offline keeping</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill">JSON</span>
                </div>
              </button>
            )}

            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                triggerHaptic('light');
                setSubScreen('backups');
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-indigo-glow">
                  <IconDatabase size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Backup &amp; Restore Manager</span>
                  <span className="settings-row-subtitle">Inspect JSON payload, import previous backups</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>

        {/* Media Compression Guardrail Info Card */}
        <div className="settings-group">
          <h4 className="settings-group-title">Media Efficiency</h4>
          <div className="settings-group-card" style={{ padding: '14px 16px' }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
              <span style={{ fontSize: '20px' }}>⚡</span>
              <div>
                <div style={{ fontSize: '13.5px', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '2px' }}>
                  Smart Camera Auto-Compression Active
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: 1.45 }}>
                  Photos captured up to 25MB are automatically downscaled and re-encoded client-side into WebP/JPEG (&lt;180KB footprint) before saving. This keeps local storage slim and cloud sync instant on spotty 3G/roaming connections.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (subScreen === 'bug-tracker') {
    return (
      <div className="fade-in settings-container">
        <Suspense fallback={null}>
          <SuperAdminBugTracker onBack={() => setSubScreen(null)} isAdmin={isSuperadmin} onRequestConfirm={onRequestConfirm} />
        </Suspense>
      </div>
    );
  }

  if (subScreen === 'report-issue') {
    return (
      <BugReportModal
        onBack={() => setSubScreen(null)}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setReportIssueBackGuard}
        activeTripInfo={{ id: activeTripId, name: activeTrip?.name || null }}
      />
    );
  }

  if (subScreen === 'suggest-feature') {
    return (
      <FeatureRequestModal
        onBack={() => setSubScreen(null)}
        onRequestConfirm={onRequestConfirm}
        onRegisterBackGuard={setSuggestFeatureBackGuard}
      />
    );
  }

  if (subScreen === 'trip-tools' && activeTrip) {
    return (
      <div className="settings-container settings-subscreen-enter">
        <div className="settings-subscreen-nav-header">
          <button
            type="button"
            className="settings-subscreen-back-link"
            onClick={() => {
              triggerHaptic('light');
              setSubScreen(null);
            }}
            aria-label="Back to Settings"
          >
            <IconChevronLeft size={18} />
            <span>Settings</span>
          </button>
        </div>
        <h3 className="settings-subscreen-main-title">Trip Tools &amp; Preferences</h3>
        <p className="settings-subscreen-subtitle">
          Manage story cards, interactive maps, categories, and trip-specific notifications.
        </p>

        <div className="settings-trip-context-card" style={{ margin: '14px 0' }}>
          <div className="settings-trip-context-header">
            <span className="settings-trip-context-badge">CURRENT TRIP</span>
            <span className="settings-trip-context-curr">{activeTrip.baseCurrency}</span>
          </div>
          <div className="settings-trip-context-body">
            <h3 className="settings-trip-context-name">{activeTrip.name}</h3>
            <div className="settings-trip-context-meta">
              {activeTrip.destination && (
                <span className="settings-trip-context-tag">📍 {activeTrip.destination}</span>
              )}
              {(activeTrip.startDate || activeTrip.endDate) && (
                <span className="settings-trip-context-tag">🗓️ {formatDateRange(activeTrip.startDate, activeTrip.endDate)}</span>
              )}
            </div>
          </div>
        </div>

        <div className="settings-group">
          <h4 className="settings-group-title">Stories &amp; Navigation</h4>
          <div className="settings-group-card">
            {onOpenTripWrapped && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenTripWrapped();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber-glow">
                    <IconSparkles size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Trip Wrapped (Story Card)</span>
                    <span className="settings-row-subtitle">Generate 1080x1920 Instagram Story infographic</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ background: 'rgba(255,107,107,0.18)', color: '#FF6B6B', fontWeight: 700 }}>STORY</span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {onOpenShareTrip && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onOpenShareTrip();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-teal-glow">
                    <IconShare size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Invite &amp; Share Trip</span>
                    <span className="settings-row-subtitle">Share join link or QR code with companions</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            <button
              type="button"
              className="settings-row-item"
              onClick={() => {
                triggerHaptic('light');
                setSubScreen('trip-map');
              }}
            >
              <div className="settings-row-left">
                <div className="settings-squircle squircle-blue-glow">
                  <IconMapPin size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Trip Map</span>
                  <span className="settings-row-subtitle">Geotagged expenses plotted &amp; routed</span>
                </div>
              </div>
              <div className="settings-row-right">
                <IconChevronRight size={16} />
              </div>
            </button>
          </div>
        </div>

        <div className="settings-group">
          <h4 className="settings-group-title">Organization &amp; Preferences</h4>
          <div className="settings-group-card">
            {(isSuperadmin || isFeatureEnabled('enableKeywordTagging')) && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  setSubScreen('categories');
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-purple-glow">
                    <IconTag size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Categories &amp; Tags</span>
                    <span className="settings-row-subtitle">{categories.length} active categories</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {(isSuperadmin || isFeatureEnabled('enableRecycleBin')) && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  setSubScreen('recycle-bin');
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-rose-glow">
                    <IconTrash size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Recycle Bin</span>
                    <span className="settings-row-subtitle">
                      {deletedExpenses.length === 0 ? 'Empty (24h retention)' : `${deletedExpenses.length} deleted expense${deletedExpenses.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  {deletedExpenses.length > 0 && <span className="settings-badge-pill">{deletedExpenses.length}</span>}
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            <div className="settings-row-item" style={{ cursor: 'default' }}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-orange-glow">
                  <IconBell size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Mute Trip Alerts</span>
                  <span className="settings-row-subtitle">Silence push notifications for this trip</span>
                </div>
              </div>
              <div className="settings-row-right">
                <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', margin: 0, cursor: 'pointer' }}>
                  <input
                    type="checkbox"
                    checked={isTripMuted}
                    onChange={(e) => {
                      triggerHaptic('light');
                      setTripMuted(activeTrip.id, e.target.checked);
                    }}
                    aria-label="Mute Notifications"
                    style={{ opacity: 0, width: 0, height: 0, margin: 0 }}
                  />
                  <span
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      bottom: 0,
                      backgroundColor: isTripMuted ? '#17B6A6' : 'var(--border-color)',
                      transition: '0.2s ease',
                      borderRadius: 'var(--border-radius-pill)',
                    }}
                  >
                    <span
                      style={{
                        position: 'absolute',
                        height: '18px',
                        width: '18px',
                        left: isTripMuted ? '23px' : '3px',
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

            {isTripAdmin && (
              <button
                type="button"
                className="settings-row-item"
                onClick={handleToggleCloseTrip}
              >
                <div className="settings-row-left">
                  <div className={`settings-squircle ${closeTripSquircleClass}`}>
                    <IconShield size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">{closeTripTitle}</span>
                    <span className="settings-row-subtitle">
                      {closeTripSubtitle}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span
                    className="settings-badge-pill"
                    style={{
                      background: closeTripBadgeBg,
                      color: closeTripBadgeColor,
                      fontWeight: 700,
                    }}
                  >
                    {closeTripBadgeText}
                  </span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
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

  const showTripTools = hasActiveTrip && activeTrip && matchesSearch('Trip Tools & Story', 'story card', 'map', 'categories', 'recycle bin', 'mute');
  const showCloseTrip = hasActiveTrip && activeTrip && isTripAdmin && matchesSearch(
    activeTrip.closed ? 'Reopen Trip' : 'Close Trip',
    'close', 'reopen', 'lock', 'unlock', 'complete', 'completed', 'completion', 'settled', 'unsettled', 'outstanding', 'balances', 'debts', 'post trip', 'finish', 'archive trip'
  );
  const showCsvExport = hasActiveTrip && activeTrip && onExportCsv && matchesSearch('Excel CSV Export', 'spreadsheet', 'download', 'ledger', 'csv', 'sheets');
  const showTripGroup = showTripTools || showCloseTrip || showCsvExport;

  const showAppearance = matchesSearch('Appearance', 'theme', 'dark', 'light', 'night', 'auto', 'color', 'look');
  const showHaptics = matchesSearch('Tactile Haptics', 'vibrate', 'vibration', 'haptic', 'feedback', 'touch', 'buzz');
  const showNotifications = matchesSearch('Notifications', 'alerts', 'unread', 'bell', 'messages');
  const showGeotag = (isSuperadmin || isFeatureEnabled('enableGeotagging')) && matchesSearch('Geotag Expenses', 'gps', 'location', 'place', 'map', 'pin');
  const showCoachmarks = matchesSearch('Flight Coachmarks', 'tips', 'guide', 'reset', 'onboarding', 'airplane');
  const showInstall = pwaInstallable && matchesSearch('Install App', 'pwa', 'home screen', 'download', 'mobile');
  const showPreferencesGroup = showAppearance || showHaptics || showNotifications || showGeotag || showCoachmarks || showInstall;

  const showStorageManager = matchesSearch('Storage and Data', 'storage', 'data', 'cache', 'memory', 'disk', 'receipts', 'photos');
  const showArchived = matchesSearch('Archived Trips', 'restore', 'history', 'past trips', 'archive');
  const showBackups = isSuperadmin && matchesSearch('Database Backups', 'export', 'import', 'json', 'snapshot', 'restore');
  const showDemoTrip = onLoadDemoTrip && matchesSearch('Seed Demo Trip', 'sample', 'test', 'goa', 'demo');
  const showDataGroup = showStorageManager || showArchived || showBackups || showDemoTrip;

  const showReportProblem = matchesSearch('Report a Problem', 'bug', 'issue', 'diagnostics', 'broken', 'error');
  const showSuggestFeature = (isSuperadmin || isFeatureEnabled('enableFeatureSuggestions')) && matchesSearch('Suggest a Feature', 'feedback', 'idea', 'request');
  const showBugTracker = isSuperadmin && matchesSearch('Superadmin Bug Tracker', 'triage', 'sync', 'cases', 'cockpit');
  const showSignOut = onSignOut && matchesSearch('Sign Out', 'logout', 'session', 'disconnect', 'account');
  const showClearData = isSuperadmin && onClearDatabase && matchesSearch('Clear All Data', 'reset', 'wipe', 'delete', 'danger');
  const showHelpGroup = showReportProblem || showSuggestFeature || showBugTracker || showSignOut || showClearData;

  const showAbout = matchesSearch('Trip Tracker 2026', 'version', 'about', 'build', 'app');

  const hasAnyResults = showTripGroup || showPreferencesGroup || showDataGroup || showHelpGroup || showAbout;

  return (
    <div className="fade-in settings-container">
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

                {/* WhatsApp-Style Editable Status Tagline */}
                <div className="settings-profile-status-bar">
                  {!isEditingStatus ? (
                    <div
                      className="settings-profile-status-text"
                      onClick={() => {
                        triggerHaptic('light');
                        setStatusDraft(statusTagline);
                        setIsEditingStatus(true);
                      }}
                      title="Tap to change your travel status"
                    >
                      <span className="settings-status-quote">“{statusTagline}”</span>
                      <span className="settings-status-edit-hint">✎</span>
                    </div>
                  ) : (
                    <div className="settings-status-editor">
                      <input
                        type="text"
                        value={statusDraft}
                        onChange={(e) => setStatusDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveStatus();
                          if (e.key === 'Escape') setIsEditingStatus(false);
                        }}
                        className="settings-status-input"
                        maxLength={60}
                        placeholder="e.g. Exploring Tokyo 🗼"
                        autoFocus
                      />
                      <div className="settings-status-presets">
                        {STATUS_PRESETS.map((p) => (
                          <button
                            key={p}
                            type="button"
                            className="settings-status-preset-pill"
                            onClick={() => setStatusDraft(p)}
                          >
                            {p}
                          </button>
                        ))}
                      </div>
                      <div className="settings-status-actions">
                        <button
                          type="button"
                          className="secondary-btn"
                          style={{ padding: '3px 8px', fontSize: '11px' }}
                          onClick={() => setIsEditingStatus(false)}
                        >
                          Cancel
                        </button>
                        <button
                          type="button"
                          className="primary-btn"
                          style={{ padding: '3px 10px', fontSize: '11px' }}
                          onClick={handleSaveStatus}
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* WhatsApp-Style QR Code Button */}
              <button
                type="button"
                className="settings-profile-qr-btn"
                onClick={() => {
                  triggerHaptic('light');
                  setIsQrModalOpen(true);
                }}
                title="Scan or share profile & trip QR code"
                aria-label="Profile and Trip QR Code"
              >
                <IconQrCode size={20} />
              </button>
            </div>

            {/* Travel Stats Chips Strip */}
            <div className="settings-stat-pills">
              <span className="settings-stat-pill">✈️ {trips.length} {trips.length === 1 ? 'Trip' : 'Trips'}</span>
              <span className="settings-stat-pill">👥 {Object.keys(members).length} {Object.keys(members).length === 1 ? 'Companion' : 'Companions'}</span>
              <span className="settings-stat-pill">🔐 E2E Encrypted</span>
            </div>

            {/* Storage Gauge */}
            {storageEstimate && (
              <div className="settings-storage-gauge">
                <div className="settings-progress-bar-bg">
                  <div
                    className="settings-progress-bar-fill"
                    style={{ width: `${Math.min(100, Math.max(3, Math.round((storageEstimate.used / (storageEstimate.quota || 50000000)) * 100)))}%` }}
                  />
                </div>
              </div>
            )}

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
          <span style={{ fontSize: '12px' }}>Try searching for "dark", "backup", "map", "csv", or "notifications"</span>
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

      {/* Group 1: Trip-Specific Settings (When an active trip is selected) */}
      {showTripGroup && activeTrip && (
        <div className="settings-group">
          <h4 className="settings-group-title">This Trip: {activeTrip.name}</h4>
          <div className="settings-group-card">
            {/* Integrated Flight Pass Banner */}
            <div className="settings-trip-flight-banner">
              <div>
                <div className="settings-trip-flight-title">
                  <span>🌴</span> {activeTrip.name}
                </div>
                <div className="settings-trip-flight-meta">
                  {baseCurrency || activeTrip.baseCurrency || 'INR'} · {(activeTrip.memberIds?.length ?? Object.keys(members).length)} {(activeTrip.memberIds?.length ?? Object.keys(members).length) === 1 ? 'member' : 'members'} · {activeTripExpenses.length} {activeTripExpenses.length === 1 ? 'expense' : 'expenses'}
                </div>
              </div>
              <button
                type="button"
                onClick={handleToggleCloseTrip}
                disabled={!isTripAdmin}
                title={isTripAdmin ? (activeTrip.closed ? 'Click to reopen trip' : 'Click to close and lock trip') : undefined}
                style={{
                  fontSize: '9.5px',
                  fontFamily: 'var(--font-family-mono)',
                  fontWeight: 700,
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: flightStatusBg,
                  color: flightStatusColor,
                  border: `1px solid ${flightStatusBorder}`,
                  cursor: isTripAdmin ? 'pointer' : 'default',
                  transition: 'all 0.15s ease',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px',
                }}
                aria-label={activeTrip.closed ? 'Trip is closed. Click to reopen.' : 'Trip is active. Click to close.'}
              >
                <span>{flightStatusText}</span>
              </button>
            </div>

            {showTripTools && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  setSubScreen('trip-tools');
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber-glow">
                    <IconSparkles size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Trip Tools &amp; Story</span>
                    <span className="settings-row-subtitle">Story Card, Map, Categories, Recycle Bin &amp; Mute</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ background: 'rgba(56, 189, 248, 0.14)', color: '#0284C7', fontWeight: 600 }}>
                    {categories.length} categories
                  </span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showCloseTrip && (
              <button
                type="button"
                className="settings-row-item"
                onClick={handleToggleCloseTrip}
              >
                <div className="settings-row-left">
                  <div className={`settings-squircle ${closeTripSquircleClass}`}>
                    <IconShield size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">{closeTripTitle}</span>
                    <span className="settings-row-subtitle">
                      {closeTripSubtitle}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span
                    className="settings-badge-pill"
                    style={{
                      background: closeTripBadgeBg,
                      color: closeTripBadgeColor,
                      fontWeight: 700,
                    }}
                  >
                    {closeTripBadgeText}
                  </span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showCsvExport && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onExportCsv();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-emerald-glow">
                    <IconFileSpreadsheet size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Excel CSV Export</span>
                    <span className="settings-row-subtitle">Download settlement ledger &amp; expense breakdown</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconDownload size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group 2: App & Appearance */}
      {showPreferencesGroup && (
        <div className="settings-group">
          <h4 className="settings-group-title">Preferences &amp; Interface</h4>
          <div className="settings-group-card">
            {/* Inline 3-Way Segmented Theme Switcher */}
            {showAppearance && (
              <div className="settings-row-item" style={{ cursor: 'default' }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-orange-glow">
                    {themePref === 'dark' ? <IconMoon size={18} /> : themePref === 'light' ? <IconSun size={18} /> : <IconSmartphone size={18} />}
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
                    <IconSun size={13} />
                    <span>Light</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'dark' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('dark'); }}
                    title="Night mode"
                    aria-label="Night mode"
                  >
                    <IconMoon size={13} />
                    <span>Night</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${themePref === 'system' ? ' active' : ''}`}
                    onClick={() => { triggerHaptic('light'); setThemePref('system'); }}
                    title="System default"
                    aria-label="System default"
                  >
                    <IconSmartphone size={13} />
                    <span>Auto</span>
                  </button>
                </div>
              </div>
            )}

            {/* Tactile Haptics 3-Way Segmented Switcher */}
            {showHaptics && (
              <div className="settings-row-item" style={{ cursor: 'default' }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-purple-glow">
                    <IconVibrate size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Tactile Haptics</span>
                    <span className="settings-row-subtitle">
                      {hapticPref === 'off'
                        ? 'Vibration disabled'
                        : hapticPref === 'subtle'
                        ? 'Gentle micro-taps'
                        : 'Standard button clicks'}
                    </span>
                  </div>
                </div>
                <div className="settings-segmented-theme" role="group" aria-label="Haptic feedback preference">
                  <button
                    type="button"
                    className={`settings-seg-btn${hapticPref === 'standard' ? ' active' : ''}`}
                    onClick={() => handleSetHapticPref('standard')}
                    title="Standard vibration"
                    aria-label="Standard vibration"
                  >
                    <span>Standard</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${hapticPref === 'subtle' ? ' active' : ''}`}
                    onClick={() => handleSetHapticPref('subtle')}
                    title="Subtle micro vibration"
                    aria-label="Subtle vibration"
                  >
                    <span>Subtle</span>
                  </button>
                  <button
                    type="button"
                    className={`settings-seg-btn${hapticPref === 'off' ? ' active' : ''}`}
                    onClick={() => handleSetHapticPref('off')}
                    title="Disable tactile vibration"
                    aria-label="Disable vibration"
                  >
                    <span>Off</span>
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

            {showCoachmarks && (
              <button
                type="button"
                className="settings-row-item"
                onClick={handleResetCoachmarks}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber-glow">
                    <span>✈️</span>
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Flight Coachmarks</span>
                    <span className="settings-row-subtitle">
                      {coachmarkResetStatus ? 'Onboarding tips re-enabled!' : 'Reset interactive guide on the + button'}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ color: coachmarkResetStatus ? 'var(--color-success)' : 'var(--primary-accent)', fontWeight: 600 }}>
                    {coachmarkResetStatus || 'Reset'}
                  </span>
                </div>
              </button>
            )}

            {showInstall && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onInstallApp?.();
                  onClose?.();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-teal-glow">
                    <IconSmartphone size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Install App</span>
                    <span className="settings-row-subtitle">Add Trip Tracker to your device home screen</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconDownload size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group 3: Data & Storage */}
      {showDataGroup && (
        <div className="settings-group">
          <h4 className="settings-group-title">Data &amp; Backups</h4>
          <div className="settings-group-card">
            {/* Dedicated WhatsApp Storage & Data row */}
            {showStorageManager && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  setSubScreen('storage-data');
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber-glow">
                    <IconPieChart size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Storage and Data</span>
                    <span className="settings-row-subtitle">
                      Receipts media, ledgers &amp; cache visualizer
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill" style={{ fontWeight: 600 }}>
                    {storageEstimate ? formatBytes(storageEstimate.used) : 'Local'}
                  </span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showArchived && (
              <button type="button" className="settings-row-item" onClick={() => { triggerHaptic('light'); setSubScreen('archived-trips'); }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-slate-glow">
                    <IconArchive size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Archived Trips</span>
                    <span className="settings-row-subtitle">
                      {archivedTrips.length === 0 ? 'No archived trips' : `${archivedTrips.length} archived trip${archivedTrips.length === 1 ? '' : 's'}`}
                    </span>
                  </div>
                </div>
                <div className="settings-row-right">
                  {archivedTrips.length > 0 && <span className="settings-badge-pill">{archivedTrips.length}</span>}
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showBackups && (
              <button type="button" className="settings-row-item" onClick={() => { triggerHaptic('light'); setSubScreen('backups'); }}>
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-indigo-glow">
                    <IconDatabase size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Database Backups</span>
                    <span className="settings-row-subtitle">Export/Import JSON database snapshot</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <span className="settings-badge-pill">JSON</span>
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showDemoTrip && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
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
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-emerald-glow">
                    <IconSparkles size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Seed Demo Trip</span>
                    <span className="settings-row-subtitle">Sample trip with members, geotags &amp; splits</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* Group 4: Help, Account & Support */}
      {showHelpGroup && (
        <div className="settings-group">
          <h4 className="settings-group-title">Help &amp; Account</h4>
          <div className="settings-group-card">
            {showReportProblem && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => { triggerHaptic('light'); setSubScreen('report-issue'); }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-rose-glow">
                    <span style={{ fontSize: '16px' }}>🐞</span>
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Report a Problem</span>
                    <span className="settings-row-subtitle">Tell us what went wrong — device details attach automatically</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showSuggestFeature && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => { triggerHaptic('light'); setSubScreen('suggest-feature'); }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-teal-glow">
                    <span style={{ fontSize: '16px' }}>✨</span>
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Suggest a Feature</span>
                    <span className="settings-row-subtitle">Tell us what would make this app better</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showBugTracker && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => { triggerHaptic('light'); setSubScreen('bug-tracker'); }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-amber-glow">
                    <span style={{ fontSize: '16px' }}>🛡️</span>
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title">Superadmin Bug Tracker</span>
                    <span className="settings-row-subtitle">Manage, triage &amp; live-sync bugs</span>
                  </div>
                </div>
                <div className="settings-row-right">
                  <IconChevronRight size={16} />
                </div>
              </button>
            )}

            {showSignOut && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
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
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-red-glow">
                    <IconLogOut size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title" style={{ color: 'var(--color-danger)' }}>
                      Sign Out
                    </span>
                    <span className="settings-row-subtitle">Disconnect active session from Supabase</span>
                  </div>
                </div>
              </button>
            )}

            {showClearData && (
              <button
                type="button"
                className="settings-row-item"
                onClick={() => {
                  triggerHaptic('light');
                  onClearDatabase();
                }}
              >
                <div className="settings-row-left">
                  <div className="settings-squircle squircle-red-glow">
                    <IconAlertCircle size={18} />
                  </div>
                  <div className="settings-row-texts">
                    <span className="settings-row-title" style={{ color: 'var(--color-danger)' }}>
                      Clear All Data
                    </span>
                    <span className="settings-row-subtitle">Wipe all local trips and reset storage</span>
                  </div>
                </div>
              </button>
            )}
          </div>
        </div>
      )}

      {/* About Section */}
      {showAbout && (
        <div>
          <h4 className="settings-group-title">About</h4>
          <div className="settings-group-card">
            <div className="settings-row-item" style={{ cursor: 'default' }}>
              <div className="settings-row-left">
                <div className="settings-squircle squircle-slate-glow">
                  <IconSmartphone size={18} />
                </div>
                <div className="settings-row-texts">
                  <span className="settings-row-title">Trip Tracker 2026</span>
                  <span className="settings-row-subtitle">Version {appVersion ?? '1.104.1'} · Web Edition</span>
                </div>
              </div>
              <div className="settings-row-right">
                <span className="settings-badge-pill" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#10B981', fontWeight: 700 }}>
                  STABLE
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Pro Tips & Shortcuts (Desktop / Power Travelers) */}
      {!searchQuery && (
        <div className="settings-shortcuts-card">
          <div className="settings-shortcuts-header">
            <span>⌨️ Pro Tips &amp; Shortcuts</span>
            <span style={{ fontSize: '10px', fontFamily: 'var(--font-family-mono)', color: 'var(--text-muted)' }}>QUICK REF</span>
          </div>
          <div className="settings-shortcut-row">
            <span>Close settings drawer</span>
            <kbd className="settings-kbd">Esc</kbd>
          </div>
          <div className="settings-shortcut-row">
            <span>Swipe back to menu</span>
            <kbd className="settings-kbd">Swipe Right</kbd>
          </div>
          <div className="settings-shortcut-row">
            <span>Add new expense</span>
            <kbd className="settings-kbd">+</kbd>
          </div>
        </div>
      )}

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

      {/* Superadmin Auth Modal */}
      <SuperadminAuthModal
        isOpen={isSuperadminModalOpen}
        onClose={() => setIsSuperadminModalOpen(false)}
        onSuccess={() => setIsSuperadminModalOpen(false)}
      />

      {/* WhatsApp-Style Profile & Trip QR Code Modal */}
      {isQrModalOpen && (
        <div
          className="settings-qr-modal-overlay"
          onClick={() => setIsQrModalOpen(false)}
        >
          <div
            className="settings-qr-card"
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
            aria-label="Trip and Profile QR Code"
          >
            <div className="settings-qr-avatar-container">
              {userAvatarUrl ? (
                <img
                  src={userAvatarUrl}
                  alt=""
                  className="settings-avatar-img"
                  style={{ width: '56px', height: '56px', borderWidth: '3px' }}
                />
              ) : (
                <div className="settings-avatar-circle" style={{ width: '56px', height: '56px', fontSize: '22px' }}>
                  {initialLetter}
                </div>
              )}
              <span className="settings-qr-badge-icon">✈️</span>
            </div>

            <div className="settings-qr-card-header">
              <strong style={{ fontSize: '16px', color: 'var(--text-primary)' }}>{displayName}</strong>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                “{statusTagline}”
              </span>
              {activeTrip && (
                <div className="settings-qr-trip-title">
                  🌴 {activeTrip.name}
                </div>
              )}
            </div>

            <div className="settings-qr-frame-box">
              <img
                src={getQrCodeUrl(tripInviteLink, 240)}
                alt="Trip Invite QR Code"
                className="settings-qr-img"
                width={210}
                height={210}
              />
            </div>

            <p className="settings-qr-hint">
              {activeTrip
                ? `Scan with any phone camera to instantly join "${activeTrip.name}"`
                : 'Scan with any phone camera to open Trip Tracker'}
            </p>

            <div className="settings-qr-btn-group">
              <button
                type="button"
                className="secondary-btn"
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                onClick={handleCopyInviteLink}
              >
                {copiedInvite ? (
                  <>
                    <IconCheck size={14} style={{ color: 'var(--color-success)' }} />
                    <span style={{ color: 'var(--color-success)', fontWeight: 600 }}>Copied!</span>
                  </>
                ) : (
                  <>
                    <IconCopy size={14} />
                    <span>Copy Link</span>
                  </>
                )}
              </button>

              <button
                type="button"
                className="primary-btn"
                style={{ flex: 1, padding: '8px 12px', fontSize: '12px', justifyContent: 'center' }}
                onClick={handleShareInviteLink}
              >
                <IconShare size={14} />
                <span>Share Link</span>
              </button>
            </div>

            <button
              type="button"
              className="settings-subscreen-back-link"
              style={{ marginTop: '10px', fontSize: '12px', padding: '4px 18px' }}
              onClick={() => setIsQrModalOpen(false)}
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
