import React, { useEffect, useRef, useState, useMemo, useCallback, lazy, Suspense } from 'react';
import { flushSync } from 'react-dom';
import { useTripStore, getTripNotificationRecipients } from './store/tripStore';
import { useAuthStore } from './store/authStore';
import { calculateSettlements } from './utils/settlement';
import type { Expense, Trip, Group, Member, TripStop } from './types';
import { exportTripToCSV } from './utils/csvExport';
import { fetchPlaceCoverImage } from './services/placeImageService';

import { getCurrencySymbol } from './utils/currency';
import { syncStatusBarTone, resolveTheme } from './utils/nativeShell';
import { isMissingSupabaseEnv } from './services/supabaseClient';
import { sendPushNotification } from './services/pushApi';
import { fetchAppFlag } from './services/tripApi';
import { GlobalSettingsModal } from './components/GlobalSettingsModal';
import { ConfirmDialog, type ConfirmRequest } from './components/ConfirmDialog';
import { TripsListScreen } from './components/TripsListScreen';
// maplibre-gl is a sizeable dependency (JS + worker + WASM) only needed on
// the trip dashboard -- code-split so it doesn't load for the trips list
// or any other screen.
const TripMapHero = lazy(() =>
  import('./components/TripMapHero').then((m) => ({ default: m.TripMapHero }))
);
import { TripContentSheet } from './components/TripContentSheet';
import { AnalyticsTab } from './components/AnalyticsTab';
import { ExpenseForm } from './components/ExpenseForm';
import { ExpenseList } from './components/ExpenseList';
import { BalancesSettlements } from './components/BalancesSettlements';
import { ExpenseFilterDrawer } from './components/ExpenseFilterDrawer';
import { MembersGroupsTab } from './components/MembersGroupsTab';
import { SettingsTab } from './components/SettingsTab';
import { ExpenseReviewModal } from './components/ExpenseReviewModal';
import { UndoToasts } from './components/UndoToasts';
import { NavTabs } from './components/NavTabs';
import { ShareTripModal } from './components/ShareTripModal';
// Superadmin-only screens (Ops Deck + Bug Ledger) never load for a normal
// traveler -- code-split so their combined ~2.4k lines don't inflate the
// bundle everyone else downloads. RLS still gates the actual data/actions
// underneath regardless of when the JS arrives.
const SuperAdminBugTracker = lazy(() =>
  import('./components/SuperAdminBugTracker').then((m) => ({ default: m.SuperAdminBugTracker }))
);
import { NotificationsPanel } from './components/NotificationsPanel';
import { NotificationsBellButton } from './components/NotificationsBellButton';
import { InAppNotificationBanner } from './components/InAppNotificationBanner';
import { FitHeading } from './components/FitHeading';
import { triggerHaptic } from './utils/haptics';
import { useEscapeKey } from './utils/useEscapeKey';
import { IconCalendar, IconChevronLeft, IconChevronDown, IconChevronUp, IconShield, IconSearch } from './components/Icons';
import { formatDateRange } from './utils/dateRange';
import { useScrollLock } from './utils/useScrollLock';
import { useHistoryBack } from './utils/useHistoryBack';
import { getCatColor } from './utils/categoryColor';
import { useTabSwipe } from './utils/useTabSwipe';
import { CommandPalette } from './components/CommandPalette';
import { TripWrappedModal } from './components/TripWrappedModal';
import { AchievementBadgeModal } from './components/AchievementBadgeModal';
import { usePeerPresence } from './hooks/usePeerPresence';
import type { AdminTab } from './components/admin/AdminPortalLayout';
const AdminPortalLayout = lazy(() =>
  import('./components/admin/AdminPortalLayout').then((m) => ({ default: m.AdminPortalLayout }))
);

const IS_MAC = typeof navigator !== 'undefined' && /Mac|iPhone|iPad/.test(navigator.platform);

function AdminLoadingFallback() {
  return (
    <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
      <div className="ledger-loader" role="status" aria-label="Loading">
        <span className="ledger-loader-mark">TT</span>
      </div>
    </div>
  );
}

export default function App() {
  const {
    trips,
    activeTripId,
    members,
    groups,
    expenses,
    categories,
    initialized,
    storageError,
    initialize,
    clearStorageError,
    createTrip,
    updateTrip,
    selectTrip,
    archiveTrip,
    deleteTrip,
    addMember,
    toggleArchiveMember,
    updateMember,
    deleteMember,
    setMemberAdminRole,
    createGroup,
    updateGroup,
    deleteGroup,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    exportDatabase,
    importDatabase,
    clearDatabase,
    loadDemoTrip,
  } = useTripStore();

  const userEmail = useAuthStore((s) => s.session?.user.email ?? null);
  const userId = useAuthStore((s) => s.session?.user.id ?? null);
  const userAvatarUrl = useAuthStore((s) => s.session?.user.user_metadata?.avatar_url as string | undefined);
  const userDisplayName = useTripStore((s) => s.userDisplayName);
  const signOut = useAuthStore((s) => s.signOut);
  const signInSuperadmin = useAuthStore((s) => s.signInSuperadmin);

  // Navigation tabs: 'expenses' (Summary) | 'ledger' (day-wise Expenses) | 'members' | 'settings'
  // Analytics no longer has its own tab -- it moved into Settings.
  type Tab = 'expenses' | 'ledger' | 'members' | 'settings';
  const TAB_ORDER = ['expenses', 'ledger', 'members', 'settings'] as const;
  const [activeTab, setActiveTabRaw] = useState<Tab>('expenses');
  const mainContentRef = useRef<HTMLElement>(null);

  // Native crossfade between tabs where supported -- browser-compositor
  // only, no animation library. flushSync forces the DOM update to happen
  // synchronously inside the transition callback, which is what the API
  // needs to capture old/new snapshots correctly with React's batching.
  const setActiveTab = useCallback((tab: Tab) => {
    if (typeof document.startViewTransition !== 'function') {
      setActiveTabRaw(tab);
      return;
    }
    document.startViewTransition(() => {
      flushSync(() => setActiveTabRaw(tab));
    });
  }, []);

  // Right-hand-friendly horizontal swipe between the bottom-nav tabs,
  // WhatsApp-style. Skips gestures that start on a row/map that already
  // owns horizontal drag (see data-no-tab-swipe in SwipeableRow/TripMapHero/
  // TripJourneyMap).
  // Swipe-completed changes use the raw setter, not setActiveTab's
  // view-transition crossfade -- the drag itself already animates the
  // handoff (the pane visually slides into place), so layering a
  // second, independent crossfade on top would fight it.
  const tabSwipe = useTabSwipe(mainContentRef, TAB_ORDER, activeTab, setActiveTabRaw);

  // Bumped to tell MembersGroupsTab to open its add-member popup -- the
  // nav bar's FAB triggers this instead of add-expense while on the
  // Members tab (see NavTabs' onAddMember).
  const [addMemberSignal, setAddMemberSignal] = useState(0);

  // Appearance — 'system' follows the OS; 'light'/'dark' pin the "night
  // flight" variant explicitly. Persisted locally; it's a display
  // preference, not trip data, so it stays out of the IndexedDB store.
  type ThemePref = 'light' | 'dark' | 'system';
  const [themePref, setThemePref] = useState<ThemePref>(() => {
    const stored = localStorage.getItem('theme-pref');
    return stored === 'light' || stored === 'dark' ? stored : 'system';
  });

  useEffect(() => {
    const root = document.documentElement;
    if (themePref === 'system') {
      delete root.dataset.theme;
      root.style.colorScheme = 'light dark';
    } else {
      root.dataset.theme = themePref;
      root.style.colorScheme = themePref;
    }
    localStorage.setItem('theme-pref', themePref);
  }, [themePref]);

  // App-wide micro-haptic tap feedback: fires a light pulse on any real
  // button/toggle press, everywhere in the app. Interactions that need a
  // stronger/curated pattern (success, warning, delete...) call
  // triggerHaptic explicitly in their own handler — that call runs after
  // this one in the same tick and simply overwrites the light pulse
  // (navigator.vibrate replaces any in-flight pattern), so nothing here
  // fights those.
  useEffect(() => {
    const HAPTIC_COOLDOWN_MS = 80;
    let lastFired = 0;
    const handleTapFeedback = (e: PointerEvent) => {
      if (e.pointerType === 'mouse') return;
      const target = e.target;
      if (!(target instanceof Element)) return;
      const interactive = target.closest(
        'button:not(:disabled), [role="button"]:not([aria-disabled="true"]), input[type="checkbox"], input[type="radio"]'
      );
      if (!interactive) return;
      const now = Date.now();
      if (now - lastFired < HAPTIC_COOLDOWN_MS) return;
      lastFired = now;
      triggerHaptic('light');
    };
    document.body.addEventListener('pointerdown', handleTapFeedback, { capture: true, passive: true });
    return () => document.body.removeEventListener('pointerdown', handleTapFeedback, true);
  }, []);

  // Form states - Trips
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [editingTripId, setEditingTripId] = useState<string | null>(null);
  const [newTripName, setNewTripName] = useState('');
  const [newTripDestination, setNewTripDestination] = useState('');
  const [newTripStops, setNewTripStops] = useState<TripStop[]>([]);
  const [newTripStart, setNewTripStart] = useState('');
  const [newTripEnd, setNewTripEnd] = useState('');
  const [newTripCurrency, setNewTripCurrency] = useState('INR');

  // Superadmin Bug Tracker full-screen view
  const [showBugTracker, setShowBugTracker] = useState(false);

  useEffect(() => {
    const handleHash = () => {
      if (window.location.hash === '#/bugs' || window.location.hash === '#/bug-tracker') {
        setShowBugTracker(true);
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, []);

  // Local dev convenience only, and only against the dummy/offline Supabase
  // project (never a real one, never a production build): auto-sign-in as
  // superadmin so `npm run dev` lands straight on the Bug Ledger without
  // typing credentials. Against a real project the dev still logs in
  // manually through the normal Super User Login form — there's no
  // hardcoded account left to bootstrap from.
  useEffect(() => {
    if (!import.meta.env.DEV || !isMissingSupabaseEnv) return;
    if (!useTripStore.getState().isSuperadmin) {
      signInSuperadmin('dev@local', 'dev').catch(() => {});
    }
    setShowBugTracker(true);
    if (window.location.hash !== '#/bugs') {
      window.location.hash = '#/bugs';
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setDeferredPrompt(null);
    }
  };



  // Form states - Groups
  // Form states
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [selectedReviewExpense, setSelectedReviewExpense] = useState<Expense | null>(null);
  // Queue of expense ids still to review after "Review N affected expenses"
  // (a member was removed) — save/cancel on the open form advances to the
  // next id instead of just closing, so the whole batch can be worked
  // through in one pass instead of hunting each one down individually.
  const [reviewQueue, setReviewQueue] = useState<string[]>([]);

  // Expense list search & filters
  const [expenseSearch, setExpenseSearch] = useState('');
  const [expenseFilterCategory, setExpenseFilterCategory] = useState('');
  const [expenseFilterMember, setExpenseFilterMember] = useState('');
  const [expenseFilterDateFrom, setExpenseFilterDateFrom] = useState('');
  const [expenseFilterDateTo, setExpenseFilterDateTo] = useState('');
  const [expenseFilterAmountMin, setExpenseFilterAmountMin] = useState('');
  const [expenseFilterAmountMax, setExpenseFilterAmountMax] = useState('');
  const [expenseFilterRelation, setExpenseFilterRelation] = useState<'' | 'paidByMe' | 'involvesMe'>('');
  const [expenseFilterLocation, setExpenseFilterLocation] = useState('');
  // Rendered at the top level (see ExpenseFilterDrawer near the other
  // full-screen overlays below) rather than inside ExpenseList/TripContentSheet
  // -- .trip-sheet has overflow:hidden, which clips position:fixed
  // descendants in-tree, so a full-screen modal nested that deep was
  // silently cropped to the sheet's own bounds (header/close button gone,
  // trip hero bleeding through above it). Lifting the state here also means
  // cross-linking into the ledger can force it closed instead of it
  // surviving (tab panes stay mounted, just display:none) into a stale
  // "drawer still open" state on the tab you just navigated to.
  const [showExpenseFilterDrawer, setShowExpenseFilterDrawer] = useState(false);



  // Undo delete toast state
  const [pendingDeleteExpense, setPendingDeleteExpense] = useState<Expense | null>(null);
  const [undoTimer, setUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteTrip, setPendingDeleteTrip] = useState<Trip | null>(null);
  const [tripUndoTimer, setTripUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);
  const [pendingDeleteGroup, setPendingDeleteGroup] = useState<Group | null>(null);
  const [groupUndoTimer, setGroupUndoTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // JSON Import state
  const [importJson, setImportJson] = useState('');
  const [showImportArea, setShowImportArea] = useState(false);
  const [importStatus, setImportStatus] = useState<'idle' | 'pending' | 'success' | 'error'>('idle');
  const [importErrorMessage, setImportErrorMessage] = useState<string | null>(null);

  // Confirm dialog (replaces window.confirm)
  const [confirmRequest, setConfirmRequest] = useState<ConfirmRequest | null>(null);

  // Share trip modal
  const [showShareTrip, setShowShareTrip] = useState(false);
  const [showMembersRequiredNotice, setShowMembersRequiredNotice] = useState(false);
  const [showGlobalSettings, setShowGlobalSettings] = useState(false);
  const [bypassEnvWarning, setBypassEnvWarning] = useState(false);
  const isSuperadmin = useTripStore((s) => s.isSuperadmin);
  const [isTravelerPreview, setIsTravelerPreview] = useState(false);
  const [adminActiveTab, setAdminActiveTab] = useState<AdminTab>('command');

  // Command Palette & Trip Wrapped States
  const [showCommandPalette, setShowCommandPalette] = useState(false);
  const [showTripWrapped, setShowTripWrapped] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const activePeers = usePeerPresence(activeTripId);

  // Global Cmd+K / Ctrl+K keyboard shortcut for Command Palette
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setShowCommandPalette((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Superadmin-set kill-switch (Ops Deck > Flags > Fleet Controls). Checked
  // once per load, not polled -- a superadmin flipping it mid-session
  // affects other users' next load, not their currently-open tab.
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  useEffect(() => {
    if (isSuperadmin) return;
    fetchAppFlag('maintenance_mode')
      .then((v) => setMaintenanceMode(v === true))
      .catch(() => {});
    fetchAppFlag('maintenance_window')
      .then((v) => {
        const w = v as { start?: string; end?: string } | null;
        if (!w?.start || !w?.end) return;
        const now = Date.now();
        if (now >= new Date(w.start).getTime() && now <= new Date(w.end).getTime()) {
          setMaintenanceMode(true);
        }
      })
      .catch(() => {});
  }, [isSuperadmin]);

  // Lock background scroll when any modal is active
  useScrollLock(Boolean(showShareTrip || selectedReviewExpense || confirmRequest || showGlobalSettings || showAddExpense || showExpenseFilterDrawer));

  const syncQueue = useTripStore((s) => s.syncQueue);
  const sessionExpired = useTripStore((s) => s.sessionExpired);
  const lastBackendSyncedAt = useTripStore((s) => s.lastBackendSyncedAt);
  const processQueue = useTripStore((s) => s.processQueue);
  const refreshActiveTripExpenses = useTripStore((s) => s.refreshActiveTripExpenses);
  const [isManualRefreshing, setIsManualRefreshing] = useState(false);
  const handleManualRefresh = async () => {
    if (isManualRefreshing) return;
    triggerHaptic('light');
    setIsManualRefreshing(true);
    try {
      await refreshActiveTripExpenses();
    } finally {
      setIsManualRefreshing(false);
    }
  };

  // Load state on mount
  useEffect(() => {
    initialize();
  }, [initialize]);

  // Track browser connectivity for the backend sync status pill
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const visibleTrips = useMemo(
    () => trips.filter((t) => t.id !== pendingDeleteTrip?.id && !t.archived),
    [trips, pendingDeleteTrip]
  );
  const archivedTrips = useMemo(() => trips.filter((t) => t.archived), [trips]);
  const activeTrip = useMemo(() => trips.find((t) => t.id === activeTripId), [trips, activeTripId]);
  const editingExpense = useMemo(() => expenses.find((e) => e.id === editingExpenseId) || null, [expenses, editingExpenseId]);

  // Auto-resolve tourism cover photo for active trip if not already resolved
  useEffect(() => {
    if (!activeTrip || activeTrip.coverImageUrl) return;
    const candidates = [
      ...(activeTrip.stops?.map((s) => s.name) || []),
      activeTrip.destination || '',
      activeTrip.name || '',
    ].filter(Boolean);

    if (candidates.length === 0) return;

    fetchPlaceCoverImage(candidates)
      .then((url) => {
        if (url) {
          useTripStore.setState((state) => ({
            trips: state.trips.map((t) => (t.id === activeTrip.id ? { ...t, coverImageUrl: url } : t)),
          }));
        }
      })
      .catch(() => {});
  }, [activeTrip?.id, activeTrip?.coverImageUrl, activeTrip?.destination, activeTrip?.stops]);

  // Reset expense filters when switching trips
  useEffect(() => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
  }, [activeTripId]);

  // Track scroll on active tab-pane with directional hysteresis for smooth fluid header morphing
  const [isHeaderScrolled, setIsHeaderScrolled] = useState(false);
  // Sampled from the live map pixels behind the header (see TripMapHero) so
  // header text/chrome stays legible regardless of what's under it.
  const [headerTone, setHeaderTone] = useState<'light' | 'dark'>('light');
  // Whether the content sheet is in its expanded (80%) snap state -- lets
  // the map zoom out slightly to visually "resize" as more of it is
  // exposed, instead of sitting static underneath the drag.
  const [sheetExpanded, setSheetExpanded] = useState(false);
  const [sheetFull, setSheetFull] = useState(false);
  // Status bar icons need to flip with whatever's actually behind them:
  // the map's sampled tone while the header's showing, the app surface's
  // own theme once the sheet goes full-screen over everything.
  useEffect(() => {
    const backgroundIsBright = sheetFull ? resolveTheme() === 'light' : headerTone === 'dark';
    syncStatusBarTone(backgroundIsBright);
  }, [sheetFull, headerTone]);
  // Route-stops chip row starts collapsed -- it's the least essential
  // header row (the map already shows the route), so keeping it closed by
  // default gives the eyebrow date row more breathing room instead of
  // competing with it for the header's fixed height budget.
  const [stopsExpanded, setStopsExpanded] = useState(false);
  const headerRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let lastScrollTop = 0;
    let ticking = false;

    const handleScroll = (e: Event) => {
      const target = e.target;
      if (!(target instanceof HTMLElement) || !target.classList.contains('tab-pane')) {
        return;
      }

      if (!ticking) {
        window.requestAnimationFrame(() => {
          const currentScrollTop = target.scrollTop;

          if (currentScrollTop <= 15 && isHeaderScrolled) {
            // Reached the top of the scroll container: always expand
            setIsHeaderScrolled(false);
          } else if (currentScrollTop > 45 && !isHeaderScrolled) {
            // Scrolled down past threshold: smoothly collapse into compact glass mode
            setIsHeaderScrolled(true);
          } else if (currentScrollTop < lastScrollTop - 25 && isHeaderScrolled && currentScrollTop < 120) {
            // Scrolling up near top of page: expand early for a natural fluid feel
            setIsHeaderScrolled(false);
          }

          lastScrollTop = Math.max(0, currentScrollTop);
          ticking = false;
        });
        ticking = true;
      }
    };

    document.addEventListener('scroll', handleScroll, { capture: true, passive: true });
    return () => document.removeEventListener('scroll', handleScroll, true);
  }, [isHeaderScrolled]);

  useEffect(() => {
    setIsHeaderScrolled(false);
  }, [activeTripId, activeTab]);

  // .tab-pane's padding-top used to be a fixed guess at the floating
  // header's height. The header is no longer a fixed height -- the
  // eyebrow's destination text, the "Upcoming"/"Completed" badge, and the
  // route-stops chip row (added with the multi-stop planner) all vary its
  // real height, so a hardcoded constant either overlapped the header or
  // (as reported) left a large dead gap above the content. Measure it and
  // expose the real number instead of guessing.
  useEffect(() => {
    const header = headerRef.current;
    if (!header) {
      document.documentElement.style.removeProperty('--trip-header-height');
      return;
    }

    // Skip the write when the height hasn't actually changed -- the padding
    // this var drives (index.css) shifts scroll position when it moves,
    // which the scroll listener above can read as a scroll event, which can
    // toggle isHeaderScrolled and resize the header again. Only writing on
    // a real change breaks that feedback cycle instead of letting it thrash.
    let lastHeight = -1;
    const updateHeight = () => {
      const next = header.offsetHeight;
      if (next === lastHeight) return;
      lastHeight = next;
      document.documentElement.style.setProperty('--trip-header-height', `${next}px`);
    };

    updateHeight();
    const observer = new ResizeObserver(updateHeight);
    observer.observe(header);
    return () => observer.disconnect();
  }, [activeTripId, activeTab, isHeaderScrolled]);

  const activeTripExpenses = useMemo(() => {
    return expenses
      .filter((e) => e.tripId === activeTripId)
      .sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt);
  }, [expenses, activeTripId]);

  // Device <-> backend sync status for the header pill.
  //
  // syncQueue.length is the only live signal here: it's pushed to on every
  // offline/failed write and drained by processQueue(). lastBackendSyncedAt
  // is NOT a reliable second signal -- it's only ever refreshed inside
  // processQueue() when the queue empties, which normal online mutations
  // never touch (they write directly to Supabase, bypassing the queue
  // entirely on success). lastModifiedAt, meanwhile, gets bumped by things
  // as routine as logging in. So once lastBackendSyncedAt was set even
  // once, any later lastModifiedAt bump would permanently trip a false
  // "out of sync" even with an empty queue -- which is exactly the "Out of
  // sync (0)" bug this used to show on every trip.
  type SyncStatus = 'offline' | 'session-expired' | 'out-of-sync' | 'synced';
  const syncStatus: SyncStatus = useMemo(() => {
    if (sessionExpired) return 'session-expired';
    if (syncQueue.length > 0) return 'out-of-sync';
    if (!isOnline) return 'offline';
    return 'synced';
  }, [isOnline, sessionExpired, syncQueue.length]);

  const syncStatusLabel = useMemo(() => {
    if (syncStatus === 'session-expired') return 'Session expired';
    if (syncStatus === 'out-of-sync') return `Out of sync (${syncQueue.length})`;
    if (syncStatus === 'offline') return 'Offline';
    if (!lastBackendSyncedAt) return 'Synced';
    const diffMins = Math.floor((Date.now() - lastBackendSyncedAt) / 60000);
    if (diffMins < 1) return 'Synced just now';
    if (diffMins < 60) return `Synced ${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `Synced ${diffHours}h ago`;
    return 'Synced yesterday';
  }, [syncStatus, syncQueue.length, lastBackendSyncedAt]);

  // Auto-sync pending offline queue whenever network connectivity is restored
  useEffect(() => {
    if (isOnline && syncQueue.length > 0) {
      processQueue();
    }
  }, [isOnline, syncQueue.length, processQueue]);

  const handleSyncClick = () => {
    if (syncStatus === 'session-expired') {
      signOut();
      return;
    }
    if (!isOnline) return;
    processQueue();
    void handleManualRefresh();
  };


  // Search + category/member filters, applied only to the visible expense list
  // Get active trip members and groups
  const activeTripMembers = useMemo(() => {
    return activeTrip
      ? activeTrip.memberIds.map((id) => members[id]).filter(Boolean)
      : [];
  }, [activeTrip, members]);

  const visibleMembers = useMemo(() => activeTripMembers.filter((m) => !m.archived), [activeTripMembers]);
  const archivedMembers = useMemo(() => activeTripMembers.filter((m) => m.archived), [activeTripMembers]);

  const activeTripGroups = useMemo(() => {
    return activeTrip
      ? (activeTrip.groupIds || []).map((id) => groups[id]).filter(Boolean)
      : [];
  }, [activeTrip, groups]);

  const visibleTripGroups = useMemo(() => {
    return activeTripGroups.filter((g) => g.id !== pendingDeleteGroup?.id);
  }, [activeTripGroups, pendingDeleteGroup]);

  // Permission model: admin = trip creator or any member with admin role.
  // Participant = the member they've claimed via /join (own-expenses only,
  // can only settle transfers they're the payer or payee of).
  const isAdmin = useMemo(() => {
    if (!activeTrip) return false;
    if (userId && activeTrip.ownerId === userId) return true;
    if (userId) {
      const myMember = activeTripMembers.find((m) => m.linkedUserId === userId);
      if (myMember && activeTrip.adminMemberIds && activeTrip.adminMemberIds.includes(myMember.id)) {
        return true;
      }
    }
    // In guest/offline mode or when no admin list is defined yet
    if (!userId && (!activeTrip.adminMemberIds || activeTrip.adminMemberIds.length === 0)) {
      return true;
    }
    return false;
  }, [activeTrip, userId, activeTripMembers]);
  const myMemberId = useMemo(() => activeTripMembers.find((m) => m.linkedUserId === userId)?.id ?? null, [activeTripMembers, userId]);

  const filteredExpenses = useMemo(() => {
    const min = expenseFilterAmountMin.trim() ? Number(expenseFilterAmountMin) : null;
    const max = expenseFilterAmountMax.trim() ? Number(expenseFilterAmountMax) : null;
    return activeTripExpenses.filter((e) => {
      if (expenseSearch.trim() && !e.title.toLowerCase().includes(expenseSearch.trim().toLowerCase())) return false;
      if (expenseFilterCategory && e.category !== expenseFilterCategory) return false;
      if (expenseFilterMember && e.paidBy !== expenseFilterMember && !e.splitMemberIds.includes(expenseFilterMember)) return false;
      if (expenseFilterDateFrom && e.date < expenseFilterDateFrom) return false;
      if (expenseFilterDateTo && e.date > expenseFilterDateTo) return false;
      if (min !== null && !Number.isNaN(min) && e.amount < min) return false;
      if (max !== null && !Number.isNaN(max) && e.amount > max) return false;
      if (myMemberId) {
        if (expenseFilterRelation === 'paidByMe' && e.paidBy !== myMemberId) return false;
        if (expenseFilterRelation === 'involvesMe' && e.paidBy !== myMemberId && !e.splitMemberIds.includes(myMemberId)) return false;
      }
      if (expenseFilterLocation && e.location?.placeName !== expenseFilterLocation) return false;
      return true;
    });
  }, [
    activeTripExpenses,
    expenseSearch,
    expenseFilterCategory,
    expenseFilterMember,
    expenseFilterDateFrom,
    expenseFilterDateTo,
    expenseFilterAmountMin,
    expenseFilterAmountMax,
    expenseFilterRelation,
    expenseFilterLocation,
    myMemberId,
  ]);

  const hasActiveExpenseFilters = useMemo(() => {
    return !!(
      expenseSearch ||
      expenseFilterCategory ||
      expenseFilterMember ||
      expenseFilterDateFrom ||
      expenseFilterDateTo ||
      expenseFilterAmountMin ||
      expenseFilterAmountMax ||
      expenseFilterRelation ||
      expenseFilterLocation
    );
  }, [
    expenseSearch,
    expenseFilterCategory,
    expenseFilterMember,
    expenseFilterDateFrom,
    expenseFilterDateTo,
    expenseFilterAmountMin,
    expenseFilterAmountMax,
    expenseFilterRelation,
    expenseFilterLocation,
  ]);

  const clearExpenseFilters = () => {
    setExpenseSearch('');
    setExpenseFilterCategory('');
    setExpenseFilterMember('');
    setExpenseFilterDateFrom('');
    setExpenseFilterDateTo('');
    setExpenseFilterAmountMin('');
    setExpenseFilterAmountMax('');
    setExpenseFilterRelation('');
    setExpenseFilterLocation('');
  };

  const expenseLocations = useMemo(() => {
    return [...new Set(
      activeTripExpenses.map((e) => e.location?.placeName).filter((p): p is string => !!p)
    )];
  }, [activeTripExpenses]);

  // Settlements and Net balances calculation
  const { balances, transfers } = useMemo(() => {
    return activeTrip
      ? calculateSettlements(activeTrip, members, expenses, visibleTripGroups)
      : { balances: [], transfers: [] };
  }, [activeTrip, members, expenses, visibleTripGroups]);

  // Filters out settlements to keep expense analytics clean
  const nonSettlementExpenses = useMemo(() => {
    return activeTripExpenses.filter((e) => !e.title.startsWith('Settlement:'));
  }, [activeTripExpenses]);

  const totalSpent = useMemo(() => {
    return nonSettlementExpenses.reduce((sum, e) => sum + e.amount, 0);
  }, [nonSettlementExpenses]);

  // Category breakdown calculations
  const categoryTotals = useMemo(() => {
    const totals: Record<string, number> = {};
    categories.forEach((cat) => {
      totals[cat.id] = 0;
    });
    nonSettlementExpenses.forEach((exp) => {
      totals[exp.category] = (totals[exp.category] || 0) + exp.amount;
    });
    return totals;
  }, [categories, nonSettlementExpenses]);

  const categoryData = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([catId, amount]) => {
        const cat = categories.find((c) => c.id === catId);
        return {
          id: catId,
          name: cat ? cat.name : 'Other',
          icon: cat?.icon || '🏷️',
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
        };
      })
      .filter((d) => d.amount > 0)
      .sort((a, b) => b.amount - a.amount);
  }, [categoryTotals, categories, totalSpent]);

  // Member spend calculations
  const memberSpentMap = useMemo(() => {
    const spentMap: Record<string, number> = {};
    visibleMembers.forEach((m) => {
      spentMap[m.id] = 0;
    });
    nonSettlementExpenses.forEach((exp) => {
      if (spentMap[exp.paidBy] !== undefined) {
        spentMap[exp.paidBy] += exp.amount;
      }
    });
    return spentMap;
  }, [visibleMembers, nonSettlementExpenses]);

  const memberSpentList = useMemo(() => {
    return visibleMembers.map((m) => ({
      id: m.id,
      name: m.name,
      amount: memberSpentMap[m.id] || 0,
      percentage: totalSpent > 0 ? ((memberSpentMap[m.id] || 0) / totalSpent) * 100 : 0,
    })).sort((a, b) => b.amount - a.amount);
  }, [visibleMembers, memberSpentMap, totalSpent]);

  const biggestSpender = useMemo(() => {
    return memberSpentList[0] && memberSpentList[0].amount > 0 ? memberSpentList[0].name : 'N/A';
  }, [memberSpentList]);

  const averageCost = useMemo(() => {
    return visibleMembers.length > 0 ? totalSpent / visibleMembers.length : 0;
  }, [visibleMembers.length, totalSpent]);

  // Daily spend timeline calculations
  const dailySpendData = useMemo(() => {
    const dailyTotals: Record<string, number> = {};
    nonSettlementExpenses.forEach((exp) => {
      const dateStr = exp.date;
      dailyTotals[dateStr] = (dailyTotals[dateStr] || 0) + exp.amount;
    });

    const sortedDates = Object.keys(dailyTotals).sort((a, b) => new Date(a).getTime() - new Date(b).getTime());
    return sortedDates.map((dateStr) => {
      const dateObj = new Date(dateStr);
      const formattedDate = dateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', timeZone: 'UTC' });
      return {
        rawDate: dateStr,
        dateLabel: formattedDate,
        amount: dailyTotals[dateStr] || 0,
      };
    });
  }, [nonSettlementExpenses]);





  // Form submissions
  const handleCreateTrip = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTripName || !newTripStart || !newTripEnd) return;
    const cleanStops = newTripStops.filter((s) => s.name.trim().length > 0);
    if (editingTripId) {
      await updateTrip(editingTripId, newTripName, newTripStart, newTripEnd, newTripDestination.trim() || undefined, cleanStops);
    } else {
      await createTrip(newTripName, newTripStart, newTripEnd, newTripCurrency, newTripDestination.trim() || undefined, cleanStops);
    }
    setNewTripName('');
    setNewTripDestination('');
    setNewTripStops([]);
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setEditingTripId(null);
    setShowAddTrip(false);
  };

  const handleStartEditTrip = (trip: Trip) => {
    setEditingTripId(trip.id);
    setNewTripName(trip.name);
    setNewTripDestination(trip.destination || '');
    setNewTripStops(trip.stops ? [...trip.stops] : []);
    setNewTripStart(trip.startDate);
    setNewTripEnd(trip.endDate);
    setNewTripDestination(trip.destination || '');
    setShowAddTrip(true);
  };

  const handleCancelTripForm = () => {
    setEditingTripId(null);
    setNewTripName('');
    setNewTripDestination('');
    setNewTripStops([]);
    setNewTripStart('');
    setNewTripEnd('');
    setNewTripCurrency('INR');
    setNewTripDestination('');
    setShowAddTrip(false);
  };

  const handleSaveMember = async (name: string, id: string | null, linkedUserId?: string | null): Promise<{ success: boolean; error?: string }> => {
    const nameTrimmed = name.trim();
    if (!nameTrimmed) return { success: false, error: 'Member name cannot be empty.' };

    const nameLower = nameTrimmed.toLowerCase();
    const isDuplicateMember = activeTripMembers.some(
      (m) => (m.name.toLowerCase() === nameLower || (linkedUserId && m.linkedUserId === linkedUserId)) && m.id !== id
    );
    const isDuplicateGroup = activeTripGroups.some(
      (g) => g.name.toLowerCase() === nameLower
    );

    if (isDuplicateMember) {
      return { success: false, error: `A member named "${nameTrimmed}" is already added to this trip.` };
    }
    if (isDuplicateGroup) {
      return { success: false, error: `A group named "${nameTrimmed}" already exists on this trip.` };
    }

    if (id) {
      await updateMember(id, nameTrimmed);
    } else {
      // If linkedUserId wasn't explicitly passed, look up if an existing member with this name has a linkedUserId
      let finalLinkedUserId = linkedUserId || null;
      if (!finalLinkedUserId) {
        const existingPerson = Object.values(members).find(
          (m) => m.name.trim().toLowerCase() === nameLower && m.linkedUserId
        );
        if (existingPerson && existingPerson.linkedUserId) {
          finalLinkedUserId = existingPerson.linkedUserId;
        }
      }
      await addMember(nameTrimmed, finalLinkedUserId ?? undefined);
      // Only fires for members added directly with a known account (e.g.
      // picked from a "people you've traveled with before" suggestion) —
      // a bare placeholder member has no linked user to notify yet, and
      // gets covered separately once they actually join via the trip code
      // (JoinTripScreen's own member_joined notification already covers
      // telling the existing members about *that* case).
      if (finalLinkedUserId && activeTripId) {
        sendPushNotification(
          [finalLinkedUserId],
          activeTrip?.name || 'Trip Tracker',
          'member_added',
          undefined,
          activeTripId
        );

        // Everyone else already on the trip should hear about the new
        // member too, not just the person who added them.
        const existingRecipients = getTripNotificationRecipients(trips, members, activeTripId, userId || '').filter(
          (recipientId) => recipientId !== finalLinkedUserId
        );
        sendPushNotification(
          existingRecipients,
          activeTrip?.name || 'Trip Tracker',
          'member_added_notice',
          { memberName: nameTrimmed },
          activeTripId
        );
      }
    }
    setShowMembersRequiredNotice(false);
    return { success: true };
  };

  const handleDeleteMember = (member: Member) => {
    // Check if target is the original trip owner and current user is not the owner
    const isOwner = (activeTrip?.ownerId && member.linkedUserId === activeTrip.ownerId) || (!activeTrip?.ownerId && activeTripMembers[0]?.id === member.id);
    if (isOwner && userId && activeTrip?.ownerId && userId !== activeTrip.ownerId) {
      setConfirmRequest({
        title: 'Cannot delete Trip Owner',
        message: `"${member.name}" is the creator and owner of this trip. Secondary admins cannot delete the trip owner.`,
        confirmLabel: 'Understood',
        danger: false,
        onConfirm: () => {},
      });
      return;
    }

    // Check if this member is an admin on the active trip
    const isTargetAdmin =
      activeTrip?.adminMemberIds && activeTrip.adminMemberIds.length > 0
        ? activeTrip.adminMemberIds.includes(member.id)
        : member.linkedUserId === activeTrip?.ownerId || activeTripMembers[0]?.id === member.id;

    if (isTargetAdmin) {
      const remainingAdmins = activeTripMembers.filter((m) => {
        if (m.id === member.id) return false;
        return activeTrip?.adminMemberIds && activeTrip.adminMemberIds.length > 0
          ? activeTrip.adminMemberIds.includes(m.id)
          : m.linkedUserId === activeTrip?.ownerId || activeTripMembers[0]?.id === m.id;
      });

      const remainingGoogleAdmins = remainingAdmins.filter((m) => Boolean(m.linkedUserId));

      if (remainingGoogleAdmins.length === 0) {
        let msg = `"${member.name}" cannot be deleted because a trip must retain at least one Admin linked to a Google account.`;
        if (remainingAdmins.length > 0) {
          msg += ` The other admin ("${remainingAdmins[0].name}") is not linked to a Google account. Please link their Google account or promote a Google-linked member to Admin before removing this admin.`;
        } else {
          msg += ` Please promote a Google-linked member to Admin before removing this admin.`;
        }

        setConfirmRequest({
          title: 'Google-linked Admin required',
          message: msg,
          confirmLabel: 'Understood',
          danger: false,
          onConfirm: () => {},
        });
        return;
      }
    }

    const hasTransactions = activeTripExpenses.some(
      (e) => 
        e.paidBy === member.id || 
        e.paidBy === member.name || 
        e.splitMemberIds.includes(member.id) ||
        e.splitMemberIds.includes(member.name)
    );

    let message = `Are you sure you want to permanently delete member "${member.name}"?`;
    if (hasTransactions) {
      message = `This member has recorded transaction entries. Deleting them will redistribute their expenses and split shares equally among the other remaining members of this trip. Are you sure you want to proceed?`;
    }

    setConfirmRequest({
      title: 'Delete member',
      message,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => deleteMember(member.id),
    });
  };

  const handleAddCategory = async (name: string, icon: string) => {
    await addCategory(name, icon);
  };

  const handleDeleteCategory = async (categoryId: string, replacementCategoryId: string | null) => {
    if (replacementCategoryId) {
      // Find all expenses in the active trip using the deleted category and update them to replacement category
      const affectedExpenses = expenses.filter((e) => e.tripId === activeTripId && e.category === categoryId);
      for (const exp of affectedExpenses) {
        await updateExpense(exp.id, {
          title: exp.title,
          amount: exp.amount,
          currency: exp.currency,
          category: replacementCategoryId,
          date: exp.date,
          paidBy: exp.paidBy,
          splitMode: exp.splitMode,
          splitMemberIds: exp.splitMemberIds,
          splitConfig: exp.splitConfig,
        });
      }
    }
    await deleteCategory(categoryId);
  };

  const handleSaveGroup = async (name: string, memberIds: string[], id: string | null): Promise<{ success: boolean; error?: string }> => {
    // Editing an existing group down to a single member (or none) doesn't
    // count as an error -- it just means the group no longer makes sense,
    // so it dissolves instead of blocking the edit that got it there.
    if (id && memberIds.length < 2) {
      await deleteGroup(id);
      return { success: true };
    }

    const nameTrimmed = name.trim();
    if (!nameTrimmed) return { success: false, error: 'Group name cannot be empty.' };
    if (memberIds.length < 2) return { success: false, error: 'A group needs at least 2 members.' };

    const nameLower = nameTrimmed.toLowerCase();
    const isDuplicateMember = activeTripMembers.some(
      (m) => m.name.toLowerCase() === nameLower
    );
    const isDuplicateGroup = activeTripGroups.some(
      (g) => g.name.toLowerCase() === nameLower && g.id !== id
    );

    if (isDuplicateMember || isDuplicateGroup) {
      return { success: false, error: 'A member or group with this name already exists on this trip.' };
    }

    if (id) {
      await updateGroup(id, nameTrimmed, memberIds);
    } else {
      await createGroup(nameTrimmed, memberIds);
    }
    return { success: true };
  };

  const handleSaveExpense = async (expenseData: {
    title: string;
    amount: number;
    currency: string;
    category: string;
    date: string;
    paidBy: string;
    splitMode: 'equal' | 'custom' | 'exact' | 'percentage';
    splitMemberIds: string[];
    splitConfig?: Record<string, number>;
    receiptImage?: string;
    location?: import('./types').ExpenseLocation | null;
  }): Promise<{ success: boolean; error?: string }> => {
    if (!activeTripId) return { success: false, error: 'No active trip' };
    try {
      const expensePayload = {
        title: expenseData.title,
        amount: expenseData.amount,
        // Amount arrives already converted to base currency (ExpenseForm's
        // job); currency here records what the user actually picked so the
        // Trip Summary page can note "logged in ₹/$/€" instead of every
        // expense silently claiming the trip's base currency.
        currency: expenseData.currency || activeTrip?.baseCurrency || 'INR',
        category: expenseData.category,
        date: expenseData.date,
        paidBy: expenseData.paidBy,
        splitMode: expenseData.splitMode,
        splitMemberIds: expenseData.splitMemberIds,
        splitConfig: expenseData.splitConfig,
        receiptImage: expenseData.receiptImage,
        location: expenseData.location,
      };

      if (editingExpenseId) {
        await updateExpense(editingExpenseId, expensePayload);
      } else {
        await addExpense(expensePayload);
      }
      advanceReviewQueueOrClose();
      return { success: true };
    } catch {
      return { success: false, error: 'Failed to save expense.' };
    }
  };

  const handleCancelExpenseForm = () => {
    advanceReviewQueueOrClose();
  };

  // Moves to the next expense in the affected-by-a-removed-member review
  // queue (if one is running), or just closes the form like before.
  const advanceReviewQueueOrClose = () => {
    if (reviewQueue.length === 0) {
      setEditingExpenseId(null);
      setShowAddExpense(false);
      return;
    }
    const [nextId, ...rest] = reviewQueue;
    setReviewQueue(rest);
    setEditingExpenseId(nextId);
    setShowAddExpense(true);
  };

  const handleOpenAddExpense = () => {
    if (visibleMembers.length === 0) {
      setShowMembersRequiredNotice(true);
      setActiveTab('members');
      return;
    }
    setReviewQueue([]);
    setEditingExpenseId(null);
    setShowAddExpense(true);
  };

  const handleStartEditExpense = (exp: Expense) => {
    setReviewQueue([]);
    setEditingExpenseId(exp.id);
    setShowAddExpense(true);
  };

  // Entry point for the "Review N affected expenses" banner — opens the
  // first expense a removed member touched and queues the rest so save/
  // cancel walks through them one after another.
  const handleReviewAffectedExpenses = (expenseIds: string[]) => {
    if (expenseIds.length === 0) return;
    const [firstId, ...rest] = expenseIds;
    setReviewQueue(rest);
    setEditingExpenseId(firstId);
    setShowAddExpense(true);
  };

  const UNDO_DURATION_MS = 2000;

  // Undo-delete: stage the expense, start a 2-second timer
  const handleDeleteExpense = (exp: Expense) => {
    // Cancel any prior pending deletion first
    if (undoTimer) clearTimeout(undoTimer);
    setPendingDeleteExpense(exp);
    const timer = setTimeout(() => {
      deleteExpense(exp.id);
      setPendingDeleteExpense(null);
    }, UNDO_DURATION_MS);
    setUndoTimer(timer);
  };

  const handleUndoDelete = () => {
    if (undoTimer) clearTimeout(undoTimer);
    setUndoTimer(null);
    setPendingDeleteExpense(null);
  };

  // Deleting a trip takes everyone's members and expenses with it, so it
  // gets a deliberate confirm step in front of the undo-toast staging below
  // — the toast is a grace period for a slip, not the only safety net.
  const handleDeleteTrip = (trip: Trip) => {
    setConfirmRequest({
      title: 'Delete trip',
      message: `Delete "${trip.name}" and all of its members and expenses? You'll have a few seconds to undo right after.`,
      confirmLabel: 'Delete',
      danger: true,
      onConfirm: () => {
        if (tripUndoTimer) clearTimeout(tripUndoTimer);
        setPendingDeleteTrip(trip);
        const timer = setTimeout(() => {
          deleteTrip(trip.id);
          setPendingDeleteTrip(null);
        }, UNDO_DURATION_MS);
        setTripUndoTimer(timer);
      },
    });
  };

  const handleUndoDeleteTrip = () => {
    if (tripUndoTimer) clearTimeout(tripUndoTimer);
    setTripUndoTimer(null);
    setPendingDeleteTrip(null);
  };

  const handleArchiveTrip = (trip: Trip) => {
    archiveTrip(trip.id, true);
  };

  const handleRestoreTrip = (trip: Trip) => {
    archiveTrip(trip.id, false);
  };

  // Undo-delete: stage the group, start a 2-second timer
  const handleDeleteGroup = (group: Group) => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setPendingDeleteGroup(group);
    const timer = setTimeout(() => {
      deleteGroup(group.id);
      setPendingDeleteGroup(null);
    }, UNDO_DURATION_MS);
    setGroupUndoTimer(timer);
  };

  const handleUndoDeleteGroup = () => {
    if (groupUndoTimer) clearTimeout(groupUndoTimer);
    setGroupUndoTimer(null);
    setPendingDeleteGroup(null);
  };



  // Record a settlement transfer. fromId/toId are the real member ids that
  // record the ledger entry; fromLabel/toLabel are what the user picked the
  // transfer between (a member name, or a group name for merged settlements).
  const handleSettle = (fromId: string, toId: string, amount: number, fromLabel: string, toLabel: string) => {
    const fromMember = members[fromId];
    const toMember = members[toId];
    if (!fromMember || !toMember || !activeTrip || !(amount > 0)) return;

    const currencySymbol = getCurrencySymbol(activeTrip.baseCurrency);
    const payerNote = fromLabel !== fromMember.name ? ` (paid by ${fromMember.name})` : '';
    const receiverNote = toLabel !== toMember.name ? ` (received by ${toMember.name})` : '';
    setConfirmRequest({
      title: 'Confirm settlement',
      message: `Mark transfer: ${fromLabel} pays ${toLabel} ${currencySymbol}${amount.toFixed(2)}${payerNote}${receiverNote} as settled?`,
      confirmLabel: 'Mark Settled',
      onConfirm: () => {
        addExpense({
          title: `Settlement: ${fromLabel} ➔ ${toLabel}`,
          amount: amount,
          currency: activeTrip.baseCurrency,
          category: 'cat-misc',
          date: new Date().toISOString().split('T')[0],
          paidBy: fromId, // paid by debtor
          splitMode: 'exact',
          splitMemberIds: [toId], // split 100% to creditor
          splitConfig: { [toId]: amount }
        });
      },
    });
  };

  const handleImport = async (jsonOverride?: string) => {
    // Reentrancy guard: without this, double-tapping (or an upload firing
    // while a paste-triggered restore is still in flight) ran importDatabase
    // twice concurrently, each blindly re-inserting the same trips as fresh
    // duplicates -- there was no dedup on tripId once the JSON had already
    // been parsed and handed to insertTripGraph.
    if (importStatus === 'pending') return;
    const json = jsonOverride ?? importJson;
    if (!json) return;
    setImportStatus('pending');
    setImportErrorMessage(null);
    const result = await importDatabase(json);
    if (result.success) {
      setImportStatus('success');
      setImportJson('');
      setTimeout(() => {
        setImportStatus('idle');
        setShowImportArea(false);
      }, 2000);
    } else {
      setImportStatus('error');
      setImportErrorMessage(result.error || 'Invalid database snapshot format.');
      setTimeout(() => {
        setImportStatus('idle');
        setImportErrorMessage(null);
      }, 4000);
    }
  };

  const triggerExport = () => {
    const json = exportDatabase();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-tracker-backup-${Date.now()}.json`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const triggerCsvExport = () => {
    if (!activeTrip) return;
    const csv = exportTripToCSV(activeTrip, members, expenses, visibleTripGroups);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `trip-tracker-export-${activeTrip.name.replace(/\s+/g, '-')}-${Date.now()}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleClearDatabase = () => {
    setConfirmRequest({
      title: 'Clear All Data',
      message: 'This will permanently delete all trips, members, groups, and expenses. This action cannot be undone. Are you sure you want to proceed?',
      confirmLabel: 'Clear All',
      danger: true,
      onConfirm: async () => {
        await clearDatabase();
        setConfirmRequest(null);
      },
    });
  };

  const handleLoadDemoTrip = async () => {
    await loadDemoTrip();
    setActiveTab('expenses');
  };

  // Wire swipe-back gesture, hardware/OS back button, and the browser Back
  // button to close whichever screen/modal is open, deepest first (WhatsApp LIFO navigation stack).
  useHistoryBack(isSuperadmin && isTravelerPreview, () => {
    setIsTravelerPreview(false);
    void selectTrip(null);
  });
  useHistoryBack(!!activeTripId && !isTravelerPreview, () => selectTrip(null));
  useHistoryBack(!!activeTripId && activeTab !== 'expenses', () => setActiveTab('expenses'));
  useHistoryBack(showAddTrip, handleCancelTripForm);
  useHistoryBack(showAddExpense, handleCancelExpenseForm);
  useHistoryBack(showExpenseFilterDrawer, () => setShowExpenseFilterDrawer(false));
  useHistoryBack(!!selectedReviewExpense, () => setSelectedReviewExpense(null));
  useHistoryBack(showShareTrip, () => setShowShareTrip(false));
  useHistoryBack(showGlobalSettings, () => setShowGlobalSettings(false));
  useHistoryBack(!!confirmRequest, () => setConfirmRequest(null));
  useHistoryBack(showCommandPalette, () => setShowCommandPalette(false));
  useHistoryBack(showTripWrapped, () => setShowTripWrapped(false));

  // Escape key — the desktop equivalent of the back-gesture wiring above,
  // for the same set of overlay modals (excludes tab/trip navigation).
  useEscapeKey(showAddTrip, handleCancelTripForm);
  useEscapeKey(showAddExpense, handleCancelExpenseForm);
  useEscapeKey(showExpenseFilterDrawer, () => setShowExpenseFilterDrawer(false));
  useEscapeKey(!!selectedReviewExpense, () => setSelectedReviewExpense(null));
  useEscapeKey(showShareTrip, () => setShowShareTrip(false));
  useEscapeKey(showGlobalSettings, () => setShowGlobalSettings(false));
  useEscapeKey(!!confirmRequest, () => setConfirmRequest(null));
  useEscapeKey(showTripWrapped, () => setShowTripWrapped(false));

  // Loading view
  if (!initialized) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center' }}>
        <div style={{ textAlign: 'center' }}>
          <h2 style={{ fontFamily: 'var(--font-family-title)', marginBottom: '16px' }}>Trip Tracker 2026</h2>
          <div className="ledger-loader" role="status" aria-label="Loading">
            <span className="ledger-loader-mark">TT</span>
          </div>
        </div>
      </div>
    );
  }

  if (isMissingSupabaseEnv && !bypassEnvWarning && !isSuperadmin) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div className="glass-card" style={{ maxWidth: '460px', width: '100%', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'var(--color-danger-soft, rgba(239, 68, 68, 0.12))',
            color: 'var(--color-danger)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 20px',
            fontSize: '24px'
          }}>
            ⚠️
          </div>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '20px', marginBottom: '12px' }}>
            Missing API Credentials
          </h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6', marginBottom: '20px' }}>
            To connect to remote cloud sync, copy <code>.env.example</code> to <code>.env</code> in the project root and fill in your Supabase credentials:
          </p>
          <pre style={{
            background: 'rgba(0,0,0,0.03)',
            padding: '12px 14px',
            borderRadius: '8px',
            textAlign: 'left',
            fontSize: '12px',
            fontFamily: 'monospace',
            overflowX: 'auto',
            marginBottom: '20px',
            border: '1.5px solid var(--border-color)',
            color: 'var(--text-primary)'
          }}>
            VITE_SUPABASE_URL=https://your-project.supabase.co
            {"\n"}VITE_SUPABASE_ANON_KEY=your-anon-key
          </pre>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <button
              type="button"
              className="primary-btn"
              onClick={() => setBypassEnvWarning(true)}
              style={{ width: '100%', padding: '10px 16px' }}
            >
              Continue in Offline / Local Mode
            </button>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)', margin: 0 }}>
              You can still use all local features, demo trips, and Superadmin tools offline.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (maintenanceMode && !isSuperadmin) {
    return (
      <div className="app-container" style={{ justifyContent: 'center', alignItems: 'center', padding: '24px' }}>
        <div className="glass-card fade-in" style={{ maxWidth: '380px', textAlign: 'center', padding: '32px 24px' }}>
          <div style={{ fontSize: '32px', marginBottom: '12px' }}>&#128295;</div>
          <h2 style={{ fontFamily: 'var(--font-family-title)', fontSize: '20px', marginBottom: '10px' }}>Under Maintenance</h2>
          <p style={{ fontSize: '14px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
            Trip Tracker is briefly offline for scheduled maintenance. Your data is safe — please check back shortly.
          </p>
        </div>
      </div>
    );
  }

  if (isSuperadmin && !isTravelerPreview && !showBugTracker) {
    return (
      <Suspense fallback={<AdminLoadingFallback />}>
        <AdminPortalLayout
          trips={trips}
          members={members}
          categories={categories}
          activeTab={adminActiveTab}
          onActiveTabChange={setAdminActiveTab}
          onExitToTravelerApp={() => setIsTravelerPreview(true)}
          onOpenBugTracker={() => setShowBugTracker(true)}
          onInspectTrip={(tripId) => {
            void selectTrip(tripId);
            setAdminActiveTab('trips');
            setIsTravelerPreview(true);
          }}
        />
      </Suspense>
    );
  }

  return (
    <div className="app-container">
      <a href="#main-content" className="skip-link">Skip to content</a>
      {/* Superadmin Traveler Preview Top Floating Banner */}
      {isSuperadmin && isTravelerPreview && (
        <div
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 100,
            background: 'linear-gradient(135deg, #2F6FED, #17B6A6)',
            color: '#FFFFFF',
            padding: '10px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            boxShadow: '0 2px 10px rgba(0,0,0,0.15)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', fontWeight: 600 }}>
            <IconShield size={16} /> 👁️ Previewing as Normal Traveler
          </div>
          <button
            type="button"
            className="primary-btn"
            style={{ padding: '4px 12px', fontSize: '12px', background: '#10B981' }}
            onClick={() => setIsTravelerPreview(false)}
          >
            ⚡ Return to Superadmin Portal
          </button>
        </div>
      )}

      {/* Storage Toast Alert */}
      {storageError && isOnline && (
        <div className="toast-alert" role="alert" aria-live="assertive">
          <div>
            <strong style={{ display: 'block', fontSize: '14px', marginBottom: '2px' }}>Storage Error</strong>
            <span style={{ fontSize: '13px', opacity: 0.9 }}>{storageError}</span>
          </div>
          <button className="toast-close" onClick={clearStorageError}>&times;</button>
        </div>
      )}

      {/* Full-Screen Superadmin Bug Tracker View */}
      {showBugTracker ? (
        <div id="main-content" tabIndex={-1} className="fade-in" style={{ flex: 1, overflowY: 'auto', padding: '16px 20px' }}>
          <Suspense fallback={<AdminLoadingFallback />}>
            <SuperAdminBugTracker
              onBack={() => {
                setShowBugTracker(false);
                if (window.location.hash === '#/bugs' || window.location.hash === '#/bug-tracker') {
                  window.location.hash = '#/';
                }
              }}
              isAdmin={isSuperadmin}
              onRequestConfirm={setConfirmRequest}
            />
          </Suspense>
        </div>
      ) : !activeTripId ? (
        /* Screen 1: Trips List */
        <TripsListScreen
          trips={visibleTrips}
          members={members}
          showAddTrip={showAddTrip}
          setShowAddTrip={setShowAddTrip}
          newTripName={newTripName}
          setNewTripName={setNewTripName}
          newTripDestination={newTripDestination}
          setNewTripDestination={setNewTripDestination}
          newTripStops={newTripStops}
          setNewTripStops={setNewTripStops}
          newTripStart={newTripStart}
          setNewTripStart={setNewTripStart}
          newTripEnd={newTripEnd}
          setNewTripEnd={setNewTripEnd}
          newTripCurrency={newTripCurrency}
          setNewTripCurrency={setNewTripCurrency}
          editingTripId={editingTripId}
          onCreateTrip={handleCreateTrip}
          onCancelTripForm={handleCancelTripForm}
          onStartEditTrip={handleStartEditTrip}
          onSelectTrip={(id) => selectTrip(id)}
          onDeleteTrip={handleDeleteTrip}
          onArchiveTrip={handleArchiveTrip}
          onOpenSettings={() => setShowGlobalSettings(true)}
          onOpenBugTracker={isSuperadmin ? () => setShowBugTracker(true) : undefined}
          onLoadDemoTrip={handleLoadDemoTrip}
          userAvatarUrl={userAvatarUrl}
          userDisplayName={userDisplayName}
        />
      ) : (
        /* Screen 2: Active Trip Dashboard */
        <div id="main-content" tabIndex={-1} className="trip-dashboard-container fade-in" style={{ position: 'relative' }}>
          <Suspense fallback={null}>
            <TripMapHero trip={activeTrip ?? null} sheetExpanded={sheetExpanded} onToneChange={setHeaderTone} />
          </Suspense>
          <header ref={headerRef} className={`app-header trip-dashboard-header ${isHeaderScrolled ? 'is-scrolled' : ''} ${headerTone === 'dark' ? 'tone-dark' : ''} ${sheetFull ? 'header-hidden' : ''}`} style={{ overflow: 'hidden' }}>
            <div className="app-header-top" style={{ position: 'relative', zIndex: 1 }}>
              <div className="app-title-group">
                <span className="app-eyebrow">
                  {/* Destination used to prefix this row too ("📍 Lachung ·"),
                      but the route-stops chips below already show every
                      stop -- that made this line too wide to fit the full
                      date range and status badge on one line, so both got
                      clipped by the row's fixed height. Dropped it here;
                      the date range is the only thing this row needs to say. */}
                  <IconCalendar size={12} className="icon-sm" />
                  {formatDateRange(activeTrip?.startDate || '', activeTrip?.endDate || '')}
                  {(() => {
                    const todayStr = new Date().toISOString().split('T')[0];
                    if (!activeTrip?.startDate) return null;
                    if (activeTrip.startDate > todayStr) {
                      return (
                        <span className="header-status-badge">
                          <span className="header-status-dot" style={{ background: '#F0AE5C' }} />
                          Upcoming
                        </span>
                      );
                    }
                    if (activeTrip.endDate < todayStr) {
                      return (
                        <span className="header-status-badge">
                          <span className="header-status-dot" style={{ background: 'var(--header-fg-muted)' }} />
                          Completed
                        </span>
                      );
                    }
                    return (
                      <span className="header-status-badge">
                        <span className="header-status-dot" style={{ background: '#4FAE72' }} />
                        Active
                      </span>
                    );
                  })()}
                </span>
                <div className="app-title-row">
                  <FitHeading
                    text={activeTrip?.name || ''}
                    className="app-logo"
                    style={{ color: 'var(--header-fg)' }}
                    maxFontSize={22}
                    minFontSize={14}
                  />
                </div>
              </div>
              <div style={{ display: 'flex', gap: '6px', alignItems: 'center', flexShrink: 0 }}>
                {isSuperadmin && (
                  <button
                    type="button"
                    className="secondary-btn"
                    style={{ padding: '7px 9px', fontSize: '12px', color: '#17B6A6', borderColor: 'rgba(23,182,166,0.4)', background: 'rgba(23,182,166,0.12)' }}
                    onClick={() => setShowBugTracker(true)}
                    title="Open Superadmin Bug Tracker"
                  >
                    🛡️ Bugs
                  </button>
                )}
                <button
                  type="button"
                  className="secondary-btn"
                  style={{ padding: '7px 8px', display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--header-fg)', borderColor: 'var(--header-fg-border)', background: 'var(--header-fg-soft-bg)' }}
                  onClick={() => setShowCommandPalette(true)}
                  title="Search & Quick Actions (Cmd+K)"
                  aria-label="Command palette"
                >
                  <IconSearch size={15} className="icon-sm" />
                  <span className="cmd-k-hint" aria-hidden="true">{IS_MAC ? '⌘K' : 'Ctrl K'}</span>
                </button>
                <NotificationsBellButton />
                <button
                  data-action="trips-back"
                  className="secondary-btn"
                  style={{ padding: '7px 11px', fontSize: '12px', color: 'var(--header-fg)', borderColor: 'var(--header-fg-border)', background: 'var(--header-fg-soft-bg)' }}
                  onClick={() => selectTrip(null)}
                >
                  <IconChevronLeft size={14} className="icon-sm" /> Trips
                </button>
              </div>
            </div>
            <div className="app-header-stats" style={{ position: 'relative', zIndex: 1 }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>{visibleMembers.length} member{visibleMembers.length === 1 ? '' : 's'}</span>
                <span>{activeTripExpenses.length} expense{activeTripExpenses.length === 1 ? '' : 's'}</span>
                {activePeers.length > 0 && (
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '3px' }} title={`${activePeers.length} other traveler(s) online`}>
                    <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#17B6A6', display: 'inline-block' }} />
                    <span style={{ fontSize: '11px', color: '#17B6A6', fontWeight: 600 }}>{activePeers.length} online</span>
                  </div>
                )}
              </div>
              <button
                type="button"
                data-action="sync"
                className="sync-header-pill"
                onClick={handleSyncClick}
                disabled={syncStatus === 'offline'}
                title={
                  syncStatus === 'offline'
                    ? 'No connection — changes are saved on this device and will sync once you\'re back online.'
                    : syncStatus === 'session-expired'
                    ? 'Your session expired. Tap to sign in again.'
                    : syncStatus === 'out-of-sync'
                    ? 'Local changes not yet synced with the server. Tap to sync now.'
                    : `Last synced: ${syncStatusLabel}`
                }
                aria-label="Backend Sync Status"
              >
                <span className={`sync-badge-dot ${syncStatus}`} />
                <span>{syncStatusLabel}</span>
              </button>
            </div>

            {/* Route Stops Chips Bar inside Header -- collapsed by default
                (see stopsExpanded above), tap to reveal the full list. */}
            {activeTrip?.stops && activeTrip.stops.length > 0 && (
              <div style={{ position: 'relative', zIndex: 1, marginTop: '8px', paddingTop: '8px', borderTop: '1px solid var(--header-fg-border)' }}>
                {stopsExpanded ? (
                  <div style={{ display: 'flex', gap: '6px', overflowX: 'auto', scrollbarWidth: 'none' }}>
                    {activeTrip.stops.map((stop, sIdx) => (
                      <span
                        key={stop.id || sIdx}
                        style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '11px',
                          fontWeight: 600,
                          padding: '3px 8px',
                          borderRadius: '12px',
                          background: 'var(--header-fg-soft-bg)',
                          backdropFilter: 'blur(6px)',
                          color: 'var(--header-fg)',
                          whiteSpace: 'nowrap',
                          flexShrink: 0,
                        }}
                      >
                        <strong style={{ opacity: 0.85 }}>{sIdx + 1}.</strong> {stop.name}
                      </span>
                    ))}
                    <button
                      type="button"
                      onClick={() => setStopsExpanded(false)}
                      style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0,
                        background: 'var(--header-fg-soft-bg)', border: 'none', color: 'var(--header-fg)', cursor: 'pointer',
                      }}
                      aria-label="Collapse route stops"
                    >
                      <IconChevronUp size={12} className="icon-sm" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => setStopsExpanded(true)}
                    style={{
                      display: 'inline-flex', alignItems: 'center', gap: '5px',
                      fontSize: '11px', fontWeight: 600, padding: '3px 10px', borderRadius: '12px',
                      background: 'var(--header-fg-soft-bg)', backdropFilter: 'blur(6px)',
                      color: 'var(--header-fg)', border: 'none', cursor: 'pointer',
                    }}
                  >
                    {activeTrip.stops.length} stops
                    <IconChevronDown size={12} className="icon-sm" />
                  </button>
                )}
              </div>
            )}
          </header>

          <TripContentSheet onExpandedChange={setSheetExpanded} onFullChange={setSheetFull}>
          <main className="app-main" ref={mainContentRef}>
            {/* View Switching Tab Content */}
            <div
              className="tab-pane"
              style={
                activeTab === 'expenses' ? { display: 'block', ...tabSwipe.activePaneStyle }
                : tabSwipe.previewTab === 'expenses' ? { display: 'block', ...tabSwipe.previewPaneStyle }
                : { display: 'none' }
              }
            >
              <div className="fade-in">
                {activeTrip && visibleMembers.length > 0 && (
                  <BalancesSettlements
                    trip={activeTrip}
                    balances={balances}
                    groups={visibleTripGroups}
                    transfers={transfers}
                    activeTripExpenses={activeTripExpenses}
                    onSettle={handleSettle}
                    isAdmin={isAdmin}
                    myMemberId={myMemberId}
                    members={members}
                    onOpenSquadBadges={() => setShowAchievements(true)}
                    onMemberClick={(memberId) => {
                      setExpenseFilterMember(memberId);
                      setShowExpenseFilterDrawer(false);
                      setActiveTab('ledger');
                    }}
                  />
                )}
                <AnalyticsTab
                  trip={activeTrip}
                  totalSpent={totalSpent}
                  averageCost={averageCost}
                  biggestSpender={biggestSpender}
                  hasExpenses={nonSettlementExpenses.length > 0}
                  categoryData={categoryData}
                  getCatColor={getCatColor}
                  memberSpentList={memberSpentList}
                  dailySpendData={dailySpendData}
                  expenses={activeTripExpenses}
                  onCategoryClick={(catId) => {
                    setExpenseFilterCategory(catId);
                    setShowExpenseFilterDrawer(false);
                    setActiveTab('ledger');
                  }}
                  onMemberClick={(memberId) => {
                    setExpenseFilterMember(memberId);
                    setShowExpenseFilterDrawer(false);
                    setActiveTab('ledger');
                  }}
                />
              </div>
            </div>

            <div
              className="tab-pane"
              style={
                activeTab === 'members' ? { display: 'block', ...tabSwipe.activePaneStyle }
                : tabSwipe.previewTab === 'members' ? { display: 'block', ...tabSwipe.previewPaneStyle }
                : { display: 'none' }
              }
            >
              <div className="fade-in">
              <MembersGroupsTab
                showMembersRequiredNotice={showMembersRequiredNotice}
                dismissMembersRequiredNotice={() => setShowMembersRequiredNotice(false)}
                activeTripMembers={activeTripMembers}
                visibleMembers={visibleMembers}
                archivedMembers={archivedMembers}
                balances={balances}
                currencySymbol={activeTrip ? getCurrencySymbol(activeTrip.baseCurrency) : ''}
                onToggleArchiveMember={toggleArchiveMember}
                onSaveMember={handleSaveMember}
                onDeleteMember={handleDeleteMember}
                visibleTripGroups={visibleTripGroups}
                onSaveGroup={handleSaveGroup}
                onDeleteGroup={handleDeleteGroup}
                members={members}
                isAdmin={isAdmin}
                tripOwnerId={activeTrip?.ownerId ?? ''}
                adminMemberIds={activeTrip?.adminMemberIds}
                onSetMemberAdminRole={setMemberAdminRole}
                currentUserId={userId}
                addMemberSignal={addMemberSignal}
              />
              </div>
            </div>

            <div
              className="tab-pane"
              style={
                activeTab === 'ledger' ? { display: 'block', ...tabSwipe.activePaneStyle }
                : tabSwipe.previewTab === 'ledger' ? { display: 'block', ...tabSwipe.previewPaneStyle }
                : { display: 'none' }
              }
            >
              <div className="fade-in" style={{ paddingBottom: '100px' }}>
              <ExpenseList
                trip={activeTrip}
                members={members}
                categories={categories}
                activeTripMembers={activeTripMembers}
                activeTripExpenseCount={activeTripExpenses.length}
                activeTripExpenses={activeTripExpenses}
                onReviewAffected={handleReviewAffectedExpenses}
                filteredExpenses={filteredExpenses}
                pendingDeleteId={pendingDeleteExpense?.id}
                hasActiveFilters={hasActiveExpenseFilters}
                totalSpent={totalSpent}
                averageCost={averageCost}
                topCategoryName={categoryData[0]?.name}
                topCategoryPercentage={categoryData[0]?.percentage}
                getCatColor={getCatColor}
                search={expenseSearch}
                setSearch={setExpenseSearch}
                filterCategory={expenseFilterCategory}
                setFilterCategory={setExpenseFilterCategory}
                filterMember={expenseFilterMember}
                setFilterMember={setExpenseFilterMember}
                filterDateFrom={expenseFilterDateFrom}
                setFilterDateFrom={setExpenseFilterDateFrom}
                filterDateTo={expenseFilterDateTo}
                setFilterDateTo={setExpenseFilterDateTo}
                filterAmountMin={expenseFilterAmountMin}
                filterAmountMax={expenseFilterAmountMax}
                filterRelation={expenseFilterRelation}
                filterLocation={expenseFilterLocation}
                myMemberId={myMemberId}
                onClearFilters={clearExpenseFilters}
                onOpenFilters={() => setShowExpenseFilterDrawer(true)}
                onReview={setSelectedReviewExpense}
                onEdit={handleStartEditExpense}
                onDelete={handleDeleteExpense}
                isAdmin={isAdmin}
                userId={userId}
              />
              </div>
            </div>

            <div
              className="tab-pane"
              style={
                activeTab === 'settings' ? { display: 'block', ...tabSwipe.activePaneStyle }
                : tabSwipe.previewTab === 'settings' ? { display: 'block', ...tabSwipe.previewPaneStyle }
                : { display: 'none' }
              }
            >
              <div className="fade-in">
              <SettingsTab
                categories={categories}
                activeTripExpenses={activeTripExpenses}
                onDeleteCategory={handleDeleteCategory}
                onAddCategory={handleAddCategory}
                onExportCsv={triggerCsvExport}
                isAdmin={isAdmin}
                themePref={themePref}
                setThemePref={setThemePref}
                onExportJson={triggerExport}
                showImportArea={showImportArea}
                setShowImportArea={setShowImportArea}
                importJson={importJson}
                setImportJson={setImportJson}
                importStatus={importStatus}
                importErrorMessage={importErrorMessage}
                onImport={handleImport}
                onClearDatabase={handleClearDatabase}
                onLoadDemoTrip={handleLoadDemoTrip}
                archivedTrips={archivedTrips}
                onRestoreTrip={handleRestoreTrip}
                onDeleteTrip={handleDeleteTrip}
                userEmail={userEmail}
                onSignOut={signOut}
                pwaInstallable={!!deferredPrompt}
                onInstallApp={handleInstallApp}
                onOpenSuperadminPortal={() => setIsTravelerPreview(false)}
                onRequestConfirm={setConfirmRequest}
                onOpenShareTrip={() => setShowShareTrip(true)}
                onOpenTripWrapped={() => setShowTripWrapped(true)}
                baseCurrency={activeTrip?.baseCurrency || ''}
              />
              </div>
            </div>

          </main>
          </TripContentSheet>

          <NavTabs
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            onAddExpense={handleOpenAddExpense}
            onAddMember={isAdmin ? () => setAddMemberSignal((n) => n + 1) : undefined}
            expenseCount={activeTripExpenses.length}
            tripDestination={activeTrip?.destination}
          />
        </div>
      )}

      {showExpenseFilterDrawer && (
        <ExpenseFilterDrawer
          categories={categories}
          members={activeTripMembers}
          resultCount={filteredExpenses.length}
          filterCategory={expenseFilterCategory}
          setFilterCategory={setExpenseFilterCategory}
          filterMember={expenseFilterMember}
          setFilterMember={setExpenseFilterMember}
          filterDateFrom={expenseFilterDateFrom}
          setFilterDateFrom={setExpenseFilterDateFrom}
          filterDateTo={expenseFilterDateTo}
          setFilterDateTo={setExpenseFilterDateTo}
          filterAmountMin={expenseFilterAmountMin}
          setFilterAmountMin={setExpenseFilterAmountMin}
          filterAmountMax={expenseFilterAmountMax}
          setFilterAmountMax={setExpenseFilterAmountMax}
          filterRelation={expenseFilterRelation}
          setFilterRelation={setExpenseFilterRelation}
          filterLocation={expenseFilterLocation}
          setFilterLocation={setExpenseFilterLocation}
          locations={expenseLocations}
          showRelationFilters={!!myMemberId}
          onClearFilters={clearExpenseFilters}
          onClose={() => setShowExpenseFilterDrawer(false)}
        />
      )}

      {showAddExpense && (
        <ExpenseForm
          // The review queue swaps editingExpenseId while the form stays
          // mounted (same conditional render slot) — without a key tied to
          // it, ExpenseForm's fields are seeded from editingExpense only
          // once via useState initializers, so they'd keep showing the
          // previous queue item's data instead of resetting for the next one.
          key={editingExpenseId || 'new'}
          trip={activeTrip}
          visibleMembers={visibleMembers}
          visibleTripGroups={visibleTripGroups}
          categories={categories}
          editingExpense={editingExpense}
          onSave={handleSaveExpense}
          onCancel={handleCancelExpenseForm}
        />
      )}

      {showShareTrip && activeTrip && (
        <ShareTripModal trip={activeTrip} onClose={() => setShowShareTrip(false)} />
      )}



      {selectedReviewExpense && (
        <ExpenseReviewModal
          expense={selectedReviewExpense}
          members={members}
          categories={categories}
          trip={activeTrip}
          canManage={isAdmin || selectedReviewExpense.createdByUserId === userId}
          onClose={() => setSelectedReviewExpense(null)}
          onEdit={() => {
            const exp = selectedReviewExpense;
            setSelectedReviewExpense(null);
            handleStartEditExpense(exp);
          }}
          onDelete={() => {
            const exp = selectedReviewExpense;
            setSelectedReviewExpense(null);
            handleDeleteExpense(exp);
          }}
        />
      )}

      {showGlobalSettings && (
        <GlobalSettingsModal
          onClose={() => setShowGlobalSettings(false)}
          themePref={themePref}
          setThemePref={setThemePref}
          onExportJson={triggerExport}
          showImportArea={showImportArea}
          setShowImportArea={setShowImportArea}
          importJson={importJson}
          setImportJson={setImportJson}
          importStatus={importStatus}
          importErrorMessage={importErrorMessage}
          onImport={handleImport}
          onClearDatabase={handleClearDatabase}
          onLoadDemoTrip={handleLoadDemoTrip}
          archivedTrips={archivedTrips}
          onRestoreTrip={handleRestoreTrip}
          onDeleteTrip={handleDeleteTrip}
          userEmail={userEmail}
          onSignOut={signOut}
          pwaInstallable={!!deferredPrompt}
          onInstallApp={handleInstallApp}
          onRequestConfirm={setConfirmRequest}
          onOpenTripWrapped={() => setShowTripWrapped(true)}
        />
      )}

      <UndoToasts
        pendingDeleteExpense={pendingDeleteExpense}
        onUndoDeleteExpense={handleUndoDelete}
        pendingDeleteTrip={pendingDeleteTrip}
        onUndoDeleteTrip={handleUndoDeleteTrip}
        pendingDeleteGroup={pendingDeleteGroup}
        onUndoDeleteGroup={handleUndoDeleteGroup}
        durationMs={UNDO_DURATION_MS}
      />

      {confirmRequest && (
        <ConfirmDialog request={confirmRequest} onCancel={() => setConfirmRequest(null)} />
      )}

      {/* Command Palette */}
      <CommandPalette
        isOpen={showCommandPalette}
        onClose={() => setShowCommandPalette(false)}
        trip={activeTrip}
        expenses={activeTripExpenses}
        members={visibleMembers}
        categories={categories}
        onSelectExpense={(exp) => handleStartEditExpense(exp)}
        onSelectMember={(mId) => {
          setExpenseFilterMember(mId);
          setActiveTab('expenses');
        }}
        onNewExpense={handleOpenAddExpense}
        onOpenWrapped={() => setShowTripWrapped(true)}
        onOpenSettings={() => setShowGlobalSettings(true)}
        onSwitchTab={(t) => {
          if (t === 'balances') {
            setActiveTab('expenses');
          } else {
            setActiveTab(t);
          }
        }}
      />

      {/* Trip Wrapped Story Card Modal */}
      {showTripWrapped && activeTrip && (
        <TripWrappedModal
          trip={activeTrip}
          expenses={activeTripExpenses}
          members={visibleMembers}
          categories={categories}
          onClose={() => setShowTripWrapped(false)}
        />
      )}

      {/* Trip Squad Achievements & Milestones Modal */}
      {showAchievements && activeTrip && (
        <AchievementBadgeModal
          trip={activeTrip}
          expenses={activeTripExpenses}
          members={visibleMembers}
          categories={categories}
          isFullySettled={transfers.length === 0}
          onClose={() => setShowAchievements(false)}
        />
      )}

      {/* Rendered unconditionally regardless of which screen is active
          (not nested in the web-only header) so it opens the same way on
          native too, reached via the "Notifications" row in Settings
          instead of the header bell button there. */}
      <NotificationsPanel onRequestConfirm={setConfirmRequest} />
      <InAppNotificationBanner />
    </div>
  );
}
