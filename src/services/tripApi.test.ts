import { describe, it, expect, vi, beforeEach } from 'vitest';

// Chainable mock matching the exact call shape updateExpenseRow uses:
// supabase.from('expenses').update(payload).eq('id', id).select('id')
const selectMock = vi.fn();
const eqMock = vi.fn(() => ({ select: selectMock }));
const updateMock = vi.fn(() => ({ eq: eqMock }));
const fromMock = vi.fn((_table: string) => ({ update: updateMock }));

vi.mock('./supabaseClient', () => ({
  supabase: { from: (table: string) => fromMock(table) },
}));

import { updateExpenseRow, type ExpenseInput } from './tripApi';

const baseInput: ExpenseInput = {
  title: 'Dinner',
  amount: 100,
  currency: 'INR',
  category: 'cat-food',
  date: '2026-08-27',
  paidBy: 'mem-1',
  splitMode: 'equal',
  splitMemberIds: ['mem-1', 'mem-2'],
  resolvedShares: { 'mem-1': 50, 'mem-2': 50 },
};

beforeEach(() => {
  fromMock.mockClear();
  updateMock.mockClear();
  eqMock.mockClear();
  selectMock.mockClear();
});

describe('updateExpenseRow', () => {
  it('resolves when the row was actually updated', async () => {
    selectMock.mockResolvedValue({ data: [{ id: 'exp-1' }], error: null });
    await expect(updateExpenseRow('exp-1', baseInput)).resolves.toBeUndefined();
  });

  // Regression: a Postgres/RLS WITH CHECK rejection on UPDATE reports
  // error: null with zero rows affected -- without checking the returned
  // row count, this silently "succeeds" for a write that never happened.
  // The optimistic local fix (e.g. reassigning an expense away from a
  // deleted member) then looks resolved until the next refresh re-fetches
  // the untouched server row via mergeServerExpenses and reverts it.
  it('throws when the update affects zero rows (e.g. blocked by RLS)', async () => {
    selectMock.mockResolvedValue({ data: [], error: null });
    await expect(updateExpenseRow('exp-1', baseInput)).rejects.toThrow(/0 rows/);
  });

  it('still throws the original error when Supabase reports one', async () => {
    selectMock.mockResolvedValue({ data: null, error: { message: 'network error' } });
    await expect(updateExpenseRow('exp-1', baseInput)).rejects.toMatchObject({ message: 'network error' });
  });
});
