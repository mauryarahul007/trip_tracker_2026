import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Member, Group, Expense, Category, TripState, ExpenseLocation, Trip } from '../types';
import { supabase } from '../services/supabaseClient';
import {
  fetchMyTripGraph,
  fetchExpensesForTrip,
  fetchCategoriesForTrip,
  insertTrip,
  updateTripRow,
  archiveTripRow,
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
import { generateDemoData } from '../utils/demoSeed';
import { reverseGeocode, searchPlaces } from '../utils/geolocation';
import { sendPushNotification } from '../services/pushApi';

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

interface SyncQueueItem {
  id: string;
  type: 'addExpense' | 'updateExpense' | 'deleteExpense' | 'restoreExpense' | 'permanentlyDeleteExpense' | 'emptyRecycleBin';
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

  initialize: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  clearStorageError: () => void;
  processQueue: () => Promise<void>;
  queueSync: (type: 'addExpense' | 'updateExpense' | 'deleteExpense' | 'restoreExpense' | 'permanentlyDeleteExpense' | 'emptyRecycleBin', payload: any) => void;
  updateLastBackendSyncedAt: (timestamp: number) => void;

  // Trip Actions
  createTrip: (name: string, startDate: string, endDate: string, baseCurrency: string) => Promise<void>;
  updateTrip: (id: string, name: string, startDate: string, endDate: string) => Promise<void>;
  selectTrip: (id: string | null) => Promise<void>;
  archiveTrip: (id: string, archived: boolean) => Promise<void>;
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
  importDatabase: (jsonString: string) => Promise<boolean>;
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

export const useTripStore = create<TripStore>()(
  persist(
    (set, get) => {
  const setError = (e: unknown) => {
    // If the device is offline, suppress network errors since offline mode is expected
    if (!navigator.onLine) {
      console.warn('Trip store operation offline (deferred/cached):', e);
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

    setEnableGeotagging: (enabled: boolean) => {
      set({ enableGeotagging: enabled, lastModifiedAt: Date.now() });
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

      if (!navigator.onLine) {
        set({ userId, userDisplayName, initialized: true });
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

        if (get().syncQueue.length > 0) {
          get().processQueue();
        }
      } catch (e) {
        console.warn('Initial trip load failed or offline:', e);
        set({
          userId,
          userDisplayName,
          initialized: true,
          storageError: navigator.onLine ? 'Failed to load your trips. Check your connection and reload.' : null,
        });
      }
    },

    // Re-pulls the trip/member/group list without disturbing the active
    // trip's loaded expenses/categories — used after joining a new trip via
    // an invite link, since that trip won't be in `trips` yet.
    refreshTrips: async () => {
      try {
        const graph = await fetchMyTripGraph();
        set({ ...graph, storageError: null });
      } catch (e) {
        setError(e);
      }
    },

    clearStorageError: () => set({ storageError: null }),

    queueSync: (type, payload) => {
      const newQueue = [...get().syncQueue, { id: crypto.randomUUID(), type, payload }];
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
                `${savedExpense.title} — ${savedExpense.currency} ${savedExpense.amount.toFixed(2)} added`
              );
            }
          } else if (item.type === 'updateExpense') {
            const { id, expenseData } = item.payload;
            const tripId = get().activeTripId;
            if (tripId) {
              const participants = expenseData.splitMemberIds.filter((mId: string) => get().members[mId] && !get().members[mId].archived);
              const resolvedShares = resolveShares(expenseData, participants);
              let receiptPath: string | undefined;
              if (expenseData.receiptImage) {
                receiptPath = await uploadReceipt(tripId, id, expenseData.receiptImage);
              }
              const location = await resolvePendingLocation(expenseData.location);
              await updateExpenseRow(id, toExpenseInput({ ...expenseData, location }, resolvedShares, { receiptPath }));
              set((state) => ({
                expenses: state.expenses.map((e) => (e.id === id ? { ...e, location: location ?? undefined } : e)),
              }));
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

    createTrip: async (name, startDate, endDate, baseCurrency) => {
      const userId = get().userId;
      if (!userId) return;
      try {
        const trip = await insertTrip({ name, startDate, endDate, baseCurrency, ownerId: userId });

        // The creator is always the owner and admin — add them as a claimed member
        // too, so they show up in the members list and can be a payer/
        // split participant like everyone else.
        const creatorName = get().userDisplayName || 'Me';
        const creatorMember = await insertMember(trip.id, creatorName, userId);
        const tripWithCreator = {
          ...trip,
          memberIds: [creatorMember.id],
          adminMemberIds: [creatorMember.id],
          expenseCount: 0,
        };

        set((state) => ({
          trips: [...state.trips, tripWithCreator],
          members: { ...state.members, [creatorMember.id]: creatorMember },
          activeTripId: trip.id,
          categories: DEFAULT_CATEGORIES,
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },

    updateTrip: async (id, name, startDate, endDate) => {
      try {
        await updateTripRow(id, { name, startDate, endDate });
        set((state) => ({
          trips: state.trips.map((t) => (t.id === id ? { ...t, name, startDate, endDate, updatedAt: Date.now() } : t)),
          storageError: null,
        }));
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
      try {
        await archiveTripRow(id, archived);
      } catch (e) {
        setError(e);
        return;
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

    deleteTrip: async (id) => {
      const deletedTrip = get().trips.find((t) => t.id === id);
      try {
        await deleteTripRow(id);
      } catch (e) {
        setError(e);
        return;
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
      if (!navigator.onLine) {
        set({ storageError: "You're offline — adding members needs a connection. Try again once you're back online." });
        return;
      }
      try {
        const member = await insertMember(activeTripId, name, linkedUserId || undefined);
        invalidatePreviousMembersCache();
        set((state) => ({
          members: { ...state.members, [member.id]: member },
          trips: state.trips.map((t) => {
            if (t.id !== activeTripId) return t;
            const currentAdmins = new Set(t.adminMemberIds || []);
            // Ensure the trip creator/owner is always in currentAdmins
            if (currentAdmins.size === 0 && t.memberIds.length > 0) {
              const ownerMemberId = t.memberIds.find((mid) => state.members[mid]?.linkedUserId === t.ownerId) || t.memberIds[0];
              if (ownerMemberId) currentAdmins.add(ownerMemberId);
            }
            if (linkedUserId && linkedUserId === t.ownerId) {
              currentAdmins.add(member.id);
            }
            return {
              ...t,
              memberIds: [...t.memberIds, member.id],
              adminMemberIds: Array.from(currentAdmins),
              updatedAt: Date.now(),
            };
          }),
          storageError: null,
        }));
      } catch (e) {
        setError(e);
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
      try {
        await updateMemberRow(id, { archived: !member.archived });
        set((state) => ({ members: { ...state.members, [id]: { ...member, archived: !member.archived } }, storageError: null }));
      } catch (e) {
        setError(e);
      }
    },

    updateMember: async (id, name) => {
      const member = get().members[id];
      if (!member) return;
      try {
        await updateMemberRow(id, { name });
        set((state) => ({ members: { ...state.members, [id]: { ...member, name } }, storageError: null }));
      } catch (e) {
        setError(e);
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
          const names = remaining.map((mid) => currentMembers[mid]?.name).filter(Boolean) as string[];
          let newName = group.name;
          if (names.length === 2) newName = `${names[0]} & ${names[1]}`;
          else if (names.length > 2) newName = `${names.slice(0, -1).join(', ')} & ${names[names.length - 1]}`;
          groupsToRename.push({ id: group.id, name: newName, memberIds: remaining });
        }
      });

      try {
        await deleteMemberRow(id); // cascades group_members via FK
        await Promise.all([
          ...groupsToDissolve.map((gid) => deleteGroupRow(gid)),
          ...groupsToRename.map((g) => updateGroupRow(g.id, g.name, g.memberIds)),
        ]);

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
      } catch (e) {
        setError(e);
      }
    },

    createGroup: async (name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      try {
        const group = await insertGroup(activeTripId, name, memberIds);
        set((state) => ({
          groups: { ...state.groups, [group.id]: group },
          trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, groupIds: [...t.groupIds, group.id], updatedAt: Date.now() } : t)),
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },

    updateGroup: async (id, name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      try {
        await updateGroupRow(id, name, memberIds);
        set((state) => ({
          groups: { ...state.groups, [id]: { ...state.groups[id], name, memberIds } },
          trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, updatedAt: Date.now() } : t)),
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
    },

    deleteGroup: async (groupId) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      try {
        await deleteGroupRow(groupId);
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
      } catch (e) {
        setError(e);
      }
    },

    addExpense: async (expenseData) => {
      const tripId = get().activeTripId;
      const userId = get().userId;
      if (!tripId || !userId) return;

      const participants = expenseData.splitMemberIds.filter((id) => get().members[id] && !get().members[id].archived);
      if (participants.length === 0) return;

      const resolvedShares = resolveShares(expenseData, participants);
      const tempId = crypto.randomUUID();
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
          `${savedExpense.title} — ${savedExpense.currency} ${savedExpense.amount.toFixed(2)} added`
        );
      };

      if (!navigator.onLine) {
        get().queueSync('addExpense', { tempId, expenseData });
      } else {
        try {
          await saveAction();
        } catch (e) {
          // Revert optimistic add
          set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== tempId),
            trips: state.trips.map((t) => (t.id === tripId ? { ...t, expenseCount: Math.max(0, (t.expenseCount || 0) - 1), updatedAt: Date.now() } : t)),
          }));
          setError(e);
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

      if (!navigator.onLine) {
        get().queueSync('updateExpense', { id, expenseData });
      } else {
        try {
          await saveAction();
        } catch (e) {
          // Revert optimistic update
          set((state) => ({
            expenses: state.expenses.map((e) => (e.id === id ? existing : e)),
          }));
          setError(e);
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

      if (!navigator.onLine) {
        get().queueSync('deleteExpense', { id, userId });
      } else {
        try {
          await deleteExpenseRow(id, userId || '');
        } catch (e) {
          // Revert optimistic delete
          set((state) => ({
            expenses: [...state.expenses, existing].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
            deletedExpenses: state.deletedExpenses.filter((e) => e.id !== id),
            trips: state.trips.map((t) => (t.id === existing.tripId ? { ...t, expenseCount: (t.expenseCount || 0) + 1, updatedAt: Date.now() } : t)),
          }));
          setError(e);
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
        } catch (e) {
          // Revert optimistic restore
          set((state) => ({
            expenses: state.expenses.filter((e) => e.id !== id),
            deletedExpenses: [existing, ...state.deletedExpenses],
            trips: state.trips.map((t) => (t.id === existing.tripId ? { ...t, expenseCount: Math.max(0, (t.expenseCount || 0) - 1), updatedAt: Date.now() } : t)),
          }));
          setError(e);
        }
      }
    },

    permanentlyDeleteExpense: async (id) => {
      const existing = get().deletedExpenses.find((e) => e.id === id);
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
          if (existing) {
            set((state) => ({ deletedExpenses: [existing, ...state.deletedExpenses] }));
          }
          setError(e);
        }
      }
    },

    emptyRecycleBin: async () => {
      const tripId = get().activeTripId;
      if (!tripId) return;
      const prevDeleted = get().deletedExpenses;
      set({ deletedExpenses: [], storageError: null });

      if (!navigator.onLine) {
        get().queueSync('emptyRecycleBin', { tripId });
      } else {
        try {
          await purgeDeletedExpensesForTrip(tripId);
        } catch (e) {
          set({ deletedExpenses: prevDeleted });
          setError(e);
        }
      }
    },

    addCategory: async (name, icon) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      try {
        const category = await insertCategory(activeTripId, name, icon);
        set((state) => ({ categories: [...state.categories, category], storageError: null }));
      } catch (e) {
        setError(e);
      }
    },

    deleteCategory: async (id) => {
      try {
        await deleteCategoryRow(id);
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id), storageError: null }));
      } catch (e) {
        setError(e);
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
      const userId = get().userId;
      if (!userId) return false;

      try {
        const parsed = JSON.parse(jsonString) as TripState;

        if (
          !(
            Array.isArray(parsed.trips) &&
            parsed.members &&
            parsed.groups &&
            Array.isArray(parsed.expenses) &&
            Array.isArray(parsed.categories)
          )
        ) {
          return false;
        }

        const customCategories = parsed.categories.filter((c) => c.isCustom);
        let lastTripId: string | null = null;

        for (let i = 0; i < parsed.trips.length; i++) {
          const trip = parsed.trips[i];
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
        let categories = DEFAULT_CATEGORIES;
        if (lastTripId) {
          importedExpenses = await fetchExpensesForTrip(lastTripId);
          const custom = await fetchCategoriesForTrip(lastTripId);
          categories = [...DEFAULT_CATEGORIES, ...custom];
        }

        set((state) => ({
          ...graph,
          activeTripId: lastTripId,
          expenses: [...state.expenses, ...importedExpenses],
          categories,
          storageError: null,
        }));
        return true;
      } catch (e) {
        console.error('Import database failed:', e);
        return false;
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
      const userId = get().userId;
      if (!userId) return;
      try {
        const demo = generateDemoData();
        const result = await insertTripGraph(userId, {
          trip: { name: demo.trip.name, startDate: demo.trip.startDate, endDate: demo.trip.endDate, baseCurrency: demo.trip.baseCurrency },
          members: demo.members,
          groups: demo.groups,
          expenses: demo.expenses,
        });

        set((state) => ({
          trips: [...state.trips, result.trip],
          activeTripId: result.trip.id,
          members: { ...state.members, ...result.members },
          groups: { ...state.groups, ...result.groups },
          expenses: [...state.expenses, ...result.expenses],
          categories: [...DEFAULT_CATEGORIES, ...result.categories],
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
      }),
    }
  )
);

