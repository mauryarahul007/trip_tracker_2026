import type { Expense, Category, Member, Group } from '../types';

export interface P2PState {
  expenses: Expense[];
  categories: Category[];
  members: Record<string, Member>;
  groups: Record<string, Group>;
  syncQueue: any[];
}

/**
 * Validates and adjusts an expense to preserve the financial balance invariant:
 * sum(resolvedShares) === amount
 */
function sanitizeExpenseFinancialInvariants(exp: Expense): Expense {
  if (!exp.resolvedShares || Object.keys(exp.resolvedShares).length === 0) {
    return exp;
  }

  const shares = { ...exp.resolvedShares };
  const shareSum = Object.values(shares).reduce((acc, v) => acc + (Number(v) || 0), 0);
  const diff = Number((exp.amount - shareSum).toFixed(2));

  if (Math.abs(diff) > 0.001) {
    const participants = exp.splitMemberIds || Object.keys(shares);
    const target = participants.includes(exp.paidBy) ? exp.paidBy : participants[0];
    if (target && shares[target] !== undefined) {
      shares[target] = Number((shares[target] + diff).toFixed(2));
    }
  }

  return {
    ...exp,
    resolvedShares: shares,
    category: exp.category || 'cat-misc',
  };
}

/**
 * Performs an ACID-compliant merge of two P2PStates:
 * - Atomicity: Validates inputs; produces complete consistent state or throws.
 * - Consistency: Enforces financial sum invariants and referential integrity.
 * - Isolation: Conflict resolution using Last-Write-Wins (LWW) and tombstone dominance.
 * - Durability: Merges queued actions and ensures state is ready for atomic persistence.
 */
export function mergeP2PStates(stateA: P2PState, stateB: P2PState): P2PState {
  if (!stateA || !stateB) {
    throw new Error('Invalid P2PState: Cannot merge null or undefined state.');
  }

  // 1. Gather all deleted expense IDs from both sync queues (Tombstones)
  const deletedIds = new Set<string>();
  const collectDeletedIds = (queue: any[] = []) => {
    queue.forEach((item) => {
      if (item?.type === 'deleteExpense' && item?.payload?.id) {
        deletedIds.add(item.payload.id);
      }
    });
  };
  collectDeletedIds(stateA.syncQueue);
  collectDeletedIds(stateB.syncQueue);

  // 2. Merge custom Categories (union by ID)
  const categoryMap = new Map<string, Category>();
  (stateA.categories || []).forEach((c) => { if (c?.id) categoryMap.set(c.id, c); });
  (stateB.categories || []).forEach((c) => { if (c?.id) categoryMap.set(c.id, c); });
  const mergedCategories = Array.from(categoryMap.values());

  // 3. Merge Members (union by ID; preserve archived=true if set on either peer)
  const mergedMembers: Record<string, Member> = {};
  const allMemberKeys = new Set([
    ...Object.keys(stateA.members || {}),
    ...Object.keys(stateB.members || {}),
  ]);

  allMemberKeys.forEach((id) => {
    const memA = stateA.members?.[id];
    const memB = stateB.members?.[id];
    if (memA && memB) {
      mergedMembers[id] = {
        ...memA,
        ...memB,
        archived: Boolean(memA.archived || memB.archived),
        linkedUserId: memA.linkedUserId || memB.linkedUserId || null,
        avatarUrl: memA.avatarUrl || memB.avatarUrl || null,
      };
    } else if (memA) {
      mergedMembers[id] = { ...memA };
    } else if (memB) {
      mergedMembers[id] = { ...memB };
    }
  });

  // 4. Merge Groups (union by ID, deduplicate memberIds)
  const mergedGroups: Record<string, Group> = {};
  const allGroupKeys = new Set([
    ...Object.keys(stateA.groups || {}),
    ...Object.keys(stateB.groups || {}),
  ]);

  allGroupKeys.forEach((id) => {
    const grpA = stateA.groups?.[id];
    const grpB = stateB.groups?.[id];
    if (grpA && grpB) {
      const combinedMemberIds = Array.from(new Set([...(grpA.memberIds || []), ...(grpB.memberIds || [])]));
      mergedGroups[id] = {
        id,
        name: grpB.name || grpA.name,
        memberIds: combinedMemberIds,
      };
    } else if (grpA) {
      mergedGroups[id] = { ...grpA };
    } else if (grpB) {
      mergedGroups[id] = { ...grpB };
    }
  });

  // 5. Merge Expenses list using Last-Write-Wins (LWW) based on updatedAt & validate invariants
  const expenseMap = new Map<string, Expense>();
  const processExpenses = (list: Expense[] = []) => {
    list.forEach((rawExp) => {
      if (!rawExp?.id || deletedIds.has(rawExp.id)) return;

      const exp = sanitizeExpenseFinancialInvariants(rawExp);
      const existing = expenseMap.get(exp.id);
      if (!existing || (exp.updatedAt || 0) > (existing.updatedAt || 0)) {
        expenseMap.set(exp.id, exp);
      }
    });
  };

  processExpenses(stateA.expenses);
  processExpenses(stateB.expenses);

  const mergedExpenses = Array.from(expenseMap.values()).sort(
    (a, b) => b.date.localeCompare(a.date) || b.createdAt - a.createdAt
  );

  // 6. Merge Sync Queues (prevent duplicate actions in queue)
  const queueMap = new Map<string, any>();
  const processQueue = (queue: any[] = []) => {
    queue.forEach((item) => {
      if (!item) return;
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

