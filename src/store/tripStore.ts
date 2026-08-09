import { create } from 'zustand';
import type { Trip, Member, Group, Expense, Category, TripState } from '../types';
import { storage, StorageError } from '../services/storage';
import { generateDemoData } from '../utils/demoSeed';


interface TripStore extends TripState {
  initialized: boolean;
  storageError: string | null;
  
  initialize: () => Promise<void>;
  clearStorageError: () => void;
  
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
  addExpense: (expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  updateExpense: (id: string, expense: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt'>) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  
  // Category Actions
  addCategory: (name: string, icon?: string) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;
  
  // Database Backup Actions
  exportDatabase: () => string;
  importDatabase: (jsonString: string) => Promise<boolean>;
  clearDatabase: () => Promise<void>;
  loadDemoTrip: () => Promise<void>;
}

const DEFAULT_CATEGORIES: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', icon: '🍔', isCustom: false },
  { id: 'cat-stay', name: 'Stay & Hotel', icon: '🏨', isCustom: false },
  { id: 'cat-travel', name: 'Travel & Transport', icon: '✈️', isCustom: false },
  { id: 'cat-activities', name: 'Activities & Sightseeing', icon: '🎟️', isCustom: false },
  { id: 'cat-shopping', name: 'Shopping', icon: '🛍️', isCustom: false },
  { id: 'cat-misc', name: 'Misc & Others', icon: '📦', isCustom: false },
];

// Pure helper — resolves exact money shares for each participant
const resolveShares = (
  expenseData: Omit<Expense, 'id' | 'tripId' | 'resolvedShares' | 'createdAt' | 'updatedAt'>,
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

    updateTrip: async (id, name, startDate, endDate) => {
      const updatedTrips = get().trips.map((t) =>
        t.id === id ? { ...t, name, startDate, endDate, updatedAt: Date.now() } : t
      );
      await persist({ trips: updatedTrips });
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

    updateMember: async (id, name) => {
      const member = get().members[id];
      if (!member) return;

      const updatedMembers = {
        ...get().members,
        [id]: { ...member, name },
      };

      await persist({ members: updatedMembers });
    },

    deleteMember: async (id) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;



      // 1. Remove member record from members map
      const updatedMembers = { ...get().members };
      delete updatedMembers[id];

      // 2. Remove member from any groups that contain them, handle group name updates & dissolution
      const updatedGroups = { ...get().groups };
      Object.keys(updatedGroups).forEach((gid) => {
        const group = updatedGroups[gid];
        if (group.memberIds.includes(id)) {
          const remainingGroupMembers = group.memberIds.filter((mid) => mid !== id);
          
          if (remainingGroupMembers.length < 2) {
            // "If there are 2 members in group and one member is deleted, the group should be dissolved"
            delete updatedGroups[gid];
          } else {
            // "If there are 3 members in a group and we delete one member, the group name should be automatically updated to 2 members."
            const memberNames = remainingGroupMembers.map((mid) => updatedMembers[mid]?.name || get().members[mid]?.name).filter(Boolean);
            let newGroupName = '';
            if (memberNames.length === 2) {
              newGroupName = `${memberNames[0]} & ${memberNames[1]}`;
            } else if (memberNames.length > 2) {
              newGroupName = `${memberNames.slice(0, -1).join(', ')} & ${memberNames[memberNames.length - 1]}`;
            }

            updatedGroups[gid] = {
              ...group,
              name: newGroupName || group.name,
              memberIds: remainingGroupMembers,
            };
          }
        }
      });

      // 3. Remove memberId from active trip's memberIds list and update groupIds to filter out dissolved ones
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          const filteredGroupIds = (t.groupIds || []).filter((gid) => updatedGroups[gid] !== undefined);
          return {
            ...t,
            memberIds: t.memberIds.filter((mid) => mid !== id),
            groupIds: filteredGroupIds,
            updatedAt: Date.now(),
          };
        }
        return t;
      });

      await persist({ 
        members: updatedMembers, 
        trips: updatedTrips, 
        groups: updatedGroups
      });
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

    updateGroup: async (id, name, memberIds) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const group = get().groups[id];
      if (!group) return;

      const updatedGroup = { ...group, name, memberIds };
      const updatedGroups = { ...get().groups, [id]: updatedGroup };

      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) {
          return { ...t, updatedAt: Date.now() };
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

      const participants = expenseData.splitMemberIds.filter(
        (id) => get().members[id] && !get().members[id].archived
      );
      if (participants.length === 0) return;

      const newExpense: Expense = {
        ...expenseData,
        id: `exp-${Date.now()}`,
        tripId: activeTripId,
        resolvedShares: resolveShares(expenseData, participants),
        createdAt: Date.now(),
        updatedAt: Date.now(),
      };

      const updatedExpenses = [...get().expenses, newExpense];
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) return { ...t, updatedAt: Date.now() };
        return t;
      });
      await persist({ expenses: updatedExpenses, trips: updatedTrips });
    },

    updateExpense: async (id, expenseData) => {
      const activeTripId = get().activeTripId;
      if (!activeTripId) return;

      const existing = get().expenses.find((e) => e.id === id);
      if (!existing) return;

      const participants = expenseData.splitMemberIds.filter(
        (mId) => get().members[mId] && !get().members[mId].archived
      );
      if (participants.length === 0) return;

      const updatedExpense: Expense = {
        ...existing,
        ...expenseData,
        resolvedShares: resolveShares(expenseData, participants),
        updatedAt: Date.now(),
      };

      const updatedExpenses = get().expenses.map((e) => (e.id === id ? updatedExpense : e));
      const updatedTrips = get().trips.map((t) => {
        if (t.id === activeTripId) return { ...t, updatedAt: Date.now() };
        return t;
      });
      await persist({ expenses: updatedExpenses, trips: updatedTrips });
    },

    deleteExpense: async (id) => {
      const updatedExpenses = get().expenses.filter((e) => e.id !== id);
      await persist({ expenses: updatedExpenses });
    },

    addCategory: async (name, icon) => {
      const newCategory: Category = {
        id: `cat-custom-${Date.now()}`,
        name,
        icon: icon || '🏷️',
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

    clearDatabase: async () => {
      await storage.clearAll();
      set({
        trips: [],
        activeTripId: null,
        members: {},
        groups: {},
        expenses: [],
        categories: DEFAULT_CATEGORIES,
        storageError: null,
      });
    },

    loadDemoTrip: async () => {
      const { trip, members: newMembers, groups: newGroups, expenses: newExpenses } = generateDemoData();

      const updatedTrips = [...get().trips, trip];
      const updatedMembers = { ...get().members, ...newMembers };
      const updatedGroups = { ...get().groups, ...newGroups };
      const updatedExpenses = [...get().expenses, ...newExpenses];

      await persist({
        trips: updatedTrips,
        activeTripId: trip.id,
        members: updatedMembers,
        groups: updatedGroups,
        expenses: updatedExpenses,
      });
    },
  };
});
