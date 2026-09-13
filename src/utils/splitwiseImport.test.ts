import { describe, expect, it } from 'vitest';
import type { Category, Member } from '../types';
import {
  defaultNameMap,
  parseCsvRecords,
  parseSplitwiseCsv,
  parseSplitwiseDate,
  resolveSplitwiseRow,
  suggestMemberMatch,
} from './splitwiseImport';

const members: Member[] = [
  { id: 'm-rahul', name: 'Rahul' },
  { id: 'm-priya', name: 'Priya Shah' },
];

const categories: Category[] = [
  { id: 'cat-food', name: 'Food & Dining', isCustom: false },
  { id: 'cat-misc', name: 'Misc & Others', isCustom: false },
];

const SAMPLE = `Group: Goa Trip
Date,Description,Category,Cost,Currency,Rahul,Priya Shah
2024-01-15,Dinner,Food,1200.00,INR,600.00,-600.00
01/20/2024,Cab,Taxi,400,INR,400.00,-400.00
2024-01-21,Payment,Payment,600.00,INR,-600.00,600.00
2024-01-22,"Quoted, dinner",Food,"1,000.00",INR,500,-500
`;

describe('splitwiseImport', () => {
  it('parses quoted CSV fields with commas', () => {
    const rows = parseCsvRecords('a,"b, c",d\n1,2,3');
    expect(rows[0]).toEqual(['a', 'b, c', 'd']);
    expect(rows[1]).toEqual(['1', '2', '3']);
  });

  it('normalizes Splitwise dates', () => {
    expect(parseSplitwiseDate('2024-01-15')).toBe('2024-01-15');
    expect(parseSplitwiseDate('01/20/2024')).toBe('2024-01-20');
    expect(parseSplitwiseDate('15/01/2024')).toBe('2024-01-15');
  });

  it('parses a group spreadsheet and flags payment rows', () => {
    const result = parseSplitwiseCsv(SAMPLE);
    expect(result.errors).toEqual([]);
    expect(result.personNames).toEqual(['Rahul', 'Priya Shah']);
    expect(result.rows).toHaveLength(4);
    expect(result.rows[0].description).toBe('Dinner');
    expect(result.rows[0].cost).toBe(1200);
    expect(result.rows[2].isPayment).toBe(true);
    expect(result.rows[3].description).toBe('Quoted, dinner');
    expect(result.rows[3].cost).toBe(1000);
  });

  it('matches member names and defaults unmatched to create', () => {
    expect(suggestMemberMatch('Rahul', members)).toBe('m-rahul');
    expect(suggestMemberMatch('priya shah', members)).toBe('m-priya');
    const map = defaultNameMap(['Rahul', 'Amit'], members);
    expect(map.Rahul).toBe('m-rahul');
    expect(map.Amit).toBe('__create__');
  });

  it('resolves an equal two-person expense to exact shares', () => {
    const parsed = parseSplitwiseCsv(SAMPLE);
    const dinner = parsed.rows[0];
    const resolved = resolveSplitwiseRow(
      dinner,
      { Rahul: 'm-rahul', 'Priya Shah': 'm-priya' },
      {},
      categories
    );
    expect('expense' in resolved).toBe(true);
    if (!('expense' in resolved)) return;
    expect(resolved.expense.paidBy).toBe('m-rahul');
    expect(resolved.expense.splitMode).toBe('exact');
    expect(resolved.expense.splitConfig['m-rahul']).toBe(600);
    expect(resolved.expense.splitConfig['m-priya']).toBe(600);
    expect(resolved.expense.category).toBe('cat-food');
  });

  it('returns a header error when the CSV is not a Splitwise export', () => {
    const result = parseSplitwiseCsv('hello,world');
    expect(result.rows).toEqual([]);
    expect(result.errors[0]).toMatch(/header row/i);
  });
});
