import type { Member, Expense, Trip, Group } from '../types';

export interface Transfer {
  from: string; // settlement node id: memberId, or `group:<groupId>`
  to: string;
  fromLabel: string; // member name, or group name if merged
  toLabel: string;
  fromMemberId: string; // real member id to record as payer
  toMemberId: string; // real member id to record as recipient
  amount: number;
}

export interface PairSettlementGroup {
  fromMemberId: string; // debtor -- expense.paidBy on each payment
  toMemberId: string; // creditor -- expense.splitMemberIds[0] on each payment
  totalPaid: number;
  payments: Expense[]; // newest first
}

// Groups settlement expenses (title starts with "Settlement:", isSettlement
// true) by the debtor/creditor pair recorded on onSettle -- paidBy is
// always the debtor and splitMemberIds[0] the creditor (see App.tsx's
// settle-confirm handler), so this reads structural fields rather than
// parsing the title string.
export function groupSettlementsByPair(settlementExpenses: Expense[]): PairSettlementGroup[] {
  const groups = new Map<string, PairSettlementGroup>();

  settlementExpenses.forEach((expense) => {
    const fromMemberId = expense.paidBy;
    const toMemberId = expense.splitMemberIds[0];
    if (!toMemberId) return;

    const key = `${fromMemberId}:${toMemberId}`;
    const existing = groups.get(key);
    if (existing) {
      existing.totalPaid += expense.amount;
      existing.payments.push(expense);
    } else {
      groups.set(key, { fromMemberId, toMemberId, totalPaid: expense.amount, payments: [expense] });
    }
  });

  return Array.from(groups.values())
    .map((group) => ({
      ...group,
      payments: [...group.payments].sort((a, b) => b.createdAt - a.createdAt),
    }))
    .sort((a, b) => b.totalPaid - a.totalPaid);
}

export interface MemberBalance {
  memberId: string;
  name: string;
  balance: number; // positive = gets back, negative = owes
}

export interface SettlementNode {
  id: string;
  name: string;
  memberIds: string[];
  balance: number;
}

// Groups' members owe nothing to each other for settlement purposes -
// each group is merged into a single node, netted against everyone else.
export function buildSettlementNodes(balances: MemberBalance[], groups: Group[]): SettlementNode[] {
  const groupOfMember: Record<string, Group> = {};
  groups.forEach((g) => {
    g.memberIds.forEach((mid) => {
      if (!groupOfMember[mid]) groupOfMember[mid] = g;
    });
  });

  const nodeMap: Record<string, SettlementNode> = {};
  balances.forEach((b) => {
    const grp = groupOfMember[b.memberId];
    const key = grp ? `group:${grp.id}` : `member:${b.memberId}`;
    if (!nodeMap[key]) {
      nodeMap[key] = { id: key, name: grp ? grp.name : b.name, memberIds: [], balance: 0 };
    }
    nodeMap[key].memberIds.push(b.memberId);
    nodeMap[key].balance = Number((nodeMap[key].balance + b.balance).toFixed(2));
  });

  return Object.values(nodeMap);
}

// Within a merged group node, the member with the most extreme individual
// balance is recorded as the actual payer/recipient for the ledger entry.
function pickRepresentative(
  memberIds: string[],
  balances: MemberBalance[],
  direction: 'debtor' | 'creditor'
): string {
  return memberIds.reduce((best, id) => {
    const bal = balances.find((b) => b.memberId === id)?.balance ?? 0;
    const bestBal = balances.find((b) => b.memberId === best)?.balance ?? 0;
    return direction === 'debtor' ? (bal < bestBal ? id : best) : (bal > bestBal ? id : best);
  }, memberIds[0]);
}

// Greedy debtor/creditor matching shared by the top-level (merged-group)
// settlement and by per-group internal settlement.
function matchDebtorsToCreditors(nodes: SettlementNode[], balances: MemberBalance[]): Transfer[] {
  const debtors = nodes.filter((n) => n.balance < -0.01).map((n) => ({ ...n }));
  const creditors = nodes.filter((n) => n.balance > 0.01).map((n) => ({ ...n }));

  const transfers: Transfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    debtors.sort((a, b) => a.balance - b.balance);
    creditors.sort((a, b) => b.balance - a.balance);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const amountToSettle = Math.min(-debtor.balance, creditor.balance);

    if (amountToSettle > 0.005) {
      transfers.push({
        from: debtor.id,
        to: creditor.id,
        fromLabel: debtor.name,
        toLabel: creditor.name,
        fromMemberId: pickRepresentative(debtor.memberIds, balances, 'debtor'),
        toMemberId: pickRepresentative(creditor.memberIds, balances, 'creditor'),
        amount: Number(amountToSettle.toFixed(2))
      });

      debtor.balance += amountToSettle;
      creditor.balance -= amountToSettle;
    }

    if (Math.abs(debtor.balance) < 0.01) debtors.shift();
    if (Math.abs(creditor.balance) < 0.01) creditors.shift();
  }

  return transfers;
}

// A group's combined balance can net to zero against the rest of the trip
// while its own members still hold unequal individual balances between
// themselves (e.g. one member fronted more of the group's shared costs).
// This computes the transfers needed to reconcile those members with each
// other specifically - the group isn't truly "settled" until this is empty.
export function calculateGroupInternalTransfers(balances: MemberBalance[], group: Group): Transfer[] {
  const memberNodes: SettlementNode[] = group.memberIds.map((mid) => {
    const b = balances.find((bal) => bal.memberId === mid);
    return { id: `member:${mid}`, name: b ? b.name : 'Deleted Member', memberIds: [mid], balance: b ? b.balance : 0 };
  });
  return matchDebtorsToCreditors(memberNodes, balances);
}

// Direct pairwise settlement calculation without greedy flow minimization:
// each participant pays back the exact member who fronted the money for their share.
export function calculateDirectSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[],
  groups: Group[] = []
): Transfer[] {
  const activeTripExpenses = expenses.filter((e) => e.tripId === trip.id && !e.deletedAt);

  // Group membership index
  const groupOfMember: Record<string, string> = {};
  groups.forEach((g) => {
    g.memberIds.forEach((mid) => {
      if (!groupOfMember[mid]) groupOfMember[mid] = g.id;
    });
  });

  // Map of debtorId -> Map of creditorId -> amount
  const pairwise = new Map<string, Map<string, number>>();

  const addDebt = (debtor: string, creditor: string, amount: number) => {
    if (!debtor || !creditor || debtor === creditor || amount <= 0.005) return;
    // Members in the exact same group do not owe each other in group-netted mode
    if (groupOfMember[debtor] && groupOfMember[debtor] === groupOfMember[creditor]) {
      return;
    }
    let debtorMap = pairwise.get(debtor);
    if (!debtorMap) {
      debtorMap = new Map<string, number>();
      pairwise.set(debtor, debtorMap);
    }
    debtorMap.set(creditor, (debtorMap.get(creditor) || 0) + amount);
  };

  activeTripExpenses.forEach((exp) => {
    if (exp.isSettlement) {
      // Settlement: debtor exp.paidBy pays creditor exp.splitMemberIds[0]
      const debtor = exp.paidBy;
      const creditor = exp.splitMemberIds[0];
      if (creditor) {
        addDebt(creditor, debtor, exp.amount);
      }
    } else {
      const payer = exp.paidBy;
      Object.entries(exp.resolvedShares).forEach(([borrower, share]) => {
        if (borrower !== payer && share > 0.005) {
          addDebt(borrower, payer, share);
        }
      });
    }
  });

  const transfers: Transfer[] = [];
  const processedPairs = new Set<string>();

  trip.memberIds.forEach((idA) => {
    trip.memberIds.forEach((idB) => {
      if (idA === idB) return;
      const pairKey = idA < idB ? `${idA}:${idB}` : `${idB}:${idA}`;
      if (processedPairs.has(pairKey)) return;
      processedPairs.add(pairKey);

      const debtAtoB = pairwise.get(idA)?.get(idB) || 0;
      const debtBtoA = pairwise.get(idB)?.get(idA) || 0;
      const net = Number((debtAtoB - debtBtoA).toFixed(2));

      if (net > 0.005) {
        const memA = members[idA];
        const memB = members[idB];
        transfers.push({
          from: `member:${idA}`,
          to: `member:${idB}`,
          fromLabel: memA ? memA.name : 'Deleted Member',
          toLabel: memB ? memB.name : 'Deleted Member',
          fromMemberId: idA,
          toMemberId: idB,
          amount: net,
        });
      } else if (net < -0.005) {
        const memA = members[idA];
        const memB = members[idB];
        transfers.push({
          from: `member:${idB}`,
          to: `member:${idA}`,
          fromLabel: memB ? memB.name : 'Deleted Member',
          toLabel: memA ? memA.name : 'Deleted Member',
          fromMemberId: idB,
          toMemberId: idA,
          amount: Math.abs(net),
        });
      }
    });
  });

  return transfers.sort((a, b) => b.amount - a.amount);
}

export function calculateSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[],
  groups: Group[] = [],
  options?: { simplifyDebts?: boolean }
): { balances: MemberBalance[]; transfers: Transfer[]; isSimplified: boolean } {
  const activeTripExpenses = expenses.filter((e) => e.tripId === trip.id && !e.deletedAt);
  
  // 1. Calculate net balances for every member of the trip
  const netBalances: Record<string, number> = {};
  trip.memberIds.forEach((id) => {
    netBalances[id] = 0;
  });

  activeTripExpenses.forEach((exp) => {
    // Add amount paid by the payer
    if (netBalances[exp.paidBy] !== undefined) {
      netBalances[exp.paidBy] += exp.amount;
    }

    // Subtract shares owed by participants
    Object.entries(exp.resolvedShares).forEach(([memId, share]) => {
      if (netBalances[memId] !== undefined) {
        netBalances[memId] -= share;
      }
    });
  });

  // Convert to MemberBalance array
  const balances: MemberBalance[] = trip.memberIds.map((id) => {
    const member = members[id];
    return {
      memberId: id,
      name: member ? member.name : 'Deleted Member',
      balance: Number((netBalances[id] || 0).toFixed(2))
    };
  });

  // Check whether to use simplified greedy algorithm or direct bilateral netting
  const shouldSimplify = options?.simplifyDebts !== undefined
    ? options.simplifyDebts
    : (trip.simplifyDebts !== false);

  if (!shouldSimplify) {
    const directTransfers = calculateDirectSettlements(trip, members, expenses, groups);
    return { balances, transfers: directTransfers, isSimplified: false };
  }

  // 2. Merge group members into single settlement nodes, then greedily
  // match debtor nodes to creditor nodes to minimize transfers.
  const nodes = buildSettlementNodes(balances, groups);
  const transfers = matchDebtorsToCreditors(nodes, balances);

  return { balances, transfers, isSimplified: true };
}

