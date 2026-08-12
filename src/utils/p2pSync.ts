import type { Expense, Category, Member, Group } from '../types';

export interface P2PState {
  expenses: Expense[];
  categories: Category[];
  members: Record<string, Member>;
  groups: Record<string, Group>;
  syncQueue: any[];
}

export function mergeP2PStates(stateA: P2PState, stateB: P2PState): P2PState {
  // 1. Gather all deleted expense IDs from both sync queues
  const deletedIds = new Set<string>();
  const collectDeletedIds = (queue: any[]) => {
    queue.forEach((item) => {
      if (item.type === 'deleteExpense' && item.payload?.id) {
        deletedIds.add(item.payload.id);
      }
    });
  };
  collectDeletedIds(stateA.syncQueue);
  collectDeletedIds(stateB.syncQueue);

  // 2. Merge Expenses list using Last-Write-Wins (LWW) based on updatedAt
  const expenseMap = new Map<string, Expense>();
  const processExpenses = (list: Expense[]) => {
    list.forEach((exp) => {
      if (deletedIds.has(exp.id)) return;

      const existing = expenseMap.get(exp.id);
      if (!existing || exp.updatedAt > existing.updatedAt) {
        expenseMap.set(exp.id, exp);
      }
    });
  };

  processExpenses(stateA.expenses);
  processExpenses(stateB.expenses);

  const mergedExpenses = Array.from(expenseMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  // 3. Merge custom Categories (union by ID)
  const categoryMap = new Map<string, Category>();
  stateA.categories.forEach((c) => categoryMap.set(c.id, c));
  stateB.categories.forEach((c) => categoryMap.set(c.id, c));
  const mergedCategories = Array.from(categoryMap.values());

  // 4. Merge Members (union by ID)
  const mergedMembers = { ...stateA.members, ...stateB.members };

  // 5. Merge Groups (union by ID)
  const mergedGroups = { ...stateA.groups, ...stateB.groups };

  // 6. Merge Sync Queues (prevent duplicate actions in queue)
  const queueMap = new Map<string, any>();
  const processQueue = (queue: any[]) => {
    queue.forEach((item) => {
      let key = item.id;
      if (item.type === 'addExpense' && item.payload?.tempId) {
        key = `add:${item.payload.tempId}`;
      } else if (item.type === 'updateExpense' && item.payload?.id) {
        key = `update:${item.payload.id}`;
      } else if (item.type === 'deleteExpense' && item.payload?.id) {
        key = `delete:${item.payload.id}`;
      }
      queueMap.set(key, item);
    });
  };

  processQueue(stateA.syncQueue);
  processQueue(stateB.syncQueue);
  const mergedSyncQueue = Array.from(queueMap.values());

  return {
    expenses: mergedExpenses,
    categories: mergedCategories,
    members: mergedMembers,
    groups: mergedGroups,
    syncQueue: mergedSyncQueue,
  };
}
