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

export function calculateSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[],
  groups: Group[] = []
): { balances: MemberBalance[]; transfers: Transfer[] } {
  const activeTripExpenses = expenses.filter((e) => e.tripId === trip.id);
  
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

  // 2. Merge group members into single settlement nodes, then greedily
  // match debtor nodes to creditor nodes to minimize transfers.
  const nodes = buildSettlementNodes(balances, groups);
  const transfers = matchDebtorsToCreditors(nodes, balances);

  return { balances, transfers };
}
