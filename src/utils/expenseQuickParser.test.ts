import { describe, it, expect } from 'vitest';
import { parseQuickExpense } from './expenseQuickParser';
import type { Category, Member } from '../types';

describe('expenseQuickParser', () => {
  const mockCategories: Category[] = [
    { id: 'cat-food', name: 'Food & Dining', isCustom: false },
    { id: 'cat-travel', name: 'Travel & Commute', isCustom: false },
    { id: 'cat-stay', name: 'Stay & Hotel', isCustom: false },
    { id: 'cat-activities', name: 'Activities & Sightseeing', isCustom: false },
    { id: 'cat-shopping', name: 'Shopping', isCustom: false },
    { id: 'cat-misc', name: 'Miscellaneous', isCustom: false },
  ];

  const mockMembers: Member[] = [
    { id: 'm-1', name: 'Rahul' },
    { id: 'm-2', name: 'Priya' },
    { id: 'm-3', name: 'Amit' },
  ];

  it('returns null for empty or whitespace-only inputs', () => {
    expect(parseQuickExpense('', mockCategories)).toBeNull();
    expect(parseQuickExpense('   ', mockCategories)).toBeNull();
  });

  it('parses "Dinner 1450 food" with amount, title, and explicit category word', () => {
    const result = parseQuickExpense('Dinner 1450 food', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1450);
    expect(result?.title).toBe('Dinner');
    expect(result?.categoryId).toBe('cat-food');
  });

  it('parses "Uber to airport 420" with travel auto-suggested from title', () => {
    const result = parseQuickExpense('Uber to airport 420', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(420);
    expect(result?.title).toBe('Uber to airport');
    expect(result?.categoryId).toBe('cat-travel');
  });

  it('parses "₹1,200 Airbnb in Goa" with currency symbol and comma formatting', () => {
    const result = parseQuickExpense('₹1,200 Airbnb in Goa', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1200);
    expect(result?.currency).toBe('INR');
    expect(result?.title).toBe('Airbnb in Goa');
    expect(result?.categoryId).toBe('cat-stay');
  });

  it('parses "$45.50 museum tickets" with dollar currency symbol and decimals', () => {
    const result = parseQuickExpense('$45.50 museum tickets', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(45.5);
    expect(result?.currency).toBe('USD');
    expect(result?.title).toBe('Museum tickets');
    expect(result?.categoryId).toBe('cat-activities');
  });

  it('parses "350rs Starbucks coffee" with currency suffix', () => {
    const result = parseQuickExpense('350rs Starbucks coffee', mockCategories);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(350);
    expect(result?.currency).toBe('INR');
    expect(result?.title).toBe('Starbucks coffee');
    expect(result?.categoryId).toBe('cat-food');
  });

  it('parses payer and split members from natural language', () => {
    const result = parseQuickExpense(
      'Dinner 1500 food paid by Rahul with Priya and Amit',
      mockCategories,
      [],
      mockMembers
    );
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1500);
    expect(result?.paidById).toBe('m-1');
    expect(result?.paidByName).toBe('Rahul');
    expect(result?.splitMemberIds).toContain('m-1');
    expect(result?.splitMemberIds).toContain('m-2');
    expect(result?.splitMemberIds).toContain('m-3');
  });

  it('parses "yesterday" into relative date', () => {
    const result = parseQuickExpense('Lunch 600 yesterday', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(600);
    expect(result?.date).toBeDefined();
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    expect(result?.date).toBe(yesterdayStr);
  });

  it('parses spoken number words like "twelve hundred"', () => {
    const result = parseQuickExpense('Dinner twelve hundred paid by Rahul', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(1200);
    expect(result?.title).toBe('Dinner');
    expect(result?.paidById).toBe('m-1');
    expect(result?.categoryId).toBe('cat-food');
  });

  it('parses spoken currency words like "rupees" and "bucks"', () => {
    const resultInr = parseQuickExpense('Coffee 150 rupees', mockCategories);
    expect(resultInr).not.toBeNull();
    expect(resultInr?.amount).toBe(150);
    expect(resultInr?.currency).toBe('INR');

    const resultUsd = parseQuickExpense('Burgers 25 bucks with Priya', mockCategories, [], mockMembers);
    expect(resultUsd).not.toBeNull();
    expect(resultUsd?.amount).toBe(25);
    expect(resultUsd?.currency).toBe('USD');
  });

  it('strips conversational voice filler words like "please add expense"', () => {
    const result = parseQuickExpense('Please add expense cab to beach 450 paid by Rahul', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(450);
    expect(result?.title).toBe('Cab to beach');
    expect(result?.paidById).toBe('m-1');
    expect(result?.categoryId).toBe('cat-travel');
  });

  it('parses "Paid 200 for cab by upi by rahul" cleanly with amount, title, payment mode, and payer', () => {
    const result = parseQuickExpense('Paid 200 for cab by upi by rahul', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(200);
    expect(result?.title).toBe('Cab');
    expect(result?.categoryId).toBe('cat-travel');
    expect(result?.paidById).toBe('m-1');
    expect(result?.paidByName).toBe('Rahul');
    expect(result?.paymentMode).toBe('UPI');
  });

  it('handles speech-to-text "4" homophone when transcribed as "Paid 200 4 cab by upi by rahul"', () => {
    const result = parseQuickExpense('Paid 200 4 cab by upi by rahul', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(200);
    expect(result?.title).toBe('Cab');
    expect(result?.paidById).toBe('m-1');
    expect(result?.paymentMode).toBe('UPI');
  });

  it('handles phonetic spoken variations like "Paid to hundred for cab" and "Paid two hundred for cab"', () => {
    const resultTo = parseQuickExpense('Paid to hundred for cab by upi by rahul', mockCategories, [], mockMembers);
    expect(resultTo).not.toBeNull();
    expect(resultTo?.amount).toBe(200);
    expect(resultTo?.title).toBe('Cab');

    const resultTwo = parseQuickExpense('Paid two hundred for cab by upi by rahul', mockCategories, [], mockMembers);
    expect(resultTwo).not.toBeNull();
    expect(resultTwo?.amount).toBe(200);
    expect(resultTwo?.title).toBe('Cab');
  });

  it('does not confuse ticket count or person count with total amount in "Paid 800 for 4 tickets"', () => {
    const result = parseQuickExpense('Paid 800 for 4 tickets to museum paid by Priya', mockCategories, [], mockMembers);
    expect(result).not.toBeNull();
    expect(result?.amount).toBe(800);
    expect(result?.paidById).toBe('m-2');
  });

  it('detects multiple payment modes (GPay, PhonePe, Cash, Card)', () => {
    const gpayResult = parseQuickExpense('500 dinner on gpay by Priya', mockCategories, [], mockMembers);
    expect(gpayResult?.paymentMode).toBe('GPay');
    expect(gpayResult?.amount).toBe(500);
    expect(gpayResult?.title).toBe('Dinner');

    const cashResult = parseQuickExpense('1200 groceries in cash', mockCategories);
    expect(cashResult?.paymentMode).toBe('Cash');
    expect(cashResult?.amount).toBe(1200);
    expect(cashResult?.title).toBe('Groceries');
  });
});
