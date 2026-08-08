import { create } from 'zustand';
import type { Trip, Member, Group, Expense, Category, TripState } from '../types';
import { storage, StorageError } from '../services/storage';

interface TripStore extends TripState {
  initialized: boolean;
  storageError: string | null;
  
  initialize: () => Promise<void>;
  clearStorageError: () => void;
  
  // Trip Actions
  createTrip: (name: string, startDate: string, endDate: string, baseCurrency: string) => Promise<void>;
  selectTrip: (id: string | null) => Promise<void>;
  deleteTrip: (id: string) => Promise<void>;
  
  // Member Actions
  addMember: (name: string) => Promise<void>;
  toggleArchiveMember: (id: string) => Promise<void>;

  // Group Actions
  createGroup: (name: string, memberIds: string[]) => Promise<void>;
  deleteGroup: (id: string) => Promise<void>;
  
  // Expense Actions
  addExpense: (expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Category Actions
  addCategory: (name: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Database Backup Actions
  exportDatabase: () => string;
  importDatabase: (jsonString: string) => Promise<boolean>;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
  { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨', isCustom: false },
  { id: 'cat-travel', name: 'Travel & Transport', icon: '✈️', isCustom: false },
  { id: 'cat-activities', name: 'Activities & Sightseeing', icon: '🎟️', isCustom: false },
  { id: 'cat-shopping', name: 'Shopping', icon: '🛍️', isCustom: false },
  { id: 'cat-misc', name: 'Misc & Others', icon: '📦', isCustom: false },
];

export const useTripStore = create<TripStore>((set, get) => {
  // Helper to persist state and handle storage errors safely
  const persist = async (updatedState: Partial<TripState>) => {
    const currentState = get();
    const stateToSave: TripState = {
      trips: updatedState.trips ?? currentState.trips,
      activeTripId: updatedState.activeTripId !== undefined ? updatedState.activeTripId : currentState.activeTripId,
      members: updatedState.members ?? currentState.members,
      groups: updatedState.groups ?? currentState.groups,
      expenses: updatedState.expenses ?? currentState.expenses,
      categories: updatedState.categories ?? currentState.categories,
    };

    set({ ...stateToSave, storageError: null });

    try {
      await storage.saveState(stateToSave);
    } catch (error) {
      if (error instanceof StorageError) {
        set({ storageError: error.message });
      } else {
        set({ storageError: 'Failed to write data to browser memory.' });
      }
    }
  };

  return {
    trips: [],
    activeTripId: null,
    members: {},
    groups: {},
    expenses: [],
    categories: [],
    initialized: false,
    storageError: null,

    initialize: async () => {
      if (get().initialized) return;
      const loaded = await storage.loadState();
      if (loaded) {
        set({
          trips: loaded.trips || [],
          activeTripId: loaded.activeTripId || null,
          members: loaded.members || {},
          groups: loaded.groups || {},
          expenses: loaded.expenses || [],
          categories: loaded.categories || DEFAULT_CATEGORIES,
          initialized: true,
        });
      } else {
        // First run: Seed default categories
        set({
          categories: DEFAULT_CATEGORIES,
          groups: {},
          initialized: true,
        });
        await persist({ categories: DEFAULT_CATEGORIES, groups: {} });
      }
    },

    clearStorageError: () => set({ storageError: null }),

    createTrip: async (name, startDate, endDate, baseCurrency) => {
      const newTrip: Trip = {
        id: `trip-${Date.now()}`,
        name,
        startDate,
        endDate,
        baseCurrency,
        memberIds: [],
        groupIds: [],
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };
      const updatedTrips = [...get().trips, newTrip];
      await persist({ trips: updatedTrips, activeTripId: newTrip.id });
    },

    selectTrip: async (id) => {
      await persist({ activeTripId: id });
    },

    deleteTrip: async (id) => {
      const updatedTrips = get().trips.filter((t) => t.id !== id);
      // Clean up orphaned expenses for this deleted trip
      const updatedExpenses = get().expenses.filter((e) => e.tripId !== id);
      
      const nextActiveTripId = get().activeTripId === id 
        ? (updatedTrips[0]?.id || null) 
        : get().activeTripId;

      await persist({ 
        trips: updatedTrips, 
        expenses: updatedExpenses, 
        activeTripId: nextActiveTripId 
      });
    },

    addMember: async (name) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const memberId = `mem-${Date.now()}`;
      const newMember: Member = {
        id: memberId,
        name,
      };

      const updatedMembers = { ...get().members, [memberId]: newMember };
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          return { ...t, memberIds: [...t.memberIds, memberId], updatedAt: Date.now() };
        }
        return t;
      });

      await persist({ members: updatedMembers, trips: updatedTrips });
    },

    toggleArchiveMember: async (id) => {
      const member = get().members[id];
      if (!member) return;

      const updatedMembers = {
        ...get().members,
        [id]: { ...member, archived: !member.archived },
      };

      await persist({ members: updatedMembers });
    },

    createGroup: async (name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const groupId = `grp-${Date.now()}`;
      const newGroup: Group = {
        id: groupId,
        name,
        memberIds,
      };

      const updatedGroups = { ...get().groups, [groupId]: newGroup };
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          return { ...t, groupIds: [...(t.groupIds || []), groupId], updatedAt: Date.now() };
        }
        return t;
      });

      await persist({ groups: updatedGroups, trips: updatedTrips });
    },

    deleteGroup: async (groupId) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const { [groupId]: _, ...updatedGroups } = get().groups;
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          return {
            ...t,
            groupIds: (t.groupIds || []).filter((id) => id !== groupId),
            updatedAt: Date.now(),
          };
        }
        return t;
      });

      await persist({ groups: updatedGroups, trips: updatedTrips });
    },

    addExpense: async (expenseData) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const activeTrip = get().trips.find((t) => t.id === activeTripId);
      if (!activeTrip) return;

      // Filter participant members who are actually active (non-archived)
      const participants = expenseData.splitMemberIds.filter(
        (id) => get().members[id] && !get().members[id].archived
      );

      if (participants.length === 0) return;

      // Equal split among selected members
      const resolvedShares: Record<string, number> = {};
      const splitShare = Number((expenseData.amount / participants.length).toFixed(2));
      
      participants.forEach((memId) => {
        resolvedShares[memId] = splitShare;
      });

      // Handle minor division rounding adjustment
      const calculatedSum = splitShare * participants.length;
      const difference = Number((expenseData.amount - calculatedSum).toFixed(2));
      if (difference !== 0 && participants[0]) {
        resolvedShares[participants[0]] = Number((resolvedShares[participants[0]] + difference).toFixed(2));
      }

      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        tripId: activeTripId,
        resolvedShares,
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedExpenses = [...get().expenses, newExpense];
      
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          return { ...t, updatedAt: Date.now() };
        }
        return t;
      });

      await persist({ expenses: updatedExpenses, trips: updatedTrips });
    },

    deleteExpense: async (id) => {
      const updatedExpenses = get().expenses.filter((e) => e.id !== id);
      await persist({ expenses: updatedExpenses });
    },

    addCategory: async (name) => {
      const newCategory: Category = {
        id: `cat-custom-${Date.now()}`,
        name,
        icon: '🏷️',
        isCustom: true,
      };

      const updatedCategories = [...get().categories, newCategory];
      await persist({ categories: updatedCategories });
    },

    deleteCategory: async (id) => {
      const updatedCategories = get().categories.filter((c) => c.id !== id);
      await persist({ categories: updatedCategories });
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
      try {
        const parsed = JSON.parse(jsonString) as TripState;
        
        // Basic schema validation
        if (
          Array.isArray(parsed.trips) && 
          parsed.members && 
          parsed.groups &&
          Array.isArray(parsed.expenses) &&
          Array.isArray(parsed.categories)
        ) {
          await persist({
            trips: parsed.trips,
            activeTripId: parsed.activeTripId || null,
            members: parsed.members,
            groups: parsed.groups,
            expenses: parsed.expenses,
            categories: parsed.categories,
          });
          return true;
        }
        return false;
      } catch (e) {
        console.error('Import database JSON parse failure:', e);
        return false;
      }
    },
  };
});
