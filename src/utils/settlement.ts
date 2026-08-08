import type { Member, Expense, Trip } from '../types';

export interface Transfer {
  from: string;
  to: string;
  amount: number;
}

export interface MemberBalance {
  memberId: string;
  name: string;
  balance: number; // positive = gets back, negative = owes
}

export function calculateSettlements(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[]
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

  // 2. Greedy algorithm to minimize transfers
  // Create copies of non-zero balances to mutate
  const debtors = balances
    .filter((b) => b.balance < -0.01)
    .map((b) => ({ ...b }));
  const creditors = balances
    .filter((b) => b.balance > 0.01)
    .map((b) => ({ ...b }));

  const transfers: Transfer[] = [];

  while (debtors.length > 0 && creditors.length > 0) {
    // Sort debtors ascending (most negative first)
    debtors.sort((a, b) => a.balance - b.balance);
    // Sort creditors descending (most positive first)
    creditors.sort((a, b) => b.balance - a.balance);

    const debtor = debtors[0];
    const creditor = creditors[0];

    const amountToSettle = Math.min(-debtor.balance, creditor.balance);
    
    if (amountToSettle > 0.005) {
      transfers.push({
        from: debtor.memberId,
        to: creditor.memberId,
        amount: Number(amountToSettle.toFixed(2))
      });
      
      debtor.balance += amountToSettle;
      creditor.balance -= amountToSettle;
    }

    // Remove settled members from list
    if (Math.abs(debtor.balance) < 0.01) {
      debtors.shift();
    }
    if (Math.abs(creditor.balance) < 0.01) {
      creditors.shift();
    }
  }

  return { balances, transfers };
}
