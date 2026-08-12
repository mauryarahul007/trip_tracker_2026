import { create } from 'zustand';
import type { Member, Group, Expense, Category, TripState } from '../types';
import { supabase } from '../services/supabaseClient';
import {
  fetchMyTripGraph,
  fetchExpensesForTrip,
  fetchCategoriesForTrip,
  insertTrip,
  updateTripRow,
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
  insertTripGraph,
  uploadReceipt,
  type ExpenseInput,
} from '../services/tripApi';
import { generateDemoData } from '../utils/demoSeed';

const LAST_TRIP_KEY = 'trip-tracker-last-trip-id';

interface SyncQueueItem {
  id: string;
  type: 'addExpense' | 'updateExpense' | 'deleteExpense';
  payload: any;
}

interface TripStore extends TripState {
  initialized: boolean;
  storageError: string | null;
  userId: string | null;
  userDisplayName: string | null;
  syncQueue: SyncQueueItem[];

  initialize: () => Promise<void>;
  refreshTrips: () => Promise<void>;
  clearStorageError: () => void;
  processQueue: () => Promise<void>;
  queueSync: (type: 'addExpense' | 'updateExpense' | 'deleteExpense', payload: any) => void;

  // Trip Actions
  createTrip: (name: string, startDate: string, endDate: string, baseCurrency: string) => Promise<void>;
  updateTrip: (id: string, name: string, startDate: string, endDate: string) => Promise<void>;
  selectTrip: (id: string | null) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;

  // Member Actions
  addMember: (name: string) => Promise<void>;
  toggleArchiveMember: (id: string) => Promise<void>;
  updateMember: (id: string, name: string) => Promise<void>;
  deleteMember: (id: string) => Promise<void>;

  // Group Actions
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  updateGroup: (id: string, name: string, memberIds: string[]) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;

  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt' | 'isSettlement' | 'createdByUserId'>) => Promise<void>;
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt' | 'isSettlement' | 'createdByUserId'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;

  // Category Actions
  addCategory: (name: string, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  // Database Backup Actions
  exportDatabase: () => string;
  importDatabase: (jsonString: string) => Promise<boolean>;
  clearDatabase: () => Promise<void>;
  loadDemoTrip: () => Promise<void>;
  applyP2PMergedState: (merged: {
    expenses: Expense[];
    categories: Category[];
    members: Record<string, Member>;
    groups: Record<string, Group>;
    syncQueue: any[];
  }) => Promise<void>;
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

export const useTripStore = create<TripStore>((set, get) => {
  const setError = (e: unknown) => {
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
  });

  return {
    trips: [],
    activeTripId: null,
    members: {},
    groups: {},
    expenses: [],
    categories: DEFAULT_CATEGORIES,
    initialized: false,
    storageError: null,
    userId: null,
    userDisplayName: null,
    syncQueue: [],

    initialize: async () => {
      if (get().initialized) return;

      const { data: { user } } = await supabase.auth.getUser();
      const userId = user?.id ?? null;
      const userDisplayName =
        (user?.user_metadata?.full_name as string | undefined) ||
        (user?.user_metadata?.name as string | undefined) ||
        user?.email?.split('@')[0] ||
        null;

      // Load saved sync queue from localStorage
      const savedQueue = localStorage.getItem('trip-tracker-sync-queue');
      const syncQueue = savedQueue ? JSON.parse(savedQueue) : [];

      try {
        const graph = await fetchMyTripGraph();
        const lastTripId = localStorage.getItem(LAST_TRIP_KEY);
        const activeTrip = lastTripId ? graph.trips.find((t) => t.id === lastTripId) : undefined;

        let expenses: Expense[] = [];
        let categories = DEFAULT_CATEGORIES;
        if (activeTrip) {
          const [tripExpenses, customCategories] = await Promise.all([
            fetchExpensesForTrip(activeTrip.id),
            fetchCategoriesForTrip(activeTrip.id),
          ]);
          expenses = tripExpenses;
          categories = [...DEFAULT_CATEGORIES, ...customCategories];
        }

        set({
          ...graph,
          activeTripId: activeTrip ? activeTrip.id : null,
          expenses,
          categories,
          userId,
          userDisplayName,
          syncQueue,
          initialized: true,
        });

        // Register online sync listener
        window.addEventListener('online', () => {
          get().processQueue();
        });

        // Trigger initial queue sync attempt if online
        if (syncQueue.length > 0 && navigator.onLine) {
          get().processQueue();
        }
      } catch (e) {
        console.error('Initial trip load failed:', e);
        set({
          userId,
          userDisplayName,
          syncQueue,
          initialized: true,
          storageError: 'Failed to load your trips. Check your connection and reload.',
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
      set({ syncQueue: newQueue });
      localStorage.setItem('trip-tracker-sync-queue', JSON.stringify(newQueue));
    },

    processQueue: async () => {
      if (!navigator.onLine || get().syncQueue.length === 0) return;
      const queue = [...get().syncQueue];
      set({ syncQueue: [] });
      localStorage.removeItem('trip-tracker-sync-queue');

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
              const savedExpense = await insertExpense(tripId, userId, toExpenseInput(expenseData, resolvedShares, { id: tempId, receiptPath }));
              set((state) => ({
                expenses: state.expenses.map((e) => (e.id === tempId ? savedExpense : e)),
                trips: state.trips.map((t) => (t.id === tripId ? { ...t, updatedAt: Date.now() } : t)),
              }));
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
              await updateExpenseRow(id, toExpenseInput(expenseData, resolvedShares, { receiptPath }));
            }
          } else if (item.type === 'deleteExpense') {
            const { id } = item.payload;
            await deleteExpenseRow(id);
          }
        } catch (err) {
          console.error('Offline sync failed for item:', item, err);
          const updatedQueue = [...get().syncQueue, item];
          set({ syncQueue: updatedQueue });
          localStorage.setItem('trip-tracker-sync-queue', JSON.stringify(updatedQueue));
        }
      }
    },

    createTrip: async (name, startDate, endDate, baseCurrency) => {
      const userId = get().userId;
      if (!userId) return;
      try {
        const trip = await insertTrip({ name, startDate, endDate, baseCurrency, ownerId: userId });

        // The creator is always the admin — add them as a claimed member
        // too, so they show up in the members list and can be a payer/
        // split participant like everyone else.
        const creatorName = get().userDisplayName || 'Me';
        const creatorMember = await insertMember(trip.id, creatorName, userId);
        const tripWithCreator = { ...trip, memberIds: [creatorMember.id] };

        set((state) => ({
          trips: [...state.trips, tripWithCreator],
          members: { ...state.members, [creatorMember.id]: creatorMember },
          activeTripId: trip.id,
          expenses: [],
          categories: DEFAULT_CATEGORIES,
          storageError: null,
        }));
        localStorage.setItem(LAST_TRIP_KEY, trip.id);
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
        set({ activeTripId: null, expenses: [], categories: DEFAULT_CATEGORIES });
        localStorage.removeItem(LAST_TRIP_KEY);
        return;
      }
      set({ activeTripId: id, expenses: [], categories: DEFAULT_CATEGORIES });
      localStorage.setItem(LAST_TRIP_KEY, id);
      try {
        const [expenses, customCategories] = await Promise.all([fetchExpensesForTrip(id), fetchCategoriesForTrip(id)]);
        set({ expenses, categories: [...DEFAULT_CATEGORIES, ...customCategories], storageError: null });
      } catch (e) {
        setError(e);
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

    addMember: async (name) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;
      try {
        const member = await insertMember(activeTripId, name);
        set((state) => ({
          members: { ...state.members, [member.id]: member },
          trips: state.trips.map((t) => (t.id === activeTripId ? { ...t, memberIds: [...t.memberIds, member.id], updatedAt: Date.now() } : t)),
          storageError: null,
        }));
      } catch (e) {
        setError(e);
      }
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
      };

      // Optimistically add the expense
      set((state) => ({
        expenses: [...state.expenses, tempExpense].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
        storageError: null,
      }));

      const saveAction = async () => {
        let receiptPath: string | undefined;
        if (expenseData.receiptImage) {
          receiptPath = await uploadReceipt(tripId, tempId, expenseData.receiptImage);
        }
        const savedExpense = await insertExpense(tripId, userId, toExpenseInput(expenseData, resolvedShares, { id: tempId, receiptPath }));
        
        set((state) => ({
          expenses: state.expenses.map((e) => (e.id === tempId ? savedExpense : e)),
          trips: state.trips.map((t) => (t.id === tripId ? { ...t, updatedAt: Date.now() } : t)),
        }));
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
        await updateExpenseRow(id, toExpenseInput(expenseData, resolvedShares, { receiptPath }));
        if (receiptPath) {
          set((state) => ({
            expenses: state.expenses.map((e) => (e.id === id ? { ...updatedExpense, receiptPath } : e)),
          }));
        }
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

      // Optimistic delete
      set((state) => ({
        expenses: state.expenses.filter((e) => e.id !== id),
        storageError: null,
      }));

      if (!navigator.onLine) {
        get().queueSync('deleteExpense', { id });
      } else {
        try {
          await deleteExpenseRow(id);
        } catch (e) {
          // Revert optimistic delete
          set((state) => ({
            expenses: [...state.expenses, existing].sort((a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt),
          }));
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
        let expenses: Expense[] = [];
        let categories = DEFAULT_CATEGORIES;
        if (lastTripId) {
          expenses = await fetchExpensesForTrip(lastTripId);
          const custom = await fetchCategoriesForTrip(lastTripId);
          categories = [...DEFAULT_CATEGORIES, ...custom];
          localStorage.setItem(LAST_TRIP_KEY, lastTripId);
        }

        set({ ...graph, activeTripId: lastTripId, expenses, categories, storageError: null });
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
          categories: DEFAULT_CATEGORIES,
          storageError: null,
        });
        localStorage.removeItem(LAST_TRIP_KEY);
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
          expenses: result.expenses,
          categories: [...DEFAULT_CATEGORIES, ...result.categories],
          storageError: null,
        }));
        localStorage.setItem(LAST_TRIP_KEY, result.trip.id);
      } catch (e) {
        setError(e);
      }
    },

    applyP2PMergedState: async (merged) => {
      set(() => {
        localStorage.setItem('trip-tracker-sync-queue', JSON.stringify(merged.syncQueue));
        return {
          expenses: merged.expenses,
          categories: merged.categories,
          members: merged.members,
          groups: merged.groups,
          syncQueue: merged.syncQueue,
          storageError: null,
        };
      });
    },
  };
});
