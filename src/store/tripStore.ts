import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Member, Group, Expense, Category, TripState, ExpenseLocation, Trip, TripStop } from '../types';
import type { FeatureFlagKey } from '../types/admin';
import { DEFAULT_FEATURE_FLAGS, isFeatureActive } from '../utils/featureFlags';
import { buildAutoGroupName } from '../utils/groupNaming';
import { newId } from '../utils/uuid';
import { fetchResolvedFeatureFlags, fetchAllFeatureFlagOverrides, setFeatureFlagOverride } from '../services/featureFlagApi';
import { supabase, isMissingSupabaseEnv } from '../services/supabaseClient';
import {
  fetchMyTripGraph,
  fetchExpensesForTrip,
  fetchCategoriesForTrip,
  insertTrip,
  updateTripRow,
  archiveTripRow,
  freezeTripRow,
  deleteTripRow,
  deleteAllMyTrips,
  insertMember,
  updateMemberRow,
  deleteMemberRow,
  insertGroup,
  updateGroupRow,
  deleteGroupRow,
  insertCategory,
  deleteCategoryRow,
  insertExpense,
  updateExpenseRow,
  deleteExpenseRow,
  restoreExpenseRow,
  permanentlyDeleteExpenseRow,
  purgeDeletedExpensesForTrip,
  fetchDeletedExpensesForTrip,
  insertTripGraph,
  uploadReceipt,
  invalidatePreviousMembersCache,
  type ExpenseInput,
} from '../services/tripApi';
import { fetchPlaceCoverImage } from '../services/placeImageService';
import { generateDemoData } from '../utils/demoSeed';
import { reverseGeocode, searchPlaces, resolveTripStopCoordinates } from '../utils/geolocation';
import { sendPushNotification } from '../services/pushApi';
import { saveOfflineReceipt, getOfflineReceipt, deleteOfflineReceipt } from '../services/offlineReceiptStore';
import { validateAndSanitizeBackup } from '../utils/backupValidation';

// Offline capture falls back to a raw-coordinate placeName (see geolocation.ts).
// Once we're syncing (guaranteed online), upgrade it to a real place name.
const COORD_FALLBACK_PATTERN = /^-?\d+\.\d+°, -?\d+\.\d+°$/;

// A manually typed place name (no coords yet, see ExpenseForm's search-place
// fallback) or a raw-coordinate placeName captured while offline both need a
// network round trip to finish resolving. processQueue runs only when online,
// so this is the one place it's safe to do it.
export async function resolvePendingLocation(location: ExpenseLocation | null | undefined): Promise<ExpenseLocation | null | undefined> {
  if (!location) return location;

  if (location.pendingName) {
    const results = await searchPlaces(location.pendingName);
    if (results.length > 0) {
      return { lat: results[0].lat, lng: results[0].lng, placeName: results[0].placeName };
    }
    return { ...location, locationUnresolved: true };
  }

  if (location.placeName && COORD_FALLBACK_PATTERN.test(location.placeName)) {
    const placeName = await reverseGeocode(location.lat, location.lng);
    return { ...location, placeName };
  }

  return location;
}

type SyncQueueItemType =
  | 'addExpense'
  | 'updateExpense'
  | 'deleteExpense'
  | 'restoreExpense'
  | 'permanentlyDeleteExpense'
  | 'emptyRecycleBin'
  | 'createTrip'
  | 'addMember'
  | 'updateMember'
  | 'toggleArchiveMember'
  | 'deleteMember'
  | 'createGroup'
  | 'updateGroup'
  | 'deleteGroup'
  | 'addCategory'
  | 'deleteCategory';

interface SyncQueueItem {
  id: string;
  type: SyncQueueItemType;
  payload: any;
}

interface TripStore extends TripState {
  initialized: boolean;
  storageError: string | null;
  userId: string | null;
  userDisplayName: string | null;
  syncQueue: SyncQueueItem[];
  lastBackendSyncedAt: number | null;
  sessionExpired: boolean;
  lastModifiedAt: number;
  enableGeotagging: boolean;
  setEnableGeotagging: (enabled: boolean) => void;

  // Superadmin & Feature Flags
  isSuperadmin: boolean;
  featureFlags: Record<FeatureFlagKey, boolean>;
  tripFlagOverrides: Record<string, Record<string, boolean>>;
  userFlagOverrides: Record<string, Record<string, boolean>>;
  setIsSuperadmin: (value: boolean) => void;
  lockSuperadmin: () => void;
  setUserIdentity: (userId: string, displayName: string | null) => void;
  setFeatureFlag: (key: FeatureFlagKey, value: boolean) => Promise<void>;
  setTripFlagOverride: (tripId: string, key: FeatureFlagKey, value: boolean | null) => Promise<void>;
  setUserFlagOverride: (userId: string, key: FeatureFlagKey, value: boolean | null) => Promise<void>;
  resetFeatureFlags: () => Promise<void>;
  isFeatureEnabled: (key: FeatureFlagKey, context?: { tripId?: string; userId?: string }) => boolean;
  // Pulls this user's resolved flags (global + their trip + their own
  // overrides) from Supabase -- see migration 0064. featureFlags/
  // tripFlagOverrides/userFlagOverrides were previously local-only
  // (zustand persist), so a superadmin toggling a flag on one device
  // never reached any other device at all.
  loadFeatureFlags: (tripId?: string | null) => Promise<void>;
  // Superadmin-only: loads every trip's/user's overrides at once, for the
  // Ops Deck's Per-Trip/Per-Member override panels.
  loadAllFeatureFlagOverrides: () => Promise<void>;

  initialize: () => Promise<void>;
  refreshTrips: (force?: boolean) => Promise<void>;
  refreshActiveTripExpenses: () => Promise<void>;
  clearStorageError: () => void;
  processQueue: () => Promise<void>;
  queueSync: (type: SyncQueueItemType, payload: any) => void;
  updateLastBackendSyncedAt: (timestamp: number) => void;

  // Trip Actions
  createTrip: (name: string, startDate: string, endDate: string, baseCurrency: string, destination?: string, stops?: TripStop[]) => Promise<void>;
  updateTrip: (id: string, name: string, startDate: string, endDate: string, destination?: string, stops?: TripStop[]) => Promise<void>;
  selectTrip: (id: string | null) => Promise<void>;
  archiveTrip: (id: string, archived: boolean) => Promise<void>;
  freezeTrip: (id: string, frozen: boolean) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;

  // Member Actions
  addMember: (name: string, linkedUserId?: string | null) => Promise<void>;
  toggleArchiveMember: (id: string) => Promise<void>;
  updateMember: (id: string, name: string) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;
  setMemberAdminRole: (memberId: string, isAdmin: boolean) => Promise<void>;

  // Group Actions
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  updateGroup: (id: string, name: string, memberIds: string[]) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt' | 'isSettlement' | 'createdByUserId'>) => Promise<void>;
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt' | 'isSettlement' | 'createdByUserId'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Recycle Bin
  deletedExpenses: Expense[];
  fetchDeletedExpenses: () => Promise<void>;
  restoreExpense: (id: string) => Promise<void>;
  permanentlyDeleteExpense: (id: string) => Promise<void>;
  emptyRecycleBin: () => Promise<void>;

  // Category Actions
  addCategory: (name: string, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  updateCategoryKeywords: (categoryId: string, keywords: string[]) => Promise<void>;
  resetCategoryKeywords: (categoryId: string) => Promise<void>;

  // Database Backup Actions
  exportDatabase: () => string;
  importDatabase: (jsonString: string) => Promise<{ success: boolean; error?: string }>;
  clearDatabase: () => Promise<void>;
  loadDemoTrip: () => Promise<void>;
}


export const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
  { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨', isCustom: false },
  { id: 'cat-travel', name: 'Travel & Transport', icon: '✈️', isCustom: false },
  { id: 'cat-activities', name: 'Activities & Sightseeing', icon: '🎟️', isCustom: false },
  { id: 'cat-shopping', name: 'Shopping', icon: '🛍️', isCustom: false },
  { id: 'cat-misc', name: 'Misc & Others', icon: '📦', isCustom: false },
];

// Pure helper — resolves exact money shares for each participant
const resolveShares = (
  expenseData: { amount: number; splitMode: string; splitConfig?: Record<string, number>; paidBy: string },
  participants: string[]
): Record<string, number> => {
  const resolvedShares: Record<string, number> = {};
  const { amount, splitMode, splitConfig, paidBy } = expenseData;

  const applyRounding = (shares: Record<string, number>) => {
    const sum = Object.values(shares).reduce((a, b) => a + b, 0);
    const diff = Number((amount - sum).toFixed(2));
    if (diff !== 0) {
      const roundTarget = participants.includes(paidBy) ? paidBy : participants[0];
      if (roundTarget) {
        shares[roundTarget] = Number((shares[roundTarget] + diff).toFixed(2));
      }
    }
    return shares;
  };

  if (splitMode === 'equal') {
    const share = Number((amount / participants.length).toFixed(2));
    participants.forEach((id) => { resolvedShares[id] = share; });
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'custom') {
    const config = splitConfig || {};
    const totalWeight = participants.reduce((sum, id) => sum + (config[id] || 1), 0);
    if (totalWeight <= 0) {
      const share = Number((amount / participants.length).toFixed(2));
      participants.forEach((id) => { resolvedShares[id] = share; });
    } else {
      participants.forEach((id) => {
        resolvedShares[id] = Number((((config[id] || 1) / totalWeight) * amount).toFixed(2));
      });
    }
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'exact') {
    const config = splitConfig || {};
    participants.forEach((id) => {
      resolvedShares[id] = Number((config[id] || 0).toFixed(2));
    });
    return applyRounding(resolvedShares);
  }

  if (splitMode === 'percentage') {
    const config = splitConfig || {};
    participants.forEach((id) => {
      resolvedShares[id] = Number((((config[id] || 0) / 100) * amount).toFixed(2));
    });
    return applyRounding(resolvedShares);
  }

  return resolvedShares;
};

// IDs of expenses with a mutation still sitting in the offline queue —
// addExpense uses a client-generated tempId as payload.id, everything
// else (update/delete/restore/permanentlyDelete) carries the real id.
// These must never be silently overwritten by a server refetch, since
// the server doesn't know about them yet.
export function collectDirtyExpenseIds(syncQueue: { type: string; payload: any }[]): Set<string> {
  const ids = new Set<string>();
  for (const item of syncQueue) {
    if (item.type === 'addExpense' && item.payload?.tempId) {
      ids.add(item.payload.tempId);
    } else if (item.payload?.id) {
      ids.add(item.payload.id);
    }
  }
  return ids;
}

// Scopes push-notification recipients to the members of ONE trip.
// `members` (the store's flat Record<string, Member>) spans every trip
// the user belongs to, not just the active one — filtering it directly
// (as both addExpense's online save and processQueue's offline replay
// used to) leaks recipients from unrelated trips. Go through the trip's
// own memberIds instead, same as `activeTripMembers` does in App.tsx.
export function getTripNotificationRecipients(
  trips: Trip[],
  members: Record<string, Member>,
  tripId: string,
  excludeUserId: string
): string[] {
  const trip = trips.find((t) => t.id === tripId);
  return (trip?.memberIds ?? [])
    .map((id) => members[id])
    .filter((m): m is Member => !!m && !m.archived && !!m.linkedUserId && m.linkedUserId !== excludeUserId)
    .map((m) => m.linkedUserId as string);
}

// A restored backup may include trips the importing user only joined (via
// someone else's join code), not trips they own. Clear All Data / delete is
// owner-scoped (deleteAllMyTrips deletes `where owner_id = userId` only), so
// a joined trip is never actually removed from the account — re-inserting it
// here on import would just duplicate it under the importer's ownership.
// When existingTripIds is provided, trips already active in the account are
// skipped. Otherwise, legacy backups with no ownerId or matching ownerId are kept.
export function filterTripsOwnedByUser(trips: Trip[], userId: string, existingTripIds?: string[]): Trip[] {
  if (existingTripIds && existingTripIds.length > 0) {
    return trips.filter((t) => !existingTripIds.includes(t.id));
  }
  return trips.filter((t) => !t.ownerId || t.ownerId === userId);
}

const TRIPS_REFRESH_MIN_INTERVAL_MS = 30_000;
let lastTripsRefreshAt = 0;

// Reconciles a fresh server fetch for one trip against the locally
// cached (persisted) expense list, without disturbing other trips'
// cached data and without clobbering locally-dirty rows (pending
// queue items the server hasn't seen yet).
export function mergeServerExpenses(
  localExpenses: Expense[],
  serverExpenses: Expense[],
  tripId: string,
  dirtyIds: Set<string>
): Expense[] {
  const otherTrips = localExpenses.filter((e) => e.tripId !== tripId);
  const localDirtyForTrip = localExpenses.filter((e) => e.tripId === tripId && dirtyIds.has(e.id));
  const cleanServerForTrip = serverExpenses.filter((e) => !dirtyIds.has(e.id));
  return [...otherTrips, ...cleanServerForTrip, ...localDirtyForTrip].sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );
}

// Wraps localStorage so a write failure (most commonly QuotaExceededError,
// e.g. an offline session queued several receipt photos and blew the
// origin's storage cap) surfaces to the user instead of silently vanishing
// — without this, the app would look like it saved an expense that was
// actually never persisted and is gone on next reload.
const quotaSafeStorage = {
  getItem: (name: string) => localStorage.getItem(name),
  removeItem: (name: string) => localStorage.removeItem(name),
  setItem: (name: string, value: string) => {
    try {
      localStorage.setItem(name, value);
    } catch (e) {
      console.error('Failed to persist trip data locally:', e);
      const message =
        e instanceof DOMException && e.name === 'QuotaExceededError'
          ? "Your device's local storage is full — recent changes may not be saved. Free up space or back up your data from Settings."
          : 'Failed to save your changes locally.';
      // Guard against re-triggering this same failing write: setting
      // storageError itself goes through this same storage layer, and an
      // unconditional set() here would recurse forever on a persistent
      // quota error. Skipping once the message already matches converges
      // after exactly one redundant (also-failing, harmless) retry.
      if (useTripStore.getState().storageError !== message) {
        useTripStore.setState({ storageError: message });
      }
    }
  },
};

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => {
  const setError = (e: unknown) => {
    // If the device is offline, Supabase env isn't configured, or we're in
    // local demo mode, suppress network errors — all three are expected to
    // run without a reachable backend. A real superadmin session (see
    // 0057_superadmin_identity_and_rls.sql) surfaces errors like any user.
    const isDemo = get().userId === 'demo-user-superadmin';
    if (!navigator.onLine || isMissingSupabaseEnv || isDemo) {
      console.warn('Trip store operation offline/demo/local (deferred/cached):', e);
      return;
    }
    console.error('Trip store sync error:', e);
    set({ storageError: e instanceof Error ? e.message : 'Failed to sync with the server.' });
  };

  const toExpenseInput = (
    e: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt' | 'isSettlement' | 'createdByUserId'>,
    resolvedShares: Record<string, number>,
    extra?: { id?: string; receiptPath?: string }
  ): ExpenseInput => ({
    id: extra?.id,
    title: e.title,
    amount: e.amount,
    currency: e.currency,
    category: e.category,
    date: e.date,
    paidBy: e.paidBy,
    splitMode: e.splitMode,
    splitMemberIds: e.splitMemberIds,
    splitConfig: e.splitConfig,
    resolvedShares,
    receiptPath: extra?.receiptPath,
    location: e.location ?? null,
  });

  return {
    trips: [],
    activeTripId: null,
    members: {},
    groups: {},
    expenses: [],
    deletedExpenses: [],
    categories: DEFAULT_CATEGORIES,
    initialized: false,
    storageError: null,
    userId: null,
    userDisplayName: null,
    syncQueue: [],
    lastBackendSyncedAt: null,
    sessionExpired: false,
    lastModifiedAt: Date.now(),
    enableGeotagging: false,

    // Superadmin & Feature Flags
    isSuperadmin: false,
    featureFlags: DEFAULT_FEATURE_FLAGS,
    tripFlagOverrides: {},
    userFlagOverrides: {},

    // Trusts the caller: authStore's signInSuperadmin only calls this after
    // Supabase's is_superadmin() RPC confirms the real, signed-in session is
    // in the superadmins table (see supabase/migrations/0045). This store
    // never verifies credentials itself.
    setIsSuperadmin: (value: boolean) => {
      set((s) => ({
        isSuperadmin: value,
        userId: value ? s.userId || 'superadmin-root-user-id' : s.userId,
        userDisplayName: value ? s.userDisplayName || 'Super Admin' : s.userDisplayName,
        lastModifiedAt: Date.now(),
      }));
    },

    setUserIdentity: (userId: string, displayName: string | null) => {
      set({ userId, userDisplayName: displayName, lastModifiedAt: Date.now() });
    },

    lockSuperadmin: () => {
      set({ isSuperadmin: false, lastModifiedAt: Date.now() });
    },

    // Optimistic: local state updates immediately so the Ops Deck toggle
    // feels instant, then the RPC persists it (migration 0064) so every
    // other device picks it up next time it calls loadFeatureFlags(). On
    // RPC failure this deliberately doesn't roll back -- console.error is
    // enough for an admin-only action the superadmin can just retry.
    setFeatureFlag: async (key: FeatureFlagKey, value: boolean) => {
      set((s) => ({
        featureFlags: { ...s.featureFlags, [key]: value },
        lastModifiedAt: Date.now(),
      }));
      try {
        await setFeatureFlagOverride('global', '', key, value);
      } catch (e) {
        console.error('Failed to persist global feature flag:', e);
      }
    },

    setTripFlagOverride: async (tripId: string, key: FeatureFlagKey, value: boolean | null) => {
      set((s) => {
        const existing = { ...(s.tripFlagOverrides[tripId] || {}) };
        if (value === null) delete existing[key];
        else existing[key] = value;
        return {
          tripFlagOverrides: { ...s.tripFlagOverrides, [tripId]: existing },
          lastModifiedAt: Date.now(),
        };
      });
      try {
        await setFeatureFlagOverride('trip', tripId, key, value);
      } catch (e) {
        console.error('Failed to persist trip feature flag override:', e);
      }
    },

    setUserFlagOverride: async (userId: string, key: FeatureFlagKey, value: boolean | null) => {
      set((s) => {
        const existing = { ...(s.userFlagOverrides[userId] || {}) };
        if (value === null) delete existing[key];
        else existing[key] = value;
        return {
          userFlagOverrides: { ...s.userFlagOverrides, [userId]: existing },
          lastModifiedAt: Date.now(),
        };
      });
      try {
        await setFeatureFlagOverride('user', userId, key, value);
      } catch (e) {
        console.error('Failed to persist user feature flag override:', e);
      }
    },

    resetFeatureFlags: async () => {
      set({
        featureFlags: DEFAULT_FEATURE_FLAGS,
        tripFlagOverrides: {},
        userFlagOverrides: {},
        lastModifiedAt: Date.now(),
      });
      try {
        const all = await fetchAllFeatureFlagOverrides();
        await Promise.all(all.filter((o) => o.scope === 'global').map((o) => setFeatureFlagOverride('global', '', o.flagKey, null)));
      } catch (e) {
        console.error('Failed to clear global feature flag overrides:', e);
      }
    },

    loadFeatureFlags: async (tripId?: string | null) => {
      try {
        const effectiveTripId = tripId !== undefined ? tripId : get().activeTripId;
        const resolved = await fetchResolvedFeatureFlags(effectiveTripId ?? null);
        if (!resolved) return;
        const userId = get().userId;
        set((s) => ({
          featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...resolved.global },
          tripFlagOverrides: effectiveTripId ? { ...s.tripFlagOverrides, [effectiveTripId]: resolved.trip } : s.tripFlagOverrides,
          userFlagOverrides: userId ? { ...s.userFlagOverrides, [userId]: resolved.user } : s.userFlagOverrides,
        }));
      } catch (e) {
        console.warn('Failed to load feature flags (using cached values):', e);
      }
    },

    loadAllFeatureFlagOverrides: async () => {
      try {
        const all = await fetchAllFeatureFlagOverrides();
        const tripFlagOverrides: Record<string, Record<string, boolean>> = {};
        const userFlagOverrides: Record<string, Record<string, boolean>> = {};
        let globalFlags: Record<string, boolean> = {};
        for (const o of all) {
          if (o.scope === 'global') {
            globalFlags = { ...globalFlags, [o.flagKey]: o.value };
          } else if (o.scope === 'trip') {
            tripFlagOverrides[o.scopeId] = { ...(tripFlagOverrides[o.scopeId] || {}), [o.flagKey]: o.value };
          } else if (o.scope === 'user') {
            userFlagOverrides[o.scopeId] = { ...(userFlagOverrides[o.scopeId] || {}), [o.flagKey]: o.value };
          }
        }
        set({
          featureFlags: { ...DEFAULT_FEATURE_FLAGS, ...globalFlags },
          tripFlagOverrides,
          userFlagOverrides,
        });
      } catch (e) {
        console.warn('Failed to load all feature flag overrides:', e);
      }
    },

    isFeatureEnabled: (key: FeatureFlagKey, context?: { tripId?: string; userId?: string }) => {
      const s = get();
      return isFeatureActive(key, s.featureFlags, {
        isSuperadmin: s.isSuperadmin,
        tripId: context?.tripId || s.activeTripId || undefined,
        userId: context?.userId || s.userId || undefined,
        tripOverrides: s.tripFlagOverrides,
        userOverrides: s.userFlagOverrides,
      });
    },

    setEnableGeotagging: (enabled: boolean) => {
      set((s) => ({
        enableGeotagging: enabled,
        featureFlags: { ...s.featureFlags, enableGeotagging: enabled },
        lastModifiedAt: Date.now(),
      }));
    },

    updateLastBackendSyncedAt: (timestamp: number) => {
      set({ lastBackendSyncedAt: timestamp });
    },

    // Trip data is rehydrated from localStorage (via the zustand `persist`
    // middleware) synchronously before this ever runs, so there's real
    // data on screen immediately regardless of connectivity. This only
    // needs to resolve the current user and, if online, reconcile that
    // cached data against the server.
    initialize: async () => {
      if (get().initialized) return;

      // Registered unconditionally — a session that starts offline must
      // still auto-sync the moment connectivity returns, rather than only
      // wiring this up inside the network-fetch success path below.
      window.addEventListener('online', () => {
        get().processQueue();
      });

      // getSession() reads the persisted local session (no network round
      // trip) — unlike getUser(), which calls the Auth server and would
      // hang indefinitely if the app boots while offline.
      const { data: { session } } = await supabase.auth.getSession();
      const user = session?.user;
      const userId = user?.id ?? null;
      const userDisplayName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        user?.email?.split('@')[0] ||
        null;

      if (userId === 'demo-user-superadmin' || !navigator.onLine || isMissingSupabaseEnv) {
        set({ userId, userDisplayName, initialized: true, storageError: null });
        return;
      }

      try {
        const graph = await fetchMyTripGraph();
        const activeTripId = get().activeTripId;
        const activeTrip = activeTripId ? graph.trips.find((t) => t.id === activeTripId) : undefined;

        if (activeTrip) {
          const [serverExpenses, customCategories] = await Promise.all([
            fetchExpensesForTrip(activeTrip.id),
            fetchCategoriesForTrip(activeTrip.id),
          ]);
          const dirtyIds = collectDirtyExpenseIds(get().syncQueue);
          set((state) => ({
            expenses: mergeServerExpenses(state.expenses, serverExpenses, activeTrip.id, dirtyIds),
            categories: [...DEFAULT_CATEGORIES, ...customCategories],
          }));
        }

        set({
          ...graph,
          activeTripId: activeTrip ? activeTrip.id : null,
          userId,
          userDisplayName,
          initialized: true,
          storageError: null,
        });

        void get().loadFeatureFlags();

        if (get().syncQueue.length > 0) {
          get().processQueue();
        }
      } catch (e) {
        console.warn('Initial trip load failed or offline:', e);
        set({
          userId,
          userDisplayName,
          initialized: true,
          storageError: (navigator.onLine && !isMissingSupabaseEnv) ? 'Failed to load your trips. Check your connection and reload.' : null,
        });
      }
    },

    // Re-pulls the trip/member/group list without disturbing the active
    // trip's loaded expenses/categories — used after joining a new trip via
    // an invite link, since that trip won't be in `trips` yet, and by a
    // realtime "you were added to a trip" notification. Throttled since a
    // pull/swipe gesture can trigger this repeatedly in quick succession
    // and there's rarely anything new within a few seconds of the last
    // fetch.
    refreshTrips: async (force?: boolean) => {
      const now = Date.now();
      if (!force && now - lastTripsRefreshAt < TRIPS_REFRESH_MIN_INTERVAL_MS) return;
      lastTripsRefreshAt = now;
      try {
        const graph = await fetchMyTripGraph();
        set({ ...graph, storageError: null });
      } catch (e) {
        setError(e);
      }
    },

    // Re-pulls the active trip's expenses/categories — used when a
    // realtime notification signals someone else changed an expense on
    // the trip currently being viewed (see notificationsStore.ts), so
    // that shows up live instead of only after a manual reload.
    refreshActiveTripExpenses: async () => {
      const tripId = get().activeTripId;
      if (!tripId || !navigator.onLine) return;
      try {
        const [serverExpenses, customCategories] = await Promise.all([
          fetchExpensesForTrip(tripId),
          fetchCategoriesForTrip(tripId),
        ]);
        const dirtyIds = collectDirtyExpenseIds(get().syncQueue);
        set((state) => ({
          expenses: mergeServerExpenses(state.expenses, serverExpenses, tripId, dirtyIds),
          categories: [...DEFAULT_CATEGORIES, ...customCategories],
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },

    clearStorageError: () => set({ storageError: null }),

    queueSync: (type, payload) => {
      const newQueue = [...get().syncQueue, { id: newId(), type, payload }];
      set({ syncQueue: newQueue, lastModifiedAt: Date.now() });
    },


    processQueue: async () => {
      if (!navigator.onLine) return;

      // A device offline longer than the access token's lifetime comes
      // back with a stale token — retrying queued items against it would
      // fail identically forever. Refresh (or fail loud) before spending
      // any retries.
      const { data: { session } } = await supabase.auth.getSession();
      const isExpired = !session || (session.expires_at ? session.expires_at * 1000 < Date.now() : false);
      if (isExpired) {
        const { data, error } = await supabase.auth.refreshSession();
        if (error || !data.session) {
          set({ sessionExpired: true });
          return;
        }
      }
      set({ sessionExpired: false });

      if (get().syncQueue.length === 0) return;
      const queue = [...get().syncQueue];
      set({ syncQueue: [] });

      for (const item of queue) {
        try {
          if (item.type === 'addExpense') {
            const { tempId, expenseData } = item.payload;
            const tripId = get().activeTripId;
            const userId = get().userId;
            if (tripId && userId) {
              const participants = expenseData.splitMemberIds.filter((id: string) => get().members[id] && !get().members[id].archived);
              const resolvedShares = resolveShares(expenseData, participants);
              // The receipt photo may have been staged in IndexedDB instead
              // of traveling inline (see addExpense) — only deleted below
              // once the WHOLE item succeeds, so a later failure in this
              // same try block (e.g. insertExpense) doesn't lose the photo
              // on retry.
              const offlineReceipt = await getOfflineReceipt(tempId);
              let receiptPath: string | undefined;
              if (offlineReceipt) {
                receiptPath = await uploadReceipt(tripId, tempId, offlineReceipt);
              } else if (expenseData.receiptImage) {
                receiptPath = await uploadReceipt(tripId, tempId, expenseData.receiptImage);
              }
              const location = await resolvePendingLocation(expenseData.location);
              const savedExpense = await insertExpense(tripId, userId, toExpenseInput({ ...expenseData, location }, resolvedShares, { id: tempId, receiptPath }));
              set((state) => ({
                expenses: state.expenses.map((e) => (e.id === tempId ? savedExpense : e)),
                trips: state.trips.map((t) => (t.id === tripId ? { ...t, updatedAt: Date.now() } : t)),
              }));
              if (offlineReceipt) await deleteOfflineReceipt(tempId);

              const trip = get().trips.find((t) => t.id === tripId);
              const recipients = getTripNotificationRecipients(get().trips, get().members, tripId, userId);
              sendPushNotification(
                recipients,
                trip?.name || 'Trip Tracker',
                'expense_added',
                { expenseTitle: savedExpense.title, amount: savedExpense.amount.toFixed(2), currency: savedExpense.currency },
                tripId
              );
            }
          } else if (item.type === 'updateExpense') {
            const { id, expenseData } = item.payload;
            const tripId = get().activeTripId;
            if (tripId) {
              const participants = expenseData.splitMemberIds.filter((mId: string) => get().members[mId] && !get().members[mId].archived);
              const resolvedShares = resolveShares(expenseData, participants);
              const offlineReceipt = await getOfflineReceipt(id);
              let receiptPath: string | undefined;
              if (offlineReceipt) {
                receiptPath = await uploadReceipt(tripId, id, offlineReceipt);
              } else if (expenseData.receiptImage) {
                receiptPath = await uploadReceipt(tripId, id, expenseData.receiptImage);
              }
              const location = await resolvePendingLocation(expenseData.location);
              await updateExpenseRow(id, toExpenseInput({ ...expenseData, location }, resolvedShares, { receiptPath }));
              set((state) => ({
                expenses: state.expenses.map((e) => (e.id === id ? { ...e, location: location ?? undefined } : e)),
              }));
              if (offlineReceipt) await deleteOfflineReceipt(id);
            }
          } else if (item.type === 'deleteExpense') {
            const { id, userId: deletedByUserId } = item.payload;
            await deleteExpenseRow(id, deletedByUserId || '');
          } else if (item.type === 'restoreExpense') {
            const { id } = item.payload;
            await restoreExpenseRow(id);
          } else if (item.type === 'permanentlyDeleteExpense') {
            const { id } = item.payload;
            await permanentlyDeleteExpenseRow(id);
          } else if (item.type === 'emptyRecycleBin') {
            const { tripId } = item.payload;
            await purgeDeletedExpensesForTrip(tripId);
          } else if (item.type === 'createTrip') {
            const { tripTempId, memberTempId, name, startDate, endDate, baseCurrency, destination, ownerId, creatorName } = item.payload;
            const trip = await insertTrip({ name, startDate, endDate, baseCurrency, destination, ownerId, id: tripTempId });
            const creatorMember = await insertMember(trip.id, creatorName, ownerId, memberTempId);
            set((state) => ({
              trips: state.trips.map((t) => (t.id === tripTempId ? { ...trip, memberIds: [memberTempId], adminMemberIds: [memberTempId], expenseCount: 0 } : t)),
              members: { ...state.members, [memberTempId]: creatorMember },
            }));
          } else if (item.type === 'addMember') {
            const { tempId, name, linkedUserId, tripId } = item.payload;
            const member = await insertMember(tripId, name, linkedUserId || undefined, tempId);
            invalidatePreviousMembersCache();
            set((state) => ({ members: { ...state.members, [tempId]: member } }));
          } else if (item.type === 'updateMember') {
            const { id, name } = item.payload;
            await updateMemberRow(id, { name });
          } else if (item.type === 'toggleArchiveMember') {
            const { id, archived } = item.payload;
            await updateMemberRow(id, { archived });
          } else if (item.type === 'deleteMember') {
            const { id, groupsToDissolve, groupsToRename } = item.payload;
            await deleteMemberRow(id);
            await Promise.all([
              ...groupsToDissolve.map((gid: string) => deleteGroupRow(gid)),
              ...groupsToRename.map((g: { id: string; name: string; memberIds: string[] }) => updateGroupRow(g.id, g.name, g.memberIds)),
            ]);
          } else if (item.type === 'createGroup') {
            const { tempId, name, memberIds, tripId } = item.payload;
            const group = await insertGroup(tripId, name, memberIds, tempId);
            set((state) => ({ groups: { ...state.groups, [tempId]: group } }));
          } else if (item.type === 'updateGroup') {
            const { id, name, memberIds } = item.payload;
            await updateGroupRow(id, name, memberIds);
          } else if (item.type === 'deleteGroup') {
            const { groupId } = item.payload;
            await deleteGroupRow(groupId);
          } else if (item.type === 'addCategory') {
            const { tempId, name, icon, tripId } = item.payload;
            const category = await insertCategory(tripId, name, icon, tempId);
            set((state) => ({ categories: state.categories.map((c) => (c.id === tempId ? category : c)) }));
          } else if (item.type === 'deleteCategory') {
            const { id } = item.payload;
            await deleteCategoryRow(id);
          }
        } catch (err) {
          console.error('Offline sync failed for item:', item, err);
          set((state) => ({ syncQueue: [...state.syncQueue, item] }));
        }
      }

      if (get().syncQueue.length === 0) {
        get().updateLastBackendSyncedAt(Date.now());
      }
    },

    createTrip: async (name, startDate, endDate, baseCurrency, destination, stops) => {
      const userId = get().userId || (get().isSuperadmin ? 'superadmin-root-user-id' : 'guest-traveler-user-id');
      const cleanDestination = destination?.trim() || (stops && stops.length > 0 ? stops.map((s) => s.name).join(' → ') : undefined);
      const cleanStops = stops && stops.length > 0 ? stops : undefined;

      // Asynchronous background cover photo fetcher
      const triggerCoverFetch = (targetTripId: string, placeQuery: string) => {
        fetchPlaceCoverImage(placeQuery)
          .then((coverUrl) => {
            if (coverUrl) {
              set((state) => ({
                trips: state.trips.map((t) => (t.id === targetTripId ? { ...t, coverImageUrl: coverUrl } : t)),
              }));
            }
          })
          .catch(() => {});
      };

      const resolveStopCoordinates = async (targetTripId: string, stopsList: TripStop[]) => {
        const resolved = await resolveTripStopCoordinates(stopsList, { useDeviceLocation: get().enableGeotagging });
        const updated = resolved.some((s, i) => s.lat !== stopsList[i].lat || s.lng !== stopsList[i].lng);
        if (updated) {
          set((state) => ({
            trips: state.trips.map((t) => (t.id === targetTripId ? { ...t, stops: resolved } : t)),
          }));
        }
      };

      // No real backend to sync against at all — skip the offline sync
      // queue entirely (it could never flush) and create the trip as a
      // fully local record, same as the dummy-Supabase fallback elsewhere.
      if (isMissingSupabaseEnv) {
        const tripId = newId();
        const creatorName = get().userDisplayName || (get().isSuperadmin ? 'Super Admin' : 'Me');
        const creatorMemberId = newId();
        const creatorMember: Member = {
          id: creatorMemberId,
          name: creatorName,
          linkedUserId: userId,
        };
        const newTrip: Trip = {
          id: tripId,
          name,
          startDate,
          endDate,
          baseCurrency,
          ownerId: userId,
          adminMemberIds: [creatorMemberId],
          joinCode: Math.random().toString(36).substring(2, 8).toUpperCase(),
          memberIds: [creatorMemberId],
          groupIds: [],
          createdAt: Date.now(),
          updatedAt: Date.now(),
          expenseCount: 0,
          destination: cleanDestination,
          stops: cleanStops,
        };

        set((state) => ({
          trips: [...state.trips, newTrip],
          members: { ...state.members, [creatorMemberId]: creatorMember },
          activeTripId: tripId,
          categories: DEFAULT_CATEGORIES,
          storageError: null,
        }));

        if (cleanDestination || name) {
          triggerCoverFetch(tripId, cleanDestination || name);
        }
        if (cleanStops && cleanStops.length > 0) {
          resolveStopCoordinates(tripId, cleanStops);
        }
        return;
      }

      // The creator is always the owner and admin — add them as a claimed
      // member too, so they show up in the members list and can be a
      // payer/split participant like everyone else.
      const creatorName = get().userDisplayName || 'Me';
      const tripTempId = newId();
      const memberTempId = newId();

      const optimisticMember: Member = { id: memberTempId, name: creatorName, linkedUserId: userId };
      const optimisticTrip: Trip = {
        id: tripTempId,
        name,
        startDate,
        endDate,
        baseCurrency,
        memberIds: [memberTempId],
        groupIds: [],
        ownerId: userId,
        adminMemberIds: [memberTempId],
        joinCode: '', // real code assigned server-side once synced
        createdAt: Date.now(),
        updatedAt: Date.now(),
        expenseCount: 0,
        destination: cleanDestination,
        stops: cleanStops,
      };

      set((state) => ({
        trips: [...state.trips, optimisticTrip],
        members: { ...state.members, [memberTempId]: optimisticMember },
        activeTripId: tripTempId,
        categories: DEFAULT_CATEGORIES,
        storageError: null,
      }));

      if (cleanDestination || name) {
        triggerCoverFetch(tripTempId, cleanDestination || name);
      }
      if (cleanStops && cleanStops.length > 0) {
        resolveStopCoordinates(tripTempId, cleanStops);
      }

      if (!navigator.onLine) {
        get().queueSync('createTrip', { tripTempId, memberTempId, name, startDate, endDate, baseCurrency, destination, ownerId: userId, creatorName });
      } else {
        try {
          const trip = await insertTrip({ name, startDate, endDate, baseCurrency, destination: cleanDestination, ownerId: userId, id: tripTempId, stops: cleanStops });
          const creatorMember = await insertMember(trip.id, creatorName, userId, memberTempId);
          set((state) => ({
            trips: state.trips.map((t) => (t.id === tripTempId ? { ...trip, memberIds: [memberTempId], adminMemberIds: [memberTempId], expenseCount: 0, destination: cleanDestination, stops: cleanStops } : t)),
            members: { ...state.members, [memberTempId]: creatorMember },
          }));
        } catch (e) {
          console.warn('Online createTrip failed, falling back to offline sync queue:', e);
          get().queueSync('createTrip', { tripTempId, memberTempId, name, startDate, endDate, baseCurrency, destination, ownerId: userId, creatorName });
        }
      }
    },

    updateTrip: async (id, name, startDate, endDate, destination, stops) => {
      const cleanDestination = destination?.trim() || (stops && stops.length > 0 ? stops.map((s) => s.name).join(' → ') : undefined);
      const cleanStops = stops && stops.length > 0 ? stops : undefined;
      try {
        await updateTripRow(id, { name, startDate, endDate, destination: cleanDestination, stops: cleanStops });
        set((state) => ({
          trips: state.trips.map((t) => (t.id === id ? { ...t, name, startDate, endDate, destination: cleanDestination, stops: cleanStops, updatedAt: Date.now() } : t)),
          storageError: null,
        }));

        if (cleanDestination || name) {
          fetchPlaceCoverImage(cleanDestination || name)
            .then((coverUrl) => {
              if (coverUrl) {
                set((state) => ({
                  trips: state.trips.map((t) => (t.id === id ? { ...t, coverImageUrl: coverUrl } : t)),
                }));
              }
            })
            .catch(() => {});
        }

        if (cleanStops && cleanStops.length > 0) {
          resolveTripStopCoordinates(cleanStops, { useDeviceLocation: get().enableGeotagging }).then((resolved) => {
            set((state) => ({
              trips: state.trips.map((t) => (t.id === id ? { ...t, stops: resolved } : t)),
            }));
          });
        }
      } catch (e) {
        setError(e);
      }
    },

    selectTrip: async (id) => {
      if (id === null) {
        set({ activeTripId: null, deletedExpenses: [] });
        return;
      }
      // Switch instantly using whatever's cached locally for this trip —
      // no wipe-then-refetch. If we're offline, this is all we can show,
      // and it's correct: filtered by tripId downstream, a trip with no
      // cached data yet just renders empty rather than losing data for a
      // trip we DO have cached (e.g. switching back to it later).
      set({ activeTripId: id, deletedExpenses: [] });
      if (!navigator.onLine) return;
      void get().loadFeatureFlags(id);
      try {
        const [serverExpenses, customCategories] = await Promise.all([fetchExpensesForTrip(id), fetchCategoriesForTrip(id)]);
        const dirtyIds = collectDirtyExpenseIds(get().syncQueue);
        set((state) => ({
          expenses: mergeServerExpenses(state.expenses, serverExpenses, id, dirtyIds),
          categories: [...DEFAULT_CATEGORIES, ...customCategories],
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },

    archiveTrip: async (id, archived) => {
      if (!isMissingSupabaseEnv) {
        try {
          await archiveTripRow(id, archived);
        } catch (e) {
          setError(e);
          return;
        }
      }

      set((state) => ({
        trips: state.trips.map((t) => (t.id === id ? { ...t, archived, updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      if (archived && get().activeTripId === id) {
        const next = get().trips.find((t) => t.id !== id && !t.archived);
        await get().selectTrip(next ? next.id : null);
      }
    },

    freezeTrip: async (id, frozen) => {
      if (!isMissingSupabaseEnv) {
        try {
          await freezeTripRow(id, frozen);
        } catch (e) {
          setError(e);
          return;
        }
      }

      set((state) => ({
        trips: state.trips.map((t) => (t.id === id ? { ...t, frozen, updatedAt: Date.now() } : t)),
        lastModifiedAt: Date.now(),
        storageError: null,
      }));
    },

    deleteTrip: async (id) => {
      const deletedTrip = get().trips.find((t) => t.id === id);
      const userId = get().userId;

      // Guard: Only trip owner or trip admin can delete a trip
      if (userId && deletedTrip?.ownerId && deletedTrip.ownerId !== userId) {
        const myMemberId = deletedTrip.memberIds.find((mid) => get().members[mid]?.linkedUserId === userId);
        const isTripAdmin = myMemberId && deletedTrip.adminMemberIds?.includes(myMemberId);
        if (!isTripAdmin) {
          setError(new Error('Only a trip admin or owner can delete this trip.'));
          return;
        }
      }

      // send-push's own permission check needs the trip's members row to
      // still exist server-side to confirm the caller shares this trip
      // with each recipient — sending after deleteTripRow (which cascades
      // to members) would make every recipient fail that check and the
      // notification would silently go to no one.
      // We omit tripId so Postgres ON DELETE CASCADE will not delete this notification.
      const recipients = userId ? getTripNotificationRecipients(get().trips, get().members, id, userId) : [];
      const tripName = deletedTrip?.name || 'A trip';
      if (recipients.length > 0) {
        sendPushNotification(
          recipients,
          tripName,
          'trip_deleted',
          { tripName },
          undefined
        );
      }

      if (!isMissingSupabaseEnv) {
        try {
          await deleteTripRow(id);
        } catch (e) {
          setError(e);
          return;
        }
      }

      const wasActive = get().activeTripId === id;
      const remainingTrips = get().trips.filter((t) => t.id !== id);
      const updatedMembers = { ...get().members };
      const updatedGroups = { ...get().groups };
      deletedTrip?.memberIds.forEach((mid) => delete updatedMembers[mid]);
      deletedTrip?.groupIds.forEach((gid) => delete updatedGroups[gid]);

      set({ trips: remainingTrips, members: updatedMembers, groups: updatedGroups, storageError: null });

      if (wasActive) {
        const next = remainingTrips[0];
        await get().selectTrip(next ? next.id : null);
      }
    },

    addMember: async (name, linkedUserId) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      if (isMissingSupabaseEnv) {
        const memberId = newId();
        const member: Member = { id: memberId, name: name.trim(), linkedUserId: linkedUserId || null };
        set((state) => ({
          members: { ...state.members, [memberId]: member },
          trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, memberIds: [...t.memberIds, memberId], updatedAt: Date.now() } : t)),
          storageError: null,
        }));
        return;
      }

      const tempId = newId();
      const optimisticMember: Member = { id: tempId, name, linkedUserId: linkedUserId ?? null };

      // Optimistically add the member — same tempId becomes the real row id
      // once synced (insertMember passes it through), so nothing downstream
      // that already references this id (trip.memberIds, etc.) ever needs
      // to be reconciled.
      set((state) => ({
        members: { ...state.members, [tempId]: optimisticMember },
        trips: state.trips.map((t) => {
          if (t.id !== activeTripId) return t;
          const currentAdmins = new Set(t.adminMemberIds || []);
          // Ensure the trip creator/owner is always in currentAdmins
          if (currentAdmins.size === 0 && t.memberIds.length > 0) {
            const ownerMemberId = t.memberIds.find((mid) => state.members[mid]?.linkedUserId === t.ownerId) || t.memberIds[0];
            if (ownerMemberId) currentAdmins.add(ownerMemberId);
          }
          if (linkedUserId && linkedUserId === t.ownerId) {
            currentAdmins.add(tempId);
          }
          return {
            ...t,
            memberIds: [...t.memberIds, tempId],
            adminMemberIds: Array.from(currentAdmins),
            updatedAt: Date.now(),
          };
        }),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('addMember', { tempId, name, linkedUserId: linkedUserId ?? null, tripId: activeTripId });
      } else {
        try {
          const member = await insertMember(activeTripId, name, linkedUserId || undefined, tempId);
          invalidatePreviousMembersCache();
          set((state) => ({ members: { ...state.members, [tempId]: member } }));
        } catch (e) {
          console.warn('Online addMember failed, falling back to offline sync queue:', e);
          get().queueSync('addMember', { tempId, name, linkedUserId: linkedUserId ?? null, tripId: activeTripId });
        }
      }
    },

    setMemberAdminRole: async (memberId: string, isAdmin: boolean) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      const targetMember = get().members[memberId];
      if (!targetMember) return;

      set((state) => {
        const updatedTrips = state.trips.map((t) => {
          if (t.id !== activeTripId) return t;
          const currentAdmins = new Set(t.adminMemberIds || []);
          if (currentAdmins.size === 0 && t.memberIds.length > 0) {
            currentAdmins.add(t.memberIds[0]);
          }

          if (isAdmin) {
            // Any member can be promoted to Admin
            currentAdmins.add(memberId);
          } else {
            // Cannot demote the original trip creator / owner
            const isOwner = targetMember.linkedUserId && targetMember.linkedUserId === t.ownerId;
            if (!isOwner && currentAdmins.size > 1) {
              currentAdmins.delete(memberId);
            }
          }
          return {
            ...t,
            adminMemberIds: Array.from(currentAdmins),
            updatedAt: Date.now(),
          };
        });
        return { trips: updatedTrips, storageError: null };
      });
    },

    toggleArchiveMember: async (id) => {
      const member = get().members[id];
      if (!member) return;
      const archived = !member.archived;
      set((state) => ({ members: { ...state.members, [id]: { ...member, archived } }, storageError: null }));

      if (!navigator.onLine) {
        get().queueSync('toggleArchiveMember', { id, archived });
      } else {
        try {
          await updateMemberRow(id, { archived });
        } catch (e) {
          console.warn('Online toggleArchiveMember failed, falling back to offline sync queue:', e);
          get().queueSync('toggleArchiveMember', { id, archived });
        }
      }
    },

    updateMember: async (id, name) => {
      const member = get().members[id];
      if (!member) return;
      set((state) => ({ members: { ...state.members, [id]: { ...member, name } }, storageError: null }));

      if (!navigator.onLine) {
        get().queueSync('updateMember', { id, name });
      } else {
        try {
          await updateMemberRow(id, { name });
        } catch (e) {
          console.warn('Online updateMember failed, falling back to offline sync queue:', e);
          get().queueSync('updateMember', { id, name });
        }
      }
    },

    deleteMember: async (id) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const currentGroups = get().groups;
      const currentMembers = get().members;

      const groupsToDissolve: string[] = [];
      const groupsToRename: { id: string; name: string; memberIds: string[] }[] = [];

      Object.values(currentGroups).forEach((group) => {
        if (!group.memberIds.includes(id)) return;
        const remaining = group.memberIds.filter((mid) => mid !== id);
        if (remaining.length < 2) {
          groupsToDissolve.push(group.id);
        } else {
          // Only follow the removed member out if the name was still
          // auto-generated -- a manually renamed group (e.g. "Goa Squad")
          // keeps whatever the admin chose to call it.
          const previousNames = group.memberIds.map((mid) => currentMembers[mid]?.name).filter(Boolean) as string[];
          const wasAutoNamed = group.name === buildAutoGroupName(previousNames);
          const remainingNames = remaining.map((mid) => currentMembers[mid]?.name).filter(Boolean) as string[];
          const newName = wasAutoNamed ? buildAutoGroupName(remainingNames) : group.name;
          groupsToRename.push({ id: group.id, name: newName, memberIds: remaining });
        }
      });

      // Group dissolve/rename is cascaded client-side
      set((state) => {
        const updatedMembers = { ...state.members };
        delete updatedMembers[id];

        const updatedGroups = { ...state.groups };
        groupsToDissolve.forEach((gid) => delete updatedGroups[gid]);
        groupsToRename.forEach((g) => {
          updatedGroups[g.id] = { ...updatedGroups[g.id], name: g.name, memberIds: g.memberIds };
        });

        const updatedTrips = state.trips.map((t) => {
          if (t.id !== activeTripId) return t;
          return {
            ...t,
            memberIds: t.memberIds.filter((mid) => mid !== id),
            adminMemberIds: (t.adminMemberIds || []).filter((mid) => mid !== id),
            groupIds: t.groupIds.filter((gid) => !groupsToDissolve.includes(gid)),
            updatedAt: Date.now(),
          };
        });

        return { members: updatedMembers, groups: updatedGroups, trips: updatedTrips, storageError: null };
      });

      if (!navigator.onLine) {
        get().queueSync('deleteMember', { id, groupsToDissolve, groupsToRename });
      } else {
        try {
          await deleteMemberRow(id); // cascades group_members via FK
          await Promise.all([
            ...groupsToDissolve.map((gid) => deleteGroupRow(gid)),
            ...groupsToRename.map((g) => updateGroupRow(g.id, g.name, g.memberIds)),
          ]);
        } catch (e) {
          console.warn('Online deleteMember failed, falling back to offline sync queue:', e);
          get().queueSync('deleteMember', { id, groupsToDissolve, groupsToRename });
        }
      }
    },

    createGroup: async (name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const tempId = newId();
      const optimisticGroup: Group = { id: tempId, name, memberIds };

      set((state) => ({
        groups: { ...state.groups, [tempId]: optimisticGroup },
        trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, groupIds: [...t.groupIds, tempId], updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('createGroup', { tempId, name, memberIds, tripId: activeTripId });
      } else {
        try {
          const group = await insertGroup(activeTripId, name, memberIds, tempId);
          set((state) => ({ groups: { ...state.groups, [tempId]: group } }));
        } catch (e) {
          console.warn('Online createGroup failed, falling back to offline sync queue:', e);
          get().queueSync('createGroup', { tempId, name, memberIds, tripId: activeTripId });
        }
      }
    },

    updateGroup: async (id, name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      const existing = get().groups[id];
      if (!existing) return;

      set((state) => ({
        groups: { ...state.groups, [id]: { ...existing, name, memberIds } },
        trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('updateGroup', { id, name, memberIds });
      } else {
        try {
          await updateGroupRow(id, name, memberIds);
        } catch (e) {
          console.warn('Online updateGroup failed, falling back to offline sync queue:', e);
          get().queueSync('updateGroup', { id, name, memberIds });
        }
      }
    },

    deleteGroup: async (groupId) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      const existing = get().groups[groupId];
      if (!existing) return;

      set((state) => {
        const { [groupId]: _removed, ...updatedGroups } = state.groups;
        return {
          groups: updatedGroups,
          trips: state.trips.map((t) =>
            t.id === activeTripId ? { ...t, groupIds: t.groupIds.filter((id) => id !== groupId), updatedAt: Date.now() } : t
          ),
          storageError: null,
        };
      });

      if (!navigator.onLine) {
        get().queueSync('deleteGroup', { groupId, tripId: activeTripId });
      } else {
        try {
          await deleteGroupRow(groupId);
        } catch (e) {
          console.warn('Online deleteGroup failed, falling back to offline sync queue:', e);
          get().queueSync('deleteGroup', { groupId, tripId: activeTripId });
        }
      }
    },

    addExpense: async (expenseData) => {
      const tripId = get().activeTripId;
      const userId = get().userId;
      if (!tripId || !userId) return;

      const activeTrip = get().trips.find((t) => t.id === tripId);
      if (activeTrip?.frozen && !get().isSuperadmin) {
        set({ storageError: 'This trip is currently locked / frozen by Superadmin. Modifications are disabled.' });
        return;
      }

      const participants = expenseData.splitMemberIds.filter((id) => get().members[id] && !get().members[id].archived);
      if (participants.length === 0) return;

      const resolvedShares = resolveShares(expenseData, participants);
      const tempId = newId();
      const tempExpense: Expense = {
        id: tempId,
        tripId,
        createdByUserId: userId,
        createdAt: Date.now(),
        updatedAt: Date.now(),
        isSettlement: expenseData.title.startsWith('Settlement:'),
        title: expenseData.title.trim(),
        amount: expenseData.amount,
        currency: expenseData.currency,
        category: expenseData.category,
        date: expenseData.date,
        paidBy: expenseData.paidBy,
        splitMode: expenseData.splitMode,
        splitMemberIds: expenseData.splitMemberIds,
        splitConfig: expenseData.splitConfig,
        resolvedShares,
        location: expenseData.location ?? undefined,
      };

      // Optimistically add the expense
      set((state) => ({
        expenses: [...state.expenses, tempExpense].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        trips: state.trips.map((t) => (t.id === tripId ? { ...t, expenseCount: (t.expenseCount || 0) + 1, updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      const saveAction = async () => {
        let receiptPath: string | undefined;
        if (expenseData.receiptImage) {
          receiptPath = await uploadReceipt(tripId, tempId, expenseData.receiptImage);
        }
        const location = await resolvePendingLocation(expenseData.location);
        const savedExpense = await insertExpense(tripId, userId, toExpenseInput({ ...expenseData, location }, resolvedShares, { id: tempId, receiptPath }));

        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === tempId ? savedExpense : e)),
          trips: state.trips.map((t) => (t.id === tripId ? { ...t, updatedAt: Date.now() } : t)),
        }));

        const trip = get().trips.find((t) => t.id === tripId);
        const recipients = getTripNotificationRecipients(get().trips, get().members, tripId, userId);
        sendPushNotification(
          recipients,
          trip?.name || 'Trip Tracker',
          'expense_added',
          { expenseTitle: savedExpense.title, amount: savedExpense.amount.toFixed(2), currency: savedExpense.currency },
          tripId
        );
      };

      if (isMissingSupabaseEnv) {
        return;
      }

      const queueOfflineAdd = async () => {
        let staged = false;
        if (expenseData.receiptImage) {
          try {
            await saveOfflineReceipt(tempId, expenseData.receiptImage);
            staged = true;
          } catch (e) {
            console.error('Failed to stage offline receipt, keeping it inline as a fallback:', e);
          }
        }
        get().queueSync('addExpense', { tempId, expenseData: staged ? { ...expenseData, receiptImage: undefined } : expenseData });
      };

      if (!navigator.onLine) {
        await queueOfflineAdd();
      } else {
        try {
          await saveAction();
        } catch (e) {
          console.warn('Online addExpense failed, falling back to offline sync queue:', e);
          await queueOfflineAdd();
        }
      }
    },

    updateExpense: async (id, expenseData) => {
      const tripId = get().activeTripId;
      if (!tripId) return;
      const existing = get().expenses.find((e) => e.id === id);
      if (!existing) return;

      const participants = expenseData.splitMemberIds.filter((mId) => get().members[mId] && !get().members[mId].archived);
      if (participants.length === 0) return;

      const resolvedShares = resolveShares(expenseData, participants);
      const updatedExpense: Expense = {
        ...existing,
        ...expenseData,
        resolvedShares,
        updatedAt: Date.now(),
      };

      // Optimistic update
      set((state) => ({
        expenses: state.expenses.map((e) => (e.id === id ? updatedExpense : e)),
        storageError: null,
      }));

      if (isMissingSupabaseEnv) {
        return;
      }

      const saveAction = async () => {
        let receiptPath: string | undefined;
        if (expenseData.receiptImage) {
          receiptPath = await uploadReceipt(tripId, id, expenseData.receiptImage);
        }
        const location = await resolvePendingLocation(expenseData.location);
        await updateExpenseRow(id, toExpenseInput({ ...expenseData, location }, resolvedShares, { receiptPath }));
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === id ? { ...updatedExpense, ...(receiptPath ? { receiptPath } : {}), location: location ?? undefined } : e)),
        }));
      };

      const queueOfflineUpdate = async () => {
        let staged = false;
        if (expenseData.receiptImage) {
          try {
            await saveOfflineReceipt(id, expenseData.receiptImage);
            staged = true;
          } catch (e) {
            console.error('Failed to stage offline receipt, keeping it inline as a fallback:', e);
          }
        }
        get().queueSync('updateExpense', { id, expenseData: staged ? { ...expenseData, receiptImage: undefined } : expenseData });
      };

      if (!navigator.onLine) {
        await queueOfflineUpdate();
      } else {
        try {
          await saveAction();
          const userId = get().userId;
          const trip = get().trips.find((t) => t.id === tripId);
          const recipients = getTripNotificationRecipients(get().trips, get().members, tripId, userId || '');
          sendPushNotification(
            recipients,
            trip?.name || 'Trip Tracker',
            'expense_updated',
            { expenseTitle: updatedExpense.title },
            tripId
          );
        } catch (e) {
          console.warn('Online updateExpense failed, falling back to offline sync queue:', e);
          await queueOfflineUpdate();
        }
      }
    },

    deleteExpense: async (id) => {
      const existing = get().expenses.find((e) => e.id === id);
      if (!existing) return;
      const userId = get().userId;
      const deletedExisting: Expense = { ...existing, deletedAt: Date.now(), deletedByUserId: userId };

      // Optimistic delete — moves into the recycle bin locally, purged
      // server-side 24h later (see supabase/migrations/0041).
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        deletedExpenses: [deletedExisting, ...state.deletedExpenses],
        trips: state.trips.map((t) => (t.id === existing.tripId ? { ...t, expenseCount: Math.max(0, (t.expenseCount || 0) - 1), updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      if (isMissingSupabaseEnv) {
        return;
      }

      if (!navigator.onLine) {
        get().queueSync('deleteExpense', { id, userId });
      } else {
        try {
          await deleteExpenseRow(id, userId || '');
          const trip = get().trips.find((t) => t.id === existing.tripId);
          const recipients = getTripNotificationRecipients(get().trips, get().members, existing.tripId, userId || '');
          sendPushNotification(
            recipients,
            trip?.name || 'Trip Tracker',
            'expense_deleted',
            { expenseTitle: existing.title },
            existing.tripId
          );
        } catch (e) {
          console.warn('Online deleteExpense failed, falling back to offline sync queue:', e);
          get().queueSync('deleteExpense', { id, userId });
        }
      }
    },

    fetchDeletedExpenses: async () => {
      const tripId = get().activeTripId;
      if (!tripId) return;
      try {
        const deletedExpenses = await fetchDeletedExpensesForTrip(tripId);
        set({ deletedExpenses, storageError: null });
      } catch (e) {
        setError(e);
      }
    },

    restoreExpense: async (id) => {
      const existing = get().deletedExpenses.find((e) => e.id === id);
      if (!existing) return;
      const restored: Expense = { ...existing, deletedAt: null, deletedByUserId: null };

      // Optimistic restore
      set((state) => ({
        deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
        expenses: [...state.expenses, restored].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        trips: state.trips.map((t) => (t.id === existing.tripId ? { ...t, expenseCount: (t.expenseCount || 0) + 1, updatedAt: Date.now() } : t)),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('restoreExpense', { id });
      } else {
        try {
          await restoreExpenseRow(id);
          const userId = get().userId;
          const trip = get().trips.find((t) => t.id === existing.tripId);
          const recipients = getTripNotificationRecipients(get().trips, get().members, existing.tripId, userId || '');
          sendPushNotification(
            recipients,
            trip?.name || 'Trip Tracker',
            'expense_restored',
            { expenseTitle: existing.title },
            existing.tripId
          );
        } catch (e) {
          console.warn('Online restoreExpense failed, falling back to offline sync queue:', e);
          get().queueSync('restoreExpense', { id });
        }
      }
    },

    permanentlyDeleteExpense: async (id) => {
      set((state) => ({
        deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('permanentlyDeleteExpense', { id });
      } else {
        try {
          await permanentlyDeleteExpenseRow(id);
        } catch (e) {
          console.warn('Online permanentlyDeleteExpense failed, falling back to offline sync queue:', e);
          get().queueSync('permanentlyDeleteExpense', { id });
        }
      }
    },

    emptyRecycleBin: async () => {
      const tripId = get().activeTripId;
      if (!tripId) return;
      set({ deletedExpenses: [], storageError: null });

      if (!navigator.onLine) {
        get().queueSync('emptyRecycleBin', { tripId });
      } else {
        try {
          await purgeDeletedExpensesForTrip(tripId);
        } catch (e) {
          console.warn('Online emptyRecycleBin failed, falling back to offline sync queue:', e);
          get().queueSync('emptyRecycleBin', { tripId });
        }
      }
    },

    addCategory: async (name, icon) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      if (isMissingSupabaseEnv) {
        const newCat: Category = {
          id: `cat-custom-${newId()}`,
          name: name.trim(),
          icon: icon || '🏷️',
          isCustom: true,
        };
        set((state) => ({ categories: [...state.categories, newCat], storageError: null }));
        return;
      }

      const tempId = newId();
      const optimisticCategory: Category = { id: tempId, name, icon, isCustom: true };
      set((state) => ({ categories: [...state.categories, optimisticCategory], storageError: null }));

      if (!navigator.onLine) {
        get().queueSync('addCategory', { tempId, name, icon, tripId: activeTripId });
      } else {
        try {
          const category = await insertCategory(activeTripId, name, icon, tempId);
          set((state) => ({ categories: state.categories.map((c) => (c.id === tempId ? category : c)) }));
        } catch (e) {
          console.warn('Online addCategory failed, falling back to offline sync queue:', e);
          get().queueSync('addCategory', { tempId, name, icon, tripId: activeTripId });
        }
      }
    },

    deleteCategory: async (id) => {
      if (isMissingSupabaseEnv) {
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id), storageError: null }));
        return;
      }

      const existing = get().categories.find((c) => c.id === id);
      if (!existing) return;
      set((state) => ({ categories: state.categories.filter((c) => c.id !== id), storageError: null }));

      if (!navigator.onLine) {
        get().queueSync('deleteCategory', { id });
      } else {
        try {
          await deleteCategoryRow(id);
        } catch (e) {
          console.warn('Online deleteCategory failed, falling back to offline sync queue:', e);
          get().queueSync('deleteCategory', { id });
        }
      }
    },

    updateCategoryKeywords: async (categoryId, keywords) => {
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === categoryId ? { ...c, keywords: keywords.map((k) => k.toLowerCase().trim()).filter(Boolean) } : c
        ),
        lastModifiedAt: Date.now(),
        storageError: null,
      }));
    },

    resetCategoryKeywords: async (categoryId) => {
      set((state) => ({
        categories: state.categories.map((c) =>
          c.id === categoryId ? { ...c, keywords: undefined } : c
        ),
        lastModifiedAt: Date.now(),
        storageError: null,
      }));
    },

    exportDatabase: () => {
      const state: TripState = {
        trips: get().trips,
        activeTripId: get().activeTripId,
        members: get().members,
        groups: get().groups,
        expenses: get().expenses,
        categories: get().categories,
      };
      return JSON.stringify(state, null, 2);
    },

    importDatabase: async (jsonString) => {
      let userId = get().userId;
      if (!userId) {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user?.id) {
            userId = session.user.id;
            const displayName =
              (session.user.user_metadata?.full_name as string | undefined) ||
              (session.user.user_metadata?.name as string | undefined) ||
              session.user.email?.split('@')[0] ||
              null;
            set({ userId, userDisplayName: displayName });
          }
        } catch {
          // offline fallback
        }
      }

      if (!userId) {
        return { success: false, error: 'Please sign in to restore a database backup.' };
      }

      try {
        const validation = validateAndSanitizeBackup(jsonString);
        if (!validation.valid || !validation.sanitizedState) {
          return { success: false, error: validation.error || 'Invalid database snapshot format.' };
        }

        const parsed = validation.sanitizedState;
        const customCategories = parsed.categories.filter((c) => c.isCustom);
        const existingTripIds = get().trips.map((t) => t.id);
        const ownedTrips = filterTripsOwnedByUser(parsed.trips, userId, existingTripIds);

        if (ownedTrips.length === 0 && parsed.trips.length > 0) {
          return { success: false, error: 'All trips in this backup already exist in your account.' };
        }

        const previousActiveTripId = get().activeTripId;
        let lastTripId: string | null = null;

        for (let i = 0; i < ownedTrips.length; i++) {
          const trip = ownedTrips[i];
          const tripMembers: Record<string, Member> = {};
          trip.memberIds.forEach((id) => {
            if (parsed.members[id]) tripMembers[id] = parsed.members[id];
          });
          const tripGroups: Record<string, Group> = {};
          (trip.groupIds || []).forEach((id) => {
            if (parsed.groups[id]) tripGroups[id] = parsed.groups[id];
          });
          const tripExpenses = parsed.expenses.filter((e) => e.tripId === trip.id);

          const result = await insertTripGraph(userId, {
            trip: { name: trip.name, startDate: trip.startDate, endDate: trip.endDate, baseCurrency: trip.baseCurrency },
            members: tripMembers,
            groups: tripGroups,
            categories: i === 0 ? customCategories : undefined,
            expenses: tripExpenses,
          });
          lastTripId = result.trip.id;
        }

        const graph = await fetchMyTripGraph();
        let importedExpenses: Expense[] = [];
        let categories: Category[] | null = null;
        if (lastTripId) {
          importedExpenses = await fetchExpensesForTrip(lastTripId);
          const custom = await fetchCategoriesForTrip(lastTripId);
          categories = [...DEFAULT_CATEGORIES, ...custom];
        }

        set((state) => ({
          ...graph,
          // Nothing owned by this user was in the backup (e.g. it only
          // contained a trip they'd joined, not created) -- keep the
          // current selection instead of clobbering it with null.
          activeTripId: lastTripId ?? previousActiveTripId,
          expenses: [...state.expenses, ...importedExpenses],
          categories: categories ?? state.categories,
          storageError: null,
        }));
        return { success: true };
      } catch (e: any) {
        console.error('Import database failed:', e);
        const msg = e?.message || 'Failed to restore database from snapshot.';
        return { success: false, error: msg };
      }
    },

    clearDatabase: async () => {
      const userId = get().userId;
      if (!userId) return;
      try {
        await deleteAllMyTrips(userId);
        set({
          trips: [],
          activeTripId: null,
          members: {},
          groups: {},
          expenses: [],
          deletedExpenses: [],
          categories: DEFAULT_CATEGORIES,
          syncQueue: [],
          storageError: null,
        });
      } catch (e) {
        setError(e);
      }
    },

    loadDemoTrip: async () => {
      // 1. Resolve real authenticated user ID from Supabase session or state
      let currentUserId = get().userId;
      let currentUserDisplayName = get().userDisplayName || 'Rahul';
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user?.id) {
          currentUserId = session.user.id;
          currentUserDisplayName =
            (session.user.user_metadata?.full_name as string | undefined) ||
            (session.user.user_metadata?.name as string | undefined) ||
            session.user.email?.split('@')[0] ||
            currentUserDisplayName;
        }
      } catch {}

      const effectiveUserId = currentUserId || 'demo-user-superadmin';

      try {
        const demo = generateDemoData();
        // Link the first member (Rahul / Me) directly to the authenticated user
        const memberEntries = Object.entries(demo.members);
        if (memberEntries.length > 0) {
          const [firstMemberId, firstMember] = memberEntries[0];
          demo.members[firstMemberId] = {
            ...firstMember,
            name: currentUserDisplayName,
            linkedUserId: effectiveUserId,
          };
        }

        let result;
        try {
          result = await insertTripGraph(effectiveUserId, {
            trip: {
              name: demo.trip.name,
              startDate: demo.trip.startDate,
              endDate: demo.trip.endDate,
              baseCurrency: demo.trip.baseCurrency,
              destination: demo.trip.destination || 'Goa',
            },
            members: demo.members,
            groups: demo.groups,
            expenses: demo.expenses,
          });
        } catch {
          // Offline / local demo fallback. demo.trip already carries id,
          // memberIds, groupIds, createdAt/updatedAt from generateDemoData(),
          // and demo.expenses[].tripId was baked in against that same id —
          // only fill in the two owner-scoped fields it's missing.
          const memberIds = Object.keys(demo.members);
          const expensesList: Expense[] = demo.expenses.map((e) => ({
            ...e,
            isSettlement: false,
            createdByUserId: effectiveUserId,
          }));
          const demoTrip: Trip = {
            ...demo.trip,
            ownerId: effectiveUserId,
            adminMemberIds: [memberIds[0]],
            joinCode: 'DEMO26',
          };
          result = {
            trip: demoTrip,
            members: demo.members,
            groups: demo.groups,
            expenses: expensesList,
            // Caller (below) prepends DEFAULT_CATEGORIES itself — this must
            // mirror insertTripGraph's success shape (custom categories
            // only) or defaults get concatenated with defaults and every
            // category shows twice.
            categories: [],
          };
        }

        set((state) => ({
          trips: [...state.trips.filter(t => t.id !== result.trip.id), result.trip],
          activeTripId: result.trip.id,
          members: { ...state.members, ...result.members },
          groups: { ...state.groups, ...result.groups },
          expenses: [...state.expenses.filter(e => e.tripId !== result.trip.id), ...result.expenses],
          categories: [...DEFAULT_CATEGORIES, ...result.categories],
          enableGeotagging: true,
          featureFlags: { ...state.featureFlags, enableGeotagging: true },
          tripFlagOverrides: {
            ...state.tripFlagOverrides,
            [result.trip.id]: {
              ...(state.tripFlagOverrides[result.trip.id] || {}),
              enableGeotagging: true,
            },
          },
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },
  };
    },
    {
      name: 'trip-tracker-store-v1',
      version: 1,
      storage: createJSONStorage(() => quotaSafeStorage),
      // No migrations yet — version stays 1. When the persisted shape needs
      // to change, branch on the `version` argument here to transform old
      // persisted data before it's merged into the live store, instead of
      // letting a stale/incompatible shape silently corrupt state.
      migrate: (persistedState) => persistedState as TripStore,
      partialize: (state) => ({
        trips: state.trips,
        activeTripId: state.activeTripId,
        members: state.members,
        groups: state.groups,
        expenses: state.expenses,
        deletedExpenses: state.deletedExpenses,
        categories: state.categories,
        syncQueue: state.syncQueue,
        lastBackendSyncedAt: state.lastBackendSyncedAt,
        lastModifiedAt: state.lastModifiedAt,
        enableGeotagging: state.enableGeotagging,
        isSuperadmin: state.isSuperadmin,
        featureFlags: state.featureFlags,
        tripFlagOverrides: state.tripFlagOverrides,
        userFlagOverrides: state.userFlagOverrides,
      }),
    }
  )
);

