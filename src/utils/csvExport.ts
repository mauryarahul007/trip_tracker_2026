import type { Trip, Member, Expense, Group } from '../types';
import { calculateSettlements } from './settlement';

const safeCell = (str: string): string => {
  // Replace double quotes with double-double quotes for CSV format
  let cleaned = str.replace(/"/g, '""');
  // Excel formula injection security prefix rule
  if (
    cleaned.startsWith('=') ||
    cleaned.startsWith('+') ||
    cleaned.startsWith('-') ||
    cleaned.startsWith('@')
  ) {
    cleaned = `'${cleaned}`;
  }
  // Wrap cell in double quotes if it contains commas, quotes, or newlines
  if (cleaned.includes(',') || cleaned.includes('"') || cleaned.includes('\n')) {
    return `"${cleaned}"`;
  }
  return cleaned;
};

export function exportTripToCSV(
  trip: Trip,
  members: Record<string, Member>,
  expenses: Expense[],
  groups: Group[] = []
): string {
  const activeTripExpenses = expenses.filter((e) => e.tripId === trip.id);
  const nonSettlementExpenses = activeTripExpenses.filter((e) => !e.title.startsWith('Settlement:'));
  
  const csvLines: string[] = [];

  // --- SECTION 1: EXPENSES LIST ---
  csvLines.push('EXPENSES LIST');
  csvLines.push('Date,Title,Category,Amount,Currency,Paid By,Split Mode,Split Members');

  nonSettlementExpenses.forEach((exp) => {
    const payer = members[exp.paidBy]?.name || 'Deleted';
    const splitNames = exp.splitMemberIds.map((id) => members[id]?.name || 'Deleted').join('; ');
    
    const row = [
      exp.date,
      exp.title,
      exp.category,
      exp.amount.toFixed(2),
      exp.currency,
      payer,
      exp.splitMode,
      splitNames
    ];
    
    csvLines.push(row.map(safeCell).join(','));
  });

  csvLines.push(''); // Empty spacer line
  csvLines.push(''); // Empty spacer line

  // --- SECTION 2: MEMBER NET BALANCES ---
  csvLines.push('NET BALANCES');
  csvLines.push('Member Name,Status,Net Balance');

  const { balances, transfers } = calculateSettlements(trip, members, expenses, groups);

  balances.forEach((b) => {
    const statusStr = b.balance > 0.01 
      ? 'Gets Back' 
      : b.balance < -0.01 
        ? 'Owes' 
        : 'Settled';
        
    const row = [
      b.name,
      statusStr,
      b.balance.toFixed(2)
    ];
    csvLines.push(row.map(safeCell).join(','));
  });

  csvLines.push(''); // Empty spacer line
  csvLines.push(''); // Empty spacer line

  // --- SECTION 3: RECOMMENDED SETTLEMENTS ---
  csvLines.push('RECOMMENDED SETTLEMENTS (MINIMIZED)');
  csvLines.push('Debtor (Who Pays),Creditor (Who Gets Paid),Amount');

  transfers.forEach((t) => {
    const row = [
      t.fromLabel,
      t.toLabel,
      t.amount.toFixed(2)
    ];
    csvLines.push(row.map(safeCell).join(','));
  });

  return csvLines.join('\n');
}
