import { describe, it, expect } from 'vitest';
import { applyRefunds, apportion, refundableRemaining } from './refunds';
import { calculateSettlements } from './settlement';
import type { Expense, Member, Trip } from '../types';

const base = { tripId: 't1', currency: 'INR', category: 'Food', date: '2026-08-01', isSettlement: false, createdByUserId: 'u', createdAt: 0, updatedAt: 0 } as const;
const ids = ['a', 'b', 'c', 'd'];
const trip = { id: 't1', name: 'T', startDate: '', endDate: '', baseCurrency: 'INR', ownerId: 'u', memberIds: ids, groupIds: [], joinCode: '', createdAt: 0, updatedAt: 0 } as Trip;
const members = Object.fromEntries(ids.map((id) => [id, { id, name: id }])) as Record<string, Member>;
const parent: Expense = { ...base, id: 'e1', title: 'Hotel', amount: 5000, paidBy: 'a', splitMode: 'equal', splitMemberIds: ids, resolvedShares: { a: 1250, b: 1250, c: 1250, d: 1250 } };
const refund = (amount: number, id = 'r1'): Expense => ({ ...base, id, title: 'Refund: Hotel', amount, paidBy: 'a', splitMode: 'exact', splitMemberIds: ['a'], resolvedShares: { a: amount }, refundOfExpenseId: 'e1' });
const bal = (list: Expense[]) => Object.fromEntries(calculateSettlements(trip, members, list).balances.map((b) => [b.memberId, b.balance]));

describe('refunds', () => {
  it('5000 across 4 with a 1000 refund: payer is out 4000, each owes 1000', () => {
    expect(bal([parent])).toEqual({ a: 3750, b: -1250, c: -1250, d: -1250 });
    expect(bal([parent, refund(1000)])).toEqual({ a: 3000, b: -1000, c: -1000, d: -1000 });
  });
  it('a refund after members already paid flips to the payer owing them', () => {
    const settled: Expense = { ...base, id: 's', title: 'Settlement: b', amount: 1250, paidBy: 'b', splitMode: 'exact', splitMemberIds: ['a'], resolvedShares: { a: 1250 }, isSettlement: true };
    expect(bal([parent, settled, refund(1000)]).b).toBe(250);
  });
  it('uneven shares and cents stay exact', () => {
    expect(apportion(1000, { a: 1, b: 1, c: 1 })).toEqual({ a: 333.34, b: 333.33, c: 333.33 });
    const sum = Object.values(apportion(100, { a: 3, b: 7, c: 11 })).reduce((s, v) => s + v, 0);
    expect(Number(sum.toFixed(2))).toBe(100);
  });
  it('multiple refunds stack, are capped, and deleting one restores the numbers', () => {
    expect(refundableRemaining(parent, [parent, refund(1000), refund(500, 'r2')])).toBe(3500);
    expect(applyRefunds([parent, refund(9000)])[0].amount).toBe(0);
    const gone = { ...refund(1000), deletedAt: 1 };
    expect(applyRefunds([parent, gone])[0].amount).toBe(5000);
  });
  it('scales multi-payer contributions', () => {
    const multi = { ...parent, paidByShares: { a: 3000, b: 2000 } };
    expect(applyRefunds([multi, refund(1000)])[0].paidByShares).toEqual({ a: 2400, b: 1600 });
  });
});
