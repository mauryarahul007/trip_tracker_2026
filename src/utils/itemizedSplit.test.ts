import { describe, it, expect } from 'vitest';
import { calculateItemizedBreakdown } from './itemizedSplit';
import type { ReceiptItem } from '../types';

describe('itemizedSplit', () => {
  it('correctly splits items across individual assignees', () => {
    const items: ReceiptItem[] = [
      { id: '1', name: 'Burger', amount: 300, assignedMemberIds: ['m1'] },
      { id: '2', name: 'Pasta', amount: 500, assignedMemberIds: ['m2'] },
    ];

    const result = calculateItemizedBreakdown(items, 0, 0, 0, ['m1', 'm2']);
    expect(result.itemsSubtotal).toBe(800);
    expect(result.calculatedTotal).toBe(800);
    expect(result.memberBreakdowns['m1'].totalOwed).toBe(300);
    expect(result.memberBreakdowns['m2'].totalOwed).toBe(500);
  });

  it('pro-rates taxes and tips proportionately according to subtotal', () => {
    // m1 ordered 200, m2 ordered 800 (ratio: 20% vs 80%)
    // Tax = 100
    // Expected: m1 tax = 20, m2 tax = 80
    // Expected totals: m1 = 220, m2 = 880
    const items: ReceiptItem[] = [
      { id: '1', name: 'Drink', amount: 200, assignedMemberIds: ['m1'] },
      { id: '2', name: 'Steak', amount: 800, assignedMemberIds: ['m2'] },
    ];

    const result = calculateItemizedBreakdown(items, 100, 0, 0, ['m1', 'm2']);
    expect(result.itemsSubtotal).toBe(1000);
    expect(result.calculatedTotal).toBe(1100);
    expect(result.memberBreakdowns['m1'].itemsSubtotal).toBe(200);
    expect(result.memberBreakdowns['m1'].extrasShare).toBe(20);
    expect(result.memberBreakdowns['m1'].totalOwed).toBe(220);

    expect(result.memberBreakdowns['m2'].itemsSubtotal).toBe(800);
    expect(result.memberBreakdowns['m2'].extrasShare).toBe(80);
    expect(result.memberBreakdowns['m2'].totalOwed).toBe(880);
  });

  it('splits shared dishes equally across assigned subgroup', () => {
    // Pizza 600 shared by m1 and m2 (300 each)
    // Salad 200 assigned to m3 only
    const items: ReceiptItem[] = [
      { id: '1', name: 'Large Pizza', amount: 600, assignedMemberIds: ['m1', 'm2'] },
      { id: '2', name: 'Salad', amount: 200, assignedMemberIds: ['m3'] },
    ];

    const result = calculateItemizedBreakdown(items, 80, 0, 0, ['m1', 'm2', 'm3']);
    expect(result.itemsSubtotal).toBe(800);
    expect(result.calculatedTotal).toBe(880);

    // m1 and m2 have subtotal 300 / 800 = 37.5% of 80 = 30 extras => 330 each
    expect(result.memberBreakdowns['m1'].totalOwed).toBe(330);
    expect(result.memberBreakdowns['m2'].totalOwed).toBe(330);
    // m3 has subtotal 200 / 800 = 25% of 80 = 20 extras => 220
    expect(result.memberBreakdowns['m3'].totalOwed).toBe(220);
  });

  it('handles discount netting out extras', () => {
    const items: ReceiptItem[] = [
      { id: '1', name: 'Meal', amount: 1000, assignedMemberIds: ['m1'] },
    ];

    // Tax 100, Discount 50 => net extras = 50
    const result = calculateItemizedBreakdown(items, 100, 0, 50, ['m1']);
    expect(result.netExtras).toBe(50);
    expect(result.calculatedTotal).toBe(1050);
    expect(result.memberBreakdowns['m1'].totalOwed).toBe(1050);
  });
});
